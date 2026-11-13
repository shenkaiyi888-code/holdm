const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const api=process.env.HOLDM_CHAT_API||'http://127.0.0.1:4173';
const root=process.env.HOLDM_TEST_URL||'http://terminal.local:4173';
const report={api:{},viewports:[],keyboard:[],errors:[],failedRequests:[]};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(test){for(let i=0;i<150;i++){if(test())return;await pause(20);}throw new Error('Timed out waiting for SSE');}
async function post(path,body){const response=await fetch(api+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return{status:response.status,...await response.json()};}
async function stream(room,id,name){
 const abort=new AbortController(),events=[];
 const response=await fetch(`${api}/api/events?room=${room}&id=${id}&name=${encodeURIComponent(name)}`,{signal:abort.signal});
 const reading=(async()=>{const reader=response.body.getReader(),decoder=new TextDecoder();let pending='';for(;;){const {value,done}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});let end;while((end=pending.indexOf('\n\n'))>=0){const block=pending.slice(0,end);pending=pending.slice(end+2);if(block.startsWith('data: '))events.push(JSON.parse(block.slice(6)));}}})().catch(error=>{if(error.name!=='AbortError')throw error;});
 await until(()=>events.some(event=>event.t==='welcome'));
 return{events,close:async()=>{abort.abort();await reading;}};
}
async function verifyApi(){
 const first=await post('/api/create',{id:'chat-host'}),second=await post('/api/create',{id:'other-host'});
 const room=first.room,other=second.room,connections=[];
 try{
  const host=await stream(room,'chat-host','阿宁'),guest=await stream(room,'chat-guest','小林'),quick=await stream(room,'chat-quick','访客'),elsewhere=await stream(other,'other-host','隔壁');connections.push(host,guest,quick,elsewhere);
  assert.equal((await post('/api/chat',{room,id:'outsider',text:'大家好'})).status,404);
  assert.equal((await post('/api/chat',{room:other,id:'chat-host',text:'大家好'})).status,404);
  const sent=await post('/api/chat',{room,id:'chat-host',text:'大家晚上好',name:'伪造名字',from:'other-host'});assert.equal(sent.ok,true);
  await until(()=>guest.events.some(event=>event.id===sent.id));
  const received=guest.events.find(event=>event.id===sent.id);assert.equal(received.from,'chat-host');assert.equal(received.name,'阿宁');assert.equal(received.text,'大家晚上好');
  for(const [path,payload] of [
   ['/api/chat',{text:'我有AA，你跟注'}],
   ['/api/chat',{text:'好'.repeat(81)}],
   ['/api/send',{batch:[{to:'*',msg:{t:'chat',text:'r a i s e'}}]}],
   ['/api/send',{batch:[{to:'*',msg:{t:'chat',q:10}}]}],
   ['/api/send',{batch:[{to:'*',msg:{t:'chat',q:0,text:'AK'}}]}]
  ]){const result=await post(path,{room,id:'chat-host',...payload});assert.equal(result.status,400,JSON.stringify(result));}
  assert.equal((await post('/api/send',{room,id:'chat-host',batch:[{to:'*',msg:{t:'chat-history',room,messages:[{text:'AA'}]}}]})).status,403);
  assert.equal((await post('/api/chat',{room,id:'chat-host',text:'我去倒杯水'})).status,429,'Rapid repeated sends must be limited');
  const markup='<img src=x onerror=alert(1)>';
  assert.equal((await post('/api/chat',{room,id:'chat-guest',text:markup})).ok,true);
  assert.equal((await post('/api/send',{room,id:'chat-quick',batch:[{to:'*',msg:{t:'chat',q:0,name:'假房主'}}]})).ok,true,'Legacy safe emoji still work');
  await until(()=>guest.events.filter(event=>event.t==='chat').length===3);
  await guest.close();await pause(60);
  assert.equal((await post('/api/chat',{room,id:'chat-guest',text:'回来啦'})).status,403,'Disconnected members cannot send');
  const reconnected=await stream(room,'chat-guest','小林');connections.push(reconnected);
  await until(()=>reconnected.events.some(event=>event.t==='chat-history'));
  const history=reconnected.events.find(event=>event.t==='chat-history').messages;
  assert.equal(history.length,3,'Rejected content must never enter history');assert.equal(new Set(history.map(message=>message.id)).size,3);
  assert.deepEqual(history.map(message=>message.text),['大家晚上好',markup,'👍']);
  assert.equal(elsewhere.events.some(event=>event.t==='chat'),false,'Messages must remain inside their room');
  report.api={membership:true,serverIdentity:true,crossRoomPrivate:true,directAndRelayBlocked:true,retiredPresetsBlocked:true,historyForgeryBlocked:true,rateLimited:true,offlineCannotSend:true,reconnectHistory:history.length,safeLegacyEmoji:true};
 }finally{
  await post('/api/leave',{room,id:'chat-host'});await post('/api/leave',{room:other,id:'other-host'});
  await Promise.all(connections.map(connection=>connection.close()));
 }
}
async function verifyBrowser(){
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--host-resolver-rules=MAP terminal.local 127.0.0.1','--no-proxy-server']});
 let host,guest,room,id;
 try{
  async function page(){const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await context.addInitScript(()=>{localStorage.setItem('holdem.auto','0');localStorage.setItem('holdem.sound','0');});const p=await context.newPage();p.on('pageerror',error=>report.errors.push(error.message));p.on('response',response=>{if(response.status()>=400)report.failedRequests.push({status:response.status(),url:response.url()});});return p;}
  host=await page();guest=await page();await host.goto(root+'/?selftest');await host.frameLocator('#game').locator('#stOnline').click();let hf=host.frames()[1];
  await hf.locator('#ntName').fill('阿宁');await hf.locator('#ntCreate').click();await hf.waitForFunction(()=>__holdm.NET.conn&&__holdm.NET.room);
  ({room,id}=await hf.evaluate(()=>({room:__holdm.NET.room,id:__holdm.NET.id})));await hf.locator('#ntClose').click();
  await guest.goto(root+`/?room=${room}&selftest`);let gf=guest.frames()[1];await gf.locator('#ntName').fill('小林');await gf.locator('#ntJoin').click();await gf.waitForFunction(()=>__holdm.NET.conn);
  await host.waitForTimeout(600);
  for(const f of [hf,gf])await f.evaluate(()=>{__holdm.freeze();clearTimeout(__holdm.NET.clockT);__holdm.G.paused=true;});
  await hf.evaluate(()=>{const G=__holdm.G;G.waiting=true;G.handOver=false;G.toAct=0;G.thinking=-1;G.players[0].out=false;G.players[0].folded=false;__holdm.render();});
  await host.waitForTimeout(250);
  const state=f=>f.evaluate(()=>{const G=__holdm.G;return{salt:G.salt,hand:G.handNo,board:G.board,toAct:G.toAct,players:G.players.map(p=>({hand:p.hand,chips:p.chips,bet:p.bet,total:p.total,folded:p.folded}))};});
  const beforeHost=await state(hf),beforeGuest=await state(gf);let requests=0;
  host.on('request',request=>{if(request.url().endsWith('/api/chat'))requests++;});
  await hf.locator('#bChat').click();await hf.locator('#chatInput').pressSequentially('fcr fcr');
  assert.deepEqual(await state(hf),beforeHost,'Typing must never activate fold/check/raise hotkeys');
  await hf.locator('#chatInput').fill('大家晚上好，玩得开心');
  await hf.locator('#chatInput').dispatchEvent('keydown',{key:'Enter',isComposing:true});assert.equal(requests,0,'IME confirmation must not submit chat');
  await hf.locator('#chatInput').press('Enter');await gf.waitForFunction(()=>document.querySelectorAll('.room-chat-message').length===1);
  assert.equal(await hf.locator('#chatInput').inputValue(),'');assert.equal(await gf.locator('#chatUnread').textContent(),'1');
  await hf.locator('#chatInput').fill('我有AA，你跟注');await hf.locator('#chatSend').click();
  assert.match(await hf.locator('#chatError').innerText(),/只聊日常/);assert.equal(requests,1,'Known poker discussion should be caught before posting');
  assert.equal(await gf.locator('.room-chat-message').count(),1);await host.screenshot({path:'artifacts/room-chat-blocked.png'});
  await gf.locator('#bChat').click();assert.equal(await gf.locator('#chatUnread').isVisible(),false);
  await gf.locator('#chatInput').fill('我去倒杯水，稍等一下');await gf.locator('#chatSend').click();await hf.waitForFunction(()=>document.querySelectorAll('.room-chat-message').length===2);
  await host.waitForTimeout(1250);await hf.locator('#chatInput').fill('<img src=x onerror=alert(1)>');await hf.locator('#chatSend').click();await gf.waitForFunction(()=>document.querySelectorAll('.room-chat-message').length===3);
  assert.equal(await gf.locator('.room-chat-message img').count(),0);assert.equal(await gf.locator('.room-chat-text').last().innerText(),'<img src=x onerror=alert(1)>');
  assert.deepEqual(await state(hf),beforeHost);assert.deepEqual(await state(gf),beforeGuest);
  await host.screenshot({path:'artifacts/room-chat-phone.png'});
  await hf.locator('#chatClose').click();await hf.locator('#bOrientation').click();await hf.locator('#bChat').click();
  assert.equal(await hf.locator('.room-chat-message').count(),3);assert.deepEqual(await state(hf),beforeHost);await hf.locator('#chatClose').click();await hf.locator('#bOrientation').click();
  await hf.evaluate(()=>{__holdm.G.waiting=true;__holdm.G.handOver=false;__holdm.render();});await hf.locator('#bChat').click();
  for(const [w,h] of [[320,568],[360,640],[390,740],[390,844],[768,1024],[1024,768],[1440,900],[844,390],[390,420]]){
   await host.setViewportSize({width:w,height:h});await host.waitForTimeout(100);
   await host.evaluate(()=>{const physical=document.documentElement.clientWidth>=document.documentElement.clientHeight?'landscape':'portrait';if(HoldmShell.mode!==physical)HoldmShell.toggleLayout();});await host.waitForTimeout(50);
   const layout=await hf.evaluate(()=>{const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};};return{viewport:[innerWidth,innerHeight],dialog:rect(document.getElementById('chatPop')),input:rect(document.getElementById('chatInput')),send:rect(document.getElementById('chatSend')),close:rect(document.getElementById('chatClose')),turn:rect(document.getElementById('chatTurn')),history:rect(document.getElementById('chatMessages')),font:getComputedStyle(document.getElementById('chatInput')).fontSize,scroll:document.getElementById('chatPop').scrollWidth,client:document.getElementById('chatPop').clientWidth};});
   for(const name of ['dialog','input','send','close','turn','history']){const r=layout[name];assert.ok(r.x>=-1&&r.y>=-1&&r.x+r.w<=layout.viewport[0]+1&&r.y+r.h<=layout.viewport[1]+1,JSON.stringify({w,h,name,layout}));}
   assert.ok(layout.history.h>=32,'Short screens still need a readable message area');assert.ok(parseFloat(layout.font)>=16,'Phone inputs must not trigger text-field auto-zoom');assert.ok(layout.input.h>=44&&layout.send.h>=44);assert.ok(layout.scroll<=layout.client+1);
   if(w===320||w===844||w===1440)await host.screenshot({path:`artifacts/room-chat-${w}x${h}.png`});report.viewports.push(layout);
  }
  await host.setViewportSize({width:390,height:844});await host.waitForTimeout(100);
  await host.evaluate(()=>{if(HoldmShell.mode!=='portrait')HoldmShell.toggleLayout();});
  for(const mode of ['portrait','landscape']){
   await hf.locator('#chatClose').click();
   await host.evaluate(mode=>{if(HoldmShell.mode!==mode)HoldmShell.toggleLayout();},mode);
   await hf.locator('#bChat').click();
   await hf.locator('#chatInput').focus();
   const before=await hf.evaluate(()=>({frame:[innerWidth,innerHeight],arena:document.getElementById('arena').getBoundingClientRect().toJSON(),salt:__holdm.G.salt}));
   await host.evaluate(()=>{Object.defineProperty(visualViewport,'height',{configurable:true,value:360});visualViewport.dispatchEvent(new Event('resize'));});await host.waitForTimeout(100);
   const visible=await hf.evaluate(()=>{const frame=frameElement.getBoundingClientRect(),m=new DOMMatrix(parent.getComputedStyle(frameElement).transform);const rect=document.getElementById('chatPop').getBoundingClientRect();const points=[[rect.left,rect.top],[rect.right,rect.top],[rect.left,rect.bottom],[rect.right,rect.bottom]].map(([x,y])=>{const dx=x-innerWidth/2,dy=y-innerHeight/2;return{x:frame.x+frame.width/2+m.a*dx+m.c*dy,y:frame.y+frame.height/2+m.b*dx+m.d*dy};});return{points,frame:[innerWidth,innerHeight],arena:document.getElementById('arena').getBoundingClientRect().toJSON(),salt:__holdm.G.salt,input:document.getElementById('chatInput').getBoundingClientRect().toJSON(),dialog:rect.toJSON()};});
   assert.deepEqual(visible.frame,before.frame,'The soft keyboard must not resize the poker iframe');assert.deepEqual(visible.arena,before.arena,'Keyboard fitting must not move the table');assert.equal(visible.salt,before.salt);
   for(const point of visible.points)assert.ok(point.x>=-1&&point.x<=391&&point.y>=-1&&point.y<=361,JSON.stringify({mode,visible}));
   assert.ok(visible.input.bottom<=visible.dialog.bottom-4);
   await host.screenshot({path:`artifacts/room-chat-keyboard-${mode}.png`});report.keyboard.push({mode,visibleHeight:360,tableUnchanged:true,dialogVisible:true});
   await host.evaluate(()=>{delete visualViewport.height;visualViewport.dispatchEvent(new Event('resize'));});await host.waitForTimeout(60);
  }
  await guest.reload();gf=guest.frames()[1];await gf.locator('#ntJoin').click();await gf.waitForFunction(()=>window.__holdm?.NET.conn);await gf.locator('#bChat').click();await gf.waitForFunction(()=>document.querySelectorAll('.room-chat-message').length===3);
  assert.equal(await gf.locator('#chatUnread').isVisible(),false,'Replayed history should not become unread spam');
  await hf.locator('#chatInput').fill('晚安，明天见');await hf.locator('#chatClose').click();await hf.locator('#bMenu').click();await hf.locator('#bOnline').click();await hf.locator('#ntLeave').click();
  assert.equal(await hf.locator('#chatInput').inputValue(),'');assert.equal(await hf.locator('.room-chat-message').count(),0);assert.equal(await hf.locator('#bChat').isVisible(),false);assert.equal(await hf.locator('#chatPop').isVisible(),false);
  report.browser={twoActualPlayers:true,typingKeepsHand:true,imeSafe:true,localBlock:true,unread:true,markupIsText:true,sameHandOrientation:true,reloadHistory:true,draftClearedOnLeave:true};
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);
 }finally{if(room&&id)await post('/api/leave',{room,id});await browser.close();}
}
(async()=>{await verifyApi();await verifyBrowser();fs.writeFileSync('artifacts/room-chat-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({api:report.api,browser:report.browser,viewports:report.viewports.length,errors:report.errors}));})().catch(error=>{console.error(error);process.exitCode=1;});
