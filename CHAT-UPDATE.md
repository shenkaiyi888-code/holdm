# Room text chat

Online Holdm rooms now have a text composer behind the existing 聊天 button beside the action status. Opening chat shows room messages, daily greetings and emoji, a counter and an inline rejection message. The button shows unread messages; opening it clears the count. The return button and Escape close the dialog. A current-turn button returns straight to the table. Chat makes no game decision and does not pause the online turn clock.

The dialog uses the current navy/ivory palette and native system font. Text entry is 16px with 46px input/send controls. It fits phone portrait, landscape, tablet and desktop. VisualViewport changes resize and reposition only the dialog, including through the orientation shell's rotated iframe. The poker iframe and table geometry remain stable. Short visible areas hide the optional quick row. Focused typing keeps the most recent messages in view. Game hotkeys ignore text inputs, IME composition and the open chat dialog.

## Message handling

`POST /api/chat` accepts `{room,id,text}` or `{room,id,q}`. The player must have an active event stream in that room. The server supplies message ID, sender ID/name, room and time, then sends the accepted message over the existing SSE connection. It retains the latest 50 accepted messages in room memory and replays them on connection. Closing or expiring the room, or restarting the server, removes that history. Leaving clears local messages, unread count and draft; a pending response from a previous room cannot clear or replace the next room's draft.

Messages have an 80-code-point limit, a 1.2-second accepted-send interval and at most eight attempts per ten seconds per connected player. Content uses text nodes, with no HTML or link interpretation. Server errors remain inline and rejected text stays in the composer for editing. Sender labels come from the room connection rather than submitted display fields; card-related sender labels are replaced with 玩家 within chat. This retains the game's existing room-ID transport and membership model.

## Daily-chat policy

`chat-policy.js` is shared between browser feedback and server enforcement. It rejects common Chinese/traditional Chinese and English references to cards, hands, strength, suits, equity, betting and action advice. It also recognizes common hand notation such as AA/AKs, suit/playing-card symbols, full-width ranks, selected look-alike ranks, accents, zero-width characters, and letter-by-letter spacing or punctuation. The display text keeps normal Chinese punctuation. The complete rejected message is withheld from both broadcast and history.

`/api/send` applies the same policy to legacy chat messages and rejects submitted chat-history packets. Original emoji IDs 0–9 remain compatible. Old poker-discussion IDs 10–25 remain disabled; daily phrases use fresh IDs 26–35, so old clients cannot reinterpret a new greeting as an old poker line. New text is also checked before display as defense in depth.

This is deterministic text filtering, not a guarantee of semantic moderation. It can reject ambiguous ordinary words, and it cannot reliably detect private codes, metaphors, or discussion outside this chat. A strict guarantee would require an approved-phrase-only channel; this implementation honors the request for free typing while blocking known discussion forms. It uses no external moderation service or credentials.

## Verification

- `node scripts/verify-chat-policy.cjs`: 17 ordinary messages, 51 prohibited forms, 20 allowed presets, all 16 retired IDs, boundary lengths and malformed types.
- `node scripts/verify-room-chat.cjs`: two actual browser players exchange messages; forbidden text never posts or reaches the other player; typing F/C/R and confirming IME do not operate the hand. API cases cover direct/legacy routes, sender-field overrides, room isolation, inactive membership, throttling, forged history, reconnect replay and safe legacy emoji. Browser cases also cover literal markup, unread counts, rejoining, leaving and clearing drafts.
- `artifacts/room-chat-verification.json`: nine actual viewport layouts, including 320×568, 844×390 and a shortened 390×420 view. Two additional VisualViewport simulations reduce the visible area to 360px during portrait and manually rotated landscape, while preserving the table and poker iframe.
- Existing `scripts/verify-ui.cjs`: all 16 six/eight-seat layouts, state retention, helpers, check/bet/raise effects and mute pass. The regenerated portable preview still loads without HTTP requests and retains the game document across orientation switches.

These browser checks use Chromium and simulated keyboard geometry. Physical iPhone/iPad keyboard and Safari rendering remain device coverage gaps.
