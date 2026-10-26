// Steps 5 and 6: what the listener sees at clarity.video/<handle>, and where Todd sees that the podcast worked.
// PROTOTYPE, throwaway. Mock data only.
(() => {
  const STAGE = 'oklch(0.93 0.008 255)';
  const PLAY = '<span class="v-listener-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg></span>';
  const MARK = '<svg class="v-listener-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="13" stroke="currentColor" stroke-width="4"/><path d="M13 10.5v11l9-5.5z" fill="currentColor"/></svg>';
  // The shell fills handle spans on the combination and gallery renders but not in the focus view, so each mount fills its own.
  const fill = (root, c) => {
    root.querySelectorAll('[data-handle]').forEach((node) => { node.textContent = c.handle; });
    root.querySelectorAll('[data-handle-url]').forEach((node) => { node.textContent = `clarity.video/${c.handle}`; });
  };

  // ---------- the mock Journey Page ----------
  const brand = (c) => `<div class="v-listener-brand"><i aria-hidden="true"></i>${c.company}</div>`;
  const badge = () => `<div class="v-listener-badge"><span>Made with</span>${MARK}<b>Clarity</b><span aria-hidden="true">·</span><a>Make your own</a></div>`;
  function livePage(c, { greeting = '', desktop = false } = {}) {
    return `<div class="v-listener-page${desktop ? ' v-listener-page--desktop' : ''}">
      ${brand(c)}
      ${greeting}
      <h1 class="v-listener-h1">${c.pages[0].title}</h1>
      <div class="v-listener-video">${PLAY}<small>${c.name} · 2:14</small></div>
      <div class="v-listener-cta"><button class="${c.btn('default', 'lg')}">Book a strategy call</button></div>
      <h2 class="v-listener-h2">What I covered on the show</h2>
      <p class="v-listener-p">The pricing page that stops the haggling, and the follow-up that gets a reply. The worksheet below has both.</p>
      <div class="v-listener-form">
        <h2 class="v-listener-h2">Get the worksheet</h2>
        <input class="app-input" placeholder="Name" aria-label="Name">
        <input class="app-input" placeholder="Work email" aria-label="Work email">
        <button class="${c.btn('default')}">Send me the worksheet</button>
      </div>
      ${badge()}
    </div>`;
  }
  const greeting = (c) => `<div class="v-listener-greet"><span class="app-avatar">${c.first[0]}</span><div><b>Heard me on a podcast? Start here.</b><span>Watch the two-minute intro, then book a call or grab the worksheet.</span></div></div>`;

  // ---------- step 5: what the listener sees ----------
  PG.variant({
    surface: 'listener',
    key: 'A',
    name: 'The page, nothing added',
    idea: 'The handle is only an address. Clarity serves the page Todd built at /todd, keeps the short address in the bar, and adds nothing on top of his brand.',
    width: 1240,
    padding: 20,
    background: STAGE,
    render: (c) => `<div class="v-listener-pair">
      ${c.phone({ body: livePage(c) })}
      ${c.browser({ body: livePage(c, { desktop: true }) })}
    </div>`,
    mount: fill,
  });

  PG.variant({
    surface: 'listener',
    key: 'B',
    name: 'Owner-set greeting',
    idea: 'Todd writes one line for people who typed his address. It sits above the page while it is live, and becomes the whole page while it is offline, so the listener always hears Todd first.',
    width: 860,
    padding: 20,
    background: STAGE,
    render: (c) => `<div class="v-listener-pair v-listener-pair--phones">
      <div><div class="v-listener-cap">Page live</div>${c.phone({ body: livePage(c, { greeting: greeting(c) }) })}</div>
      <div><div class="v-listener-cap">Page offline</div>${c.phone({ body: `<div class="v-listener-page v-listener-page--offline">
        ${brand(c)}
        ${greeting(c)}
        <h1 class="v-listener-h1">This page is offline right now.</h1>
        <p class="v-listener-p">${c.name} at ${c.company} took it down for a moment. Email him and he will send you what you came for.</p>
        <button class="${c.btn('default', 'lg')} v-listener-wide">${c.icon('mail')}Email ${c.first}</button>
        ${badge()}
      </div>` })}</div>
    </div>`,
    mount: fill,
  });

  PG.variant({
    surface: 'listener',
    key: 'C',
    name: 'Offline still captures',
    idea: 'A listener who typed the address will not come back later. So the offline page is a lead form in Todd\'s brand with his booking link, and the email lands in Leads like any other.',
    width: 430,
    padding: 20,
    background: STAGE,
    render: (c) => c.phone({ body: `<div class="v-listener-page v-listener-page--offline">
      ${brand(c)}
      <div class="v-listener-who"><span class="app-avatar v-listener-avatar">${c.first[0]}</span><h1 class="v-listener-h1">${c.name}</h1><span class="v-listener-sub">${c.company}</span><span class="app-badge">Page offline</span></div>
      <p class="v-listener-p">The page at <span data-handle-url></span> is offline right now. You can still reach ${c.first}.</p>
      <button class="${c.btn('default', 'lg')} v-listener-wide">${c.icon('calendar')}Book a call with ${c.first}</button>
      <div class="v-listener-form v-listener-form--card">
        <p class="v-listener-p">Or leave your email and ${c.first} will send the page when it is back.</p>
        <input class="app-input" placeholder="Work email" aria-label="Work email">
        <button class="${c.btn('outline')}">Send</button>
      </div>
      ${badge()}
    </div>` }),
    mount: fill,
  });

  const typoOf = (handle) => handle.slice(0, -1) || 'tod';
  PG.variant({
    surface: 'listener',
    key: 'D',
    name: 'Near-miss help',
    idea: 'Typing /tod gets Todd offered by name, with his permission and only when exactly one handle is a single letter away. No list, no search, so nobody can browse other customers.',
    width: 430,
    padding: 20,
    background: STAGE,
    render: (c) => c.phone({
      url: `clarity.video/<span data-v-listener-typo>${typoOf(c.handle)}</span>`,
      body: `<div class="v-listener-page v-listener-page--clarity">
        <div class="v-listener-clarity">${MARK}Clarity</div>
        <h1 class="v-listener-h1">Nothing at clarity.video/<span data-v-listener-typo>${typoOf(c.handle)}</span></h1>
        <p class="v-listener-p">Did you hear ${c.name} from ${c.company}? His address is <span data-handle-url></span>.</p>
        <div class="v-listener-suggest">
          <span class="app-avatar v-listener-avatar">${c.first[0]}</span>
          <div class="v-listener-suggest-text"><b>${c.name}</b><span>${c.company}</span><span data-handle-url></span></div>
          <button class="${c.btn('default', 'lg')} v-listener-wide">Open ${c.first}'s page</button>
        </div>
        <div class="v-listener-form">
          <p class="v-listener-p">Not who you heard? Fix the spelling and try again.</p>
          <div class="v-listener-go"><span class="app-affix"><span>clarity.video/</span><input value="${typoOf(c.handle)}" data-v-listener-typo-input aria-label="Address" spellcheck="false"></span><button class="${c.btn('outline')}">Go</button></div>
        </div>
        <p class="v-listener-fine">${c.first} lets Clarity suggest his page when someone misses by a letter. Nobody else is shown.</p>
      </div>`,
    }),
    mount: (root, c) => {
      fill(root, c);
      c.onHandle((handle) => {
        const typo = typoOf(handle || 'todd');
        root.querySelectorAll('[data-v-listener-typo]').forEach((node) => { node.textContent = typo; });
        root.querySelectorAll('[data-v-listener-typo-input]').forEach((input) => { input.value = typo; });
      });
    },
  });

  // ---------- step 6: knowing the podcast worked ----------
  const SOURCES = {
    all: { last: '2h ago', visits: '142', watched: '96', clicked: '31', returns: '14', note: (h) => `118 of 142 visits came through clarity.video/${h}. The rest opened the page link.` },
    handle: { last: '2h ago', visits: '118', watched: '83', clicked: '27', returns: '11', note: (h) => `Listeners type clarity.video/${h}, so the browser records no source. These visits are the ones that typed it.` },
    link: { last: '1d ago', visits: '24', watched: '13', clicked: '4', returns: '3', note: () => 'Visits that opened clarity.video/page/k7m2xq, the link for one prospect.' },
  };
  const ranges = (parts) => `<span class="v-stats-ranges" aria-hidden="true">${parts.map(([from, to]) => `<i style="left:${from}%;width:${to - from}%"></i>`).join('')}</span>`;
  const playRow = (where, when, parts, pct) => `<tr><td class="app-muted">${where}</td><td class="app-muted">${when}</td><td>${ranges(parts)}</td><td><b class="v-stats-num">${pct}%</b></td></tr>`;
  function miniPage(c) {
    return `<div class="v-stats-preview" aria-label="Page preview"><div class="v-stats-preview-bar"><i></i><i></i><i></i></div>
      <div class="v-stats-mini">
        <b>${c.pages[0].title}</b>
        <div class="v-stats-mini-video" aria-pressed="true"><span></span></div>
        <div class="v-stats-mini-btn"></div>
        <div class="v-stats-mini-line"></div><div class="v-stats-mini-line short"></div>
        <div class="v-stats-mini-field"></div><div class="v-stats-mini-field"></div><div class="v-stats-mini-btn small"></div>
      </div></div>`;
  }
  const fact = (key, value, label) => `<div><dt>${label}</dt><dd data-v-stats-fact="${key}">${value}</dd></div>`;

  PG.variant({
    surface: 'stats',
    key: 'A',
    name: 'Source filter in Activity',
    idea: 'The page\'s Activity dialog, where Todd already looks, gets a source switch. Pick clarity.video/todd and every number, chart and row is only the people who typed it.',
    width: 1200,
    render: (c) => c.dialog({
      width: 980,
      behind: `<div class="v-stats-tall">${c.home()}</div>`,
      body: `<h2 class="app-dialog-title">Activity</h2><span class="app-dialog-x">${c.icon('x')}</span>
        <p class="v-stats-desc">${c.pages[0].title}</p>
        <div class="v-stats-body">
          ${miniPage(c)}
          <div class="v-stats-main">
            <div class="v-stats-seg" role="group" aria-label="Visits by source">
              <button type="button" data-v-stats-source="all" aria-pressed="false">All <b>142</b></button>
              <button type="button" data-v-stats-source="handle" aria-pressed="true">${c.icon('mic')}<span data-handle-url></span> <b>118</b></button>
              <button type="button" data-v-stats-source="link" aria-pressed="false">Page link <b>24</b></button>
            </div>
            <dl class="v-stats-facts">
              ${fact('last', '2h ago', 'Last visit')}${fact('visits', '118', 'Visits')}${fact('watched', '83', 'Watched video')}${fact('clicked', '27', 'Clicked button')}${fact('returns', '11', 'Return visits')}
            </dl>
            <p class="v-stats-note" data-v-stats-note>${SOURCES.handle.note(c.handle)}</p>
            <div class="v-stats-item">
              <div class="v-stats-trigger">${c.icon('video', 'app-icon app-muted')}<span class="lbl"><b>Intro from the show</b><span>Video · 2:14</span></span><span class="cnt"><span data-v-stats-fact="watched">83</span> plays</span>${c.icon('chevron-down', 'app-icon app-muted v-stats-open')}</div>
              <div class="v-stats-panel">
                <svg class="v-stats-chart" viewBox="0 0 1000 100" preserveAspectRatio="none" role="img" aria-label="Plays still watching at each moment">
                  <path d="M0,0 L100,8 L250,20 L500,34 L750,48 L1000,66 L1000,100 L0,100 Z" fill="currentColor" fill-opacity="0.15"/>
                  <path d="M0,0 L100,8 L250,20 L500,34 L750,48 L1000,66" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/>
                </svg>
                <div class="v-stats-ticks"><span>0:00</span><span>0:33</span><span>1:07</span><span>1:40</span><span>2:14</span></div>
                <p class="v-stats-note">61% average watched</p>
                <table class="v-stats-table"><thead><tr><th>Where</th><th>When ${c.icon('chevron-down', 'v-stats-sort')}</th><th>Watched</th><th>%</th></tr></thead><tbody>
                  ${playRow('Austin, TX', '2h ago', [[0, 100]], 100)}
                  ${playRow('Denver, CO', '5h ago', [[0, 74]], 74)}
                  ${playRow('Toronto, CA', 'Yesterday', [[0, 20], [55, 73]], 38)}
                  ${playRow('Berlin, DE', '2d ago', [[0, 91]], 91)}
                </tbody></table>
              </div>
            </div>
            <div class="v-stats-item"><div class="v-stats-trigger">${c.icon('card', 'app-icon app-muted')}<span class="lbl"><b>Book a strategy call</b><span>Button</span></span><span class="cnt"><span data-v-stats-fact="clicked">27</span> clicks</span>${c.icon('chevron-down', 'app-icon app-muted')}</div></div>
            <div class="v-stats-item"><div class="v-stats-trigger">${c.icon('card', 'app-icon app-muted')}<span class="lbl"><b>Send me the worksheet</b><span>Button</span></span><span class="cnt">9 clicks</span>${c.icon('chevron-down', 'app-icon app-muted')}</div></div>
          </div>
        </div>`,
    }),
    mount: (root, c) => {
      fill(root, c);
      const buttons = root.querySelectorAll('[data-v-stats-source]');
      let current = 'handle';
      const apply = () => {
        const data = SOURCES[current];
        buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.vStatsSource === current)));
        root.querySelectorAll('[data-v-stats-fact]').forEach((node) => { node.textContent = data[node.dataset.vStatsFact]; });
        root.querySelector('[data-v-stats-note]').textContent = data.note(c.handle);
      };
      buttons.forEach((button) => button.addEventListener('click', () => { current = button.dataset.vStatsSource; apply(); }));
      c.onHandle(apply);
    },
  });

  const LEADS = [
    ['Maya Lindqvist', 'maya@lindqvist.example', '+46 70 123 45 67', 0, 'handle', '2h ago'],
    ['Jonas Berg', 'jonas@bergco.example', null, 0, 'handle', '5h ago'],
    ['Priya Natarajan', 'priya@natarajan.example', '+1 512 555 0142', 1, 'link', 'Yesterday'],
    ['Sam Okafor', 'sam@okafor.example', null, 0, 'handle', 'Yesterday'],
    ['Lena Hoffmann', 'lena@hoffmann.example', '+49 30 555 0199', 2, 'link', '2d ago'],
    ['Diego Ramos', 'diego@ramosventures.example', null, 0, 'handle', '2d ago'],
    ['Hannah Weiss', 'hannah@weiss.example', '+1 416 555 0120', 0, 'link', '3d ago'],
    ['Oliver Chen', 'oliver@chenlabs.example', null, 2, 'link', '4d ago'],
  ];
  PG.variant({
    surface: 'stats',
    key: 'B',
    name: 'Source column in Leads',
    idea: 'A podcast worked when it brought leads, not visits. Leads gets a "Came through" column and a one-line count, so Todd sees which people typed his address and can keep only them.',
    width: 1200,
    render: (c) => c.shell({
      active: 'leads',
      main: `<div class="app-head"><h1 class="app-h1">Leads</h1><button class="${c.btn('outline', 'lg')}">${c.icon('upload')}Export CSV</button></div>
        <div class="v-stats-toolbar"><span class="v-stats-search">${c.icon('search')}<input class="app-input" placeholder="Search leads..." aria-label="Search leads"></span><span class="app-muted" data-v-stats-count>23 leads</span></div>
        <p class="v-stats-from">9 came through <span data-handle-url></span>. <button type="button" class="${c.btn('link', 'inline')}" data-v-stats-only>Show only those</button></p>
        <table class="v-stats-table v-stats-leads"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Page</th><th>Came through</th><th>When</th></tr></thead><tbody>
          ${LEADS.map(([name, email, phone, page, via, when]) => `<tr data-v-stats-via="${via}"><td>${name}</td><td>${email}</td><td>${phone ?? '<span class="app-muted">-</span>'}</td><td><a class="v-stats-link">${c.pages[page].title}</a></td><td>${via === 'handle' ? `<span class="v-stats-via">${c.icon('mic')}<span data-handle-url></span></span>` : '<span class="app-muted">Page link</span>'}</td><td class="app-muted">${when}</td></tr>`).join('')}
        </tbody></table>`,
    }),
    mount: (root, c) => {
      fill(root, c);
      const link = root.querySelector('[data-v-stats-only]');
      let only = false;
      link.addEventListener('click', () => {
        only = !only;
        root.querySelectorAll('[data-v-stats-via]').forEach((row) => { row.hidden = only && row.dataset.vStatsVia !== 'handle'; });
        link.textContent = only ? 'Show all leads' : 'Show only those';
        root.querySelector('[data-v-stats-count]').textContent = only ? '9 of 23 leads' : '23 leads';
      });
    },
  });

  // 42 days, Sep 15 to Oct 26. Spikes after each show.
  const DAYS = [0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 18, 23, 12, 8, 5, 3, 2, 1, 14, 11, 6, 4, 3];
  const SHOWS = [{ day: 29, label: 'The Growth Show · Oct 14' }, { day: 37, label: 'Sales Radio · Oct 22' }];
  function barChart() {
    const max = Math.max(...DAYS);
    const bars = DAYS.map((n, i) => {
      const height = n ? Math.max(3, (n / max) * 96) : 0;
      return `<rect x="${i * 20 + 2}" y="${120 - height}" width="16" height="${height}" rx="2" fill="currentColor"><title>${n} visits</title></rect>`;
    }).join('');
    const marks = SHOWS.map(({ day, label }) => `<line x1="${day * 20 + 10}" x2="${day * 20 + 10}" y1="22" y2="122" stroke="var(--foreground)" stroke-dasharray="3 3"/><text x="${day * 20 + 4}" y="14" text-anchor="end" font-size="12" fill="var(--foreground)">${label}</text>`).join('');
    return `<svg class="v-stats-bars" viewBox="0 0 840 142" role="img" aria-label="Visits through the address per day, with show dates marked">
      ${bars}${marks}
      <line x1="0" x2="840" y1="121" y2="121" stroke="var(--border)"/>
      <text x="2" y="138" font-size="12" fill="var(--muted-foreground)">Sep 15</text><text x="330" y="138" font-size="12" fill="var(--muted-foreground)">Oct 1</text><text x="838" y="138" text-anchor="end" font-size="12" fill="var(--muted-foreground)">Oct 26</text>
    </svg>`;
  }
  PG.variant({
    surface: 'stats',
    key: 'C',
    name: 'Appearances timeline',
    idea: 'The address has its own Activity, apart from any page. Todd notes each show he was on, and the visits in the week after tell him which episode brought people and which did not.',
    width: 1200,
    render: (c) => c.dialog({
      width: 880,
      behind: `<div class="v-stats-tall">${c.home()}</div>`,
      body: `<h2 class="app-dialog-title">Activity</h2><span class="app-dialog-x">${c.icon('x')}</span>
        <p class="v-stats-desc"><span data-handle-url></span></p>
        <dl class="v-stats-facts">
          ${fact('last', '2h ago', 'Last visit')}${fact('visits', '118', 'Typed the address')}${fact('leads', '9', 'Leads')}${fact('shows', '2', 'Appearances')}
        </dl>
        ${barChart()}
        <div class="v-stats-row"><h3 class="v-stats-h3">Appearances</h3><button type="button" class="${c.btn('outline', 'sm')}" data-v-stats-add>${c.icon('plus')}Add an appearance</button></div>
        <form class="v-stats-add" data-v-stats-add-form hidden>
          <input class="app-input" placeholder="Show and episode" aria-label="Show and episode">
          <input class="app-input v-stats-date" placeholder="Date it aired" aria-label="Date it aired">
          <button type="button" class="${c.btn('default')}">Save</button>
          <button type="button" class="${c.btn('ghost')}" data-v-stats-cancel>Cancel</button>
        </form>
        <table class="v-stats-table v-stats-shows"><thead><tr><th>Show</th><th>Aired</th><th>Visits in the week after</th><th>Leads</th></tr></thead><tbody>
          <tr><td>The Growth Show, episode 212</td><td class="app-muted">Oct 14</td><td><b class="v-stats-num">71</b></td><td class="v-stats-num">5</td></tr>
          <tr><td>Sales Radio, morning drive</td><td class="app-muted">Oct 22</td><td><b class="v-stats-num">38</b></td><td class="v-stats-num">3</td></tr>
          <tr><td class="app-muted">Other days</td><td></td><td class="v-stats-num">9</td><td class="v-stats-num">1</td></tr>
        </tbody></table>`,
    }),
    mount: (root, c) => {
      fill(root, c);
      const form = root.querySelector('[data-v-stats-add-form]');
      form.addEventListener('submit', (event) => event.preventDefault());
      root.querySelector('[data-v-stats-add]').addEventListener('click', () => { form.hidden = false; form.querySelector('input').focus(); });
      root.querySelector('[data-v-stats-cancel]').addEventListener('click', () => { form.hidden = true; });
    },
  });

  PG.css(`
    /* step 5: the listener's phone */
    .v-listener-pair { display: flex; gap: 40px; align-items: flex-start; }
    .v-listener-pair .app-browser { flex: 1; min-width: 0; }
    .v-listener-pair--phones { gap: 40px; }
    .v-listener-cap { font-size: 12px; font-weight: 500; color: var(--muted-foreground); margin: 0 0 8px 14px; }
    .v-listener-page { padding: 18px 18px 22px; display: grid; gap: 14px; background: white; color: var(--foreground); }
    .v-listener-page--desktop { max-width: 720px; margin: 0 auto; padding: 36px 24px 44px; gap: 18px; }
    .v-listener-page--desktop .v-listener-h1 { font-size: 32px; }
    .v-listener-page--desktop .v-listener-form { max-width: 420px; }
    .v-listener-page--offline { gap: 16px; }
    .v-listener-brand { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .v-listener-brand i { width: 18px; height: 18px; border-radius: 5px; background: var(--foreground); }
    .v-listener-h1 { font-size: 24px; font-weight: 700; line-height: 1.15; letter-spacing: -0.015em; margin: 0; }
    .v-listener-h2 { font-size: 17px; font-weight: 700; margin: 4px 0 0; }
    .v-listener-p { margin: 0; font-size: 15px; line-height: 1.5; }
    .v-listener-sub { font-size: 15px; color: var(--muted-foreground); }
    .v-listener-fine { margin: 0; font-size: 12px; line-height: 1.4; color: var(--muted-foreground); }
    .v-listener-video { aspect-ratio: 16 / 9; border-radius: 12px; background: var(--foreground); color: white; position: relative; display: grid; place-items: center; }
    .v-listener-video small { position: absolute; left: 12px; bottom: 10px; font-size: 12px; opacity: 0.85; }
    .v-listener-play { width: 56px; height: 56px; border-radius: 99px; background: white; color: var(--foreground); display: grid; place-items: center; box-shadow: 0 6px 20px oklch(0 0 0 / 0.3); }
    .v-listener-play svg { width: 26px; height: 26px; margin-left: 3px; }
    .v-listener-cta { display: flex; justify-content: center; }
    .v-listener-form { display: grid; gap: 8px; }
    .v-listener-form .app-input { height: 40px; font-size: 15px; }
    .v-listener-form--card { padding: 14px; border-radius: 12px; background: var(--muted); }
    .v-listener-wide { width: 100%; }
    .v-listener-badge { display: flex; justify-content: center; align-items: center; gap: 5px; font-size: 12px; color: var(--muted-foreground); padding-top: 6px; }
    .v-listener-badge b { font-weight: 600; }
    .v-listener-badge a { text-decoration: underline; text-underline-offset: 2px; }
    .v-listener-mark { width: 14px; height: 14px; }
    .v-listener-greet { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 12px; background: var(--muted); }
    .v-listener-greet .app-avatar { width: 32px; height: 32px; font-size: 13px; }
    .v-listener-greet b { display: block; font-size: 15px; line-height: 1.3; }
    .v-listener-greet span:not(.app-avatar) { display: block; font-size: 13px; line-height: 1.4; color: var(--muted-foreground); margin-top: 2px; }
    .v-listener-who { display: grid; justify-items: start; gap: 6px; padding-top: 6px; }
    .v-listener-avatar { width: 56px; height: 56px; font-size: 22px; margin-bottom: 6px; }
    .v-listener-clarity { display: flex; align-items: center; gap: 6px; color: var(--primary); font-weight: 600; font-size: 15px; }
    .v-listener-clarity .v-listener-mark { width: 20px; height: 20px; }
    .v-listener-page--clarity { gap: 16px; }
    .v-listener-suggest { display: grid; gap: 10px; padding: 16px; border: 1px solid var(--border); border-radius: 14px; background: var(--card); }
    .v-listener-suggest .v-listener-avatar { width: 44px; height: 44px; font-size: 17px; margin: 0; }
    .v-listener-suggest-text b { display: block; font-size: 17px; }
    .v-listener-suggest-text span { display: block; font-size: 14px; color: var(--muted-foreground); }
    .v-listener-go { display: flex; gap: 8px; }
    .v-listener-go .app-affix { flex: 1; height: 40px; font-size: 15px; }
    .v-listener-go .pgb { flex: none; height: 40px; }

    /* step 6: stats */
    .v-stats-tall .app-shell { min-height: 900px; }
    .v-stats-desc { margin: -10px 0 0; font-size: 14px; color: var(--muted-foreground); }
    .v-stats-body { display: flex; gap: 24px; align-items: flex-start; }
    .v-stats-main { flex: 1; min-width: 0; display: grid; gap: 14px; }
    .v-stats-preview { width: 224px; flex: none; border: 1px solid var(--border); border-radius: 8px; background: var(--background); box-shadow: 0 1px 2px oklch(0 0 0 / 0.05); overflow: hidden; }
    .v-stats-preview-bar { display: flex; gap: 4px; padding: 8px 12px; background: var(--muted); border-bottom: 1px solid var(--border); }
    .v-stats-preview-bar i { width: 4px; height: 4px; border-radius: 99px; background: oklch(0.7 0.02 260 / 0.5); }
    .v-stats-mini { padding: 14px 16px 18px; display: grid; gap: 8px; }
    .v-stats-mini b { font-size: 11px; line-height: 1.25; }
    .v-stats-mini-video { aspect-ratio: 16 / 9; border-radius: 4px; background: var(--foreground); display: grid; place-items: center; }
    .v-stats-mini-video[aria-pressed="true"] { box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--primary); }
    .v-stats-mini-video span { width: 22px; height: 22px; border-radius: 99px; background: oklch(1 0 0 / 0.85); }
    .v-stats-mini-btn { width: 46%; height: 12px; border-radius: 3px; background: var(--primary); justify-self: center; }
    .v-stats-mini-btn.small { width: 36%; justify-self: start; }
    .v-stats-mini-line { height: 5px; border-radius: 2px; background: var(--border); }
    .v-stats-mini-line.short { width: 60%; }
    .v-stats-mini-field { height: 12px; border-radius: 3px; border: 1px solid var(--border); }
    .v-stats-seg { display: inline-flex; gap: 2px; padding: 3px; border-radius: 10px; background: var(--muted); justify-self: start; }
    .v-stats-seg button { appearance: none; border: 0; background: transparent; font: inherit; font-size: 13px; font-weight: 500; color: var(--muted-foreground); height: 30px; padding: 0 12px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .v-stats-seg button b { font-weight: 600; font-variant-numeric: tabular-nums; }
    .v-stats-seg button svg { width: 14px; height: 14px; }
    .v-stats-seg button[aria-pressed="true"] { background: var(--background); color: var(--foreground); box-shadow: 0 1px 2px oklch(0 0 0 / 0.08); }
    .v-stats-facts { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; margin: 0; padding: 12px 0; border-radius: 8px; background: var(--muted); }
    .v-stats-facts > div { display: flex; flex-direction: column-reverse; gap: 6px; padding: 0 16px; }
    .v-stats-facts > div + div { border-left: 1px solid var(--border); }
    .v-stats-facts dt { font-size: 12px; color: var(--muted-foreground); }
    .v-stats-facts dd { margin: 0; font-size: 24px; line-height: 1; font-weight: 600; font-variant-numeric: tabular-nums; }
    .v-stats-note { margin: 0; font-size: 12px; color: var(--muted-foreground); }
    .v-stats-num { font-variant-numeric: tabular-nums; }
    .v-stats-item { border-bottom: 1px solid var(--border); }
    .v-stats-trigger { display: flex; align-items: center; gap: 12px; padding: 12px 0; }
    .v-stats-trigger .lbl { flex: 1; min-width: 0; }
    .v-stats-trigger .lbl b { display: block; font-size: 14px; font-weight: 500; }
    .v-stats-trigger .lbl span { display: block; font-size: 12px; color: var(--muted-foreground); }
    .v-stats-trigger .cnt { font-size: 12px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
    .v-stats-open { transform: rotate(180deg); }
    .v-stats-panel { display: grid; gap: 10px; padding-bottom: 12px; }
    .v-stats-chart { display: block; width: 100%; height: 96px; border-bottom: 2px solid var(--foreground); color: var(--primary); }
    .v-stats-ticks { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
    .v-stats-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .v-stats-table th { text-align: left; font-weight: 400; font-size: 12px; color: var(--muted-foreground); padding: 6px 8px; border-bottom: 1px solid var(--border); white-space: nowrap; }
    .v-stats-table td { padding: 7px 8px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    .v-stats-sort { display: inline-block; width: 12px; height: 12px; vertical-align: -2px; }
    .v-stats-ranges { position: relative; display: block; width: 96px; height: 6px; border-radius: 99px; background: var(--muted); overflow: hidden; }
    .v-stats-ranges i { position: absolute; top: 0; bottom: 0; background: var(--primary); }
    .v-stats-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 22px 0 14px; }
    .v-stats-search { position: relative; width: 320px; display: block; }
    .v-stats-search svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--muted-foreground); }
    .v-stats-search .app-input { height: 36px; padding-left: 32px; }
    .v-stats-from { margin: 0 0 12px; font-size: 14px; display: flex; gap: 10px; align-items: baseline; }
    .v-stats-leads { font-size: 14px; }
    .v-stats-leads th { font-weight: 500; color: var(--foreground); padding: 10px 8px; }
    .v-stats-leads td { padding: 10px 8px; white-space: nowrap; }
    .v-stats-link { text-decoration: underline; text-decoration-color: transparent; }
    .v-stats-via { display: inline-flex; align-items: center; gap: 5px; }
    .v-stats-via svg { width: 14px; height: 14px; color: var(--muted-foreground); }
    .v-stats-bars { display: block; width: 100%; height: auto; color: var(--primary); font-family: var(--font-sans); }
    .v-stats-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .v-stats-h3 { margin: 0; font-size: 15px; font-weight: 600; }
    .v-stats-add { display: flex; gap: 8px; align-items: center; margin: 0; padding: 12px; border: 1px dashed var(--border); border-radius: 10px; }
    .v-stats-add .app-input { flex: 1; }
    .v-stats-add .v-stats-date { flex: none; width: 150px; }
    .v-stats-shows td:nth-child(n+3), .v-stats-shows th:nth-child(n+3) { text-align: right; }
  `);
})();
