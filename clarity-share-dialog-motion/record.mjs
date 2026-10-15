// Records the tour of every option at 1440 and 390 with Playwright, crops the
// recording to the stage and converts it to H.264 yuv420p so it plays on an
// iPhone. Writes videos/<option>-<desktop|phone>.mp4 and a poster jpg.
// usage: node record.mjs [option ...]
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { serve } from './serve.mjs';

const root = path.dirname(new URL(import.meta.url).pathname);
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['quiet', 'spring', 'directional', 'cascade'];
mkdirSync(path.join(root, 'videos'), { recursive: true });
const { server, url } = await serve(root);
const browser = await chromium.launch();
const even = (n) => Math.round(n / 2) * 2;
for (const id of ids) for (const [kind, width, height] of [['desktop', 1440, 900], ['phone', 390, 844]]) {
  const dir = mkdtempSync(path.join(tmpdir(), 'u08-motion-'));
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, recordVideo: { dir, size: { width, height } } });
  const page = await context.newPage();
  page.on('pageerror', (e) => { throw new Error(`${id} ${kind} pageerror ${e.message}`); });
  await page.goto(`${url}index.html?only=${id}`);
  await page.waitForFunction(() => window.__motion && document.fonts.status === 'loaded');
  await page.exposeFunction('__click', async (x, y) => { await page.mouse.click(x, y); });
  await page.waitForTimeout(600);
  const box = await page.evaluate((id) => window.__motion.stageBox(id), id);
  const t0 = Date.now();
  const problems = await page.evaluate((id) => window.__motion.tour(id, { hold: 1100, click: (x, y) => window.__click(x, y) }), id);
  await page.waitForTimeout(1200);
  const seconds = ((Date.now() - t0) / 1000).toFixed(1);
  const video = page.video();
  await context.close();
  const webm = await video.path();
  const out = path.join(root, 'videos', `${id}-${kind}.mp4`);
  const crop = `${even(box.width)}:${even(box.height)}:${even(box.x)}:${even(box.y)}`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', webm, '-vf', `crop=${crop}`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', '-an', out]);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', '2', '-i', out, '-frames:v', '1', '-q:v', '4', out.replace(/\.mp4$/, '.jpg')]);
  rmSync(dir, { recursive: true, force: true });
  console.log(`${id} ${kind}: tour ${seconds}s, ${problems.length} problems, crop ${crop} -> ${path.relative(root, out)}`);
  if (problems.length) console.log(problems.join('\n'));
}
await browser.close();
server.close();
