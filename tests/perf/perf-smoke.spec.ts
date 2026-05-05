import { test, expect } from "@playwright/test";

/**
 * Performance smoke test against the production build.
 * Runs a Playwright + CDP perf trace on key public pages, asserting:
 *   - First Contentful Paint (FCP) under budget
 *   - DOMContentLoaded under budget
 *
 * Budgets target headless Chromium on a CI runner. They are intentionally
 * loose to catch big regressions, not micro-fluctuations.
 */

const BUDGETS = {
  fcpMs: 2500,
  dclMs: 3500,
};

const PAGES = ["/", "/plans", "/auth"];

async function measure(page: import("@playwright/test").Page, url: string) {
  await page.goto(url, { waitUntil: "networkidle" });
  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null;
    return {
      fcp,
      dcl: nav ? nav.domContentLoadedEventEnd : null,
      load: nav ? nav.loadEventEnd : null,
    };
  });
}

for (const path of PAGES) {
  test(`perf smoke: ${path} meets FCP/DCL budgets`, async ({ page }) => {
    const m = await measure(page, path);
    console.log(`[perf] ${path}`, m);
    expect(m.fcp, "FCP recorded").not.toBeNull();
    expect(m.fcp!).toBeLessThan(BUDGETS.fcpMs);
    if (m.dcl !== null) expect(m.dcl).toBeLessThan(BUDGETS.dclMs);
  });
}
