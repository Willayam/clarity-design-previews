for(const p of ctx.pages())if(p.url().includes('staging.clarity.video/home')&&!(await p.getByRole('dialog').count()))await p.close();
