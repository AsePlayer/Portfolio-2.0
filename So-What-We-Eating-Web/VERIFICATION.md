# Verification

Verified October 16, 2026 with Node 24.16.0, npm 11.13.0, and installed Chrome.

## Current checks

- `npm run verify`: 29 app tests, menu validation, browser/optional-Worker TypeScript checks, Vite build, and relative-path/manifest/PNG/offline-shell artifact checks.
- Parent portfolio: 20 tests, build, and publication validation.
- Free-provider tests cover default configuration without keys (including a leftover Google URL), coordinate/ZIP geocoding, normalization/deduplication, node/way identity, circle enforcement, opening states, venue time zones, midnight/split schedules, unsupported hours, memory caching, real-data outage fallback, quota cooldown, friendly errors, and privacy-safe history migration.
- Existing menu/budget/party/reroll and optional Google Worker contract tests remain covered. The separate Google Worker is not required by normal builds or deployment.

## Browser acceptance

`npm run check:browser` runs two suites:

1. The ordinary production artifact with free public endpoints intercepted only for deterministic response scenarios: no setup note or automatic location prompt, typed ZIP, GPS without geocoding, restaurant-only result, ODbL attribution, preserved/cached reroll, history refresh, 2/30-mile controls, explicit unknown-hours choice, and Overpass-outage discovery through Photon's real-data response format. Desktop/mobile screenshots are inspected for overflow.
2. The optional Google integration, using a separate test artifact and real Worker handler with mocked Google responses: arbitrary typed locations, location success/denial, radius expansion, opening states, directions, storage/migration, explicit demo, offline shell, scope, and updates.

Neither automated fixture suite needs a credential or makes a paid Google request. Reports/screenshots are ignored under `artifacts/`.

## Unmocked free-service check

`node scripts/browser-free-check.mjs --live` uses the normal production artifact and real public services. Photon resolved ZIP 91711 and returned real nearby restaurant records. Private.coffee's Overpass API was returning HTTP 500 without CORS headers during this check; the app used Photon's OpenStreetMap restaurant index. The browser explicitly selected **Include places with unknown hours** before receiving a real result (Domino's). A reroll selected another stable venue ID from the same cached pool with no additional external request. The run made three external requests, needed no credentials/billing/backend, and completed in roughly two seconds. This verifies free restaurant discovery, not real-time open status.

A direct bounded Overpass query also returned restaurant records earlier in the session, before public service timeouts. Public service health varies; no availability guarantee is implied.

## Limits and remaining manual checks

No Google key/account/Worker was activated. Live nationwide coverage and actual late-night availability have not been exhaustively checked. OpenStreetMap hours may be absent or stale; unsupported/conditional schedules remain unknown. Time-zone lookup is approximate. Physical mobile installation and full screen-reader auditing remain manual. Menus/prices are not invented for real venues. Live discovery needs a connection; the explicit fictional demo remains available offline.
