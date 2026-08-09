// Each route is prerendered with its own <link rel="canonical">, but the SPA
// swaps routes without a page load, so the tag has to follow the router.
// Google indexes the rendered DOM, and a stale canonical would point every
// crawled page back at whichever URL was fetched first.

const ORIGIN = "https://burla.dev";

export function setCanonical(pathname: string) {
  if (typeof document === "undefined") return;
  const path = pathname.replace(/\/+$/, "") || "/";
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = `${ORIGIN}${path}`;
}
