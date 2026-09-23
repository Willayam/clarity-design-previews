import { chromium } from 'playwright';
import fs from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
const dir='.audit/acceptance-mux-macbook-run3';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9333');
const ctx=browser.contexts()[0];const page=ctx.pages().find(p=>p.url().includes('staging.clarity.video/record'))||ctx.pages().find(p=>p.url().includes('staging.clarity.video/edit/'))||ctx.pages().find(p=>p.url().includes('staging.clarity.video/home?library=videos'))||ctx.pages().find(p=>p.url().includes('staging.clarity.video'))||await ctx.newPage();
const log=x=>{console.log(JSON.stringify(x));fs.appendFileSync(dir+'/notes.jsonl',JSON.stringify({at:new Date().toISOString(),...x})+'\n')};
const shot=async(name)=>{await page.screenshot({path:dir+'/'+name+'.png',mask:[page.locator('input')]});log({screenshot:name+'.png'})};
const snap=async()=>console.log((await page.locator('body').ariaSnapshot()).replace(/      - text: .*/g,'      - text: [redacted]'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{await eval('(async()=>{'+fs.readFileSync(process.argv[2],'utf8')+'})()');}catch(e){log({error:e.message});process.exitCode=1;}finally{await browser.close();}
