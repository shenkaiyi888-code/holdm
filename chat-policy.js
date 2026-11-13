/* One policy for browser feedback and the authoritative room server. */
((root, factory) => {
  const policy = factory();
  if (typeof module === 'object' && module.exports) module.exports = policy;
  else root.HoldmChatPolicy = policy;
})(globalThis, () => {
  'use strict';
  const MAX_LENGTH = 80;
  // Keep the original emoji IDs. Retired poker lines (10–25) must stay unused:
  // an old client would interpret those numbers as its old poker discussion.
  const QUICK = Object.freeze({
    0:'👍',1:'😂',2:'😮',3:'😭',4:'🔥',5:'🙏',6:'🤔',7:'😎',8:'🤡',9:'💀',
    26:'大家好',27:'晚上好',28:'稍等一下',29:'网络有点慢',30:'回来啦',
    31:'玩得开心',32:'谢谢',33:'辛苦啦',34:'休息一下',35:'晚安'
  });
  const POKER_ERROR = '只聊日常：请勿讨论手牌、牌力、下注或行动建议。';
  const chinese = /牌|扑克|撲克|德州|底池|筹码|籌碼|跟注|加注|下注|押注|压注|壓注|弃掉|棄掉|弃了|棄了|弃吧|棄吧|别跟|別跟|不要跟|你跟|我跟|跟我|别加|別加|别下|別下|你加|我加|你下|我下|全下|梭哈|梭了|推了|诈唬|詐唬|诈我|詐我|诈你|詐你|偷鸡|偷雞|唬你|坚果|堅果|胜率|勝率|赔率|賠率|翻前|翻后|翻後|小盲|大盲|庄位|莊位|枪口|槍口|听花|聽花|听顺|聽順|同花|顺子|順子|葫芦|葫蘆|对子|對子|两对|兩對|三条|三條|四条|四條|顶对|頂對|底对|底對|中对|中對|暗三|明三|卡顺|卡順|天顺|天順|红桃|紅桃|红心|紅心|黑桃|方块|方塊|梅花|口袋|大王|小王|一对|一對|对[akqjt2-9]|對[akqjt2-9]|(?:加|跟|押|压|壓|推)[\d一二三四五六七八九十百千万萬]/u;
  const words = ['poker','holdem','hold’em','texas','card','cards','hand','hands','pot','chips','stack','kicker','check','checking','checked','bet','bets','betting','raise','raising','raised','call','calling','called','fold','folding','folded','allin','all-in','shove','shoving','jam','bluff','bluffing','nuts','equity','odds','preflop','flop','turn','river','showdown','flush','straight','fullhouse','quads','pair','overpair','toppair','twopair','trips','draw','drawing','outs','gutshot','backdoor','aces','kings','queens','jacks','ace','king','queen','jack','spade','spades','heart','hearts','diamond','diamonds','club','clubs','suited','offsuit','limp','limping','reraise','cbet','3bet','4bet','utg','btn','sb','bb','bigblind','smallblind','jiazhu','genzhu','qipai','guopai','shoupai','tonghua','shunzi'];
  const spaced = word => [...word.replace(/[^a-z0-9]/g,'')].join('[\\s\\p{P}\\p{S}]*');
  const english = new RegExp('(?:^|[^a-z0-9])(?:'+[...new Set(words.map(spaced))].join('|')+')(?=$|[^a-z0-9])','u');
  const ranks = /(?:^|[^a-z0-9])(?:10|[2-9tjqka])[\s\p{P}\p{S}]*(?:10|[2-9tjqka])(?:[so])?(?=$|[^a-z0-9])/u;
  const cardContext = /(?:我|你|他|她|有|拿|发|發|带|帶|是)[^a-z0-9]{0,5}(?:10|[2-9tjqka])(?=$|[^a-z0-9])/u;
  const symbols = /[♠♤♥♡♦♢♣♧\u{1F0A0}-\u{1F0FF}]/u;
  function folded(text){
    // Width, accents, zero-width characters and a few common look-alike ranks.
    const lookalikes = {'а':'a','А':'a','Α':'a','α':'a','К':'k','к':'k','Κ':'k','κ':'k','Ј':'j','ј':'j','Τ':'t','Т':'t','т':'t','Ｑ':'q'};
    return text.normalize('NFKD').replace(/[аАΑαКкΚκЈјΤТтＱ]/gu,c=>lookalikes[c]).toLowerCase().replace(/[\p{M}\p{Cf}]/gu,'');
  }
  function poker(text){
    const value = folded(text), compact = value.replace(/[\s\p{P}\p{S}]/gu,'');
    return symbols.test(value) || chinese.test(compact) || english.test(value) || ranks.test(value) || cardContext.test(value) || /^(?:10|[2-9tjqka])(?:[so])?$/.test(compact);
  }
  function validate(input){
    if (!input || typeof input !== 'object') return {ok:false,code:'invalid',error:'请输入聊天内容。'};
    if (Object.prototype.hasOwnProperty.call(input,'q')){
      if (typeof input.q !== 'number' || !Number.isInteger(input.q) || !Object.prototype.hasOwnProperty.call(QUICK,input.q) || input.text != null)
        return {ok:false,code:'poker',error:POKER_ERROR};
      return {ok:true,text:QUICK[input.q],q:input.q};
    }
    if (typeof input.text !== 'string') return {ok:false,code:'invalid',error:'请输入聊天内容。'};
    const text = input.text.normalize('NFC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b\u200e\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,'').replace(/\s+/gu,' ').trim();
    if (!text) return {ok:false,code:'empty',error:'先写点内容吧。'};
    if ([...text].length > MAX_LENGTH) return {ok:false,code:'length',error:`每条最多 ${MAX_LENGTH} 字。`};
    if (poker(text)) return {ok:false,code:'poker',error:POKER_ERROR};
    return {ok:true,text};
  }
  return Object.freeze({MAX_LENGTH,QUICK,validate});
});
