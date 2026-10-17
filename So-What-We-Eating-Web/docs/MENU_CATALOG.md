# Normalized menus and future acquisition

`content/menus/menu.schema.json` describes menu schema v1. `src/catalog/validate.ts` is the dependency-free runtime/build validator and also enforces cross-item uniqueness and safe cent arithmetic. `content/menus/index.json` lists the stable restaurant IDs with detailed menus. Each has a matching `restaurants/<id>.json`. Missing menus are intentional and do not fail discovery; invalid committed menus fail the build.

All committed content is original fictional test data, including names, sample coordinates/addresses, prices, and descriptions. None was copied from a copyrighted menu dataset or obtained by scraping. The fixture source is `original-fictional-fixture`; `updatedAt` records this snapshot. A `sourceUrl` is optional for original data, required by convention whenever real externally sourced content is added.

## Manual import

Create a candidate JSON using the existing schema (identity, provenance, timestamp, currency, items). Run:

```sh
npm run content:import -- input.json candidate.json
npm run content:validate
```

The importer fills only **missing** roles using `inferRole.ts`; explicit roles, including `other`, win. It does not guess price strings/ranges, currencies, or serving counts. The output path must be new (`wx` write mode). Inspect the candidate, assign stable IDs, verify source rights and serving assumptions, then deliberately put it in `content/menus/restaurants/` and update the index. The validation command validates the committed catalog, not arbitrary candidate files; candidate validation occurs during import.

Prices must be finite positive numbers with at most two decimals. No price ranges, missing values, zero-price placeholders, NaN, or duplicate item IDs. Shared entrées may declare `serves: 1..8`; other roles cannot declare multiple servings. An unknown role fails validation. Rule-based category/name inference is a rough aid, not authoritative nutrition or portion classification.

## Future adapters and refresh

Implement `MenuImporter.import(input): Menu` outside `src/ui` and browser runtime. A permitted source/API adapter should acquire data, normalize it, apply deliberate overrides, validate, and write a reviewable candidate. Only promote a complete valid result. Keep the last known good catalog if acquisition, prices, identity matching, or validation fails. Stable restaurant identity joins discovery to menu intelligence; do not join on display name alone.

Potential sources include licensed restaurant APIs, a restaurant's own approved feed, manually supplied/permissioned menus, and approved chain data. An AllMenus adapter would be optional, after verifying its current terms and permission; none exists here. No scheduled refresh or network scraper is installed. Before future automation, document authorization, attribution, caching/retention rights, robots directives where relevant, rate limits, retry/backoff, provenance, and menu freshness. A refresh job should validate and propose/commit only its owned catalog changes, then run verification. It must not scrape during the frontend build or make failures a prerequisite for shell availability.
