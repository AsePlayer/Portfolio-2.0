# Live discovery: implementation and activation

CB02 implements the frontend and Cloudflare Worker. Actual Google service activation needs the account configuration below. No Worker has been deployed and no Google credential has been supplied by this implementation. Without a configured endpoint, production stays in live mode and reports setup unavailable; it never substitutes fictional restaurants.

## What runs where

`src/providers/GooglePlacesProvider.ts` sends normalized requests to **one `POST /discover` endpoint**. `worker/src/` owns geocoding, Google requests, validation, limits, and normalization. No server secret enters Vite. The recommendation engine receives our Restaurant model, independently of the discovery service. CB02's live MenuProvider returns null; no nationwide menu acquisition is attempted.

The Worker uses current **Text Search (New)** with `includedType: restaurant`, strict type filtering, `openNow`, a bounding rectangle, and a final Haversine circle filter. It requests at most **two pages of 20**, deduplicating place IDs. This is a useful candidate sample, not every restaurant nearby. Nearby Search (New) was reviewed; Text Search was selected for its Open Now and pagination support. Google documents those options and rectangle semantics in the [current Text Search guide](https://developers.google.com/maps/documentation/places/web-service/text-search).

Requested fields cover ID, display name, address, coordinates, types, business status, current open state, rating/count, price level, website, and provider attributions, plus a page token. The explicit mask avoids photos, reviews, and atmosphere fields. Some selected fields incur Enterprise-tier charges; consult the linked current field/SKU tables rather than assuming requests are free.

Typed queries use the documented [Geocoding API JSON endpoint](https://developers.google.com/maps/documentation/geocoding/requests-geocoding), separately from Places. US five-digit ZIPs use a US postal component restriction; ordinary queries use a US region bias, not a country restriction. Full international addresses remain supported. Missing results, partial matches, and widely separated multiple matches produce clean location/ambiguity errors. Browser coordinates skip geocoding entirely. Geocoding's v3 JSON endpoint is separate from the deprecated Legacy Places service; this code uses no Legacy Places APIs.

## Exact activation steps

### 1. Google Cloud

1. Create/select a Google Cloud project and link an active billing account.
2. Enable **Places API (New)** and **Geocoding API** in APIs & Services → Library.
3. Create an API key. Under API restrictions, restrict it to those two services. This is a server key; do not apply browser-referrer restrictions to Worker requests.
4. Configure Google API request quotas and billing alerts appropriate to your intended use. Worker edge rate limiting bounds traffic but is not a global billing cap.
5. Keep the key for the Worker secret prompt. Do not paste it into frontend files, GitHub variables, URLs, or chat.

See [Google's Places setup](https://developers.google.com/maps/documentation/places/web-service/get-api-key) and [Geocoding setup](https://developers.google.com/maps/documentation/geocoding/get-api-key) for project/key prerequisites. Standard Worker outbound addresses are not a dedicated static egress address; IP restrictions would need a separately configured suitable egress arrangement.

### 2. Cloudflare Worker

From this app folder, using Node 24 (`npm.cmd` / `npx.cmd` on restrictive PowerShell installations):

```sh
cd worker
npm ci
npx wrangler login
npm run build
npm run deploy
npx wrangler secret put GOOGLE_MAPS_API_KEY
```

The secret command prompts for the key. Do not pass its value as a command argument. It configures a server-side secret named **`GOOGLE_MAPS_API_KEY`**. The deployment before the secret is set returns a configuration error, not sample results. The secret command deploys the updated secret configuration; if prompted, confirm the named Worker created by the deployment.

Use the deployed hostname Wrangler prints, typically `https://so-what-we-eating-discovery.<your-subdomain>.workers.dev`. The frontend needs its full **`/discover`** URL. No account ID or token is committed. Wrangler's manual login uses your Cloudflare account; automated deployment would need separately configured deployment authorization.

`wrangler.toml` already allows the portfolio origins and AsePlayer's Pages origin. For another frontend, add its exact scheme/host/port to `ALLOWED_ORIGINS`, then redeploy. Do not use a wildcard. Its rate-limit namespace IDs must be unique to these bindings in your Cloudflare account; adjust them if you already assigned those IDs elsewhere.

The Worker has per-IP (12/minute) and shared edge (120/minute) rate-limit bindings. These are applied per Cloudflare location, not globally. Request/application logging is disabled and the code logs no locations or upstream responses. CORS is an allowlist, not authentication against arbitrary nonbrowser clients. Google-side quotas remain part of the configuration.

### 3. Configure and rebuild the portfolio

In **AsePlayer/Portfolio-2.0 → Settings → Secrets and variables → Actions → Variables**, create the repository variable:

```text
VITE_RESTAURANT_PROXY_URL=https://<your-worker-hostname>/discover
```

This is a **public URL**, not a secret. The portfolio workflow now passes that variable to the app build and forces `VITE_DISCOVERY_MODE=live`. Run **Deploy to GitHub Pages → Run workflow → main** (or push an app change). No further code edit is required.

For local use, copy `.env.example` to ignored `.env.local`, set the same public URL, and restart Vite. Add the local preview origin to the Worker's allowlist when deliberately testing against it. For a local Worker, `wrangler dev` can use an ignored `worker/.dev.vars` with the server key; override/add `http://127.0.0.1:5173` in the local allowlist. Never put the key in any `VITE_*` value.

### 4. Verify real activation

Open `https://ryanscott.org/projects/what-we-eating/` and try a typed city/ZIP, then Use my location, 2 and 30 miles, and Open Now. Check directions and website actions. If setup or quotas fail, the app must show the live error. This real credential-backed check has not been run in CB02.

A request can also be made to the deployed endpoint with a permitted `Origin: https://ryanscott.org`, JSON Content-Type, and one of the following bodies. No Google secret is needed by the frontend caller.

## Contract v2

Coordinate discovery:

```json
{"schemaVersion":2,"location":{"latitude":34.1,"longitude":-117.7},"radiusMeters":8047,"openNow":true}
```

Typed-location discovery:

```json
{"schemaVersion":2,"locationQuery":"Claremont, CA","radiusMeters":8047,"openNow":true}
```

Successful response contains `schemaVersion: 2`, a transient resolved `origin`, `searchedAt`, `partial`, and normalized `restaurants`. An empty array is valid. `partial` means a later page failed after useful candidates were already obtained. Google IDs normalize to `id: "google:<id>"`, `source: "google-places"`, and `sourceId: "<id>"`. The browser independently validates, deduplicates, recomputes distances, and applies radius/open-state guards.

History refresh uses the **same endpoint**, with a disjoint request:

```json
{"schemaVersion":2,"placeIds":["saved-place-id"]}
```

At most three IDs are accepted, using Place Details (New). The UI requests only one saved restaurant after an explicit refresh action; it does not automatically reload 200 saved places.

Errors use `{schemaVersion:2,error:{code}}`; allowed codes are configuration, invalid, location, ambiguous, quota, timeout, unavailable. Human messages come from the frontend's own dictionary. Raw Google exceptions, key values, and upstream payloads never become UI messages.

The server accepts only POST/OPTIONS on /discover, valid v2 requests, supported 2/5/10/20/30-mile values, valid coordinates, short queries, and bodies up to 2 KiB. It has an 18-second upstream deadline; the browser allows 22 seconds. There is no automatic retry, radius expansion, catalog scraping, or live-to-fixture fallback.

## Attribution, history, and privacy

The application displays the unmodified official Google Maps attribution asset beside Google-derived content, with returned third-party provider credits. Public `privacy.html` and `terms.html` are linked from the app. Live names, addresses, ratings, hours, coordinates, website links, and attribution records are memory-only; neither browser storage nor the service worker stores them. Responses and requests use no-store. Google place IDs and the user's own actions/preferences are durable; history details are refreshed on request.

The existing storage key is retained for migration; payload schema v2 whitelists fields and strips any legacy Google snapshots or saved location labels. Original fictional menu/history content remains separate. These choices follow the current [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) and [Geocoding policies](https://developers.google.com/maps/documentation/geocoding/policies). The operator should keep these disclosures and provider settings aligned with future changes.

## Explicit fixture development

Use `?mode=demo` (or deliberately set `VITE_DISCOVERY_MODE=demo` locally). The banner and fixture notices identify it. Only that explicit path loads the sample catalog and its small demo geography. `?mode=live` returns to normal mode. Failed or unconfigured production discovery never selects this mode on its own.
