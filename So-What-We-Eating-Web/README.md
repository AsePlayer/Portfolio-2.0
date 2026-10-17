# So What We Eating?

**You bring the appetite. We make the call.** A mobile-first, fixture-powered food decision app rebuilt from the Unity/Python project. One restaurant, an actual meal structure, and a budget for the whole party.

## Run it

Use Node.js 24:

```sh
cd So-What-We-Eating-Web
npm install
npm run dev
```

Open the local URL printed by Vite. On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`. No API keys, accounts, backend, or runtime dependencies are required.

Try **Pasadena, CA** or **91101**, a **$35** party budget, and **1 person**, then **Feed me**. ZIPs 91103 and 91105 also map to the small Pasadena demo center. Browser location and manual `latitude,longitude` inputs work when within range of the sample neighborhood. Unsupported locations get a useful message; the app does not pretend to search nationwide.

All eight restaurants, addresses, ratings, statuses, and seven menus are original fictional fixtures. **Do not travel to sample addresses.** Directions explains this in a dialog; View menu opens the local sample menu. Basil Street Kitchen intentionally has no menu, and Night Market Noodles is closed. The fixture demo works offline after its production shell is installed once.

## What works

- Party-wide budget, 1–8 diners, configurable reserved buffer, and integer-cent arithmetic.
- Weighted restaurant selection, full meals or graceful restaurant-only results.
- Independent restaurant/order rerolls; no immediate repeat when an alternative exists.
- Completed history only after **We ate here**, with duplicate-click protection.
- Favorites, exclusions, cuisine tastes, adventure setting, and implicit preference signals.
- Browser-local persistence; unavailable/full/corrupt storage falls back to the current tab.
- Responsive keyboard-accessible views, reduced-motion support, install metadata, and offline shell.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite development server; no service worker |
| `npm test` | Node's built-in test runner for domain and storage behavior |
| `npm run content:validate` | Validate catalog structure, provenance, identities, prices, and index consistency |
| `npm run build` | Validate content, typecheck browser code, build `dist/`, generate versioned worker |
| `npm run preview` | Serve the production build locally |
| `npm run portfolio:sync` | Build and safely refresh the parent portfolio's generated food app |
| `npm run verify` | Tests, production build, manifest/assets/subpath checks |
| `npm run check:browser` | Chrome/Playwright acceptance at repository and portfolio subpaths; run after build |
| `npm run content:import -- input.json candidate.json` | Normalize a manual menu into a new file; never overwrite |
| `node scripts/generate-icons.mjs` | Regenerate committed PNG install icons from the original programmatic design |

Browser verification uses installed Chrome on Windows or Playwright Chromium elsewhere. Set `CHROME_PATH` to an installed Chromium executable when needed. Browser tooling is a development dependency only. Results and screenshots go to ignored `artifacts/`.

## Structure

`src/domain` defines normalized data, configuration, and budgeting. `src/recommendation` builds meals and scores restaurants without fetching or rendering. `src/providers` supplies restaurant/menu interfaces and fixture implementations. `src/location` separates parsing from permission-based geolocation. `src/storage` owns all localStorage access. `src/views` and `src/ui` render and coordinate actions. `content/` contains the original catalog; `tools/menus/` validates and imports it at build time.

See [ARCHITECTURE.md](ARCHITECTURE.md), [MIGRATION.md](MIGRATION.md), [menu tooling](docs/MENU_CATALOG.md), and [future live discovery](docs/LIVE_PROVIDERS.md).

## Deploy

`npm run build` produces a self-contained **`dist/`**. Vite uses `base: './'`: copy its complete contents to any directory served with a trailing slash, including `https://aseplayer.github.io/So-What-We-Eating-Web/`. HTTPS is required for production geolocation/service workers; localhost is suitable for testing.

The app is integrated into this portfolio at `/projects/what-we-eating/`. Its source lives here; `npm run portfolio:sync` refreshes the generated snapshot and adds a Portfolio return link. The parent portfolio's Pages workflow builds this source during deployment. The app's own nested Actions workflows are dormant here; they support verification and manual Pages deployment when this folder becomes a standalone repository. See [PORTFOLIO_INTEGRATION.md](PORTFOLIO_INTEGRATION.md).

## Current limits

Live restaurant/geocoding services are not activated. Discovery-only budget matching is approximate and never produces a priced total. Meals are heuristic and repeat one selected entrée across diners; shared dishes use explicit servings. No dietary/allergen guarantees, live hours, or real prices are provided. The buffer is an allowance, not a tax or tip calculation. Personal storage is limited to 200 completed meals and 600 events; separate tabs use last-write-wins storage. Physical iPhone/Android installation has not been tested. See [VERIFICATION.md](VERIFICATION.md) for the checks actually run.
