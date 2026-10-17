# Deployment and portfolio integration

## Current portfolio integration

The portfolio card opens **`/projects/what-we-eating/`**. App source stays in this folder, and `projects/what-we-eating/` contains only a generated snapshot. From this folder, run `npm run portfolio:sync` to build and refresh that snapshot. For another portfolio location, use `npm run portfolio:sync -- --portfolio "path/to/Portfolio 2.0"`.

The sync script checks the configured card, confines its destination to the selected portfolio, rejects links and unmarked directories, stages the build, adds a `../../#projects` return link, and versions the worker against the modified HTML before replacing its owned directory. The parent portfolio's Pages workflow runs the app's tests and sync before building the complete portfolio. No separate app hosting or API configuration is needed.

## Standalone repository / GitHub Pages

This folder is independent. When creating `AsePlayer/So-What-We-Eating-Web`, use **this folder's contents** as the repository root, including its package lock, `content/`, `public/`, `scripts/`, and `.github/`. Do not copy `node_modules`, `dist`, `.tmp`, `artifacts`, `.env`, or the parent portfolio's `.git`.

1. Use Node 24 and run `npm ci` and `npm run verify`.
2. In the standalone repository's Pages settings, select **GitHub Actions**.
3. Run the prepared **Deploy GitHub Pages** workflow manually.
4. Its output artifact is `dist/`; the expected repository URL is `https://aseplayer.github.io/So-What-We-Eating-Web/`.

`verify.yml` runs on pushes/PRs; Pages deployment is deliberately manual. The workflows are nested and therefore inactive in the current portfolio repository. If workflows are later installed at a repository root while source stays nested, set Actions variable `APP_DIRECTORY=So-What-We-Eating-Web`. No workflow was added to or changed in the parent portfolio during CB01.

`vite.config.ts` uses `base: './'`. HTML, CSS, script, manifest, icons, and worker URLs are relative. Always use the directory's trailing slash. Hash routes (`#feed`, `#history`, `#settings`, `#about`) work with a static server and refresh without SPA rewrites. There is no `CNAME` in the app artifact. GitHub Pages deployment and remote availability have not been exercised in CB01.

## Link from the portfolio

The current card points to the app within the portfolio. An externally hosted standalone Pages URL remains an alternative: update only its `href` in the portfolio's `data/site.json`, using the existing project schema. Keep app source here and card copy in the portfolio.

## Host within the portfolio

Use a dedicated generated directory, for example **`projects/what-we-eating/`**, as Back Fixer Upper does with `projects/stretch-finder/`:

1. Build this app with `npm run verify`.
2. Copy **all contents of `dist/`**, including `assets/`, `icons/`, `index.html`, `manifest.webmanifest`, `sw.js`, and `.nojekyll`, into the chosen app directory. Do not copy a containing `dist` directory.
3. Add a portfolio project card with a unique ID, summary, technologies, and `href: "/projects/what-we-eating/"`.
4. Run the portfolio's normal tests, build, and validation. Preview the portfolio and follow the new card.
5. Publish through the portfolio's existing deployment process.

Do not hand-edit generated app files. The supplied `portfolio:sync` command performs these steps with ownership-marker, path, and staging safeguards. Use that command for the current integrated deployment.

The worker registers relative to the current app directory and cannot control the portfolio home or stretch finder. Browser verification exercised both `/So-What-We-Eating-Web/` and `/projects/what-we-eating/`, and checked that the host root remains uncontrolled.

## Embedding and personal data

A direct full-page link gives the best mobile and install experience. If embedding is needed, use an iframe pointing to the complete app directory, with a descriptive `title`, enough viewport height, and geolocation permissions only when deliberately needed. Cross-origin iframe storage/geolocation/install restrictions vary by browser; iframe behavior was not verified. No portfolio CSS or JavaScript should be loaded into the app itself.

Local data belongs to the current origin **and app path**. Standalone Pages, portfolio hosting, and localhost retain separate history/settings. This version does not transfer personal records between those deployments.

## PWA checks

Use `npm run build` then `npm run preview` to check the production worker; development never registers it. Connect once to install the shell, then reopen offline. The demo catalog is in the bundle. New deployments produce a new content-derived worker version and a reload action. HTTPS is needed outside localhost. Manifest, PNG icon sizes, worker installation/update/scope, and offline reopening passed automated Chrome checks; home-screen installation on actual phones remains a manual check.
