/* Data for the Home banners lab, round 2. Mock only. One store is shared by the Home stage and the Admin stage. */

const CURRENT_ADMIN = "Alex Kim";
const LANDING_URL = "https://lp.clarity.video/live-training";
const DEFAULT_TITLE = "Clarity Live Training with Todd Hartley";
const HOST = "Todd Hartley";
const HEADLINE_MAX = 80;
const BODY_MAX = 140;
const DAY = 86_400_000;

// The live training rule stays in code. Admins never edit it.
const RULE = { firstSessionDate: "2026-10-22", startTime: "11:00", timeZone: "America/Los_Angeles", intervalDays: 14, durationMinutes: 60 };
const SESSION_COUNT = 9; // 22 Oct through 11 Feb

const TIMES = {
  today: { name: "Today, Oct 27", now: "2026-10-27T17:00:00Z" },
  notice: { name: "Oct 31, notice window", now: "2026-10-31T17:00:00Z" },
  morning: { name: "Nov 5, morning", now: "2026-11-05T16:00:00Z" },
  live: { name: "Nov 5, live", now: "2026-11-05T19:20:00Z" },
};

/* Who is looking at Home. Admins are Pro users who also see admin-only banners. */
const AUDIENCES = {
  free: { name: "Free plan", short: "Free", plan: "free", admin: false, viewer: { name: "Dana Ortiz", initial: "D" } },
  pro: { name: "Pro plan", short: "Pro", plan: "pro", admin: false, viewer: { name: "Sam Rivera", initial: "S" } },
  admins: { name: "Only admins", short: "Admin", plan: "pro", admin: true, viewer: { name: "Alex Kim", initial: "A" } },
};
const AUDIENCE_LABEL = { everyone: "Everyone", free: "Free plan", pro: "Pro plan", admins: "Only admins" };
// The subject of a sentence: "Free users will see this".
const AUDIENCE_SEES = { everyone: "Everyone", free: "Free users", pro: "Pro users", admins: "Only admins" };
// The object of a button: "Publish to Free users".
const AUDIENCE_TO = { everyone: "everyone", free: "Free users", pro: "Pro users", admins: "admins only" };
const AUDIENCE_OPTIONS = [["everyone", "Everyone"], ["free", "Free plan users"], ["pro", "Pro plan users"], ["admins", "Only admins"]];

/* The type registry. Adding a type is one entry here plus its fields in the editor. */
const TYPES = {
  live: { name: "Live training", eyebrow: "Free live training", icon: "radio", scheduled: true, what: "The free series every other Thursday with Todd Hartley.", deletable: false },
  event: { name: "Event", eyebrow: "Live event", icon: "calendar", scheduled: true, what: "A one-off webinar, workshop or launch call.", deletable: true },
  announcement: { name: "Announcement", eyebrow: "New in Clarity", icon: "megaphone", scheduled: false, what: "Product news or a tip.", deletable: true },
  offer: { name: "Offer", eyebrow: "Offer", icon: "tag", scheduled: false, what: "A promotion, usually for Free plan users.", deletable: true },
  notice: { name: "Notice", eyebrow: "Notice", icon: "alert-triangle", scheduled: false, what: "Planned maintenance or an incident. Warning look.", deletable: true },
};

/* Guard 3. Every banner ends. Defaults on create and the limits the form states before the admin hits them. */
const DEFAULT_DAYS = { announcement: 14, offer: 7, notice: 2, eventLead: 7 };
const LIMITS = { any: 90, offer: 30, noticeLocked: 3 };

/* Guard 4. In-app links are picked, not typed. */
const LINK_PAGES = [["/", "Home"], ["/record", "Record"], ["/help", "Help"], ["/leads", "Leads"], ["/contacts", "Contacts"], ["/settings/subscription", "Billing and plan"], ["/settings/profile", "Profile"]];
const LINK_PAGE_NAME = Object.fromEntries(LINK_PAGES);

/* Guard 8. Templates with the defaults filled in, plus Blank of each type. */
const TEMPLATES = [
  { id: "feature", type: "announcement", name: "Announce a feature", what: "Everyone, 14 days, a Try it button.", fill: { audience: "everyone", days: 14, linkLabel: "Try it" } },
  { id: "offer", type: "offer", name: "Run an offer", what: "Free users, 7 days, an Upgrade button that opens Billing and plan.", fill: { audience: "free", days: 7, linkLabel: "Upgrade", link: "/settings/subscription", showEnd: true } },
  { id: "maintenance", type: "notice", name: "Warn about maintenance", what: "Everyone, 2 days, cannot be closed.", fill: { audience: "everyone", days: 2, dismissible: false } },
  { id: "webinar", type: "event", name: "Host a webinar", what: "Everyone, on Home from 7 days before it starts.", fill: { audience: "everyone", leadDays: 7, duration: 60 } },
];
const BLANK_TEMPLATES = ["announcement", "offer", "event", "notice"].map((type) => ({ id: `blank-${type}`, type, name: `Blank ${TYPES[type].name.toLowerCase()}`, what: TYPES[type].what, fill: {}, blank: true }));
const ALL_TEMPLATES = [...TEMPLATES, ...BLANK_TEMPLATES];
function templateById(id) { return ALL_TEMPLATES.find((t) => t.id === id) || null; }

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
  return Array.from({ length: SESSION_COUNT }, (_, i) => new Date(first + i * RULE.intervalDays * DAY).toISOString().slice(0, 10));
}

function pacificDay(date) {
  const parts = zoneFormatter.formatToParts(date);
  const v = (t) => parts.find((p) => p.type === t)?.value;
  return `${v("year")}-${v("month")}-${v("day")}`;
}

function dayDiff(a, b) {
  return Math.round((Date.parse(`${pacificDay(a)}T00:00:00Z`) - Date.parse(`${pacificDay(b)}T00:00:00Z`)) / DAY);
}

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: RULE.timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
});
const longFormatter = new Intl.DateTimeFormat("en-US", { timeZone: RULE.timeZone, weekday: "long", month: "long", day: "numeric" });
const weekdayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: RULE.timeZone, weekday: "long" });
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
function plusDays(date, days, hhmm) { return `${wallString(new Date(date.getTime() + days * DAY)).slice(0, 10)}T${hhmm}`; }

/* ---------- Guard 7. Times in both zones ---------- */

const ZONES = {
  stockholm: { name: "Stockholm", tz: "Europe/Stockholm" },
  pacific: { name: "Pacific", tz: "America/Los_Angeles" },
};
let adminZone = "stockholm";
function setAdminZone(key) { if (ZONES[key]) adminZone = key; }
const ownFormatters = {};
function ownParts(date) {
  const tz = ZONES[adminZone].tz;
  ownFormatters[tz] ||= new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", minute: "2-digit", year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = ownFormatters[tz].formatToParts(date);
  const v = (t) => parts.find((p) => p.type === t)?.value ?? "";
  return { clock: `${v("hour")}:${v("minute")} ${v("dayPeriod")}`, weekday: v("weekday"), day: `${v("year")}-${v("month")}-${v("day")}` };
}
function relativeDays(date, now) {
  const d = dayDiff(date, now);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  return d > 0 ? `in ${d} days` : `${-d} days ago`;
}
// "Thu, Nov 5, 11:00 AM Pacific (8:00 PM your time), in 9 days". One zone when the admin is in Pacific.
function whenBoth(date, now, { relative = true, weekday = true } = {}) {
  const f = fmt(date);
  let out = `${weekday ? f.date : f.short}, ${f.clock} Pacific`;
  if (adminZone !== "pacific") {
    const o = ownParts(date);
    const sameDay = o.day === pacificDay(date);
    out += ` (${sameDay ? "" : o.weekday + " "}${o.clock} your time)`;
  }
  if (relative && now) out += `, ${relativeDays(date, now)}`;
  return out;
}
function ownClock(date) {
  if (adminZone === "pacific") return "";
  const o = ownParts(date);
  return `${o.day === pacificDay(date) ? "" : o.weekday + " "}${o.clock} your time`;
}

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
  { id: "notice-captions-old", type: "notice", status: "published", audience: "everyone",
    headline: "Captions were delayed on Oct 9", body: "", link: "", linkLabel: "", dismissible: true,
    from: "2026-10-09T09:00", until: "2026-10-10T09:00",
    deleted: { at: "2026-10-12T10:00:00Z", by: "Sam Rivera" },
    history: [{ at: "2026-10-12T10:00:00Z", by: "Sam Rivera", what: "Deleted" }, { at: "2026-10-09T16:00:00Z", by: "Sam Rivera", what: "Published" }] },
];

/* ---------- Links ---------- */

function isExternal(link) { return /^https:\/\//i.test(link || ""); }
function linkKind(link) { if (!link) return "none"; return LINK_PAGE_NAME[link] ? "page" : "web"; }
function linkHost(link) { try { return new URL(link).host; } catch { return ""; } }
function linkName(link) {
  const k = linkKind(link);
  if (k === "none") return "";
  if (k === "page") return LINK_PAGE_NAME[link];
  return linkHost(link) || link;
}
// null when fine, else the message the editor shows.
function linkProblem(link) {
  if (!link) return null;
  if (linkKind(link) === "page") return null;
  if (/^https:\/\/[^\s/]+\.[^\s/]+[^\s]*$/i.test(link)) return null;
  if (/^http:\/\//i.test(link)) return "Outside links must start with https://.";
  return "Type the full address, starting with https://.";
}
/* The mock server check. Any address containing "broken" fails. The rest answer with the page title. */
const KNOWN_TITLES = { "lp.clarity.video/live-training": "Clarity Live Training", "lp.clarity.video/workshop": "Journey Pages workshop", "clarity.video/": "Clarity" };
function checkLink(link) {
  return new Promise((resolve) => {
    if (linkKind(link) !== "web") { resolve({ ok: true, page: true }); return; }
    setTimeout(() => {
      if (/broken/i.test(link)) { resolve({ ok: false, error: "404 Not Found", host: linkHost(link) }); return; }
      if (/timeout/i.test(link)) { resolve({ ok: false, error: "no answer after 10 seconds", host: linkHost(link) }); return; }
      const key = link.replace(/^https:\/\//i, "").replace(/\/$/, "");
      const host = linkHost(link);
      const title = KNOWN_TITLES[key] || KNOWN_TITLES[key + "/"] || host.replace(/^www\./, "").split(".")[0].replace(/^\w/, (c) => c.toUpperCase());
      resolve({ ok: true, title, host });
    }, 500);
  });
}

/* ---------- Guard 3. Windows and limits ---------- */

function windowOf(b) {
  if (b.type === "live") return { from: null, until: null };
  if (b.type === "event") {
    const start = pacificInstant(b.start || "2026-11-11T10:00");
    return { from: new Date(start.getTime() - (b.leadDays ?? 7) * DAY), until: new Date(start.getTime() + (b.duration || 60) * 60_000), start };
  }
  return { from: b.from ? pacificInstant(b.from) : null, until: b.until ? pacificInstant(b.until) : null };
}
function windowDays(b) {
  const w = windowOf(b);
  if (!w.from || !w.until) return null;
  return Math.round((w.until - w.from) / DAY);
}
/* The limit that applies, said before the admin hits it. */
function limitFor(b) {
  if (b.type === "offer") return { days: LIMITS.offer, what: "an offer", text: `An offer shows for up to ${LIMITS.offer} days.` };
  if (b.type === "notice" && b.dismissible === false) return { days: LIMITS.noticeLocked, what: "a notice users cannot close", text: `A notice users cannot close shows for up to ${LIMITS.noticeLocked} days.` };
  if (b.type === "event") return { days: LIMITS.any, what: "an event", text: `An event shows for up to ${LIMITS.any} days before it starts.` };
  const what = b.type === "announcement" ? "an announcement" : "a notice";
  return { days: LIMITS.any, what, text: `${what.replace(/^\w/, (c) => c.toUpperCase())} shows for up to ${LIMITS.any} days.` };
}
/* null when fine, else the problem that blocks saving. */
function windowProblem(b) {
  if (b.type === "live") return null;
  if (b.type === "event") {
    if (!b.start) return "Pick a start.";
    if ((b.leadDays ?? 7) > LIMITS.any) return `An event shows for up to ${LIMITS.any} days before it starts.`;
    return null;
  }
  if (!b.from) return "Pick a start.";
  if (!b.until) return "Pick an end. Every banner ends.";
  const w = windowOf(b);
  if (w.until <= w.from) return "The end is before the start.";
  const days = windowDays(b);
  const lim = limitFor(b);
  if (days > lim.days) {
    const what = b.type === "notice" && b.dismissible === false ? "A notice users cannot close" : `${b.type === "offer" ? "An" : "A"} ${TYPES[b.type].name.toLowerCase()}`;
    const latest = new Date(w.from.getTime() + lim.days * DAY);
    return `${what} shows for up to ${lim.days} days. This one would show for ${days}. End it by ${fmt(latest).date}, or ${b.type === "notice" && b.dismissible === false ? "let users close it" : "split it in two"}.`;
  }
  return null;
}

/* ---------- Resolution. What a banner says at `now` ---------- */

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
      eyebrow: b.eyebrow || (b.host ? `Live with ${b.host}` : t.eyebrow), tag: countdownText(start, live, now), rescheduled: false,
      title: b.title || "Untitled event", date: { month: f.month, day: f.day },
      meta: { when: f.date, time: f.time, minutes: b.duration || 60, tail: null, was: null },
      cta: b.link ? { label: live ? "Join live" : "Add to calendar", icon: live ? "play" : "calendar-plus", href: b.link, external: isExternal(b.link) } : null,
      dismissible: true,
    };
  }
  const view = {
    id: b.id, type: b.type, key: b.id, scheduled: false, live: false, rescheduled: false,
    eyebrow: b.eyebrow || t.eyebrow, tag: null, title: b.headline || `Untitled ${t.name.toLowerCase()}`, body: b.body || "",
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

function forAudience(b, aud) {
  const v = AUDIENCES[aud];
  if (!v) return b.audience === "everyone";
  if (b.audience === "admins") return v.admin;
  return b.audience === "everyone" || b.audience === v.plan;
}

/* The banners a viewer could see, in Home order. Dismissed ones are skipped when a set is given. */
function eligible(banners, now, audience, dismissed) {
  return banners.filter((b) => {
    if (b.deleted || b.status !== "published" || !forAudience(b, audience) || phaseOf(b, now) !== "in") return false;
    const key = dismissKeyOf(b, now);
    if (!key) return false;
    return !(dismissed && dismissed.has(key));
  });
}

function ordinal(n) { return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`; }

/* Admin status at `now`. `pos` is the position in each audience's line, ignoring dismissals. */
function adminStatus(b, now, banners) {
  if (b.deleted) return { kind: "deleted", label: "Deleted", group: "deleted" };
  if (b.status !== "published") return { kind: "draft", label: "Draft", group: "drafts" };
  const ph = phaseOf(b, now);
  if (ph === "after") return { kind: "ended", label: "Ended", group: "ended" };
  if (ph === "before") return { kind: "scheduled", label: "Scheduled", group: "scheduled" };
  const pos = {};
  for (const a of Object.keys(AUDIENCES)) {
    const i = eligible(banners, now, a).findIndex((x) => x.id === b.id);
    pos[a] = i < 0 ? null : i + 1;
  }
  if (b.audience === "admins") return { kind: "admins", label: "Admins only", group: "home", pos };
  if (pos.free === 1 || pos.pro === 1) return { kind: "now", label: "On Home now", group: "home", pos };
  if (pos.free === null && pos.pro === null) return { kind: "hidden", label: "Not shown", group: "home", pos };
  return { kind: "line", label: `${ordinal(Math.min(...Object.values(pos).filter((x) => x)))} in line`, group: "home", pos };
}

function bannerTitle(b) {
  if (b.type === "live") return DEFAULT_TITLE;
  if (b.type === "event") return b.title || "Untitled event";
  return b.headline || `Untitled ${TYPES[b.type].name.toLowerCase()}`;
}
/* The name of the banner that stands in front of another one. */
function blockerName(b) {
  if (b.type === "live") return "Live training";
  const t = bannerTitle(b);
  return t.length <= 28 ? t : `the ${TYPES[b.type].name.toLowerCase()}`;
}
function firstFor(banners, now, aud, exceptId) {
  return eligible(banners.filter((x) => x.id !== exceptId), now, aud)[0] || null;
}

/* Guard 6. One plain status sentence per banner, per audience. */
function statusLine(b, st, now, banners) {
  const w = windowOf(b);
  if (st.kind === "deleted") {
    const at = new Date(b.deleted.at);
    return `Deleted ${fmt(at).short} by ${b.deleted.by}. Gone for good ${fmt(new Date(at.getTime() + 30 * DAY)).short}.`;
  }
  if (st.kind === "draft") return "Draft, nobody sees it";
  if (st.kind === "ended") return `Ended ${fmt(w.until).short}`;
  if (st.kind === "scheduled") return `Starts ${whenBoth(w.from, now)}${b.audience === "everyone" ? "" : ` for ${AUDIENCE_SEES[b.audience]}`}`;
  if (st.kind === "admins") return "Only admins see it";
  const plans = ["free", "pro"].filter((a) => forAudience(b, a));
  const phrase = (a) => {
    const p = st.pos[a]; const who = `${AUDIENCES[a].short} users`;
    if (p === 1) return { k: "show", t: `Showing to ${who} now`, e: "Showing to everyone now" };
    if (p > 1) { const f = eligible(banners, now, a)[0]; const n = blockerName(f); return { k: `wait:${n}`, t: `Waiting behind ${n} for ${who}`, e: `Waiting behind ${n} for everyone` }; }
    return { k: "not", t: `Not shown to ${who}`, e: "Not shown to anyone" };
  };
  const ps = plans.map(phrase);
  if (ps.length === 2 && ps[0].k === ps[1].k) return ps[0].e;
  return ps.map((p, i) => (i ? p.t.replace(/^\w/, (c) => c.toLowerCase()) : p.t)).join(", ");
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
    table: { name: "Ordered table", note: "One table in Home order, grouped as On Home, Scheduled, Drafts, Ended and Deleted. Looks like Users." },
    hero: { name: "Home now", note: "What Free and Pro users see right now and next, then the ordered table." },
    master: { name: "Master detail", note: "The list on the left, the selected banner's editor on the right. The live training is selected on load." },
  },
  templates: {
    picker: { name: "Template dialog", note: "New banner opens a dialog with the four templates and Blank of each type, each with a small preview." },
    cards: { name: "Template cards", note: "The four templates are cards above the list. Blank starts from a small menu under them." },
    menu: { name: "New menu", note: "New banner is a menu. The four templates first, then Blank of each type." },
  },
  editor: {
    sheet: { name: "Side sheet", note: "Edit opens a sheet on the right. The list stays in view." },
    page: { name: "Full page", note: "Edit replaces the list with one banner's page and a Back link." },
    inline: { name: "Inline expand", note: "Edit expands the row into the editor." },
  },
  preview: {
    above: { name: "Above the form", note: "The banner is pinned above the fields and updates as you type." },
    beside: { name: "Beside the form", note: "A preview column beside the fields." },
  },
  review: {
    dialog: { name: "Review dialog", note: "The review opens over everything, like Create account. Cancel closes it and the editor is as you left it." },
    step: { name: "Review step", note: "The review takes the place of the form, in the sheet, page or row. Back returns to the form with nothing lost." },
    inline: { name: "Review under the form", note: "The review opens under the fields. The form stays editable, so a wrong audience is fixed in place." },
  },
  undo: {
    toast: { name: "Undo toast", note: "A toast at the bottom right says what happened and offers Undo for 10 seconds." },
    inline: { name: "Undo on the row", note: "The same sentence and Undo sit on the banner's row for 10 seconds. Deletes and reorders show it above the list." },
  },
  order: {
    buttons: { name: "Up and down", note: "Two small buttons per banner. Each move offers Undo." },
    drag: { name: "Drag handles", note: "Drag the handle, or focus it and press the arrow keys. Each move offers Undo." },
  },
  sessions: {
    table: { name: "Session table", note: "One row per session with the topic typed in the row. Skip and Move open the review." },
    next: { name: "Next up", note: "The next session as a card, later sessions as rows." },
  },
};

const ADMIN_UNSUPPORTED = {
  master: { editor: {
    sheet: "Master detail edits in the right pane. That pane is the inline editor.",
    page: "Master detail edits in the right pane. That pane is the inline editor.",
  } },
};

const DIMS = { home: HOME, admin: ADMIN };

function unsupportedReason(stage, cfg, dim, key) {
  if (stage === "home") return HOME_UNSUPPORTED[cfg.family]?.[dim]?.[key] || null;
  const byLayout = ADMIN_UNSUPPORTED[cfg.layout]?.[dim]?.[key];
  if (byLayout) return byLayout;
  if (dim === "preview" && key === "beside" && cfg.editor === "sheet") return "The sheet is one column. The preview goes above the form.";
  if (dim === "editor" && key === "sheet" && cfg.preview === "beside") return "Beside needs two columns. A sheet has one.";
  return null;
}

const HOME_DEFAULT = { family: "paired", visual: "tile", label: "eyebrow", queue: "one", size: "regular" };
const ADMIN_DEFAULT = { layout: "table", templates: "picker", editor: "sheet", preview: "above", review: "dialog", undo: "toast", order: "buttons", sessions: "table" };

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
  { id: "navy-paper", name: "Navy and paper", why: "Scheduled things earn the navy card. News and offers sit on paper like the page cards, so the dashboard stays calm.",
    config: { family: "paired", visual: "tile", label: "eyebrow", queue: "one", size: "regular" } },
  { id: "one-navy", name: "One navy family", why: "Every banner is the card William picked. The tile icon and the eyebrow tell the types apart, nothing else changes.",
    config: { family: "navy", visual: "tile", label: "eyebrow", queue: "one", size: "regular" } },
  { id: "surfaces", name: "Surface per type", why: "Color names the type before you read a word. Amber for a notice is a convention every user knows.",
    config: { family: "surface", visual: "tile", label: "eyebrow", queue: "one", size: "regular" } },
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
  { id: "admin-table", name: "Admin table", why: "Looks like Users. The review is a dialog like Create account, undo is a toast, templates open in a dialog. Nothing new to learn.",
    config: { layout: "table", templates: "picker", editor: "sheet", preview: "above", review: "dialog", undo: "toast", order: "buttons", sessions: "table" } },
  { id: "home-now", name: "Home now", why: "The first screen is what each audience sees right now. The review is the sheet's second step, so the banner and the audience are the last thing before the button.",
    config: { layout: "hero", templates: "menu", editor: "sheet", preview: "above", review: "step", undo: "toast", order: "drag", sessions: "next" } },
  { id: "full-page", name: "Full page", why: "One banner per page with the preview beside the form. The review opens under the form and undo sits on the row. Nothing floats, nothing is modal.",
    config: { layout: "table", templates: "cards", editor: "page", preview: "beside", review: "inline", undo: "inline", order: "buttons", sessions: "table" } },
  { id: "master-detail", name: "Master detail", why: "Pick on the left, edit on the right. The review takes the pane while the list stays in view, and undo sits on the row you can still see.",
    config: { layout: "master", templates: "cards", editor: "inline", preview: "beside", review: "step", undo: "inline", order: "drag", sessions: "table" } },
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
    },
    templates: {
      picker: { have: ["Dialog", "ButtonBase (template tiles)", "HomeBanner"], missing: [] },
      cards: { have: ["ButtonBase (template cards)", "HomeBanner", "DropdownMenu (Blank types)"], missing: [] },
      menu: { have: ["DropdownMenu with item descriptions and a separator", "Button"], missing: [] },
    },
    editor: {
      sheet: { have: ["Dialog parts", "Input", "Textarea", "NativeSelect", "Switch", "Label", "Button"], missing: ["side sheet (a Dialog variant)"] },
      page: { have: ["Input", "Textarea", "NativeSelect", "Switch", "Label", "Button", "a route"], missing: [] },
      inline: { have: ["Input", "Textarea", "NativeSelect", "Switch", "Label", "Button"], missing: [] },
    },
    preview: {
      above: { have: ["HomeBanner", "Badge"], missing: [] },
      beside: { have: ["HomeBanner", "Badge"], missing: [] },
    },
    review: {
      dialog: { have: ["Dialog parts", "SegmentedControl (audience)", "HomeBanner at two widths", "Button", "Badge"], missing: [] },
      step: { have: ["SegmentedControl (audience)", "HomeBanner at two widths", "Button", "Badge"], missing: [] },
      inline: { have: ["Surface or Card", "SegmentedControl (audience)", "HomeBanner at two widths", "Button", "Badge"], missing: [] },
    },
    undo: {
      toast: { have: ["toast.tsx"], missing: ["an action button (Undo) in ui/toast.tsx", "a success toast variant (toast.tsx has error and preparing only)"] },
      inline: { have: ["Button", "Badge"], missing: [] },
    },
    order: {
      drag: { have: ["ButtonBase (handle)"], missing: ["sortable drag handle list"] },
      buttons: { have: ["Button icon-sm"], missing: [] },
    },
    sessions: {
      table: { have: ["Table", "Input", "Switch", "Badge", "Button", "Input type date and time"], missing: [] },
      next: { have: ["Card", "Table", "Input", "Switch", "Badge", "Button", "Input type date and time"], missing: [] },
    },
  },
};
// Every editor needs a window and a link check. Native date and time inputs serve today; a popover date picker is not in ui/.
const SHARED_MISSING = { admin: ["date picker (native date and time inputs serve today)", "a sentence form layout (inline Input and NativeSelect in a line of text)"], home: [] };

function primitivesFor(stage, cfg) {
  const have = new Set(), missing = new Set();
  for (const dim of Object.keys(DIMS[stage])) {
    const p = PRIMITIVES[stage][dim][cfg[dim]];
    p.have.forEach((x) => have.add(x)); p.missing.forEach((x) => missing.add(x));
  }
  SHARED_MISSING[stage].forEach((x) => missing.add(x));
  return { have: [...have], missing: [...missing] };
}
