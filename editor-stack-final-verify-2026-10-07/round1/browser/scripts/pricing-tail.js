globalThis.focusState=async()=>page.evaluate(()=>{const e=document.activeElement;return {tag:e.tagName,role:e.getAttribute('role'),label:e.getAttribute('aria-label'),text:e.textContent?.slice(0,70),slot:e.getAttribute('data-slot')}});
for(mode of ['branch']){
 await page.reload();await page.locator('[data-save-state=saved]').waitFor({state:'attached'});
 for(const input of ['pointer','keyboard']){
  await test(mode+'-'+input+'-incomplete-pricing-tab',async()=>{
   const j=await(await context.request.get('https://pr-1042.clarity-video.workers.dev/api/journey-pages/'+id)).json();const p=j.data.blocks.find(b=>b.kind==='pricing').fields.pricings[0];Object.assign(p,{title:'Tab plan',cta:'Incomplete buy',cta_link:''});await context.request.put('https://pr-1042.clarity-video.workers.dev/api/journey-pages/'+id,{data:{journey_page:j.data,base_revision:j.revision}});await page.reload();await page.locator('[data-save-state=saved]').waitFor({state:'attached'});
   if(mode==='main'){const l=page.locator('.accordion-section[data-section-kind=pricing]').getByLabel('CTA label',{exact:true}).first();if(input==='pointer')await l.click();else await l.focus();}
   else{const a=sec('pricing').getByRole('button',{name:'+ Add button',exact:true}).first();if(input==='pointer')await a.click();else await a.press('Enter');const l=sec('pricing').getByRole('textbox',{name:'Plan 1 button label',exact:true});await l.focus();}
   const stops=[await focusState()];for(let i=0;i<10;i++){await page.keyboard.press('Tab');await page.waitForTimeout(180);stops.push(await focusState());}
   fs.writeFileSync(out+'/'+mode+'-'+input+'-focus.json',JSON.stringify(stops,null,2));await shot(mode+'-'+input+'-tab');
   if(mode==='branch'&&!stops.some(s=>s.label?.startsWith('Duplicate plan')))throw Error('Forward Tab never reached Duplicate plan');
   if(mode==='branch'&&!stops.some(s=>s.label?.startsWith('Delete plan')))throw Error('Forward Tab never reached Delete plan');
   await page.keyboard.press('Escape');await saved(mode+'-'+input+'-incomplete-pricing-tab',j=>j.data.blocks.find(b=>b.kind==='pricing').fields.pricings[0].cta_link==='');
  });
 }
}
mode='branch';await page.reload();await page.locator('[data-save-state=saved]').waitFor({state:'attached'});
for(const width of [600,1280,1440,1920])for(const kind of ['pricing','hero']){
 await test(kind+'-viewport-'+width,async()=>{
 await page.setViewportSize({width,height:1000});await page.keyboard.press('Escape');
 const button=kind==='pricing'?sec(kind).getByRole('button',{name:'+ Add button',exact:true}).first():sec(kind).locator('[data-slot=cta-add]');await button.scrollIntoViewIfNeeded();
 // Scroll the editor's own container until the trigger is near the bottom edge.
 await button.evaluate(e=>{let p=e.parentElement;while(p&&!(p.scrollHeight>p.clientHeight&&/(auto|scroll)/.test(getComputedStyle(p).overflowY)))p=p.parentElement;const delta=e.getBoundingClientRect().bottom-930;if(p)p.scrollTop+=delta;else window.scrollBy(0,delta)});await page.waitForTimeout(250);if(kind==='hero')await sec('hero').locator('[data-slot=cta-row-editor]').hover();await button.hover();const anchor=await button.boundingBox();await button.click();await page.locator('[data-slot=cta-editor-card]').waitFor();await page.waitForTimeout(200);const card=await page.locator('[data-slot=cta-editor-card]').boundingBox(),link=await page.locator('[data-slot=cta-editor-card]').getByRole('textbox',{name:'Link',exact:true}).boundingBox();fs.writeFileSync(out+'/'+kind+'-viewport-'+width+'-bounds.json',JSON.stringify({anchor,card,link,viewport:page.viewportSize()},null,2));await shot(kind+'-viewport-'+width+'-open');if(card.y<0||card.y+card.height>1000||card.x<0||card.x+card.width>width)throw Error('Card outside viewport');await page.keyboard.press('Escape');await saved(kind+'-viewport-'+width);
 });
}
