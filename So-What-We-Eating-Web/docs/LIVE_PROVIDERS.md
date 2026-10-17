# Live providers

The portfolio's normal live runtime is **AllMenusProvider + Photon**.
AllMenus supplies restaurant listings and exact listed menu prices. Photon
resolves the user's chosen location. No API key, billing account or Worker is
required. This preserves the working product for the party-variety release.

Browser GPS is requested only on click. Typed US city/ZIP/address input or
chosen coordinates resolve through Photon to the needed AllMenus city listing.
Promising candidates are tried sequentially. Menu pages supply precise venue
coordinates and exact prices; final recommendations must fit the selected
straight-line radius and shared party budget.

The conservative price parser still rejects ranges, from/plus/market prices,
conflicting duplicates, ambiguous option pricing and configurable offers.
No menu item, price, tax, tip or serving count is invented.

MealBuilder uses 100 bounded party simulations, reserves enough food budget
for all remaining diners, encourages different mains and aggregates real
duplicates. Shared anchors require explicit serving metadata. Optional extras
are considered only after every diner has an anchor.

Different order uses the loaded menu with no external requests. Different
restaurant reuses the active candidate context where practical. Parsed source
pages use a bounded 15-minute memory cache. No background crawling occurs.

AllMenus coverage and source markup/CORS can limit success. Missing menus or
unaffordable parties never substitute demo results. Explicit ?mode=demo is the
only fictional route. Optional VITE_PHOTON_URL selects a compatible HTTPS
Photon endpoint; normal operation needs no environment file.

## Retained experimental Google mode

The earlier Google discovery/resolver architecture remains available only by
explicit ?mode=google or VITE_DISCOVERY_MODE=google, with a configured public
VITE_RESTAURANT_PROXY_URL. Its server key stays in the Worker secret. Normal
Pages builds force VITE_DISCOVERY_MODE=live and therefore use AllMenus/Photon.
There is no automatic switch to Google, or fallback from a failed Google mode.
See [experimental setup](GOOGLE_PROVIDER.md) and its [uncertified verification
record](HYBRID_VERIFICATION.md).

[Party release and UI verification](PARTY_VARIETY.md)
