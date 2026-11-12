# Responsive table update

Run the existing server with `npm start`, or `npm run dev -- --host 0.0.0.0 --port 4173 --strictPort`.

This update keeps the poker engine, hand evaluation, betting rules, computer opponents, room APIs and SSE transport in `index.html` / `server.js`. It changes presentation through `ui-v2.css` and `ui-v2.js`. Existing deal, flip and chip flight animations are reused. Check uses two soft taps; opening bets and raises use distinct short chip sounds, routed through the existing mute preference.

`play.html` and `orientation-shell.js` keep one live game iframe. The orientation button changes its viewport without recreating the game document or reconnecting the room. Touch devices can use a rotated viewport even if the browser does not support orientation locking. Desktop portrait mode uses a centered vertical viewport. Room invitations point to the outer root URL.

Pinch zoom uses the stable document layout viewport for the iframe dimensions. Safari can report the magnified visual viewport through `innerWidth` / `innerHeight`; using those values collapsed the table and stacked its absolute seats. The frame is anchored to the document, and visual viewport events with unchanged layout dimensions no longer resize it. Browser magnification remains enabled. Run `node scripts/verify-zoom.cjs` for the 1.25×–3× zoom regression, including orientation changes during the same hand. The regression fails on the preceding `e8d9cf4` revision and passes with this fix. It uses Chromium page scaling plus Safari-style viewport reporting; it does not claim physical iPhone coverage.

The old dealer panels, character chatter and narration are retired from the UI. The original hidden DOM remains so existing game bindings and other game pages continue to work. There are no new dealer characters in this version.

Phone portrait has the primary three actions at the bottom. Landscape puts those actions beside the table; iPad and desktop get more space for cards and player plates. Compact eight-seat tables use smaller community cards and move the middle opponents' backs outward to keep the board clear.

Verification: `node scripts/verify-ui.cjs` requires Playwright and Chromium. The script uses the project's existing `?selftest` entry point; test setup is confined to this diagnostic URL. Results are in `artifacts/verification.json`. These checks ran in Chromium at 320×568, 360×640, 390×844, 768×1024, 1024×768, 844×390 and 1440×900. Physical Safari/iPad testing remains a device check for rollout.

`python scripts/export-preview.py` creates `artifacts/holdm-preview.html`, a self-contained solo preview with all fonts and images embedded. Room play uses the normal Node server. The portable preview was verified without external HTTP requests and with its game document retained across orientation toggles.
