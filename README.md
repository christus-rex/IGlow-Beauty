# iGlow Beauty

Canonical source repository for **I Glow Beauty Bar** customer proof and portfolio content.

## Current purpose

For now, this project is intentionally focused on being a trusted repository for:

- Customer reviews
- Testimonials
- Before-and-after work comparisons
- Source provenance for imported reviews
- Consent-aware client result photography

The public experience is designed to make the salon's work easy to evaluate rather than function as a generic brochure.

## Seed source

The initial source is the user-provided Google Business Profile share for I Glow Beauty Bar in Fredericksburg, Virginia. Imported review data should remain traceable to its original source.

## Data model

```text
data/
├── reviews.json          # Business rating snapshot + sourced testimonials
├── transformations.json  # Consented before/after result sets
└── sources.json          # Provenance registry for imported material
```

### Review standard

Each review can retain source, rating, reviewer label, quote or summary, service tags, verification status, and featured status.

### Before/after standard

Only publish transformation records when the actual before/after media is available and client consent has been confirmed. Whenever practical, keep lighting, framing, camera distance, and editing consistent so comparisons remain credible.

## Web / app foundation

- Responsive mobile-first interface
- Installable PWA manifest
- Offline-capable service worker
- GitHub Pages deployment workflow
- Framework-free architecture for fast iteration

## Local development

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deployment

A GitHub Pages workflow is included in `.github/workflows/pages.yml`. In repository settings, Pages should use **GitHub Actions** as its deployment source.

## Structure

```text
/
├── index.html
├── manifest.webmanifest
├── sw.js
├── assets/
│   ├── app.js
│   ├── styles.css
│   ├── proof.css
│   └── icon.svg
├── data/
│   ├── reviews.json
│   ├── transformations.json
│   └── sources.json
└── .github/workflows/pages.yml
```

## Status

Review/testimonial repository foundation established August 14, 2026. The first Google-derived business snapshot and testimonial seeds are present. The transformation gallery is intentionally waiting for real, consented client media.

Production publish retried from `main` on August 14, 2026.
