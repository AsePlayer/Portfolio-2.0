# Free live discovery

The default is **OpenStreetMap**, not Google. Normal local use and the portfolio require **no API keys, billing account, environment configuration, Cloudflare account, or server deployment**. The browser talks directly to public open-data services over HTTPS.

## Data flow

1. Browser GPS/manual coordinates skip geocoding. Typed cities, ZIPs, and addresses use [Photon](https://github.com/komoot/photon) only when Feed me is pressed. Five-digit ZIP queries are restricted to the US.
2. [Private.coffee’s Overpass instance](https://overpass.private.coffee/) supplies named restaurant, fast-food, cafe, and food-court nodes/ways/relations in the requested circle.
3. On an Overpass network/server failure, use Photon’s bounded reverse-search restaurant index (at most 50 nearby candidates). This is still real OpenStreetMap data. Missing hours remain unknown and require the explicit include-unknown action. A quota response is never bypassed. An Overpass failure starts a one-minute cooldown so rerolls do not repeatedly hit a failing service.
4. Normalize stable `osm:node/123`, `osm:way/123`, or `osm:relation/123` IDs, coordinates/centers, address/cuisine/website/menu tags, and source attribution. Haversine filtering independently enforces the chosen radius.
5. Evaluate supported weekly hours in the venue's estimated time zone. Open now requires an affirmative scheduled-open state; unknown never means open. Conditional, holiday, solar, and seasonal syntax is deliberately unknown. Simple daily/weekday schedules, splits, overnight intervals, closures, and 24/7 are supported. The small CC0 [timezone lookup](https://github.com/photostructure/tz-lookup) runs locally; its geographic approximation can be wrong near boundaries.
6. The existing engine filters/scores and picks one place. Detailed menus remain a separate provider. Website and OpenStreetMap directions handoffs need no credentials.

## Public service limits

Photon explicitly welcomes reasonable project usage, may throttle extensive use, and provides no availability guarantee. Private.coffee welcomes project use without registration and asks users to optimize queries, avoid concurrent/disruptive requests, credit OpenStreetMap, and contact the operator before large-scale usage. It provides no uptime guarantee. Read the linked operators' policies before scaling. This small portfolio implementation makes only user-triggered, bounded searches, not a city crawl or background harvesting.

Queries have a 20-second server timeout and 32 MiB server memory limit, requesting at most 100 records with hours plus 100 general records before deduplication. Results are a sample, not a complete inventory. The browser times out after 25 seconds, reuses identical requests for five minutes in memory (up to 12 entries), and honors a rate-limit cooldown of at least one minute. It does not automatically retry Overpass or rotate Overpass servers. Network/server outages may use Photon’s separate index, while rate-limit responses remain errors. Rerolls use the same cached pool, with opening state recalculated at search time. Typed queries and cached restaurant details disappear on reload. No autocomplete, tracking, or persistent location cache is added.

Endpoints can be replaced with compatible public or self-hosted services via optional `VITE_OVERPASS_URL` and `VITE_PHOTON_URL`. HTTPS and browser CORS support are required. This is an escape hatch, not required setup for normal use. The code does not use the public Nominatim API.

## Attribution and privacy

OpenStreetMap-derived content displays **© OpenStreetMap contributors · ODbL**, linked to [copyright and database licensing](https://www.openstreetmap.org/copyright). No upstream ratings, price levels, or opening status are fabricated. Restaurant names/details are transient. Completed visits persist the source ID, party size, time, and user actions, and refresh one saved place on explicit action.

Photon receives typed queries and the user's network request; Overpass receives the search coordinates/radius and the user's network request. These external services process requests under their own policies. GPS coordinates and typed addresses are never saved in preferences. The PWA caches only the built application shell and explicit demo, never cross-origin discovery data. Public privacy/terms pages describe these boundaries.

## Optional providers

`VITE_RESTAURANT_PROVIDER` defaults to `openstreetmap`. A leftover `VITE_RESTAURANT_PROXY_URL` does not change this. Google requires explicit `VITE_RESTAURANT_PROVIDER=google-places` plus the Worker URL; its separate [setup guide](GOOGLE_PROVIDER.md) documents account/billing requirements. It is never an automatic paid fallback.

Explicit `?mode=demo` uses the original fictional test catalog, with visible demo notices. `?mode=live` returns to the configured real provider. An outage never enables Google or fake data.
