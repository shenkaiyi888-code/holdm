const {chromium}=require('playwright');
const path=require('node:path');
const fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const url=process.env.HOLDM_TEST_URL||'http://terminal.local:4173';
const overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1;
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--host-resolver-rules=MAP terminal.local 127.0.0.1','--no-proxy-server']});
 const report={cases:[],errors:[]};
 try{
  for(const [w,h] of [[320,568],[360,640],[390,740],[390,844],[768,1024],[1024,768],[1440,900],[844,390]])for(const n of [6,8]){
   const c=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:w<1100,hasTouch:w<1100,reducedMotion:'reduce'});
   await c.addInitScript(n=>{localStorage.setItem('holdem.seats',String(n));localStorage.setItem('holdem.auto','0');localStorage.setItem('holdem.sound','0');},n);
   const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(url+'/?selftest');await p.frameLocator('#game').locator('#stPlay').click();const f=p.frames()[1];
   await f.evaluate(()=>{
    const {G,freeze,render}=__holdm;freeze();G.street=1;G.board=[42,23,0];G.board2=null;G.toAct=0;G.waiting=true;G.thinking=-1;
    G.players.forEach((p,i)=>Object.assign(p,{name:i?'玩家'+i:'你',human:true,out:false,folded:false,chips:1000,total:20,bet:20,lastAction:'跟注 20'}));render();
    document.querySelectorAll('#fx .fly').forEach(el=>el.getAnimations().forEach(a=>a.finish()));document.getElementById('dbtn').style.transition='none';
   });await p.waitForTimeout(1400);
   const positions=[];
   for(const stage of ['preflop','flop','twoBoards'])for(let dealer=0;dealer<n;dealer++){
    await f.evaluate(({dealer,stage})=>{const {G,render}=__holdm;G.dealer=dealer;G.street=stage==='preflop'?0:1;G.board=stage==='preflop'?[]:[42,23,0];G.board2=stage==='twoBoards'?[42,23,0,7,11]:null;G.sbIdx=(dealer+1)%G.players.length;G.bbIdx=(dealer+2)%G.players.length;render();},{dealer,stage});
    await f.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const r=await f.evaluate(()=>{
     const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};
     const btn=document.getElementById('dbtn');
     return{label:btn.getAttribute('aria-label'),text:btn.textContent,marker:rect(btn),arena:rect(document.getElementById('arena')),seat:rect(document.querySelectorAll('#arena>.seat .pod')[__holdm.G.dealer]),obstacles:[...document.querySelectorAll('#arena>.seat .pod,#arena>.seat .hole .card,#arena>.seat .bet:not(:empty),#arena>.seat .tag:not(:empty),#arena>.seat .bd,#board,#board2,.pot,#street')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>({selector:e.className||e.id,...rect(e)})),name:__holdm.G.players[__holdm.G.dealer].name};
    });
    const context={viewport:[w,h],seats:n,dealer,stage};
    assert.equal(r.text,'D庄家');assert.equal(r.label,r.name+' · 庄家位置');
    assert.ok(r.marker.w>=59.9&&r.marker.h>=27.9,JSON.stringify({message:'The full D and 庄家 label must remain visible',...context,marker:r.marker}));
    assert.ok(r.marker.x>=r.arena.x-1&&r.marker.y>=r.arena.y-1&&r.marker.x+r.marker.w<=r.arena.x+r.arena.w+1&&r.marker.y+r.marker.h<=r.arena.y+r.arena.h+1,JSON.stringify({message:'Marker must fit inside arena',...context,...r}));
    for(const obstacle of r.obstacles)assert.ok(!overlap(r.marker,obstacle),JSON.stringify({message:'Marker must leave cards and player information clear',...context,marker:r.marker,obstacle}));
    positions.push({dealer,stage,marker:r.marker});
   }
   await f.evaluate(()=>{__holdm.G.board2=null;__holdm.G.dealer=0;__holdm.G.players.forEach(p=>{p.bet=0;p.lastAction='';});__holdm.render();});await p.waitForTimeout(150);
   if(n===8&&[[390,740],[844,390],[320,568]].some(([x,y])=>x===w&&y===h))await p.screenshot({path:`${root}/artifacts/dealer-marker-${w}x${h}.png`});
   report.cases.push({viewport:[w,h],seats:n,positions});await c.close();
  }
  assert.deepEqual(report.errors,[]);fs.writeFileSync(root+'/artifacts/dealer-marker-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({cases:report.cases.length,positions:report.cases.reduce((sum,c)=>sum+c.positions.length,0),errors:report.errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
