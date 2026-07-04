# Burla GTM Site

Enterprise marketing site for [Burla](https://www.burla.dev), the dynamic hardware utilization layer that makes large data pipelines run near full cluster utilization and finish faster.

**Live: [burla-cloud.github.io/burla-website/gtm](https://burla-cloud.github.io/burla-website/gtm/)**

## What's here

- A landing page: what we do, the utilization problem, real pipeline cost comparisons, the enterprise pilot process, outcome-based pricing, and book-a-call.
- An About page at `/#/about`.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS (shared Burla design system, deep-cyan accent)
- React Router (HashRouter, so routing works on GitHub Pages)
- Deployed to GitHub Pages on every push to `main`

## Local dev

```bash
npm install
npm run dev
```

Dev server runs at http://127.0.0.1:5174/burla-website/gtm/.

## Build

```bash
npm run build
```

Outputs the static site to `dist/`. The workflow at the repo root
(`.github/workflows/deploy.yml`) runs the same build and publishes to GitHub Pages.

## Structure

```
src/
  App.tsx              router (HashRouter): / and /about
  pages/               Landing, About
  sections/            Nav, Hero, WhatWeDo, Problem, PipelineCompare,
                       PilotProcess, Pricing, BookCall, Footer
  components/          ClusterUtilization, Logo, Reveal
  lib/                 links (book-a-call target), useRepoStats
public/                favicon
tailwind.config.js     palette, typography, animation tokens
```

## Notes

- Pipeline cost figures are modeled, directional estimates. Real numbers are measured during the pilot.
- Book-a-call buttons point to https://cal.com/jakez/burla.

## Contact

- Book a call: https://cal.com/jakez/burla
- Email: jake@burla.dev
