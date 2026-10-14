// Renders the gallery at 390 and 1440, clicks through every preset of every
// card, screenshots each, and asserts the round-four lessons:
//   one icon in the link row, never arrow next to copy; a clickable URL is
//   underlined; no "Link on" switch; nothing red at rest; no separate off
//   section; confirms say the link stops working and Publish turns it back on.
// Fails on any page error, console error, failed request, non-2xx response,
// or a state the card does not declare.
// With ?plant=<arrow-copy|red|linkon> in the URL the script passes only if
// that planted violation makes it red, which proves the checks can fail.
// usage: node verify.mjs <url> <outdir>
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const [url, outdir] = process.argv.slice(2);
if (!url || !outdir) throw new Error('usage: node verify.mjs <url> <outdir>');
mkdirSync(outdir, { recursive: true });
const plant = new URL(url).searchParams.get('plant');
const LESSON_OF_PLANT = { 'arrow-copy': /arrow next to copy|icons in the link row/, red: /red at rest|destructive at rest/, linkon: /Link on switch/ };

const problems = [];
const browser = await chromium.launch();
const LIVE = ['published', 'changes', 'password'];
const STAGE = { draft: 'draft', published: 'published', changes: 'changes', unpublished: 'unpublished', password: 'published' };

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

  // Tailwind emits only the classes the app uses, so a retyped class renders
  // as nothing. Every class in the DOM must have a rule in a loaded stylesheet.
  if (width === 1440) {
    const css = (await Promise.all(['app.css', 'proto.css'].map((f) => page.request.get(new URL(f, url).href).then((r) => r.text())))).join('\n');
    const used = await page.evaluate(() => [...new Set([...document.querySelectorAll('*')].flatMap((el) => [...el.classList]))]);
    const escape = (c) => c.replace(/[^a-zA-Z0-9_-]/g, (ch) => '\\' + ch);
    const missing = used.filter((c) => c !== 'group/button' && !css.includes('.' + escape(c)) && !css.includes('.' + c));
    if (missing.length) problems.push(`${width} classes without a rule: ${missing.join(' ')}`);
    else console.log(`${used.length} DOM classes all have a rule`);
    const links = await page.locator('.r-table a[href]').count();
    if (links < 10) problems.push(`research table has only ${links} source links`);
  }

  // The colour an element gets from var(--destructive), for the "never red at rest" check.
  const destructive = await page.evaluate(() => {
    const probe = document.createElement('span'); probe.style.color = 'var(--destructive)'; document.body.append(probe);
    const c = getComputedStyle(probe).color; probe.remove(); return c;
  });

  const { OPTIONS, PRESETS, PRIMARY } = await page.evaluate(() => window.__proto);
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
      // A control may sit behind a menu or, in the Framer card, behind the
      // settings gear. Open each until the control shows.
      const reach = async (sel) => {
        if (await dialog.locator(`${sel}:visible`).count()) return true;
        for (const trigger of await dialog.locator('[data-act="menu"], [data-act="settings"]').all()) {
          await trigger.click(); clicks += 1;
          if (await dialog.locator(`${sel}:visible`).count()) return true;
        }
        return false;
      };
      const leaveSettings = async () => { if (await dialog.locator('[aria-label="Back"]').count()) await click('[aria-label="Back"]'); };

      // Lesson: nothing red at rest. The confirm is not rest.
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

      // Lesson: no "Link on" switch, and no switch that publishes or unpublishes.
      for (const sw of await dialog.locator('[role="switch"]').all()) {
        const label = await sw.evaluate((el) => (el.closest('.d-row')?.textContent || '').trim());
        const act = await sw.getAttribute('data-act');
        if (/link on/i.test(label) || ['ask-off', 'publish'].includes(act || '')) fail(preset, `Link on switch ("${label}", act ${act})`);
      }

      // Lesson: no separate captioned off section. "Off" may only be the band word.
      const offHeads = await dialog.locator('.g-heading, h2, h3, h4, strong').evaluateAll((els) => els.filter((el) => !el.closest('.f-band') && !el.closest('.d-confirm') && /^(off|turned off|link off|unpublished)$/i.test((el.textContent || '').trim())).map((el) => el.textContent.trim()));
      if (offHeads.length) fail(preset, `separate off section headed "${offHeads.join('", "')}"`);

      // Lesson: the link row has the URL and at most one icon, never arrow next to copy.
      const chip = dialog.locator('.d-chip');
      if (await chip.count()) {
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
          await urlLink.hover();
          const hover = await urlLink.evaluate((el) => getComputedStyle(el).textDecorationLine);
          if (!/underline/.test(hover)) fail(preset, `clickable URL not underlined on hover (rest "${rest}", hover "${hover}")`);
          await page.mouse.move(0, 0);
        } else if (await chip.locator('a[href]').count() && !isLive) fail(preset, 'off link row still links out');
        if (isLive && !(await chip.locator('a[href]').count())) fail(preset, 'live link row has no way to open the page');
      }

      // The primary the card declares, by state. null means no primary.
      const want = PRIMARY[id][STAGE[preset]];
      const primary = dialog.locator('.f-primary');
      if (want === null) { if (await primary.count()) fail(preset, `declared no primary but found "${(await primary.first().textContent())?.trim()}"`); }
      else {
        if ((await primary.count()) !== 1) fail(preset, `primary count ${await primary.count()}`);
        else {
          if ((await primary.textContent())?.trim() !== want) fail(preset, `primary "${(await primary.textContent())?.trim()}" wanted "${want}"`);
          if ((await primary.getAttribute('data-button-variant')) !== 'default') fail(preset, 'primary is not the primary face');
        }
      }
      const footer = dialog.locator('.f-footer');
      if (await footer.count()) {
        const band = footer.locator('.f-band');
        if ((await band.count()) !== 1) fail(preset, 'footer without a band');
        if ((await band.getAttribute('data-tone')) !== { draft: 'off', published: 'live', changes: 'changes', unpublished: 'off', password: 'live' }[preset]) fail(preset, `band tone ${await band.getAttribute('data-tone')}`);
        const [bb, pb] = await Promise.all([band.boundingBox(), primary.boundingBox()]);
        if (bb && pb) {
          const sameRow = Math.abs(bb.y - pb.y) < 12 && bb.x + bb.width <= pb.x + 1;
          const stacked = bb.y + bb.height <= pb.y + 1;
          if (width === 1440 && !sameRow) fail(preset, 'band and primary not on one row at 1440');
          if (!sameRow && !stacked) fail(preset, 'band and primary overlap');
          rows.push(`${id} ${preset} ${sameRow ? 'one row' : 'stacked'}`);
        }
        if (await footer.locator('[data-act="ask-off"]').count()) fail(preset, 'Unpublish inside the footer');
      }
      if (preset === 'changes' && !/2h ago/.test(await text())) fail(preset, 'no "2h ago" freshness line with changes pending');
      if (/\d+ edits?/.test(await text())) fail(preset, 'an edit count leaked in');
      const db = await dialog.boundingBox();
      const overflow = await dialog.evaluate((root) => [...root.querySelectorAll('button, a, input')].filter((el) => { const r = el.getBoundingClientRect(); const d = root.getBoundingClientRect(); return r.width && (r.right > d.right + 1 || r.left < d.left - 1); }).map((el) => (el.textContent || el.getAttribute('aria-label') || '').trim()));
      if (overflow.length) fail(preset, `controls overflow the dialog: ${overflow.join(', ')}`);

      // Header card: the "⋮" shares the title row and its centre with the X and the title.
      if (id === 'header' && isLive) {
        const [t, x, ttl] = await Promise.all([dialog.locator('[data-act="menu"]').boundingBox(), dialog.locator('.d-close').boundingBox(), dialog.locator('.d-title').boundingBox()]);
        if (!t || !x || !ttl) fail(preset, 'header controls missing');
        else {
          const cy = (b) => b.y + b.height / 2;
          if (Math.abs(cy(t) - cy(x)) > 1.5) fail(preset, `header menu off the X by ${(cy(t) - cy(x)).toFixed(1)}px`);
          if (Math.abs(cy(t) - cy(ttl)) > 1.5) fail(preset, `header menu off the title by ${(cy(t) - cy(ttl)).toFixed(1)}px`);
          if (Math.abs(t.height - x.height) > 1) fail(preset, `header menu ${t.height}px tall, X ${x.height}px`);
          if (x.x - (t.x + t.width) > 8) fail(preset, `header menu ${x.x - (t.x + t.width)}px from the X`);
        }
      }

      // Unpublish: reachable while live, neutral at rest, asks first, absent while off.
      if (isLive) {
        if (!(await reach('[data-act="ask-off"]'))) fail(preset, 'no way to reach Unpublish while live');
        else {
          const control = dialog.locator('[data-act="ask-off"]:visible').first();
          const face = await control.evaluate((el) => ({ variant: el.getAttribute('data-button-variant') || '', cls: el.className, color: getComputedStyle(el).color, text: el.textContent.trim(), role: el.getAttribute('role') }));
          if (/destructive|danger/.test(face.variant) || /(^|\s)text-destructive/.test(face.cls)) fail(preset, `Unpublish styled destructive at rest: ${face.variant || 'text-destructive'}`);
          if (face.color === destructive) fail(preset, 'Unpublish is red at rest');
          if (face.role === 'switch') fail(preset, 'Unpublish is a switch');
          if (!/unpublish|only invited|restricted|no one/i.test(face.text)) fail(preset, `Unpublish control reads "${face.text}"`);
          if (await dialog.locator('[data-menu]').count()) await card.locator('[data-dialog]').screenshot({ path: path.join(outdir, `${id}-${preset}-menu-${width}.png`) });
          await page.keyboard.press('Escape');
          if (await dialog.locator('[data-menu]').count()) fail(preset, 'Escape left a menu open');
          await leaveSettings();
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
          await leaveSettings();
        }
      } else if (await dialog.locator('[data-act="copy"]:enabled').count()) fail(preset, 'copy enabled while off');

      // Password: a switch row with a lock, toggles, shows the input, toggles back.
      const pwBefore = await card.getAttribute('data-password');
      if (!(await reach('[data-act="password"]'))) fail(preset, 'no password switch');
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
        await leaveSettings();
      }

      // Publish from draft, changes or off lands on published, with a spinner on the way.
      if (STAGE[preset] !== 'published') {
        if (!(await reach('[data-act="publish"]'))) fail(preset, 'no way to publish');
        else {
          await click('[data-act="publish"]:visible');
          if (!(await dialog.locator('[aria-busy="true"] .spin').count())) fail(preset, 'no spinner while publishing');
          await page.waitForTimeout(900);
          if ((await stage()) !== 'published') fail(preset, `publish left stage ${await stage()}`);
          await leaveSettings();
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
        } else fail(preset, 'no Unpublish in confirm');
        if (!(await reach('[data-act="publish"]'))) fail(preset, 'no publish after off');
        else { await click('[data-act="publish"]:visible'); await page.waitForTimeout(900); }
        if ((await stage()) !== 'published') fail(preset, `republish failed (${await stage()})`);
        await leaveSettings();
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
