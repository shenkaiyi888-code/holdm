const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const url=process.env.HOLDM_TEST_URL||'http://terminal.local:4173';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--host-resolver-rules=MAP terminal.local 127.0.0.1','--no-proxy-server']});
 const report={tables:[],errors:[],failedRequests:[]};
 try{
  for(const [n,width,height] of [[6,390,740],[8,844,390]]){
   const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
   await c.addInitScript(n=>{localStorage.setItem('holdem.seats',String(n));localStorage.setItem('holdem.auto','0');localStorage.setItem('holdem.rit','0');localStorage.setItem('holdem.sound','0');},n);
   const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)report.failedRequests.push({url:r.url(),status:r.status()});});
   await p.goto(url+'/?selftest');await p.frameLocator('#game').locator('#stPlay').click();const f=p.frames()[1];
   const privacy=await f.evaluate(()=>{
    const {G,botContext}=__holdm,own=1,other=G.players[0],hand=other.hand;
    const before=JSON.stringify(botContext(own));
    Object.defineProperty(other,'hand',{configurable:true,get(){throw new Error('Adapter read an opponent hand');}});
    let after;
    try{after=JSON.stringify(botContext(own));}finally{Object.defineProperty(other,'hand',{configurable:true,writable:true,value:hand});}
    const snapshot=botContext(own);
    return{stable:before===after,noPrivateFields:!('deck'in snapshot)&&snapshot.players.every(p=>!('hand'in p)&&!('style'in p)),publicHistory:snapshot.history.every(a=>!('bluff'in a))};
   });assert.deepEqual(privacy,{stable:true,noPrivateFields:true,publicHistory:true});
   await f.evaluate(()=>{
    __holdm.G.speed=.025;
    const original=HoldmAI.decide;window.aiTimes=[];
    HoldmAI.decide=function(s,helpers,...rest){
     if('deck'in s||s.players.some(p=>'hand'in p||'style'in p))throw new Error('Private state passed to AI');
     const start=performance.now(),a=original(s,helpers,...rest);aiTimes.push(performance.now()-start);
     if(a.type==='raise'&&(!s.canRaise||a.to>s.players[s.seat].bet+s.players[s.seat].chips||!Number.isFinite(a.to)))throw new Error('Illegal AI raise');
     return a;
    };
   });
   const outcome=await f.evaluate(async()=>{
    const {G}=__holdm,completed=new Set(),streets=new Set(),deadline=performance.now()+90000;
    let games=0,bankroll=G.players.reduce((n,p)=>n+p.chips+p.total,0),decisions=0;
    while(completed.size<12){
     if(performance.now()>deadline)throw new Error('AI game stalled: '+JSON.stringify({hand:G.handNo,street:G.street,toAct:G.toAct,waiting:G.waiting}));
     streets.add(G.street);
     if(G.players.some(p=>p.chips<0||p.bet<0||p.total<0||p.bet>p.total))throw new Error('Negative or inconsistent chip balance');
     const total=G.players.reduce((n,p)=>n+p.chips+(G.handOver?0:p.total),0);
     if(total!==bankroll)throw new Error('Chip conservation failed: '+JSON.stringify({total,bankroll,hand:G.handNo,street:G.street}));
     if(G.handOver){
      completed.add(games+':'+G.handNo);if(completed.size>=12)break;
      if(G.over){games++;__holdm.newGame();bankroll=G.players.reduce((n,p)=>n+p.chips+p.total,0);}
      else __holdm.startHand();
      G.speed=.025;
     }else if(G.waiting&&G.toAct===0){
      const hero=G.players[0];hero.human=false;
      try{__holdm.botAct(0);decisions++;}finally{hero.human=true;}
     }
     await new Promise(resolve=>setTimeout(resolve,35));
    }
    const times=aiTimes.slice().sort((a,b)=>a-b);
    return{completedHands:completed.size,streets:[...streets].sort(),restarts:games,heroDecisions:decisions,aiDecisions:times.length,p95ms:times[Math.floor(times.length*.95)],maxMs:times.at(-1),publicActions:G.aiHistory.length,chipConservation:true};
   });
   assert.equal(outcome.completedHands,12);assert.ok(outcome.aiDecisions>=20);assert.ok(outcome.p95ms<1000);
   report.tables.push({seats:n,viewport:[width,height],privacy,...outcome});console.log(JSON.stringify(report.tables.at(-1)));await c.close();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);
  fs.writeFileSync(path.join(__dirname,'../artifacts/ai-browser-verification.json'),JSON.stringify(report,null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
