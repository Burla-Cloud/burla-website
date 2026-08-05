# burla-website

Burla's cosmic scrollytelling landing page, plus the full documentation at `/docs`.

**Site: [burla-cloud.github.io/burla-website](https://burla-cloud.github.io/burla-website/)**

## Layout

This repository root is a Vite, React, and three.js app. Routing is client-side
(react-router): `/` is the landing page and `/docs/*` is the docs section.

Docs pages are markdown in `src/docs/content/`, rendered with react-markdown and
listed in the sidebar via `src/docs/registry.ts`. Their images/videos live in
`public/docs-assets/`. To re-import pages from the GitBook repo (`../user-docs`),
run `node scripts/port-docs.mjs`, which converts GitBook syntax targets, rewrites
links, and compresses large assets (PNG→webp, GIF→mp4, needs `ffmpeg`).

## Local dev

```bash
npm install
npm run dev
```

## Deploy

Every push to `main` builds the site and deploys it to GitHub Pages via
`.github/workflows/deploy.yml`.
