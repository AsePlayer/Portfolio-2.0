# Privacy implementation

The served policy is [public/privacy.html](public/privacy.html), linked with [terms](public/terms.html) from the app.

The default free provider sends typed queries to Photon and restaurant-search coordinates/radius to Overpass only on action. During an Overpass outage, coordinates/radius may also go to Photon’s restaurant index. Provider responses and resolved locations have a short, bounded, in-memory cache to reduce public-service load. They disappear on reload. Public service operators receive network requests, including IP addresses, under their policies.

Exact user coordinates and typed queries never enter persistent storage. History saves live provider IDs, party size, actions, and time; live names, addresses, ratings, and coordinates are not retained. The existing payload-v2 migration strips old Google snapshots and saved location labels. Fictional demo snapshots remain separate. The service worker caches only app-owned shell assets and the explicit demo; external API traffic is outside its scope.

Google/Cloudflare processing applies only when the operator deliberately selects the optional Google provider. Its Worker logs no application/location payloads and its Google responses are memory-only. No key or billing setup is needed for the default.

See [provider details and official policy links](docs/LIVE_PROVIDERS.md).

Opening-hours controls/statuses are currently removed. Migration discards the old `openNow` setting without clearing other preferences or visit history.
