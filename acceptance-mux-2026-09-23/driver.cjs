const {chromium}=require('playwright'); const fs=require('fs'); const readline=require('readline');
(async()=>{
global.fs=fs; global.out=__dirname; global.notes={};global.errors=[];global.net=[];
global.browser=await chromium.launch({channel:'chrome',headless:false,args:['--use-fake-ui-for-media-stream','--auto-select-desktop-capture-source=Entire screen']});
global.context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});global.page=await context.newPage();
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(/mux.com|files.clarity|\/api\//.test(r.url()))net.push({time:Date.now(),url:r.url().split('?')[0],status:r.status()})});
global.creds=Object.fromEntries(fs.readFileSync('.env.e2e.local','utf8').split('\n').filter(l=>/^E2E_QA_(EMAIL|PASSWORD)=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
global.shot=async n=>{await page.screenshot({path:out+'/'+n+'.png'});};global.save=()=>fs.writeFileSync(out+'/notes.json',JSON.stringify({notes,errors,net},null,2));global.say=t=>require('child_process').spawn('say',['-r','170',t]);
await page.goto('https://staging.clarity.video');console.log('READY',await page.locator('body').innerText());
readline.createInterface({input:process.stdin}).on('line',async line=>{try{console.log(await eval('(async()=>{'+line+'})()'));save()}catch(e){console.log(e.message);save()}});
})();
