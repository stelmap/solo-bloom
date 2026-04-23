import { test, expect } from "../../playwright-fixture";
import { hasSeededAccount, signInWithSeeded } from "./helpers";

/**
 * Regression coverage for the Plans page.
 * Most assertions require a signed-in user; we skip when no seeded account is
 * configured so CI without secrets stays green.
 */
test.describe("Plans page", () => {
  test.skip(!hasSeededAccount(), "Requires TEST_EMAIL / TEST_PASSWORD env vars");

  test.beforeEach(async ({ page }) => {
    await signInWithSeeded(page);
    await page.goto("/plans");
    await page.waitForLoadState("networkidle");
  });

  test("renders Solo and Pro plan cards", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /choose your plan/i })).toBeVisible();
    await expect(page.getByText(/^Solo$/i).first()).toBeVisible();
    await expect(page.getByText(/^Pro$/i).first()).toBeVisible();
  });

  test("shows 7-day free trial banner", async ({ page }) => {
    await expect(page.getByText(/7-day free trial/i)).toBeVisible();
  });

  test("billing period toggle switches displayed prices", async ({ page }) => {
    const monthly = page.getByRole("button", { name: /^Monthly$/ });
    const yearly = page.getByRole("button", { name: /Yearly/ });
    await expect(yearly).toBeVisible();

    await monthly.click();
    await expect(page.getByText(/\/\s*month/i).first()).toBeVisible();

    await yearly.click();
    await expect(page.getByText(/\/\s*year/i).first()).toBeVisible();
  });

  test("Continue button is disabled until a plan is selected", async ({ page }) => {
    const cta = page.getByRole("button", { name: /continue/i });
    await expect(cta).toBeDisabled();

    // Click the Pro card
    await page.getByText(/^Pro$/i).first().click();
    await expect(cta).toBeEnabled();
  });
});
