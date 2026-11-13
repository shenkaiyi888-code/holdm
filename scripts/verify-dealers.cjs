const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const root=process.env.HOLDM_TEST_URL||'http://terminal.local:4173';
const overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1;
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--host-resolver-rules=MAP terminal.local 127.0.0.1','--no-proxy-server']});
 const report={viewports:[],errors:[],failedRequests:[]};
 async function open(w,h,reduced=false){
  const c=await browser.newContext({viewport:{width:w,height:h},isMobile:w<1100,hasTouch:w<1100,reducedMotion:reduced?'reduce':'no-preference'});
  await c.addInitScript(()=>{localStorage.setItem('holdem.seats','8');localStorage.setItem('holdem.auto','0');});
  const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.failedRequests.push({url:r.url(),status:r.status()});});
  p.setDefaultTimeout(10000);await p.goto(root+'/?selftest');await p.frameLocator('#game').locator('#stPlay').click();const f=p.frames()[1];
  await f.evaluate(()=>{const {G,freeze,render}=__holdm;freeze();G.street=1;G.board=[42,23,0];G.currentBet=40;G.toAct=0;G.thinking=-1;G.waiting=true;G.players.forEach(p=>Object.assign(p,{human:true,chips:1000,total:40,bet:0,folded:false,lastAction:''}));render();document.querySelectorAll('#fx .fly').forEach(el=>el.getAnimations().forEach(a=>a.finish()));});
  await p.waitForTimeout(1600);return{c,p,f};
 }
 const state=f=>f.evaluate(()=>{const G=__holdm.G;return{salt:G.salt,hand:G.handNo,board:G.board,waiting:G.waiting,toAct:G.toAct,players:G.players.map(p=>({hand:p.hand,chips:p.chips,bet:p.bet,total:p.total,folded:p.folded}))};});
 const loaded=async f=>{await f.waitForFunction(()=>[...document.querySelectorAll('#courtPicker img')].every(i=>i.complete&&i.naturalWidth>0));await f.evaluate(async()=>{await Promise.all([...document.querySelectorAll('#courtPicker img')].map(i=>i.decode()));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});};
 try{
  for(const [w,h] of [[320,568],[360,640],[390,740],[390,844],[768,1024],[1024,768],[1440,900],[844,390]]){
   const{c,p,f}=await open(w,h);const before=await state(f);
   assert.equal(await f.locator('#bCourtDealer').getAttribute('data-dealer'),'k');
   const header=await f.evaluate(()=>{const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};return{viewport:[innerWidth,innerHeight],controls:['.brand h1','#bCourtDealer','#bOrientation','#bMenu'].map(s=>rect(document.querySelector(s))),arena:rect(document.querySelector('.arena')),dealer:rect(document.getElementById('bCourtDealer')),origin:HoldmCourt.origin()};});
   for(const r of header.controls)assert.ok(r.x>=-1&&r.x+r.w<=header.viewport[0]+1,JSON.stringify({message:'Header controls must remain visible',w,h,r}));
   for(let i=0;i<header.controls.length;i++)for(let j=i+1;j<header.controls.length;j++)assert.ok(!overlap(header.controls[i],header.controls[j]),JSON.stringify({message:'Header controls must not collide',w,h,i,j}));
   assert.ok(header.dealer.w>=(w<340?80:96)&&header.dealer.h>=80,JSON.stringify({message:'The header portrait must be clearly larger than the old 40px avatar',w,h,dealer:header.dealer}));
   assert.ok(!overlap(header.dealer,header.arena),'The enlarged dealer must remain in the upper bar');
   await f.evaluate(()=>{window.dealerSounds=[];document.addEventListener('holdm:sound',e=>dealerSounds.push(e.detail.kind));});
   await p.screenshot({path:`artifacts/dealer-${w}x${h}.png`});
   await f.locator('#bCourtDealer').click();await loaded(f);assert.equal(await f.locator('#courtPicker').isVisible(),true);
   const picker=await f.locator('#courtPicker').evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,scroll:e.scrollWidth,client:e.clientWidth,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,choices:[...e.querySelectorAll('.court-choice')].map(choice=>{const r=choice.getBoundingClientRect();return{id:choice.dataset.dealer,x:r.x,y:r.y,w:r.width,h:r.height};})}});
   assert.ok(picker.x>=-1&&picker.y>=-1&&picker.x+picker.w<=header.viewport[0]+1&&picker.y+picker.h<=header.viewport[1]+1,JSON.stringify({w,h,picker}));assert.ok(picker.scroll<=picker.client+1);
   assert.equal(picker.choices.length,4,'J, Q, K and Yi must all be available');
   assert.ok(picker.scrollHeight<=picker.clientHeight+1,'Every dealer and the motion control must fit without scrolling');
   assert.equal(picker.choices[0].y,picker.choices[1].y,'The first pair must stay in one row');
   assert.equal(picker.choices[2].y,picker.choices[3].y,'The second pair must stay in one row');
   assert.ok(w<600?picker.choices[2].y>picker.choices[0].y:picker.choices[2].y===picker.choices[0].y,'Phones use two rows; larger screens use one row');
   await f.evaluate(()=>document.querySelectorAll('#courtPicker .court-portrait').forEach(el=>el.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=0;})));
   if(w===390&&h===740||w===1440){
    await p.screenshot({path:`artifacts/dealer-picker-${w}x${h}.png`});
    for(const id of ['j','q','k','yi'])await f.locator(`.court-choice[data-dealer=${id}] .court-portrait`).screenshot({path:`artifacts/dealer-render-${w}-${id}.png`});
    await f.evaluate(()=>document.querySelectorAll('#courtPicker .court-blink').forEach(el=>el.getAnimations().forEach(a=>{a.pause();a.currentTime=Number(a.effect.getTiming().duration)*.955;})));
    await p.screenshot({path:`artifacts/dealer-blink-${w}x${h}.png`});
    await f.evaluate(()=>document.querySelectorAll('#courtPicker .court-blink').forEach(el=>el.getAnimations().forEach(a=>a.currentTime=0)));
   }
   await p.keyboard.press('Escape');assert.equal(await f.locator('#courtPicker').isVisible(),false);
   for(const id of ['j','q','k','yi']){
    await f.locator('#bCourtDealer').click();await f.locator(`.court-choice[data-dealer=${id}]`).click();
    assert.equal(await f.locator('#courtPicker').isVisible(),false);assert.equal(await f.locator('#bCourtDealer').getAttribute('data-dealer'),id);assert.deepEqual(await state(f),before);
   }
   await f.locator('#bCourtDealer').click();await f.locator('#courtMotion').uncheck();await f.locator('.court-done').click();
   assert.equal(await f.locator('#bCourtDealer .court-portrait').evaluate(e=>getComputedStyle(e).animationName),'none');
   await f.locator('#bMenu').click();await f.locator('#courtVisible').uncheck();assert.equal(await f.locator('#bCourtDealer').isVisible(),false);assert.ok(await f.evaluate(()=>HoldmCourt.origin()?.w>0),'Hiding the decorative portrait must keep the table deal origin available');
   await f.locator('#courtVisible').check();await f.locator('#bMenu').click();
   await f.locator('#bCourtDealer').click();await f.locator('[data-dealer=yi].court-choice').click();
   assert.equal(await f.locator('#bCourtDealer .court-rank').innerText(),'Yi · 荷官');
   await p.screenshot({path:`artifacts/dealer-yi-${w}x${h}.png`});
   await f.locator('#bOrientation').click();await p.waitForTimeout(180);assert.deepEqual(await state(f),before);assert.equal(await f.locator('#bCourtDealer').getAttribute('data-dealer'),'yi');
   await f.locator('#bOrientation').click();await p.waitForTimeout(180);assert.deepEqual(await state(f),before);
   assert.deepEqual(await f.evaluate(()=>dealerSounds),[],'Dealer controls must stay silent');
   if(w<h&&w<600){
    await f.locator('#bRaise').click();await f.locator('#bCancel').waitFor({state:'visible'});
    const form=await f.locator('#bRaise').evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,vw:innerWidth,vh:innerHeight}});
    assert.ok(form.x>=0&&form.y>=0&&form.x+form.w<=form.vw+1&&form.y+form.h<=form.vh+1,'Betting controls must remain visible');
    await f.locator('#bCancel').click();assert.deepEqual(await state(f),before);
   }
   await p.reload();await p.frameLocator('#game').locator('#stPlay').click();const reloaded=p.frames()[1];
   assert.equal(await reloaded.locator('#bCourtDealer').getAttribute('data-dealer'),'yi');
   assert.equal(await reloaded.locator('#bCourtDealer .court-portrait').evaluate(e=>getComputedStyle(e).animationName),'none');
   report.viewports.push({viewport:[w,h],header,picker,allFourSwitch:true,stateRetained:true,preferencesPersist:true,silent:true,canHide:true,motionOptional:true});await c.close();
  }
  const reduced=await open(390,844,true);
  assert.equal(await reduced.f.locator('#bCourtDealer .court-portrait').evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.equal(await reduced.f.locator('#bCourtDealer .court-blink').evaluate(e=>getComputedStyle(e).opacity),'0');report.reducedMotion=true;await reduced.c.close();
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);
  fs.writeFileSync('artifacts/dealer-verification.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({viewports:report.viewports.length,reducedMotion:report.reducedMotion,errors:report.errors,failedRequests:report.failedRequests}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
