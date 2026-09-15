import { test, expect } from "../../playwright-fixture";
import { signInWithSeeded, hasSeededAccount } from "./helpers";

/**
 * End-to-end Paddle checkout test (sandbox).
 *
 * Flow:
 *   1. Sign in with a seeded account (TEST_USER_ID / TEST_ACCESS_TOKEN).
 *   2. Open /plans, pick the Solo plan and continue.
 *   3. The create-checkout edge function creates a Paddle transaction and
 *      redirects to /checkout?_ptxn=txn_…, where Paddle.js opens the overlay.
 *   4. Assert the Paddle checkout overlay is mounted for that transaction.
 *
 * Card entry happens inside Paddle's cross-origin iframe and is intentionally
 * out of scope here. Gated behind E2E_PADDLE_TEST=1 because it creates real
 * sandbox transactions on the project's PADDLE_API_KEY.
 */

const PADDLE_ENABLED = process.env.E2E_PADDLE_TEST === "1";

test.describe("Paddle checkout — sandbox transaction", () => {
  test.skip(!hasSeededAccount(), "Requires TEST_USER_ID / TEST_ACCESS_TOKEN");
  test.skip(!PADDLE_ENABLED, "Set E2E_PADDLE_TEST=1 to run the sandbox checkout test");

  test("creates a Paddle transaction and opens the checkout overlay", async ({ page }) => {
    await signInWithSeeded(page);
    await page.goto("/plans");

    const soloCard = page
      .locator("div, article, section")
      .filter({ has: page.getByRole("heading", { name: /solo/i }) })
      .first();
    await expect(soloCard).toBeVisible();
    await soloCard
      .getByRole("button", { name: /choose|select|continue|обра|wyb/i })
      .first()
      .click();

    const continueBtn = page
      .getByRole("button", { name: /continue|proceed|checkout|далі|kontynu/i })
      .first();
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
    }

    // Redirect to the app's Paddle checkout landing page.
    await page.waitForURL(/\/checkout\?.*_ptxn=txn_/, { timeout: 30_000 });
    expect(page.url()).toMatch(/_ptxn=txn_/);

    // Paddle.js mounts its overlay in an iframe on the page.
    const overlay = page.locator('iframe[name*="paddle"], iframe[src*="paddle.com"]').first();
    await expect(overlay).toBeAttached({ timeout: 30_000 });
  });
});
