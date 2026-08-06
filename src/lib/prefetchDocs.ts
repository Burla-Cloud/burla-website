import type { ComponentType } from "react";

// The docs hero disc lives in its own three.js chunk. Loading it through
// Suspense costs ~300ms even when the chunk is cached, because React throttles
// how fast a boundary may swap its fallback for content. So we warm the chunk
// while the current page is idle and hand the docs landing a plain component,
// which lets the disc mount in the same commit as the rest of the page.
let heroComponent: ComponentType | null = null;
let heroPromise: Promise<ComponentType> | null = null;
let appPromise: Promise<unknown> | null = null;

export function prefetchDocsHero() {
  heroPromise ??= import("../docs/DocsGalaxy").then((module) => {
    heroComponent = module.default;
    return module.default;
  });
  return heroPromise;
}

export function loadedDocsHero() {
  return heroComponent;
}

export function prefetchDocsApp() {
  appPromise ??= import("../docs/DocsApp");
  return appPromise;
}
