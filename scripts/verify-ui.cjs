const {chromium}=require('playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
const root='http://terminal.local:4173';
const bridge=`window.__qa={G,NET,get H(){return H},render,sfx,animateDeal,freeze(){runId++;clearTimeout(G.idleT);},setup(kind){runId++;G.handOver=false;G.over=false;G.rit=null;G.board=[2,6,10];G.street=1;G.currentBet=kind==='raise'?20:0;G.minRaise=20;G.toAct=0;G.waiting=true;G.thinking=-1;G.players.forEach(p=>{Object.assign(p,{chips:1000,bet:0,total:0,folded:false,out:false,allIn:false,acted:false,actedAt:null,lastAction:'',human:true});});if(kind==='raise'){G.players[1].bet=20;G.players[1].total=20;}H.streets=[{name:'翻牌',board:G.board.slice(),acts:[]}];setRaiseDefaults();render();},scene(){this.setup('check');G.players.forEach((p,i)=>{p.name=['你','周榆澄','虞子辰','傅楠壹','小美','戎沈楷轶','阿明','小米'][i];p.total=40;p.chips=1000;});G.players[0].hand=[48,49];G.board=[42,23,0];G.currentBet=40;G.toAct=0;G.waiting=true;G.sbIdx=4;G.bbIdx=5;render();}};`;
(async()=>{
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--host-resolver-rules=MAP terminal.local 127.0.0.1','--no-proxy-server']});
const report={viewports:[],actions:[],errors:[]};
async function open(w,h,n,touch=true,reduced=false){
 const c=await b.newContext({viewport:{width:w,height:h},isMobile:touch,hasTouch:touch,deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference'});
 await c.addInitScript(n=>{localStorage.setItem('holdem.seats',String(n));localStorage.setItem('holdem.auto','0');localStorage.setItem('holdem.foldSafe','0');},n);
 const p=await c.newPage();p.on('pageerror',e=>{report.errors.push(e.message);console.log('PAGEERROR',e.stack)});p.setDefaultTimeout(10000);
 await p.goto(root+'/?selftest');await p.frameLocator('#game').locator('#stPlay').click();const f=p.frames()[1];await f.evaluate(code=>{const {G,NET,render,sfx,animateDeal,setRaiseDefaults}=__holdm;let H=__holdm.H;let runId=0;eval(code);__qa.freeze=__holdm.freeze;},bridge);await f.waitForFunction(()=>window.__qa.G.handNo>0,{},{timeout:10000});await f.evaluate(()=>{__qa.freeze();document.querySelectorAll('#fx .fly').forEach(el=>el.getAnimations().forEach(a=>a.finish()));});await p.waitForTimeout(100);return{p,f,c};
}
for(const [w,h,n,touch] of [[320,568,8,true],[390,844,6,true],[360,640,8,true],[768,1024,8,true],[1024,768,8,true],[1440,900,6,false],[844,390,8,true]]){
 const{p,f,c}=await open(w,h,n,touch);await f.evaluate(()=>__qa.scene());if(w===320)await f.evaluate(()=>{__qa.G.players.forEach(p=>p.bet=20);__qa.render();});await p.waitForTimeout(1600);
 const metrics=await f.evaluate(()=>{const visible=e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0;const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};return{viewport:[innerWidth,innerHeight],body:[document.body.scrollWidth,document.body.scrollHeight],seats:[...document.querySelectorAll('#arena>.seat .pod')].map(rect),board:[...document.querySelectorAll('#board .card')].map(rect),opponentCards:[...document.querySelectorAll('#arena>.seat:not(.you) .hole .card')].map(rect),dock:rect(document.querySelector('.console')),button:rect(document.getElementById('bCall')),dealerVisible:visible(document.querySelector('.dealer'))};});
 for(const card of metrics.board)for(const obstacle of [...metrics.seats,...metrics.opponentCards]){const overlapW=Math.min(card.x+card.w,obstacle.x+obstacle.w)-Math.max(card.x,obstacle.x),overlapH=Math.min(card.y+card.h,obstacle.y+obstacle.h)-Math.max(card.y,obstacle.y);assert.ok(overlapW<1||overlapH<1,JSON.stringify({w,h,card,obstacle}));}assert.equal(metrics.seats.length,n);assert.equal(metrics.dealerVisible,false);assert.ok(metrics.body[0]<=metrics.viewport[0]+1);assert.ok(metrics.body[1]<=metrics.viewport[1]+1);assert.ok(metrics.button.h>=44);
 for(const r of metrics.seats){assert.ok(r.x>=-1&&r.y>=-1&&r.x+r.w<=metrics.viewport[0]+1&&r.y+r.h<=metrics.viewport[1]+1,JSON.stringify({w,h,n,r}));}
 const before=await f.evaluate(()=>({identity:__qa.G.salt,hand:__qa.G.handNo,chips:__qa.G.players.map(p=>p.chips)}));
 await p.frameLocator('#game').locator('#bOrientation').click();await p.waitForTimeout(150);
 const after=await f.evaluate(()=>({identity:__qa.G.salt,hand:__qa.G.handNo,chips:__qa.G.players.map(p=>p.chips)}));assert.deepEqual(after,before);
 await p.frameLocator('#game').locator('#bOrientation').click();await p.waitForTimeout(1000);
 await p.screenshot({path:`artifacts/${w}x${h}-${n}seats.png`});report.viewports.push({physical:[w,h],n,...metrics,stateRetained:true});await c.close();
}
const{p,f,c}=await open(390,844,6,true);await p.waitForTimeout(500);
await f.evaluate(()=>{window.qaSounds=[];window.qaFeedback=[];window.qaOsc=0;document.addEventListener('holdm:sound',e=>qaSounds.push(e.detail.kind));document.addEventListener('holdm:feedback',e=>qaFeedback.push(e.detail.kind));const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){qaOsc++;return original.call(this)};});
for(const kind of ['check','bet','raise']){
 await f.evaluate(kind=>{__qa.freeze();__qa.setup(kind);qaSounds=[];qaFeedback=[];qaOsc=0;},kind);
 if(kind==='check')await p.frameLocator('#game').locator('#bCall').click();else{await p.frameLocator('#game').locator('#bRaise').click();await p.frameLocator('#game').locator('#bRaise').click();}
 const r=await f.evaluate(()=>({sounds:qaSounds,feedback:qaFeedback,oscillators:qaOsc,animations:document.querySelectorAll('#arena>.seat')[0].querySelector('.pod').getAnimations().length}));assert.ok(r.feedback.includes(kind));assert.equal(r.sounds.filter(k=>k===kind).length,1);assert.ok(r.oscillators>0);report.actions.push({kind,...r});
}
await f.locator('#bMenu').click();await f.locator('#optSound').uncheck();await f.locator('#bMenu').click();
await f.evaluate(()=>{__qa.freeze();__qa.setup('check');qaSounds=[];qaFeedback=[];qaOsc=0;});await f.locator('#bCall').click();const muted=await f.evaluate(()=>({sounds:qaSounds,oscillators:qaOsc,feedback:qaFeedback}));assert.equal(muted.sounds.length,0);assert.equal(muted.oscillators,0);assert.ok(muted.feedback.includes('check'));report.muted=muted;
await c.close();
const reduced=await open(390,844,6,true,true);report.reducedMotion=await reduced.f.evaluate(()=>({dealDuration:__qa.animateDeal(),backgroundAnimations:document.body.getAnimations({subtree:true}).filter(a=>a.playState==='running').length}));assert.equal(report.reducedMotion.dealDuration,0);await reduced.c.close();
assert.deepEqual(report.errors,[]);fs.writeFileSync('artifacts/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({viewports:report.viewports.length,actions:report.actions,muted:report.muted,errors:report.errors}));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
