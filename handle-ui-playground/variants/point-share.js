// Variants for two steps: "point" (which page the address opens) and "share" (the share dialog).
// PROTOTYPE, throwaway. CSS prefixes: v-point- and v-share-.
(() => {
  const EXTRA = {
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  };
  const xicon = (name, cls = 'app-icon') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${EXTRA[name]}</svg>`;
  const LOGO = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="4"/><path d="M13 10.5v11l9-5.5z" fill="currentColor"/></svg>';
  const url = (c) => `clarity.video/${c.handle}`;
  // The shell syncs these bindings for the combination and the gallery, but not for the
  // "Open at full size" view, so each mount fills them once itself.
  const fill = (root, c) => {
    root.querySelectorAll('[data-handle]').forEach((node) => { node.textContent = c.handle; });
    root.querySelectorAll('[data-handle-url]').forEach((node) => { node.textContent = url(c); });
    root.querySelectorAll('[data-handle-say]').forEach((node) => { node.textContent = c.say(c.handle); });
  };

  // ======================================================================
  // point: choosing the page the address opens
  // ======================================================================

  // A. Settings picker: one list, one Save, the note names what stops.
  PG.variant({
    surface: 'point',
    key: 'A',
    name: 'Settings picker',
    idea: 'The address is a fact about Todd, so the page it opens is set in Settings beside his name and booking link. One list of his pages, one Save, and a note that names which page stops opening there.',
    width: 1200,
    render: (c) => {
      const [pod, acme, webinar, draft] = c.pages;
      const opt = (page, checked = false) => `<div class="v-point-opt" role="radio" aria-checked="${checked}" aria-disabled="${!page.live}" data-page="${page.id}">
          <span class="v-point-radio"></span>
          <span class="v-point-opt-name">${page.title}</span>
          <span class="app-badge app-badge--blue" data-now hidden>Opens now</span>
          <span class="v-point-opt-meta">${page.live ? `Live · ${page.visits} visits` : 'Not published. Publish it to pick it.'}</span>
        </div>`;
      return c.settings({
        tab: 'Profile',
        body: `<section class="app-card"><div class="app-card-body">
            <h3 class="app-card-title">Profile</h3>
            <label class="app-field"><span class="app-label">Full name</span><input class="app-input" value="Todd Ellis"></label>
            <label class="app-field"><span class="app-label">Booking link</span><input class="app-input" value="https://calendly.com/todd-ellis/intro"><span class="app-hint">New pages link their booking button here.</span></label>
          </div><div class="app-card-foot"><button class="${c.btn('default')}" disabled>Save changes</button></div></section>
          <section class="app-card v-point-root"><div class="app-card-body">
            <h3 class="app-card-title">Your address</h3>
            <p class="app-card-desc"><b data-handle-url></b>. Say it: <span data-handle-say></span>.</p>
            <div class="app-field"><span class="app-label"><span data-handle-url></span> opens</span>
              <div class="v-point-list" role="radiogroup">${opt(pod)}${opt(webinar, true)}${opt(acme)}${opt(draft)}</div>
              <p class="v-point-note" data-note></p>
            </div>
          </div><div class="app-card-foot"><button class="${c.btn('default')}" data-save>Save changes</button><button class="${c.btn('outline')}" data-cancel>Cancel</button></div></section>`,
      });
    },
    mount: (root, c) => {
      fill(root, c);
      let current = c.pages[0].id;
      let picked = c.pages[2].id;
      const note = root.querySelector('[data-note]');
      const save = root.querySelector('[data-save]');
      const page = (id) => c.pages.find((p) => p.id === id);
      const paint = () => {
        root.querySelectorAll('.v-point-opt').forEach((el) => {
          el.setAttribute('aria-checked', String(el.dataset.page === picked));
          el.querySelector('[data-now]').hidden = el.dataset.page !== current;
        });
        const same = picked === current;
        note.textContent = same
          ? `People who type ${url(c)} land on ${page(current).title}.`
          : `After you save, ${url(c)} opens ${page(picked).title}. ${page(current).title} stops opening there. Its own link, clarity.video/page/${page(current).share}, keeps working.`;
        note.dataset.tone = same ? 'same' : 'change';
        save.disabled = same;
      };
      root.querySelectorAll('.v-point-opt').forEach((el) => el.addEventListener('click', () => {
        if (el.getAttribute('aria-disabled') === 'true') return;
        picked = el.dataset.page;
        paint();
      }));
      root.querySelector('[data-cancel]').addEventListener('click', () => { picked = current; paint(); });
      save.addEventListener('click', () => { current = picked; paint(); });
      c.onHandle(paint);
      paint();
    },
  });

  // B. Home card marker: the card that opens wears the address; any other live card's menu moves it.
  PG.variant({
    surface: 'point',
    key: 'B',
    name: 'Home card marker',
    idea: 'Home shows every page at once, so the address is a marker on the card it opens, and any other live card moves it from its menu in one click. The bar that follows names what changed and offers Undo.',
    width: 1200,
    render: (c) => {
      const [pod, acme, webinar, draft] = c.pages;
      const menu = (page) => `<div class="v-point-menu" data-menu ${page.id === webinar.id ? '' : 'hidden'}>
          <div class="v-point-mi">${c.icon('chart')}<span>Activity</span></div>
          <div class="v-point-mi" data-send ${page.id === webinar.id ? 'data-hot' : ''}></div>
          <div class="v-point-sep"></div>
          <div class="v-point-mi">${c.icon('pencil')}<span>Rename</span></div>
          <div class="v-point-mi">${c.icon('copy')}<span>Duplicate</span></div>
          <div class="v-point-sep"></div>
          <div class="v-point-mi">${xicon('folder')}<span>Move to</span>${c.icon('chevron-right', 'app-icon v-point-mi-end')}</div>
          <div class="v-point-sep"></div>
          <div class="v-point-mi v-point-mi--danger">${xicon('trash')}<span>Delete</span></div>
        </div>`;
      const card = (page) => `<div class="app-page-card v-point-card" data-page="${page.id}" data-open="${page.id === webinar.id}">
          <div class="app-page-thumb"><span class="app-page-share">${c.icon('share')}</span><div class="mini">${page.title}<i></i></div></div>
          <button class="${c.btn('ghost', 'icon-sm')} v-point-dots" aria-label="More" data-dots>${c.icon('more')}</button>
          ${menu(page)}
          <div class="app-page-name">${page.title}</div>
          <div class="v-point-mark" data-mark hidden>${c.icon('at')}<span data-handle-url></span></div>
          <div class="app-page-meta">${page.live
            ? `<span>${c.icon('calendar')} ${page.updated}</span><span>${c.icon('eye')} ${page.visits} visits</span>`
            : `<span>Not published</span><span>${c.icon('calendar')} ${page.updated}</span>`}</div>
        </div>`;
      return c.home({
        banner: `<div class="v-point-undo v-point-root" data-undo hidden><span data-undo-text></span><button class="${c.btn('outline', 'sm')}" data-undo-btn>Undo</button></div>`,
        cards: [pod, acme, webinar, draft].map(card).join(''),
      });
    },
    mount: (root, c) => {
      fill(root, c);
      let current = c.pages[0].id;
      let previous = null;
      const cards = [...root.querySelectorAll('.v-point-card')];
      const undo = root.querySelector('[data-undo]');
      const page = (id) => c.pages.find((p) => p.id === id);
      const closeAll = () => cards.forEach((card) => { card.dataset.open = 'false'; card.querySelector('[data-menu]').hidden = true; });
      const paint = () => {
        cards.forEach((card) => {
          const self = page(card.dataset.page);
          card.querySelector('[data-mark]').hidden = self.id !== current;
          const item = card.querySelector('[data-send]');
          if (self.id === current) {
            item.innerHTML = `${c.icon('check')}<span>Opens at ${url(c)}<small>People who type the address land here.</small></span>`;
            item.setAttribute('aria-disabled', 'true');
          } else if (!self.live) {
            item.innerHTML = `${c.icon('at')}<span>Send ${url(c)} here<small>Publish this page first.</small></span>`;
            item.setAttribute('aria-disabled', 'true');
          } else {
            item.innerHTML = `${c.icon('at')}<span>Send ${url(c)} here<small>${page(current).title} stops opening there.</small></span>`;
            item.setAttribute('aria-disabled', 'false');
          }
        });
        undo.hidden = !previous;
        if (previous) undo.querySelector('[data-undo-text]').textContent = `${url(c)} now opens ${page(current).title}. ${page(previous).title} stops opening there. Its own link keeps working.`;
      };
      cards.forEach((card) => {
        card.querySelector('[data-dots]').addEventListener('click', () => {
          const open = card.dataset.open !== 'true';
          closeAll();
          card.dataset.open = String(open);
          card.querySelector('[data-menu]').hidden = !open;
        });
        card.querySelector('[data-send]').addEventListener('click', (event) => {
          if (event.currentTarget.getAttribute('aria-disabled') === 'true') return;
          previous = current;
          current = card.dataset.page;
          closeAll();
          paint();
        });
      });
      undo.querySelector('[data-undo-btn]').addEventListener('click', () => { current = previous; previous = null; paint(); });
      c.onHandle(paint);
      paint();
    },
  });

  // C. Editor chip: a chip beside the title says whether this page opens at the address.
  PG.variant({
    surface: 'point',
    key: 'C',
    name: 'Editor chip',
    idea: 'Todd swaps while he is in the page. A chip beside the title says whether this page opens at the address; on any other live page it offers to send the address here, and the popover names what stops. Three pages shown: the one that opens, a live one, a draft.',
    width: 1200,
    render: (c) => {
      const [pod, , webinar, draft] = c.pages;
      const strip = (page, state, popOpen = false) => `<div class="v-point-ed" data-state="${state}">
          <div class="v-point-rail">${LOGO}${c.icon('sidebar')}${c.icon('home')}${c.icon('users')}</div>
          <div class="v-point-ed-main">
            ${c.editorTop({ title: `${page.title}<span class="v-point-chipwrap">
              <span data-for="current"><span class="v-point-chip"><i></i>Opens at <span data-handle-url></span></span></span>
              <span data-for="send"><button class="${c.btn('outline', 'sm')}" data-chip>${c.icon('at')}Send <span data-handle-url></span> here</button>
                <div class="v-point-pop" data-pop ${popOpen ? '' : 'hidden'}>
                  <b>Send <span data-handle-url></span> here?</b>
                  <p><span data-prev-title>${pod.title}</span> stops opening there. Its own link keeps working.</p>
                  <div class="v-point-pop-btns"><button class="${c.btn('outline', 'sm')}" data-pop-cancel>Cancel</button><button class="${c.btn('default', 'sm')}" data-pop-ok>Send it here</button></div>
                </div></span>
              <span data-for="draft"><button class="${c.btn('outline', 'sm')}" disabled>${c.icon('at')}Send <span data-handle-url></span> here</button><span class="v-point-chip-hint">Publish this page first.</span></span>
            </span>` })}
            <div class="v-point-canvas"><div class="v-point-page"><h1>${page.title}</h1><div class="v-point-video"></div></div></div>
          </div>
        </div>`;
      return `<div class="v-point-stack v-point-root">${strip(pod, 'current')}${strip(webinar, 'send', true)}${strip(draft, 'draft')}</div>`;
    },
    mount: (root, c) => {
      fill(root, c);
      const strips = [...root.querySelectorAll('.v-point-ed')];
      const titleOf = (strip) => strip.querySelector('.v-point-page h1').textContent;
      root.querySelectorAll('[data-chip]').forEach((button) => button.addEventListener('click', () => {
        const pop = button.parentElement.querySelector('[data-pop]');
        pop.hidden = !pop.hidden;
      }));
      root.querySelectorAll('[data-pop-cancel]').forEach((button) => button.addEventListener('click', () => { button.closest('[data-pop]').hidden = true; }));
      root.querySelectorAll('[data-pop-ok]').forEach((button) => button.addEventListener('click', () => {
        const strip = button.closest('.v-point-ed');
        button.closest('[data-pop]').hidden = true;
        strips.forEach((other) => { if (other.dataset.state === 'current') other.dataset.state = 'send'; });
        strip.dataset.state = 'current';
        root.querySelectorAll('[data-prev-title]').forEach((node) => { node.textContent = titleOf(strip); });
      }));
    },
  });

  // D. Schedule: the address keeps a list of which page opens from which date.
  PG.variant({
    surface: 'point',
    key: 'D',
    name: 'Schedule',
    idea: 'Todd already knows the webinar page should take over on Monday. The address keeps a schedule of which page opens from which date, so he sets it once instead of remembering to swap. A scheduled page that goes offline is flagged in the list.',
    width: 1200,
    render: (c) => {
      const [pod, acme, webinar, draft] = c.pages;
      const remove = `<button class="${c.btn('ghost', 'icon-sm')}" aria-label="Remove">${c.icon('x')}</button>`;
      return c.settings({
        tab: 'Address',
        extraTab: { label: 'Address', icon: 'at', index: 1 },
        body: `<section class="app-card v-point-root"><div class="app-card-body">
            <h3 class="app-card-title">Your address</h3>
            <p class="app-card-desc"><b data-handle-url></b>. Say it: <span data-handle-say></span>.</p>
            <div class="app-field"><span class="app-label">What it opens</span>
              <div class="v-point-sched">
                <div class="v-point-srow" data-tone="now"><span class="v-point-swhen">Now</span><span class="v-point-swhat"><b>${pod.title}</b><small>Live. ${pod.viaHandle} visits came through the address.</small></span><button class="${c.btn('ghost', 'sm')}">Change</button></div>
                <div class="v-point-srow"><span class="v-point-swhen">Mon 2 Nov</span><span class="v-point-swhat"><b>${webinar.title}</b><small>${pod.title} stops opening at the address that day. Its own link keeps working.</small></span>${remove}</div>
                <div class="v-point-srow" data-tone="warn"><span class="v-point-swhen">Mon 16 Nov</span><span class="v-point-swhat"><b>${draft.title}</b><small>${c.icon('alert')}<span>Not live right now. Publish it before 16 Nov, or that day the address shows a page with your name saying the page is offline.</span></small></span>${remove}</div>
              </div>
              <span class="app-hint">Only live pages can be scheduled. Changes happen at midnight in your time zone.</span>
            </div>
            <button class="${c.btn('dashed')} v-point-add" data-add>${c.icon('plus')}Add a change</button>
            <div class="v-point-addrow" data-addrow hidden>
              <span class="app-label">From</span><input class="app-input" type="date" value="2026-11-30">
              <span class="app-label">open</span><span class="app-select">${acme.title} ${c.icon('chevron-down')}</span>
              <button class="${c.btn('default')}">Add</button>
            </div>
          </div></section>`,
      });
    },
    mount: (root, c) => {
      fill(root, c);
      const row = root.querySelector('[data-addrow]');
      root.querySelector('[data-add]').addEventListener('click', () => { row.hidden = !row.hidden; });
    },
  });

  // ======================================================================
  // share: the share dialog
  // ======================================================================

  const head = (c) => `<h2 class="app-dialog-title">Share</h2><span class="app-dialog-x">${c.icon('x')}</span>`;
  const urlRow = (c, text, { copy = true, muted = false, note = '' } = {}) => `<div class="app-url ${muted ? 'v-share-url--muted' : ''}"><span>${text}</span>${note ? `<span class="v-share-url-note">${note}</span>` : ''}${copy ? c.icon('copy') : ''}</div>`;
  const accessRows = (c) => `<div class="app-row"><span class="app-row-label">${c.icon('globe')}Who can open it</span><span class="app-select">Anyone with the link ${c.icon('chevron-down')}</span></div>
    <div class="app-row"><span class="app-row-label">${c.icon('lock')}Password protected</span><span class="app-switch"></span></div>`;
  const band = (word, small, tone = 'live') => `<div class="app-live" data-tone="${tone}"><b>${word}</b><small>${small}</small></div>`;
  const primary = (c, label) => `<button class="${c.btn('default', 'lg')} app-wide">${c.icon('copy')}${label}</button>`;
  const confirm = (c, prev) => `<div class="v-share-confirm" data-confirm hidden>
      <b>Send <span data-handle-url></span> here?</b>
      <p>${prev.title} stops opening there. Its own link, clarity.video/page/${prev.share}, keeps working.</p>
      <div class="v-share-confirm-btns"><button class="${c.btn('outline')}" data-confirm-cancel>Cancel</button><button class="${c.btn('default')}" data-confirm-ok>Send it here</button></div>
    </div>`;
  // Two dialogs over one dimmed Home, each with a caption. `mine` says whether the address opens that page.
  const pair = (c, items, { width = 420 } = {}) => `<div class="v-share-root v-share-pair"><div class="app-dim">${c.home()}</div><div class="v-share-layer">
      ${items.map((item) => `<div class="v-share-col" style="width:${item.width ?? width}px"><div class="v-share-cap">${item.cap}</div><div class="app-dialog" data-mine="${item.mine}" ${item.attrs ?? ''}>${item.body}</div></div>`).join('')}
    </div></div>`;
  const CAP_MINE = 'The page <span data-handle-url></span> opens';
  const CAP_OTHER = 'Any other page';
  function wireShare(root, c) {
    fill(root, c);
    root.querySelectorAll('[data-send]').forEach((button) => button.addEventListener('click', () => {
      const scope = button.closest('[data-when="other"]') ?? button.closest('.app-dialog');
      const box = scope.querySelector('[data-confirm]');
      if (box) box.hidden = false;
    }));
    root.querySelectorAll('[data-confirm-cancel]').forEach((button) => button.addEventListener('click', () => { button.closest('[data-confirm]').hidden = true; }));
    root.querySelectorAll('[data-confirm-ok]').forEach((button) => button.addEventListener('click', () => { button.closest('.app-dialog').dataset.mine = 'true'; }));
    root.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => {
      const dialog = button.closest('.app-dialog');
      dialog.dataset.tab = button.dataset.tab;
      dialog.querySelectorAll('[data-tab]').forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
    }));
  }

  // A. Two labelled addresses.
  PG.variant({
    surface: 'share',
    key: 'A',
    name: 'Two labelled addresses',
    idea: 'Two addresses, two labels. The page link is for one person and the address is for everyone; both sit at the top with their job written above them, so Todd copies the right one. On other pages the second row says where the address goes instead.',
    width: 920,
    render: (c) => {
      const [pod, , webinar] = c.pages;
      const body = (page) => `${head(c)}
        <div class="v-share-block"><span class="v-share-lab">${c.icon('user')}For one person</span>${urlRow(c, `clarity.video/page/${page.share}`)}<span class="app-hint">This page's own link. Send it to the person it was made for.</span></div>
        <div class="v-share-block"><span class="v-share-lab">${c.icon('mic')}For everyone</span>
          <div data-when="mine" class="v-share-tight">${urlRow(c, '<span data-handle-url></span>')}<span class="app-hint">Say it: <span data-handle-say></span>. Visits through it are counted on their own.</span></div>
          <div data-when="other" class="v-share-tight">${urlRow(c, '<span data-handle-url></span>', { copy: false, muted: true, note: `opens ${pod.title}` })}<span class="app-hint"><button class="${c.btn('link', 'inline')}" data-send>Send it here instead</button></span>${confirm(c, pod)}</div>
        </div>
        ${accessRows(c)}
        ${band('Live', `Published ${page.updated}.`)}
        ${primary(c, "Copy this page's link")}`;
      return pair(c, [
        { cap: CAP_MINE, mine: true, body: body(pod) },
        { cap: CAP_OTHER, mine: false, body: body(webinar) },
      ]);
    },
    mount: wireShare,
  });

  // B. One person or everyone: a segmented switch, one address at a time.
  PG.variant({
    surface: 'share',
    key: 'B',
    name: 'One person or everyone',
    idea: 'The dialog has two modes, one person or everyone, and shows one address at a time. Today\'s dialog is the first mode and does not change; the second holds the address, its spoken form and the swap. Both shown in the Everyone mode.',
    width: 920,
    render: (c) => {
      const [pod, , webinar] = c.pages;
      const body = (page) => `${head(c)}
        <div class="v-share-seg" role="radiogroup" aria-label="Who this is for"><button role="radio" aria-pressed="false" data-tab="one">${c.icon('user')}One person</button><button role="radio" aria-pressed="true" data-tab="all">${c.icon('mic')}Everyone</button></div>
        <div class="v-share-pane" data-pane="one">
          ${urlRow(c, `clarity.video/page/${page.share}`)}
          ${accessRows(c)}
          ${band('Live', `Published ${page.updated}.`)}
          ${primary(c, 'Copy link')}
        </div>
        <div class="v-share-pane" data-pane="all">
          <div data-when="mine">
            ${urlRow(c, '<span data-handle-url></span>')}
            <span class="app-hint v-share-pull">Say it: <span data-handle-say></span>.</span>
            ${band('Opens this page', `${page.viaHandle || 118} visits came through the address.`)}
            ${primary(c, 'Copy address')}
          </div>
          <div data-when="other">
            ${urlRow(c, '<span data-handle-url></span>', { copy: false, muted: true })}
            ${band(`Opens ${pod.title}`, 'Not this page.', 'off')}
            <button class="${c.btn('outline')} app-wide" data-send>${c.icon('at')}Send <span data-handle-url></span> here</button>
            ${confirm(c, pod)}
          </div>
        </div>`;
      return pair(c, [
        { cap: CAP_MINE, mine: true, body: body(pod), attrs: 'data-tab="all"' },
        { cap: CAP_OTHER, mine: false, body: body(webinar), attrs: 'data-tab="all"' },
      ]);
    },
    mount: wireShare,
  });

  // C. Footnote and row: ordinary pages keep today's dialog plus a footnote; the handle page gains a row.
  PG.variant({
    surface: 'share',
    key: 'C',
    name: 'Footnote and row',
    idea: 'Other pages keep today\'s dialog plus one footnote. Only the page the address opens gains the address row, under the page link and in a different colour, so the two links never sit as equals. The footnote\'s link swaps in place.',
    width: 920,
    render: (c) => {
      const [pod, , webinar] = c.pages;
      const body = (page) => `${head(c)}
        ${urlRow(c, `clarity.video/page/${page.share}`)}
        <div data-when="mine"><div class="v-share-handle">${c.icon('mic')}<span class="v-share-handle-text"><b data-handle-url></b><small>For everyone. Say it: <span data-handle-say></span>.</small></span>${c.icon('copy')}</div></div>
        ${accessRows(c)}
        <div data-when="mine">${band('Live', `Published ${page.updated}. Opens at <span data-handle-url></span>.`)}</div>
        <div data-when="other">${band('Live', `Published ${page.updated}.`)}</div>
        ${primary(c, 'Copy link')}
        <div data-when="other" class="v-share-tight"><span class="app-hint"><span data-handle-url></span> opens ${pod.title}. <button class="${c.btn('link', 'inline')}" data-send>Send it here instead</button></span>${confirm(c, pod)}</div>`;
      return pair(c, [
        { cap: CAP_MINE, mine: true, body: body(pod) },
        { cap: CAP_OTHER, mine: false, body: body(webinar) },
      ]);
    },
    mount: wireShare,
  });

  // D. Say it panel: the spoken line, a QR code and a show-notes line beside the usual dialog.
  PG.variant({
    surface: 'share',
    key: 'D',
    name: 'Say it panel',
    idea: 'The address is for the ear, so its panel gives the forms it takes in the world: the spoken line, a QR code for slides and cards, and a line to paste into show notes. The page link stays in its usual place on the left.',
    width: 920,
    render: (c) => {
      const [pod, , webinar] = c.pages;
      const body = (page) => `${head(c)}
        <div class="v-share-cols">
          <div class="v-share-main">
            <div class="v-share-block"><span class="v-share-lab">${c.icon('user')}This page's link, for one person</span>${urlRow(c, `clarity.video/page/${page.share}`)}</div>
            ${accessRows(c)}
            ${band('Live', `Published ${page.updated}.`)}
            ${primary(c, 'Copy link')}
          </div>
          <aside class="v-share-say">
            <span class="v-share-lab">${c.icon('mic')}Say it on air</span>
            <div data-when="mine" class="v-share-say-body">
              <b class="v-share-say-url" data-handle-url></b>
              <span class="v-share-say-spoken" data-handle-say></span>
              <div class="v-share-qr" data-qr></div>
              <span class="v-share-lab">For show notes</span>
              <div class="app-url v-share-url--sm"><span>Start here: <span data-handle-url></span></span>${c.icon('copy')}</div>
            </div>
            <div data-when="other" class="v-share-say-body">
              <p class="v-share-say-p"><span data-handle-url></span> opens ${pod.title}, not this page.</p>
              <button class="${c.btn('outline', 'sm')}" data-send>${c.icon('at')}Send it here instead</button>
              ${confirm(c, pod)}
            </div>
          </aside>
        </div>`;
      return pair(c, [
        { cap: CAP_MINE, mine: true, body: body(pod), width: 680 },
        { cap: CAP_OTHER, mine: false, body: body(webinar), width: 680 },
      ]);
    },
    mount: (root, c) => {
      wireShare(root, c);
      const paint = () => root.querySelectorAll('[data-qr]').forEach((node) => { node.innerHTML = qr(url(c)); });
      c.onHandle(paint);
      paint();
    },
  });

  // A drawn stand-in for a QR code: finder patterns, timing lines and modules seeded by the text. Not scannable.
  function qr(text) {
    const n = 25;
    let seed = 7;
    for (const ch of text) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
    const inFinder = (x, y, i, j) => i >= x && i < x + 7 && j >= y && j < y + 7;
    const finderDark = (x, y, i, j) => { const a = i - x; const b = j - y; return a === 0 || a === 6 || b === 0 || b === 6 || (a >= 2 && a <= 4 && b >= 2 && b <= 4); };
    const finders = [[0, 0], [n - 7, 0], [0, n - 7]];
    let rects = '';
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        const finder = finders.find(([x, y]) => inFinder(x, y, i, j));
        let dark;
        if (finder) dark = finderDark(finder[0], finder[1], i, j);
        else if ((i === 7 || i === n - 8) && j < 8) dark = false;
        else if ((j === 7) && (i < 8 || i > n - 9)) dark = false;
        else if (i === 7 && j > n - 9) dark = false;
        else if (j === n - 8 && i < 8) dark = false;
        else if (j === 6) dark = i % 2 === 0;
        else if (i === 6) dark = j % 2 === 0;
        else dark = rnd() < 0.46;
        if (dark) rects += `<rect x="${i}" y="${j}" width="1" height="1"/>`;
      }
    }
    return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">${rects}</svg>`;
  }

  PG.css(`
    .v-point-root [hidden], .v-share-root [hidden] { display: none !important; }

    /* point A: settings picker */
    .v-point-list { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: var(--card); }
    .v-point-opt { display: flex; align-items: center; gap: 12px; min-height: 46px; padding: 8px 12px; border-top: 1px solid var(--border); cursor: pointer; }
    .v-point-opt:first-child { border-top: 0; }
    .v-point-opt[aria-checked="true"] { background: var(--accent); }
    .v-point-opt[aria-disabled="true"] { cursor: default; color: var(--muted-foreground); }
    .v-point-radio { width: 16px; height: 16px; border-radius: 99px; border: 1.5px solid oklch(0.75 0.02 260); background: var(--card); flex: none; display: grid; place-items: center; }
    .v-point-opt[aria-checked="true"] .v-point-radio { border-color: var(--primary); }
    .v-point-opt[aria-checked="true"] .v-point-radio::after { content: ""; width: 8px; height: 8px; border-radius: 99px; background: var(--primary); }
    .v-point-opt[aria-disabled="true"] .v-point-radio { background: var(--muted); }
    .v-point-opt-name { font-weight: 500; flex: 1; }
    .v-point-opt-meta { font-size: 12.5px; color: var(--muted-foreground); white-space: nowrap; }
    .v-point-note { margin: 0; font-size: 13px; line-height: 1.45; color: var(--muted-foreground); padding: 10px 12px; border-radius: 10px; background: var(--muted); }
    .v-point-note[data-tone="change"] { background: var(--pending-muted); color: var(--pending-foreground); }

    /* point B: home card marker and menu */
    .v-point-card { position: relative; }
    .v-point-card[data-open="true"] { z-index: 5; }
    .v-point-dots { position: absolute; top: 8px; right: 8px; background: var(--card); box-shadow: 0 1px 2px oklch(0 0 0 / 0.1); }
    .v-point-card .app-page-meta > span { display: inline-flex; align-items: center; gap: 4px; }
    .v-point-mark { display: flex; align-items: center; gap: 5px; margin: 0 4px 3px; font-size: 12.5px; font-weight: 500; color: var(--primary); }
    .v-point-mark svg { width: 14px; height: 14px; }
    .v-point-menu { position: absolute; top: 46px; right: 8px; width: 256px; background: var(--card); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 12px 32px oklch(0 0 0 / 0.14); padding: 4px; display: grid; gap: 1px; z-index: 6; text-align: left; font-size: 13.5px; }
    .v-point-mi { display: flex; align-items: flex-start; gap: 8px; padding: 6px 8px; border-radius: 6px; line-height: 1.3; }
    .v-point-mi > svg { width: 14px; height: 14px; margin-top: 2px; color: var(--muted-foreground); flex: none; }
    .v-point-mi > span { flex: 1; }
    .v-point-mi small { display: block; font-size: 11.5px; color: var(--muted-foreground); margin-top: 1px; line-height: 1.3; }
    .v-point-mi[data-hot] { background: var(--accent); }
    .v-point-mi[aria-disabled="true"] { opacity: 0.55; }
    .v-point-mi--danger, .v-point-mi--danger > svg { color: var(--destructive); }
    .v-point-mi-end { margin-left: auto; }
    .v-point-sep { height: 1px; background: var(--border); margin: 3px 0; }
    .v-point-undo { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 10px; background: var(--muted); margin: -6px 0 18px; font-size: 13.5px; }
    .v-point-undo > span { flex: 1; }

    /* point C: editor chip */
    .v-point-stack { display: grid; gap: 14px; padding: 14px; background: oklch(0.93 0.008 255); }
    .v-point-ed { display: grid; grid-template-columns: 64px 1fr; background: var(--background); border-radius: 10px; overflow: hidden; border: 1px solid var(--border); }
    .v-point-ed-main { min-width: 0; }
    .v-point-rail { background: var(--sidebar); border-right: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 12px 0; color: var(--primary); }
    .v-point-rail > svg { width: 30px; height: 30px; }
    .v-point-rail > svg.app-icon { width: 16px; height: 16px; color: var(--muted-foreground); }
    .v-point-ed .app-editor-top { position: relative; z-index: 6; }
    .v-point-chipwrap { display: inline-flex; align-items: center; vertical-align: middle; margin-left: 12px; position: relative; font-weight: 500; font-size: 13px; }
    .v-point-chipwrap [data-for] { display: none; position: relative; }
    .v-point-ed[data-state="current"] [data-for="current"], .v-point-ed[data-state="send"] [data-for="send"], .v-point-ed[data-state="draft"] [data-for="draft"] { display: inline-flex; align-items: center; gap: 8px; }
    .v-point-chip { display: inline-flex; align-items: center; gap: 7px; height: 28px; padding: 0 11px; border-radius: 99px; background: oklch(0.95 0.035 165); color: oklch(0.42 0.12 163); font-size: 12.5px; font-weight: 500; white-space: nowrap; }
    .v-point-chip i { width: 7px; height: 7px; border-radius: 99px; background: var(--success); }
    .v-point-chip-hint { font-size: 12px; color: var(--muted-foreground); font-weight: 400; white-space: nowrap; }
    .v-point-pop { position: absolute; top: calc(100% + 8px); left: 0; width: 340px; background: var(--card); border-radius: 12px; box-shadow: 0 18px 48px oklch(0 0 0 / 0.18), 0 0 0 1px oklch(0 0 0 / 0.05); padding: 14px 16px; display: grid; gap: 8px; font-size: 13.5px; font-weight: 400; line-height: 1.45; text-align: left; white-space: normal; }
    .v-point-pop b { font-weight: 600; font-size: 14px; }
    .v-point-pop p { margin: 0; color: var(--muted-foreground); }
    .v-point-pop-btns { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
    .v-point-canvas { height: 168px; overflow: hidden; display: flex; justify-content: center; padding-top: 24px; }
    .v-point-page { width: 720px; }
    .v-point-page h1 { font-size: 28px; margin: 0 0 14px; letter-spacing: -0.02em; line-height: 1.2; }
    .v-point-video { height: 200px; border-radius: 12px; background: var(--primary); opacity: 0.9; }

    /* point D: schedule */
    .v-point-sched { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: var(--card); }
    .v-point-srow { display: grid; grid-template-columns: 96px 1fr auto; align-items: center; gap: 12px; padding: 10px 12px; border-top: 1px solid var(--border); }
    .v-point-srow:first-child { border-top: 0; }
    .v-point-swhen { font-size: 12.5px; font-weight: 600; color: var(--muted-foreground); }
    .v-point-srow[data-tone="now"] .v-point-swhen { color: oklch(0.5 0.13 163); }
    .v-point-swhat { display: grid; gap: 2px; min-width: 0; }
    .v-point-swhat b { font-weight: 500; }
    .v-point-swhat small { font-size: 12.5px; color: var(--muted-foreground); line-height: 1.35; }
    .v-point-srow[data-tone="warn"] { background: var(--pending-muted); }
    .v-point-srow[data-tone="warn"] small { color: var(--pending-foreground); display: flex; gap: 6px; align-items: flex-start; }
    .v-point-srow[data-tone="warn"] small svg { width: 14px; height: 14px; flex: none; margin-top: 2px; }
    .v-point-add { justify-self: start; }
    .v-point-addrow { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .v-point-addrow .app-input { width: 150px; }

    /* share: shared pieces */
    .v-share-pair { position: relative; }
    .v-share-pair > .app-dim { position: absolute; inset: 0; overflow: hidden; }
    .v-share-layer { position: relative; z-index: 2; display: flex; justify-content: center; align-items: flex-start; gap: 24px; padding: 32px 24px 44px; flex-wrap: wrap; }
    .v-share-col { display: grid; gap: 8px; }
    .v-share-cap { justify-self: start; color: white; font-size: 13px; font-weight: 500; background: oklch(0 0 0 / 0.45); padding: 4px 10px; border-radius: 8px; }
    .v-share-root .app-dialog { width: 100%; }
    .v-share-block { display: grid; gap: 6px; }
    .v-share-lab { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 500; color: var(--muted-foreground); }
    .v-share-lab svg { width: 14px; height: 14px; }
    .v-share-url--muted > span:first-child { text-decoration: none; color: var(--muted-foreground); flex: none; }
    .v-share-url-note { flex: 1; min-width: 0; font-size: 12.5px; color: var(--muted-foreground); text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .v-share-root [data-when] { display: grid; gap: 16px; }
    .v-share-root [data-when].v-share-tight { gap: 6px; }
    .app-dialog[data-mine="true"] [data-when="other"], .app-dialog[data-mine="false"] [data-when="mine"] { display: none !important; }
    .v-share-confirm { display: grid; gap: 6px; border: 1px solid var(--border); border-radius: 12px; background: var(--muted); padding: 12px 14px 14px; font-size: 13.5px; margin-top: 6px; }
    .v-share-confirm b { font-weight: 600; }
    .v-share-confirm p { margin: 0; color: var(--muted-foreground); line-height: 1.45; }
    .v-share-confirm-btns { display: flex; gap: 8px; margin-top: 4px; }
    .v-share-confirm-btns > button { flex: 1; }
    .v-share-root .app-live[data-tone="off"] { background: var(--muted); }
    .v-share-root .app-live[data-tone="off"]::before { background: var(--muted-foreground); box-shadow: none; }
    .v-share-root .app-live[data-tone="off"] b { color: var(--foreground); }
    .v-share-pull { margin-top: -10px; }

    /* share B: segmented */
    .v-share-seg { display: grid; grid-template-columns: 1fr 1fr; background: var(--muted); border-radius: 10px; padding: 3px; gap: 2px; }
    .v-share-seg > button { appearance: none; border: 0; background: transparent; height: 32px; border-radius: 8px; font: inherit; font-size: 13.5px; font-weight: 500; color: var(--muted-foreground); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; }
    .v-share-seg > button svg { width: 15px; height: 15px; }
    .v-share-seg > button[aria-pressed="true"] { background: var(--card); color: var(--foreground); box-shadow: 0 1px 2px oklch(0 0 0 / 0.08), 0 0 0 1px oklch(0 0 0 / 0.04); }
    .v-share-pane { display: grid; gap: 16px; }
    .app-dialog[data-tab="one"] [data-pane="all"], .app-dialog[data-tab="all"] [data-pane="one"] { display: none !important; }

    /* share C: handle row */
    .v-share-handle { display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 8px 12px; border-radius: 10px; background: oklch(0.94 0.04 262); color: oklch(0.45 0.2 263); }
    .v-share-handle > svg { width: 18px; height: 18px; flex: none; }
    .v-share-handle-text { flex: 1; min-width: 0; display: grid; gap: 1px; }
    .v-share-handle-text b { font-weight: 600; font-size: 14.5px; color: var(--foreground); }
    .v-share-handle-text small { font-size: 12px; color: var(--muted-foreground); }

    /* share D: say it panel */
    .v-share-cols { display: grid; grid-template-columns: 1fr 236px; gap: 22px; }
    .v-share-main { display: grid; gap: 16px; }
    .v-share-say { border-left: 1px solid var(--border); padding-left: 22px; display: grid; gap: 10px; align-content: start; }
    .v-share-root .v-share-say-body { gap: 8px; }
    .v-share-say-url { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; word-break: break-all; }
    .v-share-say-spoken { font-size: 13px; color: var(--muted-foreground); }
    .v-share-qr { width: 132px; height: 132px; padding: 8px; border: 1px solid var(--border); border-radius: 8px; background: white; color: var(--foreground); margin: 4px 0 6px; }
    .v-share-qr svg { width: 100%; height: 100%; display: block; }
    .v-share-url--sm { height: 38px; font-size: 13px; }
    .v-share-say-p { margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--muted-foreground); }
    .v-share-say button[data-send] { justify-self: start; }
  `);
})();
