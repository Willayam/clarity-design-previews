for(const p of ctx.pages()){if(p.url().includes('/edit/')){console.log(p.url());console.log((await p.locator('body').ariaSnapshot()).slice(-10000));}}
