# Portfolio 2.0

This repository contains a fast, accessible, and recruiter-friendly static portfolio for Ryan Scott.

Local preview:

1. Run a local static server from the repo root, such as `python -m http.server 8000`.
2. Open `http://localhost:8000`.
3. Replace `resume.pdf` with a real resume file.

Editing content:

- Update portfolio copy, links, email, skills, and work examples in `data/site.json`.
- `index.html` is intentionally a small shell; `js/script.js` renders the page from JSON.
- The contact form posts to FormSubmit using the email in `data/site.json`.

Deploy to GitHub Pages:

1. Push this project to `main`.
2. In the repository Settings -> Pages, set `Source` to `GitHub Actions`.
3. The deploy workflow publishes the repository root to GitHub Pages.

Notes:
- Site is built with semantic HTML, responsive CSS, and minimal JS.
- Social links and email addresses are placeholders; update with real links.
- For a future custom domain, add a root-level `CNAME` file containing the real domain and configure the same domain in GitHub Pages.
- The first FormSubmit message may require approving an activation email sent to the receiving address.
