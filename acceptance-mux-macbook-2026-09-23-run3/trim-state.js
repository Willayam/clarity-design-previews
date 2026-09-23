const p=ctx.pages().find(p=>p.url().includes('/home'));console.log(await p.getByRole('dialog').ariaSnapshot());
