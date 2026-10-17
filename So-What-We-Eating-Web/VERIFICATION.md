# CB02 verification

Verified locally using Node 24.16.0, npm 11.13.0, installed Google Chrome, and Wrangler 4.151.1. Real Google credentials and Cloudflare deployment were not used.

## Checks

- `npm run verify`: 23 domain/storage/provider/Worker tests, content validation, browser/Worker TypeScript check, Vite build, and production artifact checks.
- `npm run build` inside worker: Wrangler deploy **dry-run** succeeds with both rate-limit bindings. No deployment or paid request occurs.
- Domain tests retain party-wide cent/buffer/serving/template/reroll coverage across $10/$20/$35/$60/$100 and 1–8 diners.
- New tests cover supported radius conversion/expansion/max, polar/antimeridian math, hard circle filtering, open/closed/unknown states, a mocked 11:30 PM search-time scenario, geocoding failures/ambiguity/quotas/timeouts, bounded pagination, stable-ID deduplication, attribution normalization, CORS/size/version/rate/secret validation, live-without-menu, preserved reroll inputs, live-mode configuration failures, and privacy-safe history/migration.

## Browser acceptance

`npm run check:browser` builds a separate ignored artifact with a reserved test endpoint. Chrome uses the actual frontend and actual Worker handler; **only Google's upstream responses are mocked**. Normal dist/config is untouched. No credential-backed Google request is made.

Passed:

- Desktop and 375/390/430px layout, with no horizontal overflow; screenshots visually inspected.
- No automatic geolocation request. User-action success with controlled browser coordinates, and denial followed by typed input.
- Claremont, CA; 91711; Ontario, CA; Los Angeles, CA; Las Vegas, NV; 10001; and a street-address query all reach server-side geocoding in the mock.
- 2-mile and 30-mile requests, default Open Now, unknown-hours handling when disabled, saved radius/Open Now after refresh.
- No-result 5→10→20→30 expansion, stopping at the cap.
- Real-mode restaurant-only UI, required logo/provider credit, directions handoff, same-request restaurant reroll.
- Completed visit only after We ate here; Google display fields/coordinates absent from saved data; fresh detail lookup after reload.
- Friendly bad-location/service failures with no fixture substitution.
- Offline shell and honest live-connectivity message, worker replacement, scope isolation, portfolio repository subpath, and temporary storage fallback.
- Explicit demo mode loads fixtures with no Worker requests; order reroll still works.
- No page errors or unexpected console errors. Expected HTTP 422/503 from deliberate failure scenarios are excluded from the unexpected-error list.

Results and screenshots: ignored artifacts/cb02-browser-acceptance.json and artifacts/cb02-*.png. The acceptance server/browser close after completion.

## Not verified

No deployed Worker, real Google API key/billing/quota/CORS configuration, actual nationwide results, or live late-night availability has been exercised. Browser coordinates and upstream opening states were controlled test inputs. Physical iOS/Android installation and a full screen-reader audit remain manual checks. Straight-line radius is not drive time. Menu coverage for real places remains absent by design.

Follow [activation instructions](docs/LIVE_PROVIDERS.md), then perform the small credential-backed acceptance check before claiming real live availability.
