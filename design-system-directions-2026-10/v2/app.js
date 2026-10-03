/* Clarity V2 "Refined current": prototype behaviour.
   Plain DOM, no dependencies, no network. Everything here is demo logic; the design lives in styles.css.
   Contract with the comparison host:
     ?view=library|editor|system (also home|recorder|public|settings, and share = library + the share dialog)
     ?theme=light|dark
     postMessage {type:"clarity-preview", view, theme} updates the URL and the page. */

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const icon = (name, cls = "i") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  /* ---------- Fixtures (fictional) ---------- */

  const CARDS = {
    northstar: { kind: "video", title: "Northstar launch walkthrough", dur: "4:12", age: "3 days ago", views: 12, scene: "both", a: "#dbe4f6", b: "#aebfe6", order: 2 },
    proposal: { kind: "page", title: "Welcome to your proposal", status: "Draft", age: "Edited yesterday", brand: "#0f766e", a: "#dbe4f6", b: "#aebfe6", order: 1 },
    overview: { kind: "video", title: "Product overview", dur: "7:48", age: "2 weeks ago", views: 48, scene: "screen", a: "#e7e3f4", b: "#c3bbe3", order: 5 },
    brief: { kind: "doc", title: "Project brief.pdf", age: "Last week", pages: "14 pages", size: "1.2 MB", ext: "PDF", order: 4 },
    maya: { kind: "video", title: "Follow-up for Maya", dur: "0:52", age: "Today", views: 0, portrait: true, a: "#cfe3dc", b: "#9ec4b6", skin: "#f0d2bc", shirt: "#444c5c", order: 0 },
    // System sheet only (card anatomy): the long title and the processing state. Not in the Library, which holds the six agreed entries.
    pricing: { kind: "video", title: "Q4 pricing update for the procurement committee, recorded after Thursday's call", age: "Processing", processing: true, scene: "both", a: "#e8ecf2", b: "#cbd3df", order: 3 },
    security: { kind: "video", title: "Security questionnaire answers", dur: "11:03", age: "Last week", views: 9, owner: "Sam Lee", scene: "screen", a: "#2a3140", b: "#1a1f29", screenBg: "#2e3442", screenBar: "#3a4150", screenLine: "#4b5363", order: 7 },
    casestudy: { kind: "page", title: "Case study: Harbor Logistics", status: "Live", age: "Edited today", owner: "Jordan Park", brand: "#c2410c", a: "#f6e1e1", b: "#e5bcbc", order: 8 },
  };

  const KIND_ICON = { video: "video", page: "page", doc: "file", image: "image" };
  const KIND_FILTER = { video: "video", page: "page", doc: "doc", image: "doc" };
  const KIND_VIEW = { video: "public", page: "editor" };

  // Meta segments stay separate spans, one value each, so the stylesheet can truncate with an ellipsis and drop the trailing ones on narrow phones.
  function metaParts(c) {
    if (c.processing) return ["Processing", "demo"];
    const parts = [];
    if (c.kind === "video") {
      parts.push(c.dur, c.age, c.demo ? "demo upload" : c.views === 0 ? "not viewed yet" : `${c.views} views`);
    } else if (c.kind === "page") {
      parts.push(c.status, c.age);
    } else {
      parts.push(c.pages || c.ext, c.size, c.age);
    }
    if (c.owner) parts.unshift(c.owner);
    return parts.filter(Boolean);
  }
  const metaText = (c) => metaParts(c).join(" · ");
  const metaHTML = (c) => `<span class="meta-parts">${metaParts(c).map((p) => `<span>${esc(p)}</span>`).join("")}</span>`;

  function thumbInner(c) {
    const vars = [c.a && `--scene-a:${c.a}`, c.b && `--scene-b:${c.b}`, c.skin && `--skin:${c.skin}`, c.shirt && `--shirt:${c.shirt}`, c.brand && `--brand:${c.brand}`, c.screenBg && `--screen-bg:${c.screenBg}`, c.screenBar && `--screen-bar:${c.screenBar}`, c.screenLine && `--screen-line:${c.screenLine}`]
      .filter(Boolean)
      .join(";");
    let inner = "";
    let cls = "thumb";
    if (c.kind === "video") {
      if (c.portrait) {
        cls += " is-portrait";
        inner = `<span class="portrait-frame"></span>`;
      } else if (c.scene === "cam") {
        cls += " cam-only";
        inner = `<span class="thumb-cam"></span>`;
      } else if (c.scene === "screen") {
        inner = `<span class="thumb-screen"></span>`;
      } else {
        inner = `<span class="thumb-screen"></span><span class="thumb-cam"></span>`;
      }
      if (c.processing) inner += `<span class="thumb-scrim"><span class="spinner-sm" aria-hidden="true"></span>Processing</span>`;
      else inner += `<span class="chip media">${c.dur}</span>`;
    } else if (c.kind === "page") {
      cls += " kind-page";
      inner = `<span class="thumb-page"><span class="tp-bar"><i></i><i></i><i></i></span><span class="tp-body"><i class="tp-brand"></i><i class="tp-h"></i><i class="tp-video"></i><i class="tp-line"></i><i class="tp-line" style="width:60%"></i></span></span>`;
      // One chip recipe over every thumbnail: glass-media, white text, so status and type read like the duration chip.
      if (c.status) inner += `<span class="chip media status">${c.status}</span>`;
    } else if (c.kind === "doc") {
      cls += " kind-doc";
      inner = `<span class="thumb-doc"><i></i><i></i><i></i><i></i><i></i></span><span class="chip media ext">${c.ext}</span>`;
    } else {
      cls += " kind-image";
      inner = `<span class="thumb-image"><i class="mark"></i><i class="word"></i><i class="word short"></i><i class="swatch s1"></i><i class="swatch s2"></i><i class="swatch s3"></i></span><span class="chip media ext">${c.ext}</span>`;
    }
    const glyph = c.processing ? "" : `<span class="play-glyph">${c.kind === "video" ? icon("play", "i fill") : c.kind === "page" ? icon("pencil") : icon("eye")}</span>`;
    return { cls, vars, html: inner + glyph };
  }

  let menuSeq = 0;
  function cardHTML(id, { nomenu = false } = {}) {
    const c = CARDS[id];
    if (!c) return "";
    const t = thumbInner(c);
    const mid = `card-menu-${++menuSeq}`;
    const view = KIND_VIEW[c.kind];
    const openAttr = view ? `href="?view=${view}" data-view="${view}"` : `href="#" data-open-file="${id}"`;
    const title = esc(c.title);
    const actions = nomenu
      ? ""
      : `<div class="card-actions">
          <div class="menu-wrap">
            <button class="icon-btn chip-btn" type="button" data-menu="${mid}" aria-haspopup="menu" aria-expanded="false" aria-label="More for ${title}" data-tip="More">${icon("more")}</button>
            <div class="menu" id="${mid}" role="menu" aria-label="${title}">
              <button class="menu-item" role="menuitem" type="button" data-card-action="open">${icon("external")}Open</button>
              <button class="menu-item" role="menuitem" type="button" data-dialog="share-dialog" data-share-what="${id}">${icon("link")}Share</button>
              <button class="menu-item" role="menuitem" type="button" data-card-action="select">${icon("check")}Select</button>
              <button class="menu-item" role="menuitem" type="button" data-card-action="rename">${icon("pencil")}Rename</button>
              <button class="menu-item" role="menuitem" type="button" data-demo="move">${icon("move")}Move to${icon("chev-right", "i trail")}</button>
              <button class="menu-item" role="menuitem" type="button" data-card-action="duplicate">${icon("copy")}Duplicate</button>
              <div class="menu-sep"></div>
              <button class="menu-item danger" role="menuitem" type="button" data-card-action="delete">${icon("trash")}Delete</button>
            </div>
          </div>
        </div>`;
    const check = nomenu ? "" : `<label class="check card-check"><input type="checkbox" data-select aria-label="Select ${title}"><span class="box">${icon("check")}</span></label>`;
    const cols =
      c.kind === "video"
        ? `<span class="list-cols"><span>${c.dur || "—"}</span><span>${c.processing ? "Processing" : c.views === 0 ? "No views" : `${c.views} views`}</span><span>${c.age}</span></span>`
        : `<span class="list-cols"><span>${c.kind === "page" ? c.status : [c.pages, c.size].filter(Boolean).join(" · ")}</span><span>${c.age}</span></span>`;
    return `<article class="card" data-id="${id}" data-kind="${c.kind}" data-type="${KIND_FILTER[c.kind]}" data-title="${title}" data-views="${c.views || 0}" data-order="${c.order}">
      <a class="${t.cls}" style="${t.vars}" ${openAttr} tabindex="-1" aria-hidden="true">${t.html}</a>
      ${check}${actions}
      <div class="card-body">
        <h3 class="card-title"><a ${openAttr}>${title}</a></h3>
        <p class="card-meta">${icon(KIND_ICON[c.kind])}${metaHTML(c)}</p>
      </div>
      ${cols}
    </article>`;
  }

  $$("[data-cards]").forEach((el) => {
    const ids = el.dataset.cards.split(",").map((s) => s.trim()).filter(Boolean);
    el.insertAdjacentHTML("beforeend", ids.map((id) => cardHTML(id, { nomenu: el.hasAttribute("data-nomenu") })).join(""));
  });

  /* ---------- Sidebar (rendered once per shell) ---------- */

  const SIDEBAR = (active) => `
    <button class="ws" type="button" data-toast="Demo: one workspace in this prototype"><span class="ws-mark">H</span><span class="ws-name">Harbor</span>${icon("chev-down")}</button>
    <nav class="nav" aria-label="Main">
      <a class="nav-item ${active === "library" || active === "home" ? "is-active" : ""}" href="?view=library" data-view="library" data-tip="Library" ${active === "library" ? 'aria-current="page"' : ""}>${icon("grid")}<span>Library</span></a>
      <button class="nav-item" type="button" data-tip="Contacts" data-toast="Contacts is not part of this prototype">${icon("users")}<span>Contacts</span><span class="count">212</span></button>
    </nav>
    <div class="sidebar-foot">
      <a class="nav-item ${active === "settings" ? "is-active" : ""}" href="?view=settings" data-view="settings" data-tip="Settings" ${active === "settings" ? 'aria-current="page"' : ""}>${icon("sliders")}<span>Settings</span></a>
      <a class="user" href="?view=settings" data-view="settings" data-tip="Alex Morgan"><span class="avatar">AM</span><span class="user-meta"><b>Alex Morgan</b><span>Pro</span></span></a>
    </div>`;
  $$("[data-sidebar]").forEach((el) => (el.innerHTML = SIDEBAR(el.dataset.sidebar)));

  /* ---------- Theme ---------- */

  const THEMES = ["light", "dark"];
  function currentTheme() {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }
  function applyTheme(theme, { remember = true } = {}) {
    if (!THEMES.includes(theme)) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    $$("[data-theme]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.theme === theme)));
    if (remember) {
      try {
        sessionStorage.setItem("v2-theme", theme);
      } catch (e) {}
    }
    refreshTokenValues();
  }
  $$("[data-theme]").forEach((b) =>
    b.addEventListener("click", () => {
      applyTheme(b.dataset.theme);
      writeURL({ theme: b.dataset.theme });
    }),
  );

  /* ---------- Views: query string, history, postMessage ---------- */

  const VIEWS = ["library", "editor", "system", "home", "recorder", "public", "settings"];
  const screens = $$(".screen");
  let currentView = null;

  function normaliseView(v) {
    if (v === "share") return "library";
    return VIEWS.includes(v) ? v : "library";
  }

  function showView(view, { focus = false } = {}) {
    view = normaliseView(view);
    if (view === currentView) return;
    // Close anything modal before the old screen leaves the layout, so focus returns while its opener is still visible.
    $$("dialog[open]").forEach((d) => d.close());
    currentView = view;
    screens.forEach((s) => s.classList.toggle("is-current", s.id === view));
    $$(".proto-tabs [data-view]").forEach((a) => a.classList.toggle("is-current", a.dataset.view === view));
    closeMenus();
    closeNav();
    window.scrollTo(0, 0);
    document.title = `Clarity V2 · ${view[0].toUpperCase()}${view.slice(1)}`;
    if (focus) {
      const target = document.getElementById(view);
      if (target) target.focus({ preventScroll: true });
    }
  }

  function writeURL({ view, theme }, { push = false } = {}) {
    const url = new URL(location.href);
    if (view) url.searchParams.set("view", view);
    if (theme) url.searchParams.set("theme", theme);
    url.hash = "";
    const method = push ? "pushState" : "replaceState";
    try {
      history[method](null, "", url);
    } catch (e) {
      /* file:// in some browsers refuses; the page still works without the URL. */
    }
  }

  function applyFromURL() {
    const p = new URLSearchParams(location.search);
    const theme = p.get("theme");
    if (THEMES.includes(theme)) applyTheme(theme, { remember: false });
    else applyTheme(currentTheme(), { remember: false });
    const rawView = p.get("view");
    showView(rawView || "library");
    if (rawView === "share") openDialog("share-dialog");
  }

  addEventListener("popstate", applyFromURL);

  addEventListener("message", (e) => {
    const d = e && e.data;
    if (!d || typeof d !== "object" || d.type !== "clarity-preview") return;
    const next = {};
    if (VIEWS.includes(d.view) || d.view === "share") {
      showView(d.view);
      next.view = normaliseView(d.view);
      if (d.view === "share") openDialog("share-dialog");
    }
    if (THEMES.includes(d.theme)) {
      applyTheme(d.theme);
      next.theme = d.theme;
    }
    if (next.view || next.theme) writeURL(next);
  });

  // Internal navigation: any element with data-view switches the screen without a reload.
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-view]");
    if (!link) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    const view = link.dataset.view;
    const dlg = link.closest("dialog");
    if (dlg && dlg.open) dlg.close();
    showView(view, { focus: true });
    writeURL({ view }, { push: true });
  });

  /* ---------- Sidebar collapse (drawer on narrow screens) ---------- */

  const scrim = $("#nav-scrim");
  function openNav() {
    document.body.classList.add("nav-open");
    scrim.hidden = false;
    const current = document.getElementById(currentView);
    const first = current && $(".sidebar .nav-item", current);
    if (first) first.focus();
  }
  function closeNav() {
    if (!document.body.classList.contains("nav-open")) return;
    document.body.classList.remove("nav-open");
    scrim.hidden = true;
    const current = document.getElementById(currentView);
    const toggle = current && $("[data-nav-toggle]", current);
    if (toggle) toggle.focus();
  }
  $$("[data-nav-toggle]").forEach((b) => b.addEventListener("click", () => (document.body.classList.contains("nav-open") ? closeNav() : openNav())));
  scrim.addEventListener("click", closeNav);
  // Escape closes the drawer too. An open menu handles its own Escape first (it prevents the default), so one press closes one thing.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !e.defaultPrevented && document.body.classList.contains("nav-open")) closeNav();
  });

  /* ---------- Colour swatches on the System sheet ---------- */

  const TOKENS = ["canvas", "surface", "surface-2", "surface-3", "canvas-deep", "text", "text-2", "text-3", "text-disabled", "accent", "accent-text", "accent-tint", "danger", "danger-text", "success-text", "warning-text", "hairline", "hairline-strong", "glass", "glass-media"];
  const colors = $("#colors");
  if (colors) {
    colors.innerHTML = TOKENS.map((t) => `<div class="color"><i style="--c:var(--${t})"></i><b>${t}</b><span data-token="${t}"></span></div>`).join("");
  }
  function refreshTokenValues() {
    const cs = getComputedStyle(document.documentElement);
    $$("[data-token]").forEach((el) => (el.textContent = cs.getPropertyValue(`--${el.dataset.token}`).trim()));
  }

  /* ---------- Menus ---------- */

  function closeMenus(except) {
    $$(".menu[data-open]").forEach((m) => {
      if (m === except) return;
      m.removeAttribute("data-open");
      const t = $(`[data-menu="${m.id}"]`);
      if (t) t.setAttribute("aria-expanded", "false");
    });
  }
  function openMenu(trigger) {
    const m = document.getElementById(trigger.dataset.menu);
    if (!m) return;
    closeMenus(m);
    m.setAttribute("data-open", "");
    trigger.setAttribute("aria-expanded", "true");
    const first = $('[role^="menuitem"]', m);
    if (first) first.focus();
  }
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-menu]");
    if (trigger) {
      const m = document.getElementById(trigger.dataset.menu);
      if (m && m.hasAttribute("data-open")) {
        closeMenus();
        trigger.focus();
      } else openMenu(trigger);
      return;
    }
    if (e.target.closest(".menu-item") || !e.target.closest(".menu")) closeMenus();
  });
  document.addEventListener("keydown", (e) => {
    const open = $(".menu[data-open]");
    if (!open) return;
    const items = $$('[role^="menuitem"]:not([disabled])', open);
    const i = items.indexOf(document.activeElement);
    if (e.key === "Escape") {
      e.preventDefault();
      const t = $(`[data-menu="${open.id}"]`);
      closeMenus();
      if (t) t.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(i + 1) % items.length].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length].focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1].focus();
    } else if (e.key === "Tab") {
      closeMenus();
    }
  });
  // Radio-style menus (sort, save-to, devices): one checked item per menu.
  document.addEventListener("click", (e) => {
    const item = e.target.closest('[role="menuitemradio"]');
    if (!item) return;
    $$('[role="menuitemradio"]', item.closest(".menu")).forEach((x) => x.setAttribute("aria-checked", String(x === item)));
    if (item.dataset.saveto) {
      const trigger = $('[data-menu="menu-saveto"]');
      trigger.innerHTML = `${icon(item.dataset.saveto === "Library" ? "grid" : "folder")}Save to ${item.dataset.saveto}${icon("chev-down")}`;
    }
  });

  /* ---------- Toast ---------- */

  let toastTimer;
  let toastAction = null;
  const toastEl = $("#toast");
  const toastActionBtn = $("#toast-action");
  function toast(msg, action) {
    $("#toast-msg").textContent = msg;
    toastAction = action || null;
    toastActionBtn.hidden = !action;
    if (action) toastActionBtn.textContent = action.label;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), action ? 6000 : 2400);
  }
  toastActionBtn.addEventListener("click", () => {
    if (toastAction) toastAction.run();
    toastAction = null;
    toastEl.classList.remove("is-on");
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-toast]");
    if (b && !b.closest("[data-menu]")) toast(b.dataset.toast);
  });

  /* ---------- Dialogs: focus goes in, Escape closes, focus comes back ---------- */

  const openers = new Map();
  function openDialog(id, opener) {
    const dlg = document.getElementById(id);
    if (!dlg || dlg.open) return;
    closeMenus();
    openers.set(id, opener || document.activeElement);
    dlg.showModal();
    const first = $("[autofocus]", dlg) || $("input:not([readonly]):not([disabled]), select, button:not([data-close]), [tabindex='0']", dlg);
    (first || $("[data-close]", dlg)).focus();
  }
  $$("dialog").forEach((dlg) => {
    dlg.addEventListener("close", () => {
      const back = openers.get(dlg.id);
      openers.delete(dlg.id);
      if (back && document.contains(back) && typeof back.focus === "function") back.focus();
    });
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close(); // backdrop click
    });
  });
  document.addEventListener("click", (e) => {
    const d = e.target.closest("[data-dialog]");
    if (d) {
      const from = d.closest("dialog");
      if (d.dataset.dialog === "share-dialog") prepareShare(d.dataset.shareWhat, d);
      if (from && from.open) {
        const back = openers.get(from.id);
        from.close();
        openDialog(d.dataset.dialog, back);
      } else {
        // A menu item is hidden once its menu closes, so focus returns to the menu's trigger instead.
        const menu = d.closest(".menu");
        const opener = (menu && $(`[data-menu="${menu.id}"]`)) || d;
        openDialog(d.dataset.dialog, opener);
      }
      return;
    }
    const c = e.target.closest("dialog [data-close]");
    if (c && !c.hasAttribute("data-view")) c.closest("dialog").close();
  });

  /* ---------- Copy (sample links only) ---------- */

  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-copy]");
    if (!b) return;
    const field = document.getElementById(b.dataset.copy);
    if (!field) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(field.value);
      ok = true;
    } catch (err) {
      field.select();
      ok = document.execCommand && document.execCommand("copy");
    }
    const hint = field.closest(".field") && $(".hint", field.closest(".field"));
    if (hint && hint.id === "sh-hint") hint.textContent = ok ? "Copied. This is a sample link; nothing was sent." : "Copy failed in this browser. Select the link and copy it yourself.";
    toast(ok ? "Sample link copied" : "Copy failed; select the link instead");
  });

  /* ---------- Generic toggles ---------- */

  document.addEventListener("click", (e) => {
    const sw = e.target.closest(".switch");
    if (sw && !sw.disabled) {
      sw.setAttribute("aria-checked", String(sw.getAttribute("aria-checked") !== "true"));
      sw.dispatchEvent(new CustomEvent("switch", { bubbles: true }));
      markDirty(sw);
    }
    const tg = e.target.closest("[data-toggle-group]");
    if (tg) {
      const attr = tg.dataset.toggleGroup === "selected" ? "aria-selected" : "aria-pressed";
      $$("[data-toggle-group]", tg.parentElement).forEach((b) => b.setAttribute(attr, "false"));
      tg.setAttribute(attr, "true");
      markDirty(tg);
    }
  });

  /* ---------- Settings tabs ---------- */

  const tabs = $$("[data-tab]");
  function selectTab(tab) {
    tabs.forEach((t) => {
      t.setAttribute("aria-selected", String(t === tab));
      t.tabIndex = t === tab ? 0 : -1;
    });
    $$("[data-panel]").forEach((p) => p.classList.toggle("is-current", p.dataset.panel === tab.dataset.tab));
  }
  tabs.forEach((tab, i) => {
    tab.tabIndex = tab.getAttribute("aria-selected") === "true" ? 0 : -1;
    tab.addEventListener("click", () => selectTab(tab));
    // Arrow keys move between tabs and select as they go; Tab leaves the list.
    tab.addEventListener("keydown", (e) => {
      const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
      if (next === null) return;
      e.preventDefault();
      const target = tabs[(next + tabs.length) % tabs.length];
      selectTab(target);
      target.focus();
    });
  });
  $("#delete-account").addEventListener("click", (e) => openDialog("confirm-dialog", e.currentTarget));
  $("#cf-ok").addEventListener("click", () => {
    const b = $("#cf-ok");
    b.setAttribute("aria-busy", "true");
    setTimeout(() => {
      b.removeAttribute("aria-busy");
      $("#confirm-dialog").close();
      toast("Demo: nothing was deleted");
    }, 800);
  });

  /* ---------- Brand swatches (editor page settings and Settings › Brand) ---------- */

  document.addEventListener("click", (e) => {
    const sw = e.target.closest("[data-brand]");
    if (!sw) return;
    $$("[data-brand]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.brand === sw.dataset.brand)));
    [$("#jp"), $("#public")].forEach((el) => {
      el.style.setProperty("--brand", sw.dataset.brand);
      el.style.setProperty("--brand-hover", sw.dataset.brandHover);
    });
    const hex = $("#s-hex");
    if (hex) hex.value = sw.dataset.brand.toUpperCase();
    markDirty(sw);
  });

  /* ---------- Library: search, filter, sort, layout, selection, card actions ---------- */

  const grid = $("#lib-grid");
  const search = $("#lib-search");
  const searchClear = $("#lib-search-clear");
  const empty = $("#lib-empty");
  let filter = "all";
  let sort = "recent";

  function applyLibrary() {
    const q = search.value.trim().toLowerCase();
    searchClear.hidden = q.length === 0;
    let visible = 0;
    const cards = $$(".card", grid);
    cards.forEach((c) => {
      const show = (filter === "all" || c.dataset.type === filter) && (!q || c.dataset.title.toLowerCase().includes(q));
      c.hidden = !show;
      if (show) visible++;
    });
    const sorted = cards.slice().sort((a, b) => {
      if (sort === "name") return a.dataset.title.localeCompare(b.dataset.title);
      if (sort === "views") return Number(b.dataset.views) - Number(a.dataset.views);
      return Number(a.dataset.order) - Number(b.dataset.order);
    });
    sorted.forEach((c) => grid.appendChild(c));
    empty.hidden = visible > 0;
    const filterLabel = ($(`#lib-filter [data-filter="${filter}"]`) || {}).textContent || "";
    $("#lib-empty-q").textContent = q || filterLabel.trim();
    grid.hidden = visible === 0;
    $("#folders").hidden = q.length > 0 || filter !== "all";
  }
  search.addEventListener("input", applyLibrary);
  searchClear.addEventListener("click", () => {
    search.value = "";
    applyLibrary();
    search.focus();
  });
  const filterButtons = $$("#lib-filter [data-filter]");
  $("#lib-empty-clear").addEventListener("click", () => {
    search.value = "";
    filter = "all";
    filterButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === "all")));
    applyLibrary();
    search.focus();
  });
  filterButtons.forEach((b) =>
    b.addEventListener("click", () => {
      filter = b.dataset.filter;
      filterButtons.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      applyLibrary();
    }),
  );
  $$("[data-sort]").forEach((b) =>
    b.addEventListener("click", () => {
      sort = b.dataset.sort;
      $("#sort-btn").setAttribute("aria-label", `Sort: ${b.textContent.trim()}`);
      $("#sort-btn").toggleAttribute("data-set", sort !== "recent");
      applyLibrary();
    }),
  );
  $$("[data-layout-mode]").forEach((b) =>
    b.addEventListener("click", () => {
      $$("[data-layout-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      grid.classList.toggle("is-list", b.dataset.layoutMode === "list");
    }),
  );

  function syncSelection() {
    const checked = $$("[data-select]:checked", grid);
    $$(".card", grid).forEach((c) => c.classList.toggle("is-selected", !!$("[data-select]:checked", c)));
    grid.classList.toggle("has-selection", checked.length > 0);
    $("#selection-bar").hidden = checked.length === 0;
    $("#sel-count").textContent = checked.length;
    // One link per item, so Share from the bar works for exactly one selected item.
    $("#sel-share").disabled = checked.length !== 1;
  }
  // Any card anywhere shows its selection ring; only the Library grid has a selection bar.
  document.addEventListener("change", (e) => {
    if (!e.target.matches("[data-select]")) return;
    const card = e.target.closest(".card");
    if (card) card.classList.toggle("is-selected", e.target.checked);
    if (e.target.closest("#lib-grid")) syncSelection();
  });
  $("#sel-clear").addEventListener("click", () => {
    $$("[data-select]", grid).forEach((c) => (c.checked = false));
    syncSelection();
  });

  // Remove cards with an undo. Reversible, local.
  function removeCards(cards, label) {
    const restore = cards.map((c) => ({ c, next: c.nextElementSibling, parent: c.parentElement }));
    cards.forEach((c) => c.remove());
    syncSelection();
    applyLibrary();
    toast(label, {
      label: "Undo",
      run: () => {
        restore.reverse().forEach(({ c, next, parent }) => (next && next.parentElement === parent ? parent.insertBefore(c, next) : parent.appendChild(c)));
        $$("[data-select]", grid).forEach((x) => (x.checked = false));
        syncSelection();
        applyLibrary();
      },
    });
  }
  $("#sel-delete").addEventListener("click", () => {
    const cards = $$(".card.is-selected", grid);
    removeCards(cards, `${cards.length} item${cards.length === 1 ? "" : "s"} deleted (demo)`);
  });

  let newSeq = 0;
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-card-action]");
    if (!b) return;
    const card = b.closest(".card");
    const action = b.dataset.cardAction;
    if (action === "open") {
      const link = $(".card-title a", card);
      link.click();
    } else if (action === "delete") {
      removeCards([card], `"${card.dataset.title}" deleted (demo)`);
    } else if (action === "duplicate") {
      const id = card.dataset.id;
      const copyId = `${id}-copy-${++newSeq}`;
      CARDS[copyId] = { ...CARDS[id], title: `${CARDS[id].title} (copy)`, order: -1 - newSeq, views: 0, status: CARDS[id].kind === "page" ? "Draft" : undefined };
      card.insertAdjacentHTML("afterend", cardHTML(copyId));
      applyLibrary();
      toast("Duplicated (demo)", { label: "Undo", run: () => removeCards([$(`.card[data-id="${copyId}"]`)], "Copy removed") });
    } else if (action === "rename") {
      startRename(card);
    } else if (action === "select") {
      const box = $("[data-select]", card);
      box.checked = true;
      box.dispatchEvent(new Event("change", { bubbles: true }));
      box.focus();
    }
  });

  function startRename(card) {
    const title = $(".card-title", card);
    const link = $("a", title);
    const old = card.dataset.title;
    const input = document.createElement("input");
    input.className = "input rename";
    input.value = old;
    input.setAttribute("aria-label", "Rename");
    title.replaceChildren(input);
    input.focus();
    input.select();
    const finish = (save) => {
      const name = save && input.value.trim() ? input.value.trim() : old;
      card.dataset.title = name;
      link.textContent = name;
      title.replaceChildren(link);
      $('[data-menu]', card).focus();
      if (name !== old) {
        applyLibrary();
        toast("Renamed (demo)", {
          label: "Undo",
          run: () => {
            card.dataset.title = old;
            link.textContent = old;
            applyLibrary();
          },
        });
      }
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finish(true);
      if (e.key === "Escape") finish(false);
    });
    input.addEventListener("blur", () => finish(true), { once: true });
  }

  // Thumbnails and titles of documents and images open the preview dialog.
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-open-file]");
    if (!a) return;
    e.preventDefault();
    const c = CARDS[a.dataset.openFile];
    const t = thumbInner(c);
    $("#pv-title").textContent = c.title;
    $("#pv-meta").textContent = metaText(c);
    $("#pv-stage").innerHTML = `<span class="${t.cls} large" style="${t.vars}">${t.html.replace(/<span class="play-glyph">.*?<\/span>$/, "")}</span>`;
    $("#preview-dialog [data-dialog='share-dialog']").dataset.shareWhat = a.dataset.openFile;
    openDialog("preview-dialog", a.closest(".card") ? $(".card-title a", a.closest(".card")) : a);
  });

  // New › Folder: adds a tile, with undo.
  $("#new-folder").addEventListener("click", () => {
    const tile = document.createElement("button");
    tile.className = "folder";
    tile.type = "button";
    tile.dataset.demo = "folder";
    tile.innerHTML = `${icon("folder")}Untitled folder<span>0</span>`;
    $("#folders").appendChild(tile);
    tile.focus();
    toast("Folder added (demo)", { label: "Undo", run: () => tile.remove() });
  });

  // Demo-only actions say so instead of pretending.
  const DEMO_TEXT = {
    "new-page": "Demo: would create a page and open the editor",
    folder: "Demo: would open the folder",
    move: "Demo: Move to lists your folders here",
    replace: "Demo: would open the video picker",
    poster: "Demo: would open the image picker",
    logo: "Demo: would open the file picker",
    "duplicate-section": "Demo: would duplicate the section",
    "add-section": "Demo: would add the section below the last one",
    external: "Demo: this would open the real link in a new tab",
  };
  document.addEventListener("click", (e) => {
    const d = e.target.closest("[data-demo]");
    if (!d) return;
    if (d.tagName === "A") e.preventDefault();
    toast(DEMO_TEXT[d.dataset.demo] || "Demo only");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const d = e.target.closest('.dropzone[role="button"]');
    if (!d) return;
    e.preventDefault();
    d.click();
  });

  /* ---------- Upload dialog (demo) ---------- */

  let upTimer = null;
  const upDrop = $("#up-drop");
  function resetUpload() {
    clearInterval(upTimer);
    $("#up-row").hidden = true;
    $("#up-progress-wrap").hidden = true;
    $("#up-progress").style.setProperty("--p", "0%");
    $("#up-hint").textContent = "Demo upload, 0%";
    $("#up-chip").textContent = "Demo";
    $("#up-add").disabled = true;
    upDrop.hidden = false;
  }
  function startUpload() {
    upDrop.hidden = true;
    $("#up-row").hidden = false;
    $("#up-progress-wrap").hidden = false;
    let pct = 0;
    clearInterval(upTimer);
    upTimer = setInterval(() => {
      pct = Math.min(100, pct + 9);
      $("#up-progress").style.setProperty("--p", `${pct}%`);
      $("#up-hint").textContent = pct < 100 ? `Demo upload, ${pct}%. Nothing leaves this device.` : "Demo upload finished. Nothing left this device.";
      if (pct >= 100) {
        clearInterval(upTimer);
        $("#up-chip").textContent = "Ready";
        $("#up-add").disabled = false;
        $("#up-add").focus();
      }
    }, 220);
  }
  upDrop.addEventListener("click", startUpload);
  upDrop.addEventListener("dragover", (e) => {
    e.preventDefault();
    upDrop.classList.add("is-over");
  });
  upDrop.addEventListener("dragleave", () => upDrop.classList.remove("is-over"));
  upDrop.addEventListener("drop", (e) => {
    e.preventDefault();
    upDrop.classList.remove("is-over");
    startUpload();
  });
  $("#upload-dialog").addEventListener("close", resetUpload);
  $("#up-add").addEventListener("click", () => {
    const id = `upload-${++newSeq}`;
    CARDS[id] = { kind: "video", title: "Northstar cut 2", dur: "3:05", age: "Just now", views: 0, scene: "both", a: "#e3ead9", b: "#bfcfae", order: -100 - newSeq, demo: true };
    grid.insertAdjacentHTML("afterbegin", cardHTML(id));
    const card = $(`.card[data-id="${id}"]`);
    $("#upload-dialog").close();
    showView("library");
    writeURL({ view: "library" });
    applyLibrary();
    toast("Added to the Library (demo)", { label: "Undo", run: () => removeCards([card], "Demo upload removed") });
    $(".card-title a", card).focus();
  });

  /* ---------- Share dialog ---------- */

  // The sample link is derived from the item: /p/ for pages, /w/ for videos, /f/ for files, then the title as a slug.
  const SHARE_PATH = { page: "p", video: "w", doc: "f", image: "f" };
  const slug = (s) =>
    String(s)
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  function prepareShare(what, from) {
    let title = $("#doc-title").value.trim() || "Welcome to your proposal";
    let kind = "page";
    let card = from && from.closest(".card");
    if (what === "selection") card = $(".card.is-selected", grid);
    else if (!card && what) card = $(`.card[data-id="${what}"]`);
    if (card) {
      title = card.dataset.title;
      kind = card.dataset.kind;
    } else if (what && CARDS[what]) {
      title = CARDS[what].title;
      kind = CARDS[what].kind;
    }
    $("#sh-title-name").textContent = `"${title}"`;
    $("#sh-link").value = `https://clarity.example.com/${SHARE_PATH[kind] || "p"}/${slug(title) || "item"}`;
    $("#sh-hint").textContent = "Sample link. Copy puts it on your clipboard; nothing is sent.";
  }
  const shAccess = $("#sh-access");
  function syncAccess() {
    const v = shAccess.value;
    $("#sh-password").hidden = v !== "password";
    $("#sh-access-desc").textContent = v === "link" ? "Anyone with the link, no account needed." : v === "password" ? "Viewers type the password once per device." : "The link shows a 'paused' page until you turn it back on.";
    const status = $("#sh-status");
    status.textContent = v === "off" ? "Link paused" : "Link is live";
    status.className = `chip ${v === "off" ? "warning" : "accent"}`;
    $("#sh-copy").disabled = v === "off";
  }
  shAccess.addEventListener("change", syncAccess);
  function setPeople(state) {
    $$("[data-people-state]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.peopleState === state)));
    $$("[data-people]").forEach((el) => (el.hidden = el.dataset.people !== state));
  }
  $$("[data-people-state]").forEach((b) => b.addEventListener("click", () => setPeople(b.dataset.peopleState)));
  $("#sh-retry").addEventListener("click", (e) => {
    const b = e.currentTarget;
    b.setAttribute("aria-busy", "true");
    setPeople("loading");
    setTimeout(() => {
      b.removeAttribute("aria-busy");
      setPeople("list");
      toast("Views loaded (demo)");
    }, 900);
  });

  /* ---------- Editor ---------- */

  let published = false;
  const publish = $("#publish");
  const saved = $("#saved");
  let savedTimer;
  function markDirty(el) {
    if (!el || !el.closest || !el.closest("#editor")) return;
    saved.textContent = "Saving…";
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => (saved.textContent = "Saved locally"), 600);
    if (published) {
      publish.disabled = false;
      $("#pub-chip").textContent = "Live, unpublished changes";
    }
  }
  $("#inspector").addEventListener("input", (e) => markDirty(e.target));
  publish.addEventListener("click", () => {
    publish.setAttribute("aria-busy", "true");
    setTimeout(() => {
      publish.removeAttribute("aria-busy");
      published = true;
      publish.textContent = "Update";
      publish.disabled = true;
      const chip = $("#pub-chip");
      chip.textContent = "Live";
      chip.classList.add("accent");
      $('.acc-item[data-block="page"] .acc-meta').textContent = "Live";
      toast("Marked live in this prototype only");
    }, 900);
  });
  $$("[data-canvas]").forEach((b) =>
    b.addEventListener("click", () => {
      $$("[data-canvas]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $("#canvas").classList.toggle("mobile", b.dataset.canvas === "mobile");
    }),
  );

  // Title: toolbar field and Page settings field are the same value.
  const docTitle = $("#doc-title");
  const pageTitle = $("#page-title-field");
  docTitle.addEventListener("input", () => {
    pageTitle.value = docTitle.value;
    markDirty(docTitle);
  });
  pageTitle.addEventListener("input", () => (docTitle.value = pageTitle.value));
  docTitle.addEventListener("keydown", (e) => {
    if (e.key === "Enter") docTitle.blur();
  });

  // Sections: the accordion and the canvas select the same block.
  function selectBlock(kind) {
    $$(".jp-block").forEach((b) => b.classList.toggle("is-selected", b.dataset.block === kind));
    $$(".acc-item").forEach((item) => {
      const open = item.dataset.block === kind;
      item.classList.toggle("is-open", open);
      $(".acc-head", item).setAttribute("aria-expanded", String(open));
      $(".acc-body", item).hidden = !open;
    });
  }
  $$(".acc-head").forEach((h) =>
    h.addEventListener("click", () => {
      const item = h.closest(".acc-item");
      if (item.classList.contains("is-open")) {
        item.classList.remove("is-open");
        h.setAttribute("aria-expanded", "false");
        $(".acc-body", item).hidden = true;
        $$(".jp-block").forEach((b) => b.classList.remove("is-selected"));
      } else selectBlock(item.dataset.block);
    }),
  );
  $$(".jp-block").forEach((b) => {
    b.addEventListener("click", (e) => {
      if (e.target.closest(".block-toolbar, .player-bar, .player-big, .input, .btn, .link")) return;
      selectBlock(b.dataset.block);
    });
    b.addEventListener("focus", () => selectBlock(b.dataset.block));
  });
  // Move a section up or down; the accordion order follows.
  document.addEventListener("click", (e) => {
    const m = e.target.closest("[data-move]");
    if (!m) return;
    const block = m.closest(".jp-block");
    const sib = m.dataset.move === "up" ? block.previousElementSibling : block.nextElementSibling;
    if (!sib || !sib.classList.contains("jp-block")) return;
    if (m.dataset.move === "up") sib.before(block);
    else sib.after(block);
    const blocks = $$(".jp-block", $("#jp"));
    blocks.forEach((b, i) => {
      $('[aria-label="Move up"]', b).disabled = i === 0;
      $('[aria-label="Move down"]', b).disabled = i === blocks.length - 1;
      const acc = $(`.acc-item[data-block="${b.dataset.block}"]`);
      if (acc) $("#acc").insertBefore(acc, $('.acc-item[data-block="page"]'));
    });
    markDirty(m);
    m.focus();
  });
  // Live text sync from the panel into the canvas.
  $$("[data-sync]").forEach((f) =>
    f.addEventListener("input", () => {
      const target = document.getElementById(f.dataset.sync);
      if (target) target.textContent = f.value;
      if (f.id === "ins-cta-label") $('.acc-item[data-block="cta"] .acc-meta').textContent = f.value;
    }),
  );
  $$("[data-sync-value]").forEach((f) =>
    f.addEventListener("input", () => {
      const li = $$("#jp-values li")[Number(f.dataset.syncValue)];
      if (li) $("b", li).textContent = f.value;
    }),
  );
  $$("[data-values]").forEach((b) =>
    b.addEventListener("click", () => {
      $$("[data-values]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      const list = $("#jp-values");
      list.hidden = b.dataset.values === "off";
      list.classList.toggle("is-grid", b.dataset.values === "grid");
      $('.acc-item[data-block="value"] .acc-meta').textContent = b.dataset.values === "off" ? "No points" : "3 points";
      markDirty(b);
    }),
  );
  $$("[data-cta-style]").forEach((b) =>
    b.addEventListener("click", () => {
      $$("[data-cta-style]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $("#jp-cta").classList.toggle("quiet", b.dataset.ctaStyle === "quiet");
      markDirty(b);
    }),
  );
  $("#ins-lead").addEventListener("switch", (e) => {
    const on = e.currentTarget.getAttribute("aria-checked") === "true";
    $("#ins-lead-fields").hidden = !on;
    $("#jp-lead").hidden = !on;
  });
  // Link validation: an inline error, not a blocked field.
  const ctaUrl = $("#ins-cta-url");
  ctaUrl.addEventListener("input", () => {
    const bad = ctaUrl.value.trim() !== "" && !/^https:\/\/\S+\.\S+/.test(ctaUrl.value.trim());
    ctaUrl.setAttribute("aria-invalid", String(bad));
    $("#ins-cta-url-err").hidden = !bad;
  });
  document.addEventListener("click", (e) => {
    const f = e.target.closest("[data-focus]");
    if (f) {
      selectBlock("video");
      document.getElementById(f.dataset.focus).focus();
    }
  });

  // Trim handles: pointer drag and arrow keys.
  const strip = $("#filmstrip");
  if (strip) {
    let total = 252;
    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    const state = { l: 0, r: 0 };
    const render = () => {
      strip.style.setProperty("--l", `${state.l}%`);
      strip.style.setProperty("--r", `${state.r}%`);
      const start = (state.l / 100) * total;
      const end = total - (state.r / 100) * total;
      $("#trim-start-t").textContent = fmt(start);
      $("#trim-end-t").textContent = fmt(end);
      $("#trim-len").textContent = `${fmt(end - start)} kept`;
      const l = $(".trim-handle.l", strip);
      const r = $(".trim-handle.r", strip);
      l.setAttribute("aria-valuenow", String(Math.round(start)));
      l.setAttribute("aria-valuetext", `Start at ${fmt(start)}`);
      r.setAttribute("aria-valuenow", String(Math.round(end)));
      r.setAttribute("aria-valuetext", `End at ${fmt(end)}`);
      $('.acc-item[data-block="video"] .acc-meta').textContent = state.l || state.r ? `${fmt(end - start)} of ${fmt(total)}` : fmt(total);
    };
    const set = (h, pct) => {
      if (h === "l") state.l = Math.max(0, Math.min(pct, 100 - state.r - 8));
      else state.r = Math.max(0, Math.min(pct, 100 - state.l - 8));
      render();
    };
    $$(".trim-handle", strip).forEach((h) => {
      h.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        h.setPointerCapture(e.pointerId);
        const rect = strip.getBoundingClientRect();
        const move = (ev) => {
          const x = Math.min(Math.max(ev.clientX - rect.left, 0), rect.width) / rect.width;
          set(h.dataset.handle, h.dataset.handle === "l" ? x * 100 : (1 - x) * 100);
          markDirty(h);
        };
        const up = () => {
          h.removeEventListener("pointermove", move);
          h.removeEventListener("pointerup", up);
        };
        h.addEventListener("pointermove", move);
        h.addEventListener("pointerup", up);
      });
      h.addEventListener("keydown", (e) => {
        const step = e.shiftKey ? 5 : 1;
        const side = h.dataset.handle;
        const cur = side === "l" ? state.l : state.r;
        if (e.key === "ArrowRight") set(side, side === "l" ? cur + step : cur - step);
        else if (e.key === "ArrowLeft") set(side, side === "l" ? cur - step : cur + step);
        else return;
        e.preventDefault();
        markDirty(h);
      });
    });
    strip.addEventListener("editor-source", (e) => {
      total = e.detail.total;
      state.l = state.r = 0;
      $$(".trim-handle", strip).forEach((h) => h.setAttribute("aria-valuemax", String(total)));
      strip.style.setProperty("--scene-a", e.detail.card.a);
      strip.style.setProperty("--scene-b", e.detail.card.b);
      strip.style.setProperty("--shirt", e.detail.card.shirt || "#35456a");
      render();
    });
    render();
  }

  /* ---------- Players ---------- */

  const SPEEDS = [1, 1.25, 1.5, 1.75, 2];
  $$(".player").forEach((p) => {
    let total = 252;
    let t = 0;
    let speedIdx = 0;
    let timer = null;
    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    const fill = $('[data-player="fill"]', p);
    const cur = $('[data-player="current"]', p);
    const scrub = $('[data-player="scrub"]', p);
    const iconUse = $('[data-player="icon"] use', p);
    const render = () => {
      fill.style.setProperty("--p", `${(t / total) * 100}%`);
      cur.textContent = fmt(t);
      scrub.setAttribute("aria-valuenow", String(Math.round(t)));
      scrub.setAttribute("aria-valuetext", fmt(t));
    };
    const setState = (s) => {
      p.dataset.state = s;
      iconUse.setAttribute("href", s === "playing" ? "#i-pause" : "#i-play");
      $$('[aria-label="Play"],[aria-label="Pause"]', p).forEach((b) => b.setAttribute("aria-label", s === "playing" ? "Pause" : "Play"));
      clearInterval(timer);
      if (s === "playing") {
        timer = setInterval(() => {
          t = Math.min(total, t + 0.25 * SPEEDS[speedIdx]);
          render();
          if (t >= total) setState("paused");
        }, 250);
      }
    };
    const toggle = () => setState(p.dataset.state === "playing" ? "paused" : "playing");
    $(".player-big", p).addEventListener("click", toggle);
    $('[data-player="toggle"]', p).addEventListener("click", toggle);
    scrub.addEventListener("click", (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      t = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1) * total;
      render();
    });
    scrub.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") t = Math.min(total, t + 5);
      else if (e.key === "ArrowLeft") t = Math.max(0, t - 5);
      else if (e.key === "Home") t = 0;
      else if (e.key === "End") t = total;
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        toggle();
        return;
      } else return;
      e.preventDefault();
      render();
    });
    $('[data-player="speed"]', p).addEventListener("click", (e) => {
      speedIdx = (speedIdx + 1) % SPEEDS.length;
      e.currentTarget.textContent = `${SPEEDS[speedIdx]}×`;
      e.currentTarget.setAttribute("aria-label", `Playback speed ${SPEEDS[speedIdx]}x`);
    });
    $('[data-player="cc"]', p).addEventListener("click", (e) => {
      const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
      e.currentTarget.setAttribute("aria-pressed", String(on));
      p.classList.toggle("cc", on);
    });
    $('[data-player="full"]', p).addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (p.requestFullscreen) p.requestFullscreen().catch(() => toast("Fullscreen is not available here"));
    });
    if (p.closest("#editor")) p.addEventListener("editor-source", (e) => {
      setState("paused");
      total = e.detail.total;
      t = 0;
      $('[data-player="duration"]', p).textContent = fmt(total);
      scrub.setAttribute("aria-valuemax", String(total));
      render();
    });
    render();
  });

  const editorSource = $("#ins-src");
  const editorPlayer = $("#editor .player");
  const aspectButtons = $$('[aria-labelledby="l-aspect"] [data-toggle-group]');
  if (editorSource && editorPlayer) {
    const updateEditorVideo = () => {
      const card = CARDS[editorSource.value];
      const total = Number(card.dur.split(":")[0]) * 60 + Number(card.dur.split(":")[1]);
      const aspect = aspectButtons.find((b) => b.getAttribute("aria-pressed") === "true").textContent.trim();
      const portrait = aspect === "9:16" || (aspect === "Auto" && card.portrait);
      editorPlayer.classList.toggle("is-portrait", portrait);
      editorPlayer.classList.toggle("is-screen", card.scene === "screen");
      editorPlayer.style.setProperty("--scene-a", card.a);
      editorPlayer.style.setProperty("--scene-b", card.b);
      editorPlayer.style.setProperty("--skin", card.skin || "#efcdb5");
      editorPlayer.style.setProperty("--shirt", card.shirt || "#35456a");
      $(".player-scene", editorPlayer).innerHTML = card.scene === "screen" ? '<span class="thumb-screen"></span>' : card.portrait ? '<span class="thumb-cam"></span>' : '<span class="thumb-screen"></span><span class="thumb-cam"></span>';
      $(".player-caption", editorPlayer).textContent = card === CARDS.northstar ? "Here is what changes with Northstar, and what stays the same." : card === CARDS.maya ? "A quick follow-up for Maya." : "A closer look at the product.";
      editorPlayer.dispatchEvent(new CustomEvent("editor-source", { detail: { total } }));
      strip.dispatchEvent(new CustomEvent("editor-source", { detail: { total, card } }));
      markDirty(editorSource);
    };
    editorSource.addEventListener("change", updateEditorVideo);
    aspectButtons.forEach((b) => b.addEventListener("click", () => {
      aspectButtons.forEach((button) => button.setAttribute("aria-pressed", String(button === b)));
      updateEditorVideo();
    }));
  }

  /* ---------- Public page states ---------- */

  const pub = $("#public");
  function setPublicState(s) {
    $$("[data-share-state]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.shareState === s)));
    const key = s === "portrait" ? "ready" : s;
    $$("[data-share]", pub).forEach((el) => (el.hidden = el.dataset.share !== key));
    $("#share-player").classList.toggle("is-portrait", s === "portrait");
    $('#share-player [data-player="duration"]').textContent = s === "portrait" ? "0:52" : "4:12";
    pub.dataset.state = s;
  }
  $$("[data-share-state]").forEach((b) => b.addEventListener("click", () => setPublicState(b.dataset.shareState)));
  $("#unlock-form").addEventListener("submit", (e) => {
    e.preventDefault();
    setPublicState("ready");
    toast("Unlocked (demo: any password works here)");
    $("#share-player .player-big").focus();
  });

  /* ---------- Recorder (mock preview, no camera) ---------- */

  const rec = $("#recorder");
  let recTimer = null;
  let recSeconds = 0;
  let recUpTimer = null;
  const pad = (n) => String(n).padStart(2, "0");
  const recFmt = (s) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  function setRec(state) {
    rec.dataset.state = state;
    $$("[data-rec-state]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.recState === state)));
    clearInterval(recTimer);
    clearInterval(recUpTimer);
    if (state === "idle") {
      recSeconds = 0;
      $("#rec-timer").textContent = "00:00";
      $("#rec-label").textContent = "Record";
      $("#rec-main").setAttribute("aria-label", "Record");
    }
    if (state === "recording") {
      $("#rec-label").textContent = "Stop";
      $("#rec-main").setAttribute("aria-label", "Stop recording");
      recTimer = setInterval(() => {
        recSeconds++;
        $("#rec-timer").textContent = recFmt(recSeconds);
        $("#rec-badge-time").textContent = recFmt(recSeconds);
      }, 1000);
    }
    if (state === "done") {
      const shown = recSeconds || 52;
      $("#rec-after-dur").textContent = `${Math.floor(shown / 60)}:${pad(shown % 60)}`;
      let pct = 0;
      const prog = $("#rec-progress");
      const hint = $("#rec-upload-hint");
      prog.style.setProperty("--p", "0%");
      hint.textContent = "Demo upload, 0%. Nothing leaves this device.";
      recUpTimer = setInterval(() => {
        pct = Math.min(100, pct + 7);
        prog.style.setProperty("--p", `${pct}%`);
        hint.textContent = pct < 100 ? `Demo upload, ${pct}%. Nothing leaves this device.` : "Demo upload finished. The sample link above opens the public page in this prototype.";
        if (pct >= 100) clearInterval(recUpTimer);
      }, 400);
      $("#rec-title").focus();
    }
  }
  $("#rec-main").addEventListener("click", () => setRec(rec.dataset.state === "recording" ? "done" : "recording"));
  $("#rec-again").addEventListener("click", () => {
    setRec("idle");
    $("#rec-main").focus();
  });
  $$("[data-rec-state]").forEach((b) => b.addEventListener("click", () => setRec(b.dataset.recState)));
  $$(".rec-dock [data-layout]").forEach((b) =>
    b.addEventListener("click", () => {
      $$(".rec-dock [data-layout]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $("#rec-preview").dataset.layout = b.dataset.layout;
    }),
  );

  /* ---------- System sheet: live toast and live retry ---------- */

  $("#sys-toast-btn").addEventListener("click", () => toast("Sample link copied", { label: "Undo", run: () => toast("Undone (demo)") }));
  $("#sys-error-retry").addEventListener("click", (e) => {
    const b = e.currentTarget;
    b.setAttribute("aria-busy", "true");
    setTimeout(() => {
      b.removeAttribute("aria-busy");
      $("#sys-error").hidden = true;
      $("#sys-error-ok").hidden = false;
      $("#sys-error-reset").focus();
    }, 900);
  });
  $("#sys-error-reset").addEventListener("click", () => {
    $("#sys-error-ok").hidden = true;
    $("#sys-error").hidden = false;
    $("#sys-error-retry").focus();
  });

  /* ---------- Boot ---------- */

  applyFromURL();
  applyLibrary();
  // Keep the URL honest for the host: always carry the resolved view and theme.
  writeURL({ view: currentView, theme: currentTheme() });

  // Self-check hook for the author's own offline layout tests. Writes the page's scroll width
  // to the root element when ?selfcheck is present. Harmless otherwise.
  if (new URLSearchParams(location.search).has("selfcheck")) {
    const report = () => {
      document.documentElement.dataset.scroll = `${document.documentElement.scrollWidth}x${innerWidth}`;
      document.documentElement.dataset.overflow = String(document.documentElement.scrollWidth > innerWidth);
    };
    report();
    setTimeout(report, 500);
  }
})();
