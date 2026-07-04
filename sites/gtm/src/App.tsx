import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Landing } from "./pages/Landing";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </HashRouter>
  );
}
