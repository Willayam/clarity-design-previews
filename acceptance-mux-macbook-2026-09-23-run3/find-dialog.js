for(const p of ctx.pages())if(p.url().includes('staging'))console.log(p.url(),await p.getByRole('dialog').count());
