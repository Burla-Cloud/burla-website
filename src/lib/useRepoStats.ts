import { useEffect, useState } from "react";

const REPO_API = "https://api.github.com/repos/Burla-Cloud/burla";

const FALLBACK_STARS = 252;

let cache: number | null = null;
let inflight: Promise<number | null> | null = null;

function fetchStars(): Promise<number | null> {
  if (cache !== null) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetch(REPO_API, { headers: { Accept: "application/vnd.github+json" } })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data || typeof data.stargazers_count !== "number") return null;
      cache = data.stargazers_count;
      return cache;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Live GitHub star count, cached in module scope so the API is hit at most
 * once per page load. Falls back to the last-known count while loading or
 * when the API is unreachable.
 */
export function useStars(): number {
  const [stars, setStars] = useState<number>(cache ?? FALLBACK_STARS);

  useEffect(() => {
    let cancelled = false;
    fetchStars().then((s) => {
      if (!cancelled && s !== null) setStars(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return stars;
}

/** Compact human-readable star count, e.g. 1234 -> "1.2k", 252 -> "252". */
export function formatStars(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(0)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}
