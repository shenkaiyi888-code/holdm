# Design QA

Result: passed

Reference: the selected portrait poker image in the conversation, with the requested emerald felt, neutral white faces and restrained details. The generated `public/assets/table-v2/card-back.webp` and common chip master were inspected together with the browser screenshots. This is an implementation on the existing game, with adaptations for six/eight seats and smaller viewports.

## Evidence

- `artifacts/390x844-6seats.webp`: primary phone portrait composition.
- `artifacts/844x390-8seats.webp`: phone landscape and side action console.
- `artifacts/768x1024-8seats.webp`: iPad portrait with all eight seats.
- `artifacts/1440x900-6seats.webp`: desktop table and controls.
- `artifacts/320x568-8seats.webp`: smallest phone with all bet amounts visible.
- `artifacts/verification.json`: seven viewport checks, state preservation and distinct action audio.
- `artifacts/portable-verification.json`: no external requests; orientation retains the document.

## Resolved findings

| Severity | Finding | Resolution |
| --- | --- | --- |
| P1 | The original header and dealer controls crowded portrait play. | Retired dealer UI and automatic chatter; secondary settings live in the menu. |
| P1 | Eight-seat small phones could overlap community cards with player cards or bets. | Dedicated compact center layout, outward middle card backs and compact action labels; browser checks assert no board overlap with plates or opponent cards. |
| P2 | Pot chip stacks intruded into community cards in landscape. | Shared chip geometry and responsive stack size/spacing. |
| P2 | Dealer button could land on pot chips. | Extended the existing placement collision checks to the board, street and pot. |
| P2 | Original faces and trims were warm yellow and heavily gold. | Neutral white DOM cards, midnight backs, charcoal rail and muted champagne seam. |

The real check/bet/raise buttons were exercised against the existing engine. Each triggered one matching sound event and WebAudio oscillators. Muting produced no sound events or oscillators while preserving visual feedback. Reduced motion skips deal flights. The action buttons meet a 44-pixel minimum height in every tested viewport. No page errors or horizontal/body overflow were observed. No unresolved P0/P1/P2 findings remain in the tested scope.

Testing was performed in Chromium with mobile/touch viewport emulation; it does not substitute for physical Safari/iPad audio and browser-chrome checks before rollout.
