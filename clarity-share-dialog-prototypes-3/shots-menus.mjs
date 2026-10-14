// Screenshots every variation with its Unpublish control revealed (menu open
// or switch in view) and then with the confirm showing, at 390 and 1440.
// usage: node shots-menus.mjs <url> <outdir>
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const [url, outdir] = process.argv.slice(2);
mkdirSync(outdir, { recursive: true });
const browser = await chromium.launch();
for (const width of [390, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 900 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  const { OPTIONS, REF } = await page.evaluate(() => window.__proto);
  for (const id of OPTIONS) {
    if (REF.includes(id)) continue;
    const card = page.locator(`#${id}`);
    const dialog = card.locator('[data-dialog]');
    await card.locator('[data-presets] [data-arg="published"]').click();
    const trigger = dialog.locator('[data-act="menu"]');
    if (await trigger.count()) await trigger.first().click();
    await dialog.screenshot({ path: path.join(outdir, `${id}-menu-${width}.png`) });
    await dialog.locator('[data-act="ask-off"]:visible').first().click();
    await dialog.screenshot({ path: path.join(outdir, `${id}-confirm-${width}.png`) });
    await dialog.locator('[data-act="cancel-off"]').click();
  }
  await page.close();
}
await browser.close();
console.log('menu and confirm shots written to', outdir);
