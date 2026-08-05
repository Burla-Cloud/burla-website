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

Production is `https://burla.dev`, served by nginx from `/var/www/burla` on the
`burla-website` EC2 instance in the `burla-prod` AWS account (`us-east-1`).

Build with `npm ci && npm run build`, upload the `dist/` artifact to
`s3://burla-website-deploy-018789813546-us-east-1/releases/`, then deploy it to
the instance through SSM. GitHub Pages must remain disabled for this repository.
