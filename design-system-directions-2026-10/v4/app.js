/* V4 Editorial prototype for Clarity. Plain JS, no dependencies, no network.
   Sections: helpers, state and routing, sample data, posters, primitives
   (menu, dialog, toast, tabs), library view, editor view, system view,
   share / upload / record flows, shell, boot. */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- helpers */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const icon = window.icon;
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
  let uidN = 0;
  const uid = (p) => (p || 'id') + '-' + (++uidN);
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');
  const MOD = isMac ? '⌘' : 'Ctrl';

  function el(tag, attrs) {
    const node = document.createElement(tag);
    const children = Array.prototype.slice.call(arguments, 2);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        const v = attrs[k];
        if (v === false || v == null) return;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k.indexOf('on') === 0 && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
      });
    }
    children.forEach((c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach((cc) => cc != null && node.append(cc.nodeType ? cc : document.createTextNode(String(cc))));
      else node.append(c.nodeType ? c : document.createTextNode(String(c)));
    });
    return node;
  }
  function frag(htmlStr) {
    const t = document.createElement('template');
    t.innerHTML = htmlStr.trim();
    return t.content;
  }
  function age(h) {
    if (h < 1) return 'Just now';
    if (h < 24) return h === 1 ? '1 hour ago' : Math.round(h) + ' hours ago';
    const d = Math.round(h / 24);
    if (d === 1) return 'Yesterday';
    if (d < 7) return d + ' days ago';
    if (d < 14) return 'Last week';
    if (d < 31) return Math.round(d / 7) + ' weeks ago';
    if (d < 60) return 'Last month';
    return Math.round(d / 30) + ' months ago';
  }
  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  function parseTime(str) {
    const m = /^(\d{1,2}):([0-5]\d)$/.exec(String(str).trim());
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many || one + 's'); }
  function initials(name) { return name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(); }
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------- state and routing */

  const VIEWS = ['library', 'editor', 'system'];
  const THEME_KEY = 'clarity-v4-theme';
  const state = {
    view: 'library',
    theme: 'light',
    lib: { filter: 'all', sort: 'recent', q: '', folder: null, selected: new Set() },
    ed: { sel: 'page', preview: false, device: 'desktop', dirty: false, player: null },
  };

  function readURL() {
    const p = new URLSearchParams(location.search);
    const v = p.get('view');
    state.view = VIEWS.indexOf(v) >= 0 ? v : 'library';
    const t = p.get('theme');
    if (t === 'light' || t === 'dark') state.theme = t;
  }
  function writeURL(replace) {
    try {
      const p = new URLSearchParams(location.search);
      p.set('view', state.view);
      p.set('theme', state.theme);
      const url = location.pathname + '?' + p.toString() + location.hash;
      if (replace) history.replaceState(null, '', url);
      else history.pushState(null, '', url);
    } catch (e) { /* file:// in some browsers refuses; in-memory state still works */ }
  }
  function initTheme() {
    const p = new URLSearchParams(location.search);
    const t = p.get('theme');
    let theme = t === 'light' || t === 'dark' ? t : null;
    if (!theme) { try { theme = sessionStorage.getItem(THEME_KEY); } catch (e) { /* no storage */ } }
    if (theme !== 'light' && theme !== 'dark') theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    state.theme = theme;
    applyTheme();
  }
  function applyTheme() {
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
    try { sessionStorage.setItem(THEME_KEY, state.theme); } catch (e) { /* no storage */ }
  }
  function setTheme(theme, opts) {
    if (theme !== 'light' && theme !== 'dark') return;
    state.theme = theme;
    applyTheme();
    writeURL(!!(opts && opts.replace));
    render();
  }
  function setView(view, opts) {
    if (VIEWS.indexOf(view) < 0) return;
    closeMenu();
    closeDialogs({ restoreFocus: false });
    closeRail();
    state.view = view;
    if (view !== 'editor') { stopPlayer(); state.ed.preview = false; }
    writeURL(!!(opts && opts.replace));
    render();
    if (!(opts && opts.keepFocus)) { const m = $('#main'); if (m) m.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  }

  /* -------------------------------------------------------------- sample data */

  // The brief's six names make up the root: five loose files and the Brand assets folder, which holds
  // the brand images. The root shows one level only and the type tabs add up to the All count.
  const FOLDERS = [
    { id: 'brand', name: 'Brand assets', hoursAgo: 24 * 21 },
  ];
  const ITEMS = [
    { id: 'maya', kind: 'video', title: 'Follow-up for Maya', hoursAgo: 2, duration: '1:05', seconds: 65, views: 0, status: 'new', folder: null, variant: 'talk-2', recipient: 'Maya Chen' },
    { id: 'proposal', kind: 'page', title: 'Welcome to your proposal', hoursAgo: 26, views: 7, status: 'shared', folder: null, recipient: 'Maya Chen' },
    { id: 'northstar', kind: 'video', title: 'Northstar launch walkthrough', hoursAgo: 72, duration: '4:12', seconds: 252, views: 18, status: 'shared', folder: null, variant: 'talk' },
    { id: 'brief', kind: 'document', title: 'Project brief.pdf', hoursAgo: 120, size: '1.2 MB', pages: 12, views: 3, status: 'private', folder: null },
    { id: 'overview', kind: 'video', title: 'Product overview', hoursAgo: 24 * 14, duration: '2:48', seconds: 168, views: 64, status: 'shared', folder: null, variant: 'screen' },
    { id: 'img1', kind: 'image', title: 'Logo lockup.png', hoursAgo: 24 * 21, size: '84 KB', status: 'private', folder: 'brand', variant: 'logo' },
    { id: 'img2', kind: 'image', title: 'Wordmark on ink.svg', hoursAgo: 24 * 21, size: '12 KB', status: 'private', folder: 'brand', variant: 'wordmark' },
    { id: 'img3', kind: 'image', title: 'Depot photo, morning.jpg', hoursAgo: 24 * 22, size: '2.4 MB', status: 'private', folder: 'brand', variant: 'photo' },
    { id: 'img4', kind: 'image', title: 'Product still 01.jpg', hoursAgo: 24 * 22, size: '1.1 MB', status: 'private', folder: 'brand', variant: 'still' },
    { id: 'img5', kind: 'image', title: 'Product still 02.jpg', hoursAgo: 24 * 23, size: '1.3 MB', status: 'private', folder: 'brand', variant: 'still2' },
    { id: 'img6', kind: 'image', title: 'Team photo.jpg', hoursAgo: 24 * 25, size: '3.0 MB', status: 'private', folder: 'brand', variant: 'photo2' },
  ];
  const KIND_LABEL = { video: 'Video', page: 'Page', document: 'Document', image: 'Image', folder: 'Folder' };
  const KIND_ICON = { video: 'video', page: 'page', document: 'fileText', image: 'image', folder: 'folder' };
  const STATUS = {
    shared: { word: 'Shared', cls: '' },
    new: { word: 'Not shared', cls: 'quiet' },
    private: { word: 'Only you', cls: 'quiet' },
    off: { word: 'Link off', cls: 'quiet' },
    processing: { word: 'Processing', cls: 'busy' },
    failed: { word: 'Upload failed', cls: 'error' },
  };
  // Stress examples live on the System screen only, so the Library root stays the brief's six entries.
  // They resolve like real items (share, rename, delete) but never count in the Library or its selection.
  const SYSTEM_ITEMS = [
    { id: 'okafor', kind: 'page', title: 'Q3 renewal walkthrough for the Okafor Logistics procurement team, with the revised pricing appendix and the implementation timeline', hoursAgo: 24 * 31, views: 131, status: 'off', folder: null, recipient: 'Procurement team' },
  ];
  const itemById = (id) => ITEMS.find((i) => i.id === id) || SYSTEM_ITEMS.find((i) => i.id === id);
  const listOf = (item) => (ITEMS.indexOf(item) >= 0 ? ITEMS : SYSTEM_ITEMS);
  const folderById = (id) => FOLDERS.find((f) => f.id === id);
  const folderCount = (id) => ITEMS.filter((i) => i.folder === id).length;

  const PAGE = {
    title: 'Welcome to your proposal',
    recipient: 'Maya Chen',
    company: 'Okafor Logistics',
    replyTo: 'alex@northstar.example',
    theme: 'paper',
    showLogo: true,
    sections: [
      { id: 's1', type: 'video', name: 'Intro video', caption: 'Four minutes on the rollout plan we sketched on Tuesday, and what changes for your drivers in week one.', autoplay: false, captions: true, duration: '4:12', seconds: 252, trimStart: '0:00', trimEnd: '4:12', poster: 'talk', source: 'Northstar launch walkthrough' },
      { id: 's2', type: 'text', name: 'Why Northstar fits', heading: 'Why Northstar fits your rollout', body: 'Okafor runs 140 vehicles across three depots, and the current dispatch tool was built for one. Northstar treats each depot as its own board while keeping a single view for Maya and the planning team.\n\nThe pilot we propose starts with the north depot in November, moves the other two in January, and keeps your existing telematics contract in place.', bullets: ['Dispatch boards per depot, one planning view', 'Telematics stays. We read from it; nothing is replaced', 'A named implementation lead through March'], layout: 'text' },
      { id: 's3', type: 'cta', name: 'Next step', lead: 'Ready to look at the pilot plan together?', label: 'Book the implementation call', url: 'https://cal.example/alex-morgan/northstar-pilot', style: 'filled', newTab: true, note: 'Thirty minutes with Alex and a solutions engineer. Pick any slot next week.' },
    ],
  };
  const TEMPLATES = {
    text: () => ({ id: uid('s'), type: 'text', name: 'Text', heading: 'New section', body: 'Write a paragraph for the reader.', bullets: [], layout: 'text' }),
    video: () => ({ id: uid('s'), type: 'video', name: 'Video', caption: '', autoplay: false, captions: true, duration: '2:48', seconds: 168, trimStart: '0:00', trimEnd: '2:48', poster: 'screen', source: 'Product overview' }),
    docs: () => ({ id: uid('s'), type: 'docs', name: 'Documents', heading: 'Documents', docs: [{ name: 'Project brief.pdf', meta: '12 pages · 1.2 MB' }] }),
    cta: () => ({ id: uid('s'), type: 'cta', name: 'Call to action', lead: 'Ready for the next step?', label: 'Book a call', url: 'https://cal.example/alex-morgan', style: 'filled', newTab: true, note: '' }),
  };
  const SECTION_ICON = { video: 'video', text: 'type', docs: 'paperclip', cta: 'target' };
  const SECTION_KIND = { video: 'Video section', text: 'Text section', docs: 'Documents section', cta: 'Call to action' };

  /* ----------------------------------------------------------------- posters */

  function figure(cx, cy, r, cls) {
    cls = cls || 'pm-figure';
    const w = r * 2.3;
    return '<circle class="' + cls + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>' +
      '<path class="' + cls + '" d="M' + (cx - w) + ' 90c2-' + (r * 1.6) + ' ' + (w * 0.45) + '-' + (r * 2.4) + ' ' + w + '-' + (r * 2.4) + 's' + (w * 0.55) + ' ' + (r * 0.8) + ' ' + w + ' ' + (r * 2.4) + 'z"/>';
  }
  function lines(x, y, ws, gap, cls) {
    return ws.map((w, i) => '<rect class="' + (cls || 'pm-line') + '" x="' + x + '" y="' + (y + i * gap) + '" width="' + w + '" height="2.5" rx="1"/>').join('');
  }
  function posterSVG(variant) {
    let inner = '';
    switch (variant) {
      case 'talk':
        inner = '<rect class="pm-frame" width="160" height="90"/><rect class="pm-frame2" x="98" width="62" height="90"/>' +
          '<rect class="pm-frame2" x="14" y="16" width="28" height="36" rx="1"/>' + figure(92, 38, 13);
        break;
      case 'talk-2':
        inner = '<rect class="pm-frame2" width="160" height="90"/><rect class="pm-frame" y="64" width="160" height="26"/>' +
          '<rect fill="#f7f4ee" opacity=".14" x="110" y="12" width="36" height="44" rx="2"/>' + figure(58, 37, 13);
        break;
      case 'screen':
        inner = '<rect class="pm-paper" width="160" height="90"/><rect class="pm-ink" x="16" y="16" width="70" height="7" rx="1.5"/>' +
          lines(16, 31, [108, 94, 102], 8) + '<rect class="pm-bg" x="16" y="58" width="62" height="18" rx="2"/>' +
          '<rect class="pm-line" x="22" y="68" width="8" height="6"/><rect class="pm-line" x="34" y="63" width="8" height="11"/><rect class="pm-ink3" x="46" y="60" width="8" height="14"/><rect class="pm-line" x="58" y="65" width="8" height="9"/>' +
          '<circle class="pm-frame" cx="134" cy="66" r="16"/><circle class="pm-figure" cx="134" cy="62" r="5.5"/><path class="pm-figure" d="M122 80c1-8 6-12 12-12s11 4 12 12z"/>';
        break;
      case 'page':
        inner = '<rect class="pm-bg" width="160" height="90"/><rect class="pm-paper" x="28" y="8" width="104" height="96" rx="2"/>' +
          '<rect class="pm-ink" x="40" y="18" width="50" height="5" rx="1"/><rect class="pm-line" x="40" y="27" width="34" height="2.5" rx="1"/>' +
          '<rect class="pm-frame" x="40" y="35" width="80" height="30" rx="1.5"/><path fill="#f7f4ee" opacity=".92" d="M77 45v10l9-5z"/>' +
          lines(40, 71, [80, 64, 72], 6);
        break;
      case 'document':
        inner = '<rect class="pm-bg" width="160" height="90"/><rect class="pm-paper" x="52" y="8" width="56" height="74" rx="1.5"/>' +
          '<path class="pm-rule" d="M96 8v12h12z"/><rect class="pm-ink" x="60" y="22" width="26" height="4" rx="1"/>' +
          lines(60, 32, [40, 40, 36, 40, 38, 28], 6);
        break;
      case 'logo':
        inner = '<rect class="pm-paper" width="160" height="90"/><circle class="pm-ink" cx="62" cy="45" r="14"/><rect class="pm-ink" x="84" y="39" width="40" height="7" rx="1.5"/><rect class="pm-line" x="84" y="50" width="26" height="3" rx="1"/>';
        break;
      case 'wordmark':
        inner = '<rect class="pm-frame" width="160" height="90"/><rect fill="#f7f4ee" x="34" y="38" width="62" height="9" rx="2"/><rect fill="#f7f4ee" opacity=".6" x="100" y="38" width="26" height="9" rx="2"/><rect fill="#f7f4ee" opacity=".4" x="34" y="51" width="40" height="3" rx="1"/>';
        break;
      case 'photo':
        inner = '<rect class="pm-frame2" width="160" height="90"/><rect fill="#f7f4ee" opacity=".12" width="160" height="50"/><circle fill="#f7f4ee" opacity=".35" cx="118" cy="26" r="10"/><path class="pm-frame" d="M0 66c30-14 50-18 80-10s50 14 80 4v30H0z"/>';
        break;
      case 'photo2':
        inner = '<rect class="pm-frame2" width="160" height="90"/><rect class="pm-frame" y="60" width="160" height="30"/>' + figure(50, 40, 10) + figure(84, 44, 10) + figure(118, 40, 10);
        break;
      case 'still':
        inner = '<rect class="pm-frame" width="160" height="90"/><rect class="pm-frame2" x="40" y="18" width="80" height="54" rx="3"/><rect fill="#f7f4ee" opacity=".16" x="48" y="26" width="64" height="38" rx="2"/>';
        break;
      case 'still2':
        inner = '<rect class="pm-frame2" width="160" height="90"/><rect class="pm-frame" x="24" y="30" width="112" height="30" rx="3"/><rect fill="#f7f4ee" opacity=".2" x="30" y="36" width="60" height="18" rx="2"/>';
        break;
      default:
        inner = '<rect class="pm-bg" width="160" height="90"/>';
    }
    return '<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }
  function posterFor(item) {
    if (item.kind === 'video') return posterSVG(item.variant || 'talk');
    if (item.kind === 'image') return posterSVG(item.variant || 'photo');
    return posterSVG(item.kind);
  }
  function portraitSVG() {
    return '<svg viewBox="0 0 80 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><rect class="pm-frame2" width="80" height="100"/><rect fill="#f7f4ee" opacity=".12" width="80" height="58"/><circle fill="#f7f4ee" opacity=".3" cx="58" cy="24" r="9"/><path class="pm-frame" d="M0 70c20-10 40-14 80-6v36H0z"/></svg>';
  }

  /* ------------------------------------------------------------- primitives */

  const layer = $('#layer');
  const toastsEl = $('#toasts');
  let menuState = null;

  function closeMenu() {
    if (!menuState) return;
    const m = menuState;
    menuState = null;
    m.menu.remove();
    m.anchor.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onDocPointerDown, true);
    window.removeEventListener('resize', closeMenu);
    document.removeEventListener('scroll', onAnyScroll, true);
  }
  function onDocPointerDown(e) {
    if (!menuState) return;
    if (menuState.menu.contains(e.target) || menuState.anchor.contains(e.target)) return;
    closeMenu();
  }
  function onAnyScroll(e) {
    if (menuState && !menuState.menu.contains(e.target)) closeMenu();
  }
  function openMenu(anchor, items, opts) {
    opts = opts || {};
    if (menuState && menuState.anchor === anchor) { closeMenu(); return; }
    closeMenu();
    const menu = el('div', { class: 'menu', role: 'menu', tabindex: '-1', id: uid('menu') });
    if (opts.head) menu.append(el('div', { class: 'menu-head t-micro', text: opts.head }));
    items.forEach((it) => {
      if (it.sep) { menu.append(el('div', { class: 'menu-sep', role: 'separator' })); return; }
      const radio = it.checked !== undefined;
      const b = el('button', { class: 'menu-item' + (it.danger ? ' danger' : ''), role: radio ? 'menuitemradio' : 'menuitem', type: 'button' });
      if (it.disabled) b.disabled = true;
      if (radio) b.setAttribute('aria-checked', String(!!it.checked));
      b.innerHTML = (it.icon ? icon(it.icon) : '') + '<span class="grow">' + esc(it.label) + '</span>' +
        (it.kbd ? '<kbd>' + esc(it.kbd) + '</kbd>' : '') + (radio ? icon('check', 'tick') : '');
      b.addEventListener('click', () => { closeMenu(); if (document.contains(anchor)) anchor.focus(); it.onSelect && it.onSelect(); });
      menu.append(b);
    });
    layer.append(menu);
    const r = anchor.getBoundingClientRect();
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    let left = opts.align === 'end' ? r.right - mw : r.left;
    let top = r.bottom + 4;
    if (left + mw > innerWidth - 8) left = innerWidth - 8 - mw;
    if (left < 8) left = 8;
    if (top + mh > innerHeight - 8) top = Math.max(8, r.top - 4 - mh);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    anchor.setAttribute('aria-expanded', 'true');
    menuState = { menu, anchor };
    menu.addEventListener('keydown', (e) => {
      const items = $$('.menu-item:not(:disabled)', menu);
      const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
      else if (e.key === 'Home') { e.preventDefault(); items[0] && items[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); items[items.length - 1] && items[items.length - 1].focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(); anchor.focus(); }
      else if (e.key === 'Tab') { closeMenu(); anchor.focus(); e.preventDefault(); }
    });
    const first = $('.menu-item:not(:disabled)', menu);
    (first || menu).focus();
    document.addEventListener('pointerdown', onDocPointerDown, true);
    window.addEventListener('resize', closeMenu);
    document.addEventListener('scroll', onAnyScroll, true);
    return menu;
  }

  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
  function focusables(root) {
    return $$(FOCUSABLE, root).filter((e) => e.getClientRects().length > 0);
  }
  function trapTab(e, root) {
    const f = focusables(root);
    if (!f.length) { e.preventDefault(); return; }
    const first = f[0], last = f[f.length - 1];
    const inside = root.contains(document.activeElement);
    if (e.shiftKey) {
      if (!inside || document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else if (!inside || document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  // Open dialogs, oldest first. A view change closes them all without restoring focus into the old view.
  const dialogs = [];
  function closeDialogs(opts) {
    dialogs.slice().forEach((d) => d.close(opts));
  }
  function openDialog(cfg) {
    closeMenu();
    const appEl = document.getElementById('app');
    const opener = document.activeElement;
    // If the opener is re-rendered while the dialog is open, find its twin by action and id.
    const openerKey = opener && opener.dataset && opener.dataset.act ? '[data-act="' + opener.dataset.act + '"]' + (opener.dataset.id ? '[data-id="' + opener.dataset.id + '"]' : '') : null;
    const scrim = el('div', { class: 'scrim' });
    const titleId = uid('dlg');
    const dlg = el('div', { class: (cfg.className || 'dialog') + (cfg.wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, tabindex: '-1' });
    const api = {
      dlg, scrim,
      close(opts) {
        if (!scrim.isConnected) return;
        scrim.remove();
        const i = dialogs.indexOf(api);
        if (i >= 0) dialogs.splice(i, 1);
        if (!$('.scrim', layer)) { document.body.classList.remove('has-dialog'); if (appEl) appEl.inert = false; }
        cfg.onClose && cfg.onClose();
        if (opts && opts.restoreFocus === false) return;
        if (opener && document.contains(opener) && opener !== document.body) opener.focus();
        else if (openerKey && $(openerKey)) $(openerKey).focus();
        else { const m = $('#main'); m && m.focus({ preventScroll: true }); }
      },
    };
    dialogs.push(api);
    if (cfg.title) {
      dlg.append(el('div', { class: 'dialog-head' },
        el('div', null,
          el('h2', { class: 'dialog-title', id: titleId, text: cfg.title }),
          cfg.subtitle ? el('div', { class: 'dialog-sub', html: cfg.subtitle }) : null),
        el('button', { class: 'btn btn-quiet btn-icon', type: 'button', 'aria-label': 'Close', html: icon('x'), onclick: () => api.close() })));
    } else if (cfg.label) {
      dlg.append(el('h2', { class: 'visually-hidden', id: titleId, text: cfg.label }));
    }
    const body = el('div', { class: cfg.bodyClass || 'dialog-body' });
    if (cfg.body) body.append(cfg.body);
    dlg.append(body);
    api.body = body;
    if (cfg.footer) dlg.append(el('div', { class: 'dialog-foot' }, cfg.footer));
    scrim.append(dlg);
    layer.append(scrim);
    document.body.classList.add('has-dialog');
    // The app behind the scrim is inert while a dialog is open, so Tab and clicks cannot reach it.
    if (appEl) appEl.inert = true;
    scrim.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); api.close(); }
      else if (e.key === 'Tab') trapTab(e, dlg);
    });
    scrim.addEventListener('pointerdown', (e) => { if (e.target === scrim) api.close(); });
    requestAnimationFrame(() => {
      if (!scrim.isConnected) return;
      let f = null;
      if (typeof cfg.initialFocus === 'string') f = $(cfg.initialFocus, dlg);
      else if (cfg.initialFocus) f = cfg.initialFocus;
      // A requested target that is disabled or hidden (Copy while the link is off) falls back to the
      // first enabled control in the body, then the Close button, then the dialog itself.
      const usable = f && dlg.contains(f) && !f.disabled && f.getClientRects().length > 0;
      if (!usable) f = focusables(body)[0] || focusables(dlg)[0] || dlg;
      f.focus();
    });
    return api;
  }

  function toast(msg, o) {
    o = o || {};
    const t = el('div', { class: 'toast' + (o.variant ? ' ' + o.variant : '') });
    t.innerHTML = (o.busy ? '<span class="spinner" aria-hidden="true"></span>' : icon(o.icon || (o.variant === 'error' ? 'alert' : 'check'))) +
      '<span class="msg">' + esc(msg) + '</span>';
    let timer = null;
    const dismiss = () => { clearTimeout(timer); t.remove(); };
    if (o.action) {
      const b = el('button', { class: 'toast-action', type: 'button', text: o.action.label });
      b.addEventListener('click', () => { o.action.onClick && o.action.onClick(); dismiss(); });
      t.append(b);
    }
    t.append(el('button', { class: 'toast-x', type: 'button', 'aria-label': 'Dismiss', html: icon('x', 'sm'), onclick: dismiss }));
    toastsEl.append(t);
    while (toastsEl.children.length > 3) toastsEl.firstChild.remove();
    if (o.duration !== 0) timer = setTimeout(dismiss, o.duration || 4500);
    return {
      dismiss,
      el: t,
      update(m, opts) {
        opts = opts || {};
        $('.msg', t).textContent = m;
        const lead = t.firstChild;
        if (opts.icon || opts.busy === false) {
          const n = frag(icon(opts.icon || 'check')).firstChild;
          t.replaceChild(n, lead);
        }
        if (opts.variant) t.classList.add(opts.variant);
        if (opts.duration) { clearTimeout(timer); timer = setTimeout(dismiss, opts.duration); }
      },
    };
  }

  function tablist(tabs, current, onChange, label) {
    const list = el('div', { class: 'tabs', role: 'tablist', 'aria-label': label || 'Filter' });
    tabs.forEach((t) => {
      const b = el('button', { class: 'tab', role: 'tab', type: 'button', 'aria-selected': String(t.id === current), tabindex: t.id === current ? '0' : '-1', 'data-tab': t.id });
      b.innerHTML = esc(t.label) + (t.count != null ? ' <span class="count num">' + t.count + '</span>' : '');
      b.addEventListener('click', () => onChange(t.id));
      list.append(b);
    });
    list.addEventListener('keydown', (e) => {
      const btns = $$('.tab', list);
      const i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      let n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % btns.length;
      else if (e.key === 'ArrowLeft') n = (i - 1 + btns.length) % btns.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = btns.length - 1;
      if (n == null) return;
      e.preventDefault();
      onChange(btns[n].getAttribute('data-tab'), true);
    });
    return list;
  }

  function segmented(options, value, onChange, label) {
    const seg = el('div', { class: 'seg', role: 'group', 'aria-label': label || '' });
    options.forEach((o) => {
      const b = el('button', { class: 'seg-item', type: 'button', 'aria-pressed': String(o.id === value), 'aria-label': o.icon && !o.label ? o.title : null, title: o.title || null });
      b.innerHTML = (o.icon ? icon(o.icon) : '') + (o.label ? '<span>' + esc(o.label) + '</span>' : '');
      b.addEventListener('click', () => {
        $$('.seg-item', seg).forEach((x) => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        onChange(o.id);
      });
      seg.append(b);
    });
    return seg;
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; }
    } catch (e) { /* fall through */ }
    try {
      const ta = el('textarea', { style: 'position:fixed;left:-9999px;top:0', readonly: true, 'aria-hidden': 'true' });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  /* -------------------------------------------------------------- library */

  function sortItems(list, sort) {
    const out = list.slice();
    if (sort === 'name') out.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'views') out.sort((a, b) => (b.views || 0) - (a.views || 0) || a.hoursAgo - b.hoursAgo);
    else out.sort((a, b) => a.hoursAgo - b.hoursAgo);
    return out;
  }
  function metaFor(item) {
    const bits = [KIND_LABEL[item.kind]];
    if (item.kind === 'video') bits.push(item.duration);
    if (item.kind === 'document') bits.push(plural(item.pages, 'page'), item.size);
    if (item.kind === 'image') bits.push(item.size);
    if (item.kind === 'page' && item.recipient) bits.push('for ' + item.recipient);
    return bits;
  }
  function statusHTML(item) {
    const s = STATUS[item.status] || STATUS.new;
    const spin = item.status === 'processing' ? '<span class="spinner" style="width:10px;height:10px;border-width:1.5px" aria-hidden="true"></span>' : '<i class="dot" aria-hidden="true"></i>';
    return '<span class="status ' + s.cls + '">' + spin + esc(s.word) + '</span>';
  }
  function viewsText(item) {
    if (item.kind === 'image' || item.kind === 'folder') return '';
    if (!item.views) return item.status === 'shared' ? 'No views yet' : '';
    return plural(item.views, 'view');
  }
  // Separators carry their own spaces so a wrapped metadata line breaks between items, never inside one.
  const SEP = '<span class="sep"> · </span>';
  function rowHTML(item, opts) {
    opts = opts || {};
    const selected = state.lib.selected.has(item.id);
    const meta = metaFor(item).map(esc);
    // A search from the root spans folders; the folder name joins the metadata line.
    const folder = opts.showFolder && item.folder ? folderById(item.folder) : null;
    if (folder) meta.push('in ' + esc(folder.name));
    const views = viewsText(item);
    const statusBits = [(STATUS[item.status] || STATUS.new).word].concat(views ? [views] : []).map(esc);
    const when = esc(age(item.hoursAgo));
    const actions = opts.actionsHTML != null ? opts.actionsHTML :
      '<button class="btn btn-sm btn-quiet" type="button" data-act="share" data-id="' + esc(item.id) + '" aria-label="Share ' + esc(item.title) + '">' + icon('link') + '<span class="btn-label">Share</span></button>' +
      '<button class="btn btn-sm btn-quiet btn-icon" type="button" data-act="more" data-id="' + esc(item.id) + '" aria-label="More actions for ' + esc(item.title) + '" aria-haspopup="menu" aria-expanded="false">' + icon('more') + '</button>';
    return '<li class="row' + (selected ? ' is-selected' : '') + (opts.className ? ' ' + opts.className : '') + '" data-id="' + esc(item.id) + '">' +
      '<div class="col-check"><input type="checkbox" class="check" id="sel-' + esc(item.id) + '" data-act="select" data-id="' + esc(item.id) + '"' + (selected ? ' checked' : '') + ' aria-label="Select ' + esc(item.title) + '"></div>' +
      '<div class="col-poster"><div class="poster">' + posterFor(item) + (item.kind === 'video' ? '<span class="dur">' + esc(item.duration) + '</span>' : '') + '</div></div>' +
      '<div class="col-name">' +
        '<a class="row-title" href="#open-' + esc(item.id) + '" data-act="open" data-id="' + esc(item.id) + '" title="' + esc(item.title) + '">' + esc(item.title) + '</a>' +
        // Desktop: kind line only. Tablet: the status joins it when the Status column folds.
        '<div class="row-meta">' + meta.join(SEP) + '<span class="meta-extra">' + SEP + statusBits.join(SEP) + '</span></div>' +
        // Phone: a second, deliberate line instead of a wrapped one.
        '<div class="row-meta row-meta-phone">' + statusBits.concat([when]).join(SEP) + '</div>' +
      '</div>' +
      '<div class="col-status">' + statusHTML(item) + (views ? '<span class="views">' + esc(views) + '</span>' : '') + '</div>' +
      '<div class="col-modified">' + when + '</div>' +
      '<div class="col-actions">' + actions + '</div>' +
    '</li>';
  }
  // Folders are containers, not media: a 40px row with a glyph, the name, the count and the age.
  function folderRowHTML(f) {
    const n = folderCount(f.id);
    return '<li class="row folder-row" data-folder-id="' + esc(f.id) + '">' +
      '<div class="col-check"></div>' +
      '<div class="col-poster">' + icon('folder', 'folder-glyph') + '</div>' +
      '<div class="col-name">' +
        '<a class="row-title" href="#folder-' + esc(f.id) + '" data-act="open-folder" data-id="' + esc(f.id) + '">' + esc(f.name) + '</a>' +
        '<span class="row-meta">' + plural(n, 'item') + '</span>' +
      '</div>' +
      '<div class="col-status"></div>' +
      '<div class="col-modified">' + esc(age(f.hoursAgo)) + '</div>' +
      '<div class="col-actions">' +
        '<button class="btn btn-sm btn-quiet btn-icon" type="button" data-act="folder-more" data-id="' + esc(f.id) + '" aria-label="More actions for ' + esc(f.name) + '" aria-haspopup="menu" aria-expanded="false">' + icon('more') + '</button>' +
      '</div>' +
    '</li>';
  }

  function renderLibrary(main) {
    const L = state.lib;
    const folder = L.folder ? folderById(L.folder) : null;
    if (L.folder && !folder) L.folder = null;
    const q = L.q.trim().toLowerCase();
    // One level at a time: the root lists loose files and folders. A search from the root spans folders.
    const spansFolders = !folder && !!q;
    let files = ITEMS.slice();
    if (folder) files = files.filter((i) => i.folder === folder.id);
    else if (!spansFolders) files = files.filter((i) => !i.folder);
    if (q) files = files.filter((i) => i.title.toLowerCase().indexOf(q) >= 0);
    const counts = {
      all: files.length,
      video: files.filter((i) => i.kind === 'video').length,
      page: files.filter((i) => i.kind === 'page').length,
      document: files.filter((i) => i.kind === 'document').length,
    };
    if (L.filter !== 'all') files = files.filter((i) => i.kind === L.filter);
    files = sortItems(files, L.sort);
    const showFolders = !folder && L.filter === 'all' && !q && FOLDERS.length > 0;

    const page = el('div', { class: 'page lib' });
    const head = el('div', { class: 'page-head' });
    const headText = el('div', { class: 'page-head-text' });
    if (folder) {
      headText.append(frag('<nav class="crumbs" aria-label="Breadcrumb"><button type="button" data-act="up">Library</button><span class="sep">/</span><span class="here">' + esc(folder.name) + '</span></nav>'));
      headText.append(el('h1', { class: 'page-title', text: folder.name }));
    } else {
      headText.append(el('h1', { class: 'page-title', text: 'Library' }));
    }
    head.append(headText);
    head.append(frag(
      '<div class="btn-group" role="group" aria-label="Create">' +
        '<button class="btn btn-record" type="button" data-act="record">' + icon('record') + 'Record</button>' +
        '<button class="btn" type="button" data-act="upload">' + icon('upload') + 'Upload</button>' +
        '<button class="btn" type="button" data-act="new-page">' + icon('page') + 'New page</button>' +
      '</div>'));
    page.append(head);

    const toolbar = el('div', { class: 'lib-toolbar' });
    toolbar.append(tablist([
      { id: 'all', label: 'All', count: counts.all },
      { id: 'video', label: 'Videos', count: counts.video },
      { id: 'page', label: 'Pages', count: counts.page },
      { id: 'document', label: 'Documents', count: counts.document },
    ], L.filter, (id) => { L.filter = id; L.selected.clear(); rerender('[data-tab="' + id + '"]'); }, 'Filter by type'));
    if (L.selected.size) {
      const sel = el('div', { class: 'lib-selection', role: 'toolbar', 'aria-label': 'Selection' });
      sel.innerHTML = '<span class="count">' + plural(L.selected.size, 'item') + ' selected</span>' +
        '<button class="btn btn-sm" type="button" data-act="bulk-share">' + icon('link') + 'Share</button>' +
        '<button class="btn btn-sm" type="button" data-act="bulk-move">' + icon('move') + 'Move</button>' +
        '<button class="btn btn-sm btn-danger" type="button" data-act="bulk-delete">' + icon('trash') + 'Delete</button>' +
        '<button class="btn btn-sm btn-quiet" type="button" data-act="clear-selection">Clear</button>';
      toolbar.append(sel);
    } else {
      const tools = el('div', { class: 'lib-tools' });
      tools.innerHTML =
        '<div class="input-wrap lib-search">' + icon('search') + '<input class="input" id="lib-search" type="search" placeholder="Search' + (folder ? ' in ' + esc(folder.name) : '') + '" aria-label="Search library" value="' + esc(L.q) + '" autocomplete="off"><kbd>/</kbd></div>' +
        '<button class="btn btn-icon" type="button" data-act="sort" aria-label="Sort: ' + ({ recent: 'Recent', name: 'Name', views: 'Most viewed' })[L.sort] + '" aria-haspopup="menu" aria-expanded="false" data-tip="Sort">' + icon('sort') + '</button>' +
        (folder ? '' : '<button class="btn btn-icon" type="button" data-act="new-folder" aria-label="New folder" data-tip="New folder">' + icon('folderPlus') + '</button>');
      toolbar.append(tools);
    }
    page.append(toolbar);

    const table = el('div', { class: 'table' + (L.selected.size ? ' has-selection' : '') });
    const allSelected = files.length && files.every((i) => L.selected.has(i.id));
    const someSelected = files.some((i) => L.selected.has(i.id));
    const thead = frag('<div class="thead" role="presentation">' +
      '<div class="col-check"><input type="checkbox" class="check" id="sel-all" data-act="select-all" aria-label="Select all files"' + (allSelected ? ' checked' : '') + '></div>' +
      '<div></div><div class="t-micro">Name</div><div class="t-micro col-status">Status</div>' +
      '<div class="t-micro col-modified">Modified</div><div class="t-micro visually-hidden">Actions</div></div>');
    table.append(thead);
    const selAll = $('#sel-all', table);
    if (selAll) selAll.indeterminate = someSelected && !allSelected;
    // Folders first, in the same table, under the same column heads.
    if (showFolders) {
      const fl = el('ul', { class: 'rows folder-rows', 'aria-label': 'Folders' });
      fl.innerHTML = FOLDERS.slice().sort((a, b) => a.hoursAgo - b.hoursAgo).map(folderRowHTML).join('');
      table.append(fl);
    }
    if (files.length) {
      const list = el('ul', { class: 'rows', 'aria-label': 'Files' });
      list.innerHTML = files.map((i) => rowHTML(i, { showFolder: spansFolders })).join('');
      table.append(list);
    } else if (q) {
      table.append(frag('<div class="empty" role="status"><div class="t-h-s">No results for “' + esc(L.q) + '”</div><div>Try a shorter word, or clear the search to see ' + (folder ? 'this folder' : 'everything') + '.</div><div class="btn-group"><button class="btn" type="button" data-act="clear-search">Clear search</button>' + (L.filter !== 'all' ? '<button class="btn btn-quiet" type="button" data-act="clear-filter">Show all types</button>' : '') + '</div></div>'));
    } else {
      const kindWord = L.filter === 'all' ? 'files' : L.filter + 's';
      table.append(frag('<div class="empty" role="status"><div class="t-h-s">No ' + esc(kindWord) + (folder ? ' in ' + esc(folder.name) : '') + ' yet</div><div>Record a video or upload a file to start.</div><div class="btn-group"><button class="btn btn-record" type="button" data-act="record">' + icon('record') + 'Record</button><button class="btn" type="button" data-act="upload">' + icon('upload') + 'Upload</button></div></div>'));
    }
    page.append(table);

    bindLibraryActions(page);
    const search = $('#lib-search', page);
    if (search) {
      search.addEventListener('input', () => { L.q = search.value; rerender('#lib-search'); });
      search.addEventListener('keydown', (e) => { if (e.key === 'Escape' && search.value) { e.preventDefault(); L.q = ''; rerender('#lib-search'); } });
    }
    main.append(page);
  }

  function bindLibraryActions(root) {
    root.addEventListener('change', (e) => {
      const t = e.target.closest('[data-act="select"],[data-act="select-all"]');
      if (!t) return;
      const L = state.lib;
      if (t.dataset.act === 'select') {
        if (!ITEMS.some((i) => i.id === t.dataset.id)) return; // specimen rows on the system screen
        if (t.checked) L.selected.add(t.dataset.id); else L.selected.delete(t.dataset.id);
        rerender('#' + t.id);
      } else {
        const ids = $$('.rows [data-act="select"]', root).map((c) => c.dataset.id);
        if (t.checked) ids.forEach((id) => L.selected.add(id)); else ids.forEach((id) => L.selected.delete(id));
        rerender('#sel-all');
      }
    });
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t || t.matches('input')) return;
      const act = t.dataset.act;
      const id = t.dataset.id;
      const item = id ? itemById(id) : null;
      const L = state.lib;
      switch (act) {
        case 'record': openRecord(); break;
        case 'upload': openUpload(); break;
        case 'new-page': newPage(); break;
        case 'open': e.preventDefault(); openItem(item); break;
        case 'open-folder': e.preventDefault(); openFolder(id); break;
        case 'up': L.folder = null; L.selected.clear(); rerender(); break;
        case 'share': item && openShare(item); break;
        case 'more': item && itemMenu(t, item); break;
        case 'folder-more': folderMenu(t, folderById(id)); break;
        case 'sort': sortMenu(t); break;
        case 'new-folder': newFolder(); break;
        case 'clear-search': L.q = ''; rerender('#lib-search'); break;
        case 'clear-filter': L.filter = 'all'; rerender(); break;
        case 'clear-selection': L.selected.clear(); rerender(); break;
        case 'bulk-share': openShare(Array.from(L.selected).map(itemById).filter(Boolean)); break;
        case 'bulk-move': toast('Move is a demo. Items stay where they are.', { icon: 'move' }); break;
        case 'bulk-delete': deleteItems(Array.from(L.selected).map(itemById).filter(Boolean)); break;
        case 'retry-upload': demoRetry(t); break;
        case 'remove-failed': { const row = t.closest('.row'); if (row) { row.classList.add('is-gone'); setTimeout(() => row.remove(), reducedMotion() ? 0 : 200); } toast('Removed the failed upload.'); break; }
        default: break;
      }
    });
  }

  // Folder rows also appear on the System screen, so opening one navigates when needed.
  function openFolder(id) {
    const L = state.lib;
    L.folder = id; L.q = ''; L.filter = 'all'; L.selected.clear();
    if (state.view !== 'library') { setView('library'); return; }
    rerender();
    $('#main').focus({ preventScroll: true });
  }
  function openItem(item) {
    if (!item) return;
    if (item.kind === 'page') { setView('editor'); return; }
    const where = { video: 'the video editor', document: 'the document viewer', image: 'the image viewer' }[item.kind] || 'its viewer';
    toast('“' + item.title + '” would open in ' + where + '. Not part of this prototype.', { icon: 'info' });
  }
  function itemMenu(anchor, item) {
    // The row's Share button hides at phone width, so the menu carries Share there and only there.
    openMenu(anchor, [
      { label: 'Open', icon: item.kind === 'page' ? 'pencil' : 'external', onSelect: () => openItem(item) },
    ].concat(mqPhone.matches ? [{ label: 'Share', icon: 'link', onSelect: () => openShare(item) }] : []).concat([
      { label: 'Copy link', icon: 'copy', disabled: item.status === 'off' || item.status === 'processing', onSelect: () => copyLink(item) },
      { sep: true },
      { label: 'Rename', icon: 'textCursor', onSelect: () => startRename(item) },
      { label: 'Move to folder', icon: 'move', onSelect: () => moveMenuAfter(anchor, item) },
      { label: 'Duplicate', icon: 'copy', onSelect: () => duplicateItem(item) },
      { label: 'Download', icon: 'download', disabled: item.kind === 'page', onSelect: () => toast('Downloads are not part of this prototype.', { icon: 'info' }) },
      { sep: true },
      { label: 'Delete', icon: 'trash', danger: true, onSelect: () => deleteItems([item]) },
    ]), { align: 'end' });
  }
  function moveMenuAfter(anchor, item) {
    setTimeout(() => {
      const target = document.contains(anchor) ? anchor : $('#main');
      openMenu(target, [{ label: 'No folder', checked: !item.folder, onSelect: () => moveItem(item, null) }].concat(
        FOLDERS.map((f) => ({ label: f.name, checked: item.folder === f.id, onSelect: () => moveItem(item, f.id) }))
      ), { align: 'end', head: 'Move to' });
    }, 0);
  }
  function moveItem(item, folderId) {
    const prev = item.folder;
    item.folder = folderId;
    rerender();
    toast('Moved “' + item.title + '” to ' + (folderId ? folderById(folderId).name : 'the Library'), { action: { label: 'Undo', onClick: () => { item.folder = prev; rerender(); } } });
  }
  function folderMenu(anchor, f) {
    if (!f) return;
    openMenu(anchor, [
      { label: 'Open', icon: 'folder', onSelect: () => openFolder(f.id) },
      { label: 'Rename', icon: 'textCursor', onSelect: () => renameFolder(f) },
      { sep: true },
      { label: 'Delete folder', icon: 'trash', danger: true, onSelect: () => deleteFolder(f) },
    ], { align: 'end' });
  }
  function sortMenu(anchor) {
    const L = state.lib;
    const set = (s) => { L.sort = s; rerender('[data-act="sort"]'); };
    openMenu(anchor, [
      { label: 'Recent', checked: L.sort === 'recent', onSelect: () => set('recent') },
      { label: 'Name', checked: L.sort === 'name', onSelect: () => set('name') },
      { label: 'Most viewed', checked: L.sort === 'views', onSelect: () => set('views') },
    ], { align: 'end', head: 'Sort by' });
  }
  function copyLink(item) {
    const url = linkFor(item);
    copyText(url).then((ok) => {
      if (ok) toast('Sample link copied. It points nowhere.', { icon: 'copy' });
      else toast('The browser blocked the clipboard. The sample link is ' + url, { variant: 'error', duration: 8000 });
    });
  }
  function linkFor(item) {
    const slug = item.title.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28);
    const kind = item.kind === 'page' ? 'p' : item.kind === 'video' ? 'v' : 'f';
    return 'https://clarity.example/' + kind + '/' + slug + '-7f3k';
  }
  function startRename(item) {
    const row = $('.row[data-id="' + item.id + '"]');
    if (!row) return;
    const nameCell = $('.col-name', row);
    const prev = nameCell.innerHTML;
    nameCell.innerHTML = '<div class="row-rename"><input class="input" type="text" aria-label="Rename ' + esc(item.title) + '" value="' + esc(item.title) + '"><button class="btn btn-sm" type="button" data-rename="save">Save</button><button class="btn btn-sm btn-quiet" type="button" data-rename="cancel">Cancel</button></div>';
    const input = $('input', nameCell);
    const finish = (save) => {
      if (save) {
        const v = input.value.trim();
        // The re-render replaces the row, so name the title link to put focus back on it.
        if (v && v !== item.title) { const old = item.title; item.title = v; rerender('.row[data-id="' + item.id + '"] .row-title'); toast('Renamed to “' + v + '”', { action: { label: 'Undo', onClick: () => { item.title = old; rerender(); } } }); return; }
      }
      nameCell.innerHTML = prev;
      const link = $('.row-title', nameCell);
      link && link.focus();
    };
    nameCell.addEventListener('click', (e) => { const b = e.target.closest('[data-rename]'); if (b) finish(b.dataset.rename === 'save'); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); finish(true); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); } });
    input.focus();
    input.select();
  }
  function renameFolder(f) {
    const row = $('.row[data-folder-id="' + f.id + '"]');
    if (!row) return;
    const nameCell = $('.col-name', row);
    const prev = nameCell.innerHTML;
    nameCell.innerHTML = '<div class="row-rename"><input class="input" type="text" aria-label="Rename folder" value="' + esc(f.name) + '"><button class="btn btn-sm" type="button" data-rename="save">Save</button><button class="btn btn-sm btn-quiet" type="button" data-rename="cancel">Cancel</button></div>';
    const input = $('input', nameCell);
    const finish = (save) => {
      if (save && input.value.trim()) { f.name = input.value.trim(); rerender('.row[data-folder-id="' + f.id + '"] .row-title'); return; }
      nameCell.innerHTML = prev;
    };
    nameCell.addEventListener('click', (e) => { const b = e.target.closest('[data-rename]'); if (b) finish(b.dataset.rename === 'save'); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); finish(true); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); } });
    input.focus();
    input.select();
  }
  function duplicateItem(item) {
    const copy = Object.assign({}, item, { id: uid(item.id), title: item.title.replace(/(\.[a-z0-9]+)?$/i, ' (copy)$1'), hoursAgo: 0, views: 0, status: item.kind === 'image' || item.kind === 'document' ? 'private' : 'new' });
    // A copy always lands in the Library, at the top when the source is a System-screen example.
    ITEMS.splice(Math.max(0, ITEMS.indexOf(item)), 0, copy);
    rerender();
    toast('Duplicated as “' + copy.title + '”', { action: { label: 'Undo', onClick: () => { const k = ITEMS.indexOf(copy); if (k >= 0) ITEMS.splice(k, 1); rerender(); } } });
  }
  function deleteItems(items) {
    if (!items.length) return;
    const removed = items.map((it) => { const list = listOf(it); return { it, list, i: list.indexOf(it) }; }).filter((r) => r.i >= 0).sort((a, b) => a.i - b.i);
    removed.slice().reverse().forEach((r) => r.list.splice(r.i, 1));
    items.forEach((it) => state.lib.selected.delete(it.id));
    rerender();
    const label = items.length === 1 ? '“' + items[0].title + '”' : plural(items.length, 'item');
    toast('Deleted ' + label, {
      icon: 'trash',
      duration: 7000,
      action: { label: 'Undo', onClick: () => { removed.forEach((r) => r.list.splice(Math.min(r.i, r.list.length), 0, r.it)); rerender(); } },
    });
  }
  function deleteFolder(f) {
    const i = FOLDERS.indexOf(f);
    if (i < 0) return;
    const inside = ITEMS.filter((it) => it.folder === f.id);
    FOLDERS.splice(i, 1);
    inside.forEach((it) => { it.folder = null; });
    if (state.lib.folder === f.id) state.lib.folder = null;
    rerender();
    toast('Deleted folder “' + f.name + '”. Its ' + plural(inside.length, 'file') + ' moved to the Library.', {
      icon: 'trash', duration: 7000,
      action: { label: 'Undo', onClick: () => { FOLDERS.splice(i, 0, f); inside.forEach((it) => { it.folder = f.id; }); rerender(); } },
    });
  }
  function newFolder() {
    const f = { id: uid('folder'), name: 'Untitled folder', hoursAgo: 0 };
    FOLDERS.push(f);
    state.lib.filter = 'all'; state.lib.q = ''; state.lib.folder = null; state.lib.selected.clear();
    rerender();
    renameFolder(f);
  }
  function newPage() {
    const item = { id: uid('page'), kind: 'page', title: 'Untitled page', hoursAgo: 0, views: 0, status: 'new', folder: state.lib.folder, recipient: '' };
    ITEMS.unshift(item);
    state.lib.filter = 'all'; state.lib.q = '';
    rerender();
    toast('New page added to the Library. It opens the sample proposal in this prototype.', {
      icon: 'page', duration: 7000,
      action: { label: 'Open', onClick: () => setView('editor') },
    });
  }

  /* ---------------------------------------------------------------- editor */

  const findSection = (id) => PAGE.sections.find((s) => s.id === id);
  const proposalItem = () => itemById('proposal') || { id: 'proposal', kind: 'page', title: PAGE.title, status: 'shared', views: 7, hoursAgo: 26, recipient: PAGE.recipient };

  // The bar's status is the publish word. "Edited" is appended only after an edit; nothing is saved.
  function edStatusHTML() {
    return statusHTML(proposalItem()) + (state.ed.dirty ? '<span class="sep">·</span><span>Edited</span>' : '');
  }
  function updateEdStatus() {
    const s = $('#ed-status');
    if (s) s.innerHTML = edStatusHTML();
  }
  function markDirty() {
    if (state.ed.dirty) return;
    state.ed.dirty = true;
    updateEdStatus();
  }
  // The properties drawer (below 1024): the opener's aria-expanded follows the drawer both ways, and
  // every way of closing it (Escape, the close button, the scrim) hands focus back to the opener.
  function openProps() {
    const editor = $('.editor');
    if (!editor) return;
    editor.classList.add('props-open');
    const b = $('[data-act="open-props"]', editor);
    b && b.setAttribute('aria-expanded', 'true');
  }
  function closeProps(refocus) {
    const editor = $('.editor');
    if (!editor || !editor.classList.contains('props-open')) return;
    editor.classList.remove('props-open');
    const b = $('[data-act="open-props"]', editor);
    if (b) { b.setAttribute('aria-expanded', 'false'); if (refocus) b.focus(); }
  }
  // The page keeps its own theme on the sheet, whatever the tool's theme is.
  function sheetClass() {
    return 'sheet' + (state.ed.device === 'phone' ? ' phone' : '') + (PAGE.theme === 'ink' ? ' dark' : PAGE.theme === 'brand' ? ' light theme-brand' : ' light');
  }
  function stopPlayer() {
    const p = state.ed.player;
    if (p && p.timer) clearInterval(p.timer);
    state.ed.player = null;
  }
  function togglePlay(sectionId) {
    const s = findSection(sectionId);
    if (!s) return;
    let p = state.ed.player;
    if (p && p.id !== sectionId) { stopPlayer(); p = null; }
    if (!p) p = state.ed.player = { id: sectionId, pos: 0, playing: false, timer: null };
    if (p.playing) { clearInterval(p.timer); p.timer = null; p.playing = false; }
    else {
      p.playing = true;
      p.timer = setInterval(() => {
        p.pos += 0.25;
        if (p.pos >= s.seconds) { p.pos = 0; p.playing = false; clearInterval(p.timer); p.timer = null; updatePlayer(s); return; }
        updatePlayer(s);
      }, 250);
    }
    updatePlayer(s);
  }
  function updatePlayer(s) {
    const node = $('.player[data-player="' + s.id + '"]');
    if (!node) return;
    const p = state.ed.player && state.ed.player.id === s.id ? state.ed.player : { pos: 0, playing: false };
    node.classList.toggle('is-playing', p.playing);
    $('.time', node).textContent = fmtTime(p.pos) + ' / ' + s.duration;
    $('.track i', node).style.width = (s.seconds ? (p.pos / s.seconds) * 100 : 0) + '%';
    const b = $('[data-act="toggle-play"]', node);
    b.innerHTML = icon(p.playing ? 'pause' : 'play');
    b.setAttribute('aria-label', p.playing ? 'Pause' : 'Play');
  }

  function sheetHTML() {
    const sel = state.ed.sel;
    const cls = (id) => 'pv-section' + (sel === id ? ' is-selected' : '');
    let h = '<header class="' + cls('page') + ' pv-head" data-sid="page">' +
      '<div class="pv-eyebrow">' + (PAGE.showLogo ? '<span class="logo" aria-hidden="true">N</span>' : '') + '<span>Northstar Studio</span></div>' +
      '<h1 class="pv-title content-title"><span class="editable" id="pv-title"' + (state.ed.preview ? '' : ' contenteditable="true" role="textbox" aria-label="Page title" data-placeholder="Untitled page" spellcheck="false"') + '>' + esc(PAGE.title) + '</span></h1>' +
      '<p class="pv-greeting">Prepared for ' + esc(PAGE.recipient || 'your reader') + (PAGE.company ? ', ' + esc(PAGE.company) : '') + '</p>' +
    '</header>';
    if (!PAGE.sections.length) h += '<div class="pv-empty">This page has no sections yet. Add one from the Contents list.</div>';
    PAGE.sections.forEach((s) => {
      const open = '<section class="' + cls(s.id) + ' pv-' + s.type + '" data-sid="' + esc(s.id) + '" aria-label="' + esc(s.name) + '">';
      if (s.type === 'video') {
        const p = state.ed.player && state.ed.player.id === s.id ? state.ed.player : { pos: 0, playing: false };
        h += open + '<div class="player' + (p.playing ? ' is-playing' : '') + '" data-player="' + esc(s.id) + '">' +
          '<svg class="frame" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + posterSVG(s.poster).replace(/^<svg[^>]*>|<\/svg>$/g, '') + '</svg>' +
          '<button class="play" type="button" data-act="toggle-play" aria-label="Play video">' + icon('play') + '</button>' +
          '<div class="ctrls">' +
            '<button class="btn" type="button" data-act="toggle-play" aria-label="' + (p.playing ? 'Pause' : 'Play') + '">' + icon(p.playing ? 'pause' : 'play') + '</button>' +
            '<span class="time num">' + fmtTime(p.pos) + ' / ' + esc(s.duration) + '</span>' +
            // Play, time and track only: the honest local scope. Captions, volume and full screen would be dead here.
            '<div class="track" aria-hidden="true"><i style="width:' + (s.seconds ? (p.pos / s.seconds) * 100 : 0) + '%"></i></div>' +
          '</div></div>' +
          (s.caption ? '<p class="pv-caption">' + esc(s.caption) + '</p>' : '') + '</section>';
      } else if (s.type === 'text') {
        const paras = s.body.split(/\n\s*\n/).filter(Boolean).map((p) => '<p>' + esc(p) + '</p>').join('');
        h += open + '<h2 class="content-h">' + esc(s.heading) + '</h2>' +
          '<div class="' + (s.layout === 'image' ? 'pv-cols' : '') + '"><div class="content-prose">' + paras + '</div>' + (s.layout === 'image' ? '<div class="pv-figure">' + portraitSVG() + '</div>' : '') + '</div>' +
          (s.bullets.length ? '<ul class="pv-bullets">' + s.bullets.map((b) => '<li>' + esc(b) + '</li>').join('') + '</ul>' : '') + '</section>';
      } else if (s.type === 'docs') {
        h += open + '<h2 class="content-h">' + esc(s.heading) + '</h2><div class="pv-doclist">' +
          s.docs.map((d) => '<div class="pv-doc">' + icon('fileText') + '<div class="who"><div class="name">' + esc(d.name) + '</div><div class="t-small muted">' + esc(d.meta) + '</div></div><button class="btn btn-sm" type="button" data-act="doc-download">Download</button></div>').join('') +
          (s.docs.length ? '' : '<div class="pv-doc muted">No documents attached.</div>') + '</div></section>';
      } else if (s.type === 'cta') {
        h += open + '<p class="lead">' + esc(s.lead) + '</p>' +
          '<a class="pv-btn' + (s.style === 'hairline' ? ' hairline' : '') + '" href="' + esc(s.url) + '" data-act="cta"' + (s.newTab ? ' target="_blank" rel="noopener"' : '') + '>' + esc(s.label) + icon('arrowUpRight') + '</a>' +
          (s.note ? '<p class="note">' + esc(s.note) + '</p>' : '') + '</section>';
      }
    });
    h += '<footer class="pv-foot"><span>Sent by <b>Alex Morgan</b> · Reply to ' + esc(PAGE.replyTo) + '</span><span>Made with Clarity</span></footer>';
    return h;
  }
  function updateSheet() {
    const sheet = $('#sheet');
    if (!sheet) return;
    sheet.innerHTML = sheetHTML();
    sheet.className = sheetClass();
    bindTitleEditing(sheet);
  }
  function bindTitleEditing(sheet) {
    if (state.ed.preview) return;
    const t = $('#pv-title', sheet);
    if (!t) return;
    t.addEventListener('input', () => {
      PAGE.title = t.textContent.replace(/\n/g, ' ');
      const f = $('#f-title'); if (f && f.value !== PAGE.title) f.value = PAGE.title;
      const crumb = $('#ed-crumb-title'); if (crumb) crumb.textContent = PAGE.title || 'Untitled page';
      const item = itemById('proposal'); if (item) item.title = PAGE.title || 'Untitled page';
      markDirty();
    });
    t.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); t.blur(); } });
    t.addEventListener('paste', (e) => { e.preventDefault(); const txt = (e.clipboardData || window.clipboardData).getData('text'); document.execCommand('insertText', false, txt.replace(/\s+/g, ' ')); });
    t.addEventListener('focus', () => selectSection('page', { silent: true }));
  }

  function outlineHTML() {
    const sel = state.ed.sel;
    let h = '<button class="ol-item page" type="button" data-sid="page" aria-current="' + (sel === 'page') + '">' + icon('page') + '<span class="label">Page settings</span></button>';
    PAGE.sections.forEach((s, i) => {
      h += '<button class="ol-item" type="button" data-sid="' + esc(s.id) + '" aria-current="' + (sel === s.id) + '"><span class="n">' + (i + 1) + '</span>' + icon(SECTION_ICON[s.type]) + '<span class="label">' + esc(s.name) + '</span></button>';
    });
    return h;
  }
  function updateOutline() {
    const list = $('#ol-list');
    if (list) list.innerHTML = outlineHTML();
  }
  function selectSection(id, opts) {
    opts = opts || {};
    state.ed.sel = id;
    $$('.ol-item').forEach((b) => b.setAttribute('aria-current', String(b.dataset.sid === id)));
    $$('.pv-section').forEach((s) => s.classList.toggle('is-selected', s.dataset.sid === id));
    renderProps();
    if (opts.scroll) { const sec = $('.pv-section[data-sid="' + id + '"]'); sec && sec.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' }); }
    if (opts.openProps && matchMedia('(max-width: 1023px)').matches) openProps();
  }

  function field(label, control, opts) {
    opts = opts || {};
    const id = opts.id || uid('f');
    const wrap = el('div', { class: 'field' });
    wrap.append(el('label', { class: 'field-label', for: id, html: esc(label) + (opts.optional ? '<span class="opt">Optional</span>' : '') }));
    control.id = id;
    wrap.append(control);
    if (opts.hint) wrap.append(el('div', { class: 'field-hint', text: opts.hint }));
    const err = el('div', { class: 'field-error', id: id + '-err', role: 'alert', hidden: true });
    wrap.append(err);
    wrap.setError = (msg) => {
      if (msg) { err.innerHTML = icon('alert') + '<span>' + esc(msg) + '</span>'; err.hidden = false; control.setAttribute('aria-invalid', 'true'); control.setAttribute('aria-describedby', err.id); }
      else { err.hidden = true; control.removeAttribute('aria-invalid'); control.removeAttribute('aria-describedby'); }
    };
    return wrap;
  }
  function textInput(value, onInput, opts) {
    opts = opts || {};
    const i = el('input', { class: 'input' + (opts.content ? ' content' : ''), type: opts.type || 'text', value: value == null ? '' : value, placeholder: opts.placeholder || null, autocomplete: 'off', spellcheck: opts.content ? 'true' : null });
    i.addEventListener('input', () => onInput(i.value, i));
    return i;
  }
  function textArea(value, onInput, opts) {
    opts = opts || {};
    const t = el('textarea', { class: 'textarea' + (opts.content ? ' content' : ''), rows: String(opts.rows || 4), placeholder: opts.placeholder || null });
    t.value = value || '';
    t.addEventListener('input', () => onInput(t.value, t));
    return t;
  }
  function switchRow(label, hint, checked, onChange) {
    const id = uid('sw');
    const row = el('div', { class: 'field-row' });
    row.append(el('label', { for: id }, el('div', { class: 'field-label', text: label }), hint ? el('div', { class: 'field-hint', text: hint }) : null));
    const sw = el('input', { class: 'switch', type: 'checkbox', role: 'switch', id: id });
    sw.checked = !!checked;
    sw.addEventListener('change', () => onChange(sw.checked));
    row.append(sw);
    return row;
  }
  function selectInput(options, value, onChange) {
    const s = el('select', { class: 'select' });
    options.forEach((o) => s.append(el('option', { value: o.id, selected: o.id === value }, o.label)));
    s.addEventListener('change', () => onChange(s.value));
    return s;
  }

  function renderProps() {
    const props = $('#ed-props');
    if (!props) return;
    const sel = state.ed.sel;
    const s = sel === 'page' ? null : findSection(sel);
    props.innerHTML = '';
    const head = el('div', { class: 'props-head' });
    const body = el('div', { class: 'props-body' });
    const foot = el('div', { class: 'props-foot' });
    const closeBtn = el('button', { class: 'btn btn-quiet btn-icon props-close', type: 'button', 'aria-label': 'Close properties', html: icon('x'), onclick: () => closeProps(true) });

    if (!s) {
      head.append(el('div', null, el('h2', { class: 't-h-s', text: 'Page settings' }), el('div', { class: 't-small muted', text: 'Applies to the whole page' })), closeBtn);
      body.append(field('Title', textInput(PAGE.title, (v) => {
        PAGE.title = v;
        const t = $('#pv-title'); if (t && t.textContent !== v) t.textContent = v;
        const crumb = $('#ed-crumb-title'); if (crumb) crumb.textContent = v || 'Untitled page';
        const item = itemById('proposal'); if (item) item.title = v || 'Untitled page';
        markDirty();
      }, { content: true }), { id: 'f-title' }));
      body.append(field('Prepared for', textInput(PAGE.recipient, (v) => { PAGE.recipient = v; updateSheet(); markDirty(); }, { placeholder: 'Reader’s name' })));
      body.append(field('Company', textInput(PAGE.company, (v) => { PAGE.company = v; updateSheet(); markDirty(); }), { optional: true }));
      const replyField = field('Reply-to', textInput(PAGE.replyTo, (v, input) => {
        PAGE.replyTo = v;
        replyField.setError(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter an address like name@company.com');
        updateSheet(); markDirty();
      }, { type: 'email' }), { hint: 'Replies to the page go here.' });
      body.append(replyField);
      const look = el('div', { class: 'props-group' }, el('div', { class: 't-micro', text: 'Appearance' }));
      look.append(field('Theme', selectInput([{ id: 'paper', label: 'Paper' }, { id: 'ink', label: 'Ink' }, { id: 'brand', label: 'Brand accent' }], PAGE.theme, (v) => { PAGE.theme = v; updateSheet(); markDirty(); })));
      look.append(switchRow('Show logo', 'Northstar Studio mark above the title', PAGE.showLogo, (v) => { PAGE.showLogo = v; updateSheet(); markDirty(); }));
      body.append(look);
    } else {
      const idx = PAGE.sections.indexOf(s);
      head.append(el('div', null, el('h2', { class: 't-h-s', text: s.name }), el('div', { class: 't-small muted', text: SECTION_KIND[s.type] + ' · ' + (idx + 1) + ' of ' + PAGE.sections.length })), closeBtn);
      body.append(field('Section name', textInput(s.name, (v) => { s.name = v || SECTION_KIND[s.type]; updateOutline(); $('h2', head).textContent = s.name; const sec = $('.pv-section[data-sid="' + s.id + '"]'); sec && sec.setAttribute('aria-label', s.name); markDirty(); }), { hint: 'Shown in Contents, not on the page.' }));
      if (s.type === 'video') {
        const media = el('div', { class: 'media-field' });
        media.innerHTML = '<div class="poster">' + posterSVG(s.poster) + '<span class="dur">' + esc(s.duration) + '</span></div><div class="who"><b>' + esc(s.source) + '</b>' + esc(s.duration) + ' · from the Library</div>';
        media.append(el('button', { class: 'btn btn-sm', type: 'button', text: 'Replace', onclick: () => toast('The media picker is not part of this prototype.', { icon: 'info' }) }));
        body.append(el('div', { class: 'field' }, el('div', { class: 'field-label', text: 'Video' }), media));
        body.append(field('Caption', textArea(s.caption, (v) => { s.caption = v; updateSheet(); markDirty(); }, { content: true, rows: 3, placeholder: 'A line under the video' }), { optional: true }));
        const thumbSeg = segmented([{ id: 'talk', label: 'From video' }, { id: 'talk-2', label: 'Still' }, { id: 'screen', label: 'Slide' }], s.poster, (v) => {
          s.poster = v;
          updateSheet();
          $('.media-field .poster', body).innerHTML = posterSVG(v) + '<span class="dur">' + esc(s.duration) + '</span>';
          markDirty();
        }, 'Thumbnail');
        body.append(el('div', { class: 'field' }, el('div', { class: 'field-label', text: 'Thumbnail' }), thumbSeg));
        const behave = el('div', { class: 'props-group' }, el('div', { class: 't-micro', text: 'Playback' }));
        behave.append(switchRow('Autoplay', 'Muted until the reader taps', s.autoplay, (v) => { s.autoplay = v; markDirty(); }));
        behave.append(switchRow('Captions', 'Generated from the recording', s.captions, (v) => { s.captions = v; updateSheet(); markDirty(); }));
        body.append(behave);
        const trim = el('div', { class: 'props-group' }, el('div', { class: 't-micro', text: 'Trim' }));
        const pair = el('div', { class: 'field-pair' });
        const startF = field('Start', textInput(s.trimStart, (v) => { s.trimStart = v; validateTrim(); }), { hint: 'm:ss' });
        const endF = field('End', textInput(s.trimEnd, (v) => { s.trimEnd = v; validateTrim(); }), { hint: 'm:ss' });
        function validateTrim() {
          const a = parseTime(s.trimStart), b = parseTime(s.trimEnd);
          startF.setError(a == null ? 'Use minutes:seconds, like 0:15' : '');
          endF.setError(b == null ? 'Use minutes:seconds, like 3:40' : (a != null && b <= a ? 'End must come after start' : ''));
          if (a != null && b != null && b > a) { s.seconds = b - a; s.duration = fmtTime(b - a); updateSheet(); $('.media-field .dur', body).textContent = s.duration; }
          markDirty();
        }
        pair.append(startF, endF);
        trim.append(pair);
        body.append(trim);
      } else if (s.type === 'text') {
        body.append(field('Heading', textInput(s.heading, (v) => { s.heading = v; updateSheet(); markDirty(); }, { content: true })));
        body.append(field('Body', textArea(s.body, (v) => { s.body = v; updateSheet(); markDirty(); }, { content: true, rows: 7 }), { hint: 'A blank line starts a new paragraph.' }));
        body.append(el('div', { class: 'field' }, el('div', { class: 'field-label', text: 'Layout' }), segmented([{ id: 'text', label: 'Text' }, { id: 'image', label: 'Text + image' }], s.layout, (v) => { s.layout = v; updateSheet(); markDirty(); }, 'Layout')));
        const bl = el('div', { class: 'props-group' });
        const renderBullets = () => {
          bl.innerHTML = '';
          bl.append(el('div', { class: 't-micro', text: 'Bullets' }));
          s.bullets.forEach((b, i) => {
            const row = el('div', { class: 'bullet-field' });
            row.append(textInput(b, (v) => { s.bullets[i] = v; updateSheet(); markDirty(); }, { content: true }));
            $('input', row).setAttribute('aria-label', 'Bullet ' + (i + 1));
            row.append(el('button', { class: 'btn btn-sm btn-quiet btn-icon', type: 'button', 'aria-label': 'Remove bullet ' + (i + 1), html: icon('x'), onclick: () => { s.bullets.splice(i, 1); renderBullets(); updateSheet(); markDirty(); } }));
            bl.append(row);
          });
          if (s.bullets.length < 5) bl.append(el('button', { class: 'btn btn-sm btn-quiet', type: 'button', html: icon('plus') + 'Add bullet', onclick: () => { s.bullets.push(''); renderBullets(); const inputs = $$('.bullet-field input', bl); inputs[inputs.length - 1].focus(); updateSheet(); markDirty(); } }));
          else bl.append(el('div', { class: 'field-hint', text: 'Five bullets is the limit for this section.' }));
        };
        renderBullets();
        body.append(bl);
      } else if (s.type === 'docs') {
        body.append(field('Heading', textInput(s.heading, (v) => { s.heading = v; updateSheet(); markDirty(); }, { content: true })));
        const dl = el('div', { class: 'props-group' });
        const renderDocs = () => {
          dl.innerHTML = '';
          dl.append(el('div', { class: 't-micro', text: 'Attached' }));
          s.docs.forEach((d, i) => {
            const row = el('div', { class: 'media-field' });
            row.innerHTML = icon('fileText') + '<div class="who"><b>' + esc(d.name) + '</b>' + esc(d.meta) + '</div>';
            row.append(el('button', { class: 'btn btn-sm btn-quiet btn-icon', type: 'button', 'aria-label': 'Remove ' + d.name, html: icon('x'), onclick: () => { s.docs.splice(i, 1); renderDocs(); updateSheet(); markDirty(); } }));
            dl.append(row);
          });
          dl.append(el('button', { class: 'btn btn-sm', type: 'button', html: icon('plus') + 'Attach from Library', onclick: () => { s.docs.push({ name: 'Pricing appendix.pdf', meta: '4 pages · 310 KB · sample' }); renderDocs(); updateSheet(); markDirty(); } }));
        };
        renderDocs();
        body.append(dl);
      } else if (s.type === 'cta') {
        body.append(field('Lead line', textInput(s.lead, (v) => { s.lead = v; updateSheet(); markDirty(); }, { content: true })));
        body.append(field('Button label', textInput(s.label, (v) => { s.label = v || 'Button'; updateSheet(); markDirty(); })));
        const urlF = field('Link', textInput(s.url, (v) => { s.url = v; urlF.setError(/^https?:\/\/\S+\.\S+/.test(v) ? '' : 'Start with https:// and include a domain'); updateSheet(); markDirty(); }, { type: 'url' }), { hint: 'Where the button goes.' });
        body.append(urlF);
        body.append(el('div', { class: 'field' }, el('div', { class: 'field-label', text: 'Style' }), segmented([{ id: 'filled', label: 'Filled' }, { id: 'hairline', label: 'Hairline' }], s.style, (v) => { s.style = v; updateSheet(); markDirty(); }, 'Button style')));
        body.append(switchRow('Open in a new tab', null, s.newTab, (v) => { s.newTab = v; updateSheet(); markDirty(); }));
        body.append(field('Note under the button', textInput(s.note, (v) => { s.note = v; updateSheet(); markDirty(); }), { optional: true }));
      }
      foot.append(
        el('button', { class: 'btn btn-sm btn-icon', type: 'button', 'aria-label': 'Move section up', 'data-tip': 'Move up', 'data-tip-side': 'top', html: icon('arrowUp'), disabled: idx === 0, onclick: () => moveSection(s, -1) }),
        el('button', { class: 'btn btn-sm btn-icon', type: 'button', 'aria-label': 'Move section down', 'data-tip': 'Move down', 'data-tip-side': 'top', html: icon('arrowDown'), disabled: idx === PAGE.sections.length - 1, onclick: () => moveSection(s, 1) }),
        el('span', { class: 'spacer' }),
        el('button', { class: 'btn btn-sm btn-quiet btn-danger', type: 'button', html: icon('trash') + 'Remove', onclick: () => removeSection(s) }));
    }
    // Page settings have no footer controls, so the strip is not drawn.
    props.append(head, body);
    if (s) props.append(foot);
  }
  function moveSection(s, dir) {
    const i = PAGE.sections.indexOf(s);
    const j = i + dir;
    if (j < 0 || j >= PAGE.sections.length) return;
    PAGE.sections.splice(i, 1);
    PAGE.sections.splice(j, 0, s);
    updateOutline(); updateSheet(); renderProps(); markDirty();
    const btn = $('.props-foot [aria-label="Move section ' + (dir < 0 ? 'up' : 'down') + '"]');
    (btn && !btn.disabled ? btn : $('.props-foot .btn')).focus();
  }
  function removeSection(s) {
    const i = PAGE.sections.indexOf(s);
    if (i < 0) return;
    PAGE.sections.splice(i, 1);
    if (state.ed.player && state.ed.player.id === s.id) stopPlayer();
    state.ed.sel = 'page';
    updateOutline(); updateSheet(); renderProps(); markDirty();
    toast('Removed “' + s.name + '”', { icon: 'trash', duration: 7000, action: { label: 'Undo', onClick: () => { PAGE.sections.splice(Math.min(i, PAGE.sections.length), 0, s); updateOutline(); updateSheet(); selectSection(s.id, { scroll: true }); } } });
  }
  function addSection(type) {
    const s = TEMPLATES[type]();
    PAGE.sections.push(s);
    updateOutline(); updateSheet(); markDirty();
    selectSection(s.id, { scroll: true, openProps: true });
    const first = $('#ed-props .input'); first && first.focus();
  }
  function addSectionMenu(anchor) {
    openMenu(anchor, [
      { label: 'Text', icon: 'type', onSelect: () => addSection('text') },
      { label: 'Video', icon: 'video', onSelect: () => addSection('video') },
      { label: 'Documents', icon: 'paperclip', onSelect: () => addSection('docs') },
      { label: 'Call to action', icon: 'target', onSelect: () => addSection('cta') },
    ], { head: 'Add section' });
  }
  function sectionsMenu(anchor) {
    const items = [{ label: 'Page settings', icon: 'page', checked: state.ed.sel === 'page', onSelect: () => selectSection('page', { scroll: true, openProps: true }) }];
    PAGE.sections.forEach((s) => items.push({ label: s.name, icon: SECTION_ICON[s.type], checked: state.ed.sel === s.id, onSelect: () => selectSection(s.id, { scroll: true, openProps: true }) }));
    items.push({ sep: true });
    items.push({ label: 'Add text', icon: 'plus', onSelect: () => addSection('text') });
    items.push({ label: 'Add video', icon: 'plus', onSelect: () => addSection('video') });
    items.push({ label: 'Add call to action', icon: 'plus', onSelect: () => addSection('cta') });
    openMenu(anchor, items, { head: 'Contents' });
  }

  function renderEditor(main) {
    const E = state.ed;
    const editor = el('div', { class: 'editor' + (E.preview ? ' is-preview' : '') });
    const bar = el('div', { class: 'ed-bar' });
    if (E.preview) {
      bar.innerHTML =
        '<button class="btn btn-quiet" type="button" data-act="exit-preview">' + icon('arrowLeft') + 'Exit preview</button>' +
        '<nav class="crumbs" aria-label="Preview"><span class="t-small muted">Previewing as ' + esc(PAGE.recipient || 'the reader') + ' would see it</span></nav>' +
        '<div class="ed-actions">' +
          '<div class="seg device-seg" role="group" aria-label="Preview width">' +
            '<button class="seg-item" type="button" data-device="desktop" aria-pressed="' + (E.device === 'desktop') + '" aria-label="Desktop width">' + icon('monitor') + '</button>' +
            '<button class="seg-item" type="button" data-device="phone" aria-pressed="' + (E.device === 'phone') + '" aria-label="Phone width">' + icon('phone') + '</button>' +
          '</div>' +
          '<button class="btn btn-primary" type="button" data-act="share">' + icon('link') + 'Share</button>' +
        '</div>';
    } else {
      bar.innerHTML =
        // One exit: the 44px arrow. The crumb is plain text that names the path.
        '<button class="btn btn-quiet btn-icon" type="button" data-act="back" aria-label="Back to Library" data-tip="Library">' + icon('arrowLeft') + '</button>' +
        '<nav class="crumbs" aria-label="Breadcrumb"><span>Library</span><span class="sep">/</span><span class="here" id="ed-crumb-title">' + esc(PAGE.title || 'Untitled page') + '</span></nav>' +
        '<span class="ed-status" id="ed-status">' + edStatusHTML() + '</span>' +
        '<div class="ed-actions">' +
          '<button class="btn ed-sections-btn" type="button" data-act="sections" aria-haspopup="menu" aria-expanded="false">' + icon('list') + 'Contents</button>' +
          '<div class="seg device-seg" role="group" aria-label="Preview width">' +
            '<button class="seg-item" type="button" data-device="desktop" aria-pressed="' + (E.device === 'desktop') + '" aria-label="Desktop width">' + icon('monitor') + '</button>' +
            '<button class="seg-item" type="button" data-device="phone" aria-pressed="' + (E.device === 'phone') + '" aria-label="Phone width">' + icon('phone') + '</button>' +
          '</div>' +
          '<button class="btn btn-icon ed-props-btn" type="button" data-act="open-props" aria-label="Properties" aria-expanded="false">' + icon('panelRight') + '</button>' +
          '<button class="btn" type="button" data-act="preview">' + icon('eye') + 'Preview</button>' +
          '<button class="btn btn-primary" type="button" data-act="share">' + icon('link') + 'Share</button>' +
        '</div>';
    }
    editor.append(bar);

    const body = el('div', { class: 'ed-body' });
    const outline = el('nav', { class: 'ed-outline', 'aria-label': 'Contents' });
    outline.innerHTML = '<div class="ol-head"><span class="t-micro">Contents</span></div>' +
      '<div class="ol-list" id="ol-list">' + outlineHTML() + '</div>' +
      '<div class="ol-foot"><button class="btn btn-sm block" type="button" data-act="add-section" aria-haspopup="menu" aria-expanded="false">' + icon('plus') + 'Add section</button></div>';
    body.append(outline);
    const desk = el('div', { class: 'ed-desk' });
    const sheet = el('article', { class: sheetClass(), id: 'sheet', 'aria-label': 'Page preview' });
    sheet.innerHTML = sheetHTML();
    desk.append(sheet);
    body.append(desk);
    body.append(el('div', { class: 'ed-props-scrim', onclick: () => closeProps(true) }));
    const props = el('aside', { class: 'ed-props', id: 'ed-props', 'aria-label': 'Properties' });
    body.append(props);
    editor.append(body);
    main.append(editor);
    renderProps();
    bindTitleEditing(sheet);

    editor.addEventListener('click', (e) => {
      const dev = e.target.closest('[data-device]');
      if (dev) { E.device = dev.dataset.device; $$('[data-device]', editor).forEach((b) => b.setAttribute('aria-pressed', String(b === dev))); sheet.classList.toggle('phone', E.device === 'phone'); return; }
      const ol = e.target.closest('.ol-item');
      if (ol) { selectSection(ol.dataset.sid, { scroll: true, openProps: false }); return; }
      const t = e.target.closest('[data-act]');
      if (t) {
        switch (t.dataset.act) {
          case 'back': setView('library'); return;
          case 'share': openShare(proposalItem()); return;
          case 'preview': E.preview = true; stopPlayer(); render(); return;
          case 'exit-preview': E.preview = false; render(); return;
          case 'open-props': openProps(); setTimeout(() => { const f = focusables(props)[0]; f && f.focus(); }, 0); return;
          case 'sections': sectionsMenu(t); return;
          case 'add-section': addSectionMenu(t); return;
          case 'toggle-play': togglePlay(t.closest('.player').dataset.player); return;
          case 'doc-download': toast('Downloads are not part of this prototype.', { icon: 'info' }); return;
          case 'cta': e.preventDefault(); toast('The button would open ' + (t.getAttribute('href') || 'the link') + '. Links stay local in this prototype.', { icon: 'external', duration: 6000 }); return;
          default: return;
        }
      }
      if (!E.preview) {
        const sec = e.target.closest('.pv-section');
        if (sec && !e.target.closest('a,button,[contenteditable]')) selectSection(sec.dataset.sid, { openProps: true });
      }
    });
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (editor.classList.contains('props-open')) { closeProps(true); e.preventDefault(); return; }
        if (E.preview) { E.preview = false; render(); e.preventDefault(); }
        return;
      }
      const ol = e.target.closest('.ol-item');
      if (ol && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        const items = $$('.ol-item', editor);
        const i = items.indexOf(ol);
        const n = items[e.key === 'ArrowDown' ? Math.min(i + 1, items.length - 1) : Math.max(i - 1, 0)];
        n.focus();
        selectSection(n.dataset.sid, { scroll: true });
      }
    });
  }

  /* ---------------------------------------------------------------- system */

  const TOKENS_SURFACE = ['paper', 'sheet', 'sunk', 'selected', 'rule', 'rule-strong', 'rule-field', 'overlay'];
  const TOKENS_INK = ['ink', 'ink-2', 'ink-3', 'ink-4', 'accent', 'danger'];
  function hexLum(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return null;
    const c = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a, b) {
    const la = hexLum(a), lb = hexLum(b);
    if (la == null || lb == null) return null;
    const hi = Math.max(la, lb), lo = Math.min(la, lb);
    return ((hi + 0.05) / (lo + 0.05)).toFixed(2);
  }
  function paletteBlock(scheme) {
    const block = el('div', { class: 'palette-block ' + scheme });
    block.append(el('div', { class: 't-micro' }, el('span', { text: scheme + ' tokens' }), el('span', { text: 'computed from the stylesheet' })));
    const grid = el('div', { class: 'swatches' });
    TOKENS_SURFACE.concat(TOKENS_INK).forEach((name) => {
      grid.append(el('div', { class: 'swatch', 'data-token': name }, el('i', { style: 'background: var(--' + name + ')' }), el('div', { class: 'sw-meta' }, el('b', { text: '--' + name }), el('span', { class: 'val' }), el('span', { class: 'ratio' }))));
    });
    block.append(grid);
    requestAnimationFrame(() => {
      const cs = getComputedStyle(block);
      const paper = cs.getPropertyValue('--paper').trim();
      $$('.swatch', block).forEach((sw) => {
        const name = sw.dataset.token;
        const v = cs.getPropertyValue('--' + name).trim();
        $('.val', sw).textContent = v;
        // Overlays are read against their own text, everything else against paper.
        const r = name === 'overlay' ? contrast(cs.getPropertyValue('--on-overlay').trim(), v) : contrast(v, paper);
        const isInk = TOKENS_INK.indexOf(name) >= 0;
        $('.ratio', sw).textContent = r ? (isInk ? r + ':1 on paper' : name === 'overlay' ? r + ':1 text on it' : (name.indexOf('rule') === 0 ? r + ':1 vs paper' : '')) : '';
      });
    });
    return block;
  }
  function spec(label, bodyHTML, kind, note) {
    const tag = kind === 'live' ? '<span class="tag solid">live</span>' : kind === 'sim' ? '<span class="tag">simulated</span>' : '<span class="tag">' + esc(kind) + '</span>';
    return '<div class="spec"><div class="spec-cap"><span>' + esc(label) + '</span>' + tag + '</div><div class="spec-body">' + bodyHTML + '</div>' + (note ? '<div class="spec-note">' + esc(note) + '</div>' : '') + '</div>';
  }
  function buttonRow(cls, label, extraIcon) {
    const ic = extraIcon ? icon(extraIcon) : '';
    const b = (mods, attrs, inner) => '<button class="btn ' + cls + ' ' + (mods || '') + '" type="button" ' + (attrs || '') + '>' + (inner || (ic + label)) + '</button>';
    return spec(label + ' · default', b(), 'live', 'Hover, press and focus this one.') +
      spec(label + ' · hover', b('sim-hover'), 'sim') +
      spec(label + ' · pressed', b('sim-active'), 'sim') +
      spec(label + ' · focus', b('sim-focus'), 'sim') +
      spec(label + ' · disabled', b('', 'disabled'), 'live', 'Real disabled attribute.') +
      spec(label + ' · busy', b('', 'aria-busy="true" disabled', '<span class="spinner" aria-hidden="true"></span>' + (label === 'Record' ? 'Starting' : label === 'Share' ? 'Sharing' : 'Working')), 'sim', 'aria-busy keeps full strength: working is not unavailable.');
  }
  function renderSystem(main) {
    const page = el('div', { class: 'page sys-page' });
    page.append(frag('<div class="page-head"><div><h1 class="page-title">Design system</h1><p class="standfirst">Tokens, type, and every control state in the V4 Editorial direction. Tags say whether a state is live (interact to see it) or simulated (forced with a class).</p></div><div class="btn-group"><button class="btn" type="button" data-sys="theme">' + icon(state.theme === 'dark' ? 'sun' : 'moon') + (state.theme === 'dark' ? 'Light theme' : 'Dark theme') + '</button><button class="btn" type="button" data-sys="toast">' + icon('bell') + 'Show a toast</button></div></div>'));
    const sys = el('div', { class: 'sys' });

    // Colour
    const colour = el('section', { class: 'sys-section', 'aria-labelledby': 'sys-colour' });
    colour.append(frag('<header><h2 class="t-h-s" id="sys-colour">Colour</h2><p>Warm paper, four inks, one accent, and a danger red that never fills a control. Hairlines separate; shadow only on things that float. Overlays (tooltips, toasts) are dark in both schemes. Ratios are computed live from the loaded stylesheet against that scheme’s paper.</p></header>'));
    const pair = el('div', { class: 'sys-grid-2' });
    pair.append(paletteBlock('light'), paletteBlock('dark'));
    colour.append(pair);
    colour.append(frag('<div class="spec-grid wide">' +
      spec('Accent, where it is allowed', '<button class="btn btn-record" type="button">' + icon('record') + 'Record</button><span class="status live"><i class="dot"></i>Recording</span><div class="progress" style="width:120px" role="progressbar" aria-valuenow="62" aria-valuemin="0" aria-valuemax="100" aria-label="Upload progress"><div class="progress-bar" style="width:62%"></div></div>', 'rule', 'Record fill, live status, progress and the focus ring. Nothing else.') +
      spec('Danger, where it is allowed', '<span class="status error"><i class="dot"></i>Upload failed</span><span class="field-error">' + icon('alert') + 'Error text</span><button class="btn btn-sm btn-danger" type="button">' + icon('trash') + 'Delete</button>', 'rule', 'Errors, invalid fields, the failed status word and destructive items. A crimson, not the record light, so the button is never “the problem”.') +
      spec('Status words', '<span class="status"><i class="dot"></i>Shared</span><span class="status quiet"><i class="dot"></i>Not shared</span><span class="status quiet"><i class="dot"></i>Link off</span><span class="status busy"><span class="spinner" style="width:10px;height:10px;border-width:1.5px" aria-hidden="true"></span>Processing</span><span class="status error"><i class="dot"></i>Upload failed</span>', 'rule', 'A dot and a word, in ink. Colour never carries meaning alone.') +
      '</div>'));
    sys.append(colour);

    // Type
    const type = el('section', { class: 'sys-section', 'aria-labelledby': 'sys-type' });
    type.append(frag('<header><h2 class="t-h-s" id="sys-type">Type</h2><p>Geist for the tool at a 13px base, including the names of files, folders and pages wherever the tool lists them. A native serif (Charter, Iowan Old Style, Georgia) only on the page itself: its title, greeting, body and captions.</p></header>' +
      '<div class="type-table">' +
      '<div class="t-micro">micro · 11/16 caps</div><div class="sample t-micro">Column headers, panel groups</div><div class="tspec">Geist 500, +6% tracking</div>' +
      '<div class="t-micro">small · 12/16</div><div class="sample t-small">Metadata, hints, status words</div><div class="tspec">Geist 400</div>' +
      '<div class="t-micro">base · 13/20</div><div class="sample t-base">Controls, menus, panel fields, body in the tool</div><div class="tspec">Geist 400 / 500</div>' +
      '<div class="t-micro">body · 14/20</div><div class="sample t-body">Dialog copy, large buttons</div><div class="tspec">Geist 400</div>' +
      '<div class="t-micro">title · 15/20</div><div class="sample t-title">Northstar launch walkthrough</div><div class="tspec">Geist 500, row titles, folder names, the editor crumb</div>' +
      '<div class="t-micro">heading s · 15/20</div><div class="sample t-h-s">Dialog and panel titles</div><div class="tspec">Geist 600</div>' +
      '<div class="t-micro">heading m · 18/24</div><div class="sample t-h-m">Page titles in the tool</div><div class="tspec">Geist 600</div>' +
      '<div class="t-micro">content compact · 15/20</div><div class="sample content-compact">Prepared for Maya Chen, Okafor Logistics</div><div class="tspec">Serif, greeting and captions on the page</div>' +
      '<div class="t-micro">content prose · 17/27</div><div class="sample content-prose">Okafor runs 140 vehicles across three depots.</div><div class="tspec">Serif, page body</div>' +
      '<div class="t-micro">content heading · 22/28</div><div class="sample content-h">Why Northstar fits your rollout</div><div class="tspec">Serif, section headings on the page</div>' +
      '<div class="t-micro">content title · 34/40</div><div class="sample content-title">Welcome to your proposal</div><div class="tspec">Serif, page title</div>' +
      '</div>'));
    sys.append(type);

    // Space, shape, depth, motion
    const geo = el('section', { class: 'sys-section', 'aria-labelledby': 'sys-geo' });
    geo.append(frag('<header><h2 class="t-h-s" id="sys-geo">Space, shape, depth, motion</h2><p>A 4px grid, four radii, two shadows, two durations.</p></header>' +
      '<div class="sys-grid-2">' +
        '<div><div class="t-micro" style="margin-bottom:8px">Space</div><div class="scale-row">' + [4, 8, 12, 16, 20, 24, 32, 40, 48, 64].map((n) => '<div class="scale-item"><i style="width:' + n + 'px"></i>' + n + '</div>').join('') + '</div></div>' +
        '<div><div class="t-micro" style="margin-bottom:8px">Radius</div><div class="scale-row">' + [[2, 'kbd, tags'], [4, 'buttons, fields'], [6, 'posters, menus'], [10, 'dialogs']].map((r) => '<div class="scale-item radius-item"><i style="border-radius:' + r[0] + 'px"></i>' + r[0] + ' · ' + r[1] + '</div>').join('') + '</div></div>' +
      '</div>' +
      '<div class="elev-row"><div class="elev flat">Flat: hairline only. Rows, panels, the rail.</div><div class="elev">Sheet: hairline on sheet. The page, cards that must sit on paper.</div><div class="elev pop">Pop: menus, toasts, tooltips.</div><div class="elev dialog">Dialog: the one deep shadow.</div></div>' +
      '<div class="motion-row"><span><b>120ms</b> hover, press, menus</span><span><b>200ms</b> panes, dialogs, toasts</span><span><b>one curve</b> cubic-bezier(0.2, 0.7, 0.2, 1)</span><span><b>Reduced motion</b> is ' + (reducedMotion() ? 'on' : 'off') + ' in this browser (live). Durations drop to 0; spinners and progress keep moving because they report state.</span></div>'));
    sys.append(geo);

    // Buttons
    const buttons = el('section', { class: 'sys-section', 'aria-labelledby': 'sys-buttons' });
    buttons.append(frag('<header><h2 class="t-h-s" id="sys-buttons">Buttons</h2><p>Four faces. Ink is the primary, the hairline is the default, quiet is for rows and toolbars, and the accent fills Record alone.</p></header>' +
      '<div class="spec-grid">' + buttonRow('btn-primary', 'Share', 'link') + buttonRow('', 'Upload', 'upload') + buttonRow('btn-quiet', 'Rename', 'textCursor') + buttonRow('btn-record', 'Record', 'record') + '</div>' +
      '<div class="spec-grid">' +
        spec('Icon buttons', '<button class="btn btn-icon" type="button" aria-label="Sort" data-tip="Sort">' + icon('sort') + '</button><button class="btn btn-quiet btn-icon" type="button" aria-label="More" data-tip="More">' + icon('more') + '</button><button class="btn btn-sm btn-quiet btn-icon" type="button" aria-label="Remove">' + icon('x') + '</button>', 'live', 'Every icon button has an aria-label and a tooltip.') +
        spec('Sizes', '<button class="btn btn-sm" type="button">Small 26</button><button class="btn" type="button">Default 30</button><button class="btn btn-lg" type="button">Large 36</button>', 'live', 'Phones and coarse pointers raise these to 36, 40 and 44, and every icon button to 44.') +
        spec('Danger, in a menu', '<div class="menu static" role="menu"><button class="menu-item" role="menuitem" type="button">' + icon('textCursor') + '<span class="grow">Rename</span></button><div class="menu-sep"></div><button class="menu-item danger" role="menuitem" type="button">' + icon('trash') + '<span class="grow">Delete</span></button></div>', 'sim', 'Destructive actions live in menus and footers, never as a filled button.') +
      '</div>'));
    sys.append(buttons);

    // Fields
    const fields = el('section', { class: 'sys-section', 'aria-labelledby': 'sys-fields' });
    fields.append(frag('<header><h2 class="t-h-s" id="sys-fields">Fields</h2><p>Sheet fill, a 3:1 boundary, ink border on focus with the accent ring outside it. Error replaces the border colour and adds a sentence; the colour never stands alone.</p></header>' +
      '<div class="spec-grid wide">' +
        spec('Default', '<div class="field" style="width:100%"><label class="field-label" for="sf1">Reader’s name</label><input class="input" id="sf1" type="text" placeholder="Maya Chen"></div>', 'live') +
        spec('Hover', '<div class="field" style="width:100%"><label class="field-label" for="sf2">Reader’s name</label><input class="input sim-hover" id="sf2" type="text" value="Maya Chen"></div>', 'sim') +
        spec('Focus', '<div class="field" style="width:100%"><label class="field-label" for="sf3">Reader’s name</label><input class="input sim-focus" id="sf3" type="text" value="Maya Chen"></div>', 'sim') +
        spec('Error', '<div class="field" style="width:100%"><label class="field-label" for="sf4">Reply-to</label><input class="input" id="sf4" type="email" value="alex@northstar" aria-invalid="true" aria-describedby="sf4-err"><div class="field-error" id="sf4-err">' + icon('alert') + 'Enter an address like name@company.com</div></div>', 'sim', 'Live validation runs on the Share dialog’s invite field and the editor’s Link and Trim fields.') +
        spec('Disabled', '<div class="field" style="width:100%"><label class="field-label" for="sf5">Workspace</label><input class="input" id="sf5" type="text" value="Northstar Studio" disabled></div>', 'live') +
        spec('Search with shortcut', '<div class="input-wrap" style="width:100%">' + icon('search') + '<input class="input" type="search" placeholder="Search" aria-label="Search"><kbd>/</kbd></div>', 'live', 'The hint hides while typing.') +
        spec('Select', '<div class="field" style="width:100%"><label class="field-label" for="sf6">Theme</label><select class="select" id="sf6"><option>Paper</option><option>Ink</option><option>Brand accent</option></select></div>', 'live') +
        spec('Text area', '<div class="field" style="width:100%"><label class="field-label" for="sf8">Caption</label><textarea class="textarea" id="sf8" rows="2">Four minutes on the rollout plan we sketched on Tuesday.</textarea></div>', 'live', 'Fields are Geist even when they hold page text; the serif appears on the sheet.') +
        spec('Link field', '<div class="linkfield" style="width:100%"><span class="url">clarity.example/p/welcome-to-your-proposal-7f3k</span><button class="btn" type="button" data-sys="copy">' + icon('copy') + 'Copy</button></div>', 'live', 'Copies a sample URL and reports it.') +
      '</div>'));
    sys.append(fields);

    // Toggles and tabs
    const toggles = el('section', { class: 'sys-section', 'aria-labelledby': 'sys-toggles' });
    toggles.append(frag('<header><h2 class="t-h-s" id="sys-toggles">Checkboxes, switches, tabs, segments</h2><p>Ink when on, a 3:1 boundary when off. Tabs are underlined words with counts; segments are for two or three exclusive views.</p></header>' +
      '<div class="spec-grid">' +
        spec('Checkbox', '<label class="check-label"><input class="check" type="checkbox"> Off</label><label class="check-label"><input class="check" type="checkbox" checked> On</label>', 'live') +
        spec('Checkbox · mixed, disabled', '<label class="check-label"><input class="check" type="checkbox" id="sys-mixed"> Mixed</label><label class="check-label"><input class="check" type="checkbox" disabled> Off</label><label class="check-label"><input class="check" type="checkbox" checked disabled> On</label>', 'live', 'Mixed is the real indeterminate property.') +
        spec('Checkbox · focus', '<label class="check-label"><input class="check sim-focus" type="checkbox" checked> Focused</label>', 'sim') +
        spec('Switch', '<input class="switch" type="checkbox" role="switch" aria-label="Captions off"><input class="switch" type="checkbox" role="switch" checked aria-label="Captions on"><input class="switch" type="checkbox" role="switch" disabled aria-label="Disabled switch">', 'live') +
        spec('Switch · hover, focus', '<input class="switch sim-hover" type="checkbox" role="switch" aria-label="Hovered switch"><input class="switch sim-focus" type="checkbox" role="switch" checked aria-label="Focused switch">', 'sim') +
        spec('Segmented', '<div id="sys-seg"></div>', 'live') +
      '</div>' +
      '<div class="spec" id="sys-tabs-spec"><div class="spec-cap"><span>Tabs</span><span class="tag solid">live</span></div></div>' +
      '<div class="spec-grid">' + spec('Tab · hover', '<div class="tabs" style="width:100%"><span class="tab sim-hover">Videos <span class="count">3</span></span><span class="tab" aria-selected="true">Pages <span class="count">2</span></span></div>', 'sim') + spec('Tab · focus', '<div class="tabs" style="width:100%"><span class="tab sim-focus" aria-selected="true">Videos <span class="count">3</span></span><span class="tab">Pages <span class="count">2</span></span></div>', 'sim') + '</div>'));
    sys.append(toggles);

    // Overlays
    const overlays = el('section', { class: 'sys-section', 'aria-labelledby': 'sys-overlays' });
    overlays.append(frag('<header><h2 class="t-h-s" id="sys-overlays">Tooltip, menu, toast, dialog</h2><p>Pop shadow for anything that floats. Menus take arrow keys, Home, End and Escape, and return focus to their trigger.</p></header>' +
      '<div class="spec-grid wide">' +
        spec('Tooltip', '<button class="btn btn-icon" type="button" aria-label="Sort" data-tip="Sort">' + icon('sort') + '</button><button class="btn btn-icon" type="button" aria-label="New folder" data-tip="New folder" data-tip-side="right">' + icon('folderPlus') + '</button>', 'live', 'Hover or focus. Appears instantly, never on touch alone.') +
        spec('Tooltip · open', '<button class="btn btn-icon sim-open" type="button" aria-label="Sort" data-tip="Sort" tabindex="-1">' + icon('sort') + '</button>', 'sim') +
        spec('Menu', '<button class="btn" type="button" data-sys="menu" aria-haspopup="menu" aria-expanded="false">' + icon('more') + 'Open a menu</button>', 'live') +
        spec('Menu · open', '<div class="menu static" role="menu" aria-label="Example"><div class="menu-head t-micro">Sort by</div><button class="menu-item" role="menuitemradio" aria-checked="true" type="button"><span class="grow">Recent</span>' + icon('check', 'tick') + '</button><button class="menu-item sim-hover" role="menuitemradio" aria-checked="false" type="button"><span class="grow">Name</span>' + icon('check', 'tick') + '</button><button class="menu-item" role="menuitemradio" aria-checked="false" type="button" disabled><span class="grow">Most viewed</span>' + icon('check', 'tick') + '</button></div>', 'sim', 'Second item hovered, third disabled.') +
        spec('Toast', '<div class="toast" style="box-shadow:none">' + icon('check') + '<span class="msg">Sample link copied</span><button class="toast-x" type="button" aria-label="Dismiss" tabindex="-1">' + icon('x', 'sm') + '</button></div>', 'sim') +
        spec('Toast · with action', '<div class="toast" style="box-shadow:none">' + icon('trash') + '<span class="msg">Deleted “Project brief.pdf”</span><button class="toast-action" type="button" tabindex="-1">Undo</button><button class="toast-x" type="button" aria-label="Dismiss" tabindex="-1">' + icon('x', 'sm') + '</button></div>', 'sim') +
        spec('Toast · busy, error', '<div class="toast" style="box-shadow:none"><span class="spinner" aria-hidden="true"></span><span class="msg">Uploading (demo)</span></div><div class="toast error" style="box-shadow:none">' + icon('alert') + '<span class="msg">The browser blocked the clipboard</span></div>', 'sim') +
        spec('Dialog', '<button class="btn" type="button" data-sys="dialog">' + icon('link') + 'Open the share dialog</button>', 'live', 'Escape closes, the app behind is inert, and focus returns to the button.') +
      '</div>'));
    sys.append(overlays);

    // Rows and states
    const rows = el('section', { class: 'sys-section', 'aria-labelledby': 'sys-rows' });
    const failed = { id: 'failed-demo', kind: 'video', title: 'Pricing call recording.mov', hoursAgo: 0, duration: '—', views: 0, status: 'failed', folder: null, variant: 'still' };
    const longItem = itemById('okafor') || ITEMS[0] || failed; // the System-screen stress page; its Share and menu are live
    const sampleRow = itemById('northstar') || ITEMS[0] || failed;
    rows.append(frag('<header><h2 class="t-h-s" id="sys-rows">Rows, loading, empty, error</h2><p>The library row at browse scale: poster, title, metadata line, status, actions. Folders are a 40px row with a glyph. Loading is a skeleton of the same row. Empty states are a sentence and one action.</p></header>' +
      '<div class="table" style="width:100%">' +
        '<div class="thead" role="presentation"><div></div><div></div><div class="t-micro">Name</div><div class="t-micro col-status">Status</div><div class="t-micro col-modified">Modified</div><div class="visually-hidden">Actions</div></div>' +
        '<ul class="rows folder-rows" aria-label="Folder example">' + (FOLDERS[0] ? folderRowHTML(FOLDERS[0]) : '') + '</ul>' +
        '<ul class="rows" aria-label="Row examples">' +
          rowHTML(sampleRow) +
          rowHTML(Object.assign({}, sampleRow, { id: 'selected-demo' }), { className: 'is-selected' }).replace('class="check"', 'class="check" checked') +
          rowHTML(longItem) +
          rowHTML(failed, { actionsHTML: '<button class="btn btn-sm" type="button" data-act="retry-upload">' + icon('refresh') + '<span class="btn-label">Retry</span></button><button class="btn btn-sm btn-quiet btn-icon" type="button" data-act="remove-failed" aria-label="Remove failed upload">' + icon('x') + '</button>' }) +
          '<li class="row" aria-busy="true" aria-label="Loading"><div class="col-check"></div><div class="col-poster"><div class="skel skel-poster"></div></div><div class="col-name"><div class="skel skel-line" style="width:60%;height:14px"></div><div class="skel skel-line" style="width:35%;margin-top:6px"></div></div><div class="col-status"><div class="skel skel-line" style="width:70%"></div></div><div class="col-modified"><div class="skel skel-line" style="width:60%"></div></div><div class="col-actions"></div></li>' +
          '<li class="row" aria-busy="true" aria-label="Loading"><div class="col-check"></div><div class="col-poster"><div class="skel skel-poster"></div></div><div class="col-name"><div class="skel skel-line" style="width:45%;height:14px"></div><div class="skel skel-line" style="width:30%;margin-top:6px"></div></div><div class="col-status"><div class="skel skel-line" style="width:50%"></div></div><div class="col-modified"><div class="skel skel-line" style="width:55%"></div></div><div class="col-actions"></div></li>' +
        '</ul>' +
      '</div>' +
      '<div class="spec-note">The folder row opens the real folder. First file row is live: hover for the checkbox, open its menu, rename it. Second is the same row selected (simulated): the selected fill, metadata stepped up to ink-2 to keep 4.5:1. Third carries a 140-character title truncated to one line with the full title on hover. Fourth is a simulated failed upload with a live Retry that fails again on purpose. Skeleton rows pulse unless reduced motion is on.</div>' +
      '<div class="dossier-head"><div style="min-width:0"><div class="t-micro" style="margin-bottom:4px">Long title at page-head scale</div><h3 class="t-h-m">' + esc(longItem.title) + '</h3><p class="t-small muted" style="margin-top:4px">Two lines, then clipped. The row above shows the same title at one line.</p></div><button class="btn" type="button" data-act="share" data-id="' + esc(longItem.id) + '">' + icon('link') + 'Share</button></div>' +
      '<div class="sys-grid-2">' +
        '<div class="empty" role="status"><div class="t-h-s">No results for “quarterly”</div><div>Try a shorter word, or clear the search to see everything.</div><div class="btn-group"><button class="btn" type="button" data-sys="noop">Clear search</button></div></div>' +
        '<div style="display:flex;flex-direction:column;gap:12px">' +
          '<div class="notice error" role="alert">' + icon('alert') + '<div class="grow"><div class="notice-title">Could not load engagement data</div><div class="t-small muted">The analytics service did not answer. Your page is still live.</div></div><button class="btn btn-sm" type="button" data-sys="retry">' + icon('refresh') + 'Retry</button></div>' +
          '<div class="notice">' + icon('info') + '<div class="grow"><div class="notice-title">Processing “Follow-up for Maya”</div><div class="t-small muted">Captions and thumbnails arrive in about a minute.</div><div class="progress indeterminate" style="margin-top:8px" role="progressbar" aria-label="Processing"><div class="progress-bar"></div></div></div></div>' +
          '<div class="notice"><span class="spinner" aria-hidden="true" style="margin-top:3px"></span><div class="grow"><div class="notice-title">Updating access</div><div class="t-small muted">Busy state inside a notice. In the Share dialog this is live for 600ms.</div></div></div>' +
        '</div>' +
      '</div>'));
    sys.append(rows);

    // Mapping
    const map = el('section', { class: 'sys-section', 'aria-labelledby': 'sys-map' });
    map.append(frag('<header><h2 class="t-h-s" id="sys-map">Mapping to Clarity primitives</h2><p>The names follow the shadcn vocabulary already in editor/src/index.css so the real app can adopt the tokens without renaming components. Details and the rollout plan are in DESIGN.md.</p></header>' +
      '<div class="map-table">' +
        '<div><code>--paper</code></div><div><code>--background</code>, <code>--sidebar</code></div>' +
        '<div><code>--sheet</code></div><div><code>--card</code>, <code>--popover</code>, dialog background</div>' +
        '<div><code>--sunk</code></div><div><code>--muted</code>, <code>--accent</code> (the hover fill)</div>' +
        '<div><code>--selected</code></div><div>new: selected rows and current nav item</div>' +
        '<div><code>--rule</code> / <code>--rule-field</code></div><div><code>--border</code> / <code>--input</code></div>' +
        '<div><code>--ink</code>, <code>--ink-3</code></div><div><code>--foreground</code>, <code>--muted-foreground</code>; <code>--primary</code> becomes ink</div>' +
        '<div><code>--accent</code></div><div>the <code>[data-record-action]</code> fill and <code>--ring</code></div>' +
        '<div><code>--danger</code></div><div><code>--destructive</code></div>' +
        '<div><code>--overlay</code></div><div>new: tooltip and toast surface, dark in both schemes</div>' +
        '<div>Button faces</div><div><code>default</code> = ink primary, <code>outline</code> = hairline, <code>ghost</code> = quiet, record = accent. Surface altitudes collapse to one face; glass and halos are removed.</div>' +
        '<div>Input variants</div><div><code>default</code> and <code>panel</code> merge into one sheet-filled field; <code>inline</code> becomes <code>.editable</code></div>' +
      '</div>'));
    sys.append(map);

    page.append(sys);
    main.append(page);

    // live bindings
    bindLibraryActions(page);
    const mixed = $('#sys-mixed', page); if (mixed) mixed.indeterminate = true;
    $('#sys-seg', page).replaceWith(segmented([{ id: 'desktop', icon: 'monitor', title: 'Desktop' }, { id: 'phone', icon: 'phone', title: 'Phone' }], 'desktop', () => {}, 'Preview width'));
    const tabsSpec = $('#sys-tabs-spec', page);
    let tabCur = 'all';
    const mountTabs = () => {
      const old = $('.tabs', tabsSpec); old && old.remove();
      tabsSpec.append(tablist([{ id: 'all', label: 'All', count: 6 }, { id: 'video', label: 'Videos', count: 3 }, { id: 'page', label: 'Pages', count: 2 }, { id: 'document', label: 'Documents', count: 1 }], tabCur, (id) => { tabCur = id; mountTabs(); const b = $('[data-tab="' + id + '"]', tabsSpec); b && b.focus({ preventScroll: true }); }, 'Example filter'));
    };
    mountTabs();
    page.addEventListener('click', (e) => {
      const t = e.target.closest('[data-sys]');
      if (!t) return;
      switch (t.dataset.sys) {
        case 'theme': setTheme(state.theme === 'dark' ? 'light' : 'dark'); break;
        case 'toast': toast('A toast with an action. It leaves after five seconds.', { icon: 'bell', duration: 5000, action: { label: 'Undo', onClick: () => toast('Nothing to undo. This was a demo.', { icon: 'info' }) } }); break;
        case 'copy': copyText('https://clarity.example/p/welcome-to-your-proposal-7f3k').then((ok) => { const label = t; label.innerHTML = icon('check') + 'Copied'; setTimeout(() => { label.innerHTML = icon('copy') + 'Copy'; }, 1600); toast(ok ? 'Sample link copied. It points nowhere.' : 'The browser blocked the clipboard.', ok ? { icon: 'copy' } : { variant: 'error' }); }); break;
        case 'menu': openMenu(t, [{ label: 'Open', icon: 'external' }, { label: 'Share', icon: 'link' }, { label: 'Copy link', icon: 'copy', kbd: MOD + 'C' }, { sep: true }, { label: 'Rename', icon: 'textCursor' }, { label: 'Download', icon: 'download', disabled: true }, { sep: true }, { label: 'Delete', icon: 'trash', danger: true, onSelect: () => toast('Nothing was deleted. This menu is a demo.', { icon: 'info' }) }]); break;
        case 'dialog': openShare(proposalItem()); break;
        case 'retry': demoRetry(t); break;
        case 'noop': toast('Decorative in this view. The real one is on the Library screen.', { icon: 'info' }); break;
        default: break;
      }
    });
  }
  function demoRetry(btn) {
    const label = btn.innerHTML;
    btn.setAttribute('aria-busy', 'true');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Retrying';
    setTimeout(() => {
      btn.removeAttribute('aria-busy');
      btn.disabled = false;
      btn.innerHTML = label;
      toast('Still failing. This error is a demo and never resolves.', { variant: 'error', duration: 6000 });
    }, 1200);
  }

  /* ---------------------------------------------------------- share dialog */

  function openShare(target) {
    const many = Array.isArray(target);
    const items = many ? target : [target];
    if (!items.length) return;
    const item = items[0];
    const S = { access: item.access || (item.status === 'off' ? 'off' : item.status === 'private' || item.status === 'new' ? 'invite' : 'link'), people: [], busy: false };
    if (item.id === 'proposal') S.people.push({ name: 'Maya Chen', email: 'maya.chen@okafor.example', opened: 'Opened yesterday' });
    const url = linkFor(item);
    const body = el('div');
    const subtitle = many ? plural(items.length, 'item') + ' selected' : '<b>' + esc(item.title) + '</b>';

    // Link section
    const linkSec = el('div', { class: 'share-section' });
    // No status line here: the checked option under "Who can view" already says who can open the link.
    linkSec.append(el('div', { class: 'share-row' }, el('span', { class: 't-h-s', text: many ? 'Links' : 'Public link' })));
    const linkField = el('div', { class: 'linkfield' });
    const urlSpan = el('span', { class: 'url num', text: many ? plural(items.length, 'link') + ' will be copied, one per line' : url.replace('https://', '') });
    const copyBtn = el('button', { class: 'btn', type: 'button', html: icon('copy') + 'Copy', 'aria-label': 'Copy sample link' });
    copyBtn.addEventListener('click', () => {
      const text = many ? items.map(linkFor).join('\n') : url;
      copyText(text).then((ok) => {
        if (ok) {
          copyBtn.innerHTML = icon('check') + 'Copied';
          copyBtn.setAttribute('aria-label', 'Copied');
          setTimeout(() => { copyBtn.innerHTML = icon('copy') + 'Copy'; copyBtn.setAttribute('aria-label', 'Copy sample link'); }, 1600);
          // The footer line already says the data is sample; the toast only confirms the action.
          toast(many ? 'Copied ' + plural(items.length, 'link') : 'Copied', { icon: 'copy' });
        } else {
          toast('The browser blocked the clipboard. Select the link text to copy it.', { variant: 'error', duration: 7000 });
        }
      });
    });
    linkField.append(urlSpan, copyBtn);
    linkSec.append(linkField);
    body.append(linkSec);

    // Access section. The 600ms update shows as a spinner and word in this header; the options dim meanwhile.
    const accessSec = el('div', { class: 'share-section' });
    const accessBusy = el('span', { class: 'status busy', 'aria-live': 'polite' });
    accessSec.append(el('div', { class: 'share-row' }, el('span', { class: 't-h-s', text: 'Who can view' }), accessBusy));
    const accessList = el('div', { class: 'access-list', role: 'radiogroup', 'aria-label': 'Who can view' });
    const OPTS = [
      { id: 'link', name: 'Anyone with the link', desc: 'No sign-in. Views are counted without names.' },
      { id: 'invite', name: 'Only people you invite', desc: 'Each person gets a personal link and you see who opened it.' },
      { id: 'off', name: 'Link off', desc: 'Nobody can open it. Existing links stop working.' },
    ];
    const grp = uid('acc');
    OPTS.forEach((o) => {
      const id = uid('opt');
      const lab = el('label', { class: 'access-opt', for: id });
      const radio = el('input', { type: 'radio', name: grp, id: id, value: o.id });
      radio.checked = S.access === o.id;
      radio.addEventListener('change', () => setAccess(o.id));
      lab.append(radio, el('span', { class: 'who' }, el('span', { class: 'name', text: o.name }), el('span', { class: 'desc', text: o.desc })));
      accessList.append(lab);
    });
    accessSec.append(accessList);
    body.append(accessSec);

    // People section
    const peopleSec = el('div', { class: 'share-section' });
    peopleSec.append(el('div', { class: 'share-row' }, el('span', { class: 't-h-s', text: 'People' }), el('span', { class: 't-small muted', text: 'Personal links, one per person' })));
    const inviteRow = el('div', { class: 'invite-row' });
    const emailInput = textInput('', () => { inviteField.setError(''); }, { type: 'email', placeholder: 'name@company.com' });
    const inviteField = field('Invite by email', emailInput, { id: uid('inv') });
    const addBtn = el('button', { class: 'btn', type: 'button', html: icon('plus') + 'Add', style: 'margin-top:22px' });
    const addPerson = () => {
      const v = emailInput.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { inviteField.setError('Enter an address like name@company.com'); emailInput.focus(); return; }
      if (S.people.some((p) => p.email.toLowerCase() === v.toLowerCase())) { inviteField.setError('Already invited'); emailInput.focus(); return; }
      const name = v.split('@')[0].split(/[._-]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      S.people.push({ name, email: v, opened: 'Not sent · demo', pending: true });
      emailInput.value = '';
      inviteField.setError('');
      renderPeople();
      toast('Added ' + v + '. Nothing is sent from this prototype.', { icon: 'mail' });
    };
    addBtn.addEventListener('click', addPerson);
    emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addPerson(); } });
    inviteRow.append(inviteField, addBtn);
    peopleSec.append(inviteRow);
    const people = el('div', { class: 'people' });
    peopleSec.append(people);
    body.append(peopleSec);

    // Engagement facts: only the two the item really carries. No invented aggregates.
    if (!many && (item.views || item.kind === 'page')) {
      const statsSec = el('div', { class: 'share-section' });
      statsSec.append(el('div', { class: 'share-row' }, el('span', { class: 't-h-s', text: 'Engagement' }), el('span', { class: 't-small muted', text: 'Sample numbers' })));
      statsSec.append(frag('<div class="share-stats"><dl class="facts"><dt>Views</dt><dd>' + esc(plural(item.views || 0, 'view')) + '</dd><dt>Last opened</dt><dd>' + (item.views ? 'Yesterday, 16:42' : '—') + '</dd></dl></div>'));
      body.append(statsSec);
    }

    function renderPeople() {
      people.innerHTML = '';
      if (!S.people.length) { people.append(el('div', { class: 'people-empty', text: 'No one invited yet. Add an email to create a personal link.' })); return; }
      S.people.forEach((p, i) => {
        const row = el('div', { class: 'person' });
        row.append(el('span', { class: 'avatar', 'aria-hidden': 'true', text: initials(p.name) }));
        row.append(el('div', { class: 'who' }, el('div', { class: 'name', text: p.name }), el('div', { class: 'email', text: p.email + ' · ' + p.opened })));
        row.append(el('button', { class: 'btn btn-sm btn-quiet btn-icon', type: 'button', 'aria-label': 'Remove ' + p.name, html: icon('x'), onclick: () => { S.people.splice(i, 1); renderPeople(); toast('Removed ' + p.email, { action: { label: 'Undo', onClick: () => { S.people.splice(i, 0, p); renderPeople(); } } }); } }));
        people.append(row);
      });
    }
    function setAccess(v) {
      S.busy = true;
      refresh();
      $$('.access-opt', accessList).forEach((o) => o.classList.add('is-busy'));
      setTimeout(() => {
        S.busy = false;
        S.access = v;
        $$('.access-opt', accessList).forEach((o) => o.classList.remove('is-busy'));
        // Both open settings mean the item is shared (by link, or with the people invited); only "Link off" is not.
        items.forEach((it) => { it.access = v; it.status = v === 'off' ? 'off' : 'shared'; });
        refresh();
        if (state.view !== 'editor') rerender();
        else updateEdStatus();
      }, 600);
    }
    function refresh() {
      accessBusy.innerHTML = S.busy ? '<span class="spinner" style="width:10px;height:10px;border-width:1.5px" aria-hidden="true"></span>Updating' : '';
      urlSpan.classList.toggle('off', S.access === 'off');
      copyBtn.disabled = S.access === 'off' || S.busy;
    }
    renderPeople();
    refresh();

    const foot = el('div', { style: 'display:contents' });
    foot.append(el('span', { class: 'left', html: icon('info') + '<span>Sample data. Nothing is sent or saved.</span>' }));
    const done = el('button', { class: 'btn btn-primary', type: 'button', text: 'Done' });
    foot.append(done);
    // With the link off, Copy is disabled, so focus starts on the chosen access option instead.
    const dlg = openDialog({ title: many ? 'Share ' + plural(items.length, 'item') : 'Share', subtitle: subtitle, body, footer: foot, wide: true, initialFocus: S.access === 'off' ? $('input:checked', accessList) : copyBtn });
    done.addEventListener('click', () => dlg.close());
  }

  /* ------------------------------------------------------- upload and record */

  function openUpload() {
    const body = el('div');
    const zone = el('div', { class: 'dropzone', role: 'group', 'aria-label': 'Upload' });
    zone.innerHTML = icon('upload', 'lg') + '<div><b>Drop a video, image or PDF here</b></div><div class="t-small">Nothing leaves this browser. The file name is read; the file itself is not.</div>';
    const fileInput = el('input', { type: 'file', class: 'visually-hidden', id: uid('file'), 'aria-label': 'Choose a file' });
    const choose = el('button', { class: 'btn', type: 'button', html: icon('folder') + 'Choose a file', onclick: () => fileInput.click() });
    const sample = el('button', { class: 'btn btn-quiet', type: 'button', text: 'Use a sample file', onclick: () => simulate('Pricing walkthrough.mp4', 'video') });
    zone.append(el('div', { class: 'btn-group', style: 'margin-top:6px' }, choose, sample), fileInput);
    body.append(zone);
    const list = el('div', { class: 'upload-list', style: 'margin-top:12px' });
    body.append(list);
    fileInput.addEventListener('change', () => { const f = fileInput.files && fileInput.files[0]; if (f) simulate(f.name, kindFromName(f.name)); fileInput.value = ''; });
    ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('is-over'); }));
    zone.addEventListener('drop', (e) => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; simulate(f ? f.name : 'Dropped file.mp4', f ? kindFromName(f.name) : 'video'); });

    function kindFromName(name) {
      const ext = (name.split('.').pop() || '').toLowerCase();
      if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].indexOf(ext) >= 0) return 'image';
      if (['pdf', 'doc', 'docx', 'key', 'ppt', 'pptx'].indexOf(ext) >= 0) return 'document';
      return 'video';
    }
    function simulate(name, kind) {
      const row = el('div', { class: 'upload-item' });
      row.innerHTML = icon(KIND_ICON[kind]) + '<div class="who"><b>' + esc(name) + '</b><span class="t-small muted status-text">Uploading · demo</span><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Upload progress"><div class="progress-bar" style="width:0%"></div></div></div>';
      list.prepend(row);
      let pct = 0;
      const bar = $('.progress-bar', row), prog = $('.progress', row), txt = $('.status-text', row);
      const timer = setInterval(() => {
        pct = Math.min(100, pct + 6 + Math.random() * 10);
        bar.style.width = pct + '%';
        prog.setAttribute('aria-valuenow', String(Math.round(pct)));
        if (pct >= 100) {
          clearInterval(timer);
          txt.textContent = 'Added to the Library · processing (demo)';
          const item = { id: uid('up'), kind, title: name, hoursAgo: 0, views: 0, status: 'processing', folder: state.lib.folder, variant: kind === 'video' ? 'still' : kind === 'image' ? 'photo' : undefined, duration: kind === 'video' ? '0:00' : undefined, seconds: 0, size: kind === 'video' ? undefined : '1.0 MB', pages: kind === 'document' ? 1 : undefined };
          ITEMS.unshift(item);
          if (state.view === 'library') rerender();
          setTimeout(() => {
            item.status = kind === 'video' ? 'new' : 'private';
            if (kind === 'video') { item.duration = '0:42'; item.seconds = 42; }
            if (state.view === 'library') rerender();
            txt.textContent = 'Ready · demo item in the Library';
          }, 2500);
          toast('“' + name + '” added to the Library as a demo item.', { icon: 'upload', duration: 7000, action: { label: 'Undo', onClick: () => { const k = ITEMS.indexOf(item); if (k >= 0) ITEMS.splice(k, 1); row.remove(); if (state.view === 'library') rerender(); } } });
        }
      }, 160);
    }
    const foot = el('div', { style: 'display:contents' });
    foot.append(el('span', { class: 'left', html: icon('info') + '<span>Demo upload. No bytes are sent.</span>' }));
    const done = el('button', { class: 'btn btn-primary', type: 'button', text: 'Done' });
    foot.append(done);
    const dlg = openDialog({ title: 'Upload', subtitle: 'Add a file to ' + (state.lib.folder ? folderById(state.lib.folder).name : 'the Library'), body, footer: foot, initialFocus: choose });
    done.addEventListener('click', () => dlg.close());
  }

  function openRecord() {
    const body = el('div');
    const cam = el('div', { class: 'camera', 'aria-label': 'Camera preview (sample frame)' });
    cam.innerHTML = posterSVG('talk-2') + '<span class="rec" aria-live="polite"><span class="dot" aria-hidden="true"></span><span class="rec-time">0:00</span></span><span class="tag demo">Demo · no camera is used</span>';
    body.append(cam);
    const row = el('div', { class: 'field-pair', style: 'margin-top:12px' });
    row.append(field('Camera', selectInput([{ id: 'a', label: 'Built-in camera (sample)' }, { id: 'b', label: 'External camera (sample)' }], 'a', () => {})));
    row.append(field('Microphone', selectInput([{ id: 'a', label: 'Built-in microphone (sample)' }, { id: 'b', label: 'Headset (sample)' }], 'a', () => {})));
    body.append(row);
    body.append(frag('<div class="field-hint" style="margin-top:10px">Start runs a timer and adds a demo clip to the Library when you stop. Recording itself is not part of this prototype.</div>'));
    let secs = 0, timer = null;
    const foot = el('div', { style: 'display:contents' });
    const cancel = el('button', { class: 'btn', type: 'button', text: 'Cancel' });
    const start = el('button', { class: 'btn btn-record', type: 'button', html: icon('record') + 'Start recording' });
    foot.append(cancel, start);
    const dlg = openDialog({ title: 'Record', subtitle: 'A new video for the Library', body, footer: foot, wide: true, initialFocus: start, onClose: () => { if (timer) clearInterval(timer); } });
    cancel.addEventListener('click', () => dlg.close());
    start.addEventListener('click', () => {
      if (!timer) {
        timer = setInterval(() => { secs += 1; $('.rec-time', cam).textContent = fmtTime(secs); }, 1000);
        cam.classList.add('is-recording');
        start.innerHTML = icon('stop') + 'Stop';
        start.classList.remove('btn-record');
        start.classList.add('btn-primary');
        cancel.disabled = true;
      } else {
        clearInterval(timer); timer = null;
        const item = { id: uid('rec'), kind: 'video', title: 'Untitled recording', hoursAgo: 0, duration: fmtTime(Math.max(1, secs)), seconds: Math.max(1, secs), views: 0, status: 'processing', folder: state.lib.folder, variant: 'talk-2' };
        ITEMS.unshift(item);
        if (state.view === 'library') rerender();
        dlg.close();
        setTimeout(() => { item.status = 'new'; if (state.view === 'library') rerender(); }, 2500);
        toast('Demo clip added to the Library (' + item.duration + ').', { icon: 'video', duration: 8000, action: { label: 'Undo', onClick: () => { const k = ITEMS.indexOf(item); if (k >= 0) ITEMS.splice(k, 1); if (state.view === 'library') rerender(); } } });
      }
    });
  }

  /* ----------------------------------------------------------------- shell */

  const app = $('#app');
  const railEl = $('#rail');
  const topbar = $('#topbar');
  const mainEl = $('#main');
  const mqTablet = matchMedia('(max-width: 1279px)');
  const mqPhone = matchMedia('(max-width: 767px)');

  // Folders live in the Library table only; the rail is sections, not a second tree.
  function renderRail() {
    const v = state.view;
    const cur = (name) => (v === name ? 'aria-current="page"' : '');
    railEl.innerHTML =
      '<div class="rail-head"><span class="monogram" aria-hidden="true">N</span><span class="ws-name">Northstar Studio</span><button class="btn btn-quiet btn-icon rail-close" type="button" aria-label="Close menu" data-act="close-rail">' + icon('x') + '</button></div>' +
      '<div class="rail-section">' +
        '<button class="rail-item" type="button" data-nav="library" ' + cur('library') + ' data-tip="Library" data-tip-side="right">' + icon('home') + '<span class="label">Library</span></button>' +
        '<button class="rail-item" type="button" data-nav="contacts" data-tip="Contacts" data-tip-side="right">' + icon('users') + '<span class="label">Contacts</span></button>' +
        '<button class="rail-item" type="button" data-nav="analytics" data-tip="Analytics" data-tip-side="right">' + icon('chart') + '<span class="label">Analytics</span></button>' +
      '</div>' +
      '<div class="rail-section"><div class="rail-label"><span class="t-micro">Prototype</span></div>' +
        '<button class="rail-item" type="button" data-nav="system" ' + cur('system') + ' data-tip="Design system" data-tip-side="right">' + icon('layout') + '<span class="label">Design system</span></button>' +
        '<button class="rail-item" type="button" data-act="theme" aria-pressed="' + (state.theme === 'dark') + '" data-tip="' + (state.theme === 'dark' ? 'Light theme' : 'Dark theme') + '" data-tip-side="right">' + icon(state.theme === 'dark' ? 'sun' : 'moon') + '<span class="label">' + (state.theme === 'dark' ? 'Light theme' : 'Dark theme') + '</span></button>' +
      '</div>' +
      '<div class="rail-foot">' +
        '<button class="rail-item" type="button" data-nav="settings" data-tip="Settings" data-tip-side="right">' + icon('settings') + '<span class="label">Settings</span></button>' +
        '<button class="rail-user" type="button" data-act="account" data-tip="Alex Morgan" data-tip-side="right" aria-label="Account: Alex Morgan"><span class="avatar" aria-hidden="true">AM</span><span class="who"><span>Alex Morgan</span><span class="t-small muted">alex@northstar.example</span></span></button>' +
      '</div>';
  }
  // Phone top bar: the menu (or, inside a folder, the way back) and the screen name. The editor has
  // its own bar and no rail, so it draws no top bar at all.
  function renderTopbar() {
    const v = state.view;
    if (v === 'editor') { topbar.innerHTML = ''; return; }
    const curFolder = v === 'library' && state.lib.folder ? folderById(state.lib.folder) : null;
    const title = v === 'library' ? (curFolder ? curFolder.name : 'Library') : 'Design system';
    topbar.innerHTML =
      (curFolder ? '<button class="btn btn-quiet btn-icon" type="button" data-act="up" aria-label="Back to Library">' + icon('arrowLeft') + '</button>'
                 : '<button class="btn btn-quiet btn-icon" type="button" data-act="open-rail" aria-label="Open menu" aria-expanded="false">' + icon('menu') + '</button>') +
      '<span class="title">' + esc(title) + '</span>';
  }
  function openRail() {
    app.classList.add('rail-open');
    $$('[data-act="open-rail"]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
    const f = $('.rail-item', railEl); f && f.focus();
  }
  function closeRail(refocus) {
    if (!app.classList.contains('rail-open')) return;
    app.classList.remove('rail-open');
    $$('[data-act="open-rail"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (refocus) { const b = $('[data-act="open-rail"]'); b && b.focus(); }
  }
  // The editor hides the rail: its bar carries the way back, and nothing in the rail acts on a page.
  // Tablets keep the rail at icon width on the other screens.
  function updateRailMode() {
    const editing = state.view === 'editor';
    app.classList.toggle('no-rail', editing);
    app.classList.toggle('rail-compact', !editing && mqTablet.matches);
  }

  railEl.addEventListener('click', (e) => {
    const t = e.target.closest('[data-nav],[data-act]');
    if (!t) return;
    if (t.dataset.nav) {
      const n = t.dataset.nav;
      closeRail();
      if (n === 'library') { state.lib.folder = null; state.lib.selected.clear(); setView('library'); }
      else if (n === 'system') setView('system');
      else toast(n.charAt(0).toUpperCase() + n.slice(1) + ' is not part of this prototype.', { icon: 'info' });
      return;
    }
    switch (t.dataset.act) {
      case 'theme': setTheme(state.theme === 'dark' ? 'light' : 'dark', { keepFocus: true }); { const b = $('[data-act="theme"]', railEl); b && b.focus(); } break;
      case 'close-rail': closeRail(true); break;
      case 'account': toast('Account settings are not part of this prototype.', { icon: 'user' }); break;
      default: break;
    }
  });
  $('#rail-scrim').addEventListener('click', () => closeRail(true));
  railEl.addEventListener('keydown', (e) => { if (e.key === 'Escape' && app.classList.contains('rail-open')) { e.preventDefault(); closeRail(true); } });
  topbar.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    if (t.dataset.act === 'open-rail') openRail();
    else if (t.dataset.act === 'up') { state.lib.folder = null; state.lib.selected.clear(); setView('library'); }
  });

  function render() {
    closeMenu();
    updateRailMode();
    renderRail();
    renderTopbar();
    mainEl.innerHTML = '';
    if (state.view === 'editor') renderEditor(mainEl);
    else if (state.view === 'system') renderSystem(mainEl);
    else renderLibrary(mainEl);
    document.title = 'Clarity · ' + ({ library: state.lib.folder ? (folderById(state.lib.folder) || { name: 'Library' }).name : 'Library', editor: PAGE.title || 'Untitled page', system: 'Design system' })[state.view] + ' · V4';
  }
  function rerender(focusSel) {
    const active = document.activeElement;
    const sel = focusSel || (active && active.id ? '#' + active.id : null);
    const caret = active && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;
    const scrollY = window.scrollY;
    render();
    window.scrollTo(0, scrollY);
    if (sel) {
      const n = $(sel);
      if (n) { n.focus({ preventScroll: true }); if (caret && typeof n.setSelectionRange === 'function') { try { n.setSelectionRange(caret[0], caret[1]); } catch (e) { /* type=search ok, others may refuse */ } } }
    }
  }

  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    if (typing) return;
    if ($('.scrim', layer) || menuState) return;
    if (e.key === '/' && state.view === 'library') { const s = $('#lib-search'); if (s) { e.preventDefault(); s.focus(); s.select(); } }
    else if (e.key === 'Escape' && state.view === 'library' && state.lib.selected.size) { state.lib.selected.clear(); rerender(); }
  });
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.type !== 'clarity-preview') return;
    let changed = false;
    if (VIEWS.indexOf(d.view) >= 0 && d.view !== state.view) {
      // A host view change dismisses whatever floats over the old screen, without returning focus into it.
      closeMenu(); closeDialogs({ restoreFocus: false }); closeRail();
      state.view = d.view;
      if (d.view !== 'editor') { stopPlayer(); state.ed.preview = false; }
      changed = true;
    }
    if ((d.theme === 'light' || d.theme === 'dark') && d.theme !== state.theme) { state.theme = d.theme; applyTheme(); changed = true; }
    writeURL(true);
    if (changed) render();
  });
  window.addEventListener('popstate', () => { closeMenu(); closeDialogs({ restoreFocus: false }); closeRail(); readURL(); applyTheme(); render(); });
  mqTablet.addEventListener('change', () => { updateRailMode(); closeProps(false); });
  mqPhone.addEventListener('change', () => { closeRail(); });

  readURL();
  initTheme();
  writeURL(true);
  render();
})();
