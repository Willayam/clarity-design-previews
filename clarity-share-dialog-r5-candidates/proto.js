// One state record and one reducer drive every candidate; only render() differs.
// state: { stage, password, pw, publishedAgo, copied, confirm, busy, menu, preset }
// stage: 'draft' | 'published' | 'changes' | 'unpublished'
// ?plant=<name> renders a known violation so verify.mjs can prove it goes red.
(function () {
  const BTN = window.BTN;
  const PLANT = new URLSearchParams(location.search).get('plant') || '';
  const URL_SHOWN = 'clarity.video/page/example';
  const URL_FULL = 'https://clarity.video/page/example';
  const SWITCH = 'peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[size=default]:h-[18.4px] data-[size=default]:w-[32px] data-checked:bg-primary data-unchecked:bg-input data-disabled:cursor-not-allowed data-disabled:opacity-50';
  const THUMB = 'pointer-events-none block rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=default]/switch:data-unchecked:translate-x-0';
  const INPUT = 'w-full min-w-0 rounded-lg border transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 h-10 border-input bg-transparent px-2.5 py-1 text-base md:text-sm';

  const PRESETS = [
    ['draft', 'Never published', { stage: 'draft', password: false }],
    ['published', 'Live, no changes', { stage: 'published', password: false }],
    ['changes', 'Live with changes', { stage: 'changes', password: false }],
    ['unpublished', 'Turned off', { stage: 'unpublished', password: false }],
    ['password', 'Password on', { stage: 'published', password: true, pw: 'acme-2026' }],
  ];
  const BLANK = { stage: 'draft', password: false, pw: '', publishedAgo: '2h ago', copied: false, confirm: false, busy: null, menu: null, preset: 'draft' };

  function presetState(key) {
    const found = PRESETS.find((p) => p[0] === key) || PRESETS[0];
    return { ...BLANK, ...found[2], preset: found[0] };
  }
  const live = (s) => s.stage === 'published' || s.stage === 'changes';

  function reduce(s, act, arg) {
    switch (act) {
      case 'preset': return presetState(arg);
      case 'publish': return s.stage === 'published' ? { ...s, menu: null } : { ...s, busy: 'publish', confirm: false, menu: null };
      case 'publish-done': return { ...s, busy: null, stage: 'published', publishedAgo: 'just now' };
      case 'ask-off': return live(s) ? { ...s, confirm: true, menu: null } : s;
      case 'cancel-off': return { ...s, confirm: false };
      case 'off': return { ...s, busy: 'off', confirm: false };
      case 'off-done': return { ...s, busy: null, stage: 'unpublished', confirm: false };
      case 'copy': return live(s) ? { ...s, copied: true, menu: null } : s;
      case 'uncopy': return { ...s, copied: false };
      case 'password': return { ...s, password: !s.password, menu: null };
      case 'password-on': return { ...s, password: true, menu: null, busy: live(s) ? s.busy : 'publish' };
      case 'pw': return { ...s, pw: arg };
      case 'menu': return { ...s, menu: s.menu === arg ? null : arg };
      case 'close-menu': return s.menu ? { ...s, menu: null } : s;
      case 'done': return { ...s, menu: null };
      default: return s;
    }
  }

  // The band's word and tone. tone drives colour: live = green, changes = amber, off = grey.
  function status(s) {
    return {
      draft: { tone: 'off', word: 'Not published', text: 'Nothing is published yet.' },
      published: { tone: 'live', word: 'Live', text: 'Up to date.' },
      changes: { tone: 'changes', word: 'Live', text: `Visitors see the version from ${s.publishedAgo}.` },
      unpublished: { tone: 'off', word: 'Off', text: 'The link no longer opens.' },
    }[s.stage];
  }
  // Who can open the page, in one line. Used by the access row or the band.
  function whoText(s) {
    if (live(s)) return s.password ? 'Anyone with the link and the password can open it.' : 'Anyone with the link can open it.';
    return s.stage === 'draft' ? 'Nobody can open it until you publish.' : 'The link is off. Publish to bring it back.';
  }
  const PRIMARY = { draft: 'Publish', published: 'Copy link', changes: 'Publish changes', unpublished: 'Publish' };

  const icon = (name, cls) => `<svg class="${cls || 'size-4'}" data-icon="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${window.ICONS[name]}</svg>`;
  const variantOf = (kind) => kind.replace(/(Lg|Sm|Icon|IconSm|Inline)$/, '').replace(/^primary$/, 'default');
  const btn = (kind, act, label, extra) => `<button type="button" data-slot="button" data-button-variant="${variantOf(kind)}" class="${BTN[kind]}${extra && extra.cls ? ' ' + extra.cls : ''}" data-act="${act}"${extra && extra.arg !== undefined ? ` data-arg="${extra.arg}"` : ''}${extra && extra.disabled ? ' disabled' : ''}${extra && extra.attrs ? ' ' + extra.attrs : ''}>${label}</button>`;
  const busyIcon = (s, kind, name) => (s.busy === kind ? icon('loader-circle', 'size-4 spin') : icon(name));
  const dot = (tone) => `<span class="d-dot d-dot--${tone}"></span>`;
  const copyBtn = (s, extra) => {
    const copyLabel = s.copied ? 'Link copied' : 'Copy link';
    return `<span class="v-copy-wrap">${btn('ghostIcon', 'copy', s.copied ? icon('check') : icon('copy'), { ...(extra || {}), attrs: `aria-label="${copyLabel}" title="${copyLabel}"` })}${s.copied ? '<span class="v-tip" role="status">Copied</span>' : ''}</span>`;
  };

  // The link row: the URL is itself the link (underlined) plus one copy icon.
  // ?plant=arrow-copy adds the open arrow beside the copy icon to prove verify goes red.
  function linkRow(s) {
    const open = `<a class="${BTN.ghostIcon} d-chip-open" data-button-variant="ghost" href="${URL_FULL}" target="_blank" rel="noreferrer" aria-label="Open in new tab" title="Open in new tab">${icon('arrow-up-right')}</a>`;
    if (!live(s)) {
      return `<div class="d-chip d-chip--off"><span class="d-chip-inert" aria-label="Journey Page share link"><span class="mono">${URL_SHOWN}</span></span>${copyBtn(s, { disabled: true })}</div>`;
    }
    return `<div class="d-chip"><a class="d-chip-url" href="${URL_FULL}" target="_blank" rel="noreferrer" aria-label="Open this Journey Page in a new tab"><span class="mono">${URL_SHOWN}</span></a>${PLANT === 'arrow-copy' ? open : ''}${copyBtn(s)}</div>`;
  }
  const pwInput = (s) => `<input class="${INPUT} d-pw" aria-label="Page password" placeholder="Set a password" data-act="pw" value="${s.pw}">`;
  function switchRow(s, id) {
    return `<div class="d-row">
      <label class="d-label" for="${id}">${icon('lock')}Password protected</label>
      <button type="button" role="switch" id="${id}" aria-checked="${s.password}" data-act="password" data-size="default" data-${s.password ? 'checked' : 'unchecked'} class="${SWITCH}"><span data-${s.password ? 'checked' : 'unchecked'} class="${THUMB}"></span></button>
    </div>${s.password ? pwInput(s) : ''}`;
  }
  function offConfirm(s) {
    return `<div class="d-confirm" role="group" aria-label="Turn the link off?">
      <p><strong>Turn the link off?</strong></p>
      <p class="d-muted">The link stops working for everyone you sent it to. Publish turns the same link back on.</p>
      <div class="d-footer">${btn('outlineSm', 'cancel-off', 'Cancel')}${btn('dangerSm', 'off', `${s.busy === 'off' ? icon('loader-circle', 'size-3.5 spin') : ''}Turn off`)}</div>
    </div>`;
  }

  // Menus imitate the app's DropdownMenu. Items are plain neutral rows.
  const item = (act, label, name, extra) => `<button type="button" role="${(extra && extra.role) || 'menuitem'}" class="f-item${PLANT === 'red' && act === 'ask-off' ? ' text-destructive' : ''}" data-act="${act}"${extra && extra.arg !== undefined ? ` data-arg="${extra.arg}"` : ''}${extra && extra.checked !== undefined ? ` aria-checked="${extra.checked}"` : ''}>${icon(name)}<span class="f-item-body"><span>${label}</span>${extra && extra.sub ? `<span class="f-item-sub">${extra.sub}</span>` : ''}</span>${extra && extra.checked ? icon('check', 'size-4 f-check') : ''}</button>`;
  const openItem = () => `<a class="f-item" role="menuitem" href="${URL_FULL}" target="_blank" rel="noreferrer">${icon('arrow-up-right')}<span>Open in new tab</span></a>`;
  function menu(s, key, trigger, direction, items, wrapCls) {
    const plantOpen = PLANT === 'open-in-menu' ? openItem() : '';
    return `<span class="f-menu-wrap${wrapCls ? ' ' + wrapCls : ''}">${trigger}${s.menu === key ? `<div class="f-menu f-menu--${direction}" role="menu" data-menu>${items.join('')}${plantOpen}</div>` : ''}</span>`;
  }

  // The access choice. Two options, or three when the password folds in.
  const WORDS = { on: 'Anyone with the link', off: 'No one', pw: 'Anyone with the password' };
  const accessWord = (s, withPw) => (live(s) ? (withPw && s.password ? WORDS.pw : WORDS.on) : WORDS.off);
  function accessItems(s, withPw) {
    const isLive = live(s);
    const anyoneChecked = isLive && !(withPw && s.password);
    const items = [
      item(isLive ? (withPw && s.password ? 'password' : 'close-menu') : 'publish', WORDS.on, 'globe', { role: 'menuitemradio', checked: anyoneChecked, sub: 'Anyone on the internet with the link can open it' }),
    ];
    if (withPw) items.push(item(s.password ? 'close-menu' : 'password-on', WORDS.pw, 'key-round', { role: 'menuitemradio', checked: isLive && s.password, sub: 'They need the link and a password you set' }));
    items.push(item(isLive ? 'ask-off' : 'close-menu', WORDS.off, 'lock', { role: 'menuitemradio', checked: !isLive, sub: isLive ? 'The link stops working for everyone' : 'The link is off' }));
    return items;
  }
  const textSelect = (s, key, label, cls) => `<button type="button" class="g-text-select${cls ? ' ' + cls : ''}" data-act="menu" data-arg="${key}" aria-haspopup="menu" aria-expanded="${s.menu === key}"><span class="f-select-text">${label}</span>${icon('chevron-down')}</button>`;
  const accessSelect = (s, key, withPw, direction) => menu(s, key, textSelect(s, key, accessWord(s, withPw)), direction || 'select', accessItems(s, withPw), 'f-menu-wrap--grow');

  // Footer: band left, one primary right. The confirm replaces the whole footer.
  function band(s, opts) {
    const st = status(s);
    const o = opts || {};
    const head = o.head ? o.head(s, st) : `<span class="v-status-word">${st.word}</span>`;
    return `<div class="f-band" data-tone="${st.tone}" role="${o.head ? 'group' : 'status'}">${dot(st.tone)}<div class="f-band-body"><p class="f-band-head">${head}</p><p class="f-band-text">${o.text ? o.text(s, st) : st.text}</p></div></div>`;
  }
  function primary(s) {
    if (s.stage === 'published' && PLANT !== 'primary') {
      return btn('primaryLg', 'copy', `${s.copied ? icon('check') : icon('copy')}${s.copied ? 'Copied' : 'Copy link'}`, { cls: 'f-primary', attrs: `aria-label="${s.copied ? 'Link copied' : 'Copy link'}"` });
    }
    return btn('primaryLg', 'publish', `${busyIcon(s, 'publish', 'globe')}${PLANT === 'primary' ? 'Publish' : PRIMARY[s.stage]}`, { cls: 'f-primary', attrs: s.busy === 'publish' ? 'aria-busy="true"' : '' });
  }
  function footer(s, bandOpts) {
    if (s.confirm) return offConfirm(s);
    return `<div class="f-footer">${band(s, bandOpts)}${primary(s)}</div>`;
  }
  const closeX = () => `<button type="button" class="d-close" data-act="done" aria-label="Close">${icon('x')}</button>`;
  const titleRow = (title, end) => `<div class="d-title-row"><div class="d-title">${title}</div><span class="d-title-end">${end || ''}${closeX()}</span></div>`;

  // The round-four access block: avatar circle, text select, one line under it.
  const avatar = (s) => `<span class="g-avatar${live(s) ? ' g-avatar--live' : ''}">${icon(live(s) ? 'globe' : 'lock')}</span>`;
  function accessBlock(s, key, o) {
    const opts = o || {};
    return `<div class="g-section">
        ${opts.heading ? `<p class="g-heading">${opts.heading}</p>` : ''}
        <div class="g-access">
          ${avatar(s)}
          <div class="g-access-body">
            ${accessSelect(s, key, false)}
            ${opts.desc === false ? '' : `<p class="g-access-desc">${whoText(s)}</p>`}
          </div>
        </div>
      </div>`;
  }
  const plantHeading = () => (PLANT === 'general-access' ? '<p class="g-heading">General access</p>' : '');
  const plantMore = (s) => (PLANT === 'more-options' && live(s) ? `<details class="d-row"><summary>More options</summary>${btn('outlineSm', 'ask-off', 'Unpublish')}</details>` : '');

  // C1 Round four #5 with the heading renamed to plain words.
  function renderC1(s) {
    return `${titleRow('Share')}
      ${linkRow(s)}
      ${accessBlock(s, 'C1', { heading: 'Who can open it' })}
      ${switchRow(s, 'C1-pw')}
      ${footer(s)}`;
  }

  // C2 Round four #5 with the heading removed. The avatar row stands on its own under the link.
  function renderC2(s) {
    return `${titleRow('Share')}
      ${linkRow(s)}
      ${plantHeading()}
      ${accessBlock(s, 'C2')}
      ${switchRow(s, 'C2-pw')}
      ${footer(s)}`;
  }

  // C3 No heading, no description. The band says who can open the page, so access is described once.
  function renderC3(s) {
    return `${titleRow('Share')}
      ${linkRow(s)}
      ${accessBlock(s, 'C3', { desc: false })}
      ${switchRow(s, 'C3-pw')}
      ${plantMore(s)}
      ${footer(s, { text: (st, x) => (st.stage === 'changes' ? x.text : whoText(st)) })}`;
  }

  // C4 Access as a settings row shaped like the password row: label left, text select right.
  function renderC4(s) {
    return `${titleRow('Share')}
      ${linkRow(s)}
      <div class="d-row d-row--wrap">
        <span class="d-label">${icon(live(s) ? 'globe' : 'lock')}Who can open it</span>
        ${menu(s, 'C4', textSelect(s, 'C4', accessWord(s, false), 'g-text-select--end'), 'down', accessItems(s, false), 'f-menu-wrap--end')}
      </div>
      ${switchRow(s, 'C4-pw')}
      ${footer(s, { text: (st, x) => (st.stage === 'changes' ? x.text : whoText(st)) })}`;
  }

  // C5 Round four #6 body, no header menu. The band's status word is the select:
  // Live / Off. Nothing to choose before the first publish, so draft has no select.
  function renderC5(s) {
    const head = (st, x) => {
      if (st.stage === 'draft') return `<span class="v-status-word">${x.word}</span>`;
      const items = [
        item(live(st) ? 'close-menu' : 'publish', 'Live', 'globe', { role: 'menuitemradio', checked: live(st), sub: 'Anyone with the link can open it' }),
        item(live(st) ? 'ask-off' : 'close-menu', 'Off', 'lock', { role: 'menuitemradio', checked: !live(st), sub: live(st) ? 'The link stops working for everyone' : 'The link is off' }),
      ];
      return menu(st, 'C5', `<button type="button" class="g-text-select g-band-select" data-act="menu" data-arg="C5" aria-haspopup="menu" aria-expanded="${st.menu === 'C5'}"><span class="v-status-word">${x.word}</span>${icon('chevron-down', 'size-3.5')}</button>`, 'up-left', items);
    };
    return `${titleRow('Share')}
      ${linkRow(s)}
      ${switchRow(s, 'C5-pw')}
      ${footer(s, { head, text: (st, x) => (st.stage === 'published' ? whoText(st) : x.text) })}`;
  }

  // C6 A segmented control instead of a menu. Both choices are visible at rest.
  function renderC6(s) {
    const isLive = live(s);
    const seg = (act, label, on) => `<button type="button" role="radio" aria-checked="${on}" class="g-seg${on ? ' g-seg--on' : ''}" data-act="${act}">${label}</button>`;
    return `${titleRow('Share')}
      ${linkRow(s)}
      <div class="g-section">
        <div class="d-row d-row--wrap">
          <span class="d-label">${icon(isLive ? 'globe' : 'lock')}Who can open it</span>
          <div class="g-segs" role="radiogroup" aria-label="Who can open it">
            ${seg(isLive ? 'noop' : 'publish', WORDS.on, isLive)}
            ${seg(isLive ? 'ask-off' : 'noop', WORDS.off, !isLive)}
          </div>
        </div>
      </div>
      ${switchRow(s, 'C6-pw')}
      ${footer(s, { text: (st, x) => (st.stage === 'changes' ? x.text : whoText(st)) })}`;
  }

  // C7 Password folded into the access menu. Bends rule 4 on purpose: three choices
  // in one select, and the password input appears under the row when chosen.
  function renderC7(s) {
    const pwOn = live(s) && s.password;
    return `${titleRow('Share')}
      ${linkRow(s)}
      <div class="g-section">
        <div class="g-access">
          <span class="g-avatar${live(s) ? ' g-avatar--live' : ''}">${icon(pwOn ? 'key-round' : live(s) ? 'globe' : 'lock')}</span>
          <div class="g-access-body">
            ${accessSelect(s, 'C7', true)}
            <p class="g-access-desc">${whoText(s)}</p>
          </div>
        </div>
        ${pwOn ? pwInput(s) : ''}
      </div>
      ${footer(s)}`;
  }

  // C8 Round four #6 with the header "⋮" replaced by the access select, beside the X.
  function renderC8(s) {
    const end = menu(s, 'C8', textSelect(s, 'C8', accessWord(s, false), 'g-text-select--head'), 'down', accessItems(s, false));
    return `${titleRow('Share', end)}
      ${linkRow(s)}
      ${switchRow(s, 'C8-pw')}
      ${footer(s, { text: (st, x) => (st.stage === 'published' ? whoText(st) : x.text) })}`;
  }

  const OPTIONS = [
    { id: 'C1', name: 'Heading in plain words', render: renderC1, family: 'Round four #5',
      note: 'Round four #5 unchanged except the heading. "General access" is Google\'s word for the block under a people list; Clarity has no people list, so the heading now says what the row decides: "Who can open it".',
      tradeoff: 'The smallest change. If the heading was the only thing off, this is the answer. If the three-line block was, it still is.' },
    { id: 'C2', name: 'No heading', render: renderC2, family: 'Round four #5',
      note: 'Round four #5 with the heading removed. The avatar, the select and its one line sit directly under the link, the way Figma shows "Anyone with the link" with no caption above it.',
      tradeoff: 'One line shorter and nothing to misread, but the select has to read as a control on its own, with no label to introduce it.' },
    { id: 'C3', name: 'Described once', render: renderC3, family: 'Round four #5',
      note: 'No heading and no line under the select. The band says who can open the page while nothing is pending, and switches to the freshness line when edits are waiting. Access is described in one place.',
      tradeoff: 'The tightest of the #5 family. The band now carries two kinds of sentence, which is fine while each state has exactly one thing to say.' },
    { id: 'C4', name: 'Settings row', render: renderC4, family: 'Round four #5',
      note: 'The access choice as a row shaped like the password row: icon and label on the left, the select on the right. The dialog becomes a link, two settings, a footer. No avatar circle.',
      tradeoff: 'Reads as a settings list, which is what Framer and Webflow do, and lines up with the password row. The select on the right is the widest control in the dialog, so at 390 the label and select share one tight line.' },
    { id: 'C5', name: 'Status word is the select', render: renderC5, family: 'Round four #6', recommended: true,
      note: 'Round four #6 body with the header menu gone and no extra row. The band\'s status word is the dropdown: Live or Off. Choosing Off asks first; choosing Live from Off publishes. Before the first publish there is nothing to choose, so the band is plain.',
      why: 'Four rows, no new row, and the control to turn the link off sits on the word that says it is on. Vercel and GitHub put visibility on the status chip this way.',
      tradeoff: 'The band is both a status and a control, so it needs the chevron to be found. There is no "Anyone with the link" phrase at rest; the band line carries it instead.' },
    { id: 'C6', name: 'Segmented', render: renderC6, family: 'Round four #5',
      note: 'Both choices visible at rest as a two-segment control, no menu to open. Picking "No one" asks first; picking "Anyone with the link" from off publishes.',
      tradeoff: 'Nothing hidden, which rule 7 asks for. Two long labels in one segment control crowd the row at 390 and the control looks like a tab bar.' },
    { id: 'C7', name: 'Password in the menu', render: renderC7, family: 'Rule 4 bent', bends: 'Rule 4 bent on purpose: password is a choice in the access menu, not its own row.',
      note: 'One select with three choices: Anyone with the link, Anyone with the password, No one. The password input appears under the row when chosen. No switch row.',
      tradeoff: 'One row fewer and the three audiences sit side by side, as Framer\'s and Figma Sites\' password settings do. Turning password on is two clicks (open, choose) instead of one flick, and the current password is not visible at rest.' },
    { id: 'C8', name: 'Select in the title row', render: renderC8, family: 'Round four #6',
      note: 'Round four #6 with the "⋮" replaced by the access select, in the title row beside the X. The body stays four rows. Copy link is the icon in the link row and the primary while up to date.',
      tradeoff: 'The cleanest body here and the select is where Notion keeps page-level controls, but a control in the title row is far from the band it changes, and at 390 the title and the select compete for one line.' },
  ];

  const states = new Map();
  const timers = new Map();

  function presetButtons(current) {
    return PRESETS.map(([key, label]) => `<button type="button" class="x-preset" data-act="preset" data-arg="${key}" aria-pressed="${current === key}">${label}</button>`).join('');
  }

  function paint(opt) {
    const s = states.get(opt.id);
    const card = document.getElementById(opt.id);
    card.dataset.stage = s.stage;
    card.dataset.password = String(s.password);
    card.dataset.confirm = String(s.confirm);
    card.dataset.tone = status(s).tone;
    card.dataset.menu = s.menu || '';
    card.querySelector('[data-presets]').innerHTML = presetButtons(s.preset);
    card.querySelector('[data-dialog]').innerHTML = `<div class="grid gap-4 rounded-lg border bg-background p-6 shadow-lg x-dialog" role="dialog" aria-label="${opt.id} ${opt.name}">
      ${opt.render(s)}
      ${PLANT === 'linkon' ? `<div class="d-row"><label class="d-label">${icon('globe')}Link on</label><button type="button" role="switch" aria-checked="${live(s)}" data-act="${live(s) ? 'ask-off' : 'publish'}" class="${SWITCH}" data-size="default" data-${live(s) ? 'checked' : 'unchecked'}><span class="${THUMB}" data-${live(s) ? 'checked' : 'unchecked'}></span></button></div>` : ''}
      <span class="d-sr" aria-live="polite">${s.copied ? 'Link copied' : ''}</span>
    </div>`;
  }

  function dispatch(opt, act, arg) {
    const before = states.get(opt.id);
    const after = reduce(before, act, arg);
    states.set(opt.id, after);
    if (act === 'pw') return;
    paint(opt);
    const later = (next, ms) => {
      clearTimeout(timers.get(opt.id + next));
      timers.set(opt.id + next, setTimeout(() => dispatch(opt, next), ms));
    };
    if (after.busy === 'publish' && before.busy !== 'publish') later('publish-done', 700);
    if (after.busy === 'off' && before.busy !== 'off') later('off-done', 700);
    if (act === 'copy' && after.copied) {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(URL_FULL).catch(() => {});
      later('uncopy', 1600);
    }
    if ((act === 'password' || act === 'password-on') && after.password) {
      const input = document.querySelector(`#${opt.id} input[data-act="pw"]`);
      if (input) input.focus();
    }
    if (act === 'menu' && after.menu) {
      const first = document.querySelector(`#${opt.id} [data-menu] .f-item`);
      if (first) first.focus();
    }
  }

  const grid = document.getElementById('options');
  grid.innerHTML = OPTIONS.map((opt) => `<article class="x-opt" id="${opt.id}" data-option="${opt.id}">
      <div class="x-opt-head">
        <div class="x-opt-title"><span class="x-opt-num">${opt.id}</span>${opt.name}<span class="x-tag x-tag--app">${opt.family}</span>${opt.recommended ? '<span class="x-tag x-tag--rec">Recommended</span>' : ''}</div>
        <p class="x-opt-note">${opt.note}</p>
        ${opt.bends ? `<p class="x-opt-bends">${opt.bends}</p>` : ''}
        <p class="x-opt-tradeoff">${opt.tradeoff}</p>
        ${opt.why ? `<p class="x-opt-why">${opt.why}</p>` : ''}
      </div>
      <div class="x-presets" data-presets></div>
      <div class="x-stage"><div data-dialog style="width:100%;display:flex;flex-direction:column;align-items:center;gap:6px"></div></div>
    </article>`).join('');

  const globalPresets = document.querySelector('[data-global-presets]');
  globalPresets.innerHTML = presetButtons('changes');

  for (const opt of OPTIONS) {
    states.set(opt.id, presetState('changes'));
    paint(opt);
  }

  function closeMenusExcept(keepCard) {
    for (const opt of OPTIONS) {
      if (opt.id === keepCard) continue;
      if (states.get(opt.id).menu) dispatch(opt, 'close-menu');
    }
  }

  document.addEventListener('click', (event) => {
    const control = event.target.closest('[data-act]');
    const inMenu = event.target.closest('[data-menu], [data-act="menu"]');
    // Read the control before closing menus: a repaint detaches it.
    const card = control && control.closest('.x-opt');
    const act = control && control.dataset.act;
    const arg = control && control.dataset.arg;
    const isGlobal = control && control.closest('[data-global-presets]');
    closeMenusExcept(inMenu ? inMenu.closest('.x-opt').id : null);
    if (!control || control.tagName === 'INPUT' || act === 'noop') return;
    if (isGlobal) {
      globalPresets.innerHTML = presetButtons(arg);
      for (const opt of OPTIONS) dispatch(opt, 'preset', arg);
      return;
    }
    const opt = OPTIONS.find((o) => o.id === card.id);
    dispatch(opt, act, arg);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenusExcept(null);
  });
  document.addEventListener('input', (event) => {
    const control = event.target.closest('input[data-act="pw"]');
    if (!control) return;
    const opt = OPTIONS.find((o) => o.id === control.closest('.x-opt').id);
    dispatch(opt, 'pw', control.value);
  });
  window.__proto = {
    OPTIONS: OPTIONS.map((o) => o.id),
    PRESETS: PRESETS.map((p) => p[0]),
    PRIMARY: Object.fromEntries(OPTIONS.map((o) => [o.id, PRIMARY])),
    PASSWORD_IN_MENU: OPTIONS.filter((o) => o.id === 'C7').map((o) => o.id),
    plant: PLANT,
    state: (id) => states.get(id),
  };
})();
