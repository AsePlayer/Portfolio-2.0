# Where to edit projects

The portfolio is the home page and project launcher. Each app keeps its own source project. The published stretch finder lives at **https://ryanscott.org/projects/stretch-finder/**.

| What you want to change | Where to work |
| --- | --- |
| Portfolio copy, navigation, project name/description/link | **Portfolio 2.0** → `data/site.json` (the `projects` section) |
| Project card appearance | **Portfolio 2.0** → `css/styles.css` (`.project-*`) |
| Stretch finder screens, body selector, history or storage | **Health Stretch App** → `src/` |
| Creator configuration, classifications or catalog update logic | **Health Stretch App** → `content/`, `tools/`, `scripts/` |
| Generated app published by the portfolio | **Portfolio 2.0** → `projects/stretch-finder/` — regenerate it from the app |

## Update the stretch finder

From **Health Stretch App**:

```sh
npm run portfolio:sync
```

On Windows use `npm.cmd` if PowerShell blocks `npm`. This builds the app and refreshes only `Portfolio 2.0/projects/stretch-finder/`. If the portfolio is elsewhere, use `npm run portfolio:sync -- --portfolio "path/to/Portfolio 2.0"`.

Then from **Portfolio 2.0**:

```sh
node --test scripts/site.test.mjs
node scripts/build.mjs
node scripts/validate-site.mjs
node scripts/serve.mjs
```

Open `http://127.0.0.1:8000/#projects`. Click the card to use the full app on the same local server at `/projects/stretch-finder/`. Its Portfolio link returns here. The app works independently of the portfolio scripts and styles.

Review and commit the project files and generated root `index.html` in this repository. Pushing Portfolio 2.0 deploys the entire portfolio with the app at the subpath.

## Automatic publishing

After the app has its own public GitHub repository, set the **Portfolio-2.0** Actions repository variable `STRETCH_FINDER_REPOSITORY` to its exact `owner/repository` name. On each portfolio push, manual run, and daily **17:17 UTC** schedule, the portfolio workflow checks out the latest app source, builds its committed catalog, syncs it into the portfolio artifact, and deploys the complete site. The app's separate workflow still owns source discovery and catalog commits (scheduled at 16:17 UTC). The portfolio build does not contact YouTube or change app source. No cross-repository write token is needed for a public app repository.

In the app repository, set `HOSTING_TARGET=portfolio` to skip its separate Pages deployment while keeping catalog discovery and commits active. The portfolio then owns the public URL and deployment; there is no second app site to set up.

Until that variable is configured, portfolio pushes and manual runs publish the checked-in app snapshot, and the extra daily workflow is skipped. Refresh that snapshot locally with `portfolio:sync`. Production is configured: app source is `AsePlayer/Back-Fixer-Upper-Web`, its `HOSTING_TARGET=portfolio`, and this repository has `STRETCH_FINDER_REPOSITORY=AsePlayer/Back-Fixer-Upper-Web`. The first real hosted source update committed successfully on October 16, 2026. Private app repositories require a read token, which this workflow does not assume.

An app refresh that finishes after the portfolio's daily run appears on the next run; a manual portfolio deployment can publish it sooner. A failed app checkout or build stops deployment, leaving the last working portfolio live.

The app's worker is scoped to `/projects/stretch-finder/`, so it cannot take over the portfolio home page. Personal records stay on the browser's current origin; localhost and ryanscott.org have separate data. Use the app's export/import when moving your personal records.

## Add another app

Give it its own source project and generated directory under `projects/`. Add one item to `projects.items` in `data/site.json` with a unique `id`, `title`, one-sentence `summary`, `technologies`, and `/projects/project-name/` `href`. The portfolio build copies that directory into `dist/`; validation requires its `index.html` to exist.
