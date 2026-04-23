import { test, expect } from "../../playwright-fixture";

/**
 * Critical signed-out flows that should never break.
 * Authenticated flows live in seeded-flows.spec.ts and plans.spec.ts.
 */
test.describe("Critical signed-out flows", () => {
  test("auth page renders sign-in and sign-up tabs", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("privacy and terms pages load", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("h1, h2").first()).toBeVisible();

    await page.goto("/terms");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("unsubscribe page loads without auth", async ({ page }) => {
    await page.goto("/unsubscribe");
    // Page should render some content (form or message) even without a token
    await expect(page.locator("body")).toContainText(/unsubscrib|email/i);
  });

  test("404 page renders for unknown route", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.locator("body")).toContainText(/404|not found/i);
  });

  test("protected route redirects to /auth", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/auth/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test("plans route redirects unauthenticated users to /auth", async ({ page }) => {
    await page.goto("/plans");
    await page.waitForURL(/\/auth/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/auth/);
  });
});
