const p=ctx.pages().find(p=>p.url().includes('/edit/'));console.log((await p.locator('body').ariaSnapshot()).slice(-4500));
