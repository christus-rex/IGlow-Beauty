# iGlow Beauty

Canonical source repository for the **iGlow Beauty** project.

## Purpose

iGlow Beauty is being established as a mobile-first beauty web experience that can run as a standard website and as an installable Progressive Web App (PWA).

## Foundation

- Responsive, mobile-first web interface
- Installable PWA manifest
- Offline-capable service worker
- GitHub Pages deployment workflow
- Framework-free starter architecture for fast iteration
- Ready to evolve into a larger React/TypeScript or native app architecture if needed

## Local development

Because the starter is static, any local web server can serve it. For example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

> Service workers require HTTPS in production (localhost is allowed for development).

## Deployment

A GitHub Pages workflow is included in `.github/workflows/pages.yml`.

After the first commit is available, open **Repository Settings → Pages** and set the source to **GitHub Actions** if Pages is not already enabled for the repository/account.

## Structure

```text
/
├── index.html
├── manifest.webmanifest
├── sw.js
├── assets/
│   ├── app.js
│   ├── styles.css
│   └── icon.svg
└── .github/workflows/pages.yml
```

## Project status

Initial web/PWA foundation established August 14, 2026.
