# Deploying to GitHub Pages

The portfolio deploys from GitHub Actions to:

```text
https://ryanscott.org/
```

## Publish

1. Run `node scripts/validate-site.mjs` locally.
2. Commit and push the changes to `main`.
3. In the repository's `Settings` → `Pages`, set the source to `GitHub Actions` if it is not already selected.
4. Confirm that the `Deploy to GitHub Pages` workflow passes.

The workflow validates the portfolio before uploading the repository root. Keep internal asset links relative so they continue to work below the project URL.

## Pre-launch checks

- Open the deployed site on desktop and mobile.
- Test keyboard navigation, the mobile menu, and direct links such as `#experience` and `#contact`.
- Confirm LinkedIn, GitHub, email, and every call to action point to the intended destination.
- If a résumé is configured, open it from the deployed site and confirm that it is the current version.
- Submit the production contact form and confirm delivery, FormSubmit activation, the success message, and spam handling.
- Confirm the page title and description in a search/share preview tool.

## Content and résumé

- Edit portfolio content in `data/site.json`.
- The résumé section stays hidden while `person.resume` is empty.
- To publish a résumé, add a real PDF, set its path in `person.resume`, and rerun validation.

## Custom domain

The repository is configured for `ryanscott.org` through the root-level `CNAME` file.

1. Confirm `ryanscott.org` under `Settings` → `Pages` → `Custom domain`.
2. Keep the domain's DNS records pointed to GitHub Pages.
3. After DNS verification, enable `Enforce HTTPS`.
4. If the domain changes later, update `CNAME`, the workflow URL, and the canonical, Open Graph, and structured-data URLs in `index.html`.
