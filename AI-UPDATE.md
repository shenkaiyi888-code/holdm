# Computer-player strategy update

The existing engine still owns dealing, hand evaluation, betting legality, side pots, rooms, animation and audio. `botAct()` now delegates its decision to `poker-ai.js`, then applies the result through the existing `doAction()` path.

## Position and ranges

All styles use position, rather than limiting position adjustments to professional players. Opening ranges tighten in early position and widen on the cutoff/button. The policy distinguishes blind defense, limpers, a straddle, heads-up play, effective stacks, value reraises and occasional suited-ace blocker three-bets. Reraises are larger out of position. A deep-stack raise no longer automatically becomes a shove merely because its target exceeds 45% of the stack.

The adapter passes the acting player's two cards and a public snapshot: board, seats, stacks, bets, observed statistics and typed public actions. Opponent hole cards, the deck, private review data and hidden style labels are excluded. Each opponent's range is weighted by their position and actions on the board available at that action. Multi-street value and planned-bluff hypotheses are mixed as complete lines. Statistics shrink toward a neutral prior when samples are small. The existing image learned from publicly shown bluffs/value hands also adjusts the read.

Postflop decisions sample those compatible weighted ranges before drawing future board cards. Heads-up river equity is integrated over the complete weighted range. Main-pot and side-pot shares use eligible opponents. Calls cap both the required payment and available pot at the actor's stack; future-street equity is discounted for position and multiway pressure. Implied odds require effective money remaining behind.

## Betting behavior

Value bets account for wet/dry boards, worse hands that may call, effective stacks and stack-to-pot ratio. Medium hands can control the pot. Semi-bluffs use real draws; river bluffs require a plausible line, adequate fold equity and low showdown value. Multiway bluffs and bluffs into frequent callers are reduced. A shared unbeatable board is called or checked, and a short all-in cannot reopen a closed raise. The existing draw helper now distinguishes the four-out A-2-3-4 wheel draw from an eight-out open-ended draw.

Style still controls opening tightness, aggression, bluffing and slow-playing. The professional variants retain balanced sizes, pressure on scare cards, larger value bets or stronger adjustments to observed folding habits. This is a heuristic range policy with finite sampling.

## Validation

- `node scripts/verify-ai.cjs`: 17 strategy/regression groups, including 120 varied stack/street spots. Uses production evaluation/draw helpers. Covers position, blocker-conditioned ranges, observed table image, tight-versus-loose triple barrels, sizing, shared nuts, all-in draws, short calls, side pots, closed raises, privacy and runtime.
- `node scripts/verify-ai-browser.cjs`: complete games at six-player 390×740 and eight-player 844×390 layouts, 12 completed hands each. Calls the actual `botAct`/`doAction` engine path. Checks chip conservation, legal decisions, no private snapshot fields, no page/asset errors and decision timing. Reports environment Chromium timings, rather than physical-phone timings.
- Existing UI checks pass for 16 responsive combinations, equity helpers, check/bet/raise sounds and mute. The self-contained preview embeds the new strategy module and loads without external requests; orientation changes keep its game document.

Results are recorded in `artifacts/ai-verification.json`, `artifacts/ai-browser-verification.json`, `artifacts/verification.json` and `artifacts/portable-verification.json`. The existing `?selftest` entry point exposes diagnostic engine hooks only for the browser checks.
