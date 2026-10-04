# Ryan Scott | Data Operations & Business Systems Portfolio

A recruiter-focused portfolio built with semantic HTML, responsive CSS, and plain JavaScript. Content emphasizes operational investigation, CRM data integrity, reconciliation, monitoring, and a career progression from QA through software development to data operations. The public headline describes the work; JSON-LD uses the actual current role, Data Operations Coordinator.

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

### Selected Work

`selectedWork` contains `eyebrow`, `headline`, `intro`, and an `items` array. Each case study requires a unique lowercase `id`, `title`, `summary`, and non-empty `skills` array. `challenge`, `investigation`, `solution`, `impact`, `evidence`, `process`, `featured`, and `metric` are optional:

```json
{
  "id": "crm-reconciliation",
  "title": "Case study title",
  "summary": "What was investigated or built.",
  "challenge": "The operational problem.",
  "investigation": "How the problem was traced.",
  "solution": "The verified process or corrective action.",
  "impact": "Supported outcome, without invented metrics.",
  "evidence": ["Verified finding or demonstrated capability."],
  "skills": ["SQL", "Data Validation"],
  "featured": true
}
```

Cases appear in JSON order before Experience, with stable anchors such as `#work-crm-reconciliation`. The four labeled stages render only when their fields are supplied. `process` is an optional array of plain-text steps rendered as an accessible ordered list, including without JavaScript. `featured` adds restrained visual emphasis. Each case also produces a CreativeWork entry linked to the existing Person structured data.

### Impact metrics

The optional `impact` section contains an `eyebrow` and `items` array. It appears between the hero and Selected Work. Each item requires unique `id`, `value`, `label`, `context`, and boolean `approximate`; optional `caseStudyId` links to a case study. Case-study `metric` references the metric's ID so a count is edited once:

```json
{
  "id": "crm-affiliations",
  "value": "4,000",
  "label": "CRM affiliation records",
  "context": "Matching and reconciliation during migration.",
  "approximate": true,
  "caseStudyId": "crm-reconciliation"
}
```

Approximate metrics display an explicit qualifier. `enabled: false` on a metric hides it in both the band and case cards. `impact.enabled: false` hides only the band. Empty `items` or an omitted `impact` section are supported; remove case-study metric references if their definitions are removed. **JSON is a public asset:** hiding a metric does not remove its value from JSON. To keep a number private, delete its metric entry and references before publishing.

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

Validation checks content schemas (including optional case-study stages, proof metrics, and share images), rendered anchors and local assets, PDF signature/trailer, privacy, canonical URL, SEO/JSON-LD, contact configuration, generated-content freshness, and deployment artifact consistency. Tests cover HTML availability and section order, escaping, invalid schemas, metric references and hiding, approximate figures, identity wording, linked CreativeWork data, optional share images, broken links, phone privacy, résumé path safety, grouped roles, and optional résumé behavior.

External URL syntax is checked locally; remote profiles and form delivery require live verification. Before publishing, also check mobile/tablet/desktop layouts, light/dark themes, keyboard navigation, JavaScript-disabled reading, and browser console errors.

## Replacing the résumé

The revised general analytics résumé is bundled at `data/Ryan Scott Resume.pdf`, configured by `person.resume`. For future replacements:

1. Replace that PDF, preserving its phone number, or update `person.resume` to the new relative PDF path.
2. If the path changes, update the résumé action in `hero.actions` too.
3. Run the tests, build, and validation; open the PDF locally and again after deployment.

The build publishes only the configured résumé, so other variants are not bundled automatically. Keep job-specific variants separate from the public portfolio. Setting `person.resume` to an empty string hides the résumé section; remove its navigation and hero action at the same time.

**Accuracy note:** The revised résumé and portfolio both use “Software Developer” with the confirmed Knights of Creation dates of 2022–2025, and both include the Salesforce Certified Data 360 Consultant credential. SEMA’s June 2025 start and the paid QA role title match the revised résumé. The volunteer QA dates remain supported by the earlier résumé and repositioning brief.

The public website's headline and structured job title follow the current positioning. The supplied résumé is intentionally unchanged; its headline and summary will be revised separately by the owner. Public case studies use the supplied 473-organization audit result, approximately 4,000 CRM affiliation records, and 30+ segmentation categories. No financial or time-saving estimates are added. Potential membership remediation stays an investigation, and Data 360 stays certification knowledge.

## Contact form

The form posts to FormSubmit using `person.email`, with the subject from `contact.formSubject`. Direct email is also available. Its static return URL comes from `seo.url`; JavaScript adjusts that URL to the current origin during local previews. Required fields, labels, and the honeypot are rendered in HTML. A `?sent=true#contact` return shows success feedback when JavaScript is enabled.

The first FormSubmit message may require approving an activation email. Configuration validation does not verify mailbox delivery; test activation and delivery in production.

## Deployment

Pushes to `main` retain the existing GitHub Pages workflow. Actions checks JavaScript syntax, runs tests, builds, validates, and publishes `dist/`. Only public assets are uploaded; scripts, templates, documentation, Git files, and unconfigured PDFs are excluded.

See `DEPLOY.md` for the deployment checklist and custom-domain notes.
