const assert=require('assert/strict'),base='https://pr-1042.clarity-video.workers.dev';
const ownMedia=[];
const get=async()=>{const r=await context.request.get(base+'/api/journey-pages/'+id);assert.equal(r.status(),200);return r.json();};
const field=(j,k)=>j.data.blocks.find(b=>b.kind===k).fields;
const reset=async fn=>{const j=await get();fn(j.data);const r=await context.request.put(base+'/api/journey-pages/'+id,{data:{journey_page:j.data,base_revision:j.revision}});assert.equal(r.status(),200);await page.reload();await page.locator('[data-save-state=saved]').waitFor({state:'attached'});};
const emptyMedia={assetId:'',assetType:'',imageId:'',videoId:''};
const record=async(name,value)=>{fs.writeFileSync(out+'/'+name+'-ui.json',JSON.stringify(value,null,2));await shot('representative-'+name);};
try {
for(const input of ['pointer','keyboard'])for(const part of ['title','body']){
 const selector=part==='title'?'h2[contenteditable]':'.ProseMirror';
 await test(input+'-clear-story-'+part,async()=>{
  await reset(d=>Object.assign(d.blocks.find(b=>b.kind==='story').fields,{title:'Clear title',body:'<p>Clear body</p>',media:emptyMedia}));
  const l=sec('story').locator(selector);if(input==='pointer')await l.click();else await l.focus();await l.press('ControlOrMeta+A');await l.press('Backspace');await l.press('Tab');
  const j=await saved(input+'-clear-story-'+part,j=>field(j,'story')[part]==='');assert.equal((await l.innerText()).trim(),'');await record(input+'-clear-story-'+part,{api:field(j,'story')[part],rendered:await l.innerText()});
 });
 await test(input+'-empty-story-'+part,async()=>{
  await reset(d=>Object.assign(d.blocks.find(b=>b.kind==='story').fields,{title:'',body:'',media:emptyMedia}));
  const ghost=sec('story').getByRole('button',{name:part==='title'?'Section title':'Description',exact:true});if(input==='pointer')await ghost.click();else await ghost.press('Enter');
  const l=sec('story').locator(selector);await l.waitFor();await l.fill(input+' restored '+part);await l.press('Tab');
  const expected=input+' restored '+part;const j=await saved(input+'-empty-story-'+part,j=>field(j,'story')[part].includes(expected));assert.equal((await l.innerText()).trim(),expected);await record(input+'-empty-story-'+part,{api:field(j,'story')[part],rendered:await l.innerText()});
 });
}
await reset(d=>Object.assign(d.blocks.find(b=>b.kind==='story').fields,{title:'UI proof story',body:'<p>'+('Story copy for wrapping beside the image. '.repeat(25))+'</p>',media:emptyMedia,mediaWrap:false,mediaSize:null,mediaSide:'right'}));
await sec('story').getByRole('button',{name:'Add image or video',exact:true}).click();
const uploadResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/tree/nodes'&&r.request().method()==='POST'&&r.ok());
await page.locator('input[type=file]').setInputFiles('/tmp/verify-land/round2/R2-ui-short.png');
const uploaded=(await (await uploadResponse).json()).data.node;assert.equal(uploaded.name,'R2-ui-short');ownMedia.push(uploaded);fs.writeFileSync(out+'/owned-media.json',JSON.stringify(ownMedia,null,2));
await page.waitForTimeout(3000);await page.keyboard.press('Escape');const seeded=await saved('ui-story-image-seed',j=>!!field(j,'story').media.assetId);const image=field(seeded,'story').media;
const reveal=async()=>{const g=sec('story').getByRole('group',{name:'Story media controls'});await g.scrollIntoViewIfNeeded();await g.hover();return g;};
const assertUI=async(name,side,size,wrap)=>{
 const j=await saved(name,j=>field(j,'story').mediaSide===side&&field(j,'story').mediaSize===size&&field(j,'story').mediaWrap===wrap);
 await sec('story').locator('[data-slot=media-resizer] img').waitFor();
 await page.waitForFunction(()=>{const img=document.querySelector('[data-section-kind=story] [data-slot=media-resizer] img');return img&&img.complete&&img.naturalWidth>0;});
 await reveal();await page.waitForTimeout(350);
 const ui=await sec('story').evaluate(e=>{const column=e.querySelector('[data-journey-content-media]'),layout=e.querySelector('[data-journey-content-layout]'),img=column.querySelector('img');const rect=n=>n.getBoundingClientRect().toJSON();return {side:e.getAttribute('data-media-side'),wrap:e.getAttribute('data-media-wrap'),column:rect(column),layout:rect(layout),image:rect(img),naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,src:img.currentSrc,cssVariable:column.style.getPropertyValue('--media-size'),float:getComputedStyle(column).float,flexDirection:getComputedStyle(layout).flexDirection,buttons:[...e.querySelectorAll('[data-slot=media-overlay-toolbar] button')].map(b=>({title:b.title,label:b.getAttribute('aria-label'),text:b.textContent.trim(),pressed:b.getAttribute('aria-pressed')}))};});
 assert.equal(ui.side,side);assert.equal(ui.wrap,wrap?'true':null);assert.equal(ui.naturalWidth,640);assert.equal(ui.naturalHeight,100);assert.ok(ui.src);assert.equal(ui.cssVariable,size?size+'%':'');
 assert.ok(Math.abs(ui.column.width-ui.layout.width*Number(size||40)/100)<2,'Column width must match saved stop');
 assert.ok(Math.abs(ui.image.width/ui.image.height-6.4)<0.05,'Short image keeps its intrinsic aspect ratio');
 for(const [label,pct] of [['S','30'],['M',null],['L','55']])assert.equal(ui.buttons.find(b=>b.title===label)?.pressed,String(pct===size));
 assert.equal(ui.buttons.find(b=>b.title==='Wrap text')?.pressed,String(wrap));assert.equal(ui.buttons.find(b=>b.title===(side==='left'?'Left':'Right'))?.pressed,'true');
 if(wrap)assert.equal(ui.float,side);else assert.equal(ui.flexDirection,side==='left'?'row-reverse':'row');
 await record(name,{api:field(j,'story'),ui});
};
for(const side of ['left','right'])for(const [label,size] of [['S','30'],['M',null],['L','55']])for(const wrap of [false,true])await test('ui-'+side+'-'+label+'-wrap-'+wrap,async()=>{
 await reveal();await sec('story').getByRole('button',{name:side==='left'?'Left':'Right',exact:true}).click();
 await sec('story').getByRole('button',{name:label,exact:true}).click();const wrapControl=sec('story').getByRole('button',{name:'Wrap text',exact:true});if((await wrapControl.getAttribute('aria-pressed'))!==String(wrap))await wrapControl.click();
 await assertUI('ui-'+side+'-'+label+'-wrap-'+wrap,side,size,wrap);
});
const settledSweep=[];
for(const side of ['left','right']){
 await reset(d=>Object.assign(d.blocks.find(b=>b.kind==='story').fields,{mediaSide:side,mediaWrap:false,mediaSize:null}));
 for(const requestedHeight of [60,80,100,120,200,400,540]){
  await sec('story').locator('[data-slot=media-resizer] img').evaluate((img,h)=>{img.style.height=h+'px';img.style.width='100%';img.style.objectFit='fill';},requestedHeight);
  await sec('story').locator('[data-slot=media-resizer]').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
  await reveal();await page.waitForTimeout(200);
  const geometry=await sec('story').locator('[data-slot=media-resizer]').evaluate(e=>{
   const media=e.getBoundingClientRect(),handle=e.querySelector('[data-slot=media-resize-handle]'),hb=handle.getBoundingClientRect(),grip=handle.firstElementChild.getBoundingClientRect();
   const describe=hit=>hit?{tag:hit.tagName,slot:hit.getAttribute('data-slot'),button:hit.closest('button')?.outerHTML,html:hit.outerHTML.slice(0,1400)}:null;
   const buttons=[...e.querySelectorAll('[data-slot=media-overlay-toolbar] button')].map(button=>{const rect=button.getBoundingClientRect();const points=[.15,.5,.85].flatMap(x=>[.15,.5,.85].map(y=>{const point={x:rect.x+x*rect.width,y:rect.y+y*rect.height};const hit=document.elementFromPoint(point.x,point.y);return {...point,blocked:!(hit===button||button.contains(hit)),hit:describe(hit)};}));return {name:button.getAttribute('aria-label')||button.title||button.textContent,rect:rect.toJSON(),visibility:getComputedStyle(button).visibility,points};});
   const hit=document.elementFromPoint(hb.x+hb.width/2,hb.y+hb.height/2);return {media:media.toJSON(),handle:hb.toJSON(),grip:grip.toJSON(),offset:grip.y+grip.height/2-media.y-media.height/2,handleReachable:hit===handle||handle.contains(hit),handleHit:describe(hit),buttons};
  });
  settledSweep.push({side,requestedHeight,...geometry});await record('settled-sweep-'+side+'-'+requestedHeight,settledSweep.at(-1));
 }
}
fs.writeFileSync(out+'/settled-height-sweep.json',JSON.stringify(settledSweep,null,2));
results.push({name:'settled-toolbar-and-resize-hit-tests',status:settledSweep.every(s=>s.handleReachable&&s.buttons.every(b=>b.points.every(p=>!p.blocked)))?'PASS':'FAIL',samples:settledSweep.length});log(results.at(-1));
results.push({name:'settled-visual-centering',status:settledSweep.every(s=>Math.abs(s.offset)<=1)?'PASS':'FAIL',offsets:[...new Set(settledSweep.map(s=>s.offset))]});log(results.at(-1));
await page.reload();await page.locator('[data-save-state=saved]').waitFor({state:'attached'});
await reset(d=>{d.blocks.find(b=>b.kind==='logos').fields.images=[{image_id:image.assetId}];});
for(const input of ['pointer','keyboard'])for(const [label,key,value] of [['Rolling','variant','rolling'],['Static','variant','static'],['Muted','logoColor','muted'],['Full color','logoColor','full'],['Auto','logoColor','']])await test(input+'-logos-corrected-'+label,async()=>{
 const settings=sec('logos').getByRole('button',{name:'Logo settings',exact:true});if(input==='pointer')await settings.click();else await settings.press('Enter');
 const radio=page.locator('[data-slot=logos-settings-card]').getByRole('radio',{name:label,exact:true});if(input==='pointer')await radio.click();else await radio.press('Space');await page.keyboard.press('Escape');
 await saved(input+'-logos-corrected-'+label,j=>field(j,'logos')[key]===value);
 const settingsAgain=sec('logos').getByRole('button',{name:'Logo settings',exact:true});if(input==='pointer')await settingsAgain.click();else await settingsAgain.press('Enter');
 assert.equal(await page.locator('[data-slot=logos-settings-card]').getByRole('radio',{name:label,exact:true}).getAttribute('aria-checked'),'true');
 await record(input+'-logos-corrected-'+label,{key,value,checked:true});await page.keyboard.press('Escape');
});
} finally {
 const checks=[];for(const n of ownMedia){const r=await context.request.delete(base+'/api/tree/nodes/'+encodeURIComponent(n.id));const after=await context.request.get(base+'/api/tree/nodes/'+encodeURIComponent(n.id)+'/path');checks.push({id:n.id,name:n.name,deleteStatus:r.status(),getStatus:after.status()});}
 fs.writeFileSync(out+'/media-cleanup.json',JSON.stringify(checks,null,2));assert.ok(checks.every(c=>c.deleteStatus===200&&c.getStatus===404),'Owned media cleanup must succeed');
}
