console.log(page.url());console.log((await page.locator('body').ariaSnapshot()).slice(-2500));log({full:await page.evaluate(()=>!!document.fullscreenElement)});
