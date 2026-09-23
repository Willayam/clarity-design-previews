await page.bringToFront();
await log({deploy:await (await page.request.get('https://staging.clarity.video/__deploy-info')).json()});
console.log(await page.locator('body').innerText());
await shot('00-login');
const p=await fs.readFile('.audit/acceptance-mux-macbook/preflight/media-preflight-cdp.mjs','utf8');
const probe=p.split('const probeSrc = `')[1].split('`;')[0];
await log({preflight:await page.evaluate(`(${probe})('camera')`)});
await shot('01-camera-preflight');
