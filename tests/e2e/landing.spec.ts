import { test, expect } from "../../playwright-fixture";

test.describe("Landing page", () => {
  test("loads, shows hero and pricing CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/.+/);
    // SoloBizz logo in nav
    await expect(page.getByRole("link", { name: /Solo.*Bizz/i }).first()).toBeVisible();
    // Pricing anchor exists
    await expect(page.locator("#pricing")).toBeVisible({ timeout: 10000 });
  });

  test("language toggle switches EN/UA", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /switch language/i });
    await expect(toggle).toBeVisible();
    const before = (await toggle.textContent())?.trim();
    await toggle.click();
    await expect(toggle).not.toHaveText(before || "");
  });

  test("clicking Get Started navigates to /auth", async ({ page }) => {
    await page.goto("/");
    // Any link that points to /auth in the landing page
    const authLink = page.locator('a[href^="/auth"]').first();
    await authLink.click();
    await expect(page).toHaveURL(/\/auth/);
  });
});
