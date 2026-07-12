# Ryan Scott — Data Operations Portfolio

A lightweight, recruiter-focused portfolio built with semantic HTML, responsive CSS, and plain JavaScript. The content emphasizes cross-functional reporting, data validation, CRM/AMS migration support, Salesforce development, and process documentation.

Live site: [ryanscott.org](https://ryanscott.org/)

## Local preview

The page loads its content from JSON, so preview it through a local server rather than opening `index.html` directly:

1. Run `node scripts/serve.mjs` from the repository root.
2. Open `http://localhost:8000`.

## Editing content

- Update copy, case studies, experience, skills, contact details, and links in `data/site.json`.
- Leave an unavailable social URL as an empty string. Empty links are omitted automatically; `#` placeholders fail validation.
- Layout and interactions live in `js/script.js`; presentation lives in `css/styles.css`.
- The light/dark theme defaults to the visitor's system preference and saves manual selections in local storage.
- Run `node scripts/validate-site.mjs` after content changes.

### Multiple roles at one company

Use one experience item for the company, put the overall tenure in `date`, and add a `roles` array. Each nested role has its own date, title, and description:

```json
{
  "date": "2015—2022",
  "organization": "Company Name",
  "roles": [
    {
      "date": "2017—2022",
      "role": "Later Role",
      "text": "Responsibilities and impact."
    },
    {
      "date": "2015—2017",
      "role": "Earlier Role",
      "text": "Responsibilities and impact."
    }
  ]
}
```

Single-role employers continue to use the top-level `date`, `role`, `organization`, and `text` fields.

## Adding a résumé

The résumé section is intentionally hidden until a real PDF is available:

1. Add the PDF to the repository, for example as `resume.pdf`.
2. Set `person.resume` in `data/site.json` to that file path.
3. Run the validation script. It verifies that the configured file exists and has a PDF signature.

## Contact form

The form posts to FormSubmit using the email in `data/site.json`. The direct email address is also presented as the primary contact method. The first FormSubmit message may require approving an activation email; complete a production test before sharing the site widely.

## Deployment

Pushes to `main` deploy through GitHub Actions. The workflow validates content, links, metadata, navigation targets, and configured assets before publishing to GitHub Pages.

See `DEPLOY.md` for the launch checklist and custom-domain notes.
