# Verification

Current checks use Node 24 and Chrome. No API key, billing account, or Worker deployment is required.

- `npm run verify`: 33 app tests, content validation, browser/retained-Worker type checks, production build, and static/PWA artifact checks.
- Portfolio: 21 tests, build, and artifact validation.
- `npm run check:browser`: the production app reads controlled city/menu HTML through its real parser. Checks cover absent/ranged/conflicting prices, restricted specials, out-of-radius venues, unaffordable orders, quantities, party totals, both rerolls, same-order cache reuse, history across reload, typed and browser location, source links, explicit demo isolation, and 375/390/430px overflow.
- Failure checks require no result for a budget too small or a pool without usable prices. No restaurant-only fallback and no Open now control.
- `node scripts/browser-pricing-check.mjs --live`: unmocked production-browser search. Each displayed item and price is compared against a separately fetched actual source menu; subtotal, buffer, and budget arithmetic are verified. Both rerolls and persisted meal history are exercised.

Unmocked checks have succeeded for ZIPs 91711 and 10001. The 91711 run selected Eureka!: Cobb Salad at the listed $16.25, with a $7 reserved buffer and a $23.25 planned total inside a $35 budget. The source price was independently matched, not supplied by a test fixture. The New York check also led to exclusion of build-your-own offers so recommendations contain a named, complete order.

Reports and screenshots are ignored under `artifacts/`. `PRICING_TEST_LOCATION` selects another live test query. `PRICING_TEST_URL` targets a deployed app instead of the local production build.

Live source availability, menu freshness, and nationwide coverage are not guaranteed by these checks. Prices remain the numbers published on the linked menu. Physical mobile installation and a full screen-reader audit remain manual checks.
