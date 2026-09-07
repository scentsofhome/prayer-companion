/* Offline lifecycle. Readiness is verified by the active worker, never inferred from connectivity. */
(() => {
  let registration, started = false, checking = false, dismissed = false;
  let state = {ready:false, status:'preparing', update:false, persistent:false};
  const notify = () => window.dispatchEvent(new CustomEvent('prayer-offline-change', {detail:{...state}}));
  function label() {
    if (state.ready) return navigator.onLine ? 'Prayer book saved for offline use' : 'Offline · Your prayer book is ready';
    if (state.status === 'unsupported') return 'Open in Safari to save your prayer book offline';
    if (!navigator.onLine) return 'Connect once to finish saving your prayer book';
    if (state.status === 'error') return 'Offline download incomplete · Retry in Settings';
    return 'Saving your prayer book for offline use…';
  }
  function workerStatus(worker, type = 'OFFLINE_STATUS') {
    return new Promise(resolve => {
      if (!worker) return resolve(false);
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); resolve(false); }, type === 'REPAIR_DOWNLOAD' ? 60000 : 5000);
      channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data?.ready === true); };
      worker.postMessage({type}, [channel.port2]);
    });
  }
  async function refresh() {
    state.ready = await workerStatus(navigator.serviceWorker?.controller);
    if (state.ready) state.status = 'ready';
    state.update = !!registration?.waiting;
    notify();
  }
  function watch(worker) {
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') { state.update = !!registration.waiting; notify(); refresh(); }
      if (worker.state === 'activated') refresh();
      if (worker.state === 'redundant') { if (!state.ready) state.status = 'error'; notify(); }
    });
  }
  async function start() {
    if (started) return;
    started = true;
    if (!('serviceWorker' in navigator) || !window.isSecureContext) { state.status = 'unsupported'; notify(); return; }
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Never interrupt a reader. New documents are picked up on the next launch,
      // or by the explicit Update now action outside the reader.
      refresh();
    });
    try {
      registration = await navigator.serviceWorker.register('./service-worker.js', {updateViaCache:'none'});
      watch(registration.installing);
      registration.addEventListener('updatefound', () => watch(registration.installing));
      await refresh();
      if (!state.ready && !registration.installing && !registration.waiting) state.status = 'error';
      notify();
    } catch { state.status = 'error'; notify(); }
  }
  async function check() {
    if (checking) return false;
    checking = true;
    try {
      if (!navigator.onLine) { await refresh(); return false; }
      if (!registration) { started = false; await start(); }
      if (registration) await registration.update();
      if (navigator.storage?.persist) state.persistent = await navigator.storage.persist();
      await refresh();
      if (!state.ready && registration?.active && !registration.installing && !registration.waiting) {
        const repaired = await workerStatus(registration.active, 'REPAIR_DOWNLOAD');
        if (!repaired) { state.status = 'error'; notify(); return false; }
        await refresh();
      }
      return true;
    } catch { if (!state.ready) state.status = 'error'; notify(); return false; }
    finally { checking = false; }
  }
  function applyUpdate() {
    if (!registration?.waiting) return false;
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), {once:true});
    registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
    return true;
  }
  window.addEventListener('online', () => { notify(); if (started) check(); });
  window.addEventListener('offline', notify);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && started) refresh(); });
  window.PrayerOffline = {start, check, refresh, label, applyUpdate, state:() => ({...state}), dismiss:() => {dismissed = true; notify();}, isDismissed:() => dismissed};
})();
