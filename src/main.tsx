import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initAnalytics } from "@/lib/analytics";
import { initTheme } from "@/hooks/useTheme";

// Apply persisted theme before render to avoid flash
initTheme();

// Friendly fallback: if a visitor lands on the bare apex (solo-bizz.com) and the
// hosting-level redirect hasn't taken effect yet, route them to the update page
// instead of showing a broken/blank app shell. Skips when already on /server-update.
if (
  typeof window !== "undefined" &&
  window.location.hostname === "solo-bizz.com" &&
  window.location.pathname !== "/server-update"
) {
  window.location.replace("/server-update");
}

// Initialize PostHog analytics (no-op outside production hosts)
initAnalytics();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
