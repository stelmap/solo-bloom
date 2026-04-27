import { Page, expect } from "@playwright/test";

export const TEST_EMAIL = process.env.TEST_EMAIL || "";
export const TEST_PASSWORD = process.env.TEST_PASSWORD || "";
export const TEST_USER_ID = process.env.TEST_USER_ID || "";
export const TEST_ACCESS_TOKEN = process.env.TEST_ACCESS_TOKEN || "";
export const SUPABASE_AUTH_STORAGE_KEY = "sb-rxculneqqaziutulnocs-auth-token";

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}+${Date.now()}@example.com`;
}

/**
 * Sign in via the AuthPage form. Requires an already-onboarded seeded account.
 * Skips the test if TEST_EMAIL / TEST_PASSWORD are not provided.
 */
export async function signInWithSeeded(page: Page) {
  if (TEST_USER_ID && TEST_ACCESS_TOKEN) {
    await installRegressionAuth(page);
    await page.goto("/dashboard");
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    return;
  }

  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error(
      "TEST_USER_ID / TEST_ACCESS_TOKEN not set — seeded-account tests require token env vars."
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
  return Boolean(TEST_USER_ID && TEST_ACCESS_TOKEN);
}

export function hasRegressionAuth() {
  return hasSeededAccount();
}

export async function installRegressionAuth(page: Page) {
  if (TEST_USER_ID && TEST_ACCESS_TOKEN) {
    await page.addInitScript(({ userId, accessToken }) => {
      const authState = {
        access_token: accessToken,
        refresh_token: "e2e-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: userId,
          aud: "authenticated",
          role: "authenticated",
          email: "e2e@example.com",
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      };
      localStorage.setItem("sb-e2e-auth-token", JSON.stringify(authState));
      localStorage.setItem("sb-rxculneqqaziutulnocs-auth-token", JSON.stringify(authState));
    }, { userId: TEST_USER_ID, accessToken: TEST_ACCESS_TOKEN });
    return;
  }

  throw new Error("TEST_USER_ID / TEST_ACCESS_TOKEN are required for authenticated regression tests.");
}
