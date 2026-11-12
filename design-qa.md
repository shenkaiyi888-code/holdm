# Design QA

## Approved J/Q/K integration

final result: passed

Source visual truth: `/workspace/generated_images/court-characters/J-jack.png`, `Q-queen.png` and `K-king.png`. These are the approved original J, revised high-updo Q and revised authoritative K, each 1254×1254 with alpha. Production portraits in `public/assets/table-v2/court-*.webp` are 768×768 derivatives. Closed-eye frames were generated from the approved portraits; the application reveals only their eye regions during a blink.

The source images specify character art. The header placement and picker adapt that art to the existing responsive poker interface; they do not represent a replacement page design.

### Comparison evidence

- `artifacts/dealer-asset-comparison.webp`: approved source and actual browser-rendered portraits in the same comparison input. Both sides are normalized to 90×90 CSS pixels at device scale factor 1. The desktop portraits render at 116×116 CSS pixels. Complete crowns, hairstyles and shoulder silhouettes remain visible.
- `artifacts/dealer-layout-comparison.webp`: the previous 40px header portrait beside the enlarged 112px header portrait at the same 390×740 eight-player flop state. The larger figure deliberately takes more header height; all player information, board slots and action controls remain visible. The randomized dealer marker and sampled equity may differ between captures.
- `artifacts/dealer-picker-390x740.webp` and `artifacts/dealer-picker-1440x900.webp`: the picker open with K selected on phone and desktop, captured at the stated CSS viewport and device scale factor 1.
- `artifacts/dealer-blink-comparison.webp`: the same phone picker with open eyes and at the closed-eye animation phase. This focused comparison checks that clothing, crowns and facial silhouettes stay stable while the eye patches change.

Both original character assets and browser screenshots were opened and compared in the combined inputs above. These are rendered browser captures from the running Node game at `http://terminal.local:4173/`, rather than HTTP-health or build-only checks. The preview relay failed to initialize, so browser verification used Chromium directly against that same local server.

### Findings and iteration history

- Resolved P2 — first picker capture could show J/Q as temporarily empty while asynchronously decoded images were becoming ready. Evidence: `artifacts/dealer-blink-comparison-initial.webp`. Base portraits now preload and decode synchronously; blink frames retain deferred loading. Capture checks also wait for image decoding and two paint frames. Post-fix evidence: all three figures appear in both states of `artifacts/dealer-blink-comparison.webp` and in both picker screenshots.
- Resolved P2 — the original 40px persistent portrait made the approved character details too small. It now occupies 80–160px in the upper bar, with 112px on ordinary phones. Branding and controls rearrange beside it, and betting forms compact the header while an amount is being chosen. Evidence: the updated layout comparison and all eight viewport records.
- No remaining actionable P0/P1/P2 findings in the tested scope.

### Required fidelity surfaces

- Fonts and typography: new controls use the existing Apple-native system stack, with 18px picker heading, 12–13px supporting labels and a compact rank marker. Existing card-rank typography remains separate. Linux Chromium exercises the fallback; SF Pro/PingFang rendering is device-dependent.
- Spacing and layout rhythm: the character stays in the upper bar outside the arena, at 80–160px according to the screen. All header controls and picker bounds fit eight tested viewport sizes. The three choices use one consistent grid; native dialog focus and a 44px completion control support keyboard and touch interaction. The play area adapts to the taller header, and portrait betting controls remain in bounds while the header is compacted.
- Colors and tokens: the interface retains charcoal, green and muted champagne tokens. Red/yellow/navy character colors come from the approved art. Selected and focused states are visible without recoloring the portraits.
- Image quality and asset fidelity: approved J, revised Q and revised K retain their features and full silhouettes after scaling/compression. Transparent WebP assets have no visible opaque background or halo. Generated closed-eye patches avoid full-frame silhouette flicker. No character has been replaced by CSS/SVG drawings, emoji or generic placeholders.
- Copy and content: choices are labeled J · 近卫, Q · 王后 and K · 君王. The picker communicates quiet companionship and exposes the idle-motion preference. The main menu can hide or restore the portrait.

### Interaction and regression evidence

`artifacts/dealer-verification.json` records eight viewport checks: 320×568, 360×640, 390×740, 390×844, 768×1024, 1024×768, 1440×900 and 844×390. All three characters switch, selection and motion preferences survive reload, hiding/restoring works, controls remain silent, the live hand remains unchanged during selection and orientation changes, and system reduced motion disables both breathing and blinking. No page errors or failed asset responses were observed.

The existing 16 six/eight-seat layout cases and check/bet/raise audio/mute checks pass in `artifacts/verification.json`. The 1.25×–3× pinch-zoom regression passes in `artifacts/zoom-verification.json`. The standalone bundle loads with no external HTTP requests and retains its document while switching orientation; the two-board feature remains clear at 320×568 and 768×1024.

Implementation checklist: approved assets installed; picker/visibility/persistence wired; quiet motion and reduced motion checked; responsive layouts compared; page errors checked; poker and zoom regressions passed. No implementation fix remains from this comparison. Physical Safari/iPad rendering and audio remain device-coverage gaps; these checks use Chromium viewport emulation.

## Previous responsive-table verification

Result: passed

Reference: the selected portrait poker image in the conversation, with the requested emerald felt, neutral white faces and restrained details. The generated `public/assets/table-v2/card-back.webp` and common chip master were inspected together with the browser screenshots. This is an implementation on the existing game, with adaptations for six/eight seats and smaller viewports.

## Evidence

- `artifacts/390x844-6seats.webp`: primary phone portrait composition.
- `artifacts/390x740-8seats.webp`: eight-seat phone with restored helper information.
- `artifacts/mobile-simplified.webp`: representative folded-player phone state with a single pot texture and quieter inactive seats.
- `artifacts/844x390-8seats.webp`: phone landscape and side action console.
- `artifacts/768x1024-8seats.webp`: iPad portrait with all eight seats.
- `artifacts/1440x900-6seats.webp`: desktop table and controls.
- `artifacts/320x568-8seats.webp`: smallest phone with all bet amounts visible.
- `artifacts/verification.json`: six/eight seats at eight viewport sizes, state preservation and distinct action audio.
- `artifacts/portable-verification.json`: no external requests; orientation retains the document.

## Resolved findings

| Severity | Finding | Resolution |
| --- | --- | --- |
| P1 | The original header and dealer controls crowded portrait play. | Retired dealer UI and automatic chatter; secondary settings live in the menu. |
| P1 | Eight-seat small phones could overlap community cards with player cards or bets. | Dedicated compact center layout, outward middle card backs and compact action labels; browser checks assert no board overlap with plates or opponent cards. |
| P1 | iOS pinch zoom could shrink the game iframe, stacking seats and clipping its controls. | Use the stable document layout viewport, anchor the frame to the document, and skip redundant visual viewport resize events. |
| P1 | The simplified phone UI hid equity, hand type, stack and call odds. | Restore the helper strip above actions, keep it visible during raising, and wrap whole fields without truncating values. |
| P2 | Chip piles and repeated information made the phone table feel crowded. | Replace the piles with one small texture next to the pot amount; keep balances on seat plates and three useful helper fields above actions. |
| P2 | Player plates occupied the felt and made the table feel enclosed. | Place all player identities, balances, action labels and bets in a ring outside the rail. Use compact vertical identities on portrait phones and fit the oval inside that ring. Reserve separate space for hands and the central board/pot. |
| P2 | Dealer button could land on pot chips. | Extended the existing placement collision checks to the board, street and pot. |
| P2 | Original faces and trims were warm yellow and heavily gold. | Neutral white DOM cards, midnight backs, charcoal rail and muted champagne seam. |

The real check/bet/raise buttons were exercised against the existing engine. Each triggered one matching sound event and WebAudio oscillators. Muting produced no sound events or oscillators while preserving visual feedback. Reduced motion skips deal flights. The action buttons meet a 44-pixel minimum height in every tested viewport. No page errors or horizontal/body overflow were observed. No unresolved P0/P1/P2 findings remain in the tested scope.

Six- and eight-seat cases at eight viewport sizes now assert that entire player groups sit outside the felt ellipse, do not collide with each other, and leave the action console clear. All five community-card slots stay clear of player plates, hands, bets and the dealer marker; hands also leave the street and pot readable. The same 16 cases assert three visible helper fields inside the console and real percentage values. A known royal flush displays 100% equity and the correct hand type; calling 40 into a 240 pot displays 14% required equity. The player's balance remains visible on their seat, the pot contains one texture, and transfer animations contain one image per packet. No stacked-chip renderer remains. The helper strip stays visible while choosing a raise, respects the equity toggle and clears the percentage after folding. The existing equity and odds algorithms are unchanged.

The interface now requests the native Apple system font stack for headings, controls, player names and numerical readouts. On non-Apple systems it falls back to the platform system font. Printed playing-card ranks keep their dedicated card font. Layout checks cover the new metrics in the test environment; SF Pro and PingFang rendering require an Apple device.

Testing was performed in Chromium with mobile/touch viewport emulation; it does not substitute for physical Safari/iPad audio and browser-chrome checks before rollout.

## Pinch zoom regression

`scripts/verify-zoom.cjs` reproduces Safari-style `innerWidth` / `innerHeight` readings while Chromium renders actual browser magnification. It fails against `e8d9cf4` at 1.25× (the 390×740 frame shrinks to 312×592). With the fix, 1.25×, 1.5×, 2× and 3× magnification preserve the frame, table, seat, board and button geometry. The live iframe receives zero resize events from pinching; the current hand, cards, balances and acting player remain unchanged. Manual layout switching and physical viewport rotation while zoomed retain that same game document. Results for six/eight seats, small portrait phones and landscape phones are recorded in `artifacts/zoom-verification.json`. The eight-size and sound/mute checks also pass. Native WebKit execution was unavailable because the environment lacks its GTK/runtime libraries; Safari-specific readings are simulated in Chromium rather than presented as physical device testing.
