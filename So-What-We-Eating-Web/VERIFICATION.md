# CB01 verification

Executed locally with Node **24.16.0**, npm **11.13.0**, and installed headless Google Chrome. No remote deployment or real restaurant API was used.

## Automated checks actually run

- `npm run dev -- --port 5173 --strictPort`: Vite started successfully and its HTML returned **HTTP 200**. The owned development server was stopped after verification.
- `npm run verify`: **14 tests passed**, catalog validation, TypeScript check, Vite production build, asset/manifest/icon/subpath verification.
- Meal tests enumerate all fixture templates for **$10/$20/$35/$60/$100** and **1–8 people**: food allowance, full buffer, party servings, safe cents, no unrelated entrées, no combo accompaniment duplication.
- Other domain checks: reroll alternatives, no immediate restaurant repeat, fixed request on order reroll, closed/excluded/avoided/far/over-budget eligibility, missing/malformed/failed menus, recent rejection expiry/favorites, invalid catalog rejection, manual import inference/overrides, location parsing, proxy request/response validation.
- Storage checks: interaction signals never create completed meals, acceptance idempotency, refresh persistence, origin-path namespace separation, no coordinate persistence, preferences/settings, denied/full/malformed storage fallback.
- `npm run check:browser`: desktop and **375/390/430 px** viewport acceptance, screenshots, form/error flow, both rerolls, menu/directions dialogs, favorites, We ate here/history after refresh, saved settings, keyboard skip link, no-menu restaurant-only result, no horizontal overflow, offline reopen and new recommendation, worker update and old-cache cleanup, host-root scope isolation, a portfolio app subpath, denied geolocation, unavailable browser storage. **No page or console errors captured.**

Browser verification serves the built artifact under `/So-What-We-Eating-Web/` and `/projects/what-we-eating/`. It changes only the served worker version to simulate an update, not the project source or built worker file. A deterministic random function makes UI assertions repeatable. Normal runtime still uses native randomness. The test closes its browser and HTTP server after completion.

Screenshots and machine-readable results are generated into ignored `artifacts/`; run the command again to reproduce them. Desktop feed/result and 375px feed screenshots were visually inspected.

## Limits of these checks

Viewport checks are Chrome emulation, not physical phones. Manifest/icon/install prerequisites and service-worker lifecycle passed, but actual Add to Home Screen/install prompts on iOS/Android were not exercised. GitHub Pages Actions and public hosting were prepared, not run. There is no live discovery, geocoding endpoint, source acquisition job, dietary validation, or external provider attribution implementation. The future proxy client was tested against a mock only. Full assistive-technology auditing and iframe behavior were not performed.

## Portfolio integration follow-up

The app was built and synced into `projects/what-we-eating/`, with an owned-directory marker and a Portfolio return link. The portfolio's 20 existing tests, content build, and artifact validation passed. Chrome checked the four-card project grid at 1440 px (four columns), 800 px (two), and 390/375 px (one), in light and dark themes. The integrated card opened the app, generated an order, registered its worker only under the app path, and returned to `/#projects`. Project links remained available with JavaScript disabled. No page or console errors were captured. Temporary screenshots/results were stored under the portfolio's ignored `.tmp/portfolio-qa/`.

## Next bounded CB

**CB02: activate one real discovery provider in one area.** Implement and deploy a small explicitly authorized serverless proxy, production ZIP/city geocoding, attribution/privacy/retention handling, quotas, and a narrow live acceptance check. Keep restaurant-only fallback working before adding a separate permissioned menu source. Portfolio card/sync integration can then be a small independent change.
