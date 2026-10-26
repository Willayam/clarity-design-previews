/* Data for the banner lab. Each dimension is a named set of options.
   A banner is one choice per dimension. Presets are named combinations. */

const POSTER_URL = "https://files.clarity.video/files/marketing/learn-getting-started-fast-track-video-sales/poster.jpg?w=720";
const LANDING_URL = "https://lp.clarity.video/live-training";

const DIMENSIONS = {
  layout: {
    strip: { name: "Strip", note: "One line, 44 px tall. Reads as part of the toolbar.", visuals: ["none", "icon", "photo"] },
    card: { name: "Card", note: "Eyebrow, title and meta beside an optional visual. The CTA sits at the right.", visuals: ["none", "icon", "tile", "countdown", "photo"] },
    ticket: { name: "Ticket", note: "A date stub on a dashed edge, like an event pass.", visuals: ["tile", "countdown"] },
    editorial: { name: "Editorial", note: "The day number is the only big thing on the page besides the title.", visuals: ["numeral"] },
    poster: { name: "Poster", note: "Todd's video frame fills the left edge. On a phone it becomes a small round photo.", visuals: ["photo"] },
    split: { name: "Split", note: "Message on the left, a colored action pane on the right that holds the date and the button.", visuals: ["none", "tile", "countdown"] },
    spotlight: { name: "Spotlight", note: "One column. A bigger headline, with the button at the end of the meta row.", visuals: ["none", "icon", "photo"] },
  },
  surface: {
    paper: { name: "Paper", note: "White card with a slate border, the same as the Journey Page cards." },
    tint: { name: "Tint", note: "Light blue fill with a blue hairline." },
    rail: { name: "Rail", note: "Paper with a short blue bar on the left edge." },
    outline: { name: "Outline", note: "No fill. Only a border on the slate page." },
    brand: { name: "Brand", note: "Solid brand blue with white type." },
    ink: { name: "Ink", note: "Flat slate-900. No glow." },
    navy: { name: "Navy", note: "Flat blue-950 with blue-200 accents." },
  },
  visual: {
    none: { name: "None" },
    icon: { name: "Icon", note: "A broadcast icon in a small circle." },
    tile: { name: "Date tile", note: "Month and day on one quiet tile." },
    countdown: { name: "Countdown", note: "Days, hours and minutes until the start." },
    photo: { name: "Todd photo", note: "The public Learn video frame. A real headshot would be better at small sizes." },
    numeral: { name: "Big numeral", note: "The day number set large, with month and weekday beside it." },
  },
  headline: {
    generic: { name: "Generic title", eyebrow: "Free live training", title: "Clarity Live Training with Todd Hartley", tail: "Every other Thursday" },
    topic: { name: "Session topic", eyebrow: "Live with Todd Hartley", title: "Mastering Your Clarity Journey Page Prompts", tail: "Free, no sign-up" },
    host: { name: "Join Todd", eyebrow: "Free live training", title: "Join Todd Hartley live", tail: "No sign-up needed" },
    invite: { name: "You're invited", eyebrow: "You're invited", title: "Free live training with Todd Hartley", tail: "Every Clarity user is invited" },
    outcome: { name: "Close more deals", eyebrow: "Free live training", title: "Close more deals with Clarity", tail: "Live with Todd Hartley", claim: true },
    qa: { name: "Bring questions", eyebrow: "Live with Todd Hartley", title: "Bring your questions, Todd answers live", tail: "Free, no sign-up", claim: true },
  },
  urgency: {
    none: { name: "None" },
    inline: { name: "Inline text", note: "The time left is written into the eyebrow." },
    tag: { name: "Tag", note: "A small bordered tag. Turns red during the live hour." },
    dot: { name: "Status dot", note: "A dot before the eyebrow. Pulses red during the live hour." },
  },
  cta: {
    "primary-cal": { name: "Primary, Add to calendar", style: "primary", label: "Add to calendar", icon: "calendar-plus" },
    "primary-see": { name: "Primary, See what's on", style: "primary", label: "See what's on", icon: "arrow-up-right" },
    "outline-view": { name: "Outline, View details", style: "outline", label: "View details", icon: null },
    "outline-cal": { name: "Outline, Add to calendar", style: "outline", label: "Add to calendar", icon: "calendar-plus" },
    "ink-cal": { name: "Ink, Add to calendar", style: "ink", label: "Add to calendar", icon: "calendar-plus" },
    "link-see": { name: "Link, See what's on", style: "link", label: "See what's on", icon: "arrow-up-right" },
  },
  size: {
    compact: { name: "Compact" },
    regular: { name: "Regular" },
    roomy: { name: "Roomy" },
  },
};

/* Why a layout refuses a visual. Shown next to the disabled option. */
const VISUAL_REASONS = {
  strip: "The strip is one line. A tile, countdown or numeral needs two.",
  card: "The card has no place for a big numeral. Use Editorial for that.",
  ticket: "The ticket stub is the date. It takes a tile or a countdown.",
  editorial: "Editorial is built around the numeral.",
  poster: "Poster is built around the photo.",
  split: "The split pane holds the date. It takes a tile or a countdown or nothing.",
  spotlight: "Spotlight keeps the headline alone. A tile or countdown would fight it.",
};

const TIMES = {
  "5d": { name: "In 5 days", text: "In 5 days", count: [["04", "days"], ["21", "hrs"], ["30", "min"]] },
  "1d": { name: "Tomorrow", text: "Tomorrow", count: [["21", "hrs"], ["30", "min"]] },
  "0d": { name: "Today", text: "Today", count: [["02", "hrs"], ["10", "min"]] },
  live: { name: "Live now", text: "Live now", count: null },
};

/* Twenty named designs. `time` is a starting time state for the lab only. */
const PRESETS = [
  { id: "quiet-strip", name: "Quiet strip", why: "It takes 44 px and reads as part of the toolbar, so nobody resents it and the date is always in view.",
    config: { layout: "strip", surface: "paper", visual: "none", headline: "generic", urgency: "dot", cta: "link-see", size: "compact" } },
  { id: "todd-strip", name: "Todd on the line", why: "A face on a one line strip is rare in a dashboard, so the eye stops on it.",
    config: { layout: "strip", surface: "paper", visual: "photo", headline: "host", urgency: "inline", cta: "outline-view", size: "compact" } },
  { id: "calendar-card", name: "Calendar card", why: "The date tile says when before you read a word, and the card matches the page.",
    config: { layout: "card", surface: "paper", visual: "tile", headline: "generic", urgency: "tag", cta: "primary-cal", size: "regular" } },
  { id: "ink-spotlight", name: "Ink spotlight", why: "The white tile is the only bright thing on a flat dark card, so it is the spotlight.",
    config: { layout: "card", surface: "ink", visual: "tile", headline: "topic", urgency: "tag", cta: "primary-cal", size: "regular" } },
  { id: "brand-feature", name: "Brand feature", why: "Solid brand blue cannot be missed, and the white button is the obvious next click.",
    config: { layout: "card", surface: "brand", visual: "tile", headline: "invite", urgency: "tag", cta: "primary-see", size: "regular" } },
  { id: "ticket", name: "Ticket", why: "A pass shape says this is an event you hold a seat for, with nothing to sign up for.",
    config: { layout: "ticket", surface: "paper", visual: "tile", headline: "topic", urgency: "tag", cta: "primary-cal", size: "regular" } },
  { id: "brand-strip", name: "Brand strip", why: "A 44 px line of brand blue is the smallest thing on the page that nobody can miss.",
    config: { layout: "strip", surface: "brand", visual: "none", headline: "generic", urgency: "tag", cta: "outline-view", size: "compact" } },
  { id: "editorial", name: "Editorial", why: "A big 22 is a date you remember, and the rest stays quiet around it.",
    config: { layout: "editorial", surface: "paper", visual: "numeral", headline: "topic", urgency: "inline", cta: "outline-view", size: "regular" } },
  { id: "editorial-ink", name: "Editorial ink", why: "White numeral on slate is the loudest thing on the page without any effects.",
    config: { layout: "editorial", surface: "ink", visual: "numeral", headline: "generic", urgency: "tag", cta: "primary-cal", size: "roomy" } },
  { id: "poster", name: "Poster", why: "A real person at the left edge sells a live session better than any copy.",
    config: { layout: "poster", surface: "paper", visual: "photo", headline: "host", urgency: "tag", cta: "primary-cal", size: "regular" } },
  { id: "poster-ink", name: "Poster ink", why: "The frame and the dark card read as one video still, which is what the session is.",
    config: { layout: "poster", surface: "ink", visual: "photo", headline: "topic", urgency: "dot", cta: "primary-cal", size: "regular" } },
  { id: "split-brand", name: "Split brand pane", why: "The blue pane holds the date and the button together, so the action has a home.",
    config: { layout: "split", surface: "paper", visual: "none", headline: "generic", urgency: "tag", cta: "primary-cal", size: "regular" } },
  { id: "split-ink", name: "Split ink", why: "Two flat colors, a dark body and a blue pane, do the work a glow used to fake.",
    config: { layout: "split", surface: "ink", visual: "tile", headline: "invite", urgency: "inline", cta: "primary-cal", size: "regular" } },
  { id: "topic-spotlight", name: "Topic spotlight", why: "The session topic is the sell, so it gets the only large type.",
    config: { layout: "spotlight", surface: "paper", visual: "none", headline: "topic", urgency: "dot", cta: "primary-cal", size: "roomy" } },
  { id: "tint-spotlight", name: "Tinted spotlight", why: "A light blue field lifts the banner off the page without going dark.",
    config: { layout: "spotlight", surface: "tint", visual: "photo", headline: "qa", urgency: "tag", cta: "outline-view", size: "regular" } },
  { id: "countdown-card", name: "Countdown card", why: "Three numbers ticking down give a reason to click today rather than later.",
    config: { layout: "card", surface: "paper", visual: "countdown", headline: "generic", urgency: "none", cta: "primary-cal", size: "regular" } },
  { id: "countdown-navy", name: "Countdown navy", why: "The navy keeps William's dark spotlight idea, and the count carries the urgency instead of a glow.",
    config: { layout: "card", surface: "navy", visual: "countdown", headline: "outcome", urgency: "none", cta: "primary-cal", size: "regular" } },
  { id: "on-air", name: "On air", why: "During the hour the strip turns into a red live signal with one button, Join live.",
    config: { layout: "strip", surface: "ink", visual: "none", headline: "generic", urgency: "dot", cta: "primary-see", size: "compact" }, time: "live" },
  { id: "rail-notice", name: "Rail notice", why: "A short blue rail marks it as a notice from Clarity, and the link keeps it quiet.",
    config: { layout: "card", surface: "rail", visual: "icon", headline: "invite", urgency: "inline", cta: "link-see", size: "compact" } },
  { id: "outline-card", name: "Outline tile", why: "No fill at all, so the tile and the button are the only objects on the slate.",
    config: { layout: "card", surface: "outline", visual: "tile", headline: "host", urgency: "tag", cta: "ink-cal", size: "compact" } },
];

const DEFAULT_CONFIG = { ...PRESETS[2].config };
