# So What We Eating?

**You bring the appetite. We make the call.** A free, open-source restaurant decision app. Give it a location, party budget, and distance; get one real restaurant. Detailed ordering works when an independent menu is available.

## Run it

Use Node.js 24:

```sh
cd So-What-We-Eating-Web
npm ci
npm run dev
```

Use `npm.cmd` if PowerShell blocks npm.ps1. **Normal live discovery needs no API key, billing account, environment file, or backend deployment.** The static app uses OpenStreetMap restaurant data through Overpass and Photon. Photon also handles typed-location geocoding. See [provider behavior and public-service limits](docs/LIVE_PROVIDERS.md).

## Behavior

- Location permission is requested only on your click. Coordinates and typed queries stay out of persistent storage.
- Choose 2 / 5 / 10 / 20 / 30 miles, default 5. Distances are straight-line.
- Opening-hours controls, status labels, and filtering are currently removed because live coverage is too unreliable. Saved legacy toggles are discarded; missing hours never block a recommendation.
- If Overpass is unavailable, Photon can still locate real restaurants. No-results actions expand the radius only after your click.
- Restaurant rerolls retain the submitted settings and reuse a five-minute in-memory discovery cache.
- Missing menus/prices produce an honest restaurant-only result. No ratings or price levels are invented.
- History stores provider IDs and your actions. Favorites, exclusions, budgets, and preferences stay on this browser.
- Explicit `?mode=demo` loads original fictional Pasadena places/menus and works offline after installation. Failed real searches never substitute them.

## Commands

| Command | Purpose |
| --- | --- |
| `npm test` | Domain, storage, free provider, and optional Google Worker contract tests |
| `npm run verify` | Tests, content/type validation, build, and artifact checks |
| `npm run check:browser` | Browser acceptance for the free default and optional Google integration |
| `npm run preview` | Production preview |
| `npm run portfolio:sync` | Build and safely refresh the parent portfolio snapshot |
| `npm run content:import -- input.json candidate.json` | Validate a manual menu without overwriting |

The optional Google integration remains under `worker/`; **ordinary builds and Pages deployment do not install or deploy it**. Choosing that provider requires deliberate account/key configuration described in [GOOGLE_PROVIDER.md](docs/GOOGLE_PROVIDER.md). Setting a leftover Worker URL alone does not enable Google.

## Structure and deployment

Browser source is in `src/`; menus and import tooling are independent. Vite's relative base supports standalone and portfolio subpaths. The portfolio publishes the generated snapshot at **/projects/what-we-eating/**. See [ARCHITECTURE.md](ARCHITECTURE.md), [PORTFOLIO_INTEGRATION.md](PORTFOLIO_INTEGRATION.md), [menu tooling](docs/MENU_CATALOG.md), and [VERIFICATION.md](VERIFICATION.md).

## Limits

OpenStreetMap restaurant, address, and hours coverage varies. Public services can be slow, throttle requests, or be unavailable; they have no uptime guarantee and are unsuitable as an unlimited large-scale backend. The app makes bounded searches on action, caches repeated requests in memory, and does not retry or rotate servers after errors. Running a busy service may require your own open-source infrastructure. The app currently makes no open/closed claim or opening-hours recommendation. Check current details with the restaurant before traveling. Confirm details before traveling. Real menus are not currently bundled; the offline shell cannot discover real places. Physical mobile home-screen installation remains a manual check.
