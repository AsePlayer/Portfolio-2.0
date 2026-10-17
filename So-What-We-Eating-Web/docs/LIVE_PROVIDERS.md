# Live discovery and menu enrichment

The default live runtime is **GooglePlacesProvider + AllMenusMenuResolver**.
Google determines which physical restaurants are inside the requested circle;
AllMenus supplies exact listed item prices only for a verified branch.
AllMenus coverage never determines the restaurant search universe.

## Setup

Set the public `VITE_RESTAURANT_PROXY_URL=https://<worker-host>/discover`
at build time. The Google API key stays exclusively in the Worker secret
`GOOGLE_MAPS_API_KEY`. Both portfolio and standalone Pages workflows pass the
repository variable to Vite. See [Google setup](GOOGLE_PROVIDER.md).
Missing setup produces a real configuration message.

Text queries, ZIPs and full addresses go through Google Geocoding in the Worker.
Browser GPS and entered coordinates go directly to Places without geocoding.
Corrected region-qualified city names, including Diamondbar, CA, can be accepted;
unqualified localities such as Springfield and separated alternatives require
clarification. A transient resolved label confirms the interpretation.

## Calls in one recommendation

1. Browser -> one Worker POST.
2. Worker -> one geocode request for text; none for GPS/coordinates.
3. Worker -> up to two Google Text Search requests / 40 upstream places.
4. For each promising candidate, browser -> its AllMenus city index if uncached.
5. Only a unique strong branch match earns a menu-page request.
6. After rechecking that page's identity and coordinates, existing MealBuilder
   either returns an affordable receipt or selection tries another candidate.

The first suitable complete meal wins. At most 24 candidates are tried and new
attempts stop after 25 seconds (an in-flight city/menu request can finish later).
A Google search is a bounded sample, not a complete nearby restaurant inventory.

Different order makes no network calls. Different restaurant reuses the active
five-minute Google context and the 15-minute AllMenus caches. Indexes and
resolutions are bounded to 64 entries each, deduplicate concurrent loads, and
disappear on reload. Only actual candidate localities load lazily. Failures are
not cached as coverage misses; 429 pauses requests for at least one minute,
honoring longer Retry-After values.

## Trust boundaries

Normalized name + house number + street + locality/state are required.
ZIP, units and coordinates must not contradict the match. More than one
plausible listing is ambiguous. Menu-page heading/address are rechecked
independently, and published coordinates over 300m from Google reject.
No fuzzy name-only joins, chain branch substitutions, or address geocoding via
Photon occur in the production path.

The conservative parser rejects ranges, from/plus/market prices, ambiguous
multiple amounts, conflicting duplicates, configurable build-your-own meals,
and special-restriction categories. No AI infers identity, price, quantities,
tax or tip. Google price levels never substitute for actual menu prices.

## Honest results and limitations

No Google candidates: report no restaurants within that radius/location.
Nearby venues but no verified menu: explain that priced menus could not be
verified. Verified menus without an affordable complete order: explain the
budget failure. Service outages and quotas produce retry messages.

AllMenus currently limits price enrichment to US city indexes with usable
public pages. Normalized names and municipal labels can differ legitimately;
conservative matching intentionally misses those instead of guessing.
Missing house numbers or localities, suite conflicts, moved venues, outdated
listings, Brooklyn/New York naming differences, inaccessible source pages,
and menus without usable meal anchors can all prevent a recommendation.
Markup, CORS, quotas and published prices can change.

The free OpenStreetMap/Photon adapters and original AllMenus provider remain
available as code. They are neither live defaults nor silent fallbacks.
Explicit `?mode=demo` remains the only fictional-data route.

[Architecture](../ARCHITECTURE.md) -> [verification](HYBRID_VERIFICATION.md)
