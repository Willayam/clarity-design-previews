/* Rendering and the interactive admin app. Each frame (desktop, phone) owns one app instance. */

function icon(name, cls) {
  return `<svg class="${cls || ""}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}
function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }

const LOGO = `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true" style="fill:none;stroke:none"><circle cx="16" cy="16" r="16" fill="oklch(0.546 0.215 262.9)"/><path d="M22.5 10.2A8.4 8.4 0 1 0 22.5 21.8" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><path d="M14.2 12.2v7.6l6.4-3.8z" fill="#fff"/></svg>`;

/* ---------- Shell mock (matches the Users and Organizations screenshots) ---------- */

function tabsHtml() {
  return `<nav class="m-tabs" aria-label="Admin"><span>Users</span><span>Organizations</span><span class="is-active">Live trainings</span></nav>`;
}

function shellDesktop(bodyHtml) {
  return `<div class="m-desktop">
    <aside class="m-side">
      <div class="m-logo">${LOGO}<span class="word">Clarity</span><span class="collapse">${icon("panel-left")}</span></div>
      <nav class="m-nav">
        <a>${icon("house")}Home</a>
        <a>${icon("users")}Leads</a>
        <a class="is-active">${icon("shield")}Admin</a>
      </nav>
      <div class="m-account"><span class="avatar">C</span><span class="name"></span>${icon("chevrons")}</div>
    </aside>
    <div class="m-main" data-scroll>
      <div class="m-head"><h1>Admin</h1></div>
      ${tabsHtml()}
      <div class="m-body">${bodyHtml}</div>
    </div>
  </div>`;
}

function shellPhone(bodyHtml) {
  return `<div class="m-phone">
    <div class="m-main" data-scroll>
      <div class="m-head"><h1>Admin</h1></div>
      ${tabsHtml()}
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

/* ---------- The shipped banner (LiveTrainingBanner.tsx) and Help card (LiveTrainingCard.tsx) ---------- */

function bannerHtml(session) {
  if (!session) return `<div class="bn-empty">No upcoming session. The banner is not shown.</div>`;
  const f = fmt(session.startsAt);
  const live = session.live;
  const tag = timingTag(session);
  return `<aside class="bn" data-live="${live ? 1 : 0}" aria-label="Next live training">
    <div class="bn-tile" aria-hidden="true"><b>${f.month}</b><strong>${f.day}</strong></div>
    <div class="bn-text">
      <p class="bn-eyebrow"><span>${session.topic ? "Live with Todd Hartley" : "Free live training"}</span><span class="bn-tag">${live ? '<span class="bn-dot"></span>' : ""}${tag}</span></p>
      <h2 class="bn-title">${esc(session.topic || DEFAULT_TITLE)}</h2>
      <p class="bn-meta"><time>${f.date}</time> · ${f.time} · ${RULE.durationMinutes} min<span class="tail">${session.topic ? " · Free, no sign-up" : " · Every other Thursday"}</span></p>
    </div>
    <a class="bn-cta" href="${LANDING_URL}" target="_blank" rel="noopener noreferrer">${icon(live ? "play" : "calendar-plus")}${live ? "Join live" : "Add to calendar"}</a>
    <span class="bn-close" aria-label="Dismiss">${icon("x")}</span>
  </aside>`;
}

function helpCardHtml(session) {
  if (!session) return `<div class="bn-empty">No upcoming session. The card is not shown.</div>`;
  const f = fmt(session.startsAt);
  return `<div class="hc-wrap"><p class="hc-heading">Upcoming live training</p><article class="hc">
    <div class="hc-text">
      <h3>${esc(session.topic || DEFAULT_TITLE)}</h3>
      <p class="hc-when">${f.date} · ${f.time} · ${RULE.durationMinutes} min</p>
      <p class="hc-desc">A free live session for Clarity users every other Thursday. See this session's topic and add it to your calendar.</p>
    </div>
    <span class="btn btn-primary">View details</span>
  </article></div>`;
}

/* ---------- The admin app ---------- */

function createAdminApp({ root, config, env }) {
  const state = {
    saved: clone(OVERRIDES),
    draft: clone(OVERRIDES),
    active: null,
    status: {},          // date -> { kind: "saving" | "saved" | "failed" }
    bar: null,           // null | "saving" | "saved" | "failed"
    dialog: null,        // { kind: "edit" | "move" | "skip" | "preview", date, form }
    menu: null,
    moveInline: null,
    month: null,         // calendar month shown on a phone, "YYYY-MM"
    timers: {},
    caret: null,
  };
  let cfg = { ...config };
  let app = env;

  const now = () => app.now;
  const sessions = () => buildSessions(state.draft, now());
  const savedSessions = () => buildSessions(state.saved, now());
  const norm = (o) => JSON.stringify({ topic: o?.topic || null, skipped: !!o?.skipped, movedTo: o?.movedTo || null });
  const isDirty = (date) => norm(state.draft[date]) !== norm(state.saved[date]);
  const dirtyDates = () => scheduledDates().filter(isDirty);
  const ov = (date) => (state.draft[date] ||= { topic: null, skipped: false, movedTo: null, editedBy: null, editedAt: null });
  const byDate = (list, date) => list.find((s) => s.date === date);

  function ensureActive(list) {
    if (state.active && byDate(list, state.active)) return;
    const next = list.find((s) => s.isNext) || list.find((s) => !s.past) || list[0];
    state.active = next ? next.date : null;
  }

  /* ----- saving ----- */
  function save(dates) {
    dates = dates.filter((d) => isDirty(d) || state.status[d]?.kind === "failed");
    if (!dates.length) return;
    for (const d of dates) { clearTimeout(state.timers[d]); state.status[d] = { kind: "saving" }; }
    if (cfg.editing === "bar") state.bar = "saving";
    if (state.dialog?.kind === "edit") state.dialog.status = "saving";
    render();
    const fail = app.consumeFail();
    setTimeout(() => {
      for (const d of dates) {
        if (fail) { state.status[d] = { kind: "failed" }; continue; }
        const o = ov(d);
        state.saved[d] = { ...clone(o), editedBy: CURRENT_ADMIN, editedAt: now().toISOString() };
        state.draft[d] = clone(state.saved[d]);
        state.status[d] = { kind: "saved" };
        setTimeout(() => { if (state.status[d]?.kind === "saved") { delete state.status[d]; render(); } }, 2500);
      }
      if (cfg.editing === "bar") {
        state.bar = fail ? "failed" : "saved";
        if (!fail) setTimeout(() => { if (state.bar === "saved") { state.bar = null; render(); } }, 2500);
      }
      if (state.dialog?.kind === "edit") {
        if (fail) state.dialog.status = "failed";
        else state.dialog = null;
      }
      render();
    }, 650);
  }

  function cancel(date) {
    clearTimeout(state.timers[date]);
    state.draft[date] = clone(state.saved[date] || { topic: null, skipped: false, movedTo: null });
    delete state.status[date];
    if (state.moveInline === date) state.moveInline = null;
    render();
  }

  function afterChange(date, { immediate } = {}) {
    delete state.status[date];
    if (cfg.editing === "auto") {
      clearTimeout(state.timers[date]);
      if (immediate) save([date]);
      else state.timers[date] = setTimeout(() => save([date]), 700);
    } else if (cfg.editing === "dialog") {
      save([date]);
    }
    if (cfg.editing === "bar" && state.bar) state.bar = null;
  }

  function setTopic(date, value) {
    const o = ov(date);
    o.topic = value.trim() ? value.slice(0, TOPIC_MAX) : null;
    afterChange(date);
  }
  function setSkipped(date, skipped) {
    ov(date).skipped = skipped;
    afterChange(date, { immediate: true });
  }
  function setMovedTo(date, wall) {
    const o = ov(date);
    o.movedTo = wall && wall !== `${date}T${RULE.startTime}` ? wall : null;
    state.moveInline = null;
    afterChange(date, { immediate: true });
  }

  /* ----- pieces ----- */
  const topicPlaceholder = DEFAULT_TITLE;

  function statusBadge(s) {
    if (s.past) return `<span class="badge badge-muted">Past</span>`;
    if (s.live) return `<span class="badge badge-live"><i class="dot"></i>Live now</span>`;
    if (s.skipped) return `<span class="badge badge-skip">Skipped</span>`;
    if (s.isNext) return `<span class="badge badge-now">On Home now</span>`;
    if (s.movedTo) return `<span class="badge badge-moved">Moved</span>`;
    return `<span class="badge badge-up">Upcoming</span>`;
  }

  function statusLine(s) {
    const bits = [];
    if (s.skipped && !s.past && !s.showsAfter) bits.push(s.fallback ? `Home shows ${fmt(s.fallback.startsAt).short} instead.` : "No later session to show.");
    if (s.movedTo && !s.past) bits.push(`Was ${fmt(s.scheduledAt).date}.`);
    if (s.editedBy) bits.push(`Edited by ${esc(s.editedBy)}, ${editFormatter.format(new Date(s.editedAt))}.`);
    return bits.filter(Boolean).join(" ");
  }

  function dateCell(s, { tile = false, long = false } = {}) {
    const f = fmt(s.startsAt);
    if (tile) return `<div class="dtile${s.skipped ? " is-skipped" : ""}${s.past ? " is-past" : ""}" aria-hidden="true"><b>${f.month}</b><strong>${f.day}</strong></div>`;
    return `<div class="dcell"><b>${long ? f.long : f.date}</b><span>${f.clock}${s.movedTo ? ` · moved` : ""}</span></div>`;
  }

  function receipt(s, { retry = true } = {}) {
    const st = state.status[s.date];
    if (st?.kind === "saving") return `<span class="rc rc-saving"><i class="spin"></i>Saving</span>`;
    if (st?.kind === "saved") return `<span class="rc rc-saved">${icon("check")}Saved</span>`;
    if (st?.kind === "failed") return `<span class="rc rc-failed">${icon("alert")}Not saved</span>${retry ? `<button type="button" class="btn btn-outline" data-retry="${s.date}">Try again</button>` : ""}`;
    return "";
  }

  function saveControls(s) {
    const dirty = isDirty(s.date);
    const st = state.status[s.date];
    if (cfg.editing === "row") {
      if (st) return `<div class="save-row">${receipt(s)}${st.kind === "failed" ? `<button type="button" class="btn btn-ghost" data-cancel="${s.date}">Discard</button>` : ""}</div>`;
      if (dirty) return `<div class="save-row"><span class="chip chip-unsaved">Unsaved</span><button type="button" class="btn btn-primary" data-save="${s.date}">Save</button><button type="button" class="btn btn-outline" data-cancel="${s.date}">Cancel</button></div>`;
      return "";
    }
    if (cfg.editing === "auto") {
      if (st) return `<div class="save-row">${receipt(s)}</div>`;
      if (dirty) return `<div class="save-row"><span class="chip chip-unsaved">Unsaved</span></div>`;
      return "";
    }
    if (cfg.editing === "bar") {
      if (st?.kind === "failed") return `<div class="save-row">${receipt(s, { retry: false })}</div>`;
      if (st?.kind === "saved") return `<div class="save-row">${receipt(s)}</div>`;
      if (dirty) return `<div class="save-row"><span class="chip chip-unsaved">Unsaved</span></div>`;
      return "";
    }
    if (cfg.editing === "dialog") {
      if (st) return `<div class="save-row">${receipt(s)}</div>`;
      return "";
    }
    return "";
  }

  function topicField(s, { big = false } = {}) {
    const o = state.draft[s.date] || {};
    const value = o.topic || "";
    const st = state.status[s.date];
    if (s.past) return `<div class="topic-ro is-past">${esc(s.topic || "No topic. Users saw the default title.")}</div>`;
    if (cfg.editing === "dialog") {
      return `<div class="topic-ro-row"><div class="topic-ro${value ? "" : " is-empty"}">${esc(value || "No topic yet. Users see the default title.")}</div><button type="button" class="btn btn-outline" data-edit="${s.date}">${icon("pencil")}Edit</button></div>`;
    }
    const count = value.length >= 60 ? `<span class="count">${value.length}/${TOPIC_MAX}</span>` : "";
    return `<div class="topic-wrap${big ? " is-big" : ""}">
      <input id="topic-${s.date}" class="in${st?.kind === "failed" ? " is-failed" : ""}" type="text" maxlength="${TOPIC_MAX}" data-topic="${s.date}" value="${esc(value)}" placeholder="${esc(topicPlaceholder)}" aria-label="Topic for ${fmt(s.startsAt).date}"${s.skipped ? " disabled" : ""}>
      ${count}
    </div>`;
  }

  function skipControl(s, { inDialog = false } = {}) {
    if (s.past) return "";
    const o = state.draft[s.date] || {};
    const skipped = inDialog ? state.dialog.form.skipped : !!o.skipped;
    const attr = inDialog ? `data-dlg-skip-toggle="1"` : `data-skip-toggle="${s.date}"`;
    if (cfg.skip === "switch") {
      return `<label class="sw-label"><span class="sw" role="switch" aria-checked="${skipped}" tabindex="0" ${attr}><i></i></span><span>Skip this session</span></label>`;
    }
    if (cfg.skip === "button") {
      return `<button type="button" class="btn ${skipped ? "btn-outline" : "btn-quiet"}" ${attr}>${skipped ? `${icon("undo")}Restore session` : "Skip this session"}</button>`;
    }
    return "";
  }

  function moveTrigger(s) {
    if (s.past || cfg.skip === "menu") return "";
    const o = state.draft[s.date] || {};
    if (o.skipped) return "";
    if (o.movedTo) return `<button type="button" class="btn btn-ghost" data-move="${s.date}">${icon("calendar")}Move again</button><button type="button" class="btn btn-ghost" data-putback="${s.date}">${icon("undo")}Put back</button>`;
    return `<button type="button" class="btn btn-ghost" data-move="${s.date}">${icon("calendar")}Move session</button>`;
  }

  function menuControl(s, { labelled = false } = {}) {
    if (s.past || cfg.skip !== "menu") return "";
    const o = state.draft[s.date] || {};
    const open = state.menu === s.date;
    const trigger = labelled
      ? `<button type="button" class="btn btn-outline" data-menu="${s.date}" aria-expanded="${open}">Actions${icon("ellipsis")}</button>`
      : `<button type="button" class="btn btn-ghost btn-icon" data-menu="${s.date}" aria-label="More actions for ${fmt(s.startsAt).date}" aria-expanded="${open}">${icon("ellipsis")}</button>`;
    return `<div class="menu-wrap">${trigger}
      ${open ? `<div class="menu-pop" role="menu">
        ${o.skipped ? "" : `<button type="button" role="menuitem" data-menu-move="${s.date}">${icon("calendar")}Move session</button>`}
        ${o.movedTo ? `<button type="button" role="menuitem" data-menu-putback="${s.date}">${icon("undo")}Put back to ${fmt(s.scheduledAt).short}</button>` : ""}
        <button type="button" role="menuitem" data-menu-skip="${s.date}">${o.skipped ? `${icon("undo")}Restore session` : `${icon("x")}Skip this session`}</button>
      </div>` : ""}</div>`;
  }

  function pickOptions(s, form) {
    const sched = s.scheduledAt;
    const taken = new Set(sessions().list.filter((x) => x.date !== s.date).map((x) => pacificDay(x.startsAt)));
    const today = pacificDay(now());
    const days = [];
    for (let w = -1; w <= 1; w++) for (const off of [-1, 0, 1]) {
      const d = new Date(sched.getTime() + (w * 7 + off) * 86_400_000);
      const day = pacificDay(d);
      if (day < today || taken.has(day)) continue;
      days.push({ day, label: `${fmt(d).date}${day === pacificDay(sched) ? " (scheduled)" : ""}` });
    }
    const times = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
    const tl = (t) => { const h = Number(t.slice(0, 2)); return `${h % 12 || 12}:00 ${h < 12 ? "AM" : "PM"}`; };
    return `<select class="sel" data-pick-day="${s.date}" aria-label="Day">${days.map((d) => `<option value="${d.day}"${d.day === form.date ? " selected" : ""}>${d.label}</option>`).join("")}</select>
      <select class="sel sel-time" data-pick-time="${s.date}" aria-label="Time">${times.map((t) => `<option value="${t}"${t === form.time ? " selected" : ""}>${tl(t)}</option>`).join("")}</select>`;
  }

  function moveForm(s, form, { inDialog = false } = {}) {
    const target = form.date && form.time ? pacificInstant(`${form.date}T${form.time}`) : null;
    const result = target ? `Users will see ${fmt(target).date} · ${fmt(target).time}` : "";
    const fields = cfg.move === "pick"
      ? pickOptions(s, form)
      : `<input class="in in-date" type="date" value="${form.date}" min="${pacificDay(now())}" data-move-date="${s.date}" aria-label="New date"><input class="in in-time" type="time" value="${form.time}" data-move-time="${s.date}" aria-label="New time">`;
    const buttons = inDialog ? "" : `<button type="button" class="btn btn-primary" data-move-apply="${s.date}">Move session</button><button type="button" class="btn btn-outline" data-move-cancel="${s.date}">Cancel</button>`;
    return `<div class="move-form" data-move-form="${s.date}"><div class="move-fields">${fields}</div><p class="move-result">${result}</p>${buttons ? `<div class="move-buttons">${buttons}</div>` : ""}</div>`;
  }

  function inlineMove(s) {
    if (state.moveInline !== s.date || cfg.move === "dialog") return "";
    const form = state.moveForm || wallParts(s.startsAt);
    return moveForm(s, form);
  }

  function previewButton(s) {
    if (cfg.preview !== "sheet" || s.past) return "";
    return `<button type="button" class="btn btn-outline" data-preview="${s.date}">${icon("eye")}Preview</button>`;
  }

  function textPreview(s) {
    if (cfg.preview !== "none" || s.past) return "";
    const d = byDate(sessions().list, s.date);
    const shown = d.skipped ? d.fallback : d;
    if (!shown) return `<p class="text-pv">Users see no banner.</p>`;
    const f = fmt(shown.startsAt);
    const dirty = isDirty(s.date);
    return `<p class="text-pv">${dirty ? "After Save, users" : "Users"} see <b>${esc(shown.topic || DEFAULT_TITLE)}</b> for ${f.date} on Home and Help.${d.skipped ? ` This date is skipped.` : ""}</p>`;
  }

  /* The preview block for one session, from the draft. After a failed save it shows the saved version, which is what users see. */
  function previewBlock(s, { pinned = false, compact = false } = {}) {
    const list = sessions().list;
    const d = byDate(list, s.date) || s;
    const savedNext = savedSessions().next;
    const st = state.status[d.date];
    const dirty = isDirty(d.date);
    let shown = d.skipped || d.past ? (d.past ? sessions().next : d.fallback) : d;
    let chip, note;
    const anyFailed = Object.values(state.status).some((x) => x.kind === "failed") || state.bar === "failed";
    if (pinned && anyFailed) {
      shown = savedNext;
      chip = ["failed", "Not saved"]; note = "Your change did not save. This is what users still see.";
    } else if (pinned) {
      const anyDirty = dirtyDates().length > 0;
      const nextChanged = savedNext?.date !== shown?.date;
      if (nextChanged && anyDirty) { chip = ["unsaved", "Unsaved preview"]; note = `After Save, Home shows ${shown ? fmt(shown.startsAt).short : "no banner"} instead of ${savedNext ? fmt(savedNext.startsAt).short : "nothing"}.`; }
      else if (shown && isDirty(shown.date)) { chip = ["unsaved", "Unsaved preview"]; note = "Users see the saved version until you press Save."; }
      else { chip = ["live", "On Home now"]; note = "What every Clarity user sees on Home and Help."; }
    } else if (d.past) {
      chip = ["muted", "Past session"]; note = shown ? `This session is over. Home shows ${fmt(shown.startsAt).short}.` : "This session is over.";
    } else if (st?.kind === "failed") {
      const sv = byDate(savedSessions().list, d.date);
      shown = sv.skipped ? sv.fallback : sv;
      chip = ["failed", "Not saved"]; note = "Your change did not save. This is what users still see.";
    } else if (d.skipped) {
      chip = dirty ? ["unsaved", "Unsaved"] : ["skip", "Skipped"];
      note = shown ? `${dirty ? "After Save, " : ""}Home shows ${fmt(shown.startsAt).short} instead of ${fmt(d.scheduledAt).short}.` : "No later session to show.";
    } else if (dirty) {
      chip = ["unsaved", "Unsaved preview"]; note = d.isNext ? "Users see the saved version until you press Save." : `Shows on Home after the ${d.showsAfter ? fmt(d.showsAfter.startsAt).short : "current"} session, once saved.`;
    } else if (d.isNext) {
      chip = ["live", "On Home now"]; note = "What every Clarity user sees on Home and Help.";
    } else {
      chip = ["up", "Upcoming"]; note = `Shows on Home after the ${d.showsAfter ? fmt(d.showsAfter.startsAt).short : "current"} session.`;
    }
    const helpOpen = state.helpOpen ?? false;
    return `<div class="pv${compact ? " is-compact" : ""}${pinned ? " is-pinned" : ""}" data-pv-state="${chip[0]}" data-pv-for="${d.date}" data-help="${helpOpen ? "open" : "closed"}">
      <div class="pv-head"><span class="chip chip-${chip[0]}">${chip[1]}</span><span class="pv-note">${note}</span></div>
      <div class="pv-label">Home</div>
      <div class="pv-home">${bannerHtml(shown)}</div>
      <div class="pv-label">Help<button type="button" class="btn btn-ghost" data-help-toggle aria-expanded="${helpOpen}">${helpOpen ? "Hide" : "Show"} the Help card</button></div>
      <div class="pv-help">${helpCardHtml(shown)}</div>
    </div>`;
  }

  /* ----- a session editor, in three densities ----- */
  function editorActions(s, { labelled = false } = {}) {
    return `<div class="actions">${skipControl(s)}${moveTrigger(s)}${previewButton(s)}${menuControl(s, { labelled })}</div>`;
  }

  function editorCard(s, { big = false, showPreview = false, heading = null } = {}) {
    const d = byDate(sessions().list, s.date) || s;
    const dirty = isDirty(s.date);
    const failed = state.status[s.date]?.kind === "failed";
    return `<section class="ed${big ? " is-big" : ""}${dirty ? " is-dirty" : ""}${failed ? " is-failed" : ""}${d.isNext ? " is-next" : ""}" data-row="${s.date}" aria-label="${fmt(s.startsAt).date}">
      ${heading ? `<p class="ed-heading">${heading}</p>` : ""}
      <div class="ed-top">
        ${dateCell(d, { tile: true })}
        <div class="ed-when"><b>${fmt(d.startsAt).long}</b><span>${fmt(d.startsAt).time} · ${RULE.durationMinutes} min${d.movedTo ? ` · was ${fmt(d.scheduledAt).date}` : ""}</span></div>
        <div class="ed-status">${statusBadge(d)}</div>
      </div>
      ${big ? `<label class="ed-label" for="topic-${s.date}">Topic</label>` : ""}
      ${topicField(s, { big })}
      ${textPreview(s)}
      <p class="ed-line">${statusLine(d)}</p>
      <div class="ed-foot">${editorActions(s, { labelled: big })}${saveControls(s)}</div>
      ${inlineMove(s)}
      ${showPreview && cfg.preview === "inline" ? previewBlock(s) : ""}
    </section>`;
  }

  function tableRows(list, { preview = true } = {}) {
    return list.map((s) => {
      const dirty = isDirty(s.date);
      const failed = state.status[s.date]?.kind === "failed";
      const active = state.active === s.date;
      const row = `<tr class="tr${dirty ? " is-dirty" : ""}${failed ? " is-failed" : ""}${s.isNext ? " is-next" : ""}${s.past ? " is-past" : ""}${active ? " is-active" : ""}" data-row="${s.date}">
        <td class="td-date">${dateCell(s)}</td>
        <td class="td-topic">${topicField(s)}${textPreview(s)}<p class="ed-line">${statusLine(s)}</p>${inlineMove(s)}</td>
        <td class="td-status">${statusBadge(s)}</td>
        <td class="td-actions">${editorActions(s)}${saveControls(s)}</td>
      </tr>`;
      const expand = preview && cfg.preview === "inline" && active && !s.past ? `<tr class="tr-preview"><td colspan="4">${previewBlock(s)}</td></tr>` : "";
      return row + expand;
    }).join("");
  }

  function tableHtml(list, opts) {
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="td-date">Date</th><th class="td-topic">Topic</th><th class="td-status">Status</th><th class="td-actions"><span class="sr">Actions</span></th></tr></thead><tbody>${tableRows(list, opts)}</tbody></table></div>`;
  }

  /* ----- layouts ----- */
  function introHtml() {
    return `<p class="intro">Every other Thursday at 11:00 AM Pacific, 60 minutes, with Todd Hartley. The schedule is fixed. Set a topic, skip a holiday, or move one session here. Users see the result on Home and Help.</p>`;
  }

  function layoutTable(list) {
    return tableHtml(list);
  }

  // The hero and the two-up slots follow the saved order, so a session does not jump out of its card before Save.
  function savedSlots(count) {
    const saved = savedSessions().list.filter((s) => !s.past && !s.skipped).slice(0, count).map((s) => s.date);
    return saved;
  }

  function layoutHero(list) {
    const upcoming = list.filter((s) => !s.past);
    const heroDate = savedSlots(1)[0];
    const hero = upcoming.find((s) => s.date === heroDate) || upcoming[0];
    const rest = upcoming.filter((s) => s !== hero);
    return `${hero ? editorCard(hero, { big: true, showPreview: true, heading: "Next session" }) : ""}
      <h2 class="h2">Later sessions</h2>
      ${tableHtml(rest)}`;
  }

  function layoutMaster(list) {
    const active = byDate(list, state.active);
    const rowsHtml = list.map((s) => `<button type="button" class="ml-row${state.active === s.date ? " is-selected" : ""}${s.past ? " is-past" : ""}${isDirty(s.date) ? " is-dirty" : ""}" data-select="${s.date}" aria-pressed="${state.active === s.date}">
        ${dateCell(s)}
        <span class="ml-topic">${esc((state.draft[s.date]?.topic) || "No topic yet")}</span>
        <span class="ml-status">${statusBadge(s)}${isDirty(s.date) ? '<span class="chip chip-unsaved">Unsaved</span>' : ""}</span>
      </button>${app.phone && state.active === s.date && active ? `<div class="ml-inline">${editorCard(active, { big: true, showPreview: true })}</div>` : ""}`).join("");
    return `<div class="master"><div class="ml">${rowsHtml}</div>${app.phone ? "" : `<div class="md">${active ? editorCard(active, { big: true, showPreview: true }) : ""}</div>`}</div>`;
  }

  function monthKeys() {
    const first = new Date(now());
    const start = pacificDay(first).slice(0, 7);
    const keys = [];
    let [y, m] = start.split("-").map(Number);
    const lastDay = pacificDay(sessions().list[sessions().list.length - 1].startsAt).slice(0, 7);
    while (keys.length < 8) {
      const k = `${y}-${String(m).padStart(2, "0")}`;
      keys.push(k);
      if (k === lastDay) break;
      m++; if (m > 12) { m = 1; y++; }
    }
    return keys;
  }

  function monthGrid(key, list, navHtml = "") {
    const [y, m] = key.split("-").map(Number);
    const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const title = monthYearFormatter.format(new Date(Date.UTC(y, m - 1, 15, 12)));
    const bySessionDay = {};
    for (const s of list) bySessionDay[pacificDay(s.startsAt)] = s;
    const today = pacificDay(now());
    let cells = "";
    for (let i = 0; i < firstDow; i++) cells += `<span class="cal-cell is-blank"></span>`;
    for (let d = 1; d <= days; d++) {
      const day = `${key}-${String(d).padStart(2, "0")}`;
      const s = bySessionDay[day];
      const cls = ["cal-cell"];
      if (s) { cls.push("has-session"); if (s.skipped) cls.push("is-skipped"); if (s.isNext) cls.push("is-next"); if (s.past) cls.push("is-past"); if (state.active === s.date) cls.push("is-selected"); if (isDirty(s.date)) cls.push("is-dirty"); if (s.movedTo) cls.push("is-moved"); }
      if (day === today) cls.push("is-today");
      cells += s
        ? `<button type="button" class="${cls.join(" ")}" data-select="${s.date}" aria-label="${fmt(s.startsAt).date}${s.skipped ? ", skipped" : ""}" aria-pressed="${state.active === s.date}"><span>${d}</span></button>`
        : `<span class="${cls.join(" ")}"><span>${d}</span></span>`;
    }
    return `<div class="cal-month" data-month="${key}"><div class="cal-head"><p class="cal-title">${title}</p>${navHtml}</div><div class="cal-dow">${["S", "M", "T", "W", "T", "F", "S"].map((x) => `<span>${x}</span>`).join("")}</div><div class="cal-grid">${cells}</div></div>`;
  }

  function layoutCalendar(list) {
    const active = byDate(list, state.active);
    const keys = monthKeys();
    let grids;
    if (app.phone) {
      if (!state.month || !keys.includes(state.month)) state.month = active ? pacificDay(active.startsAt).slice(0, 7) : keys[0];
      const i = keys.indexOf(state.month);
      const nav = `<div class="cal-nav"><button type="button" class="btn btn-outline btn-icon" data-cal-prev aria-label="Previous month"${i <= 0 ? " disabled" : ""}>${icon("chevron-left")}</button><button type="button" class="btn btn-outline btn-icon" data-cal-next aria-label="Next month"${i >= keys.length - 1 ? " disabled" : ""}>${icon("chevron-right")}</button></div>`;
      grids = monthGrid(state.month, list, nav);
    } else {
      grids = keys.map((k) => monthGrid(k, list)).join("");
    }
    const legend = [["lg-session", "Session"], ["lg-next", "On Home now"], ["lg-skip", "Skipped"], ["lg-moved", "Moved"]].map(([c, t]) => `<span class="item"><span class="lg ${c}"></span>${t}</span>`).join("");
    return `<div class="calendar"><div class="cal-months">${grids}<p class="cal-legend">${legend}</p></div>
      <div class="cal-panel">${active ? editorCard(active, { big: true, showPreview: true }) : `<p class="muted">Pick a session date.</p>`}</div></div>`;
  }

  function layoutCards(list) {
    const groups = [];
    for (const s of list) {
      const key = monthYearFormatter.format(s.startsAt);
      let g = groups.find((x) => x.key === key);
      if (!g) { g = { key, items: [] }; groups.push(g); }
      g.items.push(s);
    }
    return `<div class="cards">${groups.map((g) => `<h2 class="h2">${g.key}</h2>${g.items.map((s) => editorCard(s, { showPreview: state.active === s.date })).join("")}`).join("")}</div>`;
  }

  function layoutTwoup(list) {
    const upcoming = list.filter((s) => !s.past);
    const slotDates = savedSlots(2);
    const slots = slotDates.map((d) => upcoming.find((s) => s.date === d)).filter(Boolean);
    const later = upcoming.filter((s) => !slots.includes(s));
    return `<div class="twoup">${slots.map((s, i) => editorCard(s, { big: true, showPreview: true, heading: i === 0 ? "Next session" : "After that" })).join("")}</div>
      <h2 class="h2">Later sessions</h2>${tableHtml(later, { preview: true })}`;
  }

  /* ----- the save bar ----- */
  function saveBarHtml() {
    if (cfg.editing !== "bar") return "";
    const n = dirtyDates().length;
    if (!n && !state.bar) return "";
    let inner;
    if (state.bar === "saving") inner = `<span class="rc rc-saving"><i class="spin"></i>Saving ${n} ${n === 1 ? "change" : "changes"}</span>`;
    else if (state.bar === "saved") inner = `<span class="rc rc-saved">${icon("check")}Saved. Users see the new schedule now.</span>`;
    else if (state.bar === "failed") inner = `<span class="rc rc-failed">${icon("alert")}Could not save. Nothing changed for users.</span><span class="grow"></span><button type="button" class="btn btn-primary" data-bar-save>Try again</button><button type="button" class="btn btn-outline" data-bar-discard>Discard</button>`;
    else inner = `<span class="bar-text"><span class="chip chip-unsaved">Unsaved</span>${n} ${n === 1 ? "change" : "changes"} not saved yet</span><span class="grow"></span><button type="button" class="btn btn-primary" data-bar-save>Save ${n === 1 ? "change" : "changes"}</button><button type="button" class="btn btn-outline" data-bar-discard>Discard</button>`;
    return `<div class="savebar" data-bar-state="${state.bar || "dirty"}">${inner}</div>`;
  }

  /* ----- dialogs ----- */
  function dialogHtml() {
    const dlg = state.dialog;
    if (!dlg) return "";
    const list = sessions().list;
    const s = byDate(list, dlg.date);
    let body = "";
    if (dlg.kind === "preview") {
      body = `<h2 class="dlg-title">What users see</h2>${previewBlock(s)}<div class="dlg-foot"><button type="button" class="btn btn-outline" data-dlg-close>Close</button></div>`;
    } else if (dlg.kind === "skip") {
      const d = s;
      body = `<h2 class="dlg-title">Skip the ${fmt(d.scheduledAt).date} session?</h2><p class="dlg-text">It will not run and users will not see it. ${d.fallback ? `Home will show ${fmt(d.fallback.startsAt).date} instead.` : "There is no later session to show."}</p>
        <div class="dlg-foot"><button type="button" class="btn btn-outline" data-dlg-close>Keep it</button><button type="button" class="btn btn-danger" data-dlg-skip>Skip this session</button></div>`;
    } else if (dlg.kind === "move") {
      body = `<h2 class="dlg-title">Move the ${fmt(s.scheduledAt).date} session</h2><p class="dlg-text">The session keeps its ${RULE.durationMinutes} minutes. Pacific time.</p>
        ${moveForm(s, dlg.form, { inDialog: true })}
        <div class="dlg-foot"><button type="button" class="btn btn-outline" data-dlg-close>Cancel</button><button type="button" class="btn btn-primary" data-dlg-move>Move session</button></div>`;
    } else if (dlg.kind === "edit") {
      const f = dlg.form;
      const count = f.topic.length >= 60 ? `<span class="count">${f.topic.length}/${TOPIC_MAX}</span>` : "";
      const moveBlock = dlg.showMove ? moveForm(s, f.move, { inDialog: true }) : (cfg.skip !== "menu" && !f.skipped ? `<button type="button" class="btn btn-ghost" data-dlg-show-move>${icon("calendar")}${f.move.moved ? "Move again" : "Move session"}</button>${f.move.moved ? `<button type="button" class="btn btn-ghost" data-dlg-putback>${icon("undo")}Put back</button>` : ""}` : "");
      body = `<h2 class="dlg-title">${fmt(s.startsAt).long}</h2><p class="dlg-text">${fmt(s.startsAt).time} · ${RULE.durationMinutes} min</p>
        <label class="ed-label" for="dlg-topic">Topic</label>
        <div class="topic-wrap is-big"><input id="dlg-topic" class="in${dlg.status === "failed" ? " is-failed" : ""}" type="text" maxlength="${TOPIC_MAX}" data-dlg-topic value="${esc(f.topic)}" placeholder="${esc(topicPlaceholder)}"${f.skipped ? " disabled" : ""}>${count}</div>
        <div class="dlg-controls">${cfg.skip !== "menu" ? skipControl(s, { inDialog: true }) : ""}${moveBlock}</div>
        ${dlg.status === "failed" ? `<p class="dlg-error">${icon("alert")}Could not save. Users still see the old topic. Try again or cancel.</p>` : ""}
        <div class="dlg-foot"><button type="button" class="btn btn-outline" data-dlg-close>Cancel</button><button type="button" class="btn btn-primary" data-dlg-save${dlg.status === "saving" ? " disabled" : ""}>${dlg.status === "saving" ? `<i class="spin"></i>Saving` : "Save"}</button></div>`;
    }
    return `<div class="dlg-layer"><div class="dlg-backdrop" data-dlg-close></div><div class="dlg${app.phone ? " is-sheet" : ""}" role="dialog" aria-modal="true">${app.phone ? '<div class="dlg-handle"></div>' : ""}<button type="button" class="dlg-x" aria-label="Close" data-dlg-close>${icon("x")}</button>${body}</div></div>`;
  }

  /* ----- page ----- */
  function pageHtml() {
    const { list } = sessions();
    ensureActive(list);
    const layouts = { table: layoutTable, hero: layoutHero, master: layoutMaster, calendar: layoutCalendar, cards: layoutCards, twoup: layoutTwoup };
    const main = layouts[cfg.layout](list);
    const pinned = cfg.preview === "top" ? previewBlock(sessions().next || list[list.length - 1], { pinned: true }) : "";
    const beside = cfg.preview === "beside" ? `<aside class="beside">${previewBlock(byDate(list, state.active) || list[0])}</aside>` : "";
    const body = `${introHtml()}${pinned}<div class="page${beside ? " has-beside" : ""}" data-layout="${cfg.layout}"><div class="page-main">${main}</div>${beside}</div>${saveBarHtml()}`;
    return (app.phone ? shellPhone(body) : shellDesktop(body)) + dialogHtml();
  }

  function render() {
    const scroller = root.querySelector("[data-scroll]");
    const scrollTop = scroller ? scroller.scrollTop : 0;
    const activeEl = document.activeElement;
    let focusKey = null, sel = null;
    if (activeEl && root.contains(activeEl) && activeEl.matches("[data-topic], [data-dlg-topic]")) {
      focusKey = activeEl.dataset.topic != null ? `[data-topic="${activeEl.dataset.topic}"]` : "[data-dlg-topic]";
      sel = [activeEl.selectionStart, activeEl.selectionEnd];
    }
    root.innerHTML = pageHtml();
    const nextScroller = root.querySelector("[data-scroll]");
    if (nextScroller) nextScroller.scrollTop = scrollTop;
    if (focusKey) {
      const el = root.querySelector(focusKey);
      if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(sel[0], sel[1]); } catch {} }
    }
    if (state.dialog && !focusKey) {
      const el = root.querySelector("[data-dlg-topic]");
      if (el && !state.dialogFocused) { el.focus({ preventScroll: true }); state.dialogFocused = true; }
    }
    if (!state.dialog) state.dialogFocused = false;
  }

  /* ----- events ----- */
  function closest(e, sel) { return e.target.closest ? e.target.closest(sel) : null; }

  root.addEventListener("input", (e) => {
    const t = e.target;
    if (t.matches("[data-topic]")) { setTopic(t.dataset.topic, t.value); render(); return; }
    if (t.matches("[data-dlg-topic]") && state.dialog) { state.dialog.form.topic = t.value.slice(0, TOPIC_MAX); render(); return; }
  });

  root.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches("[data-move-date], [data-move-time], [data-pick-day], [data-pick-time]")) {
      const form = state.dialog?.kind === "move" ? state.dialog.form : state.dialog?.kind === "edit" ? state.dialog.form.move : (state.moveForm ||= {});
      const wrap = t.closest("[data-move-form]");
      const dateEl = wrap.querySelector("[data-move-date], [data-pick-day]");
      const timeEl = wrap.querySelector("[data-move-time], [data-pick-time]");
      form.date = dateEl.value; form.time = timeEl.value;
      render();
    }
  });

  root.addEventListener("focusin", (e) => {
    const t = e.target;
    if (t.matches("[data-topic]") && state.active !== t.dataset.topic) { state.active = t.dataset.topic; render(); }
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (state.dialog) { state.dialog = null; render(); }
      else if (state.menu) { state.menu = null; render(); }
      else if (state.moveInline) { state.moveInline = null; render(); }
      return;
    }
    if (e.key === "Enter" && e.target.matches("[data-topic]") && cfg.editing === "row") { save([e.target.dataset.topic]); return; }
    if (e.key === "Enter" && e.target.matches("[data-dlg-topic]")) { commitDialog(); return; }
    if ((e.key === " " || e.key === "Enter") && e.target.matches("[data-skip-toggle], [data-dlg-skip-toggle]")) { e.preventDefault(); e.target.click(); }
  });

  function startMove(date) {
    const s = byDate(sessions().list, date);
    const form = wallParts(s.startsAt);
    if (cfg.move === "dialog") { state.dialog = { kind: "move", date, form }; state.menu = null; render(); return; }
    state.moveInline = date; state.moveForm = form; state.menu = null; render();
  }

  function commitDialog() {
    const dlg = state.dialog;
    if (!dlg || dlg.kind !== "edit") return;
    const o = ov(dlg.date);
    o.topic = dlg.form.topic.trim() ? dlg.form.topic.trim() : null;
    o.skipped = dlg.form.skipped;
    if (dlg.form.move.moved) o.movedTo = `${dlg.form.move.date}T${dlg.form.move.time}`;
    else o.movedTo = null;
    if (o.movedTo === `${dlg.date}T${RULE.startTime}`) o.movedTo = null;
    delete state.status[dlg.date];
    if (!isDirty(dlg.date)) { state.dialog = null; render(); return; }
    save([dlg.date]);
  }

  root.addEventListener("click", (e) => {
    const t = e.target;
    const a = (sel) => closest(e, sel);
    let el;
    if ((el = a("[data-help-toggle]"))) { state.helpOpen = !(state.helpOpen ?? false); return render(); }
    if ((el = a("[data-save]"))) return save([el.dataset.save]);
    if ((el = a("[data-retry]"))) return save([el.dataset.retry]);
    if ((el = a("[data-cancel]"))) return cancel(el.dataset.cancel);
    if ((el = a("[data-bar-save]"))) return save(dirtyDates());
    if ((el = a("[data-bar-discard]"))) { for (const d of dirtyDates()) state.draft[d] = clone(state.saved[d] || { topic: null, skipped: false, movedTo: null }); state.bar = null; state.status = {}; return render(); }
    if ((el = a("[data-skip-toggle]"))) { const d = el.dataset.skipToggle; setSkipped(d, !ov(d).skipped); state.active = d; return render(); }
    if ((el = a("[data-dlg-skip-toggle]"))) { state.dialog.form.skipped = !state.dialog.form.skipped; return render(); }
    if ((el = a("[data-menu]"))) { state.menu = state.menu === el.dataset.menu ? null : el.dataset.menu; state.active = el.dataset.menu; return render(); }
    if ((el = a("[data-menu-skip]"))) { const d = el.dataset.menuSkip; state.menu = null; if (ov(d).skipped) { setSkipped(d, false); return render(); } state.dialog = { kind: "skip", date: d }; return render(); }
    if ((el = a("[data-menu-move]"))) return startMove(el.dataset.menuMove);
    if ((el = a("[data-menu-putback]"))) { state.menu = null; setMovedTo(el.dataset.menuPutback, null); return render(); }
    if ((el = a("[data-move]"))) return startMove(el.dataset.move);
    if ((el = a("[data-putback]"))) { setMovedTo(el.dataset.putback, null); return render(); }
    if ((el = a("[data-move-apply]"))) { const d = el.dataset.moveApply; const f = state.moveForm; if (f?.date && f?.time) setMovedTo(d, `${f.date}T${f.time}`); return render(); }
    if ((el = a("[data-move-cancel]"))) { state.moveInline = null; return render(); }
    if ((el = a("[data-cal-prev]"))) { const k = monthKeys(); state.month = k[Math.max(0, k.indexOf(state.month) - 1)]; return render(); }
    if ((el = a("[data-cal-next]"))) { const k = monthKeys(); state.month = k[Math.min(k.length - 1, k.indexOf(state.month) + 1)]; return render(); }
    if ((el = a("[data-select]"))) { state.active = el.dataset.select; state.menu = null; if (app.phone) state.month = pacificDay(byDate(sessions().list, state.active).startsAt).slice(0, 7); return render(); }
    if ((el = a("[data-edit]"))) {
      const d = el.dataset.edit; const o = ov(d); const s = byDate(sessions().list, d);
      state.dialog = { kind: "edit", date: d, form: { topic: o.topic || "", skipped: !!o.skipped, move: { ...wallParts(s.startsAt), moved: !!o.movedTo } }, showMove: false, status: null };
      state.active = d; return render();
    }
    if ((el = a("[data-preview]"))) { state.dialog = { kind: "preview", date: el.dataset.preview }; state.active = el.dataset.preview; return render(); }
    if ((el = a("[data-dlg-show-move]"))) { state.dialog.showMove = true; state.dialog.form.move.moved = true; return render(); }
    if ((el = a("[data-dlg-putback]"))) { const s = byDate(sessions().list, state.dialog.date); state.dialog.form.move = { ...wallParts(s.scheduledAt), moved: false }; state.dialog.showMove = false; return render(); }
    if ((el = a("[data-dlg-move]"))) { const dlg = state.dialog; state.dialog = null; setMovedTo(dlg.date, `${dlg.form.date}T${dlg.form.time}`); return render(); }
    if ((el = a("[data-dlg-skip]"))) { const dlg = state.dialog; state.dialog = null; setSkipped(dlg.date, true); return render(); }
    if ((el = a("[data-dlg-save]"))) return commitDialog();
    if ((el = a("[data-dlg-close]"))) { state.dialog = null; return render(); }
    if (state.menu && !a(".menu-wrap")) { state.menu = null; render(); }
    if ((el = a("[data-row]")) && !a("button, input, select, label, a, .pv")) { if (state.active !== el.dataset.row) { state.active = el.dataset.row; render(); } }
  });

  render();

  return {
    state,
    render,
    setConfig(next) { cfg = { ...next }; state.menu = null; state.dialog = null; state.moveInline = null; state.bar = null; render(); },
    setEnv(next) { app = next; render(); },
    reset() { for (const t of Object.values(state.timers)) clearTimeout(t); state.timers = {}; state.saved = clone(OVERRIDES); state.draft = clone(OVERRIDES); state.status = {}; state.bar = null; state.dialog = null; state.menu = null; state.moveInline = null; state.active = null; state.month = null; state.helpOpen = undefined; render(); },
    get config() { return cfg; },
    sessions,
    savedSessions,
    isDirty,
  };
}
