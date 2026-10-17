# Google discovery Worker

Google is an experimental, explicitly selected discovery provider. The live
portfolio keeps AllMenus/Photon and requires no Google setup. Select `?mode=google`
or `VITE_DISCOVERY_MODE=google` only for deliberate testing with a configured
public `VITE_RESTAURANT_PROXY_URL`. The Pages workflows force normal live mode.

In experimental Google mode, AllMenus independently enriches
verified venues with exact prices. This supersedes the previous optional /
historical adapter activation scheme. `VITE_RESTAURANT_PROVIDER` is no longer
needed; `VITE_RESTAURANT_PROXY_URL` is the public endpoint setting.

## Google Cloud prerequisites

1. Select a project with an active billing account.
2. Enable **Places API (New)** and **Geocoding API**.
3. Create a server API key restricted to these two APIs. Browser-referrer
   restrictions do not apply to Worker outbound requests.
4. Set API quotas and billing alerts appropriate to your deployment.
   Worker limits are per edge location, not a global spending cap.
5. Keep the key exclusively in the Worker secret prompt.

Official references: [Places setup](https://developers.google.com/maps/documentation/places/web-service/get-api-key),
[Geocoding setup](https://developers.google.com/maps/documentation/geocoding/get-api-key),
[Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search),
[field masks](https://developers.google.com/maps/documentation/places/web-service/choose-fields).

## Deploy the existing Worker

Use Node 24; on restrictive PowerShell installations use npm.cmd / npx.cmd.

```sh
cd So-What-We-Eating-Web/worker
npm ci
npx wrangler login
npm run build
npm run deploy
npx wrangler secret put GOOGLE_MAPS_API_KEY
```

The secret command prompts for the value. Never put it in Vite, GitHub Pages,
a public repository variable, command arguments, URLs, or chat.
Until the secret is set the Worker returns a configuration error.

The public URL is `https://<deployed-worker-host>/discover`.
`worker/wrangler.toml` already permits ryanscott.org, www.ryanscott.org,
and aseplayer.github.io. Add exact localhost origins when developing locally;
wildcards are not supported. Logging is disabled. The existing per-IP 12/min
and shared-edge 120/min bindings remain required. Namespace IDs must be unique
in the Cloudflare account. Google responses and errors use no-store, and
upstream payloads/secrets never reach logs or browser errors.

## Configure the frontend

In the portfolio repository's **Settings > Secrets and variables > Actions >
Variables**, set the public repository variable:

```text
VITE_RESTAURANT_PROXY_URL=https://<deployed-worker-host>/discover
```

Current Pages workflows deliberately select normal AllMenus/Photon live mode.
A future Google deployment must explicitly select mode=google and pass that
public endpoint into its Vite build; setting a repository variable alone does
not activate it.
For local use, copy `.env.example` to ignored `.env.local`, set the same
public URL, add the local origin to the Worker allowlist, and restart Vite.
Normal live mode does not need a provider selector. Missing configuration
shows a configuration message and never loads fictional restaurants.

## Reused implementation and Google fields

The original browser adapter, Worker request validation/CORS/rate limiting,
Geocoding client, Text Search pagination, normalization, directions links,
attribution, place-ID lookup and independent radius checks are reused.
The explicit field mask now adds only `addressComponents` for matching.
Other fields remain id, displayName, formattedAddress, location, types,
businessStatus, currentOpeningHours.openNow, rating, userRatingCount,
priceLevel, websiteUri, attributions and nextPageToken.
There are no photos, reviews, generative summaries or atmosphere fields.
Some existing metadata fields can trigger higher billing SKUs; consult
Google's [field table](https://developers.google.com/maps/documentation/places/web-service/data-fields).

Text queries use Google Geocoding, with US ZIP restrictions and otherwise a US
region bias. GPS and coordinate input skip that call. Partial matches are
assessed using structured locality/region or address evidence rather than
rejected automatically. Region-qualified spacing/punctuation corrections
resolve; unqualified localities, different plausible locations over 1km apart,
unverified ZIPs, and lost street numbers require clarification.
Returned labels are used in memory only.

Opening-hours UI/filtering remain suspended: the browser sends openNow=false.
Search uses at most two pages of 20, a bounding rectangle, and a final Haversine
circle filter in both Worker and browser. Nearby municipalities are eligible
when their actual venue coordinates fit the radius.

## Storage and attribution

Keep Google content transient. Persist Place IDs and user-owned choices, not
venue/geocode snapshots. Google Maps and supplied provider attributions appear
with venue details. AllMenus links/freshness appear separately with menu prices.
The API key exists only as the Worker secret. Keep
[Places policies](https://developers.google.com/maps/documentation/places/web-service/policies)
and [Geocoding policies](https://developers.google.com/maps/documentation/geocoding/policies)
in view when changing storage or display behavior.

## Live verification

```sh
# Supply the public URL as an environment variable before running:
npm run check:live
```

This uses real browser requests from the deployed portfolio origin (override
with `PRICING_TEST_URL` for another allowed frontend). It checks the requested
ZIP/city matrix, branch identity, independently reread item names/prices,
radius and cent arithmetic. A fixed Claremont browser coordinate tests the GPS
code path; actual device GPS still needs a manual check.

No configured endpoint means each Google case is explicitly recorded as
blocked. Source-only AllMenus verification does not qualify the milestone
as passing. See [the current report](HYBRID_VERIFICATION.md).
