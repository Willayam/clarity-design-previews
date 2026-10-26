/* The lab app: state in the URL hash, a mixer, a preset list, a gallery. */

const state = {
  config: { ...DEFAULT_CONFIG },
  time: "5d",
  theme: "light",
  view: "mixer",
  preset: null,
  dismissed: { desktop: false, phone: false },
  nofit: false,
};

function readHash() {
  const h = location.hash.replace(/^#/, "");
  const p = new URLSearchParams(h);
  const cfg = {};
  for (const k of Object.keys(DIMENSIONS)) if (p.has(k)) cfg[k] = p.get(k);
  if (p.has("preset")) {
    const pr = PRESETS.find((x) => x.id === p.get("preset"));
    if (pr) { Object.assign(cfg, pr.config); state.preset = pr.id; if (pr.time && !p.has("time")) state.time = pr.time; }
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

/* ---------- Stage ---------- */
function renderStage() {
  const bn = renderBanner(state.config, state.time);
  const d = document.getElementById("frame-desktop");
  const p = document.getElementById("frame-phone");
  d.className = "frame frame-desktop" + (state.theme === "dark" ? " dark" : "");
  p.className = "frame frame-phone" + (state.theme === "dark" ? " dark" : "");
  d.innerHTML = mockDesktop(state.dismissed.desktop ? "" : bn);
  p.innerHTML = mockPhone(state.dismissed.phone ? "" : bn);
  for (const [frame, key] of [[d, "desktop"], [p, "phone"]]) {
    const close = frame.querySelector(".bn-close");
    if (close) close.addEventListener("click", () => { state.dismissed[key] = true; renderStage(); });
  }
  fitFrames();
  const note = document.getElementById("stage-note");
  const lay = DIMENSIONS.layout[state.config.layout];
  const parts = [lay.note];
  if (state.config.visual === "photo" || state.config.layout === "poster") parts.push("The photo is the public Learn video frame. A proper headshot would be needed for the round crop.");
  if (DIMENSIONS.headline[state.config.headline].claim) parts.push("This headline makes a claim the training team should confirm.");
  note.textContent = parts.join(" ");
}

function fitFrames() {
  for (const wrap of document.querySelectorAll(".frame-wrap")) {
    const frame = wrap.firstElementChild;
    const w = frame.classList.contains("frame-desktop") ? 1440 : 390;
    const h = frame.classList.contains("frame-desktop") ? 760 : 844;
    const avail = wrap.clientWidth || w;
    const s = state.nofit ? 1 : Math.min(1, avail / w);
    frame.style.transform = `scale(${s})`;
    wrap.style.height = `${Math.round(h * s)}px`;
    if (state.nofit) wrap.style.width = `${w}px`;
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
      let disabled = false;
      if (dim === "visual" && !supportsVisual(cfg.layout, key)) disabled = true;
      html += `<button type="button" class="opt${cfg[dim] === key ? " is-active" : ""}" data-dim="${dim}" data-key="${key}" ${disabled ? "disabled" : ""} title="${o.note || ""}">${o.name}${o.claim ? ' <span class="claim">claim</span>' : ""}</button>`;
    }
    html += `</div>`;
    if (dim === "visual") {
      const unsupported = Object.keys(opts).filter((k) => !supportsVisual(cfg.layout, k));
      if (unsupported.length) html += `<p class="ctl-why">${VISUAL_REASONS[cfg.layout]}</p>`;
    }
    const current = opts[cfg[dim]];
    if (current && current.note && dim !== "visual") html += `<p class="ctl-why">${current.note}</p>`;
    if (dim === "headline") html += `<p class="ctl-why">Headlines tagged claim promise an outcome or a format the training team has not confirmed.</p>`;
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
  let html = `<h2>20 presets</h2>`;
  PRESETS.forEach((pr, i) => {
    const claim = DIMENSIONS.headline[pr.config.headline].claim;
    html += `<button type="button" class="preset${state.preset === pr.id ? " is-active" : ""}" data-id="${pr.id}">
      <span class="p-name"><span class="p-num">${i + 1}</span>${pr.name}${claim ? ' <span class="claim">claim</span>' : ""}</span>
      <span class="p-why">${pr.why}</span>
      <span class="p-cfg">${describe(pr.config)}</span>
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
  if (pr.time) state.time = pr.time;
  state.dismissed = { desktop: false, phone: false };
  state.view = "mixer";
  update();
  window.scrollTo({ top: 0 });
}

/* ---------- Gallery ---------- */
function renderGallery() {
  const root = document.getElementById("gallery");
  root.innerHTML = PRESETS.map((pr, i) => {
    const bn = renderBanner(pr.config, pr.time || state.time);
    const claim = DIMENSIONS.headline[pr.config.headline].claim;
    return `<div class="gallery-item" data-id="${pr.id}">
      <div class="gallery-head"><strong>${i + 1}. ${pr.name}</strong>${claim ? '<span class="claim" style="font-size:10px;font-weight:600;text-transform:uppercase;padding:1px 4px;border-radius:4px;background:#fde68a;color:#713f12">claim</span>' : ""}<span>${pr.why}</span><em>${describe(pr.config)}</em></div>
      <div class="gallery-wrap"><div class="gallery-frame${state.theme === "dark" ? " dark" : ""}">${mockDesktop(bn, 4)}</div></div>
    </div>`;
  }).join("");
  root.querySelectorAll(".gallery-item").forEach((el) => el.addEventListener("click", () => loadPreset(el.dataset.id)));
  fitGallery();
}

function fitGallery() {
  for (const wrap of document.querySelectorAll(".gallery-wrap")) {
    const frame = wrap.firstElementChild;
    const avail = wrap.clientWidth || 1440;
    const s = Math.min(1, avail / 1440);
    frame.style.transform = `scale(${s})`;
    wrap.style.height = `${Math.round(300 * s)}px`;
    frame.style.height = "300px";
  }
}

/* ---------- Top bar ---------- */
function renderTop() {
  document.querySelectorAll(".lab-views button").forEach((b) => b.classList.toggle("is-active", b.dataset.view === state.view));
  const seg = document.querySelector('.seg[data-dim="time"]');
  seg.innerHTML = Object.keys(TIMES).map((k) => `<button type="button" data-time="${k}" class="${state.time === k ? "is-active" : ""}">${TIMES[k].name}</button>`).join("");
  seg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { state.time = b.dataset.time; update(); }));
  document.querySelector("#theme-toggle span").textContent = state.theme === "dark" ? "Light" : "Dark";
  document.getElementById("view-mixer").hidden = state.view !== "mixer";
  document.getElementById("view-gallery").hidden = state.view !== "gallery";
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
  const vis = DIMENSIONS.layout[cfg.layout].visuals;
  cfg.visual = vis[Math.floor(Math.random() * vis.length)];
  state.config = coerceConfig(cfg);
  state.preset = matchPreset(state.config);
  state.dismissed = { desktop: false, phone: false };
  update();
}

function update() {
  writeHash();
  renderTop();
  if (state.view === "mixer") { renderControls(); renderPresets(); renderStage(); }
  else renderGallery();
}

function init() {
  readHash();
  document.querySelectorAll(".lab-views button").forEach((b) => b.addEventListener("click", () => { state.view = b.dataset.view; update(); }));
  document.getElementById("theme-toggle").addEventListener("click", () => { state.theme = state.theme === "dark" ? "light" : "dark"; update(); });
  document.getElementById("show-again").addEventListener("click", () => { state.dismissed = { desktop: false, phone: false }; renderStage(); });
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
  dims: DIMENSIONS, presets: PRESETS, times: TIMES, state,
  apply(cfg, time) {
    state.config = coerceConfig(cfg);
    if (time) state.time = time;
    state.dismissed = { desktop: false, phone: false };
    if (state.view !== "mixer") { state.view = "mixer"; renderTop(); }
    renderStage();
  },
  setTheme(theme) { state.theme = theme; update(); },
  measure() {
    const out = {};
    for (const key of ["desktop", "phone"]) {
      const frame = document.getElementById("frame-" + key);
      const bn = frame.querySelector(".bn");
      if (!bn) { out[key] = { missing: true }; continue; }
      const box = bn.getBoundingClientRect();
      const descendants = [...bn.querySelectorAll("*")];
      let overflow = bn.scrollWidth > bn.clientWidth + 1;
      let overflowEl = null;
      for (const el of descendants) {
        if (el.closest(".bn-photo, .bn-avatar") && el.tagName === "IMG") continue; // clipped on purpose by the frame
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.right > box.right + 0.6 || r.left < box.left - 0.6) { overflow = true; overflowEl = el.className || el.tagName; break; }
      }
      const texts = [];
      const walker = document.createTreeWalker(bn, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!node.textContent.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(node);
        for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) texts.push({ l: r.left, t: r.top, r: r.right, b: r.bottom, s: node.textContent.trim().slice(0, 30) });
      }
      const close = bn.querySelector(".bn-close");
      const cb = close ? close.getBoundingClientRect() : null;
      const closeOk = !!cb && cb.width >= 32 && cb.height >= 32;
      const hit = cb ? texts.find((t) => t.l < cb.right - 0.5 && t.r > cb.left + 0.5 && t.t < cb.bottom - 0.5 && t.b > cb.top + 0.5) : null;
      const cta = bn.querySelector(".bn-cta");
      let ctaVisible = false;
      if (cta) {
        const cr = cta.getBoundingClientRect();
        const cs = getComputedStyle(cta);
        ctaVisible = cr.width > 0 && cr.height > 0 && cs.visibility === "visible" && Number(cs.opacity) > 0
          && cr.left >= box.left - 0.6 && cr.right <= box.right + 0.6 && cr.top >= box.top - 0.6 && cr.bottom <= box.bottom + 0.6
          && cta.scrollWidth <= cta.clientWidth + 1;
      }
      let clipped = null;
      for (const el of descendants) {
        const cs = getComputedStyle(el);
        if (cs.overflow === "hidden" || cs.overflowX === "hidden" || cs.overflowY === "hidden") {
          if (el.classList.contains("bn-photo") || el.classList.contains("bn-avatar")) continue;
          if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) { clipped = el.className; break; }
        }
      }
      out[key] = { overflow, overflowEl, closeOk, closeHit: hit ? hit.s : null, ctaVisible, clipped, height: Math.round(box.height), width: Math.round(box.width) };
    }
    return out;
  },
};

document.addEventListener("DOMContentLoaded", init);
