/* The lab app: state in the URL hash, two stages, a mixer with live frames, presets, a gallery, and the mistake menu. */

const state = {
  stage: "home",
  home: { ...HOME_DEFAULT },
  admin: { ...ADMIN_DEFAULT },
  time: "today",
  audience: "free",
  zone: "stockholm",
  theme: "light",
  view: "mixer",
  preset: null,
  nofit: false,
  failNext: false,
  dismissed: new Set(),
  note: null,
};
const store = createStore();
const apps = { home: {}, admin: {} };
const galleryApps = [];

const lab = {
  store,
  hcfg: () => state.home,
  now: () => new Date(TIMES[state.time].now),
  audience: () => state.audience,
  dismissed: state.dismissed,
  dismiss(key) { state.dismissed.add(key); renderApps("home"); renderTop(); },
  consumeFail() { if (state.failNext) { state.failNext = false; renderTop(); return true; } return false; },
};
store.subscribe(() => renderApps());

const FRAME_SIZES = { desktop: [1440, 900], phone: [390, 844], "types-desktop": [1160, null], "types-phone": [390, null] };

/* The mistakes William can try. Each ends in the state where the guard is visible. */
const MISTAKES = [
  { id: "offer-everyone", name: "Offer meant for Free users, audience still Everyone", audience: "free",
    look: "The review says Everyone will see this, the audience control shows Everyone, and the button says Publish to everyone.",
    then: "Pick Free users in the review. The sentence and the button change with it. Then publish and switch the Home audience to Pro plan." },
  { id: "broken-link", name: "Publish with a link that does not load", audience: "free",
    look: "The link check fails in red and the button becomes Publish with this link.",
    then: "Cancel and pick a page in Clarity under More options, or publish anyway." },
  { id: "skip-next", name: "Skip the next live training by accident", audience: "free",
    look: "The review said Home will show Nov 19 instead. The skip is saved and the Home stage shows Nov 19.",
    then: "Click Undo within 10 seconds. The Home stage shows Nov 5 again." },
  { id: "delete-restore", name: "Delete a banner, then bring it back", audience: "free",
    look: "Teleprompter is here moved to Deleted at the bottom of the list and users stopped seeing it.",
    then: "Click Undo, or Restore in the Deleted section. Restore brings it back as a draft, so nobody sees it until you publish." },
  { id: "edit-headline", name: "Edit a live headline", audience: "free",
    look: "The review lists the old headline beside the new one. Only changed fields are listed.",
    then: "Save changes for everyone, then look at the Home stage." },
  { id: "offer-60", name: "A 60-day offer", audience: "free",
    look: "The dates line says 60 days, the limit is stated in red under it, and Publish is disabled.",
    then: "Pick an end within 30 days. The problem goes away." },
  { id: "notice-week", name: "A notice nobody can close, for a week", audience: "free",
    look: "The form says a notice users cannot close shows for up to 3 days. Publish is disabled.",
    then: "Shorten it, or open More options and let users close it." },
  { id: "admins-first", name: "Try it on admins first, then widen", audience: "admins",
    look: "Published to admins only. The Home stage shows the admin's Home with it first. Switch the Home audience to Free plan and it is gone.",
    then: "Click Show to more people on the banner's row. The same review opens with Everyone chosen." },
];

/* ---------- Hash ---------- */
function readHash() {
  const p = new URLSearchParams(location.hash.replace(/^#/, ""));
  const home = {}, admin = {};
  for (const k of Object.keys(HOME)) if (p.has(k)) home[k] = p.get(k);
  for (const k of Object.keys(ADMIN)) if (p.has(k)) admin[k] = p.get(k);
  if (p.has("stage")) state.stage = p.get("stage") === "admin" ? "admin" : "home";
  if (p.has("preset")) {
    const id = p.get("preset");
    const hp = HOME_PRESETS.find((x) => x.id === id), ap = ADMIN_PRESETS.find((x) => x.id === id);
    if (hp) { Object.assign(home, hp.config); if (!p.has("stage")) state.stage = "home"; }
    if (ap) { Object.assign(admin, ap.config); if (!p.has("stage")) state.stage = "admin"; }
  }
  state.home = coerceConfig("home", { ...state.home, ...home });
  state.admin = coerceConfig("admin", { ...state.admin, ...admin });
  if (p.has("time") && TIMES[p.get("time")]) state.time = p.get("time");
  if (p.has("audience") && AUDIENCES[p.get("audience")]) state.audience = p.get("audience");
  if (p.has("zone") && ZONES[p.get("zone")]) state.zone = p.get("zone");
  if (p.has("theme")) state.theme = p.get("theme") === "dark" ? "dark" : "light";
  if (p.has("view")) state.view = p.get("view") === "gallery" ? "gallery" : "mixer";
  state.nofit = p.get("nofit") === "1" || p.get("shoot") === "1";
  document.body.classList.toggle("shoot", p.get("shoot") === "1");
  state.preset = matchPreset(state.stage, state[state.stage]);
  setAdminZone(state.zone);
}

function writeHash() {
  const p = new URLSearchParams();
  p.set("stage", state.stage);
  for (const k of Object.keys(HOME)) p.set(k, state.home[k]);
  for (const k of Object.keys(ADMIN)) p.set(k, state.admin[k]);
  p.set("time", state.time);
  p.set("audience", state.audience);
  if (state.zone !== "stockholm") p.set("zone", state.zone);
  if (state.theme === "dark") p.set("theme", "dark");
  if (state.view === "gallery") p.set("view", "gallery");
  if (state.nofit) p.set("nofit", "1");
  if (document.body.classList.contains("shoot")) p.set("shoot", "1");
  const next = "#" + p.toString();
  if (location.hash !== next) history.replaceState(null, "", next);
}

function matchPreset(stage, cfg) {
  const pr = PRESETS_BY_STAGE[stage].find((x) => Object.keys(DIMS[stage]).every((k) => x.config[k] === cfg[k]));
  return pr ? pr.id : null;
}

function describe(stage, cfg) {
  return Object.keys(DIMS[stage]).map((k) => DIMS[stage][k][cfg[k]].name).join(" · ");
}

function presetLink(id) {
  const base = location.href.replace(/#.*$/, "");
  return `${base}#preset=${id}`;
}

/* ---------- Stage ---------- */
function renderStage({ reset = false } = {}) {
  const stage = state.stage;
  document.querySelectorAll(".stage-block").forEach((b) => { b.hidden = b.dataset.stage !== stage; });
  const dark = state.theme === "dark" ? " dark" : "";
  if (stage === "home") {
    for (const key of ["desktop", "phone"]) {
      const frame = document.getElementById("home-" + key);
      frame.className = `frame frame-${key}${dark}`;
      if (!apps.home[key]) apps.home[key] = createHomeApp({ root: frame, phone: key === "phone", lab });
      else if (reset) apps.home[key].reset();
      else apps.home[key].render();
    }
    for (const key of ["desktop", "phone"]) {
      const frame = document.getElementById("types-" + key);
      frame.className = `frame frame-types frame-types-${key}${dark}`;
      if (!apps.home["types-" + key]) apps.home["types-" + key] = createTypeStrip({ root: frame, lab });
      else apps.home["types-" + key].render();
    }
  } else {
    for (const key of ["desktop", "phone"]) {
      const frame = document.getElementById("admin-" + key);
      frame.className = `frame frame-${key}${dark}`;
      if (!apps.admin[key]) apps.admin[key] = createAdminApp({ root: frame, phone: key === "phone", lab, config: state.admin });
      else { if (reset) apps.admin[key].reset(); apps.admin[key].setConfig(state.admin); }
    }
  }
  fitFrames();
  renderNote();
}

function renderApps(only) {
  for (const stage of ["home", "admin"]) {
    if (only && only !== stage) continue;
    for (const app of Object.values(apps[stage])) app.render();
  }
  for (const g of galleryApps) if (!only || g.stage === only) g.app.render();
  fitFrames();
}

function fitFrames() {
  for (const wrap of document.querySelectorAll(".frame-wrap")) {
    if (wrap.closest("[hidden]")) continue;
    const frame = wrap.firstElementChild;
    const [w, h] = FRAME_SIZES[frame.dataset.size];
    const avail = wrap.clientWidth || w;
    const s = state.nofit ? 1 : Math.min(1, avail / w);
    frame.style.transform = `scale(${s})`;
    const height = h || frame.scrollHeight;
    if (state.nofit) { wrap.style.height = h ? "" : `${height}px`; wrap.style.width = `${w}px`; }
    else { wrap.style.width = ""; wrap.style.height = `${Math.round(height * s)}px`; }
  }
}

function renderNote() {
  const note = document.getElementById("stage-note");
  const stage = state.stage; const cfg = state[stage];
  const parts = [];
  for (const dim of Object.keys(DIMS[stage])) {
    const o = DIMS[stage][dim][cfg[dim]];
    if (o.note) parts.push(`<b>${o.name}.</b> ${o.note}`);
  }
  const prims = primitivesFor(stage, cfg);
  parts.push(`<b>Primitives.</b> ${prims.have.join(", ")}.${prims.missing.length ? ` <b>Not in ui/ yet.</b> ${prims.missing.join(", ")}.` : ""}`);
  parts.push(stage === "home"
    ? "Dismissals are per viewer, per banner, and per session for the live training. Times are shown in Pacific. The real banner shows each user's own time zone."
    : `The admin preview uses the family chosen on the Home stage. The admin, Alex Kim, is in ${ZONES[state.zone].name}${state.zone === "pacific" ? ", so times show one zone" : ", so every time shows Pacific and Stockholm"}.`);
  note.innerHTML = parts.join(" ");
  const cn = document.getElementById("case-note");
  if (state.note && stage === "admin") {
    const i = MISTAKES.findIndex((m) => m.id === state.note.id) + 1;
    cn.hidden = false;
    cn.innerHTML = `<span class="cn-num">Mistake ${i} of ${MISTAKES.length}</span><b>${state.note.name}.</b> <span><b>Look.</b> ${state.note.look}</span> <span><b>Then.</b> ${state.note.then}</span><button type="button" class="tool" id="case-clear">Clear</button>`;
    cn.querySelector("#case-clear").addEventListener("click", () => { state.note = null; renderNote(); });
  } else cn.hidden = true;
}

/* ---------- Controls ---------- */
function renderControls() {
  const root = document.getElementById("controls");
  const stage = state.stage; const cfg = state[stage]; const dims = DIMS[stage];
  let html = `<h2>Mix, ${stage === "home" ? "Home" : "Admin"}</h2><p class="ctl-why" style="margin:0 0 10px">${describe(stage, cfg)}</p>`;
  for (const dim of Object.keys(dims)) {
    const opts = dims[dim];
    html += `<div class="ctl-group" data-dim="${dim}"><p class="ctl-title">${dim}</p><div class="ctl-options">`;
    for (const key of Object.keys(opts)) {
      const o = opts[key];
      const reason = unsupportedReason(stage, cfg, dim, key);
      html += `<button type="button" class="opt${cfg[dim] === key ? " is-active" : ""}" data-dim="${dim}" data-key="${key}" ${reason ? "disabled" : ""} title="${esc(reason || o.note || "")}">${o.name}</button>`;
    }
    html += `</div>`;
    const reasons = Object.keys(opts).map((k) => unsupportedReason(stage, cfg, dim, k)).filter(Boolean);
    if (reasons.length) html += `<p class="ctl-why">${reasons[0]}</p>`;
    const current = opts[cfg[dim]];
    if (current && current.note) html += `<p class="ctl-why">${current.note}</p>`;
    html += `</div>`;
  }
  root.innerHTML = html;
  root.querySelectorAll(".opt").forEach((b) => b.addEventListener("click", () => {
    const dim = b.dataset.dim, key = b.dataset.key;
    state[stage] = coerceConfig(stage, { ...state[stage], [dim]: key });
    state.preset = matchPreset(stage, state[stage]);
    update();
  }));
}

function renderPresets() {
  const root = document.getElementById("presets");
  const stage = state.stage; const list = PRESETS_BY_STAGE[stage];
  let html = `<h2>${list.length} ${stage === "home" ? "Home" : "admin"} presets</h2>`;
  if (stage === "admin") html += `<p class="ctl-why" style="margin:0 0 8px">Each link opens the preset fully configured.</p>`;
  list.forEach((pr, i) => {
    const prims = primitivesFor(stage, pr.config);
    html += `<div class="preset${state.preset === pr.id ? " is-active" : ""}" data-id="${pr.id}" role="button" tabindex="0">
      <span class="p-name"><span class="p-num">${i + 1}</span>${pr.name}</span>
      <span class="p-why">${pr.why}</span>
      <span class="p-cfg">${describe(stage, pr.config)}</span>
      ${prims.missing.length ? `<span class="p-prims"><b>Not in ui/ yet.</b> ${prims.missing.join(", ")}</span>` : ""}
      <a class="p-link" href="#preset=${pr.id}" data-preset-link="${pr.id}">#preset=${pr.id}</a>
    </div>`;
  });
  root.innerHTML = html;
  root.querySelectorAll(".preset").forEach((b) => {
    b.addEventListener("click", (e) => { if (e.target.closest("a")) return; loadPreset(b.dataset.id); });
    b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); loadPreset(b.dataset.id); } });
  });
  root.querySelectorAll("[data-preset-link]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); location.hash = `preset=${a.dataset.presetLink}`; }));
}

function loadPreset(id) {
  const stage = state.stage;
  const pr = PRESETS_BY_STAGE[stage].find((x) => x.id === id);
  if (!pr) return;
  state[stage] = coerceConfig(stage, { ...pr.config });
  state.preset = pr.id;
  state.view = "mixer";
  update({ reset: true });
  window.scrollTo({ top: 0 });
}

/* ---------- Gallery ---------- */
function renderGallery() {
  const root = document.getElementById("gallery");
  const stage = state.stage; const list = PRESETS_BY_STAGE[stage];
  root.innerHTML = list.map((pr, i) => `<div class="gallery-item" data-id="${pr.id}">
      <div class="gallery-head"><strong>${i + 1}. ${pr.name}</strong><span>${pr.why}</span><em>${describe(stage, pr.config)}</em></div>
      <div class="gallery-wrap" data-stage="${stage}"><div class="gallery-frame${state.theme === "dark" ? " dark" : ""}" data-preset="${pr.id}"></div></div>
    </div>`).join("");
  galleryApps.length = 0;
  root.querySelectorAll(".gallery-frame").forEach((frame) => {
    const pr = list.find((x) => x.id === frame.dataset.preset);
    if (stage === "home") galleryApps.push({ stage, app: createHomeApp({ root: frame, phone: false, lab: { ...lab, hcfg: () => pr.config } }) });
    else galleryApps.push({ stage, app: createAdminApp({ root: frame, phone: false, lab, config: pr.config }) });
  });
  root.querySelectorAll(".gallery-item").forEach((el) => el.addEventListener("click", (e) => {
    if (e.target.closest("input, button, select, label, a, [data-handle], .sw, summary")) return;
    loadPreset(el.dataset.id);
  }));
  fitGallery();
}

function fitGallery() {
  for (const wrap of document.querySelectorAll(".gallery-wrap")) {
    const frame = wrap.firstElementChild;
    const avail = wrap.clientWidth || 1440;
    const s = Math.min(1, avail / 1440);
    const h = wrap.dataset.stage === "home" ? 440 : 760;
    frame.style.height = `${h}px`;
    frame.style.transform = `scale(${s})`;
    wrap.style.height = `${Math.round(h * s)}px`;
  }
}

/* ---------- Top bar ---------- */
function segHtml(items, active, attr) {
  return items.map(([k, name]) => `<button type="button" data-${attr}="${k}" class="${active === k ? "is-active" : ""}">${name}</button>`).join("");
}
function renderTop() {
  document.querySelectorAll(".lab-stages button").forEach((b) => b.classList.toggle("is-active", b.dataset.stage === state.stage));
  document.querySelectorAll(".lab-views button").forEach((b) => b.classList.toggle("is-active", b.dataset.view === state.view));
  const seg = document.querySelector('.seg[data-dim="time"]');
  seg.innerHTML = segHtml(Object.entries(TIMES).map(([k, v]) => [k, v.name]), state.time, "time");
  seg.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { state.time = b.dataset.time; update(); }));
  const aud = document.querySelector('.seg[data-dim="audience"]');
  aud.innerHTML = segHtml(Object.entries(AUDIENCES).map(([k, v]) => [k, v.name]), state.audience, "audience");
  aud.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { state.audience = b.dataset.audience; update(); }));
  document.querySelector("#theme-toggle span").textContent = state.theme === "dark" ? "Light" : "Dark";
  document.querySelector("#zone-toggle span").textContent = state.zone === "pacific" ? "Admin in Pacific" : "Admin in Stockholm";
  const fail = document.getElementById("fail-next");
  fail.setAttribute("aria-pressed", String(state.failNext));
  fail.querySelector("span").textContent = state.failNext ? "Next save fails" : "Fail next save";
  const again = document.getElementById("show-again");
  again.disabled = state.dismissed.size === 0;
  again.querySelector("span").textContent = state.dismissed.size ? `Show again (${state.dismissed.size})` : "Show again";
  document.getElementById("view-mixer").hidden = state.view !== "mixer";
  document.getElementById("view-gallery").hidden = state.view !== "gallery";
  document.getElementById("lab-sub").textContent = state.stage === "home"
    ? `Stage 1, banners on Home. ${HOME_PRESETS.length} presets, one mixer, the Home page.`
    : `Stage 2, Admin > Banners, mistake-proof. ${ADMIN_PRESETS.length} presets, ${MISTAKES.length} mistakes to try.`;
  renderMistakeMenu();
}

function renderMistakeMenu() {
  const wrap = document.getElementById("mistake-menu");
  const open = wrap.dataset.open === "1";
  wrap.querySelector("button").setAttribute("aria-expanded", String(open));
  let pop = wrap.querySelector(".lab-pop");
  if (!pop) { pop = document.createElement("div"); pop.className = "lab-pop"; pop.setAttribute("role", "menu"); wrap.appendChild(pop); }
  pop.hidden = !open;
  pop.innerHTML = MISTAKES.map((m, i) => `<button type="button" role="menuitem" data-mistake="${m.id}"><span class="cn-num">${i + 1}</span>${m.name}</button>`).join("");
  pop.querySelectorAll("[data-mistake]").forEach((b) => b.addEventListener("click", () => { wrap.dataset.open = "0"; runMistake(b.dataset.mistake); }));
}

function runMistake(id) {
  const m = MISTAKES.find((x) => x.id === id); if (!m) return;
  state.stage = "admin"; state.time = "today"; state.audience = m.audience; state.view = "mixer";
  state.preset = matchPreset("admin", state.admin);
  state.note = m;
  update({ reset: true });
  window.__lab.resetData();
  apps.admin.desktop.mistake(id, { act: true });
  apps.admin.phone.mistake(id, { act: false });
  renderApps("home");
  renderNote();
  fitFrames();
  const bar = document.querySelector(".lab-top").offsetHeight;
  window.scrollTo({ top: document.getElementById("stage").getBoundingClientRect().top + window.scrollY - bar - 8, behavior: "smooth" });
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, 1800);
}

function shuffle() {
  const stage = state.stage; const dims = DIMS[stage];
  const pickKey = (o) => { const k = Object.keys(o); return k[Math.floor(Math.random() * k.length)]; };
  const cfg = {};
  for (const k of Object.keys(dims)) cfg[k] = pickKey(dims[k]);
  state[stage] = coerceConfig(stage, cfg);
  state.preset = matchPreset(stage, state[stage]);
  update({ reset: true });
}

function update({ reset = false } = {}) {
  setAdminZone(state.zone);
  writeHash();
  renderTop();
  if (state.view === "mixer") { renderControls(); renderPresets(); renderStage({ reset }); }
  else renderGallery();
}

function init() {
  readHash();
  document.querySelectorAll(".lab-stages button").forEach((b) => b.addEventListener("click", () => { state.stage = b.dataset.stage; state.preset = matchPreset(state.stage, state[state.stage]); update(); }));
  document.querySelectorAll(".lab-views button").forEach((b) => b.addEventListener("click", () => { state.view = b.dataset.view; update(); }));
  document.getElementById("theme-toggle").addEventListener("click", () => { state.theme = state.theme === "dark" ? "light" : "dark"; update(); });
  document.getElementById("zone-toggle").addEventListener("click", () => { state.zone = state.zone === "pacific" ? "stockholm" : "pacific"; update(); });
  document.getElementById("fail-next").addEventListener("click", () => { state.failNext = !state.failNext; renderTop(); });
  document.getElementById("reset-data").addEventListener("click", () => { state.note = null; window.__lab.resetData(); renderNote(); toast("Mock data reset"); });
  document.getElementById("show-again").addEventListener("click", () => { window.__lab.showAgain(); });
  document.getElementById("shuffle").addEventListener("click", shuffle);
  const mm = document.getElementById("mistake-menu");
  mm.querySelector("button").addEventListener("click", () => { mm.dataset.open = mm.dataset.open === "1" ? "0" : "1"; renderMistakeMenu(); });
  document.addEventListener("click", (e) => { if (mm.dataset.open === "1" && !e.target.closest("#mistake-menu")) { mm.dataset.open = "0"; renderMistakeMenu(); } });
  document.getElementById("copy-link").addEventListener("click", async () => {
    writeHash();
    try { await navigator.clipboard.writeText(location.href); toast("Link copied"); }
    catch { prompt("Copy this link", location.href); }
  });
  window.addEventListener("hashchange", () => { readHash(); update({ reset: true }); });
  window.addEventListener("resize", () => { fitFrames(); fitGallery(); });
  update();
}

/* Hooks for the Playwright check and shoot scripts. */
window.__lab = {
  dims: DIMS, presets: PRESETS_BY_STAGE, times: TIMES, audiences: AUDIENCES, mistakes: MISTAKES, state, apps, store, lab, galleryApps,
  primitivesFor, unsupportedReason, coerceConfig, matchPreset,
  apply(stage, cfg, { time, audience, zone, reset = true } = {}) {
    state.stage = stage;
    state[stage] = coerceConfig(stage, cfg);
    state.preset = matchPreset(stage, state[stage]);
    if (time) state.time = time;
    if (audience) state.audience = audience;
    if (zone) { state.zone = zone; setAdminZone(zone); }
    if (state.view !== "mixer") state.view = "mixer";
    writeHash(); renderTop();
    renderStage({ reset });
  },
  setStage(stage) { state.stage = stage; state.preset = matchPreset(stage, state[stage]); update(); },
  setView(view) { state.view = view; update(); },
  setTheme(theme) { state.theme = theme; update(); },
  setTime(time) { state.time = time; update(); },
  setAudience(a) { state.audience = a; update(); },
  setZone(z) { state.zone = z; update(); },
  armFail() { state.failNext = true; renderTop(); },
  mistake: runMistake,
  resetData() { store.reset(); state.dismissed.clear(); for (const stage of ["home", "admin"]) for (const app of Object.values(apps[stage])) if (app.reset) app.reset(); renderApps(); renderTop(); },
  showAgain() { state.dismissed.clear(); renderApps("home"); renderTop(); },
  measure() {
    const out = {};
    const keys = state.stage === "home" ? ["home-desktop", "home-phone", "types-desktop", "types-phone"] : ["admin-desktop", "admin-phone"];
    for (const key of keys) {
      const frame = document.getElementById(key);
      const box = frame.getBoundingClientRect();
      const scroller = frame.querySelector("[data-scroll]") || frame;
      let overflow = scroller.scrollWidth > scroller.clientWidth + 1;
      let overflowEl = overflow ? "scroller" : null;
      const small = [];
      for (const el of frame.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (el.closest(".mini, .pv-fit, .rv-fit, .rv-phone")) continue;
        if (r.right > box.right + 0.6 || r.left < box.left - 0.6) { overflow = true; overflowEl ||= (el.className || el.tagName).toString().slice(0, 50); }
        if (el.matches("button, input, select, a.bn-cta, .sw-label, .handle, .ml-row, summary, .tpl, .pick") && !el.closest(".m-side, .m-tabbar, .m-logo") && r.height < 31.5) small.push(`${(el.className || el.tagName).toString().slice(0, 30)}:${Math.round(r.height)}`);
      }
      let clipped = null;
      for (const el of frame.querySelectorAll("*")) {
        const cs = getComputedStyle(el);
        if ((cs.overflow === "hidden" || cs.overflowX === "hidden") && !el.matches(".frame, .m-main, .mini, .mini-in, .pv-fit, .rv-fit, .rv-phone, .undo-track, .sr, .m-card .title, .m-account .name, .ml, .tbl-wrap, .sheet, .dlg") && el.scrollWidth > el.clientWidth + 1) { clipped = (el.className || el.tagName).toString().slice(0, 50); break; }
      }
      out[key] = { overflow, overflowEl, small: small.slice(0, 8), smallCount: small.length, clipped };
    }
    return out;
  },
};

document.addEventListener("DOMContentLoaded", init);
