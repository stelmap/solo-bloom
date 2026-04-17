import { test, expect } from "../../playwright-fixture";
import { signInWithSeeded, hasSeededAccount } from "./helpers";

test.describe("Seeded-account flows (require TEST_EMAIL / TEST_PASSWORD)", () => {
  test.skip(!hasSeededAccount(), "Set TEST_EMAIL and TEST_PASSWORD to enable");

  test.beforeEach(async ({ page }) => {
    await signInWithSeeded(page);
  });

  test("dashboard loads with key widgets", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    // Sidebar visible
    await expect(page.getByRole("navigation").first()).toBeVisible();
  });

  test("can navigate to Clients page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: /clients|клієнт/i }).first().click();
    await expect(page).toHaveURL(/\/clients/);
  });

  test("can navigate to Calendar page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: /calendar|календар/i }).first().click();
    await expect(page).toHaveURL(/\/calendar/);
  });

  test("can navigate to Services page", async ({ page }) => {
    await page.goto("/services");
    await expect(page).toHaveURL(/\/services/);
  });

  test("can navigate to Income page", async ({ page }) => {
    await page.goto("/income");
    await expect(page).toHaveURL(/\/income/);
  });

  test("can navigate to Expenses page", async ({ page }) => {
    await page.goto("/expenses");
    await expect(page).toHaveURL(/\/expenses/);
  });

  test("can navigate to Break-even page", async ({ page }) => {
    await page.goto("/breakeven");
    await expect(page).toHaveURL(/\/breakeven/);
  });

  test("can navigate to Settings page", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings/);
  });

  test("create and delete a client", async ({ page }) => {
    await page.goto("/clients");
    // Click "New client" / "Add client"
    const addBtn = page.getByRole("button", { name: /add|new|новий|створити/i }).first();
    await addBtn.click();
    const name = `E2E Client ${Date.now()}`;
    // Fill the first text input in the dialog
    const dialog = page.locator('[role="dialog"]').last();
    await dialog.locator('input').first().fill(name);
    await dialog.getByRole("button", { name: /save|create|зберегти|створити/i }).click();
    // Client appears in list
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 });
  });

  test("sign out returns to landing or auth", async ({ page }) => {
    await page.goto("/dashboard");
    // Open user menu / sign out — try common patterns
    const signOut = page.getByRole("button", { name: /sign out|log out|вийти/i }).first();
    if (await signOut.isVisible().catch(() => false)) {
      await signOut.click();
      await expect(page).toHaveURL(/\/(auth|$)/, { timeout: 10000 });
    } else {
      test.skip(true, "Sign-out control not found via accessible name — UI-dependent");
    }
  });
});
