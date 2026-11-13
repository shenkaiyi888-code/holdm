const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const root=process.env.HOLDM_TEST_URL||'http://terminal.local:4173';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--host-resolver-rules=MAP terminal.local 127.0.0.1','--no-proxy-server']});
 const report={cases:[],errors:[]};
 try{
  for(const [w,h] of [[390,740],[320,568],[360,640],[390,844],[768,1024],[1024,768],[1440,900],[844,390]])for(const n of [6,8]){
   const c=await browser.newContext({viewport:{width:w,height:h},isMobile:w<1100,hasTouch:w<1100,deviceScaleFactor:1});
   await c.addInitScript(n=>{localStorage.setItem('holdem.seats',String(n));localStorage.setItem('holdem.auto','0');localStorage.setItem('holdem.sound','0');},n);
   const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(root+'/?selftest');await p.frameLocator('#game').locator('#stPlay').click();const f=p.frames()[1];
   await f.evaluate(()=>{__holdm.freeze();__holdm.G.players.forEach(p=>p.human=true);document.querySelectorAll('#fx .fly').forEach(el=>el.getAnimations().forEach(a=>a.finish()));});await p.waitForTimeout(1600);
   const result=await f.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};
    const overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1;
    const faces=[...document.querySelectorAll('.seat .pod,#bCourtDealer')].map(rect).filter(r=>r.w&&r.h);
    const table=rect(document.querySelector('.felt'));
    const snapshot=()=>{const G=__holdm.G;return JSON.stringify({hand:G.handNo,board:G.board,chips:G.players.map(p=>p.chips),hands:G.players.map(p=>p.hand)})};
    const before=snapshot();__holdm.animateDeal();
    const flights=[...document.querySelectorAll('#fx .fly')].filter(e=>e.querySelector('.card'));
    const landings=[...document.querySelectorAll('#arena>.seat .hole .card')].map(rect);
    const collisions=[],starts=[],queued=[];
    for(const [index,el] of flights.entries()){
     const a=el.getAnimations()[0],timing=a.effect.getTiming(),frames=a.effect.getKeyframes();a.pause();
     if(timing.delay>0){a.currentTime=timing.delay/2;queued.push({index,opacity:Number(getComputedStyle(el).opacity)});}
     a.currentTime=timing.delay;const start=rect(el);starts.push({x:start.x+start.w/2,y:start.y+start.h/2});
     const samples=new Set(Array.from({length:41},(_,i)=>i/40));frames.forEach(k=>samples.add(k.computedOffset));
     for(const progress of samples){
      a.currentTime=timing.delay+timing.duration*progress;const r=rect(el);
      for(const face of faces)if(overlap(r,face))collisions.push({index,progress,card:r,face});
     }
     a.currentTime=timing.delay+timing.duration;const r=rect(el),x=r.x+r.w/2,y=r.y+r.h/2;
     if(!landings.some(t=>Math.abs(t.x+t.w/2-x)<1&&Math.abs(t.y+t.h/2-y)<1))collisions.push({index,wrongLanding:{x,y}});
    }
    const retained=snapshot()===before;document.querySelectorAll('#fx .fly').forEach(el=>el.getAnimations().forEach(a=>a.finish()));
    const r=rect(document.querySelector('.deal-origin'));
    return{flights:flights.length,starts,queued,collisions,table,origin:{x:r.x+r.w/2,y:r.y+r.h/2},stateRetained:retained};
   });
   assert.equal(result.flights,n*2);assert.ok(result.stateRetained);
   for(const start of result.starts){assert.ok(start.x>result.table.x&&start.x<result.table.x+result.table.w&&start.y>result.table.y&&start.y<result.table.y+result.table.h,JSON.stringify({message:'Cards must originate at the table, away from the dealer face',w,h,n,start,table:result.table}));assert.ok(Math.abs(start.x-result.origin.x)<1&&Math.abs(start.y-result.origin.y)<1,'Every card must leave the same deal position');}
   assert.ok(result.queued.every(q=>q.opacity===0),'Cards must remain hidden until their individual deal delay expires');
   assert.deepEqual(result.collisions,[],JSON.stringify({message:'Dealing must avoid player portraits and labels and end at the card slots',w,h,n,collisions:result.collisions.slice(0,4)}));
   if(w===390&&h===740&&n===8){
    await f.evaluate(()=>{__holdm.animateDeal();document.querySelectorAll('#fx .fly').forEach(el=>el.getAnimations().forEach(a=>{a.pause();a.currentTime=180;}));});
    await p.screenshot({path:'artifacts/dealing-phone.png'});
    await f.evaluate(()=>document.querySelectorAll('#fx .fly').forEach(el=>el.getAnimations().forEach(a=>a.finish())));
   }
   await f.evaluate(()=>{window.__dealAnimate=Element.prototype.animate;Element.prototype.animate=function(frames,timing){const a=__dealAnimate.call(this,frames,timing);if(this.matches('#fx .fly')&&this.querySelector('.card')){a.pause();a.currentTime=0;}return a;};});
   const streets=[];
   for(const [street,board] of [[1,[2,6,10]],[2,[2,6,10,15]],[3,[2,6,10,15,19]]]){
    await f.evaluate(({street,board})=>{__holdm.G.street=street;__holdm.G.board=board;__holdm.render();},{street,board});await p.waitForTimeout(400);
    const dealt=await f.evaluate(()=>{
     const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};
     const overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1;
     const faces=[...document.querySelectorAll('.seat .pod,#bCourtDealer')].map(rect).filter(r=>r.w&&r.h);
     const targets=[...document.querySelectorAll('#board>.flipper')].map(rect),r=rect(document.querySelector('.deal-origin')),origin={x:r.x+r.w/2,y:r.y+r.h/2};
     const flights=[...document.querySelectorAll('#fx .fly')].filter(e=>e.querySelector('.card')),failures=[];
     for(const el of flights){const a=el.getAnimations()[0],t=a.effect.getTiming();a.currentTime=0;const start=rect(el);
      if(Math.abs(start.x+start.w/2-origin.x)>1||Math.abs(start.y+start.h/2-origin.y)>1)failures.push('wrong origin');
      for(let i=0;i<=40;i++){a.currentTime=t.duration*i/40;const card=rect(el);if(faces.some(face=>overlap(card,face)))failures.push({card});}
      const end=rect(el);if(!targets.some(target=>Math.abs(target.x+target.w/2-end.x-end.w/2)<1&&Math.abs(target.y+target.h/2-end.y-end.h/2)<1))failures.push('wrong landing');
     }
     flights.forEach(el=>el.getAnimations().forEach(a=>a.finish()));return{count:flights.length,failures};
    });
    assert.equal(dealt.count,street===1?3:1);assert.deepEqual(dealt.failures,[],JSON.stringify({w,h,n,street,failures:dealt.failures}));streets.push(street);
   }
   await f.evaluate(()=>{Element.prototype.animate=__dealAnimate;delete window.__dealAnimate;});
   report.cases.push({viewport:[w,h],seats:n,flights:result.flights,tableOrigin:true,queuedHidden:true,facesClear:true,correctLandings:true,stateRetained:true,communityStreets:streets});await c.close();
  }
  assert.deepEqual(report.errors,[]);fs.writeFileSync('artifacts/dealing-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
