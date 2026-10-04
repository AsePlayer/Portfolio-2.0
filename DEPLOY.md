# Deploying to GitHub Pages

The portfolio deploys from GitHub Actions to `https://ryanscott.org/`.

## Publish

1. Run `node --test scripts/site.test.mjs`.
2. Run `node scripts/build.mjs` and `node scripts/validate-site.mjs`.
3. Commit source changes and the generated root `index.html`, then push to `main`.
4. In repository Settings → Pages, use GitHub Actions as the source.
5. Confirm the Deploy to GitHub Pages workflow passes.

The workflow uses Node.js 24, runs tests, prerenders the full portfolio from JSON, validates the result, and uploads only `dist/`. Keep internal asset links relative so local previews and project URLs work. A manually triggered workflow is also available.

## Deployment checks

- Open the deployed site at mobile, tablet, and desktop widths, in light and dark themes.
- Disable JavaScript and confirm Hero, Impact, Selected Work, Experience, Credentials, Skills, Resume, and Contact remain readable; mobile navigation stays visible.
- Test keyboard navigation, Escape in the mobile menu, the skip link, and direct section links.
- Confirm LinkedIn, GitHub, YouTube, Trailhead, email, and résumé destinations.
- Open the deployed résumé and confirm its content and current version. Keep its phone number; public HTML, JSON, and metadata must not include it.
- Confirm browser console and network requests have no errors.
- Test production FormSubmit activation, delivery, success feedback, and spam handling.
- Confirm page, Open Graph, Twitter, and JSON-LD metadata reflect data operations / business systems and the actual coordinator role. Configure a social image only when its asset is ready.

## Content and résumé

Edit `data/site.json`, then rebuild before previewing or deploying. The generated page and metadata share that source; do not maintain duplicate copy in HTML. See README.md for case-study and grouped-role schemas.

Metrics live in `impact.items` and can be referenced by case studies. To keep a number private, remove its entry and case-study references; display toggles alone leave values in the public JSON. Review case-study copy for confidential identifiers, internal configuration, stakeholder names, and live payment links before publishing.

The revised general analytics résumé is bundled at `data/Ryan Scott Resume.pdf`. Keep job-specific versions separate. The build includes only the PDF selected by `person.resume`; if its path changes, update the résumé hero action too.

## Custom domain

The root `CNAME` remains `ryanscott.org` and is copied into `dist/`.

1. Confirm `ryanscott.org` under Settings → Pages → Custom domain.
2. Keep DNS pointed to GitHub Pages.
3. After DNS verification, enable Enforce HTTPS.
4. If the domain changes, update `CNAME`, the workflow environment URL, and `seo.url` in `data/site.json`, then rebuild. Metadata and the contact return URL are generated from `seo.url`.
