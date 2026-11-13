/* Presentation bridge for the existing Holdm engine. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const asset = name => '/assets/table-v2/' + name;
  const origin=document.createElement('span');origin.className='deal-origin';origin.setAttribute('aria-hidden','true');$('.felt').append(origin);
  const orientation=document.createElement('button');orientation.type='button';orientation.id='bOrientation';orientation.className='ghost';
  $('#bMenu').before(orientation);
  function label(){const mode=window.parent.HoldmShell?.mode || (innerWidth>innerHeight?'landscape':'portrait');orientation.textContent=mode==='portrait'?'横屏':'竖屏';orientation.setAttribute('aria-label',`切换到${orientation.textContent}布局`);orientation.setAttribute('aria-pressed',String(mode==='landscape'));}
  orientation.onclick=()=>{ if(parent.HoldmShell)parent.HoldmShell.toggleLayout();label(); };
  addEventListener('holdm:layout',label);addEventListener('resize',()=>{document.querySelectorAll('#fx .fly').forEach(el=>el.getAnimations().forEach(a=>a.finish()));label();});label();
  addEventListener('hashchange',()=>parent.HoldmShell?.syncHash(location.hash));
  $('.brand .logo').innerHTML='<img src="'+asset('icons/suit-spade-fill.svg')+'" alt="">';
  $('.brand .byline').textContent='德州扑克';
  const note=document.createElement('span');note.className='table-note';note.textContent='A GOOD HAND. A GOOD EVENING.';$('.felt').append(note);
  const chipImage=()=>`<img src="${asset('chip-5.webp')}" alt="">`;
  const coin=$('.pot .coin');coin.classList.add('chip-token');coin.setAttribute('aria-hidden','true');coin.innerHTML=chipImage();
  // Keep the existing transfer-animation hook, with one texture instead of a chip pile.
  const stack=()=>`<span class="chip-token" aria-hidden="true">${chipImage()}</span>`;
  const seen=new Set();
  function action(i,kind,g,sound){
    const signature=g.id || `${g.hand}|${g.street}|${i}|${g.text}`;
    if(seen.has(signature))return;seen.add(signature);if(seen.size>256)seen.delete(seen.values().next().value);
    const seat=document.querySelectorAll('#arena > .seat')[i];if(!seat)return;
    if(kind==='check'||kind==='bet'||kind==='raise') sound(kind);
    const pod=seat.querySelector('.pod');
    if(!reduced.matches){
      if(kind==='check')pod.animate([{translate:'0 0'},{translate:'0 2px',offset:.2},{translate:'0 0',offset:.4},{translate:'0 2px',offset:.6},{translate:'0 0'}],{duration:320,easing:'ease-out'});
      else if(kind==='bet'||kind==='raise')pod.animate([{boxShadow:'0 0 0 0 #c4b39566'},{boxShadow:`0 0 0 ${kind==='raise'?10:6}px #c4b39500`}],{duration:520,easing:'ease-out'});
      const tag=seat.querySelector('.tag');tag.animate([{opacity:.4,translate:'0 3px'},{opacity:1,translate:'0 0'}],{duration:220,easing:'ease-out'});
    }
    document.dispatchEvent(new CustomEvent('holdm:feedback',{detail:{kind,seat:i}}));
  }
  const arena=$('#arena');
  let seatLayout='',layoutFrame=0;
  function layoutSeats(){
    layoutFrame=0;
    const seats=[...arena.querySelectorAll(':scope > .seat')];
    const w=arena.clientWidth,h=arena.clientHeight;
    if(!w||!h||!seats.length)return;
    const portrait=matchMedia('(orientation: portrait)').matches;
    const sizes=seats.map(el=>({w:el.offsetWidth,h:el.offsetHeight,hole:el.querySelector('.hole').offsetHeight+4}));
    const boards=$('#board2').hidden?1:2;
    const signature=[w,h,portrait,boards,...sizes.flatMap(s=>[s.w,s.h,s.hole])].join(':');
    if(signature===seatLayout)return;
    seatLayout=signature;
    const gap=w<600?6:10,topIndex=seats.length===8?4:3;
    const side=Math.max(...sizes.filter((_,i)=>i!==0&&i!==topIndex).map(s=>s.w));
    const top=sizes[topIndex].h+gap;
    const bottom=sizes[0].h+gap;
    const tableW=w-2*(side+gap),availableH=h-top-bottom;
    const tableH=portrait?availableH:Math.min(availableH,tableW/1.65);
    const tableY=top+(availableH-tableH)/2;
    const cx=w/2,cy=tableY+tableH/2,rx=tableW/2,ry=tableH/2;
    const rail=Math.max(10,Math.min(24,Math.round(w*(portrait?.034:.02))));
    const contentH=tableH-sizes[topIndex].hole-sizes[0].hole-gap*2;
    const boardGap=w<400?4:6,centerGap=contentH<190?5:10;
    const cardW=Math.max(20,Math.min(76,(tableW-rail*2-boardGap*4-16)/5,(contentH-48-centerGap*(boards+2))/(1.4*boards)));
    const vars={'table-x':cx-rx,'table-y':tableY,'table-w':tableW,'table-h':tableH,'rail-w':rail,'board-cw':cardW,'board-gap':boardGap,'center-gap':centerGap,'center-shift':(sizes[0].hole-sizes[topIndex].hole)/2};
    Object.entries(vars).forEach(([key,value])=>arena.style.setProperty('--'+key,value+'px'));
    const angles=seats.length===8?[90,140,180,220,270,320,0,40]:[90,150,210,270,330,30];
    seats.forEach((el,i)=>{
      const a=angles[i]*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a),s=sizes[i];
      const sx=Math.abs(dx)<.001?0:Math.sign(dx),sy=Math.abs(dy)<.001?0:Math.sign(dy);
      let x=cx+rx*dx+sx*s.w/2+dx*gap,y=cy+ry*dy+sy*s.h/2+dy*gap;
      el.dataset.edge=i===0?'bottom':i===topIndex?'top':dx<0?'left':'right';
      el.style.setProperty('--seat-x',x+'px');el.style.setProperty('--seat-y',y+'px');
    });
    // The engine's existing collision-aware marker follows the new seat positions.
    document.dispatchEvent(new Event('holdm:table-layout'));
  }
  function scheduleSeats(){if(!layoutFrame)layoutFrame=requestAnimationFrame(layoutSeats);}
  new ResizeObserver(scheduleSeats).observe(arena);
  document.fonts.ready.then(()=>{seatLayout='';scheduleSeats();});
  window.HoldmUI={
    stack,
    action,
    layout(){seatLayout='';layoutSeats();},
    sync(G,seats){
      seats.forEach((el,i)=>{el.setAttribute('aria-label',`${G.players[i].name}，筹码 ${G.players[i].chips}${el.classList.contains('turn')?'，正在行动':''}`);el.querySelector('.tag').title=el.querySelector('.tag').textContent;});
      layoutSeats();
      $('#bOrientation').disabled=false;
    }
  };
  // One live region for action announcements; unchanged engine status remains visible.
  $('#status').setAttribute('aria-live','polite');
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('.top').classList.remove('open');$('#bMenu').setAttribute('aria-expanded','false');$('#bMenu').textContent='菜单';}});
})();
