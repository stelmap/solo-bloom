/**
 * E2E: Cancel appointment modal (prepaid / non-payable paths)
 *
 * Covers TC-01…TC-04 of the cancellation matrix at the UI level:
 *   - Prepaid + payable  → RPC withdraw_from_prepayment_for_appointment,
 *                          payment_status = paid_from_prepayment, no debt row.
 *   - Prepaid + non-payable → payment_status = not_applicable, no RPC, no debt.
 *   - Unpaid  + payable  → payment_status = waiting_for_payment, debt row created.
 *   - Unpaid  + non-payable → payment_status = not_applicable, no debt.
 */
import { test, expect, type Page, type Route } from "../../playwright-fixture";
import { SUPABASE_AUTH_STORAGE_KEY } from "./helpers";

type MockAppointment = {
  id: string;
  user_id: string;
  client_id: string;
  service_id: string;
  scheduled_at: string;
  duration_minutes: number;
  price: number;
  status: string;
  payment_status: string;
  confirmation_status: string;
  notes?: string | null;
  clients?: { name: string };
  services?: { name: string; price: number };
  group_sessions?: null;
};

const userId = "00000000-0000-4000-8000-000000000001";
const client = {
  id: "10000000-0000-4000-8000-000000000001",
  user_id: userId,
  name: "Cancel Flow Client",
  email: "client@example.com",
  phone: "",
  notification_preference: "email_only",
  confirmation_required: false,
  base_price: 50,
  pricing_mode: "fixed",
};
const service = {
  id: "20000000-0000-4000-8000-000000000001",
  user_id: userId,
  name: "Cancel Flow Session",
  price: 50,
  duration_minutes: 60,
};

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
      email: "cancel@example.com",
      app_metadata: {},
      user_metadata: { full_name: "Cancel Flow User" },
      created_at: new Date().toISOString(),
    },
  };
}

function makeAppointment(overrides: Partial<MockAppointment> = {}): MockAppointment {
  const scheduled = new Date();
  scheduled.setUTCDate(scheduled.getUTCDate() + 1);
  scheduled.setUTCHours(10, 0, 0, 0);
  return {
    id: "apt-cancel-1",
    user_id: userId,
    client_id: client.id,
    service_id: service.id,
    scheduled_at: scheduled.toISOString().replace(".000Z", "Z"),
    duration_minutes: 60,
    price: 50,
    status: "scheduled",
    payment_status: "unpaid",
    confirmation_status: "not_required",
    notes: null,
    clients: { name: client.name },
    services: { name: service.name, price: service.price },
    group_sessions: null,
    ...overrides,
  };
}

type RecordedOp = { table: string; method: string; body?: any; url: string };

async function setupBackend(
  page: Page,
  appointment: MockAppointment,
): Promise<{
  ops: RecordedOp[];
  rpc: { name: string; body: any }[];
  appointment: MockAppointment;
}> {
  const ops: RecordedOp[] = [];
  const rpc: { name: string; body: any }[] = [];
  const state = { appointment };

  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: SUPABASE_AUTH_STORAGE_KEY, value: authState() },
  );

  await page.route("**/functions/v1/check-subscription", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        subscribed: true,
        on_trial: false,
        subscription_end: null,
        trial_end: null,
        price_id: "price_test",
        cancel_at_period_end: false,
      }),
    }),
  );

  await page.route("**/rest/v1/**", async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const table = url.pathname.split("/rest/v1/")[1]?.split("?")[0] ?? "";
    const method = req.method();
    const wantsObject = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    const json = (b: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(b) });

    // RPC handling
    if (table.startsWith("rpc/")) {
      const name = table.slice(4);
      const body = req.postDataJSON();
      rpc.push({ name, body });
      return json({});
    }

    if (method !== "GET") {
      let body: any = undefined;
      try {
        body = req.postDataJSON();
      } catch {
        /* no body */
      }
      ops.push({ table, method, body, url: req.url() });
    }

    if (method === "GET") {
      const dataByTable: Record<string, unknown> = {
        profiles: {
          id: "profile-1",
          user_id: userId,
          full_name: "Cancel Flow User",
          business_name: "Cancel Flow Practice",
          language: "en",
          currency: "EUR",
          work_hours_start: "09:00",
          work_hours_end: "18:00",
          time_format: "24h",
          sessions_per_day: 6,
          onboarding_completed: true,
        },
        entitlements: [
          { feature_code: "premium_access", source_type: "test", active_until: null, is_active: true },
        ],
        subscriptions: { legacy_full_access: true, legacy_access_until: null, status: "active" },
        clients: [client],
        services: [service],
        appointments: [state.appointment],
        working_schedule: [1, 2, 3, 4, 5].map((day) => ({
          id: `ws-${day}`,
          user_id: userId,
          day_of_week: day,
          is_working: true,
          start_time: "09:00",
          end_time: "18:00",
        })),
        days_off: [],
        groups: [],
        group_members: [],
        group_attendance: [],
        group_session_payments: [],
      };
      const data = dataByTable[table] ?? [];
      return json(wantsObject && Array.isArray(data) ? (data[0] ?? null) : data);
    }

    if (method === "PATCH" && table === "appointments") {
      Object.assign(state.appointment, req.postDataJSON());
      return json(wantsObject ? state.appointment : [state.appointment]);
    }

    if (method === "DELETE") return json([]);
    if (method === "POST") return json({ id: `${table}-mock` }, 201);
    return json([]);
  });

  return { ops, rpc, appointment: state.appointment };
}

async function openCancelModal(page: Page) {
  await page.goto("/calendar");
  await page.getByText(client.name).first().click();
  await page
    .getByRole("button", { name: /cancel/i })
    .filter({ hasText: /cancel/i })
    .last()
    .click();
  // The cancel dialog uses the "Cancel session" title.
  await expect(page.getByRole("heading", { name: /cancel session/i })).toBeVisible();
}

test.describe("Cancel appointment modal", () => {
  test("prepaid session, charge fee → withdraws from prepayment", async ({ page }) => {
    const backend = await setupBackend(
      page,
      makeAppointment({ payment_status: "paid_in_advance" }),
    );

    await openCancelModal(page);
    await page.getByRole("button", { name: /charge the client/i }).click();

    await expect
      .poll(() => backend.rpc.filter((r) => r.name === "withdraw_from_prepayment_for_appointment").length)
      .toBe(1);

    const patch = backend.ops.find((o) => o.table === "appointments" && o.method === "PATCH");
    expect(patch?.body?.status).toBe("cancelled");
    expect(patch?.body?.payment_status).toBe("paid_from_prepayment");

    const debtInserted = backend.ops.some(
      (o) => o.table === "expected_payments" && o.method === "POST",
    );
    expect(debtInserted).toBe(false);
  });

  test("prepaid session, waive fee → not_applicable, no RPC, no debt", async ({ page }) => {
    const backend = await setupBackend(
      page,
      makeAppointment({ id: "apt-cancel-2", payment_status: "paid_in_advance" }),
    );

    await openCancelModal(page);
    await page.getByRole("button", { name: /waive the fee/i }).click();

    await expect
      .poll(() => backend.ops.filter((o) => o.table === "appointments" && o.method === "PATCH").length)
      .toBeGreaterThanOrEqual(1);

    expect(backend.rpc.filter((r) => r.name === "withdraw_from_prepayment_for_appointment"))
      .toHaveLength(0);

    const patch = backend.ops.find((o) => o.table === "appointments" && o.method === "PATCH");
    expect(patch?.body?.payment_status).toBe("not_applicable");
    expect(backend.ops.some((o) => o.table === "expected_payments" && o.method === "POST")).toBe(false);
  });

  test("unpaid session, charge fee → waiting_for_payment + debt row", async ({ page }) => {
    const backend = await setupBackend(
      page,
      makeAppointment({ id: "apt-cancel-3", payment_status: "unpaid" }),
    );

    await openCancelModal(page);
    await page.getByRole("button", { name: /charge the client/i }).click();

    await expect
      .poll(() => backend.ops.filter((o) => o.table === "expected_payments" && o.method === "POST").length)
      .toBe(1);

    expect(backend.rpc.filter((r) => r.name === "withdraw_from_prepayment_for_appointment"))
      .toHaveLength(0);

    const patch = backend.ops.find((o) => o.table === "appointments" && o.method === "PATCH");
    expect(patch?.body?.payment_status).toBe("waiting_for_payment");

    const debt = backend.ops.find((o) => o.table === "expected_payments" && o.method === "POST");
    expect(Number(debt?.body?.amount)).toBe(50);
  });

  test("unpaid session, waive fee → not_applicable clean cancel", async ({ page }) => {
    const backend = await setupBackend(
      page,
      makeAppointment({ id: "apt-cancel-4", payment_status: "unpaid" }),
    );

    await openCancelModal(page);
    await page.getByRole("button", { name: /waive the fee/i }).click();

    await expect
      .poll(() => backend.ops.filter((o) => o.table === "appointments" && o.method === "PATCH").length)
      .toBeGreaterThanOrEqual(1);

    expect(backend.rpc).toHaveLength(0);
    expect(backend.ops.some((o) => o.table === "expected_payments" && o.method === "POST")).toBe(false);

    const patch = backend.ops.find((o) => o.table === "appointments" && o.method === "PATCH");
    expect(patch?.body?.status).toBe("cancelled");
    expect(patch?.body?.payment_status).toBe("not_applicable");
  });
});
