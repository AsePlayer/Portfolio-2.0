# Party variety, stable rerolls and product interactions

Implemented and exercised October 17, 2026. This milestone leaves discovery,
AllMenus/Photon adapters, Google/Worker infrastructure, price parsing, buffer
meaning, source links and history storage unchanged. The checkout already
contained the previous hybrid-provider commit; this work does not replace or
reconfigure that runtime.

Publication correction: the earlier commits were local only. Before publishing,
normal live mode was restored to the portfolio's working AllMenus/Photon flow.
The Google resolver remains behind an explicit experimental opt-in. The party
builder, logo, stable controls and exact-price behavior are included in the
published release.

## Party generation

MealBuilder now fills the party one diner at a time rather than multiplying
one selected main. Each ordinary main/combo fills one diner slot. A shared
anchor can cover multiple slots only when the menu supplies explicit `serves`
metadata. Shared anchors without that metadata cannot feed the party.

A small dynamic-programming table calculates the cheapest valid completion
for every remaining diner count. Before each choice, its price plus that
remaining minimum must fit the shared food allowance. There is no individual
budget cap. A $24 main plus a $4 main is allowed in a $28 food allowance.
The cheapest valid completion is always retained as a fallback, so variety
cannot cause an otherwise affordable party to fail.

There are **100 bounded simulations**, plus that fallback. Initial anchors
rotate through the bounded attempts; remaining slots use stochastic sampling.
An unused main gets weight 5, one prior selection gets weight 1, and repeated
selections get progressively less weight (1 / previous selections squared).
Names normalize case/spacing for novelty and variety counts, so duplicate
named offers do not inflate the visible cue.

Every diner gets an anchor before optional extras spend anything. Table
appetizers are one listed unit; side selections are capped at one for small
parties and two different sides for larger parties. Drinks are considered
individually for diners whose anchors are not combos. Dessert is an optional
single listed item. No supplementary food claims to serve invented quantities.
Existing menu role annotations are trusted; this milestone does not change
source role inference or claim to verify portion sizes.

Candidates score distinct anchor picks most strongly. Budget use contributes a
smaller reward that stops increasing at 85% of the food allowance. A few
supporting extras get a small bonus. Selection samples good candidates rather
than trying to spend every remaining cent.

Duplicate selections of the same source item ID become one receipt line with
their summed quantity. Offers with different IDs/prices retain their own exact
source prices. The party cue counts distinct named anchors, not extras.

## Rerolls and stable controls

Previous-signature exclusion remains. Within the good candidate pool, a reroll
prefers lower overlap in the diners' anchor selections, so changing drinks alone
does not beat a real composition change. Repetition stays legal when options
or budget are limited. A tiny menu still gets a deterministic optional-item
alternative when one is affordable, even if random extra choices all skip.

Both decision controls now sit above the receipt, in a compact sticky region
limited to the result column. Same-restaurant rerolls retain the actual button
nodes and focus; only the receipt and acceptance state are replaced. Feedback
uses a fixed-height local status area instead of moving the global notice.
Scroll is restored without smooth scrolling. Extra space is reserved only when
a shorter receipt would otherwise clamp a deeply scrolled viewport. A stable
scrollbar gutter prevents horizontal movement when page height changes.

## Brand and interaction details

The starburst is replaced by an original double-rim plate with a question mark.
The same SVG appears in the header, receipt, empty history and favicon. The
192/512px PWA icons, maskable icon and Apple icon are rasterized from that SVG
with an opaque paper background. The mark fits within the maskable safe area.

FEED ME has a brief pressed state and a fixed label/size while busy. Loading
messages follow actual discovery/menu/build phases through a presentation-only
callback; there are no timers, percentages or artificial delays. Restaurant
name and receipt reveals use opacity/transform. A receipt change takes 220ms,
the reroll icon rotates for 180ms, and acceptance gets a short stamp treatment
with a persistent green confirmation. Animations are interruptible and skipped
for reduced motion. No confetti or dimension animation is used.

## Actual generated examples

The following orders were generated from a freshly retrieved
[Eureka! AllMenus menu](https://www.allmenus.com/ca/claremont/407489-eureka/menu/)
at 580 W. First Street, Claremont. The actual App was mounted with that parsed
menu and a fixed QA restaurant context; this verifies the menu/builder/UI
boundary, not a new production discovery flow. Prices were retrieved October
17, 2026, which is not a claim that the restaurant updated them that day.

| Party | Generated order | Food | Buffer | Planned total | Budget |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | 1 x 28 Day Dry-Aged Bone Marrow ($22); 1 x Chocolate Peanut Butter Mousse ($8.25) | $30.25 | $8 | $38.25 | $40 |
| 2 | 1 x Berry Bowl ($8.25); 1 x Cowboy Burger ($16.25) | $24.50 | $8 | $32.50 | $40 |
| 5 | 1 x Napa Chicken Sandwich ($15.75); 1 x Steak and Eggs ($17.25); 1 x Jalapeño Egg Burger ($15.75); 1 x Eureka! American Cheeseburger ($14); 1 x House Salad ($10); 1 x Side of Smokey Beer Chili ($7) | $79.75 | $20 | $99.75 | $100 |

The controlled five-person example independently selected four distinct mains,
with two diners choosing the same $10.25 main. That became a single `2 x` line
at $20.50. Its full receipt, including extras, totaled $61.50 in food plus a
$20 buffer: $81.50 against the $100 party budget.

## Verification performed

- `npm run verify`: **44 tests passed**, content/type validation, production
  build, PWA/PNG/relative-asset checks and existing secret-boundary checks.
- Added **four focused party tests** covering one diner, many/few affordable
  mains, duplicate compression and honest counts, exact cents, tight-budget
  fallback, unequal diner spending, explicit shared servings, combo extras,
  tiny-menu alternatives and repeated composition/budget-safe rerolls.
- Updated existing single-anchor assertions to check complete party coverage,
  plus the expected mixed-order subtotal in the existing integration case.
- `npm run check:browser`: existing exact-price/source/arithmetic, both rerolls,
  no-network same-restaurant reroll, history, GPS/demo and mobile checks passed.
- `npm run check:party`: actual App mouse interactions passed at **1440, 375,
  390 and 430px**. Each width exercised 18 rapid fixed-coordinate rerolls plus
  one reroll near the bottom of the receipt. Controlled receipts ranged from
  5 to 11 lines and 642 to 978px tall. Button position, scroll, focus and the
  button DOM node stayed stable. No external requests occurred.
- `npm run check:party -- --live`: the same checks passed with the real 50-item
  AllMenus menu. Two source requests loaded the index/menu; rerolls made none.
  Observed real receipts varied from 5 to 6 lines and 781 to 904px tall across
  the tested widths. Keyboard activation, reduced motion and accepted state
  passed. No browser errors occurred in either run.
- These runs include **152 mouse rerolls** total, plus keyboard/reduced-motion
  activation. Actual rendered mobile and desktop screenshots were visually
  inspected; verification is not based solely on unit tests.
- A synthetic 1,000-main, eight-diner build took about 50ms in local desktop
  Chrome. Viewport checks are not a claim of physical-phone performance testing.
- Portfolio: **21 tests**, build and artifact validation passed. Generated
  portfolio files were refreshed from the final app build.

Ignored reports and screenshots are in `artifacts/party-report.json`,
`party-live-report.json`, `party-*-mobile.png` and `party-*-desktop.png`.
The first live UI run found that its receipt-height assertion assumed more
line variation than that menu/budget provides. The controlled menu retains
the larger-variation check; live verification reports its actual smaller
variation. No menu data or prices were changed to satisfy a test.

## Files changed and commit

- `src/recommendation/MealBuilder.ts`: party simulation, feasibility reserve,
  scoring, aggregation and reroll similarity.
- `src/recommendation/RecommendationEngine.ts`: optional presentation progress.
- `src/views/result.ts`, `feed.ts`, `history.ts`: persistent controls, receipt
  composition, party cue, fixed search label, original mark and acceptance UI.
- `src/ui/App.ts`, new `brand.ts` and `motion.ts`: targeted receipt replacement,
  preserved interaction state and interruptible/reduced-motion feedback.
- `src/styles/main.css`, `views.css`: stable layout and tactile styling.
- `index.html`, `public/icons/icon.svg`, four PNG icons,
  `scripts/generate-icons.mjs`: consistent vector-derived branding.
- New `tests/party.test.ts`; compatibility edits to `tests/domain.test.ts`,
  `hybrid.test.ts` and `scripts/browser-pricing-check.mjs`.
- New `scripts/browser-party-check.mjs`, `party-check-entry.ts`; `package.json`
  adds `check:party` without dependencies.
- `README.md`, `ARCHITECTURE.md` and this report; refreshed generated files in
  portfolio-root `projects/what-we-eating/`.

The final handoff supplies the local commit SHA. No remote deployment is part
of this milestone.
