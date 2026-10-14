// Renders the finals page at 390 and 1440, drives every preset of every final
// by mouse and keyboard, screenshots each state, and asserts the FEEDBACK.md
// rules plus the ten shared fixes from SYNTHESIS.md:
//   FEEDBACK 1 Live with a green dot; amber freshness line "2h ago" with changes pending
//   FEEDBACK 2 one primary bottom right: Publish / Copy link / Publish changes / Publish
//   FEEDBACK 3 the band sits beside the primary at 1440, above it at 390
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
//   fix 10 copy icon present in F1 and F2 while live, absent in F3 when the primary is Copy link
// Also fails on any page error, console error, failed request, non-2xx response,
// a retyped Tailwind class with no rule, or a dialog that is not the app's width.
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
  orphan: /lone word/,
  mono: /monospace/,
  orange: /reads orange/,
};
if (plant && !LESSON_OF_PLANT[plant]) throw new Error(`unknown plant ${plant}`);

const problems = [];
const browser = await chromium.launch();
const LIVE = ['published', 'changes', 'password', 'password-changes'];
const STAGE = { draft: 'draft', published: 'published', changes: 'changes', unpublished: 'unpublished', password: 'published', 'password-changes': 'changes' };
const TONE = { draft: 'off', published: 'live', changes: 'changes', unpublished: 'off', password: 'live', 'password-changes': 'changes' };
const AUDIENCE = /anyone with the link|anyone with the password|no one can|people with the link|needs? the password/i;

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

  // Six verify runs in parallel can starve a static server; wait for the script, don't assume it.
  await page.waitForFunction(() => window.__proto, null, { timeout: 15000 }).catch(() => problems.push(`${width} proto.js never ran`));
  const { OPTIONS, PRESETS, PRIMARY, URL_FULL } = (await page.evaluate(() => window.__proto)) || { OPTIONS: [], PRESETS: [], PRIMARY: {}, URL_FULL: '' };
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
    const stageShot = async (name, extra) => {
      const box = await card.locator('.x-stage').evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height }; });
      await page.screenshot({ path: path.join(outdir, name), fullPage: true, clip: { ...box, height: box.height + (extra || 0) } });
    };
    for (const preset of PRESETS) {
      try { await drive(preset); } catch (e) { fail(preset, `flow broke: ${e.message.split('\n')[0]}`); await page.keyboard.press('Escape').catch(() => {}); }
    }
    async function drive(preset) {
      await card.locator(`[data-presets] [data-arg="${preset}"]`).click();
      const isLive = LIVE.includes(preset);
      const hasPassword = preset.startsWith('password');
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
      const state = async () => page.evaluate((i) => window.__proto.state(i), id);
      const activeFk = async () => page.evaluate(() => document.activeElement && document.activeElement.dataset.fk);
      const dialogWidth = (await dialog.boundingBox())?.width;
      if (width === 1440 && Math.abs(dialogWidth - 512) > 1) fail(preset, `dialog is ${dialogWidth}px wide, the app's is 512`);
      if (width === 390 && Math.abs(dialogWidth - 390) > 1) fail(preset, `dialog is ${dialogWidth}px wide, the phone sheet is 390`);

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

      // Fix 9: every visible control is big enough. The switch counts its ::after hit area.
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

      // Rule 5 and fix 7: the link row has the URL in Geist, at most one icon, slug visible, address readable.
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
          const shown = (await urlEl.textContent())?.replace(/\s+/g, '');
          if (shown !== URL_FULL.replace('https://', '')) fail(preset, `URL text "${shown}"`);
          const slug = await chip.locator('.d-url-slug').evaluate((el) => ({ visible: el.scrollWidth <= el.clientWidth + 1 && el.getBoundingClientRect().right <= el.closest('.d-chip').getBoundingClientRect().right, text: el.textContent }));
          if (!slug.visible) fail(preset, `slug "${slug.text}" is cut off`);
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
        // Fix 10: both copy controls in F1 and F2; F3 drops the icon when the primary is Copy link.
        const copyIcons = await chip.locator('[data-fk="copy-icon"]').count();
        const wantIcon = id === 'F3' ? STAGE[preset] !== 'published' : true;
        if (copyIcons !== (wantIcon ? 1 : 0)) fail(preset, `${copyIcons} copy icons in the link row, wanted ${wantIcon ? 1 : 0}`);
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
        if (pb && db && pb.x + pb.width < db.x + db.width - 40) fail(preset, 'primary is not at the right edge');
        if (width === 390 && pb && db && pb.width < db.width - 60) fail(preset, `primary is ${pb.width}px wide at 390, not full width`);
        if (STAGE[preset] === 'changes' && (await primary.locator('svg').count())) fail(preset, 'Publish changes carries an icon');
        const others = await dialog.locator('[data-button-variant="default"]').count();
        if (others !== 1) fail(preset, `${others} primary-face buttons`);
      }

      // Rules 1 and 3, fixes 3 and 8: the band, its tone, its words, its lines, beside the primary.
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
          const orphans = await band.evaluate((el) => {
            const out = [];
            for (const p of el.querySelectorAll('.f-band-text, .f-band-head')) {
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
              const counts = [...lines.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
              if (counts.length > 1 && counts[counts.length - 1] < 2) out.push(`"${p.textContent.trim()}" breaks ${counts.join('/')} words per line`);
            }
            return out;
          });
          if (orphans.length) fail(preset, `band line ends with a lone word: ${orphans.join('; ')}`);
          const [bb, pb] = await Promise.all([band.boundingBox(), primary.boundingBox()]);
          if (bb && pb) {
            const sameRow = Math.abs(bb.y + bb.height / 2 - (pb.y + pb.height / 2)) < Math.max(bb.height, pb.height) / 2 && bb.x + bb.width <= pb.x + 1;
            const stacked = bb.y + bb.height <= pb.y + 1;
            rows.push(`${id} ${preset} ${sameRow ? 'row' : stacked ? 'stacked' : 'neither'}`);
            if (width === 1440 && !sameRow) fail(preset, 'band is not beside the primary at 1440');
            if (width === 390 && !stacked) fail(preset, 'band is not above the primary at 390');
          }
        }
      }

      // Rule 4 and fix 6: the password row, and protection that starts on Save.
      const switchEl = dialog.locator('[data-act="pw-toggle"][role="switch"]');
      if (!(await switchEl.count())) fail(preset, 'no password switch row');
      else {
        const pwRow = dialog.locator('.d-row', { has: page.locator('[data-act="pw-toggle"][role="switch"]') });
        if (!(await pwRow.locator('label svg[data-icon="lock"]').count())) fail(preset, 'password row has no lock icon');
        if (!/Password protected/.test((await pwRow.textContent()) || '')) fail(preset, 'password row label');
        if (hasPassword) {
          if ((await card.getAttribute('data-protected')) !== 'true') fail(preset, 'password preset is not protected');
          const help = (await dialog.locator('[data-pw-help]').textContent()) || '';
          if (!/Saved\./.test(help)) fail(preset, `password help "${help}" does not say Saved`);
          if (!/Visitors need the password now/.test(help)) fail(preset, `live password help "${help}" does not say it applies now`);
          if (await dialog.locator('[data-pw-save]').count()) fail(preset, 'Save shown though the password is saved');
        } else {
          await click('[data-act="pw-toggle"]');
          if ((await card.getAttribute('data-password')) !== 'true') fail(preset, 'password toggle did nothing');
          if ((await card.getAttribute('data-protected')) !== 'false') fail(preset, 'protected before any password was saved');
          const input = dialog.locator('input[data-act="pw-draft"]');
          if (!(await input.count())) fail(preset, 'password on but no input');
          else {
            if ((await activeFk()) !== 'pw-input') fail(preset, `focus after switching password on is on "${await activeFk()}", not the field`);
            if ((await input.getAttribute('aria-label')) !== 'Password') fail(preset, 'password field has no label');
            let help = (await dialog.locator('[data-pw-help]').textContent()) || '';
            if (!/Not protected until you save/.test(help)) fail(preset, `empty password help "${help}"`);
            await input.fill('new-secret');
            if ((await state()).pwDraft !== 'new-secret') fail(preset, 'password text not stored');
            if ((await card.getAttribute('data-protected')) !== 'false') fail(preset, 'protected before Save');
            if (!(await dialog.locator('[data-pw-save]').count())) fail(preset, 'no Save button after typing');
            await click('[data-pw-save]');
            if ((await state()).pwSaved !== 'new-secret') fail(preset, 'Save did not save');
            if ((await card.getAttribute('data-protected')) !== 'true') fail(preset, 'not protected after Save');
            if ((await activeFk()) !== 'pw-input') fail(preset, `focus after Save is on "${await activeFk()}", lost across the re-render`);
            help = (await dialog.locator('[data-pw-help]').textContent()) || '';
            if (isLive && !/Saved\. Visitors need the password now/.test(help)) fail(preset, `saved help while live "${help}"`);
            if (!isLive && !/Saved\. Visitors will need the password once you publish/.test(help)) fail(preset, `saved help while not live "${help}"`);
            await hitTargets('password open');
          }
          await click('[data-act="pw-toggle"]');
          if ((await card.getAttribute('data-password')) !== 'false') fail(preset, 'password toggle did not return');
          if ((await card.getAttribute('data-protected')) !== 'false') fail(preset, 'still protected after switching off');
        }
      }

      // Fixes 1, 4, 5, 9: the access control. Name, keyboard, never a publish, confirm focus.
      const trigger = dialog.locator('[data-access-trigger]');
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
      }
      if (preset === 'draft' && triggerEnabled) fail(preset, 'access control enabled before first publish');
      if (preset === 'unpublished' && triggerEnabled) {
        await trigger.click(); clicks += 1;
        await stageShot(`${id}-${preset}-menu-${width}.png`);
        const items = await dialog.locator('[data-menu] [role="menuitemradio"]').all();
        if (items.length < 2) fail(preset, `off menu has ${items.length} items`);
        let publishable = 0;
        for (const it of items) {
          const disabled = (await it.getAttribute('aria-disabled')) === 'true';
          const label = (await it.textContent())?.trim() || '';
          if (disabled) { if (!/Publish turns the link back on/.test(label)) fail(preset, `disabled item "${label}" does not point at Publish`); continue; }
          await it.click(); clicks += 1;
          await page.waitForTimeout(900);
          if ((await stage()) !== 'unpublished') { fail(preset, `access control published from off via "${label.split('\n')[0].trim()}"`); publishable += 1; }
          if (!(await dialog.locator('[data-menu]').count())) { await trigger.click(); clicks += 1; }
        }
        await page.keyboard.press('Escape');
        if (await dialog.locator('[data-menu]').count()) fail(preset, 'Escape did not close the off menu');
        if (publishable === 0 && (await stage()) !== 'unpublished') fail(preset, 'off menu changed the stage');
      }
      if (isLive && !triggerEnabled) fail(preset, 'no access control while live');
      if (isLive && triggerEnabled) {
        // Keyboard: Enter opens on the checked item, arrows move, Escape returns to the trigger.
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
        // Mouse: open, read the items, screenshot.
        await trigger.click(); clicks += 1;
        if ((await trigger.getAttribute('aria-expanded')) !== 'true') fail(preset, 'aria-expanded not true with the menu open');
        const menuText = (await dialog.locator('[data-menu]').textContent()) || '';
        if (/open in new tab/i.test(menuText)) fail(preset, 'turn off sits beside "Open in new tab" in a menu');
        if (/copy link/i.test(menuText)) fail(preset, 'turn off sits beside "Copy link" in a menu');
        const offItem = dialog.locator('[data-fk="item-off"]');
        const offLabel = (await offItem.locator('.f-item-body > span').first().textContent())?.trim();
        const offSub = (await offItem.locator('.f-item-sub').textContent())?.trim();
        if (!['No one', 'Off'].includes(offLabel || '')) fail(preset, `vocabulary: off item "${offLabel}"`);
        if (offSub !== 'Turns the link off') fail(preset, `vocabulary: off item sub "${offSub}"`);
        const onSub = (await dialog.locator('[data-fk="item-on"] .f-item-sub').textContent())?.trim() || '';
        if (hasPassword && !/password/i.test(onSub)) fail(preset, `menu ignores the password: "${onSub}"`);
        if (!hasPassword && /password/i.test(onSub)) fail(preset, `menu mentions a password that is not set: "${onSub}"`);
        await lockCount('menu open');
        await hitTargets('menu open');
        await vocabulary('menu open');
        await stageShot(`${id}-${preset}-menu-${width}.png`, id === 'F2' ? 130 : 0);
        await page.keyboard.press('Escape');

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
          for (const fk of ['cancel', 'turn-off']) {
            const b = dialog.locator(`[data-fk="${fk}"]`);
            const h = (await b.boundingBox())?.height || 0;
            if (h < primaryHeight - 0.5) fail(preset, `confirm button ${fk} is ${h}px, shorter than the ${primaryHeight}px primary`);
            if (width === 390 && h < 44) fail(preset, `confirm button ${fk} is ${h}px, shorter than 44 at 390`);
          }
          if ((await dialog.locator('[data-fk="turn-off"]').getAttribute('data-button-variant')) !== 'danger') fail(preset, 'Turn off is not the danger face');
          if ((await dialog.locator('[data-fk="turn-off"]').textContent())?.trim() !== 'Turn off') fail(preset, 'vocabulary: confirm action is not "Turn off"');
          await page.keyboard.press('Shift+Tab');
          if ((await activeFk()) !== 'turn-off') fail(preset, 'Tab leaves the confirm');
          await hitTargets('confirm');
          await card.locator('[data-dialog]').screenshot({ path: path.join(outdir, `${id}-${preset}-confirm-${width}.png`) });
          await page.keyboard.press('Escape');
          if ((await card.getAttribute('data-confirm')) !== 'false') fail(preset, 'Escape did not cancel');
          if ((await activeFk()) !== 'access') fail(preset, `focus after cancelling is on "${await activeFk()}", not the trigger`);
          if ((await stage()) !== STAGE[preset]) fail(preset, 'cancel changed the stage');
        }
      }

      // Publish from draft, changes or off lands on published, with a spinner on the way.
      if (STAGE[preset] !== 'published') {
        if (!(await click('[data-act="publish"]'))) fail(preset, 'no way to publish');
        else {
          if (!(await dialog.locator('[aria-busy="true"] .spin').count())) fail(preset, 'no spinner while publishing');
          await page.waitForTimeout(900);
          if ((await stage()) !== 'published') fail(preset, `publish left stage ${await stage()}`);
          if (!/Published/.test((await dialog.locator('[data-announce]').textContent()) || '')) fail(preset, 'publish was not announced');
        }
      }

      // Copy: the icon and the primary both copy; the primary says Copied for a moment.
      if (await click('[data-fk="primary"][data-act="copy"]')) {
        if (!(await state()).copied) fail(preset, 'primary Copy link did not copy');
        if ((await primary.textContent())?.trim() !== 'Copied') fail(preset, 'primary did not say Copied');
        await page.waitForTimeout(1700);
        if ((await state()).copied) fail(preset, 'Copied did not revert');
      }

      // Turn off by mouse, then Publish brings it back.
      const liveTrigger = dialog.locator('[data-access-trigger]');
      if (!(await liveTrigger.count()) || !(await liveTrigger.isEnabled())) fail(preset, 'no way to turn the link off after publishing');
      else {
        await liveTrigger.click(); clicks += 1;
        await click('[data-fk="item-off"]');
        if ((await card.getAttribute('data-confirm')) !== 'true') fail(preset, 'off item did not ask first');
        if (await click('[data-fk="turn-off"]')) {
          await page.waitForTimeout(900);
          if ((await stage()) !== 'unpublished') fail(preset, `off left stage ${await stage()}`);
          if (await dialog.locator('[data-act="copy"]:enabled').count()) fail(preset, 'copy still enabled after off');
          if (await dialog.locator('.d-chip a[href]').count()) fail(preset, 'link row still opens the page after off');
          if ((await dialog.locator('.f-band .v-status-word').textContent())?.trim() !== 'Off') fail(preset, 'band word after turning off is not "Off"');
          if (!/link is off/i.test((await dialog.locator('[data-announce]').textContent()) || '')) fail(preset, 'turning off was not announced');
          const fk = await activeFk();
          if (!['access', 'primary'].includes(fk || '')) fail(preset, `focus after turning off is on "${fk}"`);
        } else fail(preset, 'no Turn off in confirm');
        if (!(await click('[data-act="publish"]'))) fail(preset, 'no publish after off');
        else await page.waitForTimeout(900);
        if ((await stage()) !== 'published') fail(preset, `republish failed (${await stage()})`);
      }
    }
  }
  console.log(`${width}px: ${clicks} clicks across ${OPTIONS.length} finals x ${PRESETS.length} presets`);
  const stacked = rows.filter((r) => r.endsWith('stacked')).length;
  console.log(`${width}px: band beside the primary in ${rows.length - stacked}/${rows.length} footers, above it in ${stacked}`);
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
