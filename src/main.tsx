import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initTheme } from "@/hooks/useTheme";

// Recover from stale-chunk errors after a deploy (cached index.html points to
// an old asset hash). Reload once so the browser fetches the fresh index.html.
function isChunkLoadError(msg: string) {
  return /Importing a module script failed|Failed to fetch dynamically imported module|ChunkLoadError|Loading chunk [\d]+ failed/i.test(
    msg
  );
}
function maybeReloadOnce() {
  const KEY = "__chunk_reload_at";
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last > 10000) {
      sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
    }
  } catch {
    window.location.reload();
  }
}
window.addEventListener("error", (e) => {
  if (isChunkLoadError(String(e?.message || ""))) maybeReloadOnce();
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = String((e as any)?.reason?.message || (e as any)?.reason || "");
  if (isChunkLoadError(msg)) maybeReloadOnce();
});

// Apply persisted theme before render to avoid flash
initTheme();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Defer analytics to idle time so it doesn't compete with initial render.
const loadAnalytics = () => {
  import("@/lib/analytics").then(m => m.initAnalytics()).catch(() => {});
};
const w = window as any;
if (typeof w.requestIdleCallback === "function") {
  w.requestIdleCallback(loadAnalytics, { timeout: 4000 });
} else {
  w.addEventListener("load", () => setTimeout(loadAnalytics, 1500));
}

