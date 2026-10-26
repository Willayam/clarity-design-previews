/* Rendering: the Home page mock and the banner. Pure functions returning HTML strings. */

function icon(name, cls) {
  return `<svg class="${cls || ""}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

const LOGO = `<svg class="mark" viewBox="0 0 32 32" aria-hidden="true" style="fill:none;stroke:none"><circle cx="16" cy="16" r="16" fill="oklch(0.546 0.215 262.9)"/><path d="M22.5 10.2A8.4 8.4 0 1 0 22.5 21.8" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/><path d="M14.2 12.2v7.6l6.4-3.8z" fill="#fff"/></svg>`;

const MOCK_TITLES = ["Acme pricing follow-up", "Northwind demo recap", "Q4 renewal walkthrough", "Welcome to Brightline", "Harbor Co. proposal", "Onboarding for Pine & Oak", "Spring promo for Lumen", "Thanks for the call, Dana"];

function mockCard(i) {
  const faq = i % 4 === 3;
  return `<div class="m-card">
    <div class="preview">
      <div class="share">${icon("upload")}</div>
      <div class="skel"><i class="w1"></i><i class="w2"></i>${faq ? '<i class="line"></i><i class="line"></i><i class="line"></i>' : '<i class="line"></i><i class="line"></i><i class="line"></i><i class="btn"></i>'}</div>
    </div>
    <p class="title">${MOCK_TITLES[i % MOCK_TITLES.length]}</p>
    <p class="meta">Draft <span>·</span> ${icon("calendar")} 1w ago</p>
  </div>`;
}

function mockDesktop(bannerHtml, cards = 8) {
  return `<div class="m-desktop">
    <aside class="m-side">
      <div class="m-logo">${LOGO}<span class="word">Clarity</span><span class="collapse">${icon("panel-left")}</span></div>
      <nav class="m-nav">
        <a class="is-active">${icon("house")}Home</a>
        <a>${icon("users")}Leads</a>
        <a>${icon("settings")}Settings</a>
      </nav>
      <div class="m-account"><span class="avatar">S</span><span class="name">Sam Rivera</span>${icon("chevrons")}</div>
    </aside>
    <div class="m-main">
      <div class="m-head">
        <h1>Home</h1>
        <div class="m-actions">
          <span class="btn btn-outline">${icon("upload")}Upload</span>
          <span class="btn btn-outline">${icon("plus")}New page</span>
          <span class="btn btn-primary"><span class="dot"></span>Record video</span>
        </div>
      </div>
      <div class="m-tabs"><span class="is-active">All</span><span>Videos</span><span>Pages</span><span>Files</span></div>
      <div class="m-banner">${bannerHtml}</div>
      <div class="m-toolbar">
        <div class="m-search">${icon("search")}Search...</div>
        <div class="m-toolbar-right"><span class="btn btn-outline btn-toolbar btn-icon">${icon("arrow-up-down")}</span><span class="btn btn-outline btn-toolbar">${icon("folder-plus")}New folder</span></div>
      </div>
      <div class="m-section"><h2>Journey Pages</h2><span>24</span></div>
      <div class="m-grid">${Array.from({ length: cards }, (_, i) => mockCard(i)).join("")}</div>
    </div>
  </div>`;
}

function mockPhone(bannerHtml) {
  return `<div class="m-phone">
    <div class="m-main">
      <div class="m-head"><h1>Home</h1></div>
      <div class="m-actions">
        <span class="btn btn-outline">${icon("upload")}Upload</span>
        <span class="btn btn-outline">${icon("plus")}New page</span>
      </div>
      <div class="m-tabs"><span class="is-active">All</span><span>Videos</span><span>Pages</span><span>Files</span></div>
      <div class="m-banner">${bannerHtml}</div>
      <div class="m-toolbar">
        <div class="m-search">${icon("search")}Search...</div>
        <div class="m-toolbar-right"><span class="btn btn-outline btn-icon">${icon("arrow-up-down")}</span><span class="btn btn-outline btn-icon">${icon("folder-plus")}</span></div>
      </div>
      <div class="m-section"><h2>Journey Pages</h2><span>24</span></div>
      <div class="m-grid">${Array.from({ length: 6 }, (_, i) => mockCard(i)).join("")}</div>
    </div>
    <div class="m-tabbar">
      <div class="is-active">${icon("house")}Home</div>
      <div>${icon("users")}Leads</div>
      <div><span class="rec">${icon("video")}</span>Record</div>
      <div>${icon("menu")}More</div>
    </div>
  </div>`;
}

/* ---------- Banner ---------- */

const DATE = { month: "Oct", day: "22", weekday: "Thu", short: "Thu, Oct 22", time: "11:00 AM PDT", minutes: "60 min" };

function ctaHtml(cfg, time) {
  const c = DIMENSIONS.cta[cfg.cta];
  const live = time === "live";
  const label = live ? "Join live" : c.label;
  const ic = live ? "play" : c.icon;
  const inner = `${ic && c.style !== "link" ? icon(ic) : ""}${label}${c.style === "link" ? icon("arrow-up-right") : ""}`;
  return `<a class="bn-cta" data-style="${c.style}" href="${LANDING_URL}" target="_blank" rel="noopener noreferrer" data-analytics-id="home_live_training_details">${inner}</a>`;
}

function closeHtml() {
  return `<button type="button" class="bn-close" aria-label="Dismiss until the next session" data-analytics-id="home_live_training_dismiss">${icon("x")}</button>`;
}

function urgencyBits(cfg, time) {
  const t = TIMES[time];
  const live = time === "live";
  switch (cfg.urgency) {
    case "inline": return { lead: "", trail: `<span class="sep">·</span><span class="bn-live-text">${t.text}</span>` };
    case "tag": return { lead: "", trail: `<span class="bn-tag">${live ? '<span class="bn-dot"></span>' : ""}${t.text}</span>` };
    case "dot": return { lead: `<span class="bn-dot"></span>`, trail: `<span class="sep">·</span><span class="bn-live-text">${t.text}</span>` };
    default: return { lead: "", trail: "" };
  }
}

function eyebrowHtml(cfg, time) {
  const h = DIMENSIONS.headline[cfg.headline];
  const u = urgencyBits(cfg, time);
  return `<p class="bn-eyebrow">${u.lead}<span>${h.eyebrow}</span>${u.trail}</p>`;
}

function metaHtml(cfg, { withDate = true } = {}) {
  const h = DIMENSIONS.headline[cfg.headline];
  const date = withDate ? `<b>${DATE.short}</b> · ${DATE.time} · ${DATE.minutes}` : `${DATE.time} · ${DATE.minutes}`;
  return `<p class="bn-meta">${date}<span class="tail"> · ${h.tail}</span></p>`;
}

function visualHtml(cfg, time) {
  const t = TIMES[time];
  switch (cfg.visual) {
    case "icon": return `<div class="bn-visual"><span class="bn-roundel">${icon("radio")}</span></div>`;
    case "tile": return `<div class="bn-visual"><div class="bn-tile" aria-hidden="true"><b>${DATE.month}</b><strong>${DATE.day}</strong></div></div>`;
    case "countdown": return `<div class="bn-visual">${countdownHtml(t)}</div>`;
    case "photo": return `<div class="bn-visual"><span class="bn-avatar"><img src="${POSTER_URL}" alt="Todd Hartley"></span></div>`;
    case "numeral": return `<div class="bn-num" aria-hidden="true"><strong>${DATE.day}</strong><span><b>${DATE.month}</b>${DATE.weekday}</span></div>`;
    default: return "";
  }
}

function countdownHtml(t) {
  if (!t.count) return `<div class="bn-count" aria-label="Live now"><div class="live"><strong>Live</strong><small>now</small></div></div>`;
  return `<div class="bn-count" aria-label="Time until the session starts">${t.count.map(([v, l]) => `<div><strong>${v}</strong><small>${l}</small></div>`).join("")}</div>`;
}

function renderBanner(cfg, time) {
  const h = DIMENSIONS.headline[cfg.headline];
  const attrs = `class="bn" data-layout="${cfg.layout}" data-surface="${cfg.surface}" data-visual="${cfg.visual}" data-urgency="${cfg.urgency}" data-size="${cfg.size}" data-time="${time}" aria-label="Next live training"`;
  const t = TIMES[time];
  const live = time === "live";
  switch (cfg.layout) {
    case "strip": {
      const u = urgencyBits(cfg, time);
      const lead = cfg.urgency === "dot" ? `<span class="bn-dot"></span>` : "";
      const liveText = cfg.urgency === "inline" || cfg.urgency === "dot" ? ` <span class="bn-meta">· </span><span class="bn-live-text">${t.text}</span><span class="bn-meta"> ·</span>` : "";
      const tag = cfg.urgency === "tag" ? `<span class="bn-tag">${live ? '<span class="bn-dot"></span>' : ""}${t.text}</span>` : "";
      return `<aside ${attrs}>${visualHtml(cfg, time)}${lead}<p class="bn-line"><b>${h.title}</b>${liveText}<span class="bn-meta"> ${DATE.short} · ${DATE.time}<span class="tail"> · ${DATE.minutes} · ${h.tail}</span></span></p>${tag}${ctaHtml(cfg, time)}${closeHtml()}</aside>`;
    }
    case "card":
    case "editorial":
      return `<aside ${attrs}>${visualHtml(cfg, time)}<div class="bn-text">${eyebrowHtml(cfg, time)}<h2 class="bn-title">${h.title}</h2>${metaHtml(cfg, { withDate: cfg.layout !== "editorial" })}</div><div class="bn-action">${ctaHtml(cfg, time)}</div>${closeHtml()}</aside>`;
    case "ticket": {
      let stub;
      if (cfg.visual === "countdown") {
        if (!t.count) stub = `<div class="bn-lead live" aria-label="Live now"><b>On air</b><strong>Live</strong><small>right now</small></div>`;
        else {
          const [lead, ...rest] = t.count;
          stub = `<div class="bn-lead" aria-label="Starts in ${t.count.map(([v, l]) => `${v} ${l}`).join(" ")}"><b>Starts in</b><strong>${lead[0]}</strong><small>${lead[1]}</small>${rest.length ? `<small>${rest.map(([v, l]) => `${v} ${l}`).join(" ")}</small>` : ""}</div>`;
        }
      } else {
        stub = `<div class="bn-tile" aria-hidden="true"><b>${DATE.month}</b><strong>${DATE.day}</strong><small>${DATE.weekday}</small></div>`;
      }
      return `<aside ${attrs}><div class="bn-stub">${stub}</div><div class="bn-text">${eyebrowHtml(cfg, time)}<h2 class="bn-title">${h.title}</h2>${metaHtml(cfg, { withDate: cfg.visual === "countdown" })}</div><div class="bn-action">${ctaHtml(cfg, time)}</div>${closeHtml()}</aside>`;
    }
    case "poster":
      return `<aside ${attrs}><div class="bn-photo"><img src="${POSTER_URL}" alt="Todd Hartley"></div><div class="bn-text">${eyebrowHtml(cfg, time)}<h2 class="bn-title">${h.title}</h2>${metaHtml(cfg)}</div><div class="bn-action">${ctaHtml(cfg, time)}</div>${closeHtml()}</aside>`;
    case "split": {
      const vis = cfg.visual === "tile"
        ? `<div class="bn-tile" aria-hidden="true"><b>${DATE.month}</b><strong>${DATE.day}</strong></div>`
        : cfg.visual === "countdown" ? countdownHtml(t) : "";
      const when = cfg.visual === "countdown"
        ? `<div class="bn-when"><span>${DATE.short} · ${DATE.time}</span></div>`
        : `<div class="bn-when"><b>${DATE.short}</b><span>${DATE.time} · ${DATE.minutes}</span></div>`;
      const saysFree = /free|invited/i.test(h.tail);
      return `<aside ${attrs}><div class="bn-text">${eyebrowHtml(cfg, time)}<h2 class="bn-title">${h.title}</h2><p class="bn-meta">${h.tail}.${saysFree ? "" : " Free for every Clarity user."}</p></div><div class="bn-pane"><div class="bn-pane-when">${vis}${when}</div><div class="bn-action">${ctaHtml(cfg, time)}</div></div>${closeHtml()}</aside>`;
    }
    case "spotlight": {
      const u = urgencyBits(cfg, time);
      const vis = cfg.visual === "icon" ? `<span class="bn-roundel">${icon("radio")}</span>` : cfg.visual === "photo" ? `<span class="bn-avatar"><img src="${POSTER_URL}" alt="Todd Hartley"></span>` : "";
      return `<aside ${attrs}><div class="bn-head">${vis}<p class="bn-eyebrow">${u.lead}<span>${h.eyebrow}</span>${u.trail}</p></div><h2 class="bn-title">${h.title}</h2><div class="bn-foot">${metaHtml(cfg)}${ctaHtml(cfg, time)}</div>${closeHtml()}</aside>`;
    }
    default:
      return `<aside ${attrs}>Unknown layout</aside>`;
  }
}

function supportsVisual(layout, visual) {
  return DIMENSIONS.layout[layout].visuals.includes(visual);
}

function coerceConfig(cfg) {
  const out = { ...DEFAULT_CONFIG, ...cfg };
  for (const k of Object.keys(DIMENSIONS)) if (!DIMENSIONS[k][out[k]]) out[k] = DEFAULT_CONFIG[k];
  if (!supportsVisual(out.layout, out.visual)) out.visual = DIMENSIONS.layout[out.layout].visuals[0];
  return out;
}
