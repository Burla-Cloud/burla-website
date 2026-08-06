import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

// Each route lives in its own lazy chunk so the landing page doesn't pay for
// the markdown pipeline, and the docs don't pay for the three.js scene.
const App = lazy(() => import("./App.tsx"));
const DocsApp = lazy(() => import("./docs/DocsApp.tsx"));
const BlogApp = lazy(() => import("./blog/BlogApp.tsx"));

// Docs routes manage their own scrolling (anchors, page changes).
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!pathname.startsWith("/docs")) window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

// "/" in dev, "/burla-website" on GitHub project Pages.
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

export function Router() {
  return (
    <BrowserRouter basename={basename}>
      <ScrollReset />
      <Suspense fallback={<div className="min-h-screen bg-void" />}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/blog" element={<BlogApp />} />
          <Route path="/docs/blog/*" element={<Navigate to="/blog" replace />} />
          <Route path="/docs/*" element={<DocsApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
