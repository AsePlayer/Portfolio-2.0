# Future live restaurant discovery

CB01 always composes fixture providers. Nothing calls Google, deploys a serverless service, requires a secret, or activates when an environment variable is set. `GooglePlacesProvider.ts` is a **tested, mockable client for our proposed normalized proxy contract**; it is not a deployed proxy or a complete live Places integration. Location parsing remains demo-specific until a real geocoder is added.

## Intended boundary

```text
GitHub Pages browser
   → HTTPS serverless endpoint (e.g. a future Cloudflare Worker)
   → discovery service
   → normalized restaurants

Independent permissioned menu catalog → MenuProvider
```

The future endpoint owns upstream credentials, Google-to-domain normalization, field selection, CORS, request/radius limits, timeout handling, quotas, and source-appropriate retention. It must not return raw upstream errors, credentials, or excess upstream fields. Keep exact coordinates out of ordinary access logs. Browser geolocation is requested only after a user action. Typed ZIP/city geocoding must be a separate LocationService implementation, with the same privacy boundary. None of these server operations is implemented or deployed in CB01.

## Mockable contract

`POST <configured HTTPS endpoint>` with JSON:

```json
{"schemaVersion":1,"location":{"latitude":34.1478,"longitude":-118.1445},"radiusMeters":20000}
```

Response:

```json
{
  "schemaVersion":1,
  "restaurants":[
    {
      "id":"google:stable-place-id",
      "name":"Restaurant name",
      "cuisines":["Thai"],
      "source":"google-places",
      "sourceId":"stable-place-id"
    }
  ]
}
```

The response can contain other optional Restaurant fields; URLs must be HTTP(S), coordinates and numeric fields must be finite. `restaurants: []` is valid. Non-2xx, unsupported versions, and malformed data become a friendly provider failure. The adapter sends no cookies, has a 10-second timeout, and accepts only HTTPS (HTTP is allowed for loopback development). A real proxy must validate requests independently; CORS alone is not an abuse control.

The proposed response must be extended to preserve/render any required provider attributions before production activation. The current simplified schema does not claim to satisfy Google's complete display policy. Live menus remain a separate system; discovery metadata must not be treated as complete item-level pricing.

## Credentials and activation work

For a future Google implementation, configure a Google Cloud project with billing and **Places API (New)** enabled, then create a restricted API key. Store it only in the serverless platform's secret store under our chosen name **`GOOGLE_PLACES_API_KEY`**. This is an application configuration name, not a Google-prescribed variable. Google documents project/billing/API/key prerequisites and restrictions in [Places setup](https://developers.google.com/maps/documentation/places/web-service/get-api-key). Nearby Search supports response field selection; choose the minimum necessary fields and handle associated quotas/costs using the [official Nearby Search guide](https://developers.google.com/maps/documentation/places/web-service/nearby-search).

If the future geocoder uses Google's Geocoding API, enable that service too and store a separately restricted server-side key under our chosen name **`GOOGLE_GEOCODING_API_KEY`**. An alternate geocoder may need different credentials. See [Google's Geocoding setup](https://developers.google.com/maps/documentation/geocoding/get-api-key). A serverless hosting account and its deployment authorization will also be needed at that stage; there is no hosting token in this project.

The browser may receive only the **public endpoint URL**, for example `VITE_RESTAURANT_PROXY_URL`. Every `VITE_` variable is public build output, so never place a secret there. `.env.example` documents this boundary. Activation requires deliberately replacing the fixture composition in `src/main.ts`, implementing production geocoding, removing/replacing demo-only presentation, and completing provider-specific display and retention behavior. The engine and view contracts can remain stable.

Before activating Google data, implement its required attribution, public terms/privacy disclosures, and permitted storage/retention rules. The fixture history currently stores restaurant-name/cuisine snapshots and must be reviewed for real upstream data; it must not silently become an unlimited Google-content cache. Current [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) constrain caching and require clear attribution. Keep these rules independent of the original, separately permissioned menu catalog. No paid service should be activated as a side effect of running this demo.
