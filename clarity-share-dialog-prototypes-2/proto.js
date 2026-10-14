// One state record and one reducer drive every variation; only render() differs.
// state: { stage, password, pw, publishedAgo, copied, confirm, busy, preset }
// stage: 'draft' | 'published' | 'changes' | 'unpublished'
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
  const BLANK = { stage: 'draft', password: false, pw: '', publishedAgo: '2h ago', copied: false, confirm: false, busy: null, preset: 'draft' };

  function presetState(key) {
    const found = PRESETS.find((p) => p[0] === key) || PRESETS[0];
    return { ...BLANK, ...found[2], preset: found[0] };
  }
  const live = (s) => s.stage === 'published' || s.stage === 'changes';

  function reduce(s, act, arg) {
    switch (act) {
      case 'preset': return presetState(arg);
      case 'publish': return s.stage === 'published' ? s : { ...s, busy: 'publish', confirm: false };
      case 'publish-done': return { ...s, busy: null, stage: 'published', publishedAgo: 'just now' };
      case 'ask-off': return live(s) ? { ...s, confirm: true } : s;
      case 'cancel-off': return { ...s, confirm: false };
      case 'off': return { ...s, busy: 'off', confirm: false };
      case 'off-done': return { ...s, busy: null, stage: 'unpublished', confirm: false };
      case 'copy': return live(s) ? { ...s, copied: true } : s;
      case 'uncopy': return { ...s, copied: false };
      case 'password': return { ...s, password: !s.password };
      case 'pw': return { ...s, pw: arg };
      default: return s;
    }
  }

  // What every variation says. tone drives colour: live = green, changes = amber, off = grey.
  function status(s) {
    return {
      draft: { tone: 'off', word: 'Not published', text: 'Nobody can open the link until you publish.' },
      published: { tone: 'live', word: 'Live', text: s.password ? 'Anyone with the link and the password can open this page.' : 'Anyone with the link can open this page.' },
      changes: { tone: 'changes', word: 'Live', text: `Visitors see the version from ${s.publishedAgo}.` },
      unpublished: { tone: 'off', word: 'Off', text: 'The link no longer opens. Publish turns it back on.' },
    }[s.stage];
  }
  const ACTION = { draft: 'Publish', changes: 'Publish changes', unpublished: 'Publish', published: null };

  const icon = (name, cls) => `<svg class="${cls || 'size-4'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${window.ICONS[name]}</svg>`;
  // index.css declares the button faces on [data-button-variant]; without it
  // the primary gradient has no fill and renders white.
  const variantOf = (kind) => kind.replace(/(Lg|Sm|Icon|IconSm|Inline)$/, '').replace(/^primary$/, 'default');
  const btn = (kind, act, label, extra) => `<button type="button" data-slot="button" data-button-variant="${variantOf(kind)}" class="${BTN[kind]}${extra && extra.cls ? ' ' + extra.cls : ''}" data-act="${act}"${extra && extra.arg !== undefined ? ` data-arg="${extra.arg}"` : ''}${extra && extra.disabled ? ' disabled' : ''}${extra && extra.attrs ? ' ' + extra.attrs : ''}>${label}</button>`;
  const busyIcon = (s, kind, name) => (s.busy === kind ? icon('loader-circle', 'size-4 spin') : icon(name));
  const publishBtn = (s, label) => btn('primaryLg', 'publish', `${busyIcon(s, 'publish', 'globe')}${label}`, { attrs: s.busy === 'publish' ? 'aria-busy="true"' : '' });
  const dot = (tone) => `<span class="d-dot d-dot--${tone}"></span>`;

  // The link row from the original dialog: URL, open arrow, copy icon.
  // opts.dot puts the status dot inside the row; opts.lock adds a password toggle.
  function chip(s, opts) {
    const o = opts || {};
    const isLive = live(s);
    const st = status(s);
    const copyLabel = s.copied ? 'Link copied' : 'Copy link';
    return `<div class="d-chip${isLive ? '' : ' d-chip--off'}">
      ${o.dot ? dot(st.tone) : ''}
      ${isLive
        ? `<a href="${URL_FULL}" target="_blank" rel="noreferrer" aria-label="Open this Journey Page in a new tab"><span class="mono">${URL_SHOWN}</span>${icon('arrow-up-right', 'size-4 shrink-0 text-muted-foreground')}</a>`
        : `<span class="d-chip-inert" aria-label="Journey Page share link"><span class="mono">${URL_SHOWN}</span></span>`}
      ${o.lock ? btn('ghostIcon', 'password', icon('lock'), { attrs: `aria-pressed="${s.password}" aria-label="${s.password ? 'Password on' : 'Password off'}" title="${s.password ? 'Password on' : 'Require a password'}"`, cls: s.password ? 'v-lock v-lock--on' : 'v-lock' }) : ''}
      <span class="v-copy-wrap">${btn('ghostIcon', 'copy', s.copied ? icon('check') : icon('copy'), { disabled: !isLive, attrs: `aria-label="${copyLabel}" title="${copyLabel}"` })}${s.copied ? '<span class="v-tip" role="status">Copied</span>' : ''}</span>
    </div>`;
  }
  const pwInput = (s) => `<input class="${INPUT} d-pw" aria-label="Page password" placeholder="Set a password" data-act="pw" value="${s.pw}">`;
  function switchRow(s, id, label) {
    return `<div class="d-row">
      <label class="d-label" for="${id}">${icon('lock')}${label || 'Password protected'}</label>
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
  // Three Unpublish faces. All are full-size buttons; none sits next to Publish.
  const UNPUB = {
    outline: (s) => btn('outlineLg', 'ask-off', 'Unpublish'),
    ghost: (s) => btn('destructiveLg', 'ask-off', 'Unpublish', { cls: 'v-nudge' }),
    redline: (s) => btn('outlineLg', 'ask-off', 'Unpublish', { cls: 'v-unpub-redline' }),
  };
  const upToDate = () => `<span class="v-uptodate">${icon('check', 'size-4')}Up to date</span>`;
  // Unpublish left, Publish right. The confirm replaces the whole footer.
  function footer(s, unpub) {
    if (s.confirm) return offConfirm(s);
    const action = ACTION[s.stage];
    return `<div class="v-footer">
      ${live(s) ? UNPUB[unpub](s) : '<span></span>'}
      ${action ? publishBtn(s, action) : upToDate()}
    </div>`;
  }
  const statusLine = (s) => {
    const st = status(s);
    return `<div class="v-status" data-tone="${st.tone}">${dot(st.tone)}<span class="v-status-word">${st.word}</span><span class="v-status-sep">·</span><span class="v-status-text">${st.text}</span></div>`;
  };
  const caption = (s) => {
    const st = status(s);
    return `<p class="v-caption" data-tone="${st.tone}"><span class="v-status-word">${st.word}</span> · ${st.text}</p>`;
  };

  // 1 Status line
  function render1(s) {
    return `${statusLine(s)}
      ${chip(s)}
      ${switchRow(s, 'v1-pw')}
      ${footer(s, 'outline')}`;
  }

  // 2 Dot in the row
  function render2(s) {
    return `${chip(s, { dot: true, lock: true })}
      ${caption(s)}
      ${s.password ? `<div class="v-pw-under"><label class="d-label d-small" for="v2-pw">${icon('lock')}Password</label><input id="v2-pw" class="${INPUT} d-pw" aria-label="Page password" placeholder="Set a password" data-act="pw" value="${s.pw}"></div>` : ''}
      ${footer(s, 'ghost')}`;
  }

  // 3 Header pill
  function render3(s) {
    const st = status(s);
    return `${chip(s)}
      <p class="v-caption" data-tone="${st.tone}">${st.text}</p>
      ${switchRow(s, 'v3-pw')}
      ${footer(s, 'redline')}`;
  }
  const headerPill = (s) => {
    const st = status(s);
    return `<span class="v-pill" data-tone="${st.tone}">${dot(st.tone)}<span class="v-status-word">${st.word}</span></span>`;
  };

  // 4 Tinted band
  function render4(s) {
    const st = status(s);
    return `<div class="v-band" data-tone="${st.tone}">
        ${dot(st.tone)}
        <div><p class="v-band-head"><span class="v-status-word">${st.word}</span></p><p class="v-band-text">${st.text}</p></div>
      </div>
      ${chip(s)}
      ${switchRow(s, 'v4-pw')}
      ${footer(s, 'outline')}`;
  }

  // 5 Settings footer
  function render5(s) {
    return `${statusLine(s)}
      ${chip(s)}
      <div class="v-settings">${switchRow(s, 'v5-pw', 'Password')}</div>
      ${footer(s, 'ghost')}`;
  }

  // 6 Off section
  function render6(s) {
    const st = status(s);
    const isLive = live(s);
    const action = ACTION[s.stage];
    return `${chip(s, { dot: true })}
      ${st.tone === 'changes'
        ? `<div class="v-band v-band--tight" data-tone="changes">${dot('changes')}<p class="v-band-text"><span class="v-status-word">Live</span> · ${st.text}</p></div>`
        : caption(s)}
      ${switchRow(s, 'v6-pw')}
      ${isLive ? `<div class="v-offrow">${s.confirm ? offConfirm(s) : `<p class="d-small d-muted">Turn the link off for everyone.</p>${UNPUB.redline(s)}`}</div>` : ''}
      <div class="v-footer v-footer--end">${action ? publishBtn(s, action) : upToDate()}</div>`;
  }

  // Reference: round one, option 3 ("Link first"), unchanged.
  function renderRef(s) {
    const isLive = live(s);
    const text = {
      draft: 'Not live yet. Only you can open this link.',
      published: s.password ? `Live · password required · published ${s.publishedAgo}` : `Live · published ${s.publishedAgo}`,
      changes: `Live · visitors see the version from ${s.publishedAgo}`,
      unpublished: 'Off. Nobody can open this link.',
    }[s.stage];
    return `<div class="o3-hero"${isLive ? '' : ` data-off="${s.stage}"`}>
        <div class="o3-url">${icon('link', 'size-4 shrink-0 text-muted-foreground')}<a href="${URL_FULL}" target="_blank" rel="noreferrer">${URL_SHOWN}</a></div>
        <div class="o3-status"><span class="d-dot${isLive ? ' d-dot--live' : ''}"></span>${text}</div>
        <div class="o3-actions">
          ${btn('outline', 'copy', `${s.copied ? icon('check') : icon('copy')}${s.copied ? 'Copied' : 'Copy link'}`, { disabled: !isLive })}
          ${!isLive ? btn('primary', 'publish', `${busyIcon(s, 'publish', 'globe')}Publish`) : ''}
        </div>
      </div>
      ${s.stage === 'changes' ? `<div class="o3-edits"><p>${icon('pencil-line', 'size-4 d-inline-icon')}<strong>3 edits</strong> visitors can't see yet.</p>${btn('primary', 'publish', `${busyIcon(s, 'publish', 'globe')}Publish changes`)}</div>` : ''}
      ${switchRow(s, 'ref-pw', 'Password')}
      ${s.confirm ? `<div class="d-confirm" role="group" aria-label="Stop sharing?"><p><strong>Stop sharing?</strong></p><p class="d-muted">The link stops working for everyone you sent it to. Publish turns it back on.</p><div class="d-footer">${btn('outlineSm', 'cancel-off', 'Cancel')}${btn('dangerSm', 'off', 'Stop sharing')}</div></div>`
        : isLive ? `<div>${btn('destructiveSm', 'ask-off', 'Stop sharing', { cls: 'v-nudge' })}</div>` : ''}`;
  }

  const OPTIONS = [
    { id: 'v1', name: 'Status line', render: render1,
      note: 'A dot and one line above the link. Amber is the text colour. Unpublish is a neutral outline button bottom left, password is a switch row under the link.',
      tradeoff: 'Quietest and closest to the old dialog, but amber text alone is the softest warning of the six.' },
    { id: 'v2', name: 'Dot in the row', render: render2,
      note: 'The status dot sits inside the link row, with a caption under it. The lock is a toggle in the row next to copy. Unpublish is the app\'s red-text destructive face, full size.',
      tradeoff: 'Most compact, but the lock icon is a hidden control and the red-text Unpublish still reads like a link at rest.' },
    { id: 'v3', name: 'Header pill', render: render3, pill: true,
      note: 'The status is a pill beside "Share". The sentence under the link turns amber with it. Unpublish is a red outline button.',
      tradeoff: 'Status reads at a glance even before the link, but the pill and the sentence are two places saying one thing.' },
    { id: 'v4', name: 'Tinted band', render: render4, recommended: true,
      why: 'Recommended. The band is the old dialog\'s green box with the button taken out of it, so the status is the first thing read and the amber state is impossible to miss without a count or a second box. Everything else is plain: the chip row, a switch, a neutral Unpublish on the left and one primary on the right.',
      note: 'The status is a soft tinted band above the link: green live, amber when visitors see an older version, grey off. Unpublish is a neutral outline button.',
      tradeoff: 'Strongest signal and the most familiar shape, at the cost of one more box in the dialog.' },
    { id: 'v5', name: 'Settings footer', render: render5,
      note: 'Status line above the link, same as 1. The password row moves into a footer strip above the buttons, so the link is the only thing in the body.',
      tradeoff: 'The body is just the link, but the password sits next to the buttons it has nothing to do with.' },
    { id: 'v6', name: 'Off section', render: render6,
      note: 'Dot in the row. With changes, an amber band under the link. Unpublish gets its own row with a caption and a red outline button; the footer holds only Publish.',
      tradeoff: 'Unpublish can\'t be mistaken for Publish, but the dialog grows a row and the confirm opens mid-dialog.' },
    { id: 'ref', name: 'Round one, option 3', render: renderRef, ref: true,
      note: 'The "Link first" option from round one, unchanged: hero link, Copy link button, blue edits row with a count, "Stop sharing" as red text.',
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
    card.querySelector('[data-presets]').innerHTML = presetButtons(s.preset);
    card.querySelector('[data-dialog]').innerHTML = `<div class="grid gap-4 rounded-lg border bg-background p-6 shadow-lg x-dialog">
      <div class="d-title-row"><div class="d-title">Share</div>${opt.pill ? headerPill(s) : ''}</div>
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
  }

  const grid = document.getElementById('options');
  grid.innerHTML = OPTIONS.map((opt, i) => `<article class="x-opt" id="${opt.id}" data-option="${i + 1}">
      <div class="x-opt-head">
        <div class="x-opt-title"><span class="x-opt-num">${opt.ref ? 'Ref' : i + 1}</span>${opt.name}${opt.recommended ? '<span class="x-tag x-tag--rec">Recommended</span>' : ''}${opt.ref ? '<span class="x-tag x-tag--now">Round one</span>' : ''}</div>
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

  document.addEventListener('click', (event) => {
    const control = event.target.closest('[data-act]');
    if (!control || control.tagName === 'INPUT') return;
    const act = control.dataset.act;
    const arg = control.dataset.arg;
    if (control.closest('[data-global-presets]')) {
      globalPresets.innerHTML = presetButtons(arg);
      for (const opt of OPTIONS) dispatch(opt, 'preset', arg);
      return;
    }
    const card = control.closest('.x-opt');
    const opt = OPTIONS.find((o) => o.id === card.id);
    dispatch(opt, act, arg);
  });
  document.addEventListener('input', (event) => {
    const control = event.target.closest('input[data-act="pw"]');
    if (!control) return;
    const opt = OPTIONS.find((o) => o.id === control.closest('.x-opt').id);
    dispatch(opt, 'pw', control.value);
  });
  window.__proto = { OPTIONS: OPTIONS.map((o) => o.id), REF: OPTIONS.filter((o) => o.ref).map((o) => o.id), PRESETS: PRESETS.map((p) => p[0]), state: (id) => states.get(id) };
})();
