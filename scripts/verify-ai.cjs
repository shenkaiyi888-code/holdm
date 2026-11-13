const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const AI=require('../poker-ai.js'),helpers=require('./ai-helpers.cjs');
const card=text=>('23456789TJQKA'.indexOf(text[0])*4+'shdc'.indexOf(text[1]));
const cards=text=>text.split(' ').map(card);
const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function table(n=2){
 const players=Array.from({length:n},(_,seat)=>({seat,chips:2000,bet:0,total:0,out:false,folded:false,allIn:false,stats:{}}));
 return{seat:0,dealer:n-1,sb:n===2?n-1:0,bb:n===2?0:1,straddle:-1,bigBlind:20,currentBet:20,minRaise:20,raises:0,
  street:0,board:[],hand:cards('As Ah'),style:{tight:.03,aggr:.7,bluff:.1},trap:0,history:[],lastAgg:-1,streetAgg:-1,canRaise:true,players};
}
const decide=(s,seed=71)=>AI.decide(s,helpers,rng(seed));
const results=[];
function check(name,fn){const start=performance.now();const detail=fn();results.push({name,passed:true,ms:Math.round(performance.now()-start),...detail});}

check('position changes opening ranges for regular bots',()=>{
 const s=table(6);s.hand=cards('Kh Ts');s.players[0].bet=10;s.players[0].total=10;s.players[1].bet=20;s.players[1].total=20;
 s.seat=2;assert.equal(AI.position(s).name,'EP');const early=decide(s);s.seat=5;const button=decide(s);
 assert.equal(early.type,'fold');assert.equal(button.type,'raise');assert.ok(button.to>=40&&button.to<=80);
 const positions=Array.from({length:6},(_,i)=>AI.position(s,i).name);
 assert.deepEqual(positions,['SB','BB','EP','MP','CO','BTN']);return{early:early.type,button:button.type,positions};
});
check('position handles empty seats, heads-up and a straddle',()=>{
 const s=table(8);s.players[3].out=true;s.players[6].out=true;assert.equal(AI.position(s,5).name,'CO');assert.equal(AI.position(s,7).name,'BTN');
 s.straddle=2;s.seat=4;assert.ok(AI.position(s).behind>0);
 const h=table();h.seat=h.dealer;assert.equal(AI.position(h).name,'BTN');assert.equal(AI.position(h).inPosition,true);
 h.seat=h.bb;assert.equal(AI.position(h).inPosition,false);return{emptySeats:true,headsUp:true,straddle:true};
});
check('premium hands raise for value without an automatic deep shove',()=>{
 const s=table();s.currentBet=500;s.minRaise=300;s.raises=2;s.streetAgg=1;
 Object.assign(s.players[0],{bet:200,total:200,chips:1800});Object.assign(s.players[1],{bet:500,total:500,chips:1500});
 const a=decide(s);assert.equal(a.type,'raise');assert.ok(a.to>=800&&a.to<2000,JSON.stringify(a));return{raiseTo:a.to,stack:2000};
});
check('three-bets are larger out of position',()=>{
 const s=table();s.currentBet=60;s.raises=1;s.minRaise=40;s.streetAgg=1;s.players[1].bet=s.players[1].total=60;
 s.dealer=0;s.sb=0;s.bb=1;const ip=decide(s);
 s.dealer=1;s.sb=1;s.bb=0;const oop=decide(s);
 assert.equal(ip.type,'raise');assert.equal(oop.type,'raise');assert.ok(oop.to>ip.to);return{inPosition:ip.to,outOfPosition:oop.to};
});
check('small samples cannot label an opponent with certainty',()=>{
 const p=AI.profile({stats:{hands:1,vpip:1,pfr:1,faced:1,foldFaced:1}});
 assert.ok(p.pfr<.3&&p.vpip<.4&&p.fold<.55);return{profile:p};
});
check('the same cards are read differently against tight and loose public histories',()=>{
 const s=table();s.street=3;s.board=cards('Kh 7c 2d 9s 3c');s.hand=cards('Ks Qh');s.raises=1;s.currentBet=800;s.minRaise=800;
 Object.assign(s.players[0],{total:200,bet:0});Object.assign(s.players[1],{total:1000,bet:800});
 s.history=[{seat:1,street:0,type:'raise',raises:0,increment:40,call:20,pot:30,board:[]}];
 for(let street=1;street<=3;street++)s.history.push({seat:1,street,type:'raise',raises:0,increment:street===3?800:200,call:0,pot:400,board:s.board.slice(0,street+2)});
 s.players[1].stats={hands:100,vpip:15,pfr:10,raises:10,calls:65,faced:80,foldFaced:60};const tight=AI.estimate(s,helpers,rng(5)),tightAction=decide(s);
 s.players[1].stats={hands:100,vpip:55,pfr:40,raises:80,calls:50,faced:80,foldFaced:15};const loose=AI.estimate(s,helpers,rng(5)),looseAction=decide(s);
 assert.ok(loose.equity>tight.equity+.025,JSON.stringify({tight,loose}));assert.equal(tightAction.type,'fold');assert.equal(looseAction.type,'call');
 s.players[1].stats.shownBluffs=15;s.players[1].stats.shownValue=0;const shownBluffs=AI.estimate(s,helpers,rng(5));
 s.players[1].stats.shownBluffs=0;s.players[1].stats.shownValue=15;const shownValue=AI.estimate(s,helpers,rng(5));
 assert.ok(shownBluffs.equity>shownValue.equity+.04,'Publicly shown bluffs and value hands must still change table image');
 return{tightEquity:tight.equity,looseEquity:loose.equity,tightAction:tightAction.type,looseAction:looseAction.type};
});
check('wet boards charge more for draws than dry boards',()=>{
 const s=table();s.street=1;s.currentBet=0;s.raises=0;s.hand=cards('Js Jh');s.players.forEach(p=>p.total=100);
 s.board=cards('Jd 7s 2c');const dry=decide(s);
 s.board=cards('Jd Tc 9c');const wet=decide(s);
 assert.equal(dry.type,'raise');assert.equal(wet.type,'raise');assert.ok(wet.to>dry.to,JSON.stringify({dry,wet}));return{dry:dry.to,wet:wet.to};
});
check('a shared royal flush is never folded or pointlessly raised',()=>{
 const s=table(3);s.street=3;s.board=cards('As Ks Qs Js Ts');s.hand=cards('2h 3d');s.currentBet=1500;s.raises=1;s.minRaise=1500;
 s.players[0].total=100;s.players[1].total=1600;s.players[1].bet=1500;s.players[2].total=100;
 const a=decide(s);assert.equal(a.type,'call');return{action:a.type};
});
check('all-in draws use their actual price, without fictional implied odds',()=>{
 const s=table();s.street=2;s.board=cards('Ah Kc 2h Qd');s.hand=cards('8h 7h');s.currentBet=1500;s.minRaise=1500;s.raises=1;s.canRaise=false;
 Object.assign(s.players[0],{chips:1500,total:100});Object.assign(s.players[1],{chips:0,bet:1500,total:1600,allIn:true});
 const a=decide(s);assert.equal(a.type,'fold',JSON.stringify(a));return{action:a.type};
});
check('wheel draws have four straight outs, while open ends have eight',()=>{
 const wheel=helpers.draw(cards('As 4h'),cards('2d 3c Ks'));
 assert.equal(wheel.oesd,false);assert.equal(wheel.gut,true);
 const open=helpers.draw(cards('9s Th'),cards('Jd Qc 2s'));
 assert.equal(open.oesd,true);return{wheel:'gutshot',openEnded:'eight outs'};
});
check('short calls cap both their price and the eligible pot',()=>{
 const s=table();s.street=3;s.board=cards('As Kd Qc Jh 2s');s.hand=cards('Ts 3h');s.currentBet=10000;s.raises=1;s.canRaise=false;
 Object.assign(s.players[0],{chips:50,total:20});Object.assign(s.players[1],{bet:10000,total:10020});
 const e=AI.estimate(s,helpers,rng(1));assert.equal(e.call,50);assert.equal(e.pot,90);assert.ok(Math.abs(e.odds-50/140)<1e-9);
 assert.equal(decide(s).type,'call');return{call:e.call,eligiblePot:e.pot,odds:e.odds};
});
check('no air check-raises and no missed-draw spam into a calling station',()=>{
 const s=table();s.street=3;s.board=cards('Ah Kc 5h 2s 2d');s.hand=cards('9h 8h');s.currentBet=0;s.raises=0;s.lastAgg=-1;
 s.players.forEach(p=>p.total=200);s.dealer=0;s.sb=0;s.bb=1;
 s.players[1].stats={hands:100,vpip:70,pfr:4,raises:5,calls:150,faced:120,foldFaced:5};
 s.history=[{seat:1,street:3,type:'check',raises:0,increment:0,call:0,pot:400,board:s.board}];
 for(let seed=1;seed<=12;seed++)assert.equal(decide(s,seed).type,'check');
 s.board=cards('As Kd Qh 9c 6s');s.hand=cards('7h 2c');s.currentBet=300;s.raises=1;s.players[1].bet=300;s.players[1].total=500;
 for(let seed=1;seed<=12;seed++)assert.notEqual(decide(s,seed).type,'raise');return{seeds:24};
});
check('closed raising stays closed, including with the nuts',()=>{
 const s=table();s.street=3;s.board=cards('As Ks Qs Js 2d');s.hand=cards('Ts 3h');s.currentBet=100;s.raises=2;s.canRaise=false;
 s.players[1].bet=100;s.players[1].total=200;s.players[0].total=100;
 assert.equal(decide(s).type,'call');return{action:'call'};
});
check('a short all-in competes for its main pot, not the larger side pot',()=>{
 const s=table(3);s.street=3;s.board=cards('2h 3d 7c 9s Qc');s.hand=cards('As Ah');s.currentBet=200;s.minRaise=100;s.raises=1;
 Object.assign(s.players[0],{bet:100,total:100});Object.assign(s.players[1],{bet:0,total:50,chips:0,allIn:true});Object.assign(s.players[2],{bet:200,total:300});
 s.history=[{seat:1,street:0,type:'raise',raises:1,increment:10,call:40,pot:80,board:[]}];
 const e=AI.estimate(s,helpers,rng(713),4000);assert.ok(e.equity>e.rawEquity+.025,JSON.stringify(e));return{weightedEquity:e.equity,winWholePot:e.rawEquity};
});
check('decisions and range sampling do not read opponent hole cards',()=>{
 const s=table();s.street=1;s.board=cards('Ah 7d 2c');s.hand=cards('As Qs');s.currentBet=0;s.players.forEach(p=>p.total=100);
 Object.defineProperty(s.players[1],'hand',{get(){throw new Error('Private cards were accessed');}});
 Object.defineProperty(s,'deck',{get(){throw new Error('Deck was accessed');}});
 assert.doesNotThrow(()=>decide(s));return{privateCardAccess:false,deckAccess:false};
});
check('six- and eight-way decisions remain legal and bounded in time',()=>{
 const timings=[];
 for(const n of [6,8]){
  const s=table(n);s.street=1;s.board=cards('Ah 9d 7c');s.hand=cards('As Qs');s.currentBet=80;s.minRaise=80;s.raises=1;
  s.players.forEach(p=>{p.total=100;if(p.seat!==0)p.bet=80;});
  s.history=s.players.slice(1).map(p=>({seat:p.seat,street:0,type:'call',raises:1,increment:60,call:60,pot:200,board:[]}));
  const start=performance.now();const a=decide(s);const ms=performance.now()-start;
  assert.ok(['call','fold','raise'].includes(a.type));if(a.type==='raise')assert.ok(a.to>=160&&a.to<=2000);
  assert.ok(ms<1200,JSON.stringify({n,ms}));timings.push({seats:n,ms:Math.round(ms),action:a.type});
 }
 return{timings};
});
check('varied stack depths and board streets produce legal actions',()=>{
 const random=rng(77234),counts={check:0,fold:0,call:0,raise:0};
 for(let k=0;k<120;k++){
  const s=table(k%2?6:8),deck=Array.from({length:52},(_,i)=>i);
  for(let i=51;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  s.street=k%4;s.board=deck.slice(0,s.street?s.street+2:0);s.hand=deck.slice(5,7);
  s.currentBet=[0,20,60,200][Math.floor(k/4)%4];s.minRaise=Math.max(20,s.currentBet/2);s.raises=s.currentBet>20?1:0;
  s.players.forEach((p,i)=>{p.bet=i===0?0:s.currentBet;p.total=p.bet+40;p.chips=[15,100,500,2000][(k+i)%4];});
  s.canRaise=s.players[0].chips>s.currentBet&&k%7!==0;
  if(k%13===0)s.style={tight:NaN,aggr:NaN,bluff:NaN};
  const a=decide(s,k+1);counts[a.type]++;
  assert.ok(['check','fold','call','raise'].includes(a.type));
  if(!s.currentBet)assert.notEqual(a.type,'fold');
  if(a.type==='raise'){
   const max=s.players[0].chips,minimum=s.currentBet+s.minRaise;
   assert.ok(s.canRaise&&Number.isFinite(a.to)&&a.to>s.currentBet&&a.to<=max);
   assert.ok(a.to>=minimum||a.to===max);
  }
 }
 return{spots:120,actions:counts};
});
fs.mkdirSync(path.join(__dirname,'../artifacts'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'../artifacts/ai-verification.json'),JSON.stringify({cases:results},null,2)+'\n');
console.log(JSON.stringify({passed:results.length,cases:results},null,2));
