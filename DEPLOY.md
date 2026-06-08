# Deploying this site to GitHub Pages

This repo deploys from GitHub Actions. No custom domain is configured.

Site URL after the first successful deploy:

```text
https://aseplayer.github.io/Portfolio-2.0/
```

Deploy steps:

1. Commit and push changes to `main`.
2. In GitHub, open the repo's `Settings` -> `Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. Open the `Actions` tab and run `Deploy to GitHub Pages`, or push a new commit to `main`.

The workflow at `.github/workflows/pages.yml` uploads the repository root as the Pages artifact. Keep asset links relative, such as `css/styles.css`, `js/script.js`, and `resume.pdf`, so they work under the project URL path.
