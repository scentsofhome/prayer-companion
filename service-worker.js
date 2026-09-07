/* One complete, immutable prayer book per release. Bump RELEASE with every asset change. */
const RELEASE = '26.0.0';
const CACHE_NAME = `prayer-rule:${self.registration.scope}:${RELEASE}`;
const APP_SHELL = [
  './', './index.html', './manifest.webmanifest',
  `./src/styles.css?v=${RELEASE}`, `./src/session-time.js?v=${RELEASE}`,
  `./src/offline.js?v=${RELEASE}`, `./src/backup.js?v=${RELEASE}`, `./src/app.js?v=${RELEASE}`,
  './data/prayers.json', './data/public-domain-prayers.json', './data/prayer-rules.json',
  ...Array.from({length:17}, (_,i) => `./data/psalm-50-51/${String(i+1).padStart(2,'0')}.txt`),
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];
const absolute = path => new URL(path, self.registration.scope).href;

self.addEventListener('install', event => {
  // addAll is atomic. A failed download never replaces the working release.
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL.map(path => new Request(absolute(path), {cache:'reload'})))));
  // Updates wait until all old windows close or the user chooses Update now.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const prefix = `prayer-rule:${self.registration.scope}:`;
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => (key.startsWith(prefix) || key.startsWith('orthodox-prayer-book-')) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'REPAIR_DOWNLOAD') event.waitUntil((async () => {
    try {
      // Only repair from the matching published release, never mix a new document
      // with this worker's old assets while an update is waiting.
      const response = await fetch(new Request(absolute('./index.html'), {cache:'reload'}));
      const html = await response.text();
      if (!response.ok || !html.includes(`src/app.js?v=${RELEASE}`)) throw new Error('A newer release must be installed first');
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL.map(path => new Request(absolute(path), {cache:'reload'})));
      event.ports[0]?.postMessage({ready:true});
    } catch { event.ports[0]?.postMessage({ready:false}); }
  })());
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
  if (event.data?.type === 'OFFLINE_STATUS') event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const results = await Promise.all(APP_SHELL.map(path => cache.match(absolute(path))));
    event.ports[0]?.postMessage({ready:results.every(Boolean), release:RELEASE, count:results.filter(Boolean).length, total:APP_SHELL.length});
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  // External AI, calendar requests, and source links never enter the prayer-book cache.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const shellPath = request.mode === 'navigate' ? absolute('./index.html') : request;
    const cached = await cache.match(shellPath);
    if (cached) return cached;
    return fetch(request);
  })());
});
