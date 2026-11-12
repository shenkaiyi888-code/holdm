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
  const potChips=document.createElement('div');potChips.className='pot-chips';potChips.setAttribute('aria-hidden','true');$('.pot').before(potChips);
  const chipProfiles={};
  [5].forEach(n=>{
    const img=new Image();img.onload=()=>{
      // Only sample alpha bounds. Every denomination uses the master's shared display geometry.
      const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
      const data=ctx.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=0,y1=0;
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>200){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
      if(x1>x0){chipProfiles[n]={x:x0/img.width,y:y0/img.height,w:(x1-x0+1)/img.width,h:(y1-y0+1)/img.height};document.querySelectorAll('.chip-image').forEach(el=>profile(el,5));}
    };img.src=asset(`chip-${n}.webp`);
  });
  function profile(el,n){const p=chipProfiles[5];if(!p)return;const im=el.firstElementChild;im.style.cssText=`width:${100/p.w}%;height:${100/p.h}%;left:${-p.x/p.w*100}%;top:${-p.y/p.h*100}%`;el.style.maskSize=`${100/p.w}% ${100/p.h}%`;el.style.maskPosition=`${p.x/(1-p.w)*100}% ${p.y/(1-p.h)*100}%`;}
  function stack(n,count=3){const html=`<span class="chip-stack" style="--layers:${count}" aria-hidden="true">${Array.from({length:count},(_,i)=>`<span class="chip-image" data-value="${n}" style="--layer:${i}"><img src="${asset(`chip-${n}.webp`)}" alt=""></span>`).join('')}</span>`;if(!chipProfiles[5])return html;const tmp=document.createElement('div');tmp.innerHTML=html;decorate(tmp);return tmp.innerHTML;}
  function decorate(root){root.querySelectorAll('.chip-image').forEach(el=>profile(el,+el.dataset.value));}
  let lastPot=-1;
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
      const total=G.potCleared?0:G.players.reduce((sum,p)=>sum+(p.total||0),0);
      if(total!==lastPot){lastPot=total;potChips.innerHTML=total>0?stack(total>=100?100:total>=25?25:5,Math.min(5,Math.max(2,Math.ceil(total/70))))+stack(5,2):'';decorate(potChips);}
      seats.forEach((el,i)=>{el.setAttribute('aria-label',`${G.players[i].name}，筹码 ${G.players[i].chips}${el.classList.contains('turn')?'，正在行动':''}`);});
      decorate(document.getElementById('fx'));
      $('#bOrientation').disabled=false;
    }
  };
  // One live region for action announcements; unchanged engine status remains visible.
  $('#status').setAttribute('aria-live','polite');
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('.top').classList.remove('open');$('#bMenu').setAttribute('aria-expanded','false');$('#bMenu').textContent='菜单';}});
})();
