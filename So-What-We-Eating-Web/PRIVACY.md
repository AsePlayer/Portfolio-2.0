# Privacy implementation

Browser location is requested only on action. Photon receives typed locations or optional coordinates to resolve a US city. The browser then requests city listings and candidate menu pages directly from AllMenus, with credentials omitted. Operators receive ordinary network request data, including IP addresses.

Parsed responses have a bounded 15-minute in-memory cache; no raw menu HTML is stored. Exact user coordinates and typed searches never enter persistent settings or history. The provider retains only the current search’s origin mapping in memory.

We ate here saves the chosen AllMenus restaurant name/ID, selected item names and unit prices, planned total, party size, and time locally. Preferences, favorites, exclusions, and a limited interaction history also stay on this browser. Legacy Google/OSM visits retain IDs and user actions only. The payload-v2 migration strips saved user-location labels, old Google snapshots, and obsolete hours toggles.

The service worker caches app-owned shell assets and the original explicit-demo catalog. External geocoding and menu requests never enter its caches. There is no account, analytics, server-side history, or cloud sync. No Google/Cloudflare discovery integration is active.

Public disclosures are in `public/privacy.html` and `public/terms.html`, linked from About. Clear my local data removes this app’s records; browser site-data controls also remove the installed shell.
