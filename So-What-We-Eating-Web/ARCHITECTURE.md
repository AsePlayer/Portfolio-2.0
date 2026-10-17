# Architecture

Google = discovery / canonical restaurant identity.
AllMenus = menu and exact price enrichment.
MealBuilder = bounded party simulations with deterministic budget safety.

```text
browser GPS or text
  -> Google discovery Worker (text -> Google Geocoding)
  -> canonical google:<Place ID> candidates inside the circle
  -> weighted candidate selection
  -> AllMenusMenuResolver
      -> that candidate's locality index (lazy)
      -> deterministic name + branch-address match
      -> selected menu page + second identity/coordinate check
      -> validated, canonically associated priced Menu
  -> existing MealBuilder -> itemized receipt
```

## Boundaries

`src/providers/runtime.ts` composes `GooglePlacesProvider` and
`AllMenusMenuResolver` in live mode. The public
`VITE_RESTAURANT_PROXY_URL` points to the Worker's `POST /discover`.
Missing configuration is visible; only explicit `?mode=demo` loads fixtures.
There is no live fallback to fixtures or another discovery source.

The existing Worker owns Google geocoding, two Text Search pages (at most 40
upstream candidates), field masks, normalization, CORS, and rate limits.
Google supplies venue name/address, rating, coordinates, structured locality,
state, ZIP, and canonical identity. Worker and browser independently compute
Haversine distances and reject results beyond the selected circle. Municipal
boundaries do not constrain discovery.

`AllMenusMenuProvider` only fetches/parses source pages.
`menus/RestaurantMatcher.ts` implements deterministic matching.
`menus/AllMenusMenuResolver.ts` returns matched / not-found / ambiguous /
unpriced; service failures remain exceptions, not missing coverage.
Future resolvers implement `MenuResolver` without changing discovery.

A resolved menu keeps `restaurantId = google:<Place ID>`, separate
`providerRestaurantId`, source URL, retrieval time, match time/confidence.
The Google Restaurant is never mutated with AllMenus identity or location.

## Matching

Names normalize case, punctuation, apostrophes, accents, whitespace, ampersands,
and terminal corporate suffixes. Strong matches require the same normalized
name, house number, normalized street, locality and state. ZIP agrees when
both sources provide it. Street abbreviations and first through fifth ordinal words
normalize deterministically; explicit unit conflicts reject.

Scores: name 40, house number 25, street 15, locality/state 10, ZIP 10.
A score of at least 90 plus all required address evidence is necessary.
Names alone never qualify. If more than one non-conflicting same-name
candidate remains plausible, resolution is ambiguous, regardless of score.
Conflicting city/state/ZIP, house number, street or unit rejects. After fetching
the detail page, its own heading/address must independently satisfy the same
rules. Its coordinates, when published, must be within 300m of Google's venue.
This intentionally rejects uncertain matches and may miss valid coverage.

## Recommendation and rerolls

The engine validates inputs, applies preferences/exclusions/history and weighted
selection, and resolves candidates sequentially. It stops on the first
affordable complete order. At most 24 candidates are considered and no new
attempt starts after 25 seconds; an already running request may finish later.
Individual AllMenus requests time out after 8 seconds. No bulk menu downloads,
city enumeration, background crawl, or build-time live-data fetch occurs.

Different order runs only MealBuilder over the result's menu: zero network.
Different restaurant excludes the canonical ID and reuses the same search pool
for five minutes when location/radius agree; after expiry it rediscovers.
Budget/party/preferences still apply freshly on each selection.

## Cache and storage

The active Google search context is reusable for up to five minutes.
Venue details and resolved labels stay transient in the tab. No Google/geocoding payload enters localStorage,
IndexedDB, CacheStorage, logs, generated assets, or source-controlled reports.

AllMenus page parsing and menu resolutions use bounded 64-entry, 15-minute
in-memory caches. Concurrent requests coalesce. Missing/ambiguous/unpriced
outcomes are cached; transient service errors are evicted and may be retried.
Resolution keys include the venue's current identity/address/coordinates, so a
changed Google record is rechecked. A 429 starts at least a one-minute cooldown,
honoring a longer Retry-After value.
Reload discards these caches. The service worker stores only the app shell.

Completed hybrid meals persist Google Place IDs and user choices (AllMenus item
names/unit prices and planned total), with explicit AllMenus order provenance.
Google-derived restaurant names, addresses, coordinates, ratings and cuisines
are excluded by both serialization and migration. History reloads with "Saved
restaurant" until current Google details are refreshed. Old free adapters,
Photon support, the original AllMenus provider and fixture catalog remain.

## Provenance

Google venue details carry Google Maps and returned provider attribution.
The receipt separately links "Menu & listed prices: AllMenus" and states the
actual retrieval time, possible price differences, and excluded tax/tip.
Retrieval is never represented as the restaurant's last menu update.

See [setup](docs/GOOGLE_PROVIDER.md), [live behavior](docs/LIVE_PROVIDERS.md),
and [current verification](docs/HYBRID_VERIFICATION.md).
