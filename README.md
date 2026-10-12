# Ryan Scott | Data Operations & Business Systems Portfolio

A recruiter-focused portfolio built with semantic HTML, responsive CSS, and plain JavaScript. Three capability areas show how Ryan translates business rules and disconnected data into reliable workflows, improves CRM reliability, and supports decisions through analysis. The hero, experience, and JSON-LD retain his actual current role, Data Operations Coordinator, with a visible foundation in QA and software development.

Live site: [ryanscott.org](https://ryanscott.org/)

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
- Keep phone numbers out of public JSON and HTML; the downloadable résumé can retain its phone number.
- `templates/index.html` holds the document shell; `scripts/render-site.mjs` holds section markup. Content is escaped before rendering. The existing `<i>` emphasis in organization names is supported.
- Presentation lives in `css/styles.css`; interactions live in `js/script.js`.
- The theme follows system preferences and saves manual selections in local storage.

### Capability areas and compact examples

`capabilities` contains a `headline` and exactly three `categories`:

1. **Business Data Systems & Automation:** Magazine Circulation Automation, Email Suppression Framework, and Event Data Integration.
2. **CRM Data Quality & Migration:** CRM Migration Validation, Council Affiliation Reconciliation, and Data-Quality Monitoring.
3. **Analytics & Decision Support:** Historical Exhibitor Analysis, Membership Forecasting, and Engagement Analysis.

Each category requires a unique lowercase `id`, `title`, a one-sentence `intro` (at most 180 characters), a shared `technologies` array of at most six tools, and exactly three `examples`. Each example requires a globally unique `id`, `title`, and a one-sentence `summary` (at most 240 characters). Useful scale belongs inside the relevant example sentence:

```json
{
  "id": "council-affiliations",
  "title": "Council Affiliation Reconciliation",
  "summary": "Designed matching logic and resolved exceptions across approximately 4,000 council-affiliation records."
}
```

Categories and examples appear in JSON order before Experience. Stable anchors such as `#capability-crm-data-quality` and `#work-council-affiliations` remain available for direct links. The page flows from Hero to Capabilities, Experience, Credentials, Toolkit, and Contact; there is no category table of contents, headline impact band, or resume section. Proof examples use three open columns on desktop, two on tablet with the final example spanning the row, and one on mobile. Subtle dividers separate capability groups. Technologies appear once beneath each capability.

Per-example impact lists, technologies, and deep dives have been removed from both content and rendering. Retired case-study fields, including `metric`, `impact`, `technologies`, and `details`, fail validation. JSON-LD still groups CreativeWork entries beneath three category ItemLists and links every example to Ryan's Person entry; it does not assign the shared toolkit to individual examples.

`hero.approach` replaces the retired methodology panel with four strings: Understand, Trace, Build, Validate. It renders as a compact inline sequence. The hero has no keyword strip; `person.currentEmployer` supplies context beside the actual `currentRole`, without changing the structured job title. QA and software-development experience remain visible in Experience.

Credentials require a `title` with optional `organization`, `date`, and professional `link`; optional boolean `secondary` gives Trailhead restrained emphasis after the certification, degree, and CSM. Explanatory labels and paragraphs are retired. Skills use four plain text groups with at most seven items each.

### Scale in context

The retired top-level `impact` and `resume` objects fail validation. There are no numeric badges or standalone headline metrics. Approximately 4,000 council-affiliation records, roughly 8,000 exhibitor histories, and the 473-organization primary-contact finding appear only in relevant proof sentences. The business question or reconciliation result comes first; scale supplies context.

### Share images

`seo.image` configures the tracked 1200 × 630 `assets/social-preview.png`, with alt text and width/height metadata. Its editable vector source is `assets/social-preview.svg`; export an updated PNG at the same dimensions after editing the graphic. The build publishes the configured PNG in `dist/` and emits absolute Open Graph/Twitter image URLs, accessible alt text, and the large Twitter summary card. Validation checks asset existence and configured PNG dimensions. Optional image configuration remains supported; omitted images produce the smaller summary card.

### Role progression

Use one experience item per employer with an overall `date`, `organization`, and either `role`/`text` or a `roles` array. Each nested role has its own `date`, `role`, and `text`. MaxGames preserves the 2015–2017 volunteer and 2017–2022 paid progression supported by the earlier résumé.

## Validation

```sh
node --test scripts/site.test.mjs
node scripts/build.mjs
node scripts/validate-site.mjs
```

Validation checks exactly three capability areas, three one-sentence examples per area, shared technology lines, no deep dives, headline metrics, scale badges, resume panels, or contact forms, concise credentials, four compact skill groups, direct resume links, and actual-role wording. It also checks rendered anchors and local assets, PDF signature/trailer, privacy, canonical URL, nested SEO/JSON-LD, contact configuration, generated-content freshness, and deployment artifact consistency. Tests cover static content and hierarchy, escaping, invalid nested schemas, proof-list simplicity, contextual scale and retired-schema rejection, the compact How I Work sequence, inflated-title rejection, linked CreativeWork data, optional share images, broken links, phone privacy, résumé path safety, grouped roles, and optional résumé behavior.

External URL syntax is checked locally; remote profiles require live verification. Before publishing, also check mobile/tablet/desktop layouts, light/dark themes, keyboard navigation, JavaScript-disabled reading, and browser console errors.

## Replacing the résumé

The revised general analytics résumé is bundled at `data/Ryan Scott Resume.pdf`, configured by `person.resume`. For future replacements:

1. Replace that PDF, preserving its phone number, or update `person.resume` to the new relative PDF path.
2. If the path changes, update its direct navigation link and the action in `hero.actions` too.
3. Run the tests, build, and validation; open the PDF locally and again after deployment.

The build publishes only the configured résumé, so other variants are not bundled automatically. Keep job-specific variants separate from the public portfolio. Setting `person.resume` to an empty string removes the Contact resume link; remove its direct navigation link and hero action at the same time.

**Accuracy note:** The revised résumé and portfolio both use “Software Developer” with the confirmed Knights of Creation dates of 2022–2025, and both include the Salesforce Certified Data 360 Consultant credential. SEMA’s June 2025 start and the paid QA role title match the revised résumé. The volunteer QA dates remain supported by the earlier résumé and repositioning brief.

The public website's headline describes the scope of work; the current role remains Data Operations Coordinator. Migration copy describes support, validation, and reconciliation rather than ownership of the full migration. Membership relationship work describes monitoring and configuration findings without claiming deployed Apex remediation. Data 360 appears in credentials and the toolkit without implying an implemented enterprise CDP. Apex remains part of the automation toolkit. No architecture title, management authority, or financial/time-saving estimate is added.

## Contact and professional links

Contact consists of one sentence with email, LinkedIn, and the configured resume PDF. The PDF opens directly from navigation, Hero, and Contact with safe new-tab attributes. LinkedIn and GitHub remain the professional profiles; YouTube and third-party form submission are removed. Salesforce Data 360 is identified as certified knowledge in the compact toolkit.

## Deployment

Pushes to `main` retain the existing GitHub Pages workflow. Actions checks JavaScript syntax, runs tests, builds, validates, and publishes `dist/`. Only public assets are uploaded; scripts, templates, documentation, Git files, and unconfigured PDFs are excluded.

See `DEPLOY.md` for the deployment checklist and custom-domain notes.
