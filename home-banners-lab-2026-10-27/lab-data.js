/* Data for the Home banners lab. Mock only. One store is shared by the Home stage and the Admin stage. */

const CURRENT_ADMIN = "Alex Kim";
const LANDING_URL = "https://lp.clarity.video/live-training";
const DEFAULT_TITLE = "Clarity Live Training with Todd Hartley";
const HOST = "Todd Hartley";
const HEADLINE_MAX = 80;
const BODY_MAX = 140;

// The live training rule stays in code. Admins never edit it.
const RULE = { firstSessionDate: "2026-10-22", startTime: "11:00", timeZone: "America/Los_Angeles", intervalDays: 14, durationMinutes: 60 };
const SESSION_COUNT = 9; // 22 Oct through 11 Feb

const TIMES = {
  today: { name: "Today, Oct 27", now: "2026-10-27T17:00:00Z" },
  notice: { name: "Oct 31, notice window", now: "2026-10-31T17:00:00Z" },
  morning: { name: "Nov 5, morning", now: "2026-11-05T16:00:00Z" },
  live: { name: "Nov 5, live", now: "2026-11-05T19:20:00Z" },
};
const AUDIENCES = { free: { name: "Free plan", short: "Free" }, pro: { name: "Pro plan", short: "Pro" } };
const AUDIENCE_LABEL = { everyone: "Everyone", free: "Free plan", pro: "Pro plan" };

/* The type registry. Adding a type is one entry here plus its fields in the editor. */
const TYPES = {
  live: { name: "Live training", eyebrow: "Free live training", icon: "radio", scheduled: true, what: "The free series every other Thursday with Todd Hartley.", deletable: false },
  event: { name: "Event", eyebrow: "Live event", icon: "calendar", scheduled: true, what: "A one-off webinar, workshop or launch call.", deletable: true },
  announcement: { name: "Announcement", eyebrow: "New in Clarity", icon: "megaphone", scheduled: false, what: "Product news or a tip.", deletable: true },
  offer: { name: "Offer", eyebrow: "Offer", icon: "tag", scheduled: false, what: "A promotion, usually for Free plan users.", deletable: true },
  notice: { name: "Notice", eyebrow: "Notice", icon: "alert-triangle", scheduled: false, what: "Planned maintenance or an incident. Warning look.", deletable: true },
};

/* ---------- Time maths, ported from editor/src/lib/live-trainings.ts ---------- */

const zoneFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: RULE.timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
});

// "YYYY-MM-DDTHH:mm" Pacific wall time to an instant.
function pacificInstant(wall) {
  const wallTime = Date.parse(`${wall}:00Z`);
  let instant = wallTime;
  for (let correction = 0; correction < 2; correction++) {
    const parts = zoneFormatter.formatToParts(new Date(instant));
    const v = (t) => Number(parts.find((p) => p.type === t)?.value);
    const zoned = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
    instant += wallTime - zoned;
  }
  return new Date(instant);
}

function scheduledDates() {
  const first = Date.parse(`${RULE.firstSessionDate}T00:00:00Z`);
  return Array.from({ length: SESSION_COUNT }, (_, i) => new Date(first + i * RULE.intervalDays * 86_400_000).toISOString().slice(0, 10));
}

function pacificDay(date) {
  const parts = zoneFormatter.formatToParts(date);
  const v = (t) => parts.find((p) => p.type === t)?.value;
  return `${v("year")}-${v("month")}-${v("day")}`;
}

function dayDiff(a, b) {
  return Math.round((Date.parse(`${pacificDay(a)}T00:00:00Z`) - Date.parse(`${pacificDay(b)}T00:00:00Z`)) / 86_400_000);
}

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: RULE.timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
});
const longFormatter = new Intl.DateTimeFormat("en-US", { timeZone: RULE.timeZone, weekday: "long", month: "long", day: "numeric" });
const weekdayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: RULE.timeZone, weekday: "long" });
const monthYearFormatter = new Intl.DateTimeFormat("en-US", { timeZone: RULE.timeZone, month: "long", year: "numeric" });
const editFormatter = new Intl.DateTimeFormat("en-US", { timeZone: RULE.timeZone, month: "short", day: "numeric" });

function fmt(date) {
  const parts = partsFormatter.formatToParts(date);
  const v = (t) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    date: `${v("weekday")}, ${v("month")} ${v("day")}`,
    short: `${v("month")} ${v("day")}`,
    time: `${v("hour")}:${v("minute")} ${v("dayPeriod")} ${v("timeZoneName")}`,
    clock: `${v("hour")}:${v("minute")} ${v("dayPeriod")}`,
    month: v("month"), day: v("day"), weekday: v("weekday"),
    long: longFormatter.format(date),
  };
}

// Wall-clock fields of an instant in Pacific, for date and time inputs.
function wallParts(date) {
  const parts = zoneFormatter.formatToParts(date);
  const v = (t) => parts.find((p) => p.type === t)?.value;
  return { date: `${v("year")}-${v("month")}-${v("day")}`, time: `${v("hour")}:${v("minute")}` };
}
function wallString(date) { const w = wallParts(date); return `${w.date}T${w.time}`; }

function countdownText(startsAt, live, now) {
  if (live) return "Live now";
  const d = dayDiff(startsAt, now);
  if (d <= 0) return "Today";
  if (d === 1) return "Tomorrow";
  return `In ${d} days`;
}

function endsText(until, now) {
  const d = dayDiff(until, now);
  if (d <= 0) return "Ends today";
  if (d === 1) return "Ends tomorrow";
  if (d < 7) return `Ends ${weekdayFormatter.format(until)}`;
  return `Ends ${fmt(until).short}`;
}

/* A session list from the live training's overrides, as users would see it at `now`. */
function buildSessions(overrides, now) {
  const list = scheduledDates().map((date) => {
    const o = overrides[date] || {};
    const movedTo = o.movedTo || null;
    const startsAt = pacificInstant(movedTo || `${date}T${RULE.startTime}`);
    const endsAt = new Date(startsAt.getTime() + RULE.durationMinutes * 60_000);
    const scheduledAt = pacificInstant(`${date}T${RULE.startTime}`);
    return {
      date, topic: o.topic || null, skipped: !!o.skipped, movedTo, startsAt, endsAt, scheduledAt,
      past: endsAt.getTime() <= now.getTime(),
      live: startsAt.getTime() <= now.getTime() && now.getTime() < endsAt.getTime(),
    };
  });
  list.sort((a, b) => a.startsAt - b.startsAt);
  const next = list.find((s) => !s.skipped && !s.past) || null;
  for (const s of list) { s.isNext = !!next && next.date === s.date; s.daysAway = dayDiff(s.startsAt, now); }
  for (let i = 0; i < list.length; i++) {
    list[i].fallback = list.slice(i + 1).find((s) => !s.skipped && !s.past) || null;
    list[i].showsAfter = list.slice(0, i).reverse().find((s) => !s.skipped && !s.past) || null;
  }
  return { list, next };
}

/* ---------- Mock banners, in Home order (first wins) ---------- */

const BANNERS = [
  { id: "notice-maintenance", type: "notice", status: "published", audience: "everyone",
    headline: "Scheduled maintenance Sunday 2:00 to 3:00 AM Pacific", body: "Recording and Journey Pages pause for about an hour.", link: "", linkLabel: "", dismissible: false,
    from: "2026-10-30T00:00", until: "2026-11-01T03:00",
    history: [{ at: "2026-10-26T20:10:00Z", by: "Alex Kim", what: "Published" }, { at: "2026-10-26T20:02:00Z", by: "Alex Kim", what: "Created the notice" }] },
  { id: "live-training", type: "live", status: "published", audience: "everyone",
    sessions: { "2026-10-22": { topic: "Mastering Your Clarity Journey Page Prompts", skipped: false, movedTo: null }, "2026-12-31": { topic: null, skipped: true, movedTo: null } },
    history: [{ at: "2026-10-26T18:40:00Z", by: "Sam Rivera", what: "Skipped the Dec 31 session" }, { at: "2026-10-20T16:02:00Z", by: "Sam Rivera", what: "Set the Oct 22 topic" }, { at: "2026-10-12T15:00:00Z", by: "Alex Kim", what: "Published" }] },
  { id: "event-workshop", type: "event", status: "published", audience: "everyone",
    title: "Journey Pages workshop", host: "Sam Rivera", start: "2026-11-11T10:00", duration: 45, link: "https://lp.clarity.video/workshop", leadDays: 7,
    history: [{ at: "2026-10-25T17:30:00Z", by: "Sam Rivera", what: "Published" }, { at: "2026-10-25T17:12:00Z", by: "Sam Rivera", what: "Created the event" }] },
  { id: "announcement-teleprompter", type: "announcement", status: "published", audience: "everyone",
    headline: "Teleprompter is here", body: "Read your script while you record.", link: "/record", linkLabel: "Try it",
    from: "2026-10-20T09:00", until: "2026-11-20T17:00",
    history: [{ at: "2026-10-20T16:45:00Z", by: "Alex Kim", what: "Published" }, { at: "2026-10-20T16:30:00Z", by: "Alex Kim", what: "Created the announcement" }] },
  { id: "offer-pro", type: "offer", status: "published", audience: "free",
    headline: "Get Pro for 20% off", body: "", link: "/settings/subscription", linkLabel: "Upgrade", showEnd: true,
    from: "2026-10-26T09:00", until: "2026-11-06T23:59",
    history: [{ at: "2026-10-26T16:00:00Z", by: "Sam Rivera", what: "Published" }, { at: "2026-10-26T15:48:00Z", by: "Sam Rivera", what: "Created the offer" }] },
  { id: "announcement-captions", type: "announcement", status: "draft", audience: "everyone",
    headline: "Captions in 12 languages", body: "Pick a language from the share menu.", link: "/", linkLabel: "See how",
    from: "2026-11-02T09:00", until: "2026-11-16T17:00",
    history: [{ at: "2026-10-27T15:20:00Z", by: "Alex Kim", what: "Saved as a draft" }] },
  { id: "announcement-home", type: "announcement", status: "published", audience: "everyone",
    headline: "A faster Home", body: "Videos, pages and files on one screen.", link: "", linkLabel: "",
    from: "2026-10-01T09:00", until: "2026-10-15T17:00",
    history: [{ at: "2026-10-01T16:00:00Z", by: "Sam Rivera", what: "Published" }] },
];

/* ---------- Resolution. What a banner says at `now` ---------- */

function isExternal(link) { return /^https:\/\//i.test(link || ""); }

// null when fine, else the message the editor shows.
function linkProblem(link) {
  if (!link) return null;
  if (/^https:\/\/[^\s]+$/i.test(link) || /^\/[^\s]*$/.test(link)) return null;
  return "Links start with https:// or with / for a page in Clarity.";
}

function windowOf(b) {
  if (b.type === "live") return { from: null, until: null };
  if (b.type === "event") {
    const start = pacificInstant(b.start);
    return { from: new Date(start.getTime() - (b.leadDays ?? 7) * 86_400_000), until: new Date(start.getTime() + (b.duration || 60) * 60_000), start };
  }
  return { from: b.from ? pacificInstant(b.from) : null, until: b.until ? pacificInstant(b.until) : null };
}

function phaseOf(b, now) {
  const w = windowOf(b);
  if (w.from && now < w.from) return "before";
  if (w.until && now >= w.until) return "after";
  return "in";
}

function resolveBanner(b, now) {
  const t = TYPES[b.type];
  if (b.type === "live") {
    const { next } = buildSessions(b.sessions || {}, now);
    if (!next) return null;
    const f = fmt(next.startsAt);
    return {
      id: b.id, type: "live", key: `live:${next.date}`, scheduled: true, live: next.live,
      eyebrow: next.topic ? `Live with ${HOST}` : t.eyebrow, tag: countdownText(next.startsAt, next.live, now), rescheduled: !!next.movedTo,
      title: next.topic || DEFAULT_TITLE, date: { month: f.month, day: f.day },
      meta: { when: f.date, time: f.time, minutes: RULE.durationMinutes, tail: next.topic ? "Free, no sign-up" : "Every other Thursday", was: next.movedTo ? fmt(next.scheduledAt).date : null },
      cta: { label: next.live ? "Join live" : "Add to calendar", icon: next.live ? "play" : "calendar-plus", href: LANDING_URL, external: true },
      dismissible: true, session: next,
    };
  }
  if (b.type === "event") {
    const start = pacificInstant(b.start || "2026-11-11T10:00");
    const end = new Date(start.getTime() + (b.duration || 60) * 60_000);
    const live = start <= now && now < end;
    const f = fmt(start);
    return {
      id: b.id, type: "event", key: b.id, scheduled: true, live,
      eyebrow: b.host ? `Live with ${b.host}` : t.eyebrow, tag: countdownText(start, live, now), rescheduled: false,
      title: b.title || "Untitled event", date: { month: f.month, day: f.day },
      meta: { when: f.date, time: f.time, minutes: b.duration || 60, tail: null, was: null },
      cta: b.link ? { label: live ? "Join live" : "Add to calendar", icon: live ? "play" : "calendar-plus", href: b.link, external: isExternal(b.link) } : null,
      dismissible: true,
    };
  }
  const view = {
    id: b.id, type: b.type, key: b.id, scheduled: false, live: false, rescheduled: false,
    eyebrow: t.eyebrow, tag: null, title: b.headline || `Untitled ${t.name.toLowerCase()}`, body: b.body || "",
    cta: b.link ? { label: b.linkLabel || "Learn more", icon: null, href: b.link, external: isExternal(b.link) } : null,
    dismissible: b.type === "notice" ? b.dismissible !== false : true,
  };
  if (b.type === "offer" && b.showEnd && b.until) view.tag = endsText(pacificInstant(b.until), now);
  return view;
}

function dismissKeyOf(b, now) {
  const v = resolveBanner(b, now);
  return v ? v.key : null;
}

function forAudience(b, audience) { return b.audience === "everyone" || b.audience === audience; }

/* The banners a viewer could see, in Home order. Dismissed ones are skipped when a set is given. */
function eligible(banners, now, audience, dismissed) {
  return banners.filter((b) => {
    if (b.status !== "published" || !forAudience(b, audience) || phaseOf(b, now) !== "in") return false;
    const key = dismissKeyOf(b, now);
    if (!key) return false;
    return !(dismissed && dismissed.has(key));
  });
}

function ordinal(n) { return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`; }

/* Admin status at `now`. `pos` is the position in each audience's line, ignoring dismissals. */
function adminStatus(b, now, banners) {
  if (b.status !== "published") return { kind: "draft", label: "Draft", group: "drafts" };
  const ph = phaseOf(b, now);
  if (ph === "after") return { kind: "ended", label: "Ended", group: "ended" };
  if (ph === "before") return { kind: "scheduled", label: "Scheduled", group: "scheduled" };
  const pos = {};
  for (const a of Object.keys(AUDIENCES)) {
    const i = eligible(banners, now, a).findIndex((x) => x.id === b.id);
    pos[a] = i < 0 ? null : i + 1;
  }
  if (pos.free === 1 || pos.pro === 1) return { kind: "now", label: "On Home now", group: "home", pos };
  if (pos.free === null && pos.pro === null) return { kind: "hidden", label: "Not shown", group: "home", pos };
  return { kind: "line", label: `${ordinal(Math.min(...Object.values(pos).filter((x) => x)))} in line`, group: "home", pos };
}

/* One plain sentence about who sees the banner. */
function whoLine(b, st, now) {
  const w = windowOf(b);
  if (st.kind === "draft") return "Draft. Nobody sees it.";
  if (st.kind === "ended") return `Ended ${fmt(w.until).date}.`;
  if (st.kind === "scheduled") return `Shows from ${fmt(w.from).date} for ${AUDIENCE_LABEL[b.audience].toLowerCase() === "everyone" ? "everyone" : AUDIENCE_LABEL[b.audience] + " users"}.`;
  const phrase = (p) => (p === null ? "Not shown" : p === 1 ? "On Home now" : `${ordinal(p)} in line`);
  const f = phrase(st.pos.free), p = phrase(st.pos.pro);
  if (f === p) return `${f} for everyone.`;
  return `${f} for Free, ${p.toLowerCase()} for Pro.`;
}

function whenLine(b) {
  const w = windowOf(b);
  if (b.type === "live") return "Every other Thursday, 11:00 AM Pacific";
  if (b.type === "event") return `${fmt(w.start).date} · ${fmt(w.start).clock} · shows from ${fmt(w.from).short}`;
  if (!w.from && !w.until) return "No window";
  return `${w.from ? fmt(w.from).short : "Now"} to ${w.until ? fmt(w.until).short : "no end"}`;
}

function editedLine(b) {
  const h = b.history && b.history[0];
  if (!h) return "";
  return `${h.what} by ${h.by}, ${editFormatter.format(new Date(h.at))}`;
}

function bannerTitle(b) {
  if (b.type === "live") return DEFAULT_TITLE;
  if (b.type === "event") return b.title || "Untitled event";
  return b.headline || `Untitled ${TYPES[b.type].name.toLowerCase()}`;
}

/* ---------- The store, shared by every frame ---------- */

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function createStore() {
  let banners = clone(BANNERS);
  const subs = new Set();
  let counter = 0;
  const notify = () => { for (const fn of subs) fn(); };
  return {
    get banners() { return banners; },
    byId(id) { return banners.find((b) => b.id === id) || null; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    commit(mutate) { mutate(banners); notify(); },
    newId(type) { counter++; return `${type}-new-${counter}`; },
    reset() { banners = clone(BANNERS); notify(); },
  };
}

/* ---------- Lab dimensions ---------- */

const HOME = {
  family: {
    navy: { name: "One navy card", note: "Every type is the navy card William picked. The tile and the eyebrow say which type." },
    paired: { name: "Navy and paper", note: "Scheduled things keep the navy card. News and offers are a paper card. A notice is amber." },
    surface: { name: "Surface per type", note: "Navy for scheduled, paper for news, brand blue for offers, amber for notices." },
    strip: { name: "Cards and strips", note: "Scheduled things get the navy card. News, offers and notices take one 44 px line." },
  },
  visual: {
    tile: { name: "Icon tile", note: "Messages get the same white tile as the date, with an icon in it." },
    icon: { name: "Bare icon", note: "Messages get a plain round icon, no tile." },
    none: { name: "No visual", note: "Messages start with text. Only scheduled types keep the date tile." },
  },
  label: {
    eyebrow: { name: "Eyebrow text", note: "A line above the headline names the type. New in Clarity, Offer, Notice." },
    chip: { name: "Type chip", note: "A small chip names the type, in the style of the countdown tag." },
    none: { name: "No label", note: "Messages start with the headline. The surface and the icon carry the type." },
  },
  queue: {
    one: { name: "One at a time", note: "Dismiss reveals the next eligible banner." },
    pager: { name: "1 of 3 pager", note: "One banner with a count and previous and next arrows under it." },
    stack: { name: "Two stacked", note: "The first two eligible banners, the second one compact." },
  },
  size: {
    regular: { name: "Regular", note: "The size William picked." },
    compact: { name: "Compact", note: "Tighter padding, a 16 px title and a 32 px button." },
  },
};

const HOME_UNSUPPORTED = {
  strip: { visual: { tile: "A strip is one line. An icon tile needs two. Bare icon instead." } },
};

const ADMIN = {
  layout: {
    table: { name: "Ordered table", note: "One table in Home order, grouped as On Home, Scheduled, Drafts and Ended. Looks like Users." },
    master: { name: "Master detail", note: "The list on the left, the selected banner's editor on the right. The live training is selected on load." },
    hero: { name: "Home now", note: "What Free and Pro users see right now and next, then the ordered table." },
    board: { name: "Status board", note: "Columns for On Home, Scheduled, Drafts and Ended. Cards reorder inside On Home." },
    stack: { name: "Banner stack", note: "The list is the real banners in Home order, each with an admin rail." },
  },
  create: {
    picker: { name: "Type picker", note: "New banner opens a dialog with one tile per type and a small preview." },
    menu: { name: "New menu", note: "New banner is a menu of the four types. Picking one opens the editor." },
    templates: { name: "Template row", note: "Four template cards above the list. Click one to start." },
  },
  editor: {
    sheet: { name: "Side sheet", note: "Edit opens a sheet on the right. The list stays in view." },
    page: { name: "Full page", note: "Edit replaces the list with one banner's page and a Back link." },
    inline: { name: "Inline expand", note: "Edit expands the row into the editor." },
    dialog: { name: "Dialog", note: "Edit opens a dialog, like Create account." },
  },
  preview: {
    above: { name: "Above the form", note: "The banner is pinned above the fields and updates as you type." },
    beside: { name: "Beside the form", note: "A preview column beside the fields." },
    widths: { name: "Desktop and phone", note: "Above the form, with a switch between the 1440 and the 390 px banner." },
    slot: { name: "In the Home slot", note: "Above the form, with Free and Pro tabs that show where this banner lands in line." },
  },
  order: {
    drag: { name: "Drag handles", note: "Drag the handle, or focus it and press the arrow keys." },
    buttons: { name: "Up and down", note: "Two small buttons per banner." },
    first: { name: "Show first", note: "One action that moves a banner to the top." },
  },
  sessions: {
    table: { name: "Session table", note: "One row per session with the topic typed in the row. The Admin table preset." },
    next: { name: "Next up", note: "The next session as a card, later sessions as rows. The Next up preset." },
    twoup: { name: "Two up", note: "The next two sessions side by side, the rest as rows. The Two up preset." },
  },
};

const ADMIN_UNSUPPORTED = {
  master: { editor: {
    sheet: "Master detail edits in the right pane. That pane is the inline editor.",
    page: "Master detail edits in the right pane. That pane is the inline editor.",
    dialog: "Master detail edits in the right pane. That pane is the inline editor.",
  } },
  board: { editor: { inline: "Board columns are too narrow for the editor. Use a sheet, a dialog or a page." } },
};
// Pairs that depend on two non-layout dimensions.
function adminPairReason(cfg) {
  if (cfg.editor === "sheet" && cfg.preview === "beside") return { dim: "preview", key: "beside", reason: "The sheet is one column. The preview goes above the form." };
  return null;
}

const DIMS = { home: HOME, admin: ADMIN };

function unsupportedReason(stage, cfg, dim, key) {
  if (stage === "home") return HOME_UNSUPPORTED[cfg.family]?.[dim]?.[key] || null;
  const byLayout = ADMIN_UNSUPPORTED[cfg.layout]?.[dim]?.[key];
  if (byLayout) return byLayout;
  if (dim === "preview" && key === "beside" && cfg.editor === "sheet") return "The sheet is one column. The preview goes above the form.";
  if (dim === "editor" && key === "sheet" && cfg.preview === "beside") return "Beside needs two columns. A sheet has one.";
  return null;
}

const HOME_DEFAULT = { family: "navy", visual: "tile", label: "eyebrow", queue: "one", size: "regular" };
const ADMIN_DEFAULT = { layout: "table", create: "picker", editor: "sheet", preview: "above", order: "buttons", sessions: "table" };

function coerceConfig(stage, cfg) {
  const dims = DIMS[stage];
  const base = stage === "home" ? HOME_DEFAULT : ADMIN_DEFAULT;
  const out = { ...base, ...cfg };
  for (const k of Object.keys(dims)) if (!dims[k][out[k]]) out[k] = base[k];
  const lead = stage === "home" ? "family" : "layout";
  for (const dim of Object.keys(dims)) {
    if (dim === lead) continue;
    if (unsupportedReason(stage, out, dim, out[dim])) {
      out[dim] = Object.keys(dims[dim]).find((k) => !unsupportedReason(stage, out, dim, k)) || base[dim];
    }
  }
  return out;
}

/* ---------- Presets ---------- */

const HOME_PRESETS = [
  { id: "one-navy", name: "One navy family", why: "Every banner is the card William picked. The tile icon and the eyebrow tell the types apart, nothing else changes.",
    config: { family: "navy", visual: "tile", label: "eyebrow", queue: "one", size: "regular" } },
  { id: "surfaces", name: "Surface per type", why: "Color names the type before you read a word. Amber for a notice is a convention every user knows.",
    config: { family: "surface", visual: "tile", label: "eyebrow", queue: "one", size: "regular" } },
  { id: "navy-paper", name: "Navy and paper", why: "Scheduled things earn the navy card. News and offers sit on paper like the page cards, so the dashboard stays calm.",
    config: { family: "paired", visual: "tile", label: "eyebrow", queue: "one", size: "regular" } },
  { id: "cards-strips", name: "Cards and strips", why: "A session is an event, a tip is a line. The strip takes 44 px and reads as part of the toolbar.",
    config: { family: "strip", visual: "icon", label: "eyebrow", queue: "one", size: "regular" } },
  { id: "chips", name: "Navy with chips", why: "The type chip sits where the countdown tag sits, so every banner has one small label in one place.",
    config: { family: "navy", visual: "icon", label: "chip", queue: "one", size: "regular" } },
  { id: "pager", name: "Pager", why: "When three banners are eligible the user can flip through them without dismissing anything.",
    config: { family: "paired", visual: "tile", label: "eyebrow", queue: "pager", size: "regular" } },
  { id: "stacked", name: "Two stacked", why: "A notice and the live training can both be seen at once. The second one is compact so the grid stays close.",
    config: { family: "surface", visual: "icon", label: "eyebrow", queue: "stack", size: "compact" } },
  { id: "quiet", name: "Quiet compact", why: "No label, no icon, less padding. The surface alone says what kind of thing it is.",
    config: { family: "surface", visual: "none", label: "none", queue: "one", size: "compact" } },
];

const ADMIN_PRESETS = [
  { id: "admin-table", name: "Admin table", why: "Looks like Users and Organizations. The next topic is typed in the live training row and the sheet keeps the list in view.",
    config: { layout: "table", create: "picker", editor: "sheet", preview: "above", order: "buttons", sessions: "table" } },
  { id: "home-now", name: "Home now", why: "The first screen is what Free and Pro users see right now, so the question admins ask most is answered before any click.",
    config: { layout: "hero", create: "menu", editor: "sheet", preview: "slot", order: "drag", sessions: "next" } },
  { id: "banner-stack", name: "Banner stack", why: "The list is the banners in Home order. Reordering moves the real thing, and a draft looks like a draft.",
    config: { layout: "stack", create: "templates", editor: "inline", preview: "above", order: "drag", sessions: "twoup" } },
  { id: "master-detail", name: "Master detail", why: "Pick on the left, edit on the right with the preview beside the form. The live training is open on load.",
    config: { layout: "master", create: "menu", editor: "inline", preview: "beside", order: "buttons", sessions: "table" } },
  { id: "board", name: "Status board", why: "Draft, Scheduled and Ended are columns, so nothing published is ever mistaken for a draft. Cards reorder inside On Home.",
    config: { layout: "board", create: "picker", editor: "dialog", preview: "widths", order: "drag", sessions: "next" } },
  { id: "full-page", name: "Full page editor", why: "One banner on its own page with the preview beside the form, the way a Journey Page is edited.",
    config: { layout: "table", create: "templates", editor: "page", preview: "beside", order: "first", sessions: "table" } },
  { id: "quick-post", name: "Quick post", why: "Template cards at the top make an announcement a two-click job, and the Home now hero shows where it landed.",
    config: { layout: "hero", create: "templates", editor: "sheet", preview: "widths", order: "buttons", sessions: "twoup" } },
  { id: "dialog-table", name: "Dialog table", why: "The smallest change from Users. A dialog like Create account, up and down buttons, nothing new to learn.",
    config: { layout: "table", create: "menu", editor: "dialog", preview: "above", order: "buttons", sessions: "next" } },
  { id: "stack-sheet", name: "Stack with a sheet", why: "The stack for reading, a sheet for editing, Show first for the one reorder that matters.",
    config: { layout: "stack", create: "picker", editor: "sheet", preview: "slot", order: "first", sessions: "table" } },
  { id: "master-slot", name: "Master with the Home slot", why: "Master detail plus Free and Pro tabs in the preview, so audience targeting is checked while typing.",
    config: { layout: "master", create: "picker", editor: "inline", preview: "slot", order: "drag", sessions: "next" } },
];

const PRESETS_BY_STAGE = { home: HOME_PRESETS, admin: ADMIN_PRESETS };

/* Clarity ui/ primitives each option needs. "missing" marks what ui/ does not have today. */
const PRIMITIVES = {
  home: {
    family: {
      navy: { have: ["HomeBanner feature component (replaces LiveTrainingBanner)", "buttonVariants", "Button ghost icon", "--surface-navy tokens"], missing: [] },
      paired: { have: ["HomeBanner", "buttonVariants", "Button ghost icon", "Card tokens"], missing: ["amber surface tokens"] },
      surface: { have: ["HomeBanner", "buttonVariants", "Button ghost icon"], missing: ["amber surface tokens", "brand surface tokens"] },
      strip: { have: ["HomeBanner", "buttonVariants", "Button ghost icon"], missing: ["amber surface tokens", "tint surface tokens", "a strip variant of HomeBanner"] },
    },
    visual: { tile: { have: ["lucide icons"], missing: [] }, icon: { have: ["lucide icons"], missing: [] }, none: { have: [], missing: [] } },
    label: { eyebrow: { have: [], missing: [] }, chip: { have: ["Badge or the tag style"], missing: [] }, none: { have: [], missing: [] } },
    queue: { one: { have: [], missing: [] }, pager: { have: ["Button icon-sm"], missing: [] }, stack: { have: [], missing: [] } },
    size: { regular: { have: [], missing: [] }, compact: { have: [], missing: [] } },
  },
  admin: {
    layout: {
      table: { have: ["Table", "Badge", "Input", "Button", "DropdownMenu"], missing: [] },
      master: { have: ["Card", "ButtonBase (list rows)", "Badge", "Input", "Button"], missing: [] },
      hero: { have: ["Card", "Table", "Badge", "Input", "Button", "HomeBanner"], missing: [] },
      board: { have: ["Card", "Badge", "Input", "Button", "DropdownMenu"], missing: [] },
      stack: { have: ["HomeBanner", "Badge", "Input", "Button", "DropdownMenu"], missing: [] },
    },
    create: {
      picker: { have: ["Dialog", "ButtonBase (type tiles)", "HomeBanner"], missing: [] },
      menu: { have: ["DropdownMenu", "Button"], missing: [] },
      templates: { have: ["ButtonBase (template cards)", "HomeBanner"], missing: [] },
    },
    editor: {
      sheet: { have: ["Dialog parts", "Input", "Textarea", "NativeSelect", "Switch", "Label", "Button"], missing: ["side sheet (a Dialog variant)"] },
      page: { have: ["Input", "Textarea", "NativeSelect", "Switch", "Label", "Button", "a route"], missing: [] },
      inline: { have: ["Input", "Textarea", "NativeSelect", "Switch", "Label", "Button"], missing: [] },
      dialog: { have: ["Dialog", "Input", "Textarea", "NativeSelect", "Switch", "Label", "Button"], missing: [] },
    },
    preview: {
      above: { have: ["HomeBanner", "Badge"], missing: [] },
      beside: { have: ["HomeBanner", "Badge"], missing: [] },
      widths: { have: ["HomeBanner", "Badge", "SegmentedControl"], missing: [] },
      slot: { have: ["HomeBanner", "Badge", "SegmentedControl"], missing: [] },
    },
    order: {
      drag: { have: ["ButtonBase (handle)"], missing: ["sortable drag handle list"] },
      buttons: { have: ["Button icon-sm"], missing: [] },
      first: { have: ["Button"], missing: [] },
    },
    sessions: {
      table: { have: ["Table", "Input", "Switch", "Badge", "Button", "Input type date and time"], missing: [] },
      next: { have: ["Card", "Table", "Input", "Switch", "Badge", "Button", "Input type date and time"], missing: [] },
      twoup: { have: ["Card", "Table", "Input", "Switch", "Badge", "Button", "Input type date and time"], missing: [] },
    },
  },
};
// Every editor needs a window. Native date and time inputs serve today; a popover date picker is not in ui/.
const SHARED_MISSING = { admin: ["date picker (native date and time inputs serve today)"], home: [] };

function primitivesFor(stage, cfg) {
  const have = new Set(), missing = new Set();
  for (const dim of Object.keys(DIMS[stage])) {
    const p = PRIMITIVES[stage][dim][cfg[dim]];
    p.have.forEach((x) => have.add(x)); p.missing.forEach((x) => missing.add(x));
  }
  SHARED_MISSING[stage].forEach((x) => missing.add(x));
  return { have: [...have], missing: [...missing] };
}
