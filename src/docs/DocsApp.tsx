import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { DOCS_TABS, findDocPage, findDocRedirect, findDocTab } from "./registry";
import type { DocGroup, DocTab } from "./registry";
import { DocPage } from "./DocPage";
import { Toc } from "./Toc";
import "./docs.css";

// Height of the site navbar. The sidebar and toc rails stick just below it.
// The sidebar's width lives in docs.css as --docs-sidebar-w, which the navbar
// also reserves for the brand so the first tab starts at the divider.
const NAV_H = 74;

// ---------------------------------------------------------------------------
// Top tabs (rendered inside the site navbar)
// ---------------------------------------------------------------------------

function DocsTabs({ active }: { active?: DocTab }) {
  return (
    <nav
      aria-label="Docs sections"
      className="hidden items-center gap-6 min-[1152px]:flex"
    >
      {DOCS_TABS.map((tab) => {
        const isActive = tab.label === active?.label;
        return (
          <Link
            key={tab.label}
            to={tab.to}
            aria-current={isActive ? "page" : undefined}
            // -my-4/py-4 stretches the link to the navbar's full height so the
            // active underline can sit on the navbar's bottom edge.
            className={`relative -my-4 flex items-center whitespace-nowrap py-4 font-mono text-[14px] font-medium transition-colors ${
              isActive ? "text-accent" : "text-ice/70 hover:text-ice"
            }`}
          >
            {tab.label}
            <span
              aria-hidden
              className={`absolute inset-x-0 bottom-0 h-[2px] ${
                isActive ? "bg-accent" : "bg-transparent"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Left sidebar: the active tab's tree, always expanded
// ---------------------------------------------------------------------------

/** One sidebar row. Group headings sit at the outer indent, pages one in. */
function SidebarRow({
  to,
  label,
  active,
  heading = false,
  onNavigate,
}: {
  to: string;
  label: string;
  active: boolean;
  heading?: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`block border-l-2 py-2 pr-3 text-[14px] leading-5 transition-colors ${
        heading ? "pl-4" : "pl-8"
      } ${
        active
          ? "border-accent bg-white/[0.06] text-accent"
          : `border-transparent hover:bg-white/[0.03] hover:text-ink ${
              heading ? "font-medium text-ice" : "text-inkFaint"
            }`
      }`}
    >
      {label}
    </Link>
  );
}

function SidebarGroup({
  group,
  route,
  hash,
  onNavigate,
}: {
  group: DocGroup;
  route: string;
  hash: string;
  onNavigate: () => void;
}) {
  return (
    <div>
      {group.route ? (
        <SidebarRow
          to={group.route}
          label={group.label}
          // A heading that links to the page it documents stays highlighted
          // while you read that page, unless the same route is also one of its
          // child items (as with example category headings).
          active={
            route === group.route &&
            !hash &&
            !group.items.some((item) => item.to.split("#")[0] === group.route)
          }
          heading
          onNavigate={onNavigate}
        />
      ) : (
        <p className="border-l-2 border-transparent py-2 pl-4 pr-3 text-[14px] font-medium leading-5 text-ice">
          {group.label}
        </p>
      )}
      {group.items.map((item) => {
        const [itemRoute, itemHash = ""] = item.to.split("#");
        const active = route === itemRoute && hash === itemHash;
        return (
          <SidebarRow
            key={item.to}
            to={item.to}
            label={item.label}
            active={active}
            onNavigate={onNavigate}
          />
        );
      })}
    </div>
  );
}

function Sidebar({
  tab,
  route,
  hash,
  onNavigate,
}: {
  tab: DocTab;
  route: string;
  hash: string;
  onNavigate: () => void;
}) {
  return (
    <nav aria-label="Docs pages" className="space-y-6">
      {tab.groups.map((group) => (
        <SidebarGroup
          key={group.label}
          group={group}
          route={route}
          hash={hash}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------

export default function DocsApp() {
  const location = useLocation();
  const route = location.pathname.replace(/\/+$/, "") || "/docs";
  const hash = decodeURIComponent(location.hash.replace(/^#/, ""));
  const page = findDocPage(route);
  const tab = findDocTab(route);
  const redirect = findDocRedirect(route);
  const isCoverPage = route === "/docs/examples";
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    // New page: jump to the top (or to the anchor once it exists).
    if (location.hash) {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      el?.scrollIntoView({ behavior: "instant", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location.pathname, location.hash]);

  useEffect(() => {
    document.title = page ? `${page.nav} · Burla` : "Documentation · Burla";
  }, [page]);

  if (redirect) return <Navigate to={redirect} replace />;

  // The docs have no landing page: /docs (and anything unknown) opens the
  // Getting Started page.
  if (!page || !tab) return <Navigate to="/docs/get-started" replace />;

  return (
    <div className="grain relative min-h-screen bg-[#0a141e] text-ink">
      {/* Quiet static backdrop in place of the landing page's starfield. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(1100px 520px at 78% -8%, rgba(126,203,221,0.08), transparent 62%), radial-gradient(900px 480px at -12% 8%, rgba(42,127,150,0.075), transparent 60%)",
        }}
      />
      <Nav sections={<DocsTabs active={tab} />} />

      {/* Mobile: current-page bar that opens the docs menu. */}
      <div
        className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0a141e]/95 backdrop-blur min-[1152px]:hidden"
        style={{ paddingTop: NAV_H }}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex w-full items-center gap-3 px-5 py-3 text-left font-mono text-[13px] text-ice sm:px-8"
        >
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="h-4 w-4 text-accent"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            strokeLinecap="round"
          >
            <path d="M2.5 4h11M2.5 8h11M2.5 12h7" />
          </svg>
          <span className="truncate">
            {tab.label}
            <span className="mx-2 text-inkFaint">/</span>
            <span className="text-inkDim">{page.nav}</span>
          </span>
        </button>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 min-[1152px]:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeMenu}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-[310px] max-w-[86vw] overflow-y-auto border-r border-white/10 bg-[#0e1a26] py-5">
            <div className="mb-4 flex items-center justify-between px-4">
              <span className="font-mono text-[11px] uppercase tracking-eyebrow text-inkFaint">
                Documentation
              </span>
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Close docs menu"
                className="rounded-md p-1.5 text-inkFaint transition-colors hover:bg-white/[0.05] hover:text-ink"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="m3.5 3.5 9 9m0-9-9 9" />
                </svg>
              </button>
            </div>
            {/* Tabs live in the navbar on desktop, so the drawer carries them
                on mobile. */}
            <div className="mb-5 border-y border-white/[0.07] py-2">
              {DOCS_TABS.map((t) => (
                <Link
                  key={t.label}
                  to={t.to}
                  onClick={closeMenu}
                  className={`block border-l-2 py-2 pl-4 pr-3 font-mono text-[13px] transition-colors ${
                    t.label === tab.label
                      ? "border-accent bg-white/[0.06] text-accent"
                      : "border-transparent text-ice/75 hover:text-ice"
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
            <Sidebar tab={tab} route={route} hash={hash} onNavigate={closeMenu} />
          </div>
        </div>
      )}

      <div
        // Modal's outer frame leaves a fixed 16px viewport gutter. Inside it,
        // the responsive sidebar track consumes 2/10 of the width (minimum
        // 256px), then becomes 352px at 2xl.
        className="relative z-10 mx-4 pb-24 lg:pb-32"
        style={{ paddingTop: NAV_H }}
      >
        <div className="lg:grid lg:grid-cols-[var(--docs-sidebar-w)_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div
              className="sticky overflow-y-auto pb-12 pr-2 [scrollbar-width:thin]"
              style={{ top: NAV_H, maxHeight: `calc(100vh - ${NAV_H}px)`, paddingTop: 20 }}
            >
              <Sidebar tab={tab} route={route} hash={hash} onNavigate={closeMenu} />
            </div>
          </aside>

          {/* The right region centers a capped 1200px article/rail grid.
              Once capped, spare width appears only on its left. This keeps
              article → rail at 40px while sidebar → article grows. */}
          <div className="flex min-w-0 justify-center lg:border-l lg:border-white/[0.08]">
            <div
              className={`w-full max-w-[1200px] min-w-0 lg:pl-8 ${
                isCoverPage
                  ? ""
                  : "grid lg:grid-cols-[minmax(0,8fr)_minmax(0,3fr)] lg:gap-4"
              }`}
            >
              <main className="min-w-0 pb-12 pt-6 lg:pt-10">
                <DocPage route={route} />
              </main>

              {!isCoverPage && (
                <aside className="hidden pl-6 lg:block">
                  <div
                    className="sticky overflow-y-auto pb-12 [scrollbar-width:thin]"
                    style={{
                      top: NAV_H,
                      maxHeight: `calc(100vh - ${NAV_H}px)`,
                      paddingTop: 40,
                    }}
                  >
                    <Toc route={route} title={page.nav} />
                  </div>
                </aside>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
