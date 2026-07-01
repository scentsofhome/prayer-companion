(()=>{
  const psalmId = 'a-psalm-of-repentance-psalm-50-51';
  const psalmFiles = Array.from({ length: 17 }, (_, i) => `data/psalm-50-51/${String(i + 1).padStart(2, '0')}.txt`);
  const importRoot = 'data/jordanville-import/';
  const titleKey = value => String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

  function ready() {
    return typeof prayersData !== 'undefined' && prayersData && Array.isArray(prayersData.prayers) && typeof byId !== 'undefined' && byId;
  }

  function addCategory(category) {
    if (!category || !category.title) return;
    prayersData.categories = prayersData.categories || [];
    if (!prayersData.categories.some(existing => existing.title === category.title)) {
      prayersData.categories.push(category);
    }
  }

  function addPrayer(prayer) {
    if (!prayer || !prayer.id || !prayer.title || !Array.isArray(prayer.text)) return false;
    const existingTitles = new Set(prayersData.prayers.map(existing => titleKey(existing.title)));
    if (byId.has(prayer.id) || existingTitles.has(titleKey(prayer.title))) return false;
    prayersData.prayers.push(prayer);
    byId.set(prayer.id, prayer);
    return true;
  }

  async function loadPsalm() {
    if (byId.has(psalmId)) return 0;
    const text = await Promise.all(psalmFiles.map(path => fetch(path).then(response => response.ok ? response.text() : '')));
    return addPrayer({
      id: psalmId,
      title: 'A Psalm of Repentance (Psalm 50/51)',
      category: 'Rule of Prayer',
      type: 'prayer',
      tags: ['psalm', 'repentance', 'rule of prayer'],
      text: text.map(line => line.trim()).filter(Boolean)
    }) ? 1 : 0;
  }

  async function loadJordanvilleChunks() {
    const manifestResponse = await fetch(`${importRoot}manifest.json`);
    if (!manifestResponse.ok) return 0;
    const manifest = await manifestResponse.json();
    let added = 0;
    for (const chunkName of manifest.chunks || []) {
      const response = await fetch(`${importRoot}${chunkName}`);
      if (!response.ok) continue;
      const chunk = await response.json();
      (chunk.categories || []).forEach(addCategory);
      (chunk.prayers || []).forEach(prayer => { if (addPrayer(prayer)) added++; });
    }
    return added;
  }

  async function load(attempt = 0) {
    try {
      if (!ready()) {
        if (attempt < 80) setTimeout(() => load(attempt + 1), 50);
        return;
      }
      const added = (await loadPsalm()) + (await loadJordanvilleChunks());
      if (added) {
        allPrayers = prayersData.prayers.filter(item => item.type === 'prayer');
        if (typeof renderQuickSheet === 'function') renderQuickSheet();
        if (typeof render === 'function') render(currentView || 'home');
      }
    } catch (error) {
      console.warn('Supplemental prayers could not be loaded.', error);
    }
  }

  load();
})();
