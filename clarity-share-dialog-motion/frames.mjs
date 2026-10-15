// Contact sheet of a transition at 0.25x: 8 frames, 160ms apart, tiled 4x2.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { serve } from './serve.mjs';
const [id, what = 'publish', widthArg = '1440'] = process.argv.slice(2);
const width = Number(widthArg);
const { server, url } = await serve(process.cwd());
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: width < 500 ? 844 : 900 } });
await page.goto(url + 'index.html?only=' + id);
await page.waitForFunction(() => window.__motion);
await page.waitForTimeout(300);
const preset = { publish: 'draft', off: 'published', password: 'published', changes: 'changes', copy: 'published', open: 'changes' }[what];
await page.evaluate(([id, preset]) => { window.__motion.setSpeed(id, 4); window.__motion.dispatch(id, 'preset', preset); window.__motion.dispatch(id, 'open'); }, [id, preset]);
await page.waitForTimeout(2200);
const click = async (fk) => { const b = await page.locator(`#${id} [data-fk="${fk}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
const stage = page.locator(`#${id} [data-stage]`);
let lead = 0;
if (what === 'publish' || what === 'changes') { await click('primary'); lead = 700; }
if (what === 'off') { await click('access'); await page.waitForTimeout(1400); await click('item-off'); await page.waitForTimeout(1400); await click('turn-off'); lead = 700; }
if (what === 'password') { await click('pw-switch'); }
if (what === 'copy') { await click('copy-icon'); lead = 100; }
if (what === 'open') { await page.evaluate((id) => window.__motion.dispatch(id, 'close'), id); await page.waitForTimeout(1200); await click('opener'); }
await page.waitForTimeout(lead);
const files = [];
for (let i = 0; i < 8; i++) { const f = `sheet-${id}-${what}-${width}-${i}.png`; await stage.screenshot({ path: f }); files.push(f); await page.waitForTimeout(160); }
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...files.flatMap((f) => ['-i', f]), '-filter_complex', `${files.map((_, i) => `[${i}:v]`).join('')}xstack=inputs=8:layout=0_0|w0_0|w0+w1_0|w0+w1+w2_0|0_h0|w0_h0|w0+w1_h0|w0+w1+w2_h0[v]`, '-map', '[v]', `sheet-${id}-${what}-${width}.png`]);
for (const f of files) execFileSync('rm', [f]);
console.log(`sheet-${id}-${what}-${width}.png`);
await browser.close(); server.close();
