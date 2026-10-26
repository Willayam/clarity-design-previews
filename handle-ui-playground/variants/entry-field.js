// Steps 1 and 2 of the handle playground: where Todd claims it (entry) and the claim field itself
// (field). PROTOTYPE, throwaway. Mock data only.
(() => {
  const LOGO = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="4"/><path d="M13 10.5v11l9-5.5z" fill="currentColor"/></svg>';
  const VOLUME = '<svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>';
  const DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

  // ---------- shared pieces ----------
  const esc = (text) => String(text).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const affix = (extra = '') => `<span class="app-affix ${extra}"><span>clarity.video/</span><input data-handle-input spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="yourname" aria-label="Your address"></span>`;
  const field = (label, control, hint = '') => `<label class="app-field"><span class="app-label">${label}</span>${control}${hint ? `<span class="app-hint">${hint}</span>` : ''}</label>`;
  const text = (value = '', placeholder = '') => `<input class="app-input" value="${value}" placeholder="${placeholder}">`;
  const who = () => `<div class="v-entry-who"><span class="app-avatar v-entry-avatar">T</span><div><b>Todd Ellis</b><span>todd@example.com</span></div></div>`;
  const later = (label, body, align = '') => `<div class="v-entry-later ${align}"><div class="v-entry-later-label">${label}</div>${body}</div>`;

  // The Profile card with the address as an editable field (first claim lives here).
  const profileCard = (c) => `<section class="app-card"><div class="app-card-body">
      <h3 class="app-card-title">Profile</h3>
      ${field('Full name', text(c.name))}
      ${field('Phone', text('+1 415 555 0132'))}
      <label class="app-field"><span class="app-label">Your address</span>${affix()}
        <span class="app-hint v-entry-status" data-handle-status></span>
        <span class="app-hint">You keep it for good. Rename it later and the old name still sends people to you.</span></label>
      ${field('Booking link', text('', 'https://calendly.com/...'), 'New pages link their booking button here.')}
    </div><div class="app-card-foot"><button class="${c.btn('default')}">Save changes</button></div></section>`;

  // The Profile card once the handle is claimed elsewhere: a value and a Change button.
  const profileLater = (c) => `<section class="app-card"><div class="app-card-body">
      <h3 class="app-card-title">Profile</h3>
      ${field('Full name', text(c.name))}
      <div class="app-field"><span class="app-label">Your address</span>
        <div class="v-entry-claimed">${c.icon('link')}<b data-handle-url></b><button class="${c.btn('outline', 'sm')}">Change</button></div>
        <span class="app-hint">Renaming keeps the old name sending people to you. The address never passes to anyone else.</span></div>
      ${field('Booking link', text('', 'https://calendly.com/...'), 'New pages link their booking button here.')}
    </div></section>`;

  // Which character makes a handle invalid, so the field can name it.
  function offender(handle) {
    if (/^[a-z0-9]+$/.test(handle)) return 'long';
    if (handle.includes('-')) return 'dash';
    if (handle.includes('.')) return 'dot';
    if (handle.includes('_')) return 'underscore';
    if (/\s/.test(handle)) return 'space';
    return 'symbol';
  }
  const FIX = { dash: 'Take out the dash.', dot: 'Take out the dot.', underscore: 'Take out the underscore.', space: 'Take out the space.', long: 'Keep it under 30 characters.', symbol: 'Letters and numbers only.' };
  const alt = (c, handle) => [`${handle}sells`, `${handle}talks`, `meet${handle}`, `${handle}hq`, `the${handle}`].filter((idea) => c.check(idea).state === 'free');

  // Spoken form as HTML, with the words a listener should never have to hear marked.
  function spokenHtml(handle) {
    if (!handle) return 'clarity dot video slash <span class="app-muted">...</span>';
    const bad = { '-': 'dash', '.': 'dot', '_': 'underscore', ' ': 'space' };
    const parts = [];
    let run = '';
    for (const ch of handle) {
      if (/[a-z0-9]/.test(ch)) { run += ch; continue; }
      if (run) { parts.push(esc(run)); run = ''; }
      parts.push(`<em>${bad[ch] ?? 'symbol'}</em>`);
    }
    if (run) parts.push(esc(run));
    return `clarity dot video slash ${parts.join(' ').replace(/\d/g, (d) => ` ${DIGITS[Number(d)]} `).replace(/\s+/g, ' ').trim()}`;
  }

  // The shell fills data-handle spans on every change and after the gallery renders, but not when
  // it opens a variant at full size. This fills them once for this frame, after the shell has
  // wired the input (wire() runs right after mount, so a microtask is late enough).
  function syncFrame(root, c) {
    queueMicrotask(() => {
      const raw = root.querySelector('[data-handle-input]')?.value ?? '';
      const result = c.check(raw);
      const handle = result.handle || 'todd';
      root.querySelectorAll('[data-handle]').forEach((node) => { node.textContent = handle; });
      root.querySelectorAll('[data-handle-url]').forEach((node) => { node.textContent = `clarity.video/${handle}`; });
      root.querySelectorAll('[data-handle-say]').forEach((node) => { node.textContent = c.say(handle); });
      root.querySelectorAll('[data-handle-status]').forEach((node) => { node.dataset.state = result.state; node.textContent = result.message; });
    });
  }

  // Wires a variant's own status line, Claim button and any extra reaction to the shared handle.
  function bindStatus(root, c, copy, after) {
    const input = root.querySelector('[data-handle-input]');
    const status = root.querySelector('[data-v-status]');
    const claim = root.querySelector('[data-v-claim]');
    const apply = (result) => {
      status.dataset.state = result.state;
      status.textContent = copy[result.state](result.handle);
      if (claim) claim.disabled = result.state !== 'free';
      after?.(result);
    };
    c.onHandle((_, result) => apply(result));
    syncFrame(root, c);
    queueMicrotask(() => apply(c.check(input.value)));
  }

  // =====================================================================================
  // entry: where Todd claims it
  // =====================================================================================

  PG.variant({
    surface: 'entry',
    key: 'A',
    name: 'Profile field',
    idea: 'The handle is a fact about Todd like his phone number, so it lives in Settings, Profile, between Phone and Booking link. He claims it and changes it in the same place, with nothing new to learn.',
    width: 1200,
    render: (c) => c.settings({ tab: 'Profile', body: `${who()}${profileCard(c)}` }),
    mount: syncFrame,
  });

  PG.variant({
    surface: 'entry',
    key: 'B',
    name: 'Share dialog moment',
    idea: 'The first time Todd publishes he is looking at clarity.video/page/k7m2xq, the link he cannot say out loud. The Share dialog offers the handle at that exact moment, and explains in one line how it differs from the page link. Later he changes it in Settings, Profile.',
    width: 1200,
    render: (c) => `${c.dialog({
      behind: c.home(),
      width: 440,
      body: c.shareDialog({
        footer: `<button class="${c.btn('default', 'lg')} app-wide">${c.icon('copy')}Copy link</button>
          <div class="v-entry-offer">
            <div class="v-entry-offer-head">${c.icon('mic')}<b>Need to say it on a podcast?</b></div>
            <p>The link above is for one prospect. Claim a short address you can say out loud and point it at this page.</p>
            <div class="v-entry-offer-row">${affix()}<button class="${c.btn('default')}">Claim</button></div>
            <span class="app-hint v-entry-status" data-handle-status></span>
          </div>`,
      }),
    })}${later('Later, in Settings, Profile', profileLater(c), 'v-entry-later--main')}`,
    mount: (root, c) => {
      const band = root.querySelector('.app-live small');
      if (band) band.textContent = 'Published just now.';
      syncFrame(root, c);
    },
  });

  PG.variant({
    surface: 'entry',
    key: 'C',
    name: 'Home address line',
    idea: 'Todd never opens Settings. Once he has a live page, Home shows a claim strip above his Journey Pages, where he already looks. After the claim the strip shrinks to one line with the address and a Change button, so Home stays the place for both.',
    width: 1200,
    render: (c) => `${c.home({
      banner: `<div class="v-entry-nudge">
        <div class="v-entry-nudge-text">${c.icon('podcast')}<div><b>Give listeners an address they can type</b><span>Page links like clarity.video/page/k7m2xq are for one prospect each. Claim one short address and point it at any live page.</span></div></div>
        <div class="v-entry-nudge-form">
          <div class="v-entry-nudge-row">${affix()}<button class="${c.btn('default')}">Claim</button><button class="${c.btn('ghost')}">Not now</button></div>
          <span class="app-hint v-entry-status" data-handle-status></span>
        </div>
      </div>`,
    })}${later('Later, on Home', `<div class="v-entry-jp-head">Journey Pages <span class="app-muted">4</span></div>
      <div class="v-entry-address-line">${c.icon('link')}<b data-handle-url></b><span class="app-muted">opens ${c.pages[0].title}</span><button class="${c.btn('ghost', 'sm')}">Change</button></div>
      <div class="v-entry-cards">${c.pages.slice(0, 3).map((page) => c.pageCard(page)).join('')}</div>`, 'v-entry-later--main')}`,
    mount: syncFrame,
  });

  PG.variant({
    surface: 'entry',
    key: 'D',
    name: 'Signup step',
    idea: 'Names are first come, first served, so Todd claims his right after signup, before he has a page, like a username. Until he points it at a page the address shows his name. He can skip, and later changes it in Settings, Profile.',
    width: 1200,
    render: (c) => `<div class="v-entry-signup">
      <div class="v-entry-signup-logo">${LOGO}<span>Clarity</span></div>
      <div class="v-entry-signup-body">
        <span class="v-entry-step">Step 2 of 2</span>
        <h1>Pick your address</h1>
        <p>This is what you say on a podcast or print on a card. One word, letters and numbers. Names are first come, first served, and you keep yours for good.</p>
        <label class="app-field"><span class="app-label">Your address</span>${affix('v-entry-affix-lg')}
          <span class="app-hint v-entry-status" data-handle-status></span></label>
        <div class="v-entry-signup-actions"><button class="${c.btn('default')}">Claim and continue</button><button class="${c.btn('ghost')}">Skip for now</button></div>
        <span class="app-hint">Skip and claim it later in Settings. Until you point it at a page, clarity.video/<span data-handle></span> shows your name and nothing else.</span>
      </div>
    </div>${later('Later, in Settings, Profile', profileLater(c))}`,
    mount: syncFrame,
  });

  // =====================================================================================
  // field: picking the name
  // =====================================================================================

  PG.variant({
    surface: 'field',
    key: 'A',
    name: 'Affix and status',
    idea: 'Speed. One field with clarity.video/ in front, one line under it that answers as Todd types, and a Claim button that lights up when the name is free. Nothing to read first.',
    width: 720,
    padding: 24,
    render: (c) => `<section class="app-card v-field-card"><div class="app-card-body">
        <h3 class="app-card-title">Your address</h3>
        <label class="app-field">${affix()}<span class="app-hint v-field-status" data-v-status></span></label>
      </div><div class="app-card-foot"><button class="${c.btn('default')}" data-v-claim>Claim</button><span class="app-hint">You keep it for good.</span></div></section>`,
    mount: (root, c) => bindStatus(root, c, {
      empty: () => 'Type the word listeners will hear. Letters and numbers, no spaces.',
      invalid: (h) => ({ ...FIX, dash: 'Take out the dash. Nobody can say it out loud.', long: 'Too long. Keep it under 30 characters.' })[offender(h)],
      reserved: (h) => `Clarity keeps /${h}. Try another word.`,
      taken: (h) => `Someone else has /${h}. Add a word, like /${alt(c, h)[0] ?? `${h}sells`}.`,
      free: (h) => `clarity.video/${h} is free.`,
    }),
  });

  PG.variant({
    surface: 'field',
    key: 'B',
    name: 'Read-back',
    idea: 'Saying it out loud. The address is shown large, written and spoken, so Todd hears what a listener hears before he commits. A dash or a dot shows up as the word a listener would have to hear, and digits get a warning.',
    width: 720,
    padding: 24,
    render: (c) => `<section class="v-field-say">
        <div class="v-field-say-big"><span class="v-field-say-host">clarity.video/</span><span data-v-big>${c.handle}</span></div>
        <div class="v-field-say-spoken">${VOLUME}<span data-v-spoken></span><button type="button" class="${c.btn('outline', 'sm')}" data-v-hear>Hear it</button></div>
        <span class="v-field-note" data-v-note></span>
        <label class="app-field"><span class="app-label">Your address</span>${affix('v-field-affix-lg')}<span class="app-hint v-field-status" data-v-status></span></label>
        <div class="v-field-foot"><button class="${c.btn('default', 'lg')}" data-v-claim>Claim</button><span class="app-hint">You keep it for good.</span></div>
      </section>`,
    mount: (root, c) => {
      const big = root.querySelector('[data-v-big]');
      const spoken = root.querySelector('[data-v-spoken]');
      const note = root.querySelector('[data-v-note]');
      root.querySelector('[data-v-hear]').addEventListener('click', () => {
        if (!('speechSynthesis' in window)) return;
        speechSynthesis.cancel();
        speechSynthesis.speak(new SpeechSynthesisUtterance(spoken.textContent));
      });
      bindStatus(root, c, {
        empty: () => 'Type a word, then read the line above out loud.',
        invalid: (h) => ({ dash: "A listener would hear 'dash'. Take it out.", dot: "A listener would hear a second 'dot'. Take it out.", underscore: "Nobody says 'underscore' on air. Take it out.", space: 'A space cannot be heard. Join the words.', long: 'Too long to say in one breath. Keep it under 30 characters.', symbol: 'Letters and numbers only.' })[offender(h)],
        reserved: (h) => `Clarity keeps /${h}. Pick another word.`,
        taken: (h) => `Someone else already says /${h}. Pick another word.`,
        free: () => 'Free. If it came out clean when you said it, claim it.',
      }, (result) => {
        const h = result.handle;
        big.textContent = h || 'yourname';
        big.dataset.empty = String(!h);
        spoken.innerHTML = spokenHtml(h);
        const bits = [];
        if (h) bits.push(`${h.length} characters to type.`);
        if (/\d/.test(h)) bits.push("Has a digit. Some listeners will type the word they heard, like 'to' for 2.");
        note.textContent = bits.join(' ');
      });
    },
  });

  PG.variant({
    surface: 'field',
    key: 'C',
    name: 'Suggestions first',
    idea: 'Choosing well. Todd picks from names built from his own and his company before he types anything. When a name is taken, the field offers free alternatives, and when a free name is long or has digits it says so.',
    width: 720,
    padding: 24,
    render: (c) => {
      const ideas = [...new Set([...c.suggest(c.name).slice(0, 4), ...c.suggest(c.company).slice(1, 2)])];
      return `<section class="app-card v-field-card"><div class="app-card-body">
        <h3 class="app-card-title">Pick your address</h3>
        <p class="app-card-desc">Short, one word, easy to spell after hearing it once. Your name usually wins.</p>
        <div class="v-field-chips">${ideas.map((idea) => `<button type="button" class="v-field-chip" data-set-handle="${idea}" aria-pressed="false">clarity.video/<b>${idea}</b></button>`).join('')}</div>
        <label class="app-field"><span class="app-label">Or type your own</span>${affix()}<span class="app-hint v-field-status" data-v-status></span></label>
        <div class="v-field-chips v-field-alts" data-v-alts></div>
      </div><div class="app-card-foot"><button class="${c.btn('default')}" data-v-claim>Claim</button><span class="app-hint">You keep it for good.</span></div></section>`;
    },
    mount: (root, c) => {
      const chips = [...root.querySelectorAll('[data-set-handle]')];
      const alts = root.querySelector('[data-v-alts]');
      bindStatus(root, c, {
        empty: () => 'Pick one above, or type your own.',
        invalid: (h) => `${FIX[offender(h)]} Or pick one above.`,
        reserved: (h) => `Clarity keeps /${h}. Pick one of the names above, or type another.`,
        taken: (h) => `Someone else has /${h}. Try one of these instead.`,
        free: (h) => {
          if (h.length > 14) return `/${h} is free, but long. A shorter one is easier to type after hearing it once.`;
          if (/\d/.test(h)) return `/${h} is free. Digits are easy to mishear, so a word is safer.`;
          return `/${h} is free.`;
        },
      }, (result) => {
        chips.forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.setHandle === result.handle)));
        const show = result.state === 'taken';
        alts.dataset.show = String(show);
        alts.replaceChildren();
        if (!show) return;
        alt(c, result.handle).slice(0, 3).forEach((idea) => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'v-field-chip';
          chip.innerHTML = `clarity.video/<b>${idea}</b>`;
          chip.addEventListener('click', () => c.setHandle(idea));
          alts.append(chip);
        });
      });
    },
  });

  PG.variant({
    surface: 'field',
    key: 'D',
    name: 'Two-step claim',
    idea: 'Permanence. Picking and claiming are two steps. The second step says in plain words what a claim means, that the name never passes to anyone else and that renaming keeps the old one pointing at Todd, before the button commits.',
    width: 1000,
    padding: 24,
    render: (c) => `<div class="v-field-steps">
        <section class="v-field-step" data-v-step="1" data-active="true">
          <span class="v-field-stepnum">Step 1 of 2</span>
          <h3>Pick the name</h3>
          <label class="app-field">${affix()}<span class="app-hint v-field-status" data-v-status></span></label>
          <div class="v-field-step-actions"><button class="${c.btn('default')}" data-v-next>Continue</button></div>
        </section>
        <span class="v-field-arrow">${c.icon('arrow')}</span>
        <section class="v-field-step" data-v-step="2" data-active="false">
          <span class="v-field-stepnum">Step 2 of 2</span>
          <h3>Keep it for good</h3>
          <p class="v-field-url" data-handle-url></p>
          <ul class="v-field-facts">
            <li>${c.icon('check')}<span>It never passes to anyone else.</span></li>
            <li>${c.icon('check')}<span>If you rename it, the old name keeps sending people to you.</span></li>
            <li>${c.icon('check')}<span>It opens whichever live page you choose. You can change that any time.</span></li>
          </ul>
          <span class="app-hint v-field-done" data-v-done></span>
          <div class="v-field-step-actions"><button class="${c.btn('outline')}" data-v-back>Back</button><button class="${c.btn('default')}" data-v-claim>Claim it for good</button></div>
        </section>
      </div>`,
    mount: (root, c) => {
      const one = root.querySelector('[data-v-step="1"]');
      const two = root.querySelector('[data-v-step="2"]');
      const next = root.querySelector('[data-v-next]');
      const claim = root.querySelector('[data-v-claim]');
      const done = root.querySelector('[data-v-done]');
      const go = (step) => { one.dataset.active = String(step === 1); two.dataset.active = String(step === 2); };
      next.addEventListener('click', () => go(2));
      root.querySelector('[data-v-back]').addEventListener('click', () => go(1));
      claim.addEventListener('click', () => { done.textContent = `Claimed. clarity.video/${c.handle} is yours.`; claim.disabled = true; });
      bindStatus(root, c, {
        empty: () => 'Type the name you will keep.',
        invalid: (h) => FIX[offender(h)],
        reserved: (h) => `Clarity keeps /${h}. Choose another.`,
        taken: (h) => `/${h} is someone else's for good. Choose another.`,
        free: (h) => `/${h} is free. Continue to read what claiming means.`,
      }, (result) => {
        next.disabled = result.state !== 'free';
        done.textContent = '';
        if (result.state !== 'free') go(1);
      });
    },
  });

  // ---------- styles ----------
  PG.css(`
    .v-entry-status, .v-field-status { min-height: 17px; }
    .v-entry-status[data-state="free"], .v-field-status[data-state="free"] { color: var(--success); }
    .v-entry-status[data-state="taken"], .v-entry-status[data-state="reserved"], .v-entry-status[data-state="invalid"],
    .v-field-status[data-state="taken"], .v-field-status[data-state="reserved"], .v-field-status[data-state="invalid"] { color: var(--destructive); }

    .v-entry-who { display: flex; align-items: center; gap: 16px; margin: 0 0 22px; }
    .v-entry-avatar { width: 64px; height: 64px; font-size: 20px; }
    .v-entry-who b { display: block; font-size: 18px; font-weight: 600; }
    .v-entry-who div > span { color: var(--muted-foreground); }
    .v-entry-claimed { display: flex; align-items: center; gap: 10px; min-height: 32px; }
    .v-entry-claimed b { font-weight: 500; }
    .v-entry-claimed svg { color: var(--muted-foreground); }
    .v-entry-later { border-top: 1px dashed var(--border); background: var(--muted); padding: 20px 24px 24px; }
    .v-entry-later--main { padding-left: 296px; }
    .v-entry-later-label { font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted-foreground); margin: 0 0 12px; }
    .v-entry-later .app-card { margin-bottom: 0; }

    .v-entry-offer { border-top: 1px solid var(--border); padding-top: 16px; display: grid; gap: 10px; }
    .v-entry-offer-head { display: flex; align-items: center; gap: 8px; }
    .v-entry-offer-head svg { color: var(--primary); }
    .v-entry-offer p { margin: 0; color: var(--muted-foreground); font-size: 13px; line-height: 1.45; }
    .v-entry-offer-row { display: flex; gap: 8px; }
    .v-entry-offer-row .app-affix { flex: 1; min-width: 0; }

    .v-entry-nudge { display: flex; align-items: flex-start; gap: 24px; border: 1px solid var(--border); background: var(--card); border-radius: 14px; padding: 16px 18px; margin: 0 0 22px; }
    .v-entry-nudge-text { display: flex; gap: 12px; flex: 1; min-width: 0; }
    .v-entry-nudge-text svg { width: 20px; height: 20px; color: var(--primary); margin-top: 2px; }
    .v-entry-nudge-text b { display: block; font-weight: 600; margin-bottom: 2px; }
    .v-entry-nudge-text span { color: var(--muted-foreground); font-size: 13px; line-height: 1.45; }
    .v-entry-nudge-form { display: grid; gap: 6px; width: 460px; flex: none; }
    .v-entry-nudge-row { display: flex; gap: 8px; }
    .v-entry-nudge-row .app-affix { flex: 1; min-width: 0; }
    .v-entry-jp-head { font-weight: 600; font-size: 17px; margin: 0 0 10px; }
    .v-entry-jp-head .app-muted { font-size: 13px; font-weight: 400; }
    .v-entry-address-line { display: flex; align-items: center; gap: 10px; margin: 0 0 14px; }
    .v-entry-address-line svg { color: var(--muted-foreground); }
    .v-entry-address-line b { font-weight: 500; }
    .v-entry-cards { display: flex; gap: 16px; flex-wrap: wrap; }

    .v-entry-signup { min-height: 560px; padding: 20px 32px 48px; }
    .v-entry-signup-logo { display: flex; align-items: center; gap: 6px; color: var(--primary); font-weight: 600; font-size: 21px; letter-spacing: -0.01em; }
    .v-entry-signup-logo svg { width: 32px; height: 32px; }
    .v-entry-signup-body { max-width: 520px; margin: 56px auto 0; display: grid; gap: 16px; }
    .v-entry-step { font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted-foreground); }
    .v-entry-signup-body h1 { font-size: 30px; font-weight: 700; letter-spacing: -0.02em; margin: 0; line-height: 1.15; }
    .v-entry-signup-body p { margin: 0; color: var(--muted-foreground); font-size: 15px; line-height: 1.5; }
    .v-entry-affix-lg { height: 44px; font-size: 16px; }
    .v-entry-signup-actions { display: flex; gap: 8px; }

    .v-field-card { max-width: none; margin: 0; }
    .v-field-card .app-card-foot { gap: 12px; }
    .v-field-say { display: grid; gap: 14px; background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 22px 22px 20px; }
    .v-field-say-big { font-size: 34px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.15; overflow-wrap: anywhere; }
    .v-field-say-host { color: var(--muted-foreground); font-weight: 500; }
    .v-field-say-big [data-empty="true"] { color: var(--muted-foreground); opacity: 0.5; }
    .v-field-say-spoken { display: flex; align-items: center; gap: 10px; font-size: 17px; }
    .v-field-say-spoken > svg { color: var(--muted-foreground); }
    .v-field-say-spoken > span { min-width: 0; overflow-wrap: anywhere; }
    .v-field-say-spoken em { font-style: normal; color: var(--destructive); font-weight: 600; }
    .v-field-note { font-size: 12px; color: var(--muted-foreground); min-height: 17px; margin-top: -6px; }
    .v-field-affix-lg { height: 44px; font-size: 16px; }
    .v-field-foot { display: flex; align-items: center; gap: 12px; }

    .v-field-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .v-field-chip { appearance: none; font: inherit; font-size: 13px; height: 30px; padding: 0 12px; border-radius: 99px; border: 1px solid var(--border); background: var(--card); color: var(--muted-foreground); cursor: pointer; }
    .v-field-chip b { font-weight: 500; color: var(--foreground); }
    .v-field-chip:hover { border-color: var(--muted-foreground); }
    .v-field-chip[aria-pressed="true"] { border-color: var(--primary); background: oklch(0.94 0.04 262); }
    .v-field-chip[aria-pressed="true"], .v-field-chip[aria-pressed="true"] b { color: var(--primary); }
    .v-field-alts { display: none; }
    .v-field-alts[data-show="true"] { display: flex; }

    .v-field-steps { display: grid; grid-template-columns: 1fr 24px 1fr; gap: 16px; align-items: start; }
    .v-field-step { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 20px; display: grid; gap: 12px; align-content: start; transition: opacity 150ms; }
    .v-field-steps > .v-field-arrow { align-self: stretch; }
    .v-field-step[data-active="false"] { opacity: 0.45; pointer-events: none; }
    .v-field-stepnum { font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted-foreground); }
    .v-field-step h3 { margin: 0; font-size: 18px; font-weight: 600; }
    .v-field-url { font-size: 22px; font-weight: 600; letter-spacing: -0.01em; margin: 0; overflow-wrap: anywhere; }
    .v-field-facts { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; font-size: 13.5px; line-height: 1.45; }
    .v-field-facts li { display: flex; gap: 8px; }
    .v-field-facts svg { color: var(--success); margin-top: 2px; }
    .v-field-done { color: var(--success); min-height: 17px; }
    .v-field-arrow { display: grid; place-items: center; color: var(--muted-foreground); }
    .v-field-step-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
  `);
})();
