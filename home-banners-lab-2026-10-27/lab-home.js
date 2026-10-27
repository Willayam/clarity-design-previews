/* Stage 1. The Home page mock with the banner slot. Each frame owns one instance; dismissals are shared through the lab. */

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

function homeDesktop(slotHtml, viewer) {
  return `<div class="m-desktop m-home">
    <aside class="m-side">
      <div class="m-logo">${LOGO}<span class="word">Clarity</span><span class="collapse">${icon("panel-left")}</span></div>
      <nav class="m-nav">
        <a class="is-active">${icon("house")}Home</a>
        <a>${icon("users")}Leads</a>
        <a>${icon("settings")}Settings</a>
      </nav>
      <div class="m-account"><span class="avatar">${viewer.initial}</span><span class="name">${viewer.name}</span>${icon("chevrons")}</div>
    </aside>
    <div class="m-main" data-scroll>
      <div class="m-head">
        <h1>Home</h1>
        <div class="m-actions">
          <span class="hbtn hbtn-outline">${icon("upload")}Upload</span>
          <span class="hbtn hbtn-outline">${icon("plus")}New page</span>
          <span class="hbtn hbtn-primary"><span class="dot"></span>Record video</span>
        </div>
      </div>
      <div class="m-tabs"><span class="is-active">All</span><span>Videos</span><span>Pages</span><span>Files</span></div>
      <div class="m-banner" data-slot>${slotHtml}</div>
      <div class="m-toolbar">
        <div class="m-search">${icon("search")}Search...</div>
        <div class="m-toolbar-right"><span class="hbtn hbtn-outline hbtn-toolbar hbtn-icon">${icon("arrow-up-down")}</span><span class="hbtn hbtn-outline hbtn-toolbar">${icon("folder-plus")}New folder</span></div>
      </div>
      <div class="m-section"><h2>Journey Pages</h2><span>24</span></div>
      <div class="m-grid">${Array.from({ length: 8 }, (_, i) => mockCard(i)).join("")}</div>
    </div>
  </div>`;
}

function homePhone(slotHtml) {
  return `<div class="m-phone m-home">
    <div class="m-main" data-scroll>
      <div class="m-head"><h1>Home</h1></div>
      <div class="m-actions">
        <span class="hbtn hbtn-outline">${icon("upload")}Upload</span>
        <span class="hbtn hbtn-outline">${icon("plus")}New page</span>
      </div>
      <div class="m-tabs"><span class="is-active">All</span><span>Videos</span><span>Pages</span><span>Files</span></div>
      <div class="m-banner" data-slot>${slotHtml}</div>
      <div class="m-toolbar">
        <div class="m-search">${icon("search")}Search...</div>
        <div class="m-toolbar-right"><span class="hbtn hbtn-outline hbtn-icon">${icon("arrow-up-down")}</span><span class="hbtn hbtn-outline hbtn-icon">${icon("folder-plus")}</span></div>
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

/* lab: { store, hcfg(), now(), audience(), dismissed (Set), dismiss(key) } */
function createHomeApp({ root, phone, lab }) {
  const ui = { index: 0 };
  const viewer = () => (lab.audience() === "pro" ? { name: "Sam Rivera", initial: "S" } : { name: "Dana Ortiz", initial: "D" });

  function queue() {
    const now = lab.now();
    return eligible(lab.store.banners, now, lab.audience(), lab.dismissed).map((b) => resolveBanner(b, now)).filter(Boolean);
  }

  function slotHtml() {
    const q = queue();
    if (!q.length) {
      const all = eligible(lab.store.banners, lab.now(), lab.audience()).length;
      return `<div class="bn-none">${all ? `Nothing to show. All ${all} eligible banners were dismissed. Use Show again in the lab bar.` : `No banner for ${AUDIENCES[lab.audience()].name} users at this time. The slot collapses.`}</div>`;
    }
    return renderSlot(q, lab.hcfg(), ui);
  }

  function render() {
    const scroller = root.querySelector("[data-scroll]");
    const top = scroller ? scroller.scrollTop : 0;
    root.innerHTML = phone ? homePhone(slotHtml()) : homeDesktop(slotHtml(), viewer());
    const next = root.querySelector("[data-scroll]");
    if (next) next.scrollTop = top;
  }

  root.addEventListener("click", (e) => {
    const d = e.target.closest("[data-dismiss]");
    if (d) { e.preventDefault(); lab.dismiss(d.dataset.dismiss); return; }
    const p = e.target.closest("[data-pager]");
    if (p) { ui.index = Math.max(0, (ui.index || 0) + Number(p.dataset.pager)); render(); return; }
    if (e.target.closest("a.bn-cta")) e.preventDefault();
  });

  render();
  return { render, queue, ui, reset() { ui.index = 0; render(); } };
}

/* The scanning strip. One frame per width. */
function createTypeStrip({ root, lab }) {
  function render() { root.innerHTML = `<div class="m-types-page">${renderTypeStrip(lab.hcfg(), lab.now())}</div>`; }
  root.addEventListener("click", (e) => { if (e.target.closest("a.bn-cta")) e.preventDefault(); });
  render();
  return { render };
}
