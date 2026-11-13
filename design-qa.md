# Design QA

## Joker Yi and check sound

final result: passed

Visual target: the existing approved J/Q/K court portraits specify the navy outlines, pale faces, flat red/navy/ivory/yellow palette and shoulder-bust framing. The user requested a new dealer named Yi, optionally as a Joker. `/workspace/generated_images/court-characters/Yi-joker.png` extends that selected style with a two-point jester cap, a pale forelock, a small cheek marking and a harlequin costume. The generated open/closed masters are 1254×1254 RGBA; runtime WebPs are 768×768 with alpha. Both original masters are retained in the downloadable source archive.

### Comparison evidence

- `artifacts/yi-style-reference.webp` puts the three approved sources and Yi into one style comparison. Navy line weight, flat coloring, face detail and complete shoulder silhouettes were inspected together.
- `artifacts/yi-dealer-source-render.webp` places all four source portraits and actual browser renders together at the phone picker's 126px portrait size. The original and rendered Yi retain the complete cap, bells, hair and shoulders; there is no opaque image background or visible alpha halo.
- `artifacts/yi-dealer-blink-comparison.webp` compares the same 390×740 phone picker at open-eye and blink phases. Only feathered eye patches change; cap, hair, collar and silhouette stay on the original base image. Small generated-frame alpha differences outside those masks never enter the displayed portrait.
- `artifacts/yi-dealer-phone.webp`, `yi-dealer-desktop.webp`, `yi-picker-phone.webp` and `yi-picker-desktop.webp` are actual browser full-view captures. The character remains in the upper bar and the poker content remains visible.

### Findings and required surfaces

- Layout: the picker now uses two columns below 600px and four on wider screens. All four characters, completion button and motion checkbox fit without scrolling at every tested size, including 320×568 and 844×390. Header sizes and table/player placement retain their existing geometry.
- Typography/content: native system typography is retained. The new choice reads Joker · Yi, its header tag reads Yi · 荷官, and accessible labels identify both the character and the selection action. Existing saved J/Q/K preferences and the default K are preserved.
- Color/art fidelity: Yi shares the existing flat comic style and palette. Selected states, dialog colors and focus treatment use the existing navy/ivory tokens. The character is a generated raster asset, with no replacement CSS character drawing or generic placeholder.
- Motion: Yi has gentle breathing and localized blinking. The existing per-browser motion preference and system reduced motion stop both effects. Selecting or hiding the portrait retains the current hand, cards and amounts. Dealer controls remain silent.
- No unresolved actionable P0/P1/P2 findings remain in this scoped update.

### Sound and interaction verification

Check now synthesizes two dry wooden taps 115ms apart, with a short contact transient and more midrange body than the previous bass-heavy effect. `artifacts/check-sound.wav` is a render of the actual production synthesizer. `artifacts/check-sound-verification.json` records separated taps in both full-band and 350–3500Hz output, no clipping and a silent tail. A real AudioContext resume test produces exactly one check after delayed resume and zero sounds if muted during that delay; replaced contexts and late resume requests are discarded.

`artifacts/dealer-verification.json` records eight viewport checks: 320×568, 360×640, 390×740, 390×844, 768×1024, 1024×768, 1440×900 and 844×390. All four selections, Yi preference persistence, hiding/restoring, optional motion, reduced motion, keyboard dismissal and same-hand orientation changes pass. There are no page errors or failed responses. `artifacts/verification.json` records all 16 six/eight-seat layout cases plus actual check/bet/raise controls, one sound event per action, helper values, and mute behavior. Browser evidence uses Chromium with mobile/touch viewport emulation; the phone-band signal check does not claim physical iPhone speaker or Safari coverage.

The regenerated portable preview also loads both Yi images without HTTP requests and retains the same game document while switching orientation. Two-board clearance still passes at 320×568 and 768×1024. Results are in `artifacts/portable-verification.json`.

Implementation checklist: source/render comparison inspected; Yi and blink assets installed; picker layout, naming and persistence verified; sound rendered and resume/mute behavior checked; existing responsive interactions and portable preview passed. No blocking implementation fix remains.

## Navy and emerald art polish

final result: passed

Visual target: the user's older screenshot supplies the navy/emerald/ivory color relationship; `artifacts/art-polish-before-phone.webp` supplies the retained geometry. The old public site at `https://coruscating-belekoy-e1d2f2.netlify.app/` was read to recover its original room (`#0e1320`, `#1a2340`) and felt (`#21865f`, `#146446`, `#0a3a29`) tokens. `artifacts/art-polish-old-reference.webp` is a local replay of that source, with external font requests disabled. This reference is for palette, rather than reproducing its old dealer panel, typography or settings layout; its preflop state differs from the final current-game flop.

Generated visual truth: `/workspace/generated_images/art-polish/card-back-engraved.png` (1073×1466), `felt-emerald-refined.png` and `rail-leather.png` (both 1254×1254). Runtime assets are the engraved back at 512×700 and the two materials at 768×768. Original masters are in the source archive. All changed artwork was generated as raster assets; the table still has native DOM cards and controls.

Full-view evidence: `artifacts/art-polish-comparison.webp` places the retained geometry reference and final browser implementation in one comparison input. Both use 390×844 CSS px, DPR 2, 780×1688 pixels per side, the same six-player flop, cards, names and amounts. Monte Carlo equity may differ slightly. `artifacts/art-polish-palette-comparison.webp` places the old-site palette replay beside the final implementation at the same capture density; different layout/state are intentional and are not treated as pixel-fidelity findings.

Focused evidence: `artifacts/art-polish-card-comparison.webp` places the generated back and the actual browser-rendered back together, and shows actual cards at 24/48/96 CSS px beside a white face. The master is downsampled for comparison with the 96 CSS px @2x render. Rounded corners, the one-pixel CSS card edge and a small cover crop of the outer navy margin are intentional; all engraved framing remains visible. The corner ornaments and paired spades are recognizable at phone sizes.

### Findings and iteration history

- Resolved P2 — the first generated felt had curly, noisy grain behind the board. Evidence: `artifacts/art-polish-comparison-initial.webp` and `art-polish-phone-initial.webp`. A second ImageGen pass produced microscopic, low-contrast nap. The final capture was repeated at the same viewport/state and inspected in the combined comparison.
- Resolved P2 — the phone's raised-bet confirmation inherited a saturated gold gradient from the legacy layout. A scoped override now uses the same restrained ivory as the primary action, with muted red reserved for the all-in state. `artifacts/art-polish-raise-comparison.webp` places the earlier and corrected 390×844 @2x raise forms together; the final state was recaptured and inspected after the fix.
- Palette calibration — the original site's room and felt colors were recovered after the first pass. Final lighting uses those colors over the refined raster material, restoring the softer luminous green center. The navy body keeps the existing slow animated illumination.
- No actionable P0/P1/P2 differences remain in this scoped palette/material/card-back update.

### Required fidelity surfaces

- Fonts/typography: native Apple system stack is retained for names, amounts, controls and menus; printed ranks retain Libre Baskerville. Sizes, wrapping and layout are unchanged. Linux Chromium uses fallbacks; physical SF Pro/PingFang rendering is a device check.
- Spacing/layout rhythm: six/eight players remain outside the rail; the header portrait and three primary actions retain their measured sizes. All 16 existing responsive cases pass. Additional final art captures cover 320×568, 390×844, 844×390, 768×1024 and 1440×900, all at DPR 2.
- Colors/tokens: original navy room and emerald felt tokens ground the palette. Navy secondary controls, restrained ivory primary actions, a warm brown rail and cool avatar plates now share it. Card faces are neutral `#fcfcfd`, preserving the user's earlier white-paper request rather than the older ivory faces.
- Image quality: source/render comparisons show the generated engraving, clean borders and white face at practical sizes. The refined felt is smooth; the matte leather rail has no visible tile seams in inspected views. The three runtime assets total about 228 KB. No portrait artwork or standard suit icons were replaced.
- Copy/content: game-specific labels, stats, names, dealer-position wording and action amounts remain current game content. No design-process copy appears in the game.

### Interaction and verification

`artifacts/art-polish-verification.json` records five final visual captures with no page errors or failed responses. The menu and raise form were inspected in `art-polish-menu.webp` and `art-polish-raise.webp`. The existing 16 layout/equity/check-bet-raise/audio/mute cases and eight dealer/menu/selection/persistence/orientation/reduced-motion cases pass. The portable preview loads without external requests and retains its game document across orientation switches; both boards remain clear at 320×568 and 768×1024. These are Chromium checks; physical Safari remains a coverage gap.

Implementation checklist: generated assets installed and preloaded; original palette mapped; paper edges and buttons refined; initial felt issue fixed and recaptured; source/render comparisons inspected; primary interactions and console errors checked. No blocking implementation fix remains in this pass.

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
- Resolved P1 — the deal source was the header portrait's center, and delayed flights were already visible there, piling cards over the character's face. The regression reproduces that source on `295696c`. Cards now leave a dedicated position inside the felt, remain hidden until their delay expires, and follow paths around player identities and the header portrait. Community cards read the current table geometry when they leave. Evidence: `artifacts/dealing-phone.webp` and all 16 cases in `artifacts/dealing-verification.json`.
- Resolved P2 — the 26px D-only position marker was easy to overlook beside SB/BB. A high-contrast 66×30px pill now pairs a green D disc with 庄家, with a 60×28px version for short portrait phones. Its accessible name identifies the owning player. Placement measures the full rectangle and searches nearby openings when the usual positions are occupied. Evidence: `artifacts/dealer-marker-390x740.webp`, `artifacts/dealer-marker-320x568.webp` and `artifacts/dealer-marker-844x390.webp`.
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

`scripts/verify-dealing.cjs` pauses and samples actual private-card flights across 16 phone, tablet and desktop combinations. Every flight shares the table source, queued cards are invisible, complete card bounds avoid player plates and the header portrait, hand-slot landings are correct, and game state is retained. All 16 combinations also pass flop, turn and river checks. The picker regression confirms that hiding the decorative portrait keeps the table source available. No page errors were observed. `artifacts/dealing-phone.webp` shows the real eight-player 390×740 animation at 180ms, with the waiting cards absent from the header.

`scripts/verify-dealer-marker.cjs` checks all seats in preflop, flop and two-board states across 16 six/eight-player phone, tablet and desktop combinations: 336 positions. All markers fit the arena, retain the complete D/庄家 label and current-player accessible name, and avoid cards, player plates, action labels, bets, blind badges and central table information. Chromium uses reduced motion for settled layout measurements. The three marker screenshots were visually inspected; existing layout, equity and check/bet/raise/mute checks also pass.

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
