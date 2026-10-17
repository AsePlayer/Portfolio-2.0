# Hybrid discovery and pricing completion report

October 17, 2026. **Implementation complete; live Google-to-AllMenus certification pending. This milestone is not PASS.**

## 1. Files changed

Paths below are relative to `So-What-We-Eating-Web/` unless stated otherwise.

- New resolver layer: `src/menus/MenuResolver.ts`, `RestaurantMatcher.ts`,
  `normalizeIdentity.ts`, `AllMenusMenuResolver.ts`.
- New source transport: `src/providers/AllMenusMenuProvider.ts`.
- Runtime/adapters: `src/providers/runtime.ts`, `GooglePlacesProvider.ts`,
  `RestaurantProvider.ts`, `src/main.ts`.
- Domain/validation: `src/domain/Restaurant.ts`, `Menu.ts`, `Discovery.ts`,
  `DiningHistory.ts`, `src/catalog/validate.ts`, `content/menus/menu.schema.json`.
- Source parsing and selection: `src/providers/allmenus/parse.ts`,
  `src/recommendation/RecommendationEngine.ts`.
- History and presentation: `src/storage/LocalDatabase.ts`, `src/ui/App.ts`,
  `attribution.ts`, `src/views/result.ts`, `about.ts`, `history.ts`.
- Worker: `worker/src/index.ts`, `google/geocode.ts`, `normalize.ts`, `places.ts`.
- Verification: `tests/hybrid.test.ts`, `discovery.test.ts`, `pricing.test.ts`,
  `scripts/browser-pricing-check.mjs`, `hybrid-check-entry.ts`,
  `live-hybrid-check.mjs`, `package.json`.
- Setup/docs: `.env.example`, `ARCHITECTURE.md`, `README.md`, `VERIFICATION.md`,
  `PORTFOLIO_INTEGRATION.md`, `docs/GOOGLE_PROVIDER.md`, `LIVE_PROVIDERS.md`,
  `MENU_CATALOG.md`, this report, `public/privacy.html`, `terms.html`.
- Both Pages workflows; portfolio-root `README.md` and `PROJECTS.md`.
- Refreshed generated app HTML, JS assets, service worker and policy pages in
  portfolio-root `projects/what-we-eating/`.

MealBuilder, the original AllMenus provider, OSM/Photon providers and fictional
catalog were retained. No dependency was added.

## 2. Final provider architecture

Google discovery -> canonical `google:<Place ID>` candidates -> weighted
selection -> AllMenusMenuResolver -> validated exact-price Menu -> existing
MealBuilder -> receipt. Google owns geography/venue identity; AllMenus owns
menu-price evidence. The Google Restaurant object is not mutated by enrichment.

## 3. Matching

Only indexes for actual Google candidate localities load lazily. Normalize name
punctuation/case/apostrophes/corporate suffixes and common street formatting.
Require exact normalized name, house number, street, locality and state. Score
these 40/25/15/10 and add 10 for matching ZIP. Require at least 90 and every
required address component. Independently recheck the selected menu page's
heading/address and any published coordinates before canonical association.
Menu metadata retains AllMenus ID, source URL, retrieval time and match evidence.

## 4. Rejection rules

Reject conflicting house numbers, streets, explicit units, cities, states or
ZIPs. Reject missing required branch evidence or a weak normalized name.
Multiple plausible listings are ambiguous, regardless of relative scores.
Published menu coordinates over 300m from Google reject. Detail-page identity,
source identity or menu association conflicts reject before a priced result.
Missing and unpriced menus are distinct outcomes; service failures remain
retryable errors. Price parser restrictions were preserved.

## 5. Reused Google implementation

The existing browser adapter and Worker continue to own request validation,
CORS, secrets, rate limits, Google Geocoding, two-page Text Search,
normalization, place-ID lookup, attribution, directions and independent
Haversine radius checks. The explicit Places mask adds addressComponents only.
Partial geocodes now require structured evidence instead of automatically
failing. GPS skips geocoding. Resolved labels remain transient.

## 6. Network calls per recommendation

One browser Worker POST. For text: one Google geocode; for coordinates: none.
At most two Google Text Search calls. Then sequential AllMenus city-index/menu
requests for promising candidates, stopping at the first complete affordable
order. At most 24 attempts; no new attempt starts after 25 seconds, and an
in-flight request may finish later. Each AllMenus request has an 8-second limit.
Different order makes zero network calls. Different restaurant reuses the active
Google pool when location/radius agree and its five-minute lifetime has not
expired.

## 7. Cache behavior

AllMenus parsed pages and resolutions have bounded 64-entry, 15-minute memory
caches with concurrent-request coalescing. Negative outcomes are cached;
temporary errors are evicted. Changed Google address/coordinates force a new
resolution. A 429 honors Retry-After with at least a minute's cooldown.
Reload clears caches. Only Place IDs and user-selected AllMenus order lines /
totals persist; Google venue and geocode snapshots do not. No external response
is stored by the service worker.

## 8. Live locations tested

The live runner recorded the full matrix below. Every Google case is **blocked
before discovery** by the missing public Worker URL; no coverage inference is
made from that configuration state.

| Input | Google-to-AllMenus result |
| --- | --- |
| 91711 | Blocked: Google Worker endpoint not configured |
| Claremont, CA | Blocked: Google Worker endpoint not configured |
| Diamond Bar, CA | Blocked: Google Worker endpoint not configured |
| Diamondbar, CA | Blocked: Google Worker endpoint not configured |
| 91765 | Blocked: Google Worker endpoint not configured |
| Las Vegas, NV | Blocked: Google Worker endpoint not configured |
| New York, NY | Blocked: Google Worker endpoint not configured |
| Use my location | Blocked; controlled browser GPS path passed separately |
| Claremont/Pomona boundary search | Blocked; controlled cross-city eligibility passed separately |

The runner's GPS case supplies a fixed Claremont test coordinate. Actual device
GPS permission/location behavior still requires a manual check.

## 9. Successful live examples

**AllMenus source portion only**, not a Google end-to-end success:
[Eureka!, 580 W. First Street, Claremont, CA 91711](https://www.allmenus.com/ca/claremont/407489-eureka/menu/).
The actual browser fetched the city index and menu directly with source CORS,
parsed 50 exact-price items and built 2 x House Salad at the listed $10 each.
Food subtotal $20 + separately reserved $8 buffer = $28 planned total,
within a $40 party budget. The concurrent city-index calls coalesced: two
network requests total (one index, one menu). Retrieved October 17, 2026;
this says nothing about when the restaurant updated its listing.

No actual Google -> matched AllMenus -> priced-order example is verified yet.

## 10. Failed or incomplete live examples

No Google case ran because a deployed, authorized endpoint was not supplied or
configured. Those are configuration blockers, not evidence of missing menus or
restaurants. No wrong-branch live association was accepted. Wrong-branch
address/coordinate cases were rejected in automated and controlled-browser
checks. A request-limited environment initially prevented source access; the
network-enabled real AllMenus browser check subsequently succeeded.

## 11. Coverage limitations

Google returns a bounded candidate sample. AllMenus enrichment currently needs
US locality indexes and usable exact-price menus. Conservative name/address/
municipality normalization, missing house numbers, suite differences, moved
venues, Brooklyn/New York locality differences, source CORS/markup changes,
unavailable pages, stale listings and menus without complete meal anchors can
prevent a recommendation. Source availability never changes the user's radius.

## 12. Production setup and validation still required

1. Enable billing, Places API (New) and Geocoding API in Google Cloud; create a
   server key restricted to those APIs and set appropriate quotas.
2. Authenticate Wrangler, deploy the existing Worker and set its
   `GOOGLE_MAPS_API_KEY` secret using the interactive secret prompt.
3. Confirm exact frontend origins and both rate-limit bindings.
4. Set public Actions variable `VITE_RESTAURANT_PROXY_URL` to the deployed
   `https://<worker-host>/discover`, then rebuild/deploy the Pages frontend.
5. Supply that same public URL to `npm run check:live`. Complete the matrix and
   independently verify at least one real Google-to-AllMenus priced order.
6. Manually check real device GPS. Inspect the cross-city matrix case's
   `boundaryConfirmed` result instead of assuming it passed.

See [exact setup](GOOGLE_PROVIDER.md). No API key belongs in Vite, Pages or chat.
No remote deployment was performed during this implementation.

## 13. Commit and automated evidence

The implementation commit SHA is supplied in the final handoff; its complete
file manifest is available with `git show --name-status <SHA>`.

- `npm run verify`: 40 tests passed, content/type validation, production build,
  relative asset/PWA checks and no-browser-secret checks passed.
- `npm run check:browser`: controlled Worker + real parser/resolver flow passed,
  including wrong-branch HTML, prices/arithmetic, too-small budgets, unpriced
  menus, both rerolls and request reuse, history reload, GPS input, explicit
  demo isolation and 375/390/430px layouts; no browser errors.
- Worker `npm run build`: Wrangler dry-run build passed with required bindings.
- Portfolio: 21 tests, build and artifact validation passed; generated snapshot
  synchronized from the final app build.
- `npm run check:live`: actual AllMenus source passed; Google matrix explicitly
  blocked. Overall status remains **NOT VERIFIED**, not PASS.

Ignored machine-readable reports/screenshots are in `artifacts/`, including
`hybrid-live-report.json` and `pricing-report.json`. No Google venue snapshot
was committed as verification evidence.
