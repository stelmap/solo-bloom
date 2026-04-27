import { Page, expect } from "@playwright/test";

export const TEST_USER_ID = process.env.TEST_USER_ID || "";
export const TEST_ACCESS_TOKEN = process.env.TEST_ACCESS_TOKEN || "";
export const SUPABASE_AUTH_STORAGE_KEY = "sb-rxculneqqaziutulnocs-auth-token";

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}+${Date.now()}@example.com`;
}

/**
 * Install a pre-created session for authenticated E2E tests.
 * Requires TEST_USER_ID / TEST_ACCESS_TOKEN env vars.
 */
export async function signInWithSeeded(page: Page) {
  if (TEST_USER_ID && TEST_ACCESS_TOKEN) {
    await installRegressionAuth(page);
    await page.goto("/dashboard");
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    return;
  }

  throw new Error("TEST_USER_ID / TEST_ACCESS_TOKEN not set — authenticated tests require token env vars.");
}

export async function expectAuthenticated(page: Page) {
  await expect(page).toHaveURL(/\/dashboard/);
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
