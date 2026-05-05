import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAnalytics } from "@/lib/analytics";
import { initTheme } from "@/hooks/useTheme";

// Apply persisted theme before render to avoid flash
initTheme();

// Initialize PostHog analytics (no-op outside production hosts)
initAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
