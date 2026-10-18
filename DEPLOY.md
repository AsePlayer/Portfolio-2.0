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
- Disable JavaScript and confirm Hero, all three capability areas and nine proof examples, Experience, Credentials, Toolkit, and Contact remain readable; mobile navigation stays visible. The main page contains no disclosures.
- Test keyboard navigation, Escape in the mobile menu, the skip link, and direct section links.
- Confirm LinkedIn, GitHub, Trailhead, email, and direct résumé destinations.
- Open the deployed résumé and confirm its content and current version. Its visible and extracted text, metadata, and links must not contain a phone number; the same applies to public HTML and JSON.
- Confirm browser console and network requests have no errors.
- Confirm page, Open Graph, Twitter, and JSON-LD metadata reflect data operations / business systems and the actual coordinator role. Confirm the social preview PNG is published at `/assets/social-preview.png` and matches its 1200 × 630 dimensions.

## Content and résumé

Edit `data/site.json`, then rebuild before previewing or deploying. The generated page and metadata share that source; do not maintain duplicate copy in HTML. See README.md for capability, compact-example, and grouped-role schemas.

Scale is embedded in relevant proof sentences rather than a separate metric section. Keep approximately 4,000 council affiliations, roughly 8,000 exhibitor histories, and the exact 473-organization finding in their business context. Retired impact and resume sections are rejected by validation.

The revised general analytics résumé is bundled at `data/Ryan Scott Resume.pdf`. Keep job-specific versions separate. The build includes only the PDF selected by `person.resume`; if its path changes, update its direct navigation link and hero action too.

## Custom domain

The root `CNAME` remains `ryanscott.org` and is copied into `dist/`.

1. Confirm `ryanscott.org` under Settings → Pages → Custom domain.
2. Keep DNS pointed to GitHub Pages.
3. After DNS verification, enable Enforce HTTPS.
4. If the domain changes, update `CNAME`, the workflow environment URL, and `seo.url` in `data/site.json`, then rebuild. Canonical and social metadata URLs are generated from `seo.url`.
