// Design lab runtime. The lab server injects it into every variant page.
// Inside the board's iframe it isolates parts, pins elements and follows the board's screen and theme.
// With ?labcheck=1 it runs standalone and writes a JSON report of problems into the DOM for `lab.py check`.
(function () {
  var CHECK = /[?&]labcheck=1/.test(location.search);
  var THEME = (location.search.match(/[?&]labtheme=(light|dark)/) || [])[1];
  if (window.__labRuntime) return;
  // lab.py shoot passes ?labtheme= so a variant renders in that theme even outside the board.
  if (THEME) applyTheme(THEME);
  if (window.parent === window && !CHECK) return;
  window.__labRuntime = true;

  function applyTheme(value) {
    var root = document.documentElement;
    // data-theme for plain pages, the .dark class for shadcn and Tailwind products.
    if (value === "auto") { root.removeAttribute("data-theme"); root.style.colorScheme = ""; root.classList.remove("dark"); return; }
    root.setAttribute("data-theme", value);
    root.style.colorScheme = value;
    root.classList.toggle("dark", value === "dark");
  }

  function docHeight() {
    var b = document.body, e = document.documentElement;
    return Math.max(b ? b.scrollHeight : 0, e.scrollHeight, b ? b.offsetHeight : 0, e.offsetHeight);
  }

  function partNames() {
    var seen = [];
    document.querySelectorAll("[data-part]").forEach(function (el) {
      var n = el.getAttribute("data-part");
      if (seen.indexOf(n) < 0) seen.push(n);
    });
    return seen;
  }

  function cssPath(el) {
    if (el.id && el.id.indexOf("lab-") !== 0) return "#" + el.id;
    var bits = [];
    while (el && el.nodeType === 1 && el !== document.body && bits.length < 5) {
      var p = el.getAttribute("data-part");
      if (p) { bits.unshift('[data-part="' + p + '"]'); break; }
      var tag = el.tagName.toLowerCase();
      var parent = el.parentElement;
      if (parent) {
        var same = Array.prototype.filter.call(parent.children, function (c) { return c.tagName === el.tagName; });
        if (same.length > 1) tag += ":nth-of-type(" + (same.indexOf(el) + 1) + ")";
      }
      bits.unshift(tag);
      el = parent;
    }
    return bits.join(" > ");
  }

  if (CHECK) return runCheck();

  var style = document.createElement("style");
  style.textContent =
    "html.lab-isolate body *{visibility:hidden!important}" +
    "html.lab-isolate .lab-part-on,html.lab-isolate .lab-part-on *{visibility:visible!important}" +
    "#lab-hover,#lab-hover *{visibility:visible!important}" +
    "#lab-hover{position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #2f6bff;" +
    "background:rgba(47,107,255,.08);border-radius:3px;display:none}" +
    "#lab-hover b{position:absolute;left:-2px;top:-20px;font:600 11px/18px system-ui;background:#2f6bff;" +
    "color:#fff;padding:0 6px;border-radius:3px 3px 0 0;white-space:nowrap}" +
    "html.lab-pinning,html.lab-pinning *{cursor:crosshair!important}";
  document.head.appendChild(style);

  var id = null, pinning = false, part = null, hoverBox = null, shift = false, lastTarget = null;

  function post(msg) {
    msg.source = "lab-runtime";
    msg.id = id;
    window.parent.postMessage(msg, "*");
  }

  function report() {
    post({ type: "ready", parts: partNames(), height: docHeight(), title: document.title, hash: location.hash });
  }
  window.__labReport = function () { if (part) isolate(part); else report(); };

  var isolateTimer = null;
  function isolate(name, tries) {
    clearTimeout(isolateTimer);
    document.querySelectorAll(".lab-part-on").forEach(function (el) { el.classList.remove("lab-part-on"); });
    document.documentElement.classList.remove("lab-isolate");
    part = name || null;
    if (!part) { window.scrollTo(0, 0); report(); return; }
    var el = document.querySelector('[data-part="' + part.replace(/"/g, '\\"') + '"]');
    if (!el) {
      // Parts that a script renders after load get two seconds to appear before they count as missing.
      tries = tries || 0;
      if (tries < 13) { isolateTimer = setTimeout(function () { isolate(name, tries + 1); }, 150); return; }
      post({ type: "part", name: part, missing: true });
      return;
    }
    document.documentElement.classList.add("lab-isolate");
    el.classList.add("lab-part-on");
    var r0 = el.getBoundingClientRect();
    window.scrollTo(0, Math.max(0, r0.top + window.scrollY - 8));
    var r = el.getBoundingClientRect();
    post({ type: "part", name: part, x: r.left, y: r.top, w: r.width, h: r.height });
  }

  function pickTarget(el, whole) {
    if (!el || el === document.documentElement || el === document.body || el.id === "lab-page") return null;
    if (whole || shift) return el.closest("[data-part]") || el.parentElement || el;
    return el;
  }

  function label(el) {
    var host = el.closest("[data-part]");
    var name = host ? host.getAttribute("data-part") : "";
    var tag = el.tagName.toLowerCase();
    return name ? (host === el ? name : name + " › " + tag) : tag;
  }

  function showHover(el) {
    if (!hoverBox) {
      hoverBox = document.createElement("div");
      hoverBox.id = "lab-hover";
      hoverBox.appendChild(document.createElement("b"));
      document.body.appendChild(hoverBox);
    }
    if (!el) { hoverBox.style.display = "none"; return; }
    var r = el.getBoundingClientRect();
    hoverBox.style.display = "block";
    hoverBox.style.left = r.left - 2 + "px";
    hoverBox.style.top = r.top - 2 + "px";
    hoverBox.style.width = r.width + 4 + "px";
    hoverBox.style.height = r.height + 4 + "px";
    hoverBox.firstChild.textContent = label(el);
  }

  function onKey(e) {
    if (e.key === "Shift") { shift = e.type === "keydown"; if (pinning && lastTarget) showHover(pickTarget(lastTarget)); return; }
    var t = e.target && e.target.tagName;
    if (e.type === "keydown" && !pinning && t !== "INPUT" && t !== "TEXTAREA" && t !== "SELECT" && !(e.target && e.target.isContentEditable)) {
      post({ type: "key", key: e.key, meta: e.metaKey || e.ctrlKey, target: t });
    }
  }

  function onClick(e) {
    if (!pinning) return;
    e.preventDefault();
    e.stopPropagation();
    var el = pickTarget(e.target, e.shiftKey);
    if (!el) return;
    var host = el.closest("[data-part]");
    var fromVariant = el.closest("[data-variant]");
    var r = el.getBoundingClientRect();
    var text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    post({
      type: "pin",
      selector: cssPath(el),
      part: host ? host.getAttribute("data-part") : null,
      variant: fromVariant ? fromVariant.getAttribute("data-variant") : null,
      tag: el.tagName.toLowerCase(),
      text: text.slice(0, 140),
      html: el.outerHTML.slice(0, 400),
      rect: { x: Math.round(r.left), y: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) },
      hash: location.hash
    });
  }

  function setPinning(on) {
    pinning = !!on;
    document.documentElement.classList.toggle("lab-pinning", pinning);
    if (!pinning) showHover(null);
  }

  document.addEventListener("mousemove", function (e) { if (pinning) { lastTarget = e.target; shift = e.shiftKey; showHover(pickTarget(e.target)); } }, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("mousedown", function (e) { if (pinning) { e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("keyup", onKey, true);
  window.addEventListener("hashchange", function () { window.__labReport(); });

  window.addEventListener("message", function (e) {
    var m = e.data || {};
    if (m.source !== "lab-board") return;
    if (m.id) id = m.id;
    if (m.type === "hello") window.__labReport();
    if (m.type === "screen") {
      var h = m.hash ? "#" + m.hash.replace(/^#/, "") : "";
      if (location.hash !== h) location.hash = h;
      else window.__labReport();
    }
    if (m.type === "part") isolate(m.name);
    if (m.type === "pin") setPinning(m.on);
    if (m.type === "theme") applyTheme(m.value);
  });

  var ro = window.ResizeObserver ? new ResizeObserver(function () { if (!part) post({ type: "size", height: docHeight() }); }) : null;
  function boot() {
    if (ro && document.body) ro.observe(document.body);
    report();
    setTimeout(window.__labReport, 400);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // ---------------------------------------------------------------- standalone check
  function runCheck() {
    var issues = [];
    var params = new URLSearchParams(location.search);
    var composed = !!document.getElementById("lab-page");
    var fired = false;
    function finish() {
      if (fired) return;
      fired = true;
      issues = issues.concat(window.__labErrors || []);
      var vw = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth > vw + 1) {
        issues.push("page scrolls sideways: content is " + document.documentElement.scrollWidth + "px wide in a " + vw + "px viewport");
      }
      var wide = [];
      document.querySelectorAll("body *").forEach(function (el) {
        if (wide.length >= 3) return;
        var cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || cs.position === "fixed") return;
        var r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > vw + 2 && el.children.length === 0) wide.push(cssPath(el) + " ends at " + Math.round(r.right) + "px");
      });
      if (wide.length) issues.push("elements past the right edge: " + wide.join("; "));
      var clipped = [];
      document.querySelectorAll("body *").forEach(function (el) {
        if (clipped.length >= 3 || !el.textContent.trim() || el.children.length) return;
        var cs = getComputedStyle(el);
        if (el.clientWidth <= 1 || el.clientHeight <= 1 || cs.clip !== "auto" || cs.clipPath !== "none") return;
        if ((cs.overflow === "hidden" || cs.overflowX === "hidden") && cs.textOverflow !== "ellipsis" && el.scrollWidth > el.clientWidth + 1) {
          clipped.push(cssPath(el) + ' "' + el.textContent.trim().slice(0, 30) + '"');
        }
      });
      if (clipped.length) issues.push("text cut off without an ellipsis: " + clipped.join("; "));
      document.querySelectorAll("img").forEach(function (img) {
        if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) issues.push("image did not load: " + img.getAttribute("src").slice(0, 80));
      });
      if (document.fonts) document.fonts.forEach(function (f) { if (f.status === "error") issues.push("font did not load: " + f.family); });
      var want = (params.get("parts") || "").split(",").filter(Boolean);
      var have = partNames();
      var missing = want.filter(function (p) { return have.indexOf(p) < 0; });
      if (missing.length) issues.push("missing data-part: " + missing.join(", "));
      var out = document.createElement("script");
      out.type = "application/json";
      out.id = "lab-check";
      out.textContent = JSON.stringify({ issues: issues, width: vw, parts: have, height: docHeight() }).replace(/</g, "\\u003c");
      document.body.appendChild(out);
    }
    var later = function () { setTimeout(finish, 1200); };
    if (composed) document.addEventListener("lab:composed", later);
    if (document.readyState === "complete") later(); else window.addEventListener("load", composed ? function () { setTimeout(finish, 3000); } : later);
  }
})();
