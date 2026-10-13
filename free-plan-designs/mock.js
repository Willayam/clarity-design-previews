/* Free plan mockups. Everything below builds markup from the app's own class
   strings (variants.js, computed by the real cva definitions) and lucide icon
   nodes (icons.js). Mock data only. */
(function () {
  'use strict';

  /* ------------------------------------------------------------ helpers */
  const ICONS = window.ICONS || {};
  const V = window.VARIANTS || { buttons: {}, badges: {}, sidebar: {}, inputs: {} };

  function I(name, cls) {
    const body = ICONS[name] || '';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="' + (cls || 'size-4') + '">' + body + '</svg>';
  }

  function btn(o) {
    const variant = o.variant || 'default';
    const size = o.size || 'default';
    const surface = o.surface || 'hero';
    const base = V.buttons[variant + '/' + size + '/' + surface] || '';
    const parts = [];
    if (o.icon) parts.push(I(o.icon, o.iconCls || 'size-4'));
    if (o.label) parts.push('<span>' + o.label + '</span>');
    return '<button type="button" data-slot="button" data-button-variant="' + variant + '" data-button-size="' + size + '" data-variant="' + variant + '" data-size="' + size + '" class="' + base + (o.cls ? ' ' + o.cls : '') + '"' + (o.attrs ? ' ' + o.attrs : '') + (o.disabled ? ' disabled' : '') + (o.busy ? ' aria-busy="true" disabled' : '') + '>' + parts.join('') + '</button>';
  }

  function badge(variant, label, cls) {
    return '<span data-slot="badge" class="' + (V.badges[variant] || '') + (cls ? ' ' + cls : '') + '">' + label + '</span>';
  }

  function fmt(iso) {
    return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  }
  function fmtLong(iso) {
    return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  }

  // Resolved from this script's own URL, so a page in a subfolder (round-2)
  // still finds the asset beside round 1.
  const LOGO = (function () {
    const src = document.currentScript && document.currentScript.src;
    return src ? src.replace(/mock\.js(\?.*)?$/, 'assets/clarity-logo.svg') : './assets/clarity-logo.svg';
  })();
  // The circle-and-play mark from clarity-logo.svg, on its own.
  const MARK = '<svg viewBox="0 0 35 35" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M17.5233 1.13672C25.3611 1.13672 31.9004 6.69914 33.4127 14.0936L33.5218 14.808H28.0609L27.888 14.1351C26.514 9.71513 22.3933 6.50588 17.5236 6.50588C11.53 6.50588 6.67143 11.367 6.67143 17.3638C6.67143 23.3603 11.53 28.2217 17.5236 28.2217C22.3933 28.2217 26.5138 25.0125 27.888 20.5925L28.0787 19.8506H33.5322L33.4127 20.634C31.9004 28.0285 25.3611 33.591 17.5233 33.591C8.56594 33.591 1.30469 26.3257 1.30469 17.3638C1.30469 8.40191 8.56594 1.13672 17.5233 1.13672Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M13.6348 10.0469L26.9345 17.441L13.6348 24.6496V10.0469Z" fill="currentColor"/></svg>';

  /* --------------------------------------------------------------- data */
  const REP = { name: 'Sam Rivera', initial: 'S', email: 'sam@riverasales.example' };
  const TRIAL = { start: '2026-10-02', end: '2026-10-16' };
  const PASTDUE = { failed: '2026-10-12', keepUntil: '2026-10-19' };
  const PRO_CANCEL_DATE = '2026-11-12';

  const PAGES = [
    { id: 'p1', title: 'Northwind Logistics · fleet routing walkthrough', age: '3w ago', views: 14, lastViewed: '2d ago', stage: 'published', tone: 'a' },
    { id: 'p2', title: 'Brightline Dental · intake demo', age: '1w ago', views: 6, lastViewed: 'yesterday', stage: 'published', tone: 'b' },
    { id: 'p3', title: 'Harbor & Finch · proposal recap', age: '2d ago', views: 2, lastViewed: '5h ago', stage: 'published', tone: 'c' },
    { id: 'p4', title: 'Alder Creek Homes · follow-up', age: '4h ago', views: 0, lastViewed: null, stage: 'draft', tone: 'd' },
  ];
  const VIDEOS = [
    { title: 'Northwind routing demo', age: '3w ago', duration: '1:42', tone: 'a' },
    { title: 'Intro for Brightline', age: '1w ago', duration: '0:58', tone: 'b' },
    { title: 'Proposal recap', age: '2d ago', duration: '2:15', tone: 'c' },
  ];

  // Banner states. One label per button; the tint and the sentence change.
  const STATES = {
    early: {
      key: 'early', name: 'Early trial', daysLeft: 9,
      title: 'Trial · 9 days left',
      line: 'Everything in Pro until ' + fmt(TRIAL.end) + '.',
      long: '9 days of everything in Pro left. After that you are on Free: 3 live pages, the Clarity badge on pages, view counts only. Nothing you publish goes away.',
      cta: 'Upgrade to Pro', ctaVariant: 'outline', icon: 'clock', dismiss: true, tone: 'quiet',
    },
    last3: {
      key: 'last3', name: 'Last 3 days', daysLeft: 3,
      title: '3 days left on your trial',
      line: 'Pro ends ' + fmt(TRIAL.end) + '. After that: Free, with 3 live pages and the Clarity badge.',
      long: 'Pro ends ' + fmt(TRIAL.end) + '. After that you are on Free: 3 live pages, the Clarity badge on pages, view counts only. Your pages stay live.',
      cta: 'Upgrade to Pro', ctaVariant: 'default', icon: 'clock', dismiss: true, tone: 'amber',
    },
    lastday: {
      key: 'lastday', name: 'Last day', daysLeft: 0,
      title: 'Your trial ends today',
      line: 'From tomorrow you are on Free. Your pages stay live.',
      long: 'From tomorrow you are on Free: 3 live pages, the Clarity badge on pages, view counts only. Every page you published stays live.',
      cta: 'Upgrade to Pro', ctaVariant: 'default', icon: 'triangle-alert', dismiss: false, tone: 'amber-strong',
    },
    pastdue: {
      key: 'pastdue', name: 'Payment failed', daysLeft: null,
      title: 'Payment failed',
      line: 'We could not charge your card on ' + fmt(PASTDUE.failed) + '. Update it by ' + fmt(PASTDUE.keepUntil) + ' to keep Pro.',
      long: 'We could not charge your card on ' + fmt(PASTDUE.failed) + '. Update it by ' + fmt(PASTDUE.keepUntil) + ' to keep Pro. Until then nothing changes.',
      cta: 'Update card', ctaVariant: 'default', icon: 'credit-card', dismiss: false, tone: 'red',
    },
  };

  const METERS = {
    '0of3': { live: 0, label: '0 of 3 live pages', sub: null, tone: 'ok' },
    '2of3': { live: 2, label: '2 of 3 live pages', sub: null, tone: 'ok' },
    '3of3': { live: 3, label: '3 of 3 live pages', sub: 'Unpublish one to publish another.', tone: 'full' },
    '5of3': { live: 5, label: '5 live pages · 3 is the Free limit', sub: 'Kept from your trial. Publish again when you are under 3.', tone: 'over' },
  };

  /* ------------------------------------------------------- small parts */
  function miniPage(tone, cls) {
    return '<span class="mk-mini mk-tone-' + tone + (cls ? ' ' + cls : '') + '" aria-hidden="true">' +
      '<i class="mk-mini-h1"></i><i class="mk-mini-h1 short"></i><i class="mk-mini-poster"><b></b></i><i class="mk-mini-cta"></i><i class="mk-mini-line"></i><i class="mk-mini-line short"></i></span>';
  }

  function pageCard(p, opts) {
    const o = opts || {};
    const metaBits = [];
    if (p.stage === 'draft') metaBits.push('<span>Draft</span>');
    if (p.stage === 'unpublished') metaBits.push('<span>Unpublished</span>');
    metaBits.push('<span class="inline-flex items-center">' + I('calendar', 'mr-1 size-3.5') + p.age + '</span>');
    if (p.views) metaBits.push('<span class="inline-flex items-center">' + I('eye', 'mr-1 size-3.5') + p.views + ' views</span>');
    return '<div class="group/card relative isolate flex flex-col overflow-visible rounded-none border-transparent bg-transparent text-sm ' + (o.cls || '') + '" data-media-card>' +
      '<div class="relative flex aspect-video shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card/55 shadow-xs inset-ring-1 inset-ring-foreground/5 backdrop-blur-sm" data-slot="frost-stage">' +
        '<span class="absolute top-7/100 left-1/2 flex h-7/5 w-29/50 -translate-x-1/2 flex-col overflow-hidden rounded-t-sm bg-card shadow-sm ring-1 ring-foreground/5">' +
          '<span class="flex h-3.5 flex-none items-center gap-0.75 border-b border-border bg-muted px-1.5"><span class="size-1 rounded-full bg-border"></span><span class="size-1 rounded-full bg-border"></span><span class="size-1 rounded-full bg-border"></span></span>' +
          '<span class="relative flex min-h-0 flex-auto flex-col">' + miniPage(p.tone) + '</span>' +
        '</span>' +
        '<span class="absolute top-2 left-2 z-6 flex"><span class="glass glass-media flex size-8.5 items-center justify-center rounded-lg">' + I('share', 'size-3.5') + '</span></span>' +
      '</div>' +
      '<div class="flex flex-auto flex-col gap-1 px-1 pt-2.5 pb-1.5 text-left min-w-0">' +
        '<div class="block min-w-0 truncate text-base leading-tight font-semibold tracking-tight">' + p.title + '</div>' +
        '<div class="flex min-w-0 items-center gap-0 text-xs font-medium whitespace-nowrap text-muted-foreground">' + metaBits.join('<span class="mx-1.5 text-muted-foreground/55" aria-hidden="true">·</span>') + '</div>' +
      '</div></div>';
  }

  function videoCard(v) {
    return '<div class="group/card relative isolate flex flex-col overflow-visible rounded-none border-transparent bg-transparent text-sm" data-media-card>' +
      '<div class="relative flex aspect-video shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-lg shadow-foreground/15 ring-1 ring-border mk-poster mk-tone-' + v.tone + '">' +
        '<span class="glass glass-media absolute bottom-2.5 left-2.5 z-2 grid size-9.5 place-items-center rounded-full [&_svg]:fill-current">' + I('play', 'size-3.5') + '</span>' +
        '<span class="absolute right-2.5 bottom-2.5 z-2 inline-flex h-6 min-w-10.5 items-center justify-center rounded-full px-2 bg-scrim/90 text-xs font-semibold leading-none whitespace-nowrap text-scrim-foreground">' + v.duration + '</span>' +
      '</div>' +
      '<div class="flex flex-auto flex-col gap-1 px-1 pt-2.5 pb-1.5 text-left min-w-0">' +
        '<div class="block min-w-0 truncate text-base leading-tight font-semibold tracking-tight">' + v.title + '</div>' +
        '<div class="flex items-center gap-0 text-xs font-medium whitespace-nowrap text-muted-foreground"><span class="inline-flex items-center">' + I('clock', 'mr-1 size-3.5') + v.duration + '</span><span class="mx-1.5 text-muted-foreground/55" aria-hidden="true">·</span><span class="inline-flex items-center">' + I('calendar', 'mr-1 size-3.5') + v.age + '</span></div>' +
      '</div></div>';
  }

  function shelf(title, count, cardsHtml, phone) {
    return '<section class="min-w-0"><div class="mb-3 flex items-baseline gap-2.5"><h2 class="text-base font-semibold">' + title + '</h2><span class="text-xs font-medium text-muted-foreground">' + count + '</span><span class="ms-auto text-xs font-medium text-muted-foreground">Show all</span></div>' +
      '<div class="flex gap-4 overflow-hidden py-1 ' + (phone ? '-mx-4 px-4' : '-mx-6 px-6') + '">' + cardsHtml + '</div></section>';
  }

  function shelves(phone, pages) {
    const list = pages || PAGES.slice(0, 3);
    const w = phone ? 'w-4/5 max-w-4/5 basis-4/5 shrink-0 min-w-0 flex [&>*]:w-full [&>*]:min-w-0' : 'w-68 max-w-68 basis-68 shrink-0 min-w-0 flex [&>*]:w-full [&>*]:min-w-0';
    const pagesHtml = list.map(function (p) { return '<div class="' + w + '">' + pageCard(p) + '</div>'; }).join('');
    const videosHtml = VIDEOS.slice(0, 3).map(function (v) { return '<div class="' + w + '">' + videoCard(v) + '</div>'; }).join('');
    return '<div class="flex flex-col gap-7">' + shelf('Journey Pages', list.length, pagesHtml, phone) + shelf('Videos', 3, videosHtml, phone) + '</div>';
  }

  /* ------------------------------------------------------------- banner */
  function bannerBar(state, phone) {
    const s = STATES[state];
    const cta = btn({ variant: s.ctaVariant, size: 'sm', label: s.cta });
    const dismiss = s.dismiss ? btn({ variant: 'ghost', size: 'icon-sm', icon: 'x', attrs: 'aria-label="Dismiss"' }) : '';
    return '<div class="mk-bar mk-tone-' + s.tone + ' flex items-center gap-3 border-b border-border/70 text-sm ' + (phone ? 'flex-wrap px-4 py-2' : 'px-6 py-2') + '">' +
      '<span class="mk-bar-icon grid size-6 shrink-0 place-items-center rounded-full">' + I(s.icon, 'size-3.5') + '</span>' +
      '<p class="min-w-0 flex-1 ' + (phone ? 'basis-56' : 'truncate') + '"><span class="font-medium">' + s.title + '.</span> <span class="mk-bar-line">' + s.line + '</span></p>' +
      '<span class="ml-auto flex shrink-0 items-center gap-1">' + cta + dismiss + '</span></div>';
  }

  function bannerSideCard(state) {
    const s = STATES[state];
    const dismiss = s.dismiss ? btn({ variant: 'ghost', size: 'icon-xs', icon: 'x', attrs: 'aria-label="Dismiss"', cls: '-mt-1 -mr-1' }) : '';
    return '<div class="px-4 pb-1"><div class="mk-side-card mk-tone-' + s.tone + ' rounded-xl bg-card p-3 text-sm ring-1 ring-foreground/10">' +
      '<div class="flex items-start justify-between gap-2"><p class="flex items-center gap-1.5 font-medium leading-tight"><span class="mk-bar-icon grid size-5 shrink-0 place-items-center rounded-full">' + I(s.icon, 'size-3') + '</span>' + s.title + '</p>' + dismiss + '</div>' +
      '<p class="mt-1.5 text-xs leading-snug text-muted-foreground">' + s.line + '</p>' +
      btn({ variant: s.ctaVariant, size: 'sm', label: s.cta, cls: 'mt-2.5 w-full' }) +
      '</div></div>';
  }

  function bannerHomeCard(state, phone) {
    const s = STATES[state];
    const titles = { early: 'Your trial ends ' + fmt(TRIAL.end), last3: '3 days left on your trial', lastday: 'Your trial ends today', pastdue: 'We could not charge your card' };
    const actions = (s.dismiss ? btn({ variant: 'ghost', size: 'default', label: 'Dismiss' }) : '') + btn({ variant: s.ctaVariant === 'outline' ? 'outline' : 'default', size: 'default', label: s.cta });
    return '<section class="mk-home-card mk-tone-' + s.tone + ' mb-7 flex gap-4 rounded-xl bg-card/70 p-4 ring-1 ring-foreground/10 backdrop-blur-sm ' + (phone ? 'flex-col' : 'items-start') + '">' +
      '<div class="flex min-w-0 flex-1 gap-3"><span class="mk-bar-icon grid size-9 shrink-0 place-items-center rounded-full">' + I(s.icon, 'size-4') + '</span>' +
      '<div class="min-w-0 flex-1"><p class="font-medium">' + titles[state] + '</p><p class="mt-0.5 text-sm text-muted-foreground">' + s.long + '</p></div></div>' +
      '<div class="flex shrink-0 items-center gap-2 ' + (phone ? 'justify-end' : '') + '">' + actions + '</div></section>';
  }

  /* -------------------------------------------------------------- meter */
  function meter(key, opts) {
    const m = METERS[key];
    const o = opts || {};
    const segs = [0, 1, 2].map(function (i) { return '<i class="mk-seg' + (i < m.live ? ' on' : '') + '"></i>'; }).join('');
    const over = m.live > 3 ? '<span class="mk-seg-over">+' + (m.live - 3) + '</span>' : '';
    return '<div class="mk-meter mk-meter-' + m.tone + ' rounded-lg px-2.5 py-2 text-xs ' + (o.cls || '') + '" data-meter="' + key + '">' +
      '<div class="flex items-center gap-1.5"><span class="font-medium text-foreground">Free</span><span class="text-muted-foreground/55" aria-hidden="true">·</span><span class="min-w-0 flex-1 truncate text-muted-foreground">' + m.label + '</span><a href="#" class="shrink-0 font-medium text-primary underline-offset-2 hover:underline">Upgrade</a></div>' +
      '<div class="mt-1.5 flex items-center gap-1" aria-hidden="true">' + segs + over + '</div>' +
      (m.sub ? '<p class="mt-1.5 leading-snug text-muted-foreground">' + m.sub + '</p>' : '') +
      '</div>';
  }

  /* -------------------------------------------------------------- shell */
  function sidebarNav(active) {
    const items = [['house', 'Home', 'home'], ['users', 'Contacts', 'contacts'], ['book-open', 'Learn', 'learn'], ['settings', 'Settings', 'settings']];
    return '<ul class="flex w-full min-w-0 flex-col gap-1">' + items.map(function (it) {
      return '<li class="relative grid gap-0.5"><a href="#" data-slot="sidebar-menu-button" data-active="' + (it[2] === active) + '" class="' + V.sidebar.lg + '"' + (it[2] === active ? ' aria-current="page"' : '') + '>' + I(it[0], 'size-4') + '<span>' + it[1] + '</span></a></li>';
    }).join('') + '</ul>';
  }

  function accountRow() {
    return '<button type="button" data-slot="sidebar-menu-button" class="' + V.sidebar.lg + '">' +
      '<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/10 text-foreground"><span class="text-sm font-semibold">' + REP.initial + '</span></span>' +
      '<span class="min-w-0 flex-1 truncate text-sm font-medium text-sidebar-foreground">' + REP.name + '</span>' +
      I('chevrons-up-down', 'ml-auto size-4 shrink-0 text-sidebar-foreground/40') + '</button>';
  }

  function sidebarInner(o) {
    return '<div class="relative flex flex-row items-center justify-between gap-3 px-5 pt-6 pb-4"><img src="' + LOGO + '" alt="Clarity" class="block h-8 w-auto">' + btn({ variant: 'outline', size: 'icon-sm', icon: 'panel-left', attrs: 'aria-label="Toggle navigation"' }) + '</div>' +
      '<div class="flex min-h-0 flex-1 flex-col overflow-hidden py-2"><div class="relative flex w-full min-w-0 flex-col px-4 py-3">' + sidebarNav(o.route || 'home') + '</div></div>' +
      (o.sideCard ? bannerSideCard(o.sideCard) : '') +
      '<div class="flex flex-col gap-2 px-4 pt-3 pb-4">' + (o.meter ? meter(o.meter) : '') + accountRow() + '</div>';
  }

  function homeHeader(phone) {
    const actions = btn({ variant: 'outline', size: 'lg', icon: 'upload', label: 'Upload' }) +
      btn({ variant: 'outline', size: 'lg', label: phone ? 'Record' : 'Record video', cls: '[&>span]:ml-0', attrs: '' }).replace('<span>', '<span class="inline-block size-3 rounded-full bg-destructive" aria-hidden="true"></span><span>') +
      btn({ variant: 'default', size: 'lg', icon: 'plus', label: phone ? 'New page' : 'New Journey Page' });
    return '<header class="relative ' + (phone ? 'px-4 pt-5 pb-3' : 'px-6 pt-5 pb-3') + '"><div class="flex items-center justify-between gap-4 ' + (phone ? 'flex-col items-stretch gap-2' : '') + '">' +
      '<div class="flex min-w-0 items-center gap-3"><h1 class="text-4xl leading-none font-semibold tracking-tight text-foreground">Home</h1></div>' +
      '<div class="flex shrink-0 items-center gap-2 ' + (phone ? 'flex-wrap justify-start [&>button]:flex-auto [&>button]:px-3' : '') + '">' + actions + '</div></div></header>';
  }

  function toolbar(phone) {
    return '<section class="mb-7 flex w-full items-center gap-2">' +
      '<div class="relative min-w-0 max-w-md flex-1 basis-32" data-slot="search-input">' + I('search', 'pointer-events-none absolute top-1/2 left-3 z-1 size-4 -translate-y-1/2 text-muted-foreground') +
      '<input placeholder="Search..." aria-label="Search this workspace" class="' + V.inputs.default + ' h-9 pl-9 bg-(--glass-bg) not-focus-visible:border-(--glass-border)"></div>' +
      '<div class="ml-auto flex shrink-0 items-center justify-end gap-2">' +
      btn({ variant: 'outline', size: 'icon-toolbar', icon: 'list-filter', attrs: 'aria-label="Filter by type"' }) +
      btn({ variant: 'outline', size: 'icon-toolbar', icon: 'arrow-down-up', attrs: 'aria-label="Sort"' }) +
      (phone ? btn({ variant: 'outline', size: 'icon-toolbar', icon: 'folder-plus', attrs: 'aria-label="New folder"' }) : btn({ variant: 'outline', size: 'toolbar', icon: 'folder-plus', label: 'New folder' })) +
      '</div></section>';
  }

  function tabBar() {
    const tab = function (icon, label, active) {
      return '<li class="flex min-w-0 flex-1"><a href="#" class="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 pt-1.5 pb-1 text-xs leading-none font-medium ' + (active ? 'text-primary' : 'text-foreground/60') + '">' + I(icon, 'size-5 shrink-0') + '<span class="max-w-full truncate">' + label + '</span></a></li>';
    };
    return '<nav aria-label="Primary" class="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-sidebar text-sidebar-foreground"><ul class="flex h-14 items-stretch px-1">' +
      tab('house', 'Home', true) + tab('users', 'Contacts') +
      '<li class="flex min-w-0 flex-1"><a href="#" class="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 pt-1.5 pb-1 text-xs leading-none font-medium text-foreground"><span class="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">' + I('video', 'size-4') + '</span><span class="max-w-full truncate">Record</span></a></li>' +
      tab('book-open', 'Learn') + tab('menu', 'More') + '</ul></nav>';
  }

  function dialogOverlay(inner) {
    return '<div class="absolute inset-0 z-50 bg-black/50" aria-hidden="true"></div><div class="absolute inset-0 z-50 grid place-items-center p-3">' + inner + '</div>';
  }

  // The signed-in app at desktop width: sidebar plus Home.
  // Hooks for other pages (round 2): barHtml replaces the banner, prefixHtml
  // goes above the shelves, overlayHtml is appended last, mainHtml replaces
  // the whole main column.
  function desktopShell(o) {
    const main = o.mainHtml ? o.mainHtml : o.route === 'settings' ? settingsMain(false, o) : (
      (o.barHtml || (o.bar ? bannerBar(o.bar, false) : '')) + homeHeader(false) +
      '<div class="px-6 pt-4 pb-6">' + toolbar(false) + (o.prefixHtml || '') + (o.homeCard ? bannerHomeCard(o.homeCard, false) : '') + shelves(false, o.pages) + '</div>');
    return '<div class="mk-shell relative flex h-full w-full overflow-hidden bg-(image:--shell-frame) text-foreground">' +
      '<aside class="flex h-full w-68 shrink-0 flex-col border-r border-sidebar-border/80 bg-sidebar text-sidebar-foreground">' + sidebarInner(o) + '</aside>' +
      '<main class="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">' + main + '</main>' +
      (o.dialog ? dialogOverlay(o.dialog) : '') + (o.overlayHtml || '') + '</div>';
  }

  // The app on a phone: no sidebar, tab bar at the bottom, More opens a drawer.
  function phoneShell(o) {
    const main = o.mainHtml ? o.mainHtml : o.route === 'settings' ? settingsMain(true, o) : (
      (o.barHtml || (o.bar ? bannerBar(o.bar, true) : '')) + homeHeader(true) +
      '<div class="px-4 pt-4 pb-20">' + toolbar(true) + (o.prefixHtml || '') + (o.homeCard ? bannerHomeCard(o.homeCard, true) : '') + shelves(true, o.pages) + '</div>');
    const drawer = o.drawer ? '<div class="absolute inset-0 z-40 bg-black/35"></div><div class="absolute inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar text-sidebar-foreground shadow-2xl" role="dialog" aria-label="Navigation">' + sidebarInner(o) + '</div>' : '';
    return '<div class="mk-shell relative flex h-full w-full flex-col overflow-hidden bg-(image:--shell-frame) text-foreground">' +
      '<main class="relative flex min-h-0 flex-1 flex-col overflow-hidden">' + main + '</main>' + tabBar() + drawer +
      (o.dialog ? dialogOverlay(o.dialog) : '') + (o.overlayHtml || '') + '</div>';
  }

  /* ----------------------------------------------------------- settings */
  function sectionNav(phone) {
    const items = [['paintbrush', 'Branding'], ['credit-card', 'Billing'], ['calendar-days', 'Subscription'], ['key-round', 'Password'], ['bell', 'Notifications']];
    return '<nav aria-label="Settings" class="-mb-px overflow-hidden border-b border-border/70 ' + (phone ? 'px-4' : 'px-6') + '"><ul class="flex w-max gap-1">' + items.map(function (it, i) {
      const active = it[1] === 'Subscription';
      return '<li class="' + (i === 0 ? '-ml-3' : '') + '"><a href="#" class="relative inline-flex h-11 items-center gap-1.5 px-3 text-sm font-medium whitespace-nowrap after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary ' + (active ? 'text-foreground after:opacity-100' : 'text-foreground/60 after:opacity-0') + '"' + (active ? ' aria-current="page"' : '') + '>' + I(it[0], 'size-4 shrink-0') + it[1] + '</a></li>';
    }).join('') + '</ul></nav>';
  }

  function field(label, value) {
    return '<div class="flex flex-col gap-1"><dt class="text-xs font-medium text-muted-foreground">' + label + '</dt><dd class="text-sm">' + value + '</dd></div>';
  }

  function compareTable() {
    const rows = [
      ['Live pages at once', '3', 'Unlimited'],
      ['Recording and library', 'Unlimited', 'Unlimited'],
      ['Made with Clarity badge on pages', 'Yes', 'No'],
      ['Your logo and brand color', '', 'Yes'],
      ['Who watched and how far', 'View counts only', 'Every viewer'],
    ];
    return '<div class="overflow-hidden rounded-lg border text-sm"><table class="w-full"><thead><tr class="border-b bg-muted/50 text-xs text-muted-foreground"><th class="px-3 py-2 text-left font-medium">What you get</th><th class="px-3 py-2 text-left font-medium">Free</th><th class="px-3 py-2 text-left font-medium text-foreground">Pro</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr class="border-b last:border-0"><td class="px-3 py-2">' + r[0] + '</td><td class="px-3 py-2 text-muted-foreground">' + (r[1] || '<span aria-label="Not included">' + I('minus', 'size-3.5') + '</span>') + '</td><td class="px-3 py-2 font-medium">' + r[2] + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function subscriptionCard(meterKey) {
    const m = METERS[meterKey || '2of3'];
    return '<div data-slot="card" class="group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10 has-data-[slot=card-footer]:pb-0">' +
      '<div data-slot="card-header" class="grid auto-rows-min items-start gap-1 px-4 border-b pb-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]">' +
        '<div data-slot="card-title" class="text-base leading-snug font-medium">Free plan</div>' +
        '<div data-slot="card-description" class="text-sm text-muted-foreground">Record and build as much as you like. Up to 3 pages live at once.</div>' +
        '<div data-slot="card-action" class="col-start-2 row-span-2 row-start-1 self-center justify-self-end">' + badge('secondary', 'Free') + '</div></div>' +
      '<div data-slot="card-content" class="space-y-4 px-4">' +
        '<dl class="grid gap-x-10 gap-y-5 sm:grid-cols-2">' +
          field('Live pages', '<span class="tabular-nums">' + m.live + ' of 3</span><span class="mt-1.5 flex items-center gap-1 max-w-32" aria-hidden="true">' + [0, 1, 2].map(function (i) { return '<i class="mk-seg' + (i < m.live ? ' on' : '') + '"></i>'; }).join('') + '</span>') +
          field('Cost', 'Free') +
          field('Your pages show', 'A small Made with Clarity badge') +
          field('Analytics', 'Views and plays per page') +
        '</dl>' + compareTable() + '</div>' +
      '<div data-slot="card-footer" class="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t bg-muted/50 p-4">' +
        '<p class="max-w-md text-xs text-muted-foreground">Pro is $49 a month or $499 a year. Upgrading removes the badge from every page at once. Cancel any time and you move back to Free at the end of the period.</p>' +
        '<div class="flex flex-wrap items-center gap-2">' + btn({ variant: 'outline', label: 'Upgrade $49/mo', attrs: 'aria-label="Upgrade to Pro, billed monthly"' }) + btn({ variant: 'default', label: 'Upgrade $499/yr', attrs: 'aria-label="Upgrade to Pro, billed annually"' }) + '</div></div></div>';
  }

  function settingsMain(phone, o) {
    return '<header class="relative ' + (phone ? 'px-4 pt-5 pb-3' : 'px-6 pt-5 pb-3') + '"><h1 class="text-4xl leading-none font-semibold tracking-tight text-foreground">Settings</h1></header>' + sectionNav(phone) +
      '<div class="min-w-0 flex-1 overflow-hidden ' + (phone ? 'p-4 pb-20' : 'max-w-3xl p-6') + '">' + subscriptionCard(o.meter) + '</div>';
  }

  /* ------------------------------------------------------------ dialogs */
  function dialogShell(inner, cls, noClose) {
    return '<div role="dialog" data-slot="dialog-popup" class="relative grid w-full gap-4 rounded-lg border bg-background p-6 shadow-lg ' + (cls || 'max-w-lg') + '">' + inner +
      (noClose ? '' : '<button type="button" class="absolute top-4 right-4 rounded-sm opacity-70" aria-label="Close">' + I('x', 'size-4') + '</button>') + '</div>';
  }
  function dHeader(title, desc, titleCls) {
    return '<div data-slot="dialog-header" class="flex flex-col gap-2 text-left"><h2 class="' + (titleCls || 'text-lg') + ' font-semibold leading-none">' + title + '</h2>' + (desc ? '<p class="text-sm text-muted-foreground">' + desc + '</p>' : '') + '</div>';
  }
  function dFooter(inner) {
    return '<div data-slot="dialog-footer" class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">' + inner + '</div>';
  }

  function trialEndedDialog(liveCount) {
    const n = liveCount == null ? 2 : liveCount;
    const first = n === 0 ? 'Everything you recorded stays in your library.' : n > 3 ? 'All ' + n + ' live pages stay live, even past the Free limit. Links keep working.' : 'Your ' + n + ' live pages stay live. Links keep working.';
    const stays = [first, 'Your library: every recording, upload and draft.', 'Recording, as much as you like.'];
    const changes = ['Up to 3 pages live at once. Unpublish one to free a slot.', 'A small Made with Clarity badge on your pages.', 'Who watched and how far is Pro. View counts stay.'];
    const list = function (items, icon, cls) {
      return '<ul class="mt-2 space-y-2">' + items.map(function (t) { return '<li class="flex gap-2 text-sm"><span class="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full ' + cls + '">' + I(icon, 'size-3') + '</span><span>' + t + '</span></li>'; }).join('') + '</ul>';
    };
    return dialogShell(
      dHeader('You are on Free now', 'Your 14-day trial ended ' + fmt(TRIAL.end) + '. Nothing you made goes away.', 'text-xl') +
      '<div class="grid gap-5 sm:grid-cols-2"><div><p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">What stays</p>' + list(stays, 'check', 'bg-success/15 text-success') + '</div>' +
      '<div><p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">What changes</p>' + list(changes, 'arrow-right', 'bg-muted text-muted-foreground') + '</div></div>' +
      dFooter(btn({ variant: 'outline', label: 'Continue on Free' }) + btn({ variant: 'default', label: 'Upgrade to Pro' })), 'max-w-lg', true);
  }

  function linkChip(live, url) {
    return '<a aria-label="Journey Page share link" class="flex h-11 items-center gap-2 rounded-lg bg-muted px-3 ' + (live ? '' : 'opacity-50') + '"><span class="min-w-0 flex-1 truncate font-mono text-sm">' + url + '</span>' + (live ? I('arrow-up-right', 'size-4 shrink-0 text-muted-foreground') : '') + '</a>';
  }

  function livePageRow(p, state) {
    const thumb = '<span class="relative block h-9 w-14 shrink-0 overflow-hidden rounded-sm bg-card ring-1 ring-foreground/10">' + miniPage(p.tone, 'mk-mini-sm') + '</span>';
    const meta = state === 'freed' ? '<span class="text-success">Unpublished. The link is off.</span>' : p.views + ' views · last viewed ' + p.lastViewed;
    const action = state === 'freed' ? btn({ variant: 'ghost', size: 'sm', label: 'Undo' }) : btn({ variant: 'outline', size: 'sm', label: 'Unpublish' });
    return '<div class="flex items-center gap-3 py-2 ' + (state === 'freed' ? 'opacity-80' : '') + '">' + thumb + '<span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium">' + p.title + '</span><span class="block text-xs text-muted-foreground">' + meta + '</span></span>' + action + '</div>';
  }

  function limitDialog(after) {
    const live = PAGES.slice(0, 3);
    const band = after
      ? '<div class="flex items-start gap-3 rounded-xl bg-muted p-3.5"><span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">' + I('eye-off', 'size-4.5') + '</span><div class="min-w-0 flex-1"><p class="text-base font-medium">Draft</p><p class="text-sm text-muted-foreground">Nobody can open this page until you publish it.</p><p class="text-sm text-muted-foreground">2 of 3 live pages in use. One slot is free.</p></div></div>'
      : '<div class="mk-tone-amber flex items-start gap-3 rounded-xl p-3.5"><span class="mk-bar-icon flex size-9 shrink-0 items-center justify-center rounded-full">' + I('lock', 'size-4.5') + '</span><div class="min-w-0 flex-1"><p class="text-base font-medium">3 of 3 live pages in use</p><p class="text-sm text-muted-foreground">Free keeps 3 pages live at once. This page is saved as a draft until a slot is free, or you upgrade.</p></div></div>';
    const rows = live.map(function (p, i) { return livePageRow(p, after && i === 1 ? 'freed' : 'live'); }).join('');
    return dialogShell(
      dHeader('Share', null, 'text-xl') +
      '<div class="min-w-0 space-y-4">' + band + linkChip(false, 'Publish to get a link') +
      '<div class="space-y-0"><div class="flex items-center gap-2 border-b py-2 text-sm font-medium">' + I('globe', 'size-4 text-muted-foreground') + 'Your live pages · ' + (after ? 2 : 3) + '</div><div class="divide-y">' + rows + '</div></div>' +
      '<div class="flex items-center justify-between"><span class="flex items-center gap-2 text-sm font-medium">' + I('lock', 'size-4 text-muted-foreground') + 'Password protected</span><span data-slot="switch" data-unchecked class="peer group/switch relative inline-flex h-[18.4px] w-[32px] shrink-0 items-center rounded-full border border-transparent bg-input"><span class="pointer-events-none block size-4 translate-x-0 rounded-full bg-background"></span></span></div></div>' +
      dFooter(btn({ variant: 'outline', label: 'Upgrade to Pro' }) + btn({ variant: 'default', icon: 'globe', label: 'Publish', disabled: !after })), 'max-w-lg');
  }

  function cancelProDialog() {
    const reasons = ['It is too expensive', 'Not satisfied with the service', 'Found a better alternative', 'No longer needed', 'Technical issues'];
    const radio = function (label, checked) {
      return '<div class="flex items-center gap-2"><span data-slot="radio-group-item" class="aspect-square size-4 shrink-0 rounded-full border border-input shadow-xs text-primary ' + (checked ? 'grid place-items-center' : '') + '">' + (checked ? '<span class="size-2.5 rounded-full bg-primary"></span>' : '') + '</span><span class="text-sm font-normal">' + label + '</span></div>';
    };
    return dialogShell(
      dHeader('Cancel Pro?', 'You keep Pro until ' + fmt(PRO_CANCEL_DATE) + '. On that day you move to Free. Your pages stay live; new pages are limited to 3 live at once, the Made with Clarity badge comes back, and who watched is locked.') +
      '<div class="space-y-3 py-1"><p class="text-sm font-medium">Why are you cancelling? (optional)</p><div class="grid gap-3">' + reasons.map(function (r, i) { return radio(r, i === 0); }).join('') + '</div></div>' +
      dFooter(btn({ variant: 'outline', label: 'Keep Pro' }) + btn({ variant: 'destructive', label: 'Cancel Pro' })), 'max-w-lg');
  }

  /* ---------------------------------------------------------- analytics */
  function retentionSvg() {
    // A watched-curve shape in the chart's own classes; mock values.
    const pts = [100, 100, 96, 92, 90, 84, 80, 76, 70, 66, 62, 58, 55, 52, 50, 46, 44, 40, 38, 36, 36];
    const line = pts.map(function (v, i) { return (i === 0 ? 'M' : 'L') + (i * 50) + ' ' + (100 - v); }).join(' ');
    return '<svg viewBox="0 0 1000 100" preserveAspectRatio="none" role="img" aria-label="Visits watching each moment" class="h-24 w-full border-b-2 border-foreground text-primary"><path d="' + line + ' L1000 100 L0 100 Z" fill="currentColor" fill-opacity="0.15"></path><path d="' + line + '" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"></path></svg>';
  }
  function watched(ranges) {
    const x = function (s) { return Math.round(s / 102 * 1000); };
    const last = ranges.reduce(function (e, r) { return Math.max(e, r[1]); }, 0);
    return '<svg class="h-4 w-full min-w-16 text-primary" viewBox="0 0 1000 18" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="1000" y1="9" y2="9" stroke="currentColor" stroke-opacity="0.12" vector-effect="non-scaling-stroke"></line>' +
      ranges.map(function (r) { return '<line x1="' + x(r[0]) + '" x2="' + x(r[1]) + '" y1="9" y2="9" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"></line>'; }).join('') +
      '<line x1="' + x(last) + '" x2="' + x(last) + '" y1="9" y2="9" stroke="currentColor" stroke-width="5" stroke-linecap="round" vector-effect="non-scaling-stroke"></line></svg>';
  }

  function statsDialog(phone) {
    const rows = [
      ['Austin, TX', '2d ago', [[0, 88]], 86],
      ['Seattle, WA', '4d ago', [[0, 102]], 100],
      ['Denver, CO', '1w ago', [[0, 30], [48, 60]], 42],
      ['Portland, OR', '2w ago', [[0, 71]], 70],
    ];
    const table = '<div class="min-h-0 flex-1 overflow-hidden"><table class="w-full caption-bottom text-xs [&_td]:px-1 [&_td]:py-1 [&_th]:h-8 [&_th]:px-1 [&_th]:text-xs [&_tbody_tr]:border-0 [&_tbody_tr:nth-child(even)]:bg-muted/50"><thead class="[&_tr]:border-b"><tr><th class="h-10 px-2 text-left align-middle font-medium text-xs text-muted-foreground">Where</th><th class="' + (phone ? 'hidden' : '') + ' text-left font-medium text-xs text-muted-foreground">When</th><th class="text-left font-medium text-xs text-muted-foreground">Watched</th><th class="text-left font-medium text-xs text-muted-foreground">%</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr class="border-b"><td class="p-2 align-middle whitespace-nowrap"><span class="block max-w-28 truncate text-muted-foreground">' + r[0] + '</span>' + (phone ? '<span class="block text-muted-foreground">' + r[1] + '</span>' : '') + '</td><td class="' + (phone ? 'hidden' : '') + '"><span class="whitespace-nowrap text-muted-foreground">' + r[1] + '</span></td><td>' + watched(r[2]) + '</td><td><span class="font-semibold tabular-nums">' + r[3] + '%</span></td></tr>'; }).join('') +
      '</tbody></table></div>';
    const locked = '<div class="relative"><div class="mk-locked flex flex-col gap-3 pb-3" aria-hidden="true"><div class="shrink-0 space-y-2">' + retentionSvg() +
      '<div class="flex justify-between text-xs text-muted-foreground tabular-nums"><span>0:00</span><span>0:25</span><span>0:51</span><span>1:16</span><span>1:42</span></div><p class="text-xs text-muted-foreground">74% average watched</p></div>' + table + '</div>' +
      '<div class="absolute inset-0 grid place-items-center p-3"><div class="mk-lock-panel w-full max-w-xs rounded-xl border bg-background/95 p-5 text-center shadow-lg backdrop-blur-sm"><span class="mx-auto grid size-10 place-items-center rounded-full bg-primary/10 text-primary">' + I('lock', 'size-4.5') + '</span><p class="mt-3 text-base font-semibold">Upgrade to see who watched</p><p class="mt-1 text-sm text-muted-foreground">Pro shows where each viewer was, when they watched and how far they got. Views and plays stay on Free.</p>' + btn({ variant: 'default', label: 'Upgrade to Pro', cls: 'mt-4' }) + '</div></div></div>';
    const preview = phone ? '' : '<div class="flex min-h-0 w-56 shrink-0 flex-col gap-3"><div class="min-h-0 overflow-hidden rounded-lg border bg-background shadow-sm" aria-label="Page preview"><div class="flex items-center gap-1 border-b bg-muted px-3 py-2" aria-hidden="true"><span class="size-1 rounded-full bg-muted-foreground/30"></span><span class="size-1 rounded-full bg-muted-foreground/30"></span><span class="size-1 rounded-full bg-muted-foreground/30"></span></div><div class="relative h-96">' + miniPage('a', 'mk-mini-lg') + '</div></div></div>';
    const kpis = '<dl class="flex shrink-0 gap-7"><div><dd class="text-2xl font-semibold tabular-nums">14</dd><dt class="text-xs text-muted-foreground">Page visits</dt></div><div><dd class="text-2xl font-semibold tabular-nums">9</dd><dt class="text-xs text-muted-foreground">Watched video</dt></div><div><dd class="text-2xl font-semibold tabular-nums">3</dd><dt class="text-xs text-muted-foreground">Clicked button</dt></div></dl>';
    const item = '<div class="border-b"><div class="group flex w-full items-center gap-3 py-3 text-left">' + I('video', 'size-4 shrink-0 text-muted-foreground') + '<span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium">Northwind routing demo</span><span class="block text-xs text-muted-foreground">Video · 1:42</span></span><span class="shrink-0 text-xs text-muted-foreground tabular-nums">9 plays</span>' + I('chevron-down', 'size-4 shrink-0 rotate-180 text-muted-foreground') + '</div>' + locked + '</div>';
    const inner = '<div data-slot="dialog-header" class="mr-8 shrink-0 flex flex-col gap-2 text-left"><h2 class="text-lg font-semibold leading-none">Statistics</h2><p class="text-sm text-muted-foreground">' + PAGES[0].title + '</p></div>' +
      '<div class="flex min-h-0 flex-1 gap-6">' + preview + '<div class="flex min-h-0 min-w-0 flex-1 flex-col gap-4">' + kpis + '<div class="min-h-0 flex-1 overflow-hidden">' + item + '</div></div></div>';
    const size = phone ? 'style="width:calc(100% - 0px);height:100%"' : 'style="width:928px;height:720px"';
    return '<div role="dialog" data-slot="dialog-popup" class="relative flex flex-col overflow-hidden rounded-lg border bg-background p-6 shadow-lg gap-4" ' + size + '>' + inner + '<button type="button" class="absolute top-4 right-4 rounded-sm opacity-70" aria-label="Close">' + I('x', 'size-4') + '</button></div>';
  }

  /* ------------------------------------------------------- public page */
  function posterSvg() {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#334155"/><stop offset="1" stop-color="#0f172a"/></linearGradient><radialGradient id="r" cx="0.3" cy="0.25" r="0.6"><stop offset="0" stop-color="#64748b" stop-opacity="0.55"/><stop offset="1" stop-color="#0f172a" stop-opacity="0"/></radialGradient></defs><rect width="1600" height="900" fill="url(#g)"/><rect width="1600" height="900" fill="url(#r)"/><circle cx="1180" cy="470" r="150" fill="#cbd5e1" opacity="0.18"/><path d="M880 900 C 900 700 1460 700 1480 900 Z" fill="#cbd5e1" opacity="0.2"/><rect x="120" y="160" width="620" height="380" rx="18" fill="#e2e8f0" opacity="0.12"/><rect x="160" y="210" width="380" height="28" rx="8" fill="#e2e8f0" opacity="0.35"/><rect x="160" y="270" width="520" height="16" rx="8" fill="#e2e8f0" opacity="0.22"/><rect x="160" y="310" width="470" height="16" rx="8" fill="#e2e8f0" opacity="0.22"/><rect x="160" y="350" width="500" height="16" rx="8" fill="#e2e8f0" opacity="0.22"/></svg>');
  }

  function publicPage(opts) {
    const o = opts || {};
    return '<main class="page jp-theme" data-page-id="mock" data-renderer-version="public-page-v1">' + (o.topHtml || '') +
      '<section class="hero" data-module-kind="hero" data-section-id="hero" data-section-kind="hero" data-logo-align="left" data-surface-block="hero" data-title-align="left">' + (o.heroLogoHtml || '') +
        '<h1 style="text-align: left">Northwind, here is the routing walkthrough we talked about</h1>' +
        '<div class="media-frame" data-journey-media-frame data-journey-video-frame data-journey-video-preview-shell><button type="button" class="lp-video-preview-button" data-journey-video-preview-trigger aria-label="Play video"><img class="lp-video-poster" src="' + posterSvg() + '" alt=""><span class="lp-play-button" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" focusable="false"><path d="M8 5.6v12.8a1 1 0 0 0 1.5.86l10.6-6.4a1 1 0 0 0 0-1.72L9.5 4.74A1 1 0 0 0 8 5.6Z" fill="currentColor"></path></svg></span></button></div>' +
        '<div class="cta-row" data-journey-cta-row><a class="button" href="#" data-cta-id="hero-primary" data-section-id="hero">Book a 20-minute call</a></div>' +
        '<ul class="contact-row" data-journey-contact-list><li><span data-contact-label>Email:</span> ' + REP.email + '</li><li><span data-contact-label>Phone:</span> (512) 555-0144</li></ul>' +
      '</section>' +
      '<section class="section section-story" data-module-kind="content" data-section-id="s1" data-section-kind="story" data-story-role="problem" data-surface-block="s1" data-title-align="left">' +
        '<h2 style="text-align: left">What I saw in your current setup</h2>' +
        '<div data-journey-content-layout><div data-journey-content-copy><div class="rich-text"><p>Your dispatchers re-plan the same 40 routes by hand every Monday. In the video I show the three stops that move most weeks and how routing them once a quarter frees about six hours a week.</p><p>The call is to confirm the two depots and pick a start date.</p></div></div></div>' +
      '</section>' +
      (o.badgeHtml != null ? o.badgeHtml : o.badge === false ? '' : '<footer data-clarity-badge><a href="#"><span class="mk-badge-mark">' + MARK + '</span><span>Made with Clarity</span><span class="sep" aria-hidden="true">·</span><u>Make your own</u></a></footer>') +
      '</main>';
  }

  /* ------------------------------------------------------- small bits */
  function upgradeToast() {
    return '<div class="grid w-full max-w-sm grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border border-border bg-popover p-3.5 text-popover-foreground shadow-lg" role="status">' +
      '<div class="grid size-7 place-items-center rounded-full bg-success/15 text-success" aria-hidden="true">' + I('check', 'size-4') + '</div>' +
      '<div class="min-w-0"><p class="text-sm leading-tight font-semibold">Badge removed from your 5 pages</p><p class="mt-0.5 text-sm text-muted-foreground">You are on Pro. Every live page now shows only you.</p></div>' +
      '<button type="button" aria-label="Dismiss notification" class="inline-grid size-7 place-items-center rounded-md border-0 text-muted-foreground">' + I('x', 'size-3.5') + '</button></div>';
  }

  function brandingLocked() {
    return '<div data-slot="card" class="group/card flex w-full max-w-lg flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10">' +
      '<div data-slot="card-header" class="grid auto-rows-min items-start gap-1 px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]"><div data-slot="card-title" class="text-base leading-snug font-medium">Brand</div><div data-slot="card-description" class="text-sm text-muted-foreground">Your logo and brand color on every page, in place of the Clarity badge.</div><div data-slot="card-action" class="col-start-2 row-span-2 row-start-1 self-start justify-self-end">' + badge('default', 'Pro') + '</div></div>' +
      '<div data-slot="card-content" class="space-y-6 px-4"><div class="space-y-2 opacity-50" aria-disabled="true"><span class="text-sm font-medium">Logo</span><div class="flex items-center gap-4"><div class="flex h-20 w-32 items-center justify-center overflow-hidden rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">' + I('upload', 'size-6 text-muted-foreground/50') + '</div>' + btn({ variant: 'outline', label: 'Choose logo', disabled: true }) + '</div></div>' +
      '<div class="space-y-2 opacity-50" aria-disabled="true"><span class="text-sm font-medium">Brand color</span><div class="flex items-center gap-3"><span class="size-8 rounded-md bg-primary ring-1 ring-foreground/10"></span><span class="' + V.inputs.default + ' w-28 flex items-center font-mono">#2563EB</span></div></div>' +
      '<div class="flex items-center justify-between gap-3 rounded-lg bg-muted p-3"><p class="text-sm text-muted-foreground">Included in Pro. Your pages use Clarity colors until then.</p>' + btn({ variant: 'default', size: 'sm', label: 'Upgrade to Pro' }) + '</div></div></div>';
  }

  /* -------------------------------------------------------- frames + mount */
  function frame(kind, inner, label, height) {
    const w = kind === 'phone' ? 390 : 1180;
    const h = height || (kind === 'phone' ? 844 : 760);
    return '<figure class="mk-fig mk-fig-' + kind + '"><div class="mk-frame" data-w="' + w + '" data-h="' + h + '"><div class="mk-frame-inner" style="width:' + w + 'px;height:' + h + 'px">' + inner + '</div></div>' + (label ? '<figcaption class="mk-cap">' + label + '</figcaption>' : '') + '</figure>';
  }

  function fitFrames(root) {
    (root || document).querySelectorAll('.mk-frame').forEach(function (f) {
      const w = Number(f.dataset.w), h = Number(f.dataset.h);
      const inner = f.firstElementChild;
      const scale = Math.min(1, f.clientWidth / w);
      inner.style.transform = 'scale(' + scale + ')';
      f.style.height = Math.round(h * scale) + 'px';
    });
  }

  function mount(id, html) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = html;
    fitFrames(el);
  }

  function segmented(name, options, current, onPick) {
    const wrap = document.createElement('div');
    wrap.className = 'mk-seg-control';
    wrap.setAttribute('role', 'tablist');
    wrap.setAttribute('aria-label', name);
    options.forEach(function (opt) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.dataset.value = opt.value;
      b.textContent = opt.label;
      b.setAttribute('aria-selected', String(opt.value === current));
      b.addEventListener('click', function () {
        wrap.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-selected', 'false'); });
        b.setAttribute('aria-selected', 'true');
        onPick(opt.value);
      });
      wrap.appendChild(b);
    });
    return wrap;
  }

  /* ---------------------------------------------------------- sections */
  const BANNER_VARIANTS = {
    a: { label: 'A · Top bar', desc: 'A slim strip across the top of every app screen.' },
    b: { label: 'B · Sidebar card', desc: 'A card above the account row, out of the content.' },
    c: { label: 'C · Home card', desc: 'A card between the toolbar and the shelves, on Home only.' },
  };

  function bannerFrames(variant, state) {
    const d = variant === 'a' ? desktopShell({ bar: state }) : variant === 'b' ? desktopShell({ sideCard: state }) : desktopShell({ homeCard: state });
    const p = variant === 'a' ? phoneShell({ bar: state }) : variant === 'b' ? phoneShell({ sideCard: state, drawer: true }) : phoneShell({ homeCard: state });
    const capP = variant === 'b' ? 'Phone, with the More drawer open' : 'Phone';
    return frame('desktop', d, 'Desktop') + frame('phone', p, capP);
  }

  function bannerStrip(variant) {
    const keys = ['early', 'last3', 'lastday', 'pastdue'];
    return keys.map(function (k) {
      let el;
      if (variant === 'a') el = '<div class="mk-strip-bar">' + bannerBar(k, false) + '</div>';
      else if (variant === 'b') el = '<div class="mk-strip-side">' + bannerSideCard(k) + '</div>';
      else el = '<div class="mk-strip-home">' + bannerHomeCard(k, false) + '</div>';
      return '<div class="mk-state"><p class="mk-state-label">' + STATES[k].name + (STATES[k].dismiss ? ' · can dismiss' : ' · no dismiss') + '</p>' + el + '</div>';
    }).join('');
  }

  function renderBanner() {
    const host = document.getElementById('banner-controls');
    if (!host) return;
    let variant = 'a', state = 'last3';
    const draw = function () {
      mount('banner-frames', bannerFrames(variant, state));
      mount('banner-states', bannerStrip(variant));
      const note = document.getElementById('banner-variant-note');
      if (note) note.textContent = BANNER_VARIANTS[variant].desc;
      document.querySelectorAll('[data-variant-note]').forEach(function (n) { n.hidden = n.dataset.variantNote !== variant; });
    };
    host.appendChild(segmented('Banner variant', Object.keys(BANNER_VARIANTS).map(function (k) { return { value: k, label: BANNER_VARIANTS[k].label }; }), variant, function (v) { variant = v; draw(); }));
    host.appendChild(segmented('Banner state', ['early', 'last3', 'lastday', 'pastdue'].map(function (k) { return { value: k, label: STATES[k].name }; }), state, function (v) { state = v; draw(); }));
    draw();
  }

  function renderAll() {
    renderBanner();
    mount('ended-frames', frame('desktop', desktopShell({ dialog: trialEndedDialog(2), meter: '2of3' }), 'Desktop, first visit after the trial ended') + frame('phone', phoneShell({ dialog: trialEndedDialog(2), meter: '2of3' }), 'Phone'));
    mount('meter-states', ['0of3', '2of3', '3of3', '5of3'].map(function (k) { return '<div class="mk-state"><p class="mk-state-label">' + k.replace('of', ' of ') + (k === '5of3' ? ' (kept from the trial)' : '') + '</p><div class="mk-strip-side mk-strip-meter">' + meter(k) + '</div></div>'; }).join(''));
    mount('meter-frames', frame('desktop', desktopShell({ meter: '2of3' }), 'Desktop, sidebar footer') + frame('phone', phoneShell({ meter: '3of3', drawer: true }), 'Phone, in the More drawer (full state)'));
    mount('limit-dialogs', '<div class="mk-dialog-stage"><p class="mk-state-label">Publish with 3 live pages</p>' + limitDialog(false) + '</div><div class="mk-dialog-stage"><p class="mk-state-label">After Unpublish on one row</p>' + limitDialog(true) + '</div>');
    mount('badge-frames', '<figure class="mk-fig mk-fig-page"><div class="mk-page-frame mk-page-desktop">' + publicPage() + '</div><figcaption class="mk-cap">Desktop, the page a prospect opens</figcaption></figure><figure class="mk-fig mk-fig-phone"><div class="mk-page-frame mk-page-phone">' + publicPage() + '</div><figcaption class="mk-cap">Phone</figcaption></figure>');
    mount('stats-frames', frame('desktop', desktopShell({ dialog: statsDialog(false), meter: '2of3' }), 'Desktop') + frame('phone', phoneShell({ dialog: statsDialog(true), meter: '2of3' }), 'Phone'));
    mount('settings-frames', frame('desktop', desktopShell({ route: 'settings', meter: '2of3' }), 'Desktop, Settings › Subscription on Free') + frame('phone', phoneShell({ route: 'settings', meter: '2of3' }), 'Phone'));
    mount('cancel-dialog', '<div class="mk-dialog-stage"><p class="mk-state-label">Cancel confirmation for a Pro account</p>' + cancelProDialog() + '</div>');
    mount('small-bits', '<div class="mk-state"><p class="mk-state-label">After upgrading</p><div class="mk-strip-side">' + upgradeToast() + '</div></div><div class="mk-state"><p class="mk-state-label">Settings › Branding on Free</p><div class="mk-strip-side">' + brandingLocked() + '</div></div>');
    document.querySelectorAll('[data-date]').forEach(function (n) { n.textContent = fmt(n.dataset.date); });
    document.querySelectorAll('[data-date-long]').forEach(function (n) { n.textContent = fmtLong(n.dataset.dateLong); });
  }

  document.addEventListener('DOMContentLoaded', renderAll);
  let raf = 0;
  window.addEventListener('resize', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { fitFrames(); }); });

  // Shared with round-2/round2.js. renderAll above only fills ids that exist.
  window.MK = { I: I, btn: btn, badge: badge, fmt: fmt, fmtLong: fmtLong, STATES: STATES, PAGES: PAGES, VIDEOS: VIDEOS, REP: REP, TRIAL: TRIAL, PASTDUE: PASTDUE, METERS: METERS, meter: meter, miniPage: miniPage, pageCard: pageCard, desktopShell: desktopShell, phoneShell: phoneShell, frame: frame, fitFrames: fitFrames, mount: mount, segmented: segmented, publicPage: publicPage, posterSvg: posterSvg, LOGO: LOGO, MARK: MARK };
})();
