/* The lab app: state in the URL hash, a mixer with two live frames, a preset list, a gallery. */

const state = {
  config: { ...DEFAULT_CONFIG },
  time: "today",
  theme: "light",
  view: "mixer",
  preset: null,
  nofit: false,
  failNext: false,
};
const apps = { desktop: null, phone: null };
const galleryApps = [];

// Clarity ui/ primitives each option needs. "missing" marks what ui/ does not have today.
const PRIMITIVES = {
  layout: {
    table: { have: ["Table or DataTable", "Input", "Badge", "Button"], missing: [] },
    hero: { have: ["Card", "Table", "Input", "Badge", "Button"], missing: [] },
    master: { have: ["Card", "ButtonBase (list rows)", "Input", "Badge", "Button"], missing: [] },
    calendar: { have: ["Card", "ButtonBase (day cells)", "Input", "Badge", "Button"], missing: ["calendar month grid"] },
    cards: { have: ["Card", "Input", "Badge", "Button"], missing: [] },
    twoup: { have: ["Card", "Table", "Input", "Badge", "Button"], missing: [] },
  },
  editing: {
    row: { have: ["Button"], missing: [] },
    bar: { have: ["Button", "Surface (panel)"], missing: ["sticky save bar"] },
    auto: { have: [], missing: ["save receipt (Saving, Saved, Not saved)"] },
    dialog: { have: ["Dialog", "Button"], missing: [] },
  },
  preview: {
    top: { have: ["LiveTrainingBanner", "LiveTrainingCard", "Badge"], missing: [] },
    beside: { have: ["LiveTrainingBanner", "LiveTrainingCard", "Badge"], missing: [] },
    inline: { have: ["LiveTrainingBanner", "LiveTrainingCard", "Badge"], missing: [] },
    sheet: { have: ["Dialog", "LiveTrainingBanner", "LiveTrainingCard", "Badge"], missing: [] },
    none: { have: [], missing: [] },
  },
  move: {
    native: { have: ["Input (type date and time)", "Button"], missing: [] },
    dialog: { have: ["Dialog", "Input (type date and time)", "Button"], missing: [] },
    pick: { have: ["NativeSelect", "Button"], missing: [] },
  },
  skip: {
    switch: { have: ["Switch", "Label"], missing: [] },
    menu: { have: ["DropdownMenu", "Dialog (confirm)", "Button"], missing: [] },
    button: { have: ["Button (destructive-quiet)"], missing: [] },
  },
};

function primitivesFor(cfg) {
  const have = new Set(), missing = new Set();
  for (const dim of Object.keys(DIMENSIONS)) {
    const p = PRIMITIVES[dim][cfg[dim]];
    p.have.forEach((x) => have.add(x)); p.missing.forEach((x) => missing.add(x));
  }
  return { have: [...have], missing: [...missing] };
}

function readHash() {
  const h = location.hash.replace(/^#/, "");
  const p = new URLSearchParams(h);
  const cfg = {};
  for (const k of Object.keys(DIMENSIONS)) if (p.has(k)) cfg[k] = p.get(k);
  if (p.has("preset")) {
    const pr = PRESETS.find((x) => x.id === p.get("preset"));
    if (pr) Object.assign(cfg, pr.config);
  }
  state.config = coerceConfig(cfg);
  if (p.has("time") && TIMES[p.get("time")]) state.time = p.get("time");
  if (p.has("theme")) state.theme = p.get("theme") === "dark" ? "dark" : "light";
  if (p.has("view")) state.view = p.get("view") === "gallery" ? "gallery" : "mixer";
  state.nofit = p.get("nofit") === "1" || p.get("shoot") === "1";
  document.body.classList.toggle("shoot", p.get("shoot") === "1");
  state.preset = matchPreset(state.config);
}

function writeHash() {
  const p = new URLSearchParams();
  for (const k of Object.keys(DIMENSIONS)) p.set(k, state.config[k]);
  p.set("time", state.time);
  if (state.theme === "dark") p.set("theme", "dark");
  if (state.view === "gallery") p.set("view", "gallery");
  if (state.nofit) p.set("nofit", "1");
  if (document.body.classList.contains("shoot")) p.set("shoot", "1");
  const next = "#" + p.toString();
  if (location.hash !== next) history.replaceState(null, "", next);
}

function matchPreset(cfg) {
  const pr = PRESETS.find((x) => Object.keys(DIMENSIONS).every((k) => x.config[k] === cfg[k]));
  return pr ? pr.id : null;
}

function describe(cfg) {
  return Object.keys(DIMENSIONS).map((k) => DIMENSIONS[k][cfg[k]].name).join(" · ");
}

function makeEnv(phone) {
  return {
    now: new Date(TIMES[state.time].now),
    phone,
    consumeFail() {
      if (state.failNext) { state.failNext = false; renderTop(); return true; }
      return false;
    },
  };
}

/* ---------- Stage ---------- */
function renderStage({ reset = false } = {}) {
  for (const key of ["desktop", "phone"]) {
    const frame = document.getElementById("frame-" + key);
    frame.className = `frame frame-${key}` + (state.theme === "dark" ? " dark" : "");
    if (!apps[key]) apps[key] = createAdminApp({ root: frame, config: state.config, env: makeEnv(key === "phone") });
    else {
      if (reset) apps[key].reset();
      apps[key].setConfig(state.config);
      apps[key].setEnv(makeEnv(key === "phone"));
    }
  }
  fitFrames();
  const note = document.getElementById("stage-note");
  const parts = [];
  for (const dim of Object.keys(DIMENSIONS)) {
    const o = DIMENSIONS[dim][state.config[dim]];
    if (o.note) parts.push(`<b>${o.name}.</b> ${o.note}`);
  }
  const prims = primitivesFor(state.config);
  parts.push(`<b>Primitives.</b> ${prims.have.join(", ")}.${prims.missing.length ? ` <b>Not in ui/ yet.</b> ${prims.missing.join(", ")}.` : ""}`);
  parts.push("Times are shown in Pacific. The real banner shows each user's own time zone.");
  note.innerHTML = parts.join(" ");
}

function fitFrames() {
  for (const wrap of document.querySelectorAll(".frame-wrap")) {
    const frame = wrap.firstElementChild;
    const w = frame.classList.contains("frame-desktop") ? 1440 : 390;
    const h = frame.classList.contains("frame-desktop") ? 900 : 844;
    const avail = wrap.clientWidth || w;
    const s = state.nofit ? 1 : Math.min(1, avail / w);
    frame.style.transform = `scale(${s})`;
    if (state.nofit) { wrap.style.height = ""; wrap.style.width = `${w}px`; }
    else wrap.style.height = `${Math.round(h * s)}px`;
  }
}

/* ---------- Controls ---------- */
function renderControls() {
  const root = document.getElementById("controls");
  const cfg = state.config;
  let html = `<h2>Mix</h2><p class="ctl-why" style="margin:0 0 10px">${describe(cfg)}</p>`;
  for (const dim of Object.keys(DIMENSIONS)) {
    const opts = DIMENSIONS[dim];
    html += `<div class="ctl-group" data-dim="${dim}"><p class="ctl-title">${dim}</p><div class="ctl-options">`;
    for (const key of Object.keys(opts)) {
      const o = opts[key];
      const reason = dim === "layout" ? null : unsupportedReason(cfg.layout, dim, key);
      html += `<button type="button" class="opt${cfg[dim] === key ? " is-active" : ""}" data-dim="${dim}" data-key="${key}" ${reason ? "disabled" : ""} title="${reason || o.note || ""}">${o.name}</button>`;
    }
    html += `</div>`;
    const reasons = dim === "layout" ? [] : Object.keys(opts).map((k) => unsupportedReason(cfg.layout, dim, k)).filter(Boolean);
    if (reasons.length) html += `<p class="ctl-why">${reasons[0]}</p>`;
    const current = opts[cfg[dim]];
    if (current && current.note) html += `<p class="ctl-why">${current.note}</p>`;
    html += `</div>`;
  }
  root.innerHTML = html;
  root.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => {
    const dim = b.dataset.dim, key = b.dataset.key;
    state.config = coerceConfig({ ...state.config, [dim]: key });
    state.preset = matchPreset(state.config);
    update();
  }));
}

function renderPresets() {
  const root = document.getElementById("presets");
  let html = `<h2>${PRESETS.length} presets</h2>`;
  PRESETS.forEach((pr, i) => {
    const prims = primitivesFor(pr.config);
    html += `<button type="button" class="preset${state.preset === pr.id ? " is-active" : ""}" data-id="${pr.id}">
      <span class="p-name"><span class="p-num">${i + 1}</span>${pr.name}</span>
      <span class="p-why">${pr.why}</span>
      <span class="p-cfg">${describe(pr.config)}</span>
      ${prims.missing.length ? `<span class="p-prims"><b>Not in ui/ yet.</b> ${prims.missing.join(", ")}</span>` : ""}
    </button>`;
  });
  root.innerHTML = html;
  root.querySelectorAll(".preset").forEach((b) => b.addEventListener("click", () => loadPreset(b.dataset.id)));
}

function loadPreset(id) {
  const pr = PRESETS.find((x) => x.id === id);
  if (!pr) return;
  state.config = coerceConfig({ ...pr.config });
  state.preset = pr.id;
  state.view = "mixer";
  update({ reset: true });
  window.scrollTo({ top: 0 });
}

/* ---------- Gallery ---------- */
function renderGallery() {
  const root = document.getElementById("gallery");
  root.innerHTML = PRESETS.map((pr, i) => `<div class="gallery-item" data-id="${pr.id}">
      <div class="gallery-head"><strong>${i + 1}. ${pr.name}</strong><span>${pr.why}</span><em>${describe(pr.config)}</em></div>
      <div class="gallery-wrap"><div class="gallery-frame${state.theme === "dark" ? " dark" : ""}" data-preset="${pr.id}"></div></div>
    </div>`).join("");
  galleryApps.length = 0;
  root.querySelectorAll(".gallery-frame").forEach((frame) => {
    const pr = PRESETS.find((x) => x.id === frame.dataset.preset);
    galleryApps.push(createAdminApp({ root: frame, config: pr.config, env: makeEnv(false) }));
  });
  root.querySelectorAll(".gallery-item").forEach((el) => el.addEventListener("click", (e) => {
    if (e.target.closest("input, button, select, label")) return;
    loadPreset(el.dataset.id);
  }));
  fitGallery();
}

function fitGallery() {
  for (const wrap of document.querySelectorAll(".gallery-wrap")) {
    const frame = wrap.firstElementChild;
    const avail = wrap.clientWidth || 1440;
    const s = Math.min(1, avail / 1440);
    frame.style.transform = `scale(${s})`;
    wrap.style.height = `${Math.round(760 * s)}px`;
  }
}

/* ---------- Top bar ---------- */
function renderTop() {
  document.querySelectorAll(".lab-views button").forEach((b) => b.classList.toggle("is-active", b.dataset.view === state.view));
  const seg = document.querySelector('.seg[data-dim="time"]');
  seg.innerHTML = Object.keys(TIMES).map((k) => `<button type="button" data-time="${k}" class="${state.time === k ? "is-active" : ""}">${TIMES[k].name}</button>`).join("");
  seg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { state.time = b.dataset.time; update(); }));
  document.querySelector("#theme-toggle span").textContent = state.theme === "dark" ? "Light" : "Dark";
  const fail = document.getElementById("fail-next");
  fail.setAttribute("aria-pressed", String(state.failNext));
  fail.querySelector("span").textContent = state.failNext ? "Next save fails" : "Fail next save";
  document.getElementById("view-mixer").hidden = state.view !== "mixer";
  document.getElementById("view-gallery").hidden = state.view !== "gallery";
  document.getElementById("lab-sub").textContent = `${PRESETS.length} presets, one mixer, the Admin shell`;
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, 1800);
}

function shuffle() {
  const pick = (o) => { const k = Object.keys(o); return k[Math.floor(Math.random() * k.length)]; };
  const cfg = {};
  for (const k of Object.keys(DIMENSIONS)) cfg[k] = pick(DIMENSIONS[k]);
  state.config = coerceConfig(cfg);
  state.preset = matchPreset(state.config);
  update({ reset: true });
}

function update({ reset = false } = {}) {
  writeHash();
  renderTop();
  if (state.view === "mixer") { renderControls(); renderPresets(); renderStage({ reset }); }
  else renderGallery();
}

function init() {
  readHash();
  document.querySelectorAll(".lab-views button").forEach((b) => b.addEventListener("click", () => { state.view = b.dataset.view; update(); }));
  document.getElementById("theme-toggle").addEventListener("click", () => { state.theme = state.theme === "dark" ? "light" : "dark"; update(); });
  document.getElementById("fail-next").addEventListener("click", () => { state.failNext = !state.failNext; renderTop(); });
  document.getElementById("reset-data").addEventListener("click", () => { update({ reset: true }); toast("Mock data reset"); });
  document.getElementById("shuffle").addEventListener("click", shuffle);
  document.getElementById("copy-link").addEventListener("click", async () => {
    writeHash();
    try { await navigator.clipboard.writeText(location.href); toast("Link copied"); }
    catch { prompt("Copy this link", location.href); }
  });
  window.addEventListener("hashchange", () => { readHash(); update(); });
  window.addEventListener("resize", () => { fitFrames(); fitGallery(); });
  update();
}

/* Hooks for the Playwright check and shoot scripts. */
window.__lab = {
  dims: DIMENSIONS, presets: PRESETS, times: TIMES, state, apps, primitivesFor, unsupportedReason,
  apply(cfg, time, { reset = true } = {}) {
    state.config = coerceConfig(cfg);
    state.preset = matchPreset(state.config);
    if (time) state.time = time;
    if (state.view !== "mixer") { state.view = "mixer"; renderTop(); }
    renderStage({ reset });
  },
  setTheme(theme) { state.theme = theme; update(); },
  setTime(time) { state.time = time; renderStage(); },
  armFail() { state.failNext = true; renderTop(); },
  reset() { renderStage({ reset: true }); },
  measure() {
    const out = {};
    for (const key of ["desktop", "phone"]) {
      const frame = document.getElementById("frame-" + key);
      const box = frame.getBoundingClientRect();
      const scroller = frame.querySelector("[data-scroll]");
      let overflow = scroller ? scroller.scrollWidth > scroller.clientWidth + 1 : false;
      let overflowEl = null;
      const small = [];
      for (const el of frame.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (el.closest(".dlg-layer")) continue;
        if (r.right > box.right + 0.6 || r.left < box.left - 0.6) { overflow = true; overflowEl ||= (el.className || el.tagName).toString().slice(0, 40); }
        if (el.matches("button, input, select, .sw-label, .bn-cta, .bn-close, .cal-cell.has-session, .ml-row") && !el.closest(".m-side, .m-tabbar, .m-logo") && r.height < 31.5) small.push(`${(el.className || el.tagName).toString().slice(0, 30)}:${Math.round(r.height)}`);
      }
      let clipped = null;
      for (const el of frame.querySelectorAll("*")) {
        const cs = getComputedStyle(el);
        if ((cs.overflow === "hidden" || cs.overflowX === "hidden") && !el.matches(".frame, .ml, .tbl-wrap, .m-main, .ml-topic, .sr") && el.scrollWidth > el.clientWidth + 1) { clipped = (el.className || el.tagName).toString().slice(0, 40); break; }
      }
      out[key] = { overflow, overflowEl, small: small.slice(0, 8), smallCount: small.length, clipped };
    }
    return out;
  },
};

document.addEventListener("DOMContentLoaded", init);
