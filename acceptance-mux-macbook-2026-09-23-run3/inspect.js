await snap();await page.screenshot({path:dir+'/login-state.png',mask:[page.getByRole('textbox',{name:'Email',exact:true})]});
