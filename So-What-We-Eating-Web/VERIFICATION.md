# Verification

Current checks use Node 24 and Chrome. No Google key, billing account, or Worker deployment is required.

- `npm run verify`: 28 app tests, menu/content validation, browser/optional-Worker type checks, production build, and static/PWA artifact checks.
- Portfolio: 21 tests, build, and validation, including Selected Work versus Independent Projects, optional type labels, safe text, compact credentials, and retained professional metadata.
- `npm run check:browser`: free-default and optional-Google browser suites cover location success/denial, typed input, 2/30-mile radius, explicit expansion, privacy-safe saved visits, cached rerolls, no fabricated menu totals, external handoffs, mobile overflow, explicit demo, temporary storage, offline shell, updates, and subpath isolation.
- Hours regression checks confirm no Open now input, no open/closed/unknown-hours result labels, no extra include-unknown action, and no persisted legacy toggle. Photon outage fallback returns a restaurant on the first search without schedule data.
- The optional Worker v2 opening-status contract still has compatibility tests, but the current browser always sends false. The free schedule parser and timezone package have been removed.

Browser reports/screenshots live in ignored `artifacts/`. The live smoke check is `node scripts/browser-free-check.mjs --live`, which uses the ordinary production build and real public services. Public Overpass availability can vary; Photon can supply real OSM venues without hours data. No live opening-hours claim is made.

The current unmocked ZIP 91711 search returned a real restaurant directly, without a second hours-related action. A reroll reused the cached venue pool. The portfolio preview also passed 375–1440px light/dark layout checks, keyboard/menu/theme behavior, no-JavaScript content, résumé PDF delivery, both embedded app launches, and return links with no page errors.

Physical mobile installation, exhaustive nationwide coverage, and a full screen-reader audit remain manual checks. Real restaurant menus/prices are not bundled; the explicit fictional demo remains separate and works offline after shell installation.
