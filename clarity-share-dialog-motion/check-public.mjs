// After publishing: every video answers HEAD 200 as video/mp4, ffmpeg decodes
// its first frame over HTTP, and the page at 390 loads each video's metadata.
// usage: node check-public.mjs <public base url ending in />
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
const base = process.argv[2];
if (!base) throw new Error('usage: node check-public.mjs <url/>');
const problems = [];
for (const id of ['quiet', 'spring', 'directional', 'cascade']) for (const kind of ['desktop', 'phone']) {
  const u = `${base}videos/${id}-${kind}.mp4`;
  const res = await fetch(u, { method: 'HEAD' });
  const type = res.headers.get('content-type');
  if (res.status !== 200) problems.push(`HEAD ${res.status} ${u}`);
  if (!/video\/mp4/.test(type || '')) problems.push(`${u} content-type ${type}`);
  try { execFileSync('ffmpeg', ['-v', 'error', '-i', u, '-frames:v', '1', '-f', 'null', '-'], { timeout: 60000 }); }
  catch (e) { problems.push(`first frame did not decode ${u}: ${String(e.stderr || e.message).slice(0, 120)}`); }
  console.log(`${id}-${kind}: HEAD ${res.status} ${type} ${res.headers.get('content-length')} bytes, first frame decoded`);
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => problems.push(`pageerror ${e.message}`));
await page.goto(base + 'index.html');
await page.waitForFunction(() => window.__motion);
const meta = await page.evaluate(() => Promise.all([...document.querySelectorAll('video')].map((v) => new Promise((resolve) => {
  const done = () => resolve({ src: v.getAttribute('src'), w: v.videoWidth, h: v.videoHeight, d: v.duration, state: v.readyState });
  if (v.readyState >= 1) return done();
  v.addEventListener('loadedmetadata', done, { once: true });
  v.addEventListener('error', () => resolve({ src: v.getAttribute('src'), error: v.error && v.error.code }), { once: true });
  setTimeout(() => resolve({ src: v.getAttribute('src'), timeout: true, state: v.readyState }), 20000);
}))));
for (const m of meta) {
  if (m.error || m.timeout || !m.w) problems.push(`video metadata ${JSON.stringify(m)}`);
  else console.log(`390 ${m.src}: ${m.w}x${m.h} ${m.d.toFixed(1)}s`);
}
await page.screenshot({ path: 'public-390.png', fullPage: false });
await browser.close();
if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
console.log('public page: all videos answer 200, decode and load metadata at 390');
