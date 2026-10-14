// One state record and one reducer drive all three finals; only render() differs.
// state: { stage, pwOn, pwSaved, pwDraft, publishedAgo, copied, confirm, busy, menu, focus, announce, preset }
// stage: 'draft' | 'published' | 'changes' | 'unpublished'
// Only the 'publish' action moves stage out of draft or unpublished, and only
// the primary button dispatches it. The access menus cannot.
// ?plant=<name> renders a known violation so verify.mjs can prove it goes red.
(function () {
  const BTN = window.BTN;
  const PLANT = new URLSearchParams(location.search).get('plant') || '';
  const URL_HOST = 'clarity.video/';
  const URL_MID = 'page/';
  const URL_SLUG = 'acme-q4-proposal';
  const URL_FULL = `https://${URL_HOST}${URL_MID}${URL_SLUG}`;
  const SWITCH = 'peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[size=default]:h-[18.4px] data-[size=default]:w-[32px] data-checked:bg-primary data-unchecked:bg-input data-disabled:cursor-not-allowed data-disabled:opacity-50';
  const THUMB = 'pointer-events-none block rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=default]/switch:data-unchecked:translate-x-0';
  const INPUT = 'w-full min-w-0 rounded-lg border transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 h-10 border-input bg-transparent px-2.5 py-1 text-base md:text-sm';

  const PRESETS = [
    ['draft', 'Never published', { stage: 'draft' }],
    ['published', 'Live, no changes', { stage: 'published' }],
    ['changes', 'Live with changes', { stage: 'changes' }],
    ['unpublished', 'Off', { stage: 'unpublished' }],
    ['password', 'Password on', { stage: 'published', pwOn: true, pwSaved: 'acme-2026', pwDraft: 'acme-2026' }],
    ['password-changes', 'Password on with changes', { stage: 'changes', pwOn: true, pwSaved: 'acme-2026', pwDraft: 'acme-2026' }],
  ];
  const BLANK = { stage: 'draft', pwOn: false, pwSaved: '', pwDraft: '', publishedAgo: '2h ago', copied: false, confirm: false, busy: null, menu: false, focus: null, announce: '', preset: 'draft' };

  function presetState(key) {
    const found = PRESETS.find((p) => p[0] === key) || PRESETS[0];
    return { ...BLANK, ...found[2], preset: found[0] };
  }
  const live = (s) => s.stage === 'published' || s.stage === 'changes';
  const isProtected = (s) => s.pwOn && s.pwSaved !== '';

  function reduce(s, act, arg) {
    switch (act) {
      case 'preset': return presetState(arg);
      case 'publish': return s.stage === 'published' || s.busy ? s : { ...s, busy: 'publish', confirm: false, menu: false, focus: 'primary' };
      case 'publish-done': return { ...s, busy: null, stage: 'published', publishedAgo: 'just now', announce: 'Published. Anyone with the link can open it.' };
      case 'ask-off': return live(s) ? { ...s, confirm: true, menu: false, focus: PLANT === 'focus' ? null : 'cancel' } : s;
      case 'cancel-off': return { ...s, confirm: false, focus: 'access' };
      case 'off': return { ...s, busy: 'off' };
      case 'off-done': return { ...s, busy: null, stage: 'unpublished', confirm: false, focus: 'access', announce: 'The link is off.' };
      case 'copy': return live(s) ? { ...s, copied: true, menu: false, announce: 'Link copied.' } : s;
      case 'uncopy': return { ...s, copied: false };
      case 'pw-toggle': return s.pwOn ? { ...s, pwOn: false, pwSaved: '', pwDraft: '', menu: false } : { ...s, pwOn: true, menu: false, focus: 'pw-input' };
      case 'pw-draft': return { ...s, pwDraft: arg };
      case 'pw-save': return s.pwDraft.trim() === '' ? s : { ...s, pwSaved: s.pwDraft.trim(), pwDraft: s.pwDraft.trim(), focus: 'pw-input', announce: 'Password saved.' };
      case 'menu-open': return { ...s, menu: true, focus: live(s) ? 'item-on' : 'item-off' };
      case 'menu-close': return s.menu ? { ...s, menu: false, focus: arg === 'keep' ? null : 'access' } : s;
      default: return s;
    }
  }

  // The band's word and tone. Freshness only, never the audience.
  function status(s) {
    return {
      draft: { tone: 'off', word: 'Not published', text: 'Nobody can open it until you publish.' },
      published: { tone: 'live', word: 'Live', text: `Published ${s.publishedAgo}.` },
      changes: { tone: 'changes', word: 'Live', text: `Visitors see the version from ${s.publishedAgo}.` },
      unpublished: { tone: 'off', word: 'Off', text: 'The link is off. Publish to bring it back.' },
    }[s.stage];
  }
  const PRIMARY = { draft: 'Publish', published: 'Copy link', changes: 'Publish changes', unpublished: 'Publish' };

  const icon = (name, cls) => `<svg class="${cls || 'size-4'}" data-icon="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${window.ICONS[name]}</svg>`;
  const variantOf = (kind) => kind.replace(/(Lg|Sm|Icon|IconSm|Inline)$/, '').replace(/^primary$/, 'default');
  const attr = (name, value) => (value === undefined || value === null || value === false ? '' : ` ${name}="${value}"`);
  const btn = (kind, act, label, o) => {
    const x = o || {};
    return `<button type="button" data-slot="button" data-button-variant="${variantOf(kind)}" class="${BTN[kind]}${x.cls ? ' ' + x.cls : ''}" data-act="${act}"${attr('data-fk', x.fk)}${attr('data-arg', x.arg)}${x.disabled ? ' disabled' : ''}${x.attrs ? ' ' + x.attrs : ''}>${label}</button>`;
  };
  const dot = (tone) => `<span class="d-dot d-dot--${tone}"></span>`;
  const copyIcon = (s, extra) => {
    const copyLabel = s.copied ? 'Link copied' : 'Copy link';
    return `<span class="v-copy-wrap">${btn('ghostIcon', 'copy', s.copied ? icon('check') : icon('copy'), { ...(extra || {}), fk: 'copy-icon', attrs: `aria-label="${copyLabel}" title="${copyLabel}"` })}${s.copied ? '<span class="v-tip" aria-hidden="true">Copied</span>' : ''}</span>`;
  };

  // The link row: the URL is itself the link (underlined) plus one copy icon.
  // The slug never truncates; the middle of the path is what shrinks.
  function urlText() {
    const mono = PLANT === 'mono' ? ' style="font-family: var(--font-mono)"' : '';
    return `<span class="d-url"${mono}><span class="d-url-host">${URL_HOST}</span><span class="d-url-mid">${URL_MID}</span><span class="d-url-slug">${URL_SLUG}</span></span>`;
  }
  function linkRow(s, o) {
    const x = o || {};
    const open = `<a class="${BTN.ghostIcon}" data-button-variant="ghost" href="${URL_FULL}" target="_blank" rel="noreferrer" aria-label="Open in new tab">${icon('eye-off')}</a>`;
    if (!live(s)) {
      return `<div class="d-chip d-chip--off"><span class="d-chip-inert">${urlText()}</span>${x.copy === false ? '' : copyIcon(s, { disabled: true })}</div>`;
    }
    return `<div class="d-chip"><a class="d-chip-url" data-fk="url" href="${URL_FULL}" target="_blank" rel="noreferrer" title="Open in a new tab">${urlText()}<span class="d-sr"> (opens in a new tab)</span></a>${PLANT === 'arrow-copy' ? open : ''}${x.copy === false ? '' : copyIcon(s)}</div>`;
  }

  // Password: the switch opens the field. Protection starts when a password is saved.
  function pwHelp(s) {
    if (s.pwSaved === '') return s.pwDraft.trim() === '' ? 'Not protected until you save a password.' : 'Press Save to use this password.';
    if (s.pwDraft.trim() !== s.pwSaved) return 'Press Save to use the new password. Until then the old one works.';
    return live(s)
      ? `${icon('check', 'size-3.5')}Saved. Visitors need the password now, even those who already have the link.`
      : `${icon('check', 'size-3.5')}Saved. Visitors will need the password once you publish.`;
  }
  const pwNeedsSave = (s) => s.pwSaved === '' || s.pwDraft.trim() !== s.pwSaved;
  function passwordBlock(s, id) {
    const field = s.pwOn ? `<div class="p-field" data-pw-field>
        <input class="${INPUT}" id="${id}-input" data-fk="pw-input" type="text" autocomplete="off" spellcheck="false" aria-label="Password" aria-describedby="${id}-help" placeholder="Set a password" data-act="pw-draft" value="${s.pwDraft}">
        ${pwNeedsSave(s) ? btn('outline', 'pw-save', 'Save', { fk: 'pw-save', attrs: 'data-pw-save' }) : ''}
      </div>
      <p class="p-help" id="${id}-help" data-pw-help>${pwHelp(s)}</p>` : '';
    return `<div class="p-block">
      <div class="d-row">
        <label class="d-label" for="${id}">${icon('lock')}Password protected</label>
        <button type="button" role="switch" id="${id}" data-fk="pw-switch" aria-checked="${s.pwOn}" data-act="pw-toggle" data-size="default" data-${s.pwOn ? 'checked' : 'unchecked'} class="${SWITCH}"><span data-${s.pwOn ? 'checked' : 'unchecked'} class="${THUMB}"></span></button>
      </div>${field}</div>`;
  }
  function patchPassword(card, s) {
    const save = card.querySelector('[data-pw-save]');
    const field = card.querySelector('[data-pw-field]');
    if (field && pwNeedsSave(s) && !save) field.insertAdjacentHTML('beforeend', btn('outline', 'pw-save', 'Save', { fk: 'pw-save', attrs: 'data-pw-save' }));
    if (save && !pwNeedsSave(s)) save.remove();
    const help = card.querySelector('[data-pw-help]');
    if (help) help.innerHTML = pwHelp(s);
  }

  // The off confirm. Same size buttons as the primary; focus goes to Cancel.
  function offConfirm(s, id) {
    const title = PLANT === 'unpublish' ? 'Unpublish this page?' : 'Turn the link off?';
    const action = PLANT === 'unpublish' ? 'Unpublish' : 'Turn off';
    const size = PLANT === 'small-confirm' ? 'Sm' : 'Lg';
    return `<div class="d-confirm" role="alertdialog" aria-labelledby="${id}-confirm-title" aria-describedby="${id}-confirm-body" data-confirm-panel>
      <p id="${id}-confirm-title"><strong>${title}</strong></p>
      <p class="d-muted" id="${id}-confirm-body">People you sent it to will see that the page is unavailable. Your edits stay saved. Publish turns the same link back on with your latest edits.</p>
      <div class="d-confirm-actions">${btn('outline' + size, 'cancel-off', 'Cancel', { fk: 'cancel' })}${btn('danger' + size, 'off', `${s.busy === 'off' ? icon('loader-circle', 'size-4 spin') : ''}${action}`, { fk: 'turn-off', attrs: s.busy === 'off' ? 'aria-busy="true"' : '' })}</div>
    </div>`;
  }

  // Menus imitate the app's DropdownMenu radio items. Two choices, each with a
  // sub line that knows about the password. The "on" choice is disabled while
  // the link is off: Publish is the only way back on.
  const item = (act, label, name, x) => `<button type="button" role="menuitemradio" class="f-item" data-act="${act}" data-fk="${x.fk}" aria-checked="${x.checked}"${x.disabled ? ' aria-disabled="true"' : ''}>${icon(name)}<span class="f-item-body"><span>${label}</span>${x.sub ? `<span class="f-item-sub">${x.sub}</span>` : ''}</span>${x.checked ? icon('check', 'size-4 f-check') : ''}</button>`;
  function accessItems(s, words) {
    const isLive = live(s);
    const onSub = isLive
      ? (isProtected(s) ? 'Anyone with the link and the password' : 'Anyone on the internet with the link')
      : 'Publish turns the link back on';
    const hiddenPublish = PLANT === 'hidden-publish' && !isLive;
    return [
      item(isLive ? 'menu-close' : hiddenPublish ? 'publish' : 'noop', words.on, 'globe', { fk: 'item-on', checked: isLive, disabled: !isLive && !hiddenPublish, sub: onSub }),
      item(isLive ? 'ask-off' : 'menu-close', words.off, PLANT === 'two-locks' ? 'lock' : 'link-2-off', { fk: 'item-off', checked: !isLive, sub: isLive ? 'Turns the link off' : 'The link is off' }),
    ];
  }
  const menu = (s, id, trigger, direction, items, wrapCls) => `<span class="f-menu-wrap${wrapCls ? ' ' + wrapCls : ''}">${trigger}${s.menu ? `<div class="f-menu f-menu--${direction}" role="menu" aria-labelledby="${id}-access-label" data-menu>${items.join('')}</div>` : ''}</span>`;
  const labelledBy = (id) => (PLANT === 'noname' ? '' : ` aria-labelledby="${id}-access-label ${id}-access-value"`);

  // Footer: band left, one primary right. The confirm replaces the whole footer.
  function bandInner(s, st) {
    const audience = PLANT === 'band-audience' && live(s) ? ' Anyone with the link can open it.' : '';
    let text = st.text + audience;
    let style = '';
    if (PLANT === 'orphan' && s.stage === 'changes') {
      const words = st.text.split(' ');
      text = `<span style="white-space: nowrap">${words.slice(0, -1).join(' ')}</span> ${words[words.length - 1]}`;
      style = ' style="text-wrap: wrap; max-width: 12em"';
    }
    return `${dot(st.tone)}<div class="f-band-body"><p class="f-band-head"><span class="v-status-word">${st.word}</span></p><p class="f-band-text"${style}>${text}</p></div>`;
  }
  const band = (s) => { const st = status(s); return `<div class="f-band" data-tone="${st.tone}" role="status">${bandInner(s, st)}</div>`; };
  function primary(s) {
    if (s.stage === 'published' && PLANT !== 'primary') {
      return btn('primaryLg', 'copy', `${s.copied ? icon('check') : icon('copy')}${s.copied ? 'Copied' : 'Copy link'}`, { cls: 'f-primary', fk: 'primary', attrs: `aria-label="${s.copied ? 'Link copied' : 'Copy link'}"` });
    }
    const spinner = s.busy === 'publish' ? icon('loader-circle', 'size-4 spin') : '';
    return btn('primaryLg', 'publish', `${spinner}${PLANT === 'primary' ? 'Publish' : PRIMARY[s.stage]}`, { cls: 'f-primary', fk: 'primary', attrs: s.busy === 'publish' ? 'aria-busy="true"' : '' });
  }
  const footer = (s, bandHtml) => `<div class="f-footer">${bandHtml || band(s)}${primary(s)}</div>`;
  const closeX = () => `<button type="button" class="d-close" data-act="noop" data-fk="close" aria-label="Close">${icon('x')}</button>`;
  const titleRow = () => `<div class="d-title-row"><div class="d-title">Share</div>${closeX()}</div>`;
  const plantHeading = () => (PLANT === 'general-access' ? '<p class="d-label">General access</p>' : '');
  const plantMore = (s) => (PLANT === 'more-options' && live(s) ? `<details class="d-row"><summary>More options</summary>${btn('outlineSm', 'ask-off', 'Unpublish')}</details>` : '');
  const plantLinkOn = (s) => (PLANT === 'linkon' ? `<div class="d-row"><label class="d-label">${icon('globe')}Link on</label><button type="button" role="switch" aria-checked="${live(s)}" data-act="${live(s) ? 'ask-off' : 'publish'}" class="${SWITCH}" data-size="default" data-${live(s) ? 'checked' : 'unchecked'}><span class="${THUMB}" data-${live(s) ? 'checked' : 'unchecked'}></span></button></div>` : '');
  const plantRed = () => (PLANT === 'red' ? ' text-destructive' : '');
  const plantOpenInMenu = () => (PLANT === 'open-in-menu' ? `<a class="f-item" role="menuitem" href="${URL_FULL}" target="_blank" rel="noreferrer">${icon('eye-off')}<span>Open in new tab</span></a>` : '');

  const WORDS = { on: 'Anyone with the link', off: 'No one' };

  // F1 Settings rows: label left, the app's Select face right. Disabled before the first publish.
  function renderF1(s, id) {
    const draft = s.stage === 'draft';
    const value = draft ? 'Not published' : live(s) ? WORDS.on : WORDS.off;
    const trigger = `<button type="button" class="s-select${plantRed()}" data-act="menu-open" data-fk="access" data-access-trigger aria-haspopup="menu" aria-expanded="${s.menu}"${labelledBy(id)}${draft ? ' disabled' : ''}><span class="s-value" id="${id}-access-value">${value}</span>${icon('chevron-down')}</button>`;
    const items = accessItems(s, WORDS);
    if (PLANT === 'open-in-menu') items.push(plantOpenInMenu());
    return `<div class="d-body"${s.confirm ? ' inert' : ''}>
      ${titleRow()}
      ${linkRow(s)}
      ${plantHeading()}
      <div class="s-row${draft ? ' d-row--off' : ''}">
        <span class="d-label" id="${id}-access-label">${icon('globe')}Who can open it</span>
        ${menu(s, id, trigger, 'down-end', items)}
      </div>
      ${passwordBlock(s, id + '-pw')}
      ${plantMore(s)}${plantLinkOn(s)}
    </div>
    ${s.confirm ? offConfirm(s, id) : footer(s)}`;
  }

  // F2 Status is the switch: the whole band is the trigger while the link is live.
  function renderF2(s, id) {
    const st = status(s);
    let foot;
    if (!live(s)) foot = footer(s);
    else {
      const trigger = `<button type="button" class="f-band${plantRed()}" data-tone="${st.tone}" data-act="menu-open" data-fk="access" data-access-trigger aria-haspopup="menu" aria-expanded="${s.menu}"${labelledBy(id)}>${bandInner(s, st)}${icon('chevron-down', 'size-4 f-band-chev')}</button>`;
      const items = accessItems(s, { on: 'Live', off: 'Off' });
      if (PLANT === 'open-in-menu') items.push(plantOpenInMenu());
      foot = footer(s, menu(s, id, trigger, 'band', items, 'f-menu-wrap--band'));
    }
    return `<div class="d-body"${s.confirm ? ' inert' : ''}>
      ${titleRow()}
      ${linkRow(s)}
      ${plantHeading()}
      ${passwordBlock(s, id + '-pw')}
      ${plantMore(s)}${plantLinkOn(s)}
      <span class="d-sr" id="${id}-access-label">Who can open it</span>
      <span class="d-sr" id="${id}-access-value">${st.word}, ${st.text}</span>
    </div>
    ${s.confirm ? offConfirm(s, id) : foot}`;
  }

  // F3 Inline access: one row shaped like the password row, hidden before the first publish.
  function renderF3(s, id) {
    const draft = s.stage === 'draft';
    const trigger = `<button type="button" class="t-select${plantRed()}" data-act="menu-open" data-fk="access" data-access-trigger aria-haspopup="menu" aria-expanded="${s.menu}"${labelledBy(id)}>${icon(live(s) ? 'globe' : PLANT === 'two-locks' ? 'lock' : 'link-2-off')}<span id="${id}-access-value">${live(s) ? WORDS.on : WORDS.off}</span>${icon('chevron-down', 'size-4 t-chev')}</button>`;
    const items = accessItems(s, WORDS);
    if (PLANT === 'open-in-menu') items.push(plantOpenInMenu());
    return `<div class="d-body"${s.confirm ? ' inert' : ''}>
      ${titleRow()}
      ${linkRow(s, { copy: s.stage !== 'published' })}
      ${plantHeading()}
      ${draft ? '' : `<div class="d-row"><span class="d-sr" id="${id}-access-label">Who can open it</span>${menu(s, id, trigger, 'down-start', items)}</div>`}
      ${passwordBlock(s, id + '-pw')}
      ${plantMore(s)}${plantLinkOn(s)}
    </div>
    ${s.confirm ? offConfirm(s, id) : footer(s)}`;
  }

  const OPTIONS = [
    { id: 'F1', name: 'Settings rows', render: renderF1, recommended: true,
      note: 'Link row, then two settings rows that share one left edge: "Who can open it" with the app\'s Select on the right, and "Password protected" with its switch. The band and the primary close the dialog. Borrows the label-left, control-right settings list from Framer and Webflow, the "Anyone with the link" words from Google Docs, and the last-published line from Framer. Before the first publish the select is disabled and reads "Not published".',
      why: 'The only final where the way to turn the link off is a control that looks like one, sits where settings live, and never says anything twice. The row grammar is the same as the password row, so nothing lines up wrong.',
      tradeoff: 'The select is the widest control in the dialog. On a phone it drops under its label, so the sheet is one line taller than F2 or F3.',
      ships: ['<code>Select</code>, <code>SelectTrigger</code> (default size) with the row label as its <code>aria-labelledby</code>, <code>SelectContent</code> and two <code>SelectItem</code>s with a sub line', '<code>Switch</code> with <code>Label</code>, <code>Input</code> plus <code>Button variant="outline"</code> for Save', '<code>Button size="lg"</code> for the primary; <code>outline</code> and <code>danger</code> at <code>lg</code> for the confirm', 'Both copy controls while live: the <code>ghost icon</code> button in the link row and the primary Copy link'] },
    { id: 'F2', name: 'Status is the switch', render: renderF2,
      note: 'Round four\'s clean #6 body, no extra row. While the link is live the whole band is the dropdown trigger, 40px tall with a chevron at its right edge. The choices are Live and Off. Before the first publish and while off there is nothing to choose, so the band is plain. Borrows Framer\'s last-published line; the status-as-control idea has no single big-app source.',
      tradeoff: 'The band is a status and a control at once, so the chevron and hover fill are what make it findable. Nothing in the dialog says "Anyone with the link" at rest; the menu does.',
      ships: ['<code>DropdownMenu</code> with the band as a <code>Button variant="ghost"</code> trigger, <code>DropdownMenuRadioGroup</code> with two <code>DropdownMenuRadioItem</code>s and a sub line', '<code>Switch</code> with <code>Label</code>, <code>Input</code> plus <code>Button variant="outline"</code> for Save', '<code>Button size="lg"</code> for the primary; <code>outline</code> and <code>danger</code> at <code>lg</code> for the confirm', 'A polite live region that announces Published, The link is off, and Link copied, since the band itself is a button'] },
    { id: 'F3', name: 'Inline access', render: renderF3,
      note: 'The access choice as one row in the shape of the password row: a 16px icon in the lock\'s column, "Anyone with the link" as a text select with a chevron. No avatar, no heading, no caption; the band carries freshness. Hidden before the first publish. Borrows Figma\'s share dialog row, where the audience is a text dropdown, and the Docs words.',
      tradeoff: 'A borderless text select can pass for static text. The chevron and the hover fill are its only tells. The copy icon shows only while the primary is not Copy link, so the live, no-changes state has one copy control.',
      ships: ['<code>DropdownMenu</code> with a <code>Button variant="ghost"</code> trigger (icon, value, chevron), <code>DropdownMenuRadioGroup</code> with two <code>DropdownMenuRadioItem</code>s and a sub line', '<code>Switch</code> with <code>Label</code>, <code>Input</code> plus <code>Button variant="outline"</code> for Save', '<code>Button size="lg"</code> for the primary; <code>outline</code> and <code>danger</code> at <code>lg</code> for the confirm', 'The link-row copy icon only while the primary is Publish or Publish changes'] },
  ];

  const states = new Map();
  const timers = new Map();

  function presetButtons(current) {
    return PRESETS.map(([key, label]) => `<button type="button" class="x-preset" data-act="preset" data-arg="${key}" aria-pressed="${current === key}">${label}</button>`).join('');
  }

  // Re-render the dialog, then put focus back: on the element the reducer asked
  // for, else on the element that had it before (matched by data-fk).
  function paint(opt) {
    const s = states.get(opt.id);
    const card = document.getElementById(opt.id);
    const active = document.activeElement;
    const prevFk = active && card.contains(active) ? active.dataset.fk : null;
    card.dataset.stage = s.stage;
    card.dataset.password = String(s.pwOn);
    card.dataset.protected = String(isProtected(s));
    card.dataset.confirm = String(s.confirm);
    card.dataset.tone = status(s).tone;
    card.dataset.menuOpen = String(s.menu);
    card.querySelector('[data-presets]').innerHTML = presetButtons(s.preset);
    card.querySelector('[data-dialog]').innerHTML = `<div class="grid gap-4 rounded-lg border bg-background p-6 shadow-lg x-dialog" role="dialog" aria-label="${opt.id} ${opt.name}"${PLANT === 'orange' ? ' style="--y-fill: var(--warning); --y-ink: #b45309"' : ''}>
      ${opt.render(s, opt.id)}
      <span class="d-sr" aria-live="polite" data-announce>${s.announce}</span>
    </div>`;
    const want = s.focus || prevFk;
    if (want) {
      const el = card.querySelector(`[data-fk="${want}"]`) || (want === 'access' ? card.querySelector('[data-fk="primary"]') : null);
      if (el) el.focus({ preventScroll: true });
    }
    if (s.focus) states.set(opt.id, { ...s, focus: null });
  }

  function dispatch(opt, act, arg) {
    const before = states.get(opt.id);
    const after = reduce(before, act, arg);
    states.set(opt.id, after);
    if (act === 'pw-draft') { patchPassword(document.getElementById(opt.id), after); return; }
    if (after === before && act !== 'noop') return;
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
  }

  const grid = document.getElementById('options');
  grid.innerHTML = OPTIONS.map((opt) => `<article class="x-opt" id="${opt.id}" data-option="${opt.id}">
      <div class="x-opt-head">
        <div class="x-opt-title"><span class="x-opt-num">${opt.id}</span>${opt.name}${opt.recommended ? '<span class="x-tag x-tag--rec">Recommended</span>' : ''}</div>
        <p class="x-opt-note">${opt.note}</p>
        <p class="x-opt-tradeoff">${opt.tradeoff}</p>
        ${opt.why ? `<p class="x-opt-why">${opt.why}</p>` : ''}
        <p class="x-opt-ships-label">What ships</p>
        <ul class="x-opt-ships">${opt.ships.map((line) => `<li>${line}</li>`).join('')}</ul>
      </div>
      <div class="x-side">
        <div class="x-presets" data-presets></div>
        <div class="x-stage"><div data-dialog style="width:100%;display:flex;flex-direction:column;align-items:center"></div></div>
      </div>
    </article>`).join('');

  const globalPresets = document.querySelector('[data-global-presets]');
  globalPresets.innerHTML = presetButtons('changes');

  for (const opt of OPTIONS) {
    states.set(opt.id, presetState('changes'));
    paint(opt);
  }

  const optOf = (el) => OPTIONS.find((o) => o.id === el.closest('.x-opt').id);
  function closeMenusExcept(keepCard) {
    for (const opt of OPTIONS) {
      if (opt.id === keepCard) continue;
      if (states.get(opt.id).menu) dispatch(opt, 'menu-close', 'keep');
    }
  }

  document.addEventListener('click', (event) => {
    const control = event.target.closest('[data-act]');
    const inMenu = event.target.closest('[data-menu], [data-act="menu-open"]');
    // Read the control before closing menus: a repaint detaches it.
    const card = control && control.closest('.x-opt');
    const act = control && control.dataset.act;
    const arg = control && control.dataset.arg;
    const isGlobal = control && control.closest('[data-global-presets]');
    closeMenusExcept(inMenu ? inMenu.closest('.x-opt').id : null);
    if (!control || control.tagName === 'INPUT') return;
    if (control.getAttribute('aria-disabled') === 'true') return;
    if (isGlobal) {
      globalPresets.innerHTML = presetButtons(arg);
      for (const opt of OPTIONS) dispatch(opt, 'preset', arg);
      return;
    }
    const opt = OPTIONS.find((o) => o.id === card.id);
    if (act === 'menu-open' && states.get(opt.id).menu) { dispatch(opt, 'menu-close'); return; }
    dispatch(opt, act, arg);
  });

  // Keyboard: menus take arrows, Home, End, Escape and Tab; the confirm takes
  // Escape and keeps Tab inside its two buttons; Enter in the password field saves.
  document.addEventListener('keydown', (event) => {
    const card = event.target.closest && event.target.closest('.x-opt');
    const opt = card && optOf(card);
    const s = opt && states.get(opt.id);
    if (event.key === 'Escape') {
      if (s && s.confirm) { event.preventDefault(); dispatch(opt, 'cancel-off'); return; }
      if (s && s.menu) { event.preventDefault(); dispatch(opt, 'menu-close'); return; }
      closeMenusExcept(null);
      return;
    }
    if (!opt) return;
    const menuEl = event.target.closest('[data-menu]');
    if (menuEl) {
      const items = [...menuEl.querySelectorAll('[role="menuitemradio"], [role="menuitem"]')];
      const i = items.indexOf(event.target);
      const go = (n) => { event.preventDefault(); items[(n + items.length) % items.length].focus(); };
      if (event.key === 'ArrowDown') return go(i + 1);
      if (event.key === 'ArrowUp') return go(i - 1);
      if (event.key === 'Home') return go(0);
      if (event.key === 'End') return go(items.length - 1);
      if (event.key === 'Tab') { event.preventDefault(); dispatch(opt, 'menu-close'); }
      return;
    }
    if (event.target.matches('[data-act="menu-open"]') && (event.key === 'ArrowDown' || event.key === 'ArrowUp') && !s.menu) {
      event.preventDefault(); dispatch(opt, 'menu-open'); return;
    }
    const confirmEl = event.target.closest('[data-confirm-panel]');
    if (confirmEl && event.key === 'Tab') {
      const buttons = [...confirmEl.querySelectorAll('button')];
      const i = buttons.indexOf(event.target);
      if (event.shiftKey && i === 0) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
      else if (!event.shiftKey && i === buttons.length - 1) { event.preventDefault(); buttons[0].focus(); }
      return;
    }
    if (event.target.matches('input[data-act="pw-draft"]') && event.key === 'Enter') { event.preventDefault(); dispatch(opt, 'pw-save'); }
  });
  document.addEventListener('input', (event) => {
    const control = event.target.closest('input[data-act="pw-draft"]');
    if (!control) return;
    dispatch(optOf(control), 'pw-draft', control.value);
  });
  window.__proto = {
    OPTIONS: OPTIONS.map((o) => o.id),
    PRESETS: PRESETS.map((p) => p[0]),
    PRIMARY,
    URL_FULL,
    plant: PLANT,
    state: (id) => states.get(id),
  };
})();
