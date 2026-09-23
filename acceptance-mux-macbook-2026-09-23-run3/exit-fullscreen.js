await page.getByRole('button',{name:'Fullscreen Run3 L-Safari',exact:true}).press('Enter');await sleep(300);log({exitByButton:await page.evaluate(()=>!document.fullscreenElement)});
