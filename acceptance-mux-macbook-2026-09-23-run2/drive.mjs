import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
const dir='.audit/acceptance-mux-macbook-run2';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9333');
const ctx=browser.contexts()[0];
const page=ctx.pages().find(p=>p.url().includes('staging.clarity.video')) ?? await ctx.newPage();
page.setDefaultTimeout(12000);
const log=async (v)=>{console.log(JSON.stringify(v));await fs.appendFile(`${dir}/notes.jsonl`,JSON.stringify({at:new Date().toISOString(),...v})+'\n');};
const shot=async(name)=>{await page.screenshot({path:`${dir}/${name}.png`});};
try {await eval(`(async()=>{${await fs.readFile(process.argv[2],'utf8')}\n})()`);}catch(e){console.error(e.message);process.exitCode=1;}finally{process.exit(process.exitCode||0);}
