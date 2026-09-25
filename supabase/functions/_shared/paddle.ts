// Shared Paddle Billing API helpers (sandbox by default).

export const PADDLE_ENVIRONMENT = (Deno.env.get("PADDLE_ENVIRONMENT") ?? "sandbox").toLowerCase() === "production"
  ? "production"
  : "sandbox";

export const PADDLE_API = PADDLE_ENVIRONMENT === "production"
  ? "https://api.paddle.com"
  : "https://sandbox-api.paddle.com";

export const SUPPORT_UA_DISCOUNT_CODE = "SUPPORTUA50";

export const paddleCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-setup-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export async function paddleFetch<T = any>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const apiKey = Deno.env.get("PADDLE_API_KEY");
  if (!apiKey) throw new Error("PADDLE_API_KEY is not set");

  const res = await fetch(`${PADDLE_API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Paddle ${path} failed (${res.status}): ${text}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

/** Returns the Paddle customer id for an email, creating the customer if needed. */
export async function getOrCreatePaddleCustomer(email: string, userId: string): Promise<string> {
  const existing = await paddleFetch<{ data: Array<{ id: string; status: string }> }>(
    `/customers?email=${encodeURIComponent(email)}&per_page=1`,
  );
  if (existing.data?.[0]?.id) return existing.data[0].id;

  const created = await paddleFetch<{ data: { id: string } }>("/customers", {
    method: "POST",
    body: { email, custom_data: { user_id: userId } },
  });
  return created.data.id;
}

export async function findDiscountIdByCode(code: string): Promise<string | null> {
  const res = await paddleFetch<{ data: Array<{ id: string; code: string; status: string }> }>(
    `/discounts?code=${encodeURIComponent(code)}&status=active&per_page=1`,
  );
  return res.data?.[0]?.id ?? null;
}

const COUNTRY_ALIASES: Record<string, string> = {
  ua: "UA", ukr: "UA", ukraine: "UA", "україна": "UA", "украина": "UA",
  pl: "PL", pol: "PL", poland: "PL", polska: "PL", "польща": "PL", "польша": "PL",
  fr: "FR", france: "FR", de: "DE", germany: "DE", deutschland: "DE",
};

/** Normalises a free-text country to an ISO 3166-1 alpha-2 code, or null. */
export function toCountryCode(raw: string | null | undefined): string | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return null;
  if (COUNTRY_ALIASES[v]) return COUNTRY_ALIASES[v];
  return /^[a-z]{2}$/.test(v) ? v.toUpperCase() : null;
}

/** Returns an active address id for the customer in the given country, creating one if needed. */
export async function getOrCreatePaddleAddress(customerId: string, countryCode: string): Promise<string | null> {
  try {
    const list = await paddleFetch<{ data: Array<{ id: string; country_code: string }> }>(
      `/customers/${customerId}/addresses?status=active&per_page=50`,
    );
    const hit = list.data?.find((a) => a.country_code === countryCode);
    if (hit) return hit.id;
    const created = await paddleFetch<{ data: { id: string } }>(`/customers/${customerId}/addresses`, {
      method: "POST",
      body: { country_code: countryCode },
    });
    return created.data.id;
  } catch (err) {
    console.log(`[PADDLE] address prefill skipped: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
