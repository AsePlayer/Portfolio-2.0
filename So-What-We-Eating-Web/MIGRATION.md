# Legacy migration

Inspected read-only references:

- `D:/Coding/Github/So-What-We-Eating` (`AsePlayer/So-What-We-Eating`): all five named Unity scripts and all five Python scraper/orchestrator scripts.
- `D:/Coding/Github/Health Stretch App` (its Git remote is `AsePlayer/Back-Fixer-Upper-Web`): package/Vite settings, domain/storage/view/catalog boundaries, source tooling, shell generation, portfolio sync, browser verification, workflows, and HTML shell.
- Current Portfolio 2.0: README, project/integration guide, directory structure, and Git status.

Both reference checkouts and the portfolio source remain unchanged. This project lives only in the new `So-What-We-Eating-Web/` folder. It is a web reimplementation, with no Unity runtime or legacy data dump.

| Legacy system | Preserved idea | Replacement |
| --- | --- | --- |
| `DollarSlider.cs` | User-selected food budget | Accessible numeric party-budget input; cent-based `Budget.ts`; central limits; no forced $5 rounding |
| `Restauraunt.cs` | Restaurant identity/address and menu items | Explicit TypeScript Restaurant, Menu, MenuItem, MealRecommendation models; stable IDs and provenance |
| `UIManager.cs` | ZIP/city search, results, same-restaurant reroll | Small App controller, hash views, LocationService, independent reroll actions, accessible status/failure states |
| `WebScraper.cs` discovery | Random restaurant selection and cached-menu concepts | RestaurantProvider/MenuProvider interfaces and validated original fixtures; mockable future proxy client |
| `WebScraper.cs` meal combination | Core vs optional food and budget allowance | Explicit item roles, meal templates, shared-serving math, eligibility/scoring, full reserved buffer |
| `ZipCodeLookup.cs` | ZIP and city/state inputs | Small supported-location map, browser geolocation on demand, manual coordinate parsing; no national CSV download |
| Python `main.py` | Import orchestration and saved menu JSON | Build-time manual JSON importer/validator; failures do not replace committed catalog files |
| `state_scraper.py`, `city_scraper.py` | Geographic discovery hierarchy | Location abstraction and future server-side geocoding; no state/city crawling |
| `restaurant_scraper.py`, `menu_scraper.py` | Restaurant/menu normalization | Separate normalized discovery and menu contracts, catalog schema, provenance, role inference |

The old Unity algorithm shuffled menu categories and added many core items until money ran out, then appended 20% of the selected subtotal as a pseudo-menu tax/tip item. The replacement chooses a meal structure first, reserves a percentage of the **total party budget**, and reports that allowance separately. It never adds unrelated mains merely because their categories differ. Party size, behavior-based weights, favorites/exclusions, completed history, PWA support, and subpath deployment are new.

AllMenus HTML string parsing, runtime scraping, hard-coded DOM selectors, aggressive threaded acquisition, and the huge ZIP CSV were deliberately abandoned. No AllMenus requests occur in this app or its build. Future approved data acquisition is an optional build/server adapter; it never becomes the recommendation engine or UI.
