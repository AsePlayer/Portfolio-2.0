# So What We Eating?

**A place, an order, and the price.** A free, open-source meal decision app. Give it your location, party size, budget, and radius; get real named menu items, unit prices, and an itemized order within the whole party budget.

## Run it

Use Node.js 24:

```sh
cd So-What-We-Eating-Web
npm ci
npm run dev
```

Use `npm.cmd` if PowerShell blocks npm.ps1. **No API key, billing account, environment file, or backend deployment is required.** The browser reads public AllMenus city listings and menus directly, restoring the original app’s menu-first approach. Photon resolves locations. See [live provider behavior and limits](docs/LIVE_PROVIDERS.md).

## Behavior

- Feed me succeeds only with a complete, priced order inside your party budget, including the separately reserved buffer.
- Missing prices, ambiguous price ranges, unusable menus, and orders over budget cause that restaurant to be skipped. No invented prices or restaurant-only success.
- Quantities, unit prices, food subtotal, buffer, planned total, and money remaining are shown together with the source menu.
- Different order here reuses the loaded menu. Different restaurant keeps your submitted settings and finds another priced order.
- Choose 2 / 5 / 10 / 20 / 30 miles, default 5. Actual venue coordinates must fit the chosen straight-line radius. Expansion requires your click.
- Opening-hours controls and status labels remain removed until their reliability is established.
- Location permission is requested on your click. Exact user coordinates and typed addresses stay out of persistent storage.
- We ate here saves the actual selected items, unit prices, restaurant name, and planned total on this browser.
- Explicit `?mode=demo` loads original fictional Pasadena restaurants/menus. Failed live searches never substitute demo data.

## Commands

| Command | Purpose |
| --- | --- |
| `npm test` | Budget, menu, provider, storage, and retained adapter contract tests |
| `npm run verify` | Tests, content/type validation, build, and artifact checks |
| `npm run check:browser` | Full menu-first browser acceptance with controlled source pages |
| `node scripts/browser-pricing-check.mjs --live` | Unmocked live menu/price verification |
| `npm run preview` | Production preview |
| `npm run portfolio:sync` | Build and refresh the generated portfolio snapshot |
| `npm run content:import -- input.json candidate.json` | Validate a manual menu without overwriting |

Old Google/Worker and OSM discovery adapters remain as isolated source references and contract tests. They are not composed into the app, required by deployment, or fallback providers.

## Structure and deployment

Browser source is in `src/`; normalized menu tooling is independent. Vite’s relative base supports standalone and portfolio subpaths. The portfolio publishes the generated app at **/projects/what-we-eating/**. See [architecture](ARCHITECTURE.md), [portfolio integration](PORTFOLIO_INTEGRATION.md), [menu normalization](docs/MENU_CATALOG.md), and [verification](VERIFICATION.md).

## Limits

Live coverage depends on usable US city listings, public menu pages, and geocoding. The app checks a bounded candidate sample, not every nearby restaurant. Published prices may be stale and are not a final checkout quote; actual prices, tax, and tips can differ. Direct page access and markup can change. Rate limits and outages produce visible errors, never fictional replacements. No real menu dataset is bundled or collected during builds. Live searches need a connection; the installed shell and explicitly selected demo can work offline.
