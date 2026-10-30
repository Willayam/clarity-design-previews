// Shared surroundings for every variant: the real Clarity editor and Home DOM
// (snapshotted from staging, rendered by ../kit/app.css), the theme switch,
// icons and every piece of chat copy. Variants design only the chat.
(function () {
  const F = () => window.KIT_FIXTURES;

  function applyTheme() {
    const attr = document.documentElement.getAttribute('data-theme');
    const dark = attr ? attr === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  }
  applyTheme();
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  const ICONS = {
    sparkles: '<path d="M9.94 14.06 7.5 21l-2.44-6.94L-1.88 11.6 5.06 9.17 7.5 2.23l2.44 6.94 6.94 2.43z" transform="translate(4 0) scale(.85)"/><path d="M20 3v4M22 5h-4"/>',
    send: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    paperclip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    loader: '<path d="M21 12a9 9 0 1 1-6.22-8.56"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    video: '<path d="m16 13 5.22 3.48a.5.5 0 0 0 .78-.42V7.87a.5.5 0 0 0-.76-.43L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h6"/>',
    page: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16v-4M12 16V8M17 16v-7"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    pencil: '<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    panelRight: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
    expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    minimize: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
  };
  function icon(name, cls = 'size-4') {
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  // One label per tool, shared by every variant. Present tense while running,
  // past tense when done.
  const TOOL_COPY = {
    library_list: ['Searching your library', 'Searched your library'],
    videos_get: ['Opening the video', 'Opened the video'],
    videos_transcript: ['Reading the transcript', 'Read the transcript'],
    pages_generate: ['Writing the page', 'Wrote the page'],
    pages_get: ['Reading the page', 'Read the page'],
    pages_edit: ['Editing the page', 'Edited the page'],
    pages_publish: ['Publishing', 'Published'],
    pages_stats: ['Checking page stats', 'Checked page stats'],
    pages_leads: ['Checking who opened it', 'Checked who opened it'],
    contacts_list: ['Looking up contacts', 'Looked up contacts'],
    library_move: ['Moving items', 'Moved items'],
  };

  const COPY = {
    title: 'Clarity AI',
    composerPlaceholderNew: "Follow-up for Anna at Acme after today's demo. Recap pricing and ask her to book a call.",
    composerPlaceholderEdit: 'Ask for a change, or anything about your videos and pages',
    composerPlaceholderHome: 'Ask about your videos, pages and leads',
    send: 'Send',
    stop: 'Stop',
    attach: 'Attach files',
    newChat: 'New chat',
    history: 'Chats',
    close: 'Close',
    undo: 'Undo',
    approve: 'Publish',
    deny: 'Not now',
    copyLink: 'Copy link',
    open: 'Open',
    thinking: 'Thinking',
    stepsDone: (n, s) => `${n} steps, ${s}s`,
    disclaimer: 'Changes go to your draft. Prospects see them after you publish.',
    errorGeneric: "Something went wrong. Your page wasn't changed.",
    errorRetry: 'Try again',
    toolLabel: (tool, status) => (TOOL_COPY[tool] || [tool, tool])[status === 'done' ? 1 : 0],
  };

  function fill(root, state) {
    const f = F();
    const preview = root.querySelector('[data-slot="journey-preview"]');
    const pageTitle = root.querySelector('[data-slot="page-title"]');
    if (state === 'blank' || !preview) return;
    if (pageTitle) pageTitle.textContent = f.page.name;
    const share = root.querySelector('[data-slot="page-header-actions"] button[disabled]');
    if (share) share.removeAttribute('disabled');

    const logo = preview.querySelector('[data-slot="logo-empty"]');
    if (logo) logo.outerHTML = `<span data-kit-block="logo" style="font:700 20px/1 var(--jp-font-heading, inherit);letter-spacing:-.01em">${f.owner.company}</span>`;
    const h1 = preview.querySelector('h1');
    h1.textContent = state === 'edited' ? f.page.titleEdited : f.page.title;
    h1.setAttribute('data-kit-block', 'title');
    const media = preview.querySelector('[data-slot="empty-block-slot"]');
    if (media) media.outerHTML = `<div data-kit-block="video" data-journey-media-frame="true" style="position:relative;aspect-ratio:16/9;border-radius:var(--jp-radius,12px);overflow:hidden;background:linear-gradient(135deg,#1e293b,#0f172a);display:grid;place-items:center;color:#fff">
      <span style="display:grid;place-items:center;width:64px;height:64px;border-radius:999px;background:rgba(255,255,255,.16);backdrop-filter:blur(6px)">${icon('play', 'size-6')}</span>
      <span style="position:absolute;left:16px;bottom:14px;font:500 13px/1.2 var(--font-sans);opacity:.9">${f.video.title}</span>
      <span style="position:absolute;right:14px;bottom:12px;font:600 12px/1 var(--font-sans);padding:4px 7px;border-radius:6px;background:rgba(0,0,0,.45)">${f.video.duration}</span></div>`;
    const cta = preview.querySelector('[data-slot="cta-add"]');
    if (cta) cta.outerHTML = `<span data-kit-block="cta" data-journey-cta-row="true"><span class="button">${f.page.cta}</span></span>`;

    const story = preview.querySelector('section[data-section-kind="story"]');
    if (story) {
      story.setAttribute('data-kit-block', 'pricing');
      const h2 = story.querySelector('h2');
      h2.removeAttribute('data-ghost'); h2.className = ''; h2.textContent = f.page.pricing.title;
      const desc = story.querySelector('.rich-text');
      desc.removeAttribute('data-ghost'); desc.className = 'rich-text';
      desc.innerHTML = f.page.pricing.body.map((p) => `<p>${p}</p>`).join('');
      const ghost = story.querySelector('[data-slot="ghost-media"]');
      if (ghost) ghost.outerHTML = `<div style="aspect-ratio:4/3;border-radius:var(--jp-radius,12px);background:var(--jp-muted,#f1f5f9);display:grid;align-content:center;gap:10px;padding:28px">
        ${f.page.pricing.plans.map((p) => `<div style="display:flex;justify-content:space-between;padding:12px 14px;border-radius:10px;background:var(--jp-card,#fff);border:1px solid var(--jp-border,#e2e8f0);font:500 14px/1.2 var(--font-sans)"><span>${p.name}</span><span style="font-variant-numeric:tabular-nums">${p.price}</span></div>`).join('')}</div>`;
    }
    const faqs = state === 'edited' ? [...f.page.faq, f.page.faqAdded] : f.page.faq;
    const faq = document.createElement('section');
    faq.setAttribute('data-section-kind', 'faq');
    faq.setAttribute('data-kit-block', 'faq');
    faq.innerHTML = `<h2>${f.page.faqTitle}</h2><div style="display:grid;margin-top:16px;border-top:1px solid var(--jp-border,#e2e8f0)">${faqs.map((q, i) => `<div ${state === 'edited' && i === faqs.length - 1 ? 'data-kit-block="faq-added"' : ''} style="display:flex;justify-content:space-between;gap:16px;padding:16px 0;border-bottom:1px solid var(--jp-border,#e2e8f0);font:500 16px/1.4 var(--jp-font-body, var(--font-sans))"><span>${q}</span><span style="opacity:.5">+</span></div>`).join('')}</div>`;
    (story || preview.lastElementChild).after(faq);
  }

  function refs(root) {
    const q = (s) => root.querySelector(s);
    const blocks = {};
    root.querySelectorAll('[data-kit-block]').forEach((el) => { blocks[el.getAttribute('data-kit-block')] = el; });
    return {
      root,
      sidebar: q('[data-slot="sidebar"]'),
      main: q('main[data-slot="sidebar-inset"]'),
      header: q('main[data-slot="sidebar-inset"] header'),
      actions: q('[data-slot="page-header-actions"]'),
      aiButton: Array.from(root.querySelectorAll('[data-slot="page-header-actions"] button')).find((b) => /Write page/.test(b.textContent)),
      canvas: q('[data-slot="preview-panel"]'),
      preview: q('[data-slot="journey-preview"]'),
      blocks,
    };
  }

  // page: 'blank' (new page), 'draft' (AI wrote it), 'edited' (after the follow-up edit).
  function editor(target, { page = 'draft', popover = false } = {}) {
    target.innerHTML = popover ? window.KIT_DOM.popover : window.KIT_DOM.editor;
    fill(target, page);
    return refs(target);
  }

  function home(target) {
    target.innerHTML = window.KIT_DOM.home;
    return refs(target);
  }

  window.Kit = { editor, home, icon, copy: COPY, applyTheme };
})();
