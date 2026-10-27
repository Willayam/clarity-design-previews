// Design lab board. Served by scripts/lab.py at the lab's URL, or from a static export.
// Every variant gets four actions: Y yes, M maybe, N no, C comment. Everything else sits under More.
(function () {
  "use strict";
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var params = new URLSearchParams(location.search);
  var SHOT = params.get("shot") === "1";
  var HEIGHTS = { 1440: 900, 1280: 800, 1024: 768, 834: 1112, 768: 1024, 390: 844, 375: 812 };
  var VERDICTS = [["yes", "Y", "Yes"], ["maybe", "M", "Maybe"], ["no", "N", "No"]];
  var OLD = { keep: "yes", cut: "no" };

  var data = { lab: {}, variants: [], slots: [], state: {} };
  var api = true;
  var mode = null;
  var state = blank();
  var store = "design-lab:" + location.pathname;
  var firstVisit = !readLocal("ui");
  var ui = Object.assign({ view: "grid", width: 1440, cols: 3, round: "latest", screen: "", part: "", tall: false,
    theme: "auto", hideNo: false, yesOnly: false, focus: null, compare: false, controls: {} }, readLocal("ui") || {});
  var frames = [];
  var listSig = "";
  var mtimes = {};
  var saveTimer = null;
  var dirty = false, lastSaved = "";
  var draft = null; // the comment being written: {key, text, part, selector, quote, tag, screen}
  var renderedAt = 0, renderScroll = 0, userScrolled = false;

  function blank() { return { variants: {}, comments: [], note: "", compose: {} }; }
  function readLocal(k) { try { return JSON.parse(localStorage.getItem(store + ":" + k)); } catch (e) { return null; } }
  function writeLocal(k, v) { try { localStorage.setItem(store + ":" + k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function vstate(key) { return state.variants[key] || (state.variants[key] = {}); }
  function toast(msg, ms) { var t = $("#toast"); t.textContent = msg; t.style.display = "block"; clearTimeout(t._h); t._h = setTimeout(function () { t.style.display = "none"; }, ms || 2600); }

  // Older labs stored keep and cut verdicts, pins and per-variant notes. Fold them into the current shape.
  function migrate(s) {
    s = Object.assign(blank(), s || {});
    s.comments = s.comments || [];
    Object.keys(s.variants || {}).forEach(function (k) {
      var v = s.variants[k];
      if (OLD[v.verdict]) v.verdict = OLD[v.verdict];
      if (v.note) { s.comments.push({ key: k, text: v.note }); delete v.note; }
    });
    (s.pins || []).forEach(function (p) {
      s.comments.push({ key: p.variant, text: p.comment || p.verdict || "", part: p.part, selector: p.selector, quote: p.text, tag: p.tag, screen: p.screen });
    });
    delete s.pins;
    return s;
  }

  var ICON = {
    open: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/></svg>',
    tab: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 2.5h4.5V7M13.5 2.5L7 9M11.5 9.5v4h-9v-9h4"/></svg>',
    x: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>'
  };

  // ------------------------------------------------------------ data

  function fetchLab() {
    if (mode === "static") return fetch("lab-data.json", { cache: "no-store" }).then(function (r) { return r.json(); });
    return fetch("_lab/api/lab", { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      mode = "api";
      return r.json();
    }).catch(function (e) {
      if (mode === "api") throw e;
      mode = "static";
      api = false;
      return fetch("lab-data.json", { cache: "no-store" }).then(function (r) { return r.json(); });
    });
  }

  function signature(d) {
    var out = d.variants.map(function (v) { return v.id + "@" + (v.file || v.url); });
    d.slots.forEach(function (s) { s.variants.forEach(function (f) { out.push(s.id + ":" + f.id); }); });
    return out.join("|") + JSON.stringify(d.lab);
  }

  function load(first) {
    return fetchLab().then(function (d) {
      d.slots = d.slots || [];
      d.variants = d.variants || [];
      var sig = signature(d);
      var changed = [];
      d.variants.forEach(function (v) { var k = v.file || v.url; if (mtimes[k] && v.mtime && mtimes[k] !== v.mtime) changed.push(v.id); mtimes[k] = v.mtime; });
      d.slots.forEach(function (s) { s.variants.forEach(function (f) { if (mtimes[f.file] && f.mtime && mtimes[f.file] !== f.mtime) changed.push(s.id + ":" + f.id); mtimes[f.file] = f.mtime; }); });
      var listChanged = sig !== listSig;
      listSig = sig;
      data = d;
      if (first) {
        state = migrate(api ? d.state : readLocal("state"));
        lastSaved = JSON.stringify(api ? d.state : null);
        if (!d.variants.length && d.slots.length) ui.view = "mix";
        // A component is judged at true size, so component labs open on Parts unless lab.json names a view.
        if (firstVisit && !SHOT) {
          var want = d.lab.view || (d.lab.scope === "component" ? "parts" : null);
          if (want) ui.view = want;
          if (d.lab.part) ui.part = d.lab.part;
          else if (ui.view === "parts" && (d.lab.parts || []).indexOf("live") >= 0) ui.part = "live";
        }
      } else if (api && !dirty && !draft && d.state && JSON.stringify(d.state) !== lastSaved) {
        state = migrate(d.state);
        lastSaved = JSON.stringify(d.state);
        if (!listChanged) refreshMarks();
      }
      if (first || listChanged) {
        var y = window.scrollY;
        setupControls();
        render();
        window.scrollTo(0, y);
        if (!first) toast("New variants on the board");
      } else if (changed.length) {
        frames.forEach(function (f) { if (f.keys.some(function (k) { return changed.indexOf(k) >= 0; })) f.iframe.src = f.iframe.src; });
        toast("Reloaded " + changed.join(", "));
      }
    });
  }

  function save() {
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 250);
    updateCount();
  }

  function flush() {
    clearTimeout(saveTimer);
    if (!api) { writeLocal("state", state); dirty = false; return Promise.resolve(); }
    var body = JSON.stringify(state);
    return fetch("_lab/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: body })
      .then(function (r) { if (r.ok) { lastSaved = body; if (JSON.stringify(state) === body) dirty = false; } })
      .catch(function () {});
  }

  function rounds() {
    var r = [];
    data.variants.forEach(function (v) { var n = Number(v.round || 1); if (r.indexOf(n) < 0) r.push(n); });
    data.slots.forEach(function (s) { s.variants.forEach(function (v) { var n = Number(v.round || 1); if (r.indexOf(n) < 0) r.push(n); }); });
    return r.sort(function (a, b) { return a - b; });
  }

  function latestRound() { var r = rounds(); return Math.max(r[r.length - 1] || 1, Number(data.lab.round) || 1); }

  function inRound(v, key) {
    var s = state.variants[key || v.id] || {};
    var r = Number(v.round || 1);
    if (ui.round === "latest") return r === latestRound() || v.baseline || v.recommended || s.verdict === "yes";
    return ui.round === "all" || String(r) === String(ui.round) || v.baseline;
  }

  function hidden(v, key) {
    var s = state.variants[key] || {};
    return (ui.hideNo && s.verdict === "no") || (ui.yesOnly && s.verdict !== "yes" && !v.baseline);
  }

  function ordered(list) {
    return list.slice().sort(function (a, b) {
      return (a.baseline ? -2 : a.recommended ? -1 : 0) - (b.baseline ? -2 : b.recommended ? -1 : 0);
    });
  }

  function visible() { return ordered(data.variants.filter(function (v) { return inRound(v); })); }

  function slotById(id) { return data.slots.filter(function (s) { return s.id === id; })[0]; }

  function partList() {
    var p = data.slots.map(function (s) { return s.id; });
    (data.lab.parts || []).forEach(function (n) { if (p.indexOf(n) < 0) p.push(n); });
    data.variants.forEach(function (v) { (v._parts || []).forEach(function (n) { if (p.indexOf(n) < 0) p.push(n); }); });
    return p;
  }

  function controlQuery() {
    var c = data.lab.controls || {};
    return Object.keys(c).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(ui.controls[k] || c[k][0]); }).join("&");
  }

  function withQuery(url, q) { return q ? url + (url.indexOf("?") >= 0 ? "&" : "?") + q : url; }

  function srcFor(v, screen) {
    var a = (state.variants[v.id] || {}).axes;
    var aq = a ? Object.keys(a).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(a[k]); }).join("&") : "";
    return withQuery(withQuery(v.url || v.file, aq), controlQuery()) + (screen ? "#" + screen : "");
  }

  function pageSrc(picks, only) {
    var q = [];
    if (only) q.push("only=" + encodeURIComponent(only));
    var p = Object.keys(picks).map(function (k) { return k + ":" + picks[k]; }).join(",");
    if (p) q.push("picks=" + encodeURIComponent(p));
    var cq = controlQuery();
    if (cq) q.push(cq);
    return "_page.html" + (q.length ? "?" + q.join("&") : "") + (ui.screen ? "#" + ui.screen : "");
  }

  function currentPicks() {
    var picks = {};
    data.slots.forEach(function (s) {
      var rec = s.variants.filter(function (v) { return v.recommended; })[0];
      var want = state.compose[s.id] || (data.lab.locked || {})[s.id] || (rec && rec.id) || (s.variants[0] && s.variants[0].id);
      if (want) picks[s.id] = want;
    });
    return picks;
  }

  // ------------------------------------------------------------ toolbar and More menu

  function setupControls() {
    var lab = data.lab;
    $("#title").textContent = lab.title || "Design lab";
    document.title = (lab.title || "Design lab") + " · design lab";
    var r = (lab.rounds || []).filter(function (x) { return Number(x.n) === latestRound(); })[0];
    $("#question").textContent = r && r.question ? "Round " + r.n + ". " + r.question : "Round " + latestRound();
    var screens = lab.screens || [];
    $("#screen").innerHTML = screens.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.label || s.id) + "</option>"; }).join("");
    if (screens.length && !screens.some(function (s) { return s.id === ui.screen; })) ui.screen = screens[0].id;
    if (!screens.length) ui.screen = "";
    var widths = lab.widths || [1440, 390];
    if (widths.indexOf(Number(ui.width)) < 0) ui.width = widths[0];
    $("#widths").innerHTML = widths.map(function (w) { return '<button data-w="' + w + '" title="' + w + ' px wide">' + (w >= 1200 ? "Desktop" : w >= 700 ? "Tablet" : "Phone") + "</button>"; }).join("");
    var rs = rounds();
    $("#round").innerHTML = '<option value="latest">Latest round</option><option value="all">All rounds</option>' +
      rs.map(function (n) { return '<option value="' + n + '">Round ' + n + "</option>"; }).join("");
    var c = lab.controls || {};
    $("#controls").innerHTML = Object.keys(c).map(function (k) {
      return '<label>' + esc(k) + ' <select data-ctl="' + esc(k) + '">' + c[k].map(function (o) {
        return '<option value="' + esc(o) + '"' + ((ui.controls[k] || c[k][0]) === o ? " selected" : "") + ">" + esc(o) + "</option>";
      }).join("") + "</select></label>";
    }).join("");
    refreshParts();
  }

  function refreshParts() {
    var parts = partList();
    var sel = $("#part");
    sel.innerHTML = parts.length ? parts.map(function (p) { var s = slotById(p); return '<option value="' + esc(p) + '">' + esc(s ? s.label : p) + "</option>"; }).join("") : '<option value="">None marked</option>';
    if (parts.indexOf(ui.part) < 0) ui.part = parts[0] || "";
    sel.value = ui.part;
  }

  function syncChrome() {
    var hasV = data.variants.length > 0, hasS = data.slots.length > 0, hasScreens = (data.lab.screens || []).length > 0;
    var show = { grid: hasV, parts: hasV || hasS, flow: hasV && hasScreens, mix: hasS };
    if (ui.view !== "focus" && !show[ui.view]) ui.view = hasS && !hasV ? "mix" : "grid";
    if (ui.view === "focus" && !hasV) ui.view = "mix";
    $$("#views button").forEach(function (b) { b.style.display = show[b.dataset.v] ? "" : "none"; b.setAttribute("aria-pressed", String(b.dataset.v === ui.view)); });
    $$("#widths button").forEach(function (b) { b.setAttribute("aria-pressed", String(Number(b.dataset.w) === Number(ui.width))); });
    $$("#cols button").forEach(function (b) { b.setAttribute("aria-pressed", String(Number(b.dataset.c) === Number(ui.cols))); });
    $("#screen").style.display = hasScreens && ui.view !== "flow" ? "" : "none";
    $("#back").style.display = ui.view === "focus" ? "" : "none";
    $("#partRow").style.display = ui.view === "parts" ? "" : "none";
    $("#compareRow").style.display = data.variants.some(function (v) { return v.baseline; }) ? "" : "none";
    if ($("#screen").value !== ui.screen) $("#screen").value = ui.screen;
    $("#round").value = ui.round;
    $("#tall").checked = !!ui.tall;
    $("#compare").checked = !!ui.compare;
    $("#theme").value = ui.theme;
    $("#hideNo").checked = !!ui.hideNo;
    $("#yesOnly").checked = !!ui.yesOnly;
    writeLocal("ui", ui);
  }

  function bindControls() {
    $("#widths").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { ui.width = Number(b.dataset.w); render(); } });
    $("#screen").addEventListener("change", function (e) {
      ui.screen = e.target.value;
      frames.forEach(function (f) { if (f.mode !== "flow") send(f, { type: "screen", hash: ui.screen }); });
      writeLocal("ui", ui);
    });
    $("#back").addEventListener("click", function () { setView(ui.lastView || "grid"); });
    $("#moreBtn").addEventListener("click", function () { toggleMore(); });
    $("#views").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) setView(b.dataset.v); });
    $("#cols").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { ui.cols = Number(b.dataset.c); render(); } });
    $("#round").addEventListener("change", function (e) { ui.round = e.target.value; render(); });
    $("#part").addEventListener("change", function (e) { ui.part = e.target.value; render(); });
    $("#controls").addEventListener("change", function (e) { var s = e.target.closest("select"); if (s) { ui.controls[s.dataset.ctl] = s.value; render(); } });
    $("#tall").addEventListener("change", function (e) { ui.tall = e.target.checked; render(); });
    $("#compare").addEventListener("change", function (e) { ui.compare = e.target.checked; render(); });
    $("#theme").addEventListener("change", function (e) { ui.theme = e.target.value; frames.forEach(function (f) { send(f, { type: "theme", value: ui.theme }); }); writeLocal("ui", ui); });
    $("#hideNo").addEventListener("change", function (e) { ui.hideNo = e.target.checked; writeLocal("ui", ui); refreshMarks(); });
    $("#yesOnly").addEventListener("change", function (e) { ui.yesOnly = e.target.checked; writeLocal("ui", ui); refreshMarks(); });
    $("#sendBtn").addEventListener("click", openSend);
    document.addEventListener("click", function (e) {
      if (!$("#more").hidden && !e.target.closest("#more") && !e.target.closest("#moreBtn")) toggleMore(false);
    });
    ["wheel", "touchmove", "keydown"].forEach(function (t) { window.addEventListener(t, function () { userScrolled = true; }, { passive: true }); });
    window.addEventListener("resize", function () { clearTimeout(window._rz); window._rz = setTimeout(layoutAll, 120); });
    document.addEventListener("keydown", function (e) { onKey(e.key, e.target, e.metaKey || e.ctrlKey || e.altKey, e); });
  }

  function toggleMore(force) {
    var m = $("#more");
    var open = force === undefined ? m.hidden : force;
    m.hidden = !open;
    $("#moreBtn").setAttribute("aria-expanded", String(open));
  }

  function setView(v) {
    if (v !== "focus") ui.lastView = v;
    if (v === "focus" && !ui.focus) { var vis = visible(); ui.focus = vis.length ? vis[0].id : null; }
    ui.view = v;
    toggleMore(false);
    render();
  }

  function typing(t) { return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable); }

  function onKey(k, target, mod, ev) {
    if (k === "Escape") {
      if (!$("#sendSheet").hidden) closeSend();
      else if (draft) cancelDraft();
      else if (!$("#more").hidden) toggleMore(false);
      else if (ui.view === "focus") setView(ui.lastView || "grid");
      else return;
      if (ev) ev.preventDefault();
      return;
    }
    if (mod || typing(target) || !$("#sendSheet").hidden) return;
    var vis = visible();
    var key = ui.focus;
    var lower = k.toLowerCase();
    if (lower === "y" || lower === "m" || lower === "n") { if (key) setVerdict(key, { y: "yes", m: "maybe", n: "no" }[lower]); }
    else if (lower === "c") { if (key) startDraft(key); }
    else if (lower === "o") { if (key && ui.view !== "focus" && key.indexOf(":") < 0) setView("focus"); }
    else if ((k === "ArrowRight" || k === "ArrowLeft") && ui.view === "focus" && vis.length) {
      var i = vis.findIndex(function (v) { return v.id === ui.focus; });
      ui.focus = vis[(i + (k === "ArrowRight" ? 1 : -1) + vis.length) % vis.length].id;
      render();
    }
    else if (/^[1-9]$/.test(k) && vis[Number(k) - 1]) { ui.focus = vis[Number(k) - 1].id; setView("focus"); }
    else return;
    if (ev) ev.preventDefault();
  }

  // ------------------------------------------------------------ frames

  function send(f, msg) {
    msg.source = "lab-board";
    msg.id = f.key;
    try { f.iframe.contentWindow.postMessage(msg, "*"); } catch (e) {}
  }

  function makeFrame(key, src, opts) {
    var wrap = document.createElement("div");
    wrap.className = "vp";
    var iframe = document.createElement("iframe");
    iframe.title = key;
    var w = Number(opts.width || ui.width);
    var f = { iframe: iframe, wrap: wrap, vid: key, src: src, key: key + ":" + Math.random().toString(36).slice(2, 8), keys: opts.keys || [key],
      owner: opts.owner || key, mode: opts.mode, part: opts.part, w: w, h: HEIGHTS[w] || Math.round(w * 0.65), docH: 0, measured: false, rect: null, ready: false };
    iframe.src = src;
    iframe.addEventListener("load", function () {
      // A hash route inside a same-origin frame can scroll the board. Undo that until the user scrolls.
      if (!userScrolled && Date.now() - renderedAt < 8000) window.scrollTo(0, renderScroll);
      f.ready = false;
      f.measured = false;
      f.iframe.style.height = f.h + "px";
      send(f, { type: "hello" });
      if (ui.theme !== "auto") send(f, { type: "theme", value: ui.theme });
      if (draft && draft.key === f.owner) send(f, { type: "pin", on: true });
      if (f.part) send(f, { type: "part", name: f.part });
      setTimeout(function () { if (!f.ready) { f.ready = "silent"; layout(f); } }, 2500);
    });
    wrap.appendChild(iframe);
    frames.push(f);
    return f;
  }

  function note(f, text) {
    var m = $(".miss", f.wrap);
    if (!text) { if (m) m.remove(); return; }
    if (!m) { m = document.createElement("div"); m.className = "miss"; f.wrap.appendChild(m); }
    m.textContent = text;
  }

  function layout(f) {
    var avail = f.wrap.clientWidth || (f.wrap.parentNode && f.wrap.parentNode.clientWidth);
    if (!avail) return;
    var w = f.w, h = f.h, s;
    f.iframe.style.width = w + "px";
    if (f.mode === "part") {
      if (f.missing) { note(f, "Not in this variant"); f.iframe.style.visibility = "hidden"; f.wrap.style.height = "56px"; return; }
      if (f.ready === "silent" && !f.rect) { note(f, "This page can't show single parts"); f.wrap.style.height = "56px"; return; }
      if (!f.rect) { f.wrap.style.height = "120px"; return; }
      note(f, "");
      f.iframe.style.visibility = "";
      s = Math.min(1, (avail - 2) / Math.max(f.rect.w, 1));
      f.iframe.style.height = Math.max(h, Math.ceil(f.rect.h + f.rect.y + 16)) + "px";
      f.iframe.style.transform = "translate(" + (-f.rect.x * s) + "px," + (-f.rect.y * s) + "px) scale(" + s + ")";
      f.wrap.style.height = Math.ceil(f.rect.h * s) + "px";
      return;
    }
    if (f.mode === "focus" || f.mode === "mix") {
      var availH = f.wrap.clientHeight || (window.innerHeight - 160);
      s = Math.min(1, avail / w);
      f.iframe.style.height = Math.ceil(availH / s) + "px";
      f.iframe.style.transform = "scale(" + s + ")";
      return;
    }
    s = avail / w;
    var fullH = f.mode === "grid" && ui.tall && f.docH ? Math.min(f.docH, 14000) : h;
    f.iframe.style.height = fullH + "px";
    f.iframe.style.transform = "scale(" + s + ")";
    f.wrap.style.height = Math.ceil(fullH * s) + "px";
  }

  function layoutAll() { frames.forEach(layout); }

  window.addEventListener("message", function (e) {
    var m = e.data || {};
    if (m.source !== "lab-runtime") return;
    var f = frames.filter(function (x) { return x.key === m.id; })[0] || frames.filter(function (x) { return x.iframe.contentWindow === e.source; })[0];
    if (!f) return;
    if (m.type === "ready") {
      f.ready = true;
      if (!f.measured) { f.docH = m.height; f.measured = true; }
      var v = data.variants.filter(function (x) { return x.id === f.vid; })[0];
      if (v) {
        var before = (v._parts || []).join("|");
        v._parts = m.parts || [];
        if (before !== v._parts.join("|")) refreshParts();
      }
      layout(f);
    } else if (m.type === "size") {
      if (!f.measured) f.docH = m.height;
    } else if (m.type === "part") {
      f.ready = true;
      f.missing = !!m.missing;
      f.rect = m.missing ? null : { x: m.x, y: m.y, w: m.w, h: m.h };
      layout(f);
    } else if (m.type === "pin") {
      attachToDraft(f, m);
    } else if (m.type === "key") {
      if (f.mode !== "focus" && f.mode !== "mix") ui.focus = f.owner;
      onKey(m.key, null, m.meta, null);
    }
  });

  // ------------------------------------------------------------ render

  function render() {
    frames = [];
    renderedAt = Date.now();
    renderScroll = window.scrollY;
    userScrolled = false;
    var main = $("#main");
    main.innerHTML = "";
    syncChrome();
    refreshParts();
    var total = data.variants.length + data.slots.reduce(function (n, s) { return n + s.variants.length; }, 0);
    if (!total) main.innerHTML = '<div class="empty">No variants yet. They show up here as soon as they are written.</div>';
    else if (ui.view === "mix") renderMix(main);
    else if (ui.view === "parts") renderParts(main);
    else if (!visible().length) main.innerHTML = '<div class="empty">Nothing in this round yet.</div>';
    else if (ui.view === "focus") renderFocus(main, visible());
    else if (ui.view === "flow") renderFlow(main, visible());
    else renderGrid(main, visible());
    updateCount();
    requestAnimationFrame(layoutAll);
  }

  function nameOf(key) {
    var parts = String(key).split(":");
    if (parts.length === 2) {
      var s = slotById(parts[0]);
      var f = s && s.variants.filter(function (x) { return x.id === parts[1]; })[0];
      return (s ? s.label : parts[0]) + " " + parts[1].toUpperCase() + (f && f.name ? " (" + f.name + ")" : "");
    }
    if (key === "page") return "Page mix";
    var v = data.variants.filter(function (x) { return x.id === key; })[0];
    return v ? key + (v.name ? " " + v.name : "") : key;
  }

  function header(v, key, opts) {
    var th = document.createElement("div");
    th.className = "th";
    th.innerHTML = '<span class="id">' + esc(opts.label || v.id) + "</span>" +
      '<span class="nm">' + esc(v.name || "") + "</span>" +
      (v.baseline ? '<span class="chip">current</span>' : "") +
      (v.recommended ? '<span class="chip pick" title="' + esc(v.why || "") + '">agent pick</span>' : "") +
      '<span class="sp"></span>' +
      (opts.open ? '<button class="ico" data-open title="Open large (O)">' + ICON.open + "</button>" : "") +
      (opts.href ? '<a class="ico" title="Open in a new tab" target="_blank" href="' + esc(opts.href) + '">' + ICON.tab + "</a>" : "");
    var b = $("[data-open]", th);
    if (b) b.addEventListener("click", function () { ui.focus = key; setView("focus"); });
    return th;
  }

  function actions(key) {
    var row = document.createElement("div");
    row.className = "acts";
    row.innerHTML = VERDICTS.map(function (v) {
      return '<button class="act ' + v[0] + '" data-act="' + v[0] + '" aria-pressed="false"><kbd>' + v[1] + "</kbd>" + v[2] + "</button>";
    }).join("") + '<button class="act comment" data-act="comment"><kbd>C</kbd>Comment</button>';
    row.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      ui.focus = key;
      if (b.dataset.act === "comment") startDraft(key);
      else setVerdict(key, b.dataset.act);
    });
    return row;
  }

  // A tile is one variant: header, the design, Y/M/N/C, its comments, and the comment box when open.
  function tile(v, key, frameOpts, headOpts) {
    var t = document.createElement("section");
    t.className = "tile";
    t.dataset.key = key;
    t._v = v;
    t.addEventListener("mouseenter", function () { ui.focus = key; $$(".tile.sel").forEach(function (x) { x.classList.remove("sel"); }); t.classList.add("sel"); });
    t.appendChild(header(v, key, headOpts));
    var bar = frameOpts.mode !== "part" && axesBar(v, function () { f.iframe.src = f.src = srcFor(v, ui.screen); });
    if (bar) t.appendChild(bar);
    var f = makeFrame(key, frameOpts.src, Object.assign({ owner: key }, frameOpts));
    t.appendChild(f.wrap);
    var foot = document.createElement("div");
    foot.className = "tf";
    foot.appendChild(actions(key));
    if (v.idea) foot.insertAdjacentHTML("beforeend", '<p class="idea">' + esc(v.idea) + "</p>");
    var list = document.createElement("ol");
    list.className = "comments";
    foot.appendChild(list);
    t.appendChild(foot);
    paintTile(t);
    return t;
  }

  function paintTile(t) {
    var key = t.dataset.key;
    var s = state.variants[key] || {};
    var v = t._v || {};
    t.classList.toggle("yes", s.verdict === "yes");
    t.classList.toggle("maybe", s.verdict === "maybe");
    t.classList.toggle("no", s.verdict === "no");
    t.classList.toggle("gone", hidden(v, key) && ui.view !== "focus");
    t.classList.toggle("sel", ui.focus === key);
    t.classList.toggle("drafting", !!(draft && draft.key === key));
    $$(".act[data-act]", t).forEach(function (b) {
      var on = b.dataset.act === s.verdict;
      b.classList.toggle("on", on);
      if (b.dataset.act !== "comment") b.setAttribute("aria-pressed", String(on));
    });
    var list = $(".comments", t);
    if (list) {
      var mine = state.comments.map(function (c, i) { return [c, i]; }).filter(function (x) { return x[0].key === key; });
      list.innerHTML = mine.map(function (x) {
        var c = x[0];
        return '<li><span class="on">' + esc(c.part || (c.quote ? "“" + c.quote.slice(0, 40) + "”" : "")) + "</span> " + esc(c.text) +
          '<button class="ico del" data-i="' + x[1] + '" title="Delete comment">' + ICON.x + "</button></li>";
      }).join("");
      $$(".del", list).forEach(function (b) { b.addEventListener("click", function () { state.comments.splice(Number(b.dataset.i), 1); save(); refreshMarks(); }); });
    }
    var box = $(".compose", t);
    if (draft && draft.key === key) { if (!box) t.appendChild(composeBox()); }
    else if (box) box.remove();
  }

  function refreshMarks() {
    $$(".tile[data-key]").forEach(paintTile);
    $$(".slot-btns button").forEach(function (b) {
      var s = state.variants[b.dataset.key] || {};
      VERDICTS.forEach(function (v) { b.classList.toggle(v[0], s.verdict === v[0]); });
    });
    updateCount();
    layoutAll();
  }

  function axesBar(v, onChange) {
    if (!v.axes) return null;
    var bar = document.createElement("div");
    bar.className = "axes";
    var cur = vstate(v.id).axes || {};
    Object.keys(v.axes).forEach(function (name) {
      var opts = v.axes[name];
      var sel = document.createElement("select");
      sel.setAttribute("aria-label", name);
      sel.innerHTML = opts.map(function (o) { return '<option value="' + esc(o) + '">' + esc(name + ": " + o) + "</option>"; }).join("");
      sel.value = cur[name] || opts[0];
      sel.addEventListener("change", function () {
        var a = vstate(v.id).axes || (vstate(v.id).axes = {});
        Object.keys(v.axes).forEach(function (n) { a[n] = a[n] || v.axes[n][0]; });
        a[name] = sel.value;
        save();
        onChange();
      });
      bar.appendChild(sel);
    });
    return bar;
  }

  function gridEl() {
    var g = document.createElement("div");
    g.className = "grid";
    g.style.gridTemplateColumns = "repeat(" + ui.cols + ", minmax(0,1fr))";
    return g;
  }

  function renderGrid(main, vis) {
    var g = gridEl();
    vis.forEach(function (v) {
      var src = srcFor(v, ui.screen);
      g.appendChild(tile(v, v.id, { mode: "grid", src: src }, { open: true, href: src }));
    });
    main.appendChild(g);
  }

  function renderParts(main) {
    if (!ui.part) { main.innerHTML = '<div class="empty">No parts are marked in these variants.</div>'; return; }
    var g = gridEl();
    var slot = slotById(ui.part);
    if (slot) {
      ordered(slot.variants.filter(function (f) { return inRound(f, slot.id + ":" + f.id); })).forEach(function (fr) {
        var key = slot.id + ":" + fr.id;
        var picks = {}; picks[slot.id] = fr.id;
        var src = pageSrc(picks, slot.id);
        g.appendChild(tile(fr, key, { mode: "part", part: slot.id, src: src, keys: [key] }, { label: fr.id.toUpperCase(), href: src }));
      });
    } else {
      visible().forEach(function (v) {
        var src = srcFor(v, ui.screen);
        g.appendChild(tile(v, v.id, { mode: "part", part: ui.part, src: src }, { open: true, href: src }));
      });
    }
    main.appendChild(g);
  }

  function renderMix(main) {
    var picks = currentPicks();
    var wrap = document.createElement("div");
    wrap.className = "mix";
    var rail = document.createElement("div");
    rail.className = "rail";
    data.slots.forEach(function (s) {
      var row = document.createElement("div");
      row.className = "slot";
      row.innerHTML = '<div class="slot-name">' + esc(s.label || s.id) + ((data.lab.locked || {})[s.id] ? ' <span class="chip">locked</span>' : "") + "</div>";
      var btns = document.createElement("div");
      btns.className = "slot-btns";
      ordered(s.variants.filter(function (f) { return inRound(f, s.id + ":" + f.id) || picks[s.id] === f.id; })).forEach(function (f) {
        var key = s.id + ":" + f.id;
        var st = state.variants[key] || {};
        var b = document.createElement("button");
        b.textContent = f.id.toUpperCase();
        b.dataset.key = key;
        b.className = (picks[s.id] === f.id ? "on " : "") + (f.recommended ? "rec " : "") + (st.verdict || "");
        b.title = [f.name, f.idea, f.recommended ? "Agent pick" : ""].filter(Boolean).join(". ");
        b.setAttribute("aria-pressed", String(picks[s.id] === f.id));
        b.addEventListener("click", function () { state.compose[s.id] = f.id; save(); render(); });
        btns.appendChild(b);
      });
      row.appendChild(btns);
      var cur = s.variants.filter(function (f) { return f.id === picks[s.id]; })[0];
      if (cur && (cur.idea || cur.name)) row.insertAdjacentHTML("beforeend", '<div class="hint">' + esc(cur.idea || cur.name) + "</div>");
      rail.appendChild(row);
    });
    var src = pageSrc(picks);
    var stage = tile({ id: "Page", name: "Your mix", idea: "" }, "page",
      { mode: "mix", src: src, keys: Object.keys(picks).map(function (k) { return k + ":" + picks[k]; }) }, { href: src });
    stage.classList.add("stage");
    $(".acts", stage).querySelectorAll(".act:not(.comment)").forEach(function (b) { b.remove(); });
    wrap.appendChild(rail);
    wrap.appendChild(stage);
    main.appendChild(wrap);
  }

  function renderFlow(main, vis) {
    var screens = data.lab.screens || [];
    var flow = document.createElement("div");
    flow.className = "flow";
    var cols = "repeat(" + screens.length + ", minmax(200px,1fr))";
    var head = document.createElement("div");
    head.className = "row heads";
    head.style.gridTemplateColumns = cols;
    head.innerHTML = screens.map(function (s) { return '<div class="cellhead">' + esc(s.label || s.id) + "</div>"; }).join("");
    flow.appendChild(head);
    vis.forEach(function (v) {
      var t = document.createElement("section");
      t.className = "tile";
      t.dataset.key = v.id;
      t._v = v;
      t.addEventListener("mouseenter", function () { ui.focus = v.id; });
      t.appendChild(header(v, v.id, { open: true }));
      var row = document.createElement("div");
      row.className = "row";
      row.style.gridTemplateColumns = cols;
      screens.forEach(function (s) {
        var cell = document.createElement("div");
        var f = makeFrame(v.id, srcFor(v, s.id), { mode: "flow", owner: v.id });
        var cover = document.createElement("div");
        cover.className = "cover";
        cover.title = "Open " + (s.label || s.id) + " large";
        cover.addEventListener("click", function () { ui.focus = v.id; ui.screen = s.id; setView("focus"); });
        f.wrap.appendChild(cover);
        cell.appendChild(f.wrap);
        row.appendChild(cell);
      });
      t.appendChild(row);
      var foot = document.createElement("div");
      foot.className = "tf";
      foot.appendChild(actions(v.id));
      var list = document.createElement("ol");
      list.className = "comments";
      foot.appendChild(list);
      t.appendChild(foot);
      paintTile(t);
      flow.appendChild(t);
    });
    main.appendChild(flow);
  }

  function renderFocus(main, vis) {
    var v = vis.filter(function (x) { return x.id === ui.focus; })[0] || vis[0];
    ui.focus = v.id;
    var base = data.variants.filter(function (x) { return x.baseline; })[0];
    var split = ui.compare && base && base.id !== v.id;
    var box = document.createElement("div");
    box.className = "focus" + (split ? " split" : "");
    [split ? base : null, v].filter(Boolean).forEach(function (item) {
      var src = srcFor(item, ui.screen);
      var t = tile(item, item.id, { mode: "focus", src: src }, { href: src, label: item === v ? item.id + "  " + (vis.indexOf(v) + 1) + " of " + vis.length : item.id });
      t.classList.add("focus-col");
      box.appendChild(t);
    });
    main.appendChild(box);
  }

  // ------------------------------------------------------------ verdicts and comments

  function setVerdict(key, verdict) {
    var s = vstate(key);
    s.verdict = s.verdict === verdict ? null : verdict;
    save();
    refreshMarks();
  }

  function startDraft(key) {
    if (draft && draft.key === key) { var ta = $('.tile[data-key="' + cssEsc(key) + '"] .compose textarea'); if (ta) ta.focus(); return; }
    cancelDraft(true);
    draft = { key: key, text: "" };
    frames.forEach(function (f) { if (f.owner === key) send(f, { type: "pin", on: true }); });
    refreshMarks();
    var t = $('.tile[data-key="' + cssEsc(key) + '"]');
    var area = t && $(".compose textarea", t);
    if (area) area.focus();
  }

  function cssEsc(s) { return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/"/g, '\\"'); }

  function composeBox() {
    var box = document.createElement("form");
    box.className = "compose";
    box.innerHTML = '<textarea rows="2" placeholder="Your comment"></textarea>' +
      '<div class="crow"><span class="where"></span><span class="sp"></span>' +
      '<button type="button" class="btn" data-cancel>Cancel</button><button type="submit" class="btn primary">Add</button></div>';
    var ta = $("textarea", box);
    ta.value = draft ? draft.text : "";
    ta.addEventListener("input", function () { if (draft) draft.text = ta.value; });
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitDraft(); }
      if (e.key === "Escape") { e.preventDefault(); cancelDraft(); }
    });
    $("[data-cancel]", box).addEventListener("click", function () { cancelDraft(); });
    box.addEventListener("submit", function (e) { e.preventDefault(); commitDraft(); });
    paintWhere(box);
    return box;
  }

  function paintWhere(box) {
    var w = $(".where", box);
    if (!w || !draft) return;
    w.textContent = draft.part || draft.quote ? "On " + (draft.part || "“" + draft.quote.slice(0, 40) + "”") : "Click the design to point at a spot";
  }

  function attachToDraft(f, m) {
    if (!draft || draft.key !== f.owner) return;
    draft.key = f.owner === "page" && m.variant ? "page" : f.owner;
    draft.part = m.part || (m.variant ? m.variant : null);
    draft.selector = m.selector;
    draft.quote = m.text;
    draft.tag = m.tag;
    draft.screen = (m.hash || "").replace(/^#/, "");
    if (f.owner === "page" && m.variant) draft.part = nameOf(m.variant);
    var t = $('.tile[data-key="' + cssEsc(f.owner) + '"]');
    var box = t && $(".compose", t);
    if (box) { paintWhere(box); $("textarea", box).focus(); }
  }

  function stopPinning() { frames.forEach(function (f) { send(f, { type: "pin", on: false }); }); }

  function commitDraft() {
    if (!draft) return;
    var text = (draft.text || "").trim();
    if (!text && !draft.part && !draft.quote) return cancelDraft();
    state.comments.push({ key: draft.key, text: text, part: draft.part, selector: draft.selector, quote: draft.quote, tag: draft.tag, screen: draft.screen });
    draft = null;
    stopPinning();
    save();
    refreshMarks();
  }

  function cancelDraft(quiet) {
    if (!draft) return;
    draft = null;
    stopPinning();
    if (!quiet) refreshMarks();
  }

  function updateCount() {
    var n = Object.keys(state.variants).filter(function (k) { return state.variants[k].verdict; }).length + state.comments.length + (state.note ? 1 : 0);
    $("#count").textContent = n ? String(n) : "";
  }

  function compile() {
    var lines = ["Design lab feedback: " + (data.lab.title || "") + ", round " + latestRound()];
    if (data.dir) lines.push("Lab: " + data.dir);
    lines.push("");
    VERDICTS.forEach(function (v) {
      var ids = Object.keys(state.variants).filter(function (k) { return state.variants[k].verdict === v[0]; });
      if (ids.length) lines.push(v[2] + ": " + ids.map(nameOf).join("; "));
    });
    if (data.slots.length && Object.keys(state.compose).length) {
      var picks = currentPicks();
      lines.push("Page mix: " + data.slots.map(function (s) { return s.id + "=" + (picks[s.id] || "none"); }).join(", "));
    }
    var withAxes = Object.keys(state.variants).filter(function (k) { return state.variants[k].axes; });
    if (withAxes.length) {
      lines.push("", "Settings chosen:");
      withAxes.forEach(function (k) { var a = state.variants[k].axes; lines.push("- " + k + ": " + Object.keys(a).map(function (x) { return x + "=" + a[x]; }).join(", ")); });
    }
    if (state.comments.length) {
      lines.push("", "Comments:");
      state.comments.forEach(function (c, i) {
        lines.push((i + 1) + ". " + nameOf(c.key) + (c.part ? " › " + c.part : "") + (c.screen ? " (#" + c.screen + ")" : "") + ": " + (c.text || "(no text)"));
        if (c.selector) lines.push("   " + (c.quote ? '"' + c.quote.slice(0, 90) + '" ' : "") + "<" + (c.tag || "?") + "> " + c.selector);
      });
    }
    if (state.note) lines.push("", "Anything else:", state.note);
    return lines.join("\n");
  }

  function openSend() {
    toggleMore(false);
    var sheet = $("#sendSheet");
    $("pre", sheet).textContent = compile();
    var ta = $("textarea", sheet);
    ta.value = state.note || "";
    $("#doSend", sheet).textContent = api ? "Send" : "Copy";
    sheet.hidden = false;
    ta.focus();
  }

  function closeSend() { $("#sendSheet").hidden = true; }

  function bindSend() {
    var sheet = $("#sendSheet");
    var ta = $("textarea", sheet);
    ta.addEventListener("input", function () { state.note = ta.value; save(); $("pre", sheet).textContent = compile(); });
    $("#closeSend").addEventListener("click", closeSend);
    sheet.addEventListener("click", function (e) { if (e.target === sheet) closeSend(); });
    $("#doSend").addEventListener("click", function () {
      var btn = this;
      if (btn.disabled) return;
      var text = compile();
      copy(text);
      if (!api) { closeSend(); return toast("Copied. Paste it into the chat."); }
      btn.disabled = true;
      setTimeout(function () { btn.disabled = false; }, 1500);
      clearTimeout(saveTimer);
      dirty = false;
      lastSaved = JSON.stringify(state);
      fetch("_lab/api/send", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text, round: latestRound(), state: state }) })
        .then(function (r) { return r.json(); })
        .then(function (r) { closeSend(); toast(r.ok ? "Sent. It's also on your clipboard." : "Could not send: " + (r.error || ""), 4000); })
        .catch(function () { toast("The lab server did not answer. The text is on your clipboard.", 4000); });
    });
  }

  function copy(text) {
    function fallback() {
      var t = document.createElement("textarea");
      t.value = text;
      document.body.appendChild(t);
      t.select();
      try { document.execCommand("copy"); } catch (e) {}
      t.remove();
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).catch(fallback);
    else fallback();
  }

  // ------------------------------------------------------------ boot

  if (SHOT) {
    document.body.classList.add("shot");
    ui.view = params.get("view") || (ui.view === "mix" ? "mix" : "grid");
    ui.cols = Number(params.get("cols") || 3);
    if (params.get("round")) ui.round = params.get("round");
    if (params.get("theme")) ui.theme = params.get("theme");
  }
  // A link can open a given view and part: ?view=parts&part=live
  if (!SHOT && params.get("view")) { ui.view = params.get("view"); firstVisit = false; }
  if (params.get("part")) ui.part = params.get("part");
  bindControls();
  bindSend();
  load(true).then(function () {
    if (!SHOT && api) setInterval(function () { load(false).catch(function () {}); }, 3000);
  }).catch(function (e) {
    $("#main").innerHTML = '<div class="empty">Could not load the lab: ' + esc(e.message) + "</div>";
  });
})();
