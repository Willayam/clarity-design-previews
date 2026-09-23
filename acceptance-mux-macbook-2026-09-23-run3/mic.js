await page.getByRole('menuitem',{name:'MacBook Pro Microphone',exact:true}).click();await sleep(500);log({microphone:await page.getByRole('button',{name:/^Microphone:/}).textContent()});
