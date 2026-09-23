await page.goto('https://staging.clarity.video/__deploy-info');
for(let attempt=1;attempt<=2;attempt++){
const result=await page.evaluate(async()=>{
const start=Date.now();let stream;const v=document.createElement('video');v.autoplay=true;v.muted=true;v.playsInline=true;v.style='width:640px;height:480px;background:black';document.body.append(v);
const heading=document.createElement('h2');heading.textContent='Real camera probe: waiting up to 25 seconds for a frame';document.body.prepend(heading);
try{stream=await Promise.race([navigator.mediaDevices.getUserMedia({video:true,audio:true}),new Promise((_,r)=>setTimeout(()=>r(Error('getUserMedia timeout')),25000))]);const streamMs=Date.now()-start;v.srcObject=stream;v.play().catch(()=>{});let frames=0;let firstFrameMs=null;v.requestVideoFrameCallback(function cb(){frames++;firstFrameMs??=Date.now()-start;v.requestVideoFrameCallback(cb)});const waitStart=Date.now();while(Date.now()-waitStart<25000&&!frames)await new Promise(r=>setTimeout(r,100));const result={streamMs,firstFrameMs,frames,width:v.videoWidth,height:v.videoHeight,waitMs:Date.now()-waitStart,tracks:stream.getTracks().map(t=>({kind:t.kind,label:t.label,state:t.readyState}))};heading.textContent=JSON.stringify(result);return result;}catch(e){return {error:e.message,elapsedMs:Date.now()-start}}finally{stream?.getTracks().forEach(t=>t.stop())}
});log({cameraAttempt:attempt,...result});await shot('B-camera-probe-'+attempt);if(result.frames)break;await sleep(1500);
}
