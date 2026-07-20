import { test, expect } from "@playwright/test";

/**
 * Regression: opening a valid invitation link must reach the welcome step
 * (not the "This link is not available" error). Also confirms the error card
 * still renders when the edge function reports the invitation is missing.
 *
 * We intercept the `agreement-invitation-info` edge function so the test does
 * not require seeded invitation rows or unhashed tokens (only the SHA-256
 * hash of the token is stored server-side).
 */

const FN_URL_RE = /\/functions\/v1\/agreement-invitation-info(\?|$)/;

async function stubInvitationInfo(page: import("@playwright/test").Page, payload: unknown, status = 200) {
  await page.route(FN_URL_RE, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
          "access-control-allow-methods": "POST, OPTIONS",
        },
      });
      return;
    }
    await route.fulfill({
      status,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(payload),
    });
  });
}

test.describe("Public agreement invitation link", () => {
  test("valid token reaches the welcome step with therapist branding and Send code CTA", async ({ page }) => {
    await stubInvitationInfo(page, {
      therapist_name: "Dr. Test Therapist",
      business_name: "Test Practice",
      therapist_avatar_url: "",
      masked_email: "te••••••@example.com",
      agreement_title: "Information agreement",
      revoked: false,
      expired: false,
      already_accepted: false,
    });

    await page.goto("/agreement/e2e-valid-token");

    // Welcome heading is present (the first step we must reach reliably).
    await expect(page.getByRole("heading", { name: "Information agreement" })).toBeVisible({ timeout: 15000 });

    // Therapist branding pulled from profile.
    await expect(page.getByText("Test Practice")).toBeVisible();

    // Masked email is shown, full email never exposed.
    await expect(page.getByText(/te••••••@example\.com/)).toBeVisible();
    await expect(page.getByText(/@example\.com/).first()).toBeVisible();

    // Primary CTA to advance to the OTP step is available.
    await expect(page.getByRole("button", { name: "Send code" })).toBeEnabled();

    // The error card must NOT be rendered on a healthy load.
    await expect(page.getByRole("heading", { name: "This link is not available." })).toHaveCount(0);
  });

  test("missing invitation renders the friendly unavailable card, not a blank page", async ({ page }) => {
    await stubInvitationInfo(page, { error: "not_found" }, 404);

    await page.goto("/agreement/e2e-missing-token");

    await expect(page.getByRole("heading", { name: "This link is not available." })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Send code" })).toHaveCount(0);
  });

  test("edge function network failure surfaces the unavailable card (regression for 'Failed to send a request to the Edge Function')", async ({ page }) => {
    await page.route(FN_URL_RE, (route) => route.abort("failed"));

    await page.goto("/agreement/e2e-network-fail-token");

    await expect(page.getByRole("heading", { name: "This link is not available." })).toBeVisible({ timeout: 15000 });
  });
});
