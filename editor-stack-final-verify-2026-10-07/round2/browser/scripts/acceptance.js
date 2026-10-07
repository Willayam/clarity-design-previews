const base='https://pr-1042.clarity-video.workers.dev',assert=require('assert/strict');
const get=async()=>await(await context.request.get(base+'/api/journey-pages/'+id)).json();
const fields=(j,k)=>j.data.blocks.find(b=>b.kind===k).fields;
const reset=async(fn)=>{const j=await get();fn(j.data);const r=await context.request.put(base+'/api/journey-pages/'+id,{data:{journey_page:j.data,base_revision:j.revision}});assert.equal(r.status(),200);await page.reload();await page.locator('[data-save-state=saved]').waitFor({state:'attached'});};
const reveal=async k=>{const g=sec(k).getByRole('group',{name:k==='hero'?'Hero media controls':'Story media controls'});await g.evaluate(e=>e.scrollIntoView({block:'center'}));await g.hover();await page.waitForTimeout(180);return g;};
const ownedMedia=[];page.on('response',async r=>{if(new URL(r.url()).pathname==='/api/tree/nodes'&&r.request().method()==='POST'&&r.ok()){const j=await r.json();ownedMedia.push(j.data.node);fs.writeFileSync(out+'/owned-media.json',JSON.stringify(ownedMedia,null,2));}});
try {
// Upload independent fixtures through the actual picker. Each selection saves on our page only.
for(const file of ['R2-short.png','R2-normal.png','R2-proof-1.pdf','R2-proof-2.pdf']){
 const k=file.endsWith('.pdf')?'document':'hero';await (k==='hero'?sec(k).getByRole('button',{name:'Overview media Add media',exact:true}):sec(k).getByRole('button').first()).click();await page.locator('input[type=file]').setInputFiles('/tmp/verify-land/round2/'+file);await page.waitForTimeout(3000);await page.keyboard.press('Escape');await saved('upload-'+file,j=>k==='hero'?!!fields(j,k).media.assetId:!!fields(j,k).url);await sec(k).getByRole('group').focus();await sec(k).getByRole('button',{name:'Remove',exact:true}).click();await saved('upload-clear-'+file,j=>k==='hero'?!fields(j,k).media.assetId:!fields(j,k).url);
}
for(const input of ['pointer','keyboard']){
 const activate=async l=>input==='pointer'?l.click({delay:80}):l.press('Enter');
 const choose=async n=>{const d=page.getByRole('dialog');await activate(d.getByRole('button',{name:new RegExp('^'+n+' '+n)}));await activate(d.getByRole('button',{name:/^(Select|Add 1 image|Add 1 logo)$/}));};
 for(const k of ['hero','story']){
  await test(input+'-'+k+'-image-add',async()=>{await activate(sec(k).getByRole('button',{name:k==='hero'?'Overview media Add media':'Add image or video',exact:true}));await choose('R2-short');await saved(input+'-'+k+'-image-add',j=>!!fields(j,k).media.assetId);});
  if(k==='story')for(const side of ['Right','Left','Right','Left'])await test(input+'-short-story-'+side,async()=>{const g=await reveal(k),t=g.getByRole('button',{name:side,exact:true});const hit=await t.evaluate(e=>{const b=e.getBoundingClientRect();return {bounds:b.toJSON(),hit:document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('button')?.outerHTML}});fs.writeFileSync(out+'/'+input+'-short-'+side+'-hit.json',JSON.stringify(hit,null,2));await shot('representative-'+input+'-short-'+side);if(input==='pointer'){await page.mouse.click(hit.bounds.x+hit.bounds.width/2,hit.bounds.y+hit.bounds.height/2);}else await activate(t);await saved(input+'-short-story-'+side,j=>fields(j,'story').mediaSide===side.toLowerCase());});
  await test(input+'-'+k+'-image-change',async()=>{const before=fields(await get(),k).media.assetId;await reveal(k);await activate(sec(k).getByRole('button',{name:'Edit',exact:true}));await choose('R2-normal');await saved(input+'-'+k+'-image-change',j=>!!fields(j,k).media.assetId&&fields(j,k).media.assetId!==before);});
  if(k==='hero'){fs.writeFileSync(out+'/'+input+'-hero-resizer-inventory.json',JSON.stringify({handles:await sec(k).locator('[data-slot=media-resize-handle]').count(),buttons:await sec(k).getByRole('button').allTextContents()}));}
  await test(input+'-'+k+'-image-remove',async()=>{await reveal(k);await activate(sec(k).getByRole('button',{name:'Remove',exact:true}));await saved(input+'-'+k+'-image-remove',j=>!fields(j,k).media.assetId);});
 }
 for(const k of ['hero','story'])await test(input+'-'+k+'-title',async()=>{const l=sec(k).locator('h1[contenteditable],h2[contenteditable]').first();if(input==='pointer')await l.click();else await l.focus();await l.fill(input+' round2 '+k);await l.press('Tab');await saved(input+'-'+k+'-title',j=>fields(j,k).title===input+' round2 '+k);assert.equal(await l.innerText(),input+' round2 '+k);});
 for(const side of ['Left','Center','Right'])await test(input+'-story-title-'+side,async()=>{await sec('story').locator('h2[contenteditable]').focus();await page.keyboard.press('Tab');await activate(page.locator('[data-slot=title-toolbar]').getByRole('button',{name:side,exact:true}).first());await saved(input+'-story-title-'+side,j=>fields(j,'story').titlePosition===({Left:'left',Center:'middle',Right:'right'}[side]));});
 await test(input+'-story-body',async()=>{const l=sec('story').locator('.ProseMirror');if(input==='pointer')await l.click();else await l.focus();await l.fill(input+' round2 story body');await l.press('Tab');await saved(input+'-story-body',j=>fields(j,'story').body.includes(input+' round2 story body'));assert.ok((await l.innerText()).includes(input+' round2 story body'));});
 for(const action of ['add','change','remove'])await test(input+'-document-'+action,async()=>{const before=fields(await get(),'document').url;const s=sec('document');if(action==='add')await activate(s.getByRole('button').first());else{await s.getByRole('group').focus();await activate(s.getByRole('button',{name:action==='change'?'Edit':'Remove',exact:true}));}if(action!=='remove')await choose(action==='add'?'R2-proof-1':'R2-proof-2');await saved(input+'-document-'+action,j=>action==='remove'?!fields(j,'document').url:!!fields(j,'document').url&&fields(j,'document').url!==before);});
 for(const k of ['gallery','logos']){
  await test(input+'-'+k+'-image-add',async()=>{await activate(k==='gallery'?sec(k).getByRole('button',{name:'Add images',exact:true}):sec(k).locator('[data-slot=logos-add]'));await choose('R2-short');await saved(input+'-'+k+'-image-add',j=>fields(j,k).images.length===1);});
  await test(input+'-'+k+'-image-remove',async()=>{const l=sec(k).getByRole('button',{name:k==='gallery'?'Remove image':'Remove logo 1',exact:true}).first();await l.locator('..').hover();await activate(l);await saved(input+'-'+k+'-image-remove',j=>fields(j,k).images.length===0);});
 }
 await test(input+'-hero-cta-add',async()=>{await sec('hero').locator('[data-slot=cta-row-editor]').hover();await activate(sec('hero').locator('[data-slot=cta-add]'));await page.keyboard.press('Escape');await saved(input+'-hero-cta-add',j=>!!fields(j,'hero').primaryCta.label);});
 await test(input+'-hero-cta-remove',async()=>{const c=await card(sec('hero'));await activate(c.getByRole('button',{name:'Remove button',exact:true}));await saved(input+'-hero-cta-remove',j=>!fields(j,'hero').primaryCta.label);});
}
// Short and normal media resize with real pointer drags and saved stop values.
await sec('story').getByRole('button',{name:'Add image or video',exact:true}).click();await pick('R2-short');await saved('resize-short-setup');
for(const shape of ['short','normal']){
 if(shape==='normal'){await reveal('story');await sec('story').getByRole('button',{name:'Edit',exact:true}).click();await pick('R2-normal');await saved('resize-normal-setup');}
 for(const side of ['left','right'])for(const dest of ['55','30',null])await test('resize-'+shape+'-'+side+'-'+(dest||'40'),async()=>{await reset(d=>{const f=d.blocks.find(b=>b.kind==='story').fields;f.mediaSide=side;f.mediaSize=dest==='55'?null:dest==='30'?'55':'30';});await reveal('story');const h=sec('story').locator('[data-slot=media-resize-handle]');const b=await h.boundingBox();const width=await sec('story').locator('[data-journey-content-media]').evaluate(e=>e.parentElement.getBoundingClientRect().width);const before=fields(await get(),'story').mediaSize;const delta=((Number(dest||40)-Number(before||40))/100)*width*(side==='left'?1:-1);await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+delta,b.y+b.height/2,{steps:18});await page.mouse.up();await saved('resize-'+shape+'-'+side+'-'+(dest||'40'),j=>fields(j,'story').mediaSize===dest);});
}
// Geometric sweep supplements saved-media cases. Alter only local image height, not stored data.
const sweep=[];
for(const side of ['left','right']){
 await reset(d=>{const f=d.blocks.find(b=>b.kind==='story').fields;f.mediaSide=side;f.mediaSize=null;});
 for(const height of Array.from({length:541},(_,i)=>60+i)){
  await sec('story').locator('[data-slot=media-resizer] img').evaluate((e,h)=>{e.style.height=h+'px';e.style.width='100%';e.style.objectFit='fill'},height);
  await sec('story').locator('[data-slot=media-resizer]').evaluate(e=>e.scrollIntoView({block:'center'}));
  const g=sec('story').getByRole('group',{name:'Story media controls'});await g.focus();
  const m=await sec('story').locator('[data-slot=media-resizer]').evaluate(e=>{const r=e.getBoundingClientRect(),h=e.querySelector('[data-slot=media-resize-handle]'),hb=h.getBoundingClientRect(),grip=h.firstElementChild.getBoundingClientRect();const buttons=[...e.querySelectorAll('[data-slot=media-overlay-toolbar] button')].map(b=>{const q=b.getBoundingClientRect();return {name:b.getAttribute('aria-label')||b.title||b.textContent,rect:q.toJSON(),blocked:[.15,.5,.85].flatMap(x=>[.15,.5,.85].map(y=>{const hit=document.elementFromPoint(q.x+x*q.width,q.y+y*q.height);return !(hit===b||b.contains(hit))})).some(Boolean)}});return {media:r.toJSON(),handle:hb.toJSON(),grip:grip.toJSON(),offset:(grip.y+grip.height/2)-(r.y+r.height/2),handleReachable:document.elementFromPoint(hb.x+hb.width/2,hb.y+hb.height/2)?.closest('button')===h,buttons}});
  sweep.push({side,height,...m});
  if([60,80,100,200,400,600].includes(height)){await sec('story').locator('[data-slot=media-resizer]').hover();await shot('representative-sweep-'+side+'-'+height);}
 }
}
fs.writeFileSync(out+'/height-sweep.json',JSON.stringify(sweep,null,2));results.push({name:'toolbar-height-sweep-60-through-600',status:sweep.every(x=>x.buttons.every(b=>!b.blocked)&&x.handleReachable)?'PASS':'FAIL',samples:sweep.length});results.push({name:'resize-grip-visual-centering',status:sweep.every(x=>Math.abs(x.offset)<=1)?'PASS':'FAIL',offsets:[...new Set(sweep.map(x=>x.offset))]});log(results.at(-1));
await page.reload();await page.locator('[data-save-state=saved]').waitFor({state:'attached'});await reveal('story');await sec('story').getByRole('button',{name:'Remove',exact:true}).click();await saved('resize-story-remove',j=>!fields(j,'story').media.assetId);
await eval('(async()=>{'+fs.readFileSync('/tmp/verify-land/scripts/video-land-tail.js','utf8')+'})()');
await eval('(async()=>{'+fs.readFileSync('/tmp/verify-land/scripts/rich-tail.js','utf8').replace("['story','form','pricing']","['story']")+'})()');
await eval('(async()=>{'+fs.readFileSync('/tmp/verify-land/scripts/reorder.js','utf8')+'})()');
await eval('(async()=>{'+fs.readFileSync('/tmp/verify-land/scripts/add-menu-tail.js','utf8').replace("[['Story','story'],['Client logos','logos'],['Gallery','gallery'],['Form','form'],['Document','document'],['FAQ','faq'],['Pricing','pricing'],['Summary','summary']]","[['Story','story']]")+'})()');
} finally {
 const cleanup=[];for(const n of ownedMedia){assert.ok(n.name.startsWith('R2-'));const r=await context.request.delete(base+'/api/tree/nodes/'+encodeURIComponent(n.id));const check=await context.request.get(base+'/api/tree/nodes/'+encodeURIComponent(n.id)+'/path');cleanup.push({id:n.id,name:n.name,deleteStatus:r.status(),getStatus:check.status()});}fs.writeFileSync(out+'/media-cleanup.json',JSON.stringify(cleanup,null,2));
}
