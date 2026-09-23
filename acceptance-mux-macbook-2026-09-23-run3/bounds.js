const c=await ctx.newCDPSession(page);log({window:await c.send('Browser.getWindowForTarget')});
