/* Data for the live trainings admin lab. Mock only. */

const LANDING_URL = "https://lp.clarity.video/live-training";
const DEFAULT_TITLE = "Clarity Live Training with Todd Hartley";
const TOPIC_MAX = 80;
const CURRENT_ADMIN = "Alex Kim";

// The rule stays in code. Admins never edit it on this page.
const RULE = { firstSessionDate: "2026-10-22", startTime: "11:00", timeZone: "America/Los_Angeles", intervalDays: 14, durationMinutes: 60 };
const SESSION_COUNT = 9; // 22 Oct through 11 Feb

// One optional override per scheduled date (the date the rule produces, Pacific).
const OVERRIDES = {
  "2026-10-22": { topic: "Mastering Your Clarity Journey Page Prompts", skipped: false, movedTo: null, editedBy: "Sam Rivera", editedAt: "2026-10-20T16:02:00Z" },
  "2026-12-31": { topic: null, skipped: true, movedTo: null, editedBy: "Sam Rivera", editedAt: "2026-10-26T18:40:00Z" },
};

const TIMES = {
  today: { name: "Today, Oct 27", now: "2026-10-27T17:00:00Z" },
  morning: { name: "Nov 5, morning", now: "2026-11-05T16:00:00Z" },
  live: { name: "Nov 5, live", now: "2026-11-05T19:20:00Z" },
};

const MOCK_TOPICS = ["Mastering Your Clarity Journey Page Prompts", "Recording Videos Prospects Finish", "Following Up With Journey Page Views"];

/* ---------- Schedule maths, ported from editor/src/lib/live-trainings.ts ---------- */

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

// Pacific calendar day of an instant, as "YYYY-MM-DD".
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

/* A session list from a set of overrides, as users would see it at `now`. */
function buildSessions(overrides, now) {
  const list = scheduledDates().map((date) => {
    const o = overrides[date] || {};
    const movedTo = o.movedTo || null;
    const startsAt = pacificInstant(movedTo || `${date}T${RULE.startTime}`);
    const endsAt = new Date(startsAt.getTime() + RULE.durationMinutes * 60_000);
    const scheduledAt = pacificInstant(`${date}T${RULE.startTime}`);
    return {
      date, topic: o.topic || null, skipped: !!o.skipped, movedTo, editedBy: o.editedBy || null, editedAt: o.editedAt || null,
      startsAt, endsAt, scheduledAt,
      past: endsAt.getTime() <= now.getTime(),
      live: startsAt.getTime() <= now.getTime() && now.getTime() < endsAt.getTime(),
    };
  });
  list.sort((a, b) => a.startsAt - b.startsAt);
  const next = list.find((s) => !s.skipped && !s.past) || null;
  for (const s of list) {
    s.isNext = !!next && next.date === s.date;
    s.daysAway = dayDiff(s.startsAt, now);
  }
  // Which session takes over on Home when this one is skipped or over.
  for (let i = 0; i < list.length; i++) {
    const after = list.slice(i + 1).find((s) => !s.skipped && !s.past);
    list[i].fallback = after || null;
    const before = list.slice(0, i).reverse().find((s) => !s.skipped && !s.past);
    list[i].showsAfter = before || null;
  }
  return { list, next };
}

function timingTag(session) {
  if (session.live) return "Live now";
  if (session.daysAway === 0) return "Today";
  if (session.daysAway === 1) return "Tomorrow";
  return `In ${session.daysAway} days`;
}

/* ---------- Lab dimensions ---------- */

const DIMENSIONS = {
  layout: {
    table: { name: "Table", note: "One row per session, like Users and Organizations. The topic is typed in the row." },
    hero: { name: "Next + list", note: "The next session gets a large card at the top. Later sessions are rows below it." },
    master: { name: "Master detail", note: "A session list on the left. The selected session is edited on the right. On a phone the selected row opens in place." },
    calendar: { name: "Calendar", note: "Month grids with the Thursdays marked. The selected date is edited in a side panel. On a phone, one month at a time with the panel below." },
    cards: { name: "Cards", note: "One card per session, grouped by month. Each card is its own editor." },
    twoup: { name: "Two up", note: "The next two sessions side by side as large cards. The rest in a compact list." },
  },
  editing: {
    row: { name: "Save per session", note: "Save and Cancel appear on the session you changed." },
    bar: { name: "Save bar", note: "Changes collect in one bar at the bottom until you press Save." },
    auto: { name: "Autosave", note: "Saves on its own a moment after you stop typing. A receipt says Saved or Not saved." },
    dialog: { name: "Edit dialog", note: "The page is read only. Edit opens a dialog with its own Save. Job 1 costs a third click." },
  },
  preview: {
    top: { name: "Pinned on top", note: "The banner users see now stays at the top of the page and updates as you type." },
    beside: { name: "Beside", note: "A preview column beside the editor follows the session you are in." },
    inline: { name: "Under the field", note: "The banner renders under the session you are editing." },
    sheet: { name: "Preview button", note: "A Preview button opens the banner and the Help card in a dialog." },
    none: { name: "Text only", note: "No rendered banner. A sentence says what users see. Fails job 2 on purpose, for contrast." },
  },
  move: {
    native: { name: "Date and time inputs", note: "Move reveals the browser's own date and time fields in place." },
    dialog: { name: "Move dialog", note: "Move opens a dialog with the fields and the resulting date." },
    pick: { name: "Pick a day", note: "Move offers a list of nearby days. The time stays at 11:00 AM unless changed." },
  },
  skip: {
    switch: { name: "Switch", note: "A labelled switch on each session." },
    menu: { name: "Menu with confirm", note: "A menu holds Skip and Move. Skip asks once before it applies." },
    button: { name: "Skip button", note: "A plain Skip this session button that turns into Restore." },
  },
};

const DEFAULT_CONFIG = { layout: "table", editing: "row", preview: "top", move: "native", skip: "switch" };

// Combinations a layout does not support, with the one-line reason the lab shows.
const UNSUPPORTED = {
  master: { preview: { beside: "Master detail already uses two columns. The preview goes under the field, on top, or behind the Preview button." } },
  calendar: { preview: { beside: "The side panel is already the column beside the grid. The preview goes under the field there." } },
  twoup: { preview: { beside: "Two up uses both columns. The preview goes under each field or on top." } },
};

function unsupportedReason(layout, dim, key) {
  return UNSUPPORTED[layout]?.[dim]?.[key] || null;
}

const PRESETS = [
  { id: "admin-table", name: "Admin table", why: "Looks like Users and Organizations. The banner users see now is pinned above the table and changes as you type.", config: { layout: "table", editing: "row", preview: "top", move: "native", skip: "switch" } },
  { id: "next-up", name: "Next up", why: "The next session is the whole first screen, with its banner right under the field. Later sessions wait below.", config: { layout: "hero", editing: "row", preview: "inline", move: "dialog", skip: "button" } },
  { id: "quiet-autosave", name: "Quiet autosave", why: "Type and leave. The pinned banner and the Saved receipt are the only proof you need.", config: { layout: "hero", editing: "auto", preview: "top", move: "pick", skip: "switch" } },
  { id: "master-detail", name: "Master detail", why: "Pick a date on the left, edit on the right. Holds a whole season of topics without a long page.", config: { layout: "master", editing: "row", preview: "inline", move: "native", skip: "menu" } },
  { id: "calendar", name: "Calendar", why: "Holidays are obvious on a month grid. The side panel edits the selected date and shows its banner.", config: { layout: "calendar", editing: "row", preview: "inline", move: "native", skip: "switch" } },
  { id: "cards", name: "Cards", why: "One card per session reads the same on a phone and a desktop. Each card saves itself.", config: { layout: "cards", editing: "auto", preview: "inline", move: "dialog", skip: "button" } },
  { id: "two-up", name: "Two up", why: "Next and the one after, side by side, with one Save bar for both. Matches how the team actually plans.", config: { layout: "twoup", editing: "bar", preview: "inline", move: "pick", skip: "switch" } },
  { id: "table-save-bar", name: "Table with a save bar", why: "Edit several rows, save once. The preview column follows the row you are in.", config: { layout: "table", editing: "bar", preview: "beside", move: "dialog", skip: "menu" } },
  { id: "short-table", name: "Short table", why: "A plain table and nothing else. Preview opens on demand, so the page stays one screen tall.", config: { layout: "table", editing: "row", preview: "sheet", move: "pick", skip: "button" } },
  { id: "calendar-autosave", name: "Calendar, autosave", why: "A grid for the season and a pinned banner for today. Changes save on their own.", config: { layout: "calendar", editing: "auto", preview: "top", move: "dialog", skip: "menu" } },
  { id: "cards-save-bar", name: "Cards with a save bar", why: "Cards for reading, one bar for saving. The pinned banner never moves.", config: { layout: "cards", editing: "bar", preview: "top", move: "native", skip: "switch" } },
];

function coerceConfig(cfg) {
  const out = { ...DEFAULT_CONFIG, ...cfg };
  for (const k of Object.keys(DIMENSIONS)) if (!DIMENSIONS[k][out[k]]) out[k] = DEFAULT_CONFIG[k];
  for (const dim of Object.keys(DIMENSIONS)) {
    if (dim === "layout") continue;
    if (unsupportedReason(out.layout, dim, out[dim])) {
      out[dim] = Object.keys(DIMENSIONS[dim]).find((k) => !unsupportedReason(out.layout, dim, k));
    }
  }
  return out;
}
