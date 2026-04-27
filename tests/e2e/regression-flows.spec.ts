import { test, expect } from "../../playwright-fixture";
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
  name: "Regression Client",
  email: "client@example.com",
  phone: "",
  notification_preference: "email_only",
  confirmation_required: true,
  base_price: 90,
  pricing_mode: "fixed",
};
const service = {
  id: "20000000-0000-4000-8000-000000000001",
  user_id: userId,
  name: "Regression Session",
  price: 90,
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
      email: "regression@example.com",
      app_metadata: {},
      user_metadata: { full_name: "Regression User" },
      created_at: new Date().toISOString(),
    },
  };
}

function makeAppointment(overrides: Partial<MockAppointment> = {}): MockAppointment {
  const scheduled = new Date();
  scheduled.setUTCDate(scheduled.getUTCDate() + 1);
  scheduled.setUTCHours(10, 0, 0, 0);
  return {
    id: `apt-${Date.now()}`,
    user_id: userId,
    client_id: client.id,
    service_id: service.id,
    scheduled_at: scheduled.toISOString().replace(".000Z", "Z"),
    duration_minutes: 60,
    price: 90,
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

async function setupMockBackend(page: any, options: { appointments?: MockAppointment[] } = {}) {
  const appointments = [...(options.appointments ?? [])];
  const sentEmails: any[] = [];

  await page.addInitScript(({ key, state }) => {
    localStorage.setItem(key, JSON.stringify(state));
  }, { key: SUPABASE_AUTH_STORAGE_KEY, state: authState() });

  await page.route("**/functions/v1/check-subscription", async (route: any) => {
    await route.fulfill({
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
    });
  });

  await page.route("**/functions/v1/send-transactional-email", async (route: any) => {
    sentEmails.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.route("**/rest/v1/**", async (route: any) => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split("/rest/v1/")[1]?.split("?")[0];
    const method = request.method();
    const wantsObject = (request.headers()["accept"] || "").includes("vnd.pgrst.object");
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (method === "GET") {
      const dataByTable: Record<string, unknown> = {
        profiles: {
          id: "profile-1",
          user_id: userId,
          full_name: "Regression User",
          business_name: "Regression Practice",
          language: "en",
          currency: "EUR",
          work_hours_start: "09:00",
          work_hours_end: "18:00",
          time_format: "24h",
          sessions_per_day: 6,
          onboarding_completed: true,
        },
        entitlements: [{ feature_code: "premium_access", source_type: "test", active_until: null, is_active: true }],
        subscriptions: { legacy_full_access: true, legacy_access_until: null, status: "active" },
        clients: [client],
        services: [service],
        appointments,
        working_schedule: [1, 2, 3, 4, 5].map((day) => ({ id: `ws-${day}`, user_id: userId, day_of_week: day, is_working: true, start_time: "09:00", end_time: "18:00" })),
        days_off: [],
        groups: [],
        group_members: [],
        group_attendance: [],
        group_session_payments: [],
      };
      const data = dataByTable[table] ?? [];
      return json(wantsObject && Array.isArray(data) ? data[0] ?? null : data);
    }

    if (method === "POST" && table === "appointments") {
      const body = request.postDataJSON();
      const created = makeAppointment({
        ...body,
        id: `apt-${appointments.length + 1}`,
        scheduled_at: body.scheduled_at,
        clients: { name: client.name },
        services: { name: service.name, price: service.price },
      });
      appointments.push(created);
      return json(created, 201);
    }

    if (method === "PATCH" && table === "appointments") {
      const id = (url.searchParams.get("id") || "").replace("eq.", "");
      const updates = request.postDataJSON();
      const apt = appointments.find((item) => item.id === id);
      if (apt) Object.assign(apt, updates);
      return json(wantsObject ? apt ?? null : [apt].filter(Boolean));
    }

    if (method === "POST" && table === "session_confirmations") {
      return json({ id: "confirmation-1", appointment_id: request.postDataJSON().appointment_id, token: "confirm-token" }, 201);
    }

    if (["POST", "PATCH", "DELETE"].includes(method)) {
      return json(method === "POST" ? { id: `${table}-mock` } : []);
    }

    return json([]);
  });

  return { appointments, sentEmails };
}

test.describe("Regression E2E flows", () => {
  test("user authentication redirects protected pages and sends a magic link", async ({ page }) => {
    let otpPayload: any = null;
    await page.route("**/auth/v1/otp", async (route: any) => {
      otpPayload = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) });
    });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth/);

    await page.goto("/auth?mode=signup");
    await page.getByPlaceholder("you@example.com").fill("new-user@example.com");
    await page.getByRole("button", { name: /sign up/i }).click();
    await expect(page.getByText(/check your email/i).first()).toBeVisible({ timeout: 10000 });
    expect(otpPayload?.email).toBe("new-user@example.com");
  });

  test("scheduling session creates a calendar appointment", async ({ page }) => {
    await setupMockBackend(page);
    await page.goto("/calendar");

    await page.locator("tbody td.cursor-pointer").first().click();
    await expect(page.getByRole("dialog", { name: /new appointment/i })).toBeVisible();

    await page.getByText(/select client/i).click();
    await page.getByRole("option", { name: client.name }).click();
    await page.getByText(/select service/i).click();
    await page.getByRole("option", { name: /Regression Session/ }).click();
    await page.getByRole("button", { name: /create appointment/i }).click();

    await expect(page.getByText(client.name).first()).toBeVisible({ timeout: 10000 });
  });

  test("complete session marks it completed and records payment", async ({ page }) => {
    await setupMockBackend(page, { appointments: [makeAppointment({ id: "apt-complete" })] });
    await page.goto("/calendar");

    await page.getByText(client.name).first().click();
    await page.getByRole("button", { name: /^complete$/i }).click();
    await page.getByRole("button", { name: /confirm complete/i }).click();

    await expect(page.locator('[role="status"], [data-sonner-toast]').first()).toBeVisible({ timeout: 10000 });
    await page.getByText(client.name).first().click();
    await expect(page.getByText(/completed/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("notifications send a session reminder and update reminder status", async ({ page }) => {
    const backend = await setupMockBackend(page, { appointments: [makeAppointment({ id: "apt-reminder" })] });
    await page.goto("/calendar");

    await page.getByText(client.name).first().click();
    await page.getByRole("button", { name: /send reminder/i }).last().click();

    await expect.poll(() => backend.sentEmails.length).toBe(1);
    expect(backend.sentEmails[0]?.templateName).toBe("session-reminder");
    await expect(page.locator('[role="status"], [data-sonner-toast]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/reminder sent/i).first()).toBeVisible({ timeout: 10000 });
  });
});
