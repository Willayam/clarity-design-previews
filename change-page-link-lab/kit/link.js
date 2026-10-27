// Shared kit for the change-page-link lab. Every variant uses this dialog, these names and these
// messages, so variants differ only in how Todd changes the link. Load after buttons.js,
// reserved.js and shell.js (PG.ctx holds check(), normalize(), icon() and btn()).
(() => {
  const c = PG.ctx;
  const ORIGINAL = 'page/k7m2xq';

  // The real Button classes; these data attributes are what ui/button.tsx sets for the app CSS.
  function wire(root = document) {
    root.querySelectorAll('.pgb').forEach((node) => {
      const variant = [...node.classList].find((name) => name.startsWith('pgb-v-'))?.slice(6);
      const size = [...node.classList].find((name) => name.startsWith('pgb-s-'))?.slice(6);
      Object.assign(node.dataset, { slot: 'button', buttonVariant: variant, buttonSize: size, variant, size });
    });
    return root;
  }
  const icon = (name) => c.icon(name, 'lk-icon');
  const btn = (variant = 'default', size = 'default') => c.btn(variant, size);
  const iconBtn = (name, label, attrs = '') =>
    `<button type="button" class="${btn('ghost', 'icon-sm')}" aria-label="${label}" title="${label}" ${attrs}>${icon(name)}</button>`;

  // What the field says for a typed ending. `current` is the link the page has now.
  // Clients only learn that a name is unavailable, never whose it is or why.
  function statusOf(raw, current = ORIGINAL) {
    const value = c.normalize(raw);
    if (!value && current === ORIGINAL) return { state: 'empty', value, message: 'Pick a short ending people can say and type.', canSave: false, label: 'Save' };
    if (!value) return { state: 'empty', value, message: `Save it empty to go back to clarity.video/${ORIGINAL}.`, canSave: true, label: 'Save' };
    if (value === current) return { state: 'empty', value, message: 'This is the link now.', canSave: false, label: 'Save' };
    const result = c.check(value);
    if (result.state === 'yours') return { state: 'yours', value, page: result.page, message: `You use this on "${result.page.title}". Saving moves it here.`, canSave: true, label: 'Move here' };
    if (result.state === 'reserved' || result.state === 'taken') return { state: 'taken', value, message: `clarity.video/${value} is unavailable.`, canSave: false, label: 'Save' };
    if (result.state === 'free') return { state: 'free', value, message: `clarity.video/${value} is available.`, canSave: true, label: 'Save' };
    return { state: result.state, value, message: result.message, canSave: false, label: 'Save' };
  }
  const savedNote = () => `clarity.video/${ORIGINAL} still works too.`;

  // Names the live dialog offers to try, and the states every variant freezes, in this order.
  const TRY = [
    { value: 'todd', note: 'free' },
    { value: 'todd-webinar', note: 'on another page' },
    { value: 'pricing', note: 'Clarity keeps it' },
    { value: 'sarah', note: 'another account has it' },
    { value: 'todd_ellis', note: 'not allowed' },
  ];
  const STATES = [
    { id: 'before', label: 'Before' },
    { id: 'open', label: 'Changing, nothing typed yet', value: '' },
    { id: 'free', label: 'A free name', value: 'todd' },
    { id: 'move', label: 'A name he uses on another page', value: 'todd-webinar' },
    { id: 'unavailable', label: 'Unavailable, whoever has it', value: 'pricing' },
    { id: 'invalid', label: 'Characters that are not allowed', value: 'todd_ellis' },
    { id: 'saved', label: 'After saving', value: 'todd' },
  ];

  // The link row as ShareLink draws it today. `actions` goes between the link and the copy button.
  function linkRow({ link = ORIGINAL, actions = '', below = '' } = {}) {
    return `<div class="lk-link">
      <div class="lk-box">
        <a class="lk-text" href="#" data-act="open">clarity.video/${link}</a>
        ${actions}
        <span class="lk-tip" data-tip>${iconBtn('copy', 'Copy link', 'data-act="copy"')}</span>
      </div>
      ${below}
    </div>`;
  }
  // A field for the ending, with clarity.video/ fixed in front.
  function field({ value = '', frozen = false, placeholder = 'your-name' } = {}) {
    return `<label class="lk-field"><span>clarity.video/</span><input data-field value="${value}" placeholder="${placeholder}" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="New ending for the link" ${frozen ? 'tabindex="-1"' : ''}></label>`;
  }
  function status(s) {
    return `<p class="lk-status" data-state="${s.state}" data-status aria-live="polite">${s.message}</p>`;
  }

  // The rest of the share dialog, unchanged by this feature.
  const ROWS = {
    access: () => `<div class="lk-row"><span class="lk-row-label">${icon('globe')}Who can open it</span><span class="lk-select">Anyone with the link ${icon('chevron-down')}</span></div>`,
    password: () => `<div class="lk-row"><span class="lk-row-label">${icon('lock')}Password protected</span><span class="lk-switch"></span></div>`,
    live: () => `<div class="lk-live"><b>Live</b><small>Published 2d ago.</small></div>`,
    copy: () => `<button type="button" class="${btn('default', 'lg')} lk-wide" data-act="copy-main">${icon('copy')}Copy link</button>`,
  };
  // The whole dialog body. Pass `link` for the link row; pass `body` to replace everything under the title.
  function dialog({ link = linkRow(), body = null, title = 'Share', head = '' } = {}) {
    return `<h2 class="lk-title">${title}</h2><span class="lk-x">${iconBtn('x', 'Close', 'data-act="close"')}</span>
      ${head}
      ${body ?? `${link}${ROWS.access()}${ROWS.password()}${ROWS.live()}${ROWS.copy()}`}`;
  }

  // Shows "Copied" over the copy icon for a moment.
  function copied(root) {
    const tip = root.querySelector('[data-tip]');
    if (!tip) return;
    tip.dataset.show = 'true';
    clearTimeout(tip._t);
    tip._t = setTimeout(() => { tip.dataset.show = 'false'; }, 1200);
  }

  // Builds the page. `mount(host)` wires the live dialog and returns { tryName(value) }.
  // `frozen(state)` returns the dialog body for one entry of STATES. `states` limits which ones show.
  function page({ mount, frozen, states = STATES.map((s) => s.id), tryNames = true }) {
    document.body.innerHTML = `<main class="lk-page">
      <section class="lk-stage">
        <div class="lk-dialog" role="dialog" aria-label="Share" data-part="dialog" data-live></div>
        ${tryNames ? `<div class="lk-try">
          <p>Names to try</p>
          <div class="lk-chips">${TRY.map((t) => `<button type="button" class="lk-chip" data-try="${t.value}">${t.value}<small>${t.note}</small></button>`).join('')}</div>
          <p>Enter saves. Escape cancels.</p>
        </div>` : ''}
      </section>
      ${frozen ? `<section class="lk-states" data-part="states">
        ${STATES.filter((s) => states.includes(s.id)).map((s) => `<figure class="lk-state" data-state-id="${s.id}"><figcaption>${s.label}</figcaption><div class="lk-dialog" inert>${frozen(s)}</div></figure>`).join('')}
      </section>` : ''}
    </main>`;
    const host = document.querySelector('[data-live]');
    const api = mount(host) ?? {};
    wire(document);
    // Re-wire after every render a variant does inside the live dialog.
    new MutationObserver(() => wire(host)).observe(host, { childList: true, subtree: true });
    host.addEventListener('click', (event) => { if (event.target.closest('[data-act="open"]')) event.preventDefault(); });
    document.querySelectorAll('[data-try]').forEach((chip) => chip.addEventListener('click', () => api.tryName?.(chip.dataset.try)));
  }

  window.LINK = { c, ORIGINAL, statusOf, savedNote, TRY, STATES, linkRow, field, status, ROWS, dialog, copied, page, wire, icon, btn, iconBtn };
})();
