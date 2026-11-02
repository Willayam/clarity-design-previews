// Round 2: the pencil design with links at clarity.video/page/<name>, so the root stays free.
// A variant passes only its save control, so nothing else differs between them. Round 1 files
// keep using link.js alone and still show what they showed. Load after link.js, and leave out
// reserved.js, because nothing is held back under /page/.
(() => {
  const { c, wire, iconBtn, ROWS, linkRow, copied } = LINK;
  const PREFIX = 'clarity.video/page/';
  const SHARE_ID = 'k7m2xq';
  const stillWorks = `${PREFIX}${SHARE_ID} still works too.`;
  const TRY = [
    { value: 'todd', note: 'free' },
    { value: 'todd-webinar', note: 'on another page' },
    { value: 'sarah', note: 'another account has it' },
    { value: 'todd_ellis', note: 'not allowed' },
  ];

  // What the field says for a typed ending. Clients only learn that a name is unavailable.
  function statusOf(raw, current = SHARE_ID) {
    const value = c.normalize(raw);
    if (!value && current === SHARE_ID) return { state: 'empty', message: 'Pick a short ending people can say and type.', canSave: false, label: 'Save' };
    if (!value) return { state: 'empty', message: `Save it empty to go back to ${PREFIX}${SHARE_ID}.`, canSave: true, label: 'Save' };
    if (value === current) return { state: 'empty', message: 'This is the link now.', canSave: false, label: 'Save' };
    const result = c.check(value);
    if (result.state === 'yours') return { state: 'yours', message: `You use this on "${result.page.title}". Saving moves it here.`, canSave: true, label: 'Move here' };
    if (result.state === 'taken') return { state: 'taken', message: `${PREFIX}${value} is unavailable.`, canSave: false, label: 'Save' };
    if (result.state === 'free') return { state: 'free', message: `${PREFIX}${value} is available.`, canSave: true, label: 'Save' };
    return { state: result.state, message: result.message, canSave: false, label: 'Save' };
  }

  function page({ save, inField = false }) {
    const pencil = iconBtn('pencil', 'Change link', 'data-act="edit"');
    const viewRow = (link, note) => linkRow({ link: `page/${link}`, actions: pencil, below: note ? `<p class="lk-status" data-state="${note.state}">${note.text}</p>` : '' });
    function editRow(value, current = SHARE_ID, frozen = false) {
      const s = statusOf(value, current);
      const slot = `<span class="r2-slot" data-save-slot>${save(s)}</span>`;
      return `<div class="lk-link">
        <div class="lk-box">
          <label class="lk-field"><span>${PREFIX}</span><input data-field value="${value}" placeholder="your-name" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="New ending for the link" ${frozen ? 'tabindex="-1"' : ''}>${inField ? slot : ''}</label>
          ${inField ? '' : slot}
          ${iconBtn('x', 'Cancel', 'data-act="cancel"')}
        </div>
        <p class="lk-status" data-state="${s.state}" data-status aria-live="polite">${s.message}</p>
      </div>`;
    }
    const figure = (label, row) => `<figure class="lk-state"><figcaption>${label}</figcaption><div class="r2-card" inert>${row}</div></figure>`;

    document.body.innerHTML = `<main class="lk-page">
      <section class="lk-stage">
        <div class="r2-column" data-part="dialog">
          <div class="lk-dialog" role="dialog" aria-label="Share" data-live></div>
          <div class="r2-rows">
            ${figure('Nothing typed yet', editRow('', SHARE_ID, true))}
            ${figure('A name he uses on another page', editRow('todd-webinar', SHARE_ID, true))}
            ${figure('Unavailable', editRow('sarah', SHARE_ID, true))}
          </div>
        </div>
        <div class="lk-try">
          <p>Names to try</p>
          <div class="lk-chips">${TRY.map((t) => `<button type="button" class="lk-chip" data-try="${t.value}">${t.value}<small>${t.note}</small></button>`).join('')}</div>
          <p>Enter saves. Escape cancels.</p>
        </div>
      </section>
      <section class="lk-states" data-part="states">
        ${figure('Before', viewRow(SHARE_ID))}
        ${figure('Characters that are not allowed', editRow('todd_ellis', SHARE_ID, true))}
        ${figure('After saving', viewRow('todd', { state: 'saved', text: `Saved. ${stillWorks}` }))}
      </section>
    </main>`;

    // The live dialog opens mid-edit with a free name, because the save control is what's being judged.
    const host = document.querySelector('[data-live]');
    let current = SHARE_ID;
    let mode = 'edit';
    let justSaved = false;
    function render(focus, draft) {
      const note = current === SHARE_ID ? null : { state: justSaved ? 'saved' : 'empty', text: justSaved ? `Saved. ${stillWorks}` : stillWorks };
      host.innerHTML = LINK.dialog({ link: mode === 'view' ? viewRow(current, note) : editRow(draft, current) });
      if (mode !== 'edit') return;
      const input = host.querySelector('[data-field]');
      input.addEventListener('input', () => update(input.value));
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { event.preventDefault(); commit(input.value); }
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); }
      });
      if (focus) { input.focus(); input.select(); }
    }
    function update(raw) {
      const s = statusOf(raw, current);
      const line = host.querySelector('[data-status]');
      line.dataset.state = s.state;
      line.textContent = s.message;
      host.querySelector('[data-save-slot]').innerHTML = save(s);
    }
    function edit(draft) { mode = 'edit'; justSaved = false; render(true, draft ?? (current === SHARE_ID ? '' : current)); }
    function cancel() { mode = 'view'; render(); host.querySelector('[data-act="edit"]').focus(); }
    function commit(raw) {
      if (!statusOf(raw, current).canSave) return;
      current = c.normalize(raw) || SHARE_ID;
      mode = 'view';
      justSaved = current !== SHARE_ID;
      render();
    }
    host.addEventListener('click', (event) => {
      const act = event.target.closest('[data-act]')?.dataset.act;
      if (act === 'open') event.preventDefault();
      if (act === 'edit') edit();
      if (act === 'cancel') cancel();
      if (act === 'save') commit(host.querySelector('[data-field]').value);
      if (act === 'copy' || act === 'copy-main') copied(host);
    });
    document.querySelectorAll('[data-try]').forEach((chip) => chip.addEventListener('click', () => {
      if (mode !== 'edit') edit(chip.dataset.try);
      const input = host.querySelector('[data-field]');
      input.value = chip.dataset.try;
      update(input.value);
      input.focus();
    }));
    new MutationObserver(() => wire(host)).observe(host, { childList: true, subtree: true });
    render(false, 'todd');
    wire(document);
  }

  window.PENCIL = { page };
})();
