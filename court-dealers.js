/* The approved J/Q/K cast is presentation only; it never owns the poker state. */
(() => {
  'use strict';
  const asset = name => '/assets/table-v2/' + name;
  const key = 'holdem.court.v1';
  const cast = {
    j: {rank:'J',name:'近卫',eyes:[[36.84,44.98,4.7,2.3],[49.76,43.5,5.2,2.7]],period:'7.1s'},
    q: {rank:'Q',name:'王后',eyes:[[47.77,44.38,6,3.3],[60.85,44.46,6,3.3]],period:'8.3s'},
    k: {rank:'K',name:'君王',eyes:[[44.42,39.07,5.4,2.6],[56.46,39.07,5.4,2.6]],period:'9.7s'}
  };
  let saved;
  try { saved=JSON.parse(localStorage.getItem(key)); } catch (_) {}
  const prefs={dealer:['j','q','k'].includes(saved?.dealer)?saved.dealer:'k',visible:saved?.visible!==false,motion:saved?.motion!==false};
  const remember=()=>{try{localStorage.setItem(key,JSON.stringify(prefs));}catch(_) {}};
  function portrait(id,lazy=false){
    const span=document.createElement('span');span.className='court-portrait';span.dataset.character=id;span.setAttribute('aria-hidden','true');
    span.style.setProperty('--blink-period',cast[id].period);
    const mask=cast[id].eyes.map(([x,y,rx,ry])=>`radial-gradient(ellipse ${rx}% ${ry}% at ${x}% ${y}%,#000 65%,transparent 100%)`).join(',');
    const base=new Image(768,768);base.loading='eager';base.src=asset(`court-${id}.webp`);base.alt='';base.draggable=false;base.decoding='sync';
    const blink=new Image(768,768);blink.loading=lazy?'lazy':'eager';blink.src=asset(`court-${id}-blink.webp`);blink.alt='';blink.draggable=false;blink.decoding='async';blink.className='court-blink';
    blink.style.maskImage=mask;blink.style.webkitMaskImage=mask;
    // The eye patches come from generated blink frames. The approved face,
    // costume and silhouette remain the base image throughout the animation.
    span.append(base,blink);return span;
  }
  const button=document.createElement('button');button.id='bCourtDealer';button.type='button';button.className='court-button';
  button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','courtPicker');button.setAttribute('aria-expanded','false');
  const toolbar=document.createElement('div');toolbar.className='court-toolbar';
  const orientation=document.getElementById('bOrientation'),menu=document.getElementById('bMenu');
  orientation.before(toolbar);toolbar.append(orientation,menu);toolbar.before(button);
  const dialog=document.createElement('dialog');dialog.id='courtPicker';dialog.className='court-picker';dialog.setAttribute('aria-labelledby','courtTitle');
  dialog.innerHTML='<div class="court-heading"><div><h2 id="courtTitle">选择荷官</h2><p>安静陪局</p></div><button type="button" class="court-done">完成</button></div><div class="court-options" role="group" aria-label="荷官角色"></div><label class="court-motion"><input type="checkbox" id="courtMotion">轻微待机动作</label>';
  document.body.append(dialog);
  const options=dialog.querySelector('.court-options');
  Object.entries(cast).forEach(([id,character])=>{
    const choice=document.createElement('button');choice.type='button';choice.className='court-choice';choice.dataset.dealer=id;
    choice.setAttribute('aria-label',`选择 ${character.rank} · ${character.name}`);
    const title=document.createElement('span');title.className='court-choice-name';title.textContent=`${character.rank} · ${character.name}`;
    choice.append(portrait(id,true),title);choice.onclick=()=>{prefs.dealer=id;remember();update();dialog.close();};options.append(choice);
  });
  const visibilityLabel=document.createElement('label');visibilityLabel.className='toggle';visibilityLabel.htmlFor='courtVisible';
  const visibility=document.createElement('input');visibility.type='checkbox';visibility.id='courtVisible';
  visibilityLabel.append(visibility,document.createTextNode(' 显示荷官'));document.querySelector('.top .meta').append(visibilityLabel);
  const menuChoice=document.createElement('button');menuChoice.type='button';menuChoice.className='ghost';menuChoice.textContent='更换荷官';
  document.querySelector('.top .meta').append(menuChoice);
  const motion=dialog.querySelector('#courtMotion');
  function update(){
    const character=cast[prefs.dealer];
    if(button.dataset.dealer!==prefs.dealer){
      const rank=document.createElement('span');rank.className='court-rank';rank.textContent=`${character.rank} · 荷官`;
      button.replaceChildren(portrait(prefs.dealer),rank);button.dataset.dealer=prefs.dealer;
    }
    button.hidden=!prefs.visible;button.title=`${character.rank} · ${character.name}，点击切换荷官`;
    button.setAttribute('aria-label',`切换荷官，当前 ${character.rank} · ${character.name}`);
    document.body.classList.toggle('court-still',!prefs.motion);
    document.body.classList.toggle('court-header',prefs.visible);
    visibility.checked=prefs.visible;motion.checked=prefs.motion;
    options.querySelectorAll('button').forEach(choice=>choice.setAttribute('aria-pressed',String(choice.dataset.dealer===prefs.dealer)));
    window.HoldmUI?.layout();
  }
  function openPicker(){
    document.querySelector('.top').classList.remove('open');
    const menu=document.getElementById('bMenu');menu.setAttribute('aria-expanded','false');menu.textContent='菜单';
    dialog.showModal();button.setAttribute('aria-expanded','true');options.querySelector('[aria-pressed=true]').focus();
  };
  button.onclick=openPicker;menuChoice.onclick=openPicker;
  dialog.querySelector('.court-done').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{button.setAttribute('aria-expanded','false');(button.getBoundingClientRect().width?button:document.getElementById('bMenu')).focus();});
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
  });
  visibility.onchange=()=>{prefs.visible=visibility.checked;remember();update();};
  motion.onchange=()=>{prefs.motion=motion.checked;remember();update();};
  window.HoldmCourt={
    origin(){
      const r=button.getBoundingClientRect();
      return r.width&&r.height?{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height}:null;
    }
  };
  update();
})();
