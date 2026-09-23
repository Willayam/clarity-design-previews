import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const pairs = readFileSync('/tmp/before-after.tsv', 'utf8').trim().split('\n').map((l) => l.split('\t')).filter(([k]) => k && k !== 'urs4kc' && k !== '2ssmnc');
const browser = await chromium.launch();
const rows = [];
for (const [key, vid, who] of pairs) {
  const row = { key, who, vid };
  for (const [side, base] of [['before', 'https://clarity.video'], ['after', 'https://pr-767.clarity-video.workers.dev']]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    try {
      await page.goto(`${base}/page/${key}?x=${Date.now()}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `/tmp/before-after/${key}-${side}-1-poster.png` });
      const kind = await page.evaluate(() => document.querySelector('mux-player') ? 'mux-player' : document.querySelector('video[src]') ? 'video' : 'none');
      const clicked = await page.evaluate(() => { const b = document.querySelector('.lp-play-button, [data-journey-video-preview-trigger]'); if (b) { b.click(); return true; } return false; });
      if (!clicked) await page.evaluate(() => { const p = document.querySelector('mux-player, video'); p && p.play && p.play().catch(() => {}); });
      await page.waitForTimeout(4000);
      const t = await page.evaluate(() => { const p = document.querySelector('mux-player, video'); return p ? Number(p.currentTime).toFixed(1) : null; });
      await page.mouse.move(640, 400); await page.waitForTimeout(400);
      await page.screenshot({ path: `/tmp/before-after/${key}-${side}-2-playing.png` });
      row[side] = { kind, t };
    } catch (e) { row[side] = { error: String(e.message).slice(0, 80) }; }
    await ctx.close();
  }
  rows.push(row); console.log(JSON.stringify(row));
}
await browser.close();
writeFileSync('/tmp/before-after/rows.json', JSON.stringify(rows));
