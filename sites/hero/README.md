# Cosmic Hero

Cinematic landing hero for Burla: a three.js cosmic zoom behind "One function call. Ten thousand machines." Hero copy lives in `src/content.ts`.

**Live: [burla-cloud.github.io/burla-website/hero](https://burla-cloud.github.io/burla-website/hero/)**

Originally built on the `landing-hero` branch of [`Burla-Cloud/burla`](https://github.com/Burla-Cloud/burla) as a standalone Vite app.

## Stack

- Vite + React 19 + TypeScript
- three.js via @react-three/fiber, drei, and postprocessing
- Tailwind CSS, Framer Motion

## Local dev

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The base path comes from the `VITE_BASE` env var (defaults to `/`). The deploy
workflow at the repo root builds with `VITE_BASE=/burla-website/hero/`.
