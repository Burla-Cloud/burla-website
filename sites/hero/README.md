# Cosmic Hero

Full scrollytelling landing page for Burla: "The simplest way to process massive amounts of data."

A scroll-driven WebGL zoom opens on one line of Python and pulls back into a galaxy of 10,000 machines, then descends through a cloud deck into a light "sky" theme for the narrative page: what Burla is and how it works (`pip install burla` + the one-function API), a 12-tile grid of real example jobs linked to the docs, three feature blocks (efficiency with the $14.20/$32/$48 cost bars, simplicity + agent rules snippet, speed/scale with an igniting VM wall), FAQ, and final CTA. Theme colors are CSS variables (`:root` = space, `.theme-day` = sky) flipped by the `theme-day` wrapper in `App.tsx`.

**Live: [burla-cloud.github.io/burla-website/hero](https://burla-cloud.github.io/burla-website/hero/)**

All copy and demo numbers live in `src/content.ts`. The galaxy is `src/three/Galaxy.tsx` (instanced gl.POINTS + custom shaders); the scroll choreography is `src/sections/HeroAct.tsx`.

Note: hero overlay opacity/transforms are written to the DOM imperatively from one scroll subscription. Do not move them back into framer-motion `style` MotionValues; framer converts scroll-linked styles into WAAPI animations, which desync with a `position: sticky` target.

## Stack

- Vite + React 19 + TypeScript
- three.js via @react-three/fiber and @react-three/postprocessing
- Tailwind CSS, Framer Motion
- Fonts: Bricolage Grotesque + IBM Plex Mono

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
