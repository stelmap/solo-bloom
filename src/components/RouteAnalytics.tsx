import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { track } from "@/lib/analytics";

/**
 * Fires one `website_page_view` per route change so visits to public pages
 * (landing, guides, checkout, pricing…) are counted in the admin analytics
 * dashboard. Duplicate views of the same path within one page session are
 * skipped to avoid inflating counts on re-renders / query-param churn.
 */
export function RouteAnalytics() {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (lastPath.current === path) return;
    lastPath.current = path;
    track("website_page_view", {
      path,
      page_title: typeof document !== "undefined" ? document.title : undefined,
      source_page: path,
    });
  }, [location.pathname]);

  return null;
}

export default RouteAnalytics;
