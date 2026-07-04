import { useEffect, useState } from "react";

const REPO_API = "https://api.github.com/repos/Burla-Cloud/burla";

const FALLBACK_STARS = 252;
const FALLBACK_FORKS = 11;

interface RepoStats {
  stars: number;
  forks: number;
}

let cache: RepoStats | null = null;
let inflight: Promise<RepoStats | null> | null = null;

function fetchRepoStats(): Promise<RepoStats | null> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetch(REPO_API, { headers: { Accept: "application/vnd.github+json" } })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data) return null;
      const stats: RepoStats = {
        stars:
          typeof data.stargazers_count === "number"
            ? data.stargazers_count
            : FALLBACK_STARS,
        forks:
          typeof data.forks_count === "number"
            ? data.forks_count
            : FALLBACK_FORKS,
      };
      cache = stats;
      return stats;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Single source of truth for live repo stats across the site. Caches the
 * first successful response in module-scope so we never hammer the GitHub
 * API on a multi-section page render. Falls back to last-known values
 * (252 / 11) when the API is unreachable.
 */
export function useRepoStats(): RepoStats {
  const [stats, setStats] = useState<RepoStats>(
    cache ?? { stars: FALLBACK_STARS, forks: FALLBACK_FORKS },
  );

  useEffect(() => {
    let cancelled = false;
    fetchRepoStats().then((s) => {
      if (cancelled || !s) return;
      setStats(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}

/** Compact human-readable star count, e.g. 1234 -> "1.2k", 252 -> "252". */
export function formatStars(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(0)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}
