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

All sections, navigation, professional links, and the contact form are available without JavaScript. Browser JavaScript only enhances navigation, theme preferences, the footer year, and contact-success feedback; it does not fetch or render portfolio content. On small screens without JavaScript, navigation stays visible and the inactive theme/menu controls are hidden.

## Editing content

- Edit copy, experience, credentials, skills, contact settings, and professional links in `data/site.json`.
- Edit `seo` for the page title, descriptions, canonical URL, JSON-LD job title, and `knowsAbout`. Social metadata and structured data use the same source.
- Keep unavailable professional URLs as empty strings. Placeholder URLs fail validation.
- Keep phone numbers out of public JSON and HTML; the downloadable résumé can retain its phone number.
- `templates/index.html` holds the document shell; `scripts/render-site.mjs` holds section markup. Content is escaped before rendering. The existing `<i>` emphasis in organization names is supported.
- Presentation lives in `css/styles.css`; interactions live in `js/script.js`.
- The theme follows system preferences and saves manual selections in local storage.

### Capability areas and compact examples

`capabilities` replaces the retired `selectedWork` schema. It contains `eyebrow`, `headline`, `intro`, and exactly three `categories`:

1. **Business Data Systems & Automation:** Magazine Circulation Automation, Enterprise Email Suppression Governance, Audience Generation & Segmentation, and Event Data Integration.
2. **CRM Data Quality & Migration:** Legacy CRM to Salesforce Migration, Council Affiliation Reconciliation, Membership Flowdown Integrity, and Data Quality Audit Framework.
3. **Analytics & Decision Support:** Historical Exhibitor Analysis, Membership Retention & Revenue Forecasting, Reporting Modernization, and Engagement Analytics.

Each category requires a unique lowercase `id`, `title`, `intro`, and two to four `examples`. Each example requires a globally unique `id`, `title`, a one- or two-sentence `summary`, one to three `impact` bullets, and a short `technologies` array of at most six concrete tools. Optional `metric` references a count in `impact.items`. Optional `details.steps` contains up to six plain-text steps:

```json
{
  "id": "council-affiliations",
  "title": "Council Affiliation Reconciliation",
  "summary": "Designed matching and reconciliation logic for council-affiliation migration.",
  "impact": ["Validated relationships before and after import."],
  "technologies": ["SQL", "Salesforce", "Data Loader"],
  "metric": "crm-affiliations",
  "details": {"steps": ["Compare relationships and create unique lookup keys."]}
}
```

Categories and examples appear in JSON order before Experience. Category navigation uses anchors such as `#capability-crm-data-quality`; examples retain `#work-` anchors such as `#work-council-affiliations`. Categories are the primary narrative; examples are compact proof in a responsive two-column layout. Payment Reminder Process & Data Quality has been consolidated into Audience Generation & Segmentation. The relationship-integrity and audit examples have been renamed and shortened while retaining their original anchors.

Only two examples across the entire portfolio may include `details`: currently circulation automation and council reconciliation. They render as native, initially collapsed `<details>` disclosures with accessible summary names and ordered steps, including without JavaScript. Repetitive case-study fields (`challenge`, `investigation`, `solution`, `evidence`, `skills`, `featured`, and `process`) fail validation. JSON-LD groups CreativeWork entries beneath three category ItemLists and links every example to Ryan's Person entry.

`hero.panel` holds How I Work copy and a four-step `steps` array; each step has `title` and `text`. The sequence is Understand, Trace, Build, Validate, with the QA/software-development background explained in `intro`.

### Impact metrics

The optional `impact` section contains an `eyebrow` and `items` array. It appears between the hero and Capabilities. Each item requires unique `id`, `value`, `label`, `context`, and boolean `approximate`; optional `exampleId` replaces `caseStudyId` and links to an example. Example `metric` references the metric's ID so a count is edited once and displayed consistently in the band and compact proof:

```json
{
  "id": "crm-affiliations",
  "value": "4,000",
  "label": "CRM affiliation records",
  "context": "Matching and reconciliation during migration.",
  "approximate": true,
  "exampleId": "council-affiliations"
}
```

Keep `value` as a count without `+` or `~`. Metrics with `approximate: true` display a visible `~` and an accessible “Approximately” qualifier. `enabled: false` on a metric hides it in both the band and examples. `impact.enabled: false` hides only the band. Empty `items` or an omitted `impact` section are supported; remove example metric references if their definitions are removed. **JSON is a public asset:** hiding a metric does not remove its value from JSON. To keep a number private, delete its metric entry and references before publishing.

Headline metrics are approximately 8,000 historical exhibitor records, approximately 4,000 CRM affiliation records, and exactly 473 organizations identified without an assigned primary contact. All three now link to their supporting examples. Organization-type categories remain supporting business-rule work rather than a headline metric. Counts describe analyzed or reconciled datasets; they do not imply manual review, migration ownership, or invented time/revenue savings.

### Share images

`seo.image` is optional. When a real image is available, set it to `{"path":"assets/share.png","alt":"Description of the image"}`. Use a relative PNG, JPEG, or WebP file inside the repository. Validation checks the asset; the build copies it into `dist/` and emits absolute Open Graph/Twitter image URLs and alt text. Without an image, image tags are omitted and Twitter uses the summary card.

### Role progression

Use one experience item per employer with an overall `date`, `organization`, and either `role`/`text` or a `roles` array. Each nested role has its own `date`, `role`, and `text`. MaxGames preserves the 2015–2017 volunteer and 2017–2022 paid progression supported by the earlier résumé.

## Validation

```sh
node --test scripts/site.test.mjs
node scripts/build.mjs
node scripts/validate-site.mjs
```

Validation checks exactly three capability areas, two to four examples per area, impact/technology limits, at most two deep dives, metric references, and actual-role wording. It also checks rendered anchors and local assets, PDF signature/trailer, privacy, canonical URL, nested SEO/JSON-LD, contact configuration, generated-content freshness, and deployment artifact consistency. Tests cover HTML availability and hierarchy, escaping, invalid nested schemas, compactness limits, native disclosures, accurate metrics and hiding, the How I Work sequence, inflated-title rejection, linked CreativeWork data, optional share images, broken links, phone privacy, résumé path safety, grouped roles, and optional résumé behavior.

External URL syntax is checked locally; remote profiles and form delivery require live verification. Before publishing, also check mobile/tablet/desktop layouts, light/dark themes, keyboard navigation, JavaScript-disabled reading, and browser console errors.

## Replacing the résumé

The revised general analytics résumé is bundled at `data/Ryan Scott Resume.pdf`, configured by `person.resume`. For future replacements:

1. Replace that PDF, preserving its phone number, or update `person.resume` to the new relative PDF path.
2. If the path changes, update the résumé action in `hero.actions` too.
3. Run the tests, build, and validation; open the PDF locally and again after deployment.

The build publishes only the configured résumé, so other variants are not bundled automatically. Keep job-specific variants separate from the public portfolio. Setting `person.resume` to an empty string hides the résumé section; remove its navigation and hero action at the same time.

**Accuracy note:** The revised résumé and portfolio both use “Software Developer” with the confirmed Knights of Creation dates of 2022–2025, and both include the Salesforce Certified Data 360 Consultant credential. SEMA’s June 2025 start and the paid QA role title match the revised résumé. The volunteer QA dates remain supported by the earlier résumé and repositioning brief.

The public website's headline describes the scope of work; the current role remains Data Operations Coordinator. Migration copy describes support, validation, and reconciliation rather than ownership of the full migration. Membership relationship work describes investigation, monitoring, and configuration findings without claiming deployed Apex remediation. Data 360 appears as certification knowledge, research, and future-state exploration, without implying an implemented enterprise CDP. Apex is part of the broader automation toolkit and audience work. No architecture title, management authority, or financial/time-saving estimate is added.

## Contact form

The form posts to FormSubmit using `person.email`, with the subject from `contact.formSubject`. Direct email is also available. Its static return URL comes from `seo.url`; JavaScript adjusts that URL to the current origin during local previews. Required fields, labels, and the honeypot are rendered in HTML. A `?sent=true#contact` return shows success feedback when JavaScript is enabled.

The first FormSubmit message may require approving an activation email. Configuration validation does not verify mailbox delivery; test activation and delivery in production.

## Deployment

Pushes to `main` retain the existing GitHub Pages workflow. Actions checks JavaScript syntax, runs tests, builds, validates, and publishes `dist/`. Only public assets are uploaded; scripts, templates, documentation, Git files, and unconfigured PDFs are excluded.

See `DEPLOY.md` for the deployment checklist and custom-domain notes.
