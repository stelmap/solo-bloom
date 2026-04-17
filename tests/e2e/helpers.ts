import { Page, expect } from "@playwright/test";

export const TEST_EMAIL = process.env.TEST_EMAIL || "";
export const TEST_PASSWORD = process.env.TEST_PASSWORD || "";

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}+${Date.now()}@example.com`;
}

/**
 * Sign in via the AuthPage form. Requires an already-onboarded seeded account.
 * Skips the test if TEST_EMAIL / TEST_PASSWORD are not provided.
 */
export async function signInWithSeeded(page: Page) {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error(
      "TEST_EMAIL / TEST_PASSWORD not set — seeded-account tests require these env vars."
    );
  }
  await page.goto("/auth");
  await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /sign in|увійти/i }).click();
  // Wait for redirect off /auth (to /dashboard or /onboarding)
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 15000 });
}

export async function expectAuthenticated(page: Page) {
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
}

export function hasSeededAccount() {
  return Boolean(TEST_EMAIL && TEST_PASSWORD);
}
