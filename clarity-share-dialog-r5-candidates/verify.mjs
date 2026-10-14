// Renders the candidates page at 390 and 1440, clicks through every preset of
// every card, screenshots each, and asserts the FEEDBACK.md rules:
//   1 Live with a green dot; amber freshness line "2h ago" with changes pending
//   2 one primary bottom right: Publish / Copy link / Publish changes / Publish
//   3 the band sits beside the primary at 1440
//   4 password is its own switch row (C7 declares the bend and is checked as a menu choice)
//   5 the link row has the URL and at most one icon, never the open arrow beside copy
//   6 Unpublish reachable while live, never destructive at rest, never a switch,
//     never in a menu beside "Open in new tab" or "Copy link", always asks first
//   7 no "More options" disclosure
//   9 no "General access", no "Link on"
// Also fails on any page error, console error, failed request, non-2xx response,
// a retyped Tailwind class with no rule, or cards not three across at 1440.
// With ?plant=<name> in the URL the script passes only if that planted
// violation makes it red, which proves the checks can fail.
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
  red: /red at rest|destructive at rest/,
  linkon: /Link on switch/,
  'general-access': /General access/,
  'more-options': /More options/,
  'open-in-menu': /beside "Open in new tab"/,
  primary: /primary "Publish" wanted "Copy link"/,
};
if (plant && !LESSON_OF_PLANT[plant]) throw new Error(`unknown plant ${plant}`);

const problems = [];
const browser = await chromium.launch();
const LIVE = ['published', 'changes', 'password'];
const STAGE = { draft: 'draft', published: 'published', changes: 'changes', unpublished: 'unpublished', password: 'published' };
const TONE = { draft: 'off', published: 'live', changes: 'changes', unpublished: 'off', password: 'live' };

for (const width of [390, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, deviceScaleFactor: 1 });
  await context.route('**/*', (route) => (route.request().method() === 'GET' ? route.continue() : route.abort()));
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push(`${width} pageerror ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${width} console ${m.text()}`); });
  page.on('requestfailed', (r) => problems.push(`${width} requestfailed ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${width} http ${r.status()} ${r.url()}`); });
  await page.goto(url, { waitUntil: 'networkidle' });
  const font = await page.evaluate(() => document.fonts.ready.then(() => document.fonts.check('16px "Geist Variable"')));
  if (!font) problems.push(`${width} Geist Variable not loaded`);
  await page.screenshot({ path: path.join(outdir, `gallery-${width}.png`), fullPage: true });

  const { OPTIONS, PRESETS, PRIMARY, PASSWORD_IN_MENU } = await page.evaluate(() => window.__proto);

  // Tailwind emits only the classes the app uses, so a retyped class renders
  // as nothing. Every class in the DOM must have a rule in a loaded stylesheet.
  if (width === 1440) {
    const css = (await Promise.all(['app.css', 'proto.css'].map((f) => page.request.get(new URL(f, url).href).then((r) => r.text())))).join('\n');
    const used = await page.evaluate(() => [...new Set([...document.querySelectorAll('*')].flatMap((el) => [...el.classList]))]);
    const escape = (c) => c.replace(/[^a-zA-Z0-9_-]/g, (ch) => '\\' + ch);
    const missing = used.filter((c) => c !== 'group/button' && !css.includes('.' + escape(c)) && !css.includes('.' + c));
    if (missing.length) problems.push(`${width} classes without a rule: ${missing.join(' ')}`);
    else console.log(`${used.length} DOM classes all have a rule`);
    const boxes = await Promise.all(OPTIONS.slice(0, 3).map((id) => page.locator(`#${id}`).boundingBox()));
    const threeAcross = boxes.every((b) => b && Math.abs(b.y - boxes[0].y) < 2) && boxes[0].x < boxes[1].x && boxes[1].x < boxes[2].x;
    if (!threeAcross) problems.push(`${width} first three cards are not on one row`);
    const perRow = await page.evaluate(() => getComputedStyle(document.getElementById('options')).gridTemplateColumns.split(' ').length);
    if (perRow !== 3) problems.push(`${width} grid has ${perRow} columns, wanted 3`);
  } else {
    const perRow = await page.evaluate(() => getComputedStyle(document.getElementById('options')).gridTemplateColumns.split(' ').length);
    if (perRow !== 1) problems.push(`${width} grid has ${perRow} columns, wanted 1`);
  }

  // The colour an element gets from var(--destructive), for the "never red at rest" check.
  const destructive = await page.evaluate(() => {
    const probe = document.createElement('span'); probe.style.color = 'var(--destructive)'; document.body.append(probe);
    const c = getComputedStyle(probe).color; probe.remove(); return c;
  });
  const success = await page.evaluate(() => {
    const probe = document.createElement('span'); probe.style.color = 'var(--success)'; document.body.append(probe);
    const c = getComputedStyle(probe).color; probe.remove(); return c;
  });

  let clicks = 0;
  const rows = [];
  for (const id of OPTIONS) {
    const card = page.locator(`#${id}`);
    const dialog = card.locator('[role="dialog"]');
    const fail = (preset, msg) => problems.push(`${width} ${id} ${preset}: ${msg}`);
    for (const preset of PRESETS) {
      await card.locator(`[data-presets] [data-arg="${preset}"]`).click();
      const isLive = LIVE.includes(preset);
      if ((await card.getAttribute('data-stage')) !== STAGE[preset]) fail(preset, `stage ${await card.getAttribute('data-stage')}`);
      await card.locator('[data-dialog]').screenshot({ path: path.join(outdir, `${id}-${preset}-${width}.png`) });

      const click = async (sel) => {
        const el = dialog.locator(sel).first();
        if (!(await el.count()) || !(await el.isEnabled())) return false;
        await el.click();
        clicks += 1;
        return true;
      };
      const stage = async () => card.getAttribute('data-stage');
      const text = async () => (await dialog.textContent()) || '';
      // A control may sit behind a menu. Open each until the control shows.
      const reach = async (sel) => {
        if (await dialog.locator(`${sel}:visible`).count()) return true;
        for (const trigger of await dialog.locator('[data-act="menu"]').all()) {
          await trigger.click(); clicks += 1;
          if (await dialog.locator(`${sel}:visible`).count()) return true;
        }
        return false;
      };

      // Rule 9: no "General access", no "Link on". Rule 7: no "More options" or any disclosure.
      const body = await text();
      if (/general access/i.test(body)) fail(preset, 'heading says "General access"');
      if (/more options/i.test(body)) fail(preset, '"More options" disclosure');
      if (await dialog.locator('details, summary').count()) fail(preset, 'a disclosure element hides controls ("More options")');
      if (/link on\b/i.test(body)) fail(preset, 'Link on switch (text)');
      if (/\d+ edits?/.test(body)) fail(preset, 'an edit count leaked in');

      // Rule 6: nothing red at rest. The confirm is not rest.
      const redAtRest = await dialog.evaluate((root, red) => {
        const out = [];
        for (const el of root.querySelectorAll('*')) {
          if (el.closest('.d-confirm')) continue;
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

      // Rule 6: no separate captioned off section. "Off" may only be the band word.
      const offHeads = await dialog.locator('.g-heading, h2, h3, h4, strong').evaluateAll((els) => els.filter((el) => !el.closest('.f-band') && !el.closest('.d-confirm') && /^(off|turned off|link off|unpublished)$/i.test((el.textContent || '').trim())).map((el) => el.textContent.trim()));
      if (offHeads.length) fail(preset, `separate off section headed "${offHeads.join('", "')}"`);

      // Rule 5: the link row has the URL and at most one icon, never arrow next to copy.
      const chip = dialog.locator('.d-chip');
      if (!(await chip.count())) fail(preset, 'no link row');
      else {
        const icons = await chip.locator('svg[data-icon]').evaluateAll((els) => els.map((el) => el.getAttribute('data-icon')));
        const kinds = icons.filter((n) => ['arrow-up-right', 'copy', 'check', 'external-link'].includes(n));
        if (kinds.includes('arrow-up-right') && (kinds.includes('copy') || kinds.includes('check'))) fail(preset, `open arrow next to copy in the link row (${icons.join(', ')})`);
        if (kinds.length > 1) fail(preset, `${kinds.length} icons in the link row (${icons.join(', ')})`);
        const controls = await chip.locator('a, button').count();
        if (controls > 2) fail(preset, `${controls} controls in the link row`);
        if (!(await chip.locator('.mono').count())) fail(preset, 'link row has no URL');
        const urlLink = chip.locator('a.d-chip-url');
        if (await urlLink.count()) {
          if (!isLive) fail(preset, 'off link row still links out');
          if ((await urlLink.getAttribute('target')) !== '_blank') fail(preset, 'URL link does not open a new tab');
          const rest = await urlLink.evaluate((el) => getComputedStyle(el).textDecorationLine);
          if (!/underline/.test(rest)) fail(preset, `clickable URL not underlined at rest ("${rest}")`);
        } else if (await chip.locator('a[href]').count() && !isLive) fail(preset, 'off link row still links out');
        if (isLive && !(await chip.locator('a[href]').count())) fail(preset, 'live link row has no way to open the page');
      }

      // Rule 2: one primary, bottom right, label by state.
      const want = PRIMARY[id][STAGE[preset]];
      const primary = dialog.locator('.f-primary');
      if ((await primary.count()) !== 1) fail(preset, `primary count ${await primary.count()}`);
      else {
        if ((await primary.textContent())?.trim() !== want) fail(preset, `primary "${(await primary.textContent())?.trim()}" wanted "${want}"`);
        if ((await primary.getAttribute('data-button-variant')) !== 'default') fail(preset, 'primary is not the primary face');
        const [pb, db] = await Promise.all([primary.boundingBox(), dialog.boundingBox()]);
        if (pb && db && pb.x + pb.width < db.x + db.width - 40) fail(preset, 'primary is not at the right edge');
        const others = await dialog.locator('[data-button-variant="default"]').count();
        if (others !== 1) fail(preset, `${others} primary-face buttons`);
      }

      // Rules 1 and 3: the band, its tone, the green dot, the amber freshness line, beside the primary.
      const footer = dialog.locator('.f-footer');
      if (!(await footer.count())) fail(preset, 'no footer');
      else {
        const band = footer.locator('.f-band');
        if ((await band.count()) !== 1) fail(preset, 'footer without a band');
        else {
          if ((await band.getAttribute('data-tone')) !== TONE[preset]) fail(preset, `band tone ${await band.getAttribute('data-tone')}`);
          const word = (await band.locator('.v-status-word').textContent())?.trim();
          if (isLive && word !== 'Live') fail(preset, `band word "${word}" while live`);
          if (isLive && preset !== 'changes') {
            const dotColor = await band.locator('.d-dot').evaluate((el) => getComputedStyle(el).backgroundColor);
            if (dotColor !== success) fail(preset, `live dot is ${dotColor}, not green`);
          }
          if (preset === 'changes') {
            const line = band.locator('.f-band-text');
            if (!/Visitors see the version from 2h ago/.test((await line.textContent()) || '')) fail(preset, 'no "Visitors see the version from 2h ago" line');
            const amber = await line.evaluate((el) => getComputedStyle(el).color);
            if (amber !== 'rgb(180, 83, 9)') fail(preset, `freshness line is ${amber}, not amber`);
          }
          const [bb, pb] = await Promise.all([band.boundingBox(), primary.boundingBox()]);
          if (bb && pb) {
            const cy = (b) => b.y + b.height / 2;
            const sameRow = Math.abs(cy(bb) - cy(pb)) < 12 && bb.x + bb.width <= pb.x + 1;
            const stacked = bb.y + bb.height <= pb.y + 1;
            if (width === 1440 && !sameRow) fail(preset, 'band and primary not on one row at 1440');
            if (!sameRow && !stacked) fail(preset, 'band and primary overlap');
            rows.push(`${id} ${preset} ${sameRow ? 'one row' : 'stacked'}`);
          }
        }
        const footerOff = await footer.locator('[data-act="ask-off"]').evaluateAll((els) => els.filter((el) => !el.closest('[data-menu]')).length);
        if (footerOff) fail(preset, 'Unpublish as a button inside the footer');
      }
      const overflow = await dialog.evaluate((root) => [...root.querySelectorAll('button, a, input')].filter((el) => { const r = el.getBoundingClientRect(); const d = root.getBoundingClientRect(); return r.width && (r.right > d.right + 1 || r.left < d.left - 1); }).map((el) => (el.textContent || el.getAttribute('aria-label') || '').trim()));
      if (overflow.length) fail(preset, `controls overflow the dialog: ${overflow.join(', ')}`);

      // Rule 6: Unpublish reachable while live, neutral at rest, not beside Open or Copy, absent while off.
      if (isLive) {
        if (!(await reach('[data-act="ask-off"]'))) fail(preset, 'no way to reach Unpublish while live');
        else {
          const control = dialog.locator('[data-act="ask-off"]:visible').first();
          const face = await control.evaluate((el) => ({ variant: el.getAttribute('data-button-variant') || '', cls: el.className, color: getComputedStyle(el).color, text: el.textContent.trim(), role: el.getAttribute('role') }));
          if (/destructive|danger/.test(face.variant) || /(^|\s)text-destructive/.test(face.cls)) fail(preset, `Unpublish styled destructive at rest: ${face.variant || 'text-destructive'}`);
          if (face.color === destructive) fail(preset, 'Unpublish is red at rest');
          if (face.role === 'switch') fail(preset, 'Unpublish is a switch');
          if (!/unpublish|no one|^off/i.test(face.text)) fail(preset, `Unpublish control reads "${face.text}"`);
          const openMenu = dialog.locator('[data-menu]');
          if (await openMenu.count()) {
            const siblings = await openMenu.locator('.f-item').evaluateAll((els) => els.map((el) => el.textContent.trim()));
            if (siblings.some((t) => /open in new tab/i.test(t))) fail(preset, 'Unpublish sits in a menu beside "Open in new tab"');
            if (siblings.some((t) => /^copy link/i.test(t))) fail(preset, 'Unpublish sits in a menu beside "Copy link"');
            const menuBox = await openMenu.boundingBox();
            const dBox = await dialog.boundingBox();
            if (menuBox && dBox && (menuBox.x < dBox.x - 1 || menuBox.x + menuBox.width > dBox.x + dBox.width + 1)) fail(preset, 'menu overflows the dialog sideways');
            await card.locator('[data-dialog]').screenshot({ path: path.join(outdir, `${id}-${preset}-menu-${width}.png`) });
          }
          await page.keyboard.press('Escape');
          if (await dialog.locator('[data-menu]').count()) fail(preset, 'Escape left a menu open');
        }
      } else if (await dialog.locator('[data-act="ask-off"]').count()) fail(preset, 'Unpublish shown while off');

      // Copy: reachable while live, announces, and never available while off.
      if (isLive) {
        if (!(await reach('[data-act="copy"]'))) fail(preset, 'no way to copy while live');
        else {
          await click('[data-act="copy"]:visible');
          if (!/Link copied/.test((await card.locator('[aria-live]').textContent()) || '')) fail(preset, 'aria-live missing Link copied');
          if (!/Copied/.test(await text())) fail(preset, 'no visible Copied feedback');
          await page.waitForTimeout(1700);
          if (/Copied/.test(await text())) fail(preset, 'Copied feedback did not return');
        }
      } else if (await dialog.locator('[data-act="copy"]:enabled').count()) fail(preset, 'copy enabled while off');

      // Rule 4: password is a switch row with a lock, toggles, shows the input, toggles back.
      // C7 declares the bend: the password is a choice in the access menu instead.
      const pwBefore = await card.getAttribute('data-password');
      if (PASSWORD_IN_MENU.includes(id)) {
        const on = pwBefore === 'true';
        if (!(await reach(on ? '[data-act="password"]' : '[data-act="password-on"]'))) fail(preset, 'no password choice in the access menu');
        else if (!isLive) { await page.keyboard.press('Escape'); }
        else {
          await click(on ? '[data-act="password"]:visible' : '[data-act="password-on"]:visible');
          await page.waitForTimeout(900);
          if ((await card.getAttribute('data-password')) === pwBefore) fail(preset, 'password choice did nothing');
          const input = card.locator('input[data-act="pw"]');
          if (await page.evaluate((i) => window.__proto.state(i).password, id)) {
            if (!(await input.count())) fail(preset, 'password on but no input');
            else { await input.fill('new-secret'); if ((await page.evaluate((i) => window.__proto.state(i).pw, id)) !== 'new-secret') fail(preset, 'password text not stored'); }
          }
          if (!(await reach(on ? '[data-act="password-on"]' : '[data-act="password"]'))) fail(preset, 'no way back from the password choice');
          else { await click(on ? '[data-act="password-on"]:visible' : '[data-act="password"]:visible'); await page.waitForTimeout(900); }
          if ((await card.getAttribute('data-password')) !== pwBefore) fail(preset, 'password choice did not return');
        }
      } else if (!(await dialog.locator('[data-act="password"][role="switch"]').count())) fail(preset, 'no password switch row');
      else {
        const pwRow = dialog.locator('.d-row', { has: page.locator('[data-act="password"][role="switch"]') });
        if (!(await pwRow.locator('label svg[data-icon="lock"]').count())) fail(preset, 'password row has no lock icon');
        if (!/Password protected/.test((await pwRow.textContent()) || '')) fail(preset, 'password row label');
        await click('[data-act="password"]:visible');
        if ((await card.getAttribute('data-password')) === pwBefore) fail(preset, 'password toggle did nothing');
        const input = card.locator('input[data-act="pw"]');
        if (await input.count()) { await input.fill('new-secret'); if ((await page.evaluate((i) => window.__proto.state(i).pw, id)) !== 'new-secret') fail(preset, 'password text not stored'); }
        else if (await page.evaluate((i) => window.__proto.state(i).password, id)) fail(preset, 'password on but no input');
        await click('[data-act="password"]:visible');
        if ((await card.getAttribute('data-password')) !== pwBefore) fail(preset, 'password toggle did not return');
      }

      // Publish from draft, changes or off lands on published, with a spinner on the way.
      if (STAGE[preset] !== 'published') {
        if (!(await reach('[data-act="publish"]'))) fail(preset, 'no way to publish');
        else {
          await click('[data-act="publish"]:visible');
          if (!(await dialog.locator('[aria-busy="true"] .spin').count())) fail(preset, 'no spinner while publishing');
          await page.waitForTimeout(900);
          if ((await stage()) !== 'published') fail(preset, `publish left stage ${await stage()}`);
        }
      }

      // Turn off: confirm wording, cancel keeps it live, confirm turns it off, Publish brings it back.
      if (!(await reach('[data-act="ask-off"]'))) fail(preset, 'no way to turn the link off after publishing');
      else {
        await click('[data-act="ask-off"]:visible');
        if ((await card.getAttribute('data-confirm')) !== 'true') fail(preset, 'ask-off did not confirm');
        if (!/stops working/.test(await text())) fail(preset, 'confirm does not say the link stops working');
        if (!/Publish turns the same link back on/.test(await text())) fail(preset, 'confirm does not say Publish turns the same link back on');
        if (await dialog.locator('.f-footer').count()) fail(preset, 'footer still shown under the confirm');
        await card.locator('[data-dialog]').screenshot({ path: path.join(outdir, `${id}-${preset}-confirm-${width}.png`) });
        await click('[data-act="cancel-off"]');
        if ((await card.getAttribute('data-confirm')) !== 'false') fail(preset, 'cancel did not close');
        if ((await stage()) !== 'published') fail(preset, 'cancel changed the stage');
        if (!(await reach('[data-act="ask-off"]'))) fail(preset, 'ask-off gone after cancel');
        await click('[data-act="ask-off"]:visible');
        if (await click('[data-act="off"]')) {
          await page.waitForTimeout(900);
          if ((await stage()) !== 'unpublished') fail(preset, `off left stage ${await stage()}`);
          if (await dialog.locator('[data-act="copy"]:enabled').count()) fail(preset, 'copy still enabled after off');
          if (await dialog.locator('.d-chip a[href]').count()) fail(preset, 'link row still opens the page after off');
        } else fail(preset, 'no Turn off in confirm');
        if (!(await reach('[data-act="publish"]'))) fail(preset, 'no publish after off');
        else { await click('[data-act="publish"]:visible'); await page.waitForTimeout(900); }
        if ((await stage()) !== 'published') fail(preset, `republish failed (${await stage()})`);
      }
    }
  }
  console.log(`${width}px: ${clicks} clicks across ${OPTIONS.length} cards x ${PRESETS.length} presets`);
  const stacked = rows.filter((r) => r.endsWith('stacked')).length;
  console.log(`${width}px: band and primary on one row in ${rows.length - stacked}/${rows.length} footers, stacked in ${stacked}`);
  await context.close();
}
await browser.close();

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
