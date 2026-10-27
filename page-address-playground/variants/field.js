// Step 2 of the page address playground, "Picking the address": the field itself, drawn inside the
// real share dialog. PROTOTYPE, throwaway. Mock data only. CSS prefix: v-field-.
(() => {
  const DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const SEPARATOR = { '-': 'dash', '.': 'dot', '_': 'underscore', ' ': 'space' };
  const VOLUME = '<svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>';
  const BAD = ['taken', 'reserved', 'invalid'];

  const esc = (text) => String(text).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const squash = (address) => address.replace(/-/g, '');
  const oneWord = (raw) => String(raw).toLowerCase().replace(/[^a-z0-9]/g, '');
  const url = (address) => `clarity.video/${esc(address)}`;
  const shareUrl = (page) => `clarity.video/page/${page.share}`;
  const firstSentence = (text) => { const at = text.indexOf('. '); return at < 0 ? [text, ''] : [text.slice(0, at + 1), text.slice(at + 2)]; };
  // Addresses the account holds on other pages. The one being typed is not counted until it is set.
  const inUse = (c) => c.held().filter((held) => held.page.id !== 'p1').length;

  // ---------- pieces ----------
  const affix = ({ inner = '', placeholder = 'todd' } = {}) => `<span class="app-affix v-field-affix" data-v-affix><span>clarity.video/</span><input data-address-input spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="${esc(placeholder)}" aria-label="Page address">${inner}</span>`;
  // A chip inside a status line that sets the shared address. bind() handles the click.
  const use = (address, label = `Use ${address}`) => `<button type="button" class="v-field-use" data-v-set="${esc(address)}">${esc(label)}</button>`;
  const count = () => `<span class="v-field-count" data-v-count></span>`;
  const labelRow = (label) => `<div class="v-field-labelrow"><span class="app-label">${label}</span>${count()}</div>`;
  const frame = (c, body, width = 440) => `<div class="v-field-frame">${c.dialog({ behind: c.home(), width, body })}</div>`;

  // The spoken form with every separator shown as the word a listener would hear.
  function spokenHtml(address) {
    if (!address) return 'clarity dot video slash <span class="v-field-dim">...</span>';
    const parts = [];
    let run = '';
    for (const ch of address) {
      if (/[a-z0-9]/.test(ch)) { run += ch; continue; }
      if (run) { parts.push(run); run = ''; }
      parts.push(`<em>${SEPARATOR[ch] ?? 'symbol'}</em>`);
    }
    if (run) parts.push(run);
    return `clarity dot video slash ${parts.join(' ')}`.replace(/\d/g, (d) => ` ${DIGITS[Number(d)]} `).replace(/\s+/g, ' ').trim();
  }

  // The one-word form of a dashed address, offered as a chip. Dashes don't count when matching,
  // so the one-word form has the same owner as the dashed one and is free whenever it is.
  const oneWordNudge = (address) => (address.includes('-') ? ` One word is easier to say, and people who skip the dash still land here. ${use(squash(address))}` : '');
  // A fix for an invalid address, when stripping the bad characters leaves a free name.
  function fixChip(c, address) {
    const one = oneWord(address);
    if (!one || one === address || one.length > c.maxLength || c.check(one).state !== 'free') return '';
    return ` ${use(one)}`;
  }

  // One sentence that settles the state, then what to do about it. Variants override entries.
  function lines(c, result) {
    const { state, address, page, message } = result;
    if (state === 'empty') return { head: '', rest: 'Type the words people will hear.' };
    if (state === 'invalid') return { head: message, rest: fixChip(c, address).trim() };
    if (state === 'reserved') return { head: `Clarity keeps ${url(address)}.`, rest: 'Pick another word.' };
    if (state === 'taken') { const [head, rest] = firstSentence(message); return { head, rest: `${rest} Pick another word.`.trim() }; }
    if (state === 'yours') return { head: `You use ${url(page.address)} on ${esc(page.title)}${page.live ? '' : ', which is offline'}.`, rest: `Move it here? That page keeps its share link, ${shareUrl(page)}.` };
    if (state === 'current') return { head: 'This page has it already.', rest: '' };
    return { head: `${url(address)} is free.`, rest: `Say it as "${esc(c.say(address))}". It stays yours once set.${oneWordNudge(address)}` };
  }

  function paintStatus(node, result, { head, rest }) {
    node.dataset.state = result.state;
    node.innerHTML = `${head ? `<b>${head}</b>` : ''}${head && rest ? ' ' : ''}${rest}`;
  }
  function paintClaim(button, result, labels = {}) {
    if (!button) return;
    button.textContent = result.state === 'yours' ? labels.yours ?? 'Move it here' : labels.free ?? 'Set address';
    button.disabled = !(result.state === 'free' || result.state === 'yours');
  }
  function paintCount(root, text) {
    root.querySelectorAll('[data-v-count]').forEach((node) => { node.textContent = text; });
  }

  // Runs paint() now and on every change of the shared address, and wires the chips.
  function bind(root, c, paint) {
    const input = root.querySelector('[data-address-input]');
    const raw = () => (input ? input.value : c.address);
    const run = () => paint(c.check(raw()), raw());
    root.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-v-set]');
      if (chip) c.setAddress(chip.dataset.vSet);
    });
    c.onAddress(run);
    run();
  }

  // =====================================================================================
  // A. One line under the field
  // =====================================================================================
  PG.variant({
    surface: 'field',
    key: 'A',
    name: 'One line under the field',
    idea: 'The fastest path. One affix field, one line under it that answers as Todd types, and a button that turns on when the name is free. A move, a fix or the one-word form is a chip in that same line.',
    width: 1000,
    render: (c) => frame(c, c.shareDialog({
      rowsAfter: `<div class="app-field v-field-block">
        ${labelRow('Address')}
        <div class="v-field-row">${affix({ inner: '<span class="v-field-mark" data-v-mark></span>' })}<button type="button" class="${c.btn('default')}" data-v-claim>Set address</button></div>
        <p class="v-field-status" data-v-status></p>
      </div>`,
    })),
    mount: (root, c) => {
      const status = root.querySelector('[data-v-status]');
      const claim = root.querySelector('[data-v-claim]');
      const mark = root.querySelector('[data-v-mark]');
      const box = root.querySelector('[data-v-affix]');
      bind(root, c, (result) => {
        paintStatus(status, result, lines(c, result));
        paintClaim(claim, result);
        box.dataset.state = result.state;
        mark.innerHTML = result.state === 'free' ? c.icon('check') : BAD.includes(result.state) ? c.icon('x') : '';
        paintCount(root, `${inUse(c)} of ${c.limit} in use`);
      });
    },
  });

  // =====================================================================================
  // B. Hear it first
  // =====================================================================================
  PG.variant({
    surface: 'field',
    key: 'B',
    name: 'Hear it first',
    idea: 'The spoken line is the headline. Todd reads clarity dot video slash todd before he commits, every dash shows up as the word a listener hears, and Hear it plays it aloud. The field sits under the line.',
    width: 1000,
    render: (c) => frame(c, c.shareDialog({
      rowsAfter: `<div class="v-field-say" data-v-say>
        <div class="v-field-say-head">${VOLUME}<span>What listeners hear</span><button type="button" class="${c.btn('ghost', 'sm')}" data-v-hear>Hear it</button></div>
        <p class="v-field-say-line" data-v-spoken></p>
      </div>
      <div class="app-field v-field-block">
        ${labelRow('Address')}
        <div class="v-field-row">${affix()}<button type="button" class="${c.btn('default')}" data-v-claim>Set address</button></div>
        <p class="v-field-status" data-v-status></p>
      </div>`,
    })),
    mount: (root, c) => {
      const say = root.querySelector('[data-v-say]');
      const spoken = root.querySelector('[data-v-spoken]');
      const status = root.querySelector('[data-v-status]');
      const claim = root.querySelector('[data-v-claim]');
      const box = root.querySelector('[data-v-affix]');
      root.querySelector('[data-v-hear]').addEventListener('click', () => {
        if (!('speechSynthesis' in window)) return;
        speechSynthesis.cancel();
        speechSynthesis.speak(new SpeechSynthesisUtterance(spoken.textContent));
      });
      bind(root, c, (result) => {
        const { state, address, page } = result;
        spoken.innerHTML = spokenHtml(address);
        say.dataset.state = state;
        box.dataset.state = state;
        const digits = /\d/.test(address) ? ' Digits are read as words, so 2 sounds like two.' : '';
        const copy = {
          empty: { head: '', rest: 'Type it, then read the line above out loud.' },
          free: {
            head: `${url(address)} is free.`,
            rest: address.includes('-')
              ? `It stays yours once set.${digits} Listeners hear "dash". People who skip it still land here, but one word is easier to say. ${use(squash(address))}`
              : `If it came out clean when you said it, set it.${digits} It stays yours once set.`,
          },
          yours: { head: `You already say ${url(page?.address ?? address)} for ${esc(page?.title ?? '')}.`, rest: `Move it here? That page keeps its share link, ${page ? shareUrl(page) : ''}.` },
        }[state] ?? lines(c, result);
        paintStatus(status, result, copy);
        paintClaim(claim, result);
        paintCount(root, `${inUse(c)} of ${c.limit} in use`);
      });
    },
  });

  // =====================================================================================
  // C. Chips before typing
  // =====================================================================================
  PG.variant({
    surface: 'field',
    key: 'C',
    name: 'Chips before typing',
    idea: "Typing is optional. Free names built from Todd's name and the page title come first, so the usual case is one press. The field under them takes his own idea, and when that one is taken the chips are still there.",
    width: 1000,
    render: (c) => {
      const ideas = c.suggest({ name: c.name, title: c.page.title });
      return frame(c, c.shareDialog({
        rowsAfter: `<div class="app-field v-field-block">
          ${labelRow('Address')}
          <div class="v-field-chips">${ideas.map((idea) => `<button type="button" class="v-field-chip" data-set-address="${esc(idea)}" aria-pressed="false"><span>/</span>${esc(idea)}</button>`).join('')}</div>
          <div class="v-field-row">${affix({ placeholder: 'or type your own' })}<button type="button" class="${c.btn('default')}" data-v-claim>Set address</button></div>
          <p class="v-field-status" data-v-status></p>
        </div>`,
      }));
    },
    mount: (root, c) => {
      const chips = [...root.querySelectorAll('.v-field-chip')];
      const status = root.querySelector('[data-v-status]');
      const claim = root.querySelector('[data-v-claim]');
      const box = root.querySelector('[data-v-affix]');
      bind(root, c, (result) => {
        const { state, address } = result;
        chips.forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.setAddress === address)));
        box.dataset.state = state;
        const base = lines(c, result);
        const copy = {
          empty: { head: '', rest: 'Press one above, or type your own.' },
          reserved: { head: base.head, rest: 'The ones above are free.' },
          taken: { head: base.head, rest: `${base.rest.replace(' Pick another word.', '')} The ones above are free.`.trim() },
        }[state] ?? base;
        paintStatus(status, result, copy);
        paintClaim(claim, result);
        paintCount(root, `${inUse(c)} of ${c.limit} in use`);
      });
    },
  });

  // =====================================================================================
  // D. Type, then confirm
  // =====================================================================================
  PG.variant({
    surface: 'field',
    key: 'D',
    name: 'Type, then confirm',
    idea: 'Two steps. The field only checks the name. A second card says in full sentences where the name points, how it sounds, whether it moves from another page and that it stays his. Nothing commits until that card\'s button.',
    width: 1200,
    render: (c) => `<div class="v-field-frame v-field-frame-wide"><div style="position:relative"><div class="app-dim">${c.home()}</div>
      <div class="app-dialog-layer v-field-pair">
        <div class="app-dialog v-field-pair-dialog" style="width:440px" data-v-step="1">${c.shareDialog({
          rowsAfter: `<div class="app-field v-field-block">
            ${labelRow('Address')}
            <div class="v-field-row">${affix()}<button type="button" class="${c.btn('default')}" data-v-next>Continue</button></div>
            <p class="v-field-status" data-v-status></p>
          </div>`,
        })}</div>
        <span class="v-field-pair-arrow">${c.icon('arrow')}</span>
        <div class="app-dialog v-field-pair-dialog" style="width:440px" data-v-step="2" data-active="false">
          <h2 class="app-dialog-title" data-v-title>Set the address</h2>
          <div class="v-field-big" data-address-url></div>
          <ul class="v-field-facts" data-v-facts></ul>
          <p class="v-field-wait" data-v-wait>Pick a free address first.</p>
          <p class="v-field-done" data-v-done></p>
          <div class="v-field-actions"><button type="button" class="${c.btn('outline')}" data-v-back>Back</button><button type="button" class="${c.btn('default')}" data-v-claim>Set address</button></div>
        </div>
      </div></div></div>`,
    mount: (root, c) => {
      const two = root.querySelector('[data-v-step="2"]');
      const status = root.querySelector('[data-v-status]');
      const next = root.querySelector('[data-v-next]');
      const title = root.querySelector('[data-v-title]');
      const facts = root.querySelector('[data-v-facts]');
      const wait = root.querySelector('[data-v-wait]');
      const done = root.querySelector('[data-v-done]');
      const claim = root.querySelector('[data-v-claim]');
      const box = root.querySelector('[data-v-affix]');
      const go = (step) => { two.dataset.active = String(step === 2); };
      next.addEventListener('click', () => go(2));
      root.querySelector('[data-v-back]').addEventListener('click', () => go(1));
      claim.addEventListener('click', () => { done.textContent = `Done. ${url(c.address)} opens this page now.`; claim.disabled = true; });
      bind(root, c, (result) => {
        const { state, address, page } = result;
        const ready = state === 'free' || state === 'yours';
        const base = lines(c, result);
        paintStatus(status, result, {
          free: { head: base.head, rest: 'Continue to read what setting it does.' },
          yours: { head: base.head, rest: 'Continue to move it here.' },
        }[state] ?? base);
        box.dataset.state = state;
        next.disabled = !ready;
        done.textContent = '';
        if (!ready) go(1);
        wait.hidden = ready;
        facts.hidden = !ready;
        title.textContent = state === 'yours' ? 'Move the address' : 'Set the address';
        paintClaim(claim, result);
        paintCount(root, `${inUse(c)} of ${c.limit} in use`);
        if (!ready) return;
        const used = inUse(c);
        const rows = [
          [c.icon('eye'), `Opens ${esc(c.page.title)}. The share link ${shareUrl(c.page)} keeps working.`],
          [VOLUME, `Say it as "${esc(c.say(address))}".${address.includes('-') ? ' One word is easier to say. People who skip the dash still land here.' : ''}`],
          state === 'yours' ? [c.icon('arrow'), `Moves here from ${esc(page.title)}${page.live ? '' : ', which is offline'}. That page keeps its share link, ${shareUrl(page)}.`] : null,
          [c.icon('lock'), 'Stays yours. Rename it later and the old address keeps opening the page.'],
          [c.icon('link'), state === 'yours' ? `Still ${used} of your ${c.limit} addresses.` : `${used + 1} of your ${c.limit} addresses.`],
        ].filter(Boolean);
        facts.innerHTML = rows.map(([mark, text]) => `<li>${mark}<span>${text}</span></li>`).join('');
      });
    },
  });

  // =====================================================================================
  // E. Rename what is there
  // =====================================================================================
  const CURRENT = 'todd';
  PG.variant({
    surface: 'field',
    key: 'E',
    name: 'Rename what is there',
    idea: 'The page already has clarity.video/todd. Edit opens the same field with the old address in it. The lines under it name what keeps working, the old address and the share link, and that both count toward his five.',
    width: 1000,
    render: (c) => frame(c, c.shareDialog({
      rowsAfter: `<div class="v-field-edit" data-v-edit-open="true">
        <div class="app-row v-field-cur"><span class="app-row-label">${c.icon('link')}Address</span><span class="v-field-cur-url">${url(CURRENT)}</span><button type="button" class="${c.btn('ghost', 'sm')}" data-v-edit>${c.icon('pencil')}Edit</button></div>
        <div class="v-field-editor">
          ${labelRow('New address')}
          ${affix()}
          <p class="v-field-status" data-v-status></p>
          <ul class="v-field-keeps" data-v-keeps></ul>
          <div class="v-field-actions"><button type="button" class="${c.btn('outline')}" data-v-cancel>Cancel</button><button type="button" class="${c.btn('default')}" data-v-claim>Rename</button></div>
        </div>
      </div>`,
    })),
    mount: (root, c) => {
      const edit = root.querySelector('[data-v-edit-open]');
      const status = root.querySelector('[data-v-status]');
      const keeps = root.querySelector('[data-v-keeps]');
      const claim = root.querySelector('[data-v-claim]');
      const box = root.querySelector('[data-v-affix]');
      root.querySelector('[data-v-edit]').addEventListener('click', () => { edit.dataset.vEditOpen = 'true'; root.querySelector('[data-address-input]').focus(); });
      root.querySelector('[data-v-cancel]').addEventListener('click', () => { edit.dataset.vEditOpen = 'false'; });
      const keep = (mark, text) => `<li data-mark="${mark}">${mark === 'arrow' ? c.icon('arrow') : c.icon('check')}<span>${text}</span></li>`;
      bind(root, c, (result) => {
        const { state, address, page } = result;
        const used = inUse(c) + 1;
        const same = state !== 'invalid' && state !== 'empty' && squash(address) === squash(CURRENT);
        const full = state === 'free' && used + 1 > c.limit;
        let copy;
        let rows = [];
        if (same) copy = { head: '', rest: 'This is the address now. Type a new one to rename it, or press Cancel.' };
        else if (state === 'empty') copy = { head: '', rest: `Type the new address, or press Cancel to keep ${url(CURRENT)}.` };
        else if (state === 'reserved' || state === 'taken') { const base = lines(c, result); copy = { head: base.head, rest: `${base.rest.replace(' Pick another word.', '').replace('Pick another word.', '')} ${url(CURRENT)} stays as it is.`.trim() }; }
        else if (state === 'yours') {
          copy = { head: `Move ${url(page.address)} here from ${esc(page.title)}?`, rest: `That page keeps its share link, ${shareUrl(page)}.${page.live ? '' : ' It is offline right now.'}` };
          rows = [
            keep('check', `${url(CURRENT)} keeps opening this page and stays yours.`),
            keep('check', `${shareUrl(c.page)} keeps working.`),
            keep('arrow', `${url(page.address)} becomes the one you say. Still ${used} of your ${c.limit} addresses.`),
          ];
        } else if (full) copy = { head: `All ${c.limit} addresses in use.`, rest: `${url(CURRENT)} stays yours after a rename, so a new name needs a free slot. Move one of yours here instead.` };
        else if (state === 'free') {
          copy = { head: `Rename to ${url(address)}?`, rest: `Say it as "${esc(c.say(address))}".${oneWordNudge(address)}` };
          rows = [
            keep('check', `${url(CURRENT)} keeps opening this page and stays yours.`),
            keep('check', `${shareUrl(c.page)} keeps working.`),
            keep('arrow', `${url(address)} becomes the one you say. Old and new both count, ${used + 1} of your ${c.limit}.`),
          ];
        } else copy = lines(c, result);
        paintStatus(status, result, copy);
        if (same) status.dataset.state = 'current';
        box.dataset.state = same ? 'current' : state;
        keeps.innerHTML = rows.join('');
        keeps.hidden = rows.length === 0;
        paintClaim(claim, result, { free: 'Rename' });
        if (same || full) claim.disabled = true;
        paintCount(root, `${used} of ${c.limit} in use`);
      });
    },
  });

  // ---------- styles ----------
  PG.css(`
    .v-field-frame .app-shell { min-height: 780px; }
    .v-field-frame-wide .app-shell { min-height: 720px; }
    .v-field-block { gap: 6px; }
    .v-field-labelrow { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
    .v-field-count { font-size: 12px; color: var(--muted-foreground); white-space: nowrap; }
    .v-field-row { display: flex; gap: 8px; align-items: center; }
    .v-field-row .app-affix { flex: 1; min-width: 0; }
    .v-field-affix:not(:focus-within)[data-state="free"] { border-color: var(--success); }
    .v-field-affix:not(:focus-within)[data-state="taken"], .v-field-affix:not(:focus-within)[data-state="reserved"], .v-field-affix:not(:focus-within)[data-state="invalid"] { border-color: var(--destructive); }
    .v-field-affix > .v-field-mark { padding: 0 8px 0 0; color: var(--success); }
    .v-field-affix[data-state="taken"] > .v-field-mark, .v-field-affix[data-state="reserved"] > .v-field-mark, .v-field-affix[data-state="invalid"] > .v-field-mark { color: var(--destructive); }
    .v-field-mark:empty { display: none; }
    .v-field-status { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--muted-foreground); min-height: 19px; }
    .v-field-status b { font-weight: 500; color: var(--foreground); }
    .v-field-status[data-state="free"] b { color: var(--success); }
    .v-field-status[data-state="taken"] b, .v-field-status[data-state="reserved"] b, .v-field-status[data-state="invalid"] b { color: var(--destructive); }
    .v-field-use { appearance: none; font: inherit; font-size: 12px; font-weight: 500; line-height: 1; height: 22px; padding: 0 8px; border-radius: 99px; border: 1px solid var(--border); background: var(--card); color: var(--foreground); cursor: pointer; vertical-align: middle; margin: 0 2px; }
    .v-field-use:hover { border-color: var(--muted-foreground); }
    .v-field-actions { display: flex; gap: 8px; justify-content: flex-end; }

    /* B. the spoken line */
    .v-field-say { background: var(--muted); border-radius: 10px; padding: 10px 14px 12px; display: grid; gap: 4px; }
    .v-field-say-head { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 500; color: var(--muted-foreground); }
    .v-field-say-head > span { flex: 1; }
    .v-field-say-head > svg { color: var(--muted-foreground); }
    .v-field-say-line { margin: 0; font-size: 17px; font-weight: 500; line-height: 1.4; overflow-wrap: anywhere; }
    .v-field-say-line em { font-style: normal; font-weight: 600; background: var(--card); border: 1px solid var(--border); border-radius: 6px; padding: 0 6px; }
    .v-field-say-line .v-field-dim { color: var(--muted-foreground); }

    /* C. suggestion chips */
    .v-field-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .v-field-chip { appearance: none; font: inherit; font-size: 13px; font-weight: 500; height: 30px; padding: 0 12px; border-radius: 99px; border: 1px solid var(--border); background: var(--card); color: var(--foreground); cursor: pointer; }
    .v-field-chip > span { color: var(--muted-foreground); font-weight: 400; }
    .v-field-chip:hover { border-color: var(--muted-foreground); }
    .v-field-chip[aria-pressed="true"] { border-color: var(--primary); color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }
    .v-field-chip[aria-pressed="true"] > span { color: var(--primary); }

    /* D. two dialogs side by side */
    .v-field-pair { display: flex; align-items: center; justify-content: center; gap: 12px; }
    .v-field-pair-dialog > * { transition: opacity 150ms; }
    .v-field-pair-dialog[data-active="false"] > * { opacity: 0.45; }
    .v-field-pair-arrow { color: white; display: grid; place-items: center; flex: none; }
    .v-field-pair-arrow svg { width: 22px; height: 22px; }
    .v-field-big { font-size: 22px; font-weight: 600; letter-spacing: -0.01em; overflow-wrap: anywhere; }
    .v-field-facts { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; font-size: 13.5px; line-height: 1.45; }
    .v-field-facts li { display: flex; gap: 10px; }
    .v-field-facts svg { color: var(--muted-foreground); margin-top: 2px; }
    .v-field-facts[hidden], .v-field-wait[hidden], .v-field-keeps[hidden] { display: none; }
    .v-field-wait { margin: 0; color: var(--muted-foreground); }
    .v-field-done { margin: 0; min-height: 19px; font-size: 13px; color: var(--success); }

    /* E. the current address and the editor under it */
    .v-field-edit { display: grid; gap: 12px; }
    .v-field-cur-url { font-weight: 500; }
    .v-field-edit[data-v-edit-open="true"] [data-v-edit] { display: none; }
    .v-field-editor { display: grid; gap: 6px; border-top: 1px solid var(--border); padding-top: 12px; }
    .v-field-edit[data-v-edit-open="false"] .v-field-editor { display: none; }
    .v-field-keeps { list-style: none; margin: 4px 0 0; padding: 0; display: grid; gap: 6px; font-size: 12.5px; line-height: 1.45; color: var(--muted-foreground); }
    .v-field-keeps li { display: flex; gap: 8px; }
    .v-field-keeps svg { margin-top: 1px; color: var(--success); }
    .v-field-keeps li[data-mark="arrow"] svg { color: var(--primary); }
    .v-field-keeps li[data-mark="arrow"] { color: var(--foreground); }
    .v-field-editor .v-field-actions { margin-top: 6px; }
  `);
})();
