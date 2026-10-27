/* The banner family. One renderer for every type, driven by the Home config. Used by the Home stage and the admin preview. */

function icon(name, cls) {
  return `<svg class="${cls || ""}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}
function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* Which surface and layout a type gets under a family. Scheduled types always keep the navy card William picked. */
function familyFor(hcfg, view) {
  if (view.scheduled) return { layout: "card", surface: "navy" };
  switch (hcfg.family) {
    case "paired": return { layout: "card", surface: view.type === "notice" ? "amber" : "paper" };
    case "surface": return { layout: "card", surface: view.type === "notice" ? "amber" : view.type === "offer" ? "brand" : "paper" };
    case "strip": return { layout: "strip", surface: view.type === "notice" ? "amber" : view.type === "offer" ? "tint" : "paper" };
    default: return { layout: "card", surface: "navy" };
  }
}

function ctaHtml(view, style) {
  if (!view.cta) return "";
  const c = view.cta;
  const trail = !c.icon && c.external ? icon("arrow-up-right") : "";
  return `<a class="bn-cta" data-style="${style}" href="${esc(c.href)}"${c.external ? ' target="_blank" rel="noopener noreferrer"' : ""} data-analytics-id="home_banner_action">${c.icon ? icon(c.icon) : ""}${esc(c.label)}${trail}</a>`;
}

/* opts.size overrides the config size. opts.inert makes the dismiss button a decoration (admin previews).
   opts.mini drops the dismiss button and the action, for a thumbnail inside another button. */
function renderBanner(view, hcfg, opts = {}) {
  const size = opts.size || hcfg.size;
  const { layout, surface } = familyFor(hcfg, view);
  const t = TYPES[view.type];
  const attrs = `class="bn${layout === "strip" ? " bn-strip" : ""}" data-type="${view.type}" data-layout="${layout}" data-surface="${surface}" data-size="${size}" data-live="${view.live ? 1 : 0}" data-key="${esc(view.key)}" aria-label="${esc(t.name)}"`;
  if (opts.mini) view = { ...view, cta: null };
  const close = view.dismissible && !opts.mini ? `<button type="button" class="bn-close" aria-label="Dismiss" ${opts.inert ? "" : `data-dismiss="${esc(view.key)}"`} data-analytics-id="home_banner_dismiss">${icon("x")}</button>` : "";
  const tag = view.tag ? `<span class="bn-tag">${view.live ? '<span class="bn-dot"></span>' : ""}${esc(view.tag)}</span>` : "";

  if (layout === "strip") {
    const vis = hcfg.visual === "none" ? "" : `<span class="bn-roundel" aria-hidden="true">${icon(t.icon)}</span>`;
    const lead = hcfg.label === "eyebrow" ? `<b class="bn-lead">${esc(view.eyebrow)}</b>` : hcfg.label === "chip" ? `<span class="bn-tag bn-chip">${esc(view.eyebrow)}</span>` : "";
    const end = tag || view.cta ? `<span class="bn-strip-end">${tag}${ctaHtml(view, "outline")}</span>` : "";
    return `<aside ${attrs}>${vis}<p class="bn-line">${lead}<span class="bn-line-title">${esc(view.title)}</span>${view.body ? `<span class="bn-line-body">${esc(view.body)}</span>` : ""}</p>${end}${close}</aside>`;
  }

  let visual = "";
  if (view.scheduled) visual = `<div class="bn-tile" aria-hidden="true"><b>${esc(view.date.month)}</b><strong>${esc(view.date.day)}</strong></div>`;
  else if (hcfg.visual === "tile") visual = `<div class="bn-tile bn-tile-icon" aria-hidden="true">${icon(t.icon)}</div>`;
  else if (hcfg.visual === "icon") visual = `<span class="bn-roundel" aria-hidden="true">${icon(t.icon)}</span>`;

  let eyebrow = "";
  if (view.scheduled) eyebrow = `<p class="bn-eyebrow"><span>${esc(view.eyebrow)}</span>${tag}${view.rescheduled ? `<span class="bn-tag">Rescheduled</span>` : ""}</p>`;
  else if (hcfg.label === "eyebrow") eyebrow = `<p class="bn-eyebrow"><span>${esc(view.eyebrow)}</span>${tag}</p>`;
  else if (hcfg.label === "chip") eyebrow = `<p class="bn-eyebrow"><span class="bn-tag bn-chip">${esc(view.eyebrow)}</span>${tag}</p>`;
  else if (tag) eyebrow = `<p class="bn-eyebrow">${tag}</p>`;

  let meta = "";
  if (view.scheduled) {
    const tail = view.meta.was ? ` · Was ${esc(view.meta.was)}` : view.meta.tail ? ` · ${esc(view.meta.tail)}` : "";
    meta = `<p class="bn-meta"><time>${esc(view.meta.when)}</time> · ${esc(view.meta.time)} · ${view.meta.minutes} min<span class="tail">${tail}</span></p>`;
  } else if (view.body) meta = `<p class="bn-meta bn-body">${esc(view.body)}</p>`;

  const style = surface === "brand" ? "inverse" : surface === "amber" ? "outline" : "primary";
  return `<aside ${attrs}>${visual}<div class="bn-text">${eyebrow}<h2 class="bn-title">${esc(view.title)}</h2>${meta}</div>${ctaHtml(view, style)}${close}</aside>`;
}

/* The Home slot. `queue` is the eligible views in order. `ui.index` is the pager position. */
function renderSlot(queue, hcfg, ui = {}, opts = {}) {
  if (!queue.length) return "";
  if (hcfg.queue === "stack") {
    return `<div class="bn-stack">${renderBanner(queue[0], hcfg, opts)}${queue[1] ? renderBanner(queue[1], hcfg, { ...opts, size: "compact" }) : ""}</div>`;
  }
  if (hcfg.queue === "pager" && queue.length > 1) {
    const i = Math.min(ui.index || 0, queue.length - 1);
    return `<div class="bn-queue">${renderBanner(queue[i], hcfg, opts)}<div class="bn-pager"><button type="button" class="bn-pager-btn" data-pager="-1" aria-label="Previous banner"${i === 0 ? " disabled" : ""}>${icon("chevron-left")}</button><span>${i + 1} of ${queue.length}</span><button type="button" class="bn-pager-btn" data-pager="1" aria-label="Next banner"${i === queue.length - 1 ? " disabled" : ""}>${icon("chevron-right")}</button></div></div>`;
  }
  return renderBanner(queue[0], hcfg, opts);
}

/* Every type variant, for the scanning strip. Synthetic data so the strip never depends on what the admin has done. */
function typeVariants(now) {
  const nov5 = "2026-11-05";
  const liveAt = (sessions, at) => resolveBanner({ id: "live-training", type: "live", status: "published", audience: "everyone", sessions }, at);
  const liveNow = pacificInstant(`${nov5}T11:20`);
  const base = (b) => resolveBanner({ status: "published", audience: "everyone", ...b }, now);
  return [
    { label: "Live training, no topic", view: liveAt({}, now) },
    { label: "Live training, with topic", view: liveAt({ [nov5]: { topic: "Recording Videos Prospects Finish" } }, now) },
    { label: "Live training, live now", view: liveAt({ [nov5]: { topic: "Recording Videos Prospects Finish" } }, liveNow) },
    { label: "Live training, rescheduled", view: liveAt({ [nov5]: { topic: "Recording Videos Prospects Finish", movedTo: "2026-11-06T10:00" } }, now) },
    { label: "Event", view: base({ id: "event-workshop", type: "event", title: "Journey Pages workshop", host: "Sam Rivera", start: "2026-11-11T10:00", duration: 45, link: "https://lp.clarity.video/workshop", leadDays: 7 }) },
    { label: "Announcement", view: base({ id: "announcement-teleprompter", type: "announcement", headline: "Teleprompter is here", body: "Read your script while you record.", link: "/record", linkLabel: "Try it" }) },
    { label: "Offer, Free plan", view: base({ id: "offer-pro", type: "offer", headline: "Get Pro for 20% off", body: "", link: "/settings/subscription", linkLabel: "Upgrade", showEnd: true, until: "2026-11-06T23:59" }) },
    { label: "Notice, dismissible", view: base({ id: "notice-a", type: "notice", headline: "Captions are delayed today", body: "New recordings get captions within a few hours.", link: "", dismissible: true }) },
    { label: "Notice, not dismissible", view: base({ id: "notice-maintenance", type: "notice", headline: "Scheduled maintenance Sunday 2:00 to 3:00 AM Pacific", body: "Recording and Journey Pages pause for about an hour.", link: "", dismissible: false }) },
  ];
}

function renderTypeStrip(hcfg, now) {
  return `<div class="types">${typeVariants(now).map((v) => `<div class="types-row"><p class="types-label">${v.label}</p>${renderBanner(v.view, hcfg, { inert: true })}</div>`).join("")}</div>`;
}
