# Deploying this site to GitHub Pages

This repo deploys from GitHub Actions. It works without a custom domain today and includes a `CNAME.example` file for when a real custom domain is ready.

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

Content and contact form:

- Edit portfolio content in `data/site.json`.
- The contact form posts to FormSubmit using `ryanscottcareer@gmail.com`.
- The first real form submission may require clicking an activation link sent by FormSubmit to that inbox.
- For local preview, run a static server. Opening `index.html` directly may block `data/site.json` because browsers restrict local file fetches.

Custom domain setup, when ready:

1. Replace `example.com` in `CNAME.example` with the real domain.
2. Rename `CNAME.example` to `CNAME`.
3. In GitHub, open `Settings` -> `Pages` and enter the same custom domain.
4. Add the DNS records GitHub recommends for that domain.
5. Wait for DNS verification, then enable `Enforce HTTPS`.
