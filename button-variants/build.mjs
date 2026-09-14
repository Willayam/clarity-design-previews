import { readFileSync, writeFileSync } from 'node:fs';

const V = JSON.parse(readFileSync('/tmp/button-classes.json', 'utf8'));
const btn = (key, extra = '') => `${V[key]}${extra ? ' ' + extra : ''}`;
const [vOf, sOf] = [(k) => k.split('/')[0], (k) => k.split('/')[1]];
const B = (key, attrs, inner, extra = '') =>
  `<button type="button" data-slot="button" data-button-variant="${vOf(key)}" data-variant="${vOf(key)}" data-button-size="${sOf(key)}" data-size="${sOf(key)}" class="${btn(key, extra)}" ${attrs}>${inner}</button>`;

const I = {
  image: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
  film: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>',
  alignL: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 6H3"/><path d="M15 12H3"/><path d="M17 18H3"/></svg>',
  alignC: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 6H3"/><path d="M17 12H7"/><path d="M19 18H5"/></svg>',
  alignR: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 6H3"/><path d="M21 12H9"/><path d="M21 18H7"/></svg>',
  x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
};

// One row per hand-painted class. `ctx` wraps every column in the element's
// real surroundings so the app's own container rules apply to both sides.
const rows = [
  {
    n: 1, cls: 'record-status-action', where: 'RecorderStatusZone.tsx:73', ctxNote: 'inside a recorder status message, error and warning tones',
    ctx: (inner) => `<div class="record-status-zone" style="position:static;padding:0"><div class="record-status record-status-bad"><span class="record-status-dot"></span><span class="record-status-text">Camera lost. Reconnect and retry.</span>${inner}</div><div class="record-status record-record-status-warn record-status-warn" style="margin-top:.5rem"><span class="record-status-dot"></span><span class="record-status-text">Low light detected.</span>${inner}</div></div>`,
    before: `<button class="record-status-action" type="button">Retry</button>`,
    after: [
      { label: 'A · outline / xs', note: 'xs is declared and unused today; this is its natural home. Outline paints a white background, where the original inherited the tone colour.', html: B('outline/xs', '', 'Retry') },
      { label: 'B · ghost / xs', note: 'Transparent like the original; loses the 1px border.', html: B('ghost/xs', '', 'Retry') },
    ],
    rec: 'A',
  },
  {
    n: 2, cls: 'upload-progress-card-action', where: 'LibraryGrid.tsx:205 and HomeTreeRoute.tsx:1215', ctxNote: 'on an upload progress card, light shell',
    ctx: (inner) => `<div style="display:flex;align-items:center;gap:.75rem;padding:.75rem;border:1px solid var(--border);border-radius:.75rem;background:var(--card)"><div style="flex:1;min-width:0"><div style="font-size:.8rem;font-weight:600">Q3 outreach.mp4</div><div style="height:4px;border-radius:2px;background:var(--muted);margin-top:.4rem"><div style="width:62%;height:100%;border-radius:2px;background:var(--primary)"></div></div></div>${inner}</div>`,
    before: `<button type="button" class="upload-progress-card-action">Cancel upload</button>`,
    after: [
      { label: 'A · outline / sm', note: 'Closest to the original. Hover becomes the neutral primary tint instead of the destructive tint.', html: B('outline/sm', '', 'Cancel upload') },
      { label: 'B · destructive / sm', note: 'Reads as destructive at rest, which the original only did on hover.', html: B('destructive/sm', '', 'Cancel upload') },
    ],
    rec: 'A',
  },
  {
    n: 3, cls: 'upload-progress-card-terminal', where: 'MediaCard.tsx:265', ctxNote: 'a 2rem icon button pinned to the top-right of a media card; the positioning class stays',
    ctx: (inner) => `<div style="position:relative;width:12rem;height:7rem;border-radius:.9rem;background:linear-gradient(135deg,#dbe4f3,#b9c8e2);overflow:hidden"><div style="position:absolute;inset:auto .75rem .75rem;font-size:.75rem;font-weight:600;color:#1e293b">Upload failed</div>${inner}</div>`,
    before: `<button type="button" class="upload-progress-card-terminal" aria-label="Show details">${I.x}</button>`,
    after: [
      { label: 'A · outline / icon', note: 'size-8 is exactly 2rem. Wrapped in the same absolute position.', html: `<div style="position:absolute;top:.75rem;right:.75rem;z-index:2">${B('outline/icon', 'aria-label="Show details"', I.x)}</div>` },
    ],
    rec: 'A',
  },
  {
    n: 4, cls: 'video-stats-send-link', where: 'VideoStatsModal.tsx:476', ctxNote: 'the action in the statistics modal header, light shell; includes the disabled state',
    ctx: (inner) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.75rem 1rem;border:1px solid var(--border);border-radius:.75rem;background:var(--background)"><div style="white-space:nowrap"><div style="font-weight:700">Q3 outreach</div><div style="font-size:.78rem;color:var(--muted-foreground)">14 views · 3 viewers</div></div><div style="display:flex;gap:.5rem;align-items:center">${inner}</div></div>`,
    before: `<button class="video-stats-send-link" type="button">Copy link</button><button class="video-stats-send-link" type="button" disabled>Copy link</button>`,
    after: [
      { label: 'A · outline / default', note: 'h-8 matches the 2rem min-height. Font weight drops from 700 to 500.', html: B('outline/default', '', 'Copy link') + B('outline/default', 'disabled', 'Copy link') },
      { label: 'B · default / default', note: 'Makes it the primary action of the modal.', html: B('default/default', '', 'Copy link') + B('default/default', 'disabled', 'Copy link') },
    ],
    rec: 'A',
  },
  {
    n: 5, cls: 'video-preview-mode-tab', where: 'VideoPreviewPicker.tsx:456 and 468', ctxNote: 'two tabs in the dark video edit chrome; active tab is filled',
    ctx: (inner) => `<div class="cg-surface cg-surface--media" style="padding:.75rem;border-radius:.75rem;background:#0f172a"><div class="video-preview-header"><div class="video-preview-mode-tabs" style="display:inline-flex;gap:.25rem">${inner}</div></div></div>`,
    before: `<button type="button" role="tab" aria-selected="true" class="video-preview-mode-tab" data-active>${I.image} Still Preview</button><button type="button" role="tab" aria-selected="false" class="video-preview-mode-tab">${I.film} Moving Preview</button>`,
    after: [
      { label: 'A · ghost / sm, active = default / sm', note: 'Two Buttons; the active one switches variant. The proper long-term home is the Tabs primitive, which this page cannot render statically.', html: B('default/sm', 'role="tab" aria-selected="true"', `${I.image} Still Preview`) + B('ghost/sm', 'role="tab" aria-selected="false"', `${I.film} Moving Preview`) },
    ],
    rec: 'A, then Tabs',
  },
  {
    n: 6, cls: 'home-tree-breadcrumb-button', where: 'HomeTreeRoute.tsx:437 and 452', ctxNote: 'breadcrumb crumbs on the home tree, light shell',
    ctx: (inner) => `<nav style="display:flex;align-items:center;gap:.25rem;font-size:.9rem;color:var(--muted-foreground)">${inner}</nav>`,
    before: `<button type="button" class="home-tree-breadcrumb-button">Home</button><span>/</span><button type="button" class="home-tree-breadcrumb-button">Q3 outreach</button><span>/</span><span class="home-tree-breadcrumb-current">Follow-ups</span>`,
    after: [
      { label: 'A · ghost / sm', note: 'h-7 is the original 1.75rem min-height.', html: B('ghost/sm', '', 'Home') + '<span>/</span>' + B('ghost/sm', '', 'Q3 outreach') + '<span>/</span><span class="home-tree-breadcrumb-current">Follow-ups</span>' },
    ],
    rec: 'A',
  },
  {
    n: 7, cls: 'video-player-speed', where: 'VideoPlayer.tsx:388', ctxNote: 'the speed pill in the player control bar; the bar already restyles Buttons through .cg-bar rules',
    ctx: (inner) => `<div class="cg-surface cg-surface--media" style="padding:.5rem;border-radius:.75rem;background:#0b1220"><div class="cg-bar" style="display:flex;align-items:center;gap:.5rem;padding:.25rem .5rem"><span class="video-player-time" style="font-size:.75rem;opacity:.8">0:42 / 2:10</span>${inner}</div></div>`,
    before: `<button type="button" class="video-player-speed" data-active="false" style="height:2rem">1×</button><button type="button" class="video-player-speed" data-active="true" style="height:2rem">1.5×</button>`,
    after: [
      { label: 'A · ghost / default, rounded-full, aria-pressed when not 1×', note: 'The bar’s existing aria-pressed rule paints the active state.', html: B('ghost/default', 'aria-pressed="false"', '1×', 'rounded-full tabular-nums') + B('ghost/default', 'aria-pressed="true"', '1.5×', 'rounded-full tabular-nums') },
    ],
    rec: 'A',
  },
  {
    n: 8, cls: 'mp-tabs-trigger', where: 'MediaPicker.tsx:163', ctxNote: 'three alignment toggles in the media picker toolbar, light shell',
    ctx: (inner) => `<div style="display:inline-flex;align-items:center;gap:.15rem;padding:.25rem;border:1px solid var(--border);border-radius:.5rem;background:var(--background)">${inner}</div>`,
    before: `<button type="button" class="mp-tabs-trigger">${I.alignL}</button><button type="button" class="mp-tabs-trigger mp-tabs-trigger--active">${I.alignC}</button><button type="button" class="mp-tabs-trigger">${I.alignR}</button>`,
    after: [
      { label: 'A · ghost / icon-xs, aria-pressed', note: 'size-6 is the original 1.5rem height; width grows from 1.75rem to a square.', html: B('ghost/icon-xs', 'aria-pressed="false"', I.alignL) + B('ghost/icon-xs', 'aria-pressed="true"', I.alignC) + B('ghost/icon-xs', 'aria-pressed="false"', I.alignR) },
      { label: 'B · ghost / icon-sm, aria-pressed', note: 'One step larger, 1.75rem square.', html: B('ghost/icon-sm', 'aria-pressed="false"', I.alignL) + B('ghost/icon-sm', 'aria-pressed="true"', I.alignC) + B('ghost/icon-sm', 'aria-pressed="false"', I.alignR) },
    ],
    rec: 'A',
  },
];

const notButtons = [
  ['mpb-empty', 'MediaPicker.tsx:383', 'A full-width empty media slot with an icon and title inside. It is a card-shaped pressable, not a button; it moves to ButtonBase and keeps its class.'],
  ['block-move-fallback', 'EditorWorkspace.tsx:282 and 290', 'A visually hidden keyboard fallback that only appears on focus. Not a design-system button; it moves to ButtonBase and keeps its class.'],
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const section = (r) => `
<section id="row-${r.n}">
  <h2>${r.n}. <code>.${r.cls}</code></h2>
  <p class="meta">${r.where} · ${r.ctxNote}</p>
  <div class="cols">
    <div class="col"><h3>Before <span>current CSS</span></h3><div class="stage">${r.ctx(r.before)}</div></div>
    ${r.after.map((a) => `<div class="col"><h3>After <span>${a.label}</span></h3><div class="stage">${r.ctx(a.html)}</div><p class="note">${a.note}</p></div>`).join('')}
  </div>
  <p class="rec">Recommendation: <strong>${r.rec}</strong></p>
</section>`;

const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hand-painted buttons → Button variants</title>
<link rel="stylesheet" href="./app.css">
<style>
  .gallery{max-width:72rem;margin:0 auto;padding:1.5rem 1rem 4rem;font-family:var(--font-sans,system-ui,sans-serif);color:var(--foreground)}
  .gallery h1{font-size:1.5rem;margin:0 0 .25rem}.gallery .lead{color:var(--muted-foreground);margin:0 0 1.5rem;max-width:60ch}
  .gallery section{margin:2.25rem 0;padding-top:1.5rem;border-top:1px solid var(--border)}
  .gallery h2{font-size:1.05rem;margin:0 0 .15rem}.gallery h2 code{font-weight:500;font-size:.95em;background:var(--muted);padding:.05em .35em;border-radius:.3em}
  .gallery .meta{margin:0 0 1rem;font-size:.8rem;color:var(--muted-foreground)}
  .gallery .cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(16rem,1fr));gap:1rem}
  .gallery .col h3{font-size:.8rem;text-transform:uppercase;letter-spacing:.04em;margin:0 0 .5rem;color:var(--muted-foreground)}
  .gallery .col h3 span{text-transform:none;letter-spacing:0;font-weight:500;color:var(--foreground);margin-left:.4rem}
  .gallery .stage{padding:1rem;border:1px dashed var(--border);border-radius:.75rem;background:var(--background);overflow:auto}
  .gallery .note{font-size:.8rem;color:var(--muted-foreground);margin:.5rem 0 0}
  .gallery .rec{margin:1rem 0 0;font-size:.9rem}
  .gallery table{border-collapse:collapse;font-size:.85rem;width:100%;margin:1rem 0}
  .gallery td,.gallery th{text-align:left;padding:.35rem .5rem;border-bottom:1px solid var(--border);vertical-align:top}
  .gallery .hint{font-size:.8rem;color:var(--muted-foreground)}
</style>
<body>
<div class="gallery">
  <h1>Hand-painted buttons → Button variants</h1>
  <p class="lead">Every element below renders with the app's real compiled stylesheet, the current markup on the left and one or two candidates from the shared <code>Button</code> on the right, in the element's own surroundings. Hover works on desktop. Reply with picks like <em>1A 2A 3A 4B 5A 6A 7A 8A</em>, or say what to change.</p>
  <table>
    <tr><th>#</th><th>Class</th><th>Recommendation</th></tr>
    ${rows.map((r) => `<tr><td><a href="#row-${r.n}">${r.n}</a></td><td><code>.${r.cls}</code></td><td>${r.rec}</td></tr>`).join('')}
  </table>
  <p class="hint">Two more raw buttons in the same inventory are not design-system buttons and move to <code>ButtonBase</code> unchanged:</p>
  <table>${notButtons.map(([c, w, why]) => `<tr><td><code>.${c}</code></td><td class="hint">${w}</td><td>${why}</td></tr>`).join('')}</table>
  ${rows.map(section).join('\n')}
  <p class="hint">Source: editor build at the current main, stylesheet chunks concatenated. Class strings come from the real <code>buttonVariants</code> function, not retyped.</p>
</div>
</body>
</html>
`;
writeFileSync('/tmp/button-gallery/index.html', html);
console.log('wrote /tmp/button-gallery/index.html', html.length, 'bytes');
