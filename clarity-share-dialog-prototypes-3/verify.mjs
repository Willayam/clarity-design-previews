// Renders the gallery at 390 and 1440, clicks through every preset of every
// variation, screenshots each, and asserts the round-three requirements.
// Fails on any page error, console error, failed request, non-2xx response,
// or a state the model does not promise.
// usage: node verify.mjs <url> <outdir>
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const [url, outdir] = process.argv.slice(2);
if (!url || !outdir) throw new Error('usage: node verify.mjs <url> <outdir>');
mkdirSync(outdir, { recursive: true });

const problems = [];
const browser = await chromium.launch();
const LIVE = ['published', 'changes', 'password'];
const EXPECT = {
  draft: { stage: 'draft', tone: 'off', word: 'Not published', primary: 'Publish' },
  published: { stage: 'published', tone: 'live', word: 'Live', primary: 'Copy link' },
  changes: { stage: 'changes', tone: 'changes', word: 'Live', primary: 'Publish changes' },
  unpublished: { stage: 'unpublished', tone: 'off', word: 'Off', primary: 'Publish' },
  password: { stage: 'published', tone: 'live', word: 'Live', primary: 'Copy link' },
};

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
  }

  // The colour an element gets from var(--destructive), for the "never red at rest" check.
  const destructive = await page.evaluate(() => {
    const probe = document.createElement('span'); probe.style.color = 'var(--destructive)'; document.body.append(probe);
    const c = getComputedStyle(probe).color; probe.remove(); return c;
  });

  const { OPTIONS, REF, PRESETS } = await page.evaluate(() => window.__proto);
  let clicks = 0;
  const rows = [];
  for (const id of OPTIONS) {
    const card = page.locator(`#${id}`);
    const isRef = REF.includes(id);
    const dialog = card.locator('[data-dialog]');
    const fail = (preset, msg) => problems.push(`${width} ${id} ${preset}: ${msg}`);
    for (const preset of PRESETS) {
      await card.locator(`[data-presets] [data-arg="${preset}"]`).click();
      const want = EXPECT[preset];
      if ((await card.getAttribute('data-stage')) !== want.stage) fail(preset, `stage ${await card.getAttribute('data-stage')}`);
      await dialog.screenshot({ path: path.join(outdir, `${id}-${preset}-${width}.png`) });

      const click = async (sel) => {
        const el = dialog.locator(sel).first();
        if (!(await el.count()) || !(await el.isEnabled())) return false;
        await el.click();
        clicks += 1;
        return true;
      };
      const stage = async () => card.getAttribute('data-stage');
      const text = async () => (await dialog.textContent()) || '';
      // Unpublish may sit behind a menu. Open every trigger until the control shows.
      const reachOff = async () => {
        if (await dialog.locator('[data-act="ask-off"]:visible').count()) return true;
        for (const trigger of await dialog.locator('[data-act="menu"]').all()) {
          await trigger.click(); clicks += 1;
          if (await dialog.locator('[data-act="ask-off"]:visible').count()) return true;
        }
        return false;
      };

      if (!isRef) {
        const chip = dialog.locator('.d-chip');
        if (!(await chip.count())) fail(preset, 'no link chip');
        if (!(await chip.locator('.mono').count())) fail(preset, 'chip has no URL');
        const chipCopy = chip.locator('[data-act="copy"]');
        if (!(await chipCopy.count())) fail(preset, 'chip has no copy icon');

        // Password protected is its own row: lock, label, switch.
        const pwRow = dialog.locator('.d-row', { has: page.locator('[data-act="password"][role="switch"]') });
        if ((await pwRow.count()) !== 1) fail(preset, `password row count ${await pwRow.count()}`);
        else {
          if (!(await pwRow.locator('label svg').count())) fail(preset, 'password row has no lock icon');
          if (!/Password protected/.test((await pwRow.textContent()) || '')) fail(preset, 'password row label');
        }

        // Footer: band left, primary right, in one .f-footer.
        const footer = dialog.locator('.f-footer');
        const band = footer.locator('.f-band');
        const primary = footer.locator('.f-primary');
        if ((await footer.count()) !== 1) fail(preset, `footer count ${await footer.count()}`);
        if ((await band.count()) !== 1) fail(preset, 'no band in footer');
        if ((await primary.count()) !== 1) fail(preset, 'no primary in footer');
        if ((await band.getAttribute('data-tone')) !== want.tone) fail(preset, `band tone ${await band.getAttribute('data-tone')}`);
        if ((await band.locator('.v-status-word').textContent())?.trim() !== want.word) fail(preset, `band word "${await band.locator('.v-status-word').textContent()}"`);
        if ((await primary.textContent())?.trim() !== want.primary) fail(preset, `primary "${(await primary.textContent())?.trim()}" wanted "${want.primary}"`);
        if ((await primary.getAttribute('data-button-variant')) !== 'default') fail(preset, 'primary is not the primary face');
        const [bb, pb] = await Promise.all([band.boundingBox(), primary.boundingBox()]);
        if (bb && pb) {
          const sameRow = Math.abs(bb.y - pb.y) < 12 && bb.x + bb.width <= pb.x + 1;
          const stacked = bb.y + bb.height <= pb.y + 1;
          if (width === 1440 && !sameRow) fail(preset, `band and primary not on one row at 1440 (band ${JSON.stringify(bb)}, primary ${JSON.stringify(pb)})`);
          if (!sameRow && !stacked) fail(preset, 'band and primary overlap');
          rows.push(`${id} ${preset} ${sameRow ? 'one row' : 'stacked'}`);
          if (pb.x + pb.width > (await dialog.boundingBox()).x + (await dialog.boundingBox()).width + 1) fail(preset, 'primary overflows the dialog');
        }
        if (preset === 'changes') {
          if (!/Visitors see the version from 2h ago/.test((await band.textContent()) || '')) fail(preset, 'amber sentence missing from band');
          if (/\d+ edits?/.test(await text())) fail(preset, 'an edit count leaked in');
        }

        // Unpublish: out of the footer, neutral at rest, only while live.
        const off = dialog.locator('[data-act="ask-off"]');
        if (await footer.locator('[data-act="ask-off"]').count()) fail(preset, 'Unpublish inside the footer');
        if (LIVE.includes(preset)) {
          if (!(await chip.locator('a[target="_blank"] svg').count())) fail(preset, 'chip has no open arrow');
          if (!(await chipCopy.isEnabled())) fail(preset, 'copy disabled while live');
          if (!(await reachOff())) fail(preset, 'no way to reach Unpublish while live');
          const control = dialog.locator('[data-act="ask-off"]:visible').first();
          const face = await control.evaluate((el) => ({ cls: el.className, color: getComputedStyle(el).color, text: el.textContent.trim(), role: el.getAttribute('role') }));
          if (/destructive|danger|redline/.test(face.cls)) fail(preset, `Unpublish styled destructive at rest: ${face.cls.match(/destructive\S*|danger\S*|redline\S*/)[0]}`);
          if (face.color === destructive) fail(preset, 'Unpublish is red at rest');
          if (face.role !== 'switch' && face.text !== 'Unpublish' && !/link off/i.test(face.text)) fail(preset, `Unpublish control reads "${face.text}"`);
          await page.keyboard.press('Escape');
          if (await dialog.locator('[data-menu]').count()) fail(preset, 'Escape left a menu open');
        } else {
          if (await chipCopy.isEnabled()) fail(preset, 'copy enabled while off');
          if (await chip.locator('a[href]').count()) fail(preset, 'off chip still links out');
          if (await off.count()) fail(preset, 'Unpublish shown while off');
        }
      }

      // Copy from the chip icon, then from the primary when it is Copy link.
      if (await click('.d-chip [data-act="copy"]')) {
        if (!(await dialog.locator('.v-tip', { hasText: 'Copied' }).isVisible())) fail(preset, 'Copied tooltip not visible');
        if (!/Link copied/.test((await card.locator('[aria-live]').textContent()) || '')) fail(preset, 'aria-live missing Link copied');
        if (!isRef && want.primary === 'Copy link' && (await dialog.locator('.f-primary').textContent())?.trim() !== 'Copied') fail(preset, 'primary did not read Copied');
      } else if (LIVE.includes(preset)) fail(preset, 'copy not clickable while live');
      if (!isRef && want.primary === 'Copy link') {
        await page.waitForTimeout(1700);
        if ((await dialog.locator('.f-primary').textContent())?.trim() !== 'Copy link') fail(preset, 'primary did not return to Copy link');
        await click('.f-primary');
        if ((await dialog.locator('.f-primary').textContent())?.trim() !== 'Copied') fail(preset, 'primary Copy link did not read Copied');
      }

      const pwBefore = await card.getAttribute('data-password');
      if (await click('[data-act="password"]')) {
        if ((await card.getAttribute('data-password')) === pwBefore) fail(preset, 'password toggle did nothing');
        const input = card.locator('input[data-act="pw"]');
        if (await input.count()) { await input.fill('new-secret'); if ((await page.evaluate((i) => window.__proto.state(i).pw, id)) !== 'new-secret') fail(preset, 'password text not stored'); }
        else if ((await page.evaluate((i) => window.__proto.state(i).password, id))) fail(preset, 'password on but no input');
        await click('[data-act="password"]');
        if ((await card.getAttribute('data-password')) !== pwBefore) fail(preset, 'password toggle did not return');
      } else fail(preset, 'no password toggle');

      const publishSel = isRef ? '[data-act="publish"]' : '.f-primary[data-act="publish"]';
      if (await click(publishSel)) {
        if (!(await dialog.locator(`${publishSel}[aria-busy="true"] .spin`).count())) fail(preset, 'no spinner while publishing');
        await page.waitForTimeout(900);
        if ((await stage()) !== 'published') fail(preset, `publish left stage ${await stage()}`);
      }
      if (await reachOff()) {
        await click('[data-act="ask-off"]:visible');
        if ((await card.getAttribute('data-confirm')) !== 'true') fail(preset, 'ask-off did not confirm');
        if (!/stops working/.test(await text())) fail(preset, 'confirm does not say the link stops working');
        if (!/Publish turns the same link back on/.test(await text())) fail(preset, 'confirm does not say Publish turns the same link back on');
        if (!isRef && await dialog.locator('.f-footer').count()) fail(preset, 'footer still shown under the confirm');
        await click('[data-act="cancel-off"]');
        if ((await card.getAttribute('data-confirm')) !== 'false') fail(preset, 'cancel did not close');
        if (!(await reachOff())) fail(preset, 'ask-off gone after cancel');
        await click('[data-act="ask-off"]:visible');
        if (await click('[data-act="off"]')) {
          await page.waitForTimeout(900);
          if ((await stage()) !== 'unpublished') fail(preset, `off left stage ${await stage()}`);
          if (await dialog.locator('.d-chip [data-act="copy"]:enabled').count()) fail(preset, 'copy still enabled after off');
          if (!isRef && (await dialog.locator('.f-primary').textContent())?.trim() !== 'Publish') fail(preset, 'primary after off is not Publish');
        } else fail(preset, 'no Unpublish in confirm');
        if (!(await click(publishSel))) fail(preset, 'no publish after off');
        await page.waitForTimeout(900);
        if ((await stage()) !== 'published') fail(preset, `republish failed (${await stage()})`);
      } else fail(preset, 'no way to turn the link off after publishing');
    }
  }
  console.log(`${width}px: ${clicks} clicks across ${OPTIONS.length} options x ${PRESETS.length} presets`);
  const stacked = rows.filter((r) => r.endsWith('stacked')).length;
  console.log(`${width}px: footer band and primary on one row in ${rows.length - stacked}/${rows.length} dialogs, stacked in ${stacked}`);
  await context.close();
}
await browser.close();
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log('clean: no page errors, console errors, failed requests or wrong states');
