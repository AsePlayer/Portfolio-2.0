# Free live discovery

The default is **OpenStreetMap**. Normal local use and the portfolio need **no API keys, billing account, environment configuration, Cloudflare account, or server deployment**.

## Data flow

1. Browser/manual coordinates skip geocoding. Typed cities, ZIPs, and addresses use [Photon](https://github.com/komoot/photon) only when Feed me is pressed. US five-digit ZIP queries are country-restricted.
2. [Private.coffee’s Overpass service](https://overpass.private.coffee/) supplies named restaurant, fast-food, cafe, and food-court nodes/ways/relations in the requested circle, capped at 200 records.
3. On an Overpass network/server failure, Photon's reverse-search index can provide up to 50 real nearby OpenStreetMap venues. Quota responses are never bypassed; an Overpass outage starts a one-minute cooldown.
4. Normalize stable `osm:<type>/<id>` IDs, coordinates or centers, address/cuisine/website/menu tags, and attribution. Independent Haversine filtering enforces the chosen radius.
5. The engine filters by radius, user preferences, and available budget/menu information, then picks one restaurant. Real menu coverage remains a separate concern.

## Opening hours are suspended

The current product has **no Open now setting, open/closed status, Hours unknown label, or opening-hours filter**. Existing saved `openNow` preferences are discarded during storage migration. The free provider does not parse schedules or prioritize hours-tagged records; the former parser and timezone package have been removed. A normal search returns usable real venues even when schedules are missing. Restoring this feature requires evidence of reliable coverage and behavior first.

The optional Google browser adapter explicitly sends `openNow: false` for compatibility with the existing Worker v2 contract. The Worker retains its opt-in legacy contract for compatibility, but the application never enables it. Known non-operating businesses can still be rejected by Google's business-status data.

## Shared service limits

Photon welcomes reasonable project use, may throttle extensive use, and provides no availability guarantee. Private.coffee welcomes project use without registration, asks users to optimize queries and avoid concurrent/disruptive usage, requires OSM attribution, and asks for contact before large-scale use. Read the linked operators' policies before scaling.

Requests are user-triggered, with no autocomplete, background harvesting, or city crawl. Queries have a 20-second server timeout and 32 MiB server memory limit; browser timeout is 25 seconds. Identical successful requests reuse a five-minute in-memory cache (up to 12 entries), so rerolls do not query the services again. Rate-limit responses start a cooldown of at least one minute. The app does not automatically retry or rotate Overpass servers. Results are a sample, not every nearby venue.

Optional `VITE_OVERPASS_URL` and `VITE_PHOTON_URL` can select compatible HTTPS/CORS-enabled services. Default use needs no setup. The app does not use public Nominatim.

## Attribution and privacy

OSM content displays **© OpenStreetMap contributors · ODbL** linked to [copyright/licensing](https://www.openstreetmap.org/copyright). No ratings, price levels, menus, or opening states are fabricated. Names and display details remain transient. Live completed visits retain provider IDs and the user's party size/actions/time.

Photon receives typed queries and, during Overpass outages, search coordinates/radius. Overpass receives coordinates/radius. Operators receive network requests under their policies. User coordinates and typed addresses never enter persistent browser settings; cross-origin discovery is outside the service worker's shell cache. Public privacy/terms pages describe these boundaries.

## Optional modes

`VITE_RESTAURANT_PROVIDER` defaults to `openstreetmap`. Google requires explicit `google-places` plus a Worker URL; see [optional setup](GOOGLE_PROVIDER.md). A leftover Worker URL does not enable Google, and errors never enable a paid fallback.

Explicit `?mode=demo` loads original fictional test data, with visible demo notices. Ordinary visitors get real discovery; demo geography never substitutes for a failed search.
