// Renders the F1 stacked-footer page at 390 and 1440, drives every preset of F1a and F1b
// by mouse and keyboard, screenshots each state, and asserts the FEEDBACK.md
// rules, the ten shared fixes from SYNTHESIS.md and the must-fixes from
// critiques2/SYNTHESIS2.md:
//   FEEDBACK 1 Live with a green dot; amber freshness line "2h ago" with changes pending
//   FEEDBACK 2 one primary bottom right: Publish / Copy link / Publish changes / Publish
//   FEEDBACK 3 (r6) the band spans the footer and sits above the primary at both widths;
//              F1a: primary at its own width on the right edge at 1440; F1b: full width;
//              both full width at 390; F1b's confirm buttons split the width
//   FEEDBACK 4 password is its own switch row with a lock
//   FEEDBACK 5 the link row has the URL and at most one icon, never the open arrow beside copy
//   FEEDBACK 6 turning off is reachable while live, never red at rest, never a switch,
//              never beside "Open in new tab", always asks first
//   FEEDBACK 7 no "More options" disclosure; 9 no "General access", no "Link on"
//   fix 1  the access control never publishes from draft or off
//   fix 2  never two lock icons
//   fix 3  the band never carries the audience sentence; the amber reads yellow
//   fix 4  one vocabulary: No one (or Off) / "Turn the link off?" / Off
//   fix 5  confirm buttons at least the primary's height and 44px at 390; focus on
//          Cancel when it opens, back on the trigger after Escape; body inert
//   fix 6  password protection starts on Save, the help line says so
//   fix 7  URL in Geist, slug fully visible at 390, full address read to screen readers
//   fix 8  no band line ends with a lone word (line boxes measured)
//   fix 9  access control has an accessible name; arrow keys and Escape in menus;
//          focus survives re-render; hit targets 32px desktop, 44px phone
//   fix 10 copy icon present in every live state, absent in draft and off
//   S2 1   long-slug preset: the path collapses at 390 and the slug stays whole
//   S2 2   the switch alone never protects; the lock-out warning shows before Save on a
//          live page; the saved line fits one line; the field is type=password with Show
//   S2 3   copy icon in every live state, none in draft or off; no layout jump between live states
//   S2 4   confirm body has no lone word; gap between body and buttons at most 12px
//   S2 5   while publishing nothing else works; once Turn off is pressed Cancel is disabled
//          and the turn-off completes
//   S2 6   Copied only after the clipboard resolves; a failure line on reject
//   S2 7   one persistent live region per dialog
//   S2 8   Escape and X close the dialog, focus returns to the opener, Tab stays inside
//   S2 9   menus stay inside the viewport and flip above the trigger when forced
//   S2 10  no shadow on the access select at rest
//   S2 11  no sub line that restates its label; password-aware sub when protected
//   F1     no access row before the first publish; a static "No one" row with no chevron while off
//   F1     label and select on one line, select's right edge on the switch's right edge
//   r6     dialog 420px at 1440 (logged with the widths the rows need); the access label, the
//          select value and the password label each hold one line, nothing cut or overflowing
// Also fails on any page error, console error, failed request, non-2xx response,
// a retyped Tailwind class with no rule, or a dialog that is not the app's width.
// With ?plant=<name> in the URL the script passes only if that planted
// violation makes it red, which proves the checks can fail. Plant runs skip screenshots.
// usage: node verify.mjs <url> <outdir>
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const [url, outdir] = process.argv.slice(2);
if (!url || !outdir) throw new Error('usage: node verify.mjs <url> <outdir>');
mkdirSync(outdir, { recursive: true });
const plant = new URL(url).searchParams.get('plant');
const LESSON_OF_PLANT = {
  'arrow-copy': /open arrow next to copy|icons in the link row/,
  red: /red at rest/,
  linkon: /Link on switch/,
  'general-access': /General access/,
  'more-options': /More options/,
  'open-in-menu': /beside "Open in new tab"/,
  primary: /primary "Publish" wanted "Copy link"/,
  'hidden-publish': /access control published/,
  'two-locks': /lock icons/,
  'band-audience': /band carries the audience/,
  unpublish: /vocabulary/,
  'small-confirm': /confirm button .* shorter/,
  focus: /focus not on Cancel/,
  noname: /no accessible name/,
  orphan: /band line ends with a lone word/,
  mono: /monospace/,
  orange: /reads orange/,
  'slug-cut': /slug .* is cut off/,
  'pw-late-warning': /warning before Save/,
  'pw-long-saved': /saved line wraps/,
  'copy-icon-states': /copy icons in the link row/,
  'confirm-orphan': /confirm body ends with a lone word/,
  'confirm-gap': /confirm gap/,
  'busy-open': /while busy|pending turn-off/,
  'copy-early': /Copied before the clipboard/,
  'live-recreate': /live region/,
  'dialog-leaks': /did not close the dialog|left the dialog/,
  'no-flip': /did not flip|menu leaves the viewport/,
  'select-shadow': /select has a shadow/,
  'restate-sub': /restates the label/,
  'draft-row': /access row before first publish|said twice/,
  'off-menu': /off state still opens a menu/,
  'phone-stack': /not on one line/,
  'wide-dialog': /dialog is .*px wide/,
  'footer-row': /band is not above the primary/,
  'band-narrow': /band does not span the footer/,
  'primary-narrow': /not full width/,
  'primary-left': /not at the right edge/,
  'access-wrap': /access label wraps/,
  'pw-wrap': /password label wraps/,
  'value-cut': /select value is cut/,
  'confirm-right': /do not split the width/,
  jump: /layout jump/,
};
if (plant && !LESSON_OF_PLANT[plant]) throw new Error(`unknown plant ${plant}`);
const shots = !plant;

const problems = [];
const browser = await chromium.launch();
const LIVE = ['published', 'changes', 'password', 'password-changes', 'long-slug'];
const STAGE = { draft: 'draft', published: 'published', changes: 'changes', unpublished: 'unpublished', password: 'published', 'password-changes': 'changes', 'long-slug': 'published' };
const TONE = { draft: 'off', published: 'live', changes: 'changes', unpublished: 'off', password: 'live', 'password-changes': 'changes', 'long-slug': 'live' };
const AUDIENCE = /anyone with the link|anyone with the password|no one can|people with the link|needs? the password/i;
const COPY_FAILED = "Couldn't copy. Select the link and copy it.";
const DIALOG_W = 420;
const FOOTER = { F1a: 'right', F1b: 'full' };
const SAME_LAYOUT = [['published', 'changes'], ['password', 'password-changes'], ['published', 'long-slug']];

// Words per rendered line of an element, for lone-word checks.
const lineCounts = (p) => {
  const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
  const lines = new Map();
  let node;
  while ((node = walker.nextNode())) {
    const re = /\S+/g; let m;
    while ((m = re.exec(node.data))) {
      const range = document.createRange(); range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length);
      const top = Math.round(range.getBoundingClientRect().top);
      lines.set(top, (lines.get(top) || 0) + 1);
    }
  }
  return [...lines.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
};

for (const width of [390, 1440]) {
  const vh = width < 600 ? 844 : 900;
  const context = await browser.newContext({ viewport: { width, height: vh }, deviceScaleFactor: 1 });
  await context.route('**/*', (route) => (route.request().method() === 'GET' ? route.continue() : route.abort()));
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push(`${width} pageerror ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${width} console ${m.text()}`); });
  page.on('requestfailed', (r) => problems.push(`${width} requestfailed ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${width} http ${r.status()} ${r.url()}`); });
  await page.goto(url, { waitUntil: 'networkidle' });
  const font = await page.evaluate(() => document.fonts.ready.then(() => document.fonts.check('16px "Geist Variable"')));
  if (!font) problems.push(`${width} Geist Variable not loaded`);
  if (shots) await page.screenshot({ path: path.join(outdir, `gallery-${width}.png`), fullPage: true });

  // Several verify runs in parallel can starve a static server; wait for the script, don't assume it.
  await page.waitForFunction(() => window.__proto, null, { timeout: 15000 }).catch(() => problems.push(`${width} proto.js never ran`));
  const { OPTIONS, PRESETS, PRIMARY } = (await page.evaluate(() => window.__proto)) || { OPTIONS: [], PRESETS: [], PRIMARY: {} };
  const MIN_HIT = width < 600 ? 44 : 32;

  // Tailwind emits only the classes the app uses, so a retyped class renders
  // as nothing. Every class in the DOM must have a rule in a loaded stylesheet.
  if (width === 1440) {
    const css = (await Promise.all(['app.css', 'proto.css'].map((f) => page.request.get(new URL(f, url).href).then((r) => r.text())))).join('\n');
    const used = await page.evaluate(() => [...new Set([...document.querySelectorAll('*')].flatMap((el) => [...el.classList]))]);
    const escape = (c) => c.replace(/[^a-zA-Z0-9_-]/g, (ch) => '\\' + ch);
    const missing = used.filter((c) => c !== 'group/button' && !css.includes('.' + escape(c)) && !css.includes('.' + c));
    if (missing.length) problems.push(`${width} classes without a rule: ${missing.join(' ')}`);
    else console.log(`${used.length} DOM classes all have a rule`);
  }

  const probeColor = (v) => page.evaluate((cssVar) => {
    const probe = document.createElement('span'); probe.style.color = `var(${cssVar})`; document.body.append(probe);
    const c = getComputedStyle(probe).color; probe.remove(); return c;
  }, v);
  const destructive = await probeColor('--destructive');
  const success = await probeColor('--success');

  let clicks = 0;
  const rows = [];
  for (const id of OPTIONS) {
    const card = page.locator(`#${id}`);
    const dialog = card.locator('[role="dialog"]');
    const fail = (preset, msg) => problems.push(`${width} ${id} ${preset}: ${msg}`);
    const layouts = new Map();
    // Clip the stage plus whatever an open menu adds beyond it.
    const stageShot = async (name) => {
      if (!shots) return;
      const box = await card.locator('.x-stage').evaluate((el) => {
        const r = el.getBoundingClientRect();
        let top = r.top; let bottom = r.bottom;
        const m = el.querySelector('[data-menu]');
        if (m) { const mr = m.getBoundingClientRect(); top = Math.min(top, mr.top - 8); bottom = Math.max(bottom, mr.bottom + 8); }
        return { x: r.x, y: top + window.scrollY, width: r.width, height: bottom - top };
      });
      await page.screenshot({ path: path.join(outdir, name), fullPage: true, clip: box });
    };
    const dialogShot = async (name) => { if (shots) await card.locator('[data-dialog]').screenshot({ path: path.join(outdir, name) }); };
    for (const preset of PRESETS) {
      try { await drive(preset); } catch (e) { fail(preset, `flow broke: ${e.message.split('\n')[0]}`); await page.keyboard.press('Escape').catch(() => {}); }
    }
    for (const [a, b] of SAME_LAYOUT) {
      if (layouts.has(a) && layouts.has(b) && layouts.get(a) !== layouts.get(b)) fail(`${a}/${b}`, `layout jump between live states: ${layouts.get(a)} vs ${layouts.get(b)}`);
    }
    async function drive(preset) {
      await card.locator(`[data-presets] [data-arg="${preset}"]`).click();
      const isLive = LIVE.includes(preset);
      const hasPassword = preset.startsWith('password');
      if ((await card.getAttribute('data-stage')) !== STAGE[preset]) fail(preset, `stage ${await card.getAttribute('data-stage')}`);
      await dialogShot(`${id}-${preset}-${width}.png`);
      const urlNow = await page.evaluate((i) => window.__proto.url(i), id);

      const click = async (sel) => {
        const el = dialog.locator(sel).first();
        if (!(await el.count()) || !(await el.isEnabled())) return false;
        await el.click();
        clicks += 1;
        return true;
      };
      const stage = async () => card.getAttribute('data-stage');
      const text = async () => (await dialog.textContent()) || '';
      const state = async () => page.evaluate((i) => window.__proto.state(i), id);
      const activeFk = async () => page.evaluate(() => document.activeElement && document.activeElement.dataset.fk);
      const announced = async () => (await card.locator('[data-announce]').first().textContent()) || '';
      const dialogWidth = (await dialog.boundingBox())?.width;
      if (width === 1440 && Math.abs(dialogWidth - DIALOG_W) > 1) fail(preset, `dialog is ${dialogWidth}px wide, wanted ${DIALOG_W}`);
      if (width === 1440 && id === OPTIONS[0] && ['published', 'long-slug'].includes(preset)) {
        // Max-content widths of each row (clones measured in place, so they inherit the font), plus the dialog's padding and border.
        const need = await dialog.evaluate((d) => {
          const maxc = (el) => { const c = el.cloneNode(true); c.style.cssText += ';position:absolute;visibility:hidden;width:max-content;max-width:none'; c.querySelectorAll('*').forEach((n) => { n.style.minWidth = 'auto'; }); el.parentElement.append(c); const w = c.getBoundingClientRect().width; c.remove(); return w; };
          const px = (el, prop) => parseFloat(getComputedStyle(el)[prop]) || 0;
          const chrome = px(d, 'paddingLeft') + px(d, 'paddingRight') + px(d, 'borderLeftWidth') + px(d, 'borderRightWidth');
          const chip = d.querySelector('.d-chip'); const a = d.querySelector('.d-chip-url');
          const url = maxc(d.querySelector('.d-url')) + px(chip, 'paddingLeft') + px(chip, 'paddingRight') + px(a, 'paddingLeft') + px(a, 'paddingRight') + px(chip, 'columnGap') + (d.querySelector('.d-chip .v-copy-wrap')?.getBoundingClientRect().width || 0);
          const row = d.querySelector('.s-row');
          const access = maxc(row.querySelector('.d-label')) + px(row, 'columnGap') + maxc(row.querySelector('.s-select'));
          const pwRow = d.querySelector('.p-block .d-row');
          const pw = maxc(pwRow.querySelector('.d-label')) + px(pwRow, 'columnGap') + pwRow.querySelector('[role="switch"]').getBoundingClientRect().width;
          return { url: Math.ceil(url), access: Math.ceil(access), pw: Math.ceil(pw), min: Math.ceil(Math.max(url, access, pw) + chrome) };
        });
        console.log(`1440px ${preset}: dialog measured ${dialogWidth}px; rows need URL ${need.url}, access ${need.access}, password ${need.pw}; narrowest dialog that holds them ${need.min}px`);
      }
      if (width === 390 && Math.abs(dialogWidth - 390) > 1) fail(preset, `dialog is ${dialogWidth}px wide, the phone sheet is 390`);

      // S2 3: row positions at rest, compared between live states after the loop.
      layouts.set(preset, await dialog.evaluate((d) => {
        const top = d.getBoundingClientRect().top;
        return [...d.querySelectorAll('.d-chip, .s-row, .d-row, .p-block, .f-footer, .f-primary')].map((el) => { const r = el.getBoundingClientRect(); return `${el.className.split(' ')[0]}@${Math.round(r.top - top)}h${Math.round(r.height)}`; }).join(' ');
      }));

      // S2 7: one live region per dialog, and the same node after a re-render.
      const regions = await card.locator('[aria-live], [role="status"], [role="alert"]').count();
      if (regions !== 1) fail(preset, `${regions} live regions in the card, wanted one`);
      await card.locator('[aria-live]').first().evaluate((el) => { el.__mark = true; });

      // Rules 9 and 7: no "General access", no "Link on", no disclosure. Fix 4: no "Unpublish" anywhere.
      const vocabulary = async (where) => {
        const body = await text();
        if (/general access/i.test(body)) fail(preset, `heading says "General access" (${where})`);
        if (/more options/i.test(body)) fail(preset, `"More options" disclosure (${where})`);
        if (/link on\b/i.test(body)) fail(preset, `Link on switch (text) (${where})`);
        if (/unpublish|restricted/i.test(body)) fail(preset, `vocabulary drift: "${body.match(/unpublish\w*|restricted/i)[0]}" (${where})`);
        if (/\d+ edits?/.test(body)) fail(preset, `an edit count leaked in (${where})`);
      };
      await vocabulary('rest');
      if (await dialog.locator('details, summary').count()) fail(preset, 'a disclosure element hides controls ("More options")');

      // Rule 6: nothing red at rest. The confirm is not rest.
      const redAtRest = await dialog.evaluate((root, red) => {
        const out = [];
        for (const el of root.querySelectorAll('*')) {
          if (el.closest('[data-confirm-panel]')) continue;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          const variant = el.getAttribute('data-button-variant') || '';
          if (/danger|destructive/.test(variant) || /(^|\s)(text-destructive|bg-destructive)/.test(el.className || '')) out.push(`${el.tagName.toLowerCase()} ${variant || el.className}`);
          else if (cs.color === red && (el.textContent || '').trim()) out.push(`${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 30)}"`);
        }
        return out;
      }, destructive);
      if (redAtRest.length) fail(preset, `red at rest: ${redAtRest.join(', ')}`);

      // Rule 6: no "Link on" switch, and no switch that publishes or unpublishes.
      for (const sw of await dialog.locator('[role="switch"]').all()) {
        const label = await sw.evaluate((el) => (el.closest('.d-row')?.textContent || '').trim());
        const act = await sw.getAttribute('data-act');
        if (/link on/i.test(label) || ['ask-off', 'publish'].includes(act || '')) fail(preset, `Link on switch ("${label}", act ${act})`);
      }

      // Fix 2: one lock at most, and it belongs to the password row.
      const lockCount = async (where) => {
        const locks = await dialog.locator('svg[data-icon="lock"]').count();
        if (locks > 1) fail(preset, `${locks} lock icons (${where})`);
        if (locks === 1 && !(await dialog.locator('label svg[data-icon="lock"]').count())) fail(preset, `the lock icon is not on the password row (${where})`);
      };
      await lockCount('rest');

      // Fix 9: every visible control is big enough. ::after hit areas count.
      const hitTargets = async (where) => {
        const small = await dialog.evaluate((root, min) => {
          const out = [];
          for (const el of root.querySelectorAll('button, a[href], input, [role="switch"]')) {
            if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height) continue;
            const after = getComputedStyle(el, '::after');
            let h = r.height; let w = r.width;
            if (after.position === 'absolute' && after.content !== 'none') {
              h += -(parseFloat(after.top) || 0) - (parseFloat(after.bottom) || 0);
              w += -(parseFloat(after.left) || 0) - (parseFloat(after.right) || 0);
            }
            const iconOnly = !(el.textContent || '').trim();
            if (h < min - 0.5 || (iconOnly && w < min - 0.5)) out.push(`${el.tagName.toLowerCase()}[${el.dataset.fk || el.className.split(' ')[0]}] ${Math.round(w)}x${Math.round(h)}`);
          }
          return out;
        }, MIN_HIT);
        if (small.length) fail(preset, `hit targets under ${MIN_HIT}px (${where}): ${small.join(', ')}`);
      };
      await hitTargets('rest');

      // Rule 5, fixes 7 and 10, S2 1 and 3: the link row.
      const chip = dialog.locator('.d-chip');
      if (!(await chip.count())) fail(preset, 'no link row');
      else {
        const icons = await chip.locator('svg[data-icon]').evaluateAll((els) => els.map((el) => el.getAttribute('data-icon')));
        const kinds = icons.filter((n) => ['arrow-up-right', 'eye-off', 'external-link', 'copy', 'check'].includes(n));
        const opens = kinds.includes('arrow-up-right') || kinds.includes('eye-off') || kinds.includes('external-link');
        if (opens && (kinds.includes('copy') || kinds.includes('check'))) fail(preset, `open arrow next to copy in the link row (${icons.join(', ')})`);
        if (kinds.length > 1) fail(preset, `${kinds.length} icons in the link row (${icons.join(', ')})`);
        const controls = await chip.locator('a, button').count();
        if (controls > 2) fail(preset, `${controls} controls in the link row`);
        const urlEl = chip.locator('.d-url');
        if (!(await urlEl.count())) fail(preset, 'link row has no URL');
        else {
          const family = await urlEl.evaluate((el) => getComputedStyle(el).fontFamily);
          if (/mono/i.test(family) || !/^"?Geist Variable/.test(family)) fail(preset, `URL is monospace or not Geist ("${family}")`);
          const shown = (await urlEl.textContent())?.replace(/[\s…]+/g, '');
          if (shown !== urlNow.replace('https://', '')) fail(preset, `URL text "${shown}"`);
          const parts = await chip.evaluate((el) => {
            // A Range rect gives the laid-out text width; any box narrower than it draws an ellipsis.
            const seg = (sel) => { const s = el.querySelector(sel); const range = document.createRange(); range.selectNodeContents(s); const r = s.getBoundingClientRect(); return { cut: range.getBoundingClientRect().width > r.width + 0.001, right: r.right, text: s.textContent }; };
            return { mid: seg('.d-url-mid'), slug: seg('.d-url-slug'), dots: getComputedStyle(el.querySelector('.d-url-dots')).display !== 'none', chipRight: el.querySelector('.d-url').getBoundingClientRect().right };
          });
          if (parts.slug.cut || parts.slug.right > parts.chipRight + 0.5) fail(preset, `slug "${parts.slug.text}" is cut off or runs under the copy icon`);
          if (preset === 'long-slug' && width === 390 && !(parts.mid.cut && parts.dots)) fail(preset, 'long slug at 390: the path did not give way to an ellipsis');
          if (preset === 'long-slug' && width === 1440 && (parts.mid.cut || parts.dots)) fail(preset, 'long slug at 1440: the path is truncated though it fits');
          if (preset !== 'long-slug' && (parts.mid.cut || parts.dots)) fail(preset, 'path truncated on the short URL');
        }
        const urlLink = chip.locator('a.d-chip-url');
        if (await urlLink.count()) {
          if (!isLive) fail(preset, 'off link row still links out');
          if ((await urlLink.getAttribute('target')) !== '_blank') fail(preset, 'URL link does not open a new tab');
          if (await urlLink.getAttribute('aria-label')) fail(preset, 'URL link aria-label hides the address from screen readers');
          const rest = await urlLink.evaluate((el) => getComputedStyle(el).textDecorationLine);
          if (!/underline/.test(rest)) fail(preset, `clickable URL not underlined at rest ("${rest}")`);
        } else if (await chip.locator('a[href]').count() && !isLive) fail(preset, 'off link row still links out');
        if (isLive && !(await chip.locator('a[href]').count())) fail(preset, 'live link row has no way to open the page');
        const copyIcons = await chip.locator('[data-fk="copy-icon"]').count();
        if (copyIcons !== (isLive ? 1 : 0)) fail(preset, `${copyIcons} copy icons in the link row, wanted ${isLive ? 1 : 0}`);
      }

      // Rule 2: one primary, bottom right, label by state.
      const want = PRIMARY[STAGE[preset]];
      const primary = dialog.locator('.f-primary');
      let primaryHeight = 0;
      if ((await primary.count()) !== 1) fail(preset, `primary count ${await primary.count()}`);
      else {
        if ((await primary.textContent())?.trim() !== want) fail(preset, `primary "${(await primary.textContent())?.trim()}" wanted "${want}"`);
        if ((await primary.getAttribute('data-button-variant')) !== 'default') fail(preset, 'primary is not the primary face');
        const [pb, db] = await Promise.all([primary.boundingBox(), dialog.boundingBox()]);
        primaryHeight = pb?.height || 0;
        const fb = await dialog.locator('.f-footer').boundingBox();
        if (pb && fb) {
          const full = Math.abs(pb.width - fb.width) <= 1 && Math.abs(pb.x - fb.x) <= 1;
          if (Math.abs(pb.x + pb.width - (fb.x + fb.width)) > 1) fail(preset, `primary is not at the right edge (${Math.round(fb.x + fb.width - pb.x - pb.width)}px short)`);
          if ((width === 390 || FOOTER[id] === 'full') && !full) fail(preset, `primary is ${Math.round(pb.width)}px of a ${Math.round(fb.width)}px footer at ${width}, not full width`);
          if (width === 1440 && FOOTER[id] === 'right' && pb.width > fb.width / 2) fail(preset, `primary is ${Math.round(pb.width)}px of ${Math.round(fb.width)}px at 1440, F1a wants its own width`);
          if (width === 1440 && preset === 'published') console.log(`1440px: ${id} Copy link primary ${Math.round(pb.width)}px of a ${Math.round(fb.width)}px footer`);
        }
        if (STAGE[preset] === 'changes' && (await primary.locator('svg').count())) fail(preset, 'Publish changes carries an icon');
        const others = await dialog.locator('[data-button-variant="default"]').count();
        if (others !== 1) fail(preset, `${others} primary-face buttons`);
      }

      // Rules 1 and 3, fixes 3 and 8: the band, its tone, its words, its lines, above the primary.
      const footer = dialog.locator('.f-footer');
      if (!(await footer.count())) fail(preset, 'no footer');
      else {
        const band = footer.locator('.f-band');
        if ((await band.count()) !== 1) fail(preset, 'footer without a band');
        else {
          if ((await band.getAttribute('data-tone')) !== TONE[preset]) fail(preset, `band tone ${await band.getAttribute('data-tone')}`);
          const word = (await band.locator('.v-status-word').textContent())?.trim();
          if (isLive && word !== 'Live') fail(preset, `band word "${word}" while live`);
          if (preset === 'unpublished' && word !== 'Off') fail(preset, `band word "${word}" while off, vocabulary wants "Off"`);
          if (preset === 'draft' && word !== 'Not published') fail(preset, `band word "${word}" before first publish`);
          const line = (await band.locator('.f-band-text').textContent())?.trim() || '';
          if (AUDIENCE.test(line)) fail(preset, `band carries the audience sentence: "${line}"`);
          if (isLive && STAGE[preset] !== 'changes') {
            const dotColor = await band.locator('.d-dot').evaluate((el) => getComputedStyle(el).backgroundColor);
            if (dotColor !== success) fail(preset, `live dot is ${dotColor}, not green`);
            if (!/^Published .+\./.test(line)) fail(preset, `live band line "${line}" is not the published time`);
          }
          if (STAGE[preset] === 'changes') {
            if (!/Visitors see the version from 2h ago\./.test(line)) fail(preset, `changes line "${line}"`);
            const colours = await band.evaluate((el) => {
              const rgbOf = (css) => { const c = document.createElement('canvas'); c.width = c.height = 1; const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1, 1); ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3); };
              const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
              const hue = ([r, g, b]) => {
                const [R, G, B] = [lin(r), lin(g), lin(b)];
                const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
                const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
                const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
                const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
                const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
                let h = (Math.atan2(bb, a) * 180) / Math.PI; if (h < 0) h += 360; return h;
              };
              const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
              const bg = rgbOf(getComputedStyle(el).backgroundColor);
              const ink = rgbOf(getComputedStyle(el.querySelector('.f-band-text')).color);
              const [hi, lo] = [lum(bg), lum(ink)].sort((x, y) => y - x);
              return { bgHue: hue(bg), inkHue: hue(ink), contrast: (hi + 0.05) / (lo + 0.05) };
            });
            if (colours.bgHue < 80 || colours.bgHue > 108) fail(preset, `amber band reads orange: fill hue ${colours.bgHue.toFixed(0)} (want 80 to 108)`);
            if (colours.inkHue < 60 || colours.inkHue > 110) fail(preset, `amber band reads orange: ink hue ${colours.inkHue.toFixed(0)}`);
            if (colours.contrast < 4.5) fail(preset, `amber ink contrast ${colours.contrast.toFixed(2)} under 4.5`);
          }
          if (preset === 'unpublished' && !/The link is off\. Publish to bring it back\./.test(line)) fail(preset, `off line "${line}"`);
          const orphans = await band.evaluate((el, countLines) => {
            const counts = new Function('return ' + countLines)();
            const out = [];
            for (const p of el.querySelectorAll('.f-band-text, .f-band-head')) {
              const c = counts(p);
              if (c.length > 1 && c[c.length - 1] < 2) out.push(`"${p.textContent.trim()}" breaks ${c.join('/')} words per line`);
            }
            return out;
          }, lineCounts.toString());
          if (orphans.length) fail(preset, `band line ends with a lone word: ${orphans.join('; ')}`);
          const [bb, pb, fb] = await Promise.all([band.boundingBox(), primary.boundingBox(), footer.boundingBox()]);
          if (bb && pb && fb) {
            const stacked = bb.y + bb.height <= pb.y + 1;
            rows.push(`${id} ${preset} ${stacked ? 'stacked' : 'not stacked'}`);
            if (!stacked) fail(preset, `band is not above the primary at ${width}`);
            if (Math.abs(bb.width - fb.width) > 1 || Math.abs(bb.x - fb.x) > 1) fail(preset, `band does not span the footer (${Math.round(bb.width)} of ${Math.round(fb.width)}px)`);
          }
        }
      }

      // Draft and off: no access control before the first publish (and nothing said
      // twice); a static "No one" with no chevron while off. S2 F1.
      const trigger = dialog.locator('[data-access-trigger]');
      const staticRow = dialog.locator('[data-access-static]');
      const saidTwice = ((await text()).match(/Not published/g) || []).length;
      if (saidTwice > 1) fail(preset, `"Not published" is said twice (${saidTwice} times)`);
      if (preset === 'draft') {
        if (await trigger.count()) fail(preset, 'access row before first publish (the primary is the only way on)');
        if (await staticRow.count()) fail(preset, 'access row before first publish (static)');
      }
      if (preset === 'unpublished') {
        if (await trigger.count()) {
          fail(preset, 'off state still opens a menu that can change nothing (static row wanted)');
          await trigger.click(); clicks += 1;
          for (const it of await dialog.locator('[data-menu] [role="menuitemradio"]:not([aria-disabled="true"])').all()) {
            const label = (await it.textContent())?.trim() || '';
            await it.click(); clicks += 1;
            await page.waitForTimeout(900);
            if ((await stage()) !== 'unpublished') fail(preset, `access control published from off via "${label.split('\n')[0].trim()}"`);
            if (!(await dialog.locator('[data-menu]').count()) && (await trigger.count())) { await trigger.click(); clicks += 1; }
          }
          await page.keyboard.press('Escape');
        } else {
          if (!(await staticRow.count())) fail(preset, 'off state has no static "No one" row');
          else {
            if ((await staticRow.textContent())?.trim() !== 'No one') fail(preset, `static off row says "${(await staticRow.textContent())?.trim()}"`);
            if (await staticRow.locator('svg[data-icon="chevron-down"]').count()) fail(preset, 'static off row shows a chevron');
            if (await staticRow.evaluate((el) => el.tagName === 'BUTTON' || el.closest('button'))) fail(preset, 'static off row is a button');
          }
        }
      }

      // Rule 4, fix 6, S2 2: the password row, protection that starts on Save, the warning before Save.
      const switchEl = dialog.locator('[data-act="pw-toggle"][role="switch"]');
      if (!(await switchEl.count())) fail(preset, 'no password switch row');
      else {
        const pwRow = dialog.locator('.d-row', { has: page.locator('[data-act="pw-toggle"][role="switch"]') });
        if (!(await pwRow.locator('label svg[data-icon="lock"]').count())) fail(preset, 'password row has no lock icon');
        if (!/Password protected/.test((await pwRow.textContent()) || '')) fail(preset, 'password row label');
        const helpEl = dialog.locator('[data-pw-help]');
        const helpLines = async () => helpEl.evaluate((el) => Math.round(el.getBoundingClientRect().height / (parseFloat(getComputedStyle(el).fontSize) * 1.35)));
        if (hasPassword) {
          if ((await card.getAttribute('data-protected')) !== 'true') fail(preset, 'password preset is not protected');
          const help = (await helpEl.textContent()) || '';
          if (!/^Saved\. Everyone with the link needs it now\.$/.test(help.trim())) fail(preset, `saved help while live "${help.trim()}"`);
          if ((await helpLines()) > 1) fail(preset, `saved line wraps to ${await helpLines()} lines at ${width}`);
          if (await dialog.locator('[data-pw-save]').count()) fail(preset, 'Save shown though the password is saved');
          if ((await dialog.locator('input[data-act="pw-draft"]').getAttribute('type')) !== 'password') fail(preset, 'password field shows the password');
        } else {
          await click('[data-act="pw-toggle"]');
          if ((await card.getAttribute('data-password')) !== 'true') fail(preset, 'password toggle did nothing');
          if ((await card.getAttribute('data-protected')) !== 'false') fail(preset, 'protected before any password was saved');
          const input = dialog.locator('input[data-act="pw-draft"]');
          if (!(await input.count())) fail(preset, 'password on but no input');
          else {
            if ((await activeFk()) !== 'pw-input') fail(preset, `focus after switching password on is on "${await activeFk()}", not the field`);
            if ((await input.getAttribute('aria-label')) !== 'Password') fail(preset, 'password field has no label');
            if ((await input.getAttribute('type')) !== 'password') fail(preset, `password field is type=${await input.getAttribute('type')}`);
            let help = (await helpEl.textContent()) || '';
            if (isLive && !/already sent the link to will need/.test(help)) fail(preset, `no lock-out warning before Save on a live page: "${help.trim()}"`);
            if (!isLive && !/Not protected until you save/.test(help)) fail(preset, `empty password help "${help}"`);
            if (/^Saved/.test(help.trim())) fail(preset, 'help says Saved before anything was saved');
            if ((await helpLines()) > 2) fail(preset, `help before Save wraps to ${await helpLines()} lines`);
            const show = dialog.locator('[data-pw-show]');
            if (!(await show.count())) fail(preset, 'no Show control on the password field');
            else {
              await show.click(); clicks += 1;
              if ((await input.getAttribute('type')) !== 'text') fail(preset, 'Show did not reveal the password');
              if ((await show.textContent())?.trim() !== 'Hide') fail(preset, 'Show did not become Hide');
              if ((await activeFk()) !== 'pw-show') fail(preset, `focus after Show is on "${await activeFk()}"`);
              await show.click(); clicks += 1;
              if ((await input.getAttribute('type')) !== 'password') fail(preset, 'Hide did not hide the password');
            }
            await input.fill('new-secret');
            if ((await state()).pwDraft !== 'new-secret') fail(preset, 'password text not stored');
            if ((await card.getAttribute('data-protected')) !== 'false') fail(preset, 'protected before Save');
            help = (await helpEl.textContent()) || '';
            if (isLive && !/already sent the link to will need/.test(help)) fail(preset, `typed password: no lock-out warning before Save: "${help.trim()}"`);
            if (!(await dialog.locator('[data-pw-save]').count())) fail(preset, 'no Save button after typing');
            await click('[data-pw-save]');
            if ((await state()).pwSaved !== 'new-secret') fail(preset, 'Save did not save');
            if ((await card.getAttribute('data-protected')) !== 'true') fail(preset, 'not protected after Save');
            if ((await activeFk()) !== 'pw-input') fail(preset, `focus after Save is on "${await activeFk()}", lost across the re-render`);
            help = ((await helpEl.textContent()) || '').trim();
            if (isLive && help !== 'Saved. Everyone with the link needs it now.') fail(preset, `saved help while live "${help}"`);
            if (!isLive && help !== 'Saved. Visitors will need it once you publish.') fail(preset, `saved help while not live "${help}"`);
            if ((await helpLines()) > 1) fail(preset, `saved line wraps to ${await helpLines()} lines at ${width}`);
            if (!/Password saved/.test(await announced())) fail(preset, 'Save was not announced');
            await hitTargets('password open');
          }
          await click('[data-act="pw-toggle"]');
          if ((await card.getAttribute('data-password')) !== 'false') fail(preset, 'password toggle did not return');
          if ((await card.getAttribute('data-protected')) !== 'false') fail(preset, 'still protected after switching off');
        }
      }
      const kept = await card.locator('[aria-live]').first().evaluate((el) => el.__mark === true);
      if (!kept) fail(preset, 'live region recreated on re-render (announcements may not fire)');

      // Fixes 1, 4, 5, 9, S2 9 to 11: the access control. Name, keyboard, placement, words, confirm.
      const hasTrigger = (await trigger.count()) > 0;
      const triggerEnabled = hasTrigger && (await trigger.isEnabled());
      if (hasTrigger) {
        const name = await trigger.evaluate((el) => {
          const ids = el.getAttribute('aria-labelledby');
          if (ids) return ids.split(/\s+/).map((i) => document.getElementById(i)?.textContent.trim() || '').join(' ').trim();
          return el.getAttribute('aria-label') || el.textContent.trim();
        });
        if (!/^Who can open it/.test(name)) fail(preset, `access control has no accessible name ("${name}")`);
        if ((await trigger.getAttribute('aria-haspopup')) !== 'menu') fail(preset, 'access control is not a menu trigger');
        const shadow = await trigger.evaluate((el) => getComputedStyle(el).boxShadow);
        if (shadow !== 'none') fail(preset, `select has a shadow at rest (${shadow})`);
      }
      if (isLive && !triggerEnabled) fail(preset, 'no access control while live');
      const menuInView = async (where) => {
        const r = await dialog.locator('[data-menu]').boundingBox();
        if (!r) return;
        if (r.x < 0 || r.y < 0 || r.x + r.width > width + 0.5 || r.y + r.height > vh + 0.5) fail(preset, `menu leaves the viewport (${where}): ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)} in ${width}x${vh}`);
      };
      if (isLive) {
        const grammar = await dialog.evaluate((d) => {
          const label = d.querySelector('.s-row .d-label').getBoundingClientRect();
          const sel = d.querySelector('.s-select').getBoundingClientRect();
          const sw = d.querySelector('[role="switch"]').getBoundingClientRect();
          return { dy: Math.abs(label.top + label.height / 2 - (sel.top + sel.height / 2)), dRight: Math.abs(sel.right - sw.right), overlap: label.right > sel.left };
        });
        if (grammar.dy > 4 || grammar.overlap) fail(preset, `F1 label and select not on one line (dy ${grammar.dy.toFixed(0)}, overlap ${grammar.overlap})`);
        if (grammar.dRight > 2) fail(preset, `F1 select's right edge is ${grammar.dRight.toFixed(0)}px off the switch's`);
      }
      // r6: at the dialog's width the access label, the select value and the
      // password label each hold one line, and nothing is cut or overflows its row.
      const fit = await dialog.evaluate((d) => {
        const lines = (el) => { const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.5; const range = document.createRange(); range.selectNodeContents(el); return Math.round(range.getBoundingClientRect().height / lh); };
        const out = {};
        const label = d.querySelector('.s-row .d-label');
        if (label) out.access = lines(label);
        const value = d.querySelector('.s-row .s-value, .s-row .s-static');
        if (value) out.value = { cut: value.scrollWidth > value.clientWidth + 0.5, lines: lines(value) };
        const row = d.querySelector('.s-row');
        if (row) out.rowOverflow = row.scrollWidth > row.clientWidth + 0.5;
        const pw = d.querySelector('.p-block .d-label');
        // Geometry, not scrollWidth: the switch's invisible ::after hit area reaches past the row.
        if (pw) { const r = pw.closest('.d-row').getBoundingClientRect(); const l = pw.getBoundingClientRect(); const sw = pw.closest('.d-row').querySelector('[role="switch"]').getBoundingClientRect(); out.pw = lines(pw); out.pwOverflow = l.right > sw.left || sw.right > r.right + 0.5 || l.left < r.left - 0.5; }
        return out;
      });
      if (fit.access > 1) fail(preset, `access label wraps to ${fit.access} lines at ${width}`);
      if (fit.value && (fit.value.cut || fit.value.lines > 1)) fail(preset, `select value is cut or wraps at ${width}`);
      if (fit.rowOverflow) fail(preset, `access row overflows at ${width}`);
      if (fit.pw > 1) fail(preset, `password label wraps to ${fit.pw} lines at ${width}`);
      if (fit.pwOverflow) fail(preset, `password row overflows at ${width}`);
      if (isLive && triggerEnabled) {
        // Keyboard: Enter opens on the checked item, arrows move, Escape returns to the trigger.
        await card.locator('.x-stage').evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await trigger.focus();
        await page.keyboard.press('Enter');
        if (!(await dialog.locator('[data-menu]').count())) fail(preset, 'Enter did not open the menu');
        else {
          if ((await activeFk()) !== 'item-on') fail(preset, `menu opened with focus on "${await activeFk()}", not the checked item`);
          await page.keyboard.press('ArrowDown');
          if ((await activeFk()) !== 'item-off') fail(preset, `ArrowDown landed on "${await activeFk()}"`);
          await page.keyboard.press('ArrowDown');
          if ((await activeFk()) !== 'item-on') fail(preset, 'ArrowDown does not wrap');
          await page.keyboard.press('End');
          if ((await activeFk()) !== 'item-off') fail(preset, 'End does not reach the last item');
          await page.keyboard.press('Escape');
          if (await dialog.locator('[data-menu]').count()) fail(preset, 'Escape did not close the menu');
          if ((await activeFk()) !== 'access') fail(preset, `focus after Escape is on "${await activeFk()}", not the trigger`);
        }
        // Mouse: open with room below, read the items, screenshot.
        await trigger.click(); clicks += 1;
        if ((await trigger.getAttribute('aria-expanded')) !== 'true') fail(preset, 'aria-expanded not true with the menu open');
        await menuInView('room below');
        const menuText = (await dialog.locator('[data-menu]').textContent()) || '';
        if (/open in new tab/i.test(menuText)) fail(preset, 'turn off sits beside "Open in new tab" in a menu');
        if (/copy link/i.test(menuText)) fail(preset, 'turn off sits beside "Copy link" in a menu');
        const offItem = dialog.locator('[data-fk="item-off"]');
        const offLabel = (await offItem.locator('.f-item-body > span').first().textContent())?.trim();
        const offSub = (await offItem.locator('.f-item-sub').textContent())?.trim();
        if (!['No one', 'Off'].includes(offLabel || '')) fail(preset, `vocabulary: off item "${offLabel}"`);
        if (offSub !== 'Turns the link off') fail(preset, `vocabulary: off item sub "${offSub}"`);
        const onItem = dialog.locator('[data-fk="item-on"]');
        const onLabel = (await onItem.locator('.f-item-body > span').first().textContent())?.trim() || '';
        const onSub = (await onItem.locator('.f-item-sub').count()) ? ((await onItem.locator('.f-item-sub').textContent())?.trim() || '') : '';
        if (/on the internet/i.test(onSub) || onSub === onLabel) fail(preset, `menu sub line restates the label: "${onSub}"`);
        if (hasPassword && onSub !== 'Visitors need the link and the password.') fail(preset, `menu ignores the password: "${onSub}"`);
        if (!hasPassword && /password/i.test(onSub)) fail(preset, `menu mentions a password that is not set: "${onSub}"`);
        if (!hasPassword && onSub !== '') fail(preset, `menu sub line restates the label: "${onSub}"`);
        await lockCount('menu open');
        await hitTargets('menu open');
        await vocabulary('menu open');
        await stageShot(`${id}-${preset}-menu-${width}.png`);
        await page.keyboard.press('Escape');

        // Forced no room below: the trigger at the viewport's bottom edge. The menu must flip.
        await trigger.evaluate((el) => { el.scrollIntoView({ block: 'end' }); el.focus({ preventScroll: true }); });
        await page.keyboard.press('Enter');
        if (!(await dialog.locator('[data-menu]').count())) fail(preset, 'Enter did not open the menu (forced)');
        else {
          const [mr, tr] = await Promise.all([dialog.locator('[data-menu]').boundingBox(), trigger.boundingBox()]);
          if (mr && tr && mr.y + mr.height > tr.y + 1) fail(preset, `menu did not flip above the trigger with no room below (menu bottom ${Math.round(mr.y + mr.height)}, trigger top ${Math.round(tr.y)})`);
          await menuInView('no room below');
          await stageShot(`${id}-${preset}-menu-up-${width}.png`);
          await page.keyboard.press('Escape');
        }
        await card.locator('.x-stage').evaluate((el) => el.scrollIntoView({ block: 'start' }));

        // Confirm via keyboard: trigger, Enter, End, Enter. Focus on Cancel, Escape back to the trigger.
        await trigger.focus();
        await page.keyboard.press('Enter');
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        if ((await card.getAttribute('data-confirm')) !== 'true') fail(preset, 'choosing off did not ask first');
        else {
          const confirm = dialog.locator('[data-confirm-panel]');
          if ((await activeFk()) !== 'cancel') fail(preset, `focus not on Cancel when the confirm opened (on "${await activeFk()}")`);
          if ((await confirm.getAttribute('role')) !== 'alertdialog') fail(preset, 'confirm has no alertdialog role');
          const described = await confirm.evaluate((el) => !!document.getElementById(el.getAttribute('aria-describedby') || ''));
          if (!described) fail(preset, 'confirm is not described by its body');
          if (!(await dialog.locator('.d-body[inert]').count())) fail(preset, 'dialog body still operable under the confirm');
          const ct = await text();
          if (!/Turn the link off\?/.test(ct)) fail(preset, 'vocabulary: confirm title is not "Turn the link off?"');
          if (!/page is unavailable/.test(ct)) fail(preset, 'confirm does not say what visitors see');
          if (!/edits stay saved/.test(ct)) fail(preset, 'confirm does not say edits stay saved');
          if (!/Publish turns the same link back on/.test(ct)) fail(preset, 'confirm does not say Publish turns the same link back on');
          await vocabulary('confirm');
          if (await dialog.locator('.f-footer').count()) fail(preset, 'footer still shown under the confirm');
          const confirmLayout = await confirm.evaluate((el, countLines) => {
            const counts = new Function('return ' + countLines)();
            const body = el.querySelector('.d-muted'); const actions = el.querySelector('.d-confirm-actions');
            return { lines: counts(body), gap: actions.getBoundingClientRect().top - body.getBoundingClientRect().bottom };
          }, lineCounts.toString());
          if (confirmLayout.lines.length > 1 && confirmLayout.lines[confirmLayout.lines.length - 1] < 2) fail(preset, `confirm body ends with a lone word (${confirmLayout.lines.join('/')} words per line)`);
          if (confirmLayout.gap > 12) fail(preset, `confirm gap between body and buttons is ${confirmLayout.gap.toFixed(0)}px at ${width}`);
          for (const fk of ['cancel', 'turn-off']) {
            const b = dialog.locator(`[data-fk="${fk}"]`);
            const h = (await b.boundingBox())?.height || 0;
            if (h < primaryHeight - 0.5) fail(preset, `confirm button ${fk} is ${h}px, shorter than the ${primaryHeight}px primary`);
            if (width === 390 && h < 44) fail(preset, `confirm button ${fk} is ${h}px, shorter than 44 at 390`);
          }
          const cb = await Promise.all(['cancel', 'turn-off'].map((fk) => dialog.locator(`[data-fk="${fk}"]`).boundingBox()));
          const pr = await confirm.locator('.d-confirm-actions').boundingBox();
          if (cb[0] && cb[1] && pr) {
            const split = Math.abs(cb[0].width - cb[1].width) <= 1 && cb[0].width + cb[1].width >= pr.width - 12;
            if ((FOOTER[id] === 'full' || width === 390) && !split) fail(preset, `confirm buttons do not split the width (${Math.round(cb[0].width)}+${Math.round(cb[1].width)} of ${Math.round(pr.width)}px)`);
            if (Math.abs(cb[1].x + cb[1].width - (pr.x + pr.width)) > 1) fail(preset, 'Turn off is not at the right edge of the confirm');
          }
          if ((await dialog.locator('[data-fk="turn-off"]').getAttribute('data-button-variant')) !== 'danger') fail(preset, 'Turn off is not the danger face');
          if ((await dialog.locator('[data-fk="turn-off"]').textContent())?.trim() !== 'Turn off') fail(preset, 'vocabulary: confirm action is not "Turn off"');
          await page.keyboard.press('Shift+Tab');
          if ((await activeFk()) !== 'turn-off') fail(preset, 'Tab leaves the confirm');
          await hitTargets('confirm');
          await dialogShot(`${id}-${preset}-confirm-${width}.png`);
          await page.keyboard.press('Escape');
          if ((await card.getAttribute('data-confirm')) !== 'false') fail(preset, 'Escape did not cancel');
          if ((await activeFk()) !== 'access') fail(preset, `focus after cancelling is on "${await activeFk()}", not the trigger`);
          if ((await stage()) !== STAGE[preset]) fail(preset, 'cancel changed the stage');
        }
      }

      // Publish from draft, changes or off lands on published, with a spinner on the
      // way and nothing else operable meanwhile. The announcement knows about the password.
      if (STAGE[preset] !== 'published') {
        if (!(await click('[data-act="publish"]'))) fail(preset, 'no way to publish');
        else {
          if (!(await dialog.locator('[aria-busy="true"] .spin').count())) fail(preset, 'no spinner while publishing');
          if (!(await dialog.locator('.d-body[inert]').count())) fail(preset, 'dialog body operable while busy publishing');
          const pwBefore = await card.getAttribute('data-password');
          if (await trigger.count()) {
            await trigger.dispatchEvent('click');
            if (await dialog.locator('[data-menu]').count()) fail(preset, 'access menu opened while busy publishing');
          }
          await dialog.locator('[data-act="pw-toggle"]').dispatchEvent('click');
          if ((await card.getAttribute('data-password')) !== pwBefore) fail(preset, 'password switch flipped while busy publishing');
          await page.waitForTimeout(900);
          if ((await stage()) !== 'published') fail(preset, `publish left stage ${await stage()}`);
          const said = await announced();
          if (!/Published/.test(said)) fail(preset, 'publish was not announced');
          if (hasPassword && !/need the link and the password/.test(said)) fail(preset, `publish announcement ignores the password: "${said}"`);
          if (!hasPassword && !/Anyone with the link/.test(said)) fail(preset, `publish announcement "${said}"`);
        }
      }

      // S2 6: Copied only once the clipboard accepts the text; a failure line on reject.
      await page.evaluate(() => {
        if (!navigator.clipboard) Object.defineProperty(navigator, 'clipboard', { value: {}, configurable: true });
        window.__clip = { calls: [] };
        navigator.clipboard.writeText = (t) => new Promise((resolve, reject) => { window.__clip.calls.push(t); window.__clip.resolve = resolve; window.__clip.reject = reject; });
      });
      if (await click('[data-fk="primary"][data-act="copy"]')) {
        if ((await state()).copied || (await primary.textContent())?.trim() === 'Copied') fail(preset, 'primary said Copied before the clipboard resolved');
        if (!(await state()).copying) fail(preset, 'primary Copy link did not start a copy');
        await page.evaluate(() => window.__clip.resolve());
        await page.waitForTimeout(60);
        if (!(await state()).copied) fail(preset, 'primary Copy link did not copy');
        if ((await primary.textContent())?.trim() !== 'Copied') fail(preset, 'primary did not say Copied');
        const calls = await page.evaluate(() => window.__clip.calls);
        if (calls[0] !== urlNow) fail(preset, `clipboard got "${calls[0]}"`);
        if (!/Link copied/.test(await announced())) fail(preset, 'copy was not announced');
        await page.waitForTimeout(1700);
        if ((await state()).copied) fail(preset, 'Copied did not revert');
        await click('[data-fk="copy-icon"]');
        if ((await state()).copied) fail(preset, 'icon said Copied before the clipboard resolved');
        await page.evaluate(() => window.__clip.reject(new Error('denied')));
        await page.waitForTimeout(60);
        if ((await state()).copied) fail(preset, 'Copied shown though the clipboard refused');
        const errLine = dialog.locator('[data-copy-error]');
        if (!(await errLine.count())) fail(preset, 'no failure line after the clipboard refused');
        else if ((await errLine.textContent())?.trim() !== COPY_FAILED) fail(preset, `failure line "${(await errLine.textContent())?.trim()}"`);
        if ((await announced()) !== COPY_FAILED) fail(preset, `clipboard failure not announced ("${await announced()}")`);
      }

      // Turn off by mouse. Once Turn off is pressed, Cancel is disabled and the
      // turn-off completes. Then Publish brings it back.
      const liveTrigger = dialog.locator('[data-access-trigger]');
      if (!(await liveTrigger.count()) || !(await liveTrigger.isEnabled())) fail(preset, 'no way to turn the link off after publishing');
      else {
        await liveTrigger.click(); clicks += 1;
        await click('[data-fk="item-off"]');
        if ((await card.getAttribute('data-confirm')) !== 'true') fail(preset, 'off item did not ask first');
        if (await click('[data-fk="turn-off"]')) {
          const cancel = dialog.locator('[data-fk="cancel"]');
          if (await cancel.isEnabled()) fail(preset, 'Cancel still enabled during a pending turn-off');
          await cancel.dispatchEvent('click');
          if ((await card.getAttribute('data-confirm')) !== 'true') fail(preset, 'Cancel dismissed the confirm while busy, but the turn-off was still pending');
          await dialog.locator('[data-fk="turn-off"]').dispatchEvent('click');
          await page.waitForTimeout(900);
          if ((await stage()) !== 'unpublished') fail(preset, `off left stage ${await stage()}`);
          if (await dialog.locator('[data-act="copy"]').count()) fail(preset, 'copy control still shown after off');
          if (await dialog.locator('.d-chip a[href]').count()) fail(preset, 'link row still opens the page after off');
          if ((await dialog.locator('.f-band .v-status-word').textContent())?.trim() !== 'Off') fail(preset, 'band word after turning off is not "Off"');
          if (!/link is off/i.test(await announced())) fail(preset, 'turning off was not announced');
          const fk = await activeFk();
          if (!['access', 'primary'].includes(fk || '')) fail(preset, `focus after turning off is on "${fk}"`);
        } else fail(preset, 'no Turn off in confirm');
        if (!(await click('[data-act="publish"]'))) fail(preset, 'no publish after off');
        else await page.waitForTimeout(900);
        if ((await stage()) !== 'published') fail(preset, `republish failed (${await stage()})`);
      }

      // S2 8: Escape and X close the dialog, focus returns to the opener, Tab stays inside.
      await dialog.locator('[data-fk="close"]').focus();
      await page.keyboard.press('Escape');
      if (await dialog.count()) fail(preset, 'Escape did not close the dialog');
      else if ((await activeFk()) !== 'opener') fail(preset, `focus after closing is on "${await activeFk()}", not the opener`);
      await card.locator('[data-fk="opener"]').click(); clicks += 1;
      if (!(await dialog.count())) fail(preset, 'the opener did not reopen the dialog');
      else {
        const inside = await page.evaluate((i) => { const d = document.querySelector(`#${i} [role="dialog"]`); return !!d && d.contains(document.activeElement); }, id);
        if (!inside) fail(preset, 'focus not inside the dialog after opening');
        await dialog.locator('[data-fk="primary"]').focus();
        await page.keyboard.press('Tab');
        if ((await activeFk()) !== 'close') fail(preset, `Tab from the last control left the dialog (on "${await activeFk()}")`);
        await page.keyboard.press('Shift+Tab');
        if ((await activeFk()) !== 'primary') fail(preset, `Shift+Tab from the first control left the dialog (on "${await activeFk()}")`);
        await dialog.locator('[data-fk="close"]').click(); clicks += 1;
        if (await dialog.count()) fail(preset, 'X did not close the dialog');
        else if ((await activeFk()) !== 'opener') fail(preset, `focus after X is on "${await activeFk()}", not the opener`);
        await card.locator('[data-fk="opener"]').click(); clicks += 1;
      }
    }
  }
  console.log(`${width}px: ${clicks} clicks across ${OPTIONS.length} versions x ${PRESETS.length} presets`);
  const stacked = rows.filter((r) => r.endsWith('stacked')).length;
  console.log(`${width}px: band above the primary in ${stacked}/${rows.length} footers`);
  await context.close();
}
await browser.close();

process.on('uncaughtException', (e) => { console.log(problems.join('\n')); console.log(`crashed: ${e.message}`); process.exit(1); });

if (plant) {
  const hit = problems.filter((p) => LESSON_OF_PLANT[plant].test(p));
  console.log(`planted "${plant}": ${hit.length} matching failures of ${problems.length}`);
  if (hit.length) { console.log(hit.slice(0, 4).join('\n')); console.log('red as planned'); process.exit(0); }
  console.log(problems.join('\n'));
  console.log(`planted "${plant}" was not caught`);
  process.exit(1);
}
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log('clean: no page errors, console errors, failed requests or wrong states');
