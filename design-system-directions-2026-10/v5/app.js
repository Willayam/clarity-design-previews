/* V5 Contextual studio. One file, plain JS. Order: helpers, sample data,
   thumbnails, state, host integration (URL, theme, postMessage), overlays
   (tooltip, menu, dialog, toast), library, editor, share, system sheet,
   layout. Everything is local; nothing leaves the page. */
'use strict';
(() => {

/* ---------- helpers ---------- */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name, cls = '') => `<svg class="ic ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const removeFrom = (arr, x) => { const i = arr.indexOf(x); if (i >= 0) arr.splice(i, 1); return i; };
function focusEnd(el, { selectAll = false } = {}) {
  if (!el) return;
  el.focus();
  try { const sel = window.getSelection(); const range = document.createRange(); range.selectNodeContents(el); if (!selectAll) range.collapse(false); sel.removeAllRanges(); sel.addRange(range); } catch (e) { /* ignore */ }
}
const countText = (n) => `${n} ${n === 1 ? 'item' : 'items'}`;
/* Rails, the list, the canvas and the inspectors are replaced wholesale on every change. Remember what had
   focus by a stable key and put focus back on its replacement, so Enter on a rail node or a section action
   never drops focus to the body. The fallback is the control's section header, when it sits in one. */
const FOCUS_KEYS = ['data-scope', 'data-select-section', 'data-section-menu', 'data-sec-act', 'data-set', 'data-act', 'data-bulk', 'data-open', 'data-share', 'data-copy', 'data-sort', 'data-new-folder', 'data-add-section', 'data-focus-edit'];
const FOCUS_QUALIFIERS = ['data-value', 'data-k', 'data-doc'];
function focusSig(root) {
  const a = document.activeElement;
  if (!a || a === document.body || !root.contains(a)) return null;
  const sect = a.closest('.sect');
  const sig = { sel: null, fallback: sect && sect.dataset.sect ? `[data-sect="${CSS.escape(sect.dataset.sect)}"] .sect-head` : null };
  if (a.id) { sig.sel = `#${CSS.escape(a.id)}`; return sig; }
  const key = FOCUS_KEYS.find((k) => a.hasAttribute(k));
  if (!key) return sig.fallback ? sig : null;
  const attrs = [key, ...FOCUS_QUALIFIERS.filter((q) => a.hasAttribute(q))].map((k) => `[${k}="${CSS.escape(a.getAttribute(k))}"]`).join('');
  const opt = a.closest('[role="option"]');
  sig.sel = opt && opt.id ? `#${CSS.escape(opt.id)} ${attrs}` : attrs;
  return sig;
}
function refocus(root, sig, fallback = null) {
  if (!sig) return false;
  for (const target of [sig.sel, sig.fallback, fallback]) {
    let el = typeof target === 'string' ? $(target, root) : target || null;
    /* A disabled replacement (Move up at the top) hands focus to its toolbar's first live button. */
    if (el && el.disabled) { const bar = el.closest('[role="toolbar"]'); el = bar ? $$('button:not(:disabled)', bar)[0] : null; }
    if (el && document.contains(el) && el.getClientRects().length) { el.focus(); return true; }
  }
  return false;
}
let uidN = 100;
const uid = (p = 'n') => `${p}${uidN++}`;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const NOW = Date.now();
const MIN = 60e3, HOUR = 3600e3, DAY = 86400e3;

function ago(ts) {
  const d = NOW - ts;
  if (d < 2 * MIN) return 'just now';
  if (d < HOUR) return `${Math.round(d / MIN)} min ago`;
  if (d < DAY) return `${Math.round(d / HOUR)} h ago`;
  if (d < 14 * DAY) return `${Math.round(d / DAY)} d ago`;
  if (d < 60 * DAY) return `${Math.round(d / (7 * DAY))} wk ago`;
  return `${Math.round(d / (30 * DAY))} mo ago`;
}
function fmtDur(sec) {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
const fmtN = (n) => Number(n).toLocaleString('en-US');
const TYPE_LABEL = { video: 'Video', page: 'Page', document: 'PDF', image: 'Image', folder: 'Folder' };
const TYPE_ICON = { video: 'video', page: 'page', document: 'file', image: 'image', folder: 'folder' };
const ACCESS_LABEL = { public: 'Public link', invite: 'Invite only', off: 'Link off' };

/* ---------- sample data (fictional) ---------- */

const USER = { name: 'Alex Morgan', initials: 'AM', company: 'Northstar Software' };

const ITEMS = [
  { id: 'v1', type: 'video', title: 'Northstar launch walkthrough', duration: 252, views: 128, size: '184 MB', created: NOW - 2 * DAY - 3 * HOUR, modified: NOW - 2 * DAY, folder: null, aspect: '16:9', watched: 72, lastViewed: NOW - 50 * MIN, seed: 3, captions: true, shared: true },
  { id: 'p1', type: 'page', title: 'Welcome to your proposal', views: 56, created: NOW - 5 * DAY, modified: NOW - 3 * HOUR, folder: null, watched: 64, lastViewed: NOW - 2 * HOUR, seed: 1, shared: true },
  { id: 'v2', type: 'video', title: 'Product overview', duration: 168, views: 412, size: '121 MB', created: NOW - 9 * DAY, modified: NOW - 9 * DAY, folder: null, aspect: '16:9', watched: 81, lastViewed: NOW - 6 * HOUR, seed: 7, captions: true, shared: true },
  { id: 'd1', type: 'document', title: 'Project brief.pdf', pages: 12, size: '1.4 MB', views: 31, created: NOW - 20 * DAY, modified: NOW - 20 * DAY, folder: null, seed: 2, shared: false },
  { id: 'f1', type: 'folder', title: 'Brand assets', created: NOW - 40 * DAY, modified: NOW - 12 * DAY, folder: null },
  { id: 'v3', type: 'video', title: 'Follow-up for Maya', duration: 65, views: 3, size: '38 MB', created: NOW - 25 * MIN, modified: NOW - 25 * MIN, folder: null, aspect: '9:16', watched: 100, lastViewed: NOW - 8 * MIN, seed: 5, captions: false, shared: true },
  /* The root holds the six entries every direction shares. Long-title stress content lives on the system sheet only. */
  { id: 'i1', type: 'image', title: 'Logo on dark.png', dims: '2400 × 1200', size: '86 KB', created: NOW - 40 * DAY, modified: NOW - 40 * DAY, folder: 'f1', seed: 1 },
  { id: 'i2', type: 'image', title: 'Logo on light.png', dims: '2400 × 1200', size: '82 KB', created: NOW - 40 * DAY, modified: NOW - 40 * DAY, folder: 'f1', seed: 2 },
  { id: 'i3', type: 'image', title: 'Team photo.jpg', dims: '3000 × 2000', size: '2.1 MB', created: NOW - 33 * DAY, modified: NOW - 12 * DAY, folder: 'f1', seed: 3 },
  { id: 'i4', type: 'image', title: 'Product hero.jpg', dims: '2400 × 1350', size: '1.3 MB', created: NOW - 33 * DAY, modified: NOW - 33 * DAY, folder: 'f1', seed: 4 },
];

const VIEWERS = {
  p1: [{ n: 'Maya Chen', c: 'Harbor Logistics', w: 100, t: NOW - 2 * HOUR }, { n: 'Jordan Lee', c: 'Harbor Logistics', w: 45, t: NOW - 1 * DAY }],
  v1: [{ n: 'Maya Chen', c: 'Harbor Logistics', w: 92, t: NOW - 50 * MIN }, { n: 'Sam Okafor', c: 'Harbor Logistics', w: 61, t: NOW - 1 * DAY }, { n: 'Priya Nair', c: 'Juniper Health', w: 40, t: NOW - 2 * DAY }],
  v2: [{ n: 'Priya Nair', c: 'Juniper Health', w: 88, t: NOW - 6 * HOUR }, { n: 'Dev Patel', c: 'Juniper Health', w: 70, t: NOW - 3 * DAY }],
  v3: [{ n: 'Maya Chen', c: 'Harbor Logistics', w: 100, t: NOW - 8 * MIN }],
};

const byId = (id) => ITEMS.find((i) => i.id === id);
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28);
function shareLink(item) {
  const code = (((item.seed || 7) * 2654435761) >>> 0).toString(36).slice(0, 4);
  return `https://clarity.example/${item.type === 'page' ? 'p' : 'v'}/${slug(item.title) || 'item'}-${code}`;
}
function shareOf(item) {
  if (!item.share) item.share = { access: item.shared ? 'public' : 'off', requireEmail: false, notify: true, expires: 'never', invitees: [] };
  return item.share;
}

/* ---------- thumbnails: neutral inline SVG, deterministic per seed ---------- */

function rng(seed) {
  let s = (seed * 9301 + 49297) % 233280;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
const SVG_OPEN = (w, h, cls = '') => `<svg class="th ${cls}" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">`;

function thumbVideo(seed = 1, aspect = '16:9') {
  const r = rng(seed);
  const slideColors = ['#2a3039', '#2d3340', '#283236'];
  const blockColors = ['#4f6d8f', '#5b7d6a', '#7a6c8f', '#8a7a5c'];
  /* The poster base is the framed-media token, so the dark theme gets its own darker backdrop instead of a slate that matches the row. */
  if (aspect === '9:16') {
    const W = 90, H = 160;
    return `${SVG_OPEN(W, H)}<rect width="${W}" height="${H}" fill="var(--bg-media)"/>
      <rect x="10" y="12" width="${30 + r() * 20}" height="7" rx="2" fill="#3a414b"/>
      <circle cx="45" cy="76" r="17" fill="#9aa4b1"/>
      <path d="M12 134c4-20 16-30 33-30s29 10 33 30z" fill="#9aa4b1"/>
      <rect x="0" y="134" width="${W}" height="26" fill="var(--bg-letterbox)"/>
      <rect x="14" y="143" width="${40 + r() * 20}" height="6" rx="2" fill="#4a525d"/>
      <rect x="14" y="152" width="${20 + r() * 20}" height="4" rx="2" fill="#3a414b"/></svg>`;
  }
  const W = 160, H = 90;
  const sw = 88 + Math.round(r() * 20), sx = 12 + Math.round(r() * 8), sy = 10 + Math.round(r() * 6);
  const slide = slideColors[Math.floor(r() * slideColors.length)];
  const block = blockColors[Math.floor(r() * blockColors.length)];
  const right = r() > 0.35;
  const bx = right ? 130 : 30, by = 62;
  const t1 = 30 + r() * 30, l1 = 40 + r() * 30, l2 = 24 + r() * 30;
  return `${SVG_OPEN(W, H)}<rect width="${W}" height="${H}" fill="var(--bg-media)"/>
    <rect x="${sx}" y="${sy}" width="${sw}" height="${H - sy - 10}" rx="3" fill="${slide}" stroke="#39414c"/>
    <rect x="${sx + 10}" y="${sy + 10}" width="${t1}" height="6" rx="2" fill="#aab3bf"/>
    <rect x="${sx + 10}" y="${sy + 22}" width="${l1}" height="4" rx="2" fill="#4a525d"/>
    <rect x="${sx + 10}" y="${sy + 30}" width="${l2}" height="4" rx="2" fill="#4a525d"/>
    <rect x="${sx + 10}" y="${sy + 42}" width="${22 + r() * 24}" height="${12 + r() * 10}" rx="2" fill="${block}"/>
    <circle cx="${bx}" cy="${by}" r="19" fill="#323a45" stroke="var(--bg-media)" stroke-width="2"/>
    <circle cx="${bx}" cy="${by - 6}" r="6.5" fill="#9aa4b1"/>
    <path d="M${bx - 13} ${by + 16}c2-9 7-13 13-13s11 4 13 13z" fill="#9aa4b1"/></svg>`;
}
function thumbPage(seed = 1) {
  const r = rng(seed);
  const W = 160, H = 90;
  return `${SVG_OPEN(W, H)}<rect width="${W}" height="${H}" fill="var(--bg-sunken)"/>
    <rect x="30" y="8" width="100" height="110" rx="3" fill="var(--bg-content)" stroke="var(--line-strong)"/>
    <rect x="30" y="8" width="100" height="9" rx="3" fill="var(--bg-sunken)"/>
    <circle cx="36" cy="12.5" r="1.3" fill="var(--fg-4)"/><circle cx="40.5" cy="12.5" r="1.3" fill="var(--fg-4)"/><circle cx="45" cy="12.5" r="1.3" fill="var(--fg-4)"/>
    <rect x="38" y="24" width="${36 + r() * 24}" height="5" rx="1.5" fill="var(--fg-2)"/>
    <rect x="38" y="33" width="84" height="30" rx="2" fill="#1b2027"/>
    <path d="M77 43v10l9-5z" fill="#e6e9ee"/>
    <rect x="38" y="68" width="${50 + r() * 30}" height="3.5" rx="1.5" fill="var(--fg-4)"/>
    <rect x="38" y="75" width="${30 + r() * 30}" height="3.5" rx="1.5" fill="var(--fg-4)"/>
    <rect x="38" y="83" width="30" height="8" rx="3" fill="var(--accent-fill)"/></svg>`;
}
function thumbDoc(seed = 1, label = 'PDF') {
  const r = rng(seed);
  const W = 160, H = 90;
  const lines = [0, 1, 2, 3, 4].map((i) => `<rect x="62" y="${30 + i * 8}" width="${20 + r() * 16}" height="3" rx="1.5" fill="var(--fg-4)"/>`).join('');
  return `${SVG_OPEN(W, H)}<rect width="${W}" height="${H}" fill="var(--bg-sunken)"/>
    <path d="M55 10h36l14 14v56H55z" fill="var(--bg-content)" stroke="var(--line-strong)"/>
    <path d="M91 10v14h14" fill="var(--bg-sunken)" stroke="var(--line-strong)"/>
    ${lines}
    <text x="80" y="76" text-anchor="middle" font-family="Geist, system-ui, sans-serif" font-size="8" font-weight="600" fill="var(--fg-3)">${esc(label)}</text></svg>`;
}
function thumbImage(seed = 1, title = '') {
  const t = title.toLowerCase();
  const W = 160, H = 90;
  if (t.includes('dark')) return `${SVG_OPEN(W, H)}<rect width="${W}" height="${H}" fill="#1b2027"/><circle cx="80" cy="45" r="18" fill="none" stroke="#e6e9ee" stroke-width="6"/><rect x="104" y="36" width="34" height="8" rx="2" fill="#e6e9ee"/><rect x="104" y="48" width="22" height="5" rx="2" fill="#6b7480"/></svg>`;
  if (t.includes('light')) return `${SVG_OPEN(W, H)}<rect width="${W}" height="${H}" fill="#eceef2"/><circle cx="80" cy="45" r="18" fill="none" stroke="#1b2027" stroke-width="6"/><rect x="104" y="36" width="34" height="8" rx="2" fill="#1b2027"/><rect x="104" y="48" width="22" height="5" rx="2" fill="#9aa1ab"/></svg>`;
  if (t.includes('photo')) return `${SVG_OPEN(W, H)}<rect width="${W}" height="${H}" fill="#8a9a7a"/><rect y="58" width="${W}" height="32" fill="#6f7f61"/><circle cx="52" cy="46" r="9" fill="#d9c9b4"/><path d="M36 74c2-12 8-18 16-18s14 6 16 18z" fill="#3f4a56"/><circle cx="84" cy="44" r="9" fill="#c9b19a"/><path d="M68 74c2-12 8-18 16-18s14 6 16 18z" fill="#56606a"/><circle cx="114" cy="47" r="9" fill="#e0cdb8"/><path d="M98 74c2-12 8-18 16-18s14 6 16 18z" fill="#2f3a46"/></svg>`;
  const r = rng(seed);
  const hue = ['#6b7f99', '#8a9a7a', '#a08a7a', '#7a7a8a'][Math.floor(r() * 4)];
  return `${SVG_OPEN(W, H)}<rect width="${W}" height="${H}" fill="${hue}"/><rect x="34" y="18" width="92" height="54" rx="4" fill="#1b2027"/><rect x="40" y="24" width="80" height="42" rx="2" fill="#2d3340"/><rect x="48" y="34" width="40" height="5" rx="2" fill="#aab3bf"/><rect x="48" y="44" width="52" height="3" rx="1.5" fill="#4a525d"/></svg>`;
}
function thumbFolder(folderId) {
  const kids = ITEMS.filter((i) => i.folder === folderId && !i.deleted).slice(0, 4);
  const W = 160, H = 90;
  const tile = (k, i) => {
    const x = 42 + (i % 2) * 40, y = 30 + Math.floor(i / 2) * 24;
    let fill = 'var(--bg-content)';
    if (k.type === 'video') fill = '#1b2027';
    if (k.type === 'image') fill = k.title.includes('dark') ? '#1b2027' : k.title.includes('light') ? '#eceef2' : k.title.includes('photo') ? '#8a9a7a' : '#6b7f99';
    if (k.type === 'page') fill = 'var(--bg-content)';
    return `<rect x="${x}" y="${y}" width="36" height="20" rx="2" fill="${fill}" stroke="var(--line-strong)"/>`;
  };
  return `${SVG_OPEN(W, H)}<rect width="${W}" height="${H}" fill="var(--bg-sunken)"/>
    <path d="M34 20h26l6 6h60v54H34z" fill="var(--bg-panel)" stroke="var(--line-strong)"/>
    ${kids.map(tile).join('')}
    ${kids.length === 0 ? '<rect x="42" y="30" width="76" height="44" rx="2" fill="none" stroke="var(--fg-4)" stroke-dasharray="3 3"/>' : ''}</svg>`;
}
function thumbOf(item) {
  switch (item.type) {
    case 'video': return thumbVideo(item.seed, item.aspect);
    case 'page': return thumbPage(item.seed);
    case 'document': return thumbDoc(item.seed, (item.title.split('.').pop() || 'PDF').toUpperCase().slice(0, 4));
    case 'image': return thumbImage(item.seed, item.title);
    case 'folder': return thumbFolder(item.id);
    default: return '';
  }
}
const thumbClass = (item) => item.type === 'video' ? '' : item.type === 'document' ? 'doc' : item.type;

/* ---------- state ---------- */

const state = {
  view: 'library',
  theme: 'light',
  lib: { scope: 'root', filter: 'all', query: '', sort: 'recent', reverse: false, density: 'list', selection: new Set(), cursor: null, loading: false, renaming: null },
  ed: { pageId: 'p1', selected: null, arrived: false, preview: false, device: 'desktop', openSects: new Set(['page', 'appearance', 'link', 'section', 'video', 'items', 'layout', 'button', 'documents', 'options']) },
  layout: { mode: 'desktop', rail: 'open', inspector: 'open', drawer: false, userRail: null, userInspector: null },
};

const app = $('#app');

/* ---------- host integration: URL, theme, postMessage ---------- */

const VIEWS = ['library', 'editor', 'system'];
function syncUrl() {
  try { history.replaceState(null, '', `?view=${state.view}&theme=${state.theme}`); } catch (e) { /* sandboxed host */ }
}
function setTheme(t, { remember = false, sync = true } = {}) {
  if (t !== 'light' && t !== 'dark') return;
  state.theme = t;
  document.documentElement.setAttribute('data-theme', t);
  const btn = $('#theme-toggle');
  btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  btn.innerHTML = icon(t === 'dark' ? 'sun' : 'moon');
  if (remember) { try { sessionStorage.setItem('v5-theme', t); } catch (e) { /* ignore */ } }
  if (sync) syncUrl();
  applyPageTheme();
  if (state.view === 'system') fillTokenValues();
}
function closeOverlays() {
  closeMenu(false); hideTip(); closeDrawer();
  while (dialogStack.length) dialogStack[dialogStack.length - 1].close();
}
function setView(v, { sync = true } = {}) {
  if (!VIEWS.includes(v)) v = 'library';
  if (v !== state.view) closeOverlays();
  state.view = v;
  $$('.view').forEach((el) => { el.hidden = el.dataset.view !== v; });
  $$('#view-tabs .tab').forEach((t) => { if (t.dataset.view === v) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
  document.title = `Clarity · V5 · ${v[0].toUpperCase() + v.slice(1)}`;
  $('#inspector-toggle').hidden = v === 'system';
  $('#rail-toggle').hidden = v === 'system';
  closeDrawer();
  if (v === 'editor') { arriveEditor(); renderEditor(); }
  if (v === 'library') renderLibrary();
  if (v === 'system') renderSystem();
  if (sync) syncUrl();
}
function readHost() {
  const p = new URLSearchParams(location.search);
  let theme = p.get('theme');
  if (theme !== 'light' && theme !== 'dark') {
    try { theme = sessionStorage.getItem('v5-theme'); } catch (e) { theme = null; }
    if (theme !== 'light' && theme !== 'dark') theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  setTheme(theme, { sync: false });
  setView(p.get('view') || 'library', { sync: false });
  syncUrl();
}
window.addEventListener('message', (e) => {
  const d = e.data;
  if (!d || typeof d !== 'object' || d.type !== 'clarity-preview') return;
  if (d.theme) setTheme(d.theme, { sync: false });
  if (d.view) setView(d.view, { sync: false });
  syncUrl();
});
window.addEventListener('popstate', readHost);

/* ---------- tooltip ---------- */

const tip = { el: null, timer: null, anchor: null };
function showTip(anchor, instant) {
  const text = anchor.getAttribute('data-tip');
  if (!text) return;
  if (anchor.hasAttribute('data-tip-mini') && app.getAttribute('data-rail') !== 'mini') return;
  clearTimeout(tip.timer);
  const go = () => {
    hideTip();
    const el = document.createElement('div');
    el.className = 'tooltip';
    el.setAttribute('role', 'tooltip');
    el.textContent = text;
    const kbd = anchor.getAttribute('data-kbd');
    if (kbd) el.innerHTML += `<kbd>${esc(kbd)}</kbd>`;
    $('#overlay-root').appendChild(el);
    const a = anchor.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    let left = clamp(a.left + a.width / 2 - t.width / 2, 6, window.innerWidth - t.width - 6);
    let top = a.bottom + 6;
    if (top + t.height > window.innerHeight - 6) top = a.top - t.height - 6;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    tip.el = el; tip.anchor = anchor;
  };
  if (instant) go(); else tip.timer = setTimeout(go, 350);
}
function hideTip() { clearTimeout(tip.timer); if (tip.el) { tip.el.remove(); tip.el = null; tip.anchor = null; } }
document.addEventListener('mouseover', (e) => {
  const a = e.target.closest && e.target.closest('[data-tip]');
  if (!a || a === tip.anchor) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;
  showTip(a, false);
});
document.addEventListener('mouseout', (e) => {
  const a = e.target.closest && e.target.closest('[data-tip]');
  if (a && (!e.relatedTarget || !a.contains(e.relatedTarget))) hideTip();
});
document.addEventListener('focusin', (e) => { const a = e.target.closest && e.target.closest('[data-tip]'); if (a && a.matches(':focus-visible')) showTip(a, true); });
document.addEventListener('focusout', hideTip);
document.addEventListener('pointerdown', hideTip, true);
window.addEventListener('scroll', hideTip, true);

/* ---------- menu ---------- */

let openMenuState = null;
function closeMenu(restoreFocus = true) {
  if (!openMenuState) return;
  const { el, anchor, onDoc } = openMenuState;
  el.remove();
  document.removeEventListener('pointerdown', onDoc, true);
  anchor.setAttribute('aria-expanded', 'false');
  openMenuState = null;
  if (restoreFocus && document.contains(anchor)) anchor.focus();
}
function openMenu(anchor, items, { align = 'start', head = null } = {}) {
  closeMenu(false);
  const el = document.createElement('div');
  el.className = 'menu';
  el.setAttribute('role', 'menu');
  el.tabIndex = -1;
  let html = head ? `<div class="head">${esc(head)}</div>` : '';
  items.forEach((it, i) => {
    if (it === '-') { html += '<hr>'; return; }
    if (it.head) { html += `<div class="head">${esc(it.head)}</div>`; return; }
    const role = it.radio ? 'menuitemradio' : it.checkbox ? 'menuitemcheckbox' : 'menuitem';
    html += `<button type="button" role="${role}" data-i="${i}" class="${it.danger ? 'danger' : ''}" ${it.disabled ? 'aria-disabled="true"' : ''} ${it.radio || it.checkbox ? `aria-checked="${!!it.checked}"` : ''} tabindex="-1">${it.icon ? icon(it.icon) : ''}<span>${esc(it.label)}</span>${it.radio || it.checkbox ? `${icon('check', 'check')}` : ''}${it.hint ? `<span class="hint">${esc(it.hint)}</span>` : ''}</button>`;
  });
  el.innerHTML = html;
  $('#overlay-root').appendChild(el);
  const a = anchor.getBoundingClientRect();
  const m = el.getBoundingClientRect();
  let left = align === 'end' ? a.right - m.width : a.left;
  left = clamp(left, 6, window.innerWidth - m.width - 6);
  let top = a.bottom + 4;
  if (top + m.height > window.innerHeight - 6) top = Math.max(6, a.top - m.height - 4);
  el.style.left = `${left}px`; el.style.top = `${top}px`;
  anchor.setAttribute('aria-expanded', 'true');
  const buttons = $$('[role^="menuitem"]', el);
  const focusAt = (i) => { buttons.forEach((b, j) => { b.tabIndex = j === i ? 0 : -1; }); buttons[i] && buttons[i].focus(); };
  focusAt(0);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[role^="menuitem"]');
    if (!b || b.getAttribute('aria-disabled') === 'true') return;
    const it = items[+b.dataset.i];
    closeMenu(true);
    it.onSelect && it.onSelect();
  });
  el.addEventListener('keydown', (e) => {
    const i = buttons.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); focusAt((i + 1) % buttons.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusAt((i - 1 + buttons.length) % buttons.length); }
    else if (e.key === 'Home') { e.preventDefault(); focusAt(0); }
    else if (e.key === 'End') { e.preventDefault(); focusAt(buttons.length - 1); }
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); closeMenu(true); }
  });
  const onDoc = (e) => { if (!el.contains(e.target) && !anchor.contains(e.target)) closeMenu(false); };
  document.addEventListener('pointerdown', onDoc, true);
  openMenuState = { el, anchor, onDoc };
  return el;
}

/* ---------- dialog ---------- */

let dialogStack = [];
/* Everything outside #overlay-root goes inert while a dialog is open. Toasts stay live. */
const inertRoots = () => [$('.topbar'), $('#views')].filter(Boolean);
/* The opener may be re-rendered while the dialog is open (list rows, inspector bodies), so remember
   enough to find its replacement: id, or the same tag with the same label inside the same id scope. */
function rememberOpener(el) {
  if (!el || el === document.body || el === document.documentElement) return null;
  const scope = el.parentElement ? el.parentElement.closest('[id]') : null;
  return { el, id: el.id || null, scopeId: scope ? scope.id : null, label: el.getAttribute('aria-label'), text: (el.textContent || '').trim().slice(0, 40), tag: el.tagName };
}
function findOpener(sig) {
  if (!sig) return null;
  const visible = (el) => !!el && document.contains(el) && el.getClientRects().length > 0;
  if (visible(sig.el)) return sig.el;
  if (sig.id) { const el = document.getElementById(sig.id); if (visible(el)) return el; }
  const root = sig.scopeId ? document.getElementById(sig.scopeId) : null;
  if (!root) return null;
  const same = $$(sig.tag, root).filter((c) => (sig.label ? c.getAttribute('aria-label') === sig.label : (c.textContent || '').trim().slice(0, 40) === sig.text));
  return same.find(visible) || root.closest('[tabindex]') || null;
}
function openDialog({ title, body, foot = '', wide = false, label = null, initialFocus = null, onClose = null, opener = null }) {
  /* Safari does not focus a button on click, so callers pass the trigger when they have it. */
  const openerSig = rememberOpener(opener instanceof Element ? opener : document.activeElement);
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  const id = uid('dlg');
  scrim.innerHTML = `<div class="dialog ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${id}-t" tabindex="-1">
    <div class="dialog-head"><h2 id="${id}-t">${esc(title)}</h2><button class="btn quiet icon" type="button" data-dialog-close aria-label="Close">${icon('x')}</button></div>
    <div class="dialog-body">${body}</div>
    ${foot ? `<div class="dialog-foot">${foot}</div>` : ''}
  </div>`;
  $('#overlay-root').appendChild(scrim);
  const dlg = $('.dialog', scrim);
  if (label) dlg.setAttribute('aria-label', label);
  const focusables = () => $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', dlg).filter((el) => el.offsetParent !== null || el === dlg);
  inertRoots().forEach((r) => r.setAttribute('inert', ''));
  const close = () => {
    if (!document.contains(scrim)) return;
    scrim.remove();
    dialogStack = dialogStack.filter((d) => d !== api);
    if (!dialogStack.length) inertRoots().forEach((r) => r.removeAttribute('inert'));
    onClose && onClose();
    const back = findOpener(openerSig);
    if (back) back.focus();
  };
  const api = { el: dlg, scrim, close };
  dialogStack.push(api);
  scrim.addEventListener('pointerdown', (e) => { if (e.target === scrim) close(); });
  dlg.addEventListener('click', (e) => { if (e.target.closest('[data-dialog-close]')) close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables();
    if (!f.length) { e.preventDefault(); return; }
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dlg)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  const target = initialFocus ? $(initialFocus, dlg) : null;
  (target || dlg).focus();
  return api;
}

/* ---------- toast ---------- */

function toast(msg, { action = null, onAction = null, kind = 'ok', ttl = 5000 } = {}) {
  const host = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${icon(kind === 'error' ? 'alert' : 'check', kind === 'error' ? 'danger' : 'ok')}<span>${esc(msg)}</span>${action ? `<button class="btn" type="button" data-action>${esc(action)}</button>` : ''}<button class="btn icon" type="button" aria-label="Dismiss" data-dismiss>${icon('x')}</button>`;
  host.appendChild(el);
  while (host.children.length > 3) host.firstChild.remove();
  const remove = () => el.remove();
  let timer = setTimeout(remove, ttl);
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-action]')) { clearTimeout(timer); remove(); onAction && onAction(); }
    if (e.target.closest('[data-dismiss]')) { clearTimeout(timer); remove(); }
  });
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', () => { timer = setTimeout(remove, 2500); });
  return el;
}

/* ---------- library ---------- */

const lib = state.lib;
const libList = $('#lib-list');

function scopeTitle() {
  const s = lib.scope;
  if (s === 'root') return 'All media';
  if (s === 'recent') return 'Recent';
  if (s === 'shared') return 'Shared links';
  if (s === 'trash') return 'Trash';
  if (s.startsWith('folder:')) { const f = byId(s.slice(7)); return f ? f.title : 'Folder'; }
  if (s === 'ws:engagement') return 'Engagement';
  if (s === 'ws:contacts') return 'Contacts';
  if (s === 'ws:settings') return 'Settings';
  return 'Library';
}
function scopeItems(scope = lib.scope) {
  const live = ITEMS.filter((i) => !i.deleted);
  if (scope === 'root') return live.filter((i) => i.folder === null);
  if (scope === 'recent') return live.filter((i) => i.type !== 'folder' && NOW - i.modified < 7 * DAY);
  if (scope === 'shared') return live.filter((i) => i.type !== 'folder' && shareOf(i).access !== 'off');
  if (scope === 'trash') return ITEMS.filter((i) => i.deleted);
  if (scope.startsWith('folder:')) return live.filter((i) => i.folder === scope.slice(7));
  return [];
}
function visibleItems() {
  let list = scopeItems();
  if (lib.filter !== 'all') list = list.filter((i) => i.type === lib.filter);
  const q = lib.query.trim().toLowerCase();
  if (q) list = list.filter((i) => i.title.toLowerCase().includes(q));
  const folderFirst = (a, b) => (b.type === 'folder') - (a.type === 'folder');
  const sorters = {
    recent: (a, b) => folderFirst(a, b) || b.modified - a.modified,
    name: (a, b) => folderFirst(a, b) || a.title.localeCompare(b.title),
    views: (a, b) => folderFirst(a, b) || (b.views || 0) - (a.views || 0),
    type: (a, b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title),
  };
  const cmp = sorters[lib.sort] || sorters.recent;
  /* Reversing keeps folders first; only the order among items flips. */
  return list.slice().sort(lib.reverse ? (a, b) => folderFirst(a, b) || -cmp(a, b) : cmp);
}

function renderLibrary() {
  const view = $('#view-library');
  const sig = focusSig(view);
  const inList = !!sig && libList.contains(document.activeElement);
  renderLibRail(); renderLibHead(); renderList(); renderLibInspector();
  /* A row action whose row is gone (Delete, Move) leaves focus on the list, cursor and all. */
  refocus(view, sig, inList ? libList : null);
}
/* Phone shows the list only; the density choice waits until the window is wide again. */
const effectiveDensity = () => (state.layout.mode === 'phone' ? 'list' : lib.density);

function renderLibRail() {
  const live = ITEMS.filter((i) => !i.deleted);
  const folders = live.filter((i) => i.type === 'folder');
  const node = (id, ic, label, count, depth = 0) => `<button class="node" type="button" data-scope="${id}" ${lib.scope === id ? 'aria-current="true"' : ''} data-depth="${depth}" data-tip="${esc(label)}" data-tip-mini>${icon(ic)}<span class="lbl">${esc(label)}</span>${count != null ? `<span class="count">${count}</span>` : ''}</button>`;
  const html = `
    <div class="rail-head">Library<button class="btn quiet icon" type="button" data-close-drawer aria-label="Close navigation">${icon('x')}</button></div>
    <div class="rail-group">Library</div>
    ${node('root', 'home', 'All media', scopeItems('root').length)}
    ${node('recent', 'clock', 'Recent', scopeItems('recent').length)}
    ${node('shared', 'link', 'Shared links', scopeItems('shared').length)}
    ${node('trash', 'trash', 'Trash', scopeItems('trash').length)}
    <div class="rail-group">Folders</div>
    ${folders.map((f) => node(`folder:${f.id}`, 'folder', f.title, scopeItems(`folder:${f.id}`).length)).join('')}
    <button class="btn add" type="button" data-new-folder data-tip="New folder" data-tip-mini>${icon('plus')}<span class="lbl">New folder</span></button>
    <div class="rail-group">Workspace</div>
    ${node('ws:engagement', 'chart', 'Engagement')}
    ${node('ws:contacts', 'users', 'Contacts')}
    ${node('ws:settings', 'settings', 'Settings')}`;
  $('#lib-rail').innerHTML = html;
}

function renderLibHead() {
  const crumbs = $('#lib-crumbs');
  const s = lib.scope;
  if (s.startsWith('folder:')) {
    crumbs.innerHTML = `<button class="crumb-btn" type="button" data-scope="root">All media</button><span class="crumb-sep">${icon('chev-right', 'sm')}</span><h1 class="pane-title" id="lib-title">${esc(scopeTitle())}</h1>`;
  } else {
    crumbs.innerHTML = `<h1 class="pane-title" id="lib-title">${esc(scopeTitle())}</h1>`;
  }
  const all = scopeItems().length, vis = visibleItems().length;
  const filtered = lib.filter !== 'all' || lib.query.trim();
  $('#lib-meta').textContent = s.startsWith('ws:') ? '' : filtered ? `${vis} of ${all}` : countText(all);
  $$('#lib-filter button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === lib.filter)));
  const density = effectiveDensity();
  $$('#lib-density button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.density === density)));
  /* Column headers sort the list. The sort menu only appears where there are no headers: grid density and phone. */
  $('#lib-sort').hidden = !(density === 'grid' || state.layout.mode === 'phone');
  $('#lib-sort-label').textContent = { recent: 'Recent', name: 'Name', views: 'Most viewed', type: 'Type' }[lib.sort];
  $('#lib-query-clear').hidden = !lib.query;
  const workspace = s.startsWith('ws:');
  $('.toolbar', $('#lib-pane')).hidden = workspace;
}

/* Sub line parts are spans so CSS can draw the separators and hide the age (class "age")
   whenever the Modified column is on screen. */
function subLine(item) {
  const parts = [[TYPE_LABEL[item.type]]];
  if (item.uploading) parts.push(['Uploading']);
  else if (item.type === 'folder') parts.push([countText(scopeItems(`folder:${item.id}`).length)]);
  else if (item.type === 'document') parts.push([`${item.pages} pages`]);
  else if (item.type === 'image') parts.push([item.dims]);
  if (item.type !== 'folder' && !item.uploading) parts.push([ago(item.modified), 'age']);
  if (item.type !== 'folder' && item.type !== 'image' && !item.uploading) {
    const a = shareOf(item).access;
    if (a === 'public') parts.push(['Public link']);
    else if (a === 'invite') parts.push(['Invite only']);
  }
  let html = parts.map(([t, cls]) => `<span${cls ? ` class="${cls}"` : ''}>${esc(t)}</span>`).join('');
  if (item.demo) html += `<span class="pill demo">Demo</span>`;
  if (item.deleted) html += `<span class="pill">In trash</span>`;
  return html;
}
function lengthCol(item) {
  if (item.uploading) return `<span class="spinner" aria-hidden="true"></span>`;
  if (item.type === 'video') return fmtDur(item.duration);
  if (item.type === 'folder') return '—';
  if (item.size) return esc(item.size);
  return '—';
}

function renderList() {
  const host = libList;
  const scope = lib.scope;
  host.classList.toggle('has-selection', lib.selection.size > 0);
  if (scope.startsWith('ws:')) {
    host.innerHTML = `<div class="empty">${icon(scope === 'ws:engagement' ? 'chart' : scope === 'ws:contacts' ? 'users' : 'settings')}<h3>${esc(scopeTitle())} is outside this prototype</h3><p>This review build covers the library, the page editor, sharing and the system sheet. The ${esc(scopeTitle().toLowerCase())} screens would use the same rail, pane and inspector structure.</p><button class="btn" type="button" data-scope="root">Back to All media</button></div>`;
    renderSelbar();
    return;
  }
  if (lib.loading) {
    const rows = [0, 1, 2, 3, 4].map(() => `<div class="row is-skel" aria-hidden="true"><span></span><span class="skel block"></span><div class="name"><span class="skel line" style="width:${40 + Math.random() * 30}%"></span><span class="skel line" style="width:${20 + Math.random() * 20}%;height:8px"></span></div><span class="skel line" style="width:40px"></span><span class="skel line" style="width:32px"></span><span class="skel line" style="width:60px"></span><span></span></div>`).join('');
    host.innerHTML = `<div class="sr-only" role="status">Loading</div>${listHead()}${rows}`;
    renderSelbar();
    return;
  }
  const items = visibleItems();
  if (!items.length) {
    const q = lib.query.trim();
    if (q) host.innerHTML = `<div class="empty">${icon('search')}<h3>No results for "${esc(q)}"</h3><p>Check the spelling, or search across all media instead of this ${scope.startsWith('folder:') ? 'folder' : 'view'}.</p><button class="btn" type="button" data-clear-search>Clear search</button></div>`;
    else if (scope === 'trash') host.innerHTML = `<div class="empty">${icon('trash')}<h3>Trash is empty</h3><p>Deleted items stay here for 30 days before they are removed.</p></div>`;
    else if (lib.filter !== 'all') host.innerHTML = `<div class="empty">${icon(TYPE_ICON[lib.filter])}<h3>No ${esc(lib.filter === 'document' ? 'documents' : lib.filter + 's')} here</h3><p>Nothing of this type in ${esc(scopeTitle())}.</p><button class="btn" type="button" data-set-filter="all">Show all types</button></div>`;
    else host.innerHTML = `<div class="empty">${icon('folder')}<h3>This folder is empty</h3><p>Record a video, upload files, or move items here from the item menu.</p><button class="btn primary" type="button" data-click="#lib-record">${icon('record')}Record a video</button></div>`;
    renderSelbar();
    return;
  }
  if (effectiveDensity() === 'grid') {
    host.innerHTML = `<div class="cards ${lib.selection.size ? 'has-selection' : ''}">${items.map(cardHtml).join('')}</div>`;
  } else {
    host.innerHTML = listHead() + items.map(rowHtml).join('');
  }
  syncCursorAttr();
  renderSelbar();
}
/* Clicking the sorted header again reverses it. The chevron points up for ascending and down for descending. */
const SORT_DIR = { name: ['A to Z', 'Z to A'], views: ['most viewed first', 'fewest first'], recent: ['newest first', 'oldest first'] };
function listHead() {
  const sortBtn = (key, label, cls = '') => {
    const on = lib.sort === key;
    const asc = (key === 'name') !== lib.reverse;
    return `<button type="button" class="${cls} ${on ? 'is-sorted' : ''}" data-sort="${key}" ${on ? `aria-label="${label}, ${SORT_DIR[key][lib.reverse ? 1 : 0]}"` : ''}>${label}${on ? icon(asc ? 'chev-up' : 'chev-down', 'sm') : ''}</button>`;
  };
  return `<div class="row-head" role="presentation"><span></span><span></span>${sortBtn('name', 'Name')}<span class="num">Length / size</span>${sortBtn('views', 'Views', 'num')}${sortBtn('recent', 'Modified', 'when')}<span></span></div>`;
}
function rowHtml(item) {
  const sel = lib.selection.has(item.id);
  const renaming = lib.renaming === item.id;
  return `<div class="row ${item.uploading ? 'is-busy' : ''}" role="option" id="row-${item.id}" data-id="${item.id}" aria-selected="${sel}" aria-label="${esc(item.title)}">
    <button class="cb-btn" type="button" role="checkbox" aria-checked="${sel}" aria-label="Select ${esc(item.title)}" tabindex="-1" data-act="check"><span class="cb">${icon('check')}</span></button>
    <div class="thumb ${thumbClass(item)}">${thumbOf(item)}</div>
    <div class="name">${renaming ? `<input class="input rename" type="text" value="${esc(item.title)}" aria-label="Rename" data-rename="${item.id}">` : `<span class="title">${esc(item.title)}</span>`}<span class="sub">${subLine(item)}</span></div>
    <span class="num">${lengthCol(item)}</span>
    <span class="num">${item.views != null ? fmtN(item.views) : '—'}</span>
    <span class="when">${ago(item.modified)}</span>
    <div class="acts">${item.type === 'folder' || item.deleted ? '' : `<button class="btn quiet icon" type="button" data-act="share" aria-label="Share ${esc(item.title)}" data-tip="Share">${icon('share')}</button>`}<button class="btn quiet icon more" type="button" data-act="more" aria-label="More actions for ${esc(item.title)}" aria-haspopup="menu" aria-expanded="false">${icon('more')}</button></div>
  </div>`;
}
function cardHtml(item) {
  const sel = lib.selection.has(item.id);
  return `<div class="card" role="option" id="row-${item.id}" data-id="${item.id}" aria-selected="${sel}" aria-label="${esc(item.title)}">
    <div class="thumb ${thumbClass(item)}">${thumbOf(item)}${item.type === 'video' ? `<span class="dur">${fmtDur(item.duration)}</span>` : ''}</div>
    <button class="cb-btn" type="button" role="checkbox" aria-checked="${sel}" aria-label="Select ${esc(item.title)}" tabindex="-1" data-act="check"><span class="cb">${icon('check')}</span></button>
    <div class="card-body"><span class="title">${esc(item.title)}</span><span class="sub">${subLine(item)}${item.views != null ? `<span>${fmtN(item.views)} views</span>` : ''}</span>
      <div class="acts">${item.type === 'folder' || item.deleted ? '' : `<button class="btn quiet icon" type="button" data-act="share" aria-label="Share ${esc(item.title)}" data-tip="Share">${icon('share')}</button>`}<button class="btn quiet icon more" type="button" data-act="more" aria-label="More actions for ${esc(item.title)}" aria-haspopup="menu" aria-expanded="false">${icon('more')}</button></div>
    </div>
  </div>`;
}
function syncCursorAttr() {
  $$('[role="option"]', libList).forEach((r) => r.classList.toggle('is-cursor', r.dataset.id === lib.cursor));
  if (lib.cursor && $(`#row-${lib.cursor}`, libList)) libList.setAttribute('aria-activedescendant', `row-${lib.cursor}`);
  else libList.removeAttribute('aria-activedescendant');
}
function renderSelbar() {
  const host = $('#lib-selbar');
  const n = lib.selection.size;
  const overlay = state.layout.mode !== 'desktop' && state.layout.mode !== 'tablet';
  if (n < (overlay ? 1 : 2)) { host.innerHTML = ''; return; }
  host.innerHTML = `<div class="ctx-bar floating-center" role="toolbar" aria-label="Selection actions"><span class="lbl">${n} selected</span><span class="sep"></span>
    ${n === 1 ? `<button class="btn quiet" type="button" data-bulk="share">${icon('share')}Share</button>` : ''}
    <button class="btn quiet" type="button" data-bulk="move">${icon('move')}Move</button>
    <button class="btn quiet danger" type="button" data-bulk="delete">${icon('trash')}Delete</button>
    <span class="sep"></span><button class="btn quiet icon" type="button" data-bulk="clear" aria-label="Clear selection" data-tip="Clear selection">${icon('x')}</button></div>`;
}

function setSelection(ids, cursor) {
  lib.selection = new Set(ids);
  if (cursor !== undefined) lib.cursor = cursor;
  $$('[role="option"]', libList).forEach((r) => {
    const on = lib.selection.has(r.dataset.id);
    r.setAttribute('aria-selected', String(on));
    const cb = $('[role="checkbox"]', r); if (cb) cb.setAttribute('aria-checked', String(on));
  });
  libList.classList.toggle('has-selection', lib.selection.size > 0);
  const cards = $('.cards', libList); if (cards) cards.classList.toggle('has-selection', lib.selection.size > 0);
  syncCursorAttr();
  renderSelbar();
  renderLibInspector();
}
function selectedItems() { return Array.from(lib.selection).map(byId).filter(Boolean); }

function setScope(scope, { skeleton = true } = {}) {
  const view = $('#view-library');
  const sig = focusSig(view);
  lib.scope = scope;
  lib.selection = new Set(); lib.cursor = null; lib.renaming = null;
  if (!scope.startsWith('ws:')) lib.query = '';
  $('#lib-query').value = lib.query;
  renderLibRail(); renderLibHead();
  if (skeleton && !scope.startsWith('ws:')) {
    lib.loading = true; renderList(); renderLibInspector();
    setTimeout(() => { lib.loading = false; renderList(); renderLibInspector(); }, reducedMotion() ? 120 : 360);
  } else { renderList(); renderLibInspector(); }
  /* The node that was activated is re-rendered; a crumb or an inspector Open button that vanished hands over to the scope's rail node. */
  refocus(view, sig, `#lib-rail [data-scope="${CSS.escape(scope)}"]`);
  closeDrawer();
}

function openItem(item, opener = null) {
  if (!item || item.deleted) return;
  if (item.type === 'folder') { setScope(`folder:${item.id}`); return; }
  if (item.type === 'page') { openEditor(item.id); return; }
  openPreviewDialog(item, opener);
}
function openPreviewDialog(item, opener = null) {
  const meta = item.type === 'video' ? `${fmtDur(item.duration)} · ${item.size} · ${item.aspect}` : item.type === 'document' ? `${item.pages} pages · ${item.size}` : `${item.dims || ''} · ${item.size || ''}`;
  openDialog({
    title: item.title,
    wide: true,
    body: `<div class="open-preview ${thumbClass(item)}">${thumbOf(item)}</div>
      <div class="banner">${icon('info')}<span>${item.type === 'video' ? 'Playback and trimming are not part of this prototype.' : 'The document viewer is not part of this prototype.'} ${esc(meta)}</span></div>`,
    foot: `<span class="proto">${esc(TYPE_LABEL[item.type])} · created ${ago(item.created)}</span><span class="spacer"></span><button class="btn" type="button" data-preview-share>${icon('share')}Share</button><button class="btn primary" type="button" data-dialog-close>Done</button>`,
    initialFocus: '[data-dialog-close].primary',
    opener,
  }).el.addEventListener('click', (e) => { if (e.target.closest('[data-preview-share]')) { dialogStack[dialogStack.length - 1].close(); openShare(item); } });
}

function itemMenu(anchor, item) {
  const folders = ITEMS.filter((i) => i.type === 'folder' && !i.deleted && i.id !== item.id);
  if (item.deleted) {
    openMenu(anchor, [
      { label: 'Restore', icon: 'arrow-up', onSelect: () => { item.deleted = false; renderLibrary(); toast(`Restored "${item.title}"`); } },
      '-',
      { label: 'Delete permanently', icon: 'trash', danger: true, onSelect: () => { const idx = ITEMS.indexOf(item); ITEMS.splice(idx, 1); renderLibrary(); toast(`Deleted "${item.title}" permanently`, { action: 'Undo', onAction: () => { ITEMS.splice(idx, 0, item); renderLibrary(); } }); } },
    ], { align: 'end' });
    return;
  }
  const items = [
    { label: item.type === 'folder' ? 'Open folder' : item.type === 'page' ? 'Open in editor' : 'Open', icon: item.type === 'page' ? 'pencil' : 'external', onSelect: () => openItem(item, anchor) },
  ];
  if (item.type !== 'folder') items.push({ label: 'Share', icon: 'share', onSelect: () => openShare(item, anchor) });
  if (item.type === 'video') items.push({ label: 'New page with this video', icon: 'page', onSelect: () => newPage(item.id) });
  items.push('-', { label: 'Rename', icon: 'pencil', hint: 'F2', onSelect: () => startRename(item.id) });
  if (item.type !== 'folder') {
    items.push({ label: 'Duplicate', icon: 'duplicate', onSelect: () => duplicateItem(item) });
    items.push({ head: 'Move to' });
    items.push({ label: 'All media', icon: 'home', radio: true, checked: item.folder === null, onSelect: () => moveItems([item], null) });
    folders.forEach((f) => items.push({ label: f.title, icon: 'folder', radio: true, checked: item.folder === f.id, onSelect: () => moveItems([item], f.id) }));
    items.push('-', { label: 'Download', icon: 'download', onSelect: () => toast('Demo: downloads are not wired in this prototype.', { kind: 'error' }) });
  }
  items.push('-', { label: 'Delete', icon: 'trash', danger: true, hint: '⌫', onSelect: () => deleteItems([item]) });
  openMenu(anchor, items, { align: 'end' });
}
function moveItems(items, folderId) {
  const movable = items.filter((i) => i.type !== 'folder');
  const prev = movable.map((i) => [i, i.folder]);
  movable.forEach((i) => { i.folder = folderId; i.modified = Date.now(); });
  const dest = folderId ? byId(folderId).title : 'All media';
  renderLibrary();
  toast(`Moved ${movable.length === 1 ? `"${movable[0].title}"` : `${movable.length} items`} to ${dest}`, { action: 'Undo', onAction: () => { prev.forEach(([i, f]) => { i.folder = f; }); renderLibrary(); } });
}
function deleteItems(items) {
  items.forEach((i) => { i.deleted = true; });
  lib.selection = new Set(); lib.cursor = null;
  renderLibrary();
  toast(`Moved ${items.length === 1 ? `"${items[0].title}"` : `${items.length} items`} to Trash`, { action: 'Undo', onAction: () => { items.forEach((i) => { i.deleted = false; }); renderLibrary(); } });
}
function duplicateItem(item) {
  const copy = { ...item, id: uid(item.type[0]), title: `${item.title} copy`, created: Date.now(), modified: Date.now(), views: 0, lastViewed: null, share: null, shared: false, seed: (item.seed || 1) + 4 };
  ITEMS.splice(ITEMS.indexOf(item) + 1, 0, copy);
  if (item.type === 'page' && PAGES[item.id]) PAGES[copy.id] = JSON.parse(JSON.stringify({ ...PAGES[item.id], id: copy.id, title: copy.title }));
  renderLibrary();
  setSelection([copy.id], copy.id);
  toast(`Duplicated "${item.title}"`, { action: 'Undo', onAction: () => { removeFrom(ITEMS, copy); lib.selection.delete(copy.id); renderLibrary(); } });
}
function startRename(id) {
  lib.renaming = id;
  if (lib.density === 'grid') { lib.density = 'list'; renderLibHead(); }
  renderList();
  const input = $(`[data-rename="${id}"]`, libList);
  if (input) { input.focus(); const dot = input.value.lastIndexOf('.'); input.setSelectionRange(0, dot > 0 ? dot : input.value.length); }
}
function commitRename(input, cancel) {
  const id = input.dataset.rename;
  const item = byId(id);
  const value = input.value.trim();
  lib.renaming = null;
  if (!cancel && item && value && value !== item.title) {
    const prev = item.title;
    item.title = value; item.modified = Date.now();
    if (PAGES[id]) PAGES[id].title = value;
    toast(`Renamed to "${value}"`, { action: 'Undo', onAction: () => { item.title = prev; if (PAGES[id]) PAGES[id].title = prev; renderLibrary(); } });
  }
  renderList(); renderLibInspector();
  libList.focus();
}
function newFolder() {
  const f = { id: uid('f'), type: 'folder', title: 'Untitled folder', created: Date.now(), modified: Date.now(), folder: null };
  ITEMS.push(f);
  if (lib.scope !== 'root') setScope('root', { skeleton: false }); else { renderLibRail(); renderLibHead(); }
  setSelection([f.id], f.id);
  startRename(f.id);
}

/* uploads and recording: local demo items, labeled Demo, deletable */
function addDemoUpload(file) {
  const t = file.type.startsWith('video') ? 'video' : file.type.startsWith('image') ? 'image' : 'document';
  const item = { id: uid(t[0]), type: t, title: file.name, size: `${(file.size / 1048576).toFixed(1)} MB`, views: 0, created: Date.now(), modified: Date.now(), folder: lib.scope.startsWith('folder:') ? lib.scope.slice(7) : null, seed: Math.floor(Math.random() * 12) + 1, uploading: true, demo: true, duration: 0, pages: 1, dims: '—', aspect: '16:9', captions: false, shared: false };
  ITEMS.unshift(item);
  renderLibrary();
  setTimeout(() => {
    item.uploading = false;
    if (t === 'video') item.duration = 30 + Math.floor(Math.random() * 300);
    renderLibrary();
    toast(`Demo upload finished: "${item.title}" (nothing left this page)`);
  }, reducedMotion() ? 400 : 1400);
}
function openRecordDialog(opener = null) {
  let running = false, started = 0, timer = null, mode = 'both';
  const d = openDialog({
    title: 'Record a video',
    opener,
    body: `<div class="rec-stage" id="rec-stage">Camera preview is not part of this prototype</div>
      <div class="block"><div class="block-head">What to capture</div><div class="seg full" role="group" aria-label="Capture" id="rec-mode"><button type="button" data-mode="camera" aria-pressed="false">${icon('camera', 'sm')}Camera</button><button type="button" data-mode="screen" aria-pressed="false">${icon('screen', 'sm')}Screen</button><button type="button" data-mode="both" aria-pressed="true">${icon('video', 'sm')}Screen + camera</button></div></div>
      <div class="rec-opts"><label class="lab" for="rec-cam">Camera</label><select class="input" id="rec-cam"><option>Built-in camera</option><option>Studio webcam (sample)</option></select><label class="lab" for="rec-mic">Microphone</label><select class="input" id="rec-mic"><option>Built-in microphone</option><option>USB microphone (sample)</option></select></div>
      <div class="banner">${icon('info')}<span>Start creates a demo item in the library with the elapsed time as its length. No camera or screen is captured.</span></div>`,
    foot: `<span class="proto" id="rec-time"></span><span class="spacer"></span><button class="btn" type="button" data-dialog-close>Cancel</button><button class="btn primary" type="button" id="rec-start">${icon('record')}Start recording</button>`,
    initialFocus: '#rec-start',
    onClose: () => clearInterval(timer),
  });
  const el = d.el;
  el.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mode]');
    if (m) { mode = m.dataset.mode; $$('#rec-mode button', el).forEach((b) => b.setAttribute('aria-pressed', String(b === m))); return; }
    if (e.target.closest('#rec-start')) {
      const btn = $('#rec-start', el);
      if (!running) {
        running = true; started = Date.now();
        btn.innerHTML = `${icon('record')}Stop`; btn.classList.add('danger');
        $('#rec-stage', el).innerHTML = `<span class="status"><span class="dot danger"></span>Recording (demo)</span>`;
        timer = setInterval(() => { $('#rec-time', el).textContent = fmtDur((Date.now() - started) / 1000); }, 250);
      } else {
        clearInterval(timer);
        const secs = Math.max(1, Math.round((Date.now() - started) / 1000));
        const item = { id: uid('v'), type: 'video', title: `Recording ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, duration: secs, views: 0, size: `${(secs * 0.6).toFixed(1)} MB`, created: Date.now(), modified: Date.now(), folder: null, aspect: mode === 'camera' ? '9:16' : '16:9', watched: 0, lastViewed: null, seed: Math.floor(Math.random() * 12) + 1, captions: false, demo: true, shared: false };
        ITEMS.unshift(item);
        d.close();
        if (lib.scope !== 'root') setScope('root', { skeleton: false }); else renderLibrary();
        setSelection([item.id], item.id);
        toast(`Demo recording saved as "${item.title}" (${fmtDur(secs)})`, { action: 'Undo', onAction: () => { removeFrom(ITEMS, item); lib.selection.delete(item.id); renderLibrary(); } });
      }
    }
  });
}

/* library inspector */
function renderLibInspector() {
  const kicker = $('#lib-insp-kicker'), title = $('#lib-insp-title'), body = $('#lib-insp-body'), more = $('#lib-insp-more');
  const sel = selectedItems();
  more.hidden = sel.length !== 1;
  if (lib.loading) { kicker.textContent = 'Library'; title.textContent = scopeTitle(); body.innerHTML = `<div class="summary"><span class="skel line" style="width:40%"></span><span class="skel line" style="width:70%"></span></div>`; return; }
  if (lib.scope.startsWith('ws:')) { kicker.textContent = 'Workspace'; title.textContent = scopeTitle(); body.innerHTML = `<div class="summary"><p class="muted">${esc(scopeTitle())} is outside this review build. The inspector would hold the selected contact or report here, using the same sections and fields as the library.</p></div>`; return; }
  if (sel.length === 0) {
    /* At rest the inspector states the scope's own facts under the pane head's count rule, then waits for a selection. */
    kicker.textContent = 'Library'; title.textContent = scopeTitle();
    const n = scopeItems().length;
    const folder = lib.scope.startsWith('folder:') ? byId(lib.scope.slice(7)) : null;
    const facts = [['Items', countText(n)]];
    if (folder) facts.push(['Created', ago(folder.created)], ['Modified', ago(folder.modified)]);
    const hint = lib.scope === 'trash' ? 'Deleted items stay here for 30 days. Select one to restore it.' : n ? 'Select an item to see its details, link and engagement.' : 'Nothing here yet.';
    body.innerHTML = `<div class="summary"><div class="fields">${facts.map(([k, v]) => `<span class="lab">${esc(k)}</span><span class="val">${esc(v)}</span>`).join('')}</div><p class="muted">${esc(hint)}</p></div>`;
    return;
  }
  if (sel.length > 1) {
    kicker.textContent = 'Selection'; title.textContent = `${sel.length} items`;
    body.innerHTML = `<div class="summary"><div class="big">${sel.length} selected</div>
      <div class="people">${sel.map((i) => `<div class="person"><span class="thumb" style="width:40px;height:22px">${thumbOf(i)}</span><span class="n">${esc(i.title)}<small>${esc(TYPE_LABEL[i.type])}</small></span></div>`).join('')}</div>
      <div class="quick"><button class="btn" type="button" data-bulk="move">${icon('move')}Move to folder</button><button class="btn danger" type="button" data-bulk="delete">${icon('trash')}Move to Trash</button><button class="btn quiet" type="button" data-bulk="clear">Clear selection</button></div></div>`;
    return;
  }
  const item = sel[0];
  kicker.textContent = TYPE_LABEL[item.type]; title.textContent = item.title;
  const sh = item.type !== 'folder' && item.type !== 'image' ? shareOf(item) : null;
  const viewers = VIEWERS[item.id] || [];
  const details = [
    ['Type', TYPE_LABEL[item.type] + (item.aspect ? ` · ${item.aspect}` : '')],
    item.type === 'video' ? ['Length', fmtDur(item.duration)] : null,
    item.type === 'document' ? ['Pages', item.pages] : null,
    item.type === 'image' ? ['Dimensions', item.dims] : null,
    item.size ? ['Size', item.size] : null,
    ['Created', ago(item.created)],
    ['Modified', ago(item.modified)],
    item.type !== 'folder' ? ['Folder', item.folder ? byId(item.folder).title : 'All media'] : null,
    /* Access is a fact about the item, so it sits with the other facts rather than in a switch slot. */
    sh ? ['Access', ACCESS_LABEL[sh.access]] : null,
    item.type === 'video' ? ['Captions', item.captions ? 'Generated' : 'None'] : null,
  ].filter(Boolean);
  body.innerHTML = `
    <div class="preview ${thumbClass(item)}">${thumbOf(item)}${item.type === 'video' ? `<span class="tag">${fmtDur(item.duration)}</span><div class="play"><button class="btn icon" type="button" data-open="${item.id}" aria-label="Open ${esc(item.title)}">${icon('play')}</button></div>` : ''}</div>
    <div class="actions"><button class="btn primary" type="button" data-open="${item.id}">${icon(item.type === 'page' ? 'pencil' : item.type === 'folder' ? 'folder' : 'external')}${item.type === 'page' ? 'Edit page' : item.type === 'folder' ? 'Open folder' : 'Open'}</button>${sh ? `<button class="btn" type="button" data-share="${item.id}">${icon('share')}Share</button>` : ''}</div>
    ${sectHtml('lib-details', 'Details', `<div class="fields">${details.map(([k, v]) => `<span class="lab">${esc(k)}</span><span class="val">${esc(v)}</span>`).join('')}</div>`)}
    ${sh ? sectHtml('lib-link', 'Link', `<div class="link-row"><input class="input" type="text" readonly value="${esc(shareLink(item))}" aria-label="Sample link"><button class="btn icon" type="button" data-copy="${item.id}" aria-label="Copy sample link" data-tip="Copy sample link">${icon('copy')}</button></div><p class="field-msg" data-copy-msg aria-live="polite"></p>`) : ''}
    ${item.views != null && item.type !== 'folder' ? sectHtml('lib-engagement', 'Engagement', `<div class="stats"><div class="stat"><div class="k">Views</div><div class="v">${fmtN(item.views)}</div></div><div class="stat"><div class="k">${item.type === 'document' ? 'Opens' : 'Avg watched'}</div><div class="v">${item.watched != null ? `${item.watched}%` : '—'}</div></div><div class="stat"><div class="k">Last viewed</div><div class="v">${item.lastViewed ? ago(item.lastViewed) : 'Never'}</div></div><div class="stat"><div class="k">Viewers</div><div class="v">${viewers.length}</div></div></div>
      ${viewers.length ? `<div class="people" style="margin-top:10px">${viewers.map((v) => `<div class="person"><span class="avatar" aria-hidden="true">${esc(v.n.split(' ').map((p) => p[0]).join(''))}</span><span class="n">${esc(v.n)}<small>${esc(v.c)}</small></span><span class="v">${v.w}% · ${ago(v.t)}</span></div>`).join('')}</div>` : `<p class="field-msg">No one has viewed this yet. Share the link to start tracking.</p>`}`) : ''}`;
}
function sectHtml(id, title, body, meta = '') {
  const open = state.ed.openSects.has(id) || !state.ed.openSects.has(`closed:${id}`) && !['lib-engagement', 'engagement'].includes(id);
  return `<div class="sect ${open ? 'is-open' : ''}" data-sect="${id}"><button class="sect-head" type="button" aria-expanded="${open}">${esc(title)}${meta ? `<span class="meta">${esc(meta)}</span>` : ''}${icon('chev-right', 'sm chev')}</button><div class="sect-body">${body}</div></div>`;
}
document.addEventListener('click', (e) => {
  const head = e.target.closest('.sect-head');
  if (!head) return;
  const sect = head.parentElement;
  const open = !sect.classList.contains('is-open');
  sect.classList.toggle('is-open', open);
  head.setAttribute('aria-expanded', String(open));
  const id = sect.dataset.sect;
  if (id) { if (open) { state.ed.openSects.add(id); state.ed.openSects.delete(`closed:${id}`); } else { state.ed.openSects.delete(id); state.ed.openSects.add(`closed:${id}`); } }
});

async function copyText(text, msgEl) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { ok = false; }
  if (!ok) {
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove();
    } catch (e) { ok = false; }
  }
  if (msgEl) { msgEl.textContent = ok ? 'Sample link copied.' : 'Could not access the clipboard. Select the link and copy it.'; msgEl.classList.toggle('error', !ok); }
  else toast(ok ? 'Sample link copied' : 'Could not access the clipboard', { kind: ok ? 'ok' : 'error' });
  return ok;
}

/* library events */
$('#lib-rail').addEventListener('click', (e) => {
  const n = e.target.closest('[data-scope]');
  if (n) { setScope(n.dataset.scope); return; }
  if (e.target.closest('[data-new-folder]')) { newFolder(); closeDrawer(); }
});
$('#lib-pane').addEventListener('click', (e) => {
  const scopeBtn = e.target.closest('[data-scope]'); if (scopeBtn) { setScope(scopeBtn.dataset.scope); return; }
  if (e.target.closest('[data-clear-search]')) { lib.query = ''; $('#lib-query').value = ''; renderLibHead(); renderList(); $('#lib-query').focus(); return; }
  const sf = e.target.closest('[data-set-filter]'); if (sf) { lib.filter = sf.dataset.setFilter; renderLibHead(); renderList(); return; }
  const click = e.target.closest('[data-click]'); if (click) { $(click.dataset.click).click(); return; }
  const f = e.target.closest('#lib-filter button'); if (f) { lib.filter = f.dataset.filter; renderLibHead(); renderList(); return; }
  const dn = e.target.closest('#lib-density button'); if (dn) { lib.density = dn.dataset.density; renderLibHead(); renderList(); return; }
  const sortHead = e.target.closest('[data-sort]'); if (sortHead) { const k = sortHead.dataset.sort; const had = document.activeElement === sortHead; lib.reverse = lib.sort === k ? !lib.reverse : false; lib.sort = k; renderLibHead(); renderList(); if (had) { const b = $(`[data-sort="${k}"]`, libList); b && b.focus(); } return; }
  const bulk = e.target.closest('[data-bulk]'); if (bulk) { bulkAction(bulk.dataset.bulk, bulk); return; }
});
$('#lib-sort').addEventListener('click', (e) => {
  const opts = [['recent', 'Recent'], ['name', 'Name'], ['views', 'Most viewed'], ['type', 'Type']];
  openMenu(e.currentTarget, opts.map(([k, l]) => ({ label: l, radio: true, checked: lib.sort === k, onSelect: () => { lib.sort = k; lib.reverse = false; renderLibHead(); renderList(); } })), { align: 'end', head: 'Sort by' });
});
$('#lib-query').addEventListener('input', (e) => { lib.query = e.target.value; renderLibHead(); renderList(); });
$('#lib-query').addEventListener('keydown', (e) => { if (e.key === 'Escape' && lib.query) { lib.query = ''; e.target.value = ''; renderLibHead(); renderList(); } });
$('#lib-query-clear').addEventListener('click', () => { lib.query = ''; $('#lib-query').value = ''; renderLibHead(); renderList(); $('#lib-query').focus(); });
$('#lib-newpage').addEventListener('click', () => newPage(null));
$('#lib-upload').addEventListener('click', () => $('#lib-file').click());
$('#lib-file').addEventListener('change', (e) => { Array.from(e.target.files || []).slice(0, 6).forEach(addDemoUpload); e.target.value = ''; });
$('#lib-record').addEventListener('click', (e) => openRecordDialog(e.currentTarget));
/* Phone: New page and Upload fold into one "+" menu, so the pane head holds three icons and the labels are one tap away. */
$('#lib-new').addEventListener('click', (e) => openMenu(e.currentTarget, [
  { label: 'New Journey Page', icon: 'page', onSelect: () => newPage(null) },
  { label: 'Upload files', icon: 'upload', onSelect: () => $('#lib-file').click() },
], { align: 'end' }));

libList.addEventListener('click', (e) => {
  const opt = e.target.closest('[role="option"]');
  if (!opt) return;
  const id = opt.dataset.id, item = byId(id);
  const act = e.target.closest('[data-act]');
  if (act) {
    e.stopPropagation();
    if (act.dataset.act === 'check') { const s = new Set(lib.selection); s.has(id) ? s.delete(id) : s.add(id); setSelection(s, id); }
    else if (act.dataset.act === 'share') openShare(item, act);
    else if (act.dataset.act === 'more') itemMenu(act, item);
    return;
  }
  if (e.target.closest('[data-rename]')) return;
  if (e.metaKey || e.ctrlKey) { const s = new Set(lib.selection); s.has(id) ? s.delete(id) : s.add(id); setSelection(s, id); return; }
  if (e.shiftKey && lib.cursor) {
    const ids = visibleItems().map((i) => i.id); const a = ids.indexOf(lib.cursor), b = ids.indexOf(id);
    setSelection(ids.slice(Math.min(a, b), Math.max(a, b) + 1), lib.cursor); return;
  }
  if (state.layout.mode === 'phone' && lib.selection.size === 0) { openItem(item, libList); return; }
  setSelection([id], id);
});
libList.addEventListener('dblclick', (e) => { const opt = e.target.closest('[role="option"]'); if (opt && !e.target.closest('[data-act], [data-rename]')) openItem(byId(opt.dataset.id), libList); });
libList.addEventListener('keydown', (e) => {
  const ren = e.target.closest && e.target.closest('[data-rename]');
  if (ren) { if (e.key === 'Enter') { e.preventDefault(); commitRename(ren, false); } else if (e.key === 'Escape') { e.preventDefault(); commitRename(ren, true); } return; }
  const ids = visibleItems().map((i) => i.id);
  if (!ids.length) return;
  const i = ids.indexOf(lib.cursor);
  const move = (j) => { j = clamp(j, 0, ids.length - 1); const id = ids[j]; if (e.shiftKey) { const s = new Set(lib.selection); s.add(id); setSelection(s, id); } else setSelection([id], id); const el = $(`#row-${id}`, libList); el && el.scrollIntoView({ block: 'nearest' }); };
  const cols = effectiveDensity() === 'grid' ? Math.max(1, Math.floor(libList.clientWidth / 220)) : 1;
  if (e.key === 'ArrowDown') { e.preventDefault(); move(i < 0 ? 0 : i + cols); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); move(i < 0 ? 0 : i - cols); }
  else if (e.key === 'ArrowRight' && cols > 1) { e.preventDefault(); move(i + 1); }
  else if (e.key === 'ArrowLeft' && cols > 1) { e.preventDefault(); move(i - 1); }
  else if (e.key === 'Home') { e.preventDefault(); move(0); }
  else if (e.key === 'End') { e.preventDefault(); move(ids.length - 1); }
  else if (e.key === 'Enter' && e.target === libList && lib.cursor) { e.preventDefault(); openItem(byId(lib.cursor), libList); }
  else if (e.key === ' ' && e.target === libList && lib.cursor) { e.preventDefault(); const s = new Set(lib.selection); s.has(lib.cursor) ? s.delete(lib.cursor) : s.add(lib.cursor); setSelection(s, lib.cursor); }
  else if (e.key === 'Escape') { setSelection([], lib.cursor); }
  else if ((e.key === 'Backspace' || e.key === 'Delete') && e.target === libList && lib.selection.size) { e.preventDefault(); deleteItems(selectedItems()); }
  else if (e.key === 'F2' && lib.cursor) { e.preventDefault(); startRename(lib.cursor); }
  else if (e.key === 'a' && (e.metaKey || e.ctrlKey) && e.target === libList) { e.preventDefault(); setSelection(ids, lib.cursor); }
});
libList.addEventListener('focusout', (e) => { const ren = e.target.closest && e.target.closest('[data-rename]'); if (ren && lib.renaming) commitRename(ren, false); });
$('#lib-inspector').addEventListener('click', (e) => {
  const open = e.target.closest('[data-open]'); if (open) { openItem(byId(open.dataset.open), open); return; }
  const sh = e.target.closest('[data-share]'); if (sh) { openShare(byId(sh.dataset.share), sh); return; }
  const cp = e.target.closest('[data-copy]'); if (cp) { copyText(shareLink(byId(cp.dataset.copy)), $('[data-copy-msg]', $('#lib-inspector'))); return; }
  const bulk = e.target.closest('[data-bulk]'); if (bulk) { bulkAction(bulk.dataset.bulk, bulk); return; }
});
$('#lib-insp-more').addEventListener('click', (e) => { const it = selectedItems()[0]; if (it) itemMenu(e.currentTarget, it); });
function bulkAction(kind, anchor) {
  const items = selectedItems();
  if (kind === 'clear') { setSelection([], lib.cursor); libList.focus(); return; }
  if (kind === 'delete') { deleteItems(items); return; }
  if (kind === 'share' && items[0]) { openShare(items[0], anchor); return; }
  if (kind === 'move') {
    const folders = ITEMS.filter((i) => i.type === 'folder' && !i.deleted);
    openMenu(anchor, [{ label: 'All media', icon: 'home', onSelect: () => moveItems(items, null) }, ...folders.map((f) => ({ label: f.title, icon: 'folder', onSelect: () => moveItems(items, f.id) }))], { head: 'Move to' });
  }
}

/* ---------- editor ---------- */

const ed = state.ed;
const PAGES = {
  p1: {
    id: 'p1', title: 'Welcome to your proposal', greeting: 'Hi Maya, here is the plan we talked through on Tuesday, with the numbers you asked for.',
    prospect: 'Maya Chen', company: 'Harbor Logistics', theme: 'light', accent: 'blue', font: 'default',
    sections: [
      { id: 'intro', type: 'video', label: 'Intro video', videoId: 'v1', autoplay: false, controls: true, captions: true, caption: 'A four-minute walkthrough of the Northstar rollout plan for your team.', hidden: false },
      { id: 'value', type: 'value', label: 'What you get', heading: 'What Harbor gets in the first 30 days', body: 'The three things we agreed matter most on the call.', layout: 'list', icons: true, hidden: false, items: [
        { t: 'Onboarding in a week', d: 'Your team records its first ten videos with us on a working session.' },
        { t: 'Engagement you can act on', d: 'See who watched, how far they got, and when to follow up.' },
        { t: 'One link per prospect', d: 'Every proposal page is personal, trackable and easy to forward.' },
      ] },
      { id: 'cta', type: 'cta', label: 'Book a call', heading: 'Ready to see it with your own data?', text: 'Book a 20-minute call', url: 'https://cal.example.com/alex/20min', style: 'filled', align: 'center', newTab: true, hidden: false },
    ],
  },
};
function defaultPage(id, title, videoId) {
  return { id, title, greeting: 'Hi there, here is a short overview I put together for you.', prospect: '', company: '', theme: 'light', accent: 'blue', font: 'default', sections: [
    { id: uid('s'), type: 'video', label: 'Intro video', videoId: videoId || null, autoplay: false, controls: true, captions: false, caption: '', hidden: false },
    { id: uid('s'), type: 'value', label: 'What you get', heading: 'What you get', body: 'Three reasons this matters.', layout: 'list', icons: true, hidden: false, items: [{ t: 'First point', d: 'Say what changes for them.' }, { t: 'Second point', d: 'Back it with a number.' }, { t: 'Third point', d: 'Name the next step.' }] },
    { id: uid('s'), type: 'cta', label: 'Book a call', heading: 'Want to talk it through?', text: 'Book a call', url: 'https://cal.example.com/alex/20min', style: 'filled', align: 'center', newTab: true, hidden: false },
  ] };
}
function currentPage() { if (!PAGES[ed.pageId]) { const it = byId(ed.pageId); PAGES[ed.pageId] = defaultPage(ed.pageId, it ? it.title : 'Untitled page'); } return PAGES[ed.pageId]; }
function sectionById(id) { return currentPage().sections.find((s) => s.id === id); }
function selectedSection() { return ed.selected ? sectionById(ed.selected) : null; }

function firstSectionId() { const s = currentPage().sections[0]; return s ? s.id : null; }
/* The editor opens with the first section selected, so the contextual bar is on screen without a click. Later visits keep whatever was selected. */
function arriveEditor() {
  const e = state.ed;
  if (e.arrived) return;
  e.arrived = true;
  if (e.selected === null && !e.preview) e.selected = firstSectionId();
}
function openEditor(itemId) {
  ed.pageId = itemId; ed.preview = false; ed.arrived = true;
  ed.selected = firstSectionId();
  setView('editor');
  /* Focus follows the user in: the selected section's rail node, from which Tab leads on to the canvas. */
  const node = $(`#ed-rail [data-select-section="${ed.selected || ''}"]`);
  if (node && node.getClientRects().length) node.focus();
}
function newPage(videoId) {
  const item = { id: uid('p'), type: 'page', title: 'Untitled page', views: 0, created: Date.now(), modified: Date.now(), folder: lib.scope.startsWith('folder:') ? lib.scope.slice(7) : null, watched: null, lastViewed: null, seed: 8, shared: false, demo: true };
  ITEMS.unshift(item);
  PAGES[item.id] = defaultPage(item.id, item.title, videoId);
  toast('New page created (demo). It lives in the library until you delete it.');
  openEditor(item.id);
}

function renderEditor() { renderEdRail(); renderEdHead(); renderCanvas(); renderEdInspector(); }
function renderEdHead() {
  const pg = currentPage();
  $('#ed-title').textContent = pg.title || 'Untitled page';
  $('#ed-pane').classList.toggle('is-preview', ed.preview);
  $('#ed-preview').setAttribute('aria-pressed', String(ed.preview));
  $('#ed-device').hidden = !ed.preview;
  $$('#ed-device button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.device === ed.device)));
}
const SEC_ICON = { video: 'video', value: 'list', cta: 'cta', text: 'text', docs: 'file' };
function renderEdRail() {
  const pg = currentPage();
  const rows = pg.sections.map((s, i) => `<div class="rail-section"><button class="node ${s.hidden ? 'is-hidden-section' : ''}" type="button" data-select-section="${s.id}" ${ed.selected === s.id ? 'aria-current="true"' : ''} data-tip="${esc(s.label)}" data-tip-mini>${icon(SEC_ICON[s.type] || 'text')}<span class="lbl">${esc(s.label)}</span>${s.hidden ? `<span class="flag" title="Hidden">${icon('eye-off', 'sm')}</span>` : ''}${s.type === 'cta' && !validUrl(s.url) ? `<span class="flag" style="color:var(--warn)" title="Link needs attention">${icon('alert', 'sm')}</span>` : ''}</button><button class="btn quiet icon more" type="button" data-section-menu="${s.id}" aria-label="Actions for ${esc(s.label)}" aria-haspopup="menu" aria-expanded="false">${icon('more')}</button></div>`).join('');
  $('#ed-rail').innerHTML = `
    <div class="rail-head">Page structure<button class="btn quiet icon" type="button" data-close-drawer aria-label="Close">${icon('x')}</button></div>
    <button class="node" type="button" data-select-section="" ${ed.selected === null ? 'aria-current="true"' : ''} data-tip="Page settings" data-tip-mini>${icon('settings')}<span class="lbl">Page</span></button>
    <div class="rail-group">Sections</div>
    ${rows}
    <button class="btn add" type="button" data-add-section aria-haspopup="menu" aria-expanded="false" data-tip="Add section" data-tip-mini>${icon('plus')}<span class="lbl">Add section</span></button>
    <div class="rail-foot">${pg.sections.filter((s) => !s.hidden).length} of ${pg.sections.length} sections shown</div>`;
}
function validUrl(u) { return /^(https?:\/\/[^\s/$.?#].[^\s]*|mailto:[^\s@]+@[^\s@]+)$/i.test(String(u || '').trim()); }

function ctxBar(s, i, n) {
  return `<div class="ctx-bar" role="toolbar" aria-label="${esc(s.label)} actions"><span class="lbl">${esc(s.label)}</span><span class="sep"></span>
    <button class="btn quiet icon" type="button" data-sec-act="up" aria-label="Move up" data-tip="Move up" ${i === 0 ? 'disabled' : ''}>${icon('arrow-up')}</button>
    <button class="btn quiet icon" type="button" data-sec-act="down" aria-label="Move down" data-tip="Move down" ${i === n - 1 ? 'disabled' : ''}>${icon('arrow-down')}</button><span class="sep"></span>
    <button class="btn quiet icon" type="button" data-sec-act="hide" aria-label="${s.hidden ? 'Show section' : 'Hide section'}" data-tip="${s.hidden ? 'Show' : 'Hide'}">${icon(s.hidden ? 'eye' : 'eye-off')}</button>
    <button class="btn quiet icon" type="button" data-sec-act="duplicate" aria-label="Duplicate section" data-tip="Duplicate">${icon('duplicate')}</button>
    <button class="btn quiet icon danger" type="button" data-sec-act="delete" aria-label="Delete section" data-tip="Delete">${icon('trash')}</button></div>`;
}
/* Inline fields are contenteditable with a textbox role and a name; body text and captions are multiline (Enter inserts a line). */
function editAttr(path, placeholder = '', { label = placeholder, multiline = false } = {}) {
  const base = `data-edit="${path}" data-placeholder="${esc(placeholder)}"`;
  if (ed.preview) return base;
  return `${base} contenteditable="true" spellcheck="false" role="textbox" aria-label="${esc(label)}"${multiline ? ' aria-multiline="true"' : ''}`;
}
function renderSection(s, i, n) {
  const sel = ed.selected === s.id && !ed.preview;
  let inner = '';
  if (s.type === 'video') {
    const v = s.videoId ? byId(s.videoId) : null;
    if (v && !v.deleted) inner = `<div class="pg-video" data-sec-click>${thumbVideo(v.seed, v.aspect)}<button class="pbtn" type="button" aria-label="Play ${esc(v.title)}" data-play>${icon('play')}</button><span class="vdur">${fmtDur(v.duration)}</span>${s.controls ? `<div class="vbar"><span style="width:0"></span></div>` : ''}</div>`;
    else inner = `<div class="pg-video empty-slot">${icon('video')}<span>${ed.preview ? 'Video coming soon' : 'No video yet'}</span>${ed.preview ? '' : `<span style="display:flex;gap:6px"><button class="btn" type="button" data-sec-act="choose-video">${icon('folder')}Choose from library</button><button class="btn" type="button" data-sec-act="record-video">${icon('record')}Record</button></span>`}</div>`;
    inner += `<p class="pg-cap" ${editAttr(`s.${s.id}.caption`, 'Add a caption', { label: 'Caption', multiline: true })}>${esc(s.caption)}</p>`;
  } else if (s.type === 'value') {
    inner = `<h2 ${editAttr(`s.${s.id}.heading`, 'Heading')}>${esc(s.heading)}</h2><p class="pg-body" ${editAttr(`s.${s.id}.body`, 'Intro text', { multiline: true })}>${esc(s.body)}</p>
      <ul class="pg-items ${s.layout === 'columns' ? 'columns' : ''} ${s.icons ? '' : 'no-icons'}">${s.items.map((it, k) => `<li class="pg-item"><span class="pg-ico">${icon('check')}</span><div><strong ${editAttr(`s.${s.id}.items.${k}.t`, 'Point')}>${esc(it.t)}</strong><span ${editAttr(`s.${s.id}.items.${k}.d`, 'Detail')}>${esc(it.d)}</span></div></li>`).join('')}</ul>`;
  } else if (s.type === 'cta') {
    const host = (() => { try { return new URL(s.url).host; } catch (e) { return ''; } })();
    inner = `<div class="pg-cta ${s.align === 'center' ? 'center' : ''}"><h2 ${editAttr(`s.${s.id}.heading`, 'Heading')}>${esc(s.heading)}</h2><a class="pg-btn ${s.style === 'outline' ? 'outline' : ''}" href="${esc(s.url)}" ${s.newTab ? 'target="_blank" rel="noreferrer"' : ''} data-cta data-bind="s.${s.id}.text">${esc(s.text)}</a><span class="pg-cap" style="margin-top:0">${validUrl(s.url) ? `${s.newTab ? 'Opens in a new tab · ' : ''}${esc(host)}` : 'This button has no valid link yet.'}</span></div>`;
  } else if (s.type === 'text') {
    inner = `<h2 ${editAttr(`s.${s.id}.heading`, 'Heading')}>${esc(s.heading)}</h2><p class="pg-body" ${editAttr(`s.${s.id}.body`, 'Write something', { label: 'Body text', multiline: true })}>${esc(s.body)}</p>`;
  } else if (s.type === 'docs') {
    const docs = (s.docIds || []).map(byId).filter((d) => d && !d.deleted);
    inner = `<h2 ${editAttr(`s.${s.id}.heading`, 'Heading')}>${esc(s.heading)}</h2><div class="pg-docs">${docs.length ? docs.map((d) => `<div class="pg-doc">${icon('file')}<span class="n">${esc(d.title)}</span><span class="m">${esc(d.size)} · ${d.pages} pages</span></div>`).join('') : `<div class="pg-doc" style="justify-content:center;color:var(--pg-muted)">${ed.preview ? 'No documents attached.' : 'Pick documents in the properties panel.'}</div>`}</div>`;
  }
  return `<section class="pg-sec ${sel ? 'is-selected' : ''} ${s.hidden ? 'is-hidden' : ''}" data-sid="${s.id}" tabindex="-1" aria-label="${esc(s.label)}">${s.hidden && !ed.preview ? `<span class="pill sec-flag">${icon('eye-off')}Hidden</span>` : ''}${sel ? ctxBar(s, i, n) : ''}${inner}</section>`;
}
function resolvedPageTheme(pg) { return pg.theme === 'auto' ? state.theme : pg.theme; }
function applyPageTheme() { const f = $('.page-frame'); if (f) f.setAttribute('data-page-theme', resolvedPageTheme(currentPage())); }
function renderCanvas() {
  const pg = currentPage();
  const n = pg.sections.length;
  $('#ed-canvas').innerHTML = `<div class="canvas-inner" style="--pg-w:${ed.device === 'phone' && ed.preview ? '390px' : '760px'}">
    ${ed.preview ? `<div class="preview-note">${icon('eye')}<span>Previewing as ${esc(pg.prospect || 'the prospect')} would see it</span><button class="btn xs" type="button" data-exit-preview>Exit preview</button></div>` : ''}
    <article class="page-frame" data-page-theme="${resolvedPageTheme(pg)}" data-accent="${pg.accent}" data-font="${pg.font}" aria-label="Journey Page preview">
      <header class="pg-head"><span class="pg-brand"><span class="mark" aria-hidden="true"></span>${esc(USER.company)}${pg.company ? ` for ${esc(pg.company)}` : ''}</span><span>From ${esc(USER.name)}</span></header>
      <h1 class="pg-title" ${editAttr('page.title', 'Untitled page', { label: 'Page title' })}>${esc(pg.title)}</h1>
      <p class="pg-greet" ${editAttr('page.greeting', 'Add a greeting', { label: 'Greeting' })}>${esc(pg.greeting)}</p>
      ${pg.sections.map((s, i) => renderSection(s, i, n)).join('')}
      <footer class="pg-foot"><span>Sent with Clarity</span><span>${esc(USER.name)} · ${esc(USER.company)}</span></footer>
    </article></div>`;
}

/* inspector */
const sw = (path, on, label, desc = '', extra = '') => `<div class="switch-row"><span><span class="k">${esc(label)}</span>${desc ? `<div class="d">${esc(desc)}</div>` : ''}</span><button class="switch" type="button" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-set="${path}" data-toggle ${extra}></button></div>`;
const segCtl = (path, value, opts, label) => `<div class="seg full" role="group" aria-label="${esc(label)}">${opts.map(([v, l, ic]) => `<button type="button" aria-pressed="${value === v}" data-set="${path}" data-value="${v}">${ic ? icon(ic, 'sm') : ''}${esc(l)}</button>`).join('')}</div>`;
const inp = (path, value, label, { type = 'text', placeholder = '', invalid = false, msg = '', area = false } = {}) => {
  const id = `f-${path.replace(/\W/g, '-')}`;
  const ctl = area ? `<textarea class="input" id="${id}" data-bind="${path}" placeholder="${esc(placeholder)}" rows="3">${esc(value)}</textarea>` : `<input class="input" id="${id}" type="${type}" data-bind="${path}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${invalid ? 'aria-invalid="true"' : ''} ${msg ? `aria-describedby="${id}-m"` : ''}>`;
  return `<label class="lab" for="${id}">${esc(label)}</label><div>${ctl}${msg ? `<p class="field-msg ${invalid ? 'error' : ''}" id="${id}-m" data-msg-for="${path}">${esc(msg)}</p>` : ''}</div>`;
};
function renderEdInspector() {
  const pg = currentPage();
  const s = selectedSection();
  const kicker = $('#ed-insp-kicker'), title = $('#ed-insp-title'), body = $('#ed-insp-body');
  if (!s) {
    /* Text that lives on the page (title, greeting) is edited on the canvas only. The inspector holds what the canvas cannot show. */
    kicker.textContent = 'Page'; title.textContent = pg.title || 'Untitled page';
    const item = byId(pg.id); const sh = item ? shareOf(item) : null;
    const viewers = VIEWERS[pg.id] || [];
    body.innerHTML = `
      ${sectHtml('page', 'Details', `<div class="fields stack">${inp('page.prospect', pg.prospect, 'Prospect', { placeholder: 'Who is this for?' })}${inp('page.company', pg.company, 'Company', { placeholder: 'Their company' })}</div>`)}
      ${sectHtml('appearance', 'Appearance', `<div class="fields stack"><span class="lab">Theme</span>${segCtl('page.theme', pg.theme, [['light', 'Light'], ['dark', 'Dark']], 'Page theme')}<span class="lab">Accent</span><div class="swatches-row" role="radiogroup" aria-label="Accent">${[['blue', 'oklch(50% 0.13 250)'], ['teal', 'oklch(52% 0.1 195)'], ['graphite', 'oklch(28% 0.01 250)'], ['plum', 'oklch(46% 0.14 320)']].map(([v, c]) => `<button class="swatch" type="button" role="radio" aria-checked="${pg.accent === v}" aria-label="${v}" style="--sw:${c}" data-set="page.accent" data-value="${v}" data-tip="${v[0].toUpperCase() + v.slice(1)}"></button>`).join('')}</div><span class="lab">Type</span>${segCtl('page.font', pg.font, [['default', 'Default'], ['serif', 'Serif']], 'Page type')}</div>`)}
      ${sh ? sectHtml('link', 'Link and access', `<div class="fields" style="margin-bottom:8px"><span class="lab">Access</span><span class="val">${esc(ACCESS_LABEL[sh.access])}</span></div><div class="link-row"><input class="input" type="text" readonly value="${esc(shareLink(item))}" aria-label="Sample link"><button class="btn icon" type="button" data-copy-page aria-label="Copy sample link" data-tip="Copy sample link">${icon('copy')}</button></div><p class="field-msg" data-copy-msg aria-live="polite"></p>`) : ''}
      ${sectHtml('engagement', 'Engagement', `<div class="stats"><div class="stat"><div class="k">Views</div><div class="v">${fmtN(item ? item.views || 0 : 0)}</div></div><div class="stat"><div class="k">Avg watched</div><div class="v">${item && item.watched != null ? `${item.watched}%` : '—'}</div></div><div class="stat"><div class="k">Last viewed</div><div class="v">${item && item.lastViewed ? ago(item.lastViewed) : 'Never'}</div></div><div class="stat"><div class="k">Viewers</div><div class="v">${viewers.length}</div></div></div>${viewers.length ? `<div class="people" style="margin-top:10px">${viewers.map((v) => `<div class="person"><span class="avatar" aria-hidden="true">${esc(v.n.split(' ').map((p) => p[0]).join(''))}</span><span class="n">${esc(v.n)}<small>${esc(v.c)}</small></span><span class="v">${v.w}% · ${ago(v.t)}</span></div>`).join('')}</div>` : `<p class="field-msg">No views yet. Share the link to start tracking.</p>`}`)}`;
    return;
  }
  kicker.textContent = `Section · ${{ video: 'Video', value: 'Value', cta: 'Call to action', text: 'Text', docs: 'Documents' }[s.type]}`; title.textContent = s.label;
  const p = (k) => `s.${s.id}.${k}`;
  let specific = '';
  if (s.type === 'video') {
    const v = s.videoId ? byId(s.videoId) : null;
    specific = sectHtml('video', 'Video', `${v && !v.deleted ? `<div class="source"><span class="thumb">${thumbOf(v)}</span><span class="n"><span class="t">${esc(v.title)}</span><span class="m">${fmtDur(v.duration)} · ${v.aspect}${v.captions ? ' · captions' : ''}</span></span><button class="btn xs" type="button" data-sec-act="choose-video">Replace</button></div>` : `<div class="source"><span class="n"><span class="t">No video</span><span class="m">Pick one from the library or record.</span></span><button class="btn xs" type="button" data-sec-act="choose-video">Choose</button></div>`}
      <div style="margin-top:10px">${sw(p('autoplay'), s.autoplay, 'Autoplay', 'Starts muted when the page opens')}${sw(p('controls'), s.controls, 'Show controls', 'Scrubber and volume')}${sw(p('captions'), s.captions, 'Captions', v && v.captions ? 'Generated captions available' : 'No captions on this video', v && v.captions ? '' : 'disabled')}</div>`);
  } else if (s.type === 'value') {
    /* Point text is edited on the page. The inspector adds and removes points and jumps to one. */
    specific = sectHtml('items', 'Points', `<div class="items-edit">${s.items.map((it, k) => `<div class="item-row"><button class="item-go" type="button" data-focus-edit="${p(`items.${k}.t`)}" aria-label="Edit point ${k + 1} on the page"><span data-bind="${p(`items.${k}.t`)}">${esc(it.t)}</span></button><button class="btn quiet icon xs" type="button" data-sec-act="remove-item" data-k="${k}" aria-label="Remove point ${k + 1}" ${s.items.length <= 1 ? 'disabled' : ''}>${icon('x', 'sm')}</button></div>`).join('')}<button class="btn" type="button" data-sec-act="add-item" ${s.items.length >= 6 ? 'disabled' : ''}>${icon('plus')}Add point</button><p class="field-msg">Text is edited on the page. Add, remove and jump to points here.</p></div>`, `${s.items.length}`) +
      sectHtml('layout', 'Layout', `<div class="fields stack">${segCtl(p('layout'), s.layout, [['list', 'List', 'list'], ['columns', 'Columns', 'grid']], 'Layout')}${sw(p('icons'), s.icons, 'Show icons')}</div>`);
  } else if (s.type === 'cta') {
    const ok = validUrl(s.url);
    specific = sectHtml('button', 'Button', `<div class="fields stack">${inp(p('text'), s.text, 'Button label')}${inp(p('url'), s.url, 'Link', { type: 'url', placeholder: 'https://', invalid: !ok, msg: ok ? 'Where the button goes.' : 'Enter a link that starts with https://' })}<span class="lab">Style</span>${segCtl(p('style'), s.style, [['filled', 'Filled'], ['outline', 'Outline']], 'Button style')}<span class="lab">Alignment</span>${segCtl(p('align'), s.align, [['left', 'Left'], ['center', 'Center']], 'Alignment')}${sw(p('newTab'), s.newTab, 'Open in a new tab')}</div>`);
  } else if (s.type === 'docs') {
    const docs = ITEMS.filter((i) => i.type === 'document' && !i.deleted);
    specific = sectHtml('documents', 'Documents', docs.length ? `<div style="display:grid;gap:2px">${docs.map((d) => `<button class="checkbox" type="button" role="checkbox" aria-checked="${(s.docIds || []).includes(d.id)}" data-sec-act="toggle-doc" data-doc="${d.id}"><span class="cb">${icon('check')}</span><span>${esc(d.title)}</span><span class="meta" style="margin-left:auto">${esc(d.size)}</span></button>`).join('')}</div>` : `<p class="field-msg">No documents in the library yet. Upload a PDF first.</p>`, `${(s.docIds || []).length}`);
  }
  /* Structure actions (move, hide, duplicate, delete) live in the contextual bar and the rail menu only. */
  body.innerHTML = `${sectHtml('section', 'Section', `<div class="fields stack">${inp(p('label'), s.label, 'Label')}</div>`)}${specific}`;
}

/* bindings */
function resolvePath(path) {
  const pg = currentPage();
  const parts = path.split('.');
  let obj;
  if (parts[0] === 'page') { obj = pg; parts.shift(); }
  else if (parts[0] === 's') { obj = sectionById(parts[1]); parts.splice(0, 2); }
  if (!obj) return null;
  while (parts.length > 1) { obj = obj[parts.shift()]; if (obj == null) return null; }
  return { obj, key: parts[0] };
}
function getPath(path) { const r = resolvePath(path); return r ? r.obj[r.key] : undefined; }
let saveTimer = null;
function markSaving() {
  const el = $('#ed-saved');
  el.innerHTML = `<span class="dot busy"></span><span class="lbl">Saving</span>`;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { el.innerHTML = `<span class="dot ok"></span><span class="lbl">Saved</span>`; }, 700);
  const item = byId(ed.pageId); if (item) item.modified = Date.now();
}
function setPath(path, value, source = null, { structural = false } = {}) {
  const r = resolvePath(path);
  if (!r) return;
  r.obj[r.key] = value;
  markSaving();
  if (structural) { renderCanvas(); rerenderInspectorKeepFocus(); renderEdRail(); applyPageTheme(); return; }
  $$(`[data-bind="${path}"], [data-edit="${path}"]`).forEach((el) => {
    if (el === source) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') { if (el.value !== value) el.value = value; }
    else if (document.activeElement !== el && el.textContent !== value) el.textContent = value;
  });
  if (path === 'page.title') {
    const item = byId(ed.pageId); if (item) item.title = value || 'Untitled page';
    $('#ed-title').textContent = value || 'Untitled page';
    if (!ed.selected) $('#ed-insp-title').textContent = value || 'Untitled page';
  }
  if (path.endsWith('.label')) { renderEdRail(); $('#ed-insp-title').textContent = value; const bar = $('.pg-sec.is-selected .ctx-bar .lbl'); if (bar) bar.textContent = value; }
  if (path.endsWith('.url')) {
    const s = sectionById(path.split('.')[1]); if (!s) return; const ok = validUrl(value);
    const input = $(`[data-bind="${path}"]`); if (input) input.setAttribute('aria-invalid', String(!ok));
    const msg = $(`[data-msg-for="${path}"]`); if (msg) { msg.textContent = ok ? 'Where the button goes.' : 'Enter a link that starts with https://'; msg.classList.toggle('error', !ok); }
    const a = $(`.pg-sec[data-sid="${s.id}"] a.pg-btn`); if (a) a.setAttribute('href', value);
    const cap = $(`.pg-sec[data-sid="${s.id}"] .pg-cta .pg-cap`); if (cap) { let host = ''; try { host = new URL(value).host; } catch (e) { host = ''; } cap.textContent = ok ? `${s.newTab ? 'Opens in a new tab · ' : ''}${host}` : 'This button has no valid link yet.'; }
    renderEdRail();
  }
  if (path === 'page.company' || path === 'page.prospect') { const b = $('.pg-brand'); if (b) b.innerHTML = `<span class="mark" aria-hidden="true"></span>${esc(USER.company)}${currentPage().company ? ` for ${esc(currentPage().company)}` : ''}`; }
}
function rerenderInspectorKeepFocus() {
  const insp = $('#ed-inspector');
  const sig = focusSig(insp);
  renderEdInspector();
  refocus(insp, sig);
}

/* section operations */
function selectSection(id, { scroll = false, focus = null } = {}) {
  const view = $('#view-editor');
  /* Rail, canvas and inspector are replaced. Focus returns to the same control, or to the section's rail node
     (the Page node when nothing is selected) when that control is gone. */
  const sig = focus ? { sel: focus } : focusSig(view);
  ed.selected = id || null;
  renderEdRail(); renderCanvas(); renderEdInspector();
  if (scroll && id) { const el = $(`.pg-sec[data-sid="${id}"]`); if (el) el.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' }); }
  refocus(view, sig, `#ed-rail [data-select-section="${id || ''}"]`);
  closeDrawer();
}
function sectionAction(kind, s, extra = {}) {
  const pg = currentPage(); const i = pg.sections.indexOf(s);
  if (kind === 'up' && i > 0) { pg.sections.splice(i, 1); pg.sections.splice(i - 1, 0, s); markSaving(); selectSection(s.id); }
  else if (kind === 'down' && i < pg.sections.length - 1) { pg.sections.splice(i, 1); pg.sections.splice(i + 1, 0, s); markSaving(); selectSection(s.id); }
  else if (kind === 'hide') { s.hidden = !s.hidden; markSaving(); selectSection(s.id); }
  else if (kind === 'duplicate') { const c = JSON.parse(JSON.stringify(s)); c.id = uid('s'); c.label = `${s.label} copy`; pg.sections.splice(i + 1, 0, c); markSaving(); selectSection(c.id, { scroll: true }); }
  else if (kind === 'delete') {
    pg.sections.splice(i, 1); markSaving();
    /* The deleted section's controls are gone: focus the next section's rail node, else the Page node. */
    const next = pg.sections[i];
    selectSection(null, { focus: `#ed-rail [data-select-section="${next ? next.id : ''}"]` });
    toast(`Deleted section "${s.label}"`, { action: 'Undo', onAction: () => { pg.sections.splice(Math.min(i, pg.sections.length), 0, s); selectSection(s.id, { scroll: true, focus: `#ed-rail [data-select-section="${s.id}"]` }); } });
  }
  else if (kind === 'choose-video') openMediaPicker(s, extra.anchor);
  else if (kind === 'record-video') { openRecordDialog(extra.anchor); }
  else if (kind === 'add-item') { s.items.push({ t: 'New point', d: 'Add a detail.' }); markSaving(); renderCanvas(); rerenderInspectorKeepFocus(); const added = $(`[data-edit="s.${s.id}.items.${s.items.length - 1}.t"]`, $('#ed-canvas')); if (added) { added.scrollIntoView({ block: 'nearest' }); focusEnd(added, { selectAll: true }); } }
  else if (kind === 'remove-item') { const k = +extra.k; const removed = s.items.splice(k, 1)[0]; markSaving(); renderCanvas(); rerenderInspectorKeepFocus(); toast('Removed point', { action: 'Undo', onAction: () => { s.items.splice(k, 0, removed); renderCanvas(); renderEdInspector(); } }); }
  else if (kind === 'toggle-doc') { s.docIds = s.docIds || []; const d = extra.doc; s.docIds.includes(d) ? (s.docIds = s.docIds.filter((x) => x !== d)) : s.docIds.push(d); markSaving(); renderCanvas(); rerenderInspectorKeepFocus(); }
}
function addSection(type) {
  const pg = currentPage();
  const base = { id: uid('s'), hidden: false };
  const defs = {
    text: { type: 'text', label: 'Text', heading: 'A short heading', body: 'Say one thing that matters to them, in two sentences.' },
    video: { type: 'video', label: 'Video', videoId: null, autoplay: false, controls: true, captions: false, caption: '' },
    docs: { type: 'docs', label: 'Documents', heading: 'Documents to review', docIds: [] },
    cta: { type: 'cta', label: 'Call to action', heading: 'Next step', text: 'Reply to this page', url: 'mailto:alex@northstar.example', style: 'outline', align: 'left', newTab: false },
    value: { type: 'value', label: 'Points', heading: 'Three things to know', body: '', layout: 'list', icons: true, items: [{ t: 'First point', d: 'Detail.' }, { t: 'Second point', d: 'Detail.' }, { t: 'Third point', d: 'Detail.' }] },
  };
  const s = { ...base, ...defs[type] };
  const i = ed.selected ? pg.sections.findIndex((x) => x.id === ed.selected) + 1 : pg.sections.length;
  pg.sections.splice(i, 0, s);
  markSaving();
  selectSection(s.id, { scroll: true });
  toast(`Added ${s.label.toLowerCase()} section`, { action: 'Undo', onAction: () => { removeFrom(pg.sections, s); if (state.view === 'editor') selectSection(null); } });
}
function sectionMenu(anchor, s) {
  const pg = currentPage(); const i = pg.sections.indexOf(s);
  openMenu(anchor, [
    { label: 'Move up', icon: 'arrow-up', disabled: i === 0, onSelect: () => sectionAction('up', s) },
    { label: 'Move down', icon: 'arrow-down', disabled: i === pg.sections.length - 1, onSelect: () => sectionAction('down', s) },
    '-',
    { label: s.hidden ? 'Show on page' : 'Hide from page', icon: s.hidden ? 'eye' : 'eye-off', onSelect: () => sectionAction('hide', s) },
    { label: 'Duplicate', icon: 'duplicate', onSelect: () => sectionAction('duplicate', s) },
    '-',
    { label: 'Delete', icon: 'trash', danger: true, onSelect: () => sectionAction('delete', s) },
  ], { align: 'end' });
}
function openMediaPicker(s, opener = null) {
  const videos = ITEMS.filter((i) => i.type === 'video' && !i.deleted && !i.uploading);
  let chosen = s.videoId;
  const d = openDialog({
    title: 'Choose a video',
    wide: true,
    opener,
    body: videos.length ? `<div class="media-grid" role="radiogroup" aria-label="Videos">${videos.map((v) => `<button class="media-opt" type="button" role="radio" aria-checked="${chosen === v.id}" data-pick="${v.id}"><span class="thumb">${thumbOf(v)}</span><span class="t">${esc(v.title)}</span><span class="m">${fmtDur(v.duration)} · ${v.aspect} · ${fmtN(v.views)} views</span></button>`).join('')}</div>` : `<div class="empty">${icon('video')}<h3>No videos yet</h3><p>Record or upload one in the library first.</p></div>`,
    foot: `<button class="btn quiet danger" type="button" data-pick-none ${s.videoId ? '' : 'hidden'}>Remove video</button><span class="spacer"></span><button class="btn" type="button" data-dialog-close>Cancel</button><button class="btn primary" type="button" data-pick-use ${chosen ? '' : 'disabled'}>Use video</button>`,
    initialFocus: chosen ? `[data-pick="${chosen}"]` : '[data-pick]',
  });
  d.el.addEventListener('click', (e) => {
    const p = e.target.closest('[data-pick]');
    if (p) { chosen = p.dataset.pick; $$('[data-pick]', d.el).forEach((b) => b.setAttribute('aria-checked', String(b === p))); $('[data-pick-use]', d.el).disabled = false; return; }
    /* Re-render before closing so the dialog can hand focus to the opener's replacement. */
    if (e.target.closest('[data-pick-use]') && chosen) { const v = byId(chosen); s.videoId = chosen; s.captions = s.captions && v.captions; markSaving(); selectSection(s.id); d.close(); toast(`Using "${v.title}"`); }
    if (e.target.closest('[data-pick-none]')) { s.videoId = null; s.captions = false; markSaving(); selectSection(s.id); d.close(); }
  });
}

/* editor events */
$('#ed-rail').addEventListener('click', (e) => {
  const sel = e.target.closest('[data-select-section]'); if (sel) { selectSection(sel.dataset.selectSection || null, { scroll: true }); return; }
  const m = e.target.closest('[data-section-menu]'); if (m) { sectionMenu(m, sectionById(m.dataset.sectionMenu)); return; }
  const add = e.target.closest('[data-add-section]'); if (add) { openMenu(add, [['text', 'Text', 'text'], ['video', 'Video', 'video'], ['value', 'Points', 'list'], ['docs', 'Documents', 'file'], ['cta', 'Call to action', 'cta']].map(([t, l, ic]) => ({ label: l, icon: ic, onSelect: () => addSection(t) })), { head: 'Add section' }); }
});
$('#ed-back').addEventListener('click', () => { setView('library'); setSelection([ed.pageId], ed.pageId); libList.focus(); });
$('#ed-preview').addEventListener('click', () => { ed.preview = !ed.preview; if (ed.preview) ed.selected = null; renderEditor(); });
$('#ed-device').addEventListener('click', (e) => { const b = e.target.closest('[data-device]'); if (b) { ed.device = b.dataset.device; renderEdHead(); renderCanvas(); } });
$('#ed-share').addEventListener('click', (e) => openShare(byId(ed.pageId), e.currentTarget));

const canvas = $('#ed-canvas');
canvas.addEventListener('click', (e) => {
  if (e.target.closest('[data-exit-preview]')) { ed.preview = false; renderEditor(); $('#ed-preview').focus(); return; }
  const a = e.target.closest('a'); if (a) { e.preventDefault(); if (ed.preview) toast(`Sample link: ${a.getAttribute('href')}`); }
  if (e.target.closest('[data-play]')) { e.preventDefault(); toast('Playback is not part of this prototype.'); if (ed.preview) return; }
  const act = e.target.closest('[data-sec-act]');
  const sec = e.target.closest('.pg-sec');
  if (act && sec) { e.preventDefault(); sectionAction(act.dataset.secAct, sectionById(sec.dataset.sid), { anchor: act }); return; }
  if (ed.preview) return;
  if (sec) { if (ed.selected !== sec.dataset.sid) { const focusEdit = e.target.closest('[data-edit]'); selectSection(sec.dataset.sid); if (focusEdit) focusEnd($(`[data-edit="${focusEdit.dataset.edit}"]`, canvas)); } }
  else if (!e.target.closest('[data-edit]') && e.target.closest('.page-frame, .canvas-inner, .canvas')) { if (ed.selected) selectSection(null); }
});
canvas.addEventListener('input', (e) => { const el = e.target.closest('[data-edit]'); if (el) setPath(el.dataset.edit, el.textContent, el); });
canvas.addEventListener('keydown', (e) => {
  const el = e.target.closest('[data-edit]');
  if (el && e.key === 'Enter' && !e.shiftKey && !el.matches('.pg-body, .pg-cap')) { e.preventDefault(); el.blur(); }
  if (el && e.key === 'Escape') { el.blur(); }
  /* Escape from the contextual bar deselects and keeps focus on the canvas, on the section itself. */
  if (!el && e.key === 'Escape' && ed.selected) { const sid = ed.selected; selectSection(null, { focus: `.pg-sec[data-sid="${sid}"]` }); }
});
canvas.addEventListener('paste', (e) => { if (e.target.closest('[data-edit]')) { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text')); } });
canvas.addEventListener('focusin', (e) => { const sec = e.target.closest('.pg-sec'); if (sec && ed.selected !== sec.dataset.sid && !ed.preview && e.target.closest('[data-edit]')) { const path = e.target.dataset.edit; selectSection(sec.dataset.sid); focusEnd($(`[data-edit="${path}"]`, canvas)); } });

const edInsp = $('#ed-inspector');
edInsp.addEventListener('input', (e) => { const el = e.target.closest('[data-bind]'); if (el) setPath(el.dataset.bind, el.value, el); });
edInsp.addEventListener('click', (e) => {
  const set = e.target.closest('[data-set]');
  if (set) {
    const path = set.dataset.set;
    let value;
    if (set.hasAttribute('data-toggle')) value = set.getAttribute('aria-checked') !== 'true';
    else value = set.dataset.value;
    setPath(path, value, set, { structural: true });
    return;
  }
  const act = e.target.closest('[data-sec-act]'); if (act) { const s = selectedSection(); if (s) sectionAction(act.dataset.secAct, s, { k: act.dataset.k, doc: act.dataset.doc, anchor: act }); return; }
  const go = e.target.closest('[data-focus-edit]'); if (go) { const el = $(`[data-edit="${go.dataset.focusEdit}"]`, canvas); if (el) { el.scrollIntoView({ block: 'nearest' }); focusEnd(el); } return; }
  if (e.target.closest('[data-copy-page]')) { copyText(shareLink(byId(ed.pageId)), $('[data-copy-msg]', edInsp)); return; }
});

/* ---------- share dialog ---------- */

function openShare(item, opener) {
  if (!item) return;
  const sh = shareOf(item);
  let proto = 'normal';
  let busy = false;
  let emailError = '';
  const bodyHtml = () => {
    if (proto === 'error') return `<div class="banner error">${icon('alert')}<span>Could not load sharing settings. Nothing was changed.</span><button class="btn" type="button" data-retry>Retry</button></div>
      <div class="block"><div class="block-head">Link</div><div class="link-row"><input class="input" type="text" disabled value="" aria-label="Link unavailable" placeholder="Unavailable"><button class="btn primary" type="button" disabled>${icon('copy')}Copy link</button></div></div>`;
    if (proto === 'loading') return `<div class="block"><div class="block-head">Link <span class="pill" style="margin-left:auto"><span class="spinner" aria-hidden="true"></span>Loading</span></div><div class="link-row"><span class="skel line" style="height:28px;flex:1"></span><span class="skel line" style="height:28px;width:96px"></span></div><p class="field-msg" role="status">Loading sharing settings</p></div>
      <div class="block"><div class="block-head">Who can open it</div><div class="radio-list" aria-busy="true"><span class="skel line" style="height:36px"></span><span class="skel line" style="height:36px"></span><span class="skel line" style="height:36px"></span></div></div>`;
    const linkOff = sh.access === 'off';
    /* No status pill in the Link head: the access radios directly below state it, and a bordered pill reads as a control. */
    return `<div class="block"><div class="block-head">Link</div>
      <div class="link-row"><input class="input" type="text" readonly value="${esc(shareLink(item))}" aria-label="Sample link" id="share-link" ${linkOff ? 'disabled' : ''}><button class="btn primary" type="button" data-copy-link ${linkOff ? 'disabled' : ''}>${icon('copy')}Copy link</button></div>
      <p class="field-msg" data-copy-msg role="status" aria-live="polite">${linkOff ? 'The link is off. Turn it on below to copy it.' : `${fmtN(item.views || 0)} views so far. This is a sample link; nothing is published.`}</p></div>
      <div class="block"><div class="block-head">Who can open it ${busy ? `<span class="pill" style="margin-left:auto"><span class="spinner" aria-hidden="true"></span>Updating</span>` : ''}</div>
      <div class="radio-list" role="radiogroup" aria-label="Access" ${busy ? 'aria-busy="true"' : ''}>
        ${[['public', 'Anyone with the link', 'No sign-in. Views are tracked by email when you require it below.', 'globe'], ['invite', 'Only people I invite', 'Invitees get a private link by email.', 'users'], ['off', 'No one (link off)', 'Existing links stop working.', 'lock']].map(([v, t, d, ic]) => `<button class="radio" type="button" role="radio" aria-checked="${sh.access === v}" data-access="${v}" ${busy ? 'disabled' : ''}><span class="rb"></span>${icon(ic)}<span class="t">${t}<small>${d}</small></span></button>`).join('')}
      </div></div>
      ${sh.access === 'invite' ? `<div class="block"><div class="block-head">Invite people</div>
        <div class="link-row"><input class="input" type="email" id="share-email" placeholder="name@company.com" aria-label="Email address" ${emailError ? 'aria-invalid="true" aria-describedby="share-email-m"' : ''}><button class="btn" type="button" data-add-invite>${icon('plus')}Add</button></div>
        ${emailError ? `<p class="field-msg error" id="share-email-m">${esc(emailError)}</p>` : ''}
        ${sh.invitees.length ? `<div class="invitees">${sh.invitees.map((em, k) => `<div class="invitee">${icon('mail', 'muted')}<span class="n">${esc(em)}</span><span class="pill">Invited</span><button class="btn quiet icon xs" type="button" data-remove-invite="${k}" aria-label="Remove ${esc(em)}">${icon('x', 'sm')}</button></div>`).join('')}</div>` : `<div class="empty" style="padding:18px 8px">${icon('users')}<h3>No one invited yet</h3><p>Add an email to send a private link. Nothing is sent from this prototype.</p></div>`}</div>` : ''}
      <div class="block"><div class="block-head">Options</div>
        ${sw('share.requireEmail', sh.requireEmail, 'Require an email to watch', 'Viewers enter their email before the page opens', linkOff ? 'disabled' : '')}
        ${sw('share.notify', sh.notify, 'Notify me on first view', 'One email per viewer', linkOff ? 'disabled' : '')}
        <div class="switch-row"><span><span class="k">Link expires</span></span><select class="input" style="width:140px" data-expires aria-label="Link expires" ${linkOff ? 'disabled' : ''}>${[['never', 'Never'], ['7d', 'In 7 days'], ['30d', 'In 30 days']].map(([v, l]) => `<option value="${v}" ${sh.expires === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      </div>`;
  };
  const d = openDialog({
    title: `Share "${item.title}"`,
    body: bodyHtml(),
    foot: `<div class="proto">Prototype states<div class="seg" role="group" aria-label="Prototype state" data-proto-seg><button type="button" data-proto="normal" aria-pressed="true">Normal</button><button type="button" data-proto="loading" aria-pressed="false">Loading</button><button type="button" data-proto="error" aria-pressed="false">Error</button></div></div><span class="spacer"></span><button class="btn" type="button" data-dialog-close>Done</button>`,
    initialFocus: '[data-copy-link]',
    opener,
    onClose: () => { if (state.view === 'library') { renderList(); renderLibInspector(); } else if (state.view === 'editor') renderEdInspector(); },
  });
  const el = d.el;
  /* The body is replaced on every change. Remember what had focus so it lands on the same control
     afterwards, or on the dialog itself while that control is disabled (busy), never on the page. */
  const focusKey = (a) => {
    if (!a || !$('.dialog-body', el).contains(a)) return null;
    if (a.id) return `#${a.id}`;
    for (const attr of ['data-access', 'data-set', 'data-remove-invite']) if (a.hasAttribute(attr)) return `[${attr}="${a.getAttribute(attr)}"]`;
    for (const attr of ['data-copy-link', 'data-add-invite', 'data-expires', 'data-retry']) if (a.hasAttribute(attr)) return `[${attr}]`;
    return null;
  };
  const rerender = (focusSel) => {
    const key = focusSel || focusKey(document.activeElement);
    $('.dialog-body', el).innerHTML = bodyHtml();
    $$('[data-proto]', el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.proto === proto)));
    const f = key ? $(key, el) : null;
    if (f && !f.disabled) f.focus();
    else if (!el.contains(document.activeElement)) el.focus();
  };
  el.addEventListener('click', (e) => {
    const pr = e.target.closest('[data-proto]'); if (pr) { proto = pr.dataset.proto; rerender(); return; }
    if (e.target.closest('[data-retry]')) { const b = e.target.closest('[data-retry]'); b.setAttribute('aria-busy', 'true'); b.innerHTML = `<span class="spinner" aria-hidden="true"></span>Retry`; setTimeout(() => { proto = 'normal'; rerender('[data-copy-link]'); }, reducedMotion() ? 200 : 800); return; }
    if (e.target.closest('[data-copy-link]')) { copyText(shareLink(item), $('[data-copy-msg]', el)); return; }
    const acc = e.target.closest('[data-access]');
    if (acc && !busy) {
      const next = acc.dataset.access; if (next === sh.access) return;
      busy = true; rerender();
      setTimeout(() => { sh.access = next; item.shared = next !== 'off'; busy = false; rerender(`[data-access="${next}"]`); toast(next === 'off' ? 'Link turned off (sample)' : next === 'invite' ? 'Only invited people can open it (sample)' : 'Anyone with the link can open it (sample)'); }, reducedMotion() ? 150 : 600);
      return;
    }
    if (e.target.closest('[data-add-invite]')) { addInvite(); return; }
    const rm = e.target.closest('[data-remove-invite]'); if (rm) { const removed = sh.invitees.splice(+rm.dataset.removeInvite, 1)[0]; rerender('#share-email'); toast(`Removed ${removed}`, { action: 'Undo', onAction: () => { sh.invitees.push(removed); if (document.contains(el)) rerender(); } }); return; }
    const s = e.target.closest('[data-set^="share."]');
    if (s) { const key = s.dataset.set.slice(6); sh[key] = s.getAttribute('aria-checked') !== 'true'; s.setAttribute('aria-checked', String(sh[key])); }
  });
  el.addEventListener('change', (e) => { const sel = e.target.closest('[data-expires]'); if (sel) sh.expires = sel.value; });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'share-email') { e.preventDefault(); addInvite(); } });
  function addInvite() {
    const input = $('#share-email', el); if (!input) return;
    const v = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { emailError = v ? 'Enter a full email address, like name@company.com.' : 'Enter an email address.'; rerender('#share-email'); return; }
    if (sh.invitees.includes(v.toLowerCase())) { emailError = 'That address is already invited.'; rerender('#share-email'); return; }
    emailError = ''; sh.invitees.push(v.toLowerCase()); rerender('#share-email');
  }
}

/* ---------- system sheet ---------- */

const TOKENS = [
  ['--bg-app', 'App frame, canvas'], ['--bg-panel', 'Rail, inspector, toolbars'], ['--bg-content', 'List, dialogs'], ['--bg-raised', 'Menus, popovers'], ['--bg-sunken', 'Fields, segment tracks'], ['--bg-media', 'Framed media backdrop'],
  ['--fg-1', 'Primary text'], ['--fg-2', 'Secondary text, labels'], ['--fg-3', 'Meta text, icons at rest'], ['--fg-4', 'Decorative only'],
  ['--line', 'Hairlines'], ['--line-strong', 'Control borders'], ['--bg-hover', 'Hover wash'], ['--bg-active', 'Pressed, selected chrome'],
  ['--accent', 'Accent text, focus ring'], ['--accent-fill', 'Primary button'], ['--accent-soft', 'Selected rows'], ['--accent-soft-strong', 'Focus halo, selected hover'],
  ['--ok', 'Success'], ['--warn', 'Warning'], ['--danger', 'Destructive'],
];
const pill = (kind) => kind === 'live' ? `<span class="pill ok">${icon('check')}Live</span>` : kind === 'sim' ? `<span class="pill">Simulated with classes</span>` : `<span class="pill accent">Live and simulated</span>`;
function renderSystem() {
  const host = $('#system');
  const b = (cls, label, attrs = '') => `<button class="btn ${cls}" type="button" ${attrs}>${label}</button>`;
  const stateRow = (name, cls, withIcon = false) => {
    const lab = withIcon ? `${icon('share')}Share` : 'Share';
    return `<span class="rh">${name}</span>${b(cls, lab)}${b(`${cls} sim-hover`, lab)}${b(`${cls} sim-active`, lab)}${b(`${cls} sim-focus`, lab)}${b(cls, lab, 'disabled')}<button class="btn ${cls}" type="button" aria-busy="true"><span class="spinner" aria-hidden="true"></span>Share</button>${b(cls, lab, 'aria-pressed="true"')}`;
  };
  host.innerHTML = `
    <div class="sys-intro"><h1>V5 Contextual studio · system sheet</h1>
      <p>Tokens and primitives as they render in the current theme (${state.theme}). Rows marked Simulated use the classes <code>.sim-hover</code>, <code>.sim-active</code>, <code>.sim-focus</code> and <code>.sim-selected</code>, which reuse the real state selectors. Rows marked Live respond to your pointer and keyboard.</p>
      <div class="legend">${pill('live')}${pill('sim')}<span class="meta">Theme: use the toggle in the top bar or <code>?theme=dark</code>.</span></div></div>

    <div class="sys-section"><h2 class="sys-h">Color tokens <span class="muted">declared, then resolved in this theme</span></h2><div class="swatches">${TOKENS.map(([t, n]) => `<div class="sw"><div class="sw-c" style="background:var(${t})"></div><div class="sw-n">${t}</div><div class="sw-v" data-token="${t}" title="${esc(n)}">${esc(n)}</div></div>`).join('')}</div><p class="sys-note">The first line is the declared value with its variables substituted (mixes show the base token and percentage). The second line is the color the browser resolved. DESIGN.md lists both themes.</p></div>

    <div class="sys-section"><h2 class="sys-h">Type <span class="muted">one family, fixed pixel scale</span></h2>
      ${[['20 / 24 · 600', 'Summary number, sheet title', 'font-size:20px;line-height:24px;font-weight:600;letter-spacing:-0.01em'], ['15 / 20 · 600', 'Dialog title', 'font-size:15px;line-height:20px;font-weight:600'], ['14 / 20 · 600', 'Pane title, stat value', 'font-size:14px;line-height:20px;font-weight:600'], ['13 / 18 · 400', 'Body, controls, rows', 'font-size:13px;line-height:18px'], ['13 / 18 · 500', 'Row titles, button labels', 'font-size:13px;line-height:18px;font-weight:500'], ['12 / 16 · 500', 'Segment labels, section heads, tooltips', 'font-size:12px;line-height:16px;font-weight:500'], ['11 / 14 · 500', 'Meta, kickers, column labels', 'font-size:11px;line-height:14px;font-weight:500;color:var(--fg-3)']].map(([k, u, st]) => `<div class="type-row"><span class="k">${k}<br>${esc(u)}</span><span class="s" style="${st}">Northstar launch walkthrough for Harbor Logistics</span></div>`).join('')}
      <p class="sys-note">Journey Page content uses its own ramp inside the frame: 30/36 title, 22/30 section heading, 16/26 body, 14/20 caption. On coarse pointers the chrome base rises to 14/20 and meta to 12.</p></div>

    <div class="sys-section"><h2 class="sys-h">Spacing, radius, elevation, motion</h2>
      <div class="sys-two"><div class="sys-block"><h4>Spacing scale (px)</h4><div class="space-row">${[4, 6, 8, 10, 12, 14, 16, 24, 36].map((n) => `<div><div style="width:${n}px;height:${n}px"></div><span>${n}</span></div>`).join('')}</div></div>
      <div class="sys-block"><h4>Radius</h4><div class="radius-row">${[['--r-1', 4], ['--r-2', 6], ['--r-3', 8], ['--r-4', 10]].map(([t, n]) => `<div><div style="border-radius:${n}px;width:48px;height:48px;border:1px solid var(--line-strong);background:var(--bg-sunken)"></div><span class="meta">${n} · ${t}</span></div>`).join('')}</div><p class="sys-note">4 inside segments and checkboxes, 6 on controls and rows, 8 on cards, menus and the contextual bar, 10 on dialogs and the page frame. Pills are 4, avatars round.</p></div></div>
      <div class="sys-block" style="margin-top:16px"><h4>Elevation</h4><div class="elev-row"><div class="elev flat"><b>Flat</b>Rail, inspector, toolbars. A hairline, no shadow.</div><div class="elev raised"><b>Raised</b>Menus, tooltips, the contextual bar. Hairline plus one soft shadow.</div><div class="elev sheet"><b>Sheet</b>Dialogs and overlay panels, over a scrim.</div></div>
      <p class="sys-note">Motion: 120 ms for hover and toggles, 180 ms for reveals. Nothing moves for decoration. prefers-reduced-motion removes transitions, the toast rise, the busy pulse and the spinner rotation.</p></div></div>

    <div class="sys-section"><h2 class="sys-h">Buttons ${pill('sim')}</h2>
      <div class="state-table" style="grid-template-columns:80px repeat(7, auto)" role="region" aria-label="Button states, scrolls sideways on narrow screens" tabindex="0"><span></span>${['Default', 'Hover', 'Pressed', 'Focus', 'Disabled', 'Busy', 'Selected'].map((h) => `<span class="h">${h}</span>`).join('')}
      ${stateRow('Primary', 'primary', true)}${stateRow('Default', '', true)}${stateRow('Quiet', 'quiet', true)}${stateRow('Danger', 'danger', true)}</div>
      <h3 class="sys-h" style="margin-top:20px">Buttons ${pill('live')}</h3>
      <div class="gallery">${b('primary', `${icon('record')}Record`)}${b('', `${icon('upload')}Upload`)}${b('quiet', 'Quiet')}${b('danger', `${icon('trash')}Delete`)}${b('icon', icon('share'), 'aria-label="Share" data-tip="Share"')}${b('quiet icon', icon('more'), 'aria-label="More" data-tip="More"')}${b('', 'Toggle me', 'aria-pressed="false" data-demo-toggle')}${b('primary', `${icon('share')}Click for busy`, 'data-demo-busy')}${b('', 'Disabled', 'disabled')}</div>
      <p class="sys-note">Busy keeps the label and swaps the leading icon for a spinner. The label never changes mid-action.</p></div>

    <div class="sys-section"><h2 class="sys-h">Fields ${pill('sim')}</h2>
      <div class="state-table" style="grid-template-columns:repeat(7, minmax(120px, 1fr))" role="region" aria-label="Field states, scrolls sideways on narrow screens" tabindex="0">${['Default', 'Hover', 'Focus', 'Filled', 'Disabled', 'Error', 'Read only'].map((h) => `<span class="h">${h}</span>`).join('')}
        <input class="input" placeholder="Search library" aria-label="Default"><input class="input sim-hover" placeholder="Search library" aria-label="Hover"><input class="input sim-focus" placeholder="Search library" aria-label="Focus"><input class="input" value="Welcome to your proposal" aria-label="Filled"><input class="input" value="Disabled" disabled aria-label="Disabled"><div><input class="input" value="cal.example" aria-invalid="true" aria-label="Error" aria-describedby="sys-err"><p class="field-msg error" id="sys-err">Enter a link that starts with https://</p></div><input class="input" value="https://clarity.example/p/sample" readonly aria-label="Read only"></div>
      <h3 class="sys-h" style="margin-top:20px">Fields ${pill('live')}</h3>
      <div class="gallery" style="align-items:flex-start"><div style="width:260px"><label class="lab meta" for="sys-live-email">Invite by email (validates on input)</label><input class="input" id="sys-live-email" type="email" placeholder="name@company.com" data-demo-email aria-describedby="sys-live-email-m"><p class="field-msg" id="sys-live-email-m">We only check the shape of the address.</p></div><div style="width:260px"><label class="lab meta" for="sys-live-select">Select</label><select class="input" id="sys-live-select"><option>Never</option><option>In 7 days</option><option>In 30 days</option></select></div><div style="width:260px"><label class="lab meta" for="sys-live-area">Textarea</label><textarea class="input" id="sys-live-area" placeholder="Shown under the video"></textarea></div></div></div>

    <div class="sys-section"><h2 class="sys-h">Checkbox and switch ${pill('both')}</h2>
      <div class="gallery" style="gap:20px"><button class="checkbox" type="button" role="checkbox" aria-checked="false" data-demo-check><span class="cb">${icon('check')}</span>Off (live)</button><button class="checkbox" type="button" role="checkbox" aria-checked="true" data-demo-check><span class="cb">${icon('check')}</span>On (live)</button><button class="checkbox" type="button" role="checkbox" aria-checked="mixed"><span class="cb"></span>Mixed</button><button class="checkbox" type="button" role="checkbox" aria-checked="true" disabled><span class="cb">${icon('check')}</span>Disabled</button><button class="checkbox sim-focus" type="button" role="checkbox" aria-checked="false"><span class="cb">${icon('check')}</span>Focus (sim)</button></div>
      <div class="gallery" style="gap:20px;margin-top:12px"><span class="status"><button class="switch" type="button" role="switch" aria-checked="false" aria-label="Off" data-demo-switch></button>Off (live)</span><span class="status"><button class="switch" type="button" role="switch" aria-checked="true" aria-label="On" data-demo-switch></button>On (live)</span><span class="status"><button class="switch sim-hover" type="button" role="switch" aria-checked="true" aria-label="Hover"></button>Hover (sim)</span><span class="status"><button class="switch sim-focus" type="button" role="switch" aria-checked="false" aria-label="Focus"></button>Focus (sim)</span><span class="status"><button class="switch" type="button" role="switch" aria-checked="true" disabled aria-label="Disabled"></button>Disabled</span></div></div>

    <div class="sys-section"><h2 class="sys-h">Tabs, segments, rail nodes ${pill('both')}</h2>
      <div class="gallery" style="gap:20px"><nav class="tabs" aria-label="Sample tabs"><span class="tab" aria-current="page">Library</span><span class="tab sim-hover">Editor (hover sim)</span><span class="tab">System</span></nav>
      <div class="seg" role="group" aria-label="Type (live)"><button type="button" aria-pressed="true" data-demo-seg>All</button><button type="button" aria-pressed="false" data-demo-seg>Videos</button><button type="button" aria-pressed="false" data-demo-seg>Pages</button><button type="button" aria-pressed="false" data-demo-seg>Documents</button></div>
      <div class="seg" role="group" aria-label="Segment states (sim)"><button type="button" class="sim-hover">Hover</button><button type="button" class="sim-focus">Focus</button><button type="button" disabled>Disabled</button></div>
      <div style="width:200px;background:var(--bg-panel);padding:6px;border:1px solid var(--line);border-radius:8px"><button class="node" type="button" aria-current="true">${icon('home')}<span class="lbl">All media</span><span class="count">8</span></button><button class="node sim-hover" type="button">${icon('clock')}<span class="lbl">Recent (hover sim)</span><span class="count">5</span></button><button class="node" type="button">${icon('folder')}<span class="lbl">Proposals</span><span class="count">2</span></button></div></div></div>

    <div class="sys-section"><h2 class="sys-h">Tooltip, menu, toast ${pill('both')}</h2>
      <div class="gallery" style="gap:20px;align-items:flex-start">
        <div class="sys-block"><h4>Tooltip</h4><div class="gallery">${b('quiet icon', icon('share'), 'aria-label="Share" data-tip="Share"')}${b('quiet icon', icon('trash'), 'aria-label="Delete" data-tip="Delete" data-kbd="⌫"')}<span class="tooltip static" role="presentation">Share<kbd>⌘S</kbd></span></div><p class="sys-note">Live on hover after 350 ms and on keyboard focus at once. Static sample at right.</p></div>
        <div class="sys-block"><h4>Menu</h4><div class="gallery" style="align-items:flex-start">${b('', `${icon('more')}Open menu`, 'data-demo-menu aria-haspopup="menu" aria-expanded="false"')}<div class="menu static" role="presentation"><div class="head">Move to</div><button type="button" role="menuitem" tabindex="-1">${icon('external')}<span>Open</span></button><button type="button" role="menuitem" class="sim-hover" tabindex="-1">${icon('share')}<span>Share (hover sim)</span><span class="hint">⌘S</span></button><button type="button" role="menuitemradio" aria-checked="true" tabindex="-1">${icon('folder')}<span>Proposals</span>${icon('check', 'check')}</button><button type="button" role="menuitem" aria-disabled="true" tabindex="-1">${icon('download')}<span>Download</span></button><hr><button type="button" role="menuitem" class="danger" tabindex="-1">${icon('trash')}<span>Delete</span></button></div></div></div>
        <div class="sys-block"><h4>Toast</h4><div class="gallery">${b('', 'Show toast', 'data-demo-toast="plain"')}${b('', 'With undo', 'data-demo-toast="undo"')}${b('', 'Error toast', 'data-demo-toast="error"')}</div><div class="toast static" role="presentation">${icon('check', 'ok')}<span>Moved "Project brief.pdf" to Trash</span><button class="btn" type="button" tabindex="-1">Undo</button><button class="btn icon" type="button" tabindex="-1" aria-label="Dismiss">${icon('x')}</button></div></div></div></div>

    <div class="sys-section"><h2 class="sys-h">Long titles and density ${pill('live')}</h2>
      <div class="sys-two"><div class="sys-demo"><div class="pane-head"><h1 class="pane-title">Discovery call recap for Harbor Logistics, with pricing walkthrough and next steps (final cut, no captions)</h1><span class="pane-meta">12 items</span><div class="pane-tools">${b('', `${icon('upload')}Upload`)}${b('primary', `${icon('record')}Record`)}</div></div>
        <div class="row" role="option" aria-selected="true"><button class="cb-btn" type="button" role="checkbox" aria-checked="true" aria-label="Select" tabindex="-1"><span class="cb">${icon('check')}</span></button><div class="thumb">${thumbVideo(9)}</div><div class="name"><span class="title">Discovery call recap for Harbor Logistics, with pricing walkthrough and next steps</span><span class="sub"><span>Video</span><span class="age">13 d ago</span><span>Public link</span></span></div><span class="num">25:40</span><span class="num">9</span><span class="when">13 d ago</span><div class="acts">${b('quiet icon', icon('share'), 'aria-label="Share"')}${b('quiet icon', icon('more'), 'aria-label="More"')}</div></div>
        <div class="card"><div class="thumb">${thumbVideo(9)}<span class="dur">25:40</span></div><div class="card-body"><span class="title">Discovery call recap for Harbor Logistics, with pricing walkthrough and next steps</span><span class="sub"><span>Video</span><span class="age">13 d ago</span><span>9 views</span></span><div class="acts">${b('quiet icon', icon('share'), 'aria-label="Share"')}${b('quiet icon', icon('more'), 'aria-label="More"')}</div></div></div></div>
      <div class="sys-demo"><div class="inspector" style="position:static;width:auto;box-shadow:none;height:auto"><div class="panel-head"><span class="panel-kicker">Video</span><span class="panel-title">Discovery call recap for Harbor Logistics, with pricing walkthrough and next steps</span>${b('quiet icon', icon('more'), 'aria-label="More"')}</div><div class="panel-body"><div class="sect is-open"><button class="sect-head" type="button" aria-expanded="true">Details${icon('chev-right', 'sm chev')}</button><div class="sect-body"><div class="fields"><span class="lab">Type</span><span class="val">Video · 16:9</span><span class="lab">Folder</span><span class="val">A folder name that is far too long to fit in this column</span><span class="lab">Captions</span><span class="val">Generated</span></div></div></div></div></div></div></div></div>

    <div class="sys-section"><h2 class="sys-h">Empty, loading and error ${pill('both')}</h2>
      <div class="sys-two"><div class="sys-demo"><div class="empty">${icon('search')}<h3>No results for "northstar deck"</h3><p>Check the spelling, or search across all media instead of this folder.</p>${b('', 'Clear search')}</div></div>
      <div class="sys-demo"><div class="row is-skel" aria-hidden="true"><span></span><span class="skel block"></span><div class="name"><span class="skel line" style="width:55%"></span><span class="skel line" style="width:30%;height:8px"></span></div><span class="skel line" style="width:40px"></span><span class="skel line" style="width:32px"></span><span class="skel line" style="width:60px"></span><span></span></div><div class="row is-skel" aria-hidden="true"><span></span><span class="skel block"></span><div class="name"><span class="skel line" style="width:40%"></span><span class="skel line" style="width:25%;height:8px"></span></div><span class="skel line" style="width:40px"></span><span class="skel line" style="width:32px"></span><span class="skel line" style="width:60px"></span><span></span></div><p class="sys-note" style="padding:0 14px 12px">Skeleton rows, used while a folder loads. Shimmer is not used.</p></div></div>
      <div class="gallery" style="margin-top:16px;align-items:flex-start"><div class="banner error" style="max-width:420px">${icon('alert')}<span data-demo-error-msg>Could not load sharing settings. Nothing was changed.</span><button class="btn" type="button" data-demo-retry>Retry</button></div><div class="banner" style="max-width:360px">${icon('info')}<span>Playback is not part of this prototype.</span></div></div>
      <p class="sys-note">Retry runs a simulated 800 ms request and then reports success here. The share dialog has the same loading and error states behind its Prototype states control.</p></div>

    <div class="sys-section"><h2 class="sys-h">Keyboard</h2><div class="fields" style="max-width:520px;grid-template-columns:140px 1fr">${[['↑ ↓', 'Move through the list; Shift extends the selection'], ['Enter', 'Open the item under the cursor'], ['Space', 'Toggle selection'], ['⌘A', 'Select all'], ['F2', 'Rename'], ['⌫', 'Move selection to Trash (undo in the toast)'], ['Esc', 'Clear selection, close menus and dialogs, leave preview'], ['/', 'Focus search']].map(([k, d]) => `<span class="val"><kbd>${esc(k)}</kbd></span><span class="val wrap">${esc(d)}</span>`).join('')}</div></div>`;
  fillTokenValues();
}
function fillTokenValues() {
  if (state.view !== 'system') return;
  const probe = document.createElement('span');
  document.body.appendChild(probe);
  const rootStyle = getComputedStyle(document.documentElement);
  $$('[data-token]').forEach((el) => {
    const t = el.dataset.token;
    /* Custom properties compute to their declared text with var() substituted, so a mix reads as
       "color-mix(in oklab, oklch(...) 10%, transparent)". The probe gives the resolved color. */
    const declared = rootStyle.getPropertyValue(t).trim().replace(/\s+/g, ' ');
    probe.style.background = `var(${t})`;
    const resolved = getComputedStyle(probe).backgroundColor;
    el.innerHTML = `<span class="decl">${esc(declared)}</span><span class="res">${esc(resolved)}</span>`;
    el.title = `${t}: ${declared} resolves to ${resolved}`;
  });
  probe.remove();
}
$('#system').addEventListener('click', (e) => {
  const t = e.target.closest('[data-demo-toggle]'); if (t) { t.setAttribute('aria-pressed', String(t.getAttribute('aria-pressed') !== 'true')); return; }
  const busy = e.target.closest('[data-demo-busy]'); if (busy) { busy.setAttribute('aria-busy', 'true'); busy.insertAdjacentHTML('afterbegin', '<span class="spinner" aria-hidden="true"></span>'); setTimeout(() => { busy.removeAttribute('aria-busy'); const s = $('.spinner', busy); s && s.remove(); toast('Finished (simulated)'); }, 1500); return; }
  const chk = e.target.closest('[data-demo-check]'); if (chk) { chk.setAttribute('aria-checked', String(chk.getAttribute('aria-checked') !== 'true')); return; }
  const sw2 = e.target.closest('[data-demo-switch]'); if (sw2) { sw2.setAttribute('aria-checked', String(sw2.getAttribute('aria-checked') !== 'true')); return; }
  const seg = e.target.closest('[data-demo-seg]'); if (seg) { $$('[data-demo-seg]', seg.parentElement).forEach((b) => b.setAttribute('aria-pressed', String(b === seg))); return; }
  const menu = e.target.closest('[data-demo-menu]'); if (menu) { openMenu(menu, [{ label: 'Open', icon: 'external', onSelect: () => toast('Open (demo)') }, { label: 'Share', icon: 'share', hint: '⌘S', onSelect: () => toast('Share (demo)') }, '-', { head: 'Move to' }, { label: 'All media', icon: 'home', radio: true, checked: true }, { label: 'Proposals', icon: 'folder', radio: true }, '-', { label: 'Download', icon: 'download', disabled: true }, { label: 'Delete', icon: 'trash', danger: true, onSelect: () => toast('Deleted (demo)', { action: 'Undo' }) }], { align: 'start' }); return; }
  const tst = e.target.closest('[data-demo-toast]'); if (tst) { const k = tst.dataset.demoToast; if (k === 'plain') toast('Sample link copied'); else if (k === 'undo') toast('Moved "Project brief.pdf" to Trash', { action: 'Undo', onAction: () => toast('Restored "Project brief.pdf"') }); else toast('Could not access the clipboard', { kind: 'error' }); return; }
  const retry = e.target.closest('[data-demo-retry]'); if (retry) { retry.setAttribute('aria-busy', 'true'); retry.innerHTML = `<span class="spinner" aria-hidden="true"></span>Retry`; setTimeout(() => { const banner = retry.closest('.banner'); banner.classList.remove('error'); banner.innerHTML = `${icon('check', 'ok')}<span>Loaded after retry (simulated). Reload the sheet to see the error again.</span>`; }, reducedMotion() ? 200 : 800); }
});
$('#system').addEventListener('input', (e) => {
  const em = e.target.closest('[data-demo-email]'); if (!em) return;
  const v = em.value.trim(); const ok = !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  em.setAttribute('aria-invalid', String(!ok));
  const m = $('#sys-live-email-m'); m.textContent = ok ? (v ? 'Looks like an address.' : 'We only check the shape of the address.') : 'Enter a full email address, like name@company.com.'; m.classList.toggle('error', !ok);
});

/* ---------- layout: rail, inspector, drawer, divider ---------- */

function layoutMode() { const w = window.innerWidth; return w <= 700 ? 'phone' : w <= 900 ? 'tablet-sm' : w <= 1100 ? 'tablet' : 'desktop'; }
function applyLayout(force = false) {
  const L = state.layout;
  const mode = layoutMode();
  const changed = mode !== L.mode;
  if (changed || force) {
    L.mode = mode; L.userRail = null; L.userInspector = null;
  }
  const rail = L.userRail || (mode === 'desktop' ? 'open' : mode === 'phone' ? 'closed' : 'mini');
  const insp = L.userInspector || (mode === 'desktop' || mode === 'tablet' ? 'open' : 'closed');
  app.setAttribute('data-rail', rail);
  app.setAttribute('data-inspector', insp);
  $('#rail-toggle').setAttribute('aria-expanded', String(rail === 'open'));
  $('#inspector-toggle').setAttribute('aria-pressed', String(insp === 'open'));
  renderSelbar();
  /* Phone drops the grid density and the column headers, so the list and toolbar follow the breakpoint. */
  if (changed && !force && state.view === 'library') { renderLibHead(); renderList(); }
}
$('#rail-toggle').addEventListener('click', () => {
  const L = state.layout;
  if (L.mode === 'phone') { openDrawer($('#rail-toggle')); return; }
  const cur = app.getAttribute('data-rail');
  L.userRail = L.mode === 'desktop' ? (cur === 'open' ? 'closed' : 'open') : (cur === 'open' ? 'mini' : 'open');
  applyLayout();
});
$('#inspector-toggle').addEventListener('click', () => { state.layout.userInspector = app.getAttribute('data-inspector') === 'open' ? 'closed' : 'open'; applyLayout(); });
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-open-inspector]')) { state.layout.userInspector = 'open'; applyLayout(); const panel = $(`#view-${state.view} .inspector`); panel && $('.close-insp', panel) && $('.close-insp', panel).focus(); }
  if (e.target.closest('[data-close-inspector]')) { state.layout.userInspector = 'closed'; applyLayout(); const btn = $(`#view-${state.view} [data-open-inspector]`); if (btn && btn.offsetParent) btn.focus(); else $('#inspector-toggle').focus(); }
  if (e.target.closest('[data-open-rail]')) openDrawer(e.target.closest('[data-open-rail]'));
  if (e.target.closest('[data-close-drawer]')) closeDrawer();
});
let drawerOpener = null;
function openDrawer(opener) {
  if (state.layout.mode !== 'phone' || state.view === 'system') return;
  drawerOpener = opener;
  app.setAttribute('data-rail-drawer', 'open');
  const scrim = document.createElement('div'); scrim.className = 'drawer-scrim'; scrim.id = 'drawer-scrim';
  scrim.addEventListener('pointerdown', closeDrawer);
  $('#overlay-root').appendChild(scrim);
  const rail = $(`#view-${state.view} .rail`);
  const first = rail && $('.node', rail); first && first.focus();
}
function closeDrawer() {
  if (app.getAttribute('data-rail-drawer') !== 'open') return;
  app.removeAttribute('data-rail-drawer');
  const s = $('#drawer-scrim'); s && s.remove();
  if (drawerOpener && document.contains(drawerOpener)) drawerOpener.focus();
  drawerOpener = null;
}
window.addEventListener('resize', () => { applyLayout(); closeDrawer(); hideTip(); closeMenu(false); });

$$('.divider').forEach((div) => {
  const view = div.closest('.view');
  const setW = (w) => { view.style.setProperty('--inspector-w', `${clamp(w, 260, 520)}px`); };
  div.addEventListener('pointerdown', (e) => {
    e.preventDefault(); div.setPointerCapture(e.pointerId); div.classList.add('is-dragging');
    const startX = e.clientX, startW = $('.inspector', view).getBoundingClientRect().width;
    const move = (ev) => setW(startW - (ev.clientX - startX));
    const up = () => { div.classList.remove('is-dragging'); div.removeEventListener('pointermove', move); div.removeEventListener('pointerup', up); };
    div.addEventListener('pointermove', move); div.addEventListener('pointerup', up);
  });
  div.addEventListener('dblclick', () => view.style.removeProperty('--inspector-w'));
  div.addEventListener('keydown', (e) => {
    const w = $('.inspector', view).getBoundingClientRect().width;
    if (e.key === 'ArrowLeft') { e.preventDefault(); setW(w + 16); } else if (e.key === 'ArrowRight') { e.preventDefault(); setW(w - 16); } else if (e.key === 'Home') { e.preventDefault(); view.style.removeProperty('--inspector-w'); }
  });
});

/* ---------- global keys and tabs ---------- */

$('#view-tabs').addEventListener('click', (e) => { const t = e.target.closest('.tab'); if (t) { e.preventDefault(); setView(t.dataset.view); } });
$('#theme-toggle').addEventListener('click', () => setTheme(state.theme === 'dark' ? 'light' : 'dark', { remember: true }));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (openMenuState) { closeMenu(true); return; }
    if (app.getAttribute('data-rail-drawer') === 'open') { closeDrawer(); return; }
    if (dialogStack.length) return;
    if (state.view === 'editor' && ed.preview && !e.target.closest('[contenteditable], input, textarea')) { ed.preview = false; renderEditor(); $('#ed-preview').focus(); return; }
    if (state.layout.mode !== 'desktop' && state.layout.mode !== 'tablet' && app.getAttribute('data-inspector') === 'open' && e.target.closest('.inspector')) { state.layout.userInspector = 'closed'; applyLayout(); }
  }
  if (e.key === '/' && state.view === 'library' && !e.target.closest('input, textarea, [contenteditable="true"]') && !dialogStack.length) { e.preventDefault(); $('#lib-query').focus(); }
});

/* ---------- init ---------- */

applyLayout(true);
readHost();
window.addEventListener('load', () => applyLayout());

})();
