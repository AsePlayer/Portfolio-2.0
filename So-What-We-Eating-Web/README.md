# So What We Eating?

**You bring the appetite. We make the call.** A mobile-first food decision app. Give it a location, party budget, and distance; get one restaurant, with a sensible order when detailed menu data exists.

## Run it

Use Node.js 24:

```sh
cd So-What-We-Eating-Web
npm install
npm run dev
```

Use `npm.cmd` on Windows if PowerShell blocks npm.ps1. Normal mode is **live**. It needs a public Worker URL configured in `VITE_RESTAURANT_PROXY_URL`; the Google secret stays on the Worker. Without that configuration it says discovery isn't connected.

For a complete no-key development demo, append **`?mode=demo`** to the printed URL. It explicitly uses original fictional restaurants/menus near Pasadena. Do not travel to sample addresses. This mode never substitutes for a failed live search.

## CB02 behavior

- Current location is requested only after pressing the location button, with accurate coordinates held in memory.
- Typed cities, ZIPs, and street addresses are geocoded server-side.
- Choose **2 / 5 / 10 / 20 / 30 miles**; default **5**. Distances are straight-line, not driving distance.
- **Open Now** defaults on and requires confirmed open state. Unknown hours are labeled when allowed; known closed places are excluded.
- No-results actions expand only after your click, stopping at 30 miles.
- Discovery and detailed menus remain separate; missing menus produce an honest restaurant-only result.
- Different Restaurant retains location, distance, Open Now, budget, and party size.
- Favorites/exclusions, preferences, and completed visits stay local. Only We ate here records a completed visit.
- Google history saves IDs and user actions, not restaurant snapshots. Current details can be refreshed on request.
- Scoped PWA shell, official attribution, public terms/privacy pages, relative paths, and portfolio integration.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite server, no worker registration |
| `npm test` | Domain, storage, live contract, and Worker tests |
| `npm run content:validate` | Validate the independent original menu catalog |
| `npm run build` | Catalog validation, browser/Worker typecheck, frontend build, offline shell |
| `npm run verify` | Tests, build, and production artifact checks |
| `npm run check:browser` | Chrome acceptance against real Worker code with mocked Google responses |
| `npm run preview` | Preview the production build |
| `npm run portfolio:sync` | Build and safely refresh the parent portfolio snapshot |
| `npm run content:import -- input.json candidate.json` | Validate/normalize a manual menu without overwriting |
| `npm --prefix worker run build` | Wrangler packaging dry-run after `npm ci --prefix worker` |

Browser verification uses installed Chrome on Windows, Playwright Chromium elsewhere, or `CHROME_PATH`. It creates a separate ignored artifact with a reserved test endpoint, keeps production dist untouched, and makes no Google calls. Screenshots/results are in `artifacts/`. The Worker package and its lockfile are separate from the minimal browser toolchain.

## Live activation

Follow **[docs/LIVE_PROVIDERS.md](docs/LIVE_PROVIDERS.md)** for exact Google Cloud, Worker deployment/secret, CORS/quotas, and portfolio variable instructions. Required services are Places API (New) and Geocoding API. The Worker secret is `GOOGLE_MAPS_API_KEY`; it never belongs in a VITE variable. Actual activation needs the owner's accounts/key and has not been performed by the code-only implementation.

## Structure and deployment

Browser source is under `src/`; serverless source is under `worker/src/`. `content/` and `tools/menus/` remain independent of live discovery. The recommendation engine stays provider-neutral. See [ARCHITECTURE.md](ARCHITECTURE.md), [MIGRATION.md](MIGRATION.md), [menu tooling](docs/MENU_CATALOG.md), and [VERIFICATION.md](VERIFICATION.md).

The complete frontend build is `dist/`, using `base: './'`. The portfolio hosts its generated snapshot at **/projects/what-we-eating/**. Its Pages workflow builds/tests the app and dry-runs the Worker bundle, then syncs/builds the portfolio. Worker deployment is a separate explicit operation. Standalone repository workflows remain available. See [PORTFOLIO_INTEGRATION.md](PORTFOLIO_INTEGRATION.md).

## Limits

No live Google credential or deployed Worker is bundled. Provider candidate pools and regional coverage are limited; results are not a complete nearby inventory. Opening state is search-time information and can change. Price levels are approximate, and missing detailed menus cannot produce guaranteed priced orders. No dietary/allergen guarantees or drive-time calculation. A heuristic order repeats one entrée across diners or uses shared servings. Local history caps at 200 visits/600 events; separate tabs use last-write-wins. Physical iOS/Android installation has not been tested.
