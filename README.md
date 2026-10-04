# Ryan Scott | Data & Operations Analytics Portfolio

A recruiter-focused portfolio built with semantic HTML, responsive CSS, and plain JavaScript. Content emphasizes SQL analysis, operational investigation, root causes, automation, data quality, and a career progression from QA through software development to analytics.

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

`selectedWork` contains `eyebrow`, `headline`, `intro`, and an `items` array. Each case study requires a `title`, `text`, and non-empty `skills` array, plus an `outcome` or non-empty `evidence` array. Both can be supplied:

```json
{
  "title": "Case study title",
  "text": "What was investigated or built.",
  "evidence": ["Verified finding or demonstrated capability."],
  "outcome": "Supported outcome, without invented metrics.",
  "skills": ["SQL", "Data Validation"]
}
```

### Role progression

Use one experience item per employer with an overall `date`, `organization`, and either `role`/`text` or a `roles` array. Each nested role has its own `date`, `role`, and `text`. MaxGames preserves the 2015–2017 volunteer and 2017–2022 paid progression documented in the bundled résumé.

## Validation

```sh
node --test scripts/site.test.mjs
node scripts/build.mjs
node scripts/validate-site.mjs
```

Validation checks content schemas (including Selected Work), rendered anchors and local assets, PDF signature/trailer, privacy, canonical URL, SEO/JSON-LD, contact configuration, generated-content freshness, and deployment artifact consistency. Tests cover HTML availability, escaping, invalid case studies, broken links, phone privacy, résumé path safety, grouped roles, and optional résumé behavior.

External URL syntax is checked locally; remote profiles and form delivery require live verification. Before publishing, also check mobile/tablet/desktop layouts, light/dark themes, keyboard navigation, JavaScript-disabled reading, and browser console errors.

## Replacing the résumé

The revised general analytics résumé is bundled at `data/Ryan Scott Resume.pdf`, configured by `person.resume`. For future replacements:

1. Replace that PDF, preserving its phone number, or update `person.resume` to the new relative PDF path.
2. If the path changes, update the résumé action in `hero.actions` too.
3. Run the tests, build, and validation; open the PDF locally and again after deployment.

The build publishes only the configured résumé, so other variants are not bundled automatically. Keep job-specific variants separate from the public portfolio. Setting `person.resume` to an empty string hides the résumé section; remove its navigation and hero action at the same time.

**Accuracy note:** The revised résumé and portfolio both use “Software Developer” with the confirmed Knights of Creation dates of 2022–2025, and both include the Salesforce Certified Data 360 Consultant credential. SEMA’s June 2025 start and the paid QA role title match the revised résumé. The volunteer QA dates remain supported by the earlier résumé and repositioning brief.

## Contact form

The form posts to FormSubmit using `person.email`, with the subject from `contact.formSubject`. Direct email is also available. Its static return URL comes from `seo.url`; JavaScript adjusts that URL to the current origin during local previews. Required fields, labels, and the honeypot are rendered in HTML. A `?sent=true#contact` return shows success feedback when JavaScript is enabled.

The first FormSubmit message may require approving an activation email. Configuration validation does not verify mailbox delivery; test activation and delivery in production.

## Deployment

Pushes to `main` retain the existing GitHub Pages workflow. Actions checks JavaScript syntax, runs tests, builds, validates, and publishes `dist/`. Only public assets are uploaded; scripts, templates, documentation, Git files, and unconfigured PDFs are excluded.

See `DEPLOY.md` for the deployment checklist and custom-domain notes.
