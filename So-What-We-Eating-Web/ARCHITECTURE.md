# Architecture

## Data flow and boundaries

```text
typed location / browser geolocation
                  ↓
views → App controller → RecommendationEngine
                            ↓
                 RestaurantProvider.searchNearby
                            ↓
                 normalized Restaurant[]
                            ↓
                   MenuProvider.getMenu
                            ↓
          normalized Menu | null + local learning context
                            ↓
             eligibility → meal templates → weighted pick
                            ↓
                  one MealRecommendation → view
```

`src/main.ts` is the composition root: it injects providers, a location service, and a database. UI code imports no fixture provider, scraper, fetch client, or catalog loader. Sample-data presentation is controlled by the normalized `isDemo` data flag. Recommendation modules use only interfaces, domain models, and an injected random function. Importers never run in the browser or control rendering.

## Domain and budget

Restaurant discovery and priced menus have separate interfaces. A restaurant without a menu is valid. `MenuItem.role` is explicit; manual roles override importer inference. `serves` represents shared entrée capacity, not an assumption based on the item's name. All prices are USD in schema v1. Catalog validation rejects non-finite, zero, negative, sub-cent, and unsafe-cent prices.

`Budget.ts` converts dollars to cents and reserves `ceil(total budget cents × buffer percent)` before any order is built. A $35 budget at 20% leaves $28 for food and reserves $7. The displayed planned total is food subtotal plus the **full reserved allowance**, which can be higher than actual incidental costs. It is always at or below the party budget. A budget does not become per-person when party size changes. Dining mode is part of the request; the demo does not infer different tax/tip rules from it.

## Restaurant choice

`RestaurantPicker` excludes closed, distant, explicitly excluded, avoided-cuisine, and immediately rejected restaurants. Known menus must yield a complete affordable meal. Missing/failed/malformed menus use a conservative price-level screen ($6/$14/$25/$40 per main); that is an eligibility estimate, never a promise or a total shown to the user. Unknown hours are allowed and displayed as unknown.

`RecommendationScorer` starts at 6, adds modest rating and menu bonuses, favorites (+3), cuisine likes (+2), and an adventure adjustment. It subtracts distance (up to 3), completed meals in the last seven days (3 each), and restaurant rejections in the last two days (2 each). A floor of 0.25 keeps eligible choices possible. Familiar mode favors past accepted restaurants/cuisines; surprise mode adds weight to untried places. Balanced mode applies a small acceptance bonus. Directions/menu/order-reroll events are retained as signals, but do not independently imply a successful meal or a dislike.

`weightedPick` uses these positive weights directly. There is no always-highest-rated winner. Randomness is injectable; `seededRandom` makes tests reproducible. A failed discovery provider produces a retry message. A failed menu provider produces restaurant-only discovery.

## Meal choice

`MealBuilder` enumerates a small readable template set for each main/combo/shared anchor:

- Enough units of one main or combo for the whole party, or `ceil(people / serves)` shared items.
- Main/shared anchor alone, with a side per diner, a drink per diner, or both.
- Anchor with one starter per two diners, or a dessert per diner.
- Combos never get duplicate side/drink accompaniments.

No unrelated second entrée is added to use spare money. Every template must fit the food allocation and provide an anchor for everyone. Higher use of the food budget and a side modestly improve a meal's weight. It is acceptable to leave money unspent. A canonical item-ID/quantity signature guarantees that a same-restaurant reroll excludes the previous meal if any other template fits. When only one fits, the UI says so. Restaurant rerolls retain the original submitted request, rather than reading potentially changed settings. A no-alternative restaurant reroll retains the displayed result and explains the constraint.

## Storage and privacy

Only `LocalDatabase` reads/writes localStorage. `HistoryStore`, `PreferenceStore`, and `SettingsStore` own their operations. One versioned record is namespaced by the deployment path (`swwe:v1:<path>`), avoiding collisions with the portfolio/stretch finder or another app deployment. Origin/path changes create separate data. Settings retain a supported city label; exact browser/manual coordinates are never stored. Completed snapshots retain restaurant identity/name/cuisines, order names/quantities, planned total, party size, and time, without exact location.

`shown`, `reject`, `reroll-order`, `directions`, `menu`, and `accepted` events are separate from completed meals. Only the explicit accept method creates completed history, once per recommendation ID. Storage denial/quota failure keeps an in-memory session and displays a notice. Unreadable/unknown-version records are left intact rather than silently overwritten. There is no analytics, cloud persistence, login, or background geolocation. A secondary control clears local data after a native dialog confirmation.

## Shell and updates

Vite bundles the small fixture catalog, so the complete demo is available with its shell offline. `build-sw.mjs` hashes file names, all built bytes, and the worker template to version the precache. Install succeeds only after all shell files are cached. Activate removes only old caches bearing this app's exact scope prefix, then claims clients. Navigation uses a bounded network-first attempt with the installed index as fallback; hashed assets are cache-first. APIs and unrelated resources never enter the shell cache. An updated controller offers a reload; returning to the tab checks for a worker update. Hash routes avoid server rewrites.

The stronger source/runtime separation, relative Vite base, scoped cache naming, local persistence boundary, and validation-before-build workflow follow patterns inspected in Back-Fixer-Upper-Web. Its YouTube-specific catalog, IndexedDB migration, and scheduled acquisition systems were not needed for this small original fixture catalog.
