const assert=require('node:assert/strict');
const policy=require('../chat-policy.js');
// No keyword blacklist: everyday sentences (and anything else) pass. Who may type
// is decided per hand by the server, see server.js prepareChat.
const allowed=['大家晚上好','我跟你说个事','你下班了吗','我加你微信','一对一聊','品牌','口袋妖怪','call me later','Hello everyone!','<img src=x onerror=alert(1)>'];
for(const text of allowed)assert.equal(policy.validate({text}).ok,true,`Should pass: ${text}`);
for(const [q,text] of Object.entries(policy.QUICK)){
  assert.deepEqual(policy.validate({q:+q}),{ok:true,text,q:+q});
  assert.equal(policy.validate({text}).ok,true);
}
for(let q=10;q<=25;q++)assert.equal(policy.validate({q}).ok,false,'Legacy poker phrases must remain retired');
for(const input of [null,{},[],{text:123},{text:' '},{text:'​‮'},{text:'好'.repeat(81)},{q:'0'},{q:0,text:'AA'},{q:999},{q:NaN}])assert.equal(policy.validate(input).ok,false);
assert.equal(policy.validate({text:'好'.repeat(80)}).ok,true);
assert.equal(policy.validate({text:'  大家\n 好  '}).text,'大家 好');
assert.equal(typeof policy.LOCKED_ERROR,'string');
console.log(JSON.stringify({allowed:allowed.length,quick:Object.keys(policy.QUICK).length,legacyRetired:16}));
