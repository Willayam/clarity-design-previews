import fs from 'node:fs';import sharp from 'sharp';
const dir='.audit/acceptance-mux-macbook-run3';
const masks={
'C-screen-preview.png':[[.30,.075,.63,.51]],'C-screen-recording.png':[[.30,.075,.63,.51]],'C-screen-stopped.png':[[.24,.05,.75,.64]],
'C-screen-playable.png':[[.23,.24,.77,.76]],'D-composite-preview.png':[[.49,.10,.48,.43]],
'D-composite-playable.png':[[.16,.38,.84,.62]],'B-camera25-playable.png':[[.16,.30,.84,.70]],'E-long-playable.png':[[.16,.30,.84,.70]],
'I-download-complete.png':[[.16,.30,.84,.70]],'current.png':[[.23,0,.77,1]],
'Run3-C-screen-fullscreen.png':[[.03,0,.94,.94]],'Run3-C-screen-final-fullscreen.png':[[.04,0,.92,.94]],
'H-statistics.png':[[.758,.32,.242,.24],[.252,.565,.108,.112]],
'L-safari-finish.png':[[0,0,1,.134]],'L-safari-playing.png':[[0,0,1,.134]],
};
for(const [name,rects] of Object.entries(masks)){const p=dir+'/'+name;if(!fs.existsSync(p))continue;const {width:w,height:h}=await sharp(p).metadata();const svg=`<svg width="${w}" height="${h}">${rects.map(([x,y,ww,hh])=>`<rect x="${Math.floor(x*w)}" y="${Math.floor(y*h)}" width="${Math.ceil(ww*w)}" height="${Math.ceil(hh*h)}" fill="#20242d"/>`).join('')}</svg>`;const out=await sharp(p).composite([{input:Buffer.from(svg)}]).png().toBuffer();fs.writeFileSync(p,out);}
fs.writeFileSync(dir+'/redactions.json',JSON.stringify({reason:'Unrelated private screen content, browser bookmarks and viewer location removed before publication. Test camera images are included as requested.',files:Object.keys(masks)},null,2));
const secrets=fs.readFileSync('.env.e2e.local','utf8').split('\n').filter(l=>/^E2E_QA_(EMAIL|PASSWORD)=/.test(l)).map(l=>l.slice(l.indexOf('=')+1).trim().replace(/^['"]|['"]$/g,''));let count=0;for(const f of fs.readdirSync(dir).filter(f=>/\.(js|mjs|json|jsonl|txt|md|html)$/.test(f))){const p=dir+'/'+f;let s=fs.readFileSync(p,'utf8');for(const secret of secrets)if(secret&&s.includes(secret)){s=s.replaceAll(secret,'[REDACTED]');count++}fs.writeFileSync(p,s)}console.log('Public evidence redacted; secret substitutions:',count);
