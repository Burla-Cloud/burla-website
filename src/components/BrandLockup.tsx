import { Link, useLocation } from "react-router-dom";
import { NAV } from "../content";

// The full Burla lockup, proportioned from the brand logo: a stair of three
// squares standing on the baseline (stair height = cap height, squares are a
// third of it), the wordmark in Poppins Bold, then the wide underscore block
// sitting on the baseline. Everything shares one color.
export function BrandLockup() {
  const { pathname } = useLocation();
  return (
    <Link
      to="/"
      onClick={() => {
        if (pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className="flex items-baseline gap-[5px] font-logo text-[21px] font-bold tracking-tight text-accent text-shadow-soft"
    >
      <svg
        viewBox="0 0 12 18"
        className="h-4 w-auto"
        fill="currentColor"
        aria-hidden="true"
      >
        <rect x="0" y="0" width="6" height="6" />
        <rect x="6" y="6" width="6" height="6" />
        <rect x="0" y="12" width="6" height="6" />
      </svg>
      {NAV.wordmark}
      <svg
        viewBox="0 0 12 6"
        className="h-[5px] w-auto"
        fill="currentColor"
        aria-hidden="true"
      >
        <rect width="12" height="6" />
      </svg>
    </Link>
  );
}
