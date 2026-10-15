// One state record and one reducer drive both F1 footers; only the footer layout
// differs (opt.footer: 'right' keeps the primary at its own width, bottom right;
// 'full' stretches it under the band).
// state: { open, stage, slug, pwOn, pwSaved, pwDraft, pwShow, publishedAgo,
//          copying, copied, copyError, confirm, busy, menu, focus, announce, preset }
// stage: 'draft' | 'published' | 'changes' | 'unpublished'
// Only the 'publish' action moves stage out of draft or unpublished, and only
// the primary button dispatches it. The access menus cannot. While busy
// (publishing or turning off) every other action is ignored.
// ?plant=<name> renders a known violation so verify.mjs can prove it goes red.
(function () {
  const BTN = window.BTN;
  const PLANT = new URLSearchParams(location.search).get('plant') || '';
  document.body.dataset.plant = PLANT;
  const URL_HOST = 'clarity.video/';
  const URL_MID = 'page';
  const SLUG = 'acme-q4-proposal';
  const LONG_SLUG = 'northwind-renewal-plan';
  const urlOf = (s) => `https://${URL_HOST}${URL_MID}/${s.slug}`;
  const COPY_FAILED = "Couldn't copy. Select the link and copy it.";
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
    ['long-slug', 'Long slug', { stage: 'published', slug: LONG_SLUG }],
  ];
  const BLANK = { open: true, stage: 'draft', slug: SLUG, pwOn: false, pwSaved: '', pwDraft: '', pwShow: false, publishedAgo: '2h ago', copying: false, copied: false, copyError: false, confirm: false, busy: null, menu: false, focus: null, announce: '', preset: 'draft' };

  function presetState(key) {
    const found = PRESETS.find((p) => p[0] === key) || PRESETS[0];
    return { ...BLANK, ...found[2], preset: found[0] };
  }
  const live = (s) => s.stage === 'published' || s.stage === 'changes';
  const isProtected = (s) => s.pwOn && s.pwSaved !== '';

  // Actions that may land while a publish or turn-off is pending.
  const WHILE_BUSY = new Set(['preset', 'publish-done', 'off-done', 'copy-done', 'copy-failed', 'uncopy', 'noop']);
  function reduce(s, act, arg) {
    if (s.busy && !WHILE_BUSY.has(act) && !(PLANT === 'busy-open' && (act === 'menu-open' || act === 'cancel-off' || act === 'pw-toggle'))) return s;
    switch (act) {
      case 'preset': return presetState(arg);
      case 'open': return { ...s, open: true, focus: 'close' };
      case 'close': return PLANT === 'dialog-leaks' ? s : { ...s, open: false, menu: false, confirm: false, focus: 'opener' };
      case 'publish': return s.stage === 'published' ? s : { ...s, busy: 'publish', confirm: false, menu: false, copyError: false, focus: 'primary' };
      case 'publish-done': return { ...s, busy: null, stage: 'published', publishedAgo: 'just now', announce: isProtected(s) ? 'Published. Visitors need the link and the password.' : 'Published. Anyone with the link can open it.' };
      case 'ask-off': return live(s) ? { ...s, confirm: true, menu: false, focus: PLANT === 'focus' ? null : 'cancel' } : s;
      case 'cancel-off': return { ...s, confirm: false, focus: 'access' };
      case 'off': return s.confirm ? { ...s, busy: 'off', focus: 'turn-off' } : s;
      case 'off-done': return { ...s, busy: null, stage: 'unpublished', confirm: false, focus: 'access', announce: 'The link is off.' };
      case 'copy':
        if (!live(s) || s.copying) return s;
        if (PLANT === 'copy-early') return { ...s, copied: true, copyError: false, menu: false, announce: 'Link copied.' };
        return { ...s, copying: true, copied: false, copyError: false, menu: false };
      case 'copy-done': return s.copying ? { ...s, copying: false, copied: true, announce: 'Link copied.' } : s;
      case 'copy-failed': return s.copying ? { ...s, copying: false, copied: false, copyError: true, announce: COPY_FAILED } : s;
      case 'uncopy': return { ...s, copied: false };
      case 'pw-toggle': return s.pwOn ? { ...s, pwOn: false, pwSaved: '', pwDraft: '', pwShow: false, menu: false } : { ...s, pwOn: true, menu: false, focus: 'pw-input' };
      case 'pw-show': return { ...s, pwShow: !s.pwShow, focus: 'pw-show' };
      case 'pw-draft': return { ...s, pwDraft: arg };
      case 'pw-save': return s.pwDraft.trim() === '' ? s : { ...s, pwSaved: s.pwDraft.trim(), pwDraft: s.pwDraft.trim(), focus: 'pw-input', announce: live(s) ? 'Password saved. Everyone with the link needs it now.' : 'Password saved.' };
      case 'menu-open': return s.menu ? s : { ...s, menu: true, focus: 'item-on' };
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
    return `<span class="v-copy-wrap">${btn('ghostIcon', 'copy', s.copied ? icon('check') : icon('copy'), { ...(extra || {}), fk: 'copy-icon', attrs: `aria-label="${copyLabel}" title="${copyLabel}"${s.copying ? ' aria-busy="true"' : ''}` })}${s.copied ? '<span class="v-tip" aria-hidden="true">Copied</span>' : ''}</span>`;
  };

  // The link row: the URL is itself the link (underlined) plus one copy icon
  // in every live state and none otherwise. The path segment shrinks first,
  // so a long slug stays readable on a phone.
  function urlText(s) {
    const mono = PLANT === 'mono' ? ' style="font-family: var(--font-mono)"' : '';
    return `<span class="d-url"${mono}><span class="d-url-host">${URL_HOST}</span><span class="d-url-mid">${URL_MID}</span><span class="d-url-dots" aria-hidden="true">…</span><span class="d-url-sep">/</span><span class="d-url-slug">${s.slug}</span></span>`;
  }
  function linkRow(s) {
    const open = `<a class="${BTN.ghostIcon}" data-button-variant="ghost" href="${urlOf(s)}" target="_blank" rel="noreferrer" aria-label="Open in new tab">${icon('eye-off')}</a>`;
    const chipStyle = PLANT === 'jump' && s.stage === 'changes' ? ' style="padding: 2px"' : '';
    if (!live(s)) {
      return `<div class="d-link"><div class="d-chip d-chip--off"><span class="d-chip-inert">${urlText(s)}</span>${PLANT === 'copy-icon-states' ? copyIcon(s, { disabled: true }) : ''}</div></div>`;
    }
    const showIcon = PLANT === 'copy-icon-states' ? s.stage !== 'published' : true;
    return `<div class="d-link"><div class="d-chip"${chipStyle}><a class="d-chip-url" data-fk="url" href="${urlOf(s)}" target="_blank" rel="noreferrer" title="Open in a new tab">${urlText(s)}<span class="d-sr"> (opens in a new tab)</span></a>${PLANT === 'arrow-copy' ? open : ''}${showIcon ? copyIcon(s) : ''}</div>${s.copyError ? `<p class="p-help p-help--error" data-copy-error>${COPY_FAILED}</p>` : ''}</div>`;
  }

  // Password: the switch opens the field. Protection starts when a password is
  // saved. On a live page the lock-out warning shows before Save.
  function pwHelp(s) {
    const tick = icon('check', 'size-3.5');
    const typed = s.pwDraft.trim() !== '';
    if (s.pwSaved === '') {
      if (live(s) && PLANT !== 'pw-late-warning') {
        return typed
          ? 'Press Save to use this password. Everyone you already sent the link to will need it.'
          : 'Not protected until you save. Everyone you already sent the link to will need the password.';
      }
      return typed ? 'Press Save to use this password.' : 'Not protected until you save a password.';
    }
    if (s.pwDraft.trim() !== s.pwSaved) return 'Press Save to use the new password. Until then the old one works.';
    if (PLANT === 'pw-long-saved') return `${tick}Saved. Visitors need the password now, even those who already have the link.`;
    return live(s) ? `${tick}Saved. Everyone with the link needs it now.` : `${tick}Saved. Visitors will need it once you publish.`;
  }
  const pwNeedsSave = (s) => s.pwSaved === '' || s.pwDraft.trim() !== s.pwSaved;
  function passwordBlock(s, id) {
    const field = s.pwOn ? `<div class="p-field" data-pw-field>
        <input class="${INPUT}" id="${id}-input" data-fk="pw-input" type="${s.pwShow ? 'text' : 'password'}" autocomplete="off" spellcheck="false" aria-label="Password" aria-describedby="${id}-help" placeholder="Set a password" data-act="pw-draft" value="${s.pwDraft}">
        ${btn('ghost', 'pw-show', s.pwShow ? 'Hide' : 'Show', { fk: 'pw-show', attrs: `aria-pressed="${s.pwShow}" data-pw-show` })}
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
  // Once Turn off is pressed, Cancel is disabled: the request is on its way.
  function offConfirm(s, id) {
    const title = PLANT === 'unpublish' ? 'Unpublish this page?' : 'Turn the link off?';
    const action = PLANT === 'unpublish' ? 'Unpublish' : 'Turn off';
    const size = PLANT === 'small-confirm' ? 'Sm' : 'Lg';
    const pending = s.busy === 'off';
    let body = 'People you sent it to will see that the page is unavailable. Your edits stay saved. Publish turns the same link back on with your latest edits.';
    let bodyStyle = '';
    if (PLANT === 'confirm-orphan') {
      const words = body.split(' ');
      body = `<span style="white-space: nowrap">${words.slice(0, -1).join(' ')}</span> ${words[words.length - 1]}`;
      bodyStyle = ' style="text-wrap: wrap; max-width: 24em"';
    }
    return `<div class="d-confirm" role="alertdialog" aria-labelledby="${id}-confirm-title" aria-describedby="${id}-confirm-body" data-confirm-panel${pending ? ' aria-busy="true"' : ''}>
      <p id="${id}-confirm-title"><strong>${title}</strong></p>
      <p class="d-muted" id="${id}-confirm-body"${bodyStyle}>${body}</p>
      <div class="d-confirm-actions">${btn('outline' + size, 'cancel-off', 'Cancel', { fk: 'cancel', disabled: pending && PLANT !== 'busy-open' })}${btn('danger' + size, 'off', `${pending ? icon('loader-circle', 'size-4 spin') : ''}${action}`, { fk: 'turn-off', attrs: pending ? 'aria-busy="true"' : '' })}</div>
    </div>`;
  }

  // Menus imitate the app's DropdownMenu radio items. Two choices. The sub line
  // under the live choice appears only when it adds something (the password).
  const item = (act, label, name, x) => `<button type="button" role="menuitemradio" class="f-item" data-act="${act}" data-fk="${x.fk}" aria-checked="${x.checked}"${x.disabled ? ' aria-disabled="true"' : ''}>${icon(name)}<span class="f-item-body"><span>${label}</span>${x.sub ? `<span class="f-item-sub">${x.sub}</span>` : ''}</span>${x.checked ? icon('check', 'size-4 f-check') : ''}</button>`;
  function accessItems(s, words) {
    const onSub = isProtected(s) ? 'Visitors need the link and the password.' : PLANT === 'restate-sub' ? 'Anyone on the internet with the link' : words.onSub || '';
    return [
      item('menu-close', words.on, 'globe', { fk: 'item-on', checked: true, sub: onSub }),
      item('ask-off', words.off, PLANT === 'two-locks' ? 'lock' : 'link-2-off', { fk: 'item-off', checked: false, sub: 'Turns the link off' }),
    ];
  }
  // Planted only: the old off-state menu, with or without a hidden publish.
  function offItems(words) {
    const publishes = PLANT === 'hidden-publish';
    return [
      item(publishes ? 'publish' : 'noop', words.on, 'globe', { fk: 'item-on', checked: false, disabled: !publishes, sub: 'Publish turns the link back on' }),
      item('menu-close', words.off, 'link-2-off', { fk: 'item-off', checked: true, sub: 'The link is off' }),
    ];
  }
  const plantOffMenu = (s) => s.stage === 'unpublished' && (PLANT === 'off-menu' || PLANT === 'hidden-publish');
  const plantDraftRow = (s) => s.stage === 'draft' && PLANT === 'draft-row';
  const menu = (s, id, trigger, direction, items, wrapCls) => `<span class="f-menu-wrap${wrapCls ? ' ' + wrapCls : ''}">${trigger}${s.menu ? `<div class="f-menu f-menu--${direction}" role="menu" aria-labelledby="${id}-access-label" data-menu>${items.join('')}</div>` : ''}</span>`;
  const labelledBy = (id) => (PLANT === 'noname' ? '' : ` aria-labelledby="${id}-access-label ${id}-access-value"`);

  // Footer: band left, one primary right. The confirm replaces the whole footer.
  function bandInner(s, st, head) {
    const audience = PLANT === 'band-audience' && live(s) ? ' Anyone with the link can open it.' : '';
    let text = st.text + audience;
    let style = '';
    if (PLANT === 'orphan' && s.stage === 'changes') {
      const words = st.text.split(' ');
      text = `<span style="white-space: nowrap">${words.slice(0, -1).join(' ')}</span> ${words[words.length - 1]}`;
      style = ' style="text-wrap: wrap; max-width: 12em"';
    }
    return `${dot(st.tone)}<div class="f-band-body"><p class="f-band-head">${head || `<span class="v-status-word">${st.word}</span>`}</p><p class="f-band-text"${style}>${text}</p></div>`;
  }
  const band = (s, head) => { const st = status(s); return `<div class="f-band" data-tone="${st.tone}">${bandInner(s, st, head)}</div>`; };
  function primary(s) {
    if (s.stage === 'published' && PLANT !== 'primary') {
      return btn('primaryLg', 'copy', `${s.copied ? icon('check') : icon('copy')}${s.copied ? 'Copied' : 'Copy link'}`, { cls: 'f-primary', fk: 'primary', attrs: `aria-label="${s.copied ? 'Link copied' : 'Copy link'}"${s.copying ? ' aria-busy="true"' : ''}` });
    }
    const spinner = s.busy === 'publish' ? icon('loader-circle', 'size-4 spin') : '';
    return btn('primaryLg', 'publish', `${spinner}${PLANT === 'primary' ? 'Publish' : PRIMARY[s.stage]}`, { cls: 'f-primary', fk: 'primary', attrs: s.busy === 'publish' ? 'aria-busy="true"' : '' });
  }
  const footer = (s, bandHtml) => `<div class="f-footer">${bandHtml || band(s)}${primary(s)}</div>`;
  const closeX = () => `<button type="button" class="d-close" data-act="close" data-fk="close" aria-label="Close">${icon('x')}</button>`;
  const titleRow = () => `<div class="d-title-row"><div class="d-title">Share</div>${closeX()}</div>`;
  const bodyAttrs = (s) => (s.confirm || s.busy ? ' inert' : '');
  const plantHeading = () => (PLANT === 'general-access' ? '<p class="d-label">General access</p>' : '');
  const plantMore = (s) => (PLANT === 'more-options' && live(s) ? `<details class="d-row"><summary>More options</summary>${btn('outlineSm', 'ask-off', 'Unpublish')}</details>` : '');
  const plantLinkOn = (s) => (PLANT === 'linkon' ? `<div class="d-row"><label class="d-label">${icon('globe')}Link on</label><button type="button" role="switch" aria-checked="${live(s)}" data-act="${live(s) ? 'ask-off' : 'publish'}" class="${SWITCH}" data-size="default" data-${live(s) ? 'checked' : 'unchecked'}><span class="${THUMB}" data-${live(s) ? 'checked' : 'unchecked'}></span></button></div>` : '');
  const plantRed = () => (PLANT === 'red' ? ' text-destructive' : '');
  const plantOpenInMenu = (s) => (PLANT === 'open-in-menu' ? `<a class="f-item" role="menuitem" href="${urlOf(s)}" target="_blank" rel="noreferrer">${icon('eye-off')}<span>Open in new tab</span></a>` : '');

  const WORDS = { on: 'Anyone with the link', off: 'No one' };

  // F1 Settings rows: label left, the app's Select face right. No row before the
  // first publish; a static "No one" while the link is off.
  function renderF1(s, id) {
    const label = `<span class="d-label" id="${id}-access-label">${icon('globe')}Who can open it</span>`;
    let row = '';
    if (plantDraftRow(s)) {
      row = `<div class="s-row d-row--off">${label}<button type="button" class="s-select" disabled data-access-trigger aria-haspopup="menu" aria-expanded="false"${labelledBy(id)}><span class="s-value" id="${id}-access-value">Not published</span>${icon('chevron-down')}</button></div>`;
    } else if (live(s) || plantOffMenu(s)) {
      const value = live(s) ? WORDS.on : WORDS.off;
      const trigger = `<button type="button" class="s-select${plantRed()}" data-act="menu-open" data-fk="access" data-access-trigger aria-haspopup="menu" aria-expanded="${s.menu}"${labelledBy(id)}><span class="s-value" id="${id}-access-value">${value}</span>${icon('chevron-down')}</button>`;
      const items = live(s) ? accessItems(s, WORDS) : offItems(WORDS);
      if (PLANT === 'open-in-menu') items.push(plantOpenInMenu(s));
      row = `<div class="s-row">${label}${menu(s, id, trigger, 'down-end', items)}</div>`;
    } else if (s.stage === 'unpublished') {
      row = `<div class="s-row">${label}<span class="s-static" id="${id}-access-value" data-access-static>${WORDS.off}</span></div>`;
    }
    return `<div class="d-body"${bodyAttrs(s)}>
      ${titleRow()}
      ${linkRow(s)}
      ${plantHeading()}
      ${row}
      ${passwordBlock(s, id + '-pw')}
      ${plantMore(s)}${plantLinkOn(s)}
    </div>
    ${s.confirm ? offConfirm(s, id) : footer(s)}`;
  }

  const OPTIONS = [
    { id: 'F1a', name: 'Button at the right', footer: 'right', render: renderF1,
      note: 'The status band takes the full width of the dialog. The primary sits under it at its own width, against the right edge, where it has been since round one. On a phone the button fills the width, as before.',
      tradeoff: 'Under the band, left of the button, the footer is empty. With a short label like Copy link the gap is about two thirds of the row.',
      ships: ['<code>Button size="lg"</code> for the primary, right-aligned in a column footer', 'The confirm keeps Cancel and Turn off together at the right edge', 'Phone: the same column footer with the button at full width'] },
    { id: 'F1b', name: 'Button at full width', footer: 'full', render: renderF1,
      note: 'The status band takes the full width of the dialog, and the primary fills the width under it. Desktop and phone are the same layout. In the confirm, Cancel and Turn off split the width.',
      tradeoff: 'A 370px Copy link button is the heaviest thing in a small dialog, and the primary no longer sits bottom right.',
      ships: ['<code>Button size="lg"</code> with <code>w-full</code> for the primary', 'The confirm splits the width between Cancel and Turn off', 'Phone and desktop share one footer'] },
  ];

  const states = new Map();
  const timers = new Map();

  function presetButtons(current) {
    return PRESETS.map(([key, label]) => `<button type="button" class="x-preset" data-act="preset" data-arg="${key}" aria-pressed="${current === key}">${label}</button>`).join('');
  }

  // Open menus flip above the trigger when there is no room below, and stay
  // inside the viewport sideways.
  function placeMenu(card) {
    const menuEl = card.querySelector('[data-menu]');
    const trigger = card.querySelector('[data-access-trigger]');
    if (!menuEl || !trigger) return;
    const margin = 8;
    menuEl.style.maxWidth = `${window.innerWidth - margin * 2}px`;
    const t = trigger.getBoundingClientRect();
    const h = menuEl.getBoundingClientRect().height;
    const roomBelow = window.innerHeight - t.bottom - 4 - margin;
    const roomAbove = t.top - 4 - margin;
    if (PLANT !== 'no-flip' && h > roomBelow && roomAbove > roomBelow) menuEl.classList.add('f-menu--up');
    const r = menuEl.getBoundingClientRect();
    const dx = r.left < margin ? margin - r.left : r.right > window.innerWidth - margin ? window.innerWidth - margin - r.right : 0;
    if (dx) menuEl.style.transform = `translateX(${dx}px)`;
  }

  // The URL keeps every segment whole while it fits. When it does not, the path
  // segment collapses to an ellipsis first; only then may the slug lose its tail.
  // Flex cannot prioritise one item, so this is two measured steps.
  function fitUrl(card) {
    const url = card.querySelector('.d-url');
    if (!url || PLANT === 'slug-cut') return;
    url.classList.remove('d-url--tight');
    if (url.scrollWidth > url.clientWidth) url.classList.add('d-url--tight');
  }
  window.addEventListener('resize', () => { for (const opt of OPTIONS) fitUrl(document.getElementById(opt.id)); });

  // Re-render the dialog, then put focus back: on the element the reducer asked
  // for, else on the element that had it before (matched by data-fk). The live
  // region lives outside the re-rendered subtree and only its text changes.
  function paint(opt) {
    const s = states.get(opt.id);
    const card = document.getElementById(opt.id);
    const active = document.activeElement;
    const prevFk = active && card.contains(active) ? active.dataset.fk : null;
    card.dataset.stage = s.stage;
    card.dataset.open = String(s.open);
    card.dataset.password = String(s.pwOn);
    card.dataset.protected = String(isProtected(s));
    card.dataset.confirm = String(s.confirm);
    card.dataset.busy = String(s.busy || '');
    card.dataset.tone = status(s).tone;
    card.dataset.menuOpen = String(s.menu);
    card.querySelector('[data-presets]').innerHTML = presetButtons(s.preset);
    const plantedRegion = PLANT === 'live-recreate' ? `<span class="d-sr" aria-live="polite" data-announce>${s.announce}</span>` : '';
    card.querySelector('[data-dialog]').innerHTML = s.open ? `<div class="grid gap-4 rounded-lg border bg-background p-6 shadow-lg x-dialog" role="dialog" aria-modal="true" tabindex="-1" data-footer="${opt.footer}" aria-label="Share, ${opt.id} ${opt.name}"${PLANT === 'orange' ? ' style="--y-fill: var(--warning); --y-ink: #b45309"' : ''}>
      ${opt.render(s, opt.id)}${plantedRegion}
    </div>` : '';
    const region = card.querySelector('.x-stage > [data-announce]');
    if (region && region.textContent !== s.announce) region.textContent = s.announce;
    fitUrl(card);
    if (s.menu) placeMenu(card);
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
    if (act === 'copy' && after.copying) {
      const write = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(urlOf(after)) : Promise.reject(new Error('no clipboard'));
      write.then(() => dispatch(opt, 'copy-done'), () => dispatch(opt, 'copy-failed'));
    }
    if ((act === 'copy-done' || act === 'copy') && after.copied) later('uncopy', 1600);
  }

  const grid = document.getElementById('options');
  grid.innerHTML = OPTIONS.map((opt) => `<article class="x-opt" id="${opt.id}" data-option="${opt.id}">
      <div class="x-opt-head">
        <div class="x-opt-title"><span class="x-opt-num">${opt.id}</span>${opt.name}</div>
        <p class="x-opt-note">${opt.note}</p>
        <p class="x-opt-tradeoff">${opt.tradeoff}</p>
        <p class="x-opt-ships-label">What ships</p>
        <ul class="x-opt-ships">${opt.ships.map((line) => `<li>${line}</li>`).join('')}</ul>
      </div>
      <div class="x-side">
        <div class="x-presets" data-presets></div>
        <div class="x-stage">
          ${btn('outline', 'open', `${icon('globe')}Share`, { fk: 'opener', cls: 'x-opener', attrs: 'data-opener' })}
          <div data-dialog style="width:100%;display:flex;flex-direction:column;align-items:center"></div>
          ${PLANT === 'live-recreate' ? '' : '<span class="d-sr" aria-live="polite" data-announce></span>'}
        </div>
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

  const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

  // Keyboard: menus take arrows, Home, End, Escape and Tab; the confirm takes
  // Escape; Escape with nothing open closes the dialog; Tab stays inside the
  // dialog; Enter in the password field saves.
  document.addEventListener('keydown', (event) => {
    const card = event.target.closest && event.target.closest('.x-opt');
    const opt = card && optOf(card);
    const s = opt && states.get(opt.id);
    const dialogEl = card && card.querySelector('[role="dialog"]');
    const inDialog = dialogEl && dialogEl.contains(event.target);
    if (event.key === 'Escape') {
      if (s && s.confirm) { event.preventDefault(); if (!s.busy) dispatch(opt, 'cancel-off'); return; }
      if (s && s.menu) { event.preventDefault(); dispatch(opt, 'menu-close'); return; }
      if (s && s.open && inDialog) { event.preventDefault(); dispatch(opt, 'close'); return; }
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
    if (event.key === 'Tab' && inDialog && PLANT !== 'dialog-leaks') {
      const tabbables = [...dialogEl.querySelectorAll(TABBABLE)].filter((el) => !el.closest('[inert]') && el.getClientRects().length);
      const i = tabbables.indexOf(event.target);
      if (event.shiftKey && i <= 0) { event.preventDefault(); tabbables[tabbables.length - 1].focus(); }
      else if (!event.shiftKey && i === tabbables.length - 1) { event.preventDefault(); tabbables[0].focus(); }
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
    plant: PLANT,
    state: (id) => states.get(id),
    url: (id) => urlOf(states.get(id)),
  };
})();
