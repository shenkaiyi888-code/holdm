const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--host-resolver-rules=MAP terminal.local 127.0.0.1','--no-proxy-server']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:740},isMobile:true,hasTouch:true});
  await page.addInitScript(()=>{localStorage.setItem('holdem.auto','0');localStorage.setItem('holdem.sound','1');});
  await page.goto('http://terminal.local:4173/?selftest');await page.frameLocator('#game').locator('#stPlay').click();const frame=page.frames()[1];
  await frame.evaluate(()=>{__holdm.freeze();document.querySelectorAll('#fx .fly').forEach(el=>el.getAnimations().forEach(a=>a.finish()));});
  const rendered=await frame.evaluate(async()=>{
   const render=async(phone=false)=>{
    const context=new OfflineAudioContext(1,Math.ceil(44100*.42),44100),output=context.createGain();output.gain.value=.55;
    if(phone){const high=context.createBiquadFilter(),low=context.createBiquadFilter();high.type='highpass';high.frequency.value=350;low.type='lowpass';low.frequency.value=3500;output.connect(high).connect(low).connect(context.destination);}
    else output.connect(context.destination);
    __holdm.checkSound(context,output,0);return Array.from((await context.startRendering()).getChannelData(0));
   };
   const raw=await render(),phone=await render(true);
   const rms=(data,from,to)=>{const a=Math.floor(from*44100),b=Math.floor(to*44100);return Math.sqrt(data.slice(a,b).reduce((n,x)=>n+x*x,0)/(b-a));};
   const metrics=data=>({peak:Math.max(...data.map(Math.abs)),first:rms(data,0,.09),second:rms(data,.115,.205),gap:rms(data,.095,.11),tail:rms(data,.29,.41)});
   return{raw,metrics:{full:metrics(raw),phoneBand:metrics(phone),sampleRate:44100}};
  });
  for(const m of [rendered.metrics.full,rendered.metrics.phoneBand]){
   assert.ok(m.peak<.9,'Check sound must not clip');assert.ok(m.first>.002&&m.second>.002,'Both taps must survive the phone-speaker band');
   assert.ok(m.gap<Math.min(m.first,m.second)*.1,'The two knocks need a quiet gap');assert.ok(m.tail<.0001,'The sound should end quietly');
  }
  const pcm=Buffer.alloc(rendered.raw.length*2);rendered.raw.forEach((v,i)=>pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),i*2));
  const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(44100,24);header.writeUInt32LE(88200,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
  fs.writeFileSync(path.join(__dirname,'../artifacts/check-sound.wav'),Buffer.concat([header,pcm]));
  await frame.locator('#bMenu').click();await frame.locator('#bMenu').click();
  const resume=await frame.evaluate(async()=>{
   __holdm.freeze();const context=__holdm.audio;await context.resume();await context.suspend();
   const original=context.resume.bind(context),events=[];document.addEventListener('holdm:sound',e=>events.push(e.detail.kind));
   context.resume=()=>new Promise((resolve,reject)=>setTimeout(()=>original().then(resolve,reject),45));
   __holdm.sfx('check');const before=events.length;await new Promise(r=>setTimeout(r,110));const after=events.filter(k=>k==='check').length;
   events.length=0;await context.suspend();__holdm.sfx('check');
   const toggle=document.getElementById('optSound');toggle.checked=false;toggle.dispatchEvent(new Event('change'));
   await new Promise(r=>setTimeout(r,110));const muted=events.length;
   context.resume=original;toggle.checked=true;toggle.dispatchEvent(new Event('change'));
   return{before,after,muted};
  });assert.deepEqual(resume,{before:0,after:1,muted:0});
  const report={...rendered.metrics,resume,wav:'artifacts/check-sound.wav'};
  fs.writeFileSync(path.join(__dirname,'../artifacts/check-sound-verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
