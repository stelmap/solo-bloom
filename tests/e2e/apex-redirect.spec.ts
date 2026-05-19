import { test, expect, request } from "@playwright/test";

/**
 * Verifies the apex domain solo-bizz.com permanently redirects to
 * https://www.solo-bizz.com and that the canonical host serves the app.
 *
 * Skipped automatically when running against a non-production base URL
 * (e.g. local Vite preview) since the redirect lives at the hosting layer.
 */
const APEX_HTTPS = "https://solo-bizz.com/";
const APEX_HTTP = "http://solo-bizz.com/";
const CANONICAL = "https://www.solo-bizz.com/";

const shouldRun =
  process.env.RUN_APEX_REDIRECT_TEST === "1" ||
  (process.env.PLAYWRIGHT_BASE_URL ?? "").includes("solo-bizz.com");

test.describe("Apex domain redirect", () => {
  test.skip(!shouldRun, "Set RUN_APEX_REDIRECT_TEST=1 to run against production DNS.");

  for (const url of [APEX_HTTPS, APEX_HTTP]) {
    test(`${url} -> ${CANONICAL} (3xx)`, async () => {
      const ctx = await request.newContext({ ignoreHTTPSErrors: true });
      const res = await ctx.get(url, { maxRedirects: 0 });
      expect([301, 302, 307, 308]).toContain(res.status());
      const location = res.headers()["location"];
      expect(location).toBeTruthy();
      const target = new URL(location!, url);
      expect(target.hostname).toBe("www.solo-bizz.com");
      expect(target.protocol).toBe("https:");
      await ctx.dispose();
    });
  }

  test("canonical host serves the app (200 + HTML)", async () => {
    const ctx = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await ctx.get(CANONICAL);
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/<!doctype html/i);
    expect(body).toMatch(/<div id="root"/i);
    await ctx.dispose();
  });
});
