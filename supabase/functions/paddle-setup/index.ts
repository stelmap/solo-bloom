import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const tail = details !== undefined ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PADDLE-SETUP] ${step}${tail}`);
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

const PADDLE_API = "https://sandbox-api.paddle.com";
// Paddle discount codes must be alphanumeric, max 32 chars.
const SUPPORT_UA_CODE = "SUPPORTUA50";

const PLAN_NAMES: Record<string, string> = {
  solo: "Solo .Bizz Solo",
  pro: "Solo .Bizz Pro",
};

const BILLING_CYCLE: Record<string, { interval: string; frequency: number }> = {
  monthly: { interval: "month", frequency: 1 },
  quarterly: { interval: "month", frequency: 3 },
  yearly: { interval: "year", frequency: 1 },
};

async function paddle(apiKey: string, path: string, init?: RequestInit) {
  const res = await fetch(`${PADDLE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Paddle ${path} failed (${res.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("PADDLE_API_KEY");
  if (!apiKey) return json({ error: "PADDLE_API_KEY is not configured" }, 500);

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey, {
    auth: { persistSession: false },
  });

  // Authorisation: service role key, or a signed-in admin user.
  const setupToken = Deno.env.get("PADDLE_SETUP_TOKEN") ?? "";
  const providedSetupToken = req.headers.get("x-setup-token") ?? "";
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  const setupTokenOk = Boolean(setupToken) && providedSetupToken === setupToken;
  if (!token && !setupTokenOk) return json({ error: "Not authorised" }, 401);
  if (!setupTokenOk && token !== serviceKey) {
    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) return json({ error: "Not authorised" }, 401);
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin access required" }, 403);
  }

  try {
    const { data: plans, error: plansError } = await supabaseAdmin
      .from("plans")
      .select("id, code, name, description, paddle_product_id, is_active")
      .eq("is_active", true)
      .in("code", ["solo", "pro"]);
    if (plansError) throw new Error(plansError.message);

    const result: Record<string, unknown> = { products: [], prices: [], discount: null };

    for (const plan of plans ?? []) {
      let productId = (plan as any).paddle_product_id as string | null;
      if (!productId) {
        const created = await paddle(apiKey, "/products", {
          method: "POST",
          body: JSON.stringify({
            name: PLAN_NAMES[(plan as any).code] ?? (plan as any).name,
            description: (plan as any).description ?? undefined,
            type: "standard",
            tax_category: "standard",
            custom_data: { plan_code: (plan as any).code },
          }),
        });
        productId = created.data.id as string;
        await supabaseAdmin.from("plans").update({ paddle_product_id: productId }).eq("id", (plan as any).id);
        log("Product created", { code: (plan as any).code, productId });
      }
      (result.products as unknown[]).push({ code: (plan as any).code, productId });

      const { data: prices, error: pricesError } = await supabaseAdmin
        .from("plan_prices")
        .select("id, billing_period, price, currency, paddle_price_id, is_active")
        .eq("plan_id", (plan as any).id)
        .eq("is_active", true);
      if (pricesError) throw new Error(pricesError.message);

      for (const row of prices ?? []) {
        if ((row as any).paddle_price_id) {
          (result.prices as unknown[]).push({
            code: (plan as any).code,
            billing_period: (row as any).billing_period,
            priceId: (row as any).paddle_price_id,
            skipped: true,
          });
          continue;
        }
        const cycle = BILLING_CYCLE[(row as any).billing_period];
        if (!cycle) continue;
        const amount = Math.round(Number((row as any).price) * 100).toString();
        const created = await paddle(apiKey, "/prices", {
          method: "POST",
          body: JSON.stringify({
            product_id: productId,
            description: `${PLAN_NAMES[(plan as any).code]} — ${(row as any).billing_period}`,
            unit_price: { amount, currency_code: (row as any).currency ?? "EUR" },
            billing_cycle: cycle,
            tax_mode: "account_setting",
            quantity: { minimum: 1, maximum: 1 },
            custom_data: {
              plan_code: (plan as any).code,
              billing_period: (row as any).billing_period,
            },
          }),
        });
        const priceId = created.data.id as string;
        await supabaseAdmin.from("plan_prices").update({ paddle_price_id: priceId }).eq("id", (row as any).id);
        log("Price created", { code: (plan as any).code, period: (row as any).billing_period, priceId });
        (result.prices as unknown[]).push({
          code: (plan as any).code,
          billing_period: (row as any).billing_period,
          priceId,
        });
      }
    }

    // "Support Ukrainian Psychotherapists" — 50% recurring discount.
    const existing = await paddle(apiKey, `/discounts?code=${SUPPORT_UA_CODE}&status=active`);
    let discountId = existing?.data?.[0]?.id as string | undefined;
    if (!discountId) {
      const created = await paddle(apiKey, "/discounts", {
        method: "POST",
        body: JSON.stringify({
          description: "Support Ukrainian Psychotherapists — 50% off",
          type: "percentage",
          amount: "50",
          code: SUPPORT_UA_CODE,
          enabled_for_checkout: true,
          recur: true,
          currency_code: null,
        }),
      });
      discountId = created.data.id as string;
      log("Discount created", { discountId });
    }
    result.discount = { code: SUPPORT_UA_CODE, id: discountId };

    return json({ ok: true, ...result }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("Setup failed", { message });
    return json({ error: message }, 500);
  }
});
