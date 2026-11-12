/* The same game document stays alive while its viewport changes. No game state is copied. */
(() => {
  'use strict';
  const frame = document.getElementById('game');
  let selected = null;
  const physical = () => innerWidth >= innerHeight ? 'landscape' : 'portrait';
  function fit(){
    const w = innerWidth, h = innerHeight;
    const mode = selected || physical();
    const touch = matchMedia('(pointer:coarse)').matches || Math.min(w,h) < 600;
    let fw = w, fh = h, rotation = 0;
    if (touch && mode !== physical()) { fw = h; fh = w; rotation = physical() === 'portrait' ? 90 : -90; }
    else if (!touch && mode === 'portrait' && w > h) { fw = Math.min(w, h * .65); }
    else if (!touch && mode === 'landscape' && h > w) { fh = Math.min(h, w * .68); }
    Object.assign(frame.style, {width:fw+'px',height:fh+'px',transform:`translate(-50%,-50%) rotate(${rotation}deg)`});
    try { frame.contentWindow.dispatchEvent(new CustomEvent('holdm:layout', {detail:{mode,rotation}})); } catch (_) {}
  }
  window.HoldmShell = {
    toggleLayout(){ selected = (selected || physical()) === 'portrait' ? 'landscape' : 'portrait'; fit(); return selected; },
    get mode(){ return selected || physical(); },
    syncHash(hash){ if(location.hash !== hash) history.replaceState(null,'',location.pathname+location.search+hash); }
  };
  frame.src = '/game.html' + location.search + location.hash;
  frame.addEventListener('load',fit);
  addEventListener('resize',fit);
  visualViewport?.addEventListener('resize',fit);
  addEventListener('hashchange',()=>{ try { if(frame.contentWindow.location.hash !== location.hash) frame.contentWindow.location.hash=location.hash; } catch(_){} });
  fit();
})();
