/* Regression for iOS pinch zoom: the visual viewport must not become the table viewport. */
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root = process.env.HOLDM_TEST_URL || 'http://terminal.local:4173';

async function snapshot(page, game){
  return {
    frame: await page.locator('#game').evaluate(el => {
      const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height};
    }),
    game: await game.evaluate(() => {
      const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};};
      const G=__holdm.G;
      return {viewport:[innerWidth,innerHeight],arena:rect(document.querySelector('.arena')),
        seats:[...document.querySelectorAll('#arena>.seat .pod')].map(rect),
        board:rect(document.getElementById('board')),
        buttons:[...document.querySelectorAll('#btns .btn:not([hidden])')].map(rect),
        state:{marker:window.zoomTestMarker,salt:G.salt,handNo:G.handNo,hand:G.players[0].hand,
          chips:G.players.map(p=>p.chips),bets:G.players.map(p=>p.bet),waiting:G.waiting,toAct:G.toAct}};
    })
  };
}

(async () => {
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args:['--no-sandbox','--disable-dev-shm-usage','--host-resolver-rules=MAP terminal.local 127.0.0.1','--no-proxy-server']});
  const report={cases:[],errors:[]};
  try {
    for(const [w,h,n] of [[390,740,6],[390,740,8],[360,640,8],[844,390,8]]){
      const context=await browser.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true,deviceScaleFactor:1});
      await context.addInitScript(n=>{
        localStorage.setItem('holdem.seats',String(n));localStorage.setItem('holdem.auto','0');
        // Reproduce Safari's visual-viewport readings while retaining a real browser zoom.
        if(window===window.top){
          Object.defineProperty(window,'innerWidth',{configurable:true,get:()=>visualViewport.width});
          Object.defineProperty(window,'innerHeight',{configurable:true,get:()=>visualViewport.height});
        }
      },n);
      const page=await context.newPage();
      page.setDefaultTimeout(10000);
      page.on('pageerror',e=>report.errors.push(e.message));
      const url=new URL(root);url.searchParams.set('selftest','1');
      await page.goto(url.href);
      await page.frameLocator('#game').locator('#stPlay').click();
      const game=page.frames().find(f=>f.url().includes('/game.html'));
      await game.evaluate(()=>{
        const {G,render,freeze}=__holdm;freeze();
        document.querySelectorAll('#fx .fly').forEach(el=>el.getAnimations().forEach(a=>a.finish()));
        window.zoomTestMarker=Math.random();window.zoomTestResizes=0;
        addEventListener('resize',()=>zoomTestResizes++);
        G.board=[42,23,0];G.street=1;G.currentBet=1145;G.waiting=true;G.thinking=-1;G.toAct=0;
        G.players.forEach((p,i)=>Object.assign(p,{chips:17155+i*10,bet:0,total:60,human:true,lastAction:'',folded:false}));
        render();
      });
      await page.waitForTimeout(1800);
      await game.evaluate(()=>zoomTestResizes=0);
      const baseline=await snapshot(page,game);
      assert.equal(baseline.game.seats.length,n);
      const cdp=await context.newCDPSession(page);
      const factors=[1.25,1.5,2,3,1];
      for(const factor of factors){
        await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:factor});
        await page.evaluate(()=>{visualViewport.dispatchEvent(new Event('resize'));dispatchEvent(new Event('resize'));});
        await page.waitForTimeout(160);
        assert.deepEqual(await snapshot(page,game),baseline,`${w}x${h}/${n} seats must retain the entire layout at ${factor}x zoom`);
        const actual=await page.evaluate(()=>visualViewport.scale);
        assert.ok(Math.abs(actual-factor)<.01,'Browser magnification must remain enabled');
      }
      assert.equal(await game.evaluate(()=>zoomTestResizes),0,'Pinching must not resize the live game');
      await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});
      await game.locator('#bOrientation').evaluate(el=>el.click());
      await page.waitForTimeout(200);
      const rotated=await snapshot(page,game);
      assert.deepEqual(rotated.game.viewport,[h,w]);
      assert.deepEqual(rotated.game.state,baseline.game.state);
      await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:3});
      await page.waitForTimeout(160);
      assert.deepEqual(await snapshot(page,game),rotated,'The manually rotated layout must also stay stable when pinched');
      await page.setViewportSize({width:h,height:w});
      await page.waitForTimeout(200);
      assert.deepEqual((await snapshot(page,game)).game.state,baseline.game.state,'Physical rotation must retain the current hand');
      await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
      await page.setViewportSize({width:w,height:h});
      await game.locator('#bOrientation').evaluate(el=>el.click());
      await page.waitForTimeout(250);
      assert.deepEqual(await snapshot(page,game),baseline,'Returning to normal zoom/orientation must restore the same layout');
      await page.screenshot({path:`artifacts/zoom-fixed-${w}x${h}-${n}seats.png`});
      report.cases.push({viewport:[w,h],seats:n,factors,geometryStable:true,frameResizesDuringPinch:0,stateRetained:true,orientationAtZoom:true});
      await context.close();
    }
    assert.deepEqual(report.errors,[]);
    fs.writeFileSync('artifacts/zoom-verification.json',JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
