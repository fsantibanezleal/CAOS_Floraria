import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "katex/dist/katex.min.css";
import { lazy, Suspense } from "react";
const Studio = lazy(() => import("./Studio"));
const LivingExperience = lazy(() => import("./LivingExperience"));
const query = new URLSearchParams(window.location.search);
const archived =
  query.has("archive") ||
  query.has("explore") ||
  query.has("view") ||
  window.location.pathname !== "/";
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Suspense
      fallback={<p role="status">Opening Floraria / Abriendo Floraria…</p>}
    >
      {archived ? (
        <>
          <Studio />
          <a
            className="living-archive-return"
            href="/"
            style={{
              position: "fixed",
              right: 14,
              bottom: 6,
              fontSize: 10,
              padding: "5px 9px",
              borderRadius: 12,
              background: "var(--fs-panel)",
              color: "var(--fs-ink)",
              zIndex: 25,
            }}
          >
            ← Living garden / Jardín vivo
          </a>
        </>
      ) : (
        <LivingExperience />
      )}
    </Suspense>
  </BrowserRouter>,
);
