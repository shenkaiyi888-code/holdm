# Room text chat

Online Holdm rooms now have a text composer behind the existing 聊天 button beside the action status. Opening chat shows room messages, daily greetings and emoji, a counter and an inline rejection message. The button shows unread messages; opening it clears the count. The return button and Escape close the dialog. A current-turn button returns straight to the table. Chat makes no game decision and does not pause the online turn clock.

The dialog uses the current navy/ivory palette and native system font. Text entry is 16px with 46px input/send controls. It fits phone portrait, landscape, tablet and desktop. VisualViewport changes resize and reposition only the dialog, including through the orientation shell's rotated iframe. The poker iframe and table geometry remain stable. Short visible areas hide the optional quick row. Focused typing keeps the most recent messages in view. Game hotkeys ignore text inputs, IME composition and the open chat dialog.

## Message handling

`POST /api/chat` accepts `{room,id,text}` or `{room,id,q}`. The player must have an active event stream in that room. The server supplies message ID, sender ID/name, room and time, then sends the accepted message over the existing SSE connection. It retains the latest 50 accepted messages in room memory and replays them on connection. Closing or expiring the room, or restarting the server, removes that history. Leaving clears local messages, unread count and draft; a pending response from a previous room cannot clear or replace the next room's draft.

Messages have an 80-code-point limit, a 1.2-second accepted-send interval and at most eight attempts per ten seconds per connected player. Content uses text nodes, with no HTML or link interpretation. Server errors remain inline and rejected text stays in the composer for editing. Sender labels come from the room connection rather than submitted display fields; card-related sender labels are replaced with 玩家 within chat. This retains the game's existing room-ID transport and membership model.

## Who may type (2026-11-15)

The keyword blacklist was removed: it blocked everyday sentences (我跟你说个事, 你下班了吗, 我加你微信) while letting card hints through (五张一个颜色, 我起手是两张一样的).

The rule is now about timing. A player who still holds cards in the hand being played can only send the preset lines and emoji. After folding, between hands, or when not dealt in, anyone can type freely. The host's browser runs the hand, so it tells the server who is still in it (`{to:'server', msg:{t:'chat-lock', ids}}` over `/api/send`, accepted from the host only); `/api/chat` rejects free text from those ids with 403 `locked`. The browser disables the input with the same rule, so normal players never see the error.

`chat-policy.js` still checks length, control characters and preset ids. Old poker preset ids 10–25 stay retired; new daily presets use 26–45.

## Verification

- `node scripts/verify-chat-policy.cjs`: everyday sentences pass, all presets, retired IDs, boundary lengths and malformed types.
- `node scripts/verify-room-chat.cjs`: two actual browser players exchange messages; forbidden text never posts or reaches the other player; typing F/C/R and confirming IME do not operate the hand. API cases cover direct/legacy routes, sender-field overrides, room isolation, inactive membership, throttling, forged history, reconnect replay and safe legacy emoji. Browser cases also cover literal markup, unread counts, rejoining, leaving and clearing drafts.
- `artifacts/room-chat-verification.json`: nine actual viewport layouts, including 320×568, 844×390 and a shortened 390×420 view. Two additional VisualViewport simulations reduce the visible area to 360px during portrait and manually rotated landscape, while preserving the table and poker iframe.
- Existing `scripts/verify-ui.cjs`: all 16 six/eight-seat layouts, state retention, helpers, check/bet/raise effects and mute pass. The regenerated portable preview still loads without HTTP requests and retains the game document across orientation switches.

These browser checks use Chromium and simulated keyboard geometry. Physical iPhone/iPad keyboard and Safari rendering remain device coverage gaps.
