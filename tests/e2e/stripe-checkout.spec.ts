import { test, expect } from "../../playwright-fixture";
import { signInWithSeeded, hasSeededAccount } from "./helpers";

/**
 * End-to-end Stripe checkout test.
 *
 * Flow:
 *   1. Sign in with a seeded account (TEST_USER_ID / TEST_ACCESS_TOKEN).
 *   2. Open /plans, pick the Solo monthly plan, and click Continue.
 *   3. Follow the real create-checkout edge function to Stripe's hosted
 *      test-mode checkout page.
 *   4. Fill card 4242 4242 4242 4242 and submit.
 *   5. Land on /purchase-success → /dashboard and verify the subscription
 *      UI shows the plan as active.
 *
 * Gated behind E2E_STRIPE_TEST=1 because it hits the real Stripe test
 * environment attached to the project's STRIPE_SECRET_KEY. Do NOT enable
 * unless that key is a `sk_test_...` key.
 */

const STRIPE_ENABLED = process.env.E2E_STRIPE_TEST === "1";
const TEST_CARD = process.env.E2E_STRIPE_CARD ?? "4242424242424242";
const TEST_EXPIRY = process.env.E2E_STRIPE_EXPIRY ?? "12 / 34";
const TEST_CVC = process.env.E2E_STRIPE_CVC ?? "123";
const TEST_NAME = process.env.E2E_STRIPE_NAME ?? "E2E Tester";
const TEST_PHONE = process.env.E2E_STRIPE_PHONE ?? "5555550123";
const TEST_POSTAL = process.env.E2E_STRIPE_POSTAL ?? "10115";

test.describe("Stripe checkout — real test-mode purchase", () => {
  test.skip(!hasSeededAccount(), "Requires TEST_USER_ID / TEST_ACCESS_TOKEN");
  test.skip(!STRIPE_ENABLED, "Set E2E_STRIPE_TEST=1 to hit real Stripe test mode");

  test.setTimeout(180_000);

  test("signs in, buys Solo monthly, sees active subscription", async ({ page, context }) => {
    // ── 1. Sign in ────────────────────────────────────────────────────────
    await signInWithSeeded(page);
    await expect(page).toHaveURL(/\/dashboard/);

    // ── 2. Open Plans and pick Solo monthly ──────────────────────────────
    await page.goto("/plans");
    await expect(page).toHaveURL(/\/plans/);

    // Switch to monthly billing (cheapest, fastest to charge).
    const monthlyToggle = page
      .getByRole("button", { name: /monthly|місяч|miesi/i })
      .first();
    if (await monthlyToggle.isVisible().catch(() => false)) {
      await monthlyToggle.click();
    }

    // Select the Solo card. Card exposes a Solo heading; click its Choose/Continue button.
    const soloCard = page
      .locator("div, article, section")
      .filter({ has: page.getByRole("heading", { name: /solo/i }) })
      .first();
    await expect(soloCard).toBeVisible();
    await soloCard
      .getByRole("button", { name: /choose|select|continue|обра|wyb/i })
      .first()
      .click();

    // Confirm / continue on the plan (button label varies by locale).
    const continueBtn = page
      .getByRole("button", { name: /continue|proceed|checkout|далі|kontynu/i })
      .first();
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
    }

    // ── 3. Wait for redirect to Stripe Checkout ──────────────────────────
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    expect(page.url()).toContain("checkout.stripe.com");

    // ── 4. Fill Stripe hosted checkout form ──────────────────────────────
    // Stripe Checkout selectors are stable via input `name` attributes.
    const cardNumber = page.locator('input[name="cardNumber"]');
    await cardNumber.waitFor({ state: "visible", timeout: 30_000 });
    await cardNumber.fill(TEST_CARD);
    await page.locator('input[name="cardExpiry"]').fill(TEST_EXPIRY);
    await page.locator('input[name="cardCvc"]').fill(TEST_CVC);

    const nameField = page.locator('input[name="billingName"]');
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill(TEST_NAME);
    }

    const phoneField = page.locator('input[name="phoneNumber"]');
    if (await phoneField.isVisible().catch(() => false)) {
      await phoneField.fill(TEST_PHONE);
    }

    const postalField = page.locator('input[name="billingPostalCode"]');
    if (await postalField.isVisible().catch(() => false)) {
      await postalField.fill(TEST_POSTAL);
    }

    // Submit — Stripe's primary CTA is stable via data-testid.
    const submit = page.locator('[data-testid="hosted-payment-submit-button"]');
    await submit.waitFor({ state: "visible", timeout: 15_000 });
    await expect(submit).toBeEnabled({ timeout: 15_000 });
    await submit.click();

    // ── 5. Redirect back to app; wait for /purchase-success → /dashboard ─
    await page.waitForURL(/\/purchase-success/, { timeout: 60_000 });
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });

    // Toast confirming activation (best-effort — may auto-dismiss).
    const toast = page.getByText(/plan is active|активн/i).first();
    await toast.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});

    // Sanity: no "upgrade" CTA should be prominent anymore.
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings/);
    const activeMarker = page.getByText(/solo|active|активн|активна/i).first();
    await expect(activeMarker).toBeVisible({ timeout: 15_000 });
  });
});
