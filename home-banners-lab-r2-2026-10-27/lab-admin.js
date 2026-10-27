/* Stage 2. The Admin > Banners page with the round 2 guards. Each frame owns one instance with its own drafts; saved data is the shared store. */

let adminUid = 0;
const UNDO_MS = 10_000;

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

const GROUPS = [["home", "On Home"], ["scheduled", "Scheduled"], ["drafts", "Drafts"], ["ended", "Ended"], ["deleted", "Deleted"]];
const GROUP_NOTE = { deleted: "Kept for 30 days. Restore brings one back as a draft." };
const MESSAGE_FIELDS = ["headline", "body", "link", "linkLabel", "from", "until", "showEnd", "dismissible", "audience", "eyebrow", "helpCard", "helpText"];
const EVENT_FIELDS = ["title", "host", "start", "duration", "link", "leadDays", "audience", "helpCard", "helpText"];
const FIELD_NAMES = { headline: "Headline", body: "Body", link: "Opens", linkLabel: "Button", from: "Shows from", until: "Shows until", showEnd: "End date on the banner", dismissible: "Users can close it", audience: "Audience", title: "Title", host: "Host", start: "Starts", duration: "Length", leadDays: "On Home from", eyebrow: "Eyebrow", helpCard: "Card on Help", helpText: "Help card text" };
const BOOL_DEFAULT = { showEnd: true, dismissible: true, helpCard: false };
const LEAD_OPTIONS = [[14, "14 days"], [7, "7 days"], [3, "3 days"], [1, "1 day"], [0, "0 days"]];
const DURATION_OPTIONS = [[30, "30 min"], [45, "45 min"], [60, "60 min"], [90, "90 min"]];

/* lab: { store, hcfg(), now(), consumeFail() } */
function createAdminApp({ root, phone, lab, config }) {
  const uid = `a${++adminUid}`;
  let cfg = { ...config };
  const blank = () => ({
    drafts: {}, sdrafts: {}, quick: null, status: {}, open: null, selected: null, create: null, menu: null,
    moveInline: null, moveForm: null, confirm: null, drag: null, timers: {}, more: {},
    review: null, undo: null, undoTick: null, flash: null, flashTimer: null, linkCache: {},
  });
  const state = blank();

  const now = () => lab.now();
  const store = () => lab.store;
  const banners = () => store().banners;
  const fieldsOf = (type) => (type === "event" ? EVENT_FIELDS : MESSAGE_FIELDS);
  const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k] ?? (k in BOOL_DEFAULT ? BOOL_DEFAULT[k] : "")]));
  const norm = (o, type) => JSON.stringify(pick(o || {}, fieldsOf(type)));
  const entry = (what) => ({ at: now().toISOString(), by: CURRENT_ADMIN, what });
  const liveBanner = () => banners().find((b) => b.type === "live") || null;
  const label = (date) => fmt(pacificInstant(`${date}T${RULE.startTime}`)).short;

  function isDirtyBanner(id) {
    if (id === "new") return true;
    const d = state.drafts[id], b = store().byId(id);
    if (!d || !b || d.type === "live") return false;
    return norm(d, d.type) !== norm(b, b.type);
  }
  function changedFields(id) {
    const d = state.drafts[id], b = store().byId(id);
    if (!d || !b) return [];
    return fieldsOf(d.type).filter((k) => (d[k] ?? BOOL_DEFAULT[k] ?? "") !== (b[k] ?? BOOL_DEFAULT[k] ?? ""));
  }
  function listNames(keys) {
    const names = keys.map((k) => (FIELD_NAMES[k] || k).toLowerCase());
    if (names.length <= 1) return names[0] || "banner";
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }

  /* ----- rows and groups ----- */
  function rows() {
    const list = banners();
    return list.map((b) => {
      const st = adminStatus(b, now(), list);
      return { b, st, who: statusLine(b, st, now(), list), when: whenLine(b), edited: editedLine(b) };
    });
  }
  function groups() {
    const g = { home: [], scheduled: [], drafts: [], ended: [], deleted: [] };
    for (const r of rows()) g[r.st.group].push(r);
    return g;
  }

  /* ----- saving, with a snapshot for undo ----- */
  function setStatus(key, kind, text) {
    clearTimeout(state.timers[key]);
    state.status[key] = { kind, text };
    if (kind === "saved") state.timers[key] = setTimeout(() => { if (state.status[key]?.kind === "saved") { delete state.status[key]; render(); } }, 2600);
  }
  function snapshotFor(id) {
    const list = banners(); const idx = list.findIndex((b) => b.id === id);
    return { before: idx >= 0 ? clone(list[idx]) : null, idx };
  }
  function runSave(key, mutate, { savedText = "Saved", failedText = "Could not save. Nothing changed for users.", after, undo } = {}) {
    setStatus(key, "saving", "Saving");
    render();
    const fail = lab.consumeFail();
    const snap = undo ? snapshotFor(undo.id) : null;
    setTimeout(() => {
      if (fail) { setStatus(key, "failed", failedText); render(); return; }
      // `after` may hand back a new key when the saved thing gets its real id.
      const newKey = after ? after() : null;
      if (newKey && newKey !== key) { clearTimeout(state.timers[key]); delete state.status[key]; }
      if (undo) delete state.status[newKey || key]; else setStatus(newKey || key, "saved", savedText);
      store().commit(mutate);
      if (undo) setUndo({ ...undo, ...snap, key: newKey || key });
      render();
    }, 650);
  }

  /* Guard 2. One pending undo at a time, 10 seconds, paused while the pointer rests on it. */
  function setUndo(u) {
    clearInterval(state.undoTick);
    state.undo = { ...u, left: UNDO_MS, paused: false };
    state.undoTick = setInterval(() => {
      const x = state.undo; if (!x || x.paused) return;
      x.left -= 250;
      if (x.left <= 0) { clearUndo(); render(); } else tickUndo();
    }, 250);
  }
  function clearUndo() { clearInterval(state.undoTick); state.undoTick = null; state.undo = null; }
  function tickUndo() {
    const u = state.undo; if (!u) return;
    for (const el of root.querySelectorAll("[data-undo-left]")) el.textContent = `${Math.ceil(u.left / 1000)} s`;
    for (const el of root.querySelectorAll("[data-undo-bar]")) el.style.width = `${(u.left / UNDO_MS) * 100}%`;
  }
  function flash(text) {
    clearTimeout(state.flashTimer);
    state.flash = { text };
    state.flashTimer = setTimeout(() => { state.flash = null; render(); }, 2600);
  }
  function undoLast() {
    const u = state.undo; if (!u) return;
    clearUndo();
    store().commit((list) => {
      const i = list.findIndex((b) => b.id === u.id);
      if (u.before) {
        if (i >= 0) list.splice(i, 1);
        list.splice(Math.min(Math.max(u.idx, 0), list.length), 0, u.before);
        u.before.history.unshift(entry(`Undid: ${u.text}`));
      } else if (i >= 0) {
        list[i].status = "draft";
        list[i].history.unshift(entry("Undid the publish. Kept as a draft."));
      }
    });
    if (u.id in state.drafts) state.drafts[u.id] = null;
    state.sdrafts = {}; state.quick = null; state.moveInline = null;
    const text = u.before ? "Undone. Users see the earlier version." : `Undone. ${bannerTitle(store().byId(u.id) || { type: "announcement" })} is a draft again. Nobody sees it.`;
    setStatus(u.key, "saved", text);
    if (cfg.undo === "toast") flash(text);
    render();
  }
  function undoAfter(id, text, detail, where = "row") { return { id, text, detail, where }; }

  /* ----- the actions ----- */
  function settle(id) {
    state.drafts[id] = null;
    if (cfg.layout !== "master" && state.open === id) { state.open = null; state.review = null; state.moveInline = null; }
  }
  function saveBanner(id, { publish = null, widen = false } = {}) {
    const d = state.drafts[id]; const b = store().byId(id);
    const changed = changedFields(id);
    const title = bannerTitle(d);
    const aud = d.audience;
    let text, detail, savedText, failedText, what;
    if (publish === true || widen) {
      text = `Published to ${AUDIENCE_TO[aud]}`;
      detail = aud === "admins" ? `Only admins see ${title}.` : widen ? `${title} now shows to ${AUDIENCE_TO[aud]}.` : `${title} shows first on Home.`;
      savedText = widen ? `Now showing to ${AUDIENCE_TO[aud]}.` : "Published.";
      failedText = "Could not publish. Nobody sees it yet.";
      what = widen ? `Widened to ${AUDIENCE_TO[aud]}` : "Published";
    } else if (publish === false) {
      text = `Unpublished ${title}`; detail = "Users no longer see it."; savedText = "Unpublished."; failedText = "Could not unpublish. Users still see it."; what = "Unpublished";
    } else {
      text = b.status === "published" ? `Saved changes for ${AUDIENCE_TO[aud]}` : "Saved the draft";
      detail = b.status === "published" ? "Users see the new version now." : "Nobody sees it.";
      savedText = "Saved."; failedText = b.status === "published" ? "Could not save. Users still see the old version." : "Could not save the draft."; what = null;
    }
    runSave(id, (list) => {
      const x = list.find((y) => y.id === id);
      Object.assign(x, pick(d, fieldsOf(d.type)));
      if (changed.length && !widen) x.history.unshift(entry(`Changed the ${listNames(changed)}`));
      if (publish === true) { x.status = "published"; list.splice(list.indexOf(x), 1); list.unshift(x); }
      if (publish === false) x.status = "draft";
      if (what) x.history.unshift(entry(what));
    }, { savedText, failedText, after: () => settle(id), undo: undoAfter(id, text, detail, "row") });
  }
  function saveNew(publish) {
    const d = state.drafts.new;
    const id = store().newId(d.type);
    const title = bannerTitle(d); const aud = d.audience;
    runSave("new", (list) => {
      const b = { ...pick(d, fieldsOf(d.type)), id, type: d.type, status: publish ? "published" : "draft", history: [entry(publish ? "Published" : "Saved as a draft"), entry(`Created the ${TYPES[d.type].name.toLowerCase()}`)] };
      list.unshift(b);
    }, {
      savedText: publish ? "Published." : "Saved as a draft. Nobody sees it.",
      failedText: publish ? "Could not publish. Nobody sees it yet." : "Could not save the draft.",
      after: () => {
        delete state.drafts.new; state.drafts[id] = null; state.selected = id; state.review = null;
        state.open = cfg.layout === "master" ? id : null;
        return id;
      },
      undo: publish ? undoAfter(id, `Published to ${AUDIENCE_TO[aud]}`, aud === "admins" ? `Only admins see ${title}.` : `${title} shows first on Home.`, "row") : undoAfter(id, "Saved as a draft", `${title} is a draft. Nobody sees it.`, "row"),
    });
  }
  function setPublished(id, published) {
    const b = store().byId(id); const title = bannerTitle(b);
    runSave(id, (list) => {
      const x = list.find((y) => y.id === id);
      x.status = published ? "published" : "draft";
      if (published) { list.splice(list.indexOf(x), 1); list.unshift(x); }
      x.history.unshift(entry(published ? "Published" : "Unpublished"));
    }, {
      savedText: published ? "Published." : "Unpublished.", failedText: published ? `Could not publish. Nobody sees ${title} yet.` : "Could not unpublish. Users still see it.",
      after: () => { if (state.open === id && cfg.layout !== "master") settle(id); },
      undo: published ? undoAfter(id, `Published to ${AUDIENCE_TO[b.audience]}`, `${title} shows first on Home.`) : undoAfter(id, `Unpublished ${title}`, "Users no longer see it."),
    });
  }
  function deleteBanner(id) {
    const b = store().byId(id); const title = bannerTitle(b);
    const showing = adminStatus(b, now(), banners()).group === "home";
    runSave("page", (list) => { const x = list.find((y) => y.id === id); x.deleted = { at: now().toISOString(), by: CURRENT_ADMIN }; x.history.unshift(entry("Deleted")); }, {
      savedText: `Deleted ${title}.`, failedText: `Could not delete ${title}. It is still there.`,
      after: () => { if (state.open === id) { state.open = null; state.review = null; } if (state.selected === id) state.selected = null; delete state.drafts[id]; },
      undo: undoAfter(id, `Deleted ${title}`, `${showing ? "Users stop seeing it now. " : ""}It stays in Deleted for 30 days.`, "top"),
    });
  }
  function restoreBanner(id) {
    const b = store().byId(id); const title = bannerTitle(b);
    runSave("page", (list) => { const x = list.find((y) => y.id === id); delete x.deleted; x.status = "draft"; x.history.unshift(entry("Restored as a draft")); }, {
      savedText: `Restored ${title} as a draft.`, failedText: `Could not restore ${title}.`,
      undo: undoAfter(id, `Restored ${title} as a draft`, "Publish to show it again.", "top"),
    });
  }
  function reorder(id, place) {
    // place: { before: targetId } | { after: targetId }
    const title = bannerTitle(store().byId(id));
    runSave("order", (list) => {
      const i = list.findIndex((x) => x.id === id); const [b] = list.splice(i, 1);
      const j = list.findIndex((x) => x.id === (place.before || place.after)); list.splice(place.before ? j : j + 1, 0, b);
      b.history.unshift(entry("Changed the order"));
    }, { savedText: "Order saved.", failedText: "Could not save the order. Nothing changed.", undo: undoAfter(id, `Moved ${title}`, "Users see the new order now.", "top") });
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
  const topicDirty = (date) => state.sdrafts[date] && "topic" in state.sdrafts[date] && (state.sdrafts[date].topic || null) !== (savedOverrides()[date]?.topic || null);
  const dirtySessionDates = () => Object.keys(state.sdrafts).filter(topicDirty);
  const sdraft = (date) => (state.sdrafts[date] ||= {});

  /* Save one change to one session. `patch` is { topic } | { skipped } | { movedTo }. */
  function saveSession(date, patch, { text, detail }) {
    const was = savedOverrides()[date] || {};
    const lbl = label(date);
    let what;
    if ("topic" in patch) what = patch.topic ? `Set the ${lbl} topic` : `Cleared the ${lbl} topic`;
    else if ("skipped" in patch) what = patch.skipped ? `Skipped the ${lbl} session` : `Restored the ${lbl} session`;
    else what = patch.movedTo ? `Moved ${lbl} to ${fmt(pacificInstant(patch.movedTo)).date}` : `Put ${lbl} back`;
    runSave(`s:${date}`, (list) => {
      const live = list.find((b) => b.type === "live");
      live.sessions[date] = { topic: was.topic || null, skipped: !!was.skipped, movedTo: was.movedTo || null, ...patch };
      live.history.unshift(entry(what));
    }, {
      savedText: "Saved.", failedText: "Could not save. Users still see the old session.",
      after: () => { if ("topic" in patch) delete state.sdrafts[date]; },
      undo: undoAfter("live-training", text, detail, `session:${date}`),
    });
  }
  function saveTopic(date) {
    const topic = (state.sdrafts[date]?.topic || "").trim().slice(0, HEADLINE_MAX) || null;
    saveSession(date, { topic }, { text: `Saved the ${label(date)} topic`, detail: "Users see the new title on Home now." });
  }
  function saveQuick() {
    const next = savedSessions().next; if (!next) return;
    const topic = (state.quick || "").trim().slice(0, HEADLINE_MAX) || null;
    const lbl = fmt(next.scheduledAt).short;
    runSave("quick", (list) => {
      const live = list.find((b) => b.type === "live");
      live.sessions[next.date] = { ...(live.sessions[next.date] || { skipped: false, movedTo: null }), topic };
      live.history.unshift(entry(topic ? `Set the ${lbl} topic` : `Cleared the ${lbl} topic`));
    }, { savedText: "Saved.", failedText: "Could not save. Users still see the old title.", after: () => { state.quick = null; }, undo: undoAfter("live-training", `Saved the ${lbl} topic`, "Users see the new title on Home now.", "row") });
  }

  /* ----- Guard 1. The review ----- */
  function openReview(kind, { id = state.open, date = null, target = null, fromRow = false } = {}) {
    state.review = { kind, id, date, target, fromRow, link: null };
    state.menu = null; state.create = null; state.confirm = null;
    // A review started from the row needs a place when it is a step or sits under the form. Open the editor for it.
    if (fromRow && cfg.review !== "dialog" && cfg.layout !== "master" && state.open !== id) { state.open = id; state.selected = id; }
    if (kind !== "move" && kind !== "putback") state.moveInline = null;
    ensureLinkCheck();
    render();
    revealReview();
  }
  function closeReview() {
    const r = state.review; if (!r) return;
    state.review = null;
    if (r.fromRow && r.id !== "new") { state.drafts[r.id] = null; if (cfg.layout !== "master" && state.open === r.id) state.open = null; }
    render();
  }
  function reviewDraft() {
    const r = state.review; if (!r) return null;
    if (r.id === "new") return state.drafts.new || null;
    return state.drafts[r.id] || store().byId(r.id);
  }
  function ensureLinkCheck() {
    const r = state.review; if (!r) return;
    const d = reviewDraft(); if (!d || d.type === "live" || r.kind === "unpublish") { r.link = null; return; }
    const link = d.link || "";
    if (!link) { r.link = { kind: "none", url: "" }; return; }
    if (r.link && r.link.url === link && r.link.kind !== "checking") return;
    if (linkKind(link) === "page") { r.link = { kind: "page", url: link, name: LINK_PAGE_NAME[link] }; return; }
    if (linkProblem(link)) { r.link = { kind: "invalid", url: link, problem: linkProblem(link) }; return; }
    const cached = state.linkCache[link];
    if (cached) { r.link = { ...cached, url: link, kind: cached.ok ? "ok" : "bad" }; return; }
    if (r.link && r.link.url === link && r.link.kind === "checking") return;
    r.link = { kind: "checking", url: link };
    checkLink(link).then((res) => {
      state.linkCache[link] = res;
      const cur = state.review;
      if (cur && cur.link && cur.link.url === link) { cur.link = { ...res, url: link, kind: res.ok ? "ok" : "bad" }; render(); }
    });
  }
  /* The sessions after a change, and the moment the changed session would be next: now, or just after the session before it ends. */
  function sessionAfter(date, patch) {
    const over = clone(savedOverrides());
    over[date] = { topic: null, skipped: false, movedTo: null, ...(over[date] || {}), ...patch };
    const n = now();
    const { list } = buildSessions(over, n);
    const idx = list.findIndex((x) => x.date === date);
    const before = list.slice(0, Math.max(idx, 0)).filter((x) => !x.skipped && !x.past);
    const prev = before.length ? before[before.length - 1] : null;
    const at = prev ? new Date(Math.max(...before.map((x) => x.endsAt.getTime())) + 60_000) : n;
    const nextAt = buildSessions(over, at).next;
    return { over, list, at, prev, nextAt, later: at > n };
  }
  function reviewPatch(r) {
    if (r.kind === "skip") return { skipped: true };
    if (r.kind === "unskip") return { skipped: false };
    if (r.kind === "move") return { movedTo: r.target };
    if (r.kind === "putback") return { movedTo: null };
    return null;
  }
  function reviewModel() {
    const r = state.review; const d = reviewDraft(); const n = now();
    const b = r.id === "new" ? null : store().byId(r.id);
    const m = { kind: r.kind, title: "", audienceControl: false, line: "", dates: "", changes: null, link: null, warn: null, problem: null, primary: "", cancel: cfg.review === "step" ? "Back to editing" : "Cancel", disabled: false, view: null };
    const hcfg = lab.hcfg();
    if (!d) { m.disabled = true; return m; }
    const aud = d.audience; const subject = AUDIENCE_SEES[aud]; const title = bannerTitle(d);
    const w = windowOf(d);
    const fromText = !w.from || w.from <= n ? `today, ${fmt(n).short},` : `${fmt(w.from).date},`;
    const untilText = w.until ? fmt(w.until).date : "no end";
    const datesLine = d.type === "event"
      ? `Starts ${whenBoth(w.start, n)}, ${d.duration || 60} min. On Home from ${whenBoth(w.from, n)}.`
      : `Starts ${w.from ? whenBoth(w.from, n) : "now"}. Ends ${w.until ? whenBoth(w.until, n) : "never"}.`;
    if (r.kind === "publish" || r.kind === "widen") {
      m.title = r.kind === "widen" ? `Show ${title} to more people` : `Publish ${title}`;
      m.audienceControl = true;
      if (aud === "admins") m.line = `<b>Only admins will see this.</b> It shows on their Home from ${fromText} until ${untilText}. Free and Pro users do not see it.`;
      else m.line = `<b>${subject} will see this on Home</b> from ${fromText} until ${untilText}. It shows first.`;
      m.dates = datesLine;
      m.primary = `Publish to ${AUDIENCE_TO[aud]}`;
      if (r.kind === "widen" && b) m.changes = changesBetween(b, d);
      m.view = resolveBanner(draftAsBanner(d), n);
    } else if (r.kind === "save") {
      m.title = `Save changes to ${bannerTitle(b)}`;
      m.audienceControl = true;
      const i = banners().findIndex((x) => x.id === r.id);
      const withDraft = banners().slice(); withDraft[i] = draftAsBanner(d);
      const plans = aud === "admins" ? [] : ["free", "pro"].filter((a) => forAudience(d, a));
      const parts = plans.map((a) => { const q = eligible(withDraft, n, a); const k = q.findIndex((x) => x.id === r.id); return { a, k, first: q[0] }; });
      let pos;
      if (aud === "admins") pos = "Only admins see it.";
      else if (parts.every((p) => p.k === 0)) pos = "It shows first.";
      else if (parts.every((p) => p.k > 0 && p.first.id === parts[0].first.id)) pos = `It waits behind ${blockerName(parts[0].first)}, so users see it after they close that one.`;
      else if (parts.every((p) => p.k < 0)) pos = "It is outside its dates, so nobody sees it until it starts.";
      else pos = parts.map((p) => `${p.k === 0 ? "first" : p.k > 0 ? `behind ${blockerName(p.first)}` : "outside its dates"} for ${AUDIENCES[p.a].short} users`).join(", ").replace(/^\w/, (c) => c.toUpperCase()) + ".";
      m.line = `<b>${subject} will see this on Home</b> until ${untilText}, with the changes below. ${pos}`;
      m.dates = datesLine;
      m.changes = changesBetween(b, d);
      m.primary = `Save changes for ${AUDIENCE_TO[aud]}`;
      m.view = resolveBanner(draftAsBanner(d), n);
    } else if (r.kind === "unpublish") {
      m.title = `Unpublish ${bannerTitle(b)}`;
      const plans = aud === "admins" ? ["admins"] : ["free", "pro"].filter((a) => forAudience(b, a));
      const nexts = plans.map((a) => ({ a, f: firstFor(banners(), n, a, r.id) }));
      let after;
      if (nexts.every((x) => x.f?.id === nexts[0].f?.id)) after = nexts[0].f ? `Home shows ${blockerName(nexts[0].f)} instead.` : "Home shows no banner. The slot collapses.";
      else after = nexts.map((x) => `${AUDIENCES[x.a].short} users see ${x.f ? blockerName(x.f) : "no banner"}`).join(", ") + " instead.";
      m.line = `<b>${subject} stop seeing this now.</b> ${after}`;
      m.primary = `Unpublish for ${AUDIENCE_TO[aud]}`;
      m.view = resolveBanner(b, n);
    } else {
      const s = savedSessions().list.find((x) => x.date === r.date);
      const patch = reviewPatch(r);
      const { over, at, prev, nextAt, later } = sessionAfter(r.date, patch);
      const lbl = label(r.date);
      const nextText = nextAt ? fmt(nextAt.startsAt).date : "no session";
      const lead = later ? `After the ${fmt(prev.startsAt).short} session, Home` : "Home";
      if (r.kind === "skip") { m.title = `Skip the ${lbl} session`; m.line = `<b>${lead} will show ${nextText} instead${later ? ` of ${fmt(s.startsAt).date}` : ""}.</b> ${fmt(s.startsAt).date} says Skipped in this list only.`; m.primary = `Skip ${lbl}`; }
      if (r.kind === "unskip") { m.title = `Restore the ${lbl} session`; m.line = `<b>${lead} will show ${fmt(s.startsAt).date} again.</b>`; m.primary = `Restore ${lbl}`; }
      if (r.kind === "move") { const t = pacificInstant(r.target); m.title = `Move the ${lbl} session`; m.line = `<b>${lead} will show ${whenBoth(t, n)}</b> instead of ${fmt(s.scheduledAt).date}, ${fmt(s.scheduledAt).clock}. The banner says Rescheduled.`; m.primary = `Move ${lbl} to ${fmt(t).short}`; }
      if (r.kind === "putback") { m.title = `Put the ${lbl} session back`; m.line = `<b>${lead} will show ${whenBoth(s.scheduledAt, n)}</b> again, without the Rescheduled tag.`; m.primary = `Put ${lbl} back`; }
      m.view = resolveBanner({ ...liveBanner(), sessions: over }, at);
      if (later) m.previewNote = `As users will see it after the ${fmt(prev.startsAt).short} session.`;
    }
    // Guard 4. The link.
    if (r.link && r.link.kind !== "none") {
      const l = r.link; const btn = d.type === "event" ? "Add to calendar" : d.linkLabel || "the button";
      if (l.kind === "page") m.link = { ok: true, text: `Opens ${l.name}, a page in Clarity.` };
      else if (l.kind === "checking") { m.link = { checking: true, text: "Checking that the link loads" }; m.disabled = true; }
      else if (l.kind === "ok") m.link = { ok: true, text: `Opens ${l.title} (${l.host}).` };
      else if (l.kind === "invalid") { m.link = { bad: true, text: l.problem }; m.disabled = true; }
      else { m.link = { bad: true, text: `This link did not load (${l.error}). Users who tap ${btn} see an error page.` }; if (r.kind === "publish" || r.kind === "widen") m.primary = "Publish with this link"; else if (r.kind === "save") m.primary = "Save with this link"; }
    }
    if (d.type !== "live") { const p = problemFor(d, { skipLink: true }); if (p) { m.problem = p; m.disabled = true; } }
    return m;
  }
  function fmtVal(key, v, d) {
    if (v === undefined || v === null || v === "") return "(empty)";
    if (key === "from" || key === "until" || key === "start") return whenBoth(pacificInstant(v), null, { relative: false });
    if (key === "audience") return AUDIENCE_LABEL[v] || v;
    if (key === "link") return linkKind(v) === "page" ? `${LINK_PAGE_NAME[v]}, a page in Clarity` : v;
    if (key === "showEnd" || key === "dismissible" || key === "helpCard") return v === false ? "No" : "Yes";
    if (key === "duration") return `${v} min`;
    if (key === "leadDays") return `${v} days before`;
    return String(v);
  }
  function changesBetween(b, d) {
    return fieldsOf(d.type).filter((k) => (d[k] ?? BOOL_DEFAULT[k] ?? "") !== (b[k] ?? BOOL_DEFAULT[k] ?? "")).map((k) => ({ key: k, name: FIELD_NAMES[k] || k, before: fmtVal(k, b[k] ?? BOOL_DEFAULT[k]), after: fmtVal(k, d[k] ?? BOOL_DEFAULT[k]) }));
  }
  function confirmReview() {
    const r = state.review; if (!r) return;
    const m = reviewModel(); if (m.disabled) return;
    state.review = null;
    if (r.kind === "publish") { if (r.id === "new") saveNew(true); else saveBanner(r.id, { publish: true }); return; }
    if (r.kind === "widen") { saveBanner(r.id, { widen: true }); return; }
    if (r.kind === "save") { saveBanner(r.id); return; }
    if (r.kind === "unpublish") { if (state.drafts[r.id] && isDirtyBanner(r.id)) saveBanner(r.id, { publish: false }); else setPublished(r.id, false); return; }
    const patch = reviewPatch(r); const lbl = label(r.date);
    const { nextAt, later, prev } = sessionAfter(r.date, patch);
    const s = savedSessions().list.find((x) => x.date === r.date);
    state.moveInline = null;
    if (r.kind === "skip") saveSession(r.date, patch, { text: `Skipped ${lbl}`, detail: later ? `After the ${fmt(prev.startsAt).short} session, Home shows ${nextAt ? fmt(nextAt.startsAt).date : "no session"} instead.` : `Home shows ${nextAt ? fmt(nextAt.startsAt).date : "no session"} instead.` });
    if (r.kind === "unskip") saveSession(r.date, patch, { text: `Restored ${lbl}`, detail: `Home shows ${fmt(s.startsAt).date} again.` });
    if (r.kind === "move") saveSession(r.date, patch, { text: `Moved ${lbl} to ${fmt(pacificInstant(r.target)).date}`, detail: "The banner says Rescheduled." });
    if (r.kind === "putback") saveSession(r.date, patch, { text: `Put ${lbl} back`, detail: `Home shows ${fmt(s.scheduledAt).date} again.` });
  }
  function reviewHtml({ compact = false } = {}) {
    ensureLinkCheck();
    const r = state.review; const m = reviewModel(); const hcfg = lab.hcfg();
    const d = reviewDraft();
    const aud = d ? d.audience : "everyone";
    const isDialog = cfg.review === "dialog";
    const isStep = cfg.review === "step";
    const head = isStep
      ? `<div class="rv-head"><button type="button" class="btn btn-ghost rv-back" data-review-cancel>${icon("arrow-left")}Back to editing</button><p class="ed-kicker">Review</p><h3 class="rv-title">${esc(m.title)}</h3></div>`
      : `<div class="rv-head"><div class="rv-head-text"><p class="ed-kicker">Review</p><h3 class="rv-title">${esc(m.title)}</h3></div>${isDialog ? `<button type="button" class="btn btn-ghost btn-icon" data-review-cancel aria-label="Cancel">${icon("x")}</button>` : ""}</div>`;
    const audCtl = m.audienceControl ? `<div class="rv-aud"><span class="rv-aud-label">Who sees it</span><div class="pseg rv-seg" role="group" aria-label="Who sees it">${AUDIENCE_OPTIONS.map(([v, l]) => `<button type="button" class="${aud === v ? "is-active" : ""}" data-rv-aud="${v}" aria-pressed="${aud === v}">${l.replace(" plan users", " users")}</button>`).join("")}</div></div>` : "";
    const changes = m.changes && m.changes.length ? `<div class="rv-changes"><p class="pv-label">What changes</p><table class="rv-table"><thead><tr><th></th><th>Before</th><th>After</th></tr></thead><tbody>${m.changes.map((c) => `<tr><th>${esc(c.name)}</th><td class="rv-before">${esc(c.before)}</td><td class="rv-after">${esc(c.after)}</td></tr>`).join("")}</tbody></table></div>` : (m.changes && r.kind === "save" ? `<p class="rv-nochange">Nothing has changed yet.</p>` : "");
    const link = m.link ? `<p class="rv-link ${m.link.bad ? "is-bad" : m.link.ok ? "is-ok" : "is-checking"}">${m.link.checking ? '<i class="spin"></i>' : m.link.bad ? icon("alert-triangle") : icon("link")}${esc(m.link.text)}</p>` : "";
    const problem = m.problem ? `<p class="fld-problem">${icon("alert")}${esc(m.problem)}</p>` : "";
    const empty = `<div class="bn-none">Nothing to show.</div>`;
    const previews = `<div class="rv-previews">${m.previewNote ? `<p class="rv-preview-note">${esc(m.previewNote)}</p>` : ""}<p class="pv-label">On a desktop</p><div class="rv-fit" data-pv-fit><div class="pv-in" style="width:1116px">${m.view ? renderBanner(m.view, hcfg, { inert: true }) : empty}</div></div><p class="pv-label">On a phone</p><div class="rv-phone" data-pv-fit><div class="pv-in" style="width:358px">${m.view ? renderBanner(m.view, hcfg, { inert: true }) : empty}</div></div></div>`;
    const key = r.id === "new" ? "new" : r.kind.match(/skip|move|putback/) ? `s:${r.date}` : r.id;
    const st = state.status[key];
    const foot = `<div class="rv-foot">${isStep ? "" : `<button type="button" class="btn btn-outline" data-review-cancel>${m.cancel}</button>`}<span class="grow"></span>${st?.kind === "failed" ? receipt(key) : ""}<button type="button" class="btn btn-primary${m.link?.bad ? " is-warn" : ""}" data-review-confirm${m.disabled ? " disabled" : ""}>${esc(m.primary)}</button></div>`;
    return `<div class="rv${compact ? " is-compact" : ""}${isDialog ? " is-dialog" : isStep ? " is-step" : " is-inline"}" data-review="${r.kind}" data-review-for="${esc(r.id)}">${head}${audCtl}<p class="rv-line">${m.line}</p>${m.dates ? `<p class="rv-dates">${esc(m.dates)}</p>` : ""}${changes}${link}${problem}${previews}${foot}</div>`;
  }
  function revealReview() {
    const rv = root.querySelector(".rv"); if (!rv || cfg.review === "dialog") return;
    const container = rv.closest(".sheet, .dlg, .md, [data-scroll]"); if (!container) return;
    const scale = root.getBoundingClientRect().width / (root.offsetWidth || 1) || 1;
    const top = (rv.getBoundingClientRect().top - container.getBoundingClientRect().top) / scale;
    container.scrollTop += top - 12;
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
    if (group !== "home" && group !== "scheduled") return `<span class="order-spacer"></span>`;
    const list = groups()[group]; const i = list.findIndex((x) => x.b.id === r.b.id);
    const id = r.b.id; const title = bannerTitle(r.b);
    if (cfg.order === "drag") return `<span class="handle" role="button" tabindex="0" aria-label="Reorder ${esc(title)}. Press the arrow keys." data-handle="${id}" data-group="${group}">${icon("grip")}</span>`;
    return `<span class="updown"><button type="button" class="btn btn-ghost btn-icon" data-move-up="${id}" aria-label="Move ${esc(title)} up"${i === 0 ? " disabled" : ""}>${icon("chevron-up")}</button><button type="button" class="btn btn-ghost btn-icon" data-move-down="${id}" aria-label="Move ${esc(title)} down"${i === list.length - 1 ? " disabled" : ""}>${icon("chevron-down")}</button></span>`;
  }
  function rowMenu(r) {
    const b = r.b; const open = state.menu === b.id;
    const published = b.status === "published";
    const showing = r.st.group === "home";
    return `<div class="menu-wrap"><button type="button" class="btn btn-ghost btn-icon" data-menu="${b.id}" aria-label="More actions for ${esc(bannerTitle(b))}" aria-expanded="${open}">${icon("ellipsis")}</button>
      ${open ? `<div class="menu-pop" role="menu">
        ${published ? `<button type="button" role="menuitem" data-unpublish="${b.id}" data-showing="${showing ? 1 : 0}">${icon("eye-off")}Unpublish</button>` : `<button type="button" role="menuitem" data-publish="${b.id}">${icon("eye")}Publish</button>`}
        ${published && b.audience === "admins" && showing ? `<button type="button" role="menuitem" data-widen="${b.id}">${icon("users")}Show to more people</button>` : ""}
        ${TYPES[b.type].deletable ? `<button type="button" role="menuitem" class="is-danger" data-delete="${b.id}">${icon("trash")}Delete</button>` : `<span class="menu-note">The series cannot be deleted. Unpublish hides it.</span>`}
      </div>` : ""}</div>`;
  }
  function editButton(r) {
    if (cfg.layout === "master") return "";
    const open = state.open === r.b.id;
    return `<button type="button" class="btn btn-outline" data-edit="${r.b.id}" aria-expanded="${open}" aria-label="${open && cfg.editor === "inline" ? "Close" : "Edit"} ${esc(bannerTitle(r.b))}">${icon("pencil")}<span class="btn-text">${open && cfg.editor === "inline" ? "Close" : "Edit"}</span></button>`;
  }
  function widenButton(r) {
    const b = r.b;
    if (b.status !== "published" || b.audience !== "admins" || r.st.group !== "home") return "";
    return `<div class="row-cta"><button type="button" class="btn btn-outline" data-widen="${b.id}">${icon("users")}Show to more people</button></div>`;
  }
  function restoreButton(r) { return `<button type="button" class="btn btn-outline" data-restore="${r.b.id}">${icon("undo")}Restore</button>`; }
  function rowReceipt(id) { return receipt(id); }

  /* Guard 2 rendering. */
  function undoBarHtml(where) {
    const u = state.undo; if (!u || cfg.undo !== "inline" || u.where !== where) return "";
    return `<div class="undo-bar" data-undo role="status">${icon("check")}<span class="undo-text"><b>${esc(u.text)}.</b> ${esc(u.detail)}</span><button type="button" class="btn btn-outline" data-undo-do>${icon("undo")}Undo</button><span class="undo-left" data-undo-left>${Math.ceil(u.left / 1000)} s</span><i class="undo-track"><i class="undo-fill" data-undo-bar style="width:${(u.left / UNDO_MS) * 100}%"></i></i></div>`;
  }
  function undoToastHtml() {
    if (cfg.undo === "toast" && state.undo) {
      const u = state.undo;
      return `<div class="toast-undo" data-undo role="status"><span class="toast-icon">${icon("check")}</span><span class="toast-text"><b>${esc(u.text)}</b><span>${esc(u.detail)}</span></span><button type="button" class="btn btn-outline" data-undo-do>${icon("undo")}Undo</button><button type="button" class="btn btn-ghost btn-icon toast-close" data-undo-close aria-label="Close">${icon("x")}</button><i class="undo-track"><i class="undo-fill" data-undo-bar style="width:${(u.left / UNDO_MS) * 100}%"></i></i></div>`;
    }
    if (state.flash) return `<div class="toast-undo is-flash" role="status"><span class="toast-icon">${icon("check")}</span><span class="toast-text"><b>${esc(state.flash.text)}</b></span></div>`;
    return "";
  }
  function sessionUndo(date) { return undoBarHtml(`session:${date}`); }
  function rowUndo(id) {
    const u = state.undo; if (!u || cfg.undo !== "inline") return "";
    if (u.id !== id) return "";
    if (u.where === "row") return undoBarHtml("row");
    if (u.where.startsWith("session:") && !(state.open === "live-training" || (cfg.layout === "master" && state.selected === "live-training"))) return undoBarHtml(u.where);
    return "";
  }

  function quickHtml() {
    const next = savedSessions().next; if (!next) return "";
    const value = state.quick ?? (next.topic || "");
    const dirty = state.quick !== null && ((state.quick.trim() || null) !== (next.topic || null));
    const st = state.status.quick;
    return `<div class="quick${dirty ? " is-dirty" : ""}${st?.kind === "failed" ? " is-failed" : ""}" data-quick>
      <label class="quick-label" for="${uid}-quick">Next topic<span>${fmt(next.startsAt).date}, ${fmt(next.startsAt).clock} Pacific${ownClock(next.startsAt) ? ` (${ownClock(next.startsAt)})` : ""}</span></label>
      <div class="quick-row"><input id="${uid}-quick" class="in${st?.kind === "failed" ? " is-failed" : ""}" type="text" maxlength="${HEADLINE_MAX}" data-quick-topic value="${esc(value)}" placeholder="${esc(DEFAULT_TITLE)}" aria-label="Topic for ${fmt(next.startsAt).date}">
        ${dirty ? `<button type="button" class="btn btn-primary" data-quick-save>Save topic</button><button type="button" class="btn btn-outline" data-quick-cancel>Cancel</button>` : ""}</div>
      ${dirty && !st ? `<p class="quick-note"><span class="chip chip-unsaved">Unsaved</span>Users see the current title until you save. No review for a topic.</p>` : ""}
      ${st ? `<p class="quick-note">${receipt("quick", { retry: st.kind === "failed" ? "data-quick-save" : null })}</p>` : ""}
    </div>`;
  }

  /* ----- Guard 8. Templates ----- */
  function sampleView(tpl) {
    const n = now(); const f = tpl.fill || {};
    const samples = {
      announcement: { headline: "Teleprompter is here", body: "Read your script while you record.", link: "/record", linkLabel: f.linkLabel || "Try it" },
      offer: { headline: "Get Pro for 20% off", link: f.link || "/settings/subscription", linkLabel: f.linkLabel || "Upgrade", showEnd: true, until: plusDays(n, 4, "23:59") },
      event: { title: "Journey Pages workshop", host: "Sam Rivera", start: plusDays(n, 9, "10:00"), duration: 45, link: "https://lp.clarity.video/workshop", leadDays: 7 },
      notice: { headline: "Scheduled maintenance Sunday 2:00 to 3:00 AM Pacific", body: "", dismissible: f.dismissible ?? true },
    };
    return resolveBanner({ id: "s", type: tpl.type, status: "published", audience: f.audience || "everyone", ...samples[tpl.type] }, n);
  }
  function mini(tpl) {
    return `<span class="mini"><span class="mini-in">${renderBanner(sampleView(tpl), lab.hcfg(), { inert: true, mini: true, size: "compact" })}</span></span>`;
  }
  function templateTile(t, cls) {
    return `<button type="button" class="${cls}" data-new="${t.id}"><span class="${cls}-head">${icon(TYPES[t.type].icon)}<b>${t.name}</b></span><span class="${cls}-what">${t.what}</span>${mini(t)}</button>`;
  }
  function blankRow(cls) {
    return `<div class="${cls}"><span>Or start blank</span>${BLANK_TEMPLATES.map((t) => `<button type="button" class="btn btn-outline" data-new="${t.id}">${icon(TYPES[t.type].icon)}${TYPES[t.type].name}</button>`).join("")}</div>`;
  }
  function createControl() {
    if (cfg.editor === "page" && state.open) return "";
    if (cfg.templates === "picker") return `<button type="button" class="btn btn-primary" data-create-open>${icon("plus")}New banner</button>`;
    if (cfg.templates === "menu") {
      const open = state.create === "menu";
      return `<div class="menu-wrap menu-wrap-create"><button type="button" class="btn btn-primary" data-create-menu aria-expanded="${open}">${icon("plus")}New banner${icon("chevron-down")}</button>
        ${open ? `<div class="menu-pop menu-pop-types" role="menu">${TEMPLATES.map((t) => `<button type="button" role="menuitem" data-new="${t.id}">${icon(TYPES[t.type].icon)}<span class="mi"><b>${t.name}</b><small>${t.what}</small></span></button>`).join("")}<div class="menu-sep"></div><p class="menu-head">Start blank</p>${BLANK_TEMPLATES.map((t) => `<button type="button" role="menuitem" data-new="${t.id}">${icon(TYPES[t.type].icon)}<span class="mi"><b>${TYPES[t.type].name}</b></span></button>`).join("")}</div>` : ""}</div>`;
    }
    return "";
  }
  function templatesRow() {
    if (cfg.templates !== "cards" || (cfg.editor === "page" && state.open)) return "";
    return `<div class="tpl-block"><div class="tpl-row">${TEMPLATES.map((t) => templateTile(t, "tpl")).join("")}</div>${blankRow("tpl-blank")}</div>`;
  }
  function pickerHtml() {
    return `<div class="dlg-head"><h2 class="dlg-title">New banner</h2><button type="button" class="btn btn-ghost btn-icon" data-create-close aria-label="Close">${icon("x")}</button></div><p class="dlg-text">Start from a template. The words, the audience and the dates are yours to change next.</p>
      <div class="pick-grid">${TEMPLATES.map((t) => templateTile(t, "pick")).join("")}</div>${blankRow("pick-blank")}`;
  }
  function newDraft(tpl) {
    const n = now(); const w = wallString(n); const f = tpl.fill || {};
    const base = { id: "new", type: tpl.type, status: "draft", audience: f.audience || "everyone", history: [], eyebrow: "", helpCard: false, helpText: "" };
    if (tpl.type === "event") return { ...base, title: "", host: "", start: plusDays(n, 7, "10:00"), duration: f.duration || 45, link: "", leadDays: f.leadDays ?? DEFAULT_DAYS.eventLead };
    const days = f.days ?? DEFAULT_DAYS[tpl.type];
    const d = { ...base, headline: "", body: "", link: f.link || "", linkLabel: f.linkLabel || "", from: w, until: plusDays(n, days, "17:00") };
    if (tpl.type === "offer") d.showEnd = f.showEnd ?? true;
    if (tpl.type === "notice") d.dismissible = f.dismissible ?? true;
    return d;
  }
  function startNew(templateId) {
    const tpl = templateById(templateId); if (!tpl) return;
    state.drafts.new = newDraft(tpl);
    state.open = "new"; state.selected = "new"; state.create = null; state.menu = null; state.review = null; delete state.status.new;
    state.more.new = false;
    render();
    focusFirstField();
  }

  /* ----- Guard 9. The form reads as one sentence ----- */
  function selInline(d, key, options, ariaLabel) {
    return `<select class="sel sel-inline" data-field="${key}" aria-label="${esc(ariaLabel)}">${options.map(([v, l]) => `<option value="${v}"${String(d[key]) === String(v) ? " selected" : ""}>${l}</option>`).join("")}</select>`;
  }
  function inInline(d, key, ariaLabel, { max, placeholder } = {}) {
    const v = d[key] ?? ""; const count = max && String(v).length >= max - 20 ? `<span class="count">${String(v).length}/${max}</span>` : "";
    return `<span class="fld-wrap"><input class="in" type="text" data-field="${key}" ${max ? `maxlength="${max}"` : ""} value="${esc(v)}" placeholder="${esc(placeholder || "")}" aria-label="${esc(ariaLabel)}">${count}</span>`;
  }
  function dtInline(d, key, ariaLabel) {
    return `<input class="in in-dt" type="datetime-local" data-field="${key}" value="${esc(d[key] || "")}" aria-label="${esc(ariaLabel)}">`;
  }
  function sentenceHtml(d) {
    const aud = selInline(d, "audience", AUDIENCE_OPTIONS, "Audience");
    if (d.type === "event") {
      return `<div class="sent" data-sentence><span class="p p-grow"><span class="w">Show</span><span class="f f-grow">${inInline(d, "title", "Title", { max: HEADLINE_MAX, placeholder: "Journey Pages workshop" })}</span></span><span class="p"><span class="w">to</span><span class="f">${aud}</span></span><span class="p"><span class="w">from</span><span class="f">${selInline(d, "leadDays", LEAD_OPTIONS, "Days before the start")}</span><span class="w">before it starts.</span></span></div>
        <div class="sent" data-sentence><span class="p"><span class="w">It starts</span><span class="f">${dtInline(d, "start", "Start, Pacific time")}</span></span><span class="p"><span class="w">and runs</span><span class="f">${selInline(d, "duration", DURATION_OPTIONS, "Length")}</span></span></div>`;
    }
    const ph = d.type === "offer" ? "Get Pro for 20% off" : d.type === "notice" ? "Scheduled maintenance Sunday 2:00 to 3:00 AM Pacific" : "Teleprompter is here";
    return `<div class="sent" data-sentence><span class="p p-grow"><span class="w">Show</span><span class="f f-grow">${inInline(d, "headline", "Headline", { max: HEADLINE_MAX, placeholder: ph })}</span></span><span class="p"><span class="w">to</span><span class="f">${aud}</span></span><span class="p"><span class="w">from</span><span class="f">${dtInline(d, "from", "Show from, Pacific time")}</span></span><span class="p"><span class="w">until</span><span class="f">${dtInline(d, "until", "Show until, Pacific time")}</span></span></div>`;
  }
  function whenHtml(d) {
    const n = now(); const w = windowOf(d); const lim = limitFor(d);
    if (d.type === "event") {
      if (!d.start) return `<p class="sent-when">Pick a start.</p>`;
      return `<p class="sent-when">Starts ${esc(whenBoth(w.start, n))}, ${d.duration || 60} min. On Home from ${esc(whenBoth(w.from, n))} until it ends.</p>`;
    }
    const days = windowDays(d);
    const parts = [];
    parts.push(w.from ? `Starts ${esc(whenBoth(w.from, n))}.` : "Pick a start.");
    parts.push(w.until ? `Ends ${esc(whenBoth(w.until, n))}.` : "Pick an end.");
    if (days !== null && days > 0) parts.push(`Shows for <b>${days} day${days === 1 ? "" : "s"}</b>, up to ${lim.days} for ${esc(lim.what)}.`);
    else parts.push(esc(lim.text));
    return `<p class="sent-when">${parts.join(" ")}</p>`;
  }
  function switchField(d, key, label, { hint = "" } = {}) {
    const checked = (d[key] ?? BOOL_DEFAULT[key] ?? false) !== false;
    return `<div class="fld"><label class="sw-label"><span class="sw" role="switch" aria-checked="${checked}" tabindex="0" data-switch="${key}"><i></i></span><span>${label}</span></label>${hint ? `<p class="fld-hint">${hint}</p>` : ""}</div>`;
  }
  function linkField(d) {
    const kind = linkKind(d.link);
    const lp = linkProblem(d.link);
    const opts = [["", "Nothing"], ...LINK_PAGES, ["web", "A web address"]];
    const current = kind === "web" ? "web" : d.link || "";
    return `<div class="fld is-half"><label class="fld-label" for="${uid}-${d.id}-linkpick">${d.type === "event" ? "Add to calendar opens" : "Button opens"}</label><select id="${uid}-${d.id}-linkpick" class="sel" data-link-pick>${opts.map(([v, l]) => `<option value="${v}"${current === v ? " selected" : ""}>${l}</option>`).join("")}</select></div>
      ${kind === "web" ? `<div class="fld is-half"><label class="fld-label" for="${uid}-${d.id}-link">Web address</label><input id="${uid}-${d.id}-link" class="in" type="url" data-field="link" value="${esc(d.link)}" placeholder="https://" aria-label="Web address"><p class="fld-hint">${lp ? esc(lp) : "Checked before publish. The review shows the page it opens."}</p></div>` : `<div class="fld is-half"><p class="fld-hint fld-hint-tall">${kind === "page" ? `A page in Clarity. Always loads.` : d.type === "event" ? "Without a link the banner has no button." : "Pick a page or a web address to get a button."}</p></div>`}`;
  }
  function moreHtml(d) {
    const id = d.id;
    const holds = d.type === "event" ? !!(d.host || d.link || d.helpCard || d.eyebrow) : !!(d.body || d.link || d.linkLabel || d.eyebrow || d.helpCard);
    const open = state.more[id] ?? holds;
    const t = TYPES[d.type];
    let inner;
    if (d.type === "event") {
      inner = `<div class="fld-grid">
        <div class="fld is-half"><label class="fld-label" for="${uid}-${id}-host">Host</label><input id="${uid}-${id}-host" class="in" type="text" data-field="host" value="${esc(d.host ?? "")}" placeholder="Optional"></div>
        <div class="fld is-half"><label class="fld-label" for="${uid}-${id}-eyebrow">Eyebrow</label><input id="${uid}-${id}-eyebrow" class="in" type="text" data-field="eyebrow" value="${esc(d.eyebrow ?? "")}" placeholder="${esc(d.host ? `Live with ${d.host}` : t.eyebrow)}"></div>
        ${linkField(d)}
        ${switchField(d, "helpCard", "Also show a card on the Help page")}
        ${d.helpCard ? `<div class="fld"><label class="fld-label" for="${uid}-${id}-help">Help card text</label><input id="${uid}-${id}-help" class="in" type="text" data-field="helpText" value="${esc(d.helpText ?? "")}" placeholder="One line under the title on Help"></div>` : ""}
      </div>`;
    } else {
      inner = `<div class="fld-grid">
        <div class="fld"><label class="fld-label" for="${uid}-${id}-body">Body</label><div class="fld-wrap"><input id="${uid}-${id}-body" class="in" type="text" maxlength="${BODY_MAX}" data-field="body" value="${esc(d.body ?? "")}" placeholder="Optional, one line">${String(d.body || "").length >= BODY_MAX - 20 ? `<span class="count">${String(d.body).length}/${BODY_MAX}</span>` : ""}</div></div>
        <div class="fld is-half"><label class="fld-label" for="${uid}-${id}-label">Button label</label><input id="${uid}-${id}-label" class="in" type="text" data-field="linkLabel" value="${esc(d.linkLabel ?? "")}" placeholder="${d.type === "offer" ? "Upgrade" : "Try it"}"></div>
        <div class="fld is-half"><label class="fld-label" for="${uid}-${id}-eyebrow">Eyebrow</label><input id="${uid}-${id}-eyebrow" class="in" type="text" data-field="eyebrow" value="${esc(d.eyebrow ?? "")}" placeholder="${esc(t.eyebrow)}"></div>
        ${linkField(d)}
        ${d.type === "offer" ? switchField(d, "showEnd", "Show the end date on the banner, as in Ends Friday") : ""}
        ${d.type === "notice" ? switchField(d, "dismissible", "Users can close it", { hint: d.dismissible === false ? `A notice users cannot close shows for up to ${LIMITS.noticeLocked} days.` : "" }) : ""}
        ${switchField(d, "helpCard", "Also show a card on the Help page")}
        ${d.helpCard ? `<div class="fld"><label class="fld-label" for="${uid}-${id}-help">Help card text</label><input id="${uid}-${id}-help" class="in" type="text" data-field="helpText" value="${esc(d.helpText ?? "")}" placeholder="One line under the title on Help"></div>` : ""}
      </div>`;
    }
    const inside = d.type === "event" ? "host, eyebrow, link, Help page" : "body, button, eyebrow, Help page";
    return `<details class="more" data-more="${esc(id)}"${open ? " open" : ""}><summary>More options<span>${inside}</span></summary><div class="more-body">${inner}</div></details>`;
  }
  function fieldsHtml(d) {
    if (d.type === "live") return `${sessionsEditor()}<div class="fld-grid"><div class="fld is-half"><p class="fld-label">Audience</p><p class="fld-static">Everyone. The series is free for every user.</p></div><div class="fld is-half"><p class="fld-label">Link</p><p class="fld-static">${esc(LANDING_URL)}</p></div></div>`;
    const wp = windowProblem(d);
    return `<div class="sent-block">${sentenceHtml(d)}${whenHtml(d)}${wp ? `<p class="fld-problem" data-limit>${icon("alert")}${esc(wp)}</p>` : ""}</div>${moreHtml(d)}`;
  }

  function problemFor(d, { skipLink = false } = {}) {
    if (d.type === "live") return null;
    if (!skipLink) { const lp = linkProblem(d.link); if (lp) return lp; }
    if (d.type === "event") { if (!(d.title || "").trim()) return "Give the event a title."; }
    else {
      if (!(d.headline || "").trim()) return "Write a headline.";
      if (d.type === "offer" && !d.link) return "An offer needs a link for its button.";
      if (d.link && !(d.linkLabel || "").trim()) return "Name the button.";
      if (!d.link && (d.linkLabel || "").trim()) return `Pick where the ${d.linkLabel.trim()} button opens, or clear the label.`;
    }
    return windowProblem(d);
  }

  function footerHtml(d, b, isNew) {
    const key = isNew ? "new" : d.id; const st = state.status[key];
    const problem = problemFor(d);
    const deleteBtn = b && TYPES[b.type].deletable ? `<button type="button" class="btn btn-quiet" data-delete="${b.id}">${icon("trash")}Delete</button>` : "";
    if (d.type === "live") {
      const published = b.status === "published";
      return `<div class="ed-foot"><span class="ed-foot-note">A topic saves with no review. Skip and move open one.</span><span class="grow"></span>${receipt(b.id, { retry: `data-retry="${published ? "unpublish" : "publish"}" data-id="${b.id}"` })}${published ? `<button type="button" class="btn btn-outline" data-unpublish="${b.id}" data-showing="1">Unpublish</button>` : `<button type="button" class="btn btn-primary" data-publish="${b.id}">Publish</button>`}</div>`;
    }
    const dirty = isNew || isDirtyBanner(d.id);
    let left = "";
    if (st) left = receipt(key, { retry: st.kind === "failed" ? `data-retry="${st.retry || "save"}" data-id="${d.id}"` : null });
    else if (dirty) left = `<span class="chip chip-unsaved">${isNew ? "Not saved yet" : "Unsaved"}</span>`;
    const published = b?.status === "published";
    const showing = b ? adminStatus(b, now(), banners()).group === "home" : false;
    const dis = problem ? " disabled" : "";
    let buttons;
    if (isNew) buttons = `<button type="button" class="btn btn-outline" data-save-draft>Save as draft</button><button type="button" class="btn btn-primary" data-publish-new${dis}>Publish${icon("chevron-right")}</button>`;
    else if (published) buttons = `${dirty ? `<button type="button" class="btn btn-ghost" data-discard="${d.id}">Discard</button>` : ""}${b.audience === "admins" && showing ? `<button type="button" class="btn btn-outline" data-widen="${d.id}">${icon("users")}Show to more people</button>` : ""}<button type="button" class="btn btn-outline" data-unpublish="${d.id}" data-showing="${showing ? 1 : 0}">Unpublish</button><button type="button" class="btn btn-primary" data-save="${d.id}"${dis}${dirty ? "" : " disabled"}>Save changes${showing ? icon("chevron-right") : ""}</button>`;
    else buttons = `${dirty ? `<button type="button" class="btn btn-ghost" data-discard="${d.id}">Discard</button>` : ""}<button type="button" class="btn btn-outline" data-save="${d.id}"${dirty ? "" : " disabled"}>Save draft</button><button type="button" class="btn btn-primary" data-publish="${d.id}"${dis}>Publish${icon("chevron-right")}</button>`;
    return `${problem && (dirty || isNew) && !windowProblem(d) ? `<p class="fld-problem">${icon("alert")}${problem}</p>` : ""}<div class="ed-foot">${deleteBtn}${left}<span class="grow"></span>${buttons}</div>`;
  }

  function historyHtml(b) {
    if (!b || !b.history?.length) return "";
    return `<details class="hist"><summary>Changes<span>${b.history.length}</span></summary><ul>${b.history.slice(0, 6).map((h) => `<li><span>${esc(h.what)}</span><span class="hist-who">${esc(h.by)}, ${editFormatter.format(new Date(h.at))}</span></li>`).join("")}</ul></details>`;
  }

  function draftAsBanner(d) {
    const out = { ...d, status: "published" };
    delete out.deleted;
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
    else if (d.id === "new") { chip = ["muted", "Not published"]; note = `Nobody sees it yet. Publish shows it first to ${AUDIENCE_TO[d.audience]}.`; }
    else if (dirty) { chip = ["unsaved", "Unsaved preview"]; note = "Users see the saved version until you save."; }
    else {
      const stt = adminStatus(b, n, banners());
      if (stt.kind === "draft") { chip = ["muted", "Draft"]; note = `Nobody sees it. Publish shows it first to ${AUDIENCE_TO[b.audience]}.`; }
      else { chip = [stt.kind === "now" ? "live" : stt.kind, stt.label]; note = statusLine(b, stt, n, banners()); }
    }
    if (d.type !== "live" && (dirty || d.id === "new")) {
      const ph = phaseOf(draft, n); const w = windowOf(draft);
      if (ph === "before" && w.from) note += ` It shows from ${fmt(w.from).date}.`;
      if (ph === "after") note += " Its window has ended, so nobody would see it.";
    }
    const empty = `<div class="bn-none">Nothing to show.</div>`;
    return `<div class="pv" data-pv-state="${chip[0]}" data-pv-for="${d.id}"><div class="pv-head"><span class="chip chip-${chip[0]}">${chip[1]}</span><span class="pv-note">${note}</span></div><div class="pv-home">${view ? renderBanner(view, hcfg, { inert: true }) : empty}</div></div>`;
  }

  function editorHtml(id) {
    const isNew = id === "new";
    const b = isNew ? null : store().byId(id);
    if (!isNew && !b) return "";
    if (b?.deleted) return deletedPaneHtml(b);
    if (!state.drafts[id]) state.drafts[id] = clone(b);
    const d = state.drafts[id];
    const st = isNew ? { kind: "draft", label: "Draft" } : adminStatus(b, now(), banners());
    const t = TYPES[d.type];
    const closeBtn = cfg.layout === "master" || cfg.editor === "page" ? "" : `<button type="button" class="btn btn-ghost btn-icon ed-close" data-editor-close aria-label="Close the editor">${icon("x")}</button>`;
    const reviewHere = state.review && state.review.id === id;
    if (reviewHere && cfg.review === "step") {
      return `<div class="editor is-review" data-editor="${id}"><div class="ed-body"><div class="ed-main">${reviewHtml()}</div></div></div>`;
    }
    const head = `<div class="ed-head"><div class="ed-head-text"><p class="ed-kicker">${isNew ? "New banner" : "Edit banner"}</p><h2 class="ed-title">${isNew ? `New ${t.name.toLowerCase()}` : esc(bannerTitle(b))}</h2><p class="ed-sub">${isNew ? t.what : `${t.name} · ${esc(statusLine(b, st, now(), banners()))}${editedLine(b) ? ` · ${esc(editedLine(b))}` : ""}`}</p></div>${statusBadge(st)}${closeBtn}</div>`;
    const preview = previewHtml(d, b);
    const form = `<div class="ed-form">${fieldsHtml(d)}</div>`;
    const inlineReview = reviewHere && cfg.review === "inline" && !state.review.date ? reviewHtml() : "";
    const foot = inlineReview ? "" : footerHtml(d, b, isNew);
    const undo = cfg.layout === "master" && !isNew ? rowUndo(id) : "";
    const hist = historyHtml(b);
    const beside = cfg.preview === "beside";
    return `<div class="editor${beside ? " has-beside" : ""}" data-editor="${id}">${head}<div class="ed-body"><div class="ed-main">${beside ? "" : preview}${form}${inlineReview}${foot}${undo}${hist}</div>${beside ? `<aside class="ed-side">${preview}</aside>` : ""}</div></div>`;
  }
  function deletedPaneHtml(b) {
    const st = adminStatus(b, now(), banners());
    return `<div class="editor" data-editor="${b.id}"><div class="ed-head"><div class="ed-head-text"><p class="ed-kicker">Deleted banner</p><h2 class="ed-title">${esc(bannerTitle(b))}</h2><p class="ed-sub">${esc(statusLine(b, st, now(), banners()))}</p></div>${statusBadge(st)}</div><div class="ed-body"><div class="ed-foot"><span class="ed-foot-note">Restore brings it back as a draft. Nobody sees it until you publish again.</span><span class="grow"></span>${receipt("page")}<button type="button" class="btn btn-primary" data-restore="${b.id}">${icon("undo")}Restore as a draft</button></div></div></div>`;
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
    const key = `s:${s.date}`; const st = state.status[key]; const dirty = topicDirty(s.date);
    if (st) return `<div class="save-row">${receipt(key, { retry: st.kind === "failed" && dirty ? `data-ssave="${s.date}"` : null })}${st.kind === "failed" && dirty ? `<button type="button" class="btn btn-ghost" data-scancel="${s.date}">Discard</button>` : ""}</div>`;
    if (dirty) return `<div class="save-row"><span class="chip chip-unsaved">Unsaved</span><button type="button" class="btn btn-primary" data-ssave="${s.date}">Save topic</button><button type="button" class="btn btn-outline" data-scancel="${s.date}">Cancel</button></div>`;
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
    const saved = savedOverrides()[s.date] || {};
    if (saved.skipped) return `<div class="actions"><button type="button" class="btn btn-outline" data-sunskip="${s.date}">${icon("undo")}Restore session</button></div>`;
    const move = saved.movedTo
      ? `<button type="button" class="btn btn-ghost" data-smove="${s.date}">${icon("calendar")}Move again</button><button type="button" class="btn btn-ghost" data-sputback="${s.date}">${icon("undo")}Put back</button>`
      : `<button type="button" class="btn btn-ghost" data-smove="${s.date}">${icon("calendar")}Move</button>`;
    return `<div class="actions"><button type="button" class="btn btn-ghost" data-sskip="${s.date}">${icon("eye-off")}Skip</button>${move}</div>`;
  }
  function moveFormHtml(s) {
    if (state.moveInline !== s.date) return "";
    const form = state.moveForm || wallParts(s.startsAt);
    const target = form.date && form.time ? pacificInstant(`${form.date}T${form.time}`) : null;
    return `<div class="move-form" data-move-form="${s.date}"><p class="fld-label">New date and time, Pacific</p><div class="move-fields"><input class="in in-date" type="date" value="${form.date}" min="${pacificDay(now())}" data-move-date="${s.date}" aria-label="New date"><input class="in in-time" type="time" value="${form.time}" data-move-time="${s.date}" aria-label="New time"></div><p class="move-result">${target ? `Users will see ${esc(whenBoth(target, now()))}` : ""}</p><div class="move-buttons"><button type="button" class="btn btn-primary" data-move-apply="${s.date}">Move session${icon("chevron-right")}</button><button type="button" class="btn btn-outline" data-move-cancel="${s.date}">Cancel</button></div></div>`;
  }
  function sessionReviewHtml(s) {
    const r = state.review;
    if (!r || r.date !== s.date || cfg.review !== "inline") return "";
    return reviewHtml({ compact: true });
  }
  function sessionWhen(s) {
    const own = ownClock(s.startsAt);
    return `<div class="dcell"><b>${fmt(s.startsAt).date}</b><span>${fmt(s.startsAt).clock} Pacific${s.movedTo ? " · moved" : ""}</span><span>${own ? esc(own) + " · " : ""}${relativeDays(s.startsAt, now())}</span></div>`;
  }
  function sessionRow(s) {
    const dirty = topicDirty(s.date); const failed = state.status[`s:${s.date}`]?.kind === "failed";
    const rv = sessionReviewHtml(s);
    return `<tr class="tr tr-session${dirty ? " is-dirty" : ""}${failed ? " is-failed" : ""}${s.past ? " is-past" : ""}" data-srow="${s.date}">
      <td class="td-date">${sessionWhen(s)}</td>
      <td class="td-topic">${sessionTopic(s)}<p class="ed-line">${sessionLine(s)}</p>${moveFormHtml(s)}${sessionUndo(s.date)}</td>
      <td class="td-status">${sessionBadge(s)}</td>
      <td class="td-actions">${sessionActions(s)}${sessionControls(s)}</td>
    </tr>${rv ? `<tr class="tr-review" data-srow-review="${s.date}"><td colspan="4">${rv}</td></tr>` : ""}`;
  }
  function sessionTable(list) {
    return `<div class="tbl-wrap"><table class="tbl tbl-sessions"><thead><tr><th class="td-date">Date</th><th class="td-topic">Topic</th><th class="td-status">Status</th><th class="td-actions"><span class="sr">Actions</span></th></tr></thead><tbody>${list.map(sessionRow).join("")}</tbody></table></div>`;
  }
  function sessionCard(s, heading) {
    const dirty = topicDirty(s.date); const failed = state.status[`s:${s.date}`]?.kind === "failed";
    const own = ownClock(s.startsAt);
    return `<section class="ed sess-card${dirty ? " is-dirty" : ""}${failed ? " is-failed" : ""}" data-srow="${s.date}" aria-label="${fmt(s.startsAt).date}">
      <p class="ed-heading">${heading}</p>
      <div class="ed-top"><div class="dtile${s.skipped ? " is-skipped" : ""}" aria-hidden="true"><b>${fmt(s.startsAt).month}</b><strong>${fmt(s.startsAt).day}</strong></div><div class="ed-when"><b>${fmt(s.startsAt).long}</b><span>${fmt(s.startsAt).clock} Pacific${own ? ` (${esc(own)})` : ""} · ${RULE.durationMinutes} min · ${relativeDays(s.startsAt, now())}${s.movedTo ? ` · was ${fmt(s.scheduledAt).date}` : ""}</span></div><div class="ed-status">${sessionBadge(s)}</div></div>
      <label class="fld-label" for="${uid}-topic-${s.date}">Topic</label>${sessionTopic(s, true)}
      <p class="ed-line">${sessionLine(s)}</p>
      <div class="ed-foot">${sessionActions(s)}${sessionControls(s)}</div>${moveFormHtml(s)}${sessionUndo(s.date)}${sessionReviewHtml(s)}
    </section>`;
  }
  function savedSlots(count) { return savedSessions().list.filter((s) => !s.past && !s.skipped).slice(0, count).map((s) => s.date); }
  function sessionsEditor() {
    const { list } = liveSessions();
    const upcoming = list.filter((s) => !s.past);
    if (cfg.sessions === "table") return `<div class="sess"><p class="fld-label">Sessions<span class="fld-note">Every other Thursday at 11:00 AM Pacific, 60 minutes. A topic saves in the row. Skip and Move show you the consequence first.</span></p>${sessionTable(list)}</div>`;
    const slotDates = savedSlots(1);
    const slots = slotDates.map((d) => upcoming.find((s) => s.date === d)).filter(Boolean);
    const rest = upcoming.filter((s) => !slots.includes(s));
    return `<div class="sess"><div class="sess-slots">${slots.map((s) => sessionCard(s, "Next session")).join("")}</div><p class="fld-label">Later sessions</p>${sessionTable(rest)}</div>`;
  }

  /* ----- layouts ----- */
  function introHtml() {
    return `<p class="intro">Users see one banner at the top of Home, the first in this order that is published, inside its dates and meant for their plan. Dismissing it reveals the next one. Every change tells you who sees what before it happens, and can be undone for 10 seconds.</p>`;
  }
  function pageReceipt() {
    const st = state.status.page || state.status.order;
    const bar = undoBarHtml("top");
    if (!st && !bar) return "";
    const key = state.status.page ? "page" : "order";
    return `<div class="page-receipt" data-page-receipt="${key}">${bar || receipt(key)}</div>`;
  }
  function rowCore(r) {
    const { b } = r;
    return `<b class="row-title">${esc(bannerTitle(b))}</b><p class="row-who">${esc(r.who)}</p>`;
  }
  function tableRow(r, group) {
    const { b, st } = r;
    const open = state.open === b.id && cfg.editor === "inline";
    const deleted = group === "deleted";
    return `<tr class="tr tr-banner${open ? " is-open" : ""}${st.kind === "draft" ? " is-draft" : ""}${st.kind === "ended" || deleted ? " is-past" : ""}${state.drag?.id === b.id ? " is-dragging" : ""}" data-row="${b.id}" data-group="${group}">
      <td class="td-order">${orderControl(r, group)}</td>
      <td class="td-type">${typeCell(b)}</td>
      <td class="td-banner">${rowCore(r)}<p class="row-edited">${esc(r.edited)}</p>${b.type === "live" && !deleted ? quickHtml() : ""}${deleted ? "" : widenButton(r)}${rowUndo(b.id)}</td>
      <td class="td-aud" data-when="${esc(r.when)}">${AUDIENCE_LABEL[b.audience]}</td>
      <td class="td-when">${esc(r.when)}</td>
      <td class="td-status">${statusBadge(st)}${rowReceipt(b.id) ? `<div class="row-rc">${rowReceipt(b.id)}</div>` : ""}</td>
      <td class="td-actions"><div class="actions">${deleted ? restoreButton(r) : `${editButton(r)}${rowMenu(r)}`}</div></td>
    </tr>${open ? `<tr class="tr-editor"><td colspan="7">${editorHtml(b.id)}</td></tr>` : ""}`;
  }
  function newInline() {
    if (state.open !== "new" || cfg.editor !== "inline" || cfg.layout === "master") return "";
    return `<div class="new-inline">${editorHtml("new")}</div>`;
  }
  function groupHead(key, label, count) {
    return `<tr class="tr-group" data-group-head="${key}"><td colspan="7"><span>${label}</span><span class="muted">${count}</span>${GROUP_NOTE[key] ? `<span class="group-note">${GROUP_NOTE[key]}</span>` : ""}</td></tr>`;
  }
  function tableLayout() {
    const g = groups();
    const body = GROUPS.map(([key, label]) => g[key].length ? `${groupHead(key, label, g[key].length)}${g[key].map((r) => tableRow(r, key)).join("")}` : "").join("");
    return `${newInline()}<div class="tbl-wrap"><table class="tbl tbl-banners"><thead><tr><th class="td-order"><span class="sr">Order</span></th><th class="td-type">Type</th><th class="td-banner">Banner</th><th class="td-aud">Audience</th><th class="td-when">When</th><th class="td-status">Status</th><th class="td-actions"><span class="sr">Actions</span></th></tr></thead><tbody>${body}</tbody></table></div>`;
  }
  function heroHtml() {
    const n = now(); const hcfg = lab.hcfg(); const list = banners();
    const hasAdmins = list.some((b) => b.audience === "admins" && !b.deleted && b.status === "published" && phaseOf(b, n) === "in");
    const auds = hasAdmins ? ["free", "pro", "admins"] : ["free", "pro"];
    const own = ownClock(n);
    return `<div class="hero">${auds.map((a) => {
      const q = eligible(list, n, a).map((b) => resolveBanner(b, n)).filter(Boolean);
      const rest = q.slice(1);
      const sched = list.filter((b) => !b.deleted && b.status === "published" && forAudience(b, a) && phaseOf(b, n) === "before").sort((x, y) => windowOf(x).from - windowOf(y).from);
      const who = a === "admins" ? "Admins see" : `${AUDIENCES[a].name} users see`;
      return `<section class="hero-slot" data-aud="${a}"><p class="hero-head"><b>${who}</b><span>${fmt(n).date}, ${fmt(n).clock} Pacific${own ? ` (${esc(own)})` : ""}</span></p><div class="hero-home">${q[0] ? renderBanner(q[0], hcfg, { inert: true }) : `<div class="bn-none">No banner right now.</div>`}</div>${rest.length ? `<p class="hero-next"><b>After a dismiss</b><span>${rest.map((v) => esc(v.title)).join(" · ")}</span></p>` : `<p class="hero-next"><b>After a dismiss</b><span>Nothing. The slot collapses.</span></p>`}${sched.length ? `<p class="hero-next"><b>Scheduled</b><span>${sched.map((b) => `${esc(bannerTitle(b))} from ${fmt(windowOf(b).from).short}`).join(" · ")}</span></p>` : ""}</section>`;
    }).join("")}</div>`;
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
      return `<div class="ml-row${isSel ? " is-selected" : ""}${st.kind === "draft" || st.kind === "ended" || key === "deleted" ? " is-dim" : ""}" role="button" tabindex="0" data-select="${b.id}" data-row="${b.id}" data-group="${key}" aria-pressed="${isSel}">
        ${orderControl(r, key)}<span class="ml-type">${icon(TYPES[b.type].icon)}</span><span class="ml-main"><b>${esc(bannerTitle(b))}</b><span class="ml-who">${esc(r.who)}</span>${isDirtyBanner(b.id) ? '<span class="chip chip-unsaved">Unsaved</span>' : ""}${key === "deleted" ? `<span class="row-cta">${restoreButton(r)}</span>` : ""}${state.selected !== b.id ? rowUndo(b.id) : ""}</span><span class="ml-status">${statusBadge(st)}</span>
      </div>${phone && isSel ? `<div class="ml-inline">${editorHtml(b.id)}</div>` : ""}`;
    }).join("")}` : "").join("");
    const newRow = state.drafts.new ? `<div class="ml-row is-selected is-new" data-select="new" role="button" tabindex="0" aria-pressed="true"><span class="ml-type">${icon(TYPES[state.drafts.new.type].icon)}</span><span class="ml-main"><b>New ${TYPES[state.drafts.new.type].name.toLowerCase()}</b><span class="ml-who">Not saved yet.</span></span></div>${phone ? `<div class="ml-inline">${editorHtml("new")}</div>` : ""}` : "";
    return `<div class="master"><div class="ml">${newRow}${rowsHtml}</div>${phone ? "" : `<div class="md">${sel ? editorHtml(sel) : ""}</div>`}</div>`;
  }

  function overlays() {
    const out = [];
    const wrap = (inner, kind) => {
      if (phone) return `<div class="dlg-layer"><div class="dlg-backdrop" data-overlay-close></div><div class="dlg is-sheet${kind === "review" ? " is-review" : ""}" role="dialog" aria-modal="true"><div class="dlg-handle"></div>${inner}</div></div>`;
      if (kind === "sheet") return `<div class="dlg-layer"><div class="dlg-backdrop" data-overlay-close></div><div class="sheet${state.review && cfg.review === "step" && state.review.id === state.open ? " is-review" : ""}" role="dialog" aria-modal="true">${inner}</div></div>`;
      return `<div class="dlg-layer"><div class="dlg-backdrop" data-overlay-close></div><div class="dlg${kind === "wide" ? " is-wide" : ""}${kind === "review" ? " is-wide is-review" : ""}" role="dialog" aria-modal="true">${inner}</div></div>`;
    };
    if (state.open && cfg.layout !== "master" && cfg.editor === "sheet") out.push(wrap(editorHtml(state.open), "sheet"));
    if (state.create === "picker") out.push(wrap(pickerHtml(), "wide"));
    if (state.review && cfg.review === "dialog") out.push(wrap(reviewHtml(), "review"));
    if (state.confirm) {
      const c = state.confirm;
      const inner = `<h2 class="dlg-title">Discard unsaved changes?</h2><p class="dlg-text">${c.id === "new" ? "This new banner has not been saved." : "Users keep seeing the saved version."}</p><div class="dlg-foot"><button type="button" class="btn btn-outline" data-confirm-no>Keep editing</button><button type="button" class="btn btn-danger" data-confirm-yes>Discard changes</button></div>`;
      out.push(wrap(inner, "dialog"));
    }
    return out.join("");
  }

  function pageHtml() {
    let body;
    if (cfg.editor === "page" && state.open && cfg.layout !== "master") {
      body = `<a class="back" href="#" data-editor-close>${icon("arrow-left")}Banners</a>${editorHtml(state.open)}`;
    } else {
      const layouts = { table: tableLayout, hero: () => heroHtml() + tableLayout(), master: masterLayout };
      body = `${introHtml()}${pageReceipt()}${templatesRow()}${layouts[cfg.layout]()}`;
    }
    const shell = phone ? adminShellPhone(body, createControl()) : adminShellDesktop(body, createControl());
    return shell + overlays() + undoToastHtml();
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
      const keys = ["field", "quickTopic", "stopic", "moveDate", "moveTime", "handle", "switch", "linkPick", "rvAud"];
      for (const k of keys) if (active.dataset[k] !== undefined) { focusSel = `[data-${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}="${active.dataset[k]}"]`; break; }
      if (focusSel && active.matches("input") && (active.type === "text" || active.type === "url")) range = [active.selectionStart, active.selectionEnd];
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
    state.open = id; state.selected = id; state.menu = null; state.create = null; state.review = null;
    render();
  }
  function requestClose() {
    const id = state.open;
    if (!id) return;
    if (state.review && state.review.id === id) { closeReview(); return; }
    const dirty = id === "new" ? true : isDirtyBanner(id);
    if (dirty && !(state.status[id]?.kind === "saving")) { state.confirm = { kind: "discard", id }; render(); return; }
    closeEditor();
  }
  function closeEditor() {
    const id = state.open;
    if (id === "new") { delete state.drafts.new; if (state.selected === "new") state.selected = null; }
    else if (id) { state.drafts[id] = null; state.sdrafts = {}; state.moveInline = null; }
    state.open = null; state.confirm = null; state.review = null;
    render();
  }
  function draftFor(id) { if (!state.drafts[id]) state.drafts[id] = clone(store().byId(id)); return state.drafts[id]; }
  function startWiden(id, fromRow) {
    const d = draftFor(id);
    d.audience = "everyone";
    if (cfg.layout === "master") state.selected = id;
    openReview("widen", { id, fromRow });
  }
  function retry(kind, id) {
    if (kind === "publish") { if (id === "new") saveNew(true); else if (state.drafts[id] && isDirtyBanner(id)) saveBanner(id, { publish: true }); else setPublished(id, true); }
    else if (kind === "unpublish") { if (state.drafts[id] && isDirtyBanner(id)) saveBanner(id, { publish: false }); else setPublished(id, false); }
    else if (kind === "draft") saveNew(false);
    else saveBanner(id);
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
    if (t.matches("[data-link-pick]")) {
      const ed = t.closest("[data-editor]"); const d = state.drafts[ed.dataset.editor]; if (!d) return;
      d.link = t.value === "web" ? "https://" : t.value;
      delete state.status[ed.dataset.editor];
      render();
      if (t.value === "web") { const el = root.querySelector(`[data-editor="${ed.dataset.editor}"] input[data-field="link"]`); if (el) { el.focus({ preventScroll: true }); el.setSelectionRange(el.value.length, el.value.length); } }
      return;
    }
    if (t.matches("[data-move-date], [data-move-time]")) {
      const wrap = t.closest("[data-move-form]");
      state.moveForm = { date: wrap.querySelector("[data-move-date]").value, time: wrap.querySelector("[data-move-time]").value };
      return render();
    }
  });
  root.addEventListener("toggle", (e) => {
    const t = e.target; if (t.matches && t.matches("[data-more]")) state.more[t.dataset.more] = t.open;
  }, true);
  root.addEventListener("keydown", (e) => {
    const t = e.target;
    if (e.key === "Escape") {
      if (state.confirm) { state.confirm = null; return render(); }
      if (state.review) return closeReview();
      if (state.menu || state.create) { state.menu = null; state.create = null; return render(); }
      if (state.moveInline) { state.moveInline = null; return render(); }
      if (state.open && cfg.layout !== "master" && cfg.editor !== "inline") return requestClose();
      return;
    }
    if (e.key === "Enter" && t.matches("[data-quick-topic]")) { e.preventDefault(); if (state.quick !== null) saveQuick(); return; }
    if (e.key === "Enter" && t.matches("[data-stopic]")) { e.preventDefault(); if (topicDirty(t.dataset.stopic)) saveTopic(t.dataset.stopic); return; }
    if ((e.key === " " || e.key === "Enter") && t.matches("[data-switch], [data-select]")) { e.preventDefault(); t.click(); return; }
    if (t.matches("[data-handle]") && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); moveWithin(t.dataset.handle, e.key === "ArrowUp" ? -1 : 1); return; }
  });
  root.addEventListener("pointerover", (e) => { if (state.undo && e.target.closest("[data-undo]")) state.undo.paused = true; });
  root.addEventListener("pointerout", (e) => { if (state.undo && e.target.closest("[data-undo]") && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest("[data-undo]"))) state.undo.paused = false; });

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
  root.addEventListener("pointerup", () => {
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
    if ((el = a("details.more > summary"))) { const d = el.parentElement; state.more[d.dataset.more] = !d.open; return; }
    if ((el = a("[data-undo-do]"))) return undoLast();
    if ((el = a("[data-undo-close]"))) { clearUndo(); return render(); }
    if ((el = a("[data-review-cancel]"))) return closeReview();
    if ((el = a("[data-review-confirm]"))) return confirmReview();
    if ((el = a("[data-rv-aud]"))) { const d = reviewDraft(); if (d) { d.audience = el.dataset.rvAud; delete state.status[state.review.id]; } return render(); }
    if ((el = a("[data-create-open]"))) { state.create = "picker"; state.menu = null; return render(); }
    if ((el = a("[data-create-close]"))) { state.create = null; return render(); }
    if ((el = a("[data-create-menu]"))) { state.create = state.create === "menu" ? null : "menu"; state.menu = null; return render(); }
    if ((el = a("[data-new]"))) return startNew(el.dataset.new);
    if ((el = a("[data-quick-save]"))) return saveQuick();
    if ((el = a("[data-quick-cancel]"))) { state.quick = null; delete state.status.quick; return render(); }
    if ((el = a("[data-edit]"))) { const id = el.dataset.edit; if (state.open === id && cfg.editor === "inline") { return requestClose(); } return openEditor(id); }
    if ((el = a("[data-editor-close]"))) { e.preventDefault(); return requestClose(); }
    if ((el = a("[data-overlay-close]"))) { if (state.confirm) { state.confirm = null; return render(); } if (state.review && cfg.review === "dialog") return closeReview(); if (state.create === "picker") { state.create = null; return render(); } return requestClose(); }
    if ((el = a("[data-confirm-no]"))) { state.confirm = null; return render(); }
    if ((el = a("[data-confirm-yes]"))) { state.confirm = null; return closeEditor(); }
    if ((el = a("[data-retry]"))) return retry(el.dataset.retry, el.dataset.id);
    if ((el = a("[data-save-draft]"))) return saveNew(false);
    if ((el = a("[data-publish-new]"))) return openReview("publish", { id: "new" });
    if ((el = a("[data-save]"))) { const id = el.dataset.save; const b = store().byId(id); if (b.status === "published") return openReview("save", { id }); return saveBanner(id); }
    if ((el = a("[data-discard]"))) { state.drafts[el.dataset.discard] = null; delete state.status[el.dataset.discard]; state.review = null; return render(); }
    if ((el = a("[data-publish]"))) { const id = el.dataset.publish; state.menu = null; const fromRow = state.open !== id && !(cfg.layout === "master" && state.selected === id); draftFor(id); if (cfg.layout === "master") state.selected = id; return openReview("publish", { id, fromRow }); }
    if ((el = a("[data-unpublish]"))) { const id = el.dataset.unpublish; state.menu = null; if (el.dataset.showing === "1") { const fromRow = state.open !== id && !(cfg.layout === "master" && state.selected === id); draftFor(id); if (cfg.layout === "master") state.selected = id; return openReview("unpublish", { id, fromRow }); } if (state.drafts[id] && isDirtyBanner(id)) return saveBanner(id, { publish: false }); return setPublished(id, false); }
    if ((el = a("[data-widen]"))) { const id = el.dataset.widen; state.menu = null; return startWiden(id, state.open !== id && !(cfg.layout === "master" && state.selected === id)); }
    if ((el = a("[data-delete]"))) { state.menu = null; return deleteBanner(el.dataset.delete); }
    if ((el = a("[data-restore]"))) { state.menu = null; return restoreBanner(el.dataset.restore); }
    if ((el = a("[data-menu]"))) { state.menu = state.menu === el.dataset.menu ? null : el.dataset.menu; state.create = null; return render(); }
    if ((el = a("[data-move-up]"))) return moveWithin(el.dataset.moveUp, -1);
    if ((el = a("[data-move-down]"))) return moveWithin(el.dataset.moveDown, 1);
    if ((el = a("[data-switch]"))) { const ed = el.closest("[data-editor]"); const d = state.drafts[ed.dataset.editor]; const k = el.dataset.switch; const cur = (d[k] ?? BOOL_DEFAULT[k] ?? false) !== false; d[k] = !cur; delete state.status[ed.dataset.editor]; return render(); }
    if ((el = a("[data-sskip]"))) return openReview("skip", { id: "live-training", date: el.dataset.sskip });
    if ((el = a("[data-sunskip]"))) return openReview("unskip", { id: "live-training", date: el.dataset.sunskip });
    if ((el = a("[data-ssave]"))) return saveTopic(el.dataset.ssave);
    if ((el = a("[data-scancel]"))) { delete state.sdrafts[el.dataset.scancel]; delete state.status[`s:${el.dataset.scancel}`]; return render(); }
    if ((el = a("[data-smove]"))) { const s = liveSessions().list.find((x) => x.date === el.dataset.smove); state.moveInline = s.date; state.moveForm = wallParts(s.startsAt); state.review = null; return render(); }
    if ((el = a("[data-sputback]"))) return openReview("putback", { id: "live-training", date: el.dataset.sputback });
    if ((el = a("[data-move-apply]"))) { const f = state.moveForm; const date = el.dataset.moveApply; if (!(f?.date && f?.time)) return; const wall = `${f.date}T${f.time}`; if (wall === `${date}T${RULE.startTime}`) return openReview("putback", { id: "live-training", date }); return openReview("move", { id: "live-training", date, target: wall }); }
    if ((el = a("[data-move-cancel]"))) { state.moveInline = null; return render(); }
    if ((el = a("[data-select]")) && !a("button, input, select, label, .handle, .updown, [data-undo]")) { const id = el.dataset.select; state.selected = id; state.open = id; state.menu = null; state.review = null; if (id !== "new" && !state.drafts[id] && !store().byId(id)?.deleted) state.drafts[id] = clone(store().byId(id)); return render(); }
    if (state.menu && !a(".menu-wrap")) { state.menu = null; render(); }
    if (state.create === "menu" && !a(".menu-wrap")) { state.create = null; render(); }
  });

  /* ----- The mistake cases the lab bar sets up. `act` performs the final step in this frame. ----- */
  const NEXT_DATE = "2026-11-05";
  function mistake(id, { act = true } = {}) {
    if (id === "offer-everyone") {
      startNew("blank-offer"); const d = state.drafts.new;
      d.headline = "Get Pro for 20% off"; d.link = "/settings/subscription"; d.linkLabel = "Upgrade"; d.showEnd = true;
      openReview("publish", { id: "new" }); return;
    }
    if (id === "broken-link") {
      startNew("feature"); const d = state.drafts.new;
      d.headline = "Teleprompter is here"; d.body = "Read your script while you record."; d.link = "https://lp.clarity.video/broken-page";
      openReview("publish", { id: "new" }); return;
    }
    if (id === "skip-next") {
      if (cfg.layout === "master") { state.selected = "live-training"; state.open = "live-training"; draftFor("live-training"); } else openEditor("live-training");
      if (!act) return;
      openReview("skip", { id: "live-training", date: NEXT_DATE });
      confirmReview();
      return;
    }
    if (id === "delete-restore") { if (act) deleteBanner("announcement-teleprompter"); else render(); return; }
    if (id === "edit-headline") {
      if (cfg.layout === "master") { state.selected = "announcement-teleprompter"; state.open = "announcement-teleprompter"; } else openEditor("announcement-teleprompter");
      const d = draftFor("announcement-teleprompter"); d.headline = "Teleprompter is live";
      openReview("save", { id: "announcement-teleprompter" }); return;
    }
    if (id === "offer-60") {
      startNew("offer"); const d = state.drafts.new; d.headline = "Get Pro for 20% off"; d.until = plusDays(now(), 60, "17:00"); render(); return;
    }
    if (id === "notice-week") {
      startNew("maintenance"); const d = state.drafts.new; d.headline = "Scheduled maintenance Sunday 2:00 to 3:00 AM Pacific"; d.until = plusDays(now(), 7, "17:00"); render(); return;
    }
    if (id === "admins-first") {
      if (!act) { render(); return; }
      startNew("feature"); const d = state.drafts.new; d.headline = "Captions in 12 languages"; d.body = "Pick a language from the share menu."; d.link = "/record"; d.audience = "admins";
      openReview("publish", { id: "new" });
      confirmReview();
      return;
    }
  }

  render();

  return {
    state, render, mistake,
    setConfig(next) {
      const changed = next.layout !== cfg.layout || next.editor !== cfg.editor;
      cfg = { ...next }; state.menu = null; state.create = null; state.confirm = null; state.moveInline = null; state.review = null;
      if (cfg.layout === "master") { ensureSelected(); state.open = state.selected; }
      else if (changed) { state.open = null; delete state.drafts.new; }
      render();
    },
    reset() {
      for (const t of Object.values(state.timers)) clearTimeout(t);
      clearInterval(state.undoTick); clearTimeout(state.flashTimer);
      Object.assign(state, blank());
      if (cfg.layout === "master") { ensureSelected(); state.open = state.selected; }
      render();
    },
    get config() { return cfg; },
    isDirtyBanner, savedSessions, liveSessions, groups, undoLast, openReview, confirmReview, startNew,
  };
}
