# Privacy implementation

The publicly served policy is [public/privacy.html](public/privacy.html), linked with the public [terms](public/terms.html) from the app. It describes location forwarding, local preferences/IDs/actions, transient Google display data, provider processing, and clear-data controls.

Browser/manual coordinates and typed addresses are memory-only and sent only when searching through the active discovery provider. The Worker logs no application/location payloads. Responses are no-store and the PWA never caches discovery POSTs. Google-backed history persists place IDs and the user's own visit state rather than Google content snapshots; payload-v2 migration removes old snapshots and saved location labels. Original fictional data remains separate.

See [docs/LIVE_PROVIDERS.md](docs/LIVE_PROVIDERS.md) for provider-policy sources and exact deployment settings. Provider accounts, logging settings, policies, and disclosures must stay aligned when activation or future behavior changes.
