/* Trim processing prototype. Mock data only. Four variants, one simulated
   backend lifecycle, three surfaces side by side. */
'use strict';

const VIDEO = { title: 'Intro for Acme', file: 'intro-for-acme.mp4', duration: 108, trim: { start: 6, end: 52 }, poster: 8 };
const TRIM_LEN = VIDEO.trim.end - VIDEO.trim.start;
const FULL = fmt(VIDEO.duration);
const CUT = fmt(TRIM_LEN);

const VARIANTS = [
  { id: 'a', letter: 'A', name: 'Stay-in-modal stepper', blurb: 'The modal names the stages and stays open after Done. The card and the page carry the stage name as a chip.' },
  { id: 'b', letter: 'B', name: 'Optimistic preview', blurb: 'Every player plays the trimmed range at once. One pill says when viewers get it, and only the pill tracks the real render.' },
  { id: 'c', letter: 'C', name: 'Ambient', blurb: 'The modal closes on Done. A toast, an activity tray and a badge on the card and the page carry progress and retry.' },
  { id: 'd', letter: 'D', name: 'Two versions', blurb: 'The swap is the object. A "viewers get this" row and a "new cut" row appear wherever the video shows, and swap places when the clip is live.' },
];

const PATHS = {
  happy: ['idle', 'saving', 'preparing', 'ready'],
  retry: ['idle', 'saving', 'preparing', 'errored', 'retrying', 'ready'],
  fail: ['idle', 'saving', 'preparing', 'failed'],
};
const PATH_LABEL = { happy: 'Happy', retry: 'Retry once', fail: 'Fail' };
const DURATION = { idle: Infinity, saving: 1.2, preparing: 40, errored: 5, retrying: 20, ready: Infinity, failed: Infinity };
const PATH_DURATION = { retry: { preparing: 9 }, fail: { preparing: 8 } };
const STATE_NOTE = {
  idle: '<b>Backend now:</b> trim handles set, Done not pressed. Nothing pending on the video node.',
  saving: '<b>Backend now:</b> <code>POST /tree/media/videos/:id/edit</code> set-trim in flight. On 202 it writes <code>edit_manifest.trim</code> and <code>mux_clip_pending</code>.',
  preparing: '<b>Backend now:</b> reconciler asked Mux for a clip of the source asset (first ~3 s, <code>asset_id</code> null), then the asset is <code>preparing</code>. The previous playback keeps serving.',
  ready: '<b>Backend now:</b> clip promoted. <code>mux_clip_playback_id</code> set, playback swaps to the clip, source kept for Restore.',
  errored: '<b>Backend now:</b> a Mux call failed. <code>retryOrPark</code> scheduled the next attempt with 5 s backoff (doubles up to 8 attempts).',
  retrying: '<b>Backend now:</b> second attempt. Clip created again, Mux <code>preparing</code>. Previous playback still serves.',
  failed: '<b>Backend now:</b> Mux reports the clip asset <code>errored</code>. <code>pending.failed = true</code>, parked. Only a new save retries it.',
};

const sim = { path: 'happy', index: 0, t: 0, speed: 4, playing: false };
const ui = { variant: 'a', journeyOverlay: null, heroHover: false, selectedVersion: 'new', homeModalClosed: false, journeyEdited: false, pickerChoice: 1 };

let players = [];
let lastKey = null;

/* ---------- helpers ---------- */
function fmt(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
const el = (sel) => document.querySelector(sel);
const stateOf = (s = sim) => PATHS[s.path][s.index];
const stateDuration = (path, state) => PATH_DURATION[path]?.[state] ?? DURATION[state];

const ICONS = {
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  replace: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  alignLeft: '<line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/>',
  alignCenter: '<line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="12" x2="7" y2="12"/><line x1="19" y1="18" x2="5" y2="18"/>',
  alignRight: '<line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  film: '<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>',
  page: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
};
function icon(name, size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}
const spin = (cls = '') => `<span class="spin ${cls}" aria-hidden="true"></span>`;

/* ---------- the simulated lifecycle ---------- */
function deriveView() {
  const state = stateOf();
  const inPrep = state === 'preparing' || state === 'retrying';
  const phase = inPrep ? (sim.t < 3 ? 'cutting' : 'preparing') : null;
  return {
    state,
    phase,
    attempt: state === 'retrying' ? 2 : 1,
    live: state === 'ready' ? 'trimmed' : 'full',
    committed: state !== 'idle',
    busy: ['saving', 'preparing', 'retrying', 'errored'].includes(state),
    t: sim.t,
    retryIn: state === 'errored' ? Math.max(0, Math.ceil(5 - sim.t)) : null,
    long: inPrep && sim.t > 60,
    toastFresh: sim.t < 8,
  };
}
function keyOf(view) {
  return [ui.variant, sim.path, view.state, view.phase, view.long, view.toastFresh, ui.journeyOverlay, ui.heroHover, ui.selectedVersion, ui.homeModalClosed, ui.journeyEdited, ui.pickerChoice, sim.playing, sim.speed].join('|');
}
function advanceIfDue() {
  const state = stateOf();
  const limit = stateDuration(sim.path, state);
  if (sim.t >= limit && sim.index < PATHS[sim.path].length - 1) {
    sim.index += 1;
    sim.t -= limit;
  }
}
function setState(index, t = 0) {
  sim.index = Math.max(0, Math.min(PATHS[sim.path].length - 1, index));
  sim.t = t;
  if (stateOf() === 'idle') { ui.homeModalClosed = false; ui.selectedVersion = 'new'; }
}
function retryTrim() {
  sim.path = 'happy';
  setState(1);
  sim.playing = true;
}

/* ---------- mock footage ---------- */
function drawFrame(ctx, w, h, t) {
  const hue = (210 + (t / VIDEO.duration) * 130) % 360;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsl(${hue} 42% 16%)`);
  g.addColorStop(1, `hsl(${(hue + 40) % 360} 55% 34%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i += 1) {
    const x = w * (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(t / (4 + i) + i * 1.9)));
    const y = h * (0.2 + 0.6 * (0.5 + 0.5 * Math.cos(t / (5 + i) + i * 1.1)));
    const r = Math.min(w, h) * (0.16 + 0.06 * i);
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(255,255,255,0.22)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  if (w > 150) {
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.font = `600 ${Math.max(9, Math.round(w * 0.026))}px system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText('SAMPLE FOOTAGE', w * 0.965, h * 0.1);
    ctx.textAlign = 'left';
  }
}
function paintCanvas(canvas, t) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(2, Math.round(rect.width));
  const h = Math.max(2, Math.round(rect.height));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawFrame(ctx, w, h, t);
}
const thumb = (t) => `<canvas data-thumb="${t}"></canvas>`;

/* A fake player. `range` constrains playback to a span of the source. */
function player({ id, range = null, overlay = '', small = false }) {
  return `<div class="player ${small ? 'small' : ''}" data-player="${id}" data-range="${range ? `${range.start},${range.end}` : ''}">
    <canvas></canvas>
    <button class="play-btn" data-action="toggle-play" aria-label="Play">${icon('play', small ? 12 : 18)}</button>
    <div class="player-bar"><span data-time></span><div class="player-progress"><div class="player-progress-fill"></div></div></div>
    ${overlay}
  </div>`;
}
function mountPlayers() {
  players = [];
  document.querySelectorAll('[data-player]').forEach((node) => {
    const rangeAttr = node.dataset.range;
    const range = rangeAttr ? { start: Number(rangeAttr.split(',')[0]), end: Number(rangeAttr.split(',')[1]) } : null;
    const p = {
      node,
      range,
      canvas: node.querySelector('canvas'),
      time: node.querySelector('[data-time]'),
      fill: node.querySelector('.player-progress-fill'),
      btn: node.querySelector('.play-btn'),
      t: range ? range.start : 0,
      playing: false,
      draw() {
        paintCanvas(this.canvas, this.t);
        const start = this.range ? this.range.start : 0;
        const len = this.range ? this.range.end - this.range.start : VIDEO.duration;
        this.time.textContent = `${fmt(this.t - start)} / ${fmt(len)}`;
        this.fill.style.width = `${((this.t - start) / len) * 100}%`;
      },
      tick(dt) {
        if (!this.playing) return;
        this.t += dt;
        const end = this.range ? this.range.end : VIDEO.duration;
        if (this.t >= end) this.t = this.range ? this.range.start : 0;
        this.draw();
      },
    };
    p.draw();
    players.push(p);
  });
  document.querySelectorAll('canvas[data-thumb]').forEach((c) => paintCanvas(c, Number(c.dataset.thumb)));
  document.querySelectorAll('[data-filmstrip] .track-tiles').forEach((tiles) => {
    const count = 14;
    tiles.innerHTML = Array.from({ length: count }, () => '<canvas></canvas>').join('');
    tiles.querySelectorAll('canvas').forEach((c, i) => paintCanvas(c, ((i + 0.5) / count) * VIDEO.duration));
  });
}

/* ---------- shared copy ---------- */
const VIEWERS_FULL = `Viewers still see the full <b>${FULL}</b> version.`;
const VIEWERS_TRIMMED = `Viewers now see the trimmed <b>${CUT}</b> version.`;
function stageLabel(view) {
  if (view.state === 'saving') return 'Saving';
  if (view.phase === 'cutting') return 'Cutting clip';
  if (view.phase === 'preparing') return 'Preparing playback';
  if (view.state === 'errored') return 'Retrying';
  if (view.state === 'ready') return 'Live';
  if (view.state === 'failed') return 'Trim failed';
  return '';
}

/* ---------- modal ---------- */
function modal(v, view, host) {
  const inTrim = view.state === 'idle' || view.state === 'saving';
  const saving = view.state === 'saving';
  const playsCut = (v === 'b' && view.committed)
    || (v === 'd' && view.committed && ui.selectedVersion === 'new')
    || (v !== 'd' && view.state === 'ready');
  return `<div class="modal" role="dialog" aria-label="Edit Video">
    <div class="modal-head"><div class="modal-title">Edit Video</div><button class="icon-btn" data-action="close-modal" data-host="${host}" title="Close">${icon('x')}</button></div>
    ${player({ id: `modal-${host}`, range: playsCut ? VIDEO.trim : null, overlay: modalPlayerOverlay(v, view) })}
    <div class="dock">
      <div class="dock-tabs"><span class="dock-tab ${inTrim ? 'active' : ''}">Trim</span><span class="dock-tab">Edit Preview</span></div>
      ${track(inTrim)}
      ${inTrim
        ? `<div class="dock-actions">
            <button class="btn btn-ghost btn-sm" ${saving ? 'disabled' : ''}>Restore</button>
            <button class="btn btn-ghost btn-sm" data-action="commit-trim" data-host="${host}" ${saving ? 'disabled' : ''}>${saving ? spin() : ''}Done</button>
            <button class="btn btn-ghost btn-sm" ${saving ? 'disabled' : ''}>Cancel</button>
          </div>`
        : `<div class="dock-summary">Trimmed to <b>${CUT}</b> (${fmt(VIDEO.trim.start)} to ${fmt(VIDEO.trim.end)}). Restore brings the full ${FULL} back.</div>`}
    </div>
    ${modalStatus(v, view)}
    <div class="modal-foot">
      ${footStatus(v, view)}
      <div class="spacer"></div>
      <button class="btn btn-outline">Share</button>
      <button class="btn" data-action="close-modal" data-host="${host}">Done</button>
    </div>
  </div>`;
}
function track(inTrim) {
  const s = (VIDEO.trim.start / VIDEO.duration) * 100;
  const e = (VIDEO.trim.end / VIDEO.duration) * 100;
  return `<div class="track" data-filmstrip>
    <div class="track-tiles"></div>
    <div class="track-dim" style="left:0;width:${s}%"></div>
    <div class="track-dim" style="left:${e}%;right:0"></div>
    <div class="track-rail" style="left:${s}%"></div><div class="track-rail" style="left:${e}%"></div>
    ${inTrim ? `<div class="track-handle" style="left:${s}%"><span>${fmt(VIDEO.trim.start)}</span></div><div class="track-handle right" style="left:${e}%"><span>${fmt(VIDEO.trim.end)}</span></div>` : ''}
  </div>`;
}
function footStatus(v, view) {
  if (v === 'a' || v === 'd') return '';
  if (view.state === 'saving') return `<span class="save-status">${spin()} Saving changes…</span>`;
  if (view.committed) return `<span class="save-status is-saved">${icon('check', 13)} Changes saved</span>`;
  return '';
}
function modalPlayerOverlay(v, view) {
  if (v === 'b' && view.committed) return pillB(view, false);
  if (v === 'c' && view.committed) return badgeC(view, false);
  if (v === 'd' && view.committed) {
    const previewingNew = ui.selectedVersion === 'new';
    return `<span class="media-pill small">${previewingNew ? `Previewing new cut · ${CUT}` : `Previewing full video · ${FULL}`}</span>`;
  }
  return '';
}
function modalStatus(v, view) {
  if (v === 'a' && view.committed) return stepper(view);
  if (v === 'd') return versions(view, 'modal');
  return '';
}

/* Variant A: the stepper */
function stepper(view) {
  const s = view.state;
  const saved = s !== 'saving';
  const cutDone = view.phase === 'preparing' || s === 'ready';
  const prepDone = s === 'ready';
  const steps = [
    { label: 'Saved', cls: saved ? 'is-done' : 'is-active', aside: '' },
    { label: 'Cutting clip', cls: '', aside: '' },
    { label: 'Preparing playback', cls: '', aside: '' },
    { label: 'Live', cls: prepDone ? 'is-live' : '', aside: '' },
  ];
  let detail = '';
  if (s === 'errored') {
    steps[1].cls = 'is-warn';
    steps[1].aside = `retrying in <span data-retry-in>${view.retryIn}</span> s`;
    detail = `<div class="step-detail">Couldn't reach the video service. Retrying on its own.</div>`;
  } else if (s === 'failed') {
    steps[1].cls = 'is-fail';
    detail = `<div class="step-detail">The clip couldn't be made. Save the trim again to retry.</div>`;
  } else if (cutDone) {
    steps[1].cls = 'is-done';
    if (!prepDone) {
      steps[2].cls = 'is-active';
      steps[2].aside = `<span data-elapsed>${Math.floor(view.t)}</span> s · usually under a minute`;
    } else {
      steps[2].cls = 'is-done';
    }
  } else if (saved) {
    steps[1].cls = 'is-active';
    steps[1].aside = s === 'retrying' ? `attempt ${view.attempt}` : `<span data-elapsed>${Math.floor(view.t)}</span> s`;
  }
  const dot = (cls) => {
    if (cls === 'is-active') return spin('lg');
    if (cls === 'is-done' || cls === 'is-live') return icon('check', 10);
    if (cls === 'is-fail') return icon('x', 10);
    return '';
  };
  const rows = steps.map((st, i) => `<div class="step ${st.cls}"><span class="step-dot">${dot(st.cls)}</span><span class="step-label">${st.label}</span><span class="step-aside">${st.aside}</span>${i === 1 ? detail : ''}</div>`).join('');
  const foot = s === 'ready'
    ? `<span>${VIEWERS_TRIMMED}</span>`
    : s === 'failed'
      ? `<span>${VIEWERS_FULL}</span><span class="spacer"></span><button class="btn btn-sm" data-action="retry">Retry trim</button>`
      : `<span>${VIEWERS_FULL} You can close this and keep working.</span>`;
  return `<div class="stepper" aria-live="polite">${rows}<div class="stepper-foot">${foot}</div></div>`;
}

/* Variant B: the one pill */
function pillB(view, small) {
  const size = small ? 'small' : '';
  const s = view.state;
  if (s === 'ready') return `<span class="media-pill ${size} is-ok">${icon('check', 12)} Live for viewers</span>`;
  if (s === 'errored') return `<span class="media-pill ${size} is-warn">${spin()} Retrying in <span data-retry-in>${view.retryIn}</span> s</span>`;
  if (s === 'failed') return `<span class="media-pill ${size} is-fail">${icon('alert', 12)} ${small ? 'Not live' : 'Trim didn’t apply. Viewers see the full video.'} <button class="btn btn-xs btn-outline" data-action="retry">Retry</button></span>`;
  if (view.long) return `<span class="media-pill ${size}">${spin()} ${small ? 'Taking longer' : 'Viewers see this soon. Taking longer than usual.'}</span>`;
  return `<span class="media-pill ${size}">${spin()} ${small ? 'Live in about a minute' : 'Viewers see this in about a minute'}</span>`;
}

/* Variant C: badge, toast, tray */
function badgeC(view, small) {
  const size = small ? 'small' : '';
  if (view.state === 'failed') return `<span class="media-pill ${size} is-fail">${icon('alert', 12)} Trim failed <button class="btn btn-xs btn-outline" data-action="retry">Retry</button></span>`;
  if (view.busy) return `<span class="media-pill ${size}">${spin()} Trimming</span>`;
  return '';
}
function toastC(view) {
  const s = view.state;
  if (s === 'failed') return `<div class="toast is-fail" role="status"><span class="toast-icon">${icon('alert', 14)}</span><div><div class="toast-title">Trim failed</div><div class="toast-desc">Viewers still see the full video.</div><div class="toast-actions"><button class="btn btn-sm" data-action="retry">Retry</button></div></div><button class="icon-btn">${icon('x', 13)}</button></div>`;
  if (!view.toastFresh) return '';
  if (s === 'ready') return `<div class="toast is-ok" role="status"><span class="toast-icon">${icon('check', 14)}</span><div><div class="toast-title">Trim is live</div><div class="toast-desc">Viewers now see the ${CUT} version.</div></div><button class="icon-btn">${icon('x', 13)}</button></div>`;
  if (s === 'preparing' && view.attempt === 1) return `<div class="toast" role="status"><span class="toast-icon">${icon('scissors', 14)}</span><div><div class="toast-title">Trim saved</div><div class="toast-desc">Viewers get the new cut in about a minute.</div></div><button class="icon-btn">${icon('x', 13)}</button></div>`;
  return '';
}
function trayC(view) {
  const s = view.state;
  let sub = '';
  let cls = '';
  let action = '';
  if (s === 'ready') { sub = `${icon('check', 11)} Live · ${CUT}`; cls = 'is-ok'; }
  else if (s === 'failed') { sub = `${icon('alert', 11)} Failed`; cls = 'is-fail'; action = `<button class="btn btn-sm" data-action="retry">Retry</button>`; }
  else if (s === 'errored') { sub = `${spin()} Retrying in <span data-retry-in>${view.retryIn}</span> s`; cls = 'is-warn'; }
  else if (s === 'retrying') { sub = `${spin()} ${stageLabel(view)} · attempt 2`; }
  else { sub = `${spin()} ${stageLabel(view)} · <span data-elapsed>${Math.floor(view.t)}</span> s`; }
  return `<div class="tray"><div class="tray-head">Activity</div>
    <div class="tray-item"><div class="tray-thumb">${thumb(VIDEO.poster)}</div><div><div class="tray-name">${VIDEO.title}</div><div class="tray-sub ${cls}">${sub}</div></div>${action}</div>
  </div>`;
}
function trayButton(view) {
  const count = view.committed ? 1 : 0;
  return `<button class="icon-btn tray-btn ${view.state === 'failed' ? 'is-fail' : ''}" title="Activity">${icon('activity', 16)}${count ? `<span class="count">${count}</span>` : ''}</button>`;
}

/* Variant D: version rows */
function versionRow({ name, dur, sub, cls, tag, selected, id, actions = '', thumbAt }) {
  return `<div class="version ${cls} ${selected ? 'is-selected' : ''}" role="button" tabindex="0" data-action="select-version" data-version="${id}">
    <span class="version-thumb">${thumb(thumbAt)}</span>
    <span><span class="version-name">${name} · ${dur}</span><span class="version-sub">${sub}</span></span>
    <span class="version-actions">${tag ? `<span class="version-tag">${tag}</span>` : ''}${actions}</span>
  </div>`;
}
function versionRows(view) {
  const s = view.state;
  const full = { name: 'Full video', dur: FULL, id: 'full', thumbAt: 0.5 };
  const cut = { name: 'New cut', dur: CUT, id: 'new', thumbAt: VIDEO.trim.start + 1 };
  if (s === 'idle') return [{ ...full, sub: 'Viewers get this', short: 'Viewers get this', cls: 'is-live', tag: 'Live' }];
  if (s === 'ready') return [
    { ...cut, sub: 'Viewers get this', short: 'Viewers get this', cls: 'is-live just-live', tag: 'Live' },
    { ...full, sub: 'Kept. Restore brings it back.', short: 'Kept for Restore', cls: '', tag: '' },
  ];
  const live = { ...full, sub: 'Viewers get this until the new cut is ready', short: 'Viewers get this for now', cls: 'is-live', tag: 'Live' };
  if (s === 'saving') return [live, { ...cut, sub: `${spin()} Saving`, short: `${spin()} Saving`, cls: '' }];
  if (s === 'errored') {
    const retry = `${spin()} Retrying in <span data-retry-in>${view.retryIn}</span> s`;
    return [live, { ...cut, sub: retry, short: retry, cls: 'is-warn' }];
  }
  if (s === 'failed') return [live, { ...cut, sub: `${icon('alert', 11)} Failed. Viewers keep the full video.`, short: `${icon('alert', 11)} Failed`, cls: 'is-fail', actions: `<button class="btn btn-xs" data-action="retry">Retry</button><button class="btn btn-xs btn-ghost" data-action="discard">Discard</button>` }];
  const stage = view.state === 'retrying' ? `${stageLabel(view)} · attempt 2` : `${stageLabel(view)} · <span data-elapsed>${Math.floor(view.t)}</span> s`;
  return [live, { ...cut, sub: `${spin()} ${stage}`, short: `${spin()} ${stage}`, cls: '' }];
}
function versions(view, where) {
  const rows = versionRows(view);
  const selectable = where === 'modal' && view.committed;
  return `<div class="versions">${rows.map((r) => versionRow({ ...r, selected: selectable && ui.selectedVersion === r.id })).join('')}</div>`;
}
function versionsCompact(view) {
  return `<div class="versions">${versionRows(view).map((r) => `<div class="version compact ${r.cls}"><span><span class="version-name">${r.name} · ${r.dur}</span><span class="version-sub">${r.short}</span></span><span class="version-actions">${r.tag ? `<span class="version-tag">${r.tag}</span>` : ''}${r.actions ?? ''}</span></div>`).join('')}</div>`;
}
function tagsD(view) {
  const rows = versionRows(view);
  return `<div class="media-tags">${rows.map((r) => `<span class="media-pill small ${r.cls.includes('is-live') ? 'is-ok' : r.cls.includes('is-fail') ? 'is-fail' : r.cls.includes('is-warn') ? 'is-warn' : ''}">${r.tag ? `${r.tag} · ` : ''}${r.name} ${r.dur}${r.tag ? '' : ` · ${r.short}`}</span>`).join('')}</div>`;
}

/* ---------- home shell + cards ---------- */
function homeShell(v, view, { content, toast = '', tray = '' }) {
  return `<div class="shell">
    <div class="shell-bar"><span class="wordmark">Clarity</span><span class="crumb">Home · <b>Videos</b></span><span class="spacer"></span><span class="icon-btn">${icon('search', 15)}</span>${v === 'c' ? trayButton(view) : ''}<button class="btn btn-sm record-btn">Record</button></div>
    <div class="shell-content">${content}${toast}${tray}</div>
  </div>`;
}
function liveDuration(view) { return view.live === 'trimmed' ? CUT : FULL; }
function cardChip(v, view) {
  if (v === 'a') {
    if (view.state === 'failed') return `<span class="card-chip is-fail">Trim failed</span>`;
    if (view.busy) return `<span class="card-chip is-busy">${spin()} ${stageLabel(view)}</span>`;
  }
  if (v === 'b' && view.committed) return `<span class="card-chip">${CUT}</span>`;
  return `<span class="card-chip">${liveDuration(view)}</span>`;
}
function cardBadge(v, view) {
  if (!view.committed) return '';
  if (v === 'b') return pillB(view, true);
  if (v === 'c') return badgeC(view, true);
  if (v === 'd') return '';
  return '';
}
function cardMeta(v, view) {
  if (v === 'd') return `<div class="card-versions">${versionsCompact(view)}</div>`;
  if (v === 'a' && view.busy) return `<div class="card-meta">${VIEWERS_FULL.replace(/<\/?b>/g, '')}</div>`;
  if (v === 'a' && view.state === 'failed') return `<div class="card-meta is-fail">Viewers see the full video. Open to retry.</div>`;
  if (v === 'c' && view.state === 'failed') return `<div class="card-meta is-fail">Viewers see the full video.</div>`;
  return `<div class="card-meta">${view.committed ? 'Edited just now' : 'Edited 2 min ago'}</div>`;
}
function focusCard(v, view) {
  const playsCut = v === 'b' && view.committed || view.live === 'trimmed';
  return `<article class="media-card is-focus" data-action="open-modal" style="cursor:pointer">
    <div class="card-preview">${thumb(VIDEO.poster)}<span class="card-play">${icon('play', 12)}</span>${cardBadge(v, view)}${cardChip(v, view)}</div>
    <div class="card-body"><div class="card-title">${VIDEO.title}</div>${cardMeta(v, view)}</div>
    ${playsCut && v === 'b' ? '' : ''}
  </article>`;
}
function otherCards() {
  return `<div class="cards two">
    <article class="media-card"><div class="card-preview">${thumb(70)}<span class="card-chip">3:12</span></div><div class="card-body"><div class="card-title">Pricing walkthrough</div><div class="card-meta">Edited yesterday</div></div></article>
    <article class="media-card"><div class="card-preview is-page">${icon('page', 22)}</div><div class="card-body"><div class="card-title">Acme proposal</div><div class="card-meta">Journey page</div></div></article>
  </div>`;
}

/* ---------- panes ---------- */
function paneA(v, view) {
  const closedByVariant = v === 'c' && view.committed && view.state !== 'saving';
  if (closedByVariant || ui.homeModalClosed) {
    return homeShell(v, view, {
      content: `<p class="section-label">Videos</p><div class="cards">${focusCard(v, view)}${otherCards()}</div>`,
      toast: v === 'c' ? toastC(view) : '',
      tray: v === 'c' ? trayC(view) : '',
    });
  }
  return `<div class="app-dim">${homeShell(v, view, { content: `<p class="section-label">Videos</p><div class="cards">${focusCard(v, view)}${otherCards()}</div>` })}</div>
    <div class="modal-layer">${modal(v, view, 'home')}</div>`;
}
function paneB(v, view) {
  return homeShell(v, view, { content: `<p class="section-label">Videos</p><div class="cards">${focusCard(v, view)}${otherCards()}</div>` });
}
function heroOverlay(v, view) {
  if (!view.committed) return '';
  if (v === 'a') {
    if (view.state === 'failed') return `<span class="media-pill small is-fail">${icon('alert', 12)} Trim failed</span>`;
    if (view.busy) return `<span class="media-pill small">${spin()} ${stageLabel(view)}</span>`;
    return '';
  }
  if (v === 'b') return pillB(view, true);
  if (v === 'c') return badgeC(view, true);
  if (v === 'd') return tagsD(view);
  return '';
}
function heroToolbar() {
  return `<div class="jp-toolbar glass" data-editor-chrome>
    <button class="tb-btn icon" title="Align left">${icon('alignLeft', 14)}</button>
    <button class="tb-btn icon" title="Align center">${icon('alignCenter', 14)}</button>
    <button class="tb-btn icon" title="Align right">${icon('alignRight', 14)}</button>
    <span class="tb-sep"></span>
    <button class="tb-btn" data-action="open-journey-edit" title="Trim, preview frame">${icon('pencil', 13)} Edit video</button>
    <button class="tb-btn" data-action="open-journey-replace" title="Pick another video from the library">${icon('replace', 13)} Replace</button>
    <span class="tb-sep"></span>
    <button class="tb-btn icon danger" title="Remove">${icon('x', 14)}</button>
  </div>`;
}
function pickerStatus(v, view) {
  if (!view.committed) return '';
  const s = view.state;
  if (v === 'a') {
    if (s === 'failed') return `<div class="picker-status is-fail">${icon('alert', 11)} Trim failed. Edit video to retry.</div>`;
    if (s === 'ready') return `<div class="picker-status is-ok">${icon('check', 11)} Trimmed to ${CUT}</div>`;
    return `<div class="picker-status">${spin()} ${stageLabel(view)} · viewers see the full video</div>`;
  }
  if (v === 'b') {
    if (s === 'failed') return `<div class="picker-status is-fail">${icon('alert', 11)} Not live. Viewers see the full video. <button class="btn btn-xs btn-outline" data-action="retry">Retry</button></div>`;
    if (s === 'ready') return `<div class="picker-status is-ok">${icon('check', 11)} Live for viewers</div>`;
    if (s === 'errored') return `<div class="picker-status is-warn">${spin()} Retrying in <span data-retry-in>${view.retryIn}</span> s</div>`;
    return `<div class="picker-status">${spin()} Live in about a minute</div>`;
  }
  if (v === 'c') {
    if (s === 'failed') return `<div class="picker-status is-fail">${icon('alert', 11)} Trim failed <button class="btn btn-xs btn-outline" data-action="retry">Retry</button></div>`;
    if (s === 'ready') return `<div class="picker-status is-ok">${icon('check', 11)} Trimmed to ${CUT}</div>`;
    return `<div class="picker-status">${spin()} Trimming</div>`;
  }
  return versionsCompact(view);
}
function mediaPickerCard(v, view) {
  const dur = v === 'b' && view.committed ? CUT : liveDuration(view);
  return `<div class="picker-card">
    <div class="picker-thumb" data-action="open-journey-edit" title="Edit video" style="cursor:pointer">${thumb(VIDEO.poster)}<span class="card-chip">${dur}</span></div>
    <div class="picker-name-row"><span class="picker-name">${VIDEO.file}</span><button class="icon-btn" title="Remove">${icon('x', 12)}</button></div>
    ${pickerStatus(v, view)}
    <div class="picker-actions">
      <button class="btn btn-outline btn-sm" data-action="open-journey-edit">${icon('pencil', 12)} Edit video</button>
      <button class="btn btn-ghost btn-sm" data-action="open-journey-replace">${icon('replace', 12)} Replace</button>
    </div>
  </div>`;
}
function pickerDialog() {
  const items = [
    { name: 'Intro for Acme', at: VIDEO.poster, dur: FULL },
    { name: 'Pricing walkthrough', at: 70, dur: '3:12' },
    { name: 'Team welcome', at: 100, dur: '0:48' },
  ];
  return `<div class="picker-dialog" role="dialog" aria-label="Choose a video">
    <div class="modal-head"><div class="modal-title">Choose a video</div><button class="icon-btn" data-action="close-journey-overlay">${icon('x')}</button></div>
    <div class="picker-grid">${items.map((it, i) => `<div class="picker-item ${ui.pickerChoice === i ? 'is-selected' : ''}" data-action="pick" data-index="${i}"><div class="card-preview">${thumb(it.at)}<span class="card-chip">${it.dur}</span></div><div>${it.name}</div></div>`).join('')}</div>
    <div class="modal-foot"><span class="modal-note">Replaces the video in this block. The library copy is untouched.</span><div class="spacer"></div><button class="btn btn-outline" data-action="close-journey-overlay">Cancel</button><button class="btn" data-action="close-journey-overlay">Use video</button></div>
  </div>`;
}
function paneC(v, view) {
  const heroPlaysCut = (v === 'b' && view.committed) || view.live === 'trimmed';
  const overlay = ui.journeyOverlay === 'edit'
    ? `<div class="overlay"><div class="modal-layer">${modal(v, view, 'journey')}</div></div>`
    : ui.journeyOverlay === 'replace' ? `<div class="overlay">${pickerDialog()}</div>` : '';
  return `<div class="shell">
    <div class="shell-bar"><span class="wordmark">Clarity</span><span class="crumb">Journey page · <b>Acme proposal</b></span><span class="spacer"></span>${v === 'c' ? trayButton(view) : ''}<button class="btn btn-outline btn-sm">Preview</button><button class="btn btn-sm">Publish</button></div>
    <div class="editor-split">
      <div class="jp-canvas-wrap"><div class="jp-canvas">
        <div class="jp-eyebrow">Prepared for Dana at Acme</div>
        <h1 class="jp-title">A quick plan for Acme's onboarding</h1>
        <div class="jp-media ${ui.heroHover ? 'show-toolbar' : ''}" data-hero>
          ${player({ id: 'hero', range: heroPlaysCut ? VIDEO.trim : null, overlay: heroOverlay(v, view) })}
          ${heroToolbar()}
        </div>
        <p class="jp-body">Here is the walkthrough I promised on our call. It covers the rollout in three steps and the two decisions we need from your side before kickoff.</p>
        <span class="jp-cta">Book the kickoff</span>
      </div></div>
      <aside class="inspector">
        <div class="inspector-title">Hero</div>
        <label class="field-label">Title</label><div class="input">A quick plan for Acme's onboarding</div>
        <label class="field-label">Media</label>
        ${mediaPickerCard(v, view)}
      </aside>
    </div>
    ${v === 'c' && ui.journeyEdited ? toastC(view) : ''}
    ${overlay}
  </div>`;
}

/* ---------- bar + header ---------- */
function renderBar(view) {
  const variant = VARIANTS.find((x) => x.id === ui.variant);
  const states = PATHS[sim.path];
  el('#bar').innerHTML = `
    <div class="bar-group">
      <button class="icon-btn" data-action="prev-variant" title="Previous variant (←)">${icon('left')}</button>
      <div class="bar-variant"><b>${variant.letter}</b>${variant.name}</div>
      <button class="icon-btn" data-action="next-variant" title="Next variant (→)">${icon('right')}</button>
    </div>
    <div class="bar-sep"></div>
    <div class="bar-group"><span class="seg">${Object.keys(PATHS).map((p) => `<button class="seg-btn ${p === sim.path ? 'active' : ''}" data-action="set-path" data-path="${p}">${PATH_LABEL[p]}</button>`).join('')}</span></div>
    <div class="bar-sep"></div>
    <div class="bar-group">${states.map((s, i) => `<button class="state-chip ${i === sim.index ? 'active' : i < sim.index ? 'done' : ''}" data-action="set-state" data-index="${i}">${s}</button>`).join('')}</div>
    <div class="bar-sep"></div>
    <div class="bar-group">
      <button class="btn btn-sm ${sim.playing ? 'btn-outline' : ''}" data-action="toggle-sim" style="min-width:58px">${sim.playing ? 'Pause' : 'Play'}</button>
      <span class="seg">${[1, 4, 20].map((x) => `<button class="seg-btn ${x === sim.speed ? 'active' : ''}" data-action="set-speed" data-speed="${x}">${x}×</button>`).join('')}</span>
      <span class="bar-clock"><b data-elapsed>${Math.floor(view.t)}</b> s in ${view.state}</span>
    </div>`;
  const v = VARIANTS.find((x) => x.id === ui.variant);
  el('#head-title').innerHTML = `Trim processing <span>· ${v.letter}. ${v.name}</span>`;
  el('#head-blurb').textContent = v.blurb;
  el('#backend-note').innerHTML = STATE_NOTE[view.state];
  const closed = (ui.variant === 'c' && view.committed && view.state !== 'saving') || ui.homeModalClosed;
  el('#cap-a').textContent = closed ? 'After Done, modal closed' : 'Edit modal, after Done';
}

function render() {
  const view = deriveView();
  document.body.dataset.variant = ui.variant;
  el('#pane-a').innerHTML = paneA(ui.variant, view);
  el('#pane-b').innerHTML = paneB(ui.variant, view);
  el('#pane-c').innerHTML = paneC(ui.variant, view);
  renderBar(view);
  mountPlayers();
  lastKey = keyOf(view);
  syncUrl();
}
function updateLive(view) {
  document.querySelectorAll('[data-elapsed]').forEach((n) => { n.textContent = Math.floor(view.t); });
  document.querySelectorAll('[data-retry-in]').forEach((n) => { n.textContent = view.retryIn; });
}
function syncUrl() {
  const q = new URLSearchParams();
  q.set('variant', ui.variant);
  q.set('path', sim.path);
  q.set('state', stateOf());
  q.set('speed', String(sim.speed));
  history.replaceState(null, '', `?${q}`);
}
function readUrl() {
  const q = new URLSearchParams(location.search);
  const variant = q.get('variant');
  if (variant && VARIANTS.some((v) => v.id === variant)) ui.variant = variant;
  const path = q.get('path');
  if (path && PATHS[path]) sim.path = path;
  const state = q.get('state');
  const idx = PATHS[sim.path].indexOf(state);
  if (idx >= 0) sim.index = idx;
  const t = Number(q.get('t'));
  if (Number.isFinite(t) && t > 0) sim.t = t;
  const speed = Number(q.get('speed'));
  if ([1, 4, 20].includes(speed)) sim.speed = speed;
  if (q.get('play') === '1') sim.playing = true;
  if (q.get('hover') === '1') ui.heroHover = true;
  if (q.get('overlay')) ui.journeyOverlay = q.get('overlay');
}

/* ---------- interaction ---------- */
function act(action, data, target) {
  switch (action) {
    case 'prev-variant':
    case 'next-variant': {
      const i = VARIANTS.findIndex((v) => v.id === ui.variant);
      const n = (i + (action === 'next-variant' ? 1 : -1) + VARIANTS.length) % VARIANTS.length;
      ui.variant = VARIANTS[n].id;
      break;
    }
    case 'set-path': sim.path = data.path; setState(Math.min(sim.index, PATHS[sim.path].length - 1)); break;
    case 'set-state': setState(Number(data.index)); break;
    case 'set-speed': sim.speed = Number(data.speed); break;
    case 'toggle-sim': sim.playing = !sim.playing; break;
    case 'commit-trim':
      if (stateOf() === 'idle') { setState(1); sim.playing = true; }
      if (data.host === 'journey') ui.journeyEdited = true;
      break;
    case 'close-modal':
      if (data.host === 'journey') ui.journeyOverlay = null;
      else ui.homeModalClosed = true;
      break;
    case 'open-modal': ui.homeModalClosed = false; break;
    case 'open-journey-edit': ui.journeyOverlay = 'edit'; break;
    case 'open-journey-replace': ui.journeyOverlay = 'replace'; break;
    case 'close-journey-overlay': ui.journeyOverlay = null; break;
    case 'pick': ui.pickerChoice = Number(data.index); break;
    case 'select-version': ui.selectedVersion = data.version; break;
    case 'retry': retryTrim(); break;
    case 'discard': sim.path = 'happy'; setState(0); break;
    case 'toggle-play': {
      const p = players.find((x) => x.node === target.closest('[data-player]'));
      if (p) {
        p.playing = !p.playing;
        p.node.classList.toggle('is-playing', p.playing);
        p.btn.innerHTML = icon(p.playing ? 'pause' : 'play', p.node.classList.contains('small') ? 12 : 18);
      }
      return;
    }
    default: return;
  }
  render();
}
document.addEventListener('click', (e) => {
  const node = e.target.closest('[data-action]');
  if (!node) return;
  // A retry button inside a card or a version row must not also open/select.
  e.stopPropagation();
  act(node.dataset.action, node.dataset, node);
});
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea')) return;
  if (e.key === 'ArrowLeft') act('prev-variant', {});
  else if (e.key === 'ArrowRight') act('next-variant', {});
  else if (e.key === 'n') act('set-state', { index: sim.index + 1 });
  else if (e.key === 'p') act('set-state', { index: sim.index - 1 });
  else if (e.key === ' ') { e.preventDefault(); act('toggle-sim', {}); }
});
window.addEventListener('resize', () => render());

/* Test hook: deterministic state for screenshots. */
window.proto = {
  set({ variant, path, state, t, hover, overlay, playing, speed } = {}) {
    if (variant) ui.variant = variant;
    if (path) sim.path = path;
    if (state) {
      const idx = PATHS[sim.path].indexOf(state);
      if (idx < 0) throw new Error(`state ${state} not on path ${sim.path}`);
      setState(idx, t ?? 0);
    } else if (t !== undefined) sim.t = t;
    if (hover !== undefined) ui.heroHover = hover;
    if (overlay !== undefined) ui.journeyOverlay = overlay;
    if (playing !== undefined) sim.playing = playing;
    if (speed) sim.speed = speed;
    ui.homeModalClosed = false;
    render();
    return keyOf(deriveView());
  },
  view: () => deriveView(),
  text: () => document.body.innerText,
};

/* ---------- loop ---------- */
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (sim.playing) {
    sim.t += dt * sim.speed;
    advanceIfDue();
  }
  const view = deriveView();
  if (keyOf(view) !== lastKey) render();
  else updateLive(view);
  players.forEach((p) => p.tick(dt));
  requestAnimationFrame(tick);
}

readUrl();
render();
requestAnimationFrame(tick);
