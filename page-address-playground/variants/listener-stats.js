// Steps 3 and 4: what the listener sees at clarity.video/<address>, and where Todd sees that the podcast worked.
// PROTOTYPE, throwaway. Mock data only. CSS prefixes: v-listener- and v-stats-.
(() => {
  const STAGE = 'oklch(0.93 0.008 255)';
  const PLAY = '<span class="v-listener-play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg></span>';
  const MARK = '<svg class="v-listener-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="13" stroke="currentColor" stroke-width="4"/><path d="M13 10.5v11l9-5.5z" fill="currentColor"/></svg>';
  const SHARE_URL = 'clarity.video/page/k7m2xq';

  // ---------- the mock Journey Page, in Todd's brand ----------
  const COPY = {
    p1: { clip: '2:14', cta: 'Book a strategy call', h2: 'What I covered on the show', p: 'The pricing page that stops the haggling, and the follow-up that gets a reply. The worksheet below has both.', form: 'Get the worksheet', send: 'Send me the worksheet' },
    p3: { clip: '3:40', cta: 'Book a strategy call', h2: 'What I covered in the webinar', p: 'The slides people asked for, and the follow-up email I send after every call. Both are in the pack below.', form: 'Get the slide pack', send: 'Send me the slides' },
  };
  const brand = (c) => `<div class="v-listener-brand"><i aria-hidden="true"></i>${c.company}</div>`;
  const badge = () => `<div class="v-listener-badge"><span>Made with</span>${MARK}<b>Clarity</b><span aria-hidden="true">·</span><a>Make your own</a></div>`;
  function livePage(c, { page = c.page, desktop = false } = {}) {
    const copy = COPY[page.id] ?? COPY.p1;
    return `<div class="v-listener-page${desktop ? ' v-listener-page--desktop' : ''}">
      ${brand(c)}
      <h1 class="v-listener-h1">${page.title}</h1>
      <div class="v-listener-video">${PLAY}<small>${c.name} · ${copy.clip}</small></div>
      <div class="v-listener-cta"><button class="${c.btn('default', 'lg')}">${copy.cta}</button></div>
      <h2 class="v-listener-h2">${copy.h2}</h2>
      <p class="v-listener-p">${copy.p}</p>
      <div class="v-listener-form">
        <h2 class="v-listener-h2">${copy.form}</h2>
        <input class="app-input" placeholder="Name" aria-label="Name">
        <input class="app-input" placeholder="Work email" aria-label="Work email">
        <button class="${c.btn('default')}">${copy.send}</button>
      </div>
      ${badge()}
    </div>`;
  }
  // A caption above a phone, for William, not the listener.
  const cap = (title, text) => `<div class="v-listener-cap"><b>${title}</b><span>${text}</span></div>`;
  const fillCustom = (root, attr, value) => root.querySelectorAll(`[${attr}]`).forEach((node) => { node.textContent = value; });

  // ---------- step 3: what the listener sees ----------
  PG.variant({
    surface: 'listener',
    key: 'A',
    name: 'The page, nothing added',
    idea: 'Clarity serves Todd\'s page at /todd. The bar keeps the short address, the page wears Ellis Growth, and the only Clarity on it is the badge Free owners already get.',
    width: 1240,
    padding: 20,
    background: STAGE,
    render: (c) => `<div class="v-listener-pair">
      ${c.phone({ body: livePage(c) })}
      ${c.browser({ body: livePage(c, { desktop: true }) })}
    </div>`,
  });

  PG.variant({
    surface: 'listener',
    key: 'B',
    name: 'Offline, still Todd\'s',
    idea: 'A listener who typed the address will not come back later. Unpublished or deleted, the address shows Todd\'s name in his brand and one email field that lands in Leads. Never a 404, never anyone else\'s page.',
    width: 430,
    padding: 20,
    background: STAGE,
    render: (c) => `${cap('Page unpublished or deleted', 'The same page either way. The address stays Todd\'s, so nobody else can ever appear here.')}
      ${c.phone({ body: `<div class="v-listener-page v-listener-page--offline">
        ${brand(c)}
        <div class="v-listener-who"><span class="app-avatar v-listener-avatar">${c.first[0]}</span><h1 class="v-listener-h1">${c.name}</h1><span class="v-listener-sub">${c.company}</span><span class="app-badge">Page offline</span></div>
        <p class="v-listener-p">The page at <span data-address-url></span> is offline right now. Leave your email and ${c.first} will send it to you when it is back.</p>
        <form class="v-listener-form v-listener-form--card" data-v-listener-offline>
          <input class="app-input" type="email" placeholder="Your email" aria-label="Your email" required>
          <button type="submit" class="${c.btn('default', 'lg')} v-listener-wide">Send</button>
        </form>
        <div class="v-listener-sent" data-v-listener-sent hidden>${c.icon('check')}<span><b>Sent.</b> ${c.first} has your email and will send the page when it is back.</span></div>
        <button class="${c.btn('outline')} v-listener-wide v-listener-tall">${c.icon('calendar')}Book a call with ${c.first}</button>
        ${badge()}
      </div>` })}`,
    mount: (root) => {
      const form = root.querySelector('[data-v-listener-offline]');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        form.hidden = true;
        root.querySelector('[data-v-listener-sent]').hidden = false;
      });
    },
  });

  const typoOf = (address) => address.slice(0, -1) || 'tod';
  PG.variant({
    surface: 'listener',
    key: 'C',
    name: 'Mistypes',
    idea: 'Skip the dash and you still land, since dashes don\'t count. Miss a letter and Clarity names the one owner who is a letter away and waits for a tap. Nobody lands on a page they did not pick.',
    width: 860,
    padding: 20,
    background: STAGE,
    render: (c) => {
      const webinar = c.pageById('p3');
      const typo = typoOf(c.address);
      return `<div class="v-listener-pair v-listener-pair--phones">
        <div>${cap(`Typed clarity.video/${webinar.address.replace(/-/g, '')}`, `Dashes don't count, so it opens ${webinar.address}. The bar shows the address Todd set.`)}
          ${c.phone({ url: `clarity.video/${webinar.address}`, body: livePage(c, { page: webinar }) })}</div>
        <div>${cap('Typed clarity.video/<span data-v-listener-typo></span>', 'A letter off. Clarity names the one page that is a letter away and opens nothing until the listener taps it.')}
          ${c.phone({
            url: 'clarity.video/<span data-v-listener-typo></span>',
            body: `<div class="v-listener-page v-listener-page--clarity">
              <div class="v-listener-clarity">${MARK}Clarity</div>
              <h1 class="v-listener-h1">Nothing at clarity.video/<span data-v-listener-typo></span></h1>
              <p class="v-listener-p">Did you mean this page?</p>
              <div class="v-listener-suggest">
                <span class="app-avatar v-listener-avatar">${c.first[0]}</span>
                <div class="v-listener-suggest-text"><b>${c.name}</b><span>${c.company}</span><span data-address-url></span></div>
                <button class="${c.btn('default', 'lg')} v-listener-wide">Open ${c.first}'s page</button>
              </div>
              <div class="v-listener-form">
                <p class="v-listener-p">Not who you heard? Fix the address.</p>
                <div class="v-listener-go"><span class="app-affix"><span>clarity.video/</span><input value="${typo}" data-v-listener-typo-input aria-label="Address" spellcheck="false"></span><button class="${c.btn('outline')}">Go</button></div>
              </div>
              <p class="v-listener-fine">Only ${c.first}'s address is a letter away from what you typed, so only his page is offered.</p>
            </div>`,
          })}</div>
      </div>`;
    },
    mount: (root, c) => {
      const apply = (address) => {
        const typo = typoOf(address || 'todd');
        fillCustom(root, 'data-v-listener-typo', typo);
        root.querySelectorAll('[data-v-listener-typo-input]').forEach((input) => { input.value = typo; });
      };
      apply(c.address);
      c.onAddress(apply);
    },
  });

  const renamed = (address) => (address.includes('ellis') ? `${address}-show` : `${address}-ellis`);
  PG.variant({
    surface: 'listener',
    key: 'D',
    name: 'After a rename or move',
    idea: 'Todd\'s changes stay invisible to the listener. A renamed address redirects, so the bar shows the new name and the page says nothing about the old one. A moved address opens its new page under the same bar.',
    width: 860,
    padding: 20,
    background: STAGE,
    render: (c) => {
      const webinar = c.pageById('p3');
      return `<div class="v-listener-pair v-listener-pair--phones">
        <div>${cap('Renamed', 'Todd changed <span data-address-url></span> to clarity.video/<span data-v-listener-new></span>. The old name keeps working and redirects, so the bar shows the new one.')}
          ${c.phone({ url: 'clarity.video/<span data-v-listener-new></span>', body: livePage(c) })}</div>
        <div>${cap('Moved', `Todd moved <span data-address-url></span> from the podcast page to the webinar page. The bar stays the same and the webinar page opens. The podcast page keeps ${SHARE_URL}.`)}
          ${c.phone({ body: livePage(c, { page: webinar }) })}</div>
      </div>`;
    },
    mount: (root, c) => {
      const apply = (address) => fillCustom(root, 'data-v-listener-new', renamed(address || 'todd'));
      apply(c.address);
      c.onAddress(apply);
    },
  });

  // ---------- step 4: knowing the podcast worked ----------
  const SOURCES = {
    all: { last: '2h ago', visits: '142', watched: '96', clicked: '31', returns: '14', note: (a) => `118 of 142 visits came through clarity.video/${a}. The other 24 opened the share link.` },
    address: { last: '2h ago', visits: '118', watched: '83', clicked: '27', returns: '11', note: (a) => `People type clarity.video/${a}, so the browser records no source. These 118 are the ones who typed it.` },
    share: { last: '1d ago', visits: '24', watched: '13', clicked: '4', returns: '3', note: () => `Visits that opened ${SHARE_URL}, the share link.` },
  };
  const ranges = (parts) => `<span class="v-stats-ranges" aria-hidden="true">${parts.map(([from, to]) => `<i style="left:${from}%;width:${to - from}%"></i>`).join('')}</span>`;
  const playRow = (where, when, parts, pct) => `<tr><td class="app-muted">${where}</td><td class="app-muted">${when}</td><td>${ranges(parts)}</td><td><b class="v-stats-num">${pct}%</b></td></tr>`;
  function miniPage(c) {
    return `<div class="v-stats-preview" aria-label="Page preview"><div class="v-stats-preview-bar"><i></i><i></i><i></i></div>
      <div class="v-stats-mini">
        <b>${c.page.title}</b>
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
    name: 'Source switch in Activity',
    idea: 'The page\'s Activity dialog, where Todd already looks, gets a switch for the link people used. Pick clarity.video/todd and every number, chart and row is only the people who typed it.',
    width: 1200,
    render: (c) => c.dialog({
      width: 980,
      behind: `<div class="v-stats-tall">${c.home()}</div>`,
      body: `<h2 class="app-dialog-title">Activity</h2><span class="app-dialog-x">${c.icon('x')}</span>
        <p class="v-stats-desc">${c.page.title}</p>
        <div class="v-stats-body">
          ${miniPage(c)}
          <div class="v-stats-main">
            <div class="v-stats-seg" role="group" aria-label="Visits by link">
              <button type="button" data-v-stats-source="all" aria-pressed="false">All <b>142</b></button>
              <button type="button" data-v-stats-source="address" aria-pressed="true">${c.icon('mic')}<span data-address-url></span> <b>118</b></button>
              <button type="button" data-v-stats-source="share" aria-pressed="false">Share link <b>24</b></button>
            </div>
            <dl class="v-stats-facts">
              ${fact('last', '2h ago', 'Last visit')}${fact('visits', '118', 'Visits')}${fact('watched', '83', 'Watched video')}${fact('clicked', '27', 'Clicked button')}${fact('returns', '11', 'Return visits')}
            </dl>
            <p class="v-stats-note" data-v-stats-note>${SOURCES.address.note(c.address)}</p>
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
      const buttons = root.querySelectorAll('[data-v-stats-source]');
      let current = 'address';
      const apply = () => {
        const data = SOURCES[current];
        buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.vStatsSource === current)));
        root.querySelectorAll('[data-v-stats-fact]').forEach((node) => { node.textContent = data[node.dataset.vStatsFact]; });
        root.querySelector('[data-v-stats-note]').textContent = data.note(c.address);
      };
      buttons.forEach((button) => button.addEventListener('click', () => { current = button.dataset.vStatsSource; apply(); }));
      c.onAddress(apply);
    },
  });

  // The address a page shows, live for p1 and fixed for the others.
  const addressOf = (c, page) => (page.id === 'p1' ? '<span data-address-url></span>' : `clarity.video/${page.address}`);
  function viaLine(c, page) {
    const address = page.id === 'p1' ? c.address : page.address;
    if (!address) return '';
    if (!page.live) return `<div class="v-stats-card-via v-stats-card-via--off">${c.icon('mic')}<span>${addressOf(c, page)}</span><span class="app-badge">Offline</span></div>`;
    const pct = Math.round((page.viaAddress / page.visits) * 100);
    return `<div class="v-stats-card-via">${c.icon('mic')}<span>${addressOf(c, page)}</span><b>${page.viaAddress} of ${page.visits}</b></div>
      <div class="v-stats-card-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>`;
  }
  PG.variant({
    surface: 'stats',
    key: 'B',
    name: 'Home cards at a glance',
    idea: 'Each page card on Home gets one line under its visits, how many came through its address. Todd reads which page the podcast fed without opening anything, and a page with no address shows nothing extra.',
    width: 1440,
    render: (c) => c.home({ cards: c.pages.map((page) => c.pageCard(page, viaLine(c, page))).join('') }),
  });

  const LEADS = [
    ['Maya Lindqvist', 'maya@lindqvist.example', '+46 70 123 45 67', 'p1', 'address', '2h ago'],
    ['Jonas Berg', 'jonas@bergco.example', null, 'p1', 'address', '5h ago'],
    ['Priya Natarajan', 'priya@natarajan.example', '+1 512 555 0142', 'p2', 'share', 'Yesterday'],
    ['Sam Okafor', 'sam@okafor.example', null, 'p3', 'address', 'Yesterday'],
    ['Lena Hoffmann', 'lena@hoffmann.example', '+49 30 555 0199', 'p1', 'share', '2d ago'],
    ['Diego Ramos', 'diego@ramosventures.example', null, 'p1', 'address', '2d ago'],
    ['Hannah Weiss', 'hannah@weiss.example', '+1 416 555 0120', 'p3', 'address', '3d ago'],
    ['Oliver Chen', 'oliver@chenlabs.example', null, 'p3', 'share', '4d ago'],
  ];
  PG.variant({
    surface: 'stats',
    key: 'C',
    name: 'Lead by link',
    idea: 'A podcast worked when it brought leads, not visits. Leads gets a Came through column that names the address each person typed, and a one-tap filter that keeps only them.',
    width: 1280,
    render: (c) => c.shell({
      active: 'leads',
      main: `<div class="app-head"><h1 class="app-h1">Leads</h1><button class="${c.btn('outline')}">${c.icon('upload')}Export CSV</button></div>
        <div class="v-stats-toolbar"><span class="v-stats-search">${c.icon('search')}<input class="app-input" placeholder="Search leads..." aria-label="Search leads"></span><span class="app-muted" data-v-stats-count>23 leads</span></div>
        <p class="v-stats-from">10 of 23 typed an address. 7 came through <span data-address-url></span> and 3 through clarity.video/${c.pageById('p3').address}. <button type="button" class="${c.btn('link', 'inline')}" data-v-stats-only>Show only those</button></p>
        <table class="v-stats-table v-stats-leads"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Page</th><th>Came through</th><th>When</th></tr></thead><tbody>
          ${LEADS.map(([name, email, phone, pageId, via, when]) => {
            const page = c.pageById(pageId);
            return `<tr data-v-stats-via="${via}"><td>${name}</td><td>${email}</td><td>${phone ?? '<span class="app-muted">-</span>'}</td><td><a class="v-stats-link">${page.title}</a></td><td>${via === 'address' ? `<span class="v-stats-via">${c.icon('mic')}${addressOf(c, page)}</span>` : '<span class="app-muted">Share link</span>'}</td><td class="app-muted">${when}</td></tr>`;
          }).join('')}
        </tbody></table>`,
    }),
    mount: (root) => {
      const link = root.querySelector('[data-v-stats-only]');
      let only = false;
      link.addEventListener('click', () => {
        only = !only;
        root.querySelectorAll('[data-v-stats-via]').forEach((row) => { row.hidden = only && row.dataset.vStatsVia !== 'address'; });
        link.textContent = only ? 'Show all leads' : 'Show only those';
        root.querySelector('[data-v-stats-count]').textContent = only ? '10 of 23 leads' : '23 leads';
      });
    },
  });

  const LAST_VISIT = { p1: '2h ago', p3: '3d ago', p4: 'None yet' };
  function addressRows(c) {
    const held = c.held();
    const max = Math.max(1, ...held.map(({ page }) => page.viaAddress));
    // Printed as text, not a data-address-url span: the shell syncs spans before it tells
    // listeners, so a span made inside onAddress would stay blank until the next change.
    return held.map(({ address, page }) => {
      const pct = Math.round((page.viaAddress / max) * 100);
      return `<tr${page.live ? '' : ' class="v-stats-addr-off"'}>
        <td><span class="v-stats-via">${c.icon('mic')}clarity.video/${address}</span></td>
        <td>${page.title}</td>
        <td><span class="v-stats-hbar" aria-hidden="true"><i style="width:${pct}%"></i></span><b class="v-stats-num">${page.viaAddress}</b></td>
        <td class="v-stats-num">${page.viaShare}</td>
        <td class="v-stats-num">${page.leads}</td>
        <td class="app-muted">${LAST_VISIT[page.id] ?? 'None yet'}</td>
        <td>${page.live ? '<span class="app-badge app-badge--green">Live</span>' : '<span class="app-badge">Offline</span>'}</td>
      </tr>`;
    }).join('');
  }
  PG.variant({
    surface: 'stats',
    key: 'D',
    name: 'Addresses table on Home',
    idea: 'One table on Home\'s Pages tab, one row per address Todd holds. He makes a page per show, so the rows are his episodes and the bars say which show sent people.',
    width: 1440,
    render: (c) => c.shell({
      active: 'home',
      main: `<div class="app-head"><h1 class="app-h1">Home</h1><button class="${c.btn('outline')}">${c.icon('upload')}Upload</button><button class="${c.btn('outline')}">${c.icon('plus')}New page</button><button class="${c.btn('default')}">${c.icon('video')}Record video</button></div>
        <div class="app-tabs"><div class="app-tab">All</div><div class="app-tab">Videos</div><div class="app-tab" aria-selected="true">Pages</div><div class="app-tab">Files</div></div>
        <div class="v-stats-sec"><span>Addresses</span><span class="app-muted"><span data-v-stats-held>${c.held().length}</span> of ${c.limit}</span></div>
        <p class="v-stats-note v-stats-note--lead">People who typed an address heard it or saw it somewhere. Each page has its own, so each row is one show, talk or card.</p>
        <table class="v-stats-table v-stats-addr"><thead><tr><th>Address</th><th>Page</th><th>Typed it</th><th>Share link</th><th>Leads</th><th>Last visit</th><th></th></tr></thead><tbody data-v-stats-addr-rows>${addressRows(c)}</tbody></table>
        <div class="v-stats-sec"><span>Journey Pages</span><span class="app-muted">4</span></div>
        <div style="display:flex;gap:16px;flex-wrap:wrap">${c.pages.map((page) => c.pageCard(page)).join('')}</div>`,
    }),
    mount: (root, c) => {
      c.onAddress(() => {
        root.querySelector('[data-v-stats-addr-rows]').innerHTML = addressRows(c);
        root.querySelector('[data-v-stats-held]').textContent = c.held().length;
      });
    },
  });

  PG.css(`
    /* step 3: the listener's phone */
    .v-listener-pair { display: flex; gap: 40px; align-items: flex-start; }
    .v-listener-pair .app-browser { flex: 1; min-width: 0; }
    .v-listener-pair--phones > div { width: 390px; flex: none; }
    .v-listener-cap { display: grid; gap: 3px; align-content: start; min-height: 74px; margin: 0 0 10px 14px; max-width: 376px; }
    .v-listener-cap > b { font-size: 13px; font-weight: 600; }
    .v-listener-cap > span { font-size: 12px; line-height: 1.45; color: var(--muted-foreground); }
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
    .v-listener-form { display: grid; gap: 8px; margin: 0; }
    .v-listener-form .app-input { height: 40px; font-size: 15px; }
    .v-listener-form--card { padding: 14px; border-radius: 12px; background: var(--muted); }
    .v-listener-wide { width: 100%; }
    .v-listener-tall { height: 40px; }
    .v-listener-sent { display: flex; gap: 8px; align-items: flex-start; padding: 12px 14px; border-radius: 12px; background: oklch(0.95 0.035 165); font-size: 14px; line-height: 1.45; }
    .v-listener-sent svg { width: 18px; height: 18px; flex: none; color: var(--success); margin-top: 1px; }
    .v-listener-badge { display: flex; justify-content: center; align-items: center; gap: 5px; font-size: 12px; color: var(--muted-foreground); padding-top: 6px; }
    .v-listener-badge b { font-weight: 600; }
    .v-listener-badge a { text-decoration: underline; text-underline-offset: 2px; }
    .v-listener-mark { width: 14px; height: 14px; }
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
    .v-listener-go .app-affix { flex: 1 1 0; min-width: 0; height: 40px; font-size: 15px; }
    .v-listener-go .app-affix > input { width: 0; }
    .v-listener-go .pgb { flex: none; height: 40px; }

    /* step 4: stats */
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
    .v-stats-note--lead { font-size: 13px; margin: -4px 0 12px; max-width: 640px; }
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
    .v-stats-card-via { display: flex; align-items: center; gap: 6px; margin: 8px 4px 0; font-size: 12.5px; }
    .v-stats-card-via svg { width: 14px; height: 14px; color: var(--muted-foreground); }
    .v-stats-card-via > span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .v-stats-card-via > b { font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .v-stats-card-via--off { color: var(--muted-foreground); }
    .v-stats-card-via--off > .app-badge { flex: none; }
    .v-stats-card-bar { height: 4px; border-radius: 99px; background: var(--muted); margin: 6px 4px 0; overflow: hidden; }
    .v-stats-card-bar i { display: block; height: 100%; border-radius: 99px; background: var(--primary); }
    .v-stats-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 22px 0 14px; }
    .v-stats-search { position: relative; width: 320px; display: block; }
    .v-stats-search svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--muted-foreground); }
    .v-stats-search .app-input { height: 36px; padding-left: 32px; }
    .v-stats-from { margin: 0 0 12px; font-size: 14px; display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; }
    .v-stats-leads { font-size: 14px; }
    .v-stats-leads th { font-weight: 500; color: var(--foreground); padding: 10px 8px; }
    .v-stats-leads td { padding: 10px 8px; white-space: nowrap; }
    .v-stats-link { text-decoration: underline; text-decoration-color: transparent; }
    .v-stats-via { display: inline-flex; align-items: center; gap: 5px; }
    .v-stats-via svg { width: 14px; height: 14px; color: var(--muted-foreground); }
    .v-stats-sec { display: flex; align-items: baseline; gap: 8px; font-size: 17px; font-weight: 600; margin: 4px 0 10px; }
    .v-stats-sec .app-muted { font-size: 13px; font-weight: 400; }
    .v-stats-addr { font-size: 14px; max-width: 1040px; margin: 0 0 30px; }
    .v-stats-addr th { font-weight: 500; color: var(--foreground); padding: 10px 8px; }
    .v-stats-addr td { padding: 10px 8px; white-space: nowrap; }
    .v-stats-addr-off td { color: var(--muted-foreground); }
    .v-stats-hbar { display: inline-block; vertical-align: middle; width: 150px; height: 8px; border-radius: 99px; background: var(--muted); overflow: hidden; margin-right: 10px; }
    .v-stats-hbar i { display: block; height: 100%; border-radius: 99px; background: var(--primary); }
  `);
})();
