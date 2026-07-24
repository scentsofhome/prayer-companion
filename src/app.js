const VERSION = 'v24.0.0-smoother-companion';
function storageBundle(version) {
  return {
    state: `prayerRule.${version}.state`,
    favorites: `prayerRule.${version}.favorites`,
    appearance: `prayerRule.${version}.appearance`,
    personal: `prayerRule.${version}.personal`,
    reader: `prayerRule.${version}.reader`,
    history: `prayerRule.${version}.history`,
    recent: `prayerRule.${version}.recent`,
    positions: `prayerRule.${version}.positions`,
    communion: `prayerRule.${version}.communion`,
    tailoring: `prayerRule.${version}.tailoring`,
    completion: `prayerRule.${version}.completion`,
    daily: `prayerRule.${version}.daily`
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
const searchIntents = {
  anxiety: ['anxiety','anxious','worried','worry','afraid','fear','peace','trust','trouble'],
  exam: ['exam','test','school','study','lesson','wisdom','learning'],
  grief: ['grief','grieving','died','death','funeral','departed','repose','mourning'],
  illness: ['ill','illness','sick','hospital','healing','health'],
  confession: ['confession','confess','sin','sins','repentance','forgiveness','mercy'],
  sleep: ['sleep','bed','night','insomnia','evening','protection'],
  travel: ['travel','trip','journey','driving','flight','travelling'],
  work: ['work','job','career','task','beginning','labour'],
  home: ['home','house','moving','move','construction','building','foundation','household'],
  harvest: ['harvest','garden','first fruits','food','offering','provision'],
  family: ['family','parent','parents','child','children','marriage'],
  communion: ['communion','eucharist','preparation','thanksgiving'],
  temptation: ['temptation','addiction','passion','chastity','purity','deliverance'],
  guidance: ['guidance','decision','unknown','will','wisdom','discernment'],
  forgiveness: ['forgive','forgiveness','enemy','enemies','reconciliation','love','mercy']
};
const searchStopWords = new Set(['a','am','an','and','are','for','i','in','is','m','im','me','my','need','new','someone','of','on','please','prayer','the','to','with']);

const $ = (id) => document.getElementById(id);
const screen = $('screen');
const appChrome = $('app-chrome');
const quickSheet = $('quick-sheet');
const quickList = $('quick-list');
const toast = $('toast');
const assistantPanel = $('assistant-panel');
const assistantContent = $('assistant-content');
const COMPANION_ENDPOINT = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? `${location.protocol}//${location.hostname}:8787`
  : 'https://prayer-companion-ai.scentsofhome4.workers.dev';
const companionFeatures = {
  reflect: {
    label: 'Reflect',
    eyebrow: 'Gentle reflection',
    title: 'What is on your heart?',
    description: 'Talk through what you are carrying and receive one gentle next step.',
    prompts: [
      ['I’m feeling anxious', 'I am feeling anxious. Help me slow down, reflect, and take one small step toward prayer.'],
      ['I feel spiritually dry', 'Prayer feels dry and difficult today. Help me approach it gently without shame.'],
      ['End-of-day reflection', 'Guide me through a short, gentle end-of-day reflection with gratitude, honesty, and hope.']
    ]
  },
  prayer: {
    label: 'Find words',
    eyebrow: 'Original prayer help',
    title: 'Find words for prayer',
    description: 'Receive a short original prayer for this moment—not a replacement for the Church’s prayers.',
    prompts: [
      ['Give thanks', 'Help me find words for a brief prayer of gratitude today.'],
      ['Pray for someone', 'Help me write a short prayer for someone I love, without asking for private details.'],
      ['Before a difficult day', 'Offer a short original prayer for courage, humility, and peace before a difficult day.']
    ]
  },
  rule: {
    label: 'Plan',
    eyebrow: 'Prayer-rule guide',
    title: 'Prepare a prayer rule',
    description: 'Get practical guidance for beginning, shortening, or returning to a daily prayer rule.',
    prompts: [
      ['Begin a daily rule', 'Help me begin a simple, sustainable Orthodox prayer rule. Keep the advice practical and encourage guidance from my priest.'],
      ['Return after a lapse', 'I have fallen out of my prayer routine. Help me return gently with a small next step.'],
      ['Pray with little time', 'I have only a few minutes. Help me approach a short prayer rule attentively rather than rushing.']
    ]
  },
  explain: {
    label: 'Understand',
    eyebrow: 'Prayer explanation',
    title: 'Understand a prayer',
    description: 'Explore difficult words, images, and themes while keeping the prayer itself at the center.',
    prompts: [
      ['Why repeat prayers?', 'Explain gently why repeated prayers can be meaningful in Orthodox Christian practice.'],
      ['What is watchfulness?', 'Explain the Orthodox prayer term “watchfulness” in plain language, without claiming spiritual authority.'],
      ['How should I read slowly?', 'Give me a simple way to read a traditional prayer slowly and attentively.']
    ]
  },
  daily: {
    label: 'Today',
    eyebrow: 'Today in the Church',
    title: 'Understand this day',
    description: 'Explore today’s commemoration and appointed readings with the official GOARCH calendar as context.',
    prompts: []
  }
};

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
let companionMessages = [];
let companionSending = false;
let companionFeature = 'reflect';
let companionDraft = '';
let companionContext = '';
let companionContextLabel = '';
let assistantOpen = false;
let companionPlacement = 'panel';
let sessionCustomization = safeJSON(localStorage.getItem(STORAGE.tailoring), null);
let sessionCompletion = safeJSON(localStorage.getItem(STORAGE.completion), null);
let sessionGuideSending = false;
let lastTranscriptScroll = 0;
let dailyCalendar = null;
let dailyCalendarLoading = true;
let dailyCalendarError = '';

let state = storedJSON('state', {}) || {};
let selectedDay = state.selectedDay || dayNames[new Date().getDay()];
let selectedOffice = state.selectedOffice || (new Date().getHours() < 15 ? 'Morning' : 'Evening');
let ruleLength = state.ruleLength || 'standard';
let seasonMode = state.seasonMode || 'ordinary';
let communionMode = 'none';
let plannerMode = state.plannerMode || 'balanced';
let activePreset = state.activePreset || 'custom';
let favorites = new Set(storedJSON('favorites', []) || []);
let personal = Object.assign({living:[], sick:[], departed:[], traveling:[], family:[]}, storedJSON('personal', {}) || {});
let appearance = Object.assign({theme: 'dark', clarity: 17, frost: 22, reflection: 36, scale: 1, leading: 1.72, width: 720}, storedJSON('appearance', {}) || {});
let prayerHistory = storedJSON('history', {}) || {};
let recentPrayerIds = storedJSON('recent', []) || [];
let readingPositions = storedJSON('positions', {}) || {};
let ruleDuration = Number(state.ruleDuration) || (ruleLength === 'short' ? 5 : ruleLength === 'extended' ? 40 : 20);
let activeCommunionMode = 'preparation';
let previousScrollTop = 0;
let wakeLock = null;
let positionTimer = null;
let sessionMoment = window.PrayerSessionTime?.forDate(new Date()) || { day:dayNames[new Date().getDay()], office:new Date().getHours() < 15 ? 'Morning' : 'Evening', lateNight:false, greeting:'Welcome', effectiveDate:new Date(), dateLabel:'' };

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
function inlineMarkdown(value) {
  return esc(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}
function markdownHTML(value) {
  const lines = String(value || '').replace(/\r/g, '').split('\n');
  const output = [];
  let list = [];
  const flushList = () => { if (list.length) { output.push(`<ul>${list.map(item => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`); list = []; } };
  for (const raw of lines) {
    const line = raw.trim();
    const bullet = line.match(/^[-•]\s+(.+)/);
    if (bullet) { list.push(bullet[1]); continue; }
    flushList();
    if (!line) continue;
    const heading = line.match(/^#{1,3}\s+(.+)/);
    if (heading) output.push(`<h3>${inlineMarkdown(heading[1])}</h3>`);
    else output.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  flushList();
  return output.join('');
}
function norm(value) { return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function liturgicalDateKey() { return todayKey(sessionMoment.effectiveDate || new Date()); }
function safeLink(value) {
  try { const url = new URL(String(value || '')); return url.protocol === 'https:' ? url.toString() : ''; }
  catch { return ''; }
}
function dateFromKey(key) { const [y,m,d] = String(key).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function previousKey(key) { const d = dateFromKey(key); d.setDate(d.getDate() - 1); return todayKey(d); }
function dayOfYear(d = new Date()) { const start = new Date(d.getFullYear(),0,0); return Math.floor((d - start) / 86400000); }
function weekIndex(date = new Date()) { return String((Math.floor(dayOfYear(date) / 7) % 4) + 1); }
function uniqueIds(ids) { return [...new Set((ids || []).filter(Boolean))]; }
function prayer(id) { return byId.get(id); }
function showToast(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.t); showToast.t = setTimeout(() => toast.classList.remove('show'), 1500); }
function saveState() { localStorage.setItem(STORAGE.state, JSON.stringify({ selectedDay, selectedOffice, ruleLength, ruleDuration, seasonMode, communionMode, plannerMode, activePreset })); }
function saveTailoring() {
  if (sessionCustomization) localStorage.setItem(STORAGE.tailoring, JSON.stringify(sessionCustomization));
  else localStorage.removeItem(STORAGE.tailoring);
}
function saveCompletion() {
  if (sessionCompletion) localStorage.setItem(STORAGE.completion, JSON.stringify(sessionCompletion));
  else localStorage.removeItem(STORAGE.completion);
}
function saveFavorites() { localStorage.setItem(STORAGE.favorites, JSON.stringify([...favorites])); }
function savePersonal() { localStorage.setItem(STORAGE.personal, JSON.stringify(personal)); }
function saveAppearance() { localStorage.setItem(STORAGE.appearance, JSON.stringify(appearance)); }
function saveReaderProgress() {
  if (reader?.kind === 'communion') {
    localStorage.setItem(STORAGE.communion, JSON.stringify({ mode:reader.mode, variant:reader.variant, total:reader.steps.length, index:reader.index, position:Number(reader.position)||0, savedAt:Date.now() }));
    return;
  }
  if (reader?.kind !== 'rule') return;
  if (reader.index <= 0 && (Number(reader.position)||0) < .04) { clearSavedReader(); return; }
  localStorage.setItem(STORAGE.reader, JSON.stringify({ day: selectedDay, office: selectedOffice, length: ruleLength, duration:ruleDuration, season: seasonMode, communion: communionMode, plannerMode, index: reader.index, position:Number(reader.position)||0, savedAt: Date.now() }));
}
function getSavedReader() { return safeJSON(localStorage.getItem(STORAGE.reader), safeJSON(localStorage.getItem(LEGACY_STORAGE.reader), safeJSON(localStorage.getItem(OLDER_STORAGE.reader), safeJSON(localStorage.getItem(OLDEST_STORAGE.reader), null)))); }
function clearSavedReader() { [STORAGE.reader, LEGACY_STORAGE.reader, OLDER_STORAGE.reader, OLDEST_STORAGE.reader].forEach(key => localStorage.removeItem(key)); }
function savedReaderForCurrentRule(steps = currentSteps()) {
  const saved = getSavedReader();
  if (!saved) return null;
  const index = Number(saved.index);
  const savedAt = Number(saved.savedAt || 0);
  const matchesRule = saved.day === selectedDay && saved.office === selectedOffice && saved.length === ruleLength && Number(saved.duration || ruleDuration) === ruleDuration && saved.season === seasonMode && saved.communion === communionMode && (saved.plannerMode || 'balanced') === plannerMode;
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
  sessionMoment = window.PrayerSessionTime?.forDate(new Date()) || sessionMoment;
  selectedDay = sessionMoment.day;
  selectedOffice = sessionMoment.office;
  applyAppearance();
  try {
    const [p, r, publicDomain] = await Promise.all([
      fetch('data/prayers.json').then(x => x.json()),
      fetch('data/prayer-rules.json').then(x => x.json()),
      fetch('data/public-domain-prayers.json').then(x => x.json())
    ]);
    const existingIds = new Set(p.prayers.map(item => item.id));
    const additions = arrayValue(publicDomain.prayers).filter(item => item?.id && !existingIds.has(item.id));
    p.prayers.push(...additions);
    prayersData = p;
    rulesData = r;
    allPrayers = p.prayers.filter(item => item.type === 'prayer');
    byId = new Map(p.prayers.map(item => [item.id, item]));
    renderQuickSheet();
    render('home');
    loadDailyCalendar();
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (sessionStorage.getItem('prayerRule.swReloaded.v24')) return;
        sessionStorage.setItem('prayerRule.swReloaded.v24', '1');
        location.reload();
      });
      navigator.serviceWorker.register('./service-worker.js?v=24.0.0').then(registration => registration.update()).catch(() => {});
    }
  } catch (err) {
    console.error(err);
    screen.innerHTML = `<div class="view"><div class="quiet-card"><h3>Prayer data could not load</h3><p>Make sure the data folder, src folder, and index.html were uploaded together to GitHub Pages.</p></div></div>`;
  }
}

function updateDailyView() {
  if (reader || !['home', 'daily'].includes(currentView)) return;
  const scrollTop = screen.scrollTop;
  render(currentView);
  requestAnimationFrame(() => { screen.scrollTop = scrollTop; });
}

async function loadDailyCalendar(force = false) {
  const date = liturgicalDateKey();
  const cached = safeJSON(localStorage.getItem(STORAGE.daily), null);
  if (!force && cached?.date === date && cached?.data) {
    dailyCalendar = cached.data;
    dailyCalendarLoading = false;
    dailyCalendarError = '';
    updateDailyView();
  } else if (!dailyCalendar || dailyCalendar.date !== date) {
    dailyCalendar = null;
    dailyCalendarLoading = true;
    dailyCalendarError = '';
    updateDailyView();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(`${COMPANION_ENDPOINT}/daily?date=${encodeURIComponent(date)}`, { signal: controller.signal, cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Today’s calendar could not be loaded.');
    if (data.date !== date || data.sourceDate !== date || !Array.isArray(data.saints) || !Array.isArray(data.readings)) throw new Error('Today’s calendar returned incomplete information.');
    dailyCalendar = data;
    dailyCalendarLoading = false;
    dailyCalendarError = '';
    localStorage.setItem(STORAGE.daily, JSON.stringify({ date, data, savedAt: Date.now() }));
  } catch (error) {
    if (!dailyCalendar || dailyCalendar.date !== date) {
      dailyCalendar = null;
      dailyCalendarLoading = false;
      dailyCalendarError = error?.name === 'AbortError' ? 'Today’s calendar took too long to respond.' : (error?.message || 'Today’s calendar is temporarily unavailable.');
    }
  } finally {
    clearTimeout(timeout);
    updateDailyView();
  }
}

function prayerWords(p) { return (p?.text || []).join(' ').trim().split(/\s+/).filter(Boolean).length; }
function estimatedMinutesForPrayer(p) { return Number(p?.estimatedMinutes) || Math.max(.5, prayerWords(p) / 130); }
function idsMinutes(ids) { return (ids || []).reduce((sum, id) => sum + estimatedMinutesForPrayer(prayer(id)), 0); }
function arrayValue(value) { return Array.isArray(value) ? value : []; }
function normalizedList(items) { return uniqueIds(arrayValue(items).map(item => norm(item)).filter(Boolean)); }
function plannerConfig() { return rulesData?.planner || {}; }
function presetsConfig() { return rulesData?.presets || {}; }
function rulePresets() { return presetsConfig().items || {}; }
function plannerModes() { return plannerConfig().modes || { balanced: { label: 'Balanced', sourceBias: {}, themeBias: {} } }; }
function currentPlannerModeConfig() {
  const modes = plannerModes();
  if (!modes[plannerMode]) plannerMode = plannerConfig().defaultMode || Object.keys(modes)[0] || 'balanced';
  return modes[plannerMode] || modes.balanced || {};
}
function plannerModeLabel() { return currentPlannerModeConfig().label || 'Balanced'; }
function activePresetData() { return rulePresets()[activePreset]; }
function presetLabel() { return activePresetData()?.label || 'Custom'; }
function setCustomPreset() { activePreset = 'custom'; }
function applyPreset(id) {
  const preset = rulePresets()[id];
  if (!preset) return;
  activePreset = id;
  if (preset.ruleLength) ruleLength = preset.ruleLength;
  if (preset.selectedOffice) selectedOffice = preset.selectedOffice;
  if (preset.seasonMode) seasonMode = preset.seasonMode;
  if (preset.communionMode) communionMode = preset.communionMode;
  if (preset.plannerMode) plannerMode = preset.plannerMode;
  clearSavedReader();
  applyAppearance();
  saveState();
}
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
  const target = clamp(Number(ruleDuration) || 20, 5, 60);
  return { min: Math.max(3, Math.round(target * .72)), target, max: Math.round(target * 1.32) };
}
function setRuleDuration(value) {
  ruleDuration = clamp(Number(value) || 20, 5, 60);
  ruleLength = ruleDuration <= 7 ? 'short' : ruleDuration >= 32 ? 'extended' : 'standard';
  setCustomPreset();
  clearSavedReader();
  saveState();
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

  const officeAnchors = ruleDuration <= 10 ? (office.main || []).slice(0,1) : (office.main || []);
  const officeExtras = ruleDuration >= 18 ? (office.standardExtras || []) : ruleDuration >= 12 ? (office.standardExtras || []).slice(0,1) : [];
  add([...officeAnchors, ...officeExtras]);
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
function applySessionTailoring(baseSteps) {
  const custom = sessionCustomization;
  if (!custom || custom.day !== selectedDay || custom.office !== selectedOffice) return baseSteps;
  const removed = new Set(arrayValue(custom.removeIds));
  let steps = baseSteps.filter(step => step.type !== 'prayer' || ['Opening','Closing'].includes(step.section) || !removed.has(step.id));
  const existing = new Set(steps.filter(step => step.type === 'prayer').map(step => step.id));
  const additions = uniqueIds([...arrayValue(custom.focusIds), ...arrayValue(custom.moveFirstIds)]).filter(id => prayer(id) && !removed.has(id));
  const closingIndex = steps.findIndex(step => step.section === 'Closing');
  const insertAt = closingIndex < 0 ? steps.length : closingIndex;
  const addedSteps = additions.filter(id => !existing.has(id)).map(id => ({ type:'prayer', id, section:'Tailored for this session' }));
  steps.splice(insertAt, 0, ...addedSteps);

  const priority = arrayValue(custom.moveFirstIds);
  if (priority.length) {
    const frame = steps.filter(step => step.section === 'Opening');
    const closing = steps.filter(step => step.section === 'Closing');
    const middle = steps.filter(step => step.section !== 'Opening' && step.section !== 'Closing');
    middle.sort((a, b) => {
      const ai = a.type === 'prayer' ? priority.indexOf(a.id) : -1;
      const bi = b.type === 'prayer' ? priority.indexOf(b.id) : -1;
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });
    steps = [...frame, ...middle, ...closing];
  }

  const target = clamp(Number(custom.minutes) || ruleDuration, 3, 45);
  const removable = () => steps
    .map((step, index) => ({ step, index, minutes: step.type === 'prayer' ? estimatedMinutesForPrayer(prayer(step.id)) : .5 }))
    .filter(item => !['Opening','Closing','Intercessions'].includes(item.step.section) && item.step.type === 'prayer')
    .sort((a, b) => b.minutes - a.minutes);
  let guard = 0;
  while (ruleMinutes(steps) > Math.max(target + 1, target * 1.25) && guard < 20) {
    const candidate = removable()[0];
    if (!candidate || steps.length <= 3) break;
    steps.splice(candidate.index, 1);
    guard++;
  }
  return steps;
}
function currentSteps() {
  const custom = sessionCustomization && sessionCustomization.day === selectedDay && sessionCustomization.office === selectedOffice ? sessionCustomization : null;
  if (!custom?.minutes) return stepsFromSegments(buildRuleSegments());
  const previousDuration = ruleDuration;
  const previousLength = ruleLength;
  ruleDuration = clamp(Number(custom.minutes) || previousDuration, 3, 45);
  ruleLength = ruleDuration <= 7 ? 'short' : ruleDuration >= 32 ? 'extended' : 'standard';
  const base = stepsFromSegments(buildRuleSegments());
  ruleDuration = previousDuration;
  ruleLength = previousLength;
  return applySessionTailoring(base);
}
function resetSessionTailoring() {
  sessionCustomization = null;
  saveTailoring();
  clearSavedReader();
}
function hasPersonalNames() { return Object.values(personal).some(list => list && list.length); }
function ruleMinutes(steps) { return Math.max(3, Math.round(steps.reduce((sum, s) => sum + (s.type === 'prayer' ? estimatedMinutesForPrayer(prayer(s.id)) : .5), 0))); }
function prayerOfDay() { const arr = allPrayers.filter(p => !/holy communion/i.test(p.category)); return arr[dayOfYear() % arr.length]; }
function randomPrayer() { const arr = allPrayers; return arr[Math.floor(Math.random() * arr.length)]; }
function rememberPrayer(id) {
  if (!id || !byId.has(id)) return;
  recentPrayerIds = [id, ...recentPrayerIds.filter(item => item !== id)].slice(0, 12);
  localStorage.setItem(STORAGE.recent, JSON.stringify(recentPrayerIds));
}
function recentPrayers(limit = 6) { return recentPrayerIds.map(id => prayer(id)).filter(Boolean).slice(0, limit); }
function expandedSearchTerms(query) {
  const raw = norm(query).split(/[^a-z0-9]+/).filter(term => term && !searchStopWords.has(term));
  const expanded = new Set(raw);
  for (const [intent, words] of Object.entries(searchIntents)) {
    if (raw.some(term => term === intent || words.includes(term))) words.forEach(word => expanded.add(norm(word)));
  }
  return [...expanded];
}
function searchPrayers(query, withScores = false) {
  const phrase = norm(query).trim();
  const originalTerms = norm(query).split(/[^a-z0-9]+/).filter(term => term && !searchStopWords.has(term));
  const terms = expandedSearchTerms(query);
  if (!phrase || !terms.length) return [];
  const ranked = allPrayers.map(p => {
    const title = norm(p.title);
    const category = norm(p.category);
    const tags = normalizedList([...(p.tags||[]), ...(p.themes||[]), ...(p.contexts||[])]);
    const metadata = tags.join(' ');
    const body = norm((p.text||[]).join(' '));
    const matches = [];
    let score = title.includes(phrase) ? 140 : 0;
    for (const term of terms) {
      if (title.includes(term)) score += 34;
      if (metadata.includes(term)) { score += 22; matches.push(term); }
      if (category.includes(term)) score += 14;
      if (body.includes(term)) score += 3;
    }
    if (favorites.has(p.id)) score += 4;
    if (recentPrayerIds.includes(p.id)) score += 2;
    const directMatches = uniqueIds(matches.filter(term => originalTerms.includes(term)));
    const intentMatches = uniqueIds(matches.filter(term => !originalTerms.includes(term)));
    return { p, score, directMatches, intentMatches };
  }).filter(item => item.score >= 10).sort((a,b) => b.score - a.score || a.p.title.localeCompare(b.p.title));
  return withScores ? ranked : ranked.map(item => item.p);
}
function naturalList(items) {
  const labels = items.map(item => item.replace(/-/g,' '));
  if (labels.length < 2) return labels[0] || 'this need';
  return `${labels.slice(0,-1).join(', ')} and ${labels.at(-1)}`;
}
function recommendationReason(item, query) {
  const p = item.p;
  const direct = item.directMatches.slice(0,2);
  const inferred = item.intentMatches.slice(0,2);
  if (direct.length) return `Closely matches ${naturalList(direct)} in what you described.`;
  if (inferred.length) return `Recommended for themes of ${naturalList(inferred)} related to your request.`;
  if (/communion/i.test(query)) return `Part of the Church’s ${p.category.toLowerCase()} collection.`;
  if (estimatedMinutesForPrayer(p) <= 1.5) return 'A short prayer that can be prayed immediately.';
  return `A relevant prayer from ${p.category.toLowerCase()}.`;
}
function recommendationCard(item, rank, query) {
  const p = item.p;
  const minutes = Math.max(.5, estimatedMinutesForPrayer(p));
  return `<button class="recommendation-card" type="button" data-open-prayer="${esc(p.id)}"><span class="recommendation-rank">0${rank}</span><span class="recommendation-copy"><em>${esc(p.category)}</em><strong>${esc(p.title)}</strong><small>${esc(recommendationReason(item, query))}</small><b>About ${minutes.toFixed(minutes < 1 ? 1 : 0)} min</b></span><span class="recommendation-open">Open</span></button>`;
}
function guideResultsHTML(query) {
  const q = String(query || '').trim();
  const ranked = searchPrayers(q, true);
  const recommendations = ranked.slice(0,3);
  const suggestions = ['I’m anxious about tomorrow', 'I have an exam', 'Someone I love is sick', 'I need to forgive someone', 'Someone close to me died', 'I’m preparing for Communion'];
  const recent = recentPrayers(4);
  if (!q) return `<div class="guide-prompts">${suggestions.map(item => `<button class="guide-prompt" type="button" data-search-suggestion="${esc(item)}">${esc(item)}</button>`).join('')}</div>${recent.length ? `<section class="search-recent"><p class="micro-label">Recently opened</p><div class="list-panel">${recent.map(prayerRow).join('')}</div></section>` : ''}`;
  const companionCta = `<button class="search-companion-cta" type="button" data-ai-guide="${esc(q)}"><span aria-hidden="true">✦</span><span><strong>Talk this through with the Companion</strong><small>Reflect on what you shared and choose a gentle next step.</small></span><b aria-hidden="true">→</b></button>`;
  if (!recommendations.length) return `<section class="recommendations" aria-live="polite"><div class="recommendation-heading"><div><p class="micro-label">Prayer library</p><h2>No close match yet</h2></div></div><div class="quiet-card"><p>Try a simpler word such as peace, illness, study, grief, forgiveness, travel, or repentance.</p></div>${companionCta}</section>`;
  return `<section class="recommendations" aria-live="polite"><div class="recommendation-heading"><div><p class="micro-label">Prayer library</p><h2>Closest matches</h2></div><span>${ranked.length} relevant result${ranked.length === 1 ? '' : 's'}</span></div><div class="recommendation-list">${recommendations.map((item,index) => recommendationCard(item,index+1,q)).join('')}</div>${companionCta}${ranked.length > 3 ? `<details class="more-results"><summary>See ${ranked.length - 3} more matching prayer${ranked.length - 3 === 1 ? '' : 's'}</summary><div class="list-panel">${ranked.slice(3,23).map(item => prayerRow(item.p)).join('')}</div></details>` : ''}</section>`;
}
function setTodayDefaults() {
  sessionMoment = window.PrayerSessionTime?.forDate(new Date()) || sessionMoment;
  selectedDay = sessionMoment.day;
  selectedOffice = sessionMoment.office;
  resetSessionTailoring();
  setCustomPreset();
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
  if (view === 'companion' || view === 'rule') view = 'home';
  currentView = view;
  document.body.classList.remove('reader-mode', 'ambient-mode');
  document.body.classList.toggle('search-mode', view === 'search');
  document.body.classList.toggle('home-mode', view === 'home');
  document.body.classList.toggle('assistant-open', assistantOpen);
  saveState();
  let html = '';
  if (view === 'home') html = renderHome();
  else if (view === 'daily') html = renderDailyCalendar();
  else if (view === 'rule') html = renderRule();
  else if (view === 'library') html = renderLibrary();
  else if (view === 'category') html = renderCategory(activeCategory);
  else if (view === 'search') html = renderSearch();
  else if (view === 'settings') html = renderSettings();
  else if (view === 'prayer') html = renderPrayerDetail(activePrayerId);
  else if (view === 'communion') html = renderCommunion(activeCommunionMode);
  screen.innerHTML = html;
  if (view === 'search') setTimeout(() => { if (shouldAutofocusSearch()) $('search-field')?.focus(); }, 80);
  screen.scrollTop = 0;
  renderAssistantPanel();
}
function stepLabel(step) {
  if (step?.type === 'prayer') return prayer(step.id)?.title || 'Prayer';
  if (step?.type === 'psalms') return 'Appointed Psalms';
  return 'Personal Intercessions';
}
function companionMessageHTML(message) {
  const action = message.action ? `<div class="message-action"><span>Session updated</span><strong>${esc(message.action)}</strong></div>` : '';
  return `<article class="companion-message ${message.role === 'user' ? 'from-user' : 'from-companion'}"><div>${message.role === 'model' ? markdownHTML(message.text) : `<p>${esc(message.text)}</p>`}</div>${action}</article>`;
}
function renderSessionGuide() {
  const sessionMessages = companionPlacement === 'home' ? companionMessages : [];
  const transcript = sessionMessages.length
    ? `<div class="session-conversation" id="session-conversation" aria-live="polite">${sessionMessages.map(companionMessageHTML).join('')}${sessionGuideSending ? '<div class="companion-thinking"><i></i><i></i><i></i><span>Shaping your prayer…</span></div>' : ''}</div>`
    : `<div class="session-guide-welcome"><p>Tell me how you are arriving, what you are carrying, or how much time you have. I can change the prayers—not just suggest them.</p><div class="session-prompts"><button type="button" data-session-prompt="I have 5 minutes. Please make this prayer rule brief and attentive.">I have 5 minutes</button><button type="button" data-session-prompt="I feel anxious and need help settling into prayer.">I feel anxious</button><button type="button" data-session-prompt="I want to pray for someone I love.">For someone I love</button><button type="button" data-session-prompt="Help me slow down and pray without rushing.">Help me slow down</button></div></div>`;
  return `<section class="session-guide glass" aria-label="Shape this prayer with AI"><header><span class="companion-mark" aria-hidden="true">✦</span><div><p class="micro-label">Shape this prayer</p><h2>How are you arriving?</h2></div>${sessionMessages.length ? '<button class="text-button" type="button" data-clear-session-chat>Clear</button>' : ''}</header>${transcript}<form class="session-compose" id="session-guide-form"><label class="sr-only" for="session-guide-input">Tell the Companion what you need</label><textarea id="session-guide-input" rows="1" maxlength="600" placeholder="I feel…  I have…  I want to pray about…" ${sessionGuideSending ? 'disabled' : ''}></textarea><button type="submit" aria-label="Shape my prayer" ${sessionGuideSending ? 'disabled' : ''}><span>Shape my prayer</span><b aria-hidden="true">↑</b></button></form><p class="companion-note">The Companion can adjust this session. It is not clergy or spiritual direction.</p></section>`;
}

function renderDailyGlance() {
  if (dailyCalendarLoading && !dailyCalendar) {
    return `<section class="today-glance glass is-loading" aria-label="Loading today in the Church"><span class="today-glyph" aria-hidden="true">☼</span><div><p class="micro-label">Today in the Church</p><span class="today-loading-line"></span><span class="today-loading-line short"></span></div></section>`;
  }
  if (!dailyCalendar) {
    return `<section class="today-glance glass is-unavailable"><span class="today-glyph" aria-hidden="true">☼</span><div><p class="micro-label">Today in the Church</p><strong>Calendar unavailable</strong><small>${esc(dailyCalendarError || 'The daily source could not be reached.')}</small></div><button class="text-button" type="button" data-retry-daily>Try again</button></section>`;
  }
  const gospel = dailyCalendar.gospel?.reference || dailyCalendar.gospel?.title || '';
  const secondary = [gospel ? `Gospel · ${gospel}` : '', dailyCalendar.tone || '', dailyCalendar.fasting || ''].filter(Boolean).slice(0, 2);
  return `<section class="today-glance glass" aria-label="Today in the Church"><span class="today-glyph" aria-hidden="true">☼</span><div class="today-glance-copy"><p class="micro-label">Today in the Church</p><h2>${esc(dailyCalendar.title)}</h2><p>${secondary.map(esc).join('<i>·</i>')}</p></div><button class="today-open" type="button" data-nav="daily"><span>Learn about today</span><b aria-hidden="true">→</b></button></section>`;
}

function dailyReadingCard(reading, index) {
  const url = safeLink(reading?.url);
  const isGospel = /gospel/i.test(reading?.label || '');
  return `<article class="daily-reading-card ${isGospel ? 'is-gospel' : ''}"><div><p class="micro-label">${esc(reading?.label || 'Reading')}</p><h3>${esc(reading?.reference || reading?.title || 'Appointed reading')}</h3>${reading?.excerpt ? `<p class="reading-excerpt">${esc(reading.excerpt)}…</p>` : ''}</div><div class="daily-card-actions"><button type="button" data-daily-question="reading" data-reading-index="${index}">✦ Explain this reading</button>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Read at GOARCH ↗</a>` : ''}</div></article>`;
}

function renderDailyCalendar() {
  if (dailyCalendarLoading && !dailyCalendar) return `<div class="view daily-view"><button class="text-button back-button" type="button" data-nav="home">← Current prayer</button><div class="daily-loading glass"><div class="loading-orb"></div><p>Gathering today’s commemorations…</p></div></div>`;
  if (!dailyCalendar) return `<div class="view daily-view"><button class="text-button back-button" type="button" data-nav="home">← Current prayer</button><section class="daily-empty glass"><p class="micro-label">Today in the Church</p><h1>The calendar is quiet for a moment.</h1><p>${esc(dailyCalendarError || 'The GOARCH daily source could not be reached.')}</p><button class="primary-button" type="button" data-retry-daily>Try again</button></section></div>`;

  const data = dailyCalendar;
  const source = safeLink(data.source?.url);
  const saints = (data.saints || []).map((saint, index) => {
    const url = safeLink(saint.url);
    return `<li><span>${String(index + 1).padStart(2, '0')}</span><strong>${esc(saint.name)}</strong><div><button type="button" data-daily-question="saint" data-saint-index="${index}">✦ Ask</button>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" aria-label="Read about ${esc(saint.name)} at GOARCH">GOARCH ↗</a>` : ''}</div></li>`;
  }).join('');
  const readingOrder = { Epistle: 0, Gospel: 1, 'Orthros Gospel': 2 };
  const readings = (data.readings || []).map((reading, index) => ({ reading, index }))
    .sort((a, b) => (readingOrder[a.reading.label] ?? 9) - (readingOrder[b.reading.label] ?? 9))
    .map(item => dailyReadingCard(item.reading, item.index)).join('');
  const observance = [data.tone, data.fasting].filter(Boolean);
  return `<div class="view daily-view">
    <button class="text-button back-button" type="button" data-nav="home">← Current prayer</button>
    <header class="daily-hero glass">
      <div class="daily-icon-wrap" aria-hidden="true"><span>☼</span></div>
      <div><p class="micro-label">${esc(data.formattedDate || sessionMoment.dateLabel)} · ${esc(data.tradition || 'GOARCH calendar')}</p><h1>${esc(data.title)}</h1>${observance.length ? `<p class="daily-observance">${observance.map(item => `<span>${esc(item)}</span>`).join('')}</p>` : ''}<button class="primary-button daily-explain" type="button" data-daily-question="feast"><span>✦ Understand today</span><b aria-hidden="true">→</b></button></div>
    </header>
    <section class="daily-section"><div class="daily-section-head"><div><p class="micro-label">Appointed readings</p><h2>Listen to the day</h2></div><p>The explanations use this GOARCH calendar record as their factual context.</p></div><div class="daily-readings">${readings || '<p class="empty">No readings were supplied for this date.</p>'}</div></section>
    <section class="daily-section saints-section"><div class="daily-section-head"><div><p class="micro-label">Commemorations</p><h2>Saints and feasts</h2></div><p>Open the official source or ask the Companion for a grounded introduction.</p></div><ol class="daily-saints">${saints || '<li><strong>No commemorations were supplied.</strong></li>'}</ol></section>
    <footer class="daily-source-note"><span>Calendar tradition: ${esc(data.typikon || data.tradition || 'GOARCH')}</span>${source ? `<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">Source: GOARCH Online Chapel ↗</a>` : ''}<small>AI explanations may contain mistakes and are not a substitute for guidance from your priest.</small></footer>
  </div>`;
}

function renderHome() {
  const segments = buildRuleSegments();
  const steps = currentSteps();
  const saved = savedReaderForCurrentRule(steps);
  const hasResume = !!saved;
  const adjusted = sessionCustomization && sessionCustomization.day === selectedDay && sessionCustomization.office === selectedOffice;
  const completed = sessionCompletion && sessionCompletion.day === selectedDay && sessionCompletion.office === selectedOffice;
  const progressText = completed ? 'Prayer completed' : hasResume ? `Continue at ${stepLabel(steps[saved.index])}` : `${steps.length} prayers · about ${ruleMinutes(steps)} minutes`;
  const preview = steps.slice(0, 4).map((step, index) => `<li><span>${String(index + 1).padStart(2,'0')}</span><strong>${esc(stepLabel(step))}</strong></li>`).join('');
  const lateNightNote = sessionMoment.lateNight ? '<span class="late-night-note">After midnight · continuing the previous evening</span>' : '';
  return `<div class="view home-page">
    <header class="session-welcome"><p class="micro-label">${esc(sessionMoment.greeting)}</p><h1>${esc(sessionMoment.dateLabel)}</h1>${lateNightNote}</header>
    <section class="current-session glass" aria-label="Current prayer session">
      <div class="session-orb" aria-hidden="true"><span>✦</span></div>
      <div class="session-copy">
        <div class="session-kicker"><span>${esc(segments.seasonTitle)}</span><i></i><span>${esc(segments.cycleTitle)}</span></div>
        <h2>${esc(selectedOffice)}<br>Prayer</h2>
        <p>${esc(segments.theme || 'A quiet beginning for this prayer rule.')}</p>
        ${completed ? '<div class="completion-badge"><span>✓ Prayer complete</span><strong>May the peace of this prayer remain with you.</strong></div>' : ''}
        ${adjusted ? `<div class="tailored-badge"><span>✦ Tailored for this moment</span><strong>${esc(sessionCustomization.summary || sessionCustomization.intention || 'Your session has been adjusted.')}</strong><button type="button" data-reset-session>Restore the usual rule</button></div>` : ''}
      </div>
      <div class="session-path">
        <div class="session-path-head"><div><p class="micro-label">Your path</p><strong>${esc(progressText)}</strong></div>${homeBeads(steps, saved?.index || 0, hasResume)}</div>
        <ol>${preview}</ol>
        ${steps.length > 4 ? `<details><summary>See all ${steps.length} prayers</summary><ol>${steps.map((step,index) => `<li><span>${String(index+1).padStart(2,'0')}</span><strong>${esc(stepLabel(step))}</strong></li>`).join('')}</ol></details>` : ''}
        <button class="primary-button session-begin" type="button" ${hasResume ? 'data-resume-rule' : 'data-start-rule'}><span>${completed ? 'Pray again' : hasResume ? 'Continue prayer' : 'Begin this prayer'}</span><b aria-hidden="true">→</b></button>
      </div>
    </section>
    ${renderDailyGlance()}
    ${renderSessionGuide()}
  </div>`;
}
function renderCompanion() {
  const feature = companionFeatures[companionFeature] || companionFeatures.reflect;
  const featureTabs = Object.entries(companionFeatures).map(([id, item]) => `<button class="${id === companionFeature ? 'active' : ''}" type="button" data-companion-feature="${id}" aria-pressed="${id === companionFeature}">${esc(item.label)}</button>`).join('');
  const prompts = feature.prompts.map(([label, prompt]) => `<button type="button" data-companion-prompt="${esc(prompt)}">${esc(label)}</button>`).join('');
  const welcome = `<div class="companion-welcome"><span class="companion-mark" aria-hidden="true">✦</span><p class="micro-label">${esc(feature.eyebrow)}</p><h2>${esc(feature.title)}</h2><p>${esc(feature.description)}</p><div class="companion-prompts">${prompts}</div></div>`;
  const transcript = companionMessages.length ? companionMessages.map(message => `<article class="companion-message ${message.role === 'user' ? 'from-user' : 'from-companion'}"><p>${esc(message.text)}</p></article>`).join('') : welcome;
  const contextBanner = companionContextLabel ? `<div class="companion-context"><span>Using app context</span><strong>${esc(companionContextLabel)}</strong><button type="button" data-clear-companion-context aria-label="Remove app context">×</button></div>` : '';
  return `<div class="view companion-view"><section class="companion-card"><header class="companion-head"><div><p class="micro-label">AI prayer tools</p><h1>Prayer Companion</h1></div>${companionMessages.length ? '<button class="secondary-button companion-new" type="button" data-clear-companion>New</button>' : ''}</header><nav class="companion-feature-tabs" aria-label="Choose an AI tool">${featureTabs}</nav>${contextBanner}<div class="companion-transcript" id="companion-transcript" aria-live="polite">${transcript}${companionSending ? '<div class="companion-thinking">Listening…</div>' : ''}</div><form class="companion-compose" id="companion-form"><label class="sr-only" for="companion-input">Your message</label><textarea id="companion-input" maxlength="1200" rows="1" placeholder="${esc(feature.title)}" ${companionSending ? 'disabled' : ''}>${esc(companionDraft)}</textarea><button class="primary-button" type="submit" aria-label="Send message" ${companionSending ? 'disabled' : ''}>Send</button></form><p class="companion-note">AI can make mistakes. Not clergy, therapy, or emergency support. Avoid sensitive personal details. Chats are not saved by this app.</p></section></div>`;
}
function renderAssistantPanel() {
  if (!assistantPanel || !assistantContent) return;
  assistantPanel.classList.toggle('open', assistantOpen);
  assistantPanel.setAttribute('aria-hidden', assistantOpen ? 'false' : 'true');
  if (!assistantOpen) { assistantContent.innerHTML = ''; return; }
  const feature = companionFeatures[companionFeature] || companionFeatures.reflect;
  const welcome = companionMessages.length ? '' : `<div class="assistant-welcome"><span class="companion-mark" aria-hidden="true">✦</span><p class="micro-label">${esc(feature.eyebrow)}</p><h2>${esc(feature.title)}</h2><p>${esc(feature.description)}</p><div class="companion-prompts">${feature.prompts.map(([label,prompt]) => `<button type="button" data-companion-prompt="${esc(prompt)}">${esc(label)}</button>`).join('')}</div></div>`;
  const messages = companionMessages.map(companionMessageHTML).join('');
  assistantContent.innerHTML = `<header class="assistant-head"><div><p class="micro-label">Alongside your prayer</p><h2>Prayer Companion</h2></div><div>${companionMessages.length ? '<button class="text-button" type="button" data-clear-companion>New</button>' : ''}<button class="round-control" type="button" data-close-assistant aria-label="Close prayer guidance">×</button></div></header>${companionContextLabel ? `<div class="companion-context"><span>Reflecting on</span><strong>${esc(companionContextLabel)}</strong><button type="button" data-clear-companion-context aria-label="Remove app context">×</button></div>` : ''}<div class="assistant-transcript" id="companion-transcript" aria-live="polite">${welcome}${messages}${companionSending ? '<div class="companion-thinking"><i></i><i></i><i></i><span>Listening…</span></div>' : ''}</div><form class="companion-compose" id="companion-form"><label class="sr-only" for="companion-input">Your message</label><textarea id="companion-input" maxlength="1200" rows="1" placeholder="${esc(feature.title)}" ${companionSending ? 'disabled' : ''}>${esc(companionDraft)}</textarea><button class="primary-button" type="submit" aria-label="Send message" ${companionSending ? 'disabled' : ''}>Send</button></form><p class="companion-note">AI can make mistakes. Not clergy, therapy, or emergency support. Chats are not saved.</p>`;
}
function scrollTranscriptToEnd(id, smooth = false) {
  requestAnimationFrame(() => {
    const transcript = $(id);
    if (transcript) transcript.scrollTo({ top: transcript.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  });
}
function openCompanionFeature(feature, options = {}) {
  companionFeature = companionFeatures[feature] ? feature : 'reflect';
  companionMessages = [];
  companionSending = false;
  companionDraft = String(options.draft || '');
  companionContext = String(options.context || '').slice(0, 5000);
  companionContextLabel = String(options.label || '');
  companionPlacement = 'panel';
  assistantOpen = true;
  closeSheet();
  render(currentView);
  requestAnimationFrame(() => $('companion-input')?.focus());
}
async function sendCompanionMessage(text) {
  const message = String(text || '').trim();
  if (!message || companionSending) return;
  companionDraft = '';
  companionMessages.push({ role: 'user', text: message });
  companionSending = true;
  renderAssistantPanel();
  scrollTranscriptToEnd('companion-transcript');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(COMPANION_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: companionMessages.slice(-12), feature: companionFeature, context: companionContext }), signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'The companion is unavailable right now.');
    companionMessages.push({ role: 'model', text: data.text || 'I’m sorry—I could not find words just now. Please try again.' });
  } catch (error) {
    const friendly = error?.name === 'AbortError' ? 'The Companion took too long to answer. Please try again.' : error instanceof TypeError ? 'The Companion cannot be reached right now. Please try again in a moment.' : (error.message || 'The Companion is unavailable right now. Please try again.');
    companionMessages.push({ role: 'model', text: friendly });
  } finally {
    clearTimeout(timeout);
    companionSending = false;
    renderAssistantPanel();
    scrollTranscriptToEnd('companion-transcript', true);
  }
}

function dailyContext() {
  if (!dailyCalendar) return '';
  const readings = (dailyCalendar.readings || []).map(reading => `${reading.label}: ${reading.reference}${reading.excerpt ? ` — Excerpt: ${reading.excerpt}` : ''}`).join('\n');
  const saints = (dailyCalendar.saints || []).map(saint => saint.name).join('; ');
  return `Official calendar source: GOARCH Online Chapel
Date: ${dailyCalendar.formattedDate || dailyCalendar.date}
Calendar tradition: ${dailyCalendar.tradition || 'GOARCH / New Calendar'}
Typikon: ${dailyCalendar.typikon || 'Not supplied'}
Commemoration title: ${dailyCalendar.title}
Saints and feasts: ${saints || 'Not supplied'}
Tone: ${dailyCalendar.tone || 'Not supplied'}
Fasting note: ${dailyCalendar.fasting || 'Not supplied'}
Appointed readings:
${readings || 'Not supplied'}
Source link: ${dailyCalendar.source?.url || 'https://www.goarch.org/chapel'}

Only the lines above are verified source context. If a requested biographical or historical detail is not present, clearly distinguish general knowledge from the GOARCH record and avoid uncertain specifics.`.slice(0, 5000);
}

function askAboutDaily(kind, index = 0) {
  if (!dailyCalendar) return;
  let label = dailyCalendar.title;
  let prompt = `Explain today’s commemoration, “${dailyCalendar.title},” in plain language. Begin with what the GOARCH calendar actually establishes, then offer a brief spiritual reflection for prayer today.`;
  if (kind === 'saint') {
    const saint = dailyCalendar.saints?.[index];
    if (!saint) return;
    label = saint.name;
    prompt = `Tell me about “${saint.name},” who is commemorated today. Be concise. Clearly separate what today’s GOARCH record confirms from any broader background, and do not invent biographical details or quotations.`;
  } else if (kind === 'reading') {
    const reading = dailyCalendar.readings?.[index];
    if (!reading) return;
    label = `${reading.label} · ${reading.reference}`;
    prompt = `Explain today’s appointed ${reading.label.toLowerCase()}, ${reading.reference}, in plain language. Use the supplied excerpt and calendar context. Describe its central movement, why it fits Christian prayer today, and end with one quiet question for reflection.`;
  }
  openCompanionFeature('daily', { label, context: dailyContext() });
  sendCompanionMessage(prompt);
}

function requestedMinutes(message) {
  const explicit = String(message).match(/\b(3|4|5|6|7|8|9|10|12|15|20|25|30|40|45)\s*(?:minutes?|mins?)\b/i);
  if (explicit) return Number(explicit[1]);
  if (/very short|brief|little time|quick/i.test(message)) return 5;
  if (/longer|more time|unhurried/i.test(message)) return 30;
  return null;
}
function sessionCandidateList(message) {
  const current = currentSteps().filter(step => step.type === 'prayer').map(step => prayer(step.id)).filter(Boolean);
  const matched = searchPrayers(message, true).slice(0, 10).map(item => item.p);
  const quick = (rulesData.quickPrayers || []).map(id => prayer(id)).filter(Boolean);
  const seen = new Set();
  return [...current, ...matched, ...quick].filter(item => item && !seen.has(item.id) && seen.add(item.id)).slice(0, 24);
}
function parseSessionUpdate(text) {
  const match = String(text || '').match(/<session_update>\s*([\s\S]*?)\s*<\/session_update>/i);
  const raw = match?.[1] || String(text || '').match(/^\s*(```json\s*)?(\{[^\n]+\})/i)?.[2];
  if (!raw) return null;
  try { return JSON.parse(raw.replace(/```(?:json)?|```/gi, '').trim()); } catch { return null; }
}
function cleanSessionResponse(text) {
  return String(text || '').replace(/<session_update>[\s\S]*?<\/session_update>/gi, '').replace(/^\s*```json\s*\{[^\n]+\}\s*```\s*/i, '').replace(/^\s*\{[^\n]+\}\s*/i, '').trim();
}
function safeSessionResponse(text) {
  const cleaned = cleanSessionResponse(text);
  const malformed = cleaned.length > 1200 || /printStackTrace|(?:\.Forms){2,}|(?:olumn){3,}/i.test(cleaned);
  return !cleaned || malformed
    ? 'I have shaped the prayer around what you shared. **Begin gently**—attention matters more than finishing quickly.'
    : cleaned;
}
function fallbackSessionUpdate(message, candidates) {
  const minutes = requestedMinutes(message) || ruleDuration;
  const focusIds = searchPrayers(message, true).slice(0, /someone|family|sick|grief|anx/i.test(message) ? 2 : 1).map(item => item.p.id);
  return { minutes, focus_ids: focusIds, remove_ids: [], move_first_ids: focusIds, summary: `Shaped around what you shared · about ${minutes} minutes` };
}
function applySessionUpdate(raw, message, candidates) {
  const allowed = new Set(candidates.map(item => item.id));
  const minutes = clamp(Number(raw?.minutes) || requestedMinutes(message) || ruleDuration, 3, 45);
  const validIds = key => arrayValue(raw?.[key]).filter(id => allowed.has(id) && prayer(id)).slice(0, 8);
  sessionCustomization = {
    day: selectedDay,
    office: selectedOffice,
    minutes,
    intention: message.slice(0, 180),
    summary: String(raw?.summary || `Shaped around what you shared · about ${minutes} minutes`).slice(0, 180),
    focusIds: validIds('focus_ids'),
    removeIds: validIds('remove_ids'),
    moveFirstIds: validIds('move_first_ids'),
    updatedAt: Date.now()
  };
  sessionCompletion = null;
  saveCompletion();
  saveTailoring();
  clearSavedReader();
  const steps = currentSteps();
  return `${steps.length} prayers · about ${ruleMinutes(steps)} minutes`;
}
function addPrayerToSession(id) {
  const selected = prayer(id);
  if (!selected) return;
  const current = sessionCustomization?.day === selectedDay && sessionCustomization?.office === selectedOffice ? sessionCustomization : {};
  sessionCustomization = {
    day: selectedDay,
    office: selectedOffice,
    minutes: Number(current.minutes) || ruleDuration,
    intention: current.intention || `Pray with ${selected.title}`,
    summary: `Includes ${selected.title}`,
    focusIds: uniqueIds([...arrayValue(current.focusIds), id]).slice(0, 8),
    removeIds: arrayValue(current.removeIds).filter(item => item !== id),
    moveFirstIds: uniqueIds([...arrayValue(current.moveFirstIds), id]).slice(0, 8),
    updatedAt: Date.now()
  };
  sessionCompletion = null;
  saveCompletion();
  saveTailoring();
  clearSavedReader();
  showToast('Added to today’s prayer');
}
function renderHomePreservingScroll(scrollTop, smooth = false) {
  render('home');
  requestAnimationFrame(() => {
    screen.scrollTop = scrollTop;
    scrollTranscriptToEnd('session-conversation', smooth);
  });
}
async function sendSessionMessage(text) {
  const message = String(text || '').trim();
  if (!message || sessionGuideSending) return;
  if (companionPlacement !== 'home') companionMessages = [];
  companionPlacement = 'home';
  companionFeature = 'rule';
  companionMessages.push({ role:'user', text:message });
  const outerScroll = screen.scrollTop;
  sessionGuideSending = true;
  renderHomePreservingScroll(outerScroll);
  const candidates = sessionCandidateList(message);
  const currentIds = currentSteps().filter(step => step.type === 'prayer').map(step => step.id);
  const context = `Current ${selectedDay} ${selectedOffice} session (${ruleMinutes(currentSteps())} min): ${currentIds.join(', ')}\nAvailable prayers:\n${candidates.map(item => `${item.id}: ${item.title} | ${item.category} | ${estimatedMinutesForPrayer(item).toFixed(1)} min | ${(item.tags || []).slice(0, 6).join(', ')}`).join('\n')}`.slice(0, 4800);
  const planningPrompt = `The person said: "${message.slice(0, 420)}". Act on the prayer session. Return exactly one <session_update> JSON object, then a brief warm Markdown explanation. Schema: {"minutes":number,"focus_ids":["id"],"remove_ids":["id"],"move_first_ids":["id"],"summary":"short phrase"}. Use only IDs from app context. Adjust length, select relevant prayers, remove distractions, and reorder when helpful. Keep opening and closing coherent.`;
  let responseText = '';
  let update = null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const history = companionMessages.slice(-7, -1);
    const response = await fetch(COMPANION_ENDPOINT, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ messages:[...history, { role:'user', text:planningPrompt }], feature:'rule', context }), signal:controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'The Companion could not respond.');
    responseText = data.text || '';
    update = parseSessionUpdate(responseText);
  } catch (error) {
    const note = error?.name === 'AbortError' ? 'The live guidance took too long, so I used the prayer book’s on-device planner.' : 'The live guidance was unavailable, so I used the prayer book’s on-device planner.';
    responseText = `I adjusted the session from what you shared. **Begin gently**—attention matters more than finishing quickly.\n\n_${note}_`;
  } finally {
    clearTimeout(timeout);
  }
  const applied = applySessionUpdate(update || fallbackSessionUpdate(message, candidates), message, candidates);
  companionMessages.push({ role:'model', text:safeSessionResponse(responseText), action:applied });
  sessionGuideSending = false;
  renderHomePreservingScroll(outerScroll, true);
}
function renderRule() {
  const seg = buildRuleSegments();
  const steps = stepsFromSegments(seg);
  const stylePill = ruleLength === 'short' ? '' : `<span class="stat-pill">${esc(plannerModeLabel())}</span>`;
  const presetPill = activePreset !== 'custom' ? `<span class="stat-pill">${esc(presetLabel())}</span>` : '';
  let i = 0;
  const row = (title, sub) => `<div class="path-row"><div class="path-index">${++i}</div><div><div class="path-title">${esc(title)}</div><div class="path-sub">${esc(sub || '')}</div></div><div class="path-time">${i}/${steps.length}</div></div>`;
  const stepRows = steps.map(s => {
    if (s.type === 'prayer') { const p = prayer(s.id); return row(p?.title || 'Prayer', s.section); }
    if (s.type === 'psalms') return row('Appointed Psalms', s.psalms.join(' • '));
    return row('Personal Intercessions', 'Names you have saved locally');
  }).join('');
  return `<div class="view rule-view">
    <div class="rule-header">
      <div><p class="micro-label">Daily Rule</p><h1 class="page-title">${esc(selectedDay)} ${esc(selectedOffice)}</h1><p class="subtitle">${esc(seg.theme)} • ${esc(seg.cycleTitle)} • ${esc(seg.seasonTitle)}</p></div>
      <div class="top-actions"><button class="secondary-button" type="button" data-ai-rule>✦ AI guide</button><button class="secondary-button" type="button" data-open-sheet>Quick</button><button class="primary-button" type="button" data-start-rule>Pray</button></div>
    </div>
    <div class="rule-summary"><div class="stat-row">${presetPill}${stylePill}<span class="stat-pill">${steps.length} steps</span><span class="stat-pill">${ruleMinutes(steps)} min</span>${communionMode !== 'none' ? `<span class="stat-pill">${esc(rulesData.communionModes[communionMode].label)}</span>` : ''}</div><span>Prepared from your settings and the day’s theme.</span></div>
    <div class="rule-path">${stepRows}</div>
  </div>`;
}
function renderLibrary() {
  const categories = prayersData.categories || [];
  const counts = new Map();
  allPrayers.forEach(p => counts.set(p.category, (counts.get(p.category) || 0) + 1));
  const shelves = categories.filter(c => counts.has(c.title)).map(c => `<button class="shelf" type="button" data-category="${esc(c.title)}"><small>${counts.get(c.title)} prayers</small><div><h3>${esc(c.title)}</h3><p>${categoryDescription(c.title)}</p></div></button>`).join('');
  return `<div class="view library-view"><header class="page-header library-header"><div><p class="micro-label">Prayer library · ${allPrayers.length} prayers</p><h1 class="page-title">Find the words<br>you need.</h1><p class="subtitle">Traditional prayers, organized by the moment and purpose they serve.</p></div><button class="library-find" type="button" data-nav="search"><span aria-hidden="true">⌕</span><strong>Search by need</strong><small>Try “new home,” “healing,” or “travel.”</small></button></header><div class="shelf-grid">${shelves}</div><section class="favorites-section"><div class="section-heading"><div><p class="micro-label">Favorites</p><h2>${favorites.size ? `${favorites.size} saved prayers` : 'Keep prayers close'}</h2></div></div><p>${favorites.size ? 'Your saved prayers, ready when you need them.' : 'Favorite any prayer and it will appear here.'}</p><div class="list-panel">${renderFavoriteRows()}</div></section></div>`;
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
  return `<div class="view category-view"><button class="text-button back-button" type="button" data-nav="library">← Library</button><header class="page-header"><p class="micro-label">${esc(list.length)} prayers</p><h1 class="page-title">${esc(cat || 'Prayers')}</h1></header><div class="list-panel">${list.map(prayerRow).join('')}</div></div>`;
}
function prayerRow(p) {
  return `<button class="prayer-row" type="button" data-open-prayer="${esc(p.id)}"><span class="row-glyph">✠</span><span><span class="prayer-row-title">${esc(p.title)}</span><span class="prayer-row-sub">${esc(p.category)}</span></span></button>`;
}
function renderSearch() {
  return `<div class="view prayer-guide"><section class="prayer-guide-panel" aria-label="Find a prayer">
    <p class="micro-label">Prayer library</p>
    <h1 class="page-title">Find a prayer.</h1>
    <p class="subtitle">Search the prayer book by a word, need, or occasion. This search stays entirely on your device.</p>
    <label class="search-box glass prayer-guide-search"><svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="5.8"></circle><path d="m15.1 15.1 4.4 4.4"></path></svg><input id="search-field" value="${esc(searchQuery)}" placeholder="For example: I’m worried about my exam…" autocomplete="off" inputmode="search" enterkeyhint="search" autocapitalize="sentences"></label>
    <div id="guide-results">${guideResultsHTML(searchQuery)}</div>
  </section></div>`;
}
function shortPrayerLabel(title) { return title.replace(/^A Prayer (Before|After) /,'$1 ').replace(/^The /,'').replace('The Jesus Prayer','Jesus Prayer').replace('The Lenten Prayer of Saint Ephrem','St. Ephrem'); }
function prayerTextHTML(p) {
  return (p?.text || []).map(text => {
    const clean = String(text).trim();
    const heading = clean.match(/^((?:ODE\s+[IVX]+|PSALM\s+\d+|Kontakion\s+\d+|Ekos\s+\d+|Troparia?(?:,?\s+[^:]{1,40})?|Theotokion|Refrain|Prayer[^:]{0,70}):?)\s*(.*)$/i);
    if (heading) return `<p class="liturgical-section"><strong>${esc(heading[1])}</strong>${heading[2] ? ` <span>${esc(heading[2])}</span>` : ''}</p>`;
    const rubric = /^(?:\[|Then\b|This kontakion\b|Prostration\b|Note:)/i.test(clean);
    return `<p${rubric ? ' class="reader-rubric"' : ''}>${esc(clean)}</p>`;
  }).join('');
}
function renderPrayerDetail(id) {
  const p = prayer(id) || allPrayers[0];
  const fav = favorites.has(p.id);
  const position = Number(readingPositions[p.id] || 0);
  const action = position > .04 ? 'Resume' : 'Read';
  const sourceUrl = safeLink(p.sourceUrl);
  const provenance = p.sourceNote || (p.source === 'Jordanville Prayer Book' ? 'OCR-cleaned import; source comparison is still recommended for critical use.' : 'Curated app library text.');
  const sourceLink = sourceUrl ? `<a class="prayer-source-link" href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">View source ↗</a>` : '';
  return `<div class="view prayer-detail-view"><button class="text-button back-button" type="button" data-back>← Back</button><header class="prayer-detail-header"><p class="micro-label">${esc(p.category)}</p><h1 class="page-title">${esc(p.title)}</h1><div class="stat-row"><span class="stat-pill">${esc(p.source || 'Prayer Library')}</span><span class="stat-pill">About ${Math.max(.5, estimatedMinutesForPrayer(p)).toFixed(estimatedMinutesForPrayer(p) < 1 ? 1 : 0)} min</span>${p.rights ? `<span class="stat-pill">${esc(p.rights)}</span>` : ''}</div></header><div class="prayer-detail-actions"><button class="primary-button" type="button" data-read-single="${esc(p.id)}">${action} prayer <span aria-hidden="true">→</span></button><button class="secondary-button" type="button" data-add-to-session="${esc(p.id)}">＋ Add to today</button><button class="secondary-button" type="button" data-fav="${esc(p.id)}">${fav ? '★ Favorited' : '☆ Favorite'}</button><button class="secondary-button" type="button" data-copy="${esc(p.id)}">Copy</button><button class="secondary-button" type="button" data-share="${esc(p.id)}">Share</button></div><div class="prayer-detail-layout"><aside><section class="prayer-ai-tools"><div><p class="micro-label">AI prayer tools</p><h3>Go deeper</h3></div><div><button type="button" data-ai-explain="${esc(p.id)}"><span>✦ Explain</span><em>Words, images, and themes</em></button><button type="button" data-ai-reflect-prayer="${esc(p.id)}"><span>✦ Reflect</span><em>Bring it into today</em></button></div></section><p class="prayer-provenance">${esc(provenance)} ${sourceLink}</p></aside><article class="reader-text prayer-detail-text">${prayerTextHTML(p)}</article></div></div>`;
}
function communionVariantIds(mode, variant) {
  const ids = (rulesData?.communionModes?.[mode]?.ids || []).filter(id => prayer(id));
  if (mode === 'preparation' && variant === 'canon') return ids.filter(id => /canon|psalm/i.test(prayer(id)?.title || ''));
  if (mode === 'preparation' && variant === 'prayers') return ids.filter(id => !/canon|psalm/i.test(prayer(id)?.title || ''));
  if (mode === 'thanksgiving' && variant === 'short') return ids.slice(0, 3);
  return ids;
}
function renderCommunion(mode) {
  const before = mode === 'preparation';
  const title = before ? 'Before Communion' : 'After Communion';
  const options = before
    ? [['full','Full preparation','Psalms, canon, and preparation prayers'],['canon','Canon and Psalms','The longer appointed preparation'],['prayers','Prayers only','Preparation prayers without the canon']]
    : [['full','Full thanksgiving','The complete thanksgiving collection'],['short','Short thanksgiving','A shorter three-prayer selection']];
  const all = communionVariantIds(mode, 'full').map(id => prayer(id)).filter(Boolean);
  return `<div class="view communion-view"><button class="secondary-button" type="button" data-nav="home">← Home</button><div class="communion-heading"><p class="micro-label">Holy Communion</p><h1 class="page-title">${title}</h1><p class="subtitle">Choose the form that fits your prayer and available time. Progress is remembered on this device.</p></div><div class="communion-option-grid">${options.map(([variant,label,description]) => { const ids=communionVariantIds(mode,variant); return `<button class="communion-option" type="button" data-start-communion="${mode}" data-communion-variant="${variant}"><span>${label}</span><em>${description}</em><small>${ids.length} prayers • about ${Math.max(1,Math.round(idsMinutes(ids)))} min</small></button>`; }).join('')}</div><details class="communion-list"><summary>See included prayers</summary><div class="list-panel">${all.map(prayerRow).join('')}</div></details></div>`;
}
function renderSettings() {
  const plannerOptions = Object.entries(plannerModes()).map(([id, mode]) => `<option value="${esc(id)}">${esc(mode.label || id)}</option>`).join('');
  return `<div class="view settings-clean">
    <p class="micro-label">Settings</p>
    <h1 class="page-title">A quieter place.</h1>
    <p class="subtitle">Set the usual shape of prayer and the reading atmosphere. The Companion can still adapt any individual session.</p>
    <div class="settings-sections">
      <section class="quiet-card settings-section">
        <div class="settings-section-head"><div><p class="micro-label">Daily rule</p><h3>Prayer selection</h3></div></div>
        <div class="settings-row">
          <label for="setting-length"><strong>Duration</strong><span>The planner keeps the opening, daily focus, intercessions, and closing coherent while fitting this target.</span></label>
          <select id="setting-length" class="form-control" data-setting="ruleDuration"><option value="5">About 5 minutes</option><option value="10">About 10 minutes</option><option value="20">About 20 minutes</option><option value="40">About 40 minutes</option></select>
        </div>
        <div class="settings-row">
          <label for="setting-style"><strong>Emphasis</strong><span>Which kinds of prayers appear more often.</span></label>
          <select id="setting-style" class="form-control" data-setting="plannerMode">${plannerOptions}</select>
        </div>
        <div class="settings-row">
          <label for="setting-season"><strong>Season</strong><span>Add prayers appropriate to the current devotional season.</span></label>
          <select id="setting-season" class="form-control" data-setting="seasonMode">${Object.entries(seasonOptions).map(([id,item]) => `<option value="${esc(id)}">${esc(item.label)}</option>`).join('')}</select>
        </div>
      </section>

      <section class="quiet-card settings-section">
        <div class="settings-section-head"><div><p class="micro-label">Appearance</p><h3>Reading comfort</h3></div></div>
        <div class="settings-row">
          <div><strong>Theme</strong><span>Choose dark or light appearance.</span></div>
          <div class="segment compact-segment"><button type="button" data-theme-set="dark">Dark</button><button type="button" data-theme-set="light">Light</button></div>
        </div>
        <div class="settings-sliders">
          ${range('clarity','Glass clarity',8,42,appearance.clarity)}
          ${range('frost','Glass softness',8,42,appearance.frost)}
          ${range('reflection','Light reflection',10,70,appearance.reflection)}
          ${range('scale','Text size',86,138,Math.round(appearance.scale*100))}
          ${range('leading','Line spacing',140,200,Math.round(appearance.leading*100))}
        </div>
      </section>
    </div>
    ${renderPersonalSettings()}
  </div>`;
}
function range(key,label,min,max,value){ return `<div class="range-row"><label><span>${label}</span><strong id="range-${key}">${value}</strong></label><input type="range" min="${min}" max="${max}" value="${value}" data-range="${key}"></div>`; }
function renderPersonalSettings(){
  return `<section class="quiet-card personal-settings"><p class="micro-label">Personal Intercessions</p><h3>Names remembered in your rule</h3><p>Saved only on this device. Open a group to add or remove names.</p><div class="intention-groups">${Object.entries(personalLabels).map(([key,label]) => { const names=personal[key]||[]; return `<details class="intention-group" ${names.length ? 'open' : ''}><summary><span>${label}</span><em>${names.length ? `${names.length} saved` : 'None saved'}</em></summary><div class="intention-group-body"><div class="name-input-row"><input class="form-control" placeholder="Add a name" aria-label="Add a name to ${esc(label)}" data-name-input="${key}"><button class="icon-button" type="button" data-add-name="${key}" aria-label="Add name">+</button></div><div class="name-chip-list">${names.map((name,idx) => `<span class="name-chip">${esc(name)}<button type="button" data-remove-name="${key}" data-name-index="${idx}" aria-label="Remove ${esc(name)}">×</button></span>`).join('')}</div></div></details>`; }).join('')}</div></section>`;
}
function refreshSettingsAt(scrollTop = screen.scrollTop) {
  render('settings');
  requestAnimationFrame(() => { screen.scrollTop = scrollTop; });
}
function renderGlossary(){ return `<div class="quiet-card" style="margin-top:16px"><p class="micro-label">Glossary</p><h3>Orthodox words</h3><div class="glossary-grid">${glossary.map(([term,def]) => `<div class="glossary-item"><strong>${esc(term)}</strong><span>${esc(def)}</span></div>`).join('')}</div></div>`; }

function renderQuickSheet() {
  quickList.innerHTML = (rulesData.quickPrayers || []).map(id => prayer(id)).filter(Boolean).map(p => `<button class="quick-pill" type="button" data-open-prayer="${esc(p.id)}">${esc(shortPrayerLabel(p.title))}</button>`).join('');
}
function openSheet() { quickSheet.classList.add('open'); quickSheet.setAttribute('aria-hidden', 'false'); }
function closeSheet() { quickSheet.classList.remove('open'); quickSheet.setAttribute('aria-hidden', 'true'); }

function startRule(index = 0, position = 0) { sessionCompletion = null; saveCompletion(); const steps = currentSteps(); reader = { kind:'rule', steps, index: clamp(index,0,Math.max(0,steps.length-1)), position:clamp(Number(position)||0,0,1) }; openReader(); }
function startSinglePrayer(id) {
  rememberPrayer(id);
  reader = { kind:'single', steps: [{ type:'prayer', id, section:'Prayer' }], index: 0, position: Number(readingPositions[id] || 0) };
  openReader();
}
function communionProgress(mode, variant, steps) {
  const saved = safeJSON(localStorage.getItem(STORAGE.communion), null);
  if (!saved || saved.mode !== mode || saved.variant !== variant || saved.total !== steps.length) return { index:0, position:0 };
  return { index:clamp(Number(saved.index)||0,0,Math.max(0,steps.length-1)), position:clamp(Number(saved.position)||0,0,1) };
}
function startCommunionRule(mode, variant = 'full') {
  const config = rulesData?.communionModes?.[mode];
  const steps = communionVariantIds(mode, variant).map(id => ({ type:'prayer', id, section: config.label }));
  if (!steps.length) { showToast('Communion prayers are unavailable'); return; }
  const saved = communionProgress(mode, variant, steps);
  reader = { kind:'communion', mode, variant, steps, index:saved.index, position:saved.position };
  openReader();
}
async function requestWakeLock() {
  try { if ('wakeLock' in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch {}
}
function releaseWakeLock() {
  try { wakeLock?.release(); } catch {}
  wakeLock = null;
}
function openReader() { document.body.classList.add('reader-mode'); renderReader(); requestWakeLock(); resetIdle(); }
function closeReader(savePosition = true) { if (savePosition) saveCurrentReadingPosition(); document.body.classList.remove('reader-mode', 'ambient-mode'); clearTimeout(idleTimer); releaseWakeLock(); reader = null; render(currentView === 'prayer' ? 'prayer' : (currentView === 'communion' ? 'communion' : 'home')); }
function renderReader() {
  if (!reader) return;
  const steps = reader.steps;
  const step = steps[reader.index];
  const isLast = reader.index >= steps.length - 1;
  const content = renderReaderStep(step);
  screen.innerHTML = `<div class="reader-view">
    <div class="reader-top"><button class="icon-button" type="button" data-close-reader>×</button><div class="reader-progress-wrap" role="progressbar" aria-label="Prayer progress" aria-valuemin="1" aria-valuemax="${steps.length}" aria-valuenow="${reader.index + 1}"><div class="reader-progress-track"><span style="width:${((reader.index + 1) / Math.max(1, steps.length)) * 100}%"></span></div><small>${reader.index + 1} of ${steps.length}</small></div><button class="icon-button" type="button" data-open-sheet>＋</button></div>
    <div class="reader-stage" id="reader-stage">${content}</div>
    <div class="reader-foot"><button class="reader-control" type="button" data-reader-prev ${reader.index === 0 ? 'disabled' : ''}>Previous</button><div class="reader-count">${reader.index+1} / ${steps.length}</div><button class="reader-control ${isLast ? 'reader-done' : ''}" type="button" data-reader-next>${isLast ? 'Finish' : 'Next'}</button></div>
  </div>`;
  saveReaderProgress();
  setupReaderStage();
}
function renderReaderStep(step) {
  if (step.type === 'prayer') {
    const p = prayer(step.id);
    return `<article class="prayer-page"><div class="reader-kicker">${esc(step.section || p?.category || 'Prayer')}</div><h1 class="reader-title">${esc(p?.title || 'Prayer')}</h1><div class="reader-text">${prayerTextHTML(p)}</div><footer class="reader-source">${esc(p?.source || 'Prayer Library')}</footer></article>`;
  }
  if (step.type === 'psalms') {
    return `<article class="prayer-page"><div class="reader-kicker">Psalter</div><h1 class="reader-title">Appointed Psalms</h1><div class="reader-text"><p>${esc(step.psalms.join(' • '))}</p><p>Read the appointed psalms from an Orthodox Psalter or your parish prayer book.</p></div></article>`;
  }
  return `<article class="prayer-page"><div class="reader-kicker">Intercessions</div><h1 class="reader-title">Remember, O Lord</h1><div class="reader-text">${Object.entries(personalLabels).map(([key,label]) => personal[key]?.length ? `<p><strong>${esc(label)}:</strong> ${esc(personal[key].join(', '))}</p>` : '').join('')}<p>Lord, have mercy.</p></div></article>`;
}
function saveCurrentReadingPosition() {
  if (!reader) return;
  const stage = $('reader-stage');
  if (!stage) return;
  const max = Math.max(1, stage.scrollHeight - stage.clientHeight);
  const ratio = clamp(stage.scrollTop / max, 0, 1);
  reader.position = ratio > .98 ? 0 : ratio;
  if (reader.kind === 'single') {
    const id = reader.steps?.[0]?.id;
    if (id) { readingPositions[id] = reader.position; localStorage.setItem(STORAGE.positions, JSON.stringify(readingPositions)); }
  } else saveReaderProgress();
}
function setupReaderStage() {
  const stage = $('reader-stage');
  if (!stage) return;
  requestAnimationFrame(() => {
    if (reader?.position) {
      const max = Math.max(0, stage.scrollHeight - stage.clientHeight);
      stage.scrollTop = max * reader.position;
    }
    stage.addEventListener('scroll', () => {
      clearTimeout(positionTimer);
      positionTimer = setTimeout(saveCurrentReadingPosition, 180);
    }, { passive:true });
  });
}
function softTap() { try { navigator.vibrate?.(8); } catch {} }
function nextReader() {
  if (!reader) return;
  if (reader.index >= reader.steps.length - 1) { completeRule(); return; }
  reader.index++;
  reader.position = 0;
  softTap();
  renderReader();
}
function prevReader() { if (reader && reader.index > 0) { reader.index--; reader.position = 0; softTap(); renderReader(); } }
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
    sessionCompletion = { day:selectedDay, office:selectedOffice, completedAt:Date.now() };
    saveCompletion();
    sessionCustomization = null;
    saveTailoring();
    companionMessages = [];
    reader = null;
    document.body.classList.remove('reader-mode', 'ambient-mode');
    releaseWakeLock();
    render('home');
  } else if (reader?.kind === 'communion') {
    localStorage.removeItem(STORAGE.communion);
    releaseWakeLock();
    closeReader();
  } else {
    const id = reader?.steps?.[0]?.id;
    if (id) { readingPositions[id] = 0; localStorage.setItem(STORAGE.positions, JSON.stringify(readingPositions)); }
    releaseWakeLock();
    closeReader(false);
  }
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
  if (search) {
    searchQuery = search.value;
    const results = $('guide-results');
    if (results) results.innerHTML = guideResultsHTML(searchQuery);
    return;
  }
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

document.addEventListener('input', (e) => {
  const textarea = e.target.closest('#companion-input, #session-guide-input');
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
});

screen.addEventListener('keydown', (e) => {
  const input = e.target.closest('[data-name-input]');
  if (input && e.key === 'Enter') {
    e.preventDefault();
    screen.querySelector(`[data-add-name="${input.dataset.nameInput}"]`)?.click();
  }
});

screen.addEventListener('change', (e) => {
  const setting = e.target.closest('[data-setting]');
  if (!setting) return;
  const key = setting.dataset.setting;
  setCustomPreset();
  if (key === 'ruleLength') ruleLength = setting.value;
  if (key === 'ruleDuration') setRuleDuration(setting.value);
  if (key === 'selectedDay') selectedDay = setting.value;
  if (key === 'seasonMode') seasonMode = setting.value;
  if (key === 'communionMode') communionMode = setting.value;
  if (key === 'plannerMode') plannerMode = setting.value;
  applyAppearance(); saveState(); syncSettingsUI();
});

document.addEventListener('click', async (e) => {
  const nav = e.target.closest('[data-nav]');
  if (nav) { closeSheet(); activePrayerId = null; activeCategory = null; if (nav.dataset.nav === 'search') searchQuery = ''; render(nav.dataset.nav); return; }
  if (e.target.closest('[data-open-sheet], [data-open-menu]')) { openSheet(); return; }
  if (e.target.closest('[data-close-assistant]')) { assistantOpen = false; renderAssistantPanel(); document.body.classList.remove('assistant-open'); return; }
  if (e.target.closest('[data-open-companion]')) { closeSheet(); companionMessages = []; companionFeature = 'reflect'; companionContext = ''; companionContextLabel = ''; assistantOpen = true; renderAssistantPanel(); return; }
  if (e.target.closest('[data-clear-companion]')) { companionMessages = []; companionSending = false; companionDraft = ''; renderAssistantPanel(); return; }
  if (e.target.closest('[data-clear-session-chat]')) { companionMessages = []; sessionGuideSending = false; renderHomePreservingScroll(screen.scrollTop); return; }
  if (e.target.closest('[data-reset-session]')) { resetSessionTailoring(); companionMessages = []; showToast('Usual prayer rule restored'); render('home'); return; }
  if (e.target.closest('[data-retry-daily]')) { dailyCalendarLoading = true; dailyCalendarError = ''; updateDailyView(); loadDailyCalendar(true); return; }
  const dailyQuestion = e.target.closest('[data-daily-question]');
  if (dailyQuestion) { askAboutDaily(dailyQuestion.dataset.dailyQuestion, Number(dailyQuestion.dataset.saintIndex ?? dailyQuestion.dataset.readingIndex ?? 0)); return; }
  const sessionPrompt = e.target.closest('[data-session-prompt]');
  if (sessionPrompt) { sendSessionMessage(sessionPrompt.dataset.sessionPrompt); return; }
  const companionFeatureButton = e.target.closest('[data-companion-feature]');
  if (companionFeatureButton) { openCompanionFeature(companionFeatureButton.dataset.companionFeature); return; }
  if (e.target.closest('[data-clear-companion-context]')) { companionContext = ''; companionContextLabel = ''; renderAssistantPanel(); return; }
  const companionPrompt = e.target.closest('[data-companion-prompt]');
  if (companionPrompt) { sendCompanionMessage(companionPrompt.dataset.companionPrompt); return; }
  const aiExplain = e.target.closest('[data-ai-explain]');
  if (aiExplain) {
    const p = prayer(aiExplain.dataset.aiExplain);
    if (p) openCompanionFeature('explain', { label: p.title, context: `Prayer title: ${p.title}\nCategory: ${p.category}\nSource: ${p.source || 'Prayer Library'}\nSource note: ${p.sourceNote || 'Not supplied'}\nSource URL: ${p.sourceUrl || 'Not supplied'}\nPrayer text:\n${(p.text || []).join('\n').slice(0, 4200)}`, draft: `Explain this prayer in plain language. Focus on its key words, images, and spiritual themes, and do not invent historical details.` });
    return;
  }
  const aiReflectPrayer = e.target.closest('[data-ai-reflect-prayer]');
  if (aiReflectPrayer) {
    const p = prayer(aiReflectPrayer.dataset.aiReflectPrayer);
    if (p) openCompanionFeature('reflect', { label: p.title, context: `Prayer title: ${p.title}\nCategory: ${p.category}\nPrayer excerpt:\n${(p.text || []).join('\n').slice(0, 3000)}`, draft: `Help me reflect on this prayer and suggest one gentle way to carry it into today.` });
    return;
  }
  if (e.target.closest('[data-ai-rule]')) {
    const steps = currentSteps();
    const titles = steps.map(step => step.type === 'prayer' ? prayer(step.id)?.title : step.title).filter(Boolean);
    openCompanionFeature('rule', { label: `${selectedDay} ${selectedOffice} rule`, context: `Selected rule: ${selectedDay} ${selectedOffice}\nSeason: ${seasonOptions[seasonMode]?.label || seasonMode}\nApproximate duration: ${ruleMinutes(steps)} minutes\nPrayer sequence:\n${titles.map((title, index) => `${index + 1}. ${title}`).join('\n')}`, draft: `Help me approach this prayer rule attentively. Briefly explain its shape and suggest how to begin without rushing.` });
    return;
  }
  const aiGuide = e.target.closest('[data-ai-guide]');
  if (aiGuide) {
    const need = aiGuide.dataset.aiGuide || searchQuery;
    const matches = searchPrayers(need, true).slice(0, 5);
    const options = matches.map((item, index) => `${index + 1}. ${item.p.title} — ${recommendationReason(item, need)}`).join('\n');
    openCompanionFeature('reflect', { label: 'Prayer Guide recommendations', context: `The user described: ${need}\nThe app's private, on-device search suggested these existing library prayers:\n${options || 'No close library match was found.'}`, draft: `Help me reflect on what I described and choose a gentle next step. If useful, refer only to the prayer-library suggestions provided in the app context.` });
    return;
  }
  if (e.target.closest('[data-close-sheet]')) { closeSheet(); return; }
  const cat = e.target.closest('[data-category]');
  if (cat) { activeCategory = cat.dataset.category; render('category'); return; }
  const openPrayer = e.target.closest('[data-open-prayer]');
  if (openPrayer) { closeSheet(); previousView = currentView; previousScrollTop = screen.scrollTop; activePrayerId = openPrayer.dataset.openPrayer; rememberPrayer(activePrayerId); render('prayer'); return; }
  if (e.target.closest('[data-back]')) { render(previousView === 'category' && activeCategory ? 'category' : (previousView || 'library')); requestAnimationFrame(() => { screen.scrollTop = previousScrollTop; }); return; }
  if (e.target.closest('[data-start-rule]')) { startRule(0); return; }
  if (e.target.closest('[data-resume-rule]')) { const saved = savedReaderForCurrentRule(); startRule(saved?.index || 0, saved?.position || 0); return; }
  if (e.target.closest('[data-random-prayer]')) { const p = randomPrayer(); previousView = currentView; previousScrollTop = screen.scrollTop; activePrayerId = p.id; rememberPrayer(p.id); render('prayer'); return; }
  const suggestion = e.target.closest('[data-search-suggestion]');
  if (suggestion) { searchQuery = suggestion.dataset.searchSuggestion || ''; render('search'); return; }
  if (e.target.closest('[data-use-today]')) { setTodayDefaults(); render('home'); return; }
  const day = e.target.closest('[data-day-set]');
  if (day) { selectedDay = day.dataset.daySet; setCustomPreset(); saveState(); render('home'); return; }
  const communionPage = e.target.closest('[data-open-communion]');
  if (communionPage) { closeSheet(); activeCommunionMode = communionPage.dataset.openCommunion; render('communion'); return; }
  const communion = e.target.closest('[data-start-communion]');
  if (communion) { startCommunionRule(communion.dataset.startCommunion, communion.dataset.communionVariant || 'full'); return; }
  const preset = e.target.closest('[data-rule-preset]');
  if (preset) { applyPreset(preset.dataset.rulePreset); render(currentView === 'rule' ? 'rule' : 'settings'); return; }
  if (e.target.closest('[data-scroll-explore]')) { screen.querySelector('#home-explore')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  const readSingle = e.target.closest('[data-read-single]');
  if (readSingle) { startSinglePrayer(readSingle.dataset.readSingle); return; }
  const addToSession = e.target.closest('[data-add-to-session]');
  if (addToSession) { addPrayerToSession(addToSession.dataset.addToSession); render('prayer'); return; }
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
  if (theme) { appearance.theme = theme.dataset.themeSet; applyAppearance(); screen.querySelectorAll('[data-theme-set]').forEach(button => button.classList.toggle('active', button.dataset.themeSet === appearance.theme)); return; }
  const office = e.target.closest('[data-office-set]');
  if (office) { selectedOffice = office.dataset.officeSet; setCustomPreset(); saveState(); render(currentView === 'settings' ? 'settings' : 'home'); return; }
  const addName = e.target.closest('[data-add-name]');
  if (addName) { const key = addName.dataset.addName; const input = screen.querySelector(`[data-name-input="${key}"]`); const value = input?.value.trim(); if (value) { const scrollTop=screen.scrollTop; personal[key] = [...(personal[key] || []), value]; savePersonal(); refreshSettingsAt(scrollTop); } return; }
  const removeName = e.target.closest('[data-remove-name]');
  if (removeName) { const key = removeName.dataset.removeName; const idx = Number(removeName.dataset.nameIndex); personal[key].splice(idx,1); savePersonal(); refreshSettingsAt(screen.scrollTop); return; }
});

document.addEventListener('submit', (e) => {
  if (e.target.id === 'session-guide-form') {
    e.preventDefault();
    sendSessionMessage($('session-guide-input')?.value);
    return;
  }
  if (e.target.id !== 'companion-form') return;
  e.preventDefault();
  sendCompanionMessage($('companion-input')?.value);
});

['mousemove','touchstart','keydown','scroll'].forEach(ev => document.addEventListener(ev, resetIdle, { passive:true }));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (reader) { requestWakeLock(); return; }
  const previousDate = liturgicalDateKey();
  const nextMoment = window.PrayerSessionTime?.forDate(new Date()) || sessionMoment;
  sessionMoment = nextMoment;
  if (liturgicalDateKey() !== previousDate) {
    selectedDay = nextMoment.day;
    selectedOffice = nextMoment.office;
    resetSessionTailoring();
    saveState();
    loadDailyCalendar(true);
  } else if (currentView === 'home') {
    render('home');
  }
});
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
  const durationSelect = screen.querySelector('[data-setting="ruleDuration"]'); if (durationSelect) durationSelect.value = String(ruleDuration);
  const seasonSelect = screen.querySelector('[data-setting="seasonMode"]'); if (seasonSelect) seasonSelect.value = seasonMode;
  const plannerSelect = screen.querySelector('[data-setting="plannerMode"]'); if (plannerSelect) plannerSelect.value = plannerMode;
  screen.querySelectorAll('[data-theme-set]').forEach(b => b.classList.toggle('active', b.dataset.themeSet === appearance.theme));
  screen.querySelectorAll('[data-office-set]').forEach(b => b.classList.toggle('active', b.dataset.officeSet === selectedOffice));
}
const originalRender = render;
render = function(view = currentView) { originalRender(view); if (view === 'settings') syncSettingsUI(); };

init();
