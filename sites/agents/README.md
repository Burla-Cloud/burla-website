# Burla for Agents

Marketing site for [Burla](https://burla.dev), the open-source compute platform you give to your AI agent so it can run massive data pipelines in your cloud.

**Live: [burla-cloud.github.io/burla-website/agents](https://burla-cloud.github.io/burla-website/agents/)**

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS with a custom Burla design system
- Framer Motion for entry animations
- Deployed to GitHub Pages on every push to `main`

## Local dev

```bash
npm install
npm run dev
```

The dev server runs on http://127.0.0.1:5173.

## Build

```bash
npm run build
```

Outputs the static site to `dist/`. The deploy workflow at the repo root
(`.github/workflows/deploy.yml`) runs the same build and publishes to GitHub Pages.

## Project structure

```
src/
  App.tsx                    section composition
  index.css                  global tokens and Tailwind layers
  components/                Logo, CodeBlock, Terminal, VmGrid, Reveal, Counter
  sections/                  one file per page section
  lib/                       shared helpers
public/                      favicon and static assets
tailwind.config.js           color palette, typography, animation tokens
```

## Contact

- Email jake@burla.dev
- File a bug or request: [GitHub issues](https://github.com/Burla-Cloud/burla-website/issues)
