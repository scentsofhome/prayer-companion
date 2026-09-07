/* Versioned, local-only backup format. Validate the entire file before writing anything. */
(() => {
  const kinds = ['state','appearance','personal','favorites','history','recent','positions','reader','communion','tailoring','completion'];
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const strings = value => Array.isArray(value) && value.length <= 10000 && value.every(x => typeof x === 'string' && x.length <= 500);
  const number = (x,min,max) => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
  const fail = () => { throw new Error('This file is not a valid Prayer Rule backup. Nothing has been changed.'); };
  function validate(backup) {
    if (!object(backup) || backup.app !== 'Prayer Rule' || backup.format !== 1 || !object(backup.data)) fail();
    const data = backup.data;
    if (Object.keys(data).length !== kinds.length || !kinds.every(k => Object.hasOwn(data,k))) fail();
    // Reject dangerous keys at any depth and excessively large/nested input.
    function safe(value, depth=0) {
      if (depth > 12) fail();
      if (value === null || typeof value === 'boolean') return;
      if (typeof value === 'number') { if (!Number.isFinite(value)) fail(); return; }
      if (typeof value === 'string') { if (value.length > 12000) fail(); return; }
      if (Array.isArray(value)) { if (value.length > 10000) fail(); value.forEach(x => safe(x,depth+1)); return; }
      if (!object(value)) fail();
      for (const [key,v] of Object.entries(value)) { if (['__proto__','prototype','constructor'].includes(key)) fail(); safe(v,depth+1); }
    }
    safe(data);
    if (!object(data.state) || !object(data.appearance) || !object(data.personal)) fail();
    const s = data.state, a = data.appearance;
    if (!['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].includes(s.selectedDay) || !['Morning','Evening'].includes(s.selectedOffice)) fail();
    if (!['short','standard','extended'].includes(s.ruleLength) || !number(s.ruleDuration,3,60)) fail();
    for (const k of ['seasonMode','plannerMode','activePreset','communionMode']) if (typeof s[k] !== 'string' || s[k].length > 100) fail();
    if (!['system','light','dark'].includes(a.theme) || !number(a.scale,.86,1.6) || !number(a.leading,1.4,2) || !number(a.width,280,1200)) fail();
    for (const k of ['living','sick','departed','traveling','family']) if (!strings(data.personal[k])) fail();
    if (!strings(data.favorites) || !strings(data.recent)) fail();
    for (const kind of ['history','positions']) {
      if (!object(data[kind])) fail();
      if (!Object.values(data[kind]).every(x => number(x,0,kind === 'positions' ? 1 : Number.MAX_SAFE_INTEGER))) fail();
    }
    for (const kind of ['reader','communion','tailoring','completion']) if (data[kind] !== null && !object(data[kind])) fail();
    for (const kind of ['reader','communion']) {
      const item=data[kind]; if (!item) continue;
      if (!Number.isInteger(item.index) || item.index < 0 || item.index > 10000 || !number(item.position,0,1)) fail();
      if (item.steps !== undefined && (!Array.isArray(item.steps) || !item.steps.length || item.index >= item.steps.length)) fail();
      for (const step of item.steps || []) {
        if (!object(step) || !['prayer','psalms','personal'].includes(step.type)) fail();
        if (step.type === 'prayer' && typeof step.id !== 'string') fail();
        if (step.type === 'psalms' && !strings(step.psalms)) fail();
      }
    }
    if (data.tailoring) for (const k of ['focusIds','removeIds','moveFirstIds']) if (data.tailoring[k] !== undefined && !strings(data.tailoring[k])) fail();
    return data;
  }
  function restore(storage, keys, data) {
    validate({app:'Prayer Rule',format:1,data});
    const before = kinds.map(k => [keys[k],storage.getItem(keys[k])]);
    try { for (const kind of kinds) storage.setItem(keys[kind],JSON.stringify(data[kind])); }
    catch (error) {
      for (const [key,value] of before) { if (value === null) storage.removeItem(key); else storage.setItem(key,value); }
      throw error;
    }
  }
  window.PrayerBackup = {kinds,validate,restore};
})();
