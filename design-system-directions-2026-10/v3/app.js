/* Clarity design direction V3: flat minimal. Prototype behaviour.
   Everything is local to this tab: no network, no storage except the theme
   for this session. All names, numbers and links are fictional samples. */
(() => {
  'use strict';

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name, cls = '') => `<svg class="icon${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  let seq = 0;
  const uid = (p = 'n') => `${p}${(++seq).toString(36)}${Date.now().toString(36).slice(-3)}`;
  const NOW = Date.now();
  const MIN = 60e3;
  const HOUR = 3600e3;
  const DAY = 86400e3;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  function ago(ts) {
    const d = Date.now() - ts;
    if (d < MIN) return 'just now';
    if (d < HOUR) return `${Math.round(d / MIN)} min ago`;
    if (d < DAY) return `${Math.round(d / HOUR)} h ago`;
    if (d < 7 * DAY) return `${Math.round(d / DAY)} d ago`;
    if (d < 28 * DAY) return `${Math.round(d / (7 * DAY))} wk ago`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  function fmtDuration(s) {
    s = Math.max(0, Math.round(s));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + ':' + String(sec).padStart(2, '0');
  }
  function fmtSize(b) {
    if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
    if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
    if (b >= 1e3) return `${Math.round(b / 1e3)} KB`;
    return `${b} B`;
  }
  const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');
  const KIND_LABEL = { video: 'Video', page: 'Journey Page', document: 'Document', image: 'Image', folder: 'Folder' };
  const KIND_ICON = { video: 'video', page: 'page', document: 'file-text', image: 'image', folder: 'folder' };

  // ---------- Sample data ----------
  const ME = { name: 'Alex Morgan', initials: 'AM', email: 'alex@clarity-sample.example' };
  const PEOPLE = [
    { name: 'Maya Chen', company: 'Harbor Logistics', initials: 'MC' },
    { name: 'Dev Patel', company: 'Harbor Logistics', initials: 'DP' },
    { name: 'Sam Okafor', company: 'Northwind Freight', initials: 'SO' },
    { name: 'Priya Raman', company: 'Lumen Retail', initials: 'PR' },
    { name: 'Jonas Weber', company: 'Harbor Logistics', initials: 'JW' },
  ];
  const trend = (seed, peak) => Array.from({ length: 14 }, (_, i) => Math.round(peak * (0.5 + 0.5 * Math.sin((i + seed) * 0.9)) * (i % 3 === seed % 3 ? 0.6 : 1)));

  let items = [
    { id: 'v1', kind: 'video', title: 'Northstar launch walkthrough', duration: 252, views: 128, viewers: 41, updated: NOW - 2 * DAY, created: NOW - 9 * DAY, size: 184e6, orientation: 'landscape', folder: null, seed: 1, status: 'ready', link: { on: true, slug: 'northstar-walkthrough-4k2m', access: 'anyone', expiry: 'never', notify: true }, watched: [{ who: 0, pct: 100, when: NOW - 3 * HOUR }, { who: 1, pct: 62, when: NOW - DAY }, { who: 2, pct: 35, when: NOW - 2 * DAY }], trend: trend(1, 14) },
    { id: 'p1', kind: 'page', title: 'Welcome to your proposal', views: 46, viewers: 5, updated: NOW - 3 * HOUR, created: NOW - 4 * DAY, folder: null, status: 'ready', published: true, link: { on: true, slug: 'welcome-proposal-7f3k', access: 'email', expiry: '30d', notify: true }, watched: [{ who: 0, pct: 100, when: NOW - 3 * HOUR }, { who: 1, pct: 80, when: NOW - DAY }, { who: 4, pct: 40, when: NOW - 2 * DAY }], trend: trend(2, 9) },
    { id: 'v2', kind: 'video', title: 'Product overview', duration: 158, views: 312, viewers: 97, updated: NOW - 7 * DAY, created: NOW - 30 * DAY, size: 121e6, orientation: 'landscape', folder: null, seed: 2, status: 'ready', link: { on: true, slug: 'product-overview-b81q', access: 'anyone', expiry: 'never', notify: false }, watched: [{ who: 3, pct: 90, when: NOW - 5 * HOUR }, { who: 2, pct: 71, when: NOW - 2 * DAY }, { who: 1, pct: 20, when: NOW - 6 * DAY }], trend: trend(3, 30) },
    { id: 'd1', kind: 'document', title: 'Project brief.pdf', pages: 12, size: 1.4e6, views: 18, viewers: 6, updated: NOW - 5 * DAY, created: NOW - 5 * DAY, folder: null, seed: 1, status: 'ready', link: { on: false, slug: '', access: 'anyone', expiry: 'never', notify: false }, watched: [{ who: 0, pct: 100, when: NOW - 4 * DAY }, { who: 1, pct: 50, when: NOW - 4 * DAY }], trend: trend(4, 5) },
    { id: 'f1', kind: 'folder', title: 'Brand assets', updated: NOW - DAY, created: NOW - 60 * DAY, folder: null },
    { id: 'v3', kind: 'video', title: 'Follow-up for Maya', duration: 65, views: 3, viewers: 1, updated: NOW - 25 * MIN, created: NOW - 25 * MIN, size: 38e6, orientation: 'portrait', folder: null, seed: 3, status: 'ready', link: { on: true, slug: 'follow-up-maya-x2p9', access: 'anyone', expiry: '7d', notify: true }, watched: [{ who: 0, pct: 100, when: NOW - 12 * MIN }], trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3] },
    { id: 'i1', kind: 'image', title: 'Logo mark.png', size: 84e3, w: 1200, h: 1200, views: 0, viewers: 0, updated: NOW - DAY, created: NOW - DAY, folder: 'f1', seed: 1, variant: 'logo', status: 'ready', link: { on: false, slug: '', access: 'anyone', expiry: 'never', notify: false }, watched: [], trend: trend(6, 0) },
    { id: 'i2', kind: 'image', title: 'Office tour still.png', size: 2.1e6, w: 3200, h: 1800, views: 0, viewers: 0, updated: NOW - DAY, created: NOW - DAY, folder: 'f1', seed: 2, status: 'ready', link: { on: false, slug: '', access: 'anyone', expiry: 'never', notify: false }, watched: [], trend: trend(7, 0) },
    { id: 'd2', kind: 'document', title: 'Brand guide.pdf', pages: 28, size: 6.2e6, views: 4, viewers: 2, updated: NOW - 8 * DAY, created: NOW - 20 * DAY, folder: 'f1', seed: 2, status: 'ready', link: { on: false, slug: '', access: 'anyone', expiry: 'never', notify: false }, watched: [{ who: 3, pct: 30, when: NOW - 8 * DAY }], trend: trend(8, 2) },
  ];
  // Long-title stress case. It lives on the system page only, so the library lists the same six items as the other directions.
  const STRESS_ITEM = { id: 'v4', kind: 'video', title: 'Enterprise security and compliance deep dive for the Harbor Logistics procurement team (final cut, v3)', duration: 1507, views: 9, viewers: 4, updated: NOW - 12 * DAY, created: NOW - 14 * DAY, size: 910e6, orientation: 'landscape', folder: null, seed: 4, status: 'ready', link: { on: true, slug: 'security-deep-dive-m7c1', access: 'email', expiry: 'never', notify: false }, watched: [], trend: trend(5, 3) };

  const pages = {
    p1: {
      id: 'p1',
      recipient: 'Maya Chen',
      company: 'Harbor Logistics',
      theme: { accent: '#2453e3', font: 'sans', radius: 'md', dark: false, logo: 'Clarity sample' },
      sections: [
        { id: 's1', type: 'video', name: 'Intro video', heading: 'Welcome to your proposal', intro: 'Hi Maya, here is a short walkthrough of the proposal we discussed on Tuesday. It covers scope, timeline and the first ninety days.', videoId: 'v1', caption: 'Recorded for Harbor Logistics', autoplay: false, controls: true, layout: 'full', visible: true },
        { id: 's2', type: 'text', name: 'Value', heading: 'What Harbor Logistics gets', body: 'Three outcomes we committed to on the call.', columns: 3, icons: true, visible: true, items: [{ t: 'Live in two weeks', d: 'Your team is onboarded in the first sprint, not the first quarter.' }, { t: 'One source of truth', d: 'Shipments, documents and approvals in a single view.' }, { t: 'Fewer manual steps', d: 'Approvals and hand-offs move to one queue per lane.' }] },
        { id: 's3', type: 'cta', name: 'Call to action', heading: 'Ready to move forward?', text: 'Pick a 30 minute slot and we will walk through the contract together.', label: 'Book a call', action: 'call', url: 'https://cal.example/alex/30min', style: 'primary', note: 'Or reply to this page and I will follow up within a day.', visible: true },
      ],
    },
  };

  function defaultPage(id) {
    return {
      id,
      recipient: '',
      company: '',
      theme: { accent: '#2453e3', font: 'sans', radius: 'md', dark: false, logo: 'Clarity sample' },
      sections: [
        { id: uid('s'), type: 'video', name: 'Intro video', heading: 'Untitled page', intro: 'A short note for the recipient.', videoId: null, caption: '', autoplay: false, controls: true, layout: 'full', visible: true },
        { id: uid('s'), type: 'cta', name: 'Call to action', heading: 'Next step', text: '', label: 'Book a call', action: 'call', url: '', style: 'primary', note: '', visible: true },
      ],
    };
  }
  const getItem = (id) => items.find((i) => i.id === id);
  const childrenOf = (folderId) => items.filter((i) => i.folder === folderId);
  const folders = () => items.filter((i) => i.kind === 'folder');
  const linkUrl = (item) => `https://clarity.example/p/${item.link && item.link.slug ? item.link.slug : ''}`;
  const slugify = (s) => `${s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'item'}-${Math.random().toString(36).slice(2, 6)}`;

  // ---------- Mock media ----------
  function videoSvg(seed, portrait) {
    const s = seed % 5;
    const bg = ['#2a2a30', '#26262c', '#2d2d33', '#232328', '#2b2b31'][s];
    const wall = ['#3a3a42', '#34343d', '#3e3e47', '#32323a', '#3c3c44'][s];
    const skin = '#6b6b75';
    const shirt = ['#4b4b55', '#45454f', '#50505a', '#43434d', '#4d4d57'][s];
    if (portrait) {
      return `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="160" height="90" fill="#141417"/><svg x="54.7" y="0" width="50.6" height="90" viewBox="0 0 90 160" preserveAspectRatio="xMidYMid slice"><rect width="90" height="160" fill="${bg}"/><rect x="8" y="24" width="40" height="30" rx="2" fill="${wall}"/><circle cx="45" cy="72" r="16" fill="${skin}"/><path d="M10 160 C 10 112, 80 112, 80 160 Z" fill="${shirt}"/></svg></svg>`;
    }
    const cx = [52, 100, 72, 108, 60][s];
    const win = cx < 80 ? cx + 34 : cx - 80;
    return `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="160" height="90" fill="${bg}"/><rect x="${win}" y="12" width="46" height="34" rx="2" fill="${wall}"/><rect x="0" y="68" width="160" height="22" fill="${wall}" opacity="0.5"/><circle cx="${cx}" cy="38" r="12" fill="${skin}"/><path d="M${cx - 27} 90 C ${cx - 27} 62, ${cx + 27} 62, ${cx + 27} 90 Z" fill="${shirt}"/></svg>`;
  }
  function pageSvg(accent = '#2453e3') {
    return `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="160" height="90" fill="#e4e4e7"/><rect x="22" y="8" width="116" height="100" rx="3" fill="#ffffff"/><rect x="30" y="16" width="8" height="8" rx="2" fill="${accent}"/><rect x="42" y="18" width="30" height="4" rx="1" fill="#d4d4d9"/><rect x="30" y="32" width="100" height="40" rx="2" fill="#26262c"/><circle cx="80" cy="52" r="7" fill="${accent}"/><rect x="30" y="78" width="60" height="4" rx="1" fill="#a1a1aa"/><rect x="30" y="86" width="90" height="3" rx="1" fill="#d4d4d9"/></svg>`;
  }
  function pdfSvg(seed) {
    const lines = [27, 33, 39, 45].map((y, i) => `<rect x="56" y="${y}" width="${[48, 44, 48, 30][(i + seed) % 4]}" height="2.5" rx="1" fill="#c4c4cb"/>`).join('');
    return `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="160" height="90" fill="#e4e4e7"/><rect x="48" y="6" width="64" height="100" rx="2" fill="#ffffff"/><rect x="56" y="14" width="30" height="5" rx="1" fill="#52525b"/>${lines}<rect x="56" y="54" width="48" height="20" rx="1" fill="#eeeef1"/><rect x="56" y="80" width="40" height="2.5" rx="1" fill="#c4c4cb"/></svg>`;
  }
  function imageSvg(seed, variant) {
    if (variant === 'logo') {
      return `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="160" height="90" fill="#f4f4f5"/><rect x="56" y="21" width="48" height="48" rx="12" fill="#18181b"/><circle cx="80" cy="45" r="12" fill="#f4f4f5"/><circle cx="80" cy="45" r="5" fill="#18181b"/></svg>`;
    }
    const s = seed % 3;
    const sky = ['#cfd3da', '#d9d9de', '#c9ccd3'][s];
    return `<svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="160" height="90" fill="${sky}"/><circle cx="${[118, 40, 80][s]}" cy="26" r="10" fill="#f4f4f5"/><path d="M0 70 L40 38 L70 62 L100 30 L160 72 L160 90 L0 90 Z" fill="#8e8e97"/><path d="M0 90 L0 76 L50 56 L90 78 L160 60 L160 90 Z" fill="#5f5f66"/></svg>`;
  }
  function thumbSvg(item) {
    if (!item) return '';
    if (item.status === 'processing') return `<span class="pending"><span class="spinner"></span></span>`;
    switch (item.kind) {
      case 'video': return videoSvg(item.seed || 1, item.orientation === 'portrait');
      case 'page': return pageSvg(pages[item.id] ? pages[item.id].theme.accent : '#2453e3');
      case 'document': return pdfSvg(item.seed || 1);
      case 'image': return imageSvg(item.seed || 1, item.variant);
      case 'folder': {
        const kids = childrenOf(item.id).slice(0, 4);
        if (!kids.length) return `<span class="folder-glyph">${icon('folder')}</span>`;
        const cells = kids.map((k) => `<div>${thumbSvg(k)}</div>`);
        while (cells.length < 4) cells.push('<div></div>');
        return `<div class="folder-mosaic">${cells.join('')}</div>`;
      }
      default: return '';
    }
  }
  const thumb = (item, cls = '') => `<span class="thumb${cls ? ' ' + cls : ''}" aria-hidden="true">${thumbSvg(item)}</span>`;

  // ---------- Overlay primitives: menu, popover, tooltip, dialog, toast ----------
  const layer = $('#layer');
  const dialog = $('#dialog');
  let overlay = null;

  function overlayHost() {
    return dialog.open ? dialog : layer;
  }
  function closeOverlay(restore = true) {
    if (!overlay) return;
    const o = overlay;
    overlay = null;
    o.el.remove();
    if (o.anchor && o.anchor.isConnected) {
      o.anchor.setAttribute('aria-expanded', 'false');
      if (restore) o.anchor.focus({ preventScroll: true });
    }
    if (o.onClose) o.onClose();
  }
  function place(el, anchor, { align = 'start', side = 'bottom', offset = 4 } = {}) {
    const r = anchor.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = align === 'end' ? r.right - w : r.left;
    let top = side === 'top' ? r.top - h - offset : r.bottom + offset;
    if (top + h > vh - 8) top = Math.max(8, r.top - h - offset);
    if (top < 8) top = 8;
    left = clamp(left, 8, Math.max(8, vw - w - 8));
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
  }
  function menuHtml(entries) {
    return entries.map((it, i) => {
      if (it.sep) return '<div class="menu-sep" role="separator"></div>';
      if (it.heading) return `<div class="menu-label">${esc(it.heading)}</div>`;
      const radio = it.checked !== undefined;
      const check = radio ? `<span class="check-slot">${it.checked ? icon('check') : ''}</span>` : '';
      const attrs = [`role="${radio ? 'menuitemradio' : 'menuitem'}"`, `data-i="${i}"`, radio ? `aria-checked="${!!it.checked}"` : '', it.disabled ? 'aria-disabled="true" tabindex="-1"' : 'tabindex="-1"'].join(' ');
      return `<button type="button" class="menu-item${it.danger ? ' danger' : ''}${it.sim ? ' ' + it.sim : ''}" ${attrs}>${check}${it.icon ? icon(it.icon) : ''}<span>${esc(it.label)}</span>${it.kbd ? `<span class="kbd">${esc(it.kbd)}</span>` : ''}${it.right ? `<span class="right">${esc(it.right)}</span>` : ''}</button>`;
    }).join('');
  }
  function openMenu(anchor, entries, opts = {}) {
    if (overlay && overlay.anchor === anchor) { closeOverlay(); return; }
    closeOverlay(false);
    const el = document.createElement('div');
    el.className = 'menu';
    el.setAttribute('role', 'menu');
    el.setAttribute('aria-label', opts.label || 'Menu');
    el.innerHTML = menuHtml(entries);
    overlayHost().appendChild(el);
    place(el, anchor, opts);
    anchor.setAttribute('aria-expanded', 'true');
    overlay = { el, anchor, onClose: opts.onClose };
    const buttons = $$('.menu-item:not([aria-disabled="true"])', el);
    const focusAt = (i) => { if (buttons.length) buttons[(i + buttons.length) % buttons.length].focus(); };
    focusAt(0);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('.menu-item');
      if (!b || b.getAttribute('aria-disabled') === 'true') return;
      const it = entries[+b.dataset.i];
      closeOverlay();
      if (it.onSelect) it.onSelect();
    });
    el.addEventListener('keydown', (e) => {
      const idx = buttons.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(idx + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); focusAt(idx - 1); }
      else if (e.key === 'Home') { e.preventDefault(); focusAt(0); }
      else if (e.key === 'End') { e.preventDefault(); focusAt(buttons.length - 1); }
      else if (e.key === 'Tab') { e.preventDefault(); closeOverlay(); }
    });
    el.addEventListener('mousemove', (e) => {
      const b = e.target.closest('.menu-item');
      if (b && document.activeElement !== b && b.getAttribute('aria-disabled') !== 'true') b.focus();
    });
  }
  function openPopover(anchor, html, opts = {}) {
    if (overlay && overlay.anchor === anchor) { closeOverlay(); return null; }
    closeOverlay(false);
    const el = document.createElement('div');
    el.className = 'popover';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', opts.label || 'Options');
    el.innerHTML = html;
    overlayHost().appendChild(el);
    place(el, anchor, opts);
    anchor.setAttribute('aria-expanded', 'true');
    overlay = { el, anchor, onClose: opts.onClose };
    const first = el.querySelector('button:not([disabled]), input:not([disabled])');
    if (first) first.focus();
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const fs = $$('button:not([disabled]), input:not([disabled])', el);
      if (!fs.length) return;
      const firstEl = fs[0];
      const lastEl = fs[fs.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    });
    return el;
  }
  document.addEventListener('pointerdown', (e) => {
    if (overlay && !overlay.el.contains(e.target) && !overlay.anchor.contains(e.target)) closeOverlay(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay) { e.preventDefault(); e.stopPropagation(); closeOverlay(); }
  }, true);
  window.addEventListener('resize', () => closeOverlay(false));

  // Tooltip: 350ms after hover, at once on keyboard focus, never on touch.
  let tipEl = null;
  let tipTimer = null;
  let tipTarget = null;
  let tipPending = null;
  function showTip(target) {
    hideTip();
    const text = target.dataset.tip;
    if (!text) return;
    tipEl = document.createElement('div');
    tipEl.className = 'tooltip';
    tipEl.setAttribute('role', 'tooltip');
    tipEl.innerHTML = `${esc(text)}${target.dataset.tipKbd ? `<span class="kbd">${esc(target.dataset.tipKbd)}</span>` : ''}`;
    overlayHost().appendChild(tipEl);
    const r = target.getBoundingClientRect();
    const w = tipEl.offsetWidth;
    const h = tipEl.offsetHeight;
    const left = clamp(r.left + r.width / 2 - w / 2, 8, Math.max(8, window.innerWidth - w - 8));
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = r.top - h - 6;
    tipEl.style.left = `${Math.round(left)}px`;
    tipEl.style.top = `${Math.round(top)}px`;
    tipTarget = target;
  }
  function hideTip() {
    clearTimeout(tipTimer);
    tipTimer = null;
    tipPending = null;
    if (tipEl) { tipEl.remove(); tipEl = null; }
    tipTarget = null;
  }
  document.addEventListener('mouseover', (e) => {
    if (coarse) return;
    const t = e.target.closest('[data-tip]');
    if (!t) return;
    if (t === tipTarget || t === tipPending) return;
    hideTip();
    tipPending = t;
    tipTimer = setTimeout(() => showTip(t), 350);
  });
  document.addEventListener('mouseout', (e) => {
    const t = e.target.closest('[data-tip]');
    if (!t) return;
    if (e.relatedTarget && t.contains(e.relatedTarget)) return;
    hideTip();
  });
  document.addEventListener('focusin', (e) => {
    const t = e.target.closest('[data-tip]');
    if (t && t.matches(':focus-visible')) showTip(t);
  });
  document.addEventListener('focusout', hideTip);
  document.addEventListener('pointerdown', hideTip);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTip(); });

  // Dialog: one <dialog>, focus moves in on open and back to the opener on close.
  let dialogState = null;
  function firstOf(root, selectors) {
    if (!selectors) return null;
    for (const sel of [].concat(selectors)) {
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
  function openDialog(cfg) {
    const opener = document.activeElement;
    closeOverlay(false);
    hideTip();
    if (dialog.open) {
      const prev = dialogState;
      dialogState = null;
      dialog.close('replace');
      if (prev) { prev.ac.abort(); if (prev.onClose) prev.onClose('replace'); }
    }
    dialog.className = `dialog${cfg.wide ? ' dlg-wide' : ''}${cfg.cls ? ' ' + cfg.cls : ''}`;
    dialog.innerHTML = `<div class="dlg-head"><h2 id="dlg-title">${cfg.title}</h2>${cfg.headExtra || ''}<button type="button" class="iconbtn iconbtn-md" data-close aria-label="Close">${icon('x')}</button></div><div class="dlg-body">${cfg.body}</div>${cfg.foot ? `<div class="dlg-foot">${cfg.foot}</div>` : ''}<div class="toasts" role="status" aria-live="polite" data-dialog-toasts></div>`;
    // One AbortController per open. Listeners that onOpen attaches to the shared <dialog>
    // pass its signal, so closing removes them instead of stacking a copy per open.
    dialogState = { opener: cfg.opener || opener, onClose: cfg.onClose, ac: new AbortController() };
    dialog.showModal();
    const first = firstOf(dialog, cfg.initialFocus) || dialog.querySelector('.dlg-body button:not([disabled]):not([aria-disabled="true"]), .dlg-body input:not([disabled]):not([readonly]), .dlg-body textarea') || dialog.querySelector('.dlg-foot .btn-primary') || dialog.querySelector('[data-close]');
    if (first) first.focus();
    if (cfg.onOpen) cfg.onOpen(dialog, dialogState.ac.signal);
    return dialog;
  }
  function closeDialog(result = 'close') {
    if (dialog.open) dialog.close(result);
  }
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    const st = dialogState;
    dialogState = null;
    const result = dialog.returnValue;
    dialog.returnValue = '';
    dialog.innerHTML = '';
    if (overlay) closeOverlay(false);
    if (!st) return;
    st.ac.abort();
    if (st.opener && st.opener.isConnected && typeof st.opener.focus === 'function') st.opener.focus({ preventScroll: true });
    if (st.onClose) st.onClose(result);
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) { closeDialog('backdrop'); return; }
    if (e.target.closest('[data-close]')) closeDialog('close');
  });

  const toastHost = $('#toasts');
  function toast(msg, opts = {}) {
    const host = dialog.open ? dialog.querySelector('[data-dialog-toasts]') || toastHost : toastHost;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${icon(opts.icon || 'check')}<span>${esc(msg)}</span>${opts.action ? `<button type="button" class="toast-action">${esc(opts.action.label)}</button>` : ''}`;
    host.appendChild(el);
    while (host.children.length > 3) host.firstChild.remove();
    let done = false;
    const dismiss = () => {
      if (done) return;
      done = true;
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 170);
    };
    const timer = setTimeout(dismiss, opts.duration || (opts.action ? 6000 : 3200));
    if (opts.action) {
      el.querySelector('.toast-action').addEventListener('click', () => {
        clearTimeout(timer);
        dismiss();
        opts.action.fn();
      });
    }
    return dismiss;
  }

  dialog.addEventListener('cancel', (e) => {
    if (overlay) { e.preventDefault(); closeOverlay(); }
  });

  // ---------- State ----------
  const app = $('#app');
  const VIEWS = ['library', 'editor', 'system'];
  const state = {
    view: 'library',
    theme: 'light',
    // The inspector starts closed. A selection shows the toolbar column; Details or ] opens the panel, and the choice holds for the session.
    lib: { filter: 'all', query: '', view: 'list', density: 'default', sort: 'updated', foldersFirst: true, folder: null, selected: [], anchor: null, inspector: false, searchOpen: false },
    ed: { pageId: 'p1', selected: 's1', tab: 'section', device: 'desktop', history: [], future: [], saveTimer: null, saveState: 'saved' },
    sidebarCollapsed: false,
    drawer: false,
    props: false,
    treeOpen: {},
    rec: null,
  };

  function applyTheme(theme, persist = true) {
    theme = theme === 'dark' ? 'dark' : 'light';
    state.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    if (persist) { try { sessionStorage.setItem('clarity-v3-theme', theme); } catch (e) { /* storage blocked: the theme lives in the URL instead */ } }
    $$('[data-action="theme"]').forEach((b) => {
      const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
      b.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon');
      b.dataset.tip = label;
      b.setAttribute('aria-label', label);
    });
  }
  function syncUrl() {
    const u = new URL(location.href);
    u.searchParams.set('view', state.view);
    u.searchParams.set('theme', state.theme);
    history.replaceState(null, '', u);
    document.title = `Clarity V3: ${state.view === 'editor' ? pageTitle() : state.view === 'system' ? 'Design system' : 'Library'}`;
  }
  function setView(view) {
    if (!VIEWS.includes(view)) return;
    // A view change from the host, the URL or the app dismisses whatever floats above the
    // old screen. The opener is dropped so focus does not return into a view that is gone.
    if (dialog.open) { if (dialogState) dialogState.opener = null; closeDialog('view'); }
    closeOverlay(false);
    hideTip();
    state.view = view;
    app.dataset.view = view;
    setDrawer(false);
    setProps(false);
    syncUrl();
    render();
  }
  function setDrawer(open) {
    state.drawer = open;
    app.dataset.drawer = open ? 'open' : 'closed';
    $$('[data-action="drawer"]').forEach((b) => b.setAttribute('aria-expanded', String(open)));
  }
  function setProps(open) {
    state.props = open;
    app.dataset.props = open ? 'open' : 'closed';
  }
  function keepFocus(fn) {
    const active = document.activeElement;
    const key = active && active.dataset ? active.dataset.fk : null;
    fn();
    if (key) {
      const el = $(`[data-fk="${key}"]`);
      if (el) el.focus({ preventScroll: true });
    }
  }

  // ---------- Shell ----------
  function render() {
    renderSidebar();
    renderHeader();
    renderToolbar();
    renderBody();
    renderRail();
    renderSelbar();
    applyTheme(state.theme, false);
  }

  function renderSidebar() {
    const side = $('#sidebar');
    const inLib = state.view === 'library';
    const tree = folders().map((f) => {
      const kids = childrenOf(f.id);
      const open = !!state.treeOpen[f.id];
      const current = inLib && state.lib.folder === f.id;
      const rows = open ? kids.map((k) => `<button type="button" class="tree-item" role="treeitem" style="--depth:1" data-action="tree-item" data-id="${k.id}" aria-level="2">${icon(KIND_ICON[k.kind])}<span class="tree-name">${esc(k.title)}</span></button>`).join('') : '';
      return `<div role="none"><button type="button" class="tree-item" role="treeitem" data-action="tree-folder" data-id="${f.id}" aria-expanded="${open}" aria-level="1" ${current ? 'aria-current="page"' : ''}><span class="disclosure" data-action="tree-toggle" data-id="${f.id}">${icon('chevron-right')}</span>${icon('folder')}<span class="tree-name">${esc(f.title)}</span><span class="tree-count num">${kids.length}</span></button>${rows ? `<div role="group">${rows}</div>` : ''}</div>`;
    }).join('');
    side.innerHTML = `
      <button type="button" class="workspace" data-menu="workspace" aria-haspopup="menu" aria-expanded="false"><span class="ws-mark" aria-hidden="true">C</span><span class="truncate">Clarity sample</span>${icon('chevrons-up-down')}</button>
      <div class="sidebar-scroll">
        <nav class="nav" aria-label="Main">
          <button type="button" class="nav-item" data-action="nav-library" ${inLib ? 'aria-current="page"' : ''}>${icon('library')}Library<span class="nav-count num">${childrenOf(null).length}</span></button>
          <button type="button" class="nav-item" data-action="nav-stub" data-name="Contacts">${icon('users')}Contacts<span class="nav-count num">24</span></button>
          <button type="button" class="nav-item" data-action="nav-stub" data-name="Analytics">${icon('chart')}Analytics</button>
          <button type="button" class="nav-item" data-action="nav-stub" data-name="Settings">${icon('settings')}Settings</button>
        </nav>
        <div class="side-section">Folders</div>
        <div class="tree" role="tree" aria-label="Folders">${tree}</div>
        <div class="side-section">Prototype</div>
        <nav class="nav" aria-label="Prototype views">
          <button type="button" class="nav-item" data-action="nav-editor" ${state.view === 'editor' ? 'aria-current="page"' : ''}>${icon('pencil')}Editor sample</button>
          <button type="button" class="nav-item" data-action="nav-system" ${state.view === 'system' ? 'aria-current="page"' : ''}>${icon('palette')}Design system</button>
        </nav>
      </div>
      <div class="sidebar-footer">
        <div class="side-tools">
          <button type="button" class="iconbtn" data-action="theme" aria-label="${state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}" data-tip="${state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}">${icon(state.theme === 'dark' ? 'sun' : 'moon')}</button>
          <button type="button" class="iconbtn" data-action="help" aria-label="Help" data-tip="Help">${icon('help')}</button>
          <span class="spacer"></span>
          <button type="button" class="iconbtn" data-action="collapse-sidebar" aria-label="Hide sidebar" data-tip="Hide sidebar" data-tip-kbd="[">${icon('panel-left')}</button>
        </div>
        <button type="button" class="user-row" data-menu="user" aria-haspopup="menu" aria-expanded="false"><span class="avatar" aria-hidden="true">${ME.initials}</span><span class="user-text"><span class="user-name">${ME.name}</span><small>${ME.email}</small></span>${icon('chevrons-up-down')}</button>
      </div>`;
  }

  function renderHeader() {
    const header = $('#header');
    const sideToggle = state.sidebarCollapsed && state.view !== 'editor' ? `<button type="button" class="iconbtn iconbtn-md" data-action="collapse-sidebar" aria-label="Show sidebar" data-tip="Show sidebar" data-tip-kbd="[">${icon('panel-left')}</button>` : '';
    const drawerBtn = `<button type="button" class="iconbtn iconbtn-md only-mobile" data-action="drawer" aria-expanded="${state.drawer}" aria-label="Open navigation">${icon('menu')}</button>`;
    if (state.view === 'library') {
      const folder = state.lib.folder ? getItem(state.lib.folder) : null;
      const q = state.lib.query;
      header.innerHTML = `${drawerBtn}${sideToggle}
        <nav class="crumbs" aria-label="Breadcrumb">${folder ? `<button type="button" class="crumb" data-action="go-root">Library</button><span class="crumb-sep" aria-hidden="true">/</span><span class="crumb current" aria-current="page">${esc(folder.title)}</span>` : '<span class="crumb current" aria-current="page">Library</span>'}</nav>
        <div class="header-actions">
          <div class="search" role="search">${icon('search')}<input type="search" id="lib-search" data-fk="search" placeholder="Search library" aria-label="Search library" value="${esc(q)}" autocomplete="off"><span class="kbd${q ? ' hidden' : ''}" aria-hidden="true">/</span><button type="button" class="iconbtn${q ? '' : ' hidden'}" data-action="clear-search" aria-label="Clear search">${icon('x')}</button></div>
          <button type="button" class="iconbtn iconbtn-md only-mobile" data-action="search-toggle" aria-label="Search" aria-pressed="${state.lib.searchOpen}">${icon('search')}</button>
          <button type="button" class="btn btn-secondary btn-new" data-menu="new" aria-haspopup="menu" aria-expanded="false" aria-label="New" data-tip="New">${icon('plus')}<span>New</span>${icon('chevron-down', 'caret')}</button>
          <button type="button" class="btn btn-secondary btn-upload" data-action="upload" aria-label="Upload" data-tip="Upload">${icon('upload')}<span>Upload</span></button>
          <button type="button" class="btn btn-primary btn-record" data-action="record"><span class="rec-dot" aria-hidden="true"></span><span>Record</span></button>
          <button type="button" class="iconbtn iconbtn-md iconbtn-primary only-mobile" data-menu="create" aria-haspopup="menu" aria-expanded="false" aria-label="Create">${icon('plus')}</button>
        </div>`;
    } else if (state.view === 'editor') {
      const item = getItem(state.ed.pageId);
      // No hamburger and no page menu here. The toolbar's Sections button opens the rail on
      // small screens, and rename, settings and delete live in the Page tab.
      header.innerHTML = `
        <nav class="crumbs" aria-label="Breadcrumb"><button type="button" class="crumb crumb-back" data-action="nav-library" aria-label="Back to Library">${icon('arrow-left')}<span>Library</span></button><span class="crumb-sep" aria-hidden="true">/</span><span class="crumb current" aria-current="page">${esc(item ? item.title : 'Page')}</span></nav>
        <span class="save-state" data-save-state aria-live="polite">${saveStateHtml()}</span>
        <div class="header-actions">
          <button type="button" class="btn btn-secondary btn-preview" data-action="preview" aria-label="Preview" data-tip="Preview">${icon('eye')}<span>Preview</span></button>
          <button type="button" class="btn btn-primary" data-action="share-page">${icon('share')}<span>Share</span></button>
        </div>`;
    } else {
      header.innerHTML = `${drawerBtn}${sideToggle}
        <nav class="crumbs" aria-label="Breadcrumb"><span class="crumb current" aria-current="page">Design system</span></nav>`;
    }
  }

  function renderToolbar() {
    const tb = $('#toolbar');
    if (state.view === 'library') {
      const scope = libraryScope();
      const counts = { all: scope.length, video: scope.filter((i) => i.kind === 'video').length, page: scope.filter((i) => i.kind === 'page').length, document: scope.filter((i) => i.kind === 'document' || i.kind === 'image').length };
      const tab = (key, label) => `<button type="button" class="tab" role="tab" aria-selected="${state.lib.filter === key}" tabindex="${state.lib.filter === key ? 0 : -1}" data-filter="${key}" data-fk="tab-${key}">${label} <span class="count">${counts[key]}</span></button>`;
      const sel = state.lib.selected;
      const one = sel.length === 1 ? getItem(sel[0]) : null;
      const canShare = !!one && one.kind !== 'folder';
      const left = state.lib.searchOpen
        ? `<div class="search" role="search" style="width:100%">${icon('search')}<input type="search" id="lib-search-m" data-fk="search-m" placeholder="Search library" aria-label="Search library" value="${esc(state.lib.query)}" autocomplete="off"><button type="button" class="iconbtn" data-action="search-close" aria-label="Close search">${icon('x')}</button></div>`
        : `<div class="tabs" role="tablist" aria-label="Filter by type">${tab('all', 'All')}${tab('video', 'Videos')}${tab('page', 'Pages')}${tab('document', 'Documents')}</div>
          <div class="toolbar-view">
            <div class="seg" role="group" aria-label="Layout"><button type="button" data-layout="list" data-fk="layout-list" aria-pressed="${state.lib.view === 'list'}" aria-label="List" data-tip="List">${icon('list')}</button><button type="button" data-layout="grid" data-fk="layout-grid" aria-pressed="${state.lib.view === 'grid'}" aria-label="Grid" data-tip="Grid">${icon('grid')}</button></div>
            <button type="button" class="iconbtn" data-popover="display" data-fk="display" aria-haspopup="dialog" aria-expanded="false" aria-label="Display options" data-tip="Display">${icon('sliders')}</button>
          </div>`;
      // The selection column exists only while something is selected. It shares the
      // inspector's width so Share and Open sit directly above the panel they describe.
      const actions = sel.length
        ? `<div class="toolbar-actions" role="toolbar" aria-label="Selection">
          <span class="sel-count label num">${sel.length} selected</span>
          <button type="button" class="btn btn-sm btn-secondary" data-action="share-selected" data-fk="share-selected" ${canShare ? '' : 'disabled'} aria-label="Share" data-tip="Share" data-tip-kbd="S">${icon('share')}<span>Share</span></button>
          <button type="button" class="btn btn-sm btn-secondary" data-action="open-selected" data-fk="open-selected" ${one ? '' : 'disabled'} aria-label="Open" data-tip="Open" data-tip-kbd="Enter"><span>Open</span></button>
          <button type="button" class="iconbtn" data-menu="selection" data-fk="selection-menu" aria-haspopup="menu" aria-expanded="false" aria-label="More actions">${icon('more')}</button>
          <button type="button" class="iconbtn iconbtn-inspector" data-action="toggle-inspector" data-fk="inspector" aria-pressed="${state.lib.inspector}" aria-label="Details panel" data-tip="Details" data-tip-kbd="]">${icon('panel-right')}</button>
        </div>`
        : '';
      tb.innerHTML = `<div class="toolbar-left">${left}</div>${actions}`;
      app.dataset.inspector = sel.length && state.lib.inspector ? 'open' : 'closed';
      return;
    }
    if (state.view === 'editor') {
      const page = currentPage();
      const sec = selectedSection();
      const tabBtn = (key, label) => `<button type="button" class="tab" role="tab" aria-selected="${state.ed.tab === key}" tabindex="${state.ed.tab === key ? 0 : -1}" data-ptab="${key}" data-fk="ptab-${key}">${label}</button>`;
      // Below 1000px the rail is a drawer and this button is the one way in. It carries the current name.
      tb.innerHTML = `<div class="toolbar-left">
          <button type="button" class="btn btn-sm btn-secondary btn-sections" data-action="drawer" aria-controls="rail" aria-expanded="${state.drawer}" aria-label="Sections, current: ${esc(sec ? sec.name : 'none')}">${icon('layers')}<span class="truncate">${sec ? esc(sec.name) : `${page.sections.length} sections`}</span>${icon('chevron-down', 'caret')}</button>
          <button type="button" class="iconbtn" data-action="undo" data-fk="undo" aria-label="Undo" data-tip="Undo" data-tip-kbd="⌘Z" ${state.ed.history.length ? '' : 'disabled'}>${icon('undo')}</button>
          <button type="button" class="iconbtn" data-action="redo" data-fk="redo" aria-label="Redo" data-tip="Redo" data-tip-kbd="⇧⌘Z" ${state.ed.future.length ? '' : 'disabled'}>${icon('redo')}</button>
          <div class="toolbar-view">
            <div class="seg" role="group" aria-label="Preview device"><button type="button" data-device="desktop" data-fk="dev-desktop" aria-pressed="${state.ed.device === 'desktop'}" aria-label="Desktop" data-tip="Desktop">${icon('monitor')}</button><button type="button" data-device="phone" data-fk="dev-phone" aria-pressed="${state.ed.device === 'phone'}" aria-label="Phone" data-tip="Phone">${icon('phone')}</button></div>
            <button type="button" class="iconbtn iconbtn-props" data-action="toggle-props" aria-label="Properties" data-tip="Properties" aria-pressed="${state.props}">${icon('sliders')}</button>
          </div>
        </div>
        <div class="toolbar-actions"><div class="tabs" role="tablist" aria-label="Properties">${tabBtn('section', 'Section')}${tabBtn('page', 'Page')}${tabBtn('theme', 'Theme')}</div></div>`;
      return;
    }
    tb.innerHTML = '';
  }

  function renderSelbar() {
    const bar = $('#selbar');
    const sel = state.view === 'library' ? state.lib.selected : [];
    bar.dataset.visible = sel.length ? 'true' : 'false';
    if (!sel.length) { bar.innerHTML = ''; return; }
    const one = sel.length === 1 ? getItem(sel[0]) : null;
    bar.innerHTML = `<span class="sel-count num">${sel.length} selected</span>
      <button type="button" class="btn btn-secondary" data-action="share-selected" ${one && one.kind !== 'folder' ? '' : 'disabled'}>${icon('share')}<span>Share</span></button>
      <button type="button" class="btn btn-secondary" data-action="open-selected" ${one ? '' : 'disabled'}><span>Open</span></button>
      <button type="button" class="iconbtn iconbtn-md" data-menu="selection" aria-haspopup="menu" aria-expanded="false" aria-label="More actions">${icon('more')}</button>
      <button type="button" class="iconbtn iconbtn-md" data-action="clear-selection" aria-label="Clear selection">${icon('x')}</button>`;
  }

  function renderBody() {
    const body = $('#body');
    body.className = 'body';
    if (state.view === 'library') {
      body.innerHTML = `<div id="collection-host" style="display:contents"></div><aside class="inspector" id="inspector" aria-label="Details"></aside>`;
      renderCollection();
      renderInspector();
    } else if (state.view === 'editor') {
      body.innerHTML = `<div class="canvas" id="canvas" data-device="${state.ed.device}"></div><aside class="inspector props" id="props" aria-label="Properties"></aside>`;
      renderCanvas();
      renderProps();
    } else {
      body.className = 'body sys';
      body.innerHTML = '';
      body.appendChild($('#tpl-system').content.cloneNode(true));
      renderSystemSamples(body);
    }
  }

  // ---------- Library ----------
  function libraryScope() {
    const q = state.lib.query.trim().toLowerCase();
    if (q) return items.filter((i) => i.title.toLowerCase().includes(q));
    return childrenOf(state.lib.folder);
  }
  function visibleItems() {
    let list = libraryScope();
    const f = state.lib.filter;
    if (f === 'video') list = list.filter((i) => i.kind === 'video');
    else if (f === 'page') list = list.filter((i) => i.kind === 'page');
    else if (f === 'document') list = list.filter((i) => i.kind === 'document' || i.kind === 'image');
    const s = state.lib.sort;
    const cmp = {
      updated: (a, b) => b.updated - a.updated,
      name: (a, b) => a.title.localeCompare(b.title),
      views: (a, b) => (b.views || 0) - (a.views || 0),
      length: (a, b) => (b.duration || b.pages || 0) - (a.duration || a.pages || 0),
    }[s] || ((a, b) => b.updated - a.updated);
    list = list.slice().sort(cmp);
    if (state.lib.foldersFirst && !state.lib.query.trim()) list = [...list.filter((i) => i.kind === 'folder'), ...list.filter((i) => i.kind !== 'folder')];
    return list;
  }
  function metaParts(item) {
    const p = [];
    if (item.kind === 'video') p.push(item.status === 'processing' ? 'Processing' : fmtDuration(item.duration));
    if (item.kind === 'document') p.push(plural(item.pages, 'page'));
    if (item.kind === 'image') p.push(`${item.w} × ${item.h}`);
    if (item.kind === 'page') p.push(item.published ? 'Published' : 'Draft');
    if (item.kind === 'folder') p.push(plural(childrenOf(item.id).length, 'item'));
    if (item.kind !== 'folder' && item.views !== undefined) p.push(plural(item.views, 'view'));
    return p;
  }
  // Length means duration or page count. Pages, images and folders have neither, so the cell stays empty.
  function lengthCell(item) {
    if (item.kind === 'video') return item.status === 'processing' ? '<span class="spinner spinner-sm" aria-label="Processing"></span>' : fmtDuration(item.duration);
    if (item.kind === 'document') return plural(item.pages, 'page');
    return '';
  }
  function rowHtml(item, opts = {}) {
    const selected = opts.selected !== undefined ? opts.selected : state.lib.selected.includes(item.id);
    const folderName = state.lib.query && item.folder ? ` · in ${getItem(item.folder).title}` : '';
    const sub = [...metaParts(item), ago(item.updated)].join(' · ') + folderName;
    const label = `${item.title}, ${KIND_LABEL[item.kind]}, ${sub}`;
    return `<div class="row${opts.sim ? ' ' + opts.sim : ''}" role="option" aria-selected="${selected}" tabindex="${opts.tabbable ? 0 : -1}" data-id="${item.id}" aria-label="${esc(label)}">
      <div class="cell check-cell"><span class="check-hit"><button type="button" class="check" role="checkbox" aria-checked="${selected}" aria-label="Select ${esc(item.title)}" data-check="${item.id}" tabindex="-1">${icon('check')}</button></span></div>
      <div class="cell name">${thumb(item)}${icon(KIND_ICON[item.kind], 'type-icon')}<span class="text-stack"><span class="title">${esc(item.title)}</span><span class="subtitle">${esc(sub)}</span></span></div>
      <div class="cell length right num">${lengthCell(item)}</div>
      <div class="cell updated num">${ago(item.updated)}</div>
      <div class="cell views right num">${item.kind === 'folder' ? '' : fmtNum(item.views)}</div>
      <div class="cell action"><button type="button" class="iconbtn" data-item-menu="${item.id}" aria-haspopup="menu" aria-expanded="false" aria-label="Actions for ${esc(item.title)}" tabindex="-1">${icon('more')}</button></div>
    </div>`;
  }
  function cardHtml(item, opts = {}) {
    const selected = opts.selected !== undefined ? opts.selected : state.lib.selected.includes(item.id);
    const meta = metaParts(item);
    const label = `${item.title}, ${KIND_LABEL[item.kind]}, ${[...meta, ago(item.updated)].join(', ')}`;
    const metaHtml = [...meta.map((m) => esc(m)), ago(item.updated)].join('<span class="sep" aria-hidden="true">·</span>');
    return `<div class="card${opts.sim ? ' ' + opts.sim : ''}" role="option" aria-selected="${selected}" tabindex="${opts.tabbable ? 0 : -1}" data-id="${item.id}" aria-label="${esc(label)}">
      ${thumb(item)}
      <div class="card-cap"><span class="card-title">${esc(item.title)}</span><span class="card-meta">${metaHtml}</span><button type="button" class="iconbtn" data-item-menu="${item.id}" aria-haspopup="menu" aria-expanded="false" aria-label="Actions for ${esc(item.title)}" tabindex="-1">${icon('more')}</button></div>
    </div>`;
  }
  function listHeadHtml() {
    const all = visibleItems();
    const n = all.filter((i) => state.lib.selected.includes(i.id)).length;
    const checked = n === 0 ? 'false' : n === all.length ? 'true' : 'mixed';
    const col = (key, label, cls = '') => {
      const active = state.lib.sort === key;
      return `<button type="button" class="col ${cls}" data-sort="${key}" ${active ? 'aria-sort="descending"' : ''}>${label}${active ? icon('chevron-down') : ''}</button>`;
    };
    return `<div class="list-head" role="presentation">
      <div class="col check-cell"><span class="check-hit"><button type="button" class="check" role="checkbox" aria-checked="${checked}" aria-label="Select all" data-check-all>${icon(checked === 'mixed' ? 'minus' : 'check')}</button></span></div>
      ${col('name', 'Name')}${col('length', 'Length', 'length right')}${col('updated', 'Updated', 'updated')}${col('views', 'Views', 'views right')}<span class="col action"></span>
    </div>`;
  }
  function emptyHtml(kind, extra = {}) {
    const q = extra.query !== undefined ? extra.query : state.lib.query.trim();
    if (kind === 'search') {
      return `<div class="empty"><span class="empty-glyph">${icon('search')}</span><h2>No results for “${esc(q)}”</h2><p>Check the spelling or search for part of a title. Search looks across every folder.</p><div class="empty-actions"><button type="button" class="btn btn-secondary" data-action="clear-search">Clear search</button></div></div>`;
    }
    if (kind === 'filter') {
      const f = state.lib.filter;
      const noun = { video: 'videos', page: 'pages', document: 'documents' }[f];
      const action = f === 'video' ? `<button type="button" class="btn btn-primary" data-action="record"><span class="rec-dot" aria-hidden="true"></span><span>Record</span></button>` : f === 'page' ? `<button type="button" class="btn btn-primary" data-action="new-page">${icon('plus')}<span>New page</span></button>` : `<button type="button" class="btn btn-primary" data-action="upload">${icon('upload')}<span>Upload</span></button>`;
      return `<div class="empty"><span class="empty-glyph">${icon(KIND_ICON[f] || 'filter')}</span><h2>No ${noun} ${extra.where || 'here'}</h2><p>${f === 'video' ? 'Record one now, or upload a file you already have.' : f === 'page' ? 'A Journey Page wraps a video with a message and a next step.' : 'Upload a PDF or an image to attach it to a page.'}</p><div class="empty-actions">${action}<button type="button" class="btn btn-secondary" data-filter="all">Show everything</button></div></div>`;
    }
    return `<div class="empty"><span class="empty-glyph">${icon('folder')}</span><h2>This folder is empty</h2><p>Upload files here or move items in from the library.</p><div class="empty-actions"><button type="button" class="btn btn-primary" data-action="upload">${icon('upload')}<span>Upload</span></button></div></div>`;
  }
  function renderCollection() {
    const host = $('#collection-host');
    if (!host) return;
    const list = visibleItems();
    const scopeEmpty = libraryScope().length === 0;
    let inner;
    if (!list.length) {
      inner = state.lib.query.trim() ? emptyHtml('search') : scopeEmpty ? emptyHtml('folder') : emptyHtml('filter', { where: state.lib.folder ? 'in this folder' : 'yet' });
    } else {
      const firstId = state.lib.selected.length ? state.lib.selected[state.lib.selected.length - 1] : list[0].id;
      const groups = state.lib.foldersFirst && !state.lib.query.trim() && list.some((i) => i.kind === 'folder') && list.some((i) => i.kind !== 'folder');
      const renderItem = state.lib.view === 'grid' ? cardHtml : rowHtml;
      const part = (arr) => arr.map((i) => renderItem(i, { tabbable: i.id === firstId })).join('');
      if (state.lib.view === 'grid') {
        inner = groups
          ? `<div class="group-label">Folders</div><div class="grid" role="listbox" aria-multiselectable="true" aria-label="Folders">${part(list.filter((i) => i.kind === 'folder'))}</div><div class="group-label">Files</div><div class="grid" role="listbox" aria-multiselectable="true" aria-label="Files">${part(list.filter((i) => i.kind !== 'folder'))}</div>`
          : `<div class="grid" role="listbox" aria-multiselectable="true" aria-label="Items">${part(list)}</div>`;
      } else {
        inner = `<div class="list" role="listbox" aria-multiselectable="true" aria-label="Items">${listHeadHtml()}${part(list)}</div>`;
      }
    }
    host.innerHTML = `<div class="collection" id="collection" data-view="${state.lib.view}" data-density="${state.lib.density}" data-selected="${state.lib.selected.length > 0}"><div class="collection-inner">${inner}</div></div>`;
  }

  function sparkline(values) {
    const max = Math.max(1, ...values);
    const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${34 - (v / max) * 30}`).join(' ');
    return `<svg class="sparkline" viewBox="0 0 100 36" preserveAspectRatio="none" role="img" aria-label="Views over the last 14 days"><line class="base" x1="0" y1="35" x2="100" y2="35" vector-effect="non-scaling-stroke"/><polyline class="line" points="${pts}"/></svg>`;
  }
  // The inspector describes the selection. With nothing selected it is not shown at all.
  function inspectorHtml(sel) {
    if (!sel.length) return '';
    if (sel.length > 1) {
      const list = sel.map(getItem).filter(Boolean);
      const size = list.reduce((n, i) => n + (i.size || 0), 0);
      const views = list.reduce((n, i) => n + (i.views || 0), 0);
      return `<div class="insp-section"><h3>Selection</h3><p class="insp-title">${list.length} items</p><div class="insp-meta"><span>${fmtSize(size)}</span><span class="sep">·</span><span>${plural(views, 'view')}</span></div></div>
        <div class="insp-section"><h3>Items</h3><div class="selected-list">${list.map((i) => `<div class="sel-item">${thumb(i)}<span>${esc(i.title)}</span></div>`).join('')}</div></div>
        <div class="insp-section"><h3>Actions</h3><p style="color:var(--text-2)">Move, download and delete apply to all selected items from the toolbar menu. Share and Open need a single item.</p></div>`;
    }
    const item = getItem(sel[0]);
    if (!item) return '';
    const isVideo = item.kind === 'video';
    const portrait = isVideo && item.orientation === 'portrait';
    const media = item.kind === 'folder'
      ? `<div class="media" style="cursor:default"><div class="folder-mosaic" style="position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line-strong)">${childrenOf(item.id).slice(0, 4).map((k) => `<div style="background:var(--bg-active);position:relative;overflow:hidden">${thumbSvg(k)}</div>`).join('')}${'<div style="background:var(--bg-active)"></div>'.repeat(Math.max(0, 4 - childrenOf(item.id).length))}</div></div>`
      : `<div class="media${portrait ? ' portrait-frame' : ''}${item.kind === 'page' || item.kind === 'document' ? ' ' + (item.kind === 'page' ? 'page' : 'pdf') : ''}" data-open-media="${item.id}" ${isVideo || item.kind === 'page' ? `role="button" tabindex="0" aria-label="Open ${esc(item.title)}"` : ''}>${thumbSvg(item)}</div>`;
    // The bar holds only controls that do something here: play opens the viewer, which has the working player.
    const bar = isVideo
      ? `<div class="mediabar">${item.status === 'processing' ? `<span class="spinner" aria-hidden="true"></span><span class="time">Processing…</span>` : `<button type="button" class="iconbtn" data-action="viewer" data-id="${item.id}" aria-label="Play in viewer" data-tip="Play">${icon('play')}</button><span class="time num">${fmtDuration(item.duration)}</span>`}</div>`
      : item.kind === 'document' ? `<div class="mediabar"><span class="time num">${plural(item.pages, 'page')}</span><span class="spacer"></span><button type="button" class="iconbtn" data-action="viewer" data-id="${item.id}" aria-label="Open viewer" data-tip="Open viewer">${icon('maximize')}</button></div>`
      : item.kind === 'page' ? `<div class="mediabar"><span class="time">${item.published ? `<span class="status-line"><span class="dot success"></span>Published</span>` : 'Draft'}</span></div>`
      : item.kind === 'image' ? `<div class="mediabar"><span class="time num">${item.w} × ${item.h}</span><span class="spacer"></span><button type="button" class="iconbtn" data-action="viewer" data-id="${item.id}" aria-label="Open viewer" data-tip="Open viewer">${icon('maximize')}</button></div>`
      : '';
    const meta = [KIND_LABEL[item.kind], ...metaParts(item).filter((m) => !/view/.test(m)), item.size ? fmtSize(item.size) : null, `Updated ${ago(item.updated)}`].filter(Boolean);
    const link = item.link || {};
    const avgPct = item.watched && item.watched.length ? Math.round(item.watched.reduce((n, w) => n + w.pct, 0) / item.watched.length) : null;
    const last = item.watched && item.watched.length ? item.watched.slice().sort((a, b) => b.when - a.when)[0] : null;
    const engagement = item.kind === 'folder'
      ? `<div class="insp-section folder-summary"><h3>Contents</h3><div class="stats"><div class="stat"><b class="num">${childrenOf(item.id).length}</b><span>Items</span></div><div class="stat"><b class="num">${fmtSize(childrenOf(item.id).reduce((n, i) => n + (i.size || 0), 0))}</b><span>Size</span></div></div></div>`
      : `<div class="insp-section"><h3>Engagement</h3><div class="stats"><div class="stat"><b class="num">${fmtNum(item.views)}</b><span>Views</span></div><div class="stat"><b class="num">${fmtNum(item.viewers)}</b><span>Viewers</span></div><div class="stat"><b class="num">${avgPct === null ? '–' : avgPct + '%'}</b><span>Avg. ${isVideo ? 'watched' : 'read'}</span></div><div class="stat"><b class="num" style="font-size:15px">${last ? ago(last.when) : 'Never'}</b><span>Last opened</span></div></div>${sparkline(item.trend || Array(14).fill(0))}</div>
        <div class="insp-section"><h3>Viewers</h3>${item.watched && item.watched.length ? `<div class="viewer-list">${item.watched.slice().sort((a, b) => b.when - a.when).map((w) => { const p = PEOPLE[w.who]; return `<div class="viewer"><span class="avatar" aria-hidden="true">${p.initials}</span><span class="who"><span>${esc(p.name)}</span><small>${esc(p.company)} · ${ago(w.when)}</small></span><span class="watched"><span class="num">${w.pct}%</span><span class="bar" aria-hidden="true"><i style="width:${w.pct}%"></i></span></span></div>`; }).join('')}</div>` : `<p style="color:var(--text-3)">No one has opened this yet. Share the link to start tracking.</p>`}</div>`;
    const details = `<div class="insp-section"><h3>Details</h3><dl class="dl">
        <dt>Kind</dt><dd>${KIND_LABEL[item.kind]}${portrait ? ' · portrait' : ''}</dd>
        ${isVideo ? `<dt>Length</dt><dd class="num">${item.status === 'processing' ? 'Processing' : fmtDuration(item.duration)}</dd>` : ''}
        ${item.kind === 'document' ? `<dt>Pages</dt><dd class="num">${item.pages}</dd>` : ''}
        ${item.kind === 'image' ? `<dt>Size</dt><dd class="num">${item.w} × ${item.h} px</dd>` : ''}
        ${item.size ? `<dt>File size</dt><dd class="num">${fmtSize(item.size)}</dd>` : ''}
        <dt>Created</dt><dd class="num">${fmtDate(item.created || item.updated)}</dd>
        <dt>Updated</dt><dd class="num">${ago(item.updated)}</dd>
        <dt>Owner</dt><dd><span class="avatar" aria-hidden="true">${ME.initials}</span>${ME.name}</dd>
        <dt>Folder</dt><dd>${item.folder ? esc(getItem(item.folder).title) : 'Library'}</dd>
        ${item.kind !== 'folder' ? `<dt>Link</dt><dd>${link.on ? `<span class="status-line"><span class="dot success"></span>On · ${link.access === 'email' ? 'email required' : 'anyone with the link'}</span>` : '<span class="status-line"><span class="dot"></span>Off</span>'}</dd>` : ''}
      </dl></div>`;
    return `${media}${bar}
      <div class="insp-section"><h3>${KIND_LABEL[item.kind]}</h3><p class="insp-title">${esc(item.title)}</p><div class="insp-meta">${meta.map((m) => esc(m)).join('<span class="sep" aria-hidden="true">·</span>')}</div></div>
      ${engagement}${details}`;
  }
  function renderInspector() {
    const insp = $('#inspector');
    if (!insp) return;
    const show = state.lib.inspector && state.lib.selected.length > 0;
    insp.innerHTML = show ? inspectorHtml(state.lib.selected) : '';
  }

  // ---------- Selection ----------
  function setSelection(ids, { anchor } = {}) {
    state.lib.selected = ids;
    if (anchor !== undefined) state.lib.anchor = anchor;
    $$('#collection [role="option"]').forEach((el) => {
      const on = ids.includes(el.dataset.id);
      el.setAttribute('aria-selected', String(on));
      const c = el.querySelector('[data-check]');
      if (c) c.setAttribute('aria-checked', String(on));
    });
    const head = $('#collection [data-check-all]');
    if (head) {
      const all = visibleItems();
      const n = all.filter((i) => ids.includes(i.id)).length;
      const v = n === 0 ? 'false' : n === all.length ? 'true' : 'mixed';
      head.setAttribute('aria-checked', v);
      head.innerHTML = icon(v === 'mixed' ? 'minus' : 'check');
    }
    const coll = $('#collection');
    if (coll) coll.dataset.selected = String(ids.length > 0);
    keepFocus(() => renderToolbar());
    renderInspector();
    renderSelbar();
  }
  function selectRange(toId) {
    const list = visibleItems().map((i) => i.id);
    const a = list.indexOf(state.lib.anchor || toId);
    const b = list.indexOf(toId);
    if (a < 0 || b < 0) { setSelection([toId], { anchor: toId }); return; }
    const [lo, hi] = a < b ? [a, b] : [b, a];
    setSelection(list.slice(lo, hi + 1));
  }
  function focusOption(id) {
    const el = $(`#collection [role="option"][data-id="${id}"]`);
    if (!el) return;
    $$('#collection [role="option"]').forEach((o) => { o.tabIndex = o === el ? 0 : -1; });
    el.focus({ preventScroll: false });
  }
  function moveFocus(fromEl, delta) {
    const opts = $$('#collection [role="option"]');
    const i = opts.indexOf(fromEl);
    if (i < 0) return null;
    let n = i + delta;
    if (state.lib.view === 'grid' && Math.abs(delta) > 1) {
      // Up and down move by one visual row.
      const top = fromEl.offsetTop;
      const perRow = opts.filter((o) => o.offsetTop === top).length || 1;
      n = i + Math.sign(delta) * perRow;
    }
    n = clamp(n, 0, opts.length - 1);
    return opts[n];
  }
  // A mutation rebuilds the list, so focus is placed by hand afterwards: the first candidate
  // row that still exists, else the first row, else the empty state's one action.
  function focusRow(...ids) {
    const id = ids.find((x) => x && $(`#collection [role="option"][data-id="${x}"]`));
    if (id) { focusOption(id); return; }
    const first = $('#collection [role="option"]');
    if (first) { focusOption(first.dataset.id); return; }
    const action = $('#collection .empty button');
    if (action) action.focus();
  }
  // Where to land when rows leave the list: the next survivor after the first removed row, else the one before it.
  function nextSurvivor(ids) {
    const list = visibleItems().map((i) => i.id);
    const gone = new Set(ids);
    const at = list.findIndex((id) => gone.has(id));
    if (at < 0) return null;
    return list.slice(at).find((id) => !gone.has(id)) || list.slice(0, at).reverse().find((id) => !gone.has(id)) || null;
  }
  // Dialogs that end in a mutation drop their opener first: the list is rebuilt and the
  // opener's node will not exist, so focus must not be handed back to it.
  function closeDialogForRender(result) {
    if (dialogState) dialogState.opener = null;
    closeDialog(result);
  }

  // ---------- Item actions ----------
  function openItem(item) {
    if (!item) return;
    if (item.kind === 'folder') {
      state.lib.folder = item.id;
      state.lib.selected = [];
      state.lib.query = '';
      state.treeOpen[item.id] = true;
      render();
      return;
    }
    if (item.kind === 'page') { openEditor(item.id); return; }
    openViewer(item);
  }
  // Details: the inspector on desktop, a dialog where the inspector cannot show.
  function showDetails(item) {
    if (window.innerWidth <= 1000) { openDetails(item); return; }
    state.lib.inspector = true;
    setSelection([item.id], { anchor: item.id });
  }
  // Open and Share are not here. They belong to the selection toolbar, with Enter and S as shortcuts.
  function itemMenuEntries(item, { fromToolbar = false } = {}) {
    const isFolder = item.kind === 'folder';
    return [
      ...(item.kind === 'video' && item.status !== 'processing' ? [{ label: 'Create Journey Page', icon: 'page', onSelect: () => createPage({ videoId: item.id, heading: item.title }) }] : []),
      { label: 'Details', icon: 'panel-right', onSelect: () => showDetails(item) },
      { sep: true },
      { label: 'Rename', icon: 'pencil', onSelect: () => openRename(item) },
      { label: 'Move to…', icon: 'move', onSelect: () => openMove([item.id]) },
      ...(isFolder ? [] : [{ label: 'Duplicate', icon: 'copy', onSelect: () => duplicateItem(item) }]),
      ...(isFolder ? [] : [{ label: 'Download', icon: 'download', onSelect: () => toast('Downloads are off in this prototype', { icon: 'info' }) }]),
      { sep: true },
      { label: isFolder ? 'Delete folder' : 'Delete', icon: 'trash', danger: true, kbd: '⌫', onSelect: () => confirmDelete([item.id]) },
    ].filter((e) => !(fromToolbar && e.label === 'Details' && window.innerWidth > 1000));
  }
  function selectionMenuEntries() {
    const sel = state.lib.selected;
    if (sel.length === 1) return itemMenuEntries(getItem(sel[0]), { fromToolbar: true });
    return [
      { heading: `${sel.length} items` },
      { label: 'Move to…', icon: 'move', onSelect: () => openMove(sel.slice()) },
      { label: 'Download', icon: 'download', onSelect: () => toast('Downloads are off in this prototype', { icon: 'info' }) },
      { sep: true },
      { label: `Delete ${sel.length} items`, icon: 'trash', danger: true, onSelect: () => confirmDelete(sel.slice()) },
    ];
  }
  function duplicateItem(item) {
    const copy = { ...item, id: uid('c'), title: `${item.title} (copy)`, views: 0, viewers: 0, watched: [], trend: Array(14).fill(0), updated: Date.now(), created: Date.now(), link: { ...item.link, on: false, slug: '' } };
    const idx = items.indexOf(item);
    items.splice(idx + 1, 0, copy);
    if (item.kind === 'page') pages[copy.id] = JSON.parse(JSON.stringify(pages[item.id] || defaultPage(copy.id)));
    render();
    setSelection([copy.id], { anchor: copy.id });
    focusRow(copy.id);
    toast(`Duplicated “${item.title}”`, { action: { label: 'Undo', fn: () => { items = items.filter((i) => i.id !== copy.id); state.lib.selected = state.lib.selected.filter((id) => id !== copy.id); render(); focusRow(item.id); } } });
  }
  function removeItems(ids) {
    const removed = ids.map((id) => ({ item: getItem(id), index: items.findIndex((i) => i.id === id) })).filter((r) => r.item);
    const all = new Set(ids);
    removed.forEach((r) => { if (r.item.kind === 'folder') childrenOf(r.item.id).forEach((k) => all.add(k.id)); });
    const landing = nextSurvivor([...all]);
    const snapshot = items.slice();
    items = items.filter((i) => !all.has(i.id));
    state.lib.selected = state.lib.selected.filter((id) => !all.has(id));
    if (state.lib.folder && all.has(state.lib.folder)) state.lib.folder = null;
    render();
    focusRow(landing);
    const label = removed.length === 1 ? `Deleted “${removed[0].item.title}”` : `Deleted ${removed.length} items`;
    toast(label, { icon: 'trash', action: { label: 'Undo', fn: () => { items = snapshot; render(); setSelection(ids.filter((id) => getItem(id)), { anchor: ids[0] }); focusRow(ids[0]); } } });
  }
  function confirmDelete(ids) {
    const list = ids.map(getItem).filter(Boolean);
    if (!list.length) return;
    const title = list.length === 1 ? `Delete “${esc(list[0].title)}”?` : `Delete ${list.length} items?`;
    const hasFolder = list.some((i) => i.kind === 'folder');
    openDialog({
      title,
      body: `<p>${hasFolder ? 'Folders are deleted with everything inside them. ' : ''}In the real product deleted items stay in Trash for 30 days. In this prototype you can undo from the toast.</p>${list.length > 1 ? `<div class="selected-list">${list.slice(0, 5).map((i) => `<div class="sel-item">${thumb(i)}<span>${esc(i.title)}</span></div>`).join('')}${list.length > 5 ? `<span class="field-hint">and ${list.length - 5} more</span>` : ''}</div>` : ''}`,
      foot: `<button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="button" class="btn btn-danger" data-act="delete">${icon('trash')}<span>Delete</span></button>`,
      initialFocus: '[data-close]',
      onOpen: (d) => { d.querySelector('[data-act="delete"]').addEventListener('click', () => { closeDialogForRender('delete'); removeItems(ids); }); },
    });
  }
  function openRename(item) {
    openDialog({
      title: item.kind === 'folder' ? 'Rename folder' : 'Rename',
      body: `<form id="rename-form"><div class="field"><label for="rename-input">Name</label><input class="input" id="rename-input" type="text" value="${esc(item.title)}" required maxlength="140"><span class="field-error hidden" id="rename-err">${icon('alert')}A name is required.</span></div></form>`,
      foot: `<button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="submit" form="rename-form" class="btn btn-primary">Save</button>`,
      initialFocus: '#rename-input',
      onOpen: (d) => {
        const input = d.querySelector('#rename-input');
        input.select();
        d.querySelector('#rename-form').addEventListener('submit', (e) => {
          e.preventDefault();
          const v = input.value.trim();
          if (!v) { input.setAttribute('aria-invalid', 'true'); d.querySelector('#rename-err').classList.remove('hidden'); input.focus(); return; }
          const old = item.title;
          item.title = v;
          item.updated = Date.now();
          closeDialogForRender('save');
          render();
          focusRow(item.id);
          toast(`Renamed to “${v}”`, { action: { label: 'Undo', fn: () => { item.title = old; render(); focusRow(item.id); } } });
        });
      },
    });
  }
  function openMove(ids) {
    const list = ids.map(getItem).filter(Boolean);
    const current = list[0] ? list[0].folder : null;
    const dests = [{ id: null, title: 'Library' }, ...folders().filter((f) => !ids.includes(f.id))];
    let choice = current;
    openDialog({
      title: list.length === 1 ? `Move “${esc(list[0].title)}”` : `Move ${list.length} items`,
      body: `<div class="field"><span class="field-label">Destination</span><div class="radio-list" role="radiogroup" aria-label="Destination">${dests.map((d) => `<button type="button" class="radio-item" role="radio" aria-checked="${(d.id || null) === (choice || null)}" data-dest="${d.id || ''}">${icon(d.id ? 'folder' : 'library')}<span>${esc(d.title)}</span>${d.id ? `<span class="right num">${childrenOf(d.id).length}</span>` : ''}<span class="radio-check">${icon('check')}</span></button>`).join('')}</div></div>`,
      foot: `<button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="button" class="btn btn-primary" data-act="move">Move</button>`,
      onOpen: (d) => {
        d.querySelector('.radio-list').addEventListener('click', (e) => {
          const b = e.target.closest('[data-dest]');
          if (!b) return;
          choice = b.dataset.dest || null;
          $$('[data-dest]', d).forEach((x) => x.setAttribute('aria-checked', String((x.dataset.dest || null) === choice)));
        });
        d.querySelector('[data-act="move"]').addEventListener('click', () => {
          const prev = list.map((i) => [i, i.folder]);
          const landing = nextSurvivor(ids);
          list.forEach((i) => { i.folder = choice; i.updated = Date.now(); });
          closeDialogForRender('move');
          state.lib.selected = [];
          render();
          focusRow(ids[0], landing);
          const dest = choice ? getItem(choice).title : 'Library';
          toast(`Moved to ${dest}`, { action: { label: 'Undo', fn: () => { prev.forEach(([i, f]) => { i.folder = f; }); render(); focusRow(ids[0]); } } });
        });
      },
    });
  }
  function openNewFolder() {
    openDialog({
      title: 'New folder',
      body: `<form id="folder-form"><div class="field"><label for="folder-input">Name</label><input class="input" id="folder-input" type="text" placeholder="Folder name" required maxlength="80"><span class="field-hint">Created in ${state.lib.folder ? esc(getItem(state.lib.folder).title) : 'Library'}.</span></div></form>`,
      foot: `<button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="submit" form="folder-form" class="btn btn-primary">Create folder</button>`,
      initialFocus: '#folder-input',
      onOpen: (d) => {
        d.querySelector('#folder-form').addEventListener('submit', (e) => {
          e.preventDefault();
          const v = d.querySelector('#folder-input').value.trim();
          if (!v) return;
          const f = { id: uid('f'), kind: 'folder', title: v, updated: Date.now(), created: Date.now(), folder: state.lib.folder };
          items.unshift(f);
          closeDialogForRender('create');
          render();
          setSelection([f.id], { anchor: f.id });
          focusRow(f.id);
          toast(`Created “${v}”`);
        });
      },
    });
  }
  function openDetails(item) {
    openDialog({
      title: esc(item.title),
      body: `<div style="margin:0 -20px -20px"><div class="inspector" style="border-left:0">${inspectorHtml([item.id])}</div></div>`,
      foot: `<button type="button" class="btn btn-secondary" data-action="share-item" data-id="${item.id}" ${item.kind === 'folder' ? 'disabled' : ''}>${icon('share')}<span>Share</span></button><button type="button" class="btn btn-primary" data-close>Done</button>`,
      initialFocus: '.dlg-foot .btn-primary',
    });
  }
  function createPage({ videoId = null, heading = 'Untitled page' } = {}) {
    const id = uid('p');
    const page = defaultPage(id);
    page.sections[0].videoId = videoId;
    page.sections[0].heading = videoId ? heading : 'Untitled page';
    pages[id] = page;
    items.unshift({ id, kind: 'page', title: videoId ? `Page for ${heading}` : 'Untitled page', views: 0, viewers: 0, updated: Date.now(), created: Date.now(), folder: state.lib.folder, status: 'ready', published: false, link: { on: false, slug: '', access: 'anyone', expiry: 'never', notify: true }, watched: [], trend: Array(14).fill(0) });
    openEditor(id);
    toast('New page created. Changes stay in this tab.', { icon: 'page' });
  }

  // ---------- Viewer dialog ----------
  function openViewer(item) {
    let playing = false;
    let pos = 0;
    let timer = null;
    const isVideo = item.kind === 'video';
    const portrait = isVideo && item.orientation === 'portrait';
    const bar = isVideo
      ? `<div class="mediabar"><button type="button" class="iconbtn" data-act="play" aria-label="Play" aria-pressed="false">${icon('play')}</button><span class="time num"><span data-pos>0:00</span> / ${fmtDuration(item.duration)}</span><div class="scrub" data-act="scrub" role="slider" aria-label="Position" aria-valuemin="0" aria-valuemax="${item.duration}" aria-valuenow="0" tabindex="0"><div class="scrub-track"><div class="scrub-fill" data-fill style="width:0%"></div><div class="scrub-knob" data-knob style="left:0%"></div></div></div><span class="proto-tag">Prototype player</span></div>`
      : item.kind === 'document'
        ? `<div class="mediabar"><button type="button" class="iconbtn" data-act="prev" aria-label="Previous page" disabled>${icon('chevron-left')}</button><span class="pager num" data-pager>1 / ${item.pages}</span><button type="button" class="iconbtn" data-act="next" aria-label="Next page">${icon('chevron-right')}</button><span class="spacer"></span><span class="proto-tag">Sample document</span></div>`
        : `<div class="mediabar"><span class="time num">${item.w} × ${item.h} · ${fmtSize(item.size)}</span><span class="spacer"></span><span class="proto-tag">Sample image</span></div>`;
    openDialog({
      title: esc(item.title),
      wide: true,
      cls: 'dlg-media',
      body: `<div style="margin:0 -20px"><div class="media${portrait ? ' portrait-frame' : ''}" style="cursor:default">${thumbSvg(item)}</div>${bar}</div><div class="status-line">${KIND_LABEL[item.kind]}<span class="sep">·</span>${item.size ? fmtSize(item.size) + '<span class="sep">·</span>' : ''}${plural(item.views || 0, 'view')}<span class="sep">·</span>Updated ${ago(item.updated)}</div>`,
      foot: `${isVideo ? `<button type="button" class="btn btn-secondary" data-act="make-page">${icon('page')}<span>Create Journey Page</span></button>` : ''}<button type="button" class="btn btn-secondary" data-action="share-item" data-id="${item.id}">${icon('share')}<span>Share</span></button><button type="button" class="btn btn-primary" data-close>Done</button>`,
      initialFocus: isVideo ? '[data-act="play"]' : '.dlg-foot .btn-primary',
      onClose: () => clearInterval(timer),
      onOpen: (d, signal) => {
        const paint = () => {
          const pct = item.duration ? (pos / item.duration) * 100 : 0;
          const fill = d.querySelector('[data-fill]');
          if (!fill) return;
          fill.style.width = `${pct}%`;
          d.querySelector('[data-knob]').style.left = `${pct}%`;
          d.querySelector('[data-pos]').textContent = fmtDuration(pos);
          d.querySelector('[data-act="scrub"]').setAttribute('aria-valuenow', String(Math.round(pos)));
        };
        const setPlaying = (on) => {
          playing = on;
          const b = d.querySelector('[data-act="play"]');
          if (!b) return;
          b.innerHTML = icon(on ? 'pause' : 'play');
          b.setAttribute('aria-label', on ? 'Pause' : 'Play');
          b.setAttribute('aria-pressed', String(on));
          clearInterval(timer);
          if (on) timer = setInterval(() => { pos = Math.min(item.duration, pos + 0.25); paint(); if (pos >= item.duration) setPlaying(false); }, 250);
        };
        d.addEventListener('click', (e) => {
          const a = e.target.closest('[data-act]');
          if (!a) return;
          if (a.dataset.act === 'play') setPlaying(!playing);
          if (a.dataset.act === 'scrub') { const r = a.getBoundingClientRect(); pos = clamp(((e.clientX - r.left) / r.width) * item.duration, 0, item.duration); paint(); }
          if (a.dataset.act === 'make-page') { closeDialog('page'); createPage({ videoId: item.id, heading: item.title }); }
          if (a.dataset.act === 'next' || a.dataset.act === 'prev') {
            const pager = d.querySelector('[data-pager]');
            let n = parseInt(pager.textContent, 10) + (a.dataset.act === 'next' ? 1 : -1);
            n = clamp(n, 1, item.pages);
            pager.textContent = `${n} / ${item.pages}`;
            d.querySelector('[data-act="prev"]').disabled = n === 1;
            d.querySelector('[data-act="next"]').disabled = n === item.pages;
          }
        }, { signal });
        d.addEventListener('keydown', (e) => {
          const s = e.target.closest('[data-act="scrub"]');
          if (!s) return;
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); pos = clamp(pos + (e.key === 'ArrowRight' ? 5 : -5), 0, item.duration); paint(); }
        }, { signal });
      },
    });
  }

  // ---------- Share ----------
  const EXPIRY_LABEL = { never: 'Never', '7d': 'In 7 days', '30d': 'In 30 days' };
  function linkCaption(item) {
    const link = item.link || {};
    if (!link.on) return item.kind === 'page' ? 'Draft. Only you can open it.' : 'Off. Only you can open it.';
    return link.access === 'email' ? 'Anyone with the link, after entering an email' : 'Anyone with the link can open it';
  }
  function shareBodyHtml(item, mode, { copied = false } = {}) {
    const link = item.link || { on: false, slug: '', access: 'anyone', expiry: 'never', notify: false };
    if (mode === 'loading') {
      return `<div class="skel-line skeleton w-40" style="height:12px"></div><div class="link-field"><div class="skeleton" style="height:32px;flex:1;border-radius:6px"></div><div class="skeleton" style="height:32px;width:84px;border-radius:6px"></div></div><div class="skel-line skeleton w-60"></div><hr class="hairline"><div class="skel-line skeleton w-40" style="height:12px"></div><div class="skeleton" style="height:108px;border-radius:6px"></div><span class="visually-hidden">Loading sharing settings</span>`;
    }
    if (mode === 'error') {
      return `<div class="alert danger" role="alert">${icon('alert')}<div class="alert-text"><b>Couldn't load sharing settings</b>Check your connection and try again. The link itself is unchanged.</div><button type="button" class="btn btn-sm btn-secondary" data-act="retry">${icon('refresh')}<span>Retry</span></button></div>`;
    }
    if (mode === 'empty' || !link.slug) {
      return `<div class="empty" style="padding:28px 16px"><span class="empty-glyph">${icon('link')}</span><h2>No public link yet</h2><p>Create one to share “${esc(item.title)}”. In this prototype the link is a sample and nothing is published.</p><div class="empty-actions"><button type="button" class="btn btn-primary" data-act="create">${icon('link')}<span>Create link</span></button></div></div>`;
    }
    // For a page the switch is Published, the same word the Page tab uses, so one switch names one fact.
    const name = item.kind === 'page' ? 'Published' : 'Public link';
    const switchRow = `<div class="share-row"><span class="label"><b>${name}</b><small>${linkCaption(item)}${link.on ? '' : ' <span class="proto-tag">Sample link</span>'}</small></span><button type="button" class="switch" role="switch" aria-checked="${!!link.on}" aria-label="${name}" data-act="toggle-link"></button></div>`;
    // Off is one row. The URL, access, expiry and notify settings describe a link that is on.
    if (!link.on) return switchRow;
    const last = item.watched && item.watched.length ? item.watched.slice().sort((a, b) => b.when - a.when)[0] : null;
    return `${switchRow}
      <div class="link-field"><input class="input num" type="text" readonly value="${esc(linkUrl(item))}" aria-label="Public link" data-link><button type="button" class="btn btn-secondary" data-act="copy" aria-label="Copy link">${icon(copied ? 'check' : 'copy')}<span>Copy</span></button></div>
      <div class="status-line" data-status><span class="dot success"></span>Link on<span class="sep">·</span>${plural(item.views || 0, 'view')}${last ? `<span class="sep">·</span>Last opened ${ago(last.when)} by ${esc(PEOPLE[last.who].name)}` : ''}<span class="proto-tag">Sample link</span></div>
      <hr class="hairline">
      <div class="field"><span class="field-label" id="share-access-label">Who can open it</span><div class="radio-list" role="radiogroup" aria-labelledby="share-access-label">
        <button type="button" class="radio-item" role="radio" aria-checked="${link.access === 'anyone'}" data-access="anyone">${icon('globe')}<span>Anyone with the link</span><span class="radio-check">${icon('check')}</span></button>
        <button type="button" class="radio-item" role="radio" aria-checked="${link.access === 'email'}" data-access="email">${icon('mail')}<span>Anyone, after entering their email</span><span class="radio-check">${icon('check')}</span></button>
      </div></div>
      <div class="field-row">
        <div class="field"><span class="field-label" id="share-expiry-label">Link expires</span><button type="button" class="selectbtn" data-menu="expiry" aria-haspopup="menu" aria-expanded="false" aria-labelledby="share-expiry-label share-expiry-value">${icon('calendar')}<span id="share-expiry-value">${EXPIRY_LABEL[link.expiry] || 'Never'}</span>${icon('chevron-down', 'caret')}</button></div>
        <div class="field"><span class="field-label">Notify me</span><div class="switch-row" style="min-height:32px"><span class="switch-text"><span id="share-notify-label">On first view</span></span><button type="button" class="switch" role="switch" aria-checked="${!!link.notify}" aria-labelledby="share-notify-label" data-act="toggle-notify"></button></div></div>
      </div>`;
  }
  function shareFootHtml(mode) {
    return `<div class="left"><span class="proto-tag">Prototype states</span><div class="seg" role="group" aria-label="Prototype states">${['ready', 'loading', 'empty', 'error'].map((m) => `<button type="button" data-mode="${m}" aria-pressed="${mode === m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div></div><button type="button" class="btn btn-primary" data-close>Done</button>`;
  }
  function openShare(item, opts = {}) {
    if (!item || item.kind === 'folder') return;
    if (!item.link) item.link = { on: false, slug: '', access: 'anyone', expiry: 'never', notify: false };
    let mode = opts.mode || 'ready';
    let copiedTimer = null;
    openDialog({
      title: `Share “${esc(item.title)}”`,
      body: shareBodyHtml(item, mode),
      foot: shareFootHtml(mode),
      initialFocus: ['[data-act="copy"]:not([disabled])', '[data-act="create"]', '[data-act="toggle-link"]'],
      opener: opts.opener,
      onClose: () => { clearTimeout(copiedTimer); if (state.view === 'library') renderInspector(); if (state.view === 'editor') renderProps(); },
      onOpen: (d, signal) => {
        const paint = (focusSel) => {
          d.querySelector('.dlg-body').innerHTML = shareBodyHtml(item, mode);
          d.querySelector('.dlg-foot').innerHTML = shareFootHtml(mode);
          const f = firstOf(d, focusSel);
          if (f) f.focus();
        };
        // For a page, the public link is what "published" means. One switch, one field.
        const syncPublished = () => { if (item.kind === 'page') item.published = !!item.link.on; };
        d.addEventListener('click', (e) => {
          const link = item.link;
          const act = e.target.closest('[data-act]');
          const modeBtn = e.target.closest('[data-mode]');
          const access = e.target.closest('[data-access]');
          const menuBtn = e.target.closest('[data-menu="expiry"]');
          if (modeBtn) { mode = modeBtn.dataset.mode; paint(`[data-mode="${mode}"]`); e.stopPropagation(); return; }
          if (access) {
            link.access = access.dataset.access;
            $$('[data-access]', d).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.access === link.access)));
            const small = d.querySelector('.share-row .label small');
            if (small) small.textContent = linkCaption(item);
            e.stopPropagation();
            return;
          }
          if (menuBtn) {
            e.stopPropagation();
            openMenu(menuBtn, Object.keys(EXPIRY_LABEL).map((k) => ({ label: EXPIRY_LABEL[k], checked: link.expiry === k, onSelect: () => { link.expiry = k; d.querySelector('#share-expiry-value').textContent = EXPIRY_LABEL[k]; } })), { label: 'Link expires' });
            return;
          }
          if (!act) return;
          e.stopPropagation();
          switch (act.dataset.act) {
            case 'toggle-link': link.on = !link.on; syncPublished(); item.updated = Date.now(); paint('[data-act="toggle-link"]'); break;
            case 'toggle-notify': link.notify = !link.notify; act.setAttribute('aria-checked', String(link.notify)); break;
            case 'create': link.slug = slugify(item.title); link.on = true; syncPublished(); mode = 'ready'; item.updated = Date.now(); paint('[data-act="copy"]'); toast('Sample link created', { icon: 'link' }); break;
            case 'retry': mode = 'ready'; paint(['[data-act="copy"]:not([disabled])', '[data-act="create"]', '[data-act="toggle-link"]']); break;
            case 'copy': {
              const url = linkUrl(item);
              const done = (ok) => {
                if (ok) {
                  act.innerHTML = `${icon('check')}<span>Copy</span>`;
                  toast('Sample link copied');
                  clearTimeout(copiedTimer);
                  copiedTimer = setTimeout(() => { if (act.isConnected) act.innerHTML = `${icon('copy')}<span>Copy</span>`; }, 1600);
                } else {
                  const input = d.querySelector('[data-link]');
                  if (input) { input.focus(); input.select(); }
                  toast('Clipboard is blocked here. The link is selected, press ⌘C.', { icon: 'info', duration: 5000 });
                }
              };
              if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => done(true), () => done(false));
              else done(false);
              break;
            }
            default: break;
          }
        }, { signal });
      },
    });
  }

  // ---------- Record ----------
  let recBar = null;
  function openRecord() {
    let orientation = 'landscape';
    let useCountdown = true;
    let countTimer = null;
    openDialog({
      title: 'Record a video',
      headExtra: '<span class="proto-tag" style="margin-top:2px">Prototype: no camera</span>',
      body: `<div class="rec-preview" data-preview>${videoSvg(0, false)}</div>
        <div class="device-row">
          <div class="field"><span class="field-label" id="rec-cam-label">Camera</span><button type="button" class="selectbtn" data-menu="camera" aria-haspopup="menu" aria-expanded="false" aria-labelledby="rec-cam-label rec-cam-value">${icon('camera')}<span class="truncate" id="rec-cam-value">Built-in camera (sample)</span>${icon('chevron-down', 'caret')}</button></div>
          <div class="field"><span class="field-label" id="rec-mic-label">Microphone</span><button type="button" class="selectbtn" data-menu="mic" aria-haspopup="menu" aria-expanded="false" aria-labelledby="rec-mic-label rec-mic-value">${icon('mic')}<span class="truncate" id="rec-mic-value">Built-in microphone (sample)</span>${icon('chevron-down', 'caret')}</button></div>
        </div>
        <div class="field-row">
          <div class="field"><span class="field-label" id="rec-orient-label">Orientation</span><div class="seg seg-fill" role="group" aria-labelledby="rec-orient-label"><button type="button" data-orient="landscape" aria-pressed="true">${icon('monitor')}<span>Landscape</span></button><button type="button" data-orient="portrait" aria-pressed="false">${icon('phone')}<span>Portrait</span></button></div></div>
          <div class="field"><span class="field-label">Countdown</span><div class="switch-row" style="min-height:32px"><span class="switch-text"><span id="rec-count-label">3 seconds</span></span><button type="button" class="switch" role="switch" aria-checked="true" aria-labelledby="rec-count-label" data-act="countdown"></button></div></div>
        </div>
        <p class="field-hint">Your camera is not used. Starting adds a sample recording to the library so the processing and ready states can be reviewed.</p>`,
      foot: `<button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="button" class="btn btn-primary" data-act="start"><span class="rec-dot" aria-hidden="true"></span><span>Start recording</span></button>`,
      initialFocus: '[data-act="start"]',
      onClose: () => clearInterval(countTimer),
      onOpen: (d, signal) => {
        d.addEventListener('click', (e) => {
          const o = e.target.closest('[data-orient]');
          const act = e.target.closest('[data-act]');
          const menuBtn = e.target.closest('[data-menu]');
          if (o) {
            orientation = o.dataset.orient;
            $$('[data-orient]', d).forEach((b) => b.setAttribute('aria-pressed', String(b === o)));
            d.querySelector('[data-preview]').innerHTML = videoSvg(0, orientation === 'portrait');
            e.stopPropagation();
            return;
          }
          if (menuBtn) {
            e.stopPropagation();
            const isCam = menuBtn.dataset.menu === 'camera';
            const options = isCam ? ['Built-in camera (sample)', 'External webcam (sample)'] : ['Built-in microphone (sample)', 'Headset microphone (sample)'];
            const valueEl = d.querySelector(isCam ? '#rec-cam-value' : '#rec-mic-value');
            openMenu(menuBtn, options.map((label) => ({ label, checked: valueEl.textContent === label, onSelect: () => { valueEl.textContent = label; } })), { label: isCam ? 'Camera' : 'Microphone' });
            return;
          }
          if (!act) return;
          e.stopPropagation();
          if (act.dataset.act === 'countdown') { useCountdown = !useCountdown; act.setAttribute('aria-checked', String(useCountdown)); return; }
          if (act.dataset.act === 'start') {
            act.setAttribute('aria-busy', 'true');
            act.setAttribute('aria-disabled', 'true');
            if (!useCountdown) { closeDialog('start'); startRecording(orientation); return; }
            let n = 3;
            const preview = d.querySelector('[data-preview]');
            const overlay = document.createElement('div');
            overlay.className = 'countdown';
            overlay.setAttribute('role', 'status');
            overlay.textContent = String(n);
            preview.appendChild(overlay);
            countTimer = setInterval(() => {
              n -= 1;
              if (n <= 0) { clearInterval(countTimer); closeDialog('start'); startRecording(orientation); return; }
              overlay.textContent = String(n);
            }, 1000);
          }
        }, { signal });
      },
    });
  }
  function startRecording(orientation) {
    stopRecording(true);
    state.rec = { start: Date.now(), orientation, timer: null };
    recBar = document.createElement('div');
    recBar.className = 'recbar';
    recBar.setAttribute('role', 'status');
    recBar.innerHTML = `<span class="rec-dot live" aria-hidden="true"></span><span>Recording</span><span class="time num" data-rec-time>0:00</span><button type="button" class="btn btn-sm btn-secondary" data-action="rec-stop">${icon('stop')}<span>Stop</span></button><button type="button" class="iconbtn" data-action="rec-cancel" aria-label="Discard recording" data-tip="Discard">${icon('x')}</button>`;
    document.body.appendChild(recBar);
    recBar.querySelector('[data-action="rec-stop"]').focus();
    state.rec.timer = setInterval(() => {
      const t = recBar.querySelector('[data-rec-time]');
      if (t) t.textContent = fmtDuration((Date.now() - state.rec.start) / 1000);
    }, 500);
  }
  function stopRecording(discard = false) {
    if (!state.rec) return;
    const rec = state.rec;
    clearInterval(rec.timer);
    state.rec = null;
    if (recBar) { recBar.remove(); recBar = null; }
    if (discard) return;
    const seconds = Math.max(1, Math.round((Date.now() - rec.start) / 1000));
    const item = { id: uid('r'), kind: 'video', title: `Untitled recording ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`, duration: seconds, views: 0, viewers: 0, updated: Date.now(), created: Date.now(), size: seconds * 1.2e6, orientation: rec.orientation, folder: state.lib.folder, seed: 3 + (items.length % 3), status: 'processing', link: { on: false, slug: '', access: 'anyone', expiry: 'never', notify: true }, watched: [], trend: Array(14).fill(0) };
    items.unshift(item);
    if (state.view !== 'library') setView('library');
    render();
    setSelection([item.id], { anchor: item.id });
    toast('Sample recording saved. Processing…', { icon: 'video' });
    setTimeout(() => {
      item.status = 'ready';
      item.updated = Date.now();
      if (state.view === 'library') { renderCollection(); setSelection(state.lib.selected); }
    }, 4000);
  }

  // ---------- Upload ----------
  const fileInput = $('#file-input');
  let uploadSession = null;
  function kindFromName(name) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (['mp4', 'mov', 'webm', 'm4v'].includes(ext)) return 'video';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) return 'image';
    return 'document';
  }
  function openUpload() {
    uploadSession = { rows: [], done: 0 };
    openDialog({
      title: 'Upload',
      headExtra: '<span class="proto-tag" style="margin-top:2px">Files stay in your browser</span>',
      body: `<div class="dropzone" data-dropzone>${icon('upload')}<span><b style="font-weight:500;color:var(--text)">Drop files here</b> or</span><div class="row-of" style="justify-content:center"><button type="button" class="btn btn-secondary" data-act="choose">Choose files</button><button type="button" class="btn btn-ghost" data-act="sample">Use a sample file</button></div><span class="field-hint">Video, PDF and images. Only the file name and size are read, so the row can be shown. Nothing is sent anywhere.</span></div><div class="up-list" data-uplist></div>`,
      foot: `<span class="left" data-upstatus>No files yet</span><button type="button" class="btn btn-primary" data-close>Done</button>`,
      initialFocus: '[data-act="choose"]',
      onClose: () => { uploadSession = null; fileInput.value = ''; document.body.appendChild(fileInput); },
      onOpen: (d, signal) => {
        // The page is inert behind a modal, so the picker's input moves inside it.
        d.appendChild(fileInput);
        const zone = d.querySelector('[data-dropzone]');
        d.addEventListener('click', (e) => {
          const act = e.target.closest('[data-act]');
          if (!act) return;
          e.stopPropagation();
          if (act.dataset.act === 'choose') fileInput.click();
          if (act.dataset.act === 'sample') queueUploads([{ name: `Kickoff recording ${uploadSession.rows.length + 1}.mp4`, size: 142e6 }]);
        }, { signal });
        ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('is-over'); }));
        ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('is-over'); }));
        zone.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files.length) queueUploads(Array.from(e.dataTransfer.files)); });
      },
    });
  }
  fileInput.addEventListener('change', () => {
    if (uploadSession && fileInput.files.length) queueUploads(Array.from(fileInput.files));
    fileInput.value = '';
  });
  function queueUploads(files) {
    const list = dialog.querySelector('[data-uplist]');
    const status = dialog.querySelector('[data-upstatus]');
    if (!list || !uploadSession) return;
    files.forEach((f) => {
      const row = { id: uid('u'), name: f.name, size: f.size || 1e6, kind: kindFromName(f.name), pct: 0 };
      uploadSession.rows.push(row);
      const el = document.createElement('div');
      el.className = 'up-row';
      el.dataset.row = row.id;
      el.innerHTML = `${icon(KIND_ICON[row.kind])}<div style="min-width:0"><div class="name">${esc(row.name)}</div><div class="progress" role="progressbar" aria-label="Upload progress for ${esc(row.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i style="width:0%"></i></div></div><span class="state num">${fmtSize(row.size)}</span>`;
      list.appendChild(el);
      const total = 1200 + Math.min(2400, row.size / 1e5);
      const t0 = Date.now();
      const tick = setInterval(() => {
        const pct = Math.min(100, Math.round(((Date.now() - t0) / total) * 100));
        const live = dialog.querySelector(`[data-row="${row.id}"]`);
        if (live) {
          live.querySelector('.progress i').style.width = `${pct}%`;
          live.querySelector('.progress').setAttribute('aria-valuenow', String(pct));
          live.querySelector('.state').innerHTML = pct < 100 ? `${pct}%` : `${icon('check-circle')}Added`;
        }
        if (pct >= 100) {
          clearInterval(tick);
          finishUpload(row);
          if (uploadSession) {
            uploadSession.done += 1;
            const s = dialog.querySelector('[data-upstatus]');
            if (s) s.textContent = uploadSession.done === uploadSession.rows.length ? `${plural(uploadSession.done, 'file')} added to ${state.lib.folder ? getItem(state.lib.folder).title : 'Library'}` : `Adding ${uploadSession.done + 1} of ${uploadSession.rows.length}…`;
          }
        }
      }, 120);
    });
    if (status) status.textContent = `Adding 1 of ${uploadSession.rows.length}…`;
  }
  function finishUpload(row) {
    const base = { id: row.id, title: row.name, views: 0, viewers: 0, updated: Date.now(), created: Date.now(), size: row.size, folder: state.lib.folder, status: 'ready', link: { on: false, slug: '', access: 'anyone', expiry: 'never', notify: false }, watched: [], trend: Array(14).fill(0) };
    let item;
    if (row.kind === 'video') item = { ...base, kind: 'video', duration: 90 + (row.size % 240), orientation: 'landscape', seed: 2 + (items.length % 4), status: 'processing' };
    else if (row.kind === 'image') item = { ...base, kind: 'image', w: 1600, h: 900, seed: items.length % 3 };
    else item = { ...base, kind: 'document', pages: 2 + (row.size % 20), seed: items.length % 4 };
    items.unshift(item);
    if (state.view === 'library') { renderCollection(); renderSidebar(); keepFocus(() => renderToolbar()); setSelection(state.lib.selected); }
    if (item.status === 'processing') setTimeout(() => { item.status = 'ready'; if (state.view === 'library') { renderCollection(); setSelection(state.lib.selected); } }, 3500);
  }

  // ---------- Editor ----------
  const SECTION_TYPES = { video: { label: 'Video', icon: 'video' }, text: { label: 'Text', icon: 'type' }, documents: { label: 'Documents', icon: 'files' }, faq: { label: 'FAQ', icon: 'help' }, cta: { label: 'Call to action', icon: 'pointer' } };
  const ACCENTS = [['#2453e3', 'Blue'], ['#0f766e', 'Teal'], ['#6d28d9', 'Violet'], ['#b91c1c', 'Red'], ['#b45309', 'Amber'], ['#18181b', 'Ink']];
  const currentPage = () => pages[state.ed.pageId] || (pages[state.ed.pageId] = defaultPage(state.ed.pageId));
  const pageTitle = () => { const it = getItem(state.ed.pageId); return it ? it.title : 'Page'; };
  const selectedSection = () => currentPage().sections.find((s) => s.id === state.ed.selected) || null;
  function openEditor(id) {
    if (!getItem(id)) return;
    state.ed.pageId = id;
    const page = currentPage();
    state.ed.selected = page.sections[0] ? page.sections[0].id : null;
    state.ed.tab = 'section';
    state.ed.history = [];
    state.ed.future = [];
    state.ed.saveState = 'saved';
    setView('editor');
  }
  function snapshot() {
    return JSON.stringify({ page: currentPage(), title: pageTitle(), published: !!getItem(state.ed.pageId).published, link: getItem(state.ed.pageId).link });
  }
  function restore(snap) {
    const data = JSON.parse(snap);
    pages[state.ed.pageId] = data.page;
    const item = getItem(state.ed.pageId);
    item.title = data.title;
    item.published = data.published;
    item.link = data.link;
    if (!data.page.sections.some((s) => s.id === state.ed.selected)) state.ed.selected = data.page.sections[0] ? data.page.sections[0].id : null;
    renderEditor();
  }
  function pushHistory(snap) {
    state.ed.history.push(snap || snapshot());
    if (state.ed.history.length > 100) state.ed.history.shift();
    state.ed.future = [];
  }
  function undo() {
    if (!state.ed.history.length) return;
    state.ed.future.push(snapshot());
    restore(state.ed.history.pop());
    markSaving();
  }
  function redo() {
    if (!state.ed.future.length) return;
    state.ed.history.push(snapshot());
    restore(state.ed.future.pop());
    markSaving();
  }
  function saveStateHtml() {
    return state.ed.saveState === 'saving' ? '<span class="spinner" aria-hidden="true"></span><span class="label">Saving…</span>' : `${icon('check')}<span class="label">Saved locally</span>`;
  }
  function markSaving() {
    state.ed.saveState = 'saving';
    const el = $('[data-save-state]');
    if (el) el.innerHTML = saveStateHtml();
    clearTimeout(state.ed.saveTimer);
    state.ed.saveTimer = setTimeout(() => {
      state.ed.saveState = 'saved';
      const e2 = $('[data-save-state]');
      if (e2) e2.innerHTML = saveStateHtml();
    }, 700);
  }
  function renderEditor() {
    keepFocus(() => { renderHeader(); renderToolbar(); });
    renderRail();
    renderCanvas();
    renderProps();
    if (state.view === 'editor') syncUrl();
  }
  function setPath(obj, path, value) {
    const parts = path.split('.');
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = value;
  }
  function bindTarget(scope) {
    const page = currentPage();
    const item = getItem(page.id);
    return { sec: selectedSection(), page, theme: page.theme, item, link: item.link }[scope] || null;
  }
  function applyBind(bind, value) {
    const [scope, key] = bind.split(':');
    const target = bindTarget(scope);
    if (!target) return;
    setPath(target, key, value);
    if (scope === 'item' || scope === 'link') getItem(currentPage().id).updated = Date.now();
    renderCanvas();
    if ((scope === 'sec' && key === 'name') || scope === 'item') { renderRail(); keepFocus(() => { renderHeader(); renderToolbar(); }); }
    markSaving();
    if (scope === 'item' && key === 'title') syncUrl();
  }
  function secItemHtml(s) {
    const sel = s.id === state.ed.selected;
    const t = SECTION_TYPES[s.type] || SECTION_TYPES.text;
    return `<div class="sec-item" data-selected="${sel}" data-hidden="${!s.visible}"><button type="button" class="sec-main" role="option" aria-selected="${sel}" data-sec="${s.id}" tabindex="${sel ? 0 : -1}">${icon('grip', 'grip')}${icon(t.icon, 'type')}<span class="name">${esc(s.name)}</span></button><span class="sec-tools"><button type="button" class="iconbtn" data-sec-toggle="${s.id}" aria-label="${s.visible ? 'Hide' : 'Show'} ${esc(s.name)}" aria-pressed="${!s.visible}" data-tip="${s.visible ? 'Hide' : 'Show'}">${icon(s.visible ? 'eye' : 'eye-off')}</button><button type="button" class="iconbtn" data-sec-menu="${s.id}" aria-haspopup="menu" aria-expanded="false" aria-label="Actions for ${esc(s.name)}">${icon('more')}</button></span></div>`;
  }
  function renderRail() {
    const rail = $('#rail');
    if (state.view !== 'editor') { rail.innerHTML = ''; return; }
    const page = currentPage();
    // No rail head: the breadcrumb already carries Library and the page title.
    rail.innerHTML = `<div class="rail-section" id="rail-sections-label">Sections</div>
      <div class="rail-list" role="listbox" aria-labelledby="rail-sections-label">${page.sections.map(secItemHtml).join('')}</div>
      <div class="rail-foot"><button type="button" class="btn btn-secondary btn-block" data-menu="add-section" aria-haspopup="menu" aria-expanded="false">${icon('plus')}<span>Add section</span></button></div>`;
  }
  function sectionHtml(s, page, editable) {
    if (!s.visible && !editable) return '';
    const sel = editable && s.id === state.ed.selected;
    const wrap = (inner) => `<div class="sec${s.type === 'cta' ? ' pg-cta' : ''}" ${editable ? `role="button" tabindex="0" aria-pressed="${sel}" aria-label="${esc(s.name)} section${s.visible ? '' : ', hidden'}" data-sec="${s.id}" data-selected="${sel}"` : ''} data-hidden="${!s.visible}">${editable ? `<span class="sec-label" aria-hidden="true">${esc(s.name)}${s.visible ? '' : ' · hidden'}</span>` : ''}${inner}</div>`;
    switch (s.type) {
      case 'video': {
        const v = s.videoId ? getItem(s.videoId) : null;
        const media = v
          ? `<div class="pg-video${s.layout === 'inset' ? ' inset' : ''}">${thumbSvg(v)}<span class="pg-play" aria-hidden="true">${icon('play')}</span></div>`
          : `<div class="pg-video empty">${editable ? 'Choose a video in the Section panel' : ''}</div>`;
        return wrap(`${page.recipient ? `<p class="pg-eyebrow">For ${esc(page.recipient)}</p>` : ''}<h1 class="pg-h1">${esc(s.heading)}</h1>${s.intro ? `<p class="pg-p" style="margin-bottom:20px">${esc(s.intro)}</p>` : ''}${media}${v ? `<div class="pg-caption">${icon('clock')}<span class="num">${fmtDuration(v.duration)}</span>${s.caption ? `<span aria-hidden="true">·</span><span>${esc(s.caption)}</span>` : ''}</div>` : ''}`);
      }
      case 'text':
        return wrap(`<h2 class="pg-h2">${esc(s.heading)}</h2>${s.body ? `<p class="pg-p">${esc(s.body)}</p>` : ''}<div class="pg-items" style="--cols:${s.columns}">${s.items.map((it, i) => `<div class="pg-item">${s.icons ? `<span class="pg-ico">${icon(['check', 'layers', 'trending', 'sparkle'][i % 4])}</span>` : ''}<b>${esc(it.t)}</b><span>${esc(it.d)}</span></div>`).join('')}</div>`);
      case 'cta':
        return wrap(`<h2 class="pg-h2">${esc(s.heading)}</h2>${s.text ? `<p class="pg-p">${esc(s.text)}</p>` : ''}<span class="pg-btn${s.style === 'secondary' ? ' secondary' : ''}">${icon(s.action === 'call' ? 'calendar' : s.action === 'email' ? 'mail' : 'external')}${esc(s.label || 'Button')}</span>${s.note ? `<p class="pg-note">${esc(s.note)}</p>` : ''}`);
      case 'documents': {
        const docs = (s.docIds || []).map(getItem).filter(Boolean);
        return wrap(`<h2 class="pg-h2">${esc(s.heading)}</h2>${docs.length ? `<div class="pg-files">${docs.map((d) => `<div class="pg-file">${icon(d.kind === 'image' ? 'image' : 'file-text')}<span class="fname">${esc(d.title)}</span><span class="num">${d.pages ? plural(d.pages, 'page') : fmtSize(d.size)}</span></div>`).join('')}</div>` : `<p class="pg-p">${editable ? 'Add documents from the Section panel.' : ''}</p>`}`);
      }
      case 'faq':
        return wrap(`<h2 class="pg-h2">${esc(s.heading)}</h2><div class="pg-faq">${(s.items || []).map((q) => `<div class="pg-q"><span>${esc(q.q)}</span>${icon('chevron-down')}</div>`).join('')}</div>`);
      default:
        return '';
    }
  }
  function pageHtml(page, { editable }) {
    const item = getItem(page.id);
    const t = page.theme;
    const logo = (t.logo || '').trim();
    return `<div class="page" data-dark="${!!t.dark}" data-font="${t.font}" data-radius="${t.radius}" style="--page-accent:${t.accent}">
      <div class="pg-bar"><span class="pg-mark" aria-hidden="true">${esc(logo.charAt(0).toUpperCase() || 'C')}</span><b>${esc(logo || 'Your company')}</b><span>${page.recipient ? `Prepared for ${esc(page.recipient)}${page.company ? ', ' + esc(page.company) : ''}` : ''}</span></div>
      ${page.sections.map((s) => sectionHtml(s, page, editable)).join('')}
      <div class="pg-foot"><span>${esc(item ? item.title : '')}</span><span>Sent by ${ME.name} with Clarity</span></div>
    </div>`;
  }
  function renderCanvas() {
    const c = $('#canvas');
    if (!c) return;
    c.dataset.device = state.ed.device;
    c.innerHTML = pageHtml(currentPage(), { editable: true });
  }
  const F = {
    text: (scope, key, label, value, o = {}) => `<div class="field"><label for="f-${scope}-${key.replace(/\./g, '-')}">${label}</label><input class="input" id="f-${scope}-${key.replace(/\./g, '-')}" type="${o.type || 'text'}" value="${esc(value)}" placeholder="${esc(o.placeholder || '')}" data-bind="${scope}:${key}" ${o.readonly ? 'readonly' : ''}>${o.hint ? `<span class="field-hint">${o.hint}</span>` : ''}</div>`,
    area: (scope, key, label, value, o = {}) => `<div class="field"><label for="f-${scope}-${key}">${label}</label><textarea class="input textarea" id="f-${scope}-${key}" rows="${o.rows || 3}" placeholder="${esc(o.placeholder || '')}" data-bind="${scope}:${key}">${esc(value)}</textarea></div>`,
    seg: (scope, key, label, value, options) => `<div class="field"><span class="field-label" id="l-${scope}-${key}">${label}</span><div class="seg seg-fill" role="group" aria-labelledby="l-${scope}-${key}">${options.map((op) => `<button type="button" aria-pressed="${op.v === value}" data-bind="${scope}:${key}" data-value="${op.v}" data-fk="${scope}:${key}:${op.v}" ${op.tip ? `aria-label="${esc(op.tip)}" data-tip="${esc(op.tip)}"` : ''}>${op.icon ? icon(op.icon) : ''}${op.l ? `<span>${op.l}</span>` : ''}</button>`).join('')}</div></div>`,
    sw: (scope, key, label, value, o = {}) => `<div class="switch-row"><span class="switch-text"><span id="l-${scope}-${key}">${label}</span>${o.hint ? `<small>${o.hint}</small>` : ''}</span><button type="button" class="switch" role="switch" aria-checked="${!!value}" aria-labelledby="l-${scope}-${key}" data-bind="${scope}:${key}" data-value="toggle" data-fk="${scope}:${key}" ${o.disabled ? 'aria-disabled="true"' : ''}></button></div>`,
    section: (title, inner, extra = '') => `<div class="insp-section"><h3>${title}</h3>${inner}${extra}</div>`,
  };
  function sectionProps() {
    const s = selectedSection();
    if (!s) return '<div class="props-empty">Select a section on the canvas or in the list to edit it.</div>';
    const common = F.section('Section', `<div class="fields">${F.text('sec', 'name', 'Name', s.name, { hint: 'Shown in the section list and as the anchor on the page.' })}${F.sw('sec', 'visible', 'Visible', s.visible, { hint: 'Hidden sections stay in the editor but not on the page.' })}</div>`);
    if (s.type === 'video') {
      const v = s.videoId ? getItem(s.videoId) : null;
      return common + F.section('Content', `<div class="fields">${F.text('sec', 'heading', 'Heading', s.heading)}${F.area('sec', 'intro', 'Intro', s.intro)}<div class="field"><span class="field-label" id="l-sec-video">Video</span><button type="button" class="selectbtn" data-menu="pick-video" aria-haspopup="menu" aria-expanded="false" aria-labelledby="l-sec-video l-sec-video-value">${icon('video')}<span class="truncate" id="l-sec-video-value">${v ? esc(v.title) : 'Choose a video'}</span>${icon('chevron-down', 'caret')}</button>${v ? `<span class="field-hint num">${fmtDuration(v.duration)} · ${plural(v.views, 'view')} in the library</span>` : '<span class="field-hint">Any ready video from the library.</span>'}</div>${F.text('sec', 'caption', 'Caption', s.caption, { placeholder: 'Shown under the video' })}</div>`)
        + F.section('Playback', `<div class="fields">${F.seg('sec', 'layout', 'Layout', s.layout, [{ v: 'full', l: 'Full width' }, { v: 'inset', l: 'Inset' }])}${F.sw('sec', 'autoplay', 'Autoplay, muted', s.autoplay)}${F.sw('sec', 'controls', 'Show controls', s.controls)}</div>`);
    }
    if (s.type === 'text') {
      const itemsHtml = s.items.map((it, i) => `<div class="fields" style="padding-top:8px;border-top:1px solid var(--line)"><div class="share-row" style="min-height:24px"><span class="field-label">Item ${i + 1}</span><button type="button" class="iconbtn" data-action="remove-text-item" data-index="${i}" aria-label="Remove item ${i + 1}" ${s.items.length <= 1 ? 'disabled' : ''}>${icon('x')}</button></div>${F.text('sec', `items.${i}.t`, 'Title', it.t)}${F.text('sec', `items.${i}.d`, 'Description', it.d)}</div>`).join('');
      return common + F.section('Content', `<div class="fields">${F.text('sec', 'heading', 'Heading', s.heading)}${F.area('sec', 'body', 'Body', s.body)}</div>`)
        + F.section('Layout', `<div class="fields">${F.seg('sec', 'columns', 'Columns', s.columns, [{ v: 1, l: '1' }, { v: 2, l: '2' }, { v: 3, l: '3' }])}${F.sw('sec', 'icons', 'Show icons', s.icons)}</div>`)
        + F.section('Items', `<div class="fields">${itemsHtml}</div>`, `<button type="button" class="btn btn-sm btn-ghost" style="margin-top:10px" data-action="add-text-item" ${s.items.length >= 4 ? 'disabled' : ''}>${icon('plus')}<span>Add item</span></button>`);
    }
    if (s.type === 'cta') {
      const actionLabel = { call: 'Book a call', link: 'Open a link', email: 'Reply by email' }[s.action];
      return common + F.section('Content', `<div class="fields">${F.text('sec', 'heading', 'Heading', s.heading)}${F.area('sec', 'text', 'Text', s.text, { rows: 2 })}${F.text('sec', 'label', 'Button label', s.label)}<div class="field"><span class="field-label" id="l-sec-action">Action</span><button type="button" class="selectbtn" data-menu="cta-action" aria-haspopup="menu" aria-expanded="false" aria-labelledby="l-sec-action l-sec-action-value">${icon(s.action === 'call' ? 'calendar' : s.action === 'email' ? 'mail' : 'external')}<span id="l-sec-action-value">${actionLabel}</span>${icon('chevron-down', 'caret')}</button></div>${s.action === 'email' ? '' : F.text('sec', 'url', s.action === 'call' ? 'Booking link' : 'Link', s.url, { type: 'url', placeholder: 'https://', hint: s.action === 'call' ? 'Your calendar link. The button opens it in a new tab.' : '' })}${F.text('sec', 'note', 'Note', s.note, { placeholder: 'Small print under the button' })}</div>`)
        + F.section('Style', F.seg('sec', 'style', 'Button', s.style, [{ v: 'primary', l: 'Filled' }, { v: 'secondary', l: 'Outlined' }]));
    }
    if (s.type === 'documents') {
      const docs = (s.docIds || []).map(getItem).filter(Boolean);
      return common + F.section('Content', `<div class="fields">${F.text('sec', 'heading', 'Heading', s.heading)}<div class="field"><span class="field-label">Documents</span>${docs.length ? `<div class="radio-list">${docs.map((d) => `<div class="radio-item" style="color:var(--text)">${icon(d.kind === 'image' ? 'image' : 'file-text')}<span class="truncate">${esc(d.title)}</span><button type="button" class="iconbtn" style="margin-left:auto;width:24px;height:24px" data-action="remove-doc" data-id="${d.id}" aria-label="Remove ${esc(d.title)}">${icon('x')}</button></div>`).join('')}</div>` : '<span class="field-hint">No documents yet.</span>'}</div><button type="button" class="btn btn-sm btn-secondary" data-menu="add-doc" aria-haspopup="menu" aria-expanded="false">${icon('plus')}<span>Add from library</span></button></div>`);
    }
    if (s.type === 'faq') {
      const qs = (s.items || []).map((q, i) => `<div class="field-row" style="grid-template-columns:minmax(0,1fr) auto;align-items:end">${F.text('sec', `items.${i}.q`, `Question ${i + 1}`, q.q)}<button type="button" class="iconbtn iconbtn-md" data-action="remove-faq" data-index="${i}" aria-label="Remove question ${i + 1}">${icon('x')}</button></div>`).join('');
      return common + F.section('Content', `<div class="fields">${F.text('sec', 'heading', 'Heading', s.heading)}${qs}</div>`, `<button type="button" class="btn btn-sm btn-ghost" style="margin-top:10px" data-action="add-faq">${icon('plus')}<span>Add question</span></button>`);
    }
    return common;
  }
  function pageProps() {
    const page = currentPage();
    const item = getItem(page.id);
    const link = item.link;
    // Link settings change in one place, the Share dialog. This tab only reports them.
    const live = link.on && link.slug;
    const status = `${item.published ? '<span class="dot success"></span>Published' : '<span class="dot"></span>Draft'}<span class="sep">·</span>${live ? `Link on, ${link.access === 'email' ? 'email required' : 'anyone with the link'}` : 'No public link'}${live && link.expiry !== 'never' ? `<span class="sep">·</span>Expires ${EXPIRY_LABEL[link.expiry].toLowerCase()}` : ''}`;
    return F.section('Page', `<div class="fields">${F.text('item', 'title', 'Title', item.title, { hint: 'Shown in the browser tab, the library and the page footer.' })}${F.text('page', 'recipient', 'Recipient', page.recipient, { placeholder: 'Who this page is for' })}${F.text('page', 'company', 'Company', page.company)}</div>`)
      + F.section('Sharing', `<div class="status-line">${status}</div>`)
      + F.section('Danger zone', `<button type="button" class="btn btn-danger-quiet" data-action="delete-page">${icon('trash')}<span>Delete page</span></button>`);
  }
  function themeProps() {
    const t = currentPage().theme;
    return F.section('Colour', `<div class="field"><span class="field-label" id="l-theme-accent">Accent</span><div class="chips" role="radiogroup" aria-labelledby="l-theme-accent">${ACCENTS.map(([c, name]) => `<button type="button" class="chip" role="radio" aria-checked="${t.accent === c}" aria-label="${name}" data-tip="${name}" data-bind="theme:accent" data-value="${c}" data-fk="theme:accent:${c}" style="background:${c}">${icon('check')}</button>`).join('')}</div></div><div class="fields" style="margin-top:12px">${F.sw('theme', 'dark', 'Dark page', t.dark, { hint: 'The page itself, not the editor.' })}</div>`)
      + F.section('Type and shape', `<div class="fields">${F.seg('theme', 'font', 'Font', t.font, [{ v: 'sans', l: 'Sans' }, { v: 'serif', l: 'Serif' }])}${F.seg('theme', 'radius', 'Corners', t.radius, [{ v: 'none', l: 'Square' }, { v: 'md', l: 'Rounded' }, { v: 'lg', l: 'Round' }])}</div>`)
      + F.section('Brand', `<div class="fields">${F.text('theme', 'logo', 'Company name', t.logo, { hint: 'Shown in the page header with its initial as the mark.' })}</div>`);
  }
  function renderProps() {
    const p = $('#props');
    if (!p) return;
    const tabs = ['section', 'page', 'theme'].map((k) => `<button type="button" class="tab" role="tab" aria-selected="${state.ed.tab === k}" tabindex="${state.ed.tab === k ? 0 : -1}" data-ptab="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('');
    p.innerHTML = `<div class="props-head"><div class="tabs" role="tablist" aria-label="Properties">${tabs}</div><button type="button" class="iconbtn" data-action="toggle-props" aria-label="Close properties">${icon('x')}</button></div>${state.ed.tab === 'section' ? sectionProps() : state.ed.tab === 'page' ? pageProps() : themeProps()}`;
  }
  function selectSection(id, { focusCanvas = false, focusRail = false } = {}) {
    state.ed.selected = id;
    if (state.ed.tab !== 'section') state.ed.tab = 'section';
    renderRail();
    renderCanvas();
    renderProps();
    keepFocus(() => renderToolbar());
    if (focusCanvas) { const el = $(`#canvas [data-sec="${id}"]`); if (el) el.focus({ preventScroll: false }); }
    if (focusRail) { const el = $(`#rail [data-sec="${id}"]`); if (el) el.focus(); }
  }
  function newSection(type) {
    const base = { id: uid('s'), type, name: SECTION_TYPES[type].label, visible: true };
    switch (type) {
      case 'video': return { ...base, heading: 'A short video for you', intro: '', videoId: null, caption: '', autoplay: false, controls: true, layout: 'full' };
      case 'text': return { ...base, heading: 'Heading', body: '', columns: 3, icons: true, items: [{ t: 'First point', d: 'One sentence of detail.' }, { t: 'Second point', d: 'One sentence of detail.' }, { t: 'Third point', d: 'One sentence of detail.' }] };
      case 'cta': return { ...base, heading: 'Next step', text: '', label: 'Book a call', action: 'call', url: '', style: 'primary', note: '' };
      case 'documents': return { ...base, heading: 'Documents', docIds: [] };
      case 'faq': return { ...base, heading: 'Questions you may have', items: [{ q: 'How long does onboarding take?' }, { q: 'What happens after the trial?' }] };
      default: return base;
    }
  }
  function addSection(type) {
    const page = currentPage();
    pushHistory();
    const s = newSection(type);
    const idx = page.sections.findIndex((x) => x.id === state.ed.selected);
    page.sections.splice(idx < 0 ? page.sections.length : idx + 1, 0, s);
    markSaving();
    selectSection(s.id, { focusRail: true });
    const el = $(`#canvas [data-sec="${s.id}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }
  function sectionMenuEntries(s) {
    const page = currentPage();
    const i = page.sections.indexOf(s);
    return [
      { label: 'Rename', icon: 'pencil', onSelect: () => { selectSection(s.id); state.ed.tab = 'section'; renderProps(); renderToolbar(); setProps(window.innerWidth <= 1000); const f = $('#f-sec-name'); if (f) { f.focus(); f.select(); } } },
      { label: s.visible ? 'Hide' : 'Show', icon: s.visible ? 'eye-off' : 'eye', onSelect: () => toggleSectionVisible(s) },
      { sep: true },
      { label: 'Move up', icon: 'arrow-up', disabled: i === 0, kbd: '⌥↑', onSelect: () => moveSection(s, -1) },
      { label: 'Move down', icon: 'arrow-down', disabled: i === page.sections.length - 1, kbd: '⌥↓', onSelect: () => moveSection(s, 1) },
      { label: 'Duplicate', icon: 'copy', onSelect: () => { pushHistory(); const copy = JSON.parse(JSON.stringify(s)); copy.id = uid('s'); copy.name = `${s.name} copy`; page.sections.splice(i + 1, 0, copy); markSaving(); selectSection(copy.id, { focusRail: true }); } },
      { sep: true },
      { label: 'Delete section', icon: 'trash', danger: true, kbd: '⌫', disabled: page.sections.length <= 1, onSelect: () => deleteSection(s) },
    ];
  }
  function toggleSectionVisible(s) {
    pushHistory();
    s.visible = !s.visible;
    markSaving();
    renderRail();
    renderCanvas();
    renderProps();
    const b = $(`#rail [data-sec-toggle="${s.id}"]`);
    if (b) b.focus();
  }
  function moveSection(s, delta) {
    const page = currentPage();
    const i = page.sections.indexOf(s);
    const j = i + delta;
    if (j < 0 || j >= page.sections.length) return;
    pushHistory();
    page.sections.splice(i, 1);
    page.sections.splice(j, 0, s);
    markSaving();
    selectSection(s.id, { focusRail: true });
  }
  function deleteSection(s) {
    const page = currentPage();
    if (page.sections.length <= 1) return;
    pushHistory();
    const i = page.sections.indexOf(s);
    page.sections.splice(i, 1);
    const next = page.sections[Math.min(i, page.sections.length - 1)];
    markSaving();
    selectSection(next.id, { focusRail: true });
    toast(`Deleted “${s.name}”`, { icon: 'trash', action: { label: 'Undo', fn: undo } });
  }
  function openPreview() {
    let device = state.ed.device;
    openDialog({
      title: `Preview: ${esc(pageTitle())}`,
      wide: true,
      headExtra: `<div class="seg" role="group" aria-label="Preview device" style="margin-top:-4px"><button type="button" data-pdev="desktop" aria-pressed="${device === 'desktop'}" aria-label="Desktop">${icon('monitor')}</button><button type="button" data-pdev="phone" aria-pressed="${device === 'phone'}" aria-label="Phone">${icon('phone')}</button></div>`,
      body: `<div style="margin:0 -20px -20px"><div class="preview-frame" data-device="${device}" data-preview-frame>${pageHtml(currentPage(), { editable: false })}</div></div>`,
      foot: `<span class="left">${icon('eye')}What a recipient sees. Links and the video are inert here.</span><button type="button" class="btn btn-secondary" data-action="share-page">${icon('share')}<span>Share</span></button><button type="button" class="btn btn-primary" data-close>Done</button>`,
      initialFocus: '.dlg-foot .btn-primary',
      onOpen: (d, signal) => {
        d.addEventListener('click', (e) => {
          const b = e.target.closest('[data-pdev]');
          if (!b) return;
          e.stopPropagation();
          device = b.dataset.pdev;
          $$('[data-pdev]', d).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          d.querySelector('[data-preview-frame]').dataset.device = device;
        }, { signal });
      },
    });
  }

  // ---------- System page samples ----------
  const TOKEN_ROLES = [
    ['bg', 'Page', 'Content surface'], ['bg-sunken', 'Sunken', 'Sidebar, canvas, read-only fields'], ['bg-hover', 'Hover', 'Rows, cards, ghost buttons'], ['bg-active', 'Active', 'Current nav item, pressed segment, thumb base'], ['bg-pressed', 'Pressed', 'Secondary and ghost buttons while pressed'], ['bg-selected', 'Selected', 'Selected rows and cards'], ['bg-selected-hover', 'Selected hover', 'Selected rows under the pointer'], ['bg-raised', 'Raised', 'Menu, popover, dialog'],
    ['line', 'Line', 'Hairlines between regions and rows'], ['line-strong', 'Line strong', 'Secondary buttons, segments, overlays'], ['line-field', 'Line field', 'Inputs, checkbox, switch track, at 3:1'],
    ['text', 'Text', 'Titles, values, primary labels'], ['text-2', 'Text 2', 'Body in panels, secondary labels'], ['text-3', 'Text 3', 'Meta, hints, column heads, at 4.5:1'], ['text-disabled', 'Disabled', 'Disabled controls only'],
    ['accent', 'Accent', 'Selection, focus ring, checked, links'], ['accent-hover', 'Accent hover', 'Links under the pointer'], ['ink', 'Ink', 'Primary button, workspace mark, canvas section chip'], ['ink-hover', 'Ink hover', 'Primary button under the pointer'], ['ink-pressed', 'Ink pressed', 'Primary button while pressed'],
    ['float-bg', 'Float', 'Tooltip and toast; dark in both schemes'], ['float-text', 'Float text', 'Text on the float surface'], ['float-line', 'Float line', 'Edge of tooltip and toast; invisible in light'],
    ['danger', 'Danger', 'Delete, errors'], ['success', 'Success', 'Published, link on'], ['warning', 'Warning', 'Expiring soon, simulated marker'], ['rec', 'Record', 'The record dot only'],
  ];
  const TOKENS = {
    light: { bg: '#ffffff', 'bg-sunken': '#f8f8f9', 'bg-hover': '#f3f3f5', 'bg-active': '#ebebee', 'bg-pressed': '#e2e2e6', 'bg-selected': '#eef2fe', 'bg-selected-hover': '#e4ebfd', 'bg-raised': '#ffffff', line: '#e9e9ec', 'line-strong': '#d4d4d9', 'line-field': '#929299', text: '#18181b', 'text-2': '#52525b', 'text-3': '#65656e', 'text-disabled': '#a3a3ac', accent: '#2453e3', 'accent-hover': '#1d47c9', ink: '#18181b', 'ink-hover': '#2c2c31', 'ink-pressed': '#000000', 'float-bg': '#18181b', 'float-text': '#ffffff', 'float-line': '#18181b', danger: '#c4281c', success: '#1a7f4b', warning: '#a15c07', rec: '#e5342a' },
    dark: { bg: '#0e0e10', 'bg-sunken': '#09090b', 'bg-hover': '#17171a', 'bg-active': '#1f1f23', 'bg-pressed': '#27272c', 'bg-selected': '#162140', 'bg-selected-hover': '#1b2950', 'bg-raised': '#19191c', line: '#222226', 'line-strong': '#34343a', 'line-field': '#5f5f66', text: '#ededf0', 'text-2': '#aeaeb6', 'text-3': '#96969f', 'text-disabled': '#55555d', accent: '#7c9eff', 'accent-hover': '#93afff', ink: '#ededf0', 'ink-hover': '#ffffff', 'ink-pressed': '#d6d6db', 'float-bg': '#19191c', 'float-text': '#ededf0', 'float-line': '#34343a', danger: '#ff6b5e', success: '#4cc38a', warning: '#e5a13a', rec: '#ff4d42' },
  };
  const SIM = { Hover: 'sim-hover', Pressed: 'sim-active', Focus: 'sim-focus' };
  const stateTag = (kind) => `<span class="tag ${kind === 'sim' ? 'warning' : 'success'}"><i class="dot"></i>${kind === 'sim' ? 'Simulated' : 'Actual'}</span>`;
  const inert = (entries) => entries.map((e) => (e.sep || e.heading ? e : { ...e, onSelect: () => toast(`“${e.label}” is inert on this page`, { icon: 'info' }) }));
  const sampleize = (html) => html.replace(/data-item-menu=/g, 'data-sample-menu=').replace(/data-check=/g, 'data-sample-check=').replace(/data-check-all/g, 'data-sample-check-all').replace(/data-sort=/g, 'data-sample-sort=');
  function matrixHead(cols) {
    return `<div class="mx head"></div>${cols.map(([l, k]) => `<div class="mx head">${l}${stateTag(k)}</div>`).join('')}`;
  }
  function buttonMatrix() {
    const cols = [['Default', 'actual'], ['Hover', 'sim'], ['Pressed', 'sim'], ['Focus', 'sim'], ['Disabled', 'actual'], ['Busy', 'actual']];
    const variants = [['Primary', 'btn-primary', 'plus', 'New page'], ['Secondary', 'btn-secondary', 'upload', 'Upload'], ['Ghost', 'btn-ghost', 'sliders', 'Display'], ['Danger', 'btn-danger', 'trash', 'Delete'], ['Danger quiet', 'btn-danger-quiet', 'trash', 'Delete page']];
    const attrs = (st) => (st === 'Disabled' ? 'disabled' : st === 'Busy' ? 'aria-busy="true"' : '');
    const rows = variants.map(([name, cls, ic, label]) => `<div class="mx rowhead">${name}</div>${cols.map(([st]) => `<div class="mx"><button type="button" class="btn ${cls} ${SIM[st] || ''}" ${attrs(st)}>${icon(ic)}<span>${label}</span></button></div>`).join('')}`).join('');
    const iconRow = `<div class="mx rowhead">Icon button</div>${cols.map(([st]) => `<div class="mx">${st === 'Busy' ? `<button type="button" class="iconbtn iconbtn-md" aria-busy="true" aria-label="Working"><span class="spinner"></span></button>` : `<button type="button" class="iconbtn iconbtn-md ${SIM[st] || ''}" ${attrs(st)} aria-label="Share">${icon('share')}</button>`}</div>`).join('')}`;
    return matrixHead(cols) + rows + iconRow;
  }
  function fieldMatrix() {
    const cols = [['Default', 'actual'], ['Hover', 'sim'], ['Focus', 'sim'], ['Error', 'actual'], ['Disabled', 'actual'], ['Read-only', 'actual']];
    const inputRow = `<div class="mx rowhead">Input</div>${cols.map(([st]) => `<div class="mx"><input class="input ${SIM[st] || ''}" type="text" value="Welcome to your proposal" aria-label="Sample ${st}" ${st === 'Error' ? 'aria-invalid="true"' : st === 'Disabled' ? 'disabled' : st === 'Read-only' ? 'readonly' : ''}></div>`).join('')}`;
    const searchRow = `<div class="mx rowhead">Search</div>${cols.map(([st]) => `<div class="mx"><div class="search ${SIM[st] || ''}" style="width:160px" ${st === 'Error' ? 'aria-invalid="true"' : ''}>${icon('search')}<input type="search" placeholder="Search" aria-label="Sample search ${st}" ${st === 'Disabled' ? 'disabled' : st === 'Read-only' ? 'readonly value="proposal"' : ''}><span class="kbd" aria-hidden="true">/</span></div></div>`).join('')}`;
    const selectRow = `<div class="mx rowhead">Select</div>${cols.map(([st]) => `<div class="mx">${st === 'Error' || st === 'Read-only' ? '<span class="sys-note">n/a</span>' : `<button type="button" class="selectbtn ${SIM[st] || ''}" style="width:160px" ${st === 'Disabled' ? 'disabled' : ''}>${icon('calendar')}<span>Never</span>${icon('chevron-down', 'caret')}</button>`}</div>`).join('')}`;
    return matrixHead(cols) + inputRow + searchRow + selectRow;
  }
  function selectionMatrix() {
    const cols = [['Default', 'actual'], ['Hover', 'sim'], ['Checked', 'actual'], ['Mixed', 'actual'], ['Focus', 'sim'], ['Disabled', 'actual']];
    const check = (st) => `<div class="mx"><button type="button" class="check ${SIM[st] || ''}" role="checkbox" aria-checked="${st === 'Checked' ? 'true' : st === 'Mixed' ? 'mixed' : 'false'}" aria-label="Sample checkbox ${st}" ${st === 'Disabled' ? 'disabled' : ''} data-toggle>${icon(st === 'Mixed' ? 'minus' : 'check')}</button></div>`;
    const sw = (st) => `<div class="mx">${st === 'Mixed' ? '<span class="sys-note">n/a</span>' : `<button type="button" class="switch ${SIM[st] || ''}" role="switch" aria-checked="${st === 'Checked'}" aria-label="Sample switch ${st}" ${st === 'Disabled' ? 'disabled' : ''} data-toggle></button>`}</div>`;
    const tab = (st) => `<div class="mx">${st === 'Mixed' ? '<span class="sys-note">n/a</span>' : `<div class="tabs tabs-inline" style="padding:0"><button type="button" class="tab ${SIM[st] || ''}" role="tab" aria-selected="${st === 'Checked'}" ${st === 'Disabled' ? 'aria-disabled="true"' : ''}>Videos <span class="count">4</span></button></div>`}</div>`;
    return matrixHead(cols) + `<div class="mx rowhead">Checkbox</div>${cols.map(([st]) => check(st)).join('')}<div class="mx rowhead">Switch</div>${cols.map(([st]) => sw(st)).join('')}<div class="mx rowhead">Tab</div>${cols.map(([st]) => tab(st)).join('')}`;
  }
  function shareFrame(mode) {
    const d1 = getItem('d1') || items[0];
    const sample = { ...d1, link: { ...d1.link, slug: mode === 'empty' ? '' : 'project-brief-k3d9', on: true } };
    return `<div class="dlg-head"><h2>Share “${esc(sample.title)}”</h2><button type="button" class="iconbtn iconbtn-md" aria-label="Close" tabindex="-1">${icon('x')}</button></div><div class="dlg-body">${shareBodyHtml(sample, mode)}</div><div class="dlg-foot">${shareFootHtml(mode).replace(/data-mode=/g, 'data-sample-mode=').replace('data-close', 'tabindex="-1"')}</div>`;
  }
  function renderSystemSamples(root) {
    const fill = (name, html) => { const el = root.querySelector(`[data-spec="${name}"]`); if (el) el.innerHTML = html; };
    ['light', 'dark'].forEach((scheme) => fill(`tokens-${scheme}`, TOKEN_ROLES.map(([key, name, use]) => `<div class="swatch"><i style="background:${TOKENS[scheme][key]}"></i><span class="role">${name}<small>${use}</small></span><code>${TOKENS[scheme][key]}</code></div>`).join('')));
    fill('thumb-sample', thumbSvg(getItem('v1')));
    fill('button-matrix', buttonMatrix());
    fill('field-matrix', fieldMatrix());
    fill('selection-matrix', selectionMatrix());
    fill('radio-list', [['Library', 'library'], ['Brand assets', 'folder']].map(([l, ic], i) => `<button type="button" class="radio-item" role="radio" aria-checked="${i === 1}" data-sample-radio>${icon(ic)}<span>${l}</span><span class="radio-check">${icon('check')}</span></button>`).join(''));
    fill('menu-sample', `<div class="menu" role="menu" aria-label="Sample menu">${menuHtml([
      { label: 'Create Journey Page', icon: 'page' },
      { label: 'Details, hover', icon: 'panel-right', sim: 'sim-hover' },
      { label: 'Rename, focus', icon: 'pencil', sim: 'sim-focus' },
      { heading: 'Sort by' },
      { label: 'Last updated', checked: true },
      { label: 'Name', checked: false },
      { sep: true },
      { label: 'Download', icon: 'download', disabled: true, right: 'Prototype' },
      { label: 'Delete', icon: 'trash', danger: true, kbd: '⌫' },
    ])}</div>`);
    fill('share-empty', shareFrame('empty'));
    fill('share-loading', shareFrame('loading'));
    fill('share-error', shareFrame('error'));
    const six = ['v1', 'p1', 'v2', 'd1', 'f1', 'v3'].map(getItem).filter(Boolean);
    const listSample = (density, sel, hov) => sampleize(`<div class="collection" data-view="list" data-density="${density}" data-selected="${sel >= 0}"><div class="list" role="listbox" aria-label="Sample list, ${density}">${listHeadHtml()}${six.map((it, i) => rowHtml(it, { selected: i === sel, sim: i === hov ? 'sim-hover' : '' })).join('')}</div></div>`);
    fill('list-compact', listSample('compact', -1, -1));
    fill('list-default', listSample('default', 1, 2));
    fill('grid-default', sampleize(`<div class="collection" data-view="grid" data-density="default"><div class="grid" role="listbox" aria-label="Sample grid">${six.map((it, i) => cardHtml(it, { selected: i === 1, sim: i === 2 ? 'sim-hover' : '' })).join('')}</div></div>`));
    const v4 = STRESS_ITEM;
    fill('long-title', sampleize(`<div class="collection" data-view="list" data-density="default"><div class="list" role="listbox" aria-label="Long title row">${rowHtml(v4, { selected: false })}</div></div><div class="collection" data-view="grid" data-density="default"><div class="grid" role="listbox" aria-label="Long title card" style="grid-template-columns:240px">${cardHtml(v4, { selected: false })}</div></div><div class="insp-section"><h3>Inspector title wraps</h3><p class="insp-title">${esc(v4.title)}</p><div class="insp-meta"><span>Video</span><span class="sep">·</span><span class="num">${fmtDuration(v4.duration)}</span></div></div>`));
    fill('empty-search', `<div class="collection"><div class="collection-inner" style="min-height:220px">${emptyHtml('search', { query: 'northstar proposal q4' }).replace('data-action="clear-search"', 'data-sample-clear')}</div></div>`);
    const skelRow = `<div class="skel-row"><span class="skeleton" style="width:16px;height:16px;border-radius:4px"></span><span class="skeleton skel-line w-60"></span><span class="skeleton skel-line"></span><span class="skeleton skel-line w-80"></span></div>`;
    fill('loading', `<div class="collection" aria-busy="true" aria-label="Loading items">${skelRow}${skelRow}${skelRow}</div><div class="row-of" style="padding:12px;align-items:flex-start;gap:16px"><div class="skel-card" style="width:220px"><span class="skeleton skel-thumb"></span><span class="skeleton skel-line w-80"></span><span class="skeleton skel-line w-40"></span></div><button type="button" class="btn btn-primary" aria-busy="true">${icon('share')}<span>Share</span></button></div>`);
    fill('errors', `<div style="display:flex;flex-direction:column;gap:12px;padding:12px"><div class="alert danger" role="alert">${icon('alert')}<div class="alert-text"><b>Couldn't load viewers</b>The list is unchanged. Retry, or open the page later.</div><button type="button" class="btn btn-sm btn-secondary" data-action="demo-retry">${icon('refresh')}<span>Retry</span></button></div><div class="field"><label for="sys-err-2">Booking link</label><input class="input" id="sys-err-2" type="url" value="cal.example/alex" aria-invalid="true" aria-describedby="sys-err-2-msg"><span class="field-error" id="sys-err-2-msg">${icon('alert')}Enter a full address starting with https://.</span></div><div class="alert warning">${icon('warning')}<div class="alert-text"><b>Processing failed for “Kickoff recording.mp4”</b>The file was kept. Upload it again or contact support.</div><button type="button" class="btn btn-sm btn-secondary" data-action="upload">${icon('upload')}<span>Upload again</span></button></div></div>`);
    fill('icons', $$('symbol').map((s) => s.id.replace(/^i-/, '')).map((name) => `<div>${icon(name)}<span>${name}</span></div>`).join(''));
  }

  // ---------- Menus by name ----------
  function menuFor(name, anchor) {
    const sel = state.lib.selected;
    switch (name) {
      case 'workspace': return [{ label: 'Clarity sample', checked: true }, { label: 'Northwind demo', checked: false, disabled: true, right: 'Prototype' }, { sep: true }, { label: 'Workspace settings', icon: 'settings', disabled: true, right: 'Prototype' }, { label: 'Invite teammates', icon: 'users', disabled: true, right: 'Prototype' }];
      case 'user': return [{ label: 'Account settings', icon: 'settings', disabled: true, right: 'Prototype' }, { label: 'Sign out', icon: 'log-out', disabled: true, right: 'No session' }];
      case 'new': return [{ label: 'Journey Page', icon: 'page', onSelect: () => createPage() }, { label: 'Folder', icon: 'folder-plus', onSelect: openNewFolder }];
      case 'create': return [{ label: 'Record', icon: 'video', onSelect: openRecord }, { label: 'Upload', icon: 'upload', onSelect: openUpload }, { sep: true }, { label: 'Journey Page', icon: 'page', onSelect: () => createPage() }, { label: 'Folder', icon: 'folder-plus', onSelect: openNewFolder }];
      case 'selection': return sel.length ? selectionMenuEntries() : [{ label: 'Nothing selected', disabled: true }];
      case 'add-section': return Object.keys(SECTION_TYPES).map((k) => ({ label: SECTION_TYPES[k].label, icon: SECTION_TYPES[k].icon, onSelect: () => addSection(k) }));
      case 'pick-video': {
        const s = selectedSection();
        const vids = items.filter((i) => i.kind === 'video' && i.status === 'ready');
        return [...vids.map((v) => ({ label: v.title, icon: 'video', right: fmtDuration(v.duration), checked: s && s.videoId === v.id, onSelect: () => { pushHistory(); applyBind('sec:videoId', v.id); renderProps(); } })), { sep: true }, { label: 'No video', checked: !!s && !s.videoId, onSelect: () => { pushHistory(); applyBind('sec:videoId', null); renderProps(); } }, { label: 'Record a new one', icon: 'video', onSelect: openRecord }];
      }
      case 'cta-action': {
        const s = selectedSection();
        return [['call', 'Book a call', 'calendar'], ['link', 'Open a link', 'external'], ['email', 'Reply by email', 'mail']].map(([v, l, ic]) => ({ label: l, icon: ic, checked: !!s && s.action === v, onSelect: () => { pushHistory(); applyBind('sec:action', v); renderProps(); } }));
      }
      case 'add-doc': {
        const s = selectedSection();
        if (!s) return [{ label: 'Select a documents section first', disabled: true }];
        const docs = items.filter((i) => (i.kind === 'document' || i.kind === 'image') && !(s.docIds || []).includes(i.id));
        return docs.length ? docs.map((d) => ({ label: d.title, icon: d.kind === 'image' ? 'image' : 'file-text', right: d.pages ? plural(d.pages, 'page') : fmtSize(d.size), onSelect: () => { pushHistory(); s.docIds = [...(s.docIds || []), d.id]; markSaving(); renderCanvas(); renderProps(); } })) : [{ label: 'Every document is already added', disabled: true }];
      }
      case 'sys-item': return inert(itemMenuEntries(getItem('v1') || items[0]));
      case 'sys-sort': return SORTS.map(([k, l]) => ({ label: l, checked: state.lib.sort === k, onSelect: () => { state.lib.sort = k; toast(`Library sorted by ${l.toLowerCase()}`); } }));
      case 'sys-expiry':
      case 'expiry': {
        const span = anchor.querySelector('span');
        const labelFor = (k) => (k === 'never' ? 'Never expires' : EXPIRY_LABEL[k]);
        return Object.keys(EXPIRY_LABEL).map((k) => ({ label: labelFor(k), checked: !!span && span.textContent === labelFor(k), onSelect: () => { if (span) span.textContent = labelFor(k); } }));
      }
      default: return [{ label: 'No actions', disabled: true }];
    }
  }
  function confirmDeletePage() {
    const item = getItem(state.ed.pageId);
    openDialog({
      title: `Delete “${esc(item.title)}”?`,
      body: '<p>The page and its public link stop working. In this prototype you can undo from the toast.</p>',
      foot: `<button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="button" class="btn btn-danger" data-act="delete">${icon('trash')}<span>Delete page</span></button>`,
      initialFocus: '[data-close]',
      onOpen: (d) => d.querySelector('[data-act="delete"]').addEventListener('click', () => { closeDialog('delete'); setView('library'); removeItems([item.id]); }),
    });
  }
  // One sort list, shared by the column headers, the Display popover and the system page.
  const SORTS = [['name', 'Name', 'type'], ['length', 'Length', 'clock'], ['updated', 'Updated', 'calendar'], ['views', 'Views', 'eye']];
  function openDisplayPopover(anchor) {
    const html = `<div class="pop-section"><div class="field"><span class="field-label" id="pop-density">Density</span><div class="seg seg-fill" role="group" aria-labelledby="pop-density">${['default', 'compact'].map((d) => `<button type="button" data-density="${d}" aria-pressed="${state.lib.density === d}">${d[0].toUpperCase() + d.slice(1)}</button>`).join('')}</div></div></div>
      <div class="pop-section"><span class="field-label" id="pop-sort">Sort by</span><div class="radio-list" role="radiogroup" aria-labelledby="pop-sort">${SORTS.map(([k, l, ic]) => `<button type="button" class="radio-item" role="radio" aria-checked="${state.lib.sort === k}" data-pop-sort="${k}">${icon(ic)}<span>${l}</span><span class="radio-check">${icon('check')}</span></button>`).join('')}</div></div>
      <div class="pop-section"><button type="button" class="toggle-row" role="switch" aria-checked="${state.lib.foldersFirst}" data-pop-folders><span>Folders first</span><span class="switch" aria-hidden="true" aria-checked="${state.lib.foldersFirst}"></span></button></div>`;
    const el = openPopover(anchor, html, { label: 'Display options', align: 'end' });
    if (!el) return;
    el.addEventListener('click', (e) => {
      const d = e.target.closest('[data-density]');
      const s = e.target.closest('[data-pop-sort]');
      const f = e.target.closest('[data-pop-folders]');
      if (!d && !s && !f) return;
      e.stopPropagation();
      if (d) { state.lib.density = d.dataset.density; $$('[data-density]', el).forEach((b) => b.setAttribute('aria-pressed', String(b === d))); }
      if (s) { state.lib.sort = s.dataset.popSort; $$('[data-pop-sort]', el).forEach((b) => b.setAttribute('aria-checked', String(b === s))); }
      if (f) { state.lib.foldersFirst = !state.lib.foldersFirst; f.setAttribute('aria-checked', String(state.lib.foldersFirst)); f.querySelector('.switch').setAttribute('aria-checked', String(state.lib.foldersFirst)); }
      renderCollection();
    });
  }

  // ---------- Actions ----------
  function toggleSelect(id) {
    const s = state.lib.selected.includes(id) ? state.lib.selected.filter((x) => x !== id) : [...state.lib.selected, id];
    setSelection(s, { anchor: id });
  }
  function handleAction(name, el) {
    const sel = state.lib.selected;
    const one = sel.length === 1 ? getItem(sel[0]) : null;
    switch (name) {
      case 'nav-library': setView('library'); break;
      case 'nav-editor': { if (!getItem(state.ed.pageId)) { const p = items.find((i) => i.kind === 'page'); if (p) state.ed.pageId = p.id; else { createPage(); break; } } openEditor(state.ed.pageId); break; }
      case 'nav-system': setView('system'); break;
      case 'nav-stub': toast(`${el.dataset.name} is outside this review`, { icon: 'info' }); break;
      case 'go-root': state.lib.folder = null; state.lib.selected = []; render(); break;
      case 'tree-folder': state.lib.folder = el.dataset.id; state.lib.query = ''; state.lib.selected = []; state.treeOpen[el.dataset.id] = true; if (state.view !== 'library') setView('library'); else render(); setDrawer(false); break;
      case 'tree-toggle': state.treeOpen[el.dataset.id] = !state.treeOpen[el.dataset.id]; renderSidebar(); { const b = $(`#sidebar [data-action="tree-folder"][data-id="${el.dataset.id}"]`); if (b) b.focus(); } break;
      case 'tree-item': { const it = getItem(el.dataset.id); if (!it) break; if (it.kind === 'page') { openEditor(it.id); break; } state.lib.folder = it.folder; state.lib.query = ''; state.lib.selected = [it.id]; if (state.view !== 'library') setView('library'); else render(); setDrawer(false); break; }
      case 'new-page': createPage(); break;
      case 'theme': applyTheme(state.theme === 'dark' ? 'light' : 'dark'); syncUrl(); break;
      case 'help': toast('Help is outside this review', { icon: 'info' }); break;
      case 'collapse-sidebar': state.sidebarCollapsed = !state.sidebarCollapsed; app.dataset.sidebar = state.sidebarCollapsed ? 'collapsed' : 'open'; renderHeader(); { const b = $(`${state.sidebarCollapsed ? '#header' : '#sidebar'} [data-action="collapse-sidebar"]`); if (b) b.focus(); } break;
      case 'drawer': setDrawer(true); { const first = state.view === 'editor' ? $('#rail [data-sec][aria-selected="true"]') || $('#rail button') : $('#sidebar button'); if (first) first.focus(); } break;
      case 'search-toggle': state.lib.searchOpen = !state.lib.searchOpen; renderToolbar(); { const i = $('#lib-search-m'); if (i) i.focus(); else { const b = $('[data-action="search-toggle"]'); if (b) b.focus(); } } break;
      case 'search-close': state.lib.searchOpen = false; renderToolbar(); { const b = $('[data-action="search-toggle"]'); if (b) b.focus(); } break;
      case 'clear-search': state.lib.query = ''; renderHeader(); renderToolbar(); renderCollection(); { const i = $('#lib-search-m') || $('#lib-search'); if (i) i.focus(); } break;
      case 'upload': openUpload(); break;
      case 'record': openRecord(); break;
      case 'share-selected': if (one && one.kind !== 'folder') openShare(one, { opener: el }); break;
      case 'open-selected': if (one) openItem(one); break;
      case 'share-item': { const it = getItem(el.dataset.id); if (it) openShare(it, { opener: dialogState ? dialogState.opener : el }); break; }
      case 'clear-selection': setSelection([]); break;
      case 'toggle-inspector': state.lib.inspector = !state.lib.inspector; keepFocus(() => renderToolbar()); renderInspector(); break;
      case 'viewer': { const it = getItem(el.dataset.id); if (it) openViewer(it); break; }
      case 'open-item': { const it = getItem(el.dataset.id); if (it) openItem(it); break; }
      case 'preview': openPreview(); break;
      case 'share-page': openShare(getItem(state.ed.pageId), { opener: dialogState ? dialogState.opener : el }); break;
      case 'undo': undo(); break;
      case 'redo': redo(); break;
      case 'toggle-props': setProps(!state.props); { if (state.props) { const t = $('#props .props-head .tab[aria-selected="true"]') || $('#props .props-head .tab'); if (t) t.focus(); } else { const b = $('#toolbar [data-action="toggle-props"]'); if (b) b.focus(); } } break;
      case 'add-text-item': { const s = selectedSection(); if (!s || s.items.length >= 4) break; pushHistory(); s.items.push({ t: 'New point', d: 'One sentence of detail.' }); markSaving(); renderCanvas(); renderProps(); { const f = $(`#f-sec-items-${s.items.length - 1}-t`); if (f) { f.focus(); f.select(); } } break; }
      case 'remove-text-item': { const s = selectedSection(); if (!s || s.items.length <= 1) break; pushHistory(); s.items.splice(+el.dataset.index, 1); markSaving(); renderCanvas(); renderProps(); { const b = $('[data-action="add-text-item"]'); if (b) b.focus(); } break; }
      case 'remove-doc': { const s = selectedSection(); if (!s) break; pushHistory(); s.docIds = (s.docIds || []).filter((id) => id !== el.dataset.id); markSaving(); renderCanvas(); renderProps(); { const b = $('[data-menu="add-doc"]'); if (b) b.focus(); } break; }
      case 'add-faq': { const s = selectedSection(); if (!s) break; pushHistory(); s.items = [...(s.items || []), { q: 'New question' }]; markSaving(); renderCanvas(); renderProps(); { const f = $(`#f-sec-items-${s.items.length - 1}-q`); if (f) { f.focus(); f.select(); } } break; }
      case 'remove-faq': { const s = selectedSection(); if (!s) break; pushHistory(); s.items.splice(+el.dataset.index, 1); markSaving(); renderCanvas(); renderProps(); { const b = $('[data-action="add-faq"]'); if (b) b.focus(); } break; }
      case 'delete-page': confirmDeletePage(); break;
      case 'rec-stop': stopRecording(); break;
      case 'rec-cancel': stopRecording(true); toast('Recording discarded', { icon: 'trash' }); break;
      case 'demo-toast': toast('Moved to Brand assets'); break;
      case 'demo-toast-undo': toast('Deleted “Project brief.pdf”', { icon: 'trash', action: { label: 'Undo', fn: () => toast('Restored “Project brief.pdf”') } }); break;
      case 'demo-share': openShare(getItem('p1') || items.find((i) => i.kind !== 'folder'), { opener: el }); break;
      case 'demo-confirm': openDialog({ title: 'Delete “Project brief.pdf”?', body: '<p>In the real product deleted items stay in Trash for 30 days. This sample dialog deletes nothing.</p>', foot: `<button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="button" class="btn btn-danger" data-close>${icon('trash')}<span>Delete</span></button>`, initialFocus: '[data-close]' }); break;
      case 'demo-retry': el.setAttribute('aria-busy', 'true'); setTimeout(() => { el.removeAttribute('aria-busy'); toast('Sample retry finished. The live share dialog has a working Retry.', { icon: 'info', duration: 4000 }); }, 900); break;
      default: break;
    }
  }

  // ---------- Event wiring ----------
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const el = t.closest('[data-action],[data-menu],[data-popover],[data-filter],[data-layout],[data-sort],[data-check],[data-check-all],[data-item-menu],[data-sample-menu],[data-ptab],[data-device],[data-sec],[data-sec-toggle],[data-sec-menu],[data-bind],[data-open-media],[data-toggle],[data-seg] > button,[data-tabs] .tab,[data-sample-radio],[data-sample-clear]');
    if (!el) return;
    const ds = el.dataset;
    if (ds.action) { handleAction(ds.action, el, e); return; }
    if (ds.menu) { openMenu(el, menuFor(ds.menu, el), { label: ds.menu.replace(/-/g, ' '), align: /^(selection|page|user|workspace|sys-item)$/.test(ds.menu) || el.closest('.header-actions') ? 'end' : 'start' }); return; }
    if (ds.popover) { openDisplayPopover(el); return; }
    if (ds.filter) { state.lib.filter = ds.filter; state.lib.selected = state.lib.selected.filter((id) => visibleItems().some((i) => i.id === id)); keepFocus(() => renderToolbar()); renderCollection(); renderInspector(); return; }
    if (ds.layout) { state.lib.view = ds.layout; keepFocus(() => renderToolbar()); renderCollection(); return; }
    if (ds.sort) { state.lib.sort = ds.sort; renderCollection(); { const b = $(`#collection [data-sort="${ds.sort}"]`); if (b) b.focus(); } return; }
    if (ds.checkAll !== undefined) { const all = visibleItems().map((i) => i.id); const every = all.every((id) => state.lib.selected.includes(id)); setSelection(every ? [] : all); { const b = $('#collection [data-check-all]'); if (b) b.focus(); } return; }
    if (ds.check) { if (e.shiftKey) selectRange(ds.check); else toggleSelect(ds.check); { const b = $(`#collection [data-check="${ds.check}"]`); if (b) b.focus(); } return; }
    if (ds.itemMenu) { const it = getItem(ds.itemMenu); if (it) openMenu(el, itemMenuEntries(it), { label: `Actions for ${it.title}`, align: 'end' }); return; }
    if (ds.sampleMenu) { const it = getItem(ds.sampleMenu); if (it) openMenu(el, inert(itemMenuEntries(it)), { label: 'Sample menu', align: 'end' }); return; }
    if (ds.sampleRadio !== undefined) { $$('[data-sample-radio]', el.parentElement).forEach((b) => b.setAttribute('aria-checked', String(b === el))); return; }
    if (ds.sampleClear !== undefined) { toast('Sample only. The library search clears for real.', { icon: 'info' }); return; }
    if (ds.ptab) { state.ed.tab = ds.ptab; keepFocus(() => { renderToolbar(); renderProps(); }); { const inDrawer = el.closest('.props-head'); if (inDrawer) { const tb = $(`#props .props-head [data-ptab="${ds.ptab}"]`); if (tb) tb.focus(); } } return; }
    if (ds.device) { state.ed.device = ds.device; keepFocus(() => renderToolbar()); renderCanvas(); return; }
    if (ds.secToggle) { const s = currentPage().sections.find((x) => x.id === ds.secToggle); if (s) toggleSectionVisible(s); return; }
    if (ds.secMenu) { const s = currentPage().sections.find((x) => x.id === ds.secMenu); if (s) openMenu(el, sectionMenuEntries(s), { label: `Actions for ${s.name}`, align: 'end' }); return; }
    // From the rail drawer, at 1000px and below, a choice closes the drawer and lands on the canvas section.
    if (ds.sec !== undefined) { if (el.closest('#canvas')) selectSection(ds.sec, { focusCanvas: true }); else if (window.innerWidth <= 1000) { setDrawer(false); selectSection(ds.sec, { focusCanvas: true }); } else selectSection(ds.sec, { focusRail: true }); return; }
    if (ds.bind && ds.value !== undefined) {
      if (el.getAttribute('aria-disabled') === 'true') return;
      const [scope, key] = ds.bind.split(':');
      const target = bindTarget(scope);
      if (!target) return;
      let v = ds.value;
      if (v === 'toggle') v = !target[key];
      else if (/^-?\d+$/.test(v)) v = Number(v);
      pushHistory();
      applyBind(ds.bind, v);
      if (key === 'visible') renderRail();
      keepFocus(() => renderProps());
      return;
    }
    if (ds.openMedia) { const it = getItem(ds.openMedia); if (it && it.kind === 'video') openViewer(it); else if (it && it.kind === 'page') openEditor(it.id); return; }
    if (ds.toggle !== undefined) { el.setAttribute('aria-checked', String(el.getAttribute('aria-checked') !== 'true')); return; }
    const segParent = el.closest('[data-seg]');
    if (segParent) { $$(':scope > button', segParent).forEach((b) => b.setAttribute('aria-pressed', String(b === el))); return; }
    const tabsParent = el.closest('[data-tabs]');
    if (tabsParent) { $$('.tab', tabsParent).forEach((b) => { b.setAttribute('aria-selected', String(b === el)); b.tabIndex = b === el ? 0 : -1; }); }
  });

  // Tabs: one tab stop per tablist. Left and Right move and select, Home and End jump.
  document.addEventListener('keydown', (e) => {
    const tab = e.target.closest('[role="tablist"] > [role="tab"]');
    if (!tab) return;
    const tabs = $$('[role="tab"]:not([aria-disabled="true"])', tab.parentElement);
    const i = tabs.indexOf(tab);
    let n = null;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tabs.length - 1;
    if (n === null || n === i) return;
    e.preventDefault();
    const target = tabs[n];
    const fk = target.dataset.fk;
    target.click();
    // Selecting a tab may rebuild its toolbar; find the new node by its focus key.
    const fresh = target.isConnected ? target : fk ? $(`[data-fk="${fk}"]`) : null;
    if (fresh) fresh.focus();
  });

  // Library rows and cards: click selects, double-click opens, arrows move.
  // A click on the blank part of the collection clears the selection, which also dismisses the selection toolbar.
  document.addEventListener('click', (e) => {
    const opt = e.target.closest('#collection [role="option"]');
    if (!opt) {
      if (state.lib.selected.length && e.target.closest('#collection') && !e.target.closest('button, .list-head')) setSelection([]);
      return;
    }
    if (e.target.closest('button')) return;
    const id = opt.dataset.id;
    if (e.metaKey || e.ctrlKey) toggleSelect(id);
    else if (e.shiftKey) selectRange(id);
    else setSelection([id], { anchor: id });
    focusOption(id);
  });
  document.addEventListener('dblclick', (e) => {
    const opt = e.target.closest('#collection [role="option"]');
    if (opt && !e.target.closest('button')) openItem(getItem(opt.dataset.id));
  });
  document.addEventListener('keydown', (e) => {
    const opt = e.target.closest('#collection [role="option"]');
    if (!opt || e.target !== opt) return;
    const id = opt.dataset.id;
    const grid = state.lib.view === 'grid';
    const map = grid ? { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 2, ArrowUp: -2 } : { ArrowDown: 1, ArrowUp: -1 };
    if (map[e.key] !== undefined) {
      e.preventDefault();
      const next = moveFocus(opt, map[e.key]);
      if (!next) return;
      if (e.shiftKey) selectRange(next.dataset.id); else setSelection([next.dataset.id], { anchor: next.dataset.id });
      focusOption(next.dataset.id);
    } else if (e.key === ' ') { e.preventDefault(); toggleSelect(id); }
    else if (e.key === 'Enter') { e.preventDefault(); openItem(getItem(id)); }
    else if (e.key === 'Escape') { setSelection([]); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); confirmDelete(state.lib.selected.length ? state.lib.selected.slice() : [id]); }
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); setSelection(visibleItems().map((i) => i.id)); }
    else if (e.key.toLowerCase() === 's' && !e.metaKey && !e.ctrlKey) { const it = getItem(id); if (it && it.kind !== 'folder') { e.preventDefault(); openShare(it, { opener: opt }); } }
  });

  // Editor keyboard: rail and canvas sections.
  document.addEventListener('keydown', (e) => {
    if (state.view !== 'editor') return;
    const railItem = e.target.closest('#rail [data-sec]');
    const canvasSec = e.target.closest('#canvas [data-sec]');
    const target = railItem || canvasSec;
    if (!target) return;
    const page = currentPage();
    const s = page.sections.find((x) => x.id === target.dataset.sec);
    if (!s) return;
    const i = page.sections.indexOf(s);
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); moveSection(s, e.key === 'ArrowUp' ? -1 : 1); if (canvasSec) { const el = $(`#canvas [data-sec="${s.id}"]`); if (el) el.focus(); } return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const next = page.sections[i + (e.key === 'ArrowDown' ? 1 : -1)];
      if (next) { e.preventDefault(); selectSection(next.id, railItem ? { focusRail: true } : { focusCanvas: true }); }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') { if (canvasSec) { e.preventDefault(); selectSection(s.id, { focusCanvas: true }); } return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSection(s); }
  });

  // Text fields in the properties panel.
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.id === 'lib-search' || t.id === 'lib-search-m') {
      state.lib.query = t.value;
      const wrap = t.closest('.search');
      const k = wrap.querySelector('.kbd');
      const c = wrap.querySelector('[data-action="clear-search"]');
      if (k) k.classList.toggle('hidden', !!t.value);
      if (c) c.classList.toggle('hidden', !t.value);
      renderCollection();
      if (!state.lib.searchOpen) keepFocus(() => renderToolbar());
      return;
    }
    if (t.dataset.bind && /^(INPUT|TEXTAREA)$/.test(t.tagName)) applyBind(t.dataset.bind, t.value);
  });
  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (t instanceof Element && t.dataset.bind && /^(INPUT|TEXTAREA)$/.test(t.tagName) && state.view === 'editor') state.ed.focusSnap = snapshot();
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (!(t instanceof Element) || !t.dataset.bind || state.view !== 'editor') return;
    if (state.ed.focusSnap && state.ed.focusSnap !== snapshot()) {
      pushHistory(state.ed.focusSnap);
      state.ed.focusSnap = snapshot();
      keepFocus(() => renderToolbar());
    }
  });
  document.addEventListener('submit', (e) => { if (e.target.closest('dialog') === null) e.preventDefault(); });

  // Global shortcuts.
  document.addEventListener('keydown', (e) => {
    if (dialog.open) return;
    const t = e.target;
    const inField = t instanceof Element && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    const mod = e.metaKey || e.ctrlKey;
    if ((e.key === 'Enter' || e.key === ' ') && t instanceof Element && t.dataset.openMedia) { e.preventDefault(); t.click(); return; }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && t instanceof Element && t.dataset.action === 'tree-folder') {
      const open = e.key === 'ArrowRight';
      if (!!state.treeOpen[t.dataset.id] !== open) { e.preventDefault(); handleAction('tree-toggle', t); }
      return;
    }
    if (e.key === '/' && !inField && state.view === 'library' && !mod) {
      e.preventDefault();
      const i = $('#lib-search');
      if (i && i.offsetParent) { i.focus(); i.select(); } else { state.lib.searchOpen = true; renderToolbar(); const m = $('#lib-search-m'); if (m) m.focus(); }
      return;
    }
    if (e.key === '[' && !inField && !mod && state.view !== 'editor') { e.preventDefault(); handleAction('collapse-sidebar', $('[data-action="collapse-sidebar"]') || app); return; }
    if (e.key === ']' && !inField && !mod && state.view === 'library' && state.lib.selected.length) { e.preventDefault(); handleAction('toggle-inspector', $('[data-action="toggle-inspector"]') || app); return; }
    if (e.key === 'Escape' && !inField) {
      if (state.drawer) { setDrawer(false); { const b = $('[data-action="drawer"]'); if (b) b.focus(); } return; }
      if (state.props) { setProps(false); return; }
      if (state.view === 'library' && state.lib.selected.length && !overlay) setSelection([]);
      return;
    }
    if (mod && e.key.toLowerCase() === 'z' && state.view === 'editor' && !inField) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
  });

  $('#scrim').addEventListener('click', () => { setDrawer(false); setProps(false); });
  window.addEventListener('resize', () => {
    // The section rail is a drawer up to 1000px, the sidebar up to 760px.
    if (state.drawer && window.innerWidth > (state.view === 'editor' ? 1000 : 760)) setDrawer(false);
    if (window.innerWidth > 1000 && state.props) setProps(false);
  });

  // ---------- Boot: URL, session theme, parent messages ----------
  function readUrl() {
    const u = new URL(location.href);
    const v = u.searchParams.get('view');
    const th = u.searchParams.get('theme');
    return { view: VIEWS.includes(v) ? v : null, theme: th === 'dark' || th === 'light' ? th : null };
  }
  function init() {
    const q = readUrl();
    let theme = q.theme;
    if (!theme) { try { theme = sessionStorage.getItem('clarity-v3-theme'); } catch (err) { theme = null; } }
    if (theme !== 'dark' && theme !== 'light') theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyTheme(theme);
    state.view = q.view || 'library';
    app.dataset.view = state.view;
    app.dataset.drawer = 'closed';
    app.dataset.props = 'closed';
    app.dataset.sidebar = 'open';
    syncUrl();
    render();
    window.addEventListener('message', (e) => {
      const d = e.data;
      if (!d || typeof d !== 'object' || d.type !== 'clarity-preview') return;
      if (d.theme === 'dark' || d.theme === 'light') applyTheme(d.theme);
      if (d.view && VIEWS.includes(d.view) && d.view !== state.view) setView(d.view);
      else syncUrl();
    });
    window.addEventListener('popstate', () => {
      const n = readUrl();
      if (n.theme) applyTheme(n.theme);
      if (n.view && n.view !== state.view) setView(n.view); else render();
    });
  }
  init();
})();
