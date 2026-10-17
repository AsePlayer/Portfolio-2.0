# So What We Eating?

**A place, an exact order, and listed prices within your party budget.**
Google discovers actual nearby restaurants; AllMenus verifies menu prices for
the same physical venue; existing MealBuilder makes the budgeted decision.

## Run locally

Use Node 24:

```sh
cd So-What-We-Eating-Web
npm ci
npm run dev
```

Live searches require the Google discovery Worker and a public
`VITE_RESTAURANT_PROXY_URL` at build time.
The Google API key stays in the Worker secret. Follow
[production setup](docs/GOOGLE_PROVIDER.md). Missing setup produces a visible
error. Explicit `?mode=demo` is available without services and is always labeled
fictional; failed live searches never select it automatically.

## Behavior

- Google owns geography, canonical Place IDs, venue details and ratings.
- Restaurant matching requires normalized name and branch-address evidence,
  with an independent menu-page identity/coordinate check.
- Every successful recommendation includes exact listed items, quantities,
  unit prices, subtotal, reserved buffer, planned total and remaining budget.
- Parties use 100 bounded simulations with one anchor per diner, novelty
  weighting, and enough budget reserved to finish feeding everyone. Real
  duplicates aggregate; shared anchors require explicit serving metadata.
- Reroll controls stay above the receipt and remain available while scrolling.
  Same-restaurant rerolls preserve scroll and focus; reduced motion is supported.
- Ranged, configurable, unpriced or ambiguous menu offers never become prices.
- Different order reuses the menu with no network calls. Different restaurant
  reuses the active Google candidate pool and AllMenus caches.
- The selected 2 / 5 / 10 / 20 / 30-mile straight-line circle is authoritative,
  including venues across municipal boundaries.
- Google attribution and linked AllMenus prices are displayed separately.
  Retrieval time is not a claim that a restaurant updated its menu.
- Browser GPS is requested only on click. Location text and Google content stay
  transient. Completed orders save Place IDs and selected AllMenus order lines
  locally; Google venue details are refreshed instead of persisted.

## Commands

| Command | Purpose |
| --- | --- |
| `npm test` | Provider, identity, geography, pricing, budget and storage boundaries |
| `npm run verify` | Tests, type/content checks, build and shell/secret checks |
| `npm run check:browser` | Controlled Worker + menu-page browser integration |
| `npm run check:party` | Actual App interaction, party receipts, stable repeated clicks and mobile layouts |
| `npm run check:party -- --live` | Same UI check using a freshly retrieved AllMenus menu and a fixed QA restaurant |
| `npm run check:live` | Unmocked Google/AllMenus matrix; records unconfigured cases |
| `npm run preview` | Production preview |
| `npm run portfolio:sync` | Build and refresh the generated portfolio snapshot |

The portfolio builds this source into **/projects/what-we-eating/**.
Old OSM/Photon adapters, the original AllMenus provider and fictional fixtures
are retained outside the default live path.

[Architecture](ARCHITECTURE.md) | [live behavior and limits](docs/LIVE_PROVIDERS.md) |
[Google setup](docs/GOOGLE_PROVIDER.md) | [verification](docs/HYBRID_VERIFICATION.md) |
[portfolio integration](PORTFOLIO_INTEGRATION.md)

[Party composition, interaction design, examples and verification](docs/PARTY_VARIETY.md)

AllMenus coverage, exact-name/address compatibility, source availability,
outdated menus and usable meal anchors limit success. A missing trustworthy
menu is an honest failure. No price inference, nationwide crawl, arbitrary
website scraping, or fictional fallback occurs.
