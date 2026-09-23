for(const p of ctx.pages()){console.log(p.url());if(p.url().includes('/home'))console.log((await p.locator('main').ariaSnapshot()).slice(0,4000))}
