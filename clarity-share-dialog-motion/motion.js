// F1b share dialog, four motion profiles on one page.
//
// Data shape. One state record and one reducer (from r6) drive every dialog;
// the profiles never touch state. A PROFILE is a table of timings and a few
// flags (travel, directional, sweep, ping, stagger, springs) that the painter
// reads. The painter diffs the previous state against the next one slot by
// slot (link, access, password, footer, menu) and animates only the slot
// whose rendered HTML changed. Rows that appear or leave animate their
// wrapper's height; everything else is opacity, transform, clip-path or
// colour. The anchor rule: when the dialog's height changes, the edge nearest
// the control that was pressed stays where it is.
//
// The tour is the transition inventory. verify.mjs and record.mjs replay it.
// ?only=<profile> renders one option; &autoplay=1 runs its tour on load;
// ?plant=<name> breaks one rule so verify.mjs can prove a check goes red.
(function () {
  const BTN = window.BTN;
  const q = new URLSearchParams(location.search);
  const PLANT = q.get('plant') || '';
  const ONLY = q.get('only') || '';
  document.body.dataset.plant = PLANT;
  if (ONLY) document.body.dataset.only = ONLY;
  const URL_HOST = 'clarity.video/';
  const URL_MID = 'page';
  const SLUG = 'acme-q4-proposal';
  const urlOf = (s) => `https://${URL_HOST}${URL_MID}/${s.slug}`;
  const COPY_FAILED = "Couldn't copy. Select the link and copy it.";
  const SWITCH = 'peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[size=default]:h-[18.4px] data-[size=default]:w-[32px] data-checked:bg-primary data-unchecked:bg-input data-disabled:cursor-not-allowed data-disabled:opacity-50';
  const THUMB = 'pointer-events-none block rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=default]/switch:data-unchecked:translate-x-0';
  const INPUT = 'w-full min-w-0 rounded-lg border transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 h-10 border-input bg-transparent px-2.5 py-1 text-base md:text-sm';
  const PHONE = () => window.matchMedia('(max-width: 440px)').matches;
  const OS_REDUCED = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- state ----------
  const PRESETS = [
    ['draft', 'Never published', { stage: 'draft' }],
    ['published', 'Live', { stage: 'published' }],
    ['changes', 'Live with changes', { stage: 'changes' }],
    ['unpublished', 'Off', { stage: 'unpublished' }],
    ['password', 'Password on', { stage: 'published', pwOn: true, pwSaved: 'acme-2026', pwDraft: 'acme-2026' }],
  ];
  const BLANK = { open: false, stage: 'draft', slug: SLUG, pwOn: false, pwSaved: '', pwDraft: '', pwShow: false, publishedAgo: '2h ago', copying: false, copied: false, copyError: false, confirm: false, busy: null, menu: false, menuUp: false, focus: null, announce: '', preset: 'draft' };
  function presetState(key, open) {
    const found = PRESETS.find((p) => p[0] === key) || PRESETS[0];
    return { ...BLANK, ...found[2], preset: found[0], open };
  }
  const live = (s) => s.stage === 'published' || s.stage === 'changes';
  const isProtected = (s) => s.pwOn && s.pwSaved !== '';
  const WHILE_BUSY = new Set(['preset', 'publish-done', 'off-done', 'copy-done', 'copy-failed', 'uncopy']);
  function reduce(s, act, arg) {
    if (s.busy && !WHILE_BUSY.has(act)) return s;
    switch (act) {
      case 'preset': return presetState(arg, s.open);
      case 'open': return { ...s, open: true, focus: 'dialog' };
      case 'close': return { ...s, open: false, menu: false, confirm: false, focus: 'opener' };
      case 'edit': return live(s) ? { ...s, stage: 'changes', publishedAgo: '2h ago' } : s;
      case 'publish': return s.stage === 'published' ? s : { ...s, busy: 'publish', confirm: false, menu: false, copyError: false, focus: 'primary' };
      case 'publish-done': return { ...s, busy: null, stage: 'published', publishedAgo: 'just now', announce: isProtected(s) ? 'Published. Visitors need the link and the password.' : 'Published. Anyone with the link can open it.' };
      case 'ask-off': return live(s) ? { ...s, confirm: true, menu: false, focus: 'cancel' } : s;
      case 'cancel-off': return { ...s, confirm: false, focus: 'access' };
      case 'off': return s.confirm ? { ...s, busy: 'off', focus: 'turn-off' } : s;
      case 'off-done': return { ...s, busy: null, stage: 'unpublished', confirm: false, focus: 'primary', announce: 'The link is off.' };
      case 'copy': return !live(s) || s.copying ? s : { ...s, copying: true, copied: false, copyError: false, menu: false };
      case 'copy-done': return s.copying ? { ...s, copying: false, copied: true, announce: 'Link copied.' } : s;
      case 'copy-failed': return s.copying ? { ...s, copying: false, copied: false, copyError: true, announce: COPY_FAILED } : s;
      case 'uncopy': return { ...s, copied: false };
      case 'clear-error': return { ...s, copyError: false };
      case 'pw-toggle': return s.pwOn ? { ...s, pwOn: false, pwSaved: '', pwDraft: '', pwShow: false, menu: false } : { ...s, pwOn: true, menu: false, focus: 'pw-input' };
      case 'pw-show': return { ...s, pwShow: !s.pwShow, focus: 'pw-show' };
      case 'pw-draft': return { ...s, pwDraft: arg };
      case 'pw-save': return s.pwDraft.trim() === '' ? s : { ...s, pwSaved: s.pwDraft.trim(), pwDraft: s.pwDraft.trim(), focus: 'pw-input', announce: live(s) ? 'Password saved. Everyone with the link needs it now.' : 'Password saved.' };
      case 'menu-open': return s.menu ? s : { ...s, menu: true, menuUp: !!arg, focus: 'item-on' };
      case 'menu-close': return s.menu ? { ...s, menu: false, focus: arg === 'keep' ? null : 'access' } : s;
      default: return s;
    }
  }
  function status(s) {
    return {
      draft: { tone: 'off', word: 'Not published', text: 'Nobody can open it until you publish.' },
      published: { tone: 'live', word: 'Live', text: `Published ${s.publishedAgo}.` },
      changes: { tone: 'changes', word: 'Live', text: `Visitors see the version from ${s.publishedAgo}.` },
      unpublished: { tone: 'off', word: 'Off', text: 'The link is off. Publish to bring it back.' },
    }[s.stage];
  }
  const PRIMARY = { draft: 'Publish', published: 'Copy link', changes: 'Publish changes', unpublished: 'Publish' };
  // Forward means the page is becoming more public or a panel is opening.
  const FORWARD = new Set(['open', 'publish', 'publish-done', 'ask-off', 'copy', 'copy-done', 'pw-toggle-on', 'pw-save', 'menu-open', 'edit', 'copy-failed']);

  // ---------- easing and springs ----------
  const EASE = {
    outCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
    outQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
    outQuint: 'cubic-bezier(0.23, 1, 0.32, 1)',
    outExpo: 'cubic-bezier(0.19, 1, 0.22, 1)',
    outQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    drawer: 'cubic-bezier(0.25, 1, 0.5, 1)',
    vaul: 'cubic-bezier(0.32, 0.72, 0, 1)',
    ease: 'ease',
  };
  // Apple-style spring (duration = perceptual duration, bounce 0..1) sampled
  // into a CSS linear() easing so WAAPI runs it off the main thread. The
  // sampled window runs until the spring is within 0.1% of rest, so a bouncy
  // spring lasts longer than its nominal duration, as it does in Motion.
  function spring(duration, bounce) {
    const zeta = 1 - bounce;
    const w0 = (2 * Math.PI) / duration;
    const x = (t) => {
      if (zeta >= 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
    };
    let T = duration;
    while (T < duration * 3 && Math.abs(1 - x(T)) > 0.001) T += 0.01;
    const n = 48;
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push(x((i / n) * T).toFixed(4));
    return { duration: Math.round(T * 1000), easing: `linear(${pts.join(', ')})`, label: `spring ${duration}s / bounce ${bounce}` };
  }

  // ---------- profiles ----------
  // t: durations in ms; e: easings; a timing key may instead be a spring.
  // travel: px an entering piece moves; directional: sign follows forward/back;
  // sweep: band colour wipes left to right instead of crossfading; ping: the
  // dot rings once on going live; stagger: ms between the parts of one change.
  const PROFILES = [
    {
      id: 'quiet', name: 'Quiet', tag: 'crossfade and height only',
      note: 'Nothing moves sideways or up. A piece that changes crossfades in place, a row that appears or leaves animates its height, the band fades between tones. Short enough that the dialog never feels animated, only unbroken.',
      t: { fade: 140, exit: 100, height: 180, tone: 200, swap: 140, dialog: 160, sheet: 260, menu: 120, tip: 120 },
      e: { fade: EASE.outCubic, exit: EASE.outQuad, height: EASE.drawer, swap: EASE.outCubic, dialog: EASE.outCubic, sheet: EASE.outQuint, menu: EASE.outCubic, tip: EASE.outCubic },
      travel: 0, directional: false, sweep: false, ping: false, stagger: 0, dialogScale: 1, menuScale: 1, tipScale: 1,
      spec: [
        ['Durations', 'fade 140ms, exit 100ms, height 180ms, tone 200ms, dialog 160ms, sheet 260ms, menu 120ms'],
        ['Easing', 'ease-out cubic for entrances, ease-out quad for exits, <code>cubic-bezier(0.25, 1, 0.5, 1)</code> for height, <code>ease</code> for colour'],
        ['What moves', 'Row height and the phone sheet. Everything else is opacity and colour.'],
        ['What stays', 'The pressed control (anchor rule), text position, the dialog scale.'],
        ['Reduced motion', 'Height snaps, the sheet fades. Otherwise identical, which is the point.'],
        ['Why', 'Deference. The dialog is a settings sheet seen a few times a day; the motion only stops the eye from losing its place.'],
      ],
    },
    {
      id: 'spring', name: 'Springy', tag: 'springs, light press',
      note: 'Rows and labels settle on a spring instead of a curve, so an interrupted change carries on from where it is and a reveal lands with a little weight. Buttons press to 0.97. Bounce stays under 0.15 so nothing wobbles.',
      spring: { height: spring(0.4, 0.12), swap: spring(0.32, 0.08), dialog: spring(0.42, 0.1), sheet: spring(0.5, 0.05), menu: spring(0.3, 0.12), tip: spring(0.3, 0.2) },
      t: { fade: 160, exit: 110, tone: 220 },
      e: { fade: EASE.outCubic, exit: EASE.outQuad },
      travel: 6, directional: false, sweep: false, ping: false, stagger: 0, dialogScale: 0.95, menuScale: 0.92, tipScale: 0.85,
      spec: [
        ['Springs', 'height 0.4s / bounce 0.12, label swap 0.32s / 0.08, dialog 0.42s / 0.1, sheet 0.5s / 0.05, menu 0.3s / 0.12, Copied tip 0.3s / 0.2'],
        ['Fades', 'content 160ms ease-out cubic, exits 110ms, tone 220ms ease'],
        ['What moves', 'Entering rows and labels rise 6px, the dialog scales from 0.95, menus from 0.92 at their trigger, buttons press to 0.97.'],
        ['What stays', 'The pressed control (anchor rule), the band dot, the URL.'],
        ['Reduced motion', 'Springs become 150ms fades, no scale, no press.'],
        ['Why', 'The spring is what makes Publish feel like something happened. The cost is a little more personality than the rest of the editor has.'],
      ],
    },
    {
      id: 'directional', name: 'Directional', tag: 'slides follow the change',
      note: 'Going more public reads upward, going back reads downward: on Publish the new row and the new label come in from below, on Turn off or Cancel they come in from above. The band colour wipes left to right on the way forward and right to left on the way back.',
      t: { fade: 200, exit: 120, height: 220, tone: 320, swap: 200, dialog: 220, sheet: 400, menu: 160, tip: 160 },
      e: { fade: EASE.outQuint, exit: EASE.outQuad, height: EASE.outQuint, tone: EASE.outQuart, swap: EASE.outQuint, dialog: EASE.outQuint, sheet: EASE.vaul, menu: EASE.outQuint, tip: EASE.outQuint },
      travel: 8, directional: true, sweep: true, ping: false, stagger: 0, dialogScale: 1, dialogTravel: 12, menuScale: 0.98, menuTravel: -4, tipScale: 1,
      spec: [
        ['Durations', 'enter 200ms, exit 120ms, height 220ms, sweep 320ms, dialog 220ms, sheet 400ms, menu 160ms'],
        ['Easing', 'ease-out quint for entrances and height, ease-out quart for the sweep, <code>cubic-bezier(0.32, 0.72, 0, 1)</code> for the sheet'],
        ['What moves', 'Entering pieces travel 8px up (forward) or down (back); the band colour sweeps as a clip-path; the dialog rises 12px on open; menus drop 4px from the trigger.'],
        ['What stays', 'The pressed control (anchor rule), the band dot, the URL, the switch.'],
        ['Reduced motion', 'Travel and sweep off; every change becomes the Quiet crossfade.'],
        ['Why', 'Direction carries meaning: the eye learns that up means more public. The sweep makes the band read as one thing changing state, not two sentences swapping.'],
      ],
    },
    {
      id: 'cascade', name: 'Cascade', tag: 'reading order, one beat apart',
      note: 'A state change with several parts plays them in reading order 45ms apart: copy icon, access row, band, primary. Each part is a short crossfade with a 4px rise. The band is the headline, so it gets the longest fade and its dot rings once when the page goes live. Turning off plays the same order from the bottom up.',
      t: { fade: 170, exit: 100, height: 220, tone: 260, swap: 170, dialog: 200, sheet: 320, menu: 140, tip: 140, band: 260 },
      e: { fade: EASE.outExpo, exit: EASE.outQuad, height: EASE.outQuint, swap: EASE.outExpo, dialog: EASE.outQuint, sheet: EASE.outQuint, menu: EASE.outQuint, tip: EASE.outQuint },
      travel: 4, directional: false, sweep: false, ping: true, stagger: 45, dialogScale: 0.97, menuScale: 0.96, tipScale: 0.9,
      spec: [
        ['Durations', 'part 170ms, band 260ms, exit 100ms, height 220ms, stagger 45ms, dialog 200ms, sheet 320ms, menu 140ms, ping 600ms'],
        ['Easing', 'ease-out expo for each part, ease-out quint for height and the dialog'],
        ['What moves', 'Each changed part rises 4px as it fades in; the dot rings once on going live; the dialog scales from 0.97.'],
        ['What stays', 'The pressed control (anchor rule), the URL, unchanged rows. One entrance per container: the dialog opens with its rows already there.'],
        ['Reduced motion', 'The stagger stays (it is timing, not movement); the rise and the ring go.'],
        ['Why', 'Publish changes four things at once. Played together they read as a flash; played in order they read as a sentence: the link, who can open it, Live, copy it.'],
      ],
    },
  ];
  const VIEW = ONLY ? PROFILES.filter((p) => p.id === ONLY) : PROFILES;

  // ---------- rendering ----------
  const icon = (name, cls) => `<svg class="${cls || 'size-4'}" data-icon="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${window.ICONS[name]}</svg>`;
  const variantOf = (kind) => kind.replace(/(Lg|Sm|Icon|IconSm|Inline)$/, '').replace(/^primary$/, 'default');
  const attr = (name, value) => (value === undefined || value === null || value === false ? '' : ` ${name}="${value}"`);
  const btn = (kind, act, label, o) => {
    const x = o || {};
    return `<button type="button" data-slot="button" data-button-variant="${variantOf(kind)}" class="${BTN[kind]}${x.cls ? ' ' + x.cls : ''}" data-act="${act}"${attr('data-fk', x.fk)}${attr('data-arg', x.arg)}${x.disabled ? ' disabled' : ''}${x.attrs ? ' ' + x.attrs : ''}>${label}</button>`;
  };
  const urlText = (s) => `<span class="d-url"><span class="d-url-host">${URL_HOST}</span><span class="d-url-mid">${URL_MID}</span><span class="d-url-sep">/</span><span class="d-url-slug">${s.slug}</span></span>`;
  const copyBtn = (s) => btn('ghostIcon', 'copy', `<span class="m-icon-swap"><span class="m-icon" data-ic="copy">${icon('copy')}</span><span class="m-icon" data-ic="check" style="opacity:0">${icon('check')}</span></span>`, { fk: 'copy-icon', attrs: 'aria-label="Copy link" title="Copy link"' });
  function pwHelp(s) {
    const tick = icon('check', 'size-3.5');
    const typed = s.pwDraft.trim() !== '';
    if (s.pwSaved === '') {
      if (live(s)) return typed ? 'Press Save to use this password. Everyone you already sent the link to will need it.' : 'Not protected until you save. Everyone you already sent the link to will need the password.';
      return typed ? 'Press Save to use this password.' : 'Not protected until you save a password.';
    }
    if (s.pwDraft.trim() !== s.pwSaved) return 'Press Save to use the new password. Until then the old one works.';
    return live(s) ? `${tick}Saved. Everyone with the link needs it now.` : `${tick}Saved. Visitors will need it once you publish.`;
  }
  const pwNeedsSave = (s) => s.pwSaved === '' || s.pwDraft.trim() !== s.pwSaved;
  const WORDS = { on: 'Anyone with the link', off: 'No one' };
  const item = (act, label, name, x) => `<button type="button" role="menuitemradio" class="f-item" data-act="${act}" data-fk="${x.fk}" aria-checked="${x.checked}">${icon(name)}<span class="f-item-body"><span>${label}</span>${x.sub ? `<span class="f-item-sub">${x.sub}</span>` : ''}</span>${x.checked ? icon('check', 'size-4 f-check') : ''}</button>`;
  const menuHtml = (s, id) => `<div class="f-menu${s.menuUp ? ' f-menu--up' : ''}" role="menu" aria-labelledby="${id}-access-label" data-menu>${item('menu-close', WORDS.on, 'globe', { fk: 'item-on', checked: true, sub: isProtected(s) ? 'Visitors need the link and the password.' : '' })}${item('ask-off', WORDS.off, 'link-2-off', { fk: 'item-off', checked: false, sub: 'Turns the link off' })}</div>`;
  const accessRight = (s, id) => live(s)
    ? `<span class="f-menu-wrap"><button type="button" class="s-select" data-act="menu-open" data-fk="access" data-access-trigger aria-haspopup="menu" aria-expanded="${s.menu}" aria-labelledby="${id}-access-label ${id}-access-value"><span class="s-value" id="${id}-access-value">${WORDS.on}</span>${icon('chevron-down')}</button></span>`
    : `<span class="s-static" id="${id}-access-value" data-access-static>${WORDS.off}</span>`;
  const confirmHtml = (s) => `<div class="d-confirm" role="alertdialog" aria-labelledby="c-title" aria-describedby="c-body" data-confirm-panel>
      <p id="c-title"><strong>Turn the link off?</strong></p>
      <p class="d-muted" id="c-body">People you sent it to will see that the page is unavailable. Your edits stay saved. Publish turns the same link back on with your latest edits.</p>
      <div class="d-confirm-actions">${btn('outlineLg', 'cancel-off', 'Cancel', { fk: 'cancel' })}${btn('dangerLg', 'off', `<span class="m-spin">${icon('loader-circle', 'size-4 spin')}</span>Turn off`, { fk: 'turn-off' })}</div>
    </div>`;
  const bandHtml = (s) => { const st = status(s); return `<div class="f-band" data-tone="${st.tone}"><span class="d-dot"></span><div class="f-band-body"><p class="f-band-head"><span class="m-swap" data-swap="word"><span class="v-status-word">${st.word}</span></span></p><p class="f-band-text"><span class="m-swap" data-swap="text"><span>${st.text}</span></span></p></div></div>`; };
  const primaryLabel = (s) => (s.stage === 'published' ? `${s.copied ? icon('check') : icon('copy')}${s.copied ? 'Copied' : 'Copy link'}` : PRIMARY[s.stage]);
  const primaryHtml = (s) => btn('primaryLg', s.stage === 'published' ? 'copy' : 'publish', `<span class="m-spin">${icon('loader-circle', 'size-4 spin')}</span><span class="m-swap" data-swap="primary"><span class="m-label">${primaryLabel(s)}</span></span>`, { cls: 'f-primary', fk: 'primary', attrs: `aria-label="${s.stage === 'published' ? (s.copied ? 'Link copied' : 'Copy link') : PRIMARY[s.stage]}"` });
  const footerHtml = (s) => `<div class="f-footer">${bandHtml(s)}${primaryHtml(s)}</div>`;

  // The skeleton: every slot exists from the start; hidden rows are display:none.
  function dialogHtml(s, p) {
    const id = p.id;
    return `<div class="grid rounded-lg border bg-background p-6 shadow-lg x-dialog" role="dialog" aria-modal="true" tabindex="-1" aria-label="Share, ${p.name}" data-dialog-root>
      <div class="m-body" data-body>
        <div class="d-title-row"><div class="d-title">Share</div><button type="button" class="d-close" data-act="close" data-fk="close" aria-label="Close">${icon('x')}</button></div>
        <div class="m-row" data-slot="link"><div class="m-row-in">
          <div class="d-chip${live(s) ? '' : ' d-chip--off'}" data-chip>
            <a class="d-chip-url" data-fk="url" href="${urlOf(s)}" target="_blank" rel="noreferrer" title="Open in a new tab">${urlText(s)}<span class="d-sr"> (opens in a new tab)</span></a>
            <span class="v-copy-wrap" data-copy-wrap${live(s) ? '' : ' hidden'}>${copyBtn(s)}</span>
          </div>
          <div class="m-row" data-slot="copy-error"${s.copyError ? '' : ' hidden'}><div class="m-row-in" style="padding-top:6px"><p class="p-help p-help--error" data-copy-error style="margin:0">${COPY_FAILED}</p></div></div>
        </div></div>
        <div class="m-row" data-slot="access"${s.stage === 'draft' ? ' hidden' : ''}><div class="m-row-in">
          <div class="s-row"><span class="d-label" id="${id}-access-label">${icon('globe')}Who can open it</span><span class="s-right" data-access-right>${accessRight(s, id)}</span></div>
        </div></div>
        <div class="m-row" data-slot="password"><div class="m-row-in">
          <div class="p-block">
            <div class="d-row"><label class="d-label" for="${id}-pw">${icon('lock')}Password protected</label><button type="button" role="switch" id="${id}-pw" data-fk="pw-switch" aria-checked="${s.pwOn}" data-act="pw-toggle" data-size="default" data-${s.pwOn ? 'checked' : 'unchecked'} class="${SWITCH}"><span data-${s.pwOn ? 'checked' : 'unchecked'} class="${THUMB}"></span></button></div>
            <div class="m-row" data-slot="pw-field"${s.pwOn ? '' : ' hidden'}><div class="m-row-in" style="padding-top:8px">
              <div class="p-field" data-pw-field>
                <input class="${INPUT}" id="${id}-pw-input" data-fk="pw-input" type="${s.pwShow ? 'text' : 'password'}" autocomplete="off" spellcheck="false" aria-label="Password" aria-describedby="${id}-pw-help" placeholder="Set a password" data-act="pw-draft" value="${s.pwDraft}">
                ${btn('ghost', 'pw-show', `<span class="m-swap" data-swap="show"><span>${s.pwShow ? 'Hide' : 'Show'}</span></span>`, { fk: 'pw-show', attrs: `aria-pressed="${s.pwShow}" data-pw-show` })}
                <span class="m-swap" data-save-wrap${pwNeedsSave(s) ? '' : ' hidden'}>${btn('outline', 'pw-save', 'Save', { fk: 'pw-save', attrs: 'data-pw-save' })}</span>
              </div>
              <p class="p-help" id="${id}-pw-help" data-pw-help><span class="m-swap" data-swap="help"><span class="p-help-in">${pwHelp(s)}</span></span></p>
            </div></div>
          </div>
        </div></div>
      </div>
      <div class="m-footer" data-footer><div class="m-footer-in" data-footer-in>${s.confirm ? confirmHtml(s) : footerHtml(s)}</div></div>
    </div>`;
  }

  // ---------- motion engine ----------
  const opts = new Map();
  function optOf(id) { return opts.get(id); }
  const isReduced = (o) => (OS_REDUCED() || o.reduced) && PLANT !== 'reduce-moves';
  function timing(o, key) {
    const p = o.profile;
    const sp = p.spring && p.spring[key];
    const base = sp ? { duration: sp.duration, easing: sp.easing } : { duration: p.t[key] ?? p.t.fade, easing: p.e[key] ?? p.e.fade };
    return { duration: base.duration * o.speed, easing: base.easing };
  }
  const fadeTiming = (o) => ({ duration: (isReduced(o) ? 150 : o.profile.t.fade) * o.speed, easing: o.profile.e.fade });
  const exitTiming = (o) => ({ duration: (isReduced(o) ? 100 : o.profile.t.exit) * o.speed, easing: o.profile.e.exit });
  // Travel for an entering piece: sign follows the change under Directional.
  function travel(o, forward) {
    if (isReduced(o)) return 0;
    const p = o.profile;
    if (!p.travel) return 0;
    return p.directional ? (forward ? p.travel : -p.travel) : p.travel;
  }
  function track(o, anim, tag) {
    anim.id = tag || anim.id;
    o.anims.add(anim);
    const drop = () => o.anims.delete(anim);
    anim.finished.then(drop, drop);
    return anim;
  }
  const cancelTagged = (el, tag) => el.getAnimations().forEach((a) => { if (a.id === tag) a.cancel(); });
  const delay = (o, order) => (o.profile.stagger * order) * o.speed;

  // Fade a piece in (optionally from a travel offset) or out.
  function enter(o, el, forward, order) {
    const dy = travel(o, forward);
    const t = isReduced(o) ? { duration: 150 * o.speed, easing: o.profile.e.fade } : timing(o, 'swap');
    cancelTagged(el, 'exit');
    return track(o, el.animate([{ opacity: 0, transform: dy ? `translateY(${dy}px)` : 'none' }, { opacity: 1, transform: 'none' }], { ...t, delay: delay(o, order), fill: 'backwards' }), 'enter');
  }
  function exit(o, el, forward, order) {
    const dy = travel(o, forward);
    const t = exitTiming(o);
    return track(o, el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: dy ? `translateY(${-dy}px)` : 'none' }], { ...t, delay: delay(o, order), fill: 'forwards' }), 'exit');
  }
  // Replace a container's content with a crossfade: the old content stays as
  // an absolutely positioned ghost while the new content fades in.
  function swap(o, container, html, forward, order) {
    if (container.innerHTML === html && !container.querySelector(':scope > .m-ghost')) return false;
    container.querySelectorAll(':scope > .m-ghost').forEach((g) => g.remove());
    const ghost = document.createElement('span');
    ghost.className = 'm-ghost';
    for (const child of [...container.children]) ghost.appendChild(child);
    container.innerHTML = html;
    container.appendChild(ghost);
    exit(o, ghost, forward, order).finished.then(() => ghost.remove(), () => ghost.remove());
    for (const child of container.children) if (child !== ghost) enter(o, child, forward, order);
    return true;
  }
  // Animate a wrapper's height between two measured values. The only layout
  // property in the system, kept to one small wrapper per change.
  function animateHeight(o, el, from, to, onDone, order) {
    cancelTagged(el, 'height');
    if (isReduced(o) || from === to) { el.style.height = ''; el.style.overflow = ''; if (onDone) onDone(); return 0; }
    el.style.overflow = 'hidden';
    o.heightDelay = delay(o, order || 0);
    const anim = track(o, el.animate([{ height: `${from}px` }, { height: `${to}px` }], { ...timing(o, 'height'), delay: o.heightDelay, fill: 'backwards' }), 'height');
    const settle = () => { el.style.height = ''; el.style.overflow = ''; if (onDone) onDone(); };
    anim.finished.then(settle, () => {});
    return to - from;
  }
  const currentHeight = (el) => el.getBoundingClientRect().height;
  // Natural height with any crossfade ghosts out of the way (they are
  // absolutely positioned and would otherwise count toward scrollHeight).
  function naturalHeight(el) {
    const ghosts = [...el.querySelectorAll('.m-ghost')];
    for (const g of ghosts) g.style.display = 'none';
    const h = el.offsetHeight;
    for (const g of ghosts) g.style.display = '';
    return h;
  }
  // Show or hide a collapsible row. Returns the change in height.
  function setRow(o, row, present, forward, order) {
    const shown = !row.hidden;
    if (present === shown && !row.getAnimations().some((a) => a.id === 'height')) return 0;
    if (present) {
      const from = row.hidden ? 0 : currentHeight(row);
      row.hidden = false;
      cancelTagged(row, 'height');
      row.style.height = '';
      const to = naturalHeight(row);
      const inner = row.firstElementChild;
      if (from === 0) enter(o, inner, forward, order);
      else cancelTagged(inner, 'exit');
      animateHeight(o, row, from, to, null, order);
      return to - from;
    }
    const from = currentHeight(row);
    const inner = row.firstElementChild;
    exit(o, inner, forward, order);
    if (isReduced(o)) { row.hidden = true; return -from; }
    animateHeight(o, row, from, 0, () => { row.hidden = true; inner.getAnimations().forEach((a) => a.cancel()); }, order);
    return -from;
  }
  // Run a DOM change and animate whatever it did to the wrapper's height.
  function morph(o, el, change) {
    const from = currentHeight(el);
    cancelTagged(el, 'height');
    el.style.height = '';
    change();
    const to = naturalHeight(el);
    if (to !== from) animateHeight(o, el, from, to, null, 0);
    return to - from;
  }
  // Anchor rule: the dialog is centred, so a height change moves both edges
  // by half. Translate it by the other half so the edge near the pressed
  // control stays put. On a phone the sheet sits on the bottom edge already.
  function anchor(o, dh, side) {
    if (!dh || PHONE() || PLANT === 'shift') return;
    const el = o.card.querySelector('.x-stage-dialog');
    const current = new DOMMatrix(getComputedStyle(el).transform).m42;
    o.dy += side === 'bottom' ? -dh / 2 : dh / 2;
    el.style.transform = `translateY(${o.dy}px)`;
    cancelTagged(el, 'anchor');
    if (isReduced(o)) return;
    track(o, el.animate([{ transform: `translateY(${current}px)` }, { transform: `translateY(${o.dy}px)` }], { ...timing(o, 'height'), delay: o.heightDelay || 0, fill: 'backwards' }), 'anchor');
    o.heightDelay = 0;
  }
  function bandTone(o, band, tone, forward, order) {
    const was = band.dataset.tone;
    if (was === tone) return;
    const p = o.profile;
    const toneT = { duration: p.t.tone * o.speed, easing: 'ease' };
    if (p.sweep && !isReduced(o)) {
      // The old tone sits on an overlay that retreats; the band underneath is
      // already the new tone, so the dot and the words change as the edge passes.
      band.querySelectorAll('.f-band-sweep').forEach((x) => x.remove());
      const sweep = document.createElement('span');
      sweep.className = 'f-band-sweep';
      sweep.dataset.tone = was;
      band.prepend(sweep);
      band.style.transitionDuration = '0s';
      band.dataset.tone = tone;
      requestAnimationFrame(() => { band.style.transitionDuration = ''; });
      const kf = forward ? [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 0 100%)' }] : [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 100% 0 0)' }];
      const anim = track(o, sweep.animate(kf, { duration: p.t.tone * o.speed, easing: p.e.tone, delay: delay(o, order), fill: 'forwards' }), 'sweep');
      anim.finished.then(() => sweep.remove(), () => sweep.remove());
      const dotDelay = delay(o, order) + (p.t.tone * o.speed) * (forward ? 0.05 : 0.6);
      const wordDelay = delay(o, order) + (p.t.tone * o.speed) * (forward ? 0.2 : 0.4);
      band.querySelector('.d-dot').style.transitionDelay = `${dotDelay}ms`;
      band.querySelectorAll('.v-status-word, .f-band-text').forEach((x) => { x.style.transitionDelay = `${wordDelay}ms`; });
      setTimeout(() => band.querySelectorAll('.d-dot, .v-status-word, .f-band-text').forEach((x) => { x.style.transitionDelay = ''; }), delay(o, order) + p.t.tone * o.speed * 2 + 50);
    } else {
      band.style.transitionDelay = `${delay(o, order)}ms`;
      band.querySelectorAll('.d-dot, .v-status-word, .f-band-text').forEach((x) => { x.style.transitionDelay = `${delay(o, order)}ms`; });
      band.dataset.tone = tone;
      setTimeout(() => { band.style.transitionDelay = ''; band.querySelectorAll('.d-dot, .v-status-word, .f-band-text').forEach((x) => { x.style.transitionDelay = ''; }); }, delay(o, order) + toneT.duration + 50);
    }
    if (p.ping && tone === 'live' && !isReduced(o)) {
      const dot = band.querySelector('.d-dot');
      track(o, dot.animate([{ opacity: 0.6, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(2.6)' }], { duration: 600 * o.speed, easing: EASE.outQuart, delay: delay(o, order) + 120 * o.speed, pseudoElement: '::after' }), 'ping');
    }
  }
  function openDialog(o) {
    const dialog = o.card.querySelector('[data-dialog-root]');
    const p = o.profile;
    const reduced = isReduced(o);
    const t = reduced ? { duration: 160 * o.speed, easing: EASE.outCubic } : timing(o, PHONE() ? 'sheet' : 'dialog');
    let from;
    if (PHONE()) from = reduced ? { opacity: 0, transform: 'none' } : { opacity: 1, transform: 'translateY(100%)' };
    else from = { opacity: 0, transform: reduced ? 'none' : `translateY(${p.dialogTravel || 0}px) scale(${p.dialogScale})` };
    track(o, dialog.animate([from, { opacity: 1, transform: 'none' }], { ...t, fill: 'backwards' }), 'dialog');
  }
  function closeDialog(o, done) {
    const dialog = o.card.querySelector('[data-dialog-root]');
    const p = o.profile;
    const reduced = isReduced(o);
    const t = { duration: (reduced ? 120 : PHONE() ? 220 : 140) * o.speed, easing: EASE.outQuad };
    let to;
    if (PHONE()) to = reduced ? { opacity: 0, transform: 'none' } : { opacity: 1, transform: 'translateY(100%)' };
    else to = { opacity: 0, transform: reduced ? 'none' : `translateY(${(p.dialogTravel || 0) / 2}px) scale(${Math.max(p.dialogScale, 0.97)})` };
    const anim = track(o, dialog.animate([{ opacity: 1, transform: 'none' }, to], { ...t, fill: 'forwards' }), 'dialog');
    anim.finished.then(done, done);
  }
  function openMenu(o, wrap, s, forward) {
    wrap.querySelectorAll('[data-menu]').forEach((m) => m.remove());
    wrap.insertAdjacentHTML('beforeend', menuHtml(s, o.profile.id));
    const menu = wrap.querySelector('[data-menu]');
    placeMenu(o, menu, wrap.querySelector('[data-access-trigger]'));
    const p = o.profile;
    const reduced = isReduced(o);
    const t = reduced ? { duration: 120 * o.speed, easing: EASE.outCubic } : timing(o, 'menu');
    const up = menu.classList.contains('f-menu--up');
    const dy = reduced ? 0 : (p.menuTravel || 0) * (up ? -1 : 1);
    const scale = reduced ? 1 : p.menuScale;
    track(o, menu.animate([{ opacity: 0, transform: dy || scale !== 1 ? `translateY(${dy}px) scale(${scale})` : 'none' }, { opacity: 1, transform: 'none' }], { ...t, fill: 'backwards' }), 'menu');
    if (p.stagger && !reduced) menu.querySelectorAll('.f-item').forEach((it, i) => track(o, it.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 * o.speed, delay: 30 * i * o.speed, easing: EASE.outCubic, fill: 'backwards' }), 'menu-item'));
  }
  function closeMenu(o, wrap) {
    const menu = wrap.querySelector('[data-menu]');
    if (!menu) return;
    menu.dataset.closing = 'true';
    const t = { duration: (isReduced(o) ? 80 : 90) * o.speed, easing: EASE.outQuad };
    const anim = track(o, menu.animate([{ opacity: 1 }, { opacity: 0, transform: isReduced(o) ? 'none' : `scale(${Math.max(o.profile.menuScale, 0.97)})` }], { ...t, fill: 'forwards' }), 'menu');
    anim.finished.then(() => menu.remove(), () => menu.remove());
  }
  function placeMenu(o, menu, trigger) {
    const margin = 8;
    menu.style.maxWidth = `${window.innerWidth - margin * 2}px`;
    const t = trigger.getBoundingClientRect();
    const h = menu.getBoundingClientRect().height;
    const roomBelow = window.innerHeight - t.bottom - 4 - margin;
    const roomAbove = t.top - 4 - margin;
    if (o.s.menuUp || (h > roomBelow && roomAbove > roomBelow)) menu.classList.add('f-menu--up');
    const r = menu.getBoundingClientRect();
    const dx = r.left < margin ? margin - r.left : r.right > window.innerWidth - margin ? window.innerWidth - margin - r.right : 0;
    if (dx) menu.style.marginRight = `${-dx}px`;
  }
  // Width collapse for the copy icon and the Save button: a 36px flex item
  // leaving a row. Layout, but one item in one row.
  function setInline(o, wrap, present, forward, order) {
    const shown = !wrap.hidden;
    if (present === shown && !wrap.getAnimations().some((a) => a.id === 'width')) return;
    cancelTagged(wrap, 'width');
    const inner = wrap.firstElementChild;
    if (present) {
      const from = wrap.hidden ? 0 : wrap.getBoundingClientRect().width;
      wrap.hidden = false;
      wrap.style.width = '';
      const to = wrap.getBoundingClientRect().width;
      if (from === 0) { cancelTagged(inner, 'exit'); track(o, inner.animate([{ opacity: 0, transform: isReduced(o) || !o.profile.travel ? 'none' : 'scale(0.8)' }, { opacity: 1, transform: 'none' }], { ...fadeTiming(o), delay: delay(o, order), fill: 'backwards' }), 'enter'); }
      if (isReduced(o)) return;
      wrap.style.overflow = 'hidden';
      const anim = track(o, wrap.animate([{ width: `${from}px` }, { width: `${to}px` }], { ...timing(o, 'height'), delay: delay(o, order), fill: 'backwards' }), 'width');
      anim.finished.then(() => { wrap.style.overflow = ''; }, () => {});
    } else {
      const from = wrap.getBoundingClientRect().width;
      track(o, inner.animate([{ opacity: 1 }, { opacity: 0 }], { ...exitTiming(o), delay: delay(o, order), fill: 'forwards' }), 'exit');
      if (isReduced(o)) { wrap.hidden = true; return; }
      wrap.style.overflow = 'hidden';
      const anim = track(o, wrap.animate([{ width: `${from}px` }, { width: '0px' }], { ...timing(o, 'height'), delay: delay(o, order), fill: 'forwards' }), 'width');
      anim.finished.then(() => { wrap.hidden = true; wrap.style.overflow = ''; anim.cancel(); inner.getAnimations().forEach((a) => a.cancel()); }, () => {});
    }
  }
  function setTip(o, wrap, present) {
    const tip = wrap.querySelector('.v-tip');
    if (present && !tip) {
      wrap.insertAdjacentHTML('beforeend', '<span class="v-tip" aria-hidden="true">Copied</span>');
      const el = wrap.querySelector('.v-tip');
      const reduced = isReduced(o);
      const s = reduced ? 1 : o.profile.tipScale;
      const dy = travel(o, true);
      track(o, el.animate([{ opacity: 0, transform: dy || s !== 1 ? `translateX(-50%) translateY(${dy}px) scale(${s})` : 'translateX(-50%)' }, { opacity: 1, transform: 'translateX(-50%)' }], { ...(reduced ? { duration: 120 * o.speed, easing: EASE.outCubic } : timing(o, 'tip')), fill: 'backwards' }), 'tip');
    } else if (!present && tip && !tip.dataset.closing) {
      tip.dataset.closing = 'true';
      const anim = track(o, tip.animate([{ opacity: 1 }, { opacity: 0 }], { ...exitTiming(o), fill: 'forwards' }), 'tip');
      anim.finished.then(() => tip.remove(), () => tip.remove());
    }
  }
  function setIcon(o, swapEl, name) {
    for (const ic of swapEl.querySelectorAll('.m-icon')) {
      const on = ic.dataset.ic === name;
      const was = ic.style.opacity !== '0';
      if (on === was) continue;
      ic.style.opacity = on ? '1' : '0';
      const reduced = isReduced(o) || !o.profile.travel;
      track(o, ic.animate(on ? [{ opacity: 0, transform: reduced ? 'none' : 'scale(0.7)' }, { opacity: 1, transform: 'none' }] : [{ opacity: 1 }, { opacity: 0 }], { ...(on ? fadeTiming(o) : exitTiming(o)) }), 'icon');
    }
  }

  // ---------- paint: diff the two states, animate the slots that changed ----------
  function paint(o, before, after, meta) {
    const card = o.card;
    const p = o.profile;
    const stage = card.querySelector('.x-stage-dialog');
    o.s = after;
    card.dataset.stage = after.stage;
    card.dataset.open = String(after.open);
    card.dataset.busy = String(after.busy || '');
    card.dataset.confirm = String(after.confirm);
    card.dataset.tone = status(after).tone;
    card.querySelector('[data-presets]').innerHTML = PRESETS.map(([key, label]) => `<button type="button" class="x-preset" data-act="preset" data-arg="${key}" aria-pressed="${after.preset === key}">${label}</button>`).join('');
    const region = card.querySelector('[data-announce]');
    if (region.textContent !== after.announce) region.textContent = after.announce;
    const forward = FORWARD.has(meta.act === 'pw-toggle' && after.pwOn ? 'pw-toggle-on' : meta.act);

    if (!before.open && after.open) {
      o.dy = 0;
      stage.style.transform = '';
      stage.innerHTML = dialogHtml(after, p);
      openDialog(o);
      focusAfter(o, after);
      return;
    }
    if (before.open && !after.open) {
      const root = stage.querySelector('[data-dialog-root]');
      if (root && !root.dataset.closing) { root.dataset.closing = 'true'; closeDialog(o, () => { if (root.isConnected && !o.s.open) stage.innerHTML = ''; }); }
      card.querySelector('[data-opener]').focus({ preventScroll: true });
      return;
    }
    if (!after.open) { stage.innerHTML = ''; return; }
    const root = stage.querySelector('[data-dialog-root]');
    if (!root || meta.act === 'preset') { o.dy = 0; stage.style.transform = ''; stage.innerHTML = dialogHtml(after, p); return; }
    const id = p.id;
    let dh = 0;
    let order = 0;
    const reverse = p.stagger && !forward && (meta.act === 'off-done' || meta.act === 'cancel-off');
    const nextOrder = () => (reverse ? 3 - order++ : order++);

    root.querySelector('[data-body]').toggleAttribute('inert', !!(after.confirm || after.busy));

    // Link row: the URL goes live or inert, the copy icon appears or leaves,
    // the icon swaps to a check while Copied, the failure line appears.
    const chip = root.querySelector('[data-chip]');
    const wasLive = live(before);
    const nowLive = live(after);
    if (wasLive !== nowLive) {
      chip.classList.toggle('d-chip--off', !nowLive);
      const url = chip.querySelector('.d-chip-url');
      url.classList.toggle('d-chip-url--off', !nowLive);
      setInline(o, chip.querySelector('[data-copy-wrap]'), nowLive, forward, nextOrder());
    } else if (p.stagger && meta.act === 'publish-done') nextOrder();
    const copyWrap = chip.querySelector('[data-copy-wrap]');
    const copyButton = copyWrap.querySelector('button');
    copyButton.setAttribute('aria-label', after.copied ? 'Link copied' : 'Copy link');
    copyButton.title = after.copied ? 'Link copied' : 'Copy link';
    copyButton.toggleAttribute('aria-busy', after.copying);
    setIcon(o, copyWrap.querySelector('.m-icon-swap'), after.copied ? 'check' : 'copy');
    setTip(o, copyWrap, after.copied && meta.source === 'copy-icon');
    dh += setRow(o, root.querySelector('[data-slot="copy-error"]'), after.copyError, true, 0);

    // Access row: appears after the first publish; select while live, static "No one" while off.
    const accessRow = root.querySelector('[data-slot="access"]');
    const right = accessRow.querySelector('[data-access-right]');
    const accessPresent = after.stage !== 'draft';
    const accessOrder = (wasLive !== nowLive || before.stage === 'draft') ? nextOrder() : 0;
    if (accessPresent && !accessRow.hidden && wasLive !== nowLive) {
      const wrap = right.querySelector('.f-menu-wrap');
      if (wrap) closeMenu(o, wrap);
      swap(o, right, accessRight(after, id), forward, accessOrder);
    } else if (accessPresent && accessRow.hidden) {
      right.innerHTML = accessRight(after, id);
    }
    dh += setRow(o, accessRow, accessPresent, forward, accessOrder);
    const trigger = right.querySelector('[data-access-trigger]');
    if (trigger) {
      trigger.setAttribute('aria-expanded', String(after.menu));
      const wrap = trigger.closest('.f-menu-wrap');
      const menuEl = wrap.querySelector('[data-menu]:not([data-closing])');
      if (after.menu && !menuEl) openMenu(o, wrap, after, true);
      else if (!after.menu && menuEl) closeMenu(o, wrap);
      else if (after.menu && menuEl && menuEl.innerHTML !== menuHtml(after, id).replace(/^<div[^>]*>|<\/div>$/g, '')) { menuEl.innerHTML = menuHtml(after, id).replace(/^<div[^>]*>|<\/div>$/g, ''); }
    }

    // Password: the switch flips, the field row appears or leaves, Save
    // appears or leaves, the help line swaps. The input is patched, never replaced.
    const sw = root.querySelector('[data-fk="pw-switch"]');
    sw.setAttribute('aria-checked', String(after.pwOn));
    for (const el of [sw, sw.firstElementChild]) {
      el.toggleAttribute('data-checked', after.pwOn);
      el.toggleAttribute('data-unchecked', !after.pwOn);
    }
    const fieldRow = root.querySelector('[data-slot="pw-field"]');
    const input = fieldRow.querySelector('input');
    if (input.type !== (after.pwShow ? 'text' : 'password')) input.type = after.pwShow ? 'text' : 'password';
    if (input.value !== after.pwDraft && document.activeElement !== input) input.value = after.pwDraft;
    const showBtn = fieldRow.querySelector('[data-pw-show]');
    showBtn.setAttribute('aria-pressed', String(after.pwShow));
    swap(o, showBtn.querySelector('[data-swap="show"]'), `<span>${after.pwShow ? 'Hide' : 'Show'}</span>`, true, 0);
    if (after.pwOn) {
      if (fieldRow.hidden) {
        fieldRow.querySelector('[data-save-wrap]').hidden = !pwNeedsSave(after);
        fieldRow.querySelector('[data-swap="help"]').innerHTML = `<span class="p-help-in">${pwHelp(after)}</span>`;
      } else {
        setInline(o, fieldRow.querySelector('[data-save-wrap]'), pwNeedsSave(after), true, 0);
        dh += morph(o, fieldRow, () => swap(o, fieldRow.querySelector('[data-swap="help"]'), `<span class="p-help-in">${pwHelp(after)}</span>`, true, 0));
      }
    }
    dh += setRow(o, fieldRow, after.pwOn, after.pwOn, 0);

    // Footer: band plus primary, or the confirm. The band's tone, word and
    // sentence, the primary's label, busy spinner and action.
    const footer = root.querySelector('[data-footer]');
    const footerIn = footer.querySelector('[data-footer-in]');
    const hadConfirm = !!footerIn.querySelector('[data-confirm-panel]:not(.m-ghost [data-confirm-panel])') && !!footerIn.querySelector(':scope > .d-confirm');
    if (after.confirm !== hadConfirm) {
      dh += morph(o, footer, () => swap(o, footerIn, after.confirm ? confirmHtml(after) : footerHtml(after), forward, 0));
    }
    if (after.confirm) {
      const panel = footerIn.querySelector(':scope > .d-confirm');
      const pending = after.busy === 'off';
      panel.toggleAttribute('aria-busy', pending);
      panel.querySelector('[data-fk="cancel"]').disabled = pending;
      panel.querySelector('[data-fk="turn-off"]').toggleAttribute('aria-busy', pending);
    } else {
      const band = footerIn.querySelector(':scope > .f-footer > .f-band');
      const st = status(after);
      const bandOrder = (before.stage !== after.stage) ? nextOrder() : 0;
      bandTone(o, band, st.tone, forward, bandOrder);
      swap(o, band.querySelector('[data-swap="word"]'), `<span class="v-status-word">${st.word}</span>`, forward, bandOrder);
      swap(o, band.querySelector('[data-swap="text"]'), `<span>${st.text}</span>`, forward, bandOrder);
      const primary = footerIn.querySelector(':scope > .f-footer > .f-primary');
      primary.dataset.act = after.stage === 'published' ? 'copy' : 'publish';
      primary.setAttribute('aria-label', after.stage === 'published' ? (after.copied ? 'Link copied' : 'Copy link') : PRIMARY[after.stage]);
      primary.toggleAttribute('aria-busy', after.busy === 'publish' || (after.copying && meta.source === 'primary'));
      const primaryOrder = (before.stage !== after.stage) ? nextOrder() : 0;
      swap(o, primary.querySelector('[data-swap="primary"]'), `<span class="m-label">${primaryLabel(after)}</span>`, forward, primaryOrder);
    }

    // Anchor: the control that was pressed does not move.
    const side = meta.fromFooter ? 'bottom' : 'top';
    anchor(o, dh, side);
    focusAfter(o, after);
  }
  function focusAfter(o, s) {
    if (!s.focus) return;
    const el = s.focus === 'dialog' ? o.card.querySelector('[data-dialog-root]') : o.card.querySelector(`[data-fk="${s.focus}"]`) || (s.focus === 'access' ? o.card.querySelector('[data-fk="primary"]') : null);
    if (el && !el.disabled) el.focus({ preventScroll: true });
    o.s = { ...o.s, focus: null };
  }

  // ---------- dispatch ----------
  const timers = new Map();
  // Timers that stand for a request in flight. The Copied and error auto-clears are not waited on.
  function pending(o) { return [...timers.keys()].filter((k) => k === `${o.profile.id}:publish-done` || k === `${o.profile.id}:off-done`).length; }
  // A follow-up carries the meta of the press that started it, so the anchor
  // rule still knows where the user's pointer is when the answer lands.
  function later(o, act, ms, meta) {
    const key = `${o.profile.id}:${act}`;
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => { timers.delete(key); dispatch(o, act, null, { ...(meta || {}), act }); }, ms));
  }
  function dispatch(o, act, arg, meta) {
    const before = o.s;
    const after = reduce(before, act, arg);
    if (act === 'pw-draft') {
      o.s = after;
      const row = o.card.querySelector('[data-slot="pw-field"]');
      if (row && !row.hidden) {
        setInline(o, row.querySelector('[data-save-wrap]'), pwNeedsSave(after), true, 0);
        const dh = morph(o, row, () => swap(o, row.querySelector('[data-swap="help"]'), `<span class="p-help-in">${pwHelp(after)}</span>`, true, 0));
        anchor(o, dh, 'top');
      }
      return;
    }
    if (after === before) return;
    paint(o, before, after, { act, ...(meta || {}) });
    if (after.busy === 'publish' && before.busy !== 'publish') later(o, 'publish-done', 700, meta);
    if (after.busy === 'off' && before.busy !== 'off') later(o, 'off-done', 700, meta);
    if (act === 'copy' && after.copying) {
      const write = o.clipboard ? o.clipboard() : navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(urlOf(after)) : Promise.reject(new Error('no clipboard'));
      write.then(() => dispatch(o, 'copy-done', null, meta), () => dispatch(o, 'copy-failed', null, meta));
    }
    if (act === 'copy-done') later(o, 'uncopy', 1600, meta);
    if (act === 'copy-failed') later(o, 'clear-error', 2600, meta);
  }

  // ---------- tour: the transition inventory ----------
  // Each step clicks real controls. expect() reads the DOM after the step has
  // settled and returns the problems it sees; verify.mjs collects them.
  const visible = (el) => !!el && !el.hidden && el.getClientRects().length > 0;
  const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const toneOf = (root) => root.querySelector('.f-band:not(.m-ghost .f-band)')?.dataset.tone;
  function expectLive(root, s, want) {
    const out = [];
    const copy = root.querySelector('[data-copy-wrap]');
    if (visible(copy) !== want) out.push(`copy icon ${want ? 'missing' : 'still shown'}`);
    const access = root.querySelector('[data-slot="access"]');
    if (!visible(access)) out.push('access row hidden');
    else {
      const sel = access.querySelector('[data-access-trigger]');
      const stat = access.querySelector('[data-access-static]');
      if (want && !sel) out.push('access row has no select while live');
      if (!want && !stat) out.push('access row is not static "No one" while off');
      if (!want && sel) out.push('access row still has a select while off');
    }
    return out;
  }
  const STEPS = [
    { caption: 'Open the dialog. Never published.', run: (t) => t.click('opener'), expect: (root, s) => [...(s.open ? [] : ['dialog not open']), ...(visible(root.querySelector('[data-slot="access"]')) ? ['access row shown in draft'] : []), ...(toneOf(root) === 'off' ? [] : ['band not grey in draft']), ...(text(root.querySelector('[data-swap="primary"]')) === 'Publish' ? [] : ['primary is not Publish'])] },
    { caption: 'Publish. Spinner, then the band turns green, the access row and the copy icon arrive, the button becomes Copy link.', run: (t) => t.click('primary'), expect: (root, s) => [...(s.stage === 'published' ? [] : [`stage ${s.stage}`]), ...expectLive(root, s, true), ...(toneOf(root) === 'live' ? [] : ['band not green']), ...(text(root.querySelector('[data-swap="primary"]')) === 'Copy link' ? [] : [`primary "${text(root.querySelector('[data-swap="primary"]'))}"`])] },
    { caption: 'Copy link. Copied, then back.', run: async (t) => { await t.click('primary'); await t.until((s) => s.copied); await t.until((s) => !s.copied); }, expect: (root, s) => (s.copied ? ['still Copied'] : text(root.querySelector('[data-swap="primary"]')) === 'Copy link' ? [] : ['primary did not return to Copy link']) },
    { caption: 'Copy from the icon. The icon becomes a check with a Copied tip.', run: async (t) => { await t.click('copy-icon'); await t.until((s) => s.copied); }, expect: (root, s) => [...(s.copied ? [] : ['not copied']), ...(visible(root.querySelector('.v-tip')) ? [] : ['no Copied tip'])] },
    { caption: 'The tip goes, the icon returns.', run: (t) => t.until((s) => !s.copied), expect: (root, s) => (root.querySelector('.v-tip:not([data-closing])') ? ['tip still shown'] : []) },
    { caption: 'Open the access menu.', run: (t) => t.click('access'), expect: (root, s) => (s.menu && visible(root.querySelector('[data-menu]')) ? [] : ['menu not open']) },
    { caption: 'Escape closes it.', run: (t) => t.key('Escape'), expect: (root, s) => (s.menu || root.querySelector('[data-menu]:not([data-closing])') ? ['menu still open'] : []) },
    { caption: 'With no room below, the menu opens upward.', run: (t) => t.click('access', { up: true }), expect: (root, s) => (root.querySelector('[data-menu].f-menu--up') ? [] : ['menu did not flip']) },
    { caption: 'Choose No one. The confirm takes the footer\'s place.', run: (t) => t.click('item-off'), expect: (root, s) => [...(s.confirm ? [] : ['no confirm']), ...(visible(root.querySelector('[data-confirm-panel]')) ? [] : ['confirm panel not shown']), ...(document.activeElement?.dataset.fk === 'cancel' ? [] : ['focus not on Cancel'])] },
    { caption: 'Cancel. The band and the button come back.', run: (t) => t.click('cancel'), expect: (root, s) => [...(s.confirm ? ['still confirming'] : []), ...(s.stage === 'published' ? [] : ['stage changed']), ...(visible(root.querySelector('.f-primary')) ? [] : ['primary missing'])] },
    { caption: 'Password on. The field opens under the switch.', run: (t) => t.click('pw-switch'), expect: (root, s) => [...(s.pwOn ? [] : ['pwOn false']), ...(visible(root.querySelector('[data-slot="pw-field"]')) ? [] : ['field hidden']), ...(visible(root.querySelector('[data-pw-save]')) ? [] : ['Save missing'])] },
    { caption: 'Type a password. The line warns that everyone with the link will need it.', run: (t) => t.type('acme-2026'), expect: (root, s) => (/Press Save/.test(text(root.querySelector('[data-pw-help]'))) ? [] : [`help "${text(root.querySelector('[data-pw-help]'))}"`]) },
    { caption: 'Save. Save leaves, the line says it is saved.', run: (t) => t.click('pw-save'), expect: (root, s) => [...(s.pwSaved === 'acme-2026' ? [] : ['not saved']), ...(visible(root.querySelector('[data-pw-save]')) ? ['Save still shown'] : []), ...(/Saved\./.test(text(root.querySelector('[data-pw-help]'))) ? [] : ['help line not Saved'])] },
    { caption: 'Password off. The field folds away.', run: (t) => t.click('pw-switch'), expect: (root, s) => [...(s.pwOn ? ['pwOn true'] : []), ...(visible(root.querySelector('[data-slot="pw-field"]')) ? ['field still shown'] : [])] },
    { caption: 'You edit the page. The band turns yellow: visitors see the version from 2h ago.', run: (t) => t.act('edit'), expect: (root, s) => [...(s.stage === 'changes' ? [] : [`stage ${s.stage}`]), ...(toneOf(root) === 'changes' ? [] : ['band not yellow']), ...(text(root.querySelector('[data-swap="primary"]')) === 'Publish changes' ? [] : ['primary not Publish changes'])] },
    { caption: 'Publish changes. Yellow to green, the sentence and the label change.', run: (t) => t.click('primary'), expect: (root, s) => [...(s.stage === 'published' ? [] : [`stage ${s.stage}`]), ...(toneOf(root) === 'live' ? [] : ['band not green']), ...(/just now/.test(text(root.querySelector('.f-band-text'))) ? [] : ['sentence not updated'])] },
    { caption: 'Turn the link off: No one, then Turn off. Cancel greys out while it works.', run: async (t) => { await t.click('access'); await t.click('item-off'); await t.click('turn-off'); }, expect: (root, s) => [...(s.stage === 'unpublished' ? [] : [`stage ${s.stage}`]), ...(s.confirm ? ['confirm still up'] : []), ...expectLive(root, s, false), ...(toneOf(root) === 'off' ? [] : ['band not grey']), ...(text(root.querySelector('[data-swap="primary"]')) === 'Publish' ? [] : ['primary not Publish'])] },
    { caption: 'Publish from off. Everything comes back on.', run: (t) => t.click('primary'), expect: (root, s) => [...(s.stage === 'published' ? [] : [`stage ${s.stage}`]), ...expectLive(root, s, true), ...(toneOf(root) === 'live' ? [] : ['band not green'])] },
    { caption: 'The clipboard refuses. A line under the link says so, then clears.', run: async (t) => { t.failCopy(true); await t.click('copy-icon'); await t.until((s) => s.copyError); t.failCopy(false); }, expect: (root, s) => [...(s.copyError ? [] : ['no copy error']), ...(visible(root.querySelector('[data-slot="copy-error"]')) ? [] : ['error line hidden']), ...(s.copied ? ['Copied shown on failure'] : [])] },
    { caption: 'Close with Escape, then open again.', run: async (t) => { await t.until((s) => !s.copyError); await t.key('Escape'); await t.settle(); await t.click('opener'); }, expect: (root, s) => [...(s.open ? [] : ['not open']), ...(s.stage === 'published' ? [] : ['stage lost']), ...(visible(root.querySelector('[data-slot="access"]')) ? [] : ['access row missing after reopen'])] },
    { caption: 'Close.', run: (t) => t.click('close'), expect: (root, s) => (s.open ? ['still open'] : []) },
  ];
  function animationsRunning(o) {
    return o.card.getAnimations({ subtree: true }).filter((a) => a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity && !(a.effect.target && a.effect.target.classList && a.effect.target.classList.contains('x-cursor')));
  }
  function settle(o) {
    return new Promise((resolve) => {
      const tick = () => { if (animationsRunning(o).length === 0 && pending(o) === 0) resolve(); else setTimeout(tick, 40); };
      setTimeout(tick, 60);
    });
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function moveCursor(o, el, press) {
    const cur = o.card.querySelector('.x-cursor');
    const stage = o.card.querySelector('.x-stage').getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2 - stage.left;
    const y = r.top + r.height / 2 - stage.top;
    cur.style.setProperty('--cx', `${x}px`);
    cur.style.setProperty('--cy', `${y}px`);
    cur.dataset.on = 'true';
    if (press) { cur.dataset.press = 'true'; setTimeout(() => { delete cur.dataset.press; }, 160); }
  }
  async function tour(id, hooks) {
    const o = optOf(id);
    if (o.touring) return;
    o.touring = true;
    const h = hooks || {};
    const btnEl = o.card.querySelector('[data-tour]');
    btnEl.setAttribute('aria-pressed', 'true');
    const cap = o.card.querySelector('.x-caption');
    const hold = () => sleep(h.hold ?? 700);
    const wait = () => settle(o);
    const t = {
      click: async (fk, x) => {
        const el = o.card.querySelector(`[data-fk="${fk}"]`);
        if (!el) throw new Error(`no control ${fk}`);
        moveCursor(o, el, false);
        await sleep(h.hold === 0 ? 0 : 260);
        moveCursor(o, el, true);
        if (x && x.up) dispatch(o, 'menu-open', true, { act: 'menu-open', source: fk });
        else if (h.click) { const r = el.getBoundingClientRect(); await h.click(r.left + r.width / 2, r.top + r.height / 2); }
        else el.click();
        await wait();
      },
      key: async (key) => { document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); onKey({ key, target: o.card.querySelector('[role="dialog"]') || o.card, preventDefault() {} }); await wait(); },
      type: async (str) => {
        const input = o.card.querySelector('[data-fk="pw-input"]');
        input.focus();
        for (const ch of str) { input.value += ch; dispatch(o, 'pw-draft', input.value); await sleep(h.hold === 0 ? 0 : 40); }
        await wait();
      },
      act: async (act) => { dispatch(o, act, null, { act }); await wait(); },
      until: async (pred) => { while (!pred(o.s)) await sleep(30); await wait(); },
      settle: wait,
      failCopy: (on) => { o.clipboard = on ? () => Promise.reject(new Error('refused')) : () => sleep(120); },
    };
    o.clipboard = () => sleep(120);
    dispatch(o, 'preset', 'draft', { act: 'preset' });
    if (o.s.open) { dispatch(o, 'close', null, { act: 'close' }); await wait(); }
    const problems = [];
    for (let i = 0; i < STEPS.length; i++) {
      const step = STEPS[i];
      cap.innerHTML = `<span class="x-caption-step">${i + 1} / ${STEPS.length}</span><span>${step.caption}</span>`;
      if (h.onStep) await h.onStep(i, step.caption);
      await step.run(t);
      await wait();
      const root = o.card.querySelector('[data-dialog-root]') || o.card;
      const bad = step.expect(root, o.s).map((m) => `step ${i + 1} (${step.caption.split('.')[0]}): ${m}`);
      problems.push(...bad);
      if (h.onDone) await h.onDone(i, bad);
      await hold();
    }
    cap.innerHTML = `<span class="x-caption-step">done</span><span>Every transition, once. Press Tour to watch again.</span>`;
    o.card.querySelector('.x-cursor').removeAttribute('data-on');
    btnEl.setAttribute('aria-pressed', 'false');
    o.clipboard = null;
    o.touring = false;
    return problems;
  }

  // ---------- page ----------
  const grid = document.getElementById('options');
  grid.innerHTML = VIEW.map((p, i) => `<article class="x-opt" id="${p.id}" data-option="${p.id}" data-profile="${p.id}">
      <div class="x-opt-head">
        <div class="x-opt-title"><span class="x-opt-num">${i + 1}</span>${p.name}<span class="x-tag">${p.tag}</span></div>
        <p class="x-opt-note">${p.note}</p>
      </div>
      <div class="x-videos">
        <div class="x-video"><video controls playsinline preload="metadata" src="./videos/${p.id}-desktop.mp4" poster="./videos/${p.id}-desktop.jpg"></video><span class="x-video-label">Tour at 1440, recorded</span></div>
        <div class="x-video x-video--phone"><video controls playsinline preload="metadata" src="./videos/${p.id}-phone.mp4" poster="./videos/${p.id}-phone.jpg"></video><span class="x-video-label">Tour at 390, recorded</span></div>
      </div>
      <div class="x-controls">
        <button type="button" class="x-ctl x-ctl--tour" data-tour aria-pressed="false">${icon('play', 'size-3.5')}Tour</button>
        <button type="button" class="x-ctl" data-slow aria-pressed="false">0.25x</button>
        <button type="button" class="x-ctl" data-reduced aria-pressed="false">Reduced motion</button>
        <span class="x-sep"></span>
        <div class="x-presets" data-presets></div>
      </div>
      <div class="x-stage" data-stage>
        ${btn('outline', 'open', `${icon('globe')}Share`, { fk: 'opener', cls: 'x-opener', attrs: 'data-opener' })}
        <div class="x-stage-dialog"></div>
        <span class="x-cursor" aria-hidden="true"></span>
        <span class="d-sr" aria-live="polite" data-announce></span>
      </div>
      <div class="x-caption"><span class="x-caption-step"></span><span>Press Tour, or use the dialog.</span></div>
      <div class="x-spec"><h3>Spec</h3><dl>${p.spec.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></div>
    </article>`).join('');
  window.ICONS.play = '<polygon points="6 3 20 12 6 21 6 3"/>';
  grid.querySelectorAll('[data-icon="play"]').forEach((el) => { el.innerHTML = window.ICONS.play; });

  for (const p of VIEW) {
    const card = document.getElementById(p.id);
    const o = { profile: p, card, s: presetState('changes', !ONLY), dy: 0, speed: 1, reduced: false, anims: new Set(), clipboard: null, touring: false };
    opts.set(p.id, o);
    card.style.setProperty('--t-tone', `${p.t.tone}ms`);
    paint(o, { ...BLANK, open: false }, o.s, { act: 'preset' });
    card.querySelector('[data-tour]').addEventListener('click', () => tour(p.id));
    card.querySelector('[data-slow]').addEventListener('click', (e) => {
      o.speed = o.speed === 1 ? 4 : 1;
      e.currentTarget.setAttribute('aria-pressed', String(o.speed === 4));
      card.style.setProperty('--speed', String(o.speed));
      card.style.setProperty('--tw-duration', `calc(0.15s * ${o.speed})`);
    });
    card.querySelector('[data-reduced]').addEventListener('click', (e) => {
      o.reduced = !o.reduced;
      e.currentTarget.setAttribute('aria-pressed', String(o.reduced));
      card.dataset.reduced = String(o.reduced);
    });
  }

  const cardOf = (el) => el.closest && el.closest('.x-opt');
  function closeMenusExcept(keep) {
    for (const o of opts.values()) if (o.profile.id !== keep && o.s.menu) dispatch(o, 'menu-close', 'keep', { act: 'menu-close' });
  }
  document.addEventListener('click', (event) => {
    const control = event.target.closest('[data-act]');
    const inMenu = event.target.closest('[data-menu], [data-act="menu-open"]');
    const card = control && cardOf(control);
    const act = control && control.dataset.act;
    const arg = control && control.dataset.arg;
    const fromFooter = !!(control && control.closest('[data-footer]'));
    closeMenusExcept(inMenu ? cardOf(inMenu).id : null);
    if (!control || control.tagName === 'INPUT' || !card) return;
    const o = optOf(card.id);
    if (act === 'menu-open' && o.s.menu) { dispatch(o, 'menu-close', null, { act: 'menu-close' }); return; }
    dispatch(o, act, arg, { act, source: control.dataset.fk, fromFooter });
  });
  const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function onKey(event) {
    const card = cardOf(event.target);
    const o = card && optOf(card.id);
    const s = o && o.s;
    const dialogEl = card && card.querySelector('[role="dialog"]');
    const inDialog = dialogEl && dialogEl.contains(event.target);
    if (event.key === 'Escape') {
      if (s && s.confirm) { event.preventDefault(); if (!s.busy) dispatch(o, 'cancel-off', null, { act: 'cancel-off', fromFooter: true }); return; }
      if (s && s.menu) { event.preventDefault(); dispatch(o, 'menu-close', null, { act: 'menu-close' }); return; }
      if (s && s.open && (inDialog || event.target === card)) { event.preventDefault(); dispatch(o, 'close', null, { act: 'close' }); return; }
      closeMenusExcept(null);
      return;
    }
    if (!o) return;
    const menuEl = event.target.closest('[data-menu]');
    if (menuEl) {
      const items = [...menuEl.querySelectorAll('[role="menuitemradio"]')];
      const i = items.indexOf(event.target);
      const go = (n) => { event.preventDefault(); items[(n + items.length) % items.length].focus(); };
      if (event.key === 'ArrowDown') return go(i + 1);
      if (event.key === 'ArrowUp') return go(i - 1);
      if (event.key === 'Home') return go(0);
      if (event.key === 'End') return go(items.length - 1);
      if (event.key === 'Tab') { event.preventDefault(); dispatch(o, 'menu-close', null, { act: 'menu-close' }); }
      return;
    }
    if (event.target.matches && event.target.matches('[data-act="menu-open"]') && (event.key === 'ArrowDown' || event.key === 'ArrowUp') && !s.menu) { event.preventDefault(); dispatch(o, 'menu-open', null, { act: 'menu-open' }); return; }
    if (event.key === 'Tab' && inDialog) {
      const tabbables = [...dialogEl.querySelectorAll(TABBABLE)].filter((el) => !el.closest('[inert]') && !el.closest('[hidden]') && el.getClientRects().length);
      const i = tabbables.indexOf(event.target);
      if (event.shiftKey && i <= 0) { event.preventDefault(); tabbables[tabbables.length - 1].focus(); }
      else if (!event.shiftKey && i === tabbables.length - 1) { event.preventDefault(); tabbables[0].focus(); }
      return;
    }
    if (event.target.matches && event.target.matches('input[data-act="pw-draft"]') && event.key === 'Enter') { event.preventDefault(); dispatch(o, 'pw-save', null, { act: 'pw-save' }); }
  }
  document.addEventListener('keydown', (event) => { if (!event.isTrusted) return; onKey(event); });
  document.addEventListener('input', (event) => {
    const control = event.target.closest('input[data-act="pw-draft"]');
    if (!control) return;
    dispatch(optOf(cardOf(control).id), 'pw-draft', control.value);
  });

  window.__motion = {
    PROFILES: VIEW.map((p) => p.id),
    STEPS: STEPS.map((s) => s.caption),
    plant: PLANT,
    state: (id) => optOf(id).s,
    tour,
    settle: (id) => settle(optOf(id)),
    running: (id) => animationsRunning(optOf(id)).map((a) => ({ id: a.id, props: a.effect.getKeyframes().flatMap((k) => Object.keys(k).filter((key) => !['offset', 'computedOffset', 'easing', 'composite'].includes(key))) })),
    setSpeed: (id, v) => { const o = optOf(id); o.speed = v; o.card.style.setProperty('--speed', String(v)); o.card.style.setProperty('--tw-duration', `calc(0.15s * ${v})`); o.card.querySelector('[data-slow]').setAttribute('aria-pressed', String(v !== 1)); },
    setReduced: (id, v) => { const o = optOf(id); o.reduced = v; o.card.dataset.reduced = String(v); o.card.querySelector('[data-reduced]').setAttribute('aria-pressed', String(v)); },
    dispatch: (id, act, arg) => dispatch(optOf(id), act, arg, { act }),
    timing: (id, key) => { const o = optOf(id); const sp = o.profile.spring && o.profile.spring[key]; return sp ? sp.duration : o.profile.t[key]; },
    stageBox: (id) => { const r = optOf(id).card.querySelector('[data-stage]').getBoundingClientRect(); const c = optOf(id).card.querySelector('.x-caption').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: c.bottom - r.top }; },
    done: false,
  };
  if (ONLY && q.get('autoplay') === '1') {
    document.fonts.ready.then(() => sleep(500)).then(() => tour(ONLY, { hold: 900 })).then((problems) => { window.__motion.problems = problems; window.__motion.done = true; });
  }
})();
