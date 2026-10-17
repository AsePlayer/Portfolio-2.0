# Live menu and price provider

The default follows the original app’s **AllMenus menu-first flow**. Normal use and GitHub Pages need **no API key, billing account, environment configuration, or backend deployment**.

## Search to receipt

1. [Photon](https://github.com/komoot/photon) resolves a typed location or reverse-geocodes optional browser coordinates into a US city and state.
2. The browser reads that city’s public [AllMenus](https://www.allmenus.com/) listing directly over HTTPS/CORS.
3. The engine selects a weighted candidate and reads its menu. The parser takes named items with one exact USD price, normalizes categories/roles, and validates the result.
4. Venue map coordinates, or full-address geocoding, must place it inside the selected circle.
5. MealBuilder reserves the chosen buffer and builds a complete order for the party. If a menu has no usable prices or cannot fit, the next restaurant is tried.
6. Success always contains named items, quantities, prices, food subtotal, buffer, planned total, budget, and remaining money. The source menu is linked.

No ratings, menu prices, serving counts, or opening states are fabricated. A restaurant without a priced order is never the successful result. Opening-hours functionality remains suspended.

## Bounded requests and caching

Requests happen on action, sequentially, with a 10-second request timeout. Selection stops at the first affordable order or at 24 menus / a 25-second selection deadline. An in-flight request may finish after the deadline. Parsed responses reuse a bounded 15-minute in-memory cache, up to 64 entries; the cache disappears on reload. Same-restaurant rerolls do not fetch again.

Rate-limit responses start a cooldown of at least a minute. There is no automated city crawl, background refresh, proxy bypass, server rotation, or build-time menu download. Public services and page markup can change or be unavailable.

## Coverage and price meaning

The live source covers listed US cities and venues, not every restaurant or country. City-level listings can miss nearby venues across a municipal boundary. Radius expansion is explicit and cannot invent source coverage. Unsupported locations, missing menus, and budgets that cannot fit produce clear errors.

Prices are **the exact numbers listed on the retrieved menu**, not verified current checkout quotes. Ranges, “from” prices, modifiers/add-ons, conflicting duplicates, limited-time categories, and customizable build-your-own offers are excluded. Restaurant prices, availability, tax, and tips can differ. Retrieval time does not establish the source menu’s freshness.

## Privacy and modes

Photon receives typed queries or user-supplied coordinates; AllMenus receives city/menu page requests. Operators receive normal network-request data such as IP addresses. Source HTML and exact user locations are not saved. We ate here saves selected restaurant/item names, unit prices, planned total, party size, and time locally. See the public privacy page.

`VITE_PHOTON_URL` can select a compatible HTTPS/CORS geocoder. No variable is needed for normal use. Legacy Google/Worker and OSM adapters remain isolated source references; they are not active runtime options or fallbacks. Explicit `?mode=demo` loads original fictional sample data with visible notices and never substitutes for failed live searches.
