// One state record and one reducer drive every variation; only render() differs.
// state: { stage, password, pw, publishedAgo, copied, confirm, busy, menu, preset }
// stage: 'draft' | 'published' | 'changes' | 'unpublished'
// menu: null | 'header' | 'band' | 'access' | 'framer' | 'figma' | 'docs'
// ?plant=<name> renders a known violation so verify.mjs can prove it goes red.
(function () {
  const BTN = window.BTN;
  const PLANT = new URLSearchParams(location.search).get('plant') || '';
  const URL_SHOWN = 'clarity.video/page/example';
  const URL_FULL = 'https://clarity.video/page/example';
  const PAGE_TITLE = 'Acme proposal';
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
  const BLANK = { stage: 'draft', password: false, pw: '', publishedAgo: '2h ago', copied: false, confirm: false, busy: null, menu: null, settings: false, preset: 'draft' };

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
      case 'done': return { ...s, menu: null };
      case 'settings': return { ...s, settings: !s.settings, menu: null, confirm: false };
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

  const icon = (name, cls) => `<svg class="${cls || 'size-4'}" data-icon="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${window.ICONS[name]}</svg>`;
  // index.css declares the button faces on [data-button-variant]; without it
  // the primary gradient has no fill and renders white.
  const variantOf = (kind) => kind.replace(/(Lg|Sm|Icon|IconSm|Inline)$/, '').replace(/^primary$/, 'default');
  const btn = (kind, act, label, extra) => `<button type="button" data-slot="button" data-button-variant="${variantOf(kind)}" class="${BTN[kind]}${extra && extra.cls ? ' ' + extra.cls : ''}" data-act="${act}"${extra && extra.arg !== undefined ? ` data-arg="${extra.arg}"` : ''}${extra && extra.disabled ? ' disabled' : ''}${extra && extra.attrs ? ' ' + extra.attrs : ''}>${label}</button>`;
  const busyIcon = (s, kind, name) => (s.busy === kind ? icon('loader-circle', 'size-4 spin') : icon(name));
  const dot = (tone) => `<span class="d-dot d-dot--${tone}"></span>`;
  const copyBtn = (s, kind, extra) => {
    const copyLabel = s.copied ? 'Link copied' : 'Copy link';
    return `<span class="v-copy-wrap">${btn(kind || 'ghostIcon', 'copy', s.copied ? icon('check') : icon('copy'), { ...(extra || {}), attrs: `aria-label="${copyLabel}" title="${copyLabel}"` })}${s.copied ? '<span class="v-tip" role="status">Copied</span>' : ''}</span>`;
  };

  // The link row. mode 'arrow': plain URL plus one open-in-new-tab icon.
  // mode 'copy': the URL is itself the link (underlined) plus one copy icon.
  // Never both icons. ?plant=arrow-copy renders both to prove verify goes red.
  function linkRow(s, mode) {
    const isLive = live(s);
    const plantBoth = PLANT === 'arrow-copy';
    if (!isLive) {
      return `<div class="d-chip d-chip--off"><span class="d-chip-inert" aria-label="Journey Page share link"><span class="mono">${URL_SHOWN}</span></span>${mode === 'copy' || plantBoth ? copyBtn(s, 'ghostIcon', { disabled: true }) : ''}</div>`;
    }
    const open = `<a class="${BTN.ghostIcon} d-chip-open" data-button-variant="ghost" href="${URL_FULL}" target="_blank" rel="noreferrer" aria-label="Open in new tab" title="Open in new tab">${icon('arrow-up-right')}</a>`;
    if (mode === 'arrow' && !plantBoth) {
      return `<div class="d-chip"><span class="d-chip-inert" aria-label="Journey Page share link"><span class="mono">${URL_SHOWN}</span></span>${open}</div>`;
    }
    return `<div class="d-chip"><a class="d-chip-url" href="${URL_FULL}" target="_blank" rel="noreferrer" aria-label="Open this Journey Page in a new tab"><span class="mono">${URL_SHOWN}</span></a>${plantBoth ? open : ''}${copyBtn(s)}</div>`;
  }
  const pwInput = (s) => `<input class="${INPUT} d-pw" aria-label="Page password" placeholder="Set a password" data-act="pw" value="${s.pw}">`;
  function switchRow(s, id) {
    return `<div class="d-row">
      <label class="d-label" for="${id}">${icon('lock')}Password protected</label>
      <button type="button" role="switch" id="${id}" aria-checked="${s.password}" data-act="password" data-size="default" data-${s.password ? 'checked' : 'unchecked'} class="${SWITCH}"><span data-${s.password ? 'checked' : 'unchecked'} class="${THUMB}"></span></button>
    </div>${s.password ? pwInput(s) : ''}`;
  }
  function offConfirm(s, verb) {
    const v = verb || 'Unpublish';
    return `<div class="d-confirm" role="group" aria-label="${v} this page?">
      <p><strong>${v} this page?</strong></p>
      <p class="d-muted">The link stops working for everyone you sent it to. Publish turns the same link back on.</p>
      <div class="d-footer">${btn('outlineSm', 'cancel-off', 'Cancel')}${btn('dangerSm', 'off', `${s.busy === 'off' ? icon('loader-circle', 'size-3.5 spin') : ''}${v}`)}</div>
    </div>`;
  }

  // Overflow menus. The trigger carries data-act="menu"; items are plain
  // neutral rows, Unpublish included. direction: 'down' | 'down-left' | 'up' | 'select'.
  const item = (act, label, name, extra) => `<button type="button" role="${extra && extra.role || 'menuitem'}" class="f-item" data-act="${act}"${extra && extra.arg !== undefined ? ` data-arg="${extra.arg}"` : ''}${extra && extra.checked !== undefined ? ` aria-checked="${extra.checked}"` : ''}>${icon(name)}<span class="f-item-body"><span>${label}</span>${extra && extra.sub ? `<span class="f-item-sub">${extra.sub}</span>` : ''}</span>${extra && extra.checked ? icon('check', 'size-4 f-check') : ''}</button>`;
  const openItem = () => `<a class="f-item" role="menuitem" href="${URL_FULL}" target="_blank" rel="noreferrer">${icon('arrow-up-right')}<span>Open in new tab</span></a>`;
  const copyItem = (s) => item('copy', s.copied ? 'Copied' : 'Copy link', s.copied ? 'check' : 'copy');
  const unpubItem = (label) => item('ask-off', label || 'Unpublish', 'link-2-off', PLANT === 'red' ? { } : undefined).replace('class="f-item"', PLANT === 'red' ? 'class="f-item text-destructive"' : 'class="f-item"');
  const sep = () => '<div class="f-sep" role="separator"></div>';
  function menu(s, key, trigger, direction, items, wrapCls) {
    return `<span class="f-menu-wrap${wrapCls ? ' ' + wrapCls : ''}">${trigger}${s.menu === key ? `<div class="f-menu f-menu--${direction}" role="menu" data-menu>${items.join('')}</div>` : ''}</span>`;
  }
  const ellipsisTrigger = (s, key, kind, name, cls) => btn(kind || 'ghostIconSm', 'menu', icon(name || 'ellipsis'), { arg: key, cls, attrs: `aria-label="More" aria-haspopup="menu" aria-expanded="${s.menu === key}"` });

  // Footer: band left, one primary right. The confirm replaces the whole footer.
  function band(s, trailing, textOverride) {
    const st = status(s);
    return `<div class="f-band" data-tone="${st.tone}" role="status">${dot(st.tone)}<div class="f-band-body"><p class="f-band-head"><span class="v-status-word">${st.word}</span></p><p class="f-band-text">${textOverride ? textOverride(s, st) : st.text}</p></div>${trailing || ''}</div>`;
  }
  function primary(s) {
    if (s.stage === 'published') {
      return btn('primaryLg', 'copy', `${s.copied ? icon('check') : icon('copy')}${s.copied ? 'Copied' : 'Copy link'}`, { cls: 'f-primary', attrs: `aria-label="${s.copied ? 'Link copied' : 'Copy link'}"` });
    }
    return btn('primaryLg', 'publish', `${busyIcon(s, 'publish', 'globe')}${PRIMARY[s.stage]}`, { cls: 'f-primary', attrs: s.busy === 'publish' ? 'aria-busy="true"' : '' });
  }
  function footer(s, bandTrailing, textOverride) {
    if (s.confirm) return offConfirm(s);
    return `<div class="f-footer">${band(s, bandTrailing, textOverride)}${primary(s)}</div>`;
  }
  const closeX = () => `<button type="button" class="d-close" data-act="done" aria-label="Close">${icon('x')}</button>`;
  const titleRow = (title, end) => `<div class="d-title-row"><div class="d-title">${title}</div><span class="d-title-end">${end || ''}${closeX()}</span></div>`;

  // Access select shared by the Docs, Figma and access-row cards. Choosing
  // "off" while live asks first; choosing "anyone" while off publishes.
  const accessLabel = (s, words) => (live(s) ? words.on : words.off);
  function accessItems(s, words) {
    const isLive = live(s);
    return [
      item(isLive ? 'close-menu' : 'publish', words.on, 'globe', { role: 'menuitemradio', checked: isLive, sub: words.onSub }),
      item(isLive ? 'ask-off' : 'close-menu', words.off, 'lock', { role: 'menuitemradio', checked: !isLive, sub: words.offSub }),
    ];
  }

  // A Band menu, refined (round three #4). Link row: underlined URL + copy.
  function renderBand(s) {
    const trigger = live(s) ? menu(s, 'band', ellipsisTrigger(s, 'band', 'ghostIconSm', 'ellipsis', 'f-band-trigger'), 'up', [openItem(), sep(), unpubItem()]) : '';
    return `${titleRow('Share')}
      ${linkRow(s, 'copy')}
      ${switchRow(s, 'band-pw')}
      ${footer(s, trigger)}`;
  }

  // B Access row, refined (round three #5). Docs and Figma shape: avatar, a
  // text-style select, one description line. The band keeps only freshness.
  const ACCESS_WORDS = { on: 'Anyone with the link', off: 'No one', onSub: 'Anyone on the internet with the link can open it', offSub: 'The link is off. Only you can see the page' };
  function renderAccess(s) {
    const isLive = live(s);
    const desc = isLive
      ? (s.password ? 'Anyone with the link and the password can open it.' : 'Anyone on the internet with the link can open it.')
      : (s.stage === 'draft' ? 'Choose Anyone with the link to publish.' : 'The link is off. Choose Anyone with the link to publish again.');
    const trigger = `<button type="button" class="g-text-select" data-act="menu" data-arg="access" aria-haspopup="menu" aria-expanded="${s.menu === 'access'}"><span class="f-select-text">${accessLabel(s, ACCESS_WORDS)}</span>${icon('chevron-down')}</button>`;
    const freshness = (st, x) => ({ draft: 'Nothing is published yet.', published: 'Up to date.', changes: `Visitors see the version from ${st.publishedAgo}.`, unpublished: 'The link no longer opens.' }[st.stage]);
    return `${titleRow('Share')}
      ${linkRow(s, 'copy')}
      <div class="g-section">
        <p class="g-heading">General access</p>
        <div class="g-access">
          <span class="g-avatar${isLive ? ' g-avatar--live' : ''}">${icon(isLive ? 'globe' : 'lock')}</span>
          <div class="g-access-body">
            ${menu(s, 'access', trigger, 'select', accessItems(s, ACCESS_WORDS), 'f-menu-wrap--grow')}
            <p class="g-access-desc">${desc}</p>
          </div>
        </div>
      </div>
      ${switchRow(s, 'access-pw')}
      ${footer(s, '', freshness)}`;
  }

  // C Header menu, fixed (round three #2). The "⋮" shares the title row with
  // the X, both 32px, both centred on the title. Link row: URL + open arrow
  // only. Copy lives in the primary while current and in the menu otherwise.
  function renderHeader(s) {
    const trigger = `<span class="v-copy-wrap">${ellipsisTrigger(s, 'header', 'ghostIconSm', 'ellipsis-vertical')}${s.copied && s.stage !== 'published' ? '<span class="v-tip" role="status">Copied</span>' : ''}</span>`;
    const end = live(s) ? menu(s, 'header', trigger, 'down', [copyItem(s), sep(), unpubItem()]) : '';
    return `${titleRow('Share', end)}
      ${linkRow(s, 'arrow')}
      ${switchRow(s, 'header-pw')}
      ${footer(s)}`;
  }

  // D Framer: the Publish popover. Anchored to a Publish button. The URL row
  // is a link (Framer's domain row opens the site), one copy icon is
  // Clarity's addition. "Last published" line, Update as the primary and
  // disabled when up to date, as Framer does. Unpublish and password live
  // behind the gear, in a Site settings view, as Framer keeps them.
  const FRAMER_PRIMARY = { draft: 'Publish', published: 'Update', changes: 'Update', unpublished: 'Publish' };
  function renderFramerSettings(s) {
    return `<div class="d-title-row"><button type="button" class="d-close" data-act="settings" aria-label="Back">${icon('chevron-left')}</button><div class="d-title">Site settings</div></div>
      ${switchRow(s, 'framer-pw')}
      <div class="g-hr"></div>
      <div class="d-row">
        <div class="g-access-body"><p class="g-heading">${live(s) ? 'Unpublish' : 'Publish'}</p><p class="g-access-desc">${live(s) ? 'Takes the page offline. The same link comes back when you publish again.' : 'Turns the link on for anyone you send it to.'}</p></div>
        ${live(s) ? btn('outline', 'ask-off', 'Unpublish') : btn('outline', 'publish', `${busyIcon(s, 'publish', 'globe')}Publish`, { attrs: s.busy === 'publish' ? 'aria-busy="true"' : '' })}
      </div>
      ${s.confirm ? offConfirm(s) : ''}`;
  }
  function renderFramer(s) {
    if (s.settings) return renderFramerSettings(s);
    const st = status(s);
    const meta = {
      draft: `${icon('clock')}Not published yet`,
      published: `${icon('circle-check')}Published ${s.publishedAgo}, up to date`,
      changes: `${icon('clock')}Last published ${s.publishedAgo}. Unpublished changes`,
      unpublished: `${icon('circle-off')}Unpublished. The link no longer opens`,
    }[s.stage];
    const pwNote = s.password ? `<span class="g-meta-sep">·</span>${icon('lock')}Password on` : '';
    const action = btn('primaryLg', 'publish', `${busyIcon(s, 'publish', s.stage === 'changes' || s.stage === 'published' ? 'rotate-cw' : 'globe')}${FRAMER_PRIMARY[s.stage]}`, { cls: 'f-primary', disabled: s.stage === 'published', attrs: s.busy === 'publish' ? 'aria-busy="true"' : '' });
    return `${linkRow(s, 'copy')}
      <p class="g-meta" data-tone="${st.tone}">${meta}${pwNote}</p>
      <div class="g-actions"><span class="g-left">${btn('ghostIconSm', 'settings', icon('settings-2'), { attrs: 'aria-label="Site settings" title="Site settings"' })}</span>${action}</div>`;
  }
  const framerAnchor = () => `<span class="g-trigger">${btn('primary', 'noop', `Publish${icon('chevron-down', 'size-4 opacity-70')}`)}</span>`;

  // E Figma: the Share dialog, with Figma Sites' publish fields. Invite
  // field with its Invite button, people row, "Anyone with the link" as a
  // small select with "can view" beside it, then Status and Last published
  // as label/value rows. Copy link is a text button bottom-left. Publish is
  // the primary in every state that needs one, as Figma Sites labels it.
  const FIGMA_WORDS = { on: 'Anyone with the link', off: 'Only invited people', onSub: 'Anyone on the internet with the link can open it', offSub: 'Only you. The link is off' };
  const FIGMA_PRIMARY = { draft: 'Publish', published: null, changes: 'Publish', unpublished: 'Publish' };
  function renderFigma(s) {
    const isLive = live(s);
    const trigger = btn('outlineSm', 'menu', `${icon(isLive ? 'globe' : 'lock')}<span class="f-select-text">${accessLabel(s, FIGMA_WORDS)}</span>${icon('chevron-down')}`, { arg: 'figma', cls: 'f-select', attrs: `aria-haspopup="menu" aria-expanded="${s.menu === 'figma'}"` });
    const role = `<span class="g-people-role">${s.password ? 'with the password' : 'can view'}</span>`;
    const statusWord = { draft: 'Not published', published: 'Published', changes: 'Published, with unpublished changes', unpublished: 'Unpublished' }[s.stage];
    const lastPublished = s.stage === 'draft' ? 'Never' : s.publishedAgo;
    const action = s.busy === 'publish'
      ? btn('primary', 'publish', `${icon('loader-circle', 'size-4 spin')}Publishing`, { cls: 'f-primary', attrs: 'aria-busy="true"' })
      : FIGMA_PRIMARY[s.stage]
        ? btn('primary', 'publish', `${icon('globe')}${FIGMA_PRIMARY[s.stage]}`, { cls: 'f-primary' })
        : '';
    return `${titleRow(`Share ${PAGE_TITLE}`)}
      <div class="g-invite"><input class="${INPUT}" placeholder="Invite others by email" aria-label="Invite others by email" data-act="noop" disabled title="Clarity has no invites yet">${btn('primary', 'noop', 'Invite', { disabled: true })}</div>
      <div class="g-people">
        <span class="g-avatar">${icon('user-round')}</span>
        <div class="g-people-body"><p class="g-people-name">You</p><p class="g-people-sub">Owner</p></div>
      </div>
      <div class="g-people">
        <span class="g-avatar${isLive ? ' g-avatar--live' : ''}">${icon(isLive ? 'globe' : 'lock')}</span>
        <div class="g-people-body">${menu(s, 'figma', trigger, 'select', accessItems(s, FIGMA_WORDS), 'f-menu-wrap--grow')}</div>
        ${isLive ? role : ''}
      </div>
      ${switchRow(s, 'figma-pw')}
      <div class="g-hr"></div>
      <dl class="g-fields">
        <dt>Status</dt><dd data-tone="${status(s).tone}">${statusWord}</dd>
        <dt>Last published</dt><dd>${lastPublished}</dd>
      </dl>
      ${s.confirm ? offConfirm(s) : `<div class="g-foot">
        ${isLive ? `<span class="v-copy-wrap">${btn('linkInline', 'copy', `${s.copied ? icon('check') : icon('link')}${s.copied ? 'Copied' : 'Copy link'}`, { cls: 'g-pill-link', attrs: `aria-label="${s.copied ? 'Link copied' : 'Copy link'}"` })}${s.copied ? '<span class="v-tip" role="status">Copied</span>' : ''}</span>` : '<span></span>'}
        ${action}
      </div>`}`;
  }

  // F Google Docs: the Share dialog. Title quotes the page name, "General
  // access" section with avatar, select and one description line, Copy link
  // as an outlined pill bottom-left, Done bottom-right. Password is a row.
  const DOCS_WORDS = { on: 'Anyone with the link', off: 'Restricted', onSub: 'Anyone on the internet with the link can view', offSub: 'Only you can open the page' };
  const DOCS_PRIMARY = { draft: 'Publish', published: 'Done', changes: 'Publish changes', unpublished: 'Done' };
  function renderDocs(s) {
    const isLive = live(s);
    const desc = isLive
      ? (s.password ? 'Anyone on the internet with the link and the password can view' : 'Anyone on the internet with the link can view')
      : (s.stage === 'draft' ? 'Nobody can open the page until you publish' : 'Only you can open the page');
    const trigger = `<button type="button" class="g-text-select" data-act="menu" data-arg="docs" aria-haspopup="menu" aria-expanded="${s.menu === 'docs'}"><span class="f-select-text">${accessLabel(s, DOCS_WORDS)}</span>${icon('chevron-down')}</button>`;
    const changesLine = s.stage === 'changes' ? `<p class="g-access-desc" data-tone="changes">Visitors see the version from ${s.publishedAgo}.</p>` : '';
    const action = s.busy === 'publish'
      ? btn('primaryLg', 'publish', `${icon('loader-circle', 'size-4 spin')}Publishing`, { cls: 'f-primary', attrs: 'aria-busy="true"' })
      : s.stage === 'published' || s.stage === 'unpublished'
        ? btn('primaryLg', 'done', DOCS_PRIMARY[s.stage], { cls: 'f-primary' })
        : btn('primaryLg', 'publish', `${icon('globe')}${DOCS_PRIMARY[s.stage]}`, { cls: 'f-primary' });
    const copyPill = isLive
      ? `<span class="v-copy-wrap">${btn('outlineLg', 'copy', `${s.copied ? icon('check') : icon('link')}${s.copied ? 'Copied' : 'Copy link'}`, { attrs: `aria-label="${s.copied ? 'Link copied' : 'Copy link'}"` })}${s.copied ? '<span class="v-tip" role="status">Copied</span>' : ''}</span>`
      : '<span></span>';
    return `${titleRow(`Share "${PAGE_TITLE}"`)}
      <div class="g-section">
        <p class="g-heading">General access</p>
        <div class="g-access">
          <span class="g-avatar${isLive ? ' g-avatar--live' : ''}">${icon(isLive ? 'globe' : 'lock')}</span>
          <div class="g-access-body">
            ${menu(s, 'docs', trigger, 'select', accessItems(s, DOCS_WORDS), 'f-menu-wrap--grow')}
            <p class="g-access-desc">${desc}</p>
            ${changesLine}
          </div>
        </div>
      </div>
      ${switchRow(s, 'docs-pw')}
      ${s.confirm ? offConfirm(s) : `<div class="g-foot">${copyPill}${action}</div>`}`;
  }

  const OPTIONS = [
    { id: 'framer', name: 'Framer: Publish popover', app: 'Framer', render: renderFramer, anchor: framerAnchor, popover: true, primary: FRAMER_PRIMARY,
      note: 'A popover under a Publish button, not a dialog. The URL is the link (Framer\'s domain row opens the site) with one copy icon, a "Last published 2h ago" line that turns amber with unpublished changes, and Update as the primary, greyed when up to date. The gear opens Site settings, where Framer keeps Password protection and Unpublish; Unpublish asks first.',
      differs: 'No status band and no password row in the popover, both live behind the gear. The primary while current is a disabled Update, as in Framer, so Copy link is only the icon. The copy icon itself is Clarity\'s addition; Framer has none.',
      tradeoff: 'The lightest chrome of the six and the truest "publish a site" model, but Unpublish and password are two clicks away and a greyed primary in a share surface reads as "nothing to do here".' },
    { id: 'figma', name: 'Figma: Share dialog', app: 'Figma', render: renderFigma, primary: FIGMA_PRIMARY,
      note: 'Figma\'s Share dialog with Figma Sites\' publish fields: invite row, people rows, "Anyone with the link" as a small select with "can view" beside it, then Status and Last published as label and value. Copy link is a text button bottom-left and Publish is the primary in every state that needs one. Choosing "Only invited people" asks first.',
      differs: 'No status band and no URL chip, Figma shows neither; status is the two label rows. When up to date there is no primary at all, only Copy link, as in Figma\'s share modal. The invite row is disabled, Clarity has no invites yet.',
      tradeoff: 'Instantly familiar to anyone who has shared a Figma file, but half the dialog (invite, people) is scaffolding Clarity cannot use, and the URL is nowhere to read or open.' },
    { id: 'docs', name: 'Google Docs: Share dialog', app: 'Google Docs', render: renderDocs, primary: DOCS_PRIMARY,
      note: 'Docs\' Share: the title quotes the page name, "General access" with an avatar, a text-style select (Restricted / Anyone with the link) and one description line, Copy link as an outlined pill bottom-left, Done bottom-right. Password is a row beneath.',
      differs: 'No status band; freshness is one amber line under the access select. The primary is Done when nothing is pending and Publish changes when something is. Copy link is the pill, not the primary.',
      tradeoff: 'The most recognised sharing layout on the web and every control is a plain word, but the URL is nowhere to read and the dialog has no Live word, only "Anyone with the link".' },
    { id: 'band', name: 'Band menu, refined', render: renderBand, primary: PRIMARY,
      note: 'Round three #4 with the link row fixed: the URL is underlined and opens in a new tab, one copy icon beside it, no arrow. The band keeps a small "…" at its right edge with Open in new tab and Unpublish.',
      tradeoff: 'Keeps everything William already approved (band, primary, password row) and the link row now has one icon, but a control inside a status surface is still easy to miss.' },
    { id: 'access', name: 'Access row, refined', render: renderAccess, primary: PRIMARY, recommended: true,
      note: 'Round three #5 rebuilt as the Docs and Figma "General access" block: avatar, a text-style select (Anyone with the link / No one) and one description line. The band below says only whether visitors are up to date, so the two no longer repeat each other.',
      why: 'Recommended. It is the one layout here that is both a known pattern (Docs and Figma call this exact block General access) and keeps every piece William has already signed off on: underlined URL with one copy icon, password as its own row, status band next to the primary. Turning the link off is a choice in a select, which is how Docs and Figma do it, and it asks first.',
      tradeoff: 'Two rows describe access (the select and the band), and the select needs a second look to read as a control, which is also true in Docs.' },
    { id: 'header', name: 'Header menu, fixed', render: renderHeader, primary: PRIMARY,
      note: 'Round three #2 with the "⋮" on the title row at the same height as the X and the title. The link row keeps only the open arrow (the choice made here: arrow, no copy icon). Copy link is the primary while current and a menu item otherwise.',
      tradeoff: 'The cleanest body, and the header "⋮" is where Notion and Linear keep page actions, but with changes pending Copy link is a click deeper and the menu sits far from the band it changes.' },
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
    const shell = opt.popover ? 'grid gap-4 rounded-lg border bg-popover p-4 shadow-lg x-dialog' : 'grid gap-4 rounded-lg border bg-background p-6 shadow-lg x-dialog';
    card.querySelector('[data-dialog]').innerHTML = `${opt.anchor ? `<div class="x-anchor">${opt.anchor(s)}</div>` : ''}<div class="${shell}" role="dialog" aria-label="${opt.name}">
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
        <div class="x-opt-title"><span class="x-opt-num">${i + 1}</span>${opt.name}${opt.app ? `<span class="x-tag x-tag--app">Faithful to ${opt.app}</span>` : ''}${opt.recommended ? '<span class="x-tag x-tag--rec">Recommended</span>' : ''}</div>
        <p class="x-opt-note">${opt.note}</p>
        ${opt.differs ? `<p class="x-opt-differs">${opt.differs}</p>` : ''}
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
    PRIMARY: Object.fromEntries(OPTIONS.map((o) => [o.id, o.primary])),
    plant: PLANT,
    state: (id) => states.get(id),
  };
})();
