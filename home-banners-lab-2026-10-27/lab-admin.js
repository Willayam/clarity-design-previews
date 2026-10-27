/* Stage 2. The Admin > Banners page. Each frame owns one instance with its own drafts; saved data is the shared store. */

let adminUid = 0;

function adminShellDesktop(bodyHtml, actionsHtml) {
  return `<div class="m-desktop">
    <aside class="m-side">
      <div class="m-logo">${LOGO}<span class="word">Clarity</span><span class="collapse">${icon("panel-left")}</span></div>
      <nav class="m-nav">
        <a>${icon("house")}Home</a>
        <a>${icon("users")}Leads</a>
        <a class="is-active">${icon("shield")}Admin</a>
      </nav>
      <div class="m-account"><span class="avatar">A</span><span class="name">Alex Kim</span>${icon("chevrons")}</div>
    </aside>
    <div class="m-main" data-scroll>
      <div class="m-head m-head-admin"><h1>Admin</h1><div class="m-head-actions">${actionsHtml}</div></div>
      <nav class="m-tabs m-tabs-admin" aria-label="Admin"><span>Users</span><span>Organizations</span><span class="is-active">Banners</span></nav>
      <div class="m-body">${bodyHtml}</div>
    </div>
  </div>`;
}

function adminShellPhone(bodyHtml, actionsHtml) {
  return `<div class="m-phone">
    <div class="m-main" data-scroll>
      <div class="m-head m-head-admin"><h1>Admin</h1></div>
      ${actionsHtml ? `<div class="m-head-actions">${actionsHtml}</div>` : ""}
      <nav class="m-tabs m-tabs-admin" aria-label="Admin"><span>Users</span><span>Organizations</span><span class="is-active">Banners</span></nav>
      <div class="m-body">${bodyHtml}</div>
    </div>
    <div class="m-tabbar">
      <div>${icon("house")}Home</div>
      <div>${icon("users")}Leads</div>
      <div><span class="rec">${icon("video")}</span>Record</div>
      <div>${icon("menu")}More</div>
    </div>
  </div>`;
}

const CREATABLE = ["announcement", "offer", "event", "notice"];
const GROUPS = [["home", "On Home"], ["scheduled", "Scheduled"], ["drafts", "Drafts"], ["ended", "Ended"]];
const MESSAGE_FIELDS = ["headline", "body", "link", "linkLabel", "from", "until", "showEnd", "dismissible", "audience"];
const EVENT_FIELDS = ["title", "host", "start", "duration", "link", "leadDays", "audience"];
const FIELD_NAMES = { headline: "headline", body: "body", link: "link", linkLabel: "button label", from: "start of the window", until: "end of the window", showEnd: "end date display", dismissible: "dismiss setting", audience: "audience", title: "title", host: "host", start: "start", duration: "length", leadDays: "lead time" };

/* lab: { store, hcfg(), now(), consumeFail() } */
function createAdminApp({ root, phone, lab, config }) {
  const uid = `a${++adminUid}`;
  let cfg = { ...config };
  const state = {
    drafts: {}, sdrafts: {}, quick: null, status: {}, open: null, selected: null, create: null, menu: null,
    pvWidth: "desktop", pvAud: "free", moveInline: null, moveForm: null, confirm: null, drag: null, timers: {}, notice: null,
  };

  const now = () => lab.now();
  const store = () => lab.store;
  const banners = () => store().banners;
  const fieldsOf = (type) => (type === "event" ? EVENT_FIELDS : MESSAGE_FIELDS);
  const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k] ?? (k === "showEnd" || k === "dismissible" ? true : "")]));
  const norm = (o, type) => JSON.stringify(pick(o || {}, fieldsOf(type)));
  const entry = (what) => ({ at: now().toISOString(), by: CURRENT_ADMIN, what });
  const liveBanner = () => banners().find((b) => b.type === "live") || null;

  function isDirtyBanner(id) {
    if (id === "new") return true;
    const d = state.drafts[id], b = store().byId(id);
    if (!d || !b || d.type === "live") return false;
    return norm(d, d.type) !== norm(b, b.type);
  }
  function changedFields(id) {
    const d = state.drafts[id], b = store().byId(id);
    return fieldsOf(d.type).filter((k) => (d[k] ?? "") !== (b[k] ?? ""));
  }
  function listNames(keys) {
    const names = keys.map((k) => FIELD_NAMES[k] || k);
    if (names.length <= 1) return names[0] || "banner";
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }

  /* ----- rows and groups ----- */
  function rows() {
    const list = banners();
    return list.map((b) => {
      const st = adminStatus(b, now(), list);
      return { b, st, who: whoLine(b, st, now()), when: whenLine(b), edited: editedLine(b) };
    });
  }
  function groups() {
    const g = { home: [], scheduled: [], drafts: [], ended: [] };
    for (const r of rows()) g[r.st.group].push(r);
    return g;
  }

  /* ----- saving ----- */
  function setStatus(key, kind, text) {
    clearTimeout(state.timers[key]);
    state.status[key] = { kind, text };
    if (kind === "saved") state.timers[key] = setTimeout(() => { if (state.status[key]?.kind === "saved") { delete state.status[key]; render(); } }, 2600);
  }
  function runSave(key, mutate, { savedText = "Saved", failedText = "Could not save. Nothing changed for users.", after } = {}) {
    setStatus(key, "saving", "Saving");
    render();
    const fail = lab.consumeFail();
    setTimeout(() => {
      if (fail) { setStatus(key, "failed", failedText); render(); return; }
      // `after` may hand back a new key when the saved thing gets its real id.
      const newKey = after ? after() : null;
      if (newKey && newKey !== key) { clearTimeout(state.timers[key]); delete state.status[key]; }
      setStatus(newKey || key, "saved", savedText);
      store().commit(mutate);
      render();
    }, 650);
  }

  function saveBanner(id, { publish = null } = {}) {
    const d = state.drafts[id];
    const changed = changedFields(id);
    runSave(id, (list) => {
      const b = list.find((x) => x.id === id);
      Object.assign(b, pick(d, fieldsOf(d.type)));
      if (changed.length) b.history.unshift(entry(`Changed the ${listNames(changed)}`));
      if (publish === true) { b.status = "published"; list.splice(list.indexOf(b), 1); list.unshift(b); b.history.unshift(entry("Published")); }
      if (publish === false) { b.status = "draft"; b.history.unshift(entry("Unpublished")); }
    }, {
      savedText: publish === true ? "Published. It is first in line." : publish === false ? "Unpublished. Users no longer see it." : "Saved. Users see the change now.",
      failedText: publish === true ? "Could not publish. Nobody sees it yet." : "Could not save. Users still see the old version.",
      after: () => { state.drafts[id] = null; },
    });
  }

  function saveNew(publish) {
    const d = state.drafts.new;
    const id = store().newId(d.type);
    runSave("new", (list) => {
      const b = { ...pick(d, fieldsOf(d.type)), id, type: d.type, status: publish ? "published" : "draft", history: [entry(publish ? "Published" : "Saved as a draft"), entry(`Created the ${TYPES[d.type].name.toLowerCase()}`)] };
      list.unshift(b);
    }, {
      savedText: publish ? "Published. It is first in line." : "Saved as a draft. Nobody sees it.",
      failedText: publish ? "Could not publish. Nobody sees it yet." : "Could not save the draft.",
      after: () => {
        delete state.drafts.new; state.drafts[id] = null; state.open = id; state.selected = id;
        return id;
      },
    });
  }

  function setPublished(id, published) {
    const b = store().byId(id);
    runSave(id, (list) => {
      const x = list.find((y) => y.id === id);
      x.status = published ? "published" : "draft";
      if (published) { list.splice(list.indexOf(x), 1); list.unshift(x); }
      x.history.unshift(entry(published ? "Published" : "Unpublished"));
    }, { savedText: published ? "Published. It is first in line." : "Unpublished. Users no longer see it.", failedText: published ? `Could not publish. Nobody sees ${bannerTitle(b)} yet.` : "Could not unpublish. Users still see it." });
  }

  function deleteBanner(id) {
    const b = store().byId(id);
    runSave("page", (list) => { list.splice(list.findIndex((x) => x.id === id), 1); }, {
      savedText: `Deleted ${bannerTitle(b)}.`, failedText: `Could not delete ${bannerTitle(b)}. It is still there.`,
      after: () => { if (state.open === id) state.open = null; if (state.selected === id) state.selected = null; delete state.drafts[id]; },
    });
  }

  function reorder(id, place) {
    // place: { before: targetId } | { after: targetId } | { first: true }
    runSave("order", (list) => {
      const i = list.findIndex((x) => x.id === id); const [b] = list.splice(i, 1);
      if (place.first) list.unshift(b);
      else { const j = list.findIndex((x) => x.id === (place.before || place.after)); list.splice(place.before ? j : j + 1, 0, b); }
      b.history.unshift(entry(place.first ? "Moved to first" : "Changed the order"));
    }, { savedText: "Order saved. Users see the new order now.", failedText: "Could not save the order. Nothing changed." });
  }
  function moveWithin(id, dir) {
    const g = groups();
    const r = rows().find((x) => x.b.id === id); if (!r) return;
    const list = g[r.st.group]; const i = list.findIndex((x) => x.b.id === id);
    const j = i + dir; if (j < 0 || j >= list.length) return;
    reorder(id, dir < 0 ? { before: list[j].b.id } : { after: list[j].b.id });
  }

  /* ----- live training sessions ----- */
  function savedOverrides() { return (liveBanner() || {}).sessions || {}; }
  function mergedOverrides() {
    const out = clone(savedOverrides());
    for (const [date, d] of Object.entries(state.sdrafts)) out[date] = { ...(out[date] || {}), ...d };
    return out;
  }
  const liveSessions = () => buildSessions(mergedOverrides(), now());
  const savedSessions = () => buildSessions(savedOverrides(), now());
  const snorm = (o) => JSON.stringify({ topic: o?.topic || null, skipped: !!o?.skipped, movedTo: o?.movedTo || null });
  const sessionDirty = (date) => state.sdrafts[date] && snorm(state.sdrafts[date]) !== snorm(savedOverrides()[date]);
  const dirtySessionDates = () => Object.keys(state.sdrafts).filter(sessionDirty);
  const sdraft = (date) => (state.sdrafts[date] ||= clone(savedOverrides()[date] || { topic: null, skipped: false, movedTo: null }));

  function saveSession(date) {
    const d = clone(sdraft(date)); const was = savedOverrides()[date] || {};
    const label = fmt(pacificInstant(`${date}T${RULE.startTime}`)).short;
    const whats = [];
    if ((d.topic || null) !== (was.topic || null)) whats.push(d.topic ? `Set the ${label} topic` : `Cleared the ${label} topic`);
    if (!!d.skipped !== !!was.skipped) whats.push(d.skipped ? `Skipped the ${label} session` : `Restored the ${label} session`);
    if ((d.movedTo || null) !== (was.movedTo || null)) whats.push(d.movedTo ? `Moved ${label} to ${fmt(pacificInstant(d.movedTo)).date}` : `Put ${label} back`);
    runSave(`s:${date}`, (list) => {
      const live = list.find((b) => b.type === "live");
      live.sessions[date] = { topic: d.topic || null, skipped: !!d.skipped, movedTo: d.movedTo || null };
      for (const w of whats.reverse()) live.history.unshift(entry(w));
    }, { savedText: "Saved. Users see it now.", failedText: "Could not save. Users still see the old session.", after: () => { delete state.sdrafts[date]; } });
  }

  function saveQuick() {
    const next = savedSessions().next; if (!next) return;
    const topic = (state.quick || "").trim().slice(0, HEADLINE_MAX) || null;
    const label = fmt(next.scheduledAt).short;
    runSave("quick", (list) => {
      const live = list.find((b) => b.type === "live");
      live.sessions[next.date] = { ...(live.sessions[next.date] || { skipped: false, movedTo: null }), topic };
      live.history.unshift(entry(topic ? `Set the ${label} topic` : `Cleared the ${label} topic`));
    }, { savedText: "Saved. Users see the new topic now.", failedText: "Could not save. Users still see the old title.", after: () => { state.quick = null; } });
  }

  /* ----- small pieces ----- */
  function receipt(key, { retry = null } = {}) {
    const st = state.status[key];
    if (!st) return "";
    if (st.kind === "saving") return `<span class="rc rc-saving"><i class="spin"></i>Saving</span>`;
    if (st.kind === "saved") return `<span class="rc rc-saved">${icon("check")}${esc(st.text)}</span>`;
    return `<span class="rc rc-failed">${icon("alert")}${esc(st.text)}</span>${retry ? `<button type="button" class="btn btn-outline" ${retry}>Try again</button>` : ""}`;
  }
  function statusBadge(st) { return `<span class="badge badge-${st.kind}">${st.kind === "now" ? '<i class="dot"></i>' : ""}${esc(st.label)}</span>`; }
  function typeCell(b) { return `<span class="type-cell">${icon(TYPES[b.type].icon)}<span>${TYPES[b.type].name}</span></span>`; }

  function orderControl(r, group) {
    if (group !== "home" && group !== "scheduled") return cfg.order === "first" ? "" : `<span class="order-spacer"></span>`;
    const list = groups()[group]; const i = list.findIndex((x) => x.b.id === r.b.id);
    const id = r.b.id; const title = bannerTitle(r.b);
    if (cfg.order === "drag") return `<span class="handle" role="button" tabindex="0" aria-label="Reorder ${esc(title)}. Press the arrow keys." data-handle="${id}" data-group="${group}">${icon("grip")}</span>`;
    if (cfg.order === "buttons") return `<span class="updown"><button type="button" class="btn btn-ghost btn-icon" data-move-up="${id}" aria-label="Move ${esc(title)} up"${i === 0 ? " disabled" : ""}>${icon("chevron-up")}</button><button type="button" class="btn btn-ghost btn-icon" data-move-down="${id}" aria-label="Move ${esc(title)} down"${i === list.length - 1 ? " disabled" : ""}>${icon("chevron-down")}</button></span>`;
    return "";
  }
  function firstAction(r, group) {
    if (cfg.order !== "first" || (group !== "home" && group !== "scheduled")) return "";
    const list = groups()[group];
    if (list[0]?.b.id === r.b.id) return `<span class="first-note">First</span>`;
    return `<button type="button" class="btn btn-ghost" data-move-first="${r.b.id}">${icon("arrow-up-to-line")}Show first</button>`;
  }
  function rowMenu(r) {
    const b = r.b; const open = state.menu === b.id;
    const published = b.status === "published";
    return `<div class="menu-wrap"><button type="button" class="btn btn-ghost btn-icon" data-menu="${b.id}" aria-label="More actions for ${esc(bannerTitle(b))}" aria-expanded="${open}">${icon("ellipsis")}</button>
      ${open ? `<div class="menu-pop" role="menu">
        ${published ? `<button type="button" role="menuitem" data-unpublish="${b.id}">${icon("eye-off")}Unpublish</button>` : `<button type="button" role="menuitem" data-publish="${b.id}">${icon("eye")}Publish banner</button>`}
        ${cfg.order === "first" || true ? "" : ""}
        ${TYPES[b.type].deletable ? `<button type="button" role="menuitem" class="is-danger" data-delete="${b.id}">${icon("trash")}Delete</button>` : `<span class="menu-note">The series cannot be deleted. Unpublish hides it.</span>`}
      </div>` : ""}</div>`;
  }
  function editButton(r) {
    if (cfg.layout === "master") return "";
    const open = state.open === r.b.id;
    return `<button type="button" class="btn btn-outline" data-edit="${r.b.id}" aria-expanded="${open}" aria-label="${open && cfg.editor === "inline" ? "Close" : "Edit"} ${esc(bannerTitle(r.b))}">${icon("pencil")}<span class="btn-text">${open && cfg.editor === "inline" ? "Close" : "Edit"}</span></button>`;
  }
  function rowReceipt(id) { return receipt(id, { retry: null }); }

  function quickHtml() {
    const next = savedSessions().next; if (!next) return "";
    const value = state.quick ?? (next.topic || "");
    const dirty = state.quick !== null && ((state.quick.trim() || null) !== (next.topic || null));
    const st = state.status.quick;
    return `<div class="quick${dirty ? " is-dirty" : ""}${st?.kind === "failed" ? " is-failed" : ""}" data-quick>
      <label class="quick-label" for="${uid}-quick">Next topic<span>${fmt(next.startsAt).date}</span></label>
      <div class="quick-row"><input id="${uid}-quick" class="in${st?.kind === "failed" ? " is-failed" : ""}" type="text" maxlength="${HEADLINE_MAX}" data-quick-topic value="${esc(value)}" placeholder="${esc(DEFAULT_TITLE)}" aria-label="Topic for ${fmt(next.startsAt).date}">
        ${dirty ? `<button type="button" class="btn btn-primary" data-quick-save>Save topic</button><button type="button" class="btn btn-outline" data-quick-cancel>Cancel</button>` : ""}</div>
      ${dirty && !st ? `<p class="quick-note"><span class="chip chip-unsaved">Unsaved</span>Users see the current title until you save.</p>` : ""}
      ${st ? `<p class="quick-note">${receipt("quick", { retry: st.kind === "failed" ? "data-quick-save" : null })}</p>` : ""}
    </div>`;
  }

  /* ----- create ----- */
  function sampleView(type) {
    const n = now();
    const samples = {
      announcement: { id: "s", type, headline: "Teleprompter is here", body: "Read your script while you record.", link: "/record", linkLabel: "Try it" },
      offer: { id: "s", type, headline: "Get Pro for 20% off", link: "/settings/subscription", linkLabel: "Upgrade", showEnd: true, until: wallString(new Date(n.getTime() + 4 * 86_400_000)) },
      event: { id: "s", type, title: "Journey Pages workshop", host: "Sam Rivera", start: wallString(new Date(n.getTime() + 9 * 86_400_000)).slice(0, 10) + "T10:00", duration: 45, link: "https://lp.clarity.video/workshop", leadDays: 7 },
      notice: { id: "s", type, headline: "Scheduled maintenance Sunday 2:00 to 3:00 AM Pacific", body: "", dismissible: false },
    };
    return resolveBanner({ status: "published", audience: "everyone", ...samples[type] }, n);
  }
  function mini(type) {
    return `<span class="mini"><span class="mini-in">${renderBanner(sampleView(type), lab.hcfg(), { inert: true, size: "compact" })}</span></span>`;
  }
  function createControl() {
    if (cfg.editor === "page" && state.open) return "";
    if (cfg.create === "picker") return `<button type="button" class="btn btn-primary" data-create-open>${icon("plus")}New banner</button>`;
    if (cfg.create === "menu") {
      const open = state.create === "menu";
      return `<div class="menu-wrap menu-wrap-create"><button type="button" class="btn btn-primary" data-create-menu aria-expanded="${open}">${icon("plus")}New banner${icon("chevron-down")}</button>
        ${open ? `<div class="menu-pop menu-pop-types" role="menu">${CREATABLE.map((t) => `<button type="button" role="menuitem" data-new="${t}">${icon(TYPES[t].icon)}<span class="mi"><b>${TYPES[t].name}</b><small>${TYPES[t].what}</small></span></button>`).join("")}</div>` : ""}</div>`;
    }
    return "";
  }
  function templatesRow() {
    if (cfg.create !== "templates" || (cfg.editor === "page" && state.open)) return "";
    return `<div class="tpl-row">${CREATABLE.map((t) => `<button type="button" class="tpl" data-new="${t}"><span class="tpl-head">${icon("plus")}<b>New ${TYPES[t].name.toLowerCase()}</b></span><span class="tpl-what">${TYPES[t].what}</span>${mini(t)}</button>`).join("")}</div>`;
  }
  function pickerHtml() {
    return `<h2 class="dlg-title">New banner</h2><p class="dlg-text">Pick a type. You choose the words, the audience and the dates next.</p>
      <div class="pick-grid">${CREATABLE.map((t) => `<button type="button" class="pick" data-new="${t}"><span class="pick-head">${icon(TYPES[t].icon)}<b>${TYPES[t].name}</b></span><span class="pick-what">${TYPES[t].what}</span>${mini(t)}</button>`).join("")}</div>
      <div class="dlg-foot"><button type="button" class="btn btn-outline" data-create-close>Cancel</button></div>`;
  }
  function newDraft(type) {
    const n = now(); const w = wallString(n);
    const plus = (days, hhmm = "17:00") => `${wallString(new Date(n.getTime() + days * 86_400_000)).slice(0, 10)}T${hhmm}`;
    const base = { id: "new", type, status: "draft", audience: "everyone", history: [] };
    if (type === "event") return { ...base, title: "", host: "", start: plus(7, "10:00"), duration: 45, link: "", leadDays: 7 };
    if (type === "offer") return { ...base, headline: "", body: "", link: "/settings/subscription", linkLabel: "Upgrade", from: w, until: plus(7, "23:59"), showEnd: true, audience: "free" };
    if (type === "notice") return { ...base, headline: "", body: "", link: "", linkLabel: "", from: w, until: plus(2), dismissible: true };
    return { ...base, headline: "", body: "", link: "", linkLabel: "", from: w, until: plus(14) };
  }
  function startNew(type) {
    state.drafts.new = newDraft(type);
    state.open = "new"; state.selected = "new"; state.create = null; state.menu = null; delete state.status.new;
    render();
    focusFirstField();
  }

  /* ----- the editor ----- */
  function textField(d, key, label, { max, placeholder, hint, half, type = "text" } = {}) {
    const v = d[key] ?? ""; const id = `${uid}-${d.id}-${key}`;
    const count = max && String(v).length >= max - 20 ? `<span class="count">${String(v).length}/${max}</span>` : "";
    return `<div class="fld${half ? " is-half" : ""}"><label class="fld-label" for="${id}">${label}</label><div class="fld-wrap"><input id="${id}" class="in" type="${type}" ${max ? `maxlength="${max}"` : ""} data-field="${key}" value="${esc(v)}" placeholder="${esc(placeholder || "")}">${count}</div>${hint ? `<p class="fld-hint">${hint}</p>` : ""}</div>`;
  }
  function dtField(d, key, label, half) {
    const id = `${uid}-${d.id}-${key}`;
    return `<div class="fld${half ? " is-half" : ""}"><label class="fld-label" for="${id}">${label}</label><input id="${id}" class="in in-dt" type="datetime-local" data-field="${key}" value="${esc(d[key] || "")}"></div>`;
  }
  function selectField(d, key, label, options, half) {
    const id = `${uid}-${d.id}-${key}`;
    return `<div class="fld${half ? " is-half" : ""}"><label class="fld-label" for="${id}">${label}</label><select id="${id}" class="sel" data-field="${key}">${options.map(([v, l]) => `<option value="${v}"${String(d[key]) === String(v) ? " selected" : ""}>${l}</option>`).join("")}</select></div>`;
  }
  function switchField(d, key, label) {
    const on = d[key] !== false;
    return `<div class="fld"><label class="sw-label"><span class="sw" role="switch" aria-checked="${on}" tabindex="0" data-switch="${key}"><i></i></span><span>${label}</span></label></div>`;
  }
  const audienceOptions = [["everyone", "Everyone"], ["free", "Free plan users"], ["pro", "Pro plan users"]];

  function fieldsHtml(d) {
    if (d.type === "live") return `${sessionsEditor()}<div class="fld-grid"><div class="fld is-half"><p class="fld-label">Audience</p><p class="fld-static">Everyone. The series is free for every user.</p></div><div class="fld is-half"><p class="fld-label">Link</p><p class="fld-static">${esc(LANDING_URL)}</p></div></div>`;
    if (d.type === "event") {
      const lp = linkProblem(d.link);
      return `<div class="fld-grid">
        ${textField(d, "title", "Title", { max: HEADLINE_MAX, placeholder: "Journey Pages workshop" })}
        ${textField(d, "host", "Host", { placeholder: "Optional", half: true })}
        ${selectField(d, "duration", "Length", [[30, "30 min"], [45, "45 min"], [60, "60 min"], [90, "90 min"]], true)}
        ${dtField(d, "start", "Start, Pacific time", true)}
        ${selectField(d, "leadDays", "Show on Home", [[14, "14 days before"], [7, "7 days before"], [3, "3 days before"], [1, "The day before"], [0, "On the day"]], true)}
        ${textField(d, "link", "Link", { placeholder: "https://… or /path", hint: lp || "The button says Add to calendar, then Join live during the event." })}
        ${selectField(d, "audience", "Audience", audienceOptions, true)}
      </div>`;
    }
    const lp = linkProblem(d.link);
    return `<div class="fld-grid">
      ${textField(d, "headline", "Headline", { max: HEADLINE_MAX, placeholder: d.type === "offer" ? "Get Pro for 20% off" : d.type === "notice" ? "Scheduled maintenance Sunday 2:00 to 3:00 AM Pacific" : "Teleprompter is here" })}
      ${textField(d, "body", "Body", { max: BODY_MAX, placeholder: "Optional, one line" })}
      ${textField(d, "linkLabel", "Button label", { half: true, placeholder: d.type === "offer" ? "Upgrade" : "Try it" })}
      ${textField(d, "link", "Link", { half: true, placeholder: "https://… or /record", hint: lp || "" })}
      ${dtField(d, "from", "Show from", true)}
      ${dtField(d, "until", "Show until", true)}
      ${selectField(d, "audience", "Audience", audienceOptions, true)}
      ${d.type === "offer" ? switchField(d, "showEnd", "Show the end date, as in Ends Friday") : ""}
      ${d.type === "notice" ? switchField(d, "dismissible", "Users can dismiss it") : ""}
    </div>`;
  }

  function problemFor(d) {
    if (d.type === "live") return null;
    const lp = linkProblem(d.link); if (lp) return lp;
    if (d.type === "event") { if (!(d.title || "").trim()) return "Give the event a title."; if (!d.link) return "Add the event link."; return null; }
    if (!(d.headline || "").trim()) return "Write a headline.";
    if (d.type === "offer" && !d.link) return "An offer needs a link for its button.";
    if (d.link && !(d.linkLabel || "").trim()) return "Name the button.";
    return null;
  }

  function footerHtml(d, b, isNew) {
    const key = isNew ? "new" : d.id; const st = state.status[key];
    const problem = problemFor(d);
    const deleteBtn = b && TYPES[b.type].deletable ? `<button type="button" class="btn btn-quiet" data-delete="${b.id}">${icon("trash")}Delete</button>` : "";
    if (d.type === "live") {
      const published = b.status === "published";
      return `<div class="ed-foot"><span class="ed-foot-note">Session changes save per row.</span><span class="grow"></span>${receipt(b.id, { retry: `data-${published ? "unpublish" : "publish"}="${b.id}"` })}${published ? `<button type="button" class="btn btn-outline" data-unpublish="${b.id}">Unpublish</button>` : `<button type="button" class="btn btn-primary" data-publish="${b.id}">Publish banner</button>`}</div>`;
    }
    const dirty = isNew || isDirtyBanner(d.id);
    let left = "";
    if (st) left = receipt(key, { retry: st.kind === "failed" ? (isNew ? "data-publish-new" : `data-save="${d.id}"`) : null });
    else if (dirty) left = `<span class="chip chip-unsaved">${isNew ? "Not saved yet" : "Unsaved"}</span>`;
    const published = b?.status === "published";
    const dis = problem ? " disabled" : "";
    let buttons;
    if (isNew) buttons = `<button type="button" class="btn btn-outline" data-save-draft>Save as draft</button><button type="button" class="btn btn-primary" data-publish-new${dis}>Publish banner</button>`;
    else if (published) buttons = `${dirty ? `<button type="button" class="btn btn-ghost" data-discard="${d.id}">Discard</button>` : ""}<button type="button" class="btn btn-outline" data-unpublish="${d.id}">Unpublish</button><button type="button" class="btn btn-primary" data-save="${d.id}"${dis}${dirty ? "" : " disabled"}>Save changes</button>`;
    else buttons = `${dirty ? `<button type="button" class="btn btn-ghost" data-discard="${d.id}">Discard</button>` : ""}<button type="button" class="btn btn-outline" data-save="${d.id}"${dirty ? "" : " disabled"}>Save draft</button><button type="button" class="btn btn-primary" data-publish="${d.id}"${dis}>Publish banner</button>`;
    return `${problem && (dirty || isNew) ? `<p class="fld-problem">${icon("alert")}${problem}</p>` : ""}<div class="ed-foot">${deleteBtn}${left}<span class="grow"></span>${buttons}</div>`;
  }

  function historyHtml(b) {
    if (!b || !b.history?.length) return "";
    return `<details class="hist"><summary>Changes<span>${b.history.length}</span></summary><ul>${b.history.slice(0, 6).map((h) => `<li><span>${esc(h.what)}</span><span class="hist-who">${esc(h.by)}, ${editFormatter.format(new Date(h.at))}</span></li>`).join("")}</ul></details>`;
  }

  function draftAsBanner(d) {
    const out = { ...d, status: "published" };
    if (d.type === "live") out.sessions = mergedOverrides();
    return out;
  }

  function previewHtml(d, b) {
    const n = now(); const hcfg = lab.hcfg();
    const draft = draftAsBanner(d);
    const key = d.id === "new" ? "new" : d.id; const st = state.status[key];
    const dirty = d.id === "new" ? false : (isDirtyBanner(d.id) || (d.type === "live" && (dirtySessionDates().length > 0 || (state.quick !== null))));
    let view = resolveBanner(draft, n);
    let chip, note;
    const sessionFailed = d.type === "live" && Object.entries(state.status).some(([k, v]) => (k.startsWith("s:") || k === "quick") && v.kind === "failed");
    const failed = st?.kind === "failed" || sessionFailed;
    if (failed) { chip = ["failed", "Not saved"]; note = "Your change did not save. This is what users still see."; view = b ? resolveBanner(b, n) : null; }
    else if (d.id === "new") { chip = ["muted", "Not published"]; note = `Nobody sees it yet. Publish puts it first in line for ${AUDIENCE_LABEL[d.audience].toLowerCase()}.`; }
    else if (dirty) { chip = ["unsaved", "Unsaved preview"]; note = "Users see the saved version until you save."; }
    else {
      const stt = adminStatus(b, n, banners());
      if (stt.kind === "draft") { chip = ["muted", "Draft"]; note = "Nobody sees it. Publish puts it first in line."; }
      else { chip = [stt.kind === "now" ? "live" : stt.kind, stt.label]; note = whoLine(b, stt, n); }
    }
    if (d.type !== "live" && (dirty || d.id === "new")) {
      const ph = phaseOf(draft, n); const w = windowOf(draft);
      if (ph === "before" && w.from) note += ` It shows from ${fmt(w.from).date}.`;
      if (ph === "after") note += " Its window has ended, so nobody would see it.";
    }
    const empty = `<div class="bn-none">Nothing to show.</div>`;
    let body, seg = "";
    if (cfg.preview === "widths") {
      seg = `<span class="pseg" role="group" aria-label="Preview width"><button type="button" class="${state.pvWidth === "desktop" ? "is-active" : ""}" data-pv-width="desktop">Desktop</button><button type="button" class="${state.pvWidth === "phone" ? "is-active" : ""}" data-pv-width="phone">Phone</button></span>`;
      const w = state.pvWidth === "desktop" ? 1116 : 358;
      body = `<div class="pv-fit" data-pv-fit><div class="pv-in" style="width:${w}px">${view ? renderBanner(view, hcfg, { inert: true }) : empty}</div></div>`;
    } else if (cfg.preview === "slot") {
      seg = `<span class="pseg" role="group" aria-label="Audience"><button type="button" class="${state.pvAud === "free" ? "is-active" : ""}" data-pv-aud="free">Free</button><button type="button" class="${state.pvAud === "pro" ? "is-active" : ""}" data-pv-aud="pro">Pro</button></span>`;
      const aud = state.pvAud;
      const list = banners().filter((x) => x.id !== d.id);
      const withDraft = failed ? banners() : (d.id === "new" ? [draft, ...list] : (() => { const l = banners().slice(); const i = l.findIndex((x) => x.id === d.id); l[i] = draft; return l; })());
      const q = eligible(withDraft, n, aud).map((x) => resolveBanner(x, n)).filter(Boolean);
      const mineIndex = q.findIndex((v) => v.id === d.id);
      const name = AUDIENCES[aud].name;
      let line;
      if (!forAudience(draft, aud)) line = `${name} users do not see this banner. Its audience is ${AUDIENCE_LABEL[draft.audience]}.`;
      else if (d.id !== "new" && b?.status !== "published" && !dirty) line = `${name} users do not see it while it is a draft.`;
      else if (mineIndex === 0) line = `First in line for ${name} users${d.id === "new" || dirty ? " once saved" : ""}.`;
      else if (mineIndex > 0) line = `${ordinal(mineIndex + 1)} in line for ${name} users, after ${q.slice(0, mineIndex).map((v) => esc(v.title)).join(" and ")}.`;
      else line = `Not in line for ${name} users right now${phaseOf(draft, n) === "before" ? `. It shows from ${fmt(windowOf(draft).from).date}` : ""}.`;
      body = `<p class="pv-slotline">${line}</p><div class="pv-label">Home for ${name} users</div><div class="pv-home">${q[0] ? renderBanner(q[0], hcfg, { inert: true }) : `<div class="bn-none">No banner for ${name} users right now.</div>`}</div>${mineIndex > 0 && view ? `<div class="pv-label">This banner, after a dismiss</div><div class="pv-home is-dim">${renderBanner(view, hcfg, { inert: true })}</div>` : mineIndex < 0 && view ? `<div class="pv-label">This banner</div><div class="pv-home is-dim">${renderBanner(view, hcfg, { inert: true })}</div>` : ""}`;
    } else {
      body = `<div class="pv-home">${view ? renderBanner(view, hcfg, { inert: true }) : empty}</div>`;
    }
    return `<div class="pv" data-pv-state="${chip[0]}" data-pv-for="${d.id}"><div class="pv-head"><span class="chip chip-${chip[0]}">${chip[1]}</span><span class="pv-note">${note}</span>${seg}</div>${body}</div>`;
  }

  function editorHtml(id) {
    const isNew = id === "new";
    const b = isNew ? null : store().byId(id);
    if (!isNew && !b) return "";
    if (!state.drafts[id]) state.drafts[id] = clone(b);
    const d = state.drafts[id];
    const st = isNew ? { kind: "draft", label: "Draft" } : adminStatus(b, now(), banners());
    const t = TYPES[d.type];
    const closeBtn = cfg.layout === "master" ? "" : cfg.editor === "page"
      ? ""
      : `<button type="button" class="btn btn-ghost btn-icon ed-close" data-editor-close aria-label="Close the editor">${icon("x")}</button>`;
    const head = `<div class="ed-head"><div class="ed-head-text"><p class="ed-kicker">${isNew ? "New banner" : "Edit banner"}</p><h2 class="ed-title">${isNew ? `New ${t.name.toLowerCase()}` : esc(bannerTitle(b))}</h2><p class="ed-sub">${isNew ? t.what : `${t.name} · ${whoLine(b, st, now())}${editedLine(b) ? ` · ${esc(editedLine(b))}` : ""}`}</p></div>${statusBadge(st)}${closeBtn}</div>`;
    const preview = previewHtml(d, b);
    const form = `<div class="ed-form">${fieldsHtml(d)}</div>`;
    const foot = footerHtml(d, b, isNew);
    const hist = historyHtml(b);
    const beside = cfg.preview === "beside";
    return `<div class="editor${beside ? " has-beside" : ""}" data-editor="${id}">${head}<div class="ed-body"><div class="ed-main">${beside ? "" : preview}${form}${foot}${hist}</div>${beside ? `<aside class="ed-side">${preview}</aside>` : ""}</div></div>`;
  }

  /* ----- live training sessions editor ----- */
  function sessionBadge(s) {
    if (s.past) return `<span class="badge badge-ended">Past</span>`;
    if (s.live) return `<span class="badge badge-livenow"><i class="dot"></i>Live now</span>`;
    if (s.skipped) return `<span class="badge badge-skip">Skipped</span>`;
    if (s.isNext) return `<span class="badge badge-now"><i class="dot"></i>On Home now</span>`;
    if (s.movedTo) return `<span class="badge badge-moved">Moved</span>`;
    return `<span class="badge badge-up">Upcoming</span>`;
  }
  function sessionLine(s) {
    const bits = [];
    if (s.skipped && !s.past) bits.push(s.fallback ? `Home shows ${fmt(s.fallback.startsAt).short} instead.` : "No later session to show.");
    if (s.movedTo && !s.past) bits.push(`Was ${fmt(s.scheduledAt).date}.`);
    if (!s.skipped && !s.past && !s.isNext) bits.push(`On Home after the ${s.showsAfter ? fmt(s.showsAfter.startsAt).short : "current"} session.`);
    return bits.join(" ");
  }
  function sessionControls(s) {
    const key = `s:${s.date}`; const st = state.status[key]; const dirty = sessionDirty(s.date);
    if (st) return `<div class="save-row">${receipt(key, { retry: st.kind === "failed" ? `data-ssave="${s.date}"` : null })}${st.kind === "failed" ? `<button type="button" class="btn btn-ghost" data-scancel="${s.date}">Discard</button>` : ""}</div>`;
    if (dirty) return `<div class="save-row"><span class="chip chip-unsaved">Unsaved</span><button type="button" class="btn btn-primary" data-ssave="${s.date}">Save</button><button type="button" class="btn btn-outline" data-scancel="${s.date}">Cancel</button></div>`;
    return "";
  }
  function sessionTopic(s, big) {
    const value = (state.sdrafts[s.date]?.topic ?? savedOverrides()[s.date]?.topic) || "";
    if (s.past) return `<div class="topic-ro is-past">${esc(s.topic || "No topic. Users saw the default title.")}</div>`;
    const count = value.length >= 60 ? `<span class="count">${value.length}/${HEADLINE_MAX}</span>` : "";
    return `<div class="fld-wrap${big ? " is-big" : ""}"><input id="${uid}-topic-${s.date}" class="in" type="text" maxlength="${HEADLINE_MAX}" data-stopic="${s.date}" value="${esc(value)}" placeholder="${esc(DEFAULT_TITLE)}" aria-label="Topic for ${fmt(s.startsAt).date}"${s.skipped ? " disabled" : ""}>${count}</div>`;
  }
  function sessionActions(s) {
    if (s.past) return "";
    const d = state.sdrafts[s.date] || savedOverrides()[s.date] || {};
    const skip = `<label class="sw-label"><span class="sw" role="switch" aria-checked="${!!d.skipped}" tabindex="0" data-sskip="${s.date}"><i></i></span><span>Skip this session</span></label>`;
    let move = "";
    if (!d.skipped) move = d.movedTo
      ? `<button type="button" class="btn btn-ghost" data-smove="${s.date}">${icon("calendar")}Move again</button><button type="button" class="btn btn-ghost" data-sputback="${s.date}">${icon("undo")}Put back</button>`
      : `<button type="button" class="btn btn-ghost" data-smove="${s.date}">${icon("calendar")}Move session</button>`;
    return `<div class="actions">${skip}${move}</div>`;
  }
  function moveFormHtml(s) {
    if (state.moveInline !== s.date) return "";
    const form = state.moveForm || wallParts(s.startsAt);
    const target = form.date && form.time ? pacificInstant(`${form.date}T${form.time}`) : null;
    return `<div class="move-form" data-move-form="${s.date}"><div class="move-fields"><input class="in in-date" type="date" value="${form.date}" min="${pacificDay(now())}" data-move-date="${s.date}" aria-label="New date"><input class="in in-time" type="time" value="${form.time}" data-move-time="${s.date}" aria-label="New time"></div><p class="move-result">${target ? `Users will see ${fmt(target).date} · ${fmt(target).time}` : ""}</p><div class="move-buttons"><button type="button" class="btn btn-primary" data-move-apply="${s.date}">Move session</button><button type="button" class="btn btn-outline" data-move-cancel="${s.date}">Cancel</button></div></div>`;
  }
  function sessionRow(s) {
    const dirty = sessionDirty(s.date); const failed = state.status[`s:${s.date}`]?.kind === "failed";
    return `<tr class="tr tr-session${dirty ? " is-dirty" : ""}${failed ? " is-failed" : ""}${s.past ? " is-past" : ""}" data-srow="${s.date}">
      <td class="td-date"><div class="dcell"><b>${fmt(s.startsAt).date}</b><span>${fmt(s.startsAt).clock}${s.movedTo ? " · moved" : ""}</span></div></td>
      <td class="td-topic">${sessionTopic(s)}<p class="ed-line">${sessionLine(s)}</p>${moveFormHtml(s)}</td>
      <td class="td-status">${sessionBadge(s)}</td>
      <td class="td-actions">${sessionActions(s)}${sessionControls(s)}</td>
    </tr>`;
  }
  function sessionTable(list) {
    return `<div class="tbl-wrap"><table class="tbl tbl-sessions"><thead><tr><th class="td-date">Date</th><th class="td-topic">Topic</th><th class="td-status">Status</th><th class="td-actions"><span class="sr">Actions</span></th></tr></thead><tbody>${list.map(sessionRow).join("")}</tbody></table></div>`;
  }
  function sessionCard(s, heading) {
    const dirty = sessionDirty(s.date); const failed = state.status[`s:${s.date}`]?.kind === "failed";
    return `<section class="ed sess-card${dirty ? " is-dirty" : ""}${failed ? " is-failed" : ""}" data-srow="${s.date}" aria-label="${fmt(s.startsAt).date}">
      <p class="ed-heading">${heading}</p>
      <div class="ed-top"><div class="dtile${s.skipped ? " is-skipped" : ""}" aria-hidden="true"><b>${fmt(s.startsAt).month}</b><strong>${fmt(s.startsAt).day}</strong></div><div class="ed-when"><b>${fmt(s.startsAt).long}</b><span>${fmt(s.startsAt).time} · ${RULE.durationMinutes} min${s.movedTo ? ` · was ${fmt(s.scheduledAt).date}` : ""}</span></div><div class="ed-status">${sessionBadge(s)}</div></div>
      <label class="fld-label" for="${uid}-topic-${s.date}">Topic</label>${sessionTopic(s, true)}
      <p class="ed-line">${sessionLine(s)}</p>
      <div class="ed-foot">${sessionActions(s)}${sessionControls(s)}</div>${moveFormHtml(s)}
    </section>`;
  }
  function savedSlots(count) { return savedSessions().list.filter((s) => !s.past && !s.skipped).slice(0, count).map((s) => s.date); }
  function sessionsEditor() {
    const { list } = liveSessions();
    const upcoming = list.filter((s) => !s.past);
    if (cfg.sessions === "table") return `<div class="sess"><p class="fld-label">Sessions<span class="fld-note">Every other Thursday at 11:00 AM Pacific, 60 minutes. Set a topic, skip a holiday or move one session.</span></p>${sessionTable(list)}</div>`;
    const n = cfg.sessions === "next" ? 1 : 2;
    const slotDates = savedSlots(n);
    const slots = slotDates.map((d) => upcoming.find((s) => s.date === d)).filter(Boolean);
    const rest = upcoming.filter((s) => !slots.includes(s));
    return `<div class="sess"><div class="sess-slots${n === 2 ? " is-two" : ""}">${slots.map((s, i) => sessionCard(s, i === 0 ? "Next session" : "After that")).join("")}</div><p class="fld-label">Later sessions</p>${sessionTable(rest)}</div>`;
  }

  /* ----- layouts ----- */
  function introHtml() {
    return `<p class="intro">Users see one banner at the top of Home, the first in this order that is published, inside its dates and meant for their plan. Dismissing it reveals the next one, so 2nd in line means after one dismiss.</p>`;
  }
  function pageReceipt() {
    const st = state.status.page || state.status.order;
    if (!st) return "";
    const key = state.status.page ? "page" : "order";
    return `<div class="page-receipt" data-page-receipt="${key}">${receipt(key)}</div>`;
  }
  function rowCore(r) {
    const { b, st } = r;
    return `<b class="row-title">${esc(bannerTitle(b))}</b><p class="row-who">${esc(r.who)}</p>`;
  }
  function tableRow(r, group) {
    const { b, st } = r;
    const open = state.open === b.id && cfg.editor === "inline";
    return `<tr class="tr tr-banner${open ? " is-open" : ""}${st.kind === "draft" ? " is-draft" : ""}${st.kind === "ended" ? " is-past" : ""}${state.drag?.id === b.id ? " is-dragging" : ""}" data-row="${b.id}" data-group="${group}">
      <td class="td-order">${orderControl(r, group)}</td>
      <td class="td-type">${typeCell(b)}</td>
      <td class="td-banner">${rowCore(r)}<p class="row-edited">${esc(r.edited)}</p>${b.type === "live" ? quickHtml() : ""}</td>
      <td class="td-aud" data-when="${esc(r.when)}">${AUDIENCE_LABEL[b.audience]}</td>
      <td class="td-when">${esc(r.when)}</td>
      <td class="td-status">${statusBadge(st)}${rowReceipt(b.id) ? `<div class="row-rc">${rowReceipt(b.id)}</div>` : ""}</td>
      <td class="td-actions"><div class="actions">${firstAction(r, group)}${editButton(r)}${rowMenu(r)}</div></td>
    </tr>${open ? `<tr class="tr-editor"><td colspan="7">${editorHtml(b.id)}</td></tr>` : ""}`;
  }
  function newInline() {
    if (state.open !== "new" || cfg.editor !== "inline" || cfg.layout === "master") return "";
    return `<div class="new-inline">${editorHtml("new")}</div>`;
  }
  function tableLayout() {
    const g = groups();
    const body = GROUPS.map(([key, label]) => g[key].length ? `<tr class="tr-group" data-group-head="${key}"><td colspan="7"><span>${label}</span><span class="muted">${g[key].length}</span></td></tr>${g[key].map((r) => tableRow(r, key)).join("")}` : "").join("");
    return `${newInline()}<div class="tbl-wrap"><table class="tbl tbl-banners"><thead><tr><th class="td-order"><span class="sr">Order</span></th><th class="td-type">Type</th><th class="td-banner">Banner</th><th class="td-aud">Audience</th><th class="td-when">When</th><th class="td-status">Status</th><th class="td-actions"><span class="sr">Actions</span></th></tr></thead><tbody>${body}</tbody></table></div>`;
  }
  function heroHtml() {
    const n = now(); const hcfg = lab.hcfg(); const list = banners();
    return `<div class="hero">${Object.keys(AUDIENCES).map((a) => {
      const q = eligible(list, n, a).map((b) => resolveBanner(b, n)).filter(Boolean);
      const rest = q.slice(1);
      const sched = list.filter((b) => b.status === "published" && forAudience(b, a) && phaseOf(b, n) === "before").sort((x, y) => windowOf(x).from - windowOf(y).from);
      return `<section class="hero-slot" data-aud="${a}"><p class="hero-head"><b>${AUDIENCES[a].name} users see</b><span>${fmt(n).date}, ${fmt(n).clock} Pacific</span></p><div class="hero-home">${q[0] ? renderBanner(q[0], hcfg, { inert: true }) : `<div class="bn-none">No banner right now.</div>`}</div>${rest.length ? `<p class="hero-next"><b>After a dismiss</b><span>${rest.map((v) => esc(v.title)).join(" · ")}</span></p>` : `<p class="hero-next"><b>After a dismiss</b><span>Nothing. The slot collapses.</span></p>`}${sched.length ? `<p class="hero-next"><b>Scheduled</b><span>${sched.map((b) => `${esc(bannerTitle(b))} from ${fmt(windowOf(b).from).short}`).join(" · ")}</span></p>` : ""}</section>`;
    }).join("")}</div>`;
  }
  function boardCard(r, group) {
    const { b, st } = r;
    return `<article class="bcard${st.kind === "draft" ? " is-draft" : ""}${state.drag?.id === b.id ? " is-dragging" : ""}" data-row="${b.id}" data-group="${group}">
      <div class="bcard-top">${orderControl(r, group)}${typeCell(b)}<span class="grow"></span>${statusBadge(st)}</div>
      ${rowCore(r)}<p class="row-meta">${AUDIENCE_LABEL[b.audience]} · ${esc(r.when)}</p>
      ${b.type === "live" ? quickHtml() : ""}
      <p class="row-edited">${esc(r.edited)}</p>
      <div class="actions">${firstAction(r, group)}${editButton(r)}${rowMenu(r)}</div>${rowReceipt(b.id) ? `<div class="row-rc">${rowReceipt(b.id)}</div>` : ""}
    </article>`;
  }
  function boardLayout() {
    const g = groups();
    return `${newInline()}<div class="board">${GROUPS.map(([key, label]) => `<section class="col" data-col="${key}"><h3 class="col-head">${label}<span>${g[key].length}</span></h3><div class="col-cards">${g[key].map((r) => boardCard(r, key)).join("") || `<p class="col-empty">Nothing here.</p>`}</div></section>`).join("")}</div>`;
  }
  function stackRow(r, group) {
    const { b, st } = r;
    const view = resolveBanner({ ...b, status: "published" }, now());
    const open = state.open === b.id && cfg.editor === "inline";
    return `<div class="sk-row${st.kind === "draft" || st.kind === "ended" ? " is-dim" : ""}${open ? " is-open" : ""}${state.drag?.id === b.id ? " is-dragging" : ""}" data-row="${b.id}" data-group="${group}">
      <div class="sk-rail">${orderControl(r, group)}${typeCell(b)}${statusBadge(st)}<span class="sk-who">${esc(r.who)}</span><span class="grow"></span>${firstAction(r, group)}${editButton(r)}${rowMenu(r)}</div>
      <div class="sk-banner">${view ? renderBanner(view, lab.hcfg(), { inert: true }) : `<div class="bn-none">Nothing to show.</div>`}</div>
      <div class="sk-foot"><span>${AUDIENCE_LABEL[b.audience]} · ${esc(r.when)}</span><span>${esc(r.edited)}</span>${rowReceipt(b.id)}</div>
      ${b.type === "live" ? quickHtml() : ""}
      ${open ? editorHtml(b.id) : ""}
    </div>`;
  }
  function stackLayout() {
    const g = groups();
    return `${newInline()}${GROUPS.map(([key, label]) => g[key].length ? `<section class="sk-group" data-col="${key}"><h3 class="h3">${label}<span>${g[key].length}</span></h3>${g[key].map((r) => stackRow(r, key)).join("")}</section>` : "").join("")}`;
  }
  function ensureSelected() {
    if (state.selected === "new" && state.drafts.new) return;
    if (state.selected && store().byId(state.selected)) return;
    const live = liveBanner();
    state.selected = live ? live.id : (banners()[0]?.id || null);
  }
  function masterLayout() {
    ensureSelected();
    const g = groups();
    const sel = state.selected;
    const rowsHtml = GROUPS.map(([key, label]) => g[key].length ? `<div class="ml-group">${label}<span>${g[key].length}</span></div>${g[key].map((r) => {
      const { b, st } = r; const isSel = sel === b.id;
      return `<div class="ml-row${isSel ? " is-selected" : ""}${st.kind === "draft" || st.kind === "ended" ? " is-dim" : ""}" role="button" tabindex="0" data-select="${b.id}" data-row="${b.id}" data-group="${key}" aria-pressed="${isSel}">
        ${orderControl(r, key)}<span class="ml-type">${icon(TYPES[b.type].icon)}</span><span class="ml-main"><b>${esc(bannerTitle(b))}</b><span class="ml-who">${esc(r.who)}</span>${isDirtyBanner(b.id) ? '<span class="chip chip-unsaved">Unsaved</span>' : ""}</span><span class="ml-status">${statusBadge(st)}${firstAction(r, key)}</span>
      </div>${phone && isSel ? `<div class="ml-inline">${editorHtml(b.id)}</div>` : ""}`;
    }).join("")}` : "").join("");
    const newRow = state.drafts.new ? `<div class="ml-row is-selected is-new" data-select="new" role="button" tabindex="0" aria-pressed="true"><span class="ml-type">${icon(TYPES[state.drafts.new.type].icon)}</span><span class="ml-main"><b>New ${TYPES[state.drafts.new.type].name.toLowerCase()}</b><span class="ml-who">Not saved yet.</span></span></div>${phone ? `<div class="ml-inline">${editorHtml("new")}</div>` : ""}` : "";
    return `<div class="master"><div class="ml">${newRow}${rowsHtml}</div>${phone ? "" : `<div class="md">${sel ? editorHtml(sel) : ""}</div>`}</div>`;
  }

  function overlays() {
    const out = [];
    const wrap = (inner, kind) => {
      if (phone) return `<div class="dlg-layer"><div class="dlg-backdrop" data-overlay-close></div><div class="dlg is-sheet" role="dialog" aria-modal="true"><div class="dlg-handle"></div>${inner}</div></div>`;
      if (kind === "sheet") return `<div class="dlg-layer"><div class="dlg-backdrop" data-overlay-close></div><div class="sheet" role="dialog" aria-modal="true">${inner}</div></div>`;
      return `<div class="dlg-layer"><div class="dlg-backdrop" data-overlay-close></div><div class="dlg${kind === "wide" ? " is-wide" : ""}" role="dialog" aria-modal="true">${inner}</div></div>`;
    };
    if (state.open && cfg.layout !== "master" && (cfg.editor === "sheet" || cfg.editor === "dialog")) out.push(wrap(editorHtml(state.open), cfg.editor === "sheet" ? "sheet" : "wide"));
    if (state.create === "picker") out.push(wrap(pickerHtml(), "wide"));
    if (state.confirm) {
      const c = state.confirm;
      const b = c.id && c.id !== "new" ? store().byId(c.id) : null;
      const inner = c.kind === "delete"
        ? `<h2 class="dlg-title">Delete ${esc(bannerTitle(b))}?</h2><p class="dlg-text">${b.status === "published" ? "Users stop seeing it right away. " : ""}This cannot be undone.</p><div class="dlg-foot"><button type="button" class="btn btn-outline" data-confirm-no>Keep it</button><button type="button" class="btn btn-danger" data-confirm-yes>Delete banner</button></div>`
        : `<h2 class="dlg-title">Discard unsaved changes?</h2><p class="dlg-text">${c.id === "new" ? "This new banner has not been saved." : "Users keep seeing the saved version."}</p><div class="dlg-foot"><button type="button" class="btn btn-outline" data-confirm-no>Keep editing</button><button type="button" class="btn btn-danger" data-confirm-yes>Discard changes</button></div>`;
      out.push(wrap(inner, "dialog"));
    }
    return out.join("");
  }

  function pageHtml() {
    let body;
    if (cfg.editor === "page" && state.open && cfg.layout !== "master") {
      body = `<a class="back" href="#" data-editor-close>${icon("arrow-left")}Banners</a>${editorHtml(state.open)}`;
    } else {
      const layouts = { table: tableLayout, hero: () => heroHtml() + tableLayout(), board: boardLayout, stack: stackLayout, master: masterLayout };
      body = `${introHtml()}${pageReceipt()}${templatesRow()}${layouts[cfg.layout]()}`;
    }
    const shell = phone ? adminShellPhone(body, createControl()) : adminShellDesktop(body, createControl());
    return shell + overlays();
  }

  /* ----- render with focus and scroll kept ----- */
  function render() {
    const scroller = root.querySelector("[data-scroll]");
    const scrollTop = scroller ? scroller.scrollTop : 0;
    const sheet = root.querySelector(".sheet, .dlg, .md");
    const sheetTop = sheet ? sheet.scrollTop : 0;
    const active = document.activeElement;
    let focusSel = null, range = null;
    if (active && root.contains(active)) {
      const keys = ["field", "quickTopic", "stopic", "moveDate", "moveTime", "handle", "switch", "sskip"];
      for (const k of keys) if (active.dataset[k] !== undefined) { focusSel = `[data-${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}="${active.dataset[k]}"]`; break; }
      if (focusSel && active.matches("input") && active.type === "text") range = [active.selectionStart, active.selectionEnd];
    }
    root.innerHTML = pageHtml();
    const next = root.querySelector("[data-scroll]"); if (next) next.scrollTop = scrollTop;
    const nextSheet = root.querySelector(".sheet, .dlg, .md"); if (nextSheet) nextSheet.scrollTop = sheetTop;
    if (focusSel) {
      const el = root.querySelector(focusSel);
      if (el) { el.focus({ preventScroll: true }); if (range) { try { el.setSelectionRange(range[0], range[1]); } catch {} } }
    }
    fitPreviews();
  }
  function fitPreviews() {
    for (const fit of root.querySelectorAll("[data-pv-fit]")) {
      const inner = fit.firstElementChild; const w = inner.offsetWidth; const avail = fit.clientWidth || w;
      const s = Math.min(1, avail / w);
      inner.style.transform = `scale(${s})`;
      fit.style.height = `${Math.ceil(inner.offsetHeight * s)}px`;
    }
  }
  function focusFirstField() {
    const el = root.querySelector(`[data-editor="new"] [data-field]`);
    if (el) el.focus({ preventScroll: true });
  }

  function openEditor(id) {
    if (!state.drafts[id]) state.drafts[id] = clone(store().byId(id));
    state.open = id; state.selected = id; state.menu = null; state.create = null;
    render();
  }
  function requestClose() {
    const id = state.open;
    if (!id) return;
    const dirty = id === "new" ? true : (isDirtyBanner(id) || (state.drafts[id]?.type === "live" && dirtySessionDates().length > 0));
    if (dirty && !(state.status[id]?.kind === "saving")) { state.confirm = { kind: "discard", id }; render(); return; }
    closeEditor();
  }
  function closeEditor() {
    const id = state.open;
    if (id === "new") { delete state.drafts.new; if (state.selected === "new") state.selected = null; }
    else if (id) { state.drafts[id] = null; state.sdrafts = {}; state.moveInline = null; }
    state.open = null; state.confirm = null;
    render();
  }

  /* ----- events ----- */
  root.addEventListener("input", (e) => {
    const t = e.target;
    if (t.matches("[data-quick-topic]")) { state.quick = t.value; delete state.status.quick; return render(); }
    if (t.matches("[data-stopic]")) { const d = sdraft(t.dataset.stopic); d.topic = t.value.trim() ? t.value.slice(0, HEADLINE_MAX) : null; delete state.status[`s:${t.dataset.stopic}`]; return render(); }
    if (t.matches("[data-field]")) {
      const ed = t.closest("[data-editor]"); const d = state.drafts[ed.dataset.editor]; if (!d) return;
      d[t.dataset.field] = t.type === "number" ? Number(t.value) : t.value;
      delete state.status[ed.dataset.editor];
      return render();
    }
  });
  root.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches("select[data-field], input[type=datetime-local][data-field]")) {
      const ed = t.closest("[data-editor]"); const d = state.drafts[ed.dataset.editor]; if (!d) return;
      d[t.dataset.field] = t.dataset.field === "duration" || t.dataset.field === "leadDays" ? Number(t.value) : t.value;
      delete state.status[ed.dataset.editor];
      return render();
    }
    if (t.matches("[data-move-date], [data-move-time]")) {
      const wrap = t.closest("[data-move-form]");
      state.moveForm = { date: wrap.querySelector("[data-move-date]").value, time: wrap.querySelector("[data-move-time]").value };
      return render();
    }
  });
  root.addEventListener("keydown", (e) => {
    const t = e.target;
    if (e.key === "Escape") {
      if (state.confirm) { state.confirm = null; return render(); }
      if (state.menu || state.create) { state.menu = null; state.create = null; return render(); }
      if (state.moveInline) { state.moveInline = null; return render(); }
      if (state.open && cfg.layout !== "master" && cfg.editor !== "inline") return requestClose();
      return;
    }
    if (e.key === "Enter" && t.matches("[data-quick-topic]")) { e.preventDefault(); if (state.quick !== null) saveQuick(); return; }
    if (e.key === "Enter" && t.matches("[data-stopic]")) { e.preventDefault(); if (sessionDirty(t.dataset.stopic)) saveSession(t.dataset.stopic); return; }
    if ((e.key === " " || e.key === "Enter") && t.matches("[data-switch], [data-sskip], [data-select]")) { e.preventDefault(); t.click(); return; }
    if (t.matches("[data-handle]") && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); moveWithin(t.dataset.handle, e.key === "ArrowUp" ? -1 : 1); return; }
  });

  // Drag to reorder, pointer based so it works with touch.
  root.addEventListener("pointerdown", (e) => {
    const h = e.target.closest("[data-handle]"); if (!h) return;
    e.preventDefault();
    state.drag = { id: h.dataset.handle, group: h.dataset.group, target: null, before: true };
    try { h.setPointerCapture(e.pointerId); } catch {}
    root.classList.add("is-dragging");
  });
  root.addEventListener("pointermove", (e) => {
    if (!state.drag) return;
    const rowsEls = [...root.querySelectorAll(`[data-row][data-group="${state.drag.group}"]`)].filter((el) => el.dataset.row !== state.drag.id);
    let best = null;
    for (const el of rowsEls) {
      const r = el.getBoundingClientRect(); const mid = r.top + r.height / 2; const dist = Math.abs(e.clientY - mid);
      if (!best || dist < best.dist) best = { el, dist, before: e.clientY < mid };
    }
    root.querySelectorAll(".is-drop-before, .is-drop-after").forEach((el) => el.classList.remove("is-drop-before", "is-drop-after"));
    if (best) { best.el.classList.add(best.before ? "is-drop-before" : "is-drop-after"); state.drag.target = best.el.dataset.row; state.drag.before = best.before; }
  });
  root.addEventListener("pointerup", (e) => {
    if (!state.drag) return;
    const { id, target, before } = state.drag;
    state.drag = null; root.classList.remove("is-dragging");
    root.querySelectorAll(".is-drop-before, .is-drop-after").forEach((el) => el.classList.remove("is-drop-before", "is-drop-after"));
    if (target && target !== id) reorder(id, before ? { before: target } : { after: target });
    else render();
  });
  root.addEventListener("pointercancel", () => { if (state.drag) { state.drag = null; root.classList.remove("is-dragging"); render(); } });

  root.addEventListener("click", (e) => {
    const a = (sel) => e.target.closest(sel);
    let el;
    if (e.target.closest("a.bn-cta, a.back")) e.preventDefault();
    if ((el = a("[data-create-open]"))) { state.create = "picker"; state.menu = null; return render(); }
    if ((el = a("[data-create-close]"))) { state.create = null; return render(); }
    if ((el = a("[data-create-menu]"))) { state.create = state.create === "menu" ? null : "menu"; state.menu = null; return render(); }
    if ((el = a("[data-new]"))) return startNew(el.dataset.new);
    if ((el = a("[data-quick-save]"))) return saveQuick();
    if ((el = a("[data-quick-cancel]"))) { state.quick = null; delete state.status.quick; return render(); }
    if ((el = a("[data-edit]"))) { const id = el.dataset.edit; if (state.open === id && cfg.editor === "inline") { return requestClose(); } return openEditor(id); }
    if ((el = a("[data-editor-close]"))) { e.preventDefault(); return requestClose(); }
    if ((el = a("[data-overlay-close]"))) { if (state.confirm) { state.confirm = null; return render(); } if (state.create === "picker") { state.create = null; return render(); } return requestClose(); }
    if ((el = a("[data-confirm-no]"))) { state.confirm = null; return render(); }
    if ((el = a("[data-confirm-yes]"))) { const c = state.confirm; state.confirm = null; if (c.kind === "delete") return deleteBanner(c.id); return closeEditor(); }
    if ((el = a("[data-save-draft]"))) return saveNew(false);
    if ((el = a("[data-publish-new]"))) return saveNew(true);
    if ((el = a("[data-save]"))) return saveBanner(el.dataset.save);
    if ((el = a("[data-discard]"))) { state.drafts[el.dataset.discard] = null; delete state.status[el.dataset.discard]; return render(); }
    if ((el = a("[data-publish]"))) { const id = el.dataset.publish; state.menu = null; if (state.drafts[id] && isDirtyBanner(id)) return saveBanner(id, { publish: true }); return setPublished(id, true); }
    if ((el = a("[data-unpublish]"))) { const id = el.dataset.unpublish; state.menu = null; if (state.drafts[id] && isDirtyBanner(id)) return saveBanner(id, { publish: false }); return setPublished(id, false); }
    if ((el = a("[data-delete]"))) { state.menu = null; state.confirm = { kind: "delete", id: el.dataset.delete }; return render(); }
    if ((el = a("[data-menu]"))) { state.menu = state.menu === el.dataset.menu ? null : el.dataset.menu; state.create = null; return render(); }
    if ((el = a("[data-move-up]"))) return moveWithin(el.dataset.moveUp, -1);
    if ((el = a("[data-move-down]"))) return moveWithin(el.dataset.moveDown, 1);
    if ((el = a("[data-move-first]"))) return reorder(el.dataset.moveFirst, { first: true });
    if ((el = a("[data-pv-width]"))) { state.pvWidth = el.dataset.pvWidth; return render(); }
    if ((el = a("[data-pv-aud]"))) { state.pvAud = el.dataset.pvAud; return render(); }
    if ((el = a("[data-switch]"))) { const ed = el.closest("[data-editor]"); const d = state.drafts[ed.dataset.editor]; d[el.dataset.switch] = d[el.dataset.switch] === false; delete state.status[ed.dataset.editor]; return render(); }
    if ((el = a("[data-sskip]"))) { const d = sdraft(el.dataset.sskip); d.skipped = !d.skipped; delete state.status[`s:${el.dataset.sskip}`]; return render(); }
    if ((el = a("[data-ssave]"))) return saveSession(el.dataset.ssave);
    if ((el = a("[data-scancel]"))) { delete state.sdrafts[el.dataset.scancel]; delete state.status[`s:${el.dataset.scancel}`]; if (state.moveInline === el.dataset.scancel) state.moveInline = null; return render(); }
    if ((el = a("[data-smove]"))) { const s = liveSessions().list.find((x) => x.date === el.dataset.smove); state.moveInline = s.date; state.moveForm = wallParts(s.startsAt); return render(); }
    if ((el = a("[data-sputback]"))) { sdraft(el.dataset.sputback).movedTo = null; return render(); }
    if ((el = a("[data-move-apply]"))) { const f = state.moveForm; const date = el.dataset.moveApply; if (f?.date && f?.time) { const wall = `${f.date}T${f.time}`; sdraft(date).movedTo = wall === `${date}T${RULE.startTime}` ? null : wall; } state.moveInline = null; return render(); }
    if ((el = a("[data-move-cancel]"))) { state.moveInline = null; return render(); }
    if ((el = a("[data-select]")) && !a("button, input, select, label, .handle, .updown")) { const id = el.dataset.select; state.selected = id; state.open = id; state.menu = null; if (id !== "new" && !state.drafts[id]) state.drafts[id] = clone(store().byId(id)); return render(); }
    if (state.menu && !a(".menu-wrap")) { state.menu = null; render(); }
    if (state.create === "menu" && !a(".menu-wrap")) { state.create = null; render(); }
  });

  render();

  return {
    state, render,
    setConfig(next) {
      const changed = next.layout !== cfg.layout || next.editor !== cfg.editor;
      cfg = { ...next }; state.menu = null; state.create = null; state.confirm = null; state.moveInline = null;
      if (cfg.layout === "master") { ensureSelected(); state.open = state.selected; }
      else if (changed) { state.open = null; delete state.drafts.new; }
      render();
    },
    reset() { for (const t of Object.values(state.timers)) clearTimeout(t); Object.assign(state, { drafts: {}, sdrafts: {}, quick: null, status: {}, open: null, selected: null, create: null, menu: null, pvWidth: "desktop", pvAud: "free", moveInline: null, moveForm: null, confirm: null, drag: null, timers: {}, notice: null }); if (cfg.layout === "master") { ensureSelected(); state.open = state.selected; } render(); },
    get config() { return cfg; },
    isDirtyBanner, savedSessions, liveSessions, groups,
  };
}
