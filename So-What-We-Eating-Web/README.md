# So What We Eating?

**A place, an exact order, and listed prices within your party budget.**
AllMenus supplies real menu listings and exact prices, Photon resolves your
location, and MealBuilder composes a varied party order within budget.

## Run locally

Use Node 24:

```sh
cd So-What-We-Eating-Web
npm ci
npm run dev
```

Normal live mode uses AllMenus + Photon with no API key, billing account or
Worker setup. Optional VITE_PHOTON_URL selects a compatible HTTPS geocoder.
Explicit ?mode=demo is always labeled fictional. Google discovery remains an
experimental opt-in; see docs/GOOGLE_PROVIDER.md. Failed live searches never
substitute demo data.

## Behavior

- AllMenus supplies restaurant listings and menus; Photon resolves the origin.
- Each selected restaurant must have usable exact menu prices and venue
  coordinates inside the requested circle.
- Every successful recommendation includes exact listed items, quantities,
  unit prices, subtotal, reserved buffer, planned total and remaining budget.
- Parties use 100 bounded simulations with one anchor per diner, novelty
  weighting, and enough budget reserved to finish feeding everyone. Real
  duplicates aggregate; shared anchors require explicit serving metadata.
- Reroll controls stay above the receipt and remain available while scrolling.
  Same-restaurant rerolls preserve scroll and focus; reduced motion is supported.
- Ranged, configurable, unpriced or ambiguous menu offers never become prices.
- Different order reuses the menu with no network calls. Different restaurant
  reuses the active candidate pool and AllMenus caches.
- The selected 2 / 5 / 10 / 20 / 30-mile straight-line circle is authoritative,
  including venues across municipal boundaries.
- AllMenus source links and retrieval timestamps accompany the receipt.
  Retrieval time is not a claim that a restaurant updated its menu.
- Browser GPS is requested only on click. Exact user coordinates and typed
  addresses stay transient. Completed meals save restaurant and selected
  AllMenus order details locally. Experimental Google content is not persisted.

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
are retained available; production retains the working AllMenus/Photon path.

[Architecture](ARCHITECTURE.md) | [live behavior and limits](docs/LIVE_PROVIDERS.md) |
[Google setup](docs/GOOGLE_PROVIDER.md) | [verification](docs/HYBRID_VERIFICATION.md) |
[portfolio integration](PORTFOLIO_INTEGRATION.md)

[Party composition, interaction design, examples and verification](docs/PARTY_VARIETY.md)

AllMenus coverage, exact-name/address compatibility, source availability,
outdated menus and usable meal anchors limit success. A missing trustworthy
menu is an honest failure. No price inference, nationwide crawl, arbitrary
website scraping, or fictional fallback occurs.
