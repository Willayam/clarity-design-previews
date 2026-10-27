// Step 1 of the page address playground, "Where Todd sets it". Five places Todd can give a page
// its address, each showing the set and what he copies afterwards. PROTOTYPE, throwaway. Mock
// data only. CSS prefix: v-where-.
(() => {
  const LOGO = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="4"/><path d="M13 10.5v11l9-5.5z" fill="currentColor"/></svg>';
  const pageUrl = (page) => `clarity.video/page/${page.share}`;

  // ---------- pieces of the real share dialog ----------
  const head = (c, title = 'Share') => `<h2 class="app-dialog-title">${title}</h2><span class="app-dialog-x">${c.icon('x')}</span>`;
  const accessRows = (c) => `<div class="app-row"><span class="app-row-label">${c.icon('globe')}Who can open it</span><span class="app-select">Anyone with the link ${c.icon('chevron-down')}</span></div>
    <div class="app-row"><span class="app-row-label">${c.icon('lock')}Password protected</span><span class="app-switch"></span></div>`;
  const band = (word, small, tone = 'live') => `<div class="app-live" data-tone="${tone}"><b>${word}</b><small>${small}</small></div>`;
  const lab = (c, iconName, text) => `<span class="v-where-lab">${c.icon(iconName)}${text}</span>`;
  const urlRow = (c, inner, extra = '') => `<div class="app-url ${extra}"><span>${inner}</span>${c.icon('copy')}</div>`;
  // The address field, kept plain. The "Picking the address" step designs its states in depth.
  const affix = (extra = '') => `<span class="app-affix ${extra}"><span>clarity.video/</span><input data-address-input spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="todd" aria-label="Address"></span>`;
  const field = (label = 'Address') => `<label class="app-field v-where-field">
      ${label ? `<span class="app-label">${label}</span>` : ''}
      ${affix()}
      <span class="app-hint v-where-status" data-address-status></span>
    </label>`;
  // Two dialogs over one dimmed Home, each captioned, so the set and the afterwards sit side by side.
  const pair = (c, items) => `<div class="v-where-root v-where-pair"><div class="app-dim">${c.home()}</div><div class="v-where-layer">
      ${items.map((item) => `<div class="v-where-col" style="width:${item.width ?? 420}px"><div class="v-where-cap">${item.cap}</div><div class="app-dialog">${item.body}</div></div>`).join('')}
    </div></div>`;

  // A. Address on top. Set in the share dialog; once set it is the main link and the page link steps down.
  PG.variant({
    surface: 'where',
    key: 'A',
    name: 'Address on top',
    idea: 'Todd sets the address in the share dialog, right under the link he already copies. Once it exists it takes the top row and the big button, and the page link drops to a smaller row for one known person.',
    width: 920,
    render: (c) => {
      const page = c.page;
      const before = `${head(c)}
        ${urlRow(c, pageUrl(page))}
        <div class="v-where-offer">
          <div class="v-where-offer-head">${c.icon('mic')}<b>Give it an address people can say</b></div>
          <p>Like clarity.video/todd. It opens this page too, and the link above keeps working.</p>
          ${field()}
          <div class="v-where-btns"><button class="${c.btn('default')}">Save address</button><button class="${c.btn('ghost')}">Skip</button></div>
        </div>
        ${accessRows(c)}
        ${band('Live', `Published ${page.updated}.`)}
        <button class="${c.btn('default', 'lg')} app-wide">${c.icon('copy')}Copy link</button>`;
      const after = `${head(c)}
        <div class="v-where-block">
          ${lab(c, 'mic', 'Address. Say it on the podcast.')}
          ${urlRow(c, '<span data-address-url></span>', 'v-where-url--main')}
          <span class="app-hint">Out loud, that's <span data-address-say></span>. <button class="${c.btn('link', 'inline')}">Change</button></span>
        </div>
        <div class="v-where-block">
          ${lab(c, 'link', 'Page link. Still works where you sent it.')}
          ${urlRow(c, pageUrl(page), 'v-where-url--second')}
        </div>
        ${accessRows(c)}
        ${band('Live', `Published ${page.updated}. ${page.viaAddress} of ${page.visits} visits came through the address.`)}
        <button class="${c.btn('default', 'lg')} app-wide">${c.icon('copy')}Copy address</button>`;
      return pair(c, [
        { cap: 'Setting it. Todd pressed "Give it an address" under the link.', body: before },
        { cap: 'Afterwards', body: after },
      ]);
    },
  });

  // B. Share link stays first. Today's dialog untouched; the address is one row Todd opens on request.
  PG.variant({
    surface: 'where',
    key: 'B',
    name: 'Share link stays first',
    idea: "Today's dialog does not move. The address is one quiet row under the Copy button that Todd opens when he wants it, so a page made for one prospect never shows a field it does not need.",
    width: 920,
    render: (c) => {
      const page = c.page;
      const top = (primaryLabel) => `${head(c)}
        ${urlRow(c, pageUrl(page))}
        ${accessRows(c)}
        ${band('Live', `Published ${page.updated}.`)}
        <button class="${c.btn('default', 'lg')} app-wide">${c.icon('copy')}${primaryLabel}</button>`;
      const before = `${top('Copy link')}
        <div class="v-where-disc" data-open="true">
          <div class="v-where-disc-row"><button class="v-where-disc-head" data-disc>${c.icon('chevron-right')}${c.icon('mic')}<span>Give it an address people can say</span></button></div>
          <div class="v-where-disc-body">
            ${field('')}
            <div class="v-where-btns"><button class="${c.btn('default', 'sm')}">Save address</button><button class="${c.btn('ghost', 'sm')}" data-disc>Cancel</button></div>
          </div>
        </div>`;
      const after = `${top('Copy page link')}
        <div class="v-where-disc" data-open="false">
          <div class="v-where-disc-row">
            <button class="v-where-disc-head" data-disc>${c.icon('chevron-right')}${c.icon('mic')}<span>Address <b data-address-url></b></span></button>
            <button class="${c.btn('outline', 'sm')}">${c.icon('copy')}Copy address</button>
          </div>
          <div class="v-where-disc-body">
            <span class="app-hint">Say it on the podcast. Out loud, that's <span data-address-say></span>.</span>
            <span class="app-hint">${page.viaAddress} of ${page.visits} visits came through it.</span>
            <div class="v-where-btns"><button class="${c.btn('ghost', 'sm')}">${c.icon('pencil')}Change</button><button class="${c.btn('ghost', 'sm')}">Remove</button></div>
          </div>
        </div>`;
      return pair(c, [
        { cap: 'Setting it. Todd opened the row under Copy link.', body: before },
        { cap: 'Afterwards. Press the row to open it.', body: after },
      ]);
    },
    mount: (root) => {
      root.querySelectorAll('[data-disc]').forEach((button) => button.addEventListener('click', () => {
        const box = button.closest('.v-where-disc');
        box.dataset.open = box.dataset.open === 'true' ? 'false' : 'true';
      }));
    },
  });

  // C. Offered at publish. The first Publish asks once, prefilled, and can be skipped in one press.
  PG.variant({
    surface: 'where',
    key: 'C',
    name: 'Offered at publish',
    idea: 'The first Publish asks once, with a name already filled in, so the address exists before Todd records the podcast. Skipping is one press. Afterwards the dialog leads with the address and keeps the two copy buttons apart.',
    width: 920,
    render: (c) => {
      const page = c.page;
      const publish = `${head(c)}
        ${band('Not published', 'Nobody can open it until you publish.', 'off')}
        <div class="v-where-offer">
          <div class="v-where-offer-head">${c.icon('mic')}<b>Give it an address people can say</b></div>
          <p>Something to say on a podcast or put on a slide. You can add or change it later from Share.</p>
          ${field('')}
        </div>
        <div class="v-where-block">
          <button class="${c.btn('default', 'lg')} app-wide" data-publish-with>${c.icon('globe')}Publish at <span data-address-url></span></button>
          <button class="${c.btn('ghost')} app-wide">Publish without an address</button>
        </div>`;
      const after = `${head(c)}
        <div class="v-where-hero">
          ${lab(c, 'mic', 'Say it on the podcast')}
          <b class="v-where-hero-url" data-address-url></b>
          <span class="v-where-hero-say">Out loud, that's <span data-address-say></span>.</span>
        </div>
        ${band('Live', 'Published just now.')}
        ${accessRows(c)}
        <div class="v-where-two"><button class="${c.btn('default')}">${c.icon('copy')}Copy address</button><button class="${c.btn('outline')}">${c.icon('copy')}Copy page link</button></div>
        <span class="app-hint">The page link, ${pageUrl(page)}, opens this page too. Send it to one person.</span>`;
      return pair(c, [
        { cap: 'Publishing for the first time', body: publish },
        { cap: 'Right after', body: after },
      ]);
    },
    mount: (root, c) => {
      const paint = (address, result) => {
        const ok = result.state === 'free' || result.state === 'current';
        root.querySelectorAll('[data-publish-with]').forEach((button) => { button.disabled = !ok; });
      };
      c.onAddress(paint);
      paint(c.address, c.check(c.address));
    },
  });

  // D. Beside the title. The editor top bar shows the page's address like a site URL; edit it in place.
  PG.variant({
    surface: 'where',
    key: 'D',
    name: 'Beside the title',
    idea: 'The page shows its own web address next to its title, the way a site editor does, and Todd edits it right there. The bar copies the address and Share keeps copying the page link, so the two never share a button.',
    width: 1200,
    render: (c) => {
      const page = c.page;
      const strip = (state, cap) => `<div class="v-where-ed" data-state="${state}">
        <div class="v-where-ed-cap">${cap}</div>
        <div class="v-where-ed-frame">
          <div class="v-where-rail">${LOGO}${c.icon('sidebar')}${c.icon('home')}${c.icon('users')}</div>
          <div class="v-where-ed-main">
            ${c.editorTop({ title: `<span class="v-where-title">${page.title}</span><span class="v-where-addr">
              <span data-for="none"><span class="v-where-addr-cur">${c.icon('link')}${pageUrl(page)}</span><button class="${c.btn('ghost', 'sm')}" data-edit>${c.icon('mic')}Add an address</button></span>
              <span data-for="edit">${affix('v-where-addr-affix')}<button class="${c.btn('default', 'sm')}" data-save>Save</button><button class="${c.btn('ghost', 'sm')}" data-cancel>Cancel</button><span class="v-where-addr-note v-where-status" data-address-status></span></span>
              <span data-for="set"><span class="v-where-addr-cur v-where-addr-cur--set">${c.icon('mic')}<span data-address-url></span></span><button class="${c.btn('ghost', 'icon-sm')}" aria-label="Copy address" data-copy>${c.icon('copy')}</button><button class="${c.btn('ghost', 'icon-sm')}" aria-label="Change address" data-edit>${c.icon('pencil')}</button><span class="v-where-addr-note v-where-addr-toast" data-toast ${state === 'set' ? '' : 'hidden'}>Copied <span data-address-url></span>. Share still copies the page link.</span></span>
            </span>` })}
            <div class="v-where-canvas"><div class="v-where-page"><h1>${page.title}</h1><div class="v-where-video"></div></div></div>
          </div>
        </div>
      </div>`;
      return `<div class="v-where-root v-where-stack">${strip('none', 'No address yet. The bar shows the page link.')}${strip('edit', 'Editing in place')}${strip('set', 'Afterwards. Todd pressed copy in the bar.')}</div>`;
    },
    mount: (root) => {
      root.querySelectorAll('.v-where-ed').forEach((strip) => {
        let previous = strip.dataset.state === 'edit' ? 'none' : strip.dataset.state;
        strip.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => { previous = strip.dataset.state; strip.dataset.state = 'edit'; }));
        strip.querySelector('[data-save]').addEventListener('click', () => { strip.dataset.state = 'set'; });
        strip.querySelector('[data-cancel]').addEventListener('click', () => { strip.dataset.state = previous; });
        const toast = strip.querySelector('[data-toast]');
        strip.querySelector('[data-copy]').addEventListener('click', () => {
          toast.hidden = false;
          clearTimeout(toast.timer);
          toast.timer = setTimeout(() => { toast.hidden = true; }, 1800);
        });
      });
    },
  });

  // E. On the Home card. Each card wears its address and sets it from the card; a strip lists them all.
  PG.variant({
    surface: 'where',
    key: 'E',
    name: 'On the Home card',
    idea: 'Home is where Todd sees all his pages, so each card wears its address and sets it from the card. A strip above lists every address he holds, 3 of 5, one page per row, so he sees which name opens which page without opening anything.',
    width: 1200,
    render: (c) => {
      const [pod, acme, webinar] = c.pages;
      const addrLine = (inner) => `<div class="v-where-card-addr">${c.icon('mic')}<span>${inner}</span><button class="${c.btn('ghost', 'icon-sm')}" aria-label="Copy address">${c.icon('copy')}</button></div>`;
      const addLine = `<div class="v-where-card-add"><button class="${c.btn('link', 'inline')}" data-add>${c.icon('mic')}Add an address people can say</button></div>`;
      const pop = `<div class="v-where-pop">
          <b>Give it an address people can say</b>
          ${field('')}
          <div class="v-where-btns"><button class="${c.btn('default', 'sm')}" data-save>Save address</button><button class="${c.btn('ghost', 'sm')}" data-cancel>Cancel</button></div>
        </div>`;
      const wrap = (page, state, extra) => `<div class="v-where-cardwrap" data-state="${state}">${c.pageCard(page, extra)}</div>`;
      const cards = [
        wrap(pod, 'setting', `<div data-for="none">${addLine}</div><div data-for="setting">${addLine}${pop}</div><div data-for="set">${addrLine('<span data-address-url></span>')}</div>`),
        wrap(acme, 'none', `<div data-for="none">${addLine}</div><div data-for="setting">${addLine}${pop}</div><div data-for="set">${addrLine('<span data-address-url></span>')}</div>`),
        wrap(webinar, 'set', addrLine(`clarity.video/${webinar.address}`)),
      ].join('');
      const row = (address, page, inner) => `<div class="v-where-held-row" data-live="${page.live}" data-held-page="${page.id}">
          <span class="v-where-held-url">${inner ?? `clarity.video/${address}`}</span>
          ${c.icon('arrow')}
          <span class="v-where-held-page">${page.title}</span>
          <span class="v-where-held-meta">${page.live ? `${page.viaAddress} visits came through it` : 'Page offline. Visitors see your name.'}</span>
          <button class="${c.btn('ghost', 'sm')}">${c.icon('copy')}Copy</button>
        </div>`;
      const rows = c.pages.filter((page) => page.id === 'p1' || page.address).map((page) => row(page.address, page, page.id === 'p1' ? '<span data-address-url></span>' : null)).join('');
      const banner = `<div class="v-where-held v-where-root">
          <div class="v-where-held-head">${c.icon('mic')}<b>Addresses people can say</b><span class="app-muted" data-held-count>${c.held().length} of ${c.limit}</span><span class="app-hint v-where-held-hint">Each one opens one page. Set it from the page's card.</span></div>
          <div class="v-where-held-rows">${rows}</div>
        </div>`;
      return `<div class="v-where-root">${c.home({ banner, cards })}</div>`;
    },
    mount: (root, c) => {
      root.querySelectorAll('.v-where-cardwrap').forEach((card) => {
        card.querySelectorAll('[data-add]').forEach((button) => button.addEventListener('click', () => { card.dataset.state = 'setting'; }));
        card.querySelectorAll('[data-save]').forEach((button) => button.addEventListener('click', () => { card.dataset.state = 'set'; }));
        card.querySelectorAll('[data-cancel]').forEach((button) => button.addEventListener('click', () => { card.dataset.state = 'none'; }));
      });
      const count = root.querySelector('[data-held-count]');
      const podRow = root.querySelector('[data-held-page="p1"]');
      // The strip lists p1's row only while the typed name could be saved; a reserved or
      // already-used name is not held yet.
      const paint = (address, result) => {
        const savable = result.state === 'free' || result.state === 'current';
        const held = c.held().filter((entry) => entry.page.id !== 'p1' || savable);
        count.textContent = `${held.length} of ${c.limit}`;
        podRow.hidden = !held.some((entry) => entry.page.id === 'p1');
      };
      c.onAddress(paint);
      paint(c.address, c.check(c.address));
    },
  });

  PG.css(`
    .v-where-root [hidden] { display: none !important; }

    /* pairs of dialogs */
    .v-where-pair { position: relative; }
    .v-where-pair > .app-dim { position: absolute; inset: 0; overflow: hidden; }
    .v-where-layer { position: relative; z-index: 2; display: flex; justify-content: center; align-items: flex-start; gap: 24px; padding: 32px 24px 44px; flex-wrap: wrap; }
    .v-where-col { display: grid; gap: 8px; }
    .v-where-cap { justify-self: start; color: white; font-size: 13px; font-weight: 500; background: oklch(0 0 0 / 0.45); padding: 4px 10px; border-radius: 8px; }
    .v-where-root .app-dialog { width: 100%; }
    .v-where-block { display: grid; gap: 6px; }
    .v-where-lab { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 500; color: var(--muted-foreground); }
    .v-where-lab svg { width: 14px; height: 14px; }
    .v-where-btns { display: flex; gap: 8px; align-items: center; }

    /* the field and its status */
    .v-where-field { gap: 6px; }
    .v-where-status { min-height: 17px; }
    .v-where-status[data-state="free"], .v-where-status[data-state="current"] { color: var(--success); }
    .v-where-status[data-state="taken"], .v-where-status[data-state="reserved"], .v-where-status[data-state="invalid"] { color: var(--destructive); }
    .v-where-status[data-state="yours"] { color: var(--foreground); }

    /* the offer box (A, C) */
    .v-where-offer { display: grid; gap: 8px; border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px 14px; background: var(--card); }
    .v-where-offer-head { display: flex; align-items: center; gap: 8px; }
    .v-where-offer-head svg { color: var(--primary); }
    .v-where-offer-head b { font-weight: 600; }
    .v-where-offer p { margin: 0; font-size: 13px; color: var(--muted-foreground); line-height: 1.45; }

    /* A: main and second link rows */
    .v-where-url--main { height: 48px; }
    .v-where-url--main > span { font-weight: 600; font-size: 15.5px; }
    .v-where-url--second { height: 36px; font-size: 13px; background: transparent; border: 1px solid var(--border); }
    .v-where-url--second > span { color: var(--muted-foreground); }
    .v-where-url--second > svg { color: var(--muted-foreground); }

    /* B: the row under Copy link */
    .v-where-disc { border-top: 1px solid var(--border); margin-top: -4px; padding-top: 12px; display: grid; gap: 10px; }
    .v-where-disc-row { display: flex; align-items: center; gap: 8px; }
    .v-where-disc-head { appearance: none; border: 0; background: none; padding: 0; font: inherit; color: var(--foreground); display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; text-align: left; cursor: pointer; font-size: 13.5px; font-weight: 500; }
    .v-where-disc-head > svg { width: 15px; height: 15px; color: var(--muted-foreground); flex: none; }
    .v-where-disc-head > svg:first-child { transition: transform 120ms; }
    .v-where-disc[data-open="true"] .v-where-disc-head > svg:first-child { transform: rotate(90deg); }
    .v-where-disc-head b { font-weight: 600; }
    .v-where-disc-body { display: grid; gap: 8px; padding-left: 23px; }
    .v-where-disc[data-open="false"] .v-where-disc-body { display: none; }

    /* C: the published hero and two copy buttons */
    .v-where-hero { display: grid; gap: 4px; padding: 14px 16px; border-radius: 12px; background: var(--accent); }
    .v-where-hero-url { font-size: 22px; font-weight: 600; letter-spacing: -0.01em; word-break: break-all; line-height: 1.2; }
    .v-where-hero-say { font-size: 13px; color: var(--muted-foreground); }
    .v-where-two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .v-where-two > button { height: 40px; }

    /* D: the editor top bar */
    .v-where-stack { display: grid; gap: 14px; padding: 14px; background: oklch(0.93 0.008 255); }
    .v-where-ed { display: grid; gap: 6px; }
    .v-where-ed-cap { font-size: 12.5px; font-weight: 500; color: var(--muted-foreground); }
    .v-where-ed-frame { display: grid; grid-template-columns: 64px 1fr; background: var(--background); border-radius: 10px; overflow: hidden; border: 1px solid var(--border); }
    .v-where-ed-main { min-width: 0; }
    .v-where-rail { background: var(--sidebar); border-right: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 12px 0; color: var(--primary); }
    .v-where-rail > svg { width: 30px; height: 30px; }
    .v-where-rail > svg.app-icon { width: 16px; height: 16px; color: var(--muted-foreground); }
    .v-where-ed .app-editor-top { position: relative; z-index: 6; }
    .v-where-ed .app-editor-top .title { display: flex; align-items: center; gap: 14px; min-width: 0; }
    .v-where-title { white-space: nowrap; }
    .v-where-addr { display: inline-flex; align-items: center; gap: 6px; font-weight: 400; font-size: 13px; position: relative; }
    .v-where-addr [data-for] { display: none; align-items: center; gap: 6px; position: relative; }
    .v-where-ed[data-state="none"] [data-for="none"], .v-where-ed[data-state="edit"] [data-for="edit"], .v-where-ed[data-state="set"] [data-for="set"] { display: inline-flex; }
    .v-where-addr-cur { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: 8px; color: var(--muted-foreground); background: var(--muted); white-space: nowrap; }
    .v-where-addr-cur svg { width: 14px; height: 14px; }
    .v-where-addr-cur--set { color: var(--foreground); font-weight: 500; }
    .v-where-addr-cur--set svg { color: var(--primary); }
    .v-where-addr-affix { width: 260px; height: 28px; }
    .v-where-addr-note { position: absolute; top: calc(100% + 10px); left: 0; font-size: 12.5px; font-weight: 400; white-space: nowrap; border-radius: 8px; padding: 6px 10px; background: var(--popover); color: var(--popover-foreground); box-shadow: 0 8px 24px oklch(0 0 0 / 0.14), 0 0 0 1px oklch(0 0 0 / 0.05); }
    .v-where-addr-toast { background: var(--foreground); color: var(--background); box-shadow: none; }
    .v-where-canvas { height: 150px; overflow: hidden; display: flex; justify-content: center; padding-top: 24px; }
    .v-where-page { width: 720px; }
    .v-where-page h1 { font-size: 28px; margin: 0 0 14px; letter-spacing: -0.02em; line-height: 1.2; }
    .v-where-video { height: 200px; border-radius: 12px; background: var(--primary); opacity: 0.9; }

    /* E: Home cards and the strip of held addresses. The shell grows so the card's popover is not clipped. */
    .v-where-root .app-shell { min-height: 860px; }
    .v-where-held { border: 1px solid var(--border); border-radius: 14px; background: var(--card); padding: 12px 16px 6px; margin: 0 0 22px; display: grid; gap: 6px; }
    .v-where-held-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .v-where-held-head > svg { color: var(--primary); }
    .v-where-held-head b { font-weight: 600; }
    .v-where-held-hint { margin-left: auto; }
    .v-where-held-rows { display: grid; }
    .v-where-held-row { display: grid; grid-template-columns: 220px 16px minmax(0, 1fr) auto auto; gap: 12px; align-items: center; min-height: 42px; border-top: 1px solid var(--border); font-size: 13.5px; }
    .v-where-held-url { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .v-where-held-row > svg { color: var(--muted-foreground); }
    .v-where-held-page { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .v-where-held-meta { font-size: 12.5px; color: var(--muted-foreground); white-space: nowrap; }
    .v-where-held-row[data-live="false"] .v-where-held-url { color: var(--muted-foreground); text-decoration: line-through; text-decoration-color: oklch(0.7 0.02 260); }
    .v-where-cardwrap { position: relative; }
    .v-where-cardwrap [data-for] { display: none; }
    .v-where-cardwrap[data-state="none"] [data-for="none"], .v-where-cardwrap[data-state="setting"] [data-for="setting"], .v-where-cardwrap[data-state="set"] [data-for="set"] { display: block; }
    .v-where-card-addr { display: flex; align-items: center; gap: 6px; margin: 6px 0 0 4px; font-size: 13px; font-weight: 500; color: var(--foreground); min-height: 28px; }
    .v-where-card-addr > svg { width: 14px; height: 14px; color: var(--primary); flex: none; }
    .v-where-card-addr > span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .v-where-card-add { margin: 6px 4px 0; min-height: 28px; display: flex; align-items: center; font-size: 13px; }
    .v-where-cardwrap[data-state="setting"] .v-where-card-add { color: var(--primary); }
    .v-where-pop { position: absolute; top: calc(100% + 6px); left: 0; width: 320px; background: var(--popover); color: var(--popover-foreground); border-radius: 12px; box-shadow: 0 18px 48px oklch(0 0 0 / 0.18), 0 0 0 1px oklch(0 0 0 / 0.05); padding: 14px 16px; display: grid; gap: 10px; z-index: 6; font-size: 13.5px; text-align: left; }
    .v-where-pop b { font-weight: 600; }
  `);
})();
