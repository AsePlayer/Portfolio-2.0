# Ryan Scott | Data Operations & Business Systems Portfolio

A recruiter-focused portfolio built with semantic HTML, responsive CSS, and plain JavaScript. Selected Professional Work presents six problem-led case studies, connected by Understand → Trace → Build → Validate. Experience shows how the same investigative and validation habits carry from pre-release game testing, through a Python/Google Sheets business application, to current data operations work without treating them as the same job. The hero, experience, and JSON-LD retain his actual current role, Data Operations Coordinator, with a visible foundation in QA and software development.

Live site: [ryanscott.org](https://ryanscott.org/)

Live project: [Back-Fixer-Upper stretch finder](https://ryanscott.org/projects/stretch-finder/) · App source: [AsePlayer/Back-Fixer-Upper-Web](https://github.com/AsePlayer/Back-Fixer-Upper-Web)

Independent Projects remains separate from professional work and appears after compact Experience with three compact cards: Back-Fixer-Upper and So What We Eating? as Web Apps, and AsePlayer as a Creator Project. Each keeps its own product or creative story. The portfolio's self-referential card is omitted; its source remains accessible through GitHub. The grid shows three columns on desktop, two on tablet, and one on phones. The stretch finder opens at `/projects/stretch-finder/`, and the food-decision app opens at `/projects/what-we-eating/`; external projects open in a new tab. **[PROJECTS.md](PROJECTS.md) is the guide to where each project is edited and how to refresh its generated files.** Edit these cards in `data/site.json`; edit the food app in `So-What-We-Eating-Web/` and the stretch finder in the separate **Health Stretch App** project. Channel stats are a public snapshot from October 16, 2026 (59.9K subscribers, 31,690,902 views, 770 videos, retrieved through vidIQ), rounded down where shown with a plus sign.

## Build and local preview

Use Node.js 24 (no package installation or runtime dependencies):

```sh
node scripts/build.mjs
node scripts/validate-site.mjs
node scripts/serve.mjs
```

Open `http://127.0.0.1:8000`. The preview server also builds on startup. After changing content or templates, rerun the build and refresh the page.

The build reads `data/site.json` and `templates/index.html`, renders full content and metadata into the root `index.html`, and creates the public artifact in `dist/`. Commit the generated root HTML along with source changes. Do not edit `index.html` manually; validation detects stale generated HTML. `dist/` is ignored by Git and rebuilt during deployment.

All sections, navigation, professional links, and the configured resume PDF are available without JavaScript. Browser JavaScript only enhances navigation, theme preferences, and the footer year; it does not fetch or render portfolio content. On small screens without JavaScript, navigation stays visible and the inactive theme/menu controls are hidden.

## Editing content

- Edit copy, experience, credentials, skills, contact settings, and professional links in `data/site.json`.
- Edit `seo` for the page title, descriptions, canonical URL, JSON-LD job title, and `knowsAbout`. Social metadata and structured data use the same source.
- Keep unavailable professional URLs as empty strings. Placeholder URLs fail validation.
- Keep phone numbers out of all public content, including JSON, HTML, metadata, and the downloadable résumé PDF.
- `templates/index.html` holds the document shell; `scripts/render-site.mjs` holds section markup. Content is escaped before rendering. The existing `<i>` emphasis in organization names is supported.
- Presentation lives in `css/styles.css`; interactions live in `js/script.js`.
- The theme follows system preferences and saves manual selections in local storage.

### Selected Professional Work

`selectedWork` is the professional proof section, rendered at the existing `#work` anchor before Experience. Its visible eyebrow is **Selected Professional Work**, with the headline **Operational problems solved with data and systems.**

Each entry in `selectedWork.items` has a unique lowercase `id`, `title`, `organization`, `category`, compact `summary` (at most 400 characters), explicit boolean `featured`, and up to six `technologies` (tools or methods). Exactly six entries are featured. Featured entries also require `challenge`, `role`, `approach`, and `outcome` strings (at most 600 characters each).

The featured selection is CRM Migration & Reporting Rebuild, Marketing Data Automation & Segmentation, Weekly Sales Lead Reporting Automation, Accounts Receivable Aging Reporting, Event Operations Workflow Improvement, Membership & Financial Analysis. Each summary starts with the particular problem; expanded copy explains the contribution, investigation/build process, and supported result. Accounts Receivable Aging describes active development and validation. Weekly Sales reporting explicitly uses scheduled FTP source exports plus operator-run VBA preparation and distribution; it does not claim unattended processing.

Cards show context, title, summary, tools, and a native **Read case study** disclosure containing Challenge, My contribution, Approach, and Result. They form two columns on wider screens and one at 600px or below. Each disclosure has a unique accessible name, a visible keyboard focus indicator, and works with Enter/Space and without JavaScript. Multiple cards may be open independently; no new routes or browser-side content loading were added.

Historical Exhibitor Reconstruction, Council Affiliation Reconciliation, and Data-Quality Monitoring / Operational Audits stay in the same data model with `featured: false`. They do not render on the page or in JSON-LD. To feature one later, supply its four case-study detail fields and unfeature another item. Navigation and hero actions may link only to rendered `#work-ID` anchors. Magazine Circulation is excluded.

The old `capabilities` schema is retired. JSON-LD publishes six CreativeWork entries in one ItemList, each linked to Ryan’s Person entry, without asserting sole ownership of internal systems. Details are prerendered into HTML from JSON and remain available without JavaScript. Do not hand-edit the generated root `index.html`.

Experience provides employer, title, dates, and short context rather than repeating case-study content. MaxGames retains its supported volunteer-to-paid progression. The hero keeps **Understand → Trace → Build → Validate**, the actual current title, and its credential line. Credentials remain visible. The four compact toolkit groups add Google Sheets and emphasize supported reporting and workflow automation; professional SQL is attributed to SEMA, not Knights. Data 360 is certified knowledge, not a claim of production implementation.

The current professional-alignment report, exact card and expanded copy, evidence boundaries, and validation results are in [docs/PROFESSIONAL_CASE_STUDIES.md](docs/PROFESSIONAL_CASE_STUDIES.md).

### Independent Project content

`projects` has an eyebrow, headline, intro, and ordered `items`. Each item needs a unique ID, title, compact summary (up to 400 characters, supporting two sentences), technology tags, and a local project or HTTPS link. Optional `type` supports Web App, Desktop App, Game, Creator Project, Developer Tool, or Website; optional `highlight` adds a short source-supported fact such as the channel snapshot. `actionLabel` customizes the action. Type labels are plain subtle text, without filters.

Keep professional examples in Selected Work and side projects in Independent Projects. Do not add an unfinished project to fill the grid or force every project into career language. Both app links lead to the full products; So What We Eating? uses AllMenus and Photon to build varied party orders from exact listed prices, with no API key or Worker required. Experimental Google discovery is separate from normal production use. Fictional data appears only in explicitly selected demo mode.

### Claims and confidentiality

Professional case studies describe public-safe problems, methods, validation, and qualitative outcomes. Do not add proprietary screenshots, schemas, raw queries, internal URLs, private datasets, sensitive business rules, or confidential financial figures. No savings, revenue, conversion, adoption, or performance metrics have been added. “Hundreds” of SQL queries/processes is supported by the supplied résumé and professional-alignment brief. Previously supported scale remains only in the unfeatured alternate entries, not in headline badges. The retired top-level `impact` and `resume` panels still fail validation.

### Share images

`seo.image` configures the tracked 1200 × 630 `assets/social-preview.png`, with alt text and width/height metadata. Its editable vector source is `assets/social-preview.svg`; export an updated PNG at the same dimensions after editing the graphic. The build publishes the configured PNG in `dist/` and emits absolute Open Graph/Twitter image URLs, accessible alt text, and the large Twitter summary card. Validation checks asset existence and configured PNG dimensions. Optional image configuration remains supported; omitted images produce the smaller summary card.

### Role progression

Use one experience item per employer with an overall `date`, `organization`, and either `role`/`text` or a `roles` array. Each nested role has its own `date`, `role`, and `text`. MaxGames preserves volunteer QA from May 2015 to April 2017 and paid Quality Assurance & Release Testing from April 2017 to July 2022. Knights uses Business Solutions Developer (August 2022–April 2025), with Python and Google Sheets rather than SQL or ETL. Titles and year ranges match the revised résumé; month-level dates come from Ryan’s alignment brief.

## Validation

```sh
node --test scripts/site.test.mjs
node scripts/build.mjs
node scripts/validate-site.mjs
```

Validation checks six featured case studies and their native disclosures, all prerendered detail fields, unfeatured-content exclusion, linked CreativeWork data, section order, anchors and assets, concise credentials, four compact skill groups, direct résumé links, identity, privacy, canonical/social metadata, generated HTML freshness, and deployment artifact consistency. The existing suite has 19 tests after replacing obsolete capability-layout assertions; no large static-copy test suite was added.

The professional-alignment pass verified 20 width/theme combinations (320–1440px, light/dark), all six keyboard-operated disclosures at desktop and mobile sizes, independent expansion, visible focus, reduced-motion settings, navigation and focus destinations, theme persistence, reading and expansion without JavaScript, all three résumé links (including exact SHA-256 agreement with the supplied PDF), and both embedded app launches and return links. No browser errors or horizontal overflow occurred. GitHub and the YouTube project returned HTTP 200. LinkedIn returned automated-access status 999 and Trailhead returned 403; those unchanged profile links require a normal manual visit to fully verify.

See the implementation report for exact commands and evidence boundaries. External URL syntax is checked locally; automated access restrictions are not proof that a profile is unavailable.

## Replacing the résumé

The supplied professional-alignment résumé (Data Operations | Business Systems | SQL & Salesforce) is bundled at `data/Ryan Scott Resume.pdf`, configured by `person.resume`. For future replacements:

1. Replace that PDF with a public version that omits the phone number, or update `person.resume` to the new relative PDF path. Check the PDF's visible and extracted text, metadata, and links before publishing.
2. If the path changes, update its direct navigation link and the action in `hero.actions` too.
3. Run the tests, build, and validation; open the PDF locally and again after deployment.

The build publishes only the configured résumé, so other variants are not bundled automatically. Keep job-specific variants separate from the public portfolio. Setting `person.resume` to an empty string removes the Contact resume link; remove its direct navigation link and hero action at the same time.

**Canonical history corrected:** Knights of Creation is **Business Solutions Developer**, using Python and Google Sheets; the earlier title question is resolved by the supplied résumé and Ryan’s explicit clarification. MaxGames is **Quality Assurance & Release Testing**, with no game development, infrastructure operation, or deployment ownership implied. The résumé establishes the role titles and year ranges; the alignment brief supplies precise employment months. Certified ScrumMaster remains visible as explicitly requested, even though the revised one-page résumé does not list it.

The public website’s headline describes the scope of work; the actual current role remains Data Operations Coordinator. SEMA copy reflects independent implementation of individual data processes without ownership of the entire CRM migration. The weekly Sales case identifies the manual preparation/distribution steps that remain. The receivables case does not assert a completed rollout. Data 360 is credentialed knowledge, not production implementation experience. The toolkit follows the revised evidence and no longer promotes Apex or forecasting from the earlier positioning.

## Contact and professional links

Contact consists of one sentence with email, LinkedIn, and the configured resume PDF. The section uses roughly half the available viewport height to give “Let's talk” some breathing room. The PDF opens directly from navigation, Hero, and Contact with safe new-tab attributes. LinkedIn and GitHub remain the professional profiles; the YouTube channel appears in Projects. Salesforce Data 360 is identified as certified knowledge in the compact toolkit.

## Deployment

Pushes to `main` retain the existing GitHub Pages workflow. Actions checks JavaScript syntax, runs tests, builds, validates, and publishes `dist/`. Only public assets are uploaded; scripts, templates, documentation, Git files, and unconfigured PDFs are excluded.

See `DEPLOY.md` for the deployment checklist and custom-domain notes.
