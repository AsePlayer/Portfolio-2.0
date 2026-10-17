# Architecture

## Runtime flow

```text
UI → App → RecommendationEngine
            ├─ AllMenusProvider: RestaurantProvider + MenuProvider
            │    location → Photon → US city listing
            │    weighted candidate → real menu → exact prices + venue coordinates
            │    radius check → affordable complete order → itemized receipt
            └─ explicit demo → fictional fixture providers
```

`src/providers/runtime.ts` composes the same AllMenus provider for live discovery and menus. Only explicit demo mode lazy-loads fixtures. Live failures cannot select them. The browser has no runtime package dependencies or server secrets. Legacy OSM/Google adapters and the Worker are isolated; no current environment variable activates them.

## Location and source access

Photon resolves typed cities, ZIPs, and addresses, or reverse-geocodes coordinates supplied by an explicit browser-location action. US state identifiers map live city results to public AllMenus city URLs; no fixed city/ZIP table or fixture mapping is used in live mode. Ambiguous and unsupported locations produce actionable errors.

AllMenus HTML is read through its direct CORS-enabled HTTPS responses, with credentials omitted. Source URLs are restricted to the expected host and menu path. Native DOMParser reads city restaurant links, the dedicated restaurant heading, address/map coordinates, menu categories, item names, and exact single prices. No raw HTML is persisted. If map coordinates are absent, full-address geocoding must resolve a house/street; a city centroid is never substituted for a venue.

Each successful request has a bounded 15-minute in-memory cache, up to 64 entries. Requests are user-triggered, sequential, and have a 10-second timeout. A 429 starts a cooldown of at least one minute. There are no background crawls, bulk downloads, automatic retries, or proxy/server rotation.

## Eligibility, prices, and order construction

The engine chooses weighted candidates one at a time, reads a menu, validates its stable restaurant ID and schema, and rechecks radius after precise coordinates are known. Missing/malformed/unpriced menus and unaffordable orders are skipped. A search stops at the first complete affordable order, or after 24 candidates / a 25-second selection deadline. A request in progress can finish after that deadline.

A successful result is a `PricedMealRecommendation`: both menu and meal are required. No restaurant-only result or price-level approximation can satisfy Feed me. Exact source prices are normalized; ranges, “from”, add-on prices, conflicting duplicate prices, restricted/time-limited categories, and build-your-own offers are excluded. Shared-serving counts are never guessed.

Budget arithmetic uses integer cents. The buffer is reserved from the full party budget before meals are built. Templates provide one main/combo per person or documented shared servings, with optional sides/drinks or a starter/dessert. Optional categories are bounded to their eight cheapest items to prevent combinatorial work on large live menus; all main anchors remain candidates.

Weights retain distance, favorites, cuisine tastes, recent rejections, completed repeats, and adventure, with a positive floor. Randomness is injectable. Same-restaurant rerolls use the validated menu and exclude the preceding signature when another fits. Different-restaurant rerolls preserve the submitted request and exclude the preceding restaurant.

Supported radii are 2/5/10/20/30 miles, default 5. Venue distance is recomputed using Haversine math; expansion always requires an action. Opening-hours controls, status labels, and filtering remain suspended.

## Local state and attribution

LocalDatabase is the only localStorage boundary. The existing `swwe:v1:<deployment-path>` key retains payload schema version 2. Migration whitelists supported fields, removes saved user locations and old Google snapshots, and discards old hours toggles. Corrupt/unsupported records stay untouched in temporary mode until an explicit clear.

Settings store budget, party size, radius, adventure, dining mode, and buffer. User-selected favorites, exclusions, cuisine opinions, and events are local. Only We ate here creates a completed meal. New AllMenus visits retain the selected restaurant name, item names and unit prices, planned total, party size, ID, and timestamp so meal history remains useful after reload. Exact user coordinates and typed searches are never persisted. Older OSM/Google visits retain IDs and user actions only.

Every live result links its source menu and displays retrieval time. This timestamp is when the page was fetched, not a claim about the source’s menu-update date. Posted prices are planning inputs, not guaranteed current checkout prices. Photon/OpenStreetMap attribution and current privacy terms are in About.

## PWA and portfolio

The service worker caches app-owned shell assets and the original explicit-demo catalog. External geocoding/menu requests never enter shell caches, IndexedDB, or CacheStorage. Offline live mode explains the connection requirement.

Hash routes and relative assets support standalone and portfolio subpaths. Cache versions hash built bytes; the portfolio sync adds the return link and rehashes the modified HTML. App source is independent of generated `projects/what-we-eating/`. Pages builds the normal live menu-first runtime with no API, billing, or Worker setup.
