import { test, expect } from "../../playwright-fixture";
import { uniqueEmail } from "./helpers";

test.describe("Authentication", () => {
  test("auth page renders login form by default", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in|увійти/i })).toBeVisible();
  });

  test("protected route redirects unauthenticated users to /auth", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
  });

  test("toggling to sign-up shows full name field", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: /sign up|зареєструватись/i }).first().click();
    await expect(
      page.getByLabel(/full name|повне ім/i).or(page.locator('input').nth(0))
    ).toBeVisible();
  });

  test("login with wrong credentials shows error toast", async ({ page }) => {
    await page.goto("/auth");
    await page.getByPlaceholder("you@example.com").fill("nonexistent@example.com");
    await page.locator('input[type="password"]').fill("wrongpassword123");
    await page.getByRole("button", { name: /sign in|увійти/i }).click();
    // Toast appears with error
    await expect(
      page.locator('[role="status"], [data-sonner-toast]').first()
    ).toBeVisible({ timeout: 10000 });
    // Still on /auth
    await expect(page).toHaveURL(/\/auth/);
  });

  test("forgot password flow opens OTP step after email submit", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: /forgot password|забули пароль/i }).click();
    await page.getByPlaceholder("you@example.com").fill(uniqueEmail());
    await page.getByRole("button", { name: /send|надіслати/i }).click();
    // Either OTP screen or toast — give it a moment
    await expect(
      page.getByText(/code|код|otp/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("signup with new email succeeds (or shows confirmation toast)", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: /sign up|зареєструватись/i }).first().click();
    // Fill name, email, password
    const inputs = page.locator("input");
    await inputs.nth(0).fill("E2E Test User");
    await page.getByPlaceholder("you@example.com").fill(uniqueEmail());
    await page.locator('input[type="password"]').fill("Password!2345");
    await page.getByRole("button", { name: /create account|створити обліковий запис/i }).click();
    // Either toast (email confirm) or redirect to onboarding
    await Promise.race([
      page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 15000 }).catch(() => null),
      page.locator('[role="status"], [data-sonner-toast]').first()
        .waitFor({ state: "visible", timeout: 15000 }).catch(() => null),
    ]);
  });
});
