# Architecture

## Boundaries and flow

```text
UI → App → RecommendationEngine → RestaurantProvider
                                       ↓
                          GooglePlacesProvider client
                                       ↓
                       HTTPS Worker POST /discover
                         ↙                     ↘
                 typed query              coordinates
                      ↓                        │
                  geocoding ───────────────────┘
                                       ↓
                      Text Search (New), ≤2 pages
                                       ↓
                  normalize, dedupe, circular distance,
                 business/open status, attribution
                                       ↓
                         normalized Restaurant[]
                                       ↓
                eligibility + separate MenuProvider
                                       ↓
                   meal templates + weighted pick
                                       ↓
                         one recommendation
```

`src/main.ts` composes runtime providers. Default live mode never falls back to fixtures, including when configuration, network, or quotas fail. Only explicit demo mode loads fixture providers/catalog via lazy imports. UI modules do not import either provider implementation. The frontend has zero runtime package dependencies.

`worker/src/` owns Google calls and secrets. It shares pure domain/math helpers with the browser, never UI/storage code. TypeScript checks both source trees; Wrangler separately validates bundling and bindings. No Worker deployment happens during a frontend build.

## Location, radius, and opening status

LocationParser validates intent, not geography. A typed location carries its user's query to the Worker; coordinates carry a browser/manual source. Only explicit fixture mode has a small demo-location mapping. Browser permission is requested on action, with high accuracy and a one-minute position maximum age. Typed input remains available after denial.

Radius is a supported meter value for 2/5/10/20/30 miles (3219/8047/16093/32187/48280 m), safely below 50 km. Default is 5 miles. Spherical bounding-box math includes polar/antimeridian cases; Haversine filtering turns Google's rectangle into the chosen circle. The client recomputes distances independently. No-results expansion is explicit and capped.

Open Now is sent upstream and defaults true. Both layers require a true current-opening-state field when enabled. Unknown is not open. When disabled, unknown-hours candidates can qualify; known-closed/non-operational places remain excluded. No local-time weekday schedule guesses are used. Result timestamps make the search-time nature of hours visible.

## Worker and contract

`POST /discover` v2 takes either coordinates or locationQuery, plus radius and openNow. Geocoding resolves ordinary queries on the server; coordinates avoid that call. Text Search (New) supplies up to 40 upstream candidates with a bounded field mask. Stable IDs normalize as google:<place-id>; duplicates disappear. Empty discovery is valid. A failed later page can retain its already valid first-page pool with partial=true. Errors expose only our own codes/messages.

The same endpoint accepts a disjoint placeIds request (max three) for explicit current-detail refresh, using Place Details (New). No bulk background history hydration occurs.

The server validates method, path, origin, size (2 KiB), version, fields, coordinates, and supported radius; it applies per-IP/shared-edge rate limits and an 18-second deadline. All Google URLs are fixed by code. Responses are no-store, application/request logs are disabled, and nothing writes an upstream cache. CORS and edge limits are not a global quota or general authentication system; owner-configured Google quotas remain necessary.

## Recommendation and menus

The existing engine still discovers, filters eligibility, obtains an independent menu, builds a meal if possible, scores, and randomly chooses one suitable candidate. Missing/failed menus are a normal restaurant-only state. CB02 live menus return null until a separately permissioned catalog can join stable provider IDs. Fixture menus still exercise complete orders.

Budget arithmetic uses integer cents and reserves the buffer from the full party budget first. Templates cover one main/combo per diner or enough shared servings, with optional sides/drinks or a starter/dessert. No unrelated extra mains are added. Known price levels give a rough affordability screen; unknown price is not proof of unaffordability. No priced total is invented without menu data.

Restaurant weights retain ratings, distance, favorites, cuisine tastes, recent rejection, completed-repeat, and adventure components. A positive floor preserves surprise. Randomness is injectable. Order rerolls exclude the immediate meal signature when another fits; restaurant rerolls preserve the complete submitted request and exclude the immediate restaurant. API results are a sample, not an exhaustive city inventory.

## Persistence and provider content

LocalDatabase is the sole localStorage boundary. The existing swwe:v1:<deployment-path> key stays stable, while payload schema migrates to version 2. Migration whitelists settings/events/preferences and removes stored location labels or Google snapshots. Unsupported/corrupt records remain untouched in temporary mode; explicit Clear can reset an accessible record.

Settings include budget, party size, radius, Open Now, adventure, dining mode, and buffer. No coordinates or typed addresses are saved. Events record IDs, action, and timestamp. Only explicit acceptance creates completed history, once per recommendation. Google-backed visits store stable place IDs plus the user's party size/action/time, with no names, addresses, cuisines, ratings, hours, URLs, or provider coordinates. Original fictional meals may retain their own original snapshots. User-selected favorites, exclusions, and cuisine opinions remain user state.

Current Google display details live in memory. A saved visit can refresh one restaurant on action; this does not persist returned content. History/preferences render the official Google Maps asset and third-party credits wherever current Google content appears. Public privacy and terms pages are linked. Refer to docs/LIVE_PROVIDERS.md for the official policy sources and activation details.

## PWA and portfolio

The shell and original demo catalog are build-owned static assets. Cache versions hash all built bytes and the worker template. Install precaches a complete shell; activation removes only caches under this exact app scope. Hashed assets are cache-first; navigation is network-first with cached page/shell fallback. Live discovery/lookup are POST requests and never enter shell caches; no provider data is written to IndexedDB or CacheStorage. Offline live mode explains the connection requirement. Explicit demo works offline after shell installation.

Hash routes need no server rewrites. Relative Vite/assets/manifest/worker URLs support standalone and portfolio subpaths. The portfolio sync adds its return link and includes that modified HTML in its shell version. Source remains independent of generated projects/what-we-eating/. The portfolio workflow passes only the public endpoint URL and forces live mode.
