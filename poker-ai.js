/* Decisions use the acting player's cards and an explicit public-table snapshot.
   The existing engine still evaluates hands, handles actions and owns the deck. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.HoldmAI=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const finite=(x,fallback)=>Number.isFinite(x)?x:fallback;
  const rank=c=>(c>>2)+2,suit=c=>c&3;
  const sigmoid=x=>1/(1+Math.exp(-clamp(x,-20,20)));
  const category=score=>Math.floor(score/0x100000);

  function position(s,seat=s.seat){
    const occupied=s.players.filter(p=>!p.out).map(p=>p.seat);
    const order=i=>(i-s.dealer-1+s.players.length)%s.players.length;
    const clockwise=occupied.slice().sort((a,b)=>order(a)-order(b));
    const cutoff=clockwise[clockwise.length-2];
    const active=s.players.filter(p=>!p.out&&!p.folded&&p.seat!==seat);
    const anchor=s.straddle>=0?s.straddle:s.bb;
    const preOrder=i=>(i-anchor-1+s.players.length)%s.players.length;
    const name=seat===s.dealer?'BTN':seat===s.sb?'SB':seat===s.bb?'BB':seat===cutoff?'CO':clockwise.indexOf(seat)>=clockwise.length-3?'MP':'EP';
    return{name,inPosition:active.every(p=>order(p.seat)<order(seat)),
      behind:active.filter(p=>!p.allIn&&(s.street===0?preOrder(p.seat)>preOrder(seat):order(p.seat)>order(seat))).length,
      openNeed:({EP:9,MP:8,CO:6.5,BTN:5,SB:6,BB:7})[name]};
  }

  // Small samples move gradually away from a neutral prior, for every opponent.
  function profile(p){
    const t=p.stats||{},hands=Math.max(0,t.hands||0);
    const shown=(t.shownBluffs||0)+(t.shownValue||0);
    return{vpip:clamp(((t.vpip||0)+6)/(hands+22),.08,.8),
      pfr:clamp(((t.pfr||0)+4)/(hands+22),.03,.65),
      aggression:clamp(((t.raises||0)+3)/((t.raises||0)+(t.calls||0)+7),.08,.92),
      fold:clamp(((t.foldFaced||0)+4)/((t.faced||0)+10),.12,.8),
      shownBias:(((t.shownBluffs||0)+2)/(shown+6)-1/3)*(shown/(shown+8))*.3};
  }

  function features(hand,helpers){
    const hi=Math.max(...hand.map(rank)),lo=Math.min(...hand.map(rank));
    const pair=hi===lo,suited=suit(hand[0])===suit(hand[1]);
    return{hi,lo,pair,suited,wheel:hi===14&&lo<=5&&suited,
      power:pair?5+hi*.75:helpers.chen(hand)};
  }

  // A likelihood of taking an action, rather than equity versus a random hand.
  function quality(hand,board,helpers){
    if(board.length<3)return 0;
    const score=helpers.evaluate(hand.concat(board)),cat=category(score);
    const ranks=board.map(rank),top=Math.max(...ranks),hr=hand.map(rank);
    const boardCat=category(helpers.evaluate(board));
    if(cat>=3&&boardCat===cat){
      if(board.length===5&&score===helpers.evaluate(board))return .18;
      if(cat===3&&!hr.some(r=>ranks.filter(x=>x===r).length===3))return .25+Math.max(...hr)*.015;
      if(board.length===5)return .6+Math.max(...hr)*.018;
    }
    if(cat>=3)return[0,0,0,.86,.92,.96,.985,.998,1][cat];
    if(cat===2){
      const pairRanks=[Math.floor(score/0x10000)%16,Math.floor(score/0x1000)%16];
      const ownPairs=pairRanks.filter(r=>hr.includes(r));
      if(!ownPairs.length)return .16+Math.max(...hr)*.01;
      if(hr[0]===hr[1])return hr[0]>top?.72:hr[0]>Math.min(...ranks)?.46:.28;
      return ownPairs.length===2?.8:ownPairs[0]>=top?.64:.42;
    }
    if(cat===1){
      const paired=Math.floor(score/0x10000)%16;
      if(hr[0]===hr[1])return paired>top?.72:paired>=top-3?.4:.24;
      if(!hr.includes(paired))return Math.max(...hr)>=13?.2:.11;
      const kicker=hr[0]===paired?hr[1]:hr[0];
      return paired===top?.5+kicker*.012:paired>=top-3?.35:.23;
    }
    return Math.max(...hr)===14?.15:.05;
  }

  function blocker(hand,board){
    const counts=[0,0,0,0];board.forEach(c=>counts[suit(c)]++);
    return hand.some(c=>rank(c)===14&&counts[suit(c)]>=3)||
      (board.filter(c=>rank(c)>=10).length>=3&&hand.some(c=>rank(c)===14));
  }

  function publicLine(s,seat){
    // The last action on each street retains raise depth and price. Repeated
    // raises on one street must not multiply the same evidence without bound.
    const streets=new Map();
    for(const a of s.history||[])if(a.seat===seat&&a.type!=='fold')streets.set(a.street,a);
    return[...streets.values()];
  }

  function rangeFor(s,opponent,available,helpers){
    const p=profile(opponent),pos=position(s,opponent.seat),line=publicLine(s,opponent.seat);
    const combos=[],weights=[],cumulative=[];let total=0;
    for(let a=0;a<available.length;a++)for(let b=a+1;b<available.length;b++){
      const hand=[available[a],available[b]],f=features(hand,helpers);let weight=1,valueLine=1,bluffLine=1,hasBet=false;
      for(const action of line){
        if(action.street===0){
          const depth=action.raises||0;
          let need=action.type==='raise'?(depth===0?pos.openNeed:depth===1?10.5:12.5):(depth===0?5.7:depth===1?8:10.5);
          need+=(.2-p.pfr)*7;
          if(action.type==='call'&&pos.name==='BB')need-=1.3;
          const value=sigmoid((f.power-need)*1.15);
          const light=action.type==='raise'&&f.wheel?.04+p.aggression*.06:0;
          weight*=action.type==='check'?1:.025+value+light;
        }else{
          const board=action.board||s.board.slice(0,action.street+2);
          const q=quality(hand,board,helpers),d=helpers.draw(hand,board);
          const draw=(d.flush?.23:0)+(d.oesd?.18:d.gut?.07:0);
          if(action.type==='check'){valueLine*=1-q*.35;continue;}
          const size=action.increment/Math.max(1,action.pot+action.call);
          const raising=action.type==='raise'&&(action.raises||0)>0;
          const target=action.type==='call'?.3+Math.min(.23,size*.16):.46+Math.min(.22,size*.13)+(raising?.15:0);
          const value=sigmoid((q+draw-target)*10);
          valueLine*=.012+value;
          if(action.type==='raise'){
            hasBet=true;bluffLine*=draw?1.2:blocker(hand,board)?1:board.length<5?.7:.45;
          }else bluffLine*=draw?.65:.08;
        }
      }
      // A planned multi-street bluff is one hypothesis, rather than three
      // independent bluff coin flips that would erase almost every bluff.
      const bluffMix=clamp(.025+(p.aggression-.15)*.22+(p.pfr-.1)*.2+p.shownBias,.015,.3);
      weight*=(1-bluffMix)*valueLine+(hasBet?bluffMix*bluffLine:0);
      // With no voluntary action, there is no evidence to narrow a blind hand.
      weight=Math.max(1e-7,weight);combos.push(hand);weights.push(weight);total+=weight;cumulative.push(total);
    }
    return{combos,weights,cumulative,total};
  }

  function sample(range,used,random){
    for(let attempt=0;attempt<48;attempt++){
      const target=random()*range.total;let lo=0,hi=range.cumulative.length-1;
      while(lo<hi){const mid=(lo+hi)>>1;if(range.cumulative[mid]<target)lo=mid+1;else hi=mid;}
      const h=range.combos[lo];if(!used[h[0]]&&!used[h[1]])return h;
    }
    // Exact conditional fallback when several tight ranges share blockers.
    let total=0;
    range.combos.forEach((h,i)=>{if(!used[h[0]]&&!used[h[1]])total+=range.weights[i];});
    let target=random()*total;
    for(let i=0;i<range.combos.length;i++){
      const h=range.combos[i];if(used[h[0]]||used[h[1]])continue;
      target-=range.weights[i];if(target<=0)return h;
    }
    throw new Error('No compatible opponent range');
  }

  function callPrice(s){
    const me=s.players[s.seat],call=Math.min(Math.max(0,s.currentBet-me.bet),me.chips);
    const cap=me.total+call;
    const pot=s.players.reduce((n,p)=>n+Math.min(p.total,cap),0);
    return{call,pot,odds:call?call/(pot+call):0};
  }

  function estimate(s,helpers,random=Math.random,iterations=560){
    const opponents=s.players.filter(p=>p.seat!==s.seat&&!p.out&&!p.folded);
    const known=new Set(s.hand.concat(s.board)),available=Array.from({length:52},(_,i)=>i).filter(c=>!known.has(c));
    const ranges=opponents.map(p=>rangeFor(s,p,available,helpers));
    const price=callPrice(s),me=s.players[s.seat];
    if(!opponents.length)return{equity:1,rawEquity:1,nuts:true,...price};
    const myRiver=s.board.length===5?helpers.evaluate(s.hand.concat(s.board)):0;
    let nuts=s.board.length===5;
    if(nuts)for(const hand of ranges[0].combos)if(helpers.evaluate(hand.concat(s.board))>myRiver){nuts=false;break;}
    if(s.board.length===5&&opponents.length===1){
      let won=0;
      ranges[0].combos.forEach((hand,i)=>{const score=helpers.evaluate(hand.concat(s.board));won+=ranges[0].weights[i]*(myRiver>score?1:myRiver===score?.5:0);});
      const equity=won/ranges[0].total;return{equity,rawEquity:equity,nuts,...price};
    }
    // Side-pot shares only compare with opponents eligible for that layer.
    const cap=me.total+price.call,totals=s.players.map(p=>p.seat===s.seat?cap:p.total);
    const levels=[...new Set(totals.map(n=>Math.min(n,cap)).filter(n=>n>0))].sort((a,b)=>a-b);
    let previous=0;
    const layers=levels.map(level=>{const amount=totals.reduce((n,t)=>n+Math.min(t,level)-Math.min(t,previous),0);previous=level;
      return{amount,opponents:opponents.map((p,i)=>!p.allIn||p.total>=level?i:-1).filter(i=>i>=0)};});
    const potAfter=layers.reduce((n,l)=>n+l.amount,0);
    let won=0,rawWon=0;
    for(let it=0;it<iterations;it++){
      const used=new Uint8Array(52);known.forEach(c=>used[c]=1);
      const hands=ranges.map(r=>{const h=sample(r,used,random);h.forEach(c=>used[c]=1);return h;});
      const deck=available.filter(c=>!used[c]),board=s.board.slice();
      for(let k=0;k<5-s.board.length;k++){const j=k+Math.floor(random()*(deck.length-k));[deck[k],deck[j]]=[deck[j],deck[k]];board.push(deck[k]);}
      const mine=helpers.evaluate(s.hand.concat(board)),scores=hands.map(h=>helpers.evaluate(h.concat(board)));
      const share=indices=>{let ties=0;for(const i of indices){if(scores[i]>mine)return 0;if(scores[i]===mine)ties++;}return 1/(1+ties);};
      const raw=share(opponents.map((_,i)=>i));rawWon+=raw;
      won+=potAfter?layers.reduce((n,l)=>n+l.amount*share(l.opponents),0)/potAfter:raw;
    }
    return{equity:won/iterations,rawEquity:rawWon/iterations,nuts,...price};
  }

  function decide(s,helpers,random=Math.random){
    const me=s.players[s.seat],opponents=s.players.filter(p=>p.seat!==s.seat&&!p.out&&!p.folded);
    const pos=position(s),f=features(s.hand,helpers),style=s.style||{};
    const tight=clamp(finite(style.tight,0),-.12,.16),aggression=clamp(finite(style.aggr,.6),.15,.92),bluff=clamp(finite(style.bluff,.1),0,.22);
    const price=callPrice(s),pot=s.players.reduce((n,p)=>n+p.total,0),bb=s.bigBlind;
    const deepest=Math.max(0,...opponents.map(p=>p.bet+p.chips)),maxTo=Math.min(me.bet+me.chips,Math.max(s.currentBet,deepest));
    const effective=Math.max(0,Math.min(me.chips,deepest-me.bet)),depth=effective/bb;
    const canRaise=!!s.canRaise&&maxTo>s.currentBet&&s.raises<4;
    const action=(type,to,reason,extra={})=>({type,to,reason,...extra});
    const passive=reason=>action(price.call?'fold':'check',undefined,reason);
    const raise=(target,reason,flag)=>{
      const minimum=s.currentBet===0?bb:s.currentBet+s.minRaise;
      // A cover stack may put a short opponent all-in without risking more.
      const legal=Math.min(me.bet+me.chips,Math.max(minimum,Math.round(Math.min(target,maxTo))));
      return action('raise',legal,reason,{bluff:flag||null});
    };
    const unit=Math.max(1,Math.round(bb/4));
    const bet=frac=>s.currentBet+Math.round((pot+price.call)*frac/unit)*unit;
    const opponentProfile=opponents.map(profile);
    const foldRate=opponentProfile.reduce((n,p)=>n+p.fold,0)/Math.max(1,opponents.length);
    const avgAgg=opponentProfile.reduce((n,p)=>n+p.aggression,0)/Math.max(1,opponents.length);
    if(!opponents.length)return action('check',undefined,'no-opponent');

    if(s.street===0){
      const blind=s.straddle>=0?bb*2:bb;
      const unopened=s.raises===0&&s.currentBet<=blind;
      const limpers=new Set((s.history||[]).filter(a=>a.street===0&&a.type==='call').map(a=>a.seat)).size;
      const openNeed=pos.openNeed+tight*9+(limpers&&pos.name!=='BB'?.5:0);
      const premium=f.pair&&f.hi>=12||f.hi===14&&f.lo===13;
      if(unopened){
        const playable=f.power>=openNeed||(pos.name==='BTN'&&f.suited&&f.hi===14);
        if(depth<=12&&canRaise){
          const need=openNeed+1.2-Math.max(0,10-depth)*.32+(limpers?.8:0);
          if(f.power>=need||f.pair&&depth<=7)return raise(maxTo,'short-stack-value');
        }else if(playable&&canRaise){
          const size=blind*(2.3+limpers+(pos.name==='SB'?.7:0)+random()*.25);
          return raise(size,'position-open');
        }
        if(!price.call)return action('check',undefined,'free-blind');
        if(!playable&&price.odds>.13)return passive('outside-opening-range');
      }
      const opening=(s.history||[]).find(a=>a.street===0&&a.type==='raise');
      const opener=opening?s.players[opening.seat]:opponents.find(p=>p.seat===s.streetAgg);
      const read=opener?profile(opener):{pfr:.18,fold:.4};
      const lateOpen=opening&&['BTN','CO','SB'].includes(position(s,opening.seat).name);
      const estimateNeeded=f.power>=5||price.odds<.15||premium;
      if(!estimateNeeded)return passive('weak-versus-raise');
      const eq=estimate(s,helpers,random,420);
      if(canRaise){
        const value=s.raises<=1?(premium||f.pair&&f.hi>=10&&(lateOpen||read.pfr>.29)||f.hi===14&&f.lo===12&&f.suited&&pos.inPosition):
          s.raises===2?(f.pair&&f.hi>=13||premium&&depth<45):f.pair&&f.hi===14;
        if(value&&random()<.72+aggression*.27){
          const target=s.currentBet*(s.raises<=1?(pos.inPosition?3:3.8):2.25);
          return raise(depth<=18||target-me.bet>effective*.65?maxTo:target,'value-reraise');
        }
        if(!s.honest&&s.raises===1&&depth>=40&&f.wheel&&lateOpen&&read.fold>.42&&random()<bluff*1.15)
          return raise(s.currentBet*(pos.inPosition?3:3.8),'blocker-three-bet','three');
      }
      const realization=pos.inPosition?.95:pos.name==='BB'?.86:.8;
      const needed=price.odds+Math.max(0,pos.behind-1)*.012;
      if((eq.equity*(price.call>=me.chips?1:realization)>=needed&&f.power>=5.5)||f.pair&&f.hi>=13)
        return action('call',undefined,'range-and-price',{equity:eq.equity});
      if(s.raises<=1&&depth>=45&&effective>=price.call*(pos.inPosition?16:22)&&f.pair&&f.lo<10)
        return action('call',undefined,'set-implied-odds');
      if(s.raises<=1&&pos.inPosition&&f.suited&&f.hi-f.lo<=2&&f.lo>=5&&effective>=price.call*30)
        return action('call',undefined,'suited-implied-odds');
      return passive('range-too-strong');
    }

    const eq=estimate(s,helpers,random),q=quality(s.hand,s.board,helpers),draw=helpers.draw(s.hand,s.board),texture=helpers.texture(s.board);
    const strongDraw=s.street<3&&(draw.flush||draw.oesd),multi=opponents.length>1;
    const allIn=price.call>=me.chips||opponents.every(p=>p.allIn);
    const sharedNuts=eq.nuts&&s.board.length===5&&helpers.evaluate(s.board)===helpers.evaluate(s.hand.concat(s.board));
    if(sharedNuts)return action(price.call?'call':'check',undefined,'unbeatable-board-chop');
    const spr=effective/Math.max(1,pot+price.call);
    // Similar sizes for value and bluffs; texture, position and stack depth set
    // the plan. A raise reaching 45% of a stack no longer forces an auto-shove.
    let fraction=texture.wet?.66+random()*.2:.38+random()*.2;
    if(s.street===3)fraction=eq.rawEquity>.87?.7+random()*.25:.4+random()*.18;
    if(foldRate<.32&&eq.rawEquity>.7)fraction=Math.max(fraction,.75);
    if(s.strategy?.balance)fraction=texture.wet||s.street===3?.66:.5;
    else if(s.strategy?.value&&eq.rawEquity>.7)fraction=Math.min(.95,fraction+.08);
    const valueThreshold=(multi?.54:.59)-(s.strategy?.exploit&&foldRate<.32?.035:0);
    if(!price.call){
      if(canRaise&&(eq.nuts||eq.rawEquity>valueThreshold)){
        if(s.street<3&&!texture.wet&&eq.rawEquity>.86&&opponents.length===1&&random()<clamp(s.trap||.15,0,.25))
          return action('check',undefined,'protected-check');
        if(spr<1.2&&eq.rawEquity>.73)return raise(maxTo,'low-spr-value');
        return raise(bet(fraction),'value-bet');
      }
      const checkedTo=(s.history||[]).some(a=>a.street===s.street&&a.seat!==s.seat&&a.type==='check');
      const initiative=s.lastAgg===s.seat;
      const canTellStory=strongDraw||initiative&&s.street===1&&texture.dry||initiative&&s.street===2&&texture.scare&&s.strategy?.pressure||pos.inPosition&&checkedTo||s.street===3&&blocker(s.hand,s.board);
      const noShowdown=q<.24,foldChance=Math.pow(foldRate,opponents.length);
      const cost=Math.max(bb,bet(fraction)-me.bet),calledEquity=eq.rawEquity*.8;
      const ev=foldChance*pot+(1-foldChance)*(calledEquity*(pot+2*cost)-cost);
      const exploit=s.strategy?.exploit?(foldRate>.55?1.35:foldRate<.32?.55:1):1;
      const chance=(strongDraw?.23+aggression*.3:bluff*1.8+aggression*.06+(s.strategy?.pressure?.04:0))*(multi?.22:1)*exploit;
      if(canRaise&&!s.honest&&canTellStory&&(noShowdown||strongDraw)&&ev>0&&random()<chance){
        const flag=strongDraw?'semi':s.street===1&&initiative?'cbet':s.street===3?'river':'float';
        return raise(bet(fraction),'credible-bluff',flag);
      }
      return action('check',undefined,'showdown-control');
    }
    if(canRaise&&(eq.nuts||eq.rawEquity>(multi?.84:.78)+(s.raises>=2?.07:0))&&random()<.65+aggression*.3)
      return raise(spr<1.4?maxTo:bet(Math.max(.72,fraction)),'value-raise');
    if(canRaise&&!s.honest&&strongDraw&&!multi&&eq.rawEquity>.32&&foldRate>.5&&s.raises<2&&random()<bluff*.8)
      return raise(bet(.8),'draw-check-raise','semi');
    const realization=allIn||s.street===3?1:clamp((pos.inPosition?.94:.83)-(multi?.06:0),.7,1);
    if(eq.nuts||eq.equity*realization>=price.odds+(s.street===3||allIn?0:.006))
      return action('call',undefined,'profitable-call',{equity:eq.equity});
    // Implied odds require money still behind; an all-in draw gets only its
    // actual price. The required future win is bounded by effective stacks.
    const drawOdds=draw.flush&&draw.oesd?.31:draw.flush?.19:draw.oesd?.17:0;
    const futureWin=drawOdds?price.call/drawOdds-(price.pot+price.call):Infinity;
    if(!allIn&&strongDraw&&s.street<3&&pos.inPosition&&futureWin>0&&futureWin<Math.max(0,effective-price.call)*.25)
      return action('call',undefined,'draw-implied-odds');
    return passive('range-and-price-fold');
  }
  return{decide,estimate,position,profile};
});
