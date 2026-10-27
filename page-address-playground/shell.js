// Page address UI playground shell. PROTOTYPE, throwaway. Variant files call PG.surface() and PG.variant();
// this file renders the combination view, the gallery and the feedback export.
(() => {
  const PG = (window.PG = { surfaces: [], variants: [] });
  PG.surface = (surface) => PG.surfaces.push(surface);
  PG.variant = (variant) => PG.variants.push(variant);
  // A variant file adds its own styles once; prefix selectors with the file's own class (v-entry-, v-share-...).
  PG.css = (text) => { const style = document.createElement('style'); style.textContent = text; document.head.append(style); };

  // ---------- icons (lucide, 24px stroke) ----------
  const ICONS = {
    home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    qr: '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    share: '<path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>',
    'share-2': '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
    user: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>',
    brush: '<path d="m14.622 17.897-10.68-2.913"/><path d="M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z"/><path d="M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15"/>',
    bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
    card: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
    bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
    at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>',
    sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    podcast: '<path d="M16.85 18.58a9 9 0 1 0-9.7 0"/><path d="M8 14a5 5 0 1 1 8 0"/><circle cx="12" cy="11" r="1"/><path d="M13 17a1 1 0 1 0-2 0l.5 4.5a.5.5 0 1 0 1 0Z"/>',
    headphones: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    upload: '<path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
    video: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    sidebar: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  };
  const LOGO = '<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="4"/><path d="M13 10.5v11l9-5.5z" fill="currentColor"/></svg>';
  function icon(name, cls = 'app-icon') {
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ''}</svg>`;
  }

  // ---------- mock data and address rules ----------
  // The persona is Todd himself, so the name the real list holds for him is claimable here.
  const RESERVED = new Set((window.RESERVED ?? []).filter((name) => name !== 'todd'));
  // Other accounts' addresses. Matching ignores dashes, so todd-smith is taken too.
  const TAKEN = ['sarah', 'mike', 'john', 'dave', 'jen', 'chris', 'alex', 'sam', 'toddsmith', 'garyvee', 'sales-tips'];
  const DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const LIMIT = 5;
  const MAX_LENGTH = 40;
  // p1 is the page Todd is setting an address on; its address is the shared, live one.
  const PAGES = [
    { id: 'p1', title: 'Podcast listeners: start here', share: 'k7m2xq', address: null, visits: 142, viaAddress: 118, viaShare: 24, leads: 9, updated: '2d ago', live: true },
    { id: 'p2', title: 'Acme Corp proposal', share: 'h4vn8c', address: null, visits: 6, viaAddress: 0, viaShare: 6, leads: 1, updated: '3d ago', live: true },
    { id: 'p3', title: 'Q4 webinar follow-up', share: 'm3pq8r', address: 'todd-webinar', visits: 38, viaAddress: 31, viaShare: 7, leads: 4, updated: '1w ago', live: true },
    { id: 'p4', title: 'Northwind onboarding', share: 't9wd2e', address: 'ellisgrowth', visits: 0, viaAddress: 0, viaShare: 0, leads: 0, updated: '2w ago', live: false },
  ];
  const squash = (address) => address.replace(/-/g, '');

  function normalize(raw) {
    return String(raw ?? '').trim().toLowerCase()
      .replace(/^https?:\/\//, '').replace(/^(www\.)?clarity\.video\/?/, '').replace(/^page\//, '').replace(/^@/, '').replace(/\/+$/, '')
      .replace(/\s+/g, '-');
  }
  function pageById(id) { return PAGES.find((page) => page.id === id); }
  // Every address Todd's account holds, including p1's while the name being set is one he could save.
  function held() {
    return PAGES.filter((page) => page.address || (page.id === 'p1' && check(state.address).state === 'free')).map((page) => ({ address: page.id === 'p1' ? state.address : page.address, page }));
  }
  function check(raw, { pageId = 'p1' } = {}) {
    const address = normalize(raw);
    if (!address) return { state: 'empty', address, message: 'Pick the words people will type.' };
    if (/[^a-z0-9-]/.test(address)) return { state: 'invalid', address, message: 'Use letters, numbers and dashes.' };
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(address)) return { state: 'invalid', address, message: 'Put dashes only between words.' };
    if (address.length > MAX_LENGTH) return { state: 'invalid', address, message: `Keep it under ${MAX_LENGTH} characters.` };
    if (RESERVED.has(squash(address))) return { state: 'reserved', address, message: `Clarity keeps clarity.video/${address} for itself.` };
    const theirs = TAKEN.find((name) => squash(name) === squash(address));
    if (theirs) return { state: 'taken', address, message: theirs === address ? `Someone else has clarity.video/${address}.` : `Someone else has clarity.video/${theirs}. Dashes don't make it a new name.` };
    const own = PAGES.find((page) => page.id !== 'p1' && page.address && squash(page.address) === squash(address));
    if (own && own.id === pageId) return { state: 'current', address, page: own, message: `This page already uses clarity.video/${own.address}.` };
    if (own) return { state: 'yours', address, page: own, message: `You use clarity.video/${own.address} on "${own.title}". Move it here?` };
    return { state: 'free', address, message: `clarity.video/${address} is free.` };
  }
  function say(raw) {
    const address = normalize(raw) || 'todd';
    const spoken = address.replace(/-/g, ' dash ').replace(/\d/g, (d) => ` ${DIGITS[Number(d)]} `).replace(/\s+/g, ' ').trim();
    return `clarity dot video slash ${spoken}`;
  }
  function slugify(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, MAX_LENGTH).replace(/-+$/, '');
  }
  // Ideas for p1's address from Todd's name and the page title, free ones only, one per spoken name.
  function suggest({ name = 'Todd Ellis', title = PAGES[0].title } = {}) {
    const [first = '', last = ''] = name.toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/);
    const word = slugify(title).split('-')[0];
    const ideas = [first, `${first}${last}`, `${first}-${word}`, `meet-${first}`, slugify(title)];
    const seen = new Set();
    return ideas.filter((idea) => idea && !seen.has(squash(idea)) && seen.add(squash(idea)) && check(idea).state === 'free').slice(0, 5);
  }

  const state = load();
  function load() {
    const blank = { address: 'todd', picks: {}, verdicts: {}, notes: {}, surfaceNotes: {}, overall: '' };
    try {
      const saved = JSON.parse(localStorage.getItem('address-playground-v1') ?? 'null');
      return { ...blank, ...saved };
    } catch { return blank; }
  }
  function save() { localStorage.setItem('address-playground-v1', JSON.stringify(state)); }

  const addressListeners = new Set();
  function setAddress(raw, source) {
    state.address = normalize(raw);
    save();
    addressListeners.forEach((fn) => fn(state.address, check(state.address)));
    syncAddress(source);
  }
  function shown() { return state.address || 'todd'; }
  function syncAddress(source) {
    const result = check(state.address);
    document.querySelectorAll('[data-address-input]').forEach((input) => { if (input !== source && input.value !== state.address) input.value = state.address; });
    document.querySelectorAll('[data-address]').forEach((node) => { node.textContent = shown(); });
    document.querySelectorAll('[data-address-url]').forEach((node) => { node.textContent = `clarity.video/${shown()}`; });
    document.querySelectorAll('[data-address-say]').forEach((node) => { node.textContent = say(shown()); });
    document.querySelectorAll('[data-address-status]').forEach((node) => {
      node.dataset.state = result.state;
      node.textContent = result.message;
    });
  }

  // ---------- app frames ----------
  const SETTINGS_TABS = [['Profile', 'user'], ['Branding', 'brush'], ['Notifications', 'bell'], ['Billing', 'card'], ['Agents', 'bot']];
  function shell({ active = 'home', main = '', nav = '' } = {}) {
    return `<div class="app-shell">
      <aside class="app-side">
        <div class="app-logo">${LOGO}<span>Clarity</span></div>
        <div class="app-nav" ${active === 'home' ? 'aria-current="page"' : ''}>${icon('home')}Home</div>
        <div class="app-nav" ${active === 'leads' ? 'aria-current="page"' : ''}>${icon('users')}Leads</div>
        ${nav}
        <div class="app-side-foot"><span class="app-avatar">T</span>Todd Ellis</div>
      </aside>
      <main class="app-main">${main}</main>
    </div>`;
  }
  function settings({ tab = 'Profile', extraTab = null, body = '' } = {}) {
    const tabs = [...SETTINGS_TABS];
    if (extraTab) tabs.splice(extraTab.index ?? 1, 0, [extraTab.label, extraTab.icon ?? 'link']);
    return shell({
      active: 'settings',
      main: `<h1 class="app-h1">Settings</h1>
        <div class="app-tabs" role="tablist">${tabs.map(([label, ic]) => `<div class="app-tab" role="tab" aria-selected="${label === tab}">${icon(ic)}${label}</div>`).join('')}</div>
        ${body}`,
    });
  }
  function pageCard(page, extra = '') {
    return `<div class="app-page-card">
      <div class="app-page-thumb"><span class="app-page-share">${icon('share')}</span><div class="mini">${page.title}<i></i></div></div>
      <div class="app-page-name">${page.title}</div>
      <div class="app-page-meta"><span>${icon('calendar', 'app-icon')} ${page.updated}</span><span>${icon('eye', 'app-icon')} ${page.visits} visits</span></div>
      ${extra}
    </div>`;
  }
  function home({ banner = '', cards = null, headActions = null } = {}) {
    const actions = headActions ?? `<button class="${btn('outline')}">${icon('upload')}Upload</button><button class="${btn('outline')}">${icon('plus')}New page</button><button class="${btn('default')}">${icon('video')}Record video</button>`;
    return shell({
      active: 'home',
      main: `<div class="app-head"><h1 class="app-h1">Home</h1>${actions}</div>
        <div class="app-tabs"><div class="app-tab" aria-selected="true">All</div><div class="app-tab">Videos</div><div class="app-tab">Pages</div><div class="app-tab">Files</div></div>
        ${banner}
        <div style="font-weight:600;font-size:17px;margin:4px 0 14px">Journey Pages <span class="app-muted" style="font-size:13px;font-weight:400">4</span></div>
        <div style="display:flex;gap:16px;flex-wrap:wrap">${cards ?? PAGES.slice(0, 3).map((page) => pageCard(page)).join('')}</div>`,
    });
  }
  function dialog({ behind = home(), body = '', width = 420 } = {}) {
    return `<div style="position:relative"><div class="app-dim">${behind}</div><div class="app-dialog-layer"><div class="app-dialog" style="width:${width}px">${body}</div></div></div>`;
  }
  function shareDialog({ rowsBefore = '', rowsAfter = '', url = 'clarity.video/page/k7m2xq', title = 'Share', footer = null } = {}) {
    return `<h2 class="app-dialog-title">${title}</h2><span class="app-dialog-x">${icon('x')}</span>
      ${rowsBefore}
      <div class="app-url"><span>${url}</span>${icon('copy')}</div>
      <div class="app-row"><span class="app-row-label">${icon('globe')}Who can open it</span><span class="app-select">Anyone with the link ${icon('chevron-down')}</span></div>
      <div class="app-row"><span class="app-row-label">${icon('lock')}Password protected</span><span class="app-switch"></span></div>
      <div class="app-live"><b>Live</b><small>Published 2d ago.</small></div>
      ${rowsAfter}
      ${footer ?? `<button class="${btn('default', 'lg')} app-wide">${icon('copy')}Copy link</button>`}`;
  }
  function editorTop({ right = null, title = PAGES[0].title } = {}) {
    return `<div class="app-editor-top"><span class="title">${title}</span>${right ?? `<span class="app-muted">${icon('undo')}</span><span class="app-muted">${icon('redo')}</span><button class="${btn('outline', 'sm')}">${icon('brush')}Style</button><button class="${btn('outline', 'sm')}">${icon('sparkles')}Edit with AI</button><button class="${btn('default', 'sm')}">${icon('share-2')}Share</button>`}</div>`;
  }
  function browser({ url = null, body = '' } = {}) {
    return `<div class="app-browser"><div class="app-browser-bar"><i></i><i></i><i></i><div class="app-browser-url">${url ?? '<span data-address-url></span>'}</div></div>${body}</div>`;
  }
  function phone({ url = null, body = '' } = {}) {
    return `<div class="app-phone"><div class="app-phone-screen"><div class="app-phone-url">${url ?? '<span data-address-url></span>'}</div>${body}</div></div>`;
  }
  // Returns the real Button classes plus a marker; wire() turns the marker into the
  // data attributes ui/button.tsx sets, which the app CSS needs to paint the face.
  function btn(variant = 'default', size = 'default') {
    const classes = window.BTN?.[`${variant}:${size}`] ?? window.BTN?.[`${variant}:default`] ?? '';
    return `${classes} pgb pgb-v-${variant} pgb-s-${size}`;
  }

  const ctx = {
    get address() { return shown(); },
    name: 'Todd Ellis', first: 'Todd', company: 'Ellis Growth', pages: PAGES, page: PAGES[0], limit: LIMIT, maxLength: MAX_LENGTH,
    held, pageById, check, say, suggest, slugify, normalize, icon, btn, shell, settings, home, pageCard, dialog, shareDialog, editorTop, browser, phone,
    setAddress: (raw) => setAddress(raw),
    onAddress: (fn) => { addressListeners.add(fn); },
    input: window.INPUT ?? {},
  };
  PG.ctx = ctx;

  // ---------- rendering ----------
  const variantId = (variant) => `${variant.surface}:${variant.key}`;
  const variantsOf = (surfaceId) => PG.variants.filter((variant) => variant.surface === surfaceId);
  function pickOf(surfaceId) {
    const list = variantsOf(surfaceId);
    return list.find((variant) => variant.key === state.picks[surfaceId]) ?? list[0];
  }

  const fits = new Set();
  function frame(variant, { natural = false } = {}) {
    const box = document.createElement('div');
    box.className = 'pg-fit';
    const inner = document.createElement('div');
    inner.className = 'pg-frame';
    inner.style.width = `${variant.width ?? 1200}px`;
    if (variant.padding !== undefined) inner.style.padding = `${variant.padding}px`;
    if (variant.background) inner.style.background = variant.background;
    inner.innerHTML = variant.render(ctx);
    box.append(inner);
    if (natural) { box.style.width = `${variant.width ?? 1200}px`; box.style.maxWidth = 'none'; }
    wire(inner);
    variant.mount?.(inner, ctx);
    fits.add(box);
    return box;
  }
  function fit(box) {
    const inner = box.firstElementChild;
    if (!inner || !box.isConnected) return;
    const width = parseFloat(inner.style.width);
    const scale = Math.min(1, box.clientWidth / width);
    inner.style.transform = `scale(${scale})`;
    box.style.height = `${Math.ceil(inner.offsetHeight * scale)}px`;
  }
  const resize = new ResizeObserver((entries) => entries.forEach((entry) => fit(entry.target.classList.contains('pg-fit') ? entry.target : entry.target.parentElement)));
  function observe(box) { resize.observe(box); resize.observe(box.firstElementChild); }

  function wire(root) {
    root.querySelectorAll('.pgb').forEach((node) => {
      const variant = [...node.classList].find((name) => name.startsWith('pgb-v-'))?.slice(6);
      const size = [...node.classList].find((name) => name.startsWith('pgb-s-'))?.slice(6);
      Object.assign(node.dataset, { slot: 'button', buttonVariant: variant, buttonSize: size, variant, size });
    });
    root.querySelectorAll('[data-address-input]').forEach((input) => {
      input.value = state.address;
      input.addEventListener('input', () => setAddress(input.value, input));
    });
    root.querySelectorAll('[data-set-address]').forEach((node) => node.addEventListener('click', () => setAddress(node.dataset.setAddress)));
  }

  function renderCombo() {
    const host = document.querySelector('#combo');
    host.replaceChildren();
    PG.surfaces.forEach((surface, index) => {
      const pick = pickOf(surface.id);
      if (!pick) return;
      const step = document.createElement('section');
      step.className = 'pg-step';
      const options = variantsOf(surface.id).map((variant) => `<option value="${variant.key}" ${variant.key === pick.key ? 'selected' : ''}>${variant.key} · ${variant.name}</option>`).join('');
      step.innerHTML = `<div class="pg-step-head"><span class="pg-step-num">${index + 1}</span><span class="pg-step-title">${surface.title}</span><select aria-label="Variant for ${surface.title}">${options}</select><span class="pg-step-idea">${pick.idea}</span></div>`;
      step.querySelector('select').addEventListener('change', (event) => { state.picks[surface.id] = event.target.value; save(); writeHash(); renderAll(); });
      const box = frame(pick);
      box.style.maxWidth = `${pick.width ?? 1200}px`;
      step.append(box);
      host.append(step);
      observe(box);
    });
  }

  function renderGallery() {
    const host = document.querySelector('#gallery');
    host.replaceChildren();
    PG.surfaces.forEach((surface) => {
      const section = document.createElement('section');
      section.className = 'pg-surface';
      section.id = `surface-${surface.id}`;
      section.innerHTML = `<div class="pg-surface-head"><h3>${surface.title}</h3><p>${surface.question}</p></div><div class="pg-grid"></div>
        <textarea class="pg-note pg-surface-note" placeholder="Notes on ${surface.title.toLowerCase()} as a whole, or which parts to combine"></textarea>`;
      const grid = section.querySelector('.pg-grid');
      variantsOf(surface.id).forEach((variant) => {
        const id = variantId(variant);
        const card = document.createElement('article');
        card.className = 'pg-card';
        card.dataset.picked = String(pickOf(surface.id) === variant);
        card.dataset.verdict = state.verdicts[id] ?? '';
        const stage = document.createElement('div');
        stage.className = 'pg-card-stage';
        const box = frame(variant);
        stage.append(box);
        const meta = document.createElement('div');
        meta.className = 'pg-card-meta';
        meta.innerHTML = `<div class="pg-card-title"><span class="pg-key">${variant.key}</span>${variant.name}</div>
          <p class="pg-idea">${variant.idea}</p>
          <div class="pg-actions">
            <button class="pg-chip pg-pick" aria-pressed="${pickOf(surface.id) === variant}">Use in combination</button>
            <button class="pg-chip" data-verdict="keep" aria-pressed="${state.verdicts[id] === 'keep'}">Like</button>
            <button class="pg-chip" data-verdict="drop" aria-pressed="${state.verdicts[id] === 'drop'}">Drop</button>
            <button class="pg-chip pg-open">Open at full size</button>
          </div>
          <textarea class="pg-note" placeholder="What works, what doesn't, what to steal">${escapeHtml(state.notes[id] ?? '')}</textarea>`;
        meta.querySelector('.pg-pick').addEventListener('click', () => { state.picks[surface.id] = variant.key; save(); writeHash(); renderAll(); });
        meta.querySelectorAll('[data-verdict]').forEach((button) => button.addEventListener('click', () => {
          state.verdicts[id] = state.verdicts[id] === button.dataset.verdict ? '' : button.dataset.verdict;
          save();
          card.dataset.verdict = state.verdicts[id];
          meta.querySelectorAll('[data-verdict]').forEach((other) => other.setAttribute('aria-pressed', String(state.verdicts[id] === other.dataset.verdict)));
          updateCount();
        }));
        meta.querySelector('.pg-open').addEventListener('click', () => openFocus(variant));
        meta.querySelector('.pg-note').addEventListener('input', (event) => { state.notes[id] = event.target.value; save(); updateCount(); });
        card.append(stage, meta);
        grid.append(card);
        observe(box);
      });
      const surfaceNote = section.querySelector('.pg-surface-note');
      surfaceNote.value = state.surfaceNotes[surface.id] ?? '';
      surfaceNote.addEventListener('input', () => { state.surfaceNotes[surface.id] = surfaceNote.value; save(); updateCount(); });
      host.append(section);
    });
  }

  function openFocus(variant) {
    const layer = document.querySelector('.pg-focus');
    const inner = layer.querySelector('.pg-focus-inner');
    inner.replaceChildren(frame(variant, { natural: true }));
    const box = inner.firstElementChild;
    box.style.height = 'auto';
    box.firstElementChild.style.position = 'static';
    layer.dataset.open = 'true';
    syncAddress();
  }

  function renderAll() {
    addressListeners.clear();
    resize.disconnect();
    fits.clear();
    renderCombo();
    renderGallery();
    syncAddress();
    updateCount();
    requestAnimationFrame(() => fits.forEach(fit));
  }

  // ---------- feedback ----------
  function escapeHtml(text) { return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  function feedbackMarkdown() {
    const lines = ['# clarity.video/<address> UI feedback', '', `Address used while testing: ${shown()}`, '', '## Combination'];
    PG.surfaces.forEach((surface, index) => { const pick = pickOf(surface.id); lines.push(`${index + 1}. ${surface.title}: ${pick.key} ${pick.name}`); });
    PG.surfaces.forEach((surface) => {
      const rows = variantsOf(surface.id).map((variant) => {
        const id = variantId(variant);
        const verdict = state.verdicts[id] === 'keep' ? 'liked' : state.verdicts[id] === 'drop' ? 'dropped' : '';
        const note = (state.notes[id] ?? '').trim();
        return verdict || note ? `- ${variant.key} ${variant.name}${verdict ? ` (${verdict})` : ''}${note ? `: ${note}` : ''}` : null;
      }).filter(Boolean);
      const surfaceNote = (state.surfaceNotes[surface.id] ?? '').trim();
      if (rows.length || surfaceNote) {
        lines.push('', `## ${surface.title}`, ...rows);
        if (surfaceNote) lines.push(`- Overall: ${surfaceNote}`);
      }
    });
    if (state.overall.trim()) lines.push('', '## Overall', state.overall.trim());
    lines.push('', `Combination link: ${location.origin}${location.pathname}${hash()}`);
    return lines.join('\n');
  }
  function updateCount() {
    const count = Object.values(state.notes).filter((note) => note.trim()).length + Object.values(state.verdicts).filter(Boolean).length + Object.values(state.surfaceNotes).filter((note) => note.trim()).length + (state.overall.trim() ? 1 : 0);
    document.querySelector('.pg-count').textContent = count ? `${count} notes and votes` : 'No feedback yet';
  }
  function toast(text) {
    const node = document.querySelector('.pg-toast');
    node.textContent = text;
    node.dataset.show = 'true';
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { node.dataset.show = 'false'; }, 1800);
  }
  function hash() { return '#' + PG.surfaces.map((surface) => `${surface.id}=${pickOf(surface.id)?.key ?? ''}`).join('&') + `&address=${encodeURIComponent(shown())}`; }
  function writeHash() { history.replaceState(null, '', hash()); }
  function readHash() {
    const params = new URLSearchParams(location.hash.slice(1));
    PG.surfaces.forEach((surface) => { if (params.get(surface.id)) state.picks[surface.id] = params.get(surface.id); });
    if (params.get('address')) state.address = normalize(params.get('address'));
  }

  function start() {
    readHash();
    wire(document.querySelector('.pg-top'));
    document.querySelector('#copy').addEventListener('click', async () => {
      const text = feedbackMarkdown();
      try { await navigator.clipboard.writeText(text); toast('Feedback copied. Paste it into the chat.'); }
      catch { prompt('Copy your feedback', text); }
    });
    document.querySelector('#download').addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([feedbackMarkdown()], { type: 'text/markdown' }));
      link.download = 'address-ui-feedback.md';
      link.click();
    });
    document.querySelector('#reset').addEventListener('click', () => {
      if (!confirm('Clear every note, vote and pick?')) return;
      localStorage.removeItem('address-playground-v1');
      location.hash = '';
      location.reload();
    });
    const overall = document.querySelector('#overall');
    overall.value = state.overall;
    overall.addEventListener('input', () => { state.overall = overall.value; save(); updateCount(); });
    document.querySelector('.pg-focus-close').addEventListener('click', () => { document.querySelector('.pg-focus').dataset.open = 'false'; });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') document.querySelector('.pg-focus').dataset.open = 'false'; });
    document.querySelector('.pg-variant-count').textContent = `${PG.variants.length} variants across ${PG.surfaces.length} steps`;
    renderAll();
    writeHash();
    window.addEventListener('resize', () => fits.forEach(fit));
    document.fonts?.ready.then(() => fits.forEach(fit));
  }
  PG.start = start;
})();
