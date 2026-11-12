/* The same game document stays alive while its viewport changes. No game state is copied. */
(() => {
  'use strict';
  const frame = document.getElementById('game');
  let selected = null;
  let layout = '', resizeFrame = 0;
  // Safari can report the zoomed visual viewport through innerWidth/innerHeight.
  // The iframe must keep the layout viewport so a pinch magnifies one stable table.
  const viewport = () => ({w:document.documentElement.clientWidth, h:document.documentElement.clientHeight});
  const physical = () => { const {w,h}=viewport(); return w >= h ? 'landscape' : 'portrait'; };
  function fit(){
    const {w,h} = viewport();
    if (!w || !h) return;
    const mode = selected || physical();
    const touch = matchMedia('(pointer:coarse)').matches || Math.min(w,h) < 600;
    let fw = w, fh = h, rotation = 0;
    if (touch && mode !== physical()) { fw = h; fh = w; rotation = physical() === 'portrait' ? 90 : -90; }
    else if (!touch && mode === 'portrait' && w > h) { fw = Math.min(w, h * .65); }
    else if (!touch && mode === 'landscape' && h > w) { fh = Math.min(h, w * .68); }
    const nextLayout = `${fw}:${fh}:${rotation}:${mode}`;
    if (layout === nextLayout) return;
    layout = nextLayout;
    Object.assign(frame.style, {width:fw+'px',height:fh+'px',transform:`translate(-50%,-50%) rotate(${rotation}deg)`});
    try { frame.contentWindow.dispatchEvent(new CustomEvent('holdm:layout', {detail:{mode,rotation}})); } catch (_) {}
  }
  window.HoldmShell = {
    toggleLayout(){ selected = (selected || physical()) === 'portrait' ? 'landscape' : 'portrait'; fit(); return selected; },
    get mode(){ return selected || physical(); },
    syncHash(hash){ if(location.hash !== hash) history.replaceState(null,'',location.pathname+location.search+hash); }
  };
  function scheduleFit(){
    if (!resizeFrame) resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; fit(); });
  }
  frame.src = '/game.html' + location.search + location.hash;
  frame.addEventListener('load',() => { layout = ''; fit(); });
  addEventListener('resize',scheduleFit);
  window.visualViewport?.addEventListener('resize',scheduleFit);
  addEventListener('hashchange',()=>{ try { if(frame.contentWindow.location.hash !== location.hash) frame.contentWindow.location.hash=location.hash; } catch(_){} });
  fit();
})();
