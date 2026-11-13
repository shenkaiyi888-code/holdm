const assert=require('node:assert/strict');
const policy=require('../chat-policy.js');
const allowed=['大家晚上好','我去倒杯水','稍等一下，网络有点慢','谢谢啦 🙏','Yi 很帅','手机快没电了','我有点卡','我20分钟后回来','一起吃饭吗','周末快乐','Hello everyone!','Thanks!','Happy birthday','okay, see you later','Please wait a minute','My phone is slow','<img src=x onerror=alert(1)>'];
const blocked=['我有AA','A K s','ＱＱ','Ａ\u200bＡ','АА','A.A','AKo','一对K','手里有A','我的是K','我拿了10','我的牌很大','你跟注','别跟','弃了吧','你加100','加 500','全下','梭哈','三条','同花顺','紅桃A','方塊Q','翻牌后胜率多少','筹码还剩多少','這手棄牌','♠','🂡','I have aces','you should raise','r a i s e','r.a.i.s.e','râïse','fold now','ALL-IN','check please','Can you call?','I flopped a pair','flop','river','nuts','j i a z h u','AK','99','TT','K','8','my cards are strong','a flush draw','pot odds','overpair'];
for(const text of allowed)assert.equal(policy.validate({text}).ok,true,`Normal chat should pass: ${text}`);
for(const text of blocked)assert.equal(policy.validate({text}).ok,false,`Poker discussion must be blocked: ${text}`);
for(const [q,text] of Object.entries(policy.QUICK)){
  assert.deepEqual(policy.validate({q:+q}),{ok:true,text,q:+q});
  assert.equal(policy.validate({text}).ok,true);
}
for(let q=10;q<=25;q++)assert.equal(policy.validate({q}).ok,false,'Legacy poker phrases must remain retired');
for(const input of [null,{},[],{text:123},{text:' '},{text:'\u200b\u202e'},{text:'好'.repeat(81)},{q:'0'},{q:0,text:'AA'},{q:999},{q:NaN}])assert.equal(policy.validate(input).ok,false);
assert.equal(policy.validate({text:'好'.repeat(80)}).ok,true);
assert.equal(policy.validate({text:'😀'.repeat(80)}).ok,true);
assert.equal(policy.validate({text:'  大家\n 好  '}).text,'大家 好');
console.log(JSON.stringify({allowed:allowed.length,blocked:blocked.length,quick:Object.keys(policy.QUICK).length,legacyRetired:16,lengthAndTypes:true}));
