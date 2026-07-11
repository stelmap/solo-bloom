import { test, expect } from "../../playwright-fixture";
import { SUPABASE_AUTH_STORAGE_KEY } from "./helpers";

/**
 * Regression: double-clicking the "Confirm payment received" button on
 * IncomePage must create exactly ONE income row. The client-side
 * `withIncomeDedupeGuard` (src/hooks/useData.ts) claims the dedupe key
 * synchronously in `useMarkExpectedPaymentPaid`; the second click's
 * mutation must reject before it ever hits POST /rest/v1/income.
 */

const userId = "00000000-0000-4000-8000-000000000abc";
const appointmentId = "aaaaaaaa-0000-4000-8000-000000000001";
const clientId = "bbbbbbbb-0000-4000-8000-000000000001";

function authState() {
  return {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      email: "double-click@example.com",
      app_metadata: {},
      user_metadata: { full_name: "Dedupe Regression" },
      created_at: new Date().toISOString(),
    },
  };
}

const scheduledAt = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(10, 0, 0, 0);
  return d.toISOString().replace(".000Z", "Z");
})();

test.describe("Confirm payment — double-click regression", () => {
  test("double-click on 'Confirm payment received' inserts income only once", async ({ page }) => {
    const incomeInsertPayloads: any[] = [];
    let pendingRelease: (() => void) | null = null;

    await page.addInitScript(({ key, state }) => {
      localStorage.setItem(key, JSON.stringify(state));
    }, { key: SUPABASE_AUTH_STORAGE_KEY, state: authState() });

    await page.route("**/functions/v1/check-subscription", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          subscribed: true,
          on_trial: false,
          subscription_end: null,
          trial_end: null,
          price_id: "price_regression",
          cancel_at_period_end: false,
        }),
      }),
    );

    await page.route("**/rest/v1/rpc/**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(null) }),
    );

    await page.route("**/rest/v1/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const table = url.pathname.split("/rest/v1/")[1]?.split("?")[0] ?? "";
      const method = request.method();
      const wantsObject = (request.headers()["accept"] || "").includes("vnd.pgrst.object");
      const json = (body: unknown, status = 200) =>
        route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

      if (method === "GET") {
        switch (table) {
          case "profiles":
            return json({
              id: "profile-1",
              user_id: userId,
              full_name: "Dedupe Regression",
              business_name: "Dedupe",
              language: "en",
              currency: "EUR",
              onboarding_completed: true,
              time_format: "24h",
              work_hours_start: "09:00",
              work_hours_end: "18:00",
              sessions_per_day: 6,
            });
          case "entitlements":
            return json([{ feature_code: "premium_access", is_active: true, active_until: null, source_type: "test" }]);
          case "subscriptions":
            return json({ legacy_full_access: true, legacy_access_until: null, status: "active" });
          case "payment_methods":
            return json([
              { id: "pm-cash", user_id: userId, code: "cash", name: "Cash", is_active: true, is_built_in: true, sort_order: 0 },
            ]);
          case "clients":
            return json([{ id: clientId, user_id: userId, name: "Dedupe Client" }]);
          case "group_sessions":
            return json([]);
          case "appointments":
            return json([
              {
                id: appointmentId,
                user_id: userId,
                client_id: clientId,
                price: 90,
                scheduled_at: scheduledAt,
                status: "completed",
                payment_status: "waiting_for_payment",
                services: { name: "Session" },
                clients: { name: "Dedupe Client" },
              },
            ]);
          case "income_session_allocations":
            return json([]);
          case "income":
            return json(wantsObject ? null : []);
          default:
            return json([]);
        }
      }

      if (method === "POST" && table === "income") {
        incomeInsertPayloads.push(request.postDataJSON());
        // Hold the response so the second click races against an in-flight insert.
        await new Promise<void>((resolve) => {
          pendingRelease = resolve;
        });
        return json(wantsObject ? { id: `income-${incomeInsertPayloads.length}` } : [{ id: `income-${incomeInsertPayloads.length}` }], 201);
      }

      if (method === "PATCH" || method === "DELETE") {
        return json(wantsObject ? {} : []);
      }
      if (method === "POST") {
        return json({ id: `${table}-mock` }, 201);
      }

      return json([]);
    });

    page.on("console", (m) => console.log("[browser]", m.type(), m.text()));
    await page.goto("/income?tab=pending&range=all");
    await page.waitForURL(/\/income/);
    await page.waitForTimeout(2000);
    console.log("URL after nav:", page.url());
    await page.screenshot({ path: "/tmp/income-debug.png", fullPage: false });

    const markPaid = page.getByRole("button", { name: /mark paid/i }).first();
    await markPaid.waitFor({ state: "visible", timeout: 15000 });
    await markPaid.click();

    const confirm = page.getByRole("button", { name: /confirm payment received|підтвердити отримання оплати|подтвердить получение оплаты|potwierdź otrzymanie płatności|confirmer la réception du paiement/i }).first();
    await confirm.waitFor({ state: "visible", timeout: 10000 });

    // Force a synchronous double-click on the same element BEFORE React can
    // re-render `disabled={isPending}`. This is the exact scenario the guard
    // is meant to catch (double-clicks / trigger-happy touch events).
    await confirm.evaluate((el) => {
      (el as HTMLButtonElement).click();
      (el as HTMLButtonElement).click();
    });

    // Wait until at least one insert is in flight, then release it.
    await expect.poll(() => incomeInsertPayloads.length, { timeout: 5000 }).toBeGreaterThanOrEqual(1);
    // Small grace window so a hypothetically-un-guarded second POST could arrive.
    await page.waitForTimeout(500);

    expect(incomeInsertPayloads.length).toBe(1);
    expect(Number(incomeInsertPayloads[0]?.amount)).toBe(90);

    pendingRelease?.();
  });
});
