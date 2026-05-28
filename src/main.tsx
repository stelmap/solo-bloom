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
function hardReloadBustingCache() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("_r", Date.now().toString(36));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}
function maybeReloadOnce() {
  const KEY = "__chunk_reload_at";
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    // Allow up to 2 recovery reloads within 60s before giving up,
    // so a single stale cache layer can't strand the user on a blank screen.
    const count = Number(sessionStorage.getItem(KEY + "_n") || 0);
    if (Date.now() - last > 60000) {
      sessionStorage.setItem(KEY + "_n", "0");
    }
    if (count >= 2) return;
    sessionStorage.setItem(KEY, String(Date.now()));
    sessionStorage.setItem(KEY + "_n", String(count + 1));
    hardReloadBustingCache();
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
// After a successful boot, clear the recovery counter so future stale-chunk
// errors get a fresh budget of reload attempts.
window.addEventListener("load", () => {
  setTimeout(() => {
    try {
      sessionStorage.removeItem("__chunk_reload_at");
      sessionStorage.removeItem("__chunk_reload_at_n");
    } catch {}
  }, 3000);
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

