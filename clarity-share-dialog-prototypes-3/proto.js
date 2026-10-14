// One state record and one reducer drive every variation; only render() differs.
// state: { stage, password, pw, publishedAgo, copied, confirm, busy, menu, preset }
// stage: 'draft' | 'published' | 'changes' | 'unpublished'
// menu: null | 'link' | 'header' | 'band' | 'access'  (which overflow is open)
(function () {
  const BTN = window.BTN;
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
      case 'password': return { ...s, password: !s.password };
      case 'pw': return { ...s, pw: arg };
      case 'menu': return { ...s, menu: s.menu === arg ? null : arg };
      case 'close-menu': return s.menu ? { ...s, menu: null } : s;
      default: return s;
    }
  }

  // What the band says. tone drives colour: live = green, changes = amber, off = grey.
  function status(s) {
    return {
      draft: { tone: 'off', word: 'Not published', text: 'Nobody can open the link yet.' },
      published: { tone: 'live', word: 'Live', text: s.password ? 'Anyone with the link and the password.' : 'Anyone with the link can open it.' },
      changes: { tone: 'changes', word: 'Live', text: `Visitors see the version from ${s.publishedAgo}.` },
      unpublished: { tone: 'off', word: 'Off', text: 'The link no longer opens.' },
    }[s.stage];
  }
  const PRIMARY = { draft: 'Publish', published: 'Copy link', changes: 'Publish changes', unpublished: 'Publish' };

  const icon = (name, cls) => `<svg class="${cls || 'size-4'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${window.ICONS[name]}</svg>`;
  // index.css declares the button faces on [data-button-variant]; without it
  // the primary gradient has no fill and renders white.
  const variantOf = (kind) => kind.replace(/(Lg|Sm|Icon|IconSm|Inline)$/, '').replace(/^primary$/, 'default');
  const btn = (kind, act, label, extra) => `<button type="button" data-slot="button" data-button-variant="${variantOf(kind)}" class="${BTN[kind]}${extra && extra.cls ? ' ' + extra.cls : ''}" data-act="${act}"${extra && extra.arg !== undefined ? ` data-arg="${extra.arg}"` : ''}${extra && extra.disabled ? ' disabled' : ''}${extra && extra.attrs ? ' ' + extra.attrs : ''}>${label}</button>`;
  const busyIcon = (s, kind, name) => (s.busy === kind ? icon('loader-circle', 'size-4 spin') : icon(name));
  const dot = (tone) => `<span class="d-dot d-dot--${tone}"></span>`;

  // The link row from the original dialog: URL, open arrow, copy icon.
  // opts.menu adds an overflow trigger after copy while live.
  function chip(s, opts) {
    const o = opts || {};
    const isLive = live(s);
    const copyLabel = s.copied ? 'Link copied' : 'Copy link';
    return `<div class="d-chip${isLive ? '' : ' d-chip--off'}">
      ${isLive
        ? `<a href="${URL_FULL}" target="_blank" rel="noreferrer" aria-label="Open this Journey Page in a new tab"><span class="mono">${URL_SHOWN}</span>${icon('arrow-up-right', 'size-4 shrink-0 text-muted-foreground')}</a>`
        : `<span class="d-chip-inert" aria-label="Journey Page share link"><span class="mono">${URL_SHOWN}</span></span>`}
      <span class="v-copy-wrap">${btn('ghostIcon', 'copy', s.copied ? icon('check') : icon('copy'), { disabled: !isLive, attrs: `aria-label="${copyLabel}" title="${copyLabel}"` })}${s.copied ? '<span class="v-tip" role="status">Copied</span>' : ''}</span>
      ${o.menu && isLive ? menu(s, 'link', btn('ghostIcon', 'menu', icon('ellipsis'), { arg: 'link', attrs: `aria-label="More" aria-haspopup="menu" aria-expanded="${s.menu === 'link'}"` }), 'down', [openItem(), sep(), unpubItem()]) : ''}
    </div>`;
  }
  const pwInput = (s) => `<input class="${INPUT} d-pw" aria-label="Page password" placeholder="Set a password" data-act="pw" value="${s.pw}">`;
  function switchRow(s, id) {
    return `<div class="d-row">
      <label class="d-label" for="${id}">${icon('lock')}Password protected</label>
      <button type="button" role="switch" id="${id}" aria-checked="${s.password}" data-act="password" data-size="default" data-${s.password ? 'checked' : 'unchecked'} class="${SWITCH}"><span data-${s.password ? 'checked' : 'unchecked'} class="${THUMB}"></span></button>
    </div>${s.password ? pwInput(s) : ''}`;
  }
  function offConfirm(s) {
    return `<div class="d-confirm" role="group" aria-label="Unpublish this page?">
      <p><strong>Unpublish this page?</strong></p>
      <p class="d-muted">The link stops working for everyone you sent it to. Publish turns the same link back on.</p>
      <div class="d-footer">${btn('outlineSm', 'cancel-off', 'Cancel')}${btn('dangerSm', 'off', `${s.busy === 'off' ? icon('loader-circle', 'size-3.5 spin') : ''}Unpublish`)}</div>
    </div>`;
  }

  // Overflow menus. The trigger carries data-act="menu"; items are plain
  // neutral rows, Unpublish included. direction: 'down' | 'up' | 'select'.
  const item = (act, label, name, extra) => `<button type="button" role="${extra && extra.role || 'menuitem'}" class="f-item" data-act="${act}"${extra && extra.arg !== undefined ? ` data-arg="${extra.arg}"` : ''}${extra && extra.checked !== undefined ? ` aria-checked="${extra.checked}"` : ''}>${icon(name)}<span>${label}</span>${extra && extra.checked ? icon('check', 'size-4 f-check') : ''}</button>`;
  const openItem = () => `<a class="f-item" role="menuitem" href="${URL_FULL}" target="_blank" rel="noreferrer">${icon('arrow-up-right')}<span>Open in new tab</span></a>`;
  const unpubItem = () => item('ask-off', 'Unpublish', 'link-2-off');
  const sep = () => '<div class="f-sep" role="separator"></div>';
  function menu(s, key, trigger, direction, items, wrapCls) {
    return `<span class="f-menu-wrap${wrapCls ? ' ' + wrapCls : ''}">${trigger}${s.menu === key ? `<div class="f-menu f-menu--${direction}" role="menu" data-menu>${items.join('')}</div>` : ''}</span>`;
  }

  // Footer: band left, one primary right. The confirm replaces the whole footer.
  function band(s, trailing) {
    const st = status(s);
    return `<div class="f-band" data-tone="${st.tone}" role="status">${dot(st.tone)}<div class="f-band-body"><p class="f-band-head"><span class="v-status-word">${st.word}</span></p><p class="f-band-text">${st.text}</p></div>${trailing || ''}</div>`;
  }
  function primary(s) {
    if (s.stage === 'published') {
      return btn('primaryLg', 'copy', `${s.copied ? icon('check') : icon('copy')}${s.copied ? 'Copied' : 'Copy link'}`, { cls: 'f-primary', attrs: `aria-label="${s.copied ? 'Link copied' : 'Copy link'}"` });
    }
    return btn('primaryLg', 'publish', `${busyIcon(s, 'publish', 'globe')}${PRIMARY[s.stage]}`, { cls: 'f-primary', attrs: s.busy === 'publish' ? 'aria-busy="true"' : '' });
  }
  function footer(s, bandTrailing) {
    if (s.confirm) return offConfirm(s);
    return `<div class="f-footer">${band(s, bandTrailing)}${primary(s)}</div>`;
  }

  // 1 Link row menu
  function render1(s) {
    return `${chip(s, { menu: true })}
      ${switchRow(s, 'v1-pw')}
      ${footer(s)}`;
  }

  // 2 Header menu. head() renders into the title row, next to the close X.
  function render2(s) {
    return `${chip(s)}
      ${switchRow(s, 'v2-pw')}
      ${footer(s)}`;
  }
  function head2(s) {
    if (!live(s)) return '';
    return `<span class="d-title-end">${menu(s, 'header', btn('ghostIcon', 'menu', icon('ellipsis-vertical'), { arg: 'header', attrs: `aria-label="More" aria-haspopup="menu" aria-expanded="${s.menu === 'header'}"` }), 'down', [openItem(), sep(), unpubItem()])}</span>`;
  }

  // 3 Link on switch. Off while live asks first; on while off publishes.
  function render3(s) {
    const isLive = live(s);
    const act = isLive ? 'ask-off' : 'publish';
    return `${chip(s)}
      ${switchRow(s, 'v3-pw')}
      <div class="d-row">
        <label class="d-label" for="v3-link">${icon('globe')}Link on</label>
        <button type="button" role="switch" id="v3-link" aria-checked="${isLive}" data-act="${act}" data-size="default" data-${isLive ? 'checked' : 'unchecked'} class="${SWITCH}"${s.busy === 'publish' ? ' aria-busy="true"' : ''}><span data-${isLive ? 'checked' : 'unchecked'} class="${THUMB}"></span></button>
      </div>
      ${footer(s)}`;
  }

  // 4 Band menu. A ghost trigger at the band's right edge, only while live.
  function render4(s) {
    const trigger = live(s)
      ? menu(s, 'band', btn('ghostIconSm', 'menu', icon('ellipsis'), { arg: 'band', cls: 'f-band-trigger', attrs: `aria-label="More" aria-haspopup="menu" aria-expanded="${s.menu === 'band'}"` }), 'up', [openItem(), sep(), unpubItem()])
      : '';
    return `${chip(s)}
      ${switchRow(s, 'v4-pw')}
      ${footer(s, trigger)}`;
  }

  // 5 Who can open. A select-shaped row under Password; "Nobody" asks first.
  function render5(s) {
    const isLive = live(s);
    const current = isLive ? 'Anyone with the link' : 'Nobody, link off';
    const items = [
      item(isLive ? 'close-menu' : 'publish', 'Anyone with the link', 'globe', { role: 'menuitemradio', checked: isLive }),
      item(isLive ? 'ask-off' : 'close-menu', 'Nobody, link off', 'link-2-off', { role: 'menuitemradio', checked: !isLive }),
    ];
    const trigger = btn('outline', 'menu', `<span class="f-select-text">${current}</span>${icon('chevron-down')}`, { arg: 'access', cls: 'f-select', attrs: `aria-haspopup="menu" aria-expanded="${s.menu === 'access'}" aria-label="Access: ${current}"` });
    return `${chip(s)}
      ${switchRow(s, 'v5-pw')}
      <div class="d-row">
        <span class="d-label">${icon('eye')}Access</span>
        ${menu(s, 'access', trigger, 'select', items)}
      </div>
      ${footer(s)}`;
  }

  // Reference: round two, option 4 ("Tinted band"), unchanged.
  const REF_ACTION = { draft: 'Publish', changes: 'Publish changes', unpublished: 'Publish', published: null };
  function renderRef(s) {
    const st = status(s);
    const refText = {
      draft: 'Nobody can open the link until you publish.',
      published: s.password ? 'Anyone with the link and the password can open this page.' : 'Anyone with the link can open this page.',
      changes: `Visitors see the version from ${s.publishedAgo}.`,
      unpublished: 'The link no longer opens. Publish turns it back on.',
    }[s.stage];
    const action = REF_ACTION[s.stage];
    const refFooter = s.confirm ? offConfirm(s) : `<div class="v-footer">
      ${live(s) ? btn('outlineLg', 'ask-off', 'Unpublish') : '<span></span>'}
      ${action ? btn('primaryLg', 'publish', `${busyIcon(s, 'publish', 'globe')}${action}`, { attrs: s.busy === 'publish' ? 'aria-busy="true"' : '' }) : `<span class="v-uptodate">${icon('check', 'size-4')}Up to date</span>`}
    </div>`;
    return `<div class="v-band" data-tone="${st.tone}">
        ${dot(st.tone)}
        <div><p class="v-band-head"><span class="v-status-word">${st.word}</span></p><p class="v-band-text">${refText}</p></div>
      </div>
      ${chip(s)}
      ${switchRow(s, 'ref-pw')}
      ${refFooter}`;
  }

  const OPTIONS = [
    { id: 'v1', name: 'Link row menu', render: render1,
      note: 'A "…" button joins the copy icon in the link row while the page is live. Its menu holds Open in new tab and Unpublish as plain rows. Nothing else changes.',
      tradeoff: 'Zero footprint and it sits where the link is, but a third icon crowds the row on a phone and Unpublish is one click deeper.' },
    { id: 'v2', name: 'Header menu', render: render2, head: head2,
      note: 'A vertical "…" button next to the close X while live, holding Open in new tab and Unpublish. The body is only the link, the password row and the footer.',
      tradeoff: 'Cleanest body of the five, but the dialog grows a header control Clarity\'s other dialogs do not have, and the menu is far from the link it acts on.' },
    { id: 'v3', name: 'Link on switch', render: render3, recommended: true,
      why: 'Recommended. The switch is visible without hunting and reads as a setting beside Password protected, so it never competes with the primary button for the word Publish. Switching it off asks first; switching it on does what Publish does, so the two can never disagree.',
      note: 'A second switch row under Password: globe, "Link on", switch. On while live. Turning it off opens the confirm; turning it on from off publishes.',
      tradeoff: 'Most discoverable and the same shape as the password row, but a switch that is on from the first publish gives the dialog two ways to publish.' },
    { id: 'v4', name: 'Band menu', render: render4,
      note: 'The status band itself carries a small "…" at its right edge while live. The menu opens upward with Open in new tab and Unpublish.',
      tradeoff: 'Unpublish sits with the status it changes, but the band gets narrower next to the button and a control inside a status surface is easy to miss.' },
    { id: 'v5', name: 'Access row', render: render5,
      note: 'A select-shaped row under Password, labelled Access: "Anyone with the link" or "Nobody, link off". Choosing Nobody asks first; choosing Anyone from off publishes.',
      tradeoff: 'Spells out what Unpublish means in plain words, but a two-option select is heavier than a switch and its label overlaps with the password row.' },
    { id: 'ref', name: 'Round two, option 4', render: renderRef, ref: true,
      note: 'The "Tinted band" option from round two, unchanged: band on top, link, password switch, Unpublish outline left and Publish right in the footer.',
      tradeoff: 'Kept here for comparison only.' },
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
    card.querySelector('[data-dialog]').innerHTML = `<div class="grid gap-4 rounded-lg border bg-background p-6 shadow-lg x-dialog">
      <div class="d-title-row"><div class="d-title">Share</div>${opt.head ? opt.head(s) : ''}</div>
      ${opt.render(s)}
      <span class="x-close" aria-hidden="true">${icon('x')}</span>
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
    if (act === 'password' && after.password) {
      const input = document.querySelector(`#${opt.id} input[data-act="pw"]`);
      if (input) input.focus();
    }
    if (act === 'menu' && after.menu) {
      const first = document.querySelector(`#${opt.id} [data-menu] .f-item`);
      if (first) first.focus();
    }
  }

  const grid = document.getElementById('options');
  grid.innerHTML = OPTIONS.map((opt, i) => `<article class="x-opt" id="${opt.id}" data-option="${i + 1}">
      <div class="x-opt-head">
        <div class="x-opt-title"><span class="x-opt-num">${opt.ref ? 'Ref' : i + 1}</span>${opt.name}${opt.recommended ? '<span class="x-tag x-tag--rec">Recommended</span>' : ''}${opt.ref ? '<span class="x-tag x-tag--now">Round two</span>' : ''}</div>
        <p class="x-opt-note">${opt.note}</p>
        <p class="x-opt-tradeoff">${opt.tradeoff}</p>
        ${opt.why ? `<p class="x-opt-why">${opt.why}</p>` : ''}
      </div>
      <div class="x-presets" data-presets></div>
      <div class="x-stage"><div data-dialog style="width:100%;display:flex;justify-content:center"></div></div>
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
    if (!control || control.tagName === 'INPUT') return;
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
  window.__proto = { OPTIONS: OPTIONS.map((o) => o.id), REF: OPTIONS.filter((o) => o.ref).map((o) => o.id), PRESETS: PRESETS.map((p) => p[0]), state: (id) => states.get(id) };
})();
