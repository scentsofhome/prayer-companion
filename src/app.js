const VERSION = 'v17-final-serene';
function storageBundle(version) {
  return {
    state: `prayerRule.${version}.state`,
    favorites: `prayerRule.${version}.favorites`,
    appearance: `prayerRule.${version}.appearance`,
    personal: `prayerRule.${version}.personal`,
    reader: `prayerRule.${version}.reader`,
    history: `prayerRule.${version}.history`
  };
}
const STORAGE = storageBundle('v17serene');
const LEGACY_STORAGE = storageBundle('v16clean');
const OLDER_STORAGE = storageBundle('v16');
const OLDEST_STORAGE = storageBundle('v15');

const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const seasonOptions = {
  ordinary: { label: 'Ordinary', subtitle: 'Warm burgundy and gold', ids: [] },
  'great-lent': { label: 'Great Lent', subtitle: 'Repentance and stillness', ids: ['the-lenten-prayer-of-saint-ephrem','a-prayer-of-repentance','the-prayer-of-saint-macarius-the-egyptian'] },
  pascha: { label: 'Pascha', subtitle: 'Resurrection and thanksgiving', ids: ['the-paschal-troparion','the-prayer-of-saint-ioannikios','a-prayer-of-thanksgiving-after-holy-communion'] },
  nativity: { label: 'Nativity', subtitle: 'The Incarnation and joy', ids: ['the-christmas-kontakion','a-prayer-for-love-of-god'] },
  'nativity-fast': { label: 'Nativity Fast', subtitle: 'Preparation and obedience', ids: ['a-prayer-for-the-acceptance-of-gods-will','a-prayer-of-repentance'] },
  'dormition-fast': { label: 'Dormition Fast', subtitle: 'Theotokos and repentance', ids: ['to-the-mother-of-god-the-theotokos-and-ever-virgin-mary','a-prayer-of-repentance'] },
  fasting: { label: 'Fasting Season', subtitle: 'Watchfulness and purification', ids: ['a-prayer-of-repentance','a-prayer-against-demonic-influence'] }
};
const glossary = [
  ['Theotokos', 'Greek for “God-bearer,” the Orthodox title for the Virgin Mary.'],
  ['Trisagion', 'The “Thrice-Holy” prayer: Holy God, Holy Mighty, Holy Immortal.'],
  ['Troparion', 'A short hymn that expresses the theme of a feast, saint, or day.'],
  ['Kontakion', 'A compact hymn that often summarizes a feast or theological theme.'],
  ['Prayer Rule', 'A regular, repeatable order of prayer followed with consistency and guidance.'],
  ['Dismissal', 'The closing blessing or final prayer at the end of a service or rule.'],
  ['Compline', 'The evening service prayed before sleep.'],
  ['Akathist', 'A devotional hymn-prayer, traditionally prayed standing.']
];
const personalLabels = {
  living: 'Living',
  sick: 'Sick',
  departed: 'Departed',
  traveling: 'Traveling',
  family: 'Family'
};

const $ = (id) => document.getElementById(id);
const screen = $('screen');
const dock = $('bottom-dock');
const quickSheet = $('quick-sheet');
const quickList = $('quick-list');
const toast = $('toast');

let prayersData = null;
let rulesData = null;
let byId = new Map();
let allPrayers = [];
let currentView = 'home';
let previousView = 'library';
let activeCategory = null;
let activePrayerId = null;
let searchQuery = '';
let reader = null;
let idleTimer = null;
let touchStartX = 0;
let touchStartY = 0;

let state = storedJSON('state', {}) || {};
let selectedDay = state.selectedDay || dayNames[new Date().getDay()];
let selectedOffice = state.selectedOffice || (new Date().getHours() < 15 ? 'Morning' : 'Evening');
let ruleLength = state.ruleLength || 'standard';
let seasonMode = state.seasonMode || 'ordinary';
let communionMode = state.communionMode || 'none';
let plannerMode = state.plannerMode || 'balanced';
let favorites = new Set(storedJSON('favorites', []) || []);
let personal = Object.assign({living:[], sick:[], departed:[], traveling:[], family:[]}, storedJSON('personal', {}) || {});
let appearance = Object.assign({theme: 'dark', clarity: 17, frost: 22, reflection: 36, scale: 1, leading: 1.72, width: 720}, storedJSON('appearance', {}) || {});
let prayerHistory = storedJSON('history', {}) || {};

function safeJSON(raw, fallback = null) { try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function storedJSON(kind, fallback = null) {
  const current = safeJSON(localStorage.getItem(STORAGE[kind]), undefined);
  if (current !== undefined) return current;
  const legacy = safeJSON(localStorage.getItem(LEGACY_STORAGE[kind]), undefined);
  if (legacy !== undefined) return legacy;
  const older = safeJSON(localStorage.getItem(OLDER_STORAGE[kind]), undefined);
  if (older !== undefined) return older;
  return safeJSON(localStorage.getItem(OLDEST_STORAGE[kind]), fallback);
}
function esc(value) { return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function norm(value) { return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function dateFromKey(key) { const [y,m,d] = String(key).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function previousKey(key) { const d = dateFromKey(key); d.setDate(d.getDate() - 1); return todayKey(d); }
function dayOfYear(d = new Date()) { const start = new Date(d.getFullYear(),0,0); return Math.floor((d - start) / 86400000); }
function weekIndex(date = new Date()) { return String((Math.floor(dayOfYear(date) / 7) % 4) + 1); }
function uniqueIds(ids) { return [...new Set((ids || []).filter(Boolean))]; }
function prayer(id) { return byId.get(id); }
function showToast(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.t); showToast.t = setTimeout(() => toast.classList.remove('show'), 1500); }
function saveState() { localStorage.setItem(STORAGE.state, JSON.stringify({ selectedDay, selectedOffice, ruleLength, seasonMode, communionMode, plannerMode })); }
function saveFavorites() { localStorage.setItem(STORAGE.favorites, JSON.stringify([...favorites])); }
function savePersonal() { localStorage.setItem(STORAGE.personal, JSON.stringify(personal)); }
function saveAppearance() { localStorage.setItem(STORAGE.appearance, JSON.stringify(appearance)); }
function saveReaderProgress() {
  if (reader?.kind !== 'rule') return;
  if (reader.index <= 0) { clearSavedReader(); return; }
  localStorage.setItem(STORAGE.reader, JSON.stringify({ day: selectedDay, office: selectedOffice, length: ruleLength, season: seasonMode, communion: communionMode, plannerMode, index: reader.index, savedAt: Date.now() }));
}
function getSavedReader() { return safeJSON(localStorage.getItem(STORAGE.reader), safeJSON(localStorage.getItem(LEGACY_STORAGE.reader), safeJSON(localStorage.getItem(OLDER_STORAGE.reader), safeJSON(localStorage.getItem(OLDEST_STORAGE.reader), null)))); }
function clearSavedReader() { [STORAGE.reader, LEGACY_STORAGE.reader, OLDER_STORAGE.reader, OLDEST_STORAGE.reader].forEach(key => localStorage.removeItem(key)); }
function savedReaderForCurrentRule(steps = currentSteps()) {
  const saved = getSavedReader();
  if (!saved) return null;
  const index = Number(saved.index);
  const savedAt = Number(saved.savedAt || 0);
  const matchesRule = saved.day === selectedDay && saved.office === selectedOffice && saved.length === ruleLength && saved.season === seasonMode && saved.communion === communionMode && (saved.plannerMode || 'balanced') === plannerMode;
  const freshEnough = savedAt && (Date.now() - savedAt) < 1000 * 60 * 60 * 24 * 21;
  if (!matchesRule || !freshEnough || !Number.isFinite(index) || index <= 0 || index >= steps.length) return null;
  return { ...saved, index };
}

function applyAppearance() {
  const root = document.documentElement;
  root.dataset.theme = appearance.theme === 'light' ? 'light' : 'dark';
  root.dataset.season = seasonMode;
  root.style.setProperty('--glass-alpha', (appearance.clarity / 100).toFixed(2));
  root.style.setProperty('--glass-soft-alpha', Math.max(0.04, appearance.clarity / 220).toFixed(2));
  root.style.setProperty('--glass-alpha-boost', Math.min(0.92, appearance.clarity / 100 + 0.08).toFixed(2));
  root.style.setProperty('--glass-blur', `${appearance.frost}px`);
  root.style.setProperty('--shine-alpha', (appearance.reflection / 100).toFixed(2));
  root.style.setProperty('--reader-scale', appearance.scale.toFixed(2));
  root.style.setProperty('--reader-leading', appearance.leading.toFixed(2));
  root.style.setProperty('--reader-width', `${appearance.width}px`);
  saveAppearance();
}

async function init() {
  applyAppearance();
  try {
    const [p, r] = await Promise.all([
      fetch('data/prayers.json').then(x => x.json()),
      fetch('data/prayer-rules.json').then(x => x.json())
    ]);
    prayersData = p;
    rulesData = r;
    allPrayers = p.prayers.filter(item => item.type === 'prayer');
    byId = new Map(p.prayers.map(item => [item.id, item]));
    renderQuickSheet();
    render('home');
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    }
  } catch (err) {
    console.error(err);
    screen.innerHTML = `<div class="view"><div class="quiet-card"><h3>Prayer data could not load</h3><p>Make sure the data folder, src folder, and index.html were uploaded together to GitHub Pages.</p></div></div>`;
  }
}

function prayerWords(p) { return (p?.text || []).join(' ').trim().split(/\s+/).filter(Boolean).length; }
function estimatedMinutesForPrayer(p) { return Number(p?.estimatedMinutes) || Math.max(.5, prayerWords(p) / 130); }
function idsMinutes(ids) { return (ids || []).reduce((sum, id) => sum + estimatedMinutesForPrayer(prayer(id)), 0); }
function arrayValue(value) { return Array.isArray(value) ? value : []; }
function normalizedList(items) { return uniqueIds(arrayValue(items).map(item => norm(item)).filter(Boolean)); }
function plannerConfig() { return rulesData?.planner || {}; }
function plannerModes() { return plannerConfig().modes || { balanced: { label: 'Balanced', sourceBias: {}, themeBias: {} } }; }
function currentPlannerModeConfig() {
  const modes = plannerModes();
  if (!modes[plannerMode]) plannerMode = plannerConfig().defaultMode || Object.keys(modes)[0] || 'balanced';
  return modes[plannerMode] || modes.balanced || {};
}
function plannerModeLabel() { return currentPlannerModeConfig().label || 'Balanced'; }
function hashScore(value) {
  let h = 2166136261;
  const text = String(value || '');
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}
function targetThemes() {
  const planner = plannerConfig();
  return normalizedList([
    ...(planner.dayThemes?.[selectedDay] || []),
    ...(planner.officeThemes?.[selectedOffice] || []),
    ...(planner.seasonThemes?.[seasonMode] || [])
  ]);
}
function targetContexts() {
  return normalizedList([selectedOffice, seasonMode, selectedDay, ruleLength]);
}
function plannerBudget() {
  const fallback = ruleLength === 'extended' ? { min: 32, target: 48, max: 70 } : { min: 14, target: 22, max: 30 };
  return plannerConfig().budgets?.[ruleLength] || fallback;
}
function isCommunionPrayer(p) { return /holy communion/i.test(p?.category || '') || arrayValue(p?.contexts).some(c => /communion/i.test(c)); }
function isRuleFramePrayer(p) { return /Rule of Prayer/i.test(p?.category || '') && arrayValue(p?.contexts).some(c => /opening|closing/i.test(c)); }
function recentPenalty(id) {
  const last = Number(prayerHistory[id] || 0);
  if (!last) return 0;
  const limit = Number(plannerConfig().recentPenaltyDays || 14);
  const days = (Date.now() - last) / 86400000;
  return days < limit ? (limit - days) * 4 : 0;
}
function themeMatches(p, themes) {
  const prayerThemes = normalizedList(p?.themes || []);
  return themes.filter(theme => prayerThemes.includes(theme)).length;
}
function contextMatches(p, contexts) {
  const prayerContexts = normalizedList([p?.category, ...(p?.tags || []), ...(p?.contexts || [])]);
  return contexts.filter(context => prayerContexts.some(item => item.includes(context) || context.includes(item))).length;
}
function candidateScore(p, themes, contexts, mode, seed) {
  const sourceBias = mode.sourceBias?.[p.source] || 0;
  const themeBias = normalizedList(p.themes || []).reduce((sum, theme) => sum + (mode.themeBias?.[theme] || 0), 0);
  const recency = recentPenalty(p.id);
  return (Number(p.weight) || 50)
    + sourceBias
    + themeBias
    + themeMatches(p, themes) * 28
    + contextMatches(p, contexts) * 10
    + (favorites.has(p.id) ? 8 : 0)
    + hashScore(`${seed}:${p.id}`) * 7
    - recency;
}
function rankedCandidates(ids, exclude, themes, contexts, remaining, options = {}) {
  const mode = currentPlannerModeConfig();
  const seed = `${todayKey()}:${selectedDay}:${selectedOffice}:${ruleLength}:${seasonMode}:${plannerMode}`;
  const maxItem = options.maxItemMinutes || (ruleLength === 'extended' ? 22 : 7);
  const softLimit = Math.max(remaining || 0, options.minRemaining || (ruleLength === 'extended' ? 8 : 3));
  return ids
    .map(id => prayer(id))
    .filter(Boolean)
    .filter(p => !exclude.has(p.id))
    .filter(p => options.allowCommunion || !isCommunionPrayer(p))
    .filter(p => options.allowRuleFrame || !isRuleFramePrayer(p))
    .filter(p => estimatedMinutesForPrayer(p) <= Math.max(maxItem, softLimit))
    .map(p => ({ p, score: candidateScore(p, themes, contexts, mode, seed) }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.p.id);
}
function pickPrayerIds(ids, count, exclude, themes, contexts, remaining, options = {}) {
  const picked = [];
  for (const id of rankedCandidates(ids, exclude, themes, contexts, remaining, options)) {
    if (picked.length >= count) break;
    const minutes = estimatedMinutesForPrayer(prayer(id));
    if (!options.ignoreBudget && picked.length && minutes > remaining) continue;
    picked.push(id);
    exclude.add(id);
    remaining -= minutes;
  }
  return picked;
}
function pickFromLibrary(count, exclude, themes, contexts, remaining) {
  const pool = allPrayers
    .filter(p => p.type === 'prayer')
    .filter(p => !/Rule of Prayer/i.test(p.category || '') || /jesus prayer|publican/i.test(`${p.title} ${(p.tags || []).join(' ')}`))
    .map(p => p.id);
  return pickPrayerIds(pool, count, exclude, themes, contexts, remaining);
}
function buildDynamicBody(rules, day, office, cycle, seasonIds, opening, closing, communion) {
  const budget = plannerBudget();
  const mode = currentPlannerModeConfig();
  const sectionPlan = plannerConfig().sections?.[ruleLength] || {};
  const themes = targetThemes();
  const contexts = targetContexts();
  const bodyTarget = Math.max(4, budget.target - idsMinutes([...opening, ...closing, ...communion]));
  const bodyMin = Math.max(2, budget.min - idsMinutes([...opening, ...closing, ...communion]));
  const exclude = new Set(uniqueIds([
    ...opening,
    ...closing,
    ...communion,
    ...(rules.common.shortOpening || []),
    ...(rules.common.fullOpening || []),
    ...(rules.common.closing || []),
    ...Object.values(rules.communionModes || {}).flatMap(mode => mode.ids || [])
  ]));
  const body = [];
  const add = (ids) => {
    ids.forEach(id => {
      if (prayer(id) && !body.includes(id)) {
        body.push(id);
        exclude.add(id);
      }
    });
  };
  const remaining = () => Math.max(0, bodyTarget - idsMinutes(body));

  add([...office.main, ...office.standardExtras]);
  add(pickPrayerIds(day.daily || [], sectionPlan.day || 1, exclude, themes, contexts, remaining(), { minRemaining: 2, ignoreBudget: ruleLength === 'extended' }));
  add(pickPrayerIds(cycle?.[selectedOffice.toLowerCase()] || [], sectionPlan.weekly || 1, exclude, themes, contexts, remaining(), { minRemaining: 2 }));
  add(pickPrayerIds(seasonIds, sectionPlan.season || 0, exclude, themes, contexts, remaining(), { minRemaining: 2 }));
  if (ruleLength === 'extended') {
    add(pickPrayerIds(office.extendedExtras || [], sectionPlan.officeExtras || 3, exclude, themes, contexts, remaining(), { minRemaining: 6, ignoreBudget: true }));
  }
  add(pickFromLibrary(sectionPlan.dynamic || 2, exclude, themes, contexts, remaining()));
  let guard = 0;
  const fillTarget = mode.fillToTarget ? Math.min(bodyTarget, budget.max - idsMinutes([...opening, ...closing, ...communion])) : bodyMin;
  while (idsMinutes(body) < fillTarget && guard < 12) {
    guard++;
    const next = pickFromLibrary(1, exclude, themes, contexts, Math.max(remaining(), 2));
    if (!next.length) break;
    add(next);
  }

  return body;
}
function buildRuleSegments() {
  const rules = rulesData;
  const day = rules.days[selectedDay] || rules.days.Sunday;
  const office = rules.officeBase[selectedOffice];
  const cycle = rules.weeklyCycle[weekIndex()];
  const psalms = day?.psalms?.[selectedOffice] || [];
  const seasonIds = seasonOptions[seasonMode]?.ids || [];
  const communion = rules.communionModes[communionMode]?.ids || [];
  let opening = [];
  let body = [];
  let closing = rules.common.closing || [];

  if (ruleLength === 'short') {
    opening = rules.common.shortOpening || [];
    body = [...office.short, ...(day.daily || []).slice(0,1), ...seasonIds.slice(0,1)];
    closing = (rules.common.closing || []).slice(-1);
  } else if (ruleLength === 'extended') {
    opening = rules.common.fullOpening || [];
    body = buildDynamicBody(rules, day, office, cycle, seasonIds, opening, closing, communion);
  } else {
    opening = rules.common.fullOpening || [];
    body = buildDynamicBody(rules, day, office, cycle, seasonIds, opening, closing, communion);
  }

  return {
    opening: uniqueIds(opening),
    psalms,
    body: uniqueIds(body),
    personal: hasPersonalNames(),
    communion: uniqueIds(communion),
    closing: uniqueIds(closing),
    theme: day.theme || '',
    cycleTitle: cycle?.title || '',
    seasonTitle: seasonOptions[seasonMode]?.label || 'Ordinary'
  };
}
function stepsFromSegments(segments) {
  const steps = [];
  segments.opening.forEach(id => prayer(id) && steps.push({ type:'prayer', id, section:'Opening' }));
  if (segments.psalms.length) steps.push({ type:'psalms', psalms: segments.psalms, title:'Appointed Psalms', section:'Psalter' });
  segments.body.forEach(id => prayer(id) && steps.push({ type:'prayer', id, section:'Rule' }));
  if (segments.personal) steps.push({ type:'personal', title:'Personal Intercessions', section:'Intercessions' });
  segments.communion.forEach(id => prayer(id) && steps.push({ type:'prayer', id, section:'Holy Communion' }));
  segments.closing.forEach(id => prayer(id) && steps.push({ type:'prayer', id, section:'Closing' }));
  return steps;
}
function currentSteps() { return stepsFromSegments(buildRuleSegments()); }
function hasPersonalNames() { return Object.values(personal).some(list => list && list.length); }
function ruleMinutes(steps) { return Math.max(3, Math.round(steps.reduce((sum, s) => sum + (s.type === 'prayer' ? estimatedMinutesForPrayer(prayer(s.id)) : .5), 0))); }
function prayerOfDay() { const arr = allPrayers.filter(p => !/holy communion/i.test(p.category)); return arr[dayOfYear() % arr.length]; }
function randomPrayer() { const arr = allPrayers; return arr[Math.floor(Math.random() * arr.length)]; }
function setTodayDefaults() {
  const now = new Date();
  selectedDay = dayNames[now.getDay()];
  selectedOffice = now.getHours() < 15 ? 'Morning' : 'Evening';
  saveState();
}
function homeBeads(steps, savedIndex = 0, hasProgress = false) {
  const total = Math.min(steps.length || 1, 12);
  const progress = Math.max(0, Math.min(total - 1, Math.round((savedIndex / Math.max(1, steps.length - 1)) * (total - 1))));
  return `<div class="home-rope ${hasProgress ? 'has-progress' : 'not-started'}" aria-hidden="true">${Array.from({length: total}, (_, i) => {
    const done = hasProgress && i < progress;
    const current = hasProgress && i === progress;
    return `<span class="home-bead ${done ? 'done' : ''} ${current ? 'current' : ''}"></span>`;
  }).join('')}</div>`;
}
function nextStepTitle(steps, index) {
  const step = steps[index];
  if (!step) return 'Prayer';
  if (step.type === 'prayer') return prayer(step.id)?.title || 'Prayer';
  if (step.type === 'psalms') return 'Appointed Psalms';
  return 'Personal Intercessions';
}

function shouldAutofocusSearch() {
  return window.matchMedia?.('(pointer: fine)').matches || window.innerWidth >= 760;
}

function render(view = currentView) {
  currentView = view;
  document.body.classList.remove('reader-mode', 'ambient-mode');
  document.body.classList.toggle('search-mode', view === 'search');
  document.body.classList.toggle('home-mode', view === 'home');
  updateDock();
  saveState();
  let html = '';
  if (view === 'home') html = renderHome();
  else if (view === 'rule') html = renderRule();
  else if (view === 'library') html = renderLibrary();
  else if (view === 'category') html = renderCategory(activeCategory);
  else if (view === 'search') html = renderSearch();
  else if (view === 'settings') html = renderSettings();
  else if (view === 'prayer') html = renderPrayerDetail(activePrayerId);
  screen.innerHTML = html;
  if (view === 'search') setTimeout(() => { if (shouldAutofocusSearch()) $('search-field')?.focus(); }, 80);
  screen.scrollTop = 0;
}
function updateDock() {
  document.querySelectorAll('[data-nav]').forEach(btn => btn.classList.toggle('active', btn.dataset.nav === currentView || (currentView === 'category' && btn.dataset.nav === 'library') || (currentView === 'prayer' && btn.dataset.nav === 'library')));
}
function renderHome() {
  const segments = buildRuleSegments();
  const steps = stepsFromSegments(segments);
  const saved = savedReaderForCurrentRule(steps);
  const hasResume = !!saved;
  const pday = prayerOfDay();
  const now = new Date();
  const actualDay = dayNames[now.getDay()];
  const dateLine = now.toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });
  const isToday = selectedDay === actualDay;
  return `<div class="view home-v17 home-final-serene">
    <section class="home-main-stage" aria-label="Today’s prayer">
      <header class="home-topbar home-floating-topbar">
        <div class="app-wordmark"><span class="wordmark-mark" aria-hidden="true"></span><span>Prayer Rule</span></div>
        <button class="home-date-pill" type="button" data-use-today>${esc(dateLine)}${isToday ? '' : ' • Use today'}</button>
      </header>

      <div class="home-center-window">
        <section class="home-focus-card home-prayer-window">
          <p class="micro-label">${esc(segments.seasonTitle)} • ${esc(segments.cycleTitle)}</p>
          <h1 class="home-rule-title">${esc(selectedOffice)} Prayer</h1>
          <p class="home-intention">${esc(segments.theme || 'A quiet beginning for today’s prayer rule.')}</p>
          <div class="home-office-switch" aria-label="Choose office">
            <button class="${selectedOffice === 'Morning' ? 'active' : ''}" type="button" data-office-set="Morning">Morning</button>
            <button class="${selectedOffice === 'Evening' ? 'active' : ''}" type="button" data-office-set="Evening">Evening</button>
          </div>
          <div class="home-action-row">
            <button class="primary-button home-begin" type="button" ${hasResume ? 'data-resume-rule' : 'data-start-rule'}>${hasResume ? 'Resume Prayer' : 'Pray'}</button>
          </div>
        </section>
      </div>

      <button class="home-scroll-cue" type="button" data-scroll-explore aria-label="Scroll to prayer shortcuts">Explore ↓</button>
    </section>

    <section class="home-explore" id="home-explore" aria-label="Prayer shortcuts">
      <div class="home-section-heading">
        <p class="micro-label">For later</p>
        <h2>Open a prayer another way</h2>
      </div>
      <nav class="home-command-row" aria-label="Quick actions">
        <button class="home-command" type="button" data-open-sheet><span>Quick Prayers</span><em>Short prayers for now</em></button>
        <button class="home-command" type="button" data-nav="search"><span>Find a Prayer</span><em>Search by need or phrase</em></button>
        <button class="home-command" type="button" data-random-prayer><span>Random Prayer</span><em>Open something unexpected</em></button>
      </nav>

      <button class="home-prayer-card" type="button" data-open-prayer="${esc(pday.id)}">
        <span><em>Prayer of the Day</em><strong>${esc(pday.title)}</strong><small>${esc(pday.category)}</small></span>
        <b>Read</b>
      </button>
    </section>
  </div>`;
}
function renderRule() {
  const seg = buildRuleSegments();
  const steps = stepsFromSegments(seg);
  const stylePill = ruleLength === 'short' ? '' : `<span class="stat-pill">${esc(plannerModeLabel())}</span>`;
  let i = 0;
  const row = (title, sub) => `<div class="path-row"><div class="path-index">${++i}</div><div><div class="path-title">${esc(title)}</div><div class="path-sub">${esc(sub || '')}</div></div><div class="path-time">${i}/${steps.length}</div></div>`;
  const stepRows = steps.map(s => {
    if (s.type === 'prayer') { const p = prayer(s.id); return row(p?.title || 'Prayer', s.section); }
    if (s.type === 'psalms') return row('Appointed Psalms', s.psalms.join(' • '));
    return row('Personal Intercessions', 'Names you have saved locally');
  }).join('');
  return `<div class="view">
    <div class="rule-header">
      <div><p class="micro-label">Daily Rule</p><h1 class="page-title">${esc(selectedDay)} ${esc(selectedOffice)}</h1><p class="subtitle">${esc(seg.theme)} • ${esc(seg.cycleTitle)} • ${esc(seg.seasonTitle)}</p></div>
      <div class="top-actions"><button class="secondary-button" type="button" data-open-sheet>Quick</button><button class="primary-button" type="button" data-start-rule>Pray</button></div>
    </div>
    <div class="quiet-card"><div class="stat-row"><span class="stat-pill">${esc(ruleLength)} rule</span>${stylePill}<span class="stat-pill">${steps.length} steps</span><span class="stat-pill">${ruleMinutes(steps)} min</span>${communionMode !== 'none' ? `<span class="stat-pill">${esc(rulesData.communionModes[communionMode].label)}</span>` : ''}</div></div>
    <div class="rule-path">${stepRows}</div>
  </div>`;
}
function renderLibrary() {
  const categories = prayersData.categories || [];
  const counts = new Map();
  allPrayers.forEach(p => counts.set(p.category, (counts.get(p.category) || 0) + 1));
  const shelves = categories.filter(c => counts.has(c.title)).map(c => `<button class="shelf" type="button" data-category="${esc(c.title)}"><small>${counts.get(c.title)} prayers</small><div><h3>${esc(c.title)}</h3><p>${categoryDescription(c.title)}</p></div></button>`).join('');
  return `<div class="view"><p class="micro-label">Library</p><h1 class="page-title">Open a book</h1><p class="subtitle">The prayers are organized like shelves. Choose a section, then open a prayer.</p><div class="shelf-grid">${shelves}</div><div class="quiet-card" style="margin-top:18px"><p class="micro-label">Favorites</p><h3>${favorites.size ? `${favorites.size} saved prayers` : 'No favorites yet'}</h3><p>${favorites.size ? 'Open Search or a shelf and star prayers to keep them close.' : 'Tap the star on any prayer to save it here.'}</p><div class="list-panel">${renderFavoriteRows()}</div></div></div>`;
}
function categoryDescription(cat) {
  if (/Rule/.test(cat)) return 'Opening prayers, Creed, closing prayers, and core rule texts.';
  if (/Times/.test(cat)) return 'Morning, evening, and prayers for the hours of the day.';
  if (/Intercession/.test(cat)) return 'Short and longer prayers of intercession.';
  if (/Others/.test(cat)) return 'Prayers for family, sick, departed, enemies, and others.';
  if (/Occasions/.test(cat)) return 'Study, travel, work, trouble, chastity, and daily life.';
  if (/Seasons/.test(cat)) return 'Pascha, Nativity, Lent, and seasonal prayers.';
  if (/Theotokos/.test(cat)) return 'The Mother of God, saints, and guardian angels.';
  if (/Before/.test(cat)) return 'Preparation prayers before Holy Communion.';
  if (/After/.test(cat)) return 'Thanksgiving prayers after Holy Communion.';
  return 'Open this section of the prayer book.';
}
function renderFavoriteRows() {
  return [...favorites].filter(id => byId.has(id)).slice(0,8).map(id => prayerRow(prayer(id))).join('') || '';
}
function renderCategory(cat) {
  const list = allPrayers.filter(p => p.category === cat);
  return `<div class="view"><button class="secondary-button" type="button" data-nav="library">← Library</button><div style="height:22px"></div><p class="micro-label">${esc(list.length)} prayers</p><h1 class="page-title">${esc(cat || 'Prayers')}</h1><div class="list-panel">${list.map(prayerRow).join('')}</div></div>`;
}
function prayerRow(p) {
  return `<button class="prayer-row" type="button" data-open-prayer="${esc(p.id)}"><span class="row-glyph">✠</span><span><span class="prayer-row-title">${esc(p.title)}</span><span class="prayer-row-sub">${esc(p.category)}</span></span></button>`;
}
function renderSearch() {
  const q = searchQuery.trim();
  const normalized = norm(q);
  const results = q ? allPrayers.filter(p => norm([p.title, p.category, (p.tags||[]).join(' '), (p.text||[]).join(' ')].join(' ')).includes(normalized)) : [];
  const suggestions = ['Jesus Prayer', 'Study', 'Travel', 'Repentance', 'Thanksgiving', 'Communion'];
  const quick = (rulesData.quickPrayers || []).map(id => prayer(id)).filter(Boolean).map(p => `<button class="quick-pill" type="button" data-open-prayer="${esc(p.id)}">${esc(shortPrayerLabel(p.title))}</button>`).join('');
  return `<div class="view search-hero"><section class="spotlight-panel" aria-label="Prayer search">
    <p class="micro-label">Spotlight</p>
    <h1 class="page-title">Find a prayer</h1>
    <label class="search-box glass"><svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="5.8"></circle><path d="m15.1 15.1 4.4 4.4"></path></svg><input id="search-field" value="${esc(searchQuery)}" placeholder="Search by need, saint, phrase…" autocomplete="off" inputmode="search" enterkeyhint="search" autocapitalize="none"></label>
    ${q ? `<p class="subtitle search-subtitle">${results.length} result${results.length === 1 ? '' : 's'} for “${esc(q)}”</p><div class="list-panel spotlight-results">${results.map(prayerRow).join('') || `<div class="empty">No prayer found.</div>`}</div>` : `<div class="search-suggestions">${suggestions.map(s => `<button class="suggestion-chip" type="button" data-search-suggestion="${esc(s)}">${esc(s)}</button>`).join('')}</div><div class="quick-list spotlight-quick">${quick}</div>`}
  </section></div>`;
}
function shortPrayerLabel(title) { return title.replace(/^A Prayer (Before|After) /,'$1 ').replace(/^The /,'').replace('The Jesus Prayer','Jesus Prayer').replace('The Lenten Prayer of Saint Ephrem','St. Ephrem'); }
function renderPrayerDetail(id) {
  const p = prayer(id) || allPrayers[0];
  const fav = favorites.has(p.id);
  return `<div class="view"><button class="secondary-button" type="button" data-back>← Back</button><div style="height:28px"></div><p class="micro-label">${esc(p.category)}</p><h1 class="page-title">${esc(p.title)}</h1><div class="stat-row"><button class="secondary-button" type="button" data-fav="${esc(p.id)}">${fav ? '★ Favorited' : '☆ Favorite'}</button><button class="secondary-button" type="button" data-copy="${esc(p.id)}">Copy</button><button class="secondary-button" type="button" data-share="${esc(p.id)}">Share</button><button class="primary-button" type="button" data-read-single="${esc(p.id)}">Read</button></div><div class="reader-text" style="margin-top:32px;max-width:var(--reader-width)">${(p.text||[]).map(t => `<p>${esc(t)}</p>`).join('')}</div></div>`;
}
function renderSettings() {
  const plannerOptions = Object.entries(plannerModes()).map(([id, mode]) => `<option value="${esc(id)}">${esc(mode.label || id)}</option>`).join('');
  return `<div class="view"><p class="micro-label">Settings</p><h1 class="page-title">Make it yours</h1><p class="subtitle">Change the rule, season, names, reader typography, and the liquid-glass surface.</p><div class="form-grid">
    <div class="form-card"><h3>Rule</h3><p>Choose how much to pray by default.</p><select class="form-control" data-setting="ruleLength"><option value="short">Short</option><option value="standard">Standard</option><option value="extended">Extended</option></select></div>
    <div class="form-card"><h3>Rule Style</h3><p>Steer how the standard and extended rule choose prayers.</p><select class="form-control" data-setting="plannerMode">${plannerOptions}</select></div>
    <div class="form-card"><h3>Day</h3><p>Choose a day manually or return Home for today.</p><select class="form-control" data-setting="selectedDay">${dayNames.map(day => `<option value="${day}">${day}</option>`).join('')}</select></div>
    <div class="form-card"><h3>Office</h3><p>Morning or evening.</p><div class="segment"><button type="button" data-office-set="Morning">Morning</button><button type="button" data-office-set="Evening">Evening</button></div></div>
    <div class="form-card"><h3>Season</h3><p>Let the prayer rule follow a devotional season without changing the app appearance.</p><select class="form-control" data-setting="seasonMode">${Object.entries(seasonOptions).map(([id,s]) => `<option value="${esc(id)}">${esc(s.label)}</option>`).join('')}</select></div>
    <div class="form-card"><h3>Communion</h3><p>Add preparation or thanksgiving before the final closing.</p><select class="form-control" data-setting="communionMode"><option value="none">Off</option><option value="preparation">Before Communion</option><option value="thanksgiving">After Communion</option></select></div>
    <div class="form-card"><h3>Appearance</h3><p>Use dark or light mode.</p><div class="segment"><button type="button" data-theme-set="dark">Dark</button><button type="button" data-theme-set="light">Light</button></div></div>
    <div class="form-card"><h3>Liquid Glass</h3><p>Adjust clarity, frost, and reflection.</p>${range('clarity','Clarity',0,80,appearance.clarity)}${range('frost','Frost',0,42,appearance.frost)}${range('reflection','Reflection',0,90,appearance.reflection)}</div>
    <div class="form-card"><h3>Typography</h3><p>Tune the reader without changing the prayers.</p>${range('scale','Text size',86,138,Math.round(appearance.scale*100))}${range('leading','Line spacing',140,200,Math.round(appearance.leading*100))}${range('width','Text width',540,880,appearance.width)}</div>
  </div>${renderPersonalSettings()}${renderGlossary()}</div>`;
}
function range(key,label,min,max,value){ return `<div class="range-row"><label><span>${label}</span><strong id="range-${key}">${value}</strong></label><input type="range" min="${min}" max="${max}" value="${value}" data-range="${key}"></div>`; }
function renderPersonalSettings(){
  return `<div class="quiet-card" style="margin-top:16px"><p class="micro-label">Personal Intercessions</p><h3>Names remembered in your rule</h3><p>Saved only on this device.</p><div class="form-grid">${Object.entries(personalLabels).map(([key,label]) => `<div class="form-card"><h3>${label}</h3><div class="name-input-row"><input class="form-control" placeholder="Add a name" data-name-input="${key}"><button class="icon-button" type="button" data-add-name="${key}">+</button></div><div class="name-chip-list">${(personal[key]||[]).map((name,idx) => `<span class="name-chip">${esc(name)}<button type="button" data-remove-name="${key}" data-name-index="${idx}">×</button></span>`).join('')}</div></div>`).join('')}</div></div>`;
}
function renderGlossary(){ return `<div class="quiet-card" style="margin-top:16px"><p class="micro-label">Glossary</p><h3>Orthodox words</h3><div class="glossary-grid">${glossary.map(([term,def]) => `<div class="glossary-item"><strong>${esc(term)}</strong><span>${esc(def)}</span></div>`).join('')}</div></div>`; }

function renderQuickSheet() {
  quickList.innerHTML = (rulesData.quickPrayers || []).map(id => prayer(id)).filter(Boolean).map(p => `<button class="quick-pill" type="button" data-open-prayer="${esc(p.id)}">${esc(shortPrayerLabel(p.title))}</button>`).join('');
}
function openSheet() { quickSheet.classList.add('open'); quickSheet.setAttribute('aria-hidden', 'false'); }
function closeSheet() { quickSheet.classList.remove('open'); quickSheet.setAttribute('aria-hidden', 'true'); }

function startRule(index = 0) { const steps = currentSteps(); reader = { kind:'rule', steps, index: clamp(index,0,Math.max(0,steps.length-1)) }; openReader(); }
function startSinglePrayer(id) { reader = { kind:'single', steps: [{ type:'prayer', id, section:'Prayer' }], index: 0 }; openReader(); }
function openReader() { document.body.classList.add('reader-mode'); renderReader(); resetIdle(); }
function closeReader() { document.body.classList.remove('reader-mode', 'ambient-mode'); clearTimeout(idleTimer); reader = null; render(currentView === 'prayer' ? 'prayer' : 'home'); }
function renderReader() {
  if (!reader) return;
  const steps = reader.steps;
  const step = steps[reader.index];
  const isLast = reader.index >= steps.length - 1;
  const content = renderReaderStep(step);
  screen.innerHTML = `<div class="reader-view">
    <div class="reader-top"><button class="icon-button" type="button" data-close-reader>×</button><div class="bead-rail">${steps.map((_,i) => `<span class="bead ${i < reader.index ? 'done' : ''} ${i === reader.index ? 'current' : ''}"></span>`).join('')}</div><button class="icon-button" type="button" data-open-sheet>＋</button></div>
    <div class="reader-stage" id="reader-stage">${content}</div>
    <div class="reader-foot"><button class="reader-control" type="button" data-reader-prev ${reader.index === 0 ? 'disabled' : ''}>Previous</button><div class="reader-count">${reader.index+1} / ${steps.length}</div><button class="reader-control ${isLast ? 'reader-done' : ''}" type="button" data-reader-next>${isLast ? 'Finish' : 'Next'}</button></div>
  </div>`;
  saveReaderProgress();
}
function renderReaderStep(step) {
  if (step.type === 'prayer') {
    const p = prayer(step.id);
    return `<article class="prayer-page"><div class="reader-kicker">${esc(step.section || p?.category || 'Prayer')}</div><h1 class="reader-title">${esc(p?.title || 'Prayer')}</h1><div class="reader-text">${(p?.text || []).map(t => `<p>${esc(t)}</p>`).join('')}</div></article>`;
  }
  if (step.type === 'psalms') {
    return `<article class="prayer-page"><div class="reader-kicker">Psalter</div><h1 class="reader-title">Appointed Psalms</h1><div class="reader-text"><p>${esc(step.psalms.join(' • '))}</p><p>Read the appointed psalms from an Orthodox Psalter or your parish prayer book.</p></div></article>`;
  }
  return `<article class="prayer-page"><div class="reader-kicker">Intercessions</div><h1 class="reader-title">Remember, O Lord</h1><div class="reader-text">${Object.entries(personalLabels).map(([key,label]) => personal[key]?.length ? `<p><strong>${esc(label)}:</strong> ${esc(personal[key].join(', '))}</p>` : '').join('')}<p>Lord, have mercy.</p></div></article>`;
}
function softTap() { try { navigator.vibrate?.(8); } catch {} }
function nextReader() {
  if (!reader) return;
  if (reader.index >= reader.steps.length - 1) { completeRule(); return; }
  reader.index++;
  softTap();
  renderReader();
}
function prevReader() { if (reader && reader.index > 0) { reader.index--; softTap(); renderReader(); } }
function recordPrayerHistory(steps) {
  const now = Date.now();
  (steps || []).forEach(step => {
    if (step.type === 'prayer' && step.id) prayerHistory[step.id] = now;
  });
  localStorage.setItem(STORAGE.history, JSON.stringify(prayerHistory));
}
function completeRule() {
  if (reader?.kind === 'rule') {
    recordPrayerHistory(reader.steps);
    clearSavedReader();
    reader = null;
    document.body.classList.remove('reader-mode', 'ambient-mode');
    render('home');
    showToast('May God remember your prayers.');
  } else closeReader();
}
function resetIdle() {
  document.body.classList.remove('ambient-mode');
  clearTimeout(idleTimer);
  if (reader) idleTimer = setTimeout(() => document.body.classList.add('ambient-mode'), 10000);
}

function prayerPlainText(id) { const p = prayer(id); return p ? `${p.title}\n\n${(p.text || []).join('\n\n')}` : ''; }
async function copyPrayer(id) { try { await navigator.clipboard.writeText(prayerPlainText(id)); showToast('Prayer copied'); } catch { showToast('Copy unavailable'); } }
async function sharePrayer(id) {
  const p = prayer(id); const text = prayerPlainText(id);
  if (navigator.share) { try { await navigator.share({ title: p?.title || 'Prayer', text }); } catch {} }
  else copyPrayer(id);
}
function toggleFav(id) { favorites.has(id) ? favorites.delete(id) : favorites.add(id); saveFavorites(); showToast(favorites.has(id) ? 'Added to favorites' : 'Removed from favorites'); if (currentView === 'prayer') render('prayer'); }

screen.addEventListener('input', (e) => {
  const search = e.target.closest('#search-field');
  if (search) { searchQuery = search.value; render('search'); return; }
  const rangeInput = e.target.closest('[data-range]');
  if (rangeInput) {
    const key = rangeInput.dataset.range; const val = Number(rangeInput.value); const label = $(`range-${key}`); if (label) label.textContent = val;
    if (key === 'clarity') appearance.clarity = val;
    if (key === 'frost') appearance.frost = val;
    if (key === 'reflection') appearance.reflection = val;
    if (key === 'scale') appearance.scale = val / 100;
    if (key === 'leading') appearance.leading = val / 100;
    if (key === 'width') appearance.width = val;
    applyAppearance();
  }
});

screen.addEventListener('change', (e) => {
  const setting = e.target.closest('[data-setting]');
  if (!setting) return;
  const key = setting.dataset.setting;
  if (key === 'ruleLength') ruleLength = setting.value;
  if (key === 'selectedDay') selectedDay = setting.value;
  if (key === 'seasonMode') seasonMode = setting.value;
  if (key === 'communionMode') communionMode = setting.value;
  if (key === 'plannerMode') plannerMode = setting.value;
  applyAppearance(); saveState(); render('settings');
});

document.addEventListener('click', async (e) => {
  const nav = e.target.closest('[data-nav]');
  if (nav) { closeSheet(); activePrayerId = null; activeCategory = null; if (nav.dataset.nav === 'search') searchQuery = ''; render(nav.dataset.nav); return; }
  if (e.target.closest('[data-open-sheet]')) { openSheet(); return; }
  if (e.target.closest('[data-close-sheet]')) { closeSheet(); return; }
  const cat = e.target.closest('[data-category]');
  if (cat) { activeCategory = cat.dataset.category; render('category'); return; }
  const openPrayer = e.target.closest('[data-open-prayer]');
  if (openPrayer) { closeSheet(); previousView = currentView; activePrayerId = openPrayer.dataset.openPrayer; render('prayer'); return; }
  if (e.target.closest('[data-back]')) { render(previousView === 'category' && activeCategory ? 'category' : (previousView || 'library')); return; }
  if (e.target.closest('[data-start-rule]')) { startRule(0); return; }
  if (e.target.closest('[data-resume-rule]')) { const saved = savedReaderForCurrentRule(); startRule(saved?.index || 0); return; }
  if (e.target.closest('[data-random-prayer]')) { const p = randomPrayer(); previousView = currentView; activePrayerId = p.id; render('prayer'); return; }
  const suggestion = e.target.closest('[data-search-suggestion]');
  if (suggestion) { searchQuery = suggestion.dataset.searchSuggestion || ''; render('search'); return; }
  if (e.target.closest('[data-use-today]')) { setTodayDefaults(); render('home'); return; }
  if (e.target.closest('[data-scroll-explore]')) { screen.querySelector('#home-explore')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  const readSingle = e.target.closest('[data-read-single]');
  if (readSingle) { startSinglePrayer(readSingle.dataset.readSingle); return; }
  const fav = e.target.closest('[data-fav]');
  if (fav) { toggleFav(fav.dataset.fav); return; }
  const copy = e.target.closest('[data-copy]');
  if (copy) { await copyPrayer(copy.dataset.copy); return; }
  const share = e.target.closest('[data-share]');
  if (share) { await sharePrayer(share.dataset.share); return; }
  if (e.target.closest('[data-close-reader]')) { closeReader(); return; }
  if (e.target.closest('[data-reader-prev]')) { prevReader(); return; }
  if (e.target.closest('[data-reader-next]')) { nextReader(); return; }
  if (e.target.closest('[data-finish-reader]')) { closeReader(); render('home'); return; }
  const theme = e.target.closest('[data-theme-set]');
  if (theme) { appearance.theme = theme.dataset.themeSet; applyAppearance(); render('settings'); return; }
  const office = e.target.closest('[data-office-set]');
  if (office) { selectedOffice = office.dataset.officeSet; saveState(); render(currentView === 'settings' ? 'settings' : 'home'); return; }
  const addName = e.target.closest('[data-add-name]');
  if (addName) { const key = addName.dataset.addName; const input = screen.querySelector(`[data-name-input="${key}"]`); const value = input?.value.trim(); if (value) { personal[key] = [...(personal[key] || []), value]; savePersonal(); render('settings'); } return; }
  const removeName = e.target.closest('[data-remove-name]');
  if (removeName) { const key = removeName.dataset.removeName; const idx = Number(removeName.dataset.nameIndex); personal[key].splice(idx,1); savePersonal(); render('settings'); return; }
});

['mousemove','touchstart','keydown','scroll'].forEach(ev => document.addEventListener(ev, resetIdle, { passive:true }));
document.addEventListener('keydown', (e) => {
  if (!reader && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchQuery = ''; render('search'); }
  if (!reader) return;
  if (e.key === 'ArrowRight') nextReader();
  if (e.key === 'ArrowLeft') prevReader();
  if (e.key === 'Escape') closeReader();
});
document.addEventListener('touchstart', (e) => { if (!reader) return; touchStartX = e.changedTouches[0].screenX; touchStartY = e.changedTouches[0].screenY; }, { passive:true });
document.addEventListener('touchend', (e) => {
  if (!reader) return;
  const dx = e.changedTouches[0].screenX - touchStartX;
  const dy = e.changedTouches[0].screenY - touchStartY;
  if (Math.abs(dx) > 58 && Math.abs(dx) > Math.abs(dy) * 1.6) { dx < 0 ? nextReader() : prevReader(); }
}, { passive:true });

function syncSettingsUI() {
  const ruleSelect = screen.querySelector('[data-setting="ruleLength"]'); if (ruleSelect) ruleSelect.value = ruleLength;
  const daySelect = screen.querySelector('[data-setting="selectedDay"]'); if (daySelect) daySelect.value = selectedDay;
  const seasonSelect = screen.querySelector('[data-setting="seasonMode"]'); if (seasonSelect) seasonSelect.value = seasonMode;
  const communionSelect = screen.querySelector('[data-setting="communionMode"]'); if (communionSelect) communionSelect.value = communionMode;
  const plannerSelect = screen.querySelector('[data-setting="plannerMode"]'); if (plannerSelect) plannerSelect.value = plannerMode;
  screen.querySelectorAll('[data-theme-set]').forEach(b => b.classList.toggle('active', b.dataset.themeSet === appearance.theme));
  screen.querySelectorAll('[data-office-set]').forEach(b => b.classList.toggle('active', b.dataset.officeSet === selectedOffice));
}
const originalRender = render;
render = function(view = currentView) { originalRender(view); if (view === 'settings') syncSettingsUI(); };

init();
