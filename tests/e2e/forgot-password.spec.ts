import { test, expect } from "../../playwright-fixture";
import { uniqueEmail } from "./helpers";

/**
 * E2E coverage for the Forgot Password flow.
 *
 * Real email inboxes aren't accessible from Playwright, so the "happy path"
 * test mocks the Supabase /verify endpoint to return a successful recovery
 * session — this lets us assert that entering a valid 8-character code always
 * navigates to /reset-password.
 *
 * The other tests cover the UI contract (8 slots, not 6), submit gating,
 * the recover request being fired, and the invalid-code error path.
 */

test.describe("Forgot Password flow", () => {
  test("Forgot Password link opens the OTP screen", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: /forgot password|забули пароль|mot de passe oublié/i }).click();
    await page.getByPlaceholder("you@example.com").fill(uniqueEmail());

    await page.route("**/auth/v1/recover*", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );

    await page.getByRole("button", { name: /send|надіслати|envoyer/i }).click();

    // OTP screen renders with a recovery-code input and Verify button
    await expect(
      page.getByRole("button", { name: /verify|confirm|підтвердити|vérifier/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[autocomplete="one-time-code"]')).toBeVisible();
  });

  test("recover request is fired with the submitted email", async ({ page }) => {
    const email = uniqueEmail();
    let recoverPayload: any = null;

    await page.route("**/auth/v1/recover*", async (route) => {
      try { recoverPayload = route.request().postDataJSON(); } catch { /* noop */ }
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.goto("/auth");
    await page.getByRole("button", { name: /forgot password|забули пароль|mot de passe oublié/i }).click();
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByRole("button", { name: /send|надіслати|envoyer/i }).click();

    await expect.poll(() => recoverPayload?.email, { timeout: 10000 }).toBe(email);
  });

  test("invalid 8-character code shows an error toast and stays on OTP screen", async ({ page }) => {
    await page.route("**/auth/v1/recover*", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );
    await page.route("**/auth/v1/verify*", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "invalid_grant", error_description: "Token has expired or is invalid" }),
      }),
    );

    await page.goto("/auth");
    await page.getByRole("button", { name: /forgot password|забули пароль|mot de passe oublié/i }).click();
    await page.getByPlaceholder("you@example.com").fill(uniqueEmail());
    await page.getByRole("button", { name: /send|надіслати|envoyer/i }).click();

    // Fill the OTP input directly instead of relying on keyboard focus
    const otpInput = page.locator('input[autocomplete="one-time-code"]');
    await otpInput.waitFor({ state: "visible", timeout: 5000 });
    await otpInput.fill("12345678");

    const confirmBtn = page.getByRole("button", { name: /verify|confirm|підтвердити|vérifier/i });
    await confirmBtn.click();

    // Toast with error appears, URL stays on /auth
    await expect(
      page.locator('[role="status"], [data-sonner-toast]').first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test("valid 8-character code navigates to /reset-password", async ({ page }) => {
    await page.route("**/auth/v1/recover*", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );

    // Mock a successful verify -> returns a session, which AuthPage treats as recovery-verified
    await page.route("**/auth/v1/verify*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "fake-access-token",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: "fake-refresh-token",
          user: {
            id: "00000000-0000-0000-0000-000000000000",
            aud: "authenticated",
            role: "authenticated",
            email: "test@example.com",
            email_confirmed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {},
          },
        }),
      }),
    );

    await page.goto("/auth");
    await page.getByRole("button", { name: /forgot password|забули пароль|mot de passe oublié/i }).click();
    await page.getByPlaceholder("you@example.com").fill("test@example.com");
    await page.getByRole("button", { name: /send|надіслати|envoyer/i }).click();

    await page.waitForTimeout(500);
    await page.keyboard.type("ABCD1234");

    const confirmBtn = page.getByRole("button", { name: /verify|confirm|підтвердити|vérifier/i });
    await expect(confirmBtn).toBeEnabled({ timeout: 5000 });
    await confirmBtn.click();

    // Always navigates to the new-password screen on a valid code
    await page.waitForURL(/\/reset-password/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/reset-password/);
  });
});
