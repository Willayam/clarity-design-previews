await shot('current');console.log(await page.locator('video').evaluateAll(vs=>vs.map(v=>({box:v.getBoundingClientRect().toJSON(),paused:v.paused,time:v.currentTime})).slice(0,3)));
