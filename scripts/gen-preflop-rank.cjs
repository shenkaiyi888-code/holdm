// Builds the 169 starting-hand order used by poker-ai.js. Score blends
// heads-up equity with 4-way equity (playability multiway: pairs, suited
// connectors). Output: one char per class, rows by high rank, see classIndex.
const helpers=require('./ai-helpers.cjs');
let seed=7;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const R='23456789TJQKA';const classes=[];
for(let a=12;a>=0;a--)for(let b=a;b>=0;b--){
  if(a===b)classes.push({hi:a,lo:b,s:false,combos:6});
  else{classes.push({hi:a,lo:b,s:true,combos:4});classes.push({hi:a,lo:b,s:false,combos:12});}
}
function eq(c,opp,iters){
  const h=[c.hi*4,c.lo*4+(c.s?0:1)];let won=0;
  const deck=[];for(let i=0;i<52;i++)if(!h.includes(i))deck.push(i);
  for(let it=0;it<iters;it++){
    const need=opp*2+5;for(let k=0;k<need;k++){const j=k+Math.floor(random()*(deck.length-k));[deck[k],deck[j]]=[deck[j],deck[k]];}
    const board=deck.slice(opp*2,opp*2+5),mine=helpers.evaluate(h.concat(board));let best=0,ties=0,lose=false;
    for(let o=0;o<opp;o++){const s=helpers.evaluate([deck[o*2],deck[o*2+1]].concat(board));if(s>mine){lose=true;break;}if(s===mine)ties++;}
    if(!lose)won+=1/(1+ties);
  }
  return won/iters;
}
const N=+process.argv[2]||6000;
classes.forEach(c=>{c.hu=eq(c,1,N);c.mw=eq(c,3,N);});
const rankOf=key=>{const s=classes.slice().sort((x,y)=>y[key]-x[key]);s.forEach((c,i)=>c[key+'R']=i);};
rankOf('hu');rankOf('mw');
// Equity alone undervalues what plays well with implied odds: small pairs
// (sets) and suited connectors (straights and flushes behind deep stacks).
classes.forEach(c=>c.score=c.huR*.55+c.mwR*.45-(c.hi===c.lo?22:0)-(c.s&&c.hi-c.lo<=2&&c.lo>=3&&c.hi<=8?14+(c.hi-c.lo===1?6:0):0));
const sorted=classes.slice().sort((x,y)=>x.score-y.score);
let cum=0;sorted.forEach(c=>{cum+=c.combos;c.pct=cum/1326;});
const name=c=>R[c.hi]+R[c.lo]+(c.hi===c.lo?'':c.s?'s':'o');
console.error(sorted.map(c=>name(c)+' '+(c.pct*100).toFixed(1)).join(', '));
// Encode percentile (0..1) as 0..93 in printable chars starting at '!'.
console.log(classes.map(c=>String.fromCharCode(33+Math.round(c.pct*93))).join(''));
