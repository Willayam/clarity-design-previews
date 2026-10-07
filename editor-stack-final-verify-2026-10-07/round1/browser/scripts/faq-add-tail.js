
const base='https://pr-1042.clarity-video.workers.dev';
for(mode of ['branch'])for(const shape of ['ids','legacy','duplicate'])for(const input of ['pointer','keyboard']){
 await test(`${mode}-${shape}-${input}-add-open`,async()=>{
 const before=await(await context.request.get(base+'/api/journey-pages/'+id)).json();
 const faq=before.data.blocks.find(b=>b.kind==='faq');faq.fields.questions=[{question:'First question',answer:'First answer',seq_no:'1'},{question:'Second question',answer:'Second answer',seq_no:'2'}];
 if(shape==='ids')faq.fields.questions.forEach((q,i)=>q.id='row-'+i);if(shape==='duplicate')faq.fields.questions.forEach(q=>{q.id='same';q.seq_no='1';q.question='Duplicate';q.answer='Same answer'});
 const put=await context.request.put(base+'/api/journey-pages/'+id,{data:{journey_page:before.data,base_revision:before.revision}});if(!put.ok())throw Error('seed '+put.status());
 await page.reload();await page.locator('[data-save-state=saved]').waitFor({state:'attached'});
 const section=sec('faq');await section.scrollIntoViewIfNeeded();const details=section.locator('details');
 for(let i=0;i<2;i++)if(await details.nth(i).getAttribute('open')===null)await details.nth(i).locator('summary').press('Enter');
 const second=details.nth(1).locator('[data-journey-faq-answer] [data-slot=inline-text]');await second.focus();await second.press('ControlOrMeta+A');await second.pressSequentially('Pending '+shape+' '+input);
 const add=section.getByRole('button',{name:'+ Add question',exact:true});
 if(input==='pointer'){await section.hover();await add.click()}else{await add.focus();await add.press('Enter')}
 await page.waitForTimeout(300);const state=await details.evaluateAll(ds=>ds.map(d=>({open:d.open,text:d.textContent})));fs.writeFileSync(out+`/${mode}-${shape}-${input}-state.json`,JSON.stringify(state,null,2));await shot(`${mode}-${shape}-${input}-added`);
 if(!state[0].open||!state[1].open)throw Error('Existing answer closed on add');
 await saved(`${mode}-${shape}-${input}-add-open`,j=>{const q=j.data.blocks.find(b=>b.kind==='faq').fields.questions;return q.length===3&&q[1].answer==='Pending '+shape+' '+input});
 });
}
