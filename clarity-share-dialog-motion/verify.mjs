// Runs the tour (the transition inventory in motion.js) for every motion
// option at 1440 and 390, with real mouse clicks, and asserts:
//   - no page errors, console errors, failed requests or non-2xx responses
//   - every step lands in the state its caption promises (checked in-page
//     against the DOM: rows shown or hidden, band tone, primary label, focus)
//   - during Publish from draft, Publish changes and Publish from off, the
//     primary's box moves no more than 1px (polled every frame)
//   - under prefers-reduced-motion: reduce the same tour lands the same states,
//     the primary still does not move, and no animation touches transform,
//     height, width or clip-path (Element.prototype.animate is audited)
//   - interrupting: the password switch pressed twice 80ms apart settles to a
//     closed field and the dialog's height of a fresh render; the access menu
//     pressed twice settles closed
//   - the 0.25x toggle quadruples the height animation's duration
//   - after every tour nothing is still animating and no row keeps an inline height
//   - videos/<option>-desktop.mp4 and -phone.mp4 exist and ffmpeg decodes a frame
// ?plant=<name> breaks one rule in motion.js; the script then passes only if
// that rule's check goes red. usage: node verify.mjs <url> <outdir>
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const [url, outdir] = process.argv.slice(2);
if (!url || !outdir) throw new Error('usage: node verify.mjs <url> <outdir>');
mkdirSync(outdir, { recursive: true });
const plant = new URL(url).searchParams.get('plant');
const LESSON_OF_PLANT = {
  shift: /primary moved/,
  'reduce-moves': /reduced motion still animates/,
};
if (plant && !LESSON_OF_PLANT[plant]) throw new Error(`unknown plant ${plant}`);
// Tour indexes of Publish from draft, Publish changes and Publish from off.
const PUBLISH_STEPS = new Set([1, 15, 17]);
const problems = [];
const browser = await chromium.launch();
const withUrl = (extra) => { const u = new URL(url); for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v); return u.toString(); };

const AUDIT = `(() => {
  const orig = Element.prototype.animate;
  window.__audit = [];
  Element.prototype.animate = function (kf, opts) {
    const frames = Array.isArray(kf) ? kf : [kf];
    const props = new Set();
    for (const f of frames) for (const [k, v] of Object.entries(f)) {
      if (k === 'transform' && (v === 'none' || v === 'translateX(-50%)')) continue;
      if (['offset', 'easing', 'composite', 'opacity'].includes(k)) continue;
      props.add(k);
    }
    const t = this.closest && this.closest('.x-cursor');
    if (props.size && !t) window.__audit.push({ id: opts && opts.id, props: [...props], tag: this.className && String(this.className).slice(0, 40) });
    return orig.call(this, kf, opts);
  };
})();`;

async function openPage(context, width, pageUrl, tag) {
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push(`${tag} pageerror ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${tag} console ${m.text()}`); });
  // A <video preload=metadata> aborts its own range request once it has the header.
  page.on('requestfailed', (r) => { if (!(/\.mp4$/.test(r.url()) && r.failure()?.errorText === 'net::ERR_ABORTED')) problems.push(`${tag} requestfailed ${r.url()} ${r.failure()?.errorText}`); });
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${tag} http ${r.status()} ${r.url()}`); });
  await page.goto(pageUrl);
  await page.waitForFunction(() => window.__motion, null, { timeout: 15000 }).catch(() => problems.push(`${tag} motion.js never ran`));
  await page.exposeFunction('__click', async (x, y) => { await page.mouse.click(x, y); });
  return page;
}

async function runTour(page, id, tag) {
  const result = await page.evaluate(async ([id, publishSteps]) => {
    const prim = () => document.querySelector(`#${id} [data-fk="primary"]`);
    let poll = null;
    const shifts = [];
    const problems = await window.__motion.tour(id, {
      hold: 120,
      click: (x, y) => window.__click(x, y),
      onStep: (i) => {
        if (!publishSteps.includes(i)) return;
        const el = prim();
        const r0 = el.getBoundingClientRect();
        const me = { i, max: 0, n: 0, on: true };
        poll = me;
        const tick = () => { if (!me.on) return; const r = el.getBoundingClientRect(); me.max = Math.max(me.max, Math.abs(r.top - r0.top), Math.abs(r.left - r0.left)); me.n++; requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      },
      onDone: (i) => { if (poll && poll.i === i) { poll.on = false; shifts.push({ step: i + 1, max: poll.max, frames: poll.n }); poll = null; } },
    });
    const leftovers = [...document.querySelectorAll(`#${id} .m-row:not([hidden])`)].filter((r) => r.style.height !== '').length;
    return { problems, shifts, leftovers, running: window.__motion.running(id).length };
  }, [id, [...PUBLISH_STEPS]]);
  for (const p of result.problems) problems.push(`${tag} ${p}`);
  for (const s of result.shifts) {
    if (s.frames < 20) problems.push(`${tag} step ${s.step}: primary polled only ${s.frames} frames`);
    if (s.max > 1) problems.push(`${tag} step ${s.step}: primary moved ${s.max.toFixed(1)}px during publish`);
  }
  if (result.leftovers) problems.push(`${tag} ${result.leftovers} rows keep an inline height after the tour`);
  if (result.running) problems.push(`${tag} ${result.running} animations still running after the tour`);
  return result;
}

for (const width of [1440, 390]) {
  const vh = width < 500 ? 844 : 900;
  const context = await browser.newContext({ viewport: { width, height: vh }, deviceScaleFactor: 1 });
  const all = await openPage(context, width, url, `${width}`);
  const ids = await all.evaluate(() => window.__motion.PROFILES);
  if (ids.length !== 4) problems.push(`${width} expected 4 options, got ${ids.length}`);
  if (!plant) await all.screenshot({ path: path.join(outdir, `page-${width}.png`), fullPage: true });
  await all.close();
  for (const id of ids) {
    const tag = `${width} ${id}`;
    const page = await openPage(context, width, withUrl({ only: id }), tag);
    const r = await runTour(page, id, tag);
    console.log(`${tag}: ${r.problems.length} step problems, shifts ${r.shifts.map((s) => `${s.step}:${s.max.toFixed(2)}px/${s.frames}f`).join(' ')}`);
    if (width === 1440) {
      // Interrupting: a second press mid-flight must settle to the same place.
      const fresh = await page.evaluate(async (id) => {
        window.__motion.dispatch(id, 'preset', 'published'); window.__motion.dispatch(id, 'open');
        await window.__motion.settle(id);
        return document.querySelector(`#${id} [data-dialog-root]`).getBoundingClientRect().height;
      }, id);
      const sw = await page.locator(`#${id} [data-fk="pw-switch"]`).boundingBox();
      await page.mouse.click(sw.x + sw.width / 2, sw.y + sw.height / 2);
      await page.waitForTimeout(80);
      await page.mouse.click(sw.x + sw.width / 2, sw.y + sw.height / 2);
      const after = await page.evaluate(async (id) => { await window.__motion.settle(id); const s = window.__motion.state(id); return { pwOn: s.pwOn, field: !document.querySelector(`#${id} [data-slot="pw-field"]`).hidden, h: document.querySelector(`#${id} [data-dialog-root]`).getBoundingClientRect().height }; }, id);
      if (after.pwOn || after.field) problems.push(`${tag} interrupted switch left the field ${after.field ? 'shown' : 'hidden'} with pwOn=${after.pwOn}`);
      if (Math.abs(after.h - fresh) > 1) problems.push(`${tag} interrupted switch left the dialog ${after.h}px tall, fresh render is ${fresh}px`);
      const acc = await page.locator(`#${id} [data-fk="access"]`).boundingBox();
      await page.mouse.click(acc.x + acc.width / 2, acc.y + acc.height / 2);
      await page.waitForTimeout(60);
      await page.mouse.click(acc.x + acc.width / 2, acc.y + acc.height / 2);
      const menu = await page.evaluate(async (id) => { await window.__motion.settle(id); return { menu: window.__motion.state(id).menu, el: !!document.querySelector(`#${id} [data-menu]`) }; }, id);
      if (menu.menu || menu.el) problems.push(`${tag} menu pressed twice stayed open`);
      // Slow motion quadruples every duration.
      const slow = await page.evaluate(async (id) => {
        window.__motion.setSpeed(id, 4);
        document.querySelector(`#${id} [data-fk="pw-switch"]`).click();
        await new Promise((r) => setTimeout(r, 50));
        const d = document.getAnimations().filter((a) => a.id === 'height').map((a) => a.effect.getTiming().duration);
        window.__motion.setSpeed(id, 1);
        return { d, base: window.__motion.timing(id, 'height') };
      }, id);
      if (!slow.d.length || slow.d.some((d) => Math.abs(d - slow.base * 4) > 1)) problems.push(`${tag} 0.25x gave height durations ${slow.d.join(',')}ms, wanted ${slow.base * 4}ms`);
    }
    await page.close();
  }
  await context.close();

  // Reduced motion: same tour, same states, nothing moves.
  const reduced = await browser.newContext({ viewport: { width, height: vh }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await reduced.addInitScript(AUDIT);
  for (const id of ids) {
    const tag = `${width} ${id} reduced`;
    const page = await openPage(reduced, width, withUrl({ only: id }), tag);
    const r = await runTour(page, id, tag);
    const audit = await page.evaluate(() => window.__audit);
    const moving = audit.filter((a) => a.props.some((p) => ['transform', 'height', 'width', 'clipPath', 'clip-path'].includes(p)));
    if (moving.length) problems.push(`${tag}: reduced motion still animates ${[...new Set(moving.map((m) => `${m.tag || m.id}:${m.props.join('+')}`))].join(' ')}`);
    console.log(`${tag}: ${r.problems.length} step problems, ${audit.length} animations, ${moving.length} moving`);
    await page.close();
  }
  await reduced.close();
}
await browser.close();

if (!plant) {
  const root = path.dirname(new URL(import.meta.url).pathname);
  for (const id of ['quiet', 'spring', 'directional', 'cascade']) for (const kind of ['desktop', 'phone']) {
    const f = path.join(root, 'videos', `${id}-${kind}.mp4`);
    if (!existsSync(f)) { problems.push(`video missing ${f}`); continue; }
    try { execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-frames:v', '1', '-f', 'null', '-']); }
    catch (e) { problems.push(`video does not decode ${f}: ${String(e.stderr || e.message).slice(0, 120)}`); }
    const probe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,pix_fmt,width,height', '-of', 'csv=p=0', f]).toString().trim();
    if (!/^h264,/.test(probe) || !/yuv420p/.test(probe)) problems.push(`video ${f} is ${probe}, wanted h264 yuv420p`);
    console.log(`video ${id}-${kind}: ${probe}`);
  }
}

if (plant) {
  const hit = problems.filter((p) => LESSON_OF_PLANT[plant].test(p));
  console.log(`planted "${plant}": ${hit.length} matching failures of ${problems.length}`);
  if (hit.length) { console.log(hit.slice(0, 4).join('\n')); console.log('red as planned'); process.exit(0); }
  console.log(problems.join('\n'));
  console.log(`planted "${plant}" was not caught`);
  process.exit(1);
}
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log('clean: every tour landed, the primary held still through every publish, reduced motion only fades, videos decode');
