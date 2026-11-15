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
    31:'玩得开心',32:'谢谢',33:'辛苦啦',34:'休息一下',35:'晚安',
    36:'哈哈哈',37:'厉害',38:'可惜了',39:'好险',40:'等我一下',41:'马上回来',42:'我先撤了',43:'再来一局',
    44:'今天就到这吧',45:'下次再约'
  });
  const QUICK_ERROR = '这条短句已经停用了。';
  // Players still holding cards in the current hand may only use the presets
  // above; the server enforces it with the host's list of live players.
  const LOCKED_ERROR = '这一手还没打完，先发短句或表情；弃牌或这手结束后就能打字。';
  function validate(input){
    if (!input || typeof input !== 'object') return {ok:false,code:'invalid',error:'请输入聊天内容。'};
    if (Object.prototype.hasOwnProperty.call(input,'q')){
      if (typeof input.q !== 'number' || !Number.isInteger(input.q) || !Object.prototype.hasOwnProperty.call(QUICK,input.q) || input.text != null)
        return {ok:false,code:'quick',error:QUICK_ERROR};
      return {ok:true,text:QUICK[input.q],q:input.q};
    }
    if (typeof input.text !== 'string') return {ok:false,code:'invalid',error:'请输入聊天内容。'};
    const text = input.text.normalize('NFC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b\u200e\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,'').replace(/\s+/gu,' ').trim();
    if (!text) return {ok:false,code:'empty',error:'先写点内容吧。'};
    if ([...text].length > MAX_LENGTH) return {ok:false,code:'length',error:`每条最多 ${MAX_LENGTH} 字。`};
    return {ok:true,text};
  }
  return Object.freeze({MAX_LENGTH,QUICK,LOCKED_ERROR,validate});
});
