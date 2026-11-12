# Design QA

Result: passed

Reference: the selected portrait poker image in the conversation, with the requested emerald felt, neutral white faces and restrained details. The generated `public/assets/table-v2/card-back.webp` and common chip master were inspected together with the browser screenshots. This is an implementation on the existing game, with adaptations for six/eight seats and smaller viewports.

## Evidence

- `artifacts/390x844-6seats.webp`: primary phone portrait composition.
- `artifacts/390x740-8seats.webp`: eight-seat phone with restored helper information.
- `artifacts/844x390-8seats.webp`: phone landscape and side action console.
- `artifacts/768x1024-8seats.webp`: iPad portrait with all eight seats.
- `artifacts/1440x900-6seats.webp`: desktop table and controls.
- `artifacts/320x568-8seats.webp`: smallest phone with all bet amounts visible.
- `artifacts/verification.json`: eight viewport checks, state preservation and distinct action audio.
- `artifacts/portable-verification.json`: no external requests; orientation retains the document.

## Resolved findings

| Severity | Finding | Resolution |
| --- | --- | --- |
| P1 | The original header and dealer controls crowded portrait play. | Retired dealer UI and automatic chatter; secondary settings live in the menu. |
| P1 | Eight-seat small phones could overlap community cards with player cards or bets. | Dedicated compact center layout, outward middle card backs and compact action labels; browser checks assert no board overlap with plates or opponent cards. |
| P1 | iOS pinch zoom could shrink the game iframe, stacking seats and clipping its controls. | Use the stable document layout viewport, anchor the frame to the document, and skip redundant visual viewport resize events. |
| P1 | The simplified phone UI hid equity, hand type, stack and call odds. | Restore the helper strip above actions, keep it visible during raising, and wrap whole fields without truncating values. |
| P2 | Pot chip stacks intruded into community cards in landscape. | Shared chip geometry and responsive stack size/spacing. |
| P2 | Dealer button could land on pot chips. | Extended the existing placement collision checks to the board, street and pot. |
| P2 | Original faces and trims were warm yellow and heavily gold. | Neutral white DOM cards, midnight backs, charcoal rail and muted champagne seam. |

The real check/bet/raise buttons were exercised against the existing engine. Each triggered one matching sound event and WebAudio oscillators. Muting produced no sound events or oscillators while preserving visual feedback. Reduced motion skips deal flights. The action buttons meet a 44-pixel minimum height in every tested viewport. No page errors or horizontal/body overflow were observed. No unresolved P0/P1/P2 findings remain in the tested scope.

Eight viewport cases now assert visible helper fields inside the console, real percentage values and no community-card overlap with opponent cards, player plates or the dealer marker. A known royal flush displays 100% equity and the correct hand type; calling 40 into a 240 pot displays 14% required equity. The strip remains visible while choosing a raise, respects the equity toggle and clears the percentage after folding. The existing equity and odds algorithms are unchanged.

Testing was performed in Chromium with mobile/touch viewport emulation; it does not substitute for physical Safari/iPad audio and browser-chrome checks before rollout.

## Pinch zoom regression

`scripts/verify-zoom.cjs` reproduces Safari-style `innerWidth` / `innerHeight` readings while Chromium renders actual browser magnification. It fails against `e8d9cf4` at 1.25× (the 390×740 frame shrinks to 312×592). With the fix, 1.25×, 1.5×, 2× and 3× magnification preserve the frame, table, seat, board and button geometry. The live iframe receives zero resize events from pinching; the current hand, cards, balances and acting player remain unchanged. Manual layout switching and physical viewport rotation while zoomed retain that same game document. Results for six/eight seats, small portrait phones and landscape phones are recorded in `artifacts/zoom-verification.json`. The eight-size and sound/mute checks also pass. Native WebKit execution was unavailable because the environment lacks its GTK/runtime libraries; Safari-specific readings are simulated in Chromium rather than presented as physical device testing.
