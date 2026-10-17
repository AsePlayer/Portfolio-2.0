# Menu prices and normalization

## Live menus

`AllMenusMenuProvider` retrieves exact prices for branches verified by `AllMenusMenuResolver`; Google separately owns discovery and canonical identity. Public city and menu pages are read on user action in the browser. `src/providers/allmenus/parse.ts` extracts names, categories, and exact single USD prices into the shared Menu schema. It uses the dedicated restaurant heading and stable menu URL identity, not the first generic heading or a display-name join.

The parser rejects missing prices, ranges, “from” prices, multiple prices in one row, conflicting same-item prices, age/time-limited offers, and build-your-own offers. Add-ons cannot anchor a meal. Shared servings are not inferred without documented counts. Pure `inferRole.ts` rules classify complete meal anchors and optional extras.

No real menu HTML or dataset is committed. The provider’s bounded session cache disappears on reload; shell caching excludes external requests. A completed meal saves the user-selected items and prices in local history. Every live result links its source. Listed prices may be stale and are not a checkout guarantee.

## Schema and explicit-demo catalog

`content/menus/menu.schema.json` defines schema v1. `src/catalog/validate.ts` enforces shape, unique IDs, and safe cent arithmetic. All committed catalog files are original fictional test data, loaded only by explicit demo mode. Their source is `original-fictional-fixture`. Missing menus are allowed at the provider boundary but cannot produce a successful recommendation; invalid committed menus fail the build.

## Manual normalization

```sh
npm run content:validate
npm run content:import -- path/to/raw.json path/to/new-candidate.json
```

The importer validates and writes only a new candidate path. It fills missing roles using `inferRole.ts`; explicit roles win. It does not guess price ranges, currencies, or serving counts. Review provenance, identity, prices, roles, and serving assumptions before promoting any candidate. Fixtures must remain separate from live content.

Additional MenuProvider implementations must return validated real item prices under the matching restaurant ID. The engine never substitutes a rough restaurant price level, an invented total, or a fictional menu when a real menu is unavailable.
