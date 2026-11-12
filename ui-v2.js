/* Presentation bridge for the existing Holdm engine. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const asset = name => '/assets/table-v2/' + name;
  const urls = [];
  const atlas = new Image();
  atlas.onload = () => {
    ['felt','leather','paper'].forEach((name,i) => {
      const canvas = document.createElement('canvas'); canvas.width=384;canvas.height=384;
      canvas.getContext('2d').drawImage(atlas,atlas.width*(i/3)+40,atlas.height*.2,atlas.width/3-80,atlas.height*.6,0,0,384,384);
      canvas.toBlob(blob=>{ if(!blob)return;const u=URL.createObjectURL(blob);urls.push(u);document.documentElement.style.setProperty('--texture-'+name,`url("${u}")`); });
    });
  };
  atlas.src=asset('materials.webp');
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
  window.HoldmUI={
    stack,
    action,
    sync(G,seats){
      seats.forEach((el,i)=>{el.setAttribute('aria-label',`${G.players[i].name}，筹码 ${G.players[i].chips}${el.classList.contains('turn')?'，正在行动':''}`);});
      $('#bOrientation').disabled=false;
    }
  };
  // One live region for action announcements; unchanged engine status remains visible.
  $('#status').setAttribute('aria-live','polite');
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('.top').classList.remove('open');$('#bMenu').setAttribute('aria-expanded','false');$('#bMenu').textContent='菜单';}});
})();
