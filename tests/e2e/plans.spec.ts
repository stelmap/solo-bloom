import { test, expect } from "../../playwright-fixture";
import { hasSeededAccount, signInWithSeeded } from "./helpers";

test.describe("Plans checkout contract", () => {
  test("authenticated checkout sends plan selection, not a raw Stripe price id", async ({ page }) => {
    await page.addInitScript(() => {
      const authState = {
        access_token: "e2e-token",
        refresh_token: "e2e-refresh-token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        token_type: "bearer",
        user: { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "e2e@example.com" },
      };
      localStorage.setItem("sb-rxculneqqaziutulnocs-auth-token", JSON.stringify(authState));
    });

    await page.route("**/functions/v1/check-subscription", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ subscribed: false, on_trial: false }) })
    );

    await page.route("**/rest/v1/**", async (route) => {
      const url = route.request().url();
      const headers = { "content-type": "application/json", "content-range": "0-0/0" };
      if (url.includes("/plans")) {
        return route.fulfill({ status: 200, headers, body: JSON.stringify([
          { id: "solo-id", name: "Solo", code: "solo", description: "Solo plan" },
          { id: "pro-id", name: "Pro", code: "pro", description: "Pro plan" },
        ]) });
      }
      if (url.includes("/plan_prices")) {
        return route.fulfill({ status: 200, headers, body: JSON.stringify([
          { id: "solo-y", plan_id: "solo-id", billing_period: "yearly", price: 132, currency: "EUR", stripe_price_id: "price_solo_y" },
          { id: "pro-y", plan_id: "pro-id", billing_period: "yearly", price: 348, currency: "EUR", stripe_price_id: "price_pro_y" },
        ]) });
      }
      if (url.includes("/rpc/user_has_demo_data")) {
        return route.fulfill({ status: 200, headers, body: "false" });
      }
      return route.fulfill({ status: 200, headers, body: JSON.stringify([]) });
    });

    let checkoutBody: any = null;
    await page.route("**/functions/v1/create-checkout", async (route) => {
      checkoutBody = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: "https://checkout.stripe.test/session" }) });
    });

    await page.goto("/plans");
    await expect(page.getByRole("heading", { name: /choose your plan/i })).toBeVisible();
    await page.getByRole("button", { name: /Pro plan/i }).click();
    const continueButton = page.getByRole("button", { name: /continue/i });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    await expect.poll(() => checkoutBody).toMatchObject({ planCode: "pro", billingPeriod: "yearly", withTrial: true });
    expect(checkoutBody).not.toHaveProperty("priceId");
  });
});

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

  test("checkout sends plan selection, not a raw Stripe price id", async ({ page }) => {
    let checkoutBody: any = null;

    await page.route("**/functions/v1/create-checkout", async (route) => {
      checkoutBody = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://checkout.stripe.test/session" }),
      });
    });

    await page.getByRole("button", { name: /Yearly/ }).click();
    await page.getByText(/^Pro$/i).first().click();
    await page.getByRole("button", { name: /continue/i }).click();

    await expect.poll(() => checkoutBody).toMatchObject({
      planCode: "pro",
      billingPeriod: "yearly",
      withTrial: true,
    });
    expect(checkoutBody).not.toHaveProperty("priceId");
  });
});
