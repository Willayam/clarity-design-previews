/* Round 2: banner treatments, trial-ended concepts, badge variants.
   Builds on the round-1 helpers exported as window.MK. Mock data only. */
(function () {
  'use strict';
  const M = window.MK;
  if (!M) return;
  const I = M.I, btn = M.btn, fmt = M.fmt, S = M.STATES, PAGES = M.PAGES, TRIAL = M.TRIAL, PASTDUE = M.PASTDUE;
  const DAYS = 14;
  const STATE_KEYS = ['early', 'last3', 'lastday', 'pastdue'];
  const TONE = { early: 'brand', last3: 'amber', lastday: 'strong', pastdue: 'red' };
  function elapsed(k) { return S[k].daysLeft == null ? DAYS : DAYS - S[k].daysLeft; }
  function dismissBtn(k, cls) { return S[k].dismiss ? btn({ variant: 'ghost', size: 'icon-sm', icon: 'x', attrs: 'aria-label="Dismiss"', cls: cls || '' }) : ''; }

  /* ===================================================== 1. banner styles */
  function ring(k) {
    if (k === 'pastdue') return '<span class="r2-ring-alert">' + I('circle-alert', 'size-5') + '</span>';
    const r = 8, c = 2 * Math.PI * r, frac = elapsed(k) / DAYS;
    return '<svg viewBox="0 0 20 20" class="r2-ring r2-ink-' + TONE[k] + '" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-opacity="0.18" stroke-width="2.5"/><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="' + (c * frac).toFixed(2) + ' ' + c.toFixed(2) + '" transform="rotate(-90 10 10)"/></svg>';
  }

  // S1 Hairline and ring: white, one hairline, a ring that fills as the trial runs.
  function s1(k, phone) {
    const s = S[k];
    const cta = k === 'pastdue' ? btn({ variant: 'default', size: 'sm', label: s.cta }) : btn({ variant: 'link', size: 'sm', label: s.cta, cls: 'px-1' });
    return '<div class="r2-bar r2-s1 flex items-center gap-3 border-b border-border/70 bg-card text-sm ' + (phone ? 'flex-wrap px-4 py-2' : 'px-6 py-2') + '">' + ring(k) +
      '<p class="min-w-0 flex-1 ' + (phone ? 'basis-56' : 'truncate') + '"><span class="font-medium">' + s.title + '.</span> <span class="text-muted-foreground">' + s.line + '</span></p>' +
      '<span class="ml-auto flex shrink-0 items-center gap-1">' + cta + dismissBtn(k) + '</span></div>';
  }

  // S2 Ink: a dark status strip with one coloured dot.
  function s2(k, phone) {
    const s = S[k];
    return '<div class="r2-bar r2-s2 flex items-center gap-3 text-sm ' + (phone ? 'flex-wrap px-4 py-2' : 'px-6 py-2') + '">' +
      '<span class="r2-dot r2-bg-' + TONE[k] + '"></span>' +
      '<p class="min-w-0 flex-1 ' + (phone ? 'basis-56' : 'truncate') + '"><span class="font-medium ' + (k === 'pastdue' ? 'r2-s2-red' : '') + '">' + s.title + '.</span> <span class="r2-s2-muted">' + s.line + '</span></p>' +
      '<span class="ml-auto flex shrink-0 items-center gap-1.5"><button type="button" class="r2-s2-btn">' + s.cta + '</button>' + (s.dismiss ? '<button type="button" class="r2-s2-x" aria-label="Dismiss">' + I('x', 'size-3.5') + '</button>' : '') + '</span></div>';
  }

  // S3 Wash and line: a tinted band with a progress line along its bottom edge and a day chip.
  function s3(k, phone) {
    const s = S[k];
    const pct = Math.round(elapsed(k) / DAYS * 100);
    const chip = k === 'pastdue' ? '<span class="r2-chip r2-chip-red">Pro</span>' : '<span class="r2-chip">Day ' + elapsed(k) + ' of 14</span>';
    return '<div class="r2-bar r2-s3 r2-wash-' + TONE[k] + ' relative text-sm"><div class="flex items-center gap-3 ' + (phone ? 'flex-wrap px-4 py-2' : 'px-6 py-2') + '">' + chip +
      '<p class="min-w-0 flex-1 ' + (phone ? 'basis-56' : 'truncate') + '"><span class="font-medium">' + s.title + '.</span> <span class="r2-wash-line">' + s.line + '</span></p>' +
      '<span class="ml-auto flex shrink-0 items-center gap-1">' + btn({ variant: k === 'early' ? 'outline' : 'default', size: 'sm', label: s.cta }) + dismissBtn(k) + '</span></div>' +
      '<div class="r2-track" aria-hidden="true"><div class="r2-track-fill" style="width:' + pct + '%"></div></div></div>';
  }

  // S4 Capsule: a floating glass notice over the content, not a bar.
  function s4(k, phone) {
    const s = S[k];
    if (phone) {
      return '<div class="r2-cap-wrap relative shrink-0"><div class="r2-capsule r2-cap-' + TONE[k] + ' glass mx-3 mt-3 flex flex-col gap-2 rounded-2xl p-3 text-sm">' +
        '<p class="flex items-start gap-2"><span class="r2-dot r2-bg-' + TONE[k] + ' mt-1.5"></span><span class="min-w-0 flex-1"><span class="font-medium">' + s.title + '.</span> <span class="text-muted-foreground">' + s.line + '</span></span>' + (s.dismiss ? btn({ variant: 'ghost', size: 'icon-xs', icon: 'x', attrs: 'aria-label="Dismiss"', cls: 'rounded-full -mr-1 -mt-1' }) : '') + '</p>' +
        btn({ variant: s.ctaVariant, size: 'sm', label: s.cta, cls: 'rounded-full self-end' }) + '</div></div>';
    }
    return '<div class="r2-cap-wrap relative h-14 shrink-0"><div class="r2-capsule r2-cap-' + TONE[k] + ' glass absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full py-1 pr-1 pl-3.5 text-sm whitespace-nowrap">' +
      '<span class="r2-dot r2-bg-' + TONE[k] + '"></span><span><span class="font-medium">' + s.title + '.</span> <span class="text-muted-foreground">' + s.line + '</span></span>' +
      btn({ variant: s.ctaVariant, size: 'sm', label: s.cta, cls: 'rounded-full' }) + (s.dismiss ? btn({ variant: 'ghost', size: 'icon-sm', icon: 'x', attrs: 'aria-label="Dismiss"', cls: 'rounded-full' }) : '') + '</div></div>';
  }

  // S5 Day dots: text and fourteen dots. No fill, no button.
  const S5_TEXT = {
    early: 'Day 5 of 14. Nine days of Pro left, until ' + fmt(TRIAL.end) + '.',
    last3: 'Day 12 of 14. Three days of Pro left, until ' + fmt(TRIAL.end) + '.',
    lastday: 'Day 14 of 14. Pro ends tonight. Your pages stay live.',
    pastdue: 'Payment failed ' + fmt(PASTDUE.failed) + '. Update your card by ' + fmt(PASTDUE.keepUntil) + ' to keep Pro.',
  };
  function dayDots(k) {
    const e = elapsed(k);
    let out = '';
    for (let i = 0; i < DAYS; i++) out += '<i class="r2-day' + (i < e - 1 ? ' is-past' : i === e - 1 ? ' is-today' : '') + '"></i>';
    return '<span class="r2-days r2-ink-' + TONE[k] + '" aria-hidden="true">' + out + '</span>';
  }
  function s5(k, phone) {
    const s = S[k];
    const lead = k === 'pastdue' ? '<span class="r2-dot r2-bg-red"></span>' : dayDots(k);
    return '<div class="r2-bar r2-s5 flex items-center gap-3 border-b border-border/70 text-sm ' + (phone ? 'flex-wrap px-4 py-2.5' : 'px-6 py-2.5') + '">' + lead +
      '<p class="min-w-0 flex-1 ' + (phone ? 'basis-56' : 'truncate') + ' text-muted-foreground"><span class="text-foreground">' + S5_TEXT[k] + '</span></p>' +
      '<span class="ml-auto flex shrink-0 items-center gap-1">' + btn({ variant: 'link', size: 'sm', label: s.cta, icon: 'arrow-right', cls: 'flex-row-reverse px-1' }) + dismissBtn(k, 'size-6') + '</span></div>';
  }

  // S6 Edge tab: a coloured line along the top edge and a small tab at the right.
  function s6(k, phone) {
    const s = S[k];
    const short = { early: '9 days left', last3: '3 days left', lastday: 'Trial ends today', pastdue: 'Payment failed' }[k];
    return '<div class="r2-edge r2-edge-' + TONE[k] + ' relative h-3 shrink-0"><div class="r2-edge-line"></div><div class="r2-edge-tab absolute top-0 ' + (phone ? 'right-3' : 'right-6') + ' flex items-center gap-2 rounded-b-lg px-2.5 py-1 text-xs font-medium"><span>' + short + '</span><span class="r2-edge-sep">·</span><a href="#" class="underline underline-offset-2">' + s.cta + '</a>' + (s.dismiss ? '<button type="button" class="r2-edge-x" aria-label="Dismiss">' + I('x', 'size-3') + '</button>' : '') + '</div></div>';
  }

  const STYLES = {
    s1: { label: '1 · Hairline ring', fn: s1, note: 'White bar, one hairline, a 20px ring that fills as the trial runs. The ring is the only colour, and the action is a text link until payment fails, when it becomes a button. The quietest of the six, and the one that shows at a glance how far along the trial is.' },
    s2: { label: '2 · Ink', fn: s2, note: 'A dark strip in the app\'s own ink, like a status line, with a coloured dot for the state. It separates itself from the page without a tint, so it never looks like an alert until the dot turns red. The strongest presence on the screen: the early state is as loud as the last day.' },
    s3: { label: '3 · Wash and line', fn: s3, note: 'The brand wash from round 1 with a 2px line along the bottom edge that shows trial elapsed, and a day chip. The line does the counting, so the sentence can stay short. Amber and red are the only other colours it ever uses.' },
    s4: { label: '4 · Capsule', fn: s4, note: 'A floating glass capsule over the content, like the editor\'s own toolbars, centred under the top edge. It is a notice rather than a bar, so the page keeps its edges; it costs 56px of height instead of 40px. On a phone it becomes a small card.' },
    s5: { label: '5 · Day dots', fn: s5, note: 'Text and fourteen dots, one per trial day, filled as they pass, today in colour. No fill, no button: the action is an inline link with an arrow. The most informative and the plainest.' },
    s6: { label: '6 · Edge tab', fn: s6, note: 'A 3px coloured line along the top edge and a small tab hanging from it at the right. The content is untouched and the count is always visible; the state is the colour. It is also the easiest to miss, which is the point for the early state and the risk for the last day.' },
  };

  function bannerGrid(styleKey) {
    const fn = STYLES[styleKey].fn;
    return STATE_KEYS.map(function (k) {
      return '<div class="r2-row"><p class="mk-state-label">' + S[k].name + (S[k].dismiss ? ' · can dismiss' : ' · no dismiss') + '</p><div class="r2-row-frames">' +
        M.frame('desktop', M.desktopShell({ barHtml: fn(k, false), meter: null }), null, 230) +
        M.frame('phone', M.phoneShell({ barHtml: fn(k, true) }), null, 330) + '</div></div>';
    }).join('');
  }

  function renderBanners() {
    const host = document.getElementById('r2-banner-controls');
    if (!host) return;
    let style = 's1';
    const draw = function () {
      document.getElementById('r2-banner-note').textContent = STYLES[style].note;
      M.mount('r2-banner-grid', bannerGrid(style));
    };
    host.appendChild(M.segmented('Banner treatment', Object.keys(STYLES).map(function (k) { return { value: k, label: STYLES[k].label }; }), style, function (v) { style = v; draw(); }));
    draw();
  }

  /* ================================================ 2. trial-ended moment */
  function slotTiles(small) {
    const tile = function (p) {
      return '<div class="r2-slot"><div class="r2-slot-stage">' + M.miniPage(p.tone) + '</div>' + (small ? '' : '<p class="r2-slot-title">' + p.title + '</p><p class="r2-slot-meta"><span class="r2-live-dot"></span>Live · ' + p.views + ' views</p>') + '</div>';
    };
    const empty = '<div class="r2-slot r2-slot-empty"><div class="r2-slot-stage"><span>1 slot free</span></div>' + (small ? '' : '<p class="r2-slot-title">Your next page</p><p class="r2-slot-meta">Publish any draft</p>') + '</div>';
    return '<div class="r2-slots' + (small ? ' r2-slots-sm' : '') + '">' + tile(PAGES[0]) + tile(PAGES[1]) + empty + '</div>';
  }

  // A: a full page, no scrim, no dialog.
  function welcomePage(phone) {
    return '<div class="r2-welcome relative flex h-full w-full flex-col overflow-hidden bg-(image:--shell-frame) text-foreground">' +
      '<div class="flex items-center ' + (phone ? 'px-4 pt-5' : 'px-6 pt-6') + '"><img src="' + M.LOGO + '" class="block h-7 w-auto" alt="Clarity"></div>' +
      '<div class="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center text-center ' + (phone ? 'px-4 py-6' : 'px-6 py-8') + '">' +
        '<p class="text-sm font-medium text-muted-foreground">Your trial ended ' + fmt(TRIAL.end) + '</p>' +
        '<h1 class="mt-2 text-4xl leading-none font-semibold tracking-tight">You\'re on Free</h1>' +
        '<p class="mt-3 text-base text-muted-foreground">Everything you made is still here.</p>' +
        slotTiles(false) +
        '<p class="mx-auto mt-5 max-w-md text-sm text-muted-foreground">2 of 3 live pages. Recording and your library stay unlimited. New pages carry a small Made with Clarity badge, and who watched is Pro.</p>' +
        '<div class="mt-7 flex flex-col items-center gap-3">' + btn({ variant: 'default', size: 'lg', label: 'Continue on Free' }) + '<a href="#" class="text-sm text-muted-foreground underline underline-offset-2">Upgrade to Pro · $49 a month</a></div>' +
      '</div></div>';
  }

  // B: nothing interrupts; the meter and a one-time Home card carry it.
  function endedHomeCard(phone) {
    return '<section class="r2-ended-card mb-7 flex gap-5 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 ' + (phone ? 'flex-col' : 'items-center') + '">' + slotTiles(true) +
      '<div class="min-w-0 flex-1"><p class="text-base font-semibold">Your trial ended ' + fmt(TRIAL.end) + '. You\'re on Free.</p>' +
      '<p class="mt-1 text-sm text-muted-foreground">Your 2 live pages stay live, and so does your library. Free keeps 3 pages live at once; new pages carry a small Made with Clarity badge, and who watched is Pro.</p>' +
      '<div class="mt-3 flex gap-2">' + btn({ variant: 'ghost', label: 'Got it' }) + btn({ variant: 'outline', label: 'Upgrade to Pro' }) + '</div></div></section>';
  }

  // C: a sheet from the right (from the bottom on a phone).
  function sheet(phone) {
    const row = function (p) {
      return '<div class="flex items-center gap-3 py-2.5"><span class="relative block h-9 w-14 shrink-0 overflow-hidden rounded-sm bg-card ring-1 ring-foreground/10">' + M.miniPage(p.tone, 'mk-mini-sm') + '</span><span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium">' + p.title + '</span><span class="block text-xs text-muted-foreground">' + p.views + ' views</span></span><span class="r2-live-pill"><span class="r2-live-dot"></span>Live</span></div>';
    };
    // On a phone the actions stay at the bottom edge, within thumb reach; on
    // a desktop they follow the text.
    const body = '<div class="flex h-full flex-col"><div class="min-h-0 overflow-hidden ' + (phone ? 'flex-1 px-5 pt-6' : 'px-7 pt-8') + '">' +
      '<p class="text-sm font-medium text-muted-foreground">' + fmt(TRIAL.end) + '</p>' +
      '<h2 class="mt-1 text-3xl leading-tight font-semibold tracking-tight">You\'re on Free now</h2>' +
      '<p class="mt-2 text-sm text-muted-foreground">Your trial ended. Here is what that means for your account.</p>' +
      '<p class="r2-sheet-label mt-7">Stays</p><div class="divide-y">' + row(PAGES[0]) + row(PAGES[1]) + '</div>' +
      '<p class="mt-2.5 text-sm text-muted-foreground">And every recording, upload and draft in your library.</p>' +
      '<p class="r2-sheet-label mt-7">Changes</p><dl class="r2-sheet-dl"><div><dt>Live pages</dt><dd>3 at once. Unpublish one to free a slot.</dd></div><div><dt>Badge</dt><dd>A small Made with Clarity badge on your pages.</dd></div><div><dt>Analytics</dt><dd>Views stay. Who watched and how far is Pro.</dd></div></dl></div>' +
      '<div class="flex flex-col gap-2 ' + (phone ? 'border-t px-5 py-4' : 'px-7 pt-8 pb-6') + '">' + btn({ variant: 'default', size: 'lg', label: 'Continue on Free', cls: 'w-full' }) + btn({ variant: 'ghost', size: 'lg', label: 'Upgrade to Pro', cls: 'w-full' }) + '</div></div>';
    if (phone) return '<div class="r2-scrim absolute inset-0 z-40"></div><div class="absolute inset-x-0 bottom-0 z-50 rounded-t-2xl bg-card shadow-2xl" style="height:88%">' + body + '</div>';
    return '<div class="r2-scrim absolute inset-0 z-40"></div><div class="absolute inset-y-0 right-0 z-50 bg-card shadow-2xl" style="width:27rem">' + body + '</div>';
  }

  // D: one card, one number, two lines, on the frosted Home.
  function numberCard() {
    return '<div class="r2-numcard w-full max-w-md rounded-2xl bg-card p-8 text-center shadow-xl ring-1 ring-foreground/10">' +
      '<p class="text-sm font-medium text-muted-foreground">Your trial ended ' + fmt(TRIAL.end) + '</p>' +
      '<p class="r2-hero-num mt-3">3</p><p class="text-lg font-medium">pages live at once on Free</p>' +
      '<p class="mt-5 text-sm text-muted-foreground">Your 2 live pages stay live, and so does everything in your library.</p>' +
      '<p class="mt-1.5 text-sm text-muted-foreground">New pages carry a small Made with Clarity badge. Who watched is Pro.</p>' +
      '<div class="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">' + btn({ variant: 'outline', size: 'lg', label: 'Upgrade to Pro' }) + btn({ variant: 'default', size: 'lg', label: 'Continue on Free' }) + '</div></div>';
  }
  function frosted(inner) { return '<div class="r2-frost absolute inset-0 z-50 grid place-items-center p-4">' + inner + '</div>'; }

  // E: a short signed note on Home.
  function noteCard() {
    return '<section class="r2-note mb-7 max-w-2xl rounded-2xl bg-card p-6 ring-1 ring-foreground/10">' +
      '<p class="text-base leading-relaxed">Hi Sam,</p>' +
      '<p class="mt-3 text-base leading-relaxed">Your trial ended on Friday. Everything you made is still here, and your two live pages are still live. On Free you can keep three pages live at once, and new pages carry a small Clarity badge.</p>' +
      '<p class="mt-3 text-base leading-relaxed">If Pro paid for itself, it is $49 a month. Either way, thanks for trying it.</p>' +
      '<p class="mt-4 text-base">William<br><span class="text-sm text-muted-foreground">Clarity</span></p>' +
      '<div class="mt-5 flex gap-2">' + btn({ variant: 'ghost', label: 'Got it' }) + btn({ variant: 'outline', label: 'Upgrade to Pro' }) + '</div></section>';
  }

  const CONCEPTS = {
    a: { label: 'A · Welcome page', note: 'A full page, no scrim, no dialog. The plan is drawn rather than described: the rep\'s two live pages in their slots and the third slot free. One primary action, Continue on Free, with Upgrade as a line of text. It shows once; then Home opens as usual.',
      desktop: function () { return welcomePage(false); }, phone: function () { return welcomePage(true); }, caption: 'Shown once, in place of Home' },
    b: { label: 'B · No dialog', note: 'Nothing interrupts. Home opens with the usage meter already reading 2 of 3 and a one-time card at the top that says the same thing in two lines. Got it removes the card for good. The lightest touch, and the one most likely to be skimmed past.',
      desktop: function () { return M.desktopShell({ prefixHtml: endedHomeCard(false), meter: '2of3' }); }, phone: function () { return M.phoneShell({ prefixHtml: endedHomeCard(true), meter: '2of3' }); }, caption: 'Home, first visit after the trial' },
    c: { label: 'C · Side sheet', note: 'A sheet from the right over Home, which stays readable behind a light scrim. There is room to list the two live pages by name, so "stays" is a fact the rep can check, not a claim. On a phone it rises from the bottom.',
      desktop: function () { return M.desktopShell({ overlayHtml: sheet(false), meter: '2of3' }); }, phone: function () { return M.phoneShell({ overlayHtml: sheet(true), meter: '2of3' }); }, caption: 'Over Home' },
    d: { label: 'D · Number card', note: 'One card over the frosted Home, the way the old wall looked, with the one number that matters at 72px and two lines under it. The shortest read of the five.',
      desktop: function () { return M.desktopShell({ overlayHtml: frosted(numberCard()), meter: '2of3' }); }, phone: function () { return M.phoneShell({ overlayHtml: frosted(numberCard()), meter: '2of3' }); }, caption: 'Over Home' },
    e: { label: 'E · A note', note: 'A short signed note on Home in place of a notice. The same facts, written to one person. The warmest of the five, and the one that most depends on the tone staying right as the copy is edited.',
      desktop: function () { return M.desktopShell({ prefixHtml: noteCard(), meter: '2of3' }); }, phone: function () { return M.phoneShell({ prefixHtml: noteCard(), meter: '2of3' }); }, caption: 'Home, first visit after the trial' },
  };

  function renderEnded() {
    const host = document.getElementById('r2-ended-controls');
    if (!host) return;
    let key = 'a';
    const draw = function () {
      const c = CONCEPTS[key];
      document.getElementById('r2-ended-note').textContent = c.note;
      M.mount('r2-ended-frames', M.frame('desktop', c.desktop(), 'Desktop · ' + c.caption) + M.frame('phone', c.phone(), 'Phone'));
    };
    host.appendChild(M.segmented('Trial-ended concept', Object.keys(CONCEPTS).map(function (k) { return { value: k, label: CONCEPTS[k].label }; }), key, function (v) { key = v; draw(); }));
    draw();
  }

  /* ===================================================== 3. badge variants */
  const WORDMARK = '<img src="../assets/clarity-logo.svg" alt="Clarity" class="r2-wordmark">';
  const BADGES = {
    pill: { label: '1 · Corner pill', note: 'A pill pinned to the bottom-right corner, the way Framer does it. Always visible, never in the content, 12px text. On a phone it covers the corner of the last line until the prospect scrolls past it.',
      page: function () { return M.publicPage({ badge: false }); }, extra: '<div class="r2-pin r2-pin-right"><a href="#" class="r2-pill" title="Make your own page">' + M.MARK + '<span>Made with Clarity</span></a></div>' },
    footer: { label: '2 · Footer line', scrollEnd: true, note: 'A hairline and one line at the end of the page, with the Clarity wordmark in grey. It reads as a colophon. Nothing shows until the prospect reaches the end; the frames start there.',
      page: function () { return M.publicPage({ badgeHtml: '<footer class="r2-foot"><span>Made with</span>' + WORDMARK + '<span class="r2-foot-sep">·</span><a href="#">Make your own</a></footer>' }); }, extra: '' },
    card: { label: '3 · End card', scrollEnd: true, note: 'A muted band after the last block with one sentence and a quiet outline button. It explains what Clarity is, which a pill cannot, and it is the only variant that carries a message. Its button is deliberately smaller and greyer than the rep\'s. The frames start at the end.',
      page: function () { return M.publicPage({ badgeHtml: '<aside class="r2-endcard"><span class="r2-endcard-mark">' + M.MARK + '</span><div class="r2-endcard-copy"><p class="r2-endcard-title">Make a page like this in 2 minutes</p><p class="r2-endcard-line">Record a video and Clarity builds the page around it. Send the link and see who watched.</p></div><a href="#" class="r2-endcard-btn">Make your own, free</a></aside>' }); }, extra: '' },
    strip: { label: '4 · Top strip', note: 'A 28px strip above the hero. The most visible placement and the smallest type. Everything the prospect reads starts under a Clarity line, which is the trade.',
      page: function () { return M.publicPage({ badge: false, topHtml: '<div class="r2-strip"><a href="#">' + M.MARK + '<span>Made with Clarity</span><span class="r2-strip-sep">·</span><u>Make your own</u></a></div>' }); }, extra: '' },
    reveal: { label: '5 · Scroll reveal', note: 'Nothing until the prospect reaches the end of the page; then a pill rises at the bottom centre. Scroll a frame back to the top to see it go. It stays out of the video and the call to action by definition.',
      page: function () { return M.publicPage({ badge: false }); }, extra: '<div class="r2-pin r2-pin-center"><a href="#" class="r2-pill r2-reveal">' + M.MARK + '<span>Made with Clarity</span><span class="r2-pill-sep">·</span><u>Make your own</u></a></div>', reveal: true },
    slot: { label: '6 · Logo slot', note: 'The Clarity wordmark sits where a Pro rep\'s logo goes, top-left in the hero, in grey. The upgrade is literal: your logo here. It never comes near the call to action, and when the rep upgrades nothing is added or removed, only swapped.',
      page: function () { return M.publicPage({ badge: false, heroLogoHtml: '<div class="company-logo-wrap r2-logo-slot" data-journey-brand-logo data-logo-align="left"><a href="#" title="Made with Clarity">' + WORDMARK + '</a><a href="#" class="r2-logo-note">Make your own</a></div>' }); }, extra: '' },
  };

  function pageFrame(kind, b) {
    return '<figure class="mk-fig mk-fig-' + (kind === 'phone' ? 'phone' : 'page') + '"><div class="r2-page-frame r2-page-' + kind + '" data-reveal="' + (b.reveal ? '1' : '') + '" data-scroll-end="' + (b.reveal || b.scrollEnd ? '1' : '') + '">' + b.page() + b.extra + '</div><figcaption class="mk-cap">' + (kind === 'phone' ? 'Phone' : 'Desktop, the page a prospect opens') + ' · scrolls</figcaption></figure>';
  }

  function wireFrames(root) {
    root.querySelectorAll('.r2-page-frame[data-reveal="1"]').forEach(function (f) {
      const pill = f.querySelector('.r2-reveal');
      const last = f.querySelector('[data-section-id="s1"]');
      if (!pill || !last) return;
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { pill.classList.toggle('is-shown', e.isIntersecting && e.intersectionRatio > 0.55); });
      }, { root: f, threshold: [0, 0.55, 1] });
      io.observe(last);
    });
    // Variants whose subject sits at the end of the page start there.
    root.querySelectorAll('.r2-page-frame[data-scroll-end="1"]').forEach(function (f) {
      requestAnimationFrame(function () { f.scrollTop = f.scrollHeight; });
    });
  }

  function renderBadges() {
    const host = document.getElementById('r2-badge-controls');
    if (!host) return;
    let key = 'pill';
    const draw = function () {
      const b = BADGES[key];
      document.getElementById('r2-badge-note').textContent = b.note;
      M.mount('r2-badge-frames', pageFrame('desktop', b) + pageFrame('phone', b));
      wireFrames(document.getElementById('r2-badge-frames'));
    };
    host.appendChild(M.segmented('Badge variant', Object.keys(BADGES).map(function (k) { return { value: k, label: BADGES[k].label }; }), key, function (v) { key = v; draw(); }));
    draw();
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderBanners();
    renderEnded();
    renderBadges();
  });
})();
