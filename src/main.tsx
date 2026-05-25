import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initTheme } from "@/hooks/useTheme";

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
if ("requestIdleCallback" in window) {
  (window as any).requestIdleCallback(loadAnalytics, { timeout: 4000 });
} else {
  window.addEventListener("load", () => setTimeout(loadAnalytics, 1500));
}

