// Preflop table simulation: deals many 8-handed hands, lets every seat act with
// the production poker-ai.js, and reports VPIP/PFR and how often the big blind
// wins uncontested ("walks"). Usage: node scripts/sim-preflop.cjs [hands] [seats] [bbDepth]
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const AI=require('../poker-ai.js'),helpers=require('./ai-helpers.cjs');
const src=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const STYLES=vm.runInNewContext('('+src.slice(src.indexOf('const STYLES = [')+15,src.indexOf('];',src.indexOf('const STYLES = ['))+1)+')');
const HANDS=+process.argv[2]||4000,SEATS=+process.argv[3]||8,DEPTH=+process.argv[4]||50;
let seed=+process.env.SEED||12345;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const plain=STYLES.filter(s=>!s.char),chars=STYLES.filter(s=>s.char);
const pick=()=>{const from=random()<.4?chars:plain;return from[Math.floor(random()*from.length)];};
const stat={},posStat={},by=(o,k)=>o[k]||(o[k]={hands:0,vpip:0,pfr:0});
let walks=0,limpedPots=0,raisedPots=0,firstOrbitWalks=0,firstOrbitHands=0;
const bb=20,sbAmt=10;
for(let table=0;table*SEATS<HANDS;table++){
  const seats=Array.from({length:SEATS},()=>pick());
  const st=seats.map(()=>({hands:0,vpip:0,pfr:0,raises:0,calls:0,faced:0,foldFaced:0}));
  let dealer=Math.floor(random()*SEATS);
  for(let h=0;h<SEATS;h++){ // one orbit per table: stacks stay at the starting depth
    dealer=(dealer+1)%SEATS;
    const deck=Array.from({length:52},(_,i)=>i);
    for(let i=51;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
    const sb=(dealer+1)%SEATS,bbi=(dealer+2)%SEATS;
    const P=seats.map((s,i)=>({seat:i,chips:DEPTH*bb,bet:0,total:0,folded:false,allIn:false,acted:false,actedAt:null,hand:[deck.pop(),deck.pop()]}));
    const pay=(p,a)=>{a=Math.min(a,p.chips);p.chips-=a;p.bet+=a;p.total+=a;if(!p.chips)p.allIn=true;};
    pay(P[sb],sbAmt);pay(P[bbi],bb);
    let cur=bb,minRaise=bb,raises=0,history=[],to=(bbi+1)%SEATS,vp=new Set(),pr=new Set();
    const canAct=p=>!p.folded&&!p.allIn;
    for(let guard=0;guard<100;guard++){
      const live=P.filter(p=>!p.folded);
      if(live.length<2)break;
      const pending=P.filter(p=>canAct(p)&&(!p.acted||p.bet<cur));
      if(!pending.length)break;
      const p=P[to];
      if(!canAct(p)||(p.acted&&p.bet>=cur)){to=(to+1)%SEATS;continue;}
      const style=seats[to];
      const s={seat:to,dealer,sb,bb:bbi,straddle:-1,bigBlind:bb,currentBet:cur,minRaise,raises,street:0,board:[],hand:p.hand,
        style:{tight:style.tight,aggr:style.aggr,bluff:style.bluff},trap:.15,honest:!!style.honest,
        strategy:{balance:!!style.pro?.balance,exploit:!!style.pro?.exploit,pressure:!!style.pro?.barrel,value:!!style.pro?.value},
        lastAgg:-1,streetAgg:-1,
        canRaise:p.chips>Math.max(0,cur-p.bet)&&(p.actedAt==null||cur-p.actedAt>=minRaise)&&P.some(q=>q!==p&&canAct(q)),
        players:P.map((q,i)=>({seat:i,chips:q.chips,bet:q.bet,total:q.total,out:false,folded:q.folded,allIn:q.allIn,stats:{...st[i],shownBluffs:0,shownValue:0}})),
        history};
      let {type,to:target}=AI.decide(s,helpers,random);
      const toCall=cur-p.bet,before={bet:p.bet,cur,pot:P.reduce((n,q)=>n+q.total,0),raises};
      if(type==='check'&&toCall>0)type='call';
      if(type==='raise'&&(p.chips<=toCall||Math.min(target,p.bet+p.chips)<=cur))type='call';
      if(toCall>0){st[to].faced++;if(type==='fold')st[to].foldFaced++;}
      if(type==='fold')p.folded=true;
      else if(type==='call')pay(p,toCall);
      else if(type==='raise'){
        target=Math.min(Math.max(Math.round(target),cur+minRaise),p.bet+p.chips);
        pay(p,target-p.bet);if(target-cur>=minRaise)minRaise=target-cur;cur=target;raises++;
        P.forEach(q=>{if(q!==p&&canAct(q))q.acted=false;});
      }
      if(type==='call'||type==='raise'){vp.add(to);st[to].calls+=type==='call';st[to].raises+=type==='raise';}
      if(type==='raise')pr.add(to);
      history.push({seat:to,street:0,type,increment:type==='raise'?p.bet-before.cur:Math.max(0,p.bet-before.bet),call:Math.min(Math.max(0,toCall),p.chips+p.bet-before.bet),pot:before.pot,raises:before.raises,board:[]});
      p.acted=true;p.actedAt=cur;to=(to+1)%SEATS;
    }
    // A BB "check" is not voluntary money.
    const walk=P.filter(p=>!p.folded).length===1&&!P[bbi].folded;
    walks+=walk;if(raisedPots+limpedPots>=0){}
    if(pr.size)raisedPots++;else if(!walk)limpedPots++;
    const names=['SB','BB'];const posName=i=>AI.position({players:P.map((q,j)=>({seat:j,out:false,folded:false,allIn:false})),dealer,sb,bb:bbi,straddle:-1,street:0},i).name;
    P.forEach((q,i)=>{
      st[i].hands++;if(vp.has(i))st[i].vpip++;if(pr.has(i))st[i].pfr++;
      for(const o of [by(stat,seats[i].style),by(posStat,posName(i))]){o.hands++;o.vpip+=vp.has(i);o.pfr+=pr.has(i);}
    });
  }
}
const total=Object.values(posStat).reduce((n,o)=>n+o.hands,0)/SEATS;
const pct=x=>(100*x).toFixed(1)+'%';
const all=Object.values(stat).reduce((a,o)=>({hands:a.hands+o.hands,vpip:a.vpip+o.vpip,pfr:a.pfr+o.pfr}),{hands:0,vpip:0,pfr:0});
const out={hands:total,seats:SEATS,depthBB:DEPTH,walkRate:walks/total,raisedPots:raisedPots/total,limpedPots:limpedPots/total,
  table:{vpip:all.vpip/all.hands,pfr:all.pfr/all.hands},
  byPosition:Object.fromEntries(['EP','MP','CO','BTN','SB','BB'].filter(k=>posStat[k]).map(k=>[k,{vpip:posStat[k].vpip/posStat[k].hands,pfr:posStat[k].pfr/posStat[k].hands}])),
  byStyle:Object.fromEntries(Object.entries(stat).map(([k,o])=>[k,{vpip:o.vpip/o.hands,pfr:o.pfr/o.hands,n:o.hands}]))};
if(process.env.JSON)console.log(JSON.stringify(out,null,1));
else{
  console.log(`${total} hands, ${SEATS} seats, ${DEPTH}bb: walk ${pct(out.walkRate)}, raised ${pct(out.raisedPots)}, limped ${pct(out.limpedPots)}, table VPIP ${pct(out.table.vpip)} PFR ${pct(out.table.pfr)}`);
  for(const [k,v] of Object.entries(out.byPosition))console.log(`  ${k.padEnd(4)} VPIP ${pct(v.vpip).padStart(6)} PFR ${pct(v.pfr).padStart(6)}`);
  for(const [k,v] of Object.entries(out.byStyle))console.log(`  ${k.padEnd(6)} VPIP ${pct(v.vpip).padStart(6)} PFR ${pct(v.pfr).padStart(6)} (${v.n})`);
}
