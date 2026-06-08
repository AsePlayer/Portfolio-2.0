# Deploying this site to GitHub Pages

Replace `your-username` and `your-repo` in the commands below, then run them locally.

Initial push (one-time):

```bash
git init
git add .
git commit -m "chore: initial portfolio for Ryan Scott"
git branch -M main
# Using HTTPS remote (you provided):
git remote add origin https://github.com/AsePlayer/Portfolio-2.0.git
git push -u origin main
```

Recommended commit messages for updates:
- `fix: update resume and contact info`
- `chore: update social links`
- `feat: add new project to Featured Work`

Notes:
- The workflow at `.github/workflows/pages.yml` deploys the repository root on pushes to `main`.
- Replace `CNAME` with your custom domain (or remove it if not used).
- If you prefer to deploy from `gh-pages` branch, update the workflow/Branches accordingly.

Last deploy trigger: 2026-06-07 (manual trigger by automation agent)
