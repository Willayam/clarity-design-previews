// One state model and one reducer for every option; only render() differs.
// state: { stage, password, pw, publishedAgo, copied, confirm, busy, more, preset }
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
  const BLANK = { stage: 'draft', password: false, pw: '', publishedAgo: '2h ago', copied: false, confirm: false, busy: null, more: false, preset: 'draft' };

  function presetState(key) {
    const found = PRESETS.find((p) => p[0] === key) || PRESETS[0];
    return { ...BLANK, ...found[2], preset: found[0] };
  }
  const live = (s) => s.stage === 'published' || s.stage === 'changes';

  function reduce(s, act, arg) {
    switch (act) {
      case 'preset': return presetState(arg);
      case 'publish': return live(s) && s.stage !== 'changes' ? s : { ...s, busy: 'publish', confirm: false };
      case 'publish-done': return { ...s, busy: null, stage: 'published', publishedAgo: 'just now' };
      case 'ask-off': return live(s) ? { ...s, confirm: true } : s;
      case 'cancel-off': return { ...s, confirm: false };
      case 'off': return { ...s, busy: 'off', confirm: false };
      case 'off-done': return { ...s, busy: null, stage: 'unpublished', confirm: false };
      case 'copy': return { ...s, copied: true };
      case 'uncopy': return { ...s, copied: false };
      case 'password': return { ...s, password: !s.password };
      case 'pw': return { ...s, pw: arg };
      case 'more': return { ...s, more: !s.more };
      case 'live-toggle': return live(s) ? reduce(s, 'ask-off') : reduce(s, 'publish');
      case 'access':
        if (arg === 'only') return reduce(s, 'ask-off');
        return reduce({ ...s, password: arg === 'password', confirm: false }, 'publish');
      default: return s;
    }
  }

  const icon = (name, cls) => `<svg class="${cls || 'size-4'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${window.ICONS[name]}</svg>`;
  // index.css declares the button faces on [data-button-variant]; without it
  // the primary gradient has no fill and renders white.
  const variantOf = (kind) => ({ primary: 'default' }[kind.replace(/(Lg|Sm|Icon|Inline)$/, '')] || kind.replace(/(Lg|Sm|Icon|Inline)$/, ''));
  const btn = (kind, act, label, extra) => `<button type="button" data-slot="button" data-button-variant="${variantOf(kind)}" class="${BTN[kind]}${extra && extra.cls ? ' ' + extra.cls : ''}" data-act="${act}"${extra && extra.arg !== undefined ? ` data-arg="${extra.arg}"` : ''}${extra && extra.disabled ? ' disabled' : ''}${extra && extra.attrs ? ' ' + extra.attrs : ''}>${label}</button>`;
  const busyIcon = (s, kind, name) => (s.busy === kind ? icon('loader-circle', 'size-4 spin') : icon(name));
  const publishBtn = (s, label, kind) => btn(kind || 'primaryLg', 'publish', `${busyIcon(s, 'publish', 'globe')}${label}`, { attrs: s.busy === 'publish' ? 'aria-busy="true"' : '' });

  function chip(s) {
    return `<div class="d-chip">
      <a href="${URL_FULL}" target="_blank" rel="noreferrer" aria-label="Open this Journey Page in a new tab"><span class="mono">${URL_SHOWN}</span>${icon('arrow-up-right', 'size-4 shrink-0 text-muted-foreground')}</a>
      ${btn('ghostIcon', 'copy', s.copied ? icon('check') : icon('copy'), { attrs: `aria-label="${s.copied ? 'Link copied' : 'Copy link'}" title="${s.copied ? 'Link copied' : 'Copy link'}"` })}
    </div>`;
  }
  function switchRow(s, id, label) {
    return `<div class="d-row">
      <label class="d-label" for="${id}">${icon('lock')}${label || 'Password protected'}</label>
      <button type="button" role="switch" id="${id}" aria-checked="${s.password}" data-act="password" data-size="default" data-${s.password ? 'checked' : 'unchecked'} class="${SWITCH}"><span data-${s.password ? 'checked' : 'unchecked'} class="${THUMB}"></span></button>
    </div>${s.password ? `<input class="${INPUT} d-pw" aria-label="Page password" placeholder="Set a password" data-act="pw" value="${s.pw}">` : ''}`;
  }
  function offConfirm(s, question, body, yes) {
    return `<div class="d-confirm" role="group" aria-label="${question}">
      <p><strong>${question}</strong></p>
      <p class="d-muted">${body}</p>
      <div class="d-footer">${btn('outlineSm', 'cancel-off', 'Cancel')}${btn('dangerSm', 'off', `${s.busy === 'off' ? icon('loader-circle', 'size-3.5 spin') : ''}${yes}`)}</div>
    </div>`;
  }
  const visitorsLine = (s) => s.stage === 'changes' ? `Visitors see the version you published ${s.publishedAgo}, not your edits.` : 'Anyone with the link sees this page.';

  // 1 One sentence, one button
  function render1(s) {
    const line = {
      draft: '<strong>Not published.</strong> Only you can open this page.',
      published: `<strong>Live.</strong> ${s.password ? 'Anyone with the link and the password sees this page.' : 'Anyone with the link sees this page.'}`,
      changes: `<strong>Live.</strong> Visitors see the version you published ${s.publishedAgo}. Your edits since then are only here.`,
      unpublished: '<strong>Off.</strong> The link no longer opens. Publish turns the same link back on.',
    }[s.stage];
    const action = { draft: 'Publish', changes: 'Publish changes', unpublished: 'Publish', published: null }[s.stage];
    return `<p class="o1-line">${line}</p>
      ${live(s) ? chip(s) : ''}
      ${switchRow(s, 'o1-pw')}
      ${s.confirm ? offConfirm(s, 'Turn the link off for everyone?', 'People you sent it to get "Page not found". Publish turns the same link back on.', 'Turn off')
        : `<div class="o1-footer">
          ${live(s) ? btn('destructiveSm', 'ask-off', 'Turn the link off', { cls: 'd-nudge' }) : '<span></span>'}
          ${action ? publishBtn(s, action) : ''}
        </div>`}`;
  }

  // 2 Live / Off switch
  function render2(s) {
    const isLive = live(s);
    const help = {
      draft: 'Nobody can open the link until you turn it on.',
      published: s.password ? 'Anyone with the link and the password can open this page.' : 'Anyone with the link can open this page.',
      changes: `Anyone with the link can open this page. They see the version from ${s.publishedAgo}.`,
      unpublished: 'The link is off. Turn it on to share again.',
    }[s.stage];
    return `<div class="d-row">
        <div class="d-label">${icon('globe')}Link</div>
        <div class="o2-seg" role="group" aria-label="Link status">
          <button type="button" data-act="${isLive ? 'ask-off' : 'noop'}" data-arg="off" aria-pressed="${!isLive}">Off</button>
          <button type="button" data-act="${isLive ? 'noop' : 'publish'}" data-arg="live" aria-pressed="${isLive}">${s.busy === 'publish' ? icon('loader-circle', 'size-3.5 spin') : 'Live'}</button>
        </div>
      </div>
      <p class="d-small d-muted" style="margin:-8px 0 0">${help}</p>
      ${s.confirm ? offConfirm(s, 'Turn the link off?', 'Everyone you sent it to gets "Page not found" until you turn it on again.', 'Turn off') : ''}
      ${isLive ? chip(s) : ''}
      ${s.stage === 'changes' ? `<div class="o2-banner"><p><strong>Your edits aren't live yet.</strong><br><span class="d-muted">Visitors still see the version from ${s.publishedAgo}.</span></p>${publishBtn(s, 'Publish changes', 'primary')}</div>` : ''}
      ${switchRow(s, 'o2-pw', 'Password')}`;
  }

  // 3 Link first
  function render3(s) {
    const isLive = live(s);
    const status = {
      draft: 'Not live yet. Only you can open this link.',
      published: s.password ? `Live · password required · published ${s.publishedAgo}` : `Live · published ${s.publishedAgo}`,
      changes: `Live · visitors see the version from ${s.publishedAgo}`,
      unpublished: 'Off. Nobody can open this link.',
    }[s.stage];
    return `<div class="o3-hero"${isLive ? '' : ` data-off="${s.stage}"`}>
        <div class="o3-url">${icon('link', 'size-4 shrink-0 text-muted-foreground')}<a href="${URL_FULL}" target="_blank" rel="noreferrer">${URL_SHOWN}</a></div>
        <div class="o3-status"><span class="d-dot${isLive ? ' d-dot--live' : ''}"></span>${status}</div>
        <div class="o3-actions">
          ${btn('outline', 'copy', `${s.copied ? icon('check') : icon('copy')}${s.copied ? 'Copied' : 'Copy link'}`, { disabled: !isLive })}
          ${!isLive ? publishBtn(s, 'Publish', 'primary') : ''}
        </div>
      </div>
      ${s.stage === 'changes' ? `<div class="o3-edits"><p>${icon('pencil-line', 'size-4 d-inline-icon')}<strong>3 edits</strong> visitors can't see yet.</p>${publishBtn(s, 'Publish changes', 'primary')}</div>` : ''}
      ${switchRow(s, 'o3-pw', 'Password')}
      ${s.confirm ? offConfirm(s, 'Stop sharing?', 'The link stops working for everyone you sent it to. Publish turns it back on.', 'Stop sharing')
        : isLive ? `<div>${btn('destructiveSm', 'ask-off', 'Stop sharing', { cls: 'd-nudge' })}</div>` : ''}`;
  }

  // 4 Two columns
  function render4(s) {
    const isLive = live(s);
    const thumb = (changed) => `<div class="o4-thumb"><div class="v"></div><div class="b w${changed ? ' n' : ''}"></div><div class="b"></div><div class="b${changed ? ' n' : ''}"></div><div class="b w"></div></div>`;
    const leftBody = isLive
      ? `${thumb(false)}<p><strong>Published ${s.publishedAgo}</strong></p><p class="d-muted">${s.password ? 'Anyone with the link and the password.' : 'Anyone with the link.'}</p>`
      : `<div class="o4-thumb o4-thumb--empty">${s.stage === 'draft' ? 'Nothing yet' : 'Link is off'}</div><p class="d-muted">${s.stage === 'draft' ? 'Nobody can open the link until you publish.' : 'Nobody can open the link. Publish turns it back on.'}</p>`;
    const rightBody = s.stage === 'changes'
      ? `${thumb(true)}<p><strong>3 edits</strong> since you published</p><p class="d-muted">Only you can see them.</p>`
      : s.stage === 'published'
        ? `${thumb(false)}<p><strong>Same as visitors</strong></p><p class="d-muted">Nothing to publish.</p>`
        : `${thumb(true)}<p><strong>Your draft</strong></p><p class="d-muted">Only you can see it.</p>`;
    const action = { draft: 'Publish', changes: 'Publish changes', unpublished: 'Publish', published: null }[s.stage];
    return `<div class="o4-cols">
        <div class="o4-col ${isLive ? 'o4-col--live' : 'o4-col--off'}"><h3>${isLive ? icon('globe', 'size-3.5') : icon('eye-off', 'size-3.5')}Visitors see</h3>${leftBody}</div>
        <div class="o4-col"><h3>${icon('pencil-line', 'size-3.5')}You're editing</h3>${rightBody}</div>
      </div>
      ${isLive ? chip(s) : ''}
      ${switchRow(s, 'o4-pw', 'Password')}
      ${s.confirm ? offConfirm(s, 'Take the page down?', 'The link stops working for everyone you sent it to. Your edits stay here.', 'Take it down')
        : `<div class="o4-foot">
          ${isLive ? btn('destructiveSm', 'ask-off', 'Take the page down', { cls: 'd-nudge' }) : '<span></span>'}
          ${action ? publishBtn(s, `${action}${icon('arrow-right')}`) : ''}
        </div>`}`;
  }

  // 5 Access (Google Docs style)
  function render5(s) {
    const isLive = live(s);
    const value = !isLive ? 'only' : s.password ? 'password' : 'link';
    const help = {
      only: 'Nobody else can open this page.',
      link: `Anyone on the internet with the link can open it.${s.stage === 'changes' ? '' : ''}`,
      password: 'Anyone with the link and the password can open it.',
    }[value];
    return `<p class="o5-section">General access</p>
      <div class="o5-access">
        <div class="o5-glyph${isLive ? ' o5-glyph--live' : ''}">${s.busy === 'publish' ? icon('loader-circle', 'size-4 spin') : isLive ? icon('globe') : icon('lock')}</div>
        <div style="min-width:0;flex:1">
          <div class="o5-select">
            <select aria-label="Who can open this page" data-act="access">
              <option value="only"${value === 'only' ? ' selected' : ''}>Only you</option>
              <option value="link"${value === 'link' ? ' selected' : ''}>Anyone with the link</option>
              <option value="password"${value === 'password' ? ' selected' : ''}>Anyone with the password</option>
            </select>${icon('chevron-down', 'size-4')}
          </div>
          <p class="o5-help">${help}</p>
          ${value === 'password' ? `<input class="${INPUT} d-pw" aria-label="Page password" placeholder="Set a password" data-act="pw" value="${s.pw}">` : ''}
        </div>
      </div>
      ${s.confirm ? offConfirm(s, 'Stop sharing?', 'The link stops working for everyone you sent it to. You can share it again any time.', 'Stop sharing') : ''}
      ${s.stage === 'changes' ? `<div class="o5-update"><p><strong>Visitors see the version from ${s.publishedAgo}.</strong><br><span class="d-muted">Your edits aren't live yet.</span></p>${publishBtn(s, 'Publish changes', 'primary')}</div>` : ''}
      <div class="o5-foot">
        ${isLive && !s.confirm ? btn('destructiveSm', 'ask-off', 'Stop sharing', { cls: 'd-nudge' }) : '<span></span>'}
        ${btn('outlineLg', 'copy', `${s.copied ? icon('check') : icon('link')}${s.copied ? 'Copied' : 'Copy link'}`, { disabled: !isLive })}
      </div>`;
  }

  // 6 What the PR does now (round two)
  function render6(s) {
    const isLive = live(s);
    const view = {
      draft: ['Draft', 'Nobody can open this page until you publish it.', 'Publish'],
      published: ['Published', 'Anyone with the link sees this page.', null],
      changes: ['Published', `Anyone with the link sees the version you published ${s.publishedAgo}.`, 'Publish changes'],
      unpublished: ['Unpublished', 'The link is off. Nobody can open this page.', 'Publish'],
    }[s.stage];
    const more = s.more || s.password;
    return `<div class="o6-box ${isLive ? 'o6-box--live' : 'o6-box--off'}">
        <span class="o6-glyph">${isLive ? icon('globe', 'size-4.5') : icon('eye-off', 'size-4.5')}</span>
        <div style="min-width:0;flex:1"><p class="o6-head">${view[0]}</p><p class="d-small d-muted">${view[1]}</p></div>
      </div>
      ${isLive ? chip(s) : ''}
      ${s.stage === 'changes' ? `<div class="o6-box o6-box--dashed"><span class="o6-glyph">${icon('pencil-line', 'size-4.5')}</span><div style="min-width:0;flex:1"><p class="o6-head">Changes not published</p><p class="d-small d-muted">Visitors don't see your edits until you publish them.</p></div></div>` : ''}
      <button type="button" class="o6-more" data-act="more" aria-expanded="${more}">${icon('chevron-right')}More options</button>
      ${more ? `<div style="display:grid;gap:16px">
        ${switchRow(s, 'o6-pw')}
        ${isLive ? `<div class="o6-sep">${s.confirm
          ? offConfirm(s, 'Unpublish this page?', 'The link stops working for everyone you sent it to. They see "Page not found". Your page stays here, and Publish turns the same link back on.', 'Unpublish')
          : btn('destructiveSm', 'ask-off', 'Unpublish page', { cls: 'd-nudge' })}</div>` : ''}
      </div>` : ''}
      ${view[2] ? `<div class="d-footer">${publishBtn(s, view[2])}</div>` : ''}`;
  }

  const OPTIONS = [
    { id: 'o1', name: 'One sentence, one button', render: render1,
      note: 'The first line says what is true right now. One primary button changes with the state. Turning the link off is red text on the left, with the same look as the app\'s destructive buttons.',
      borrowed: 'Substack: a published post gets an "Update" button and nothing else. Google Sites: edits stay private until you press Publish again.' },
    { id: 'o2', name: 'Live / Off switch', render: render2,
      note: 'The link has two states and one control for them. Publish changes is the only button, and it only exists when there are changes. Turning Off asks first.',
      borrowed: 'Loom: link settings sit on the video with one access control. Notion: Publish and Unpublish are the same tab, toggled.' },
    { id: 'o3', name: 'Link first', render: render3, recommended: true,
      why: 'Recommended. The link is the thing a rep sends, so it leads. The green dot and one line say what visitors get, "Publish changes" appears only when it has a job, and "Stop sharing" is red text at the bottom, nowhere near the primary button. Nothing is folded away and no two controls look alike.',
      note: 'The link is the hero with a live dot. A blue edits row with "Publish changes" appears only when there are changes. "Stop sharing" is red text at the bottom.',
      borrowed: 'Notion: the live link is the published state. Webflow: the main action reads "Publish changes" when edits are staged. Loom: Copy link beside the link.' },
    { id: 'o4', name: 'Visitors see / You\'re editing', render: render4,
      note: 'Two columns make the gap explicit: what the link serves on the left, your draft on the right, and the button pushes right to left.',
      borrowed: 'Google Sites "Review changes and publish" compares published and draft side by side. Webflow Enterprise shows a two-column prepublish summary.' },
    { id: 'o5', name: 'General access', render: render5,
      note: 'A Google Docs share sheet. One access picker covers off, link and password, so publishing is picking "Anyone with the link". "Stop sharing" is plain red text.',
      borrowed: 'Google Docs: "General access" with a who-can-open picker and a big Copy link. Loom: "Anyone with the link" as the public option.' },
    { id: 'o6', name: 'What the PR does now', render: render6, now: true,
      note: 'Round two for reference: green Published box, dashed "Changes not published" row, Unpublish and the password switch under More options, red confirm.',
      borrowed: 'Framer: Unpublish at the bottom of settings. Substack: Unpublish in a menu behind a confirm.' },
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
    card.querySelector('[data-presets]').innerHTML = presetButtons(s.preset);
    card.querySelector('[data-dialog]').innerHTML = `<div class="grid gap-4 rounded-lg border bg-background p-6 shadow-lg x-dialog">
      <div><div class="d-title">Share</div>${opt.id === 'o5' ? '<div class="d-sub">Proposal for Acme</div>' : ''}</div>
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
    if (act === 'copy') {
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
        <div class="x-opt-title"><span class="x-opt-num">${i + 1}</span>${opt.name}${opt.recommended ? '<span class="x-tag x-tag--rec">Recommended</span>' : ''}${opt.now ? '<span class="x-tag x-tag--now">PR today</span>' : ''}</div>
        <p class="x-opt-note">${opt.note}</p>
        ${opt.why ? `<p class="x-opt-why">${opt.why}</p>` : ''}
      </div>
      <div class="x-presets" data-presets></div>
      <div class="x-stage"><div data-dialog style="width:100%;display:flex;justify-content:center"></div></div>
    </article>`).join('');
  document.getElementById('borrowed').innerHTML = OPTIONS.map((opt, i) => `<li><strong>${i + 1}. ${opt.name}.</strong> ${opt.borrowed}</li>`).join('')
    + '<li>Sources read: <a href="https://www.notion.com/help/public-pages-and-web-publishing">Notion publish help</a>, <a href="https://framer.com/help/articles/publishing-your-framer-website">Framer publishing</a>, <a href="https://help.webflow.com/hc/en-us/articles/33961351954579">Webflow publish or unpublish</a>, <a href="https://support.atlassian.com/loom/docs/use-looms-privacy-settings/">Loom privacy settings</a>, <a href="https://workspaceupdates.googleblog.com/2019/12/informed-publishing-sites.html">Google Sites review changes and publish</a>, <a href="https://www.beehiiv.com/blog/how-to-delete-a-substack-post">Substack unpublish (third party)</a>.</li>';

  const globalPresets = document.querySelector('[data-global-presets]');
  globalPresets.innerHTML = presetButtons('changes');

  for (const opt of OPTIONS) {
    states.set(opt.id, presetState('changes'));
    paint(opt);
  }

  document.addEventListener('click', (event) => {
    const control = event.target.closest('[data-act]');
    if (!control || control.tagName === 'SELECT' || control.tagName === 'INPUT') return;
    const act = control.dataset.act;
    const arg = control.dataset.arg;
    if (control.closest('[data-global-presets]')) {
      globalPresets.innerHTML = presetButtons(arg);
      for (const opt of OPTIONS) dispatch(opt, 'preset', arg);
      return;
    }
    const card = control.closest('.x-opt');
    const opt = OPTIONS.find((o) => o.id === card.id);
    if (act === 'noop') return;
    dispatch(opt, act, arg);
  });
  document.addEventListener('change', (event) => {
    const control = event.target.closest('select[data-act="access"]');
    if (!control) return;
    const opt = OPTIONS.find((o) => o.id === control.closest('.x-opt').id);
    dispatch(opt, 'access', control.value);
  });
  document.addEventListener('input', (event) => {
    const control = event.target.closest('input[data-act="pw"]');
    if (!control) return;
    const opt = OPTIONS.find((o) => o.id === control.closest('.x-opt').id);
    dispatch(opt, 'pw', control.value);
  });
  window.__proto = { OPTIONS: OPTIONS.map((o) => o.id), PRESETS: PRESETS.map((p) => p[0]), state: (id) => states.get(id) };
})();
