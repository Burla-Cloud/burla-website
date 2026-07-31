# burla-website

All candidate Burla landing pages in one repo, hosted side by side on GitHub Pages.

**Hub: [burla-cloud.github.io/burla-website](https://burla-cloud.github.io/burla-website/)**

| Path | Site | Formerly |
|---|---|---|
| [`/landing/`](https://burla-cloud.github.io/burla-website/landing/) | Product landing page + full docs site (Astro) | [`landing-page`](https://github.com/Burla-Cloud/landing-page) |
| [`/gtm/`](https://burla-cloud.github.io/burla-website/gtm/) | Enterprise GTM site: utilization pitch, pilot process, pricing (Vite + React) | [`burla-gtm-site`](https://github.com/Burla-Cloud/burla-gtm-site) |
| [`/agents/`](https://burla-cloud.github.io/burla-website/agents/) | Burla as the agent-native distributed Python runtime (Vite + React) | [`burla-for-agents`](https://github.com/Burla-Cloud/burla-for-agents) |
| [`/hero/`](https://burla-cloud.github.io/burla-website/hero/) | "Simplest way to process massive data" scrollytelling page with cosmic-zoom hero (Vite + React + three.js) | `landing-hero` branch of [`burla`](https://github.com/Burla-Cloud/burla) |

The root `index.html` is a small hub page linking to the three variants.

## Layout

```
index.html        hub page served at the site root
sites/landing/    Astro app (docs content is pulled from Burla-Cloud/user-docs at build time)
sites/gtm/        Vite + React app
sites/agents/     Vite + React app
sites/hero/       Vite + React + three.js app (base path set via VITE_BASE env var)
```

## Local dev

Each site is its own npm project:

```bash
cd sites/gtm && npm install && npm run dev      # http://127.0.0.1:5174/burla-website/gtm/
cd sites/agents && npm install && npm run dev   # http://127.0.0.1:5173/burla-website/agents/
```

The landing site needs a checkout of [`user-docs`](https://github.com/Burla-Cloud/user-docs) and a symlink for its assets:

```bash
cd sites/landing
npm install
ln -snf /path/to/user-docs/.gitbook/assets public/gitbook-assets
USER_DOCS_PATH=/path/to/user-docs npm run dev
```

## Deploy

Every push to `main` builds all three sites and deploys them to GitHub Pages via
`.github/workflows/deploy.yml`. Vite base paths are set in each site's `vite.config.ts`;
the landing site's base path comes from `SITE_BASE_PATH` in the workflow.
