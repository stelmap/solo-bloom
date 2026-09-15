import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { paddleCorsHeaders as corsHeaders, paddleFetch } from "../_shared/paddle.ts";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

type Result = {
  subscribed: boolean;
  on_trial: boolean;
  subscription_end: string | null;
  trial_end: string | null;
  price_id: string | null;
  cancel_at_period_end: boolean;
  discount_percent: number | null;
};

const EMPTY_RESULT: Result = {
  subscribed: false,
  on_trial: false,
  subscription_end: null,
  trial_end: null,
  price_id: null,
  cancel_at_period_end: false,
  discount_percent: null,
};

async function syncPlanRecords(
  supabaseAdmin: any,
  userId: string,
  subscription: { id?: string; current_period_start?: string | null; customer_id?: string } | null,
  result: Result,
) {
  if (!result.subscribed && !result.on_trial) {
    await Promise.all([
      supabaseAdmin
        .from("entitlements")
        .update({ is_active: false, active_until: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("source_type", "paddle")
        .eq("is_active", true),
      supabaseAdmin
        .from("subscriptions")
        .update({ status: "inactive", current_period_end: null, current_period_start: null })
        .eq("user_id", userId),
    ]);
    return;
  }

  const priceRes = result.price_id
    ? await supabaseAdmin
        .from("plan_prices")
        .select("id, plan_id, plans(code)")
        .eq("paddle_price_id", result.price_id)
        .maybeSingle()
    : { data: null };

  const planCode = (priceRes.data as any)?.plans?.code as string | undefined;
  const activeUntil = result.on_trial ? result.trial_end : result.subscription_end;

  const { data: subRow, error: subError } = await supabaseAdmin
    .from("subscriptions")
    .upsert({
      user_id: userId,
      status: result.on_trial ? "trialing" : "active",
      paddle_subscription_id: subscription?.id ?? null,
      paddle_customer_id: subscription?.customer_id ?? null,
      current_plan_id: (priceRes.data as any)?.plan_id ?? null,
      current_price_id: (priceRes.data as any)?.id ?? null,
      current_period_start: subscription?.current_period_start ?? null,
      current_period_end: activeUntil,
      legacy_full_access: false,
      legacy_access_until: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select("id")
    .single();

  if (subError) {
    logStep("Subscription row sync failed", { message: subError.message });
    return;
  }

  // Finance, Supervision, and Reports remain baseline features for every
  // authenticated user; only premium-only features are gated to Pro Practice.
  const features = planCode === "pro"
    ? ["premium_access", "financial_access", "operational_access"]
    : ["financial_access", "operational_access"];

  await supabaseAdmin
    .from("entitlements")
    .update({ is_active: false, active_until: new Date().toISOString() })
    .eq("user_id", userId)
    .in("source_type", ["paddle", "stripe"])
    .eq("is_active", true);

  await supabaseAdmin.from("entitlements").insert(
    features.map((featureCode) => ({
      user_id: userId,
      feature_code: featureCode,
      source_type: "paddle",
      source_ref: (subRow as any).id,
      active_from: new Date().toISOString(),
      active_until: activeUntil,
      is_active: true,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "user_id,feature_code,source_type" },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient<any>(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    logStep("Function started");

    if (!Deno.env.get("PADDLE_API_KEY")) throw new Error("PADDLE_API_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");

    const supabaseUser = createClient<any>(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      logStep("Authentication failed", { message: claimsError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string | undefined;
    if (!userEmail) throw new Error("User email not available");

    let forceRefresh = false;
    try {
      const body = await req.clone().json();
      forceRefresh = body?.force === true;
    } catch {
      // no body — fine
    }

    if (!forceRefresh) {
      const { data: cached } = await supabaseAdmin
        .from("subscription_cache")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (cached && Date.now() - new Date(cached.checked_at).getTime() < CACHE_TTL_MS) {
        const cachedResult: Result = {
          subscribed: cached.subscribed,
          on_trial: cached.on_trial,
          subscription_end: cached.subscription_end,
          trial_end: cached.trial_end,
          price_id: cached.price_id,
          cancel_at_period_end: cached.cancel_at_period_end ?? false,
          discount_percent: cached.discount_percent ?? null,
        };
        logStep("Returning cached result");
        await syncPlanRecords(supabaseAdmin, userId, null, cachedResult);
        return new Response(JSON.stringify(cachedResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Cache miss or stale — query Paddle
    const customers = await paddleFetch<{ data: Array<{ id: string }> }>(
      `/customers?email=${encodeURIComponent(userEmail)}&per_page=1`,
    );
    const customerId = customers.data?.[0]?.id;

    let result: Result = { ...EMPTY_RESULT };
    let subscription: any = null;

    if (customerId) {
      const subs = await paddleFetch<{ data: any[] }>(
        `/subscriptions?customer_id=${customerId}&status=active,trialing&per_page=1`,
      );
      subscription = subs.data?.[0] ?? null;
    }

    if (subscription) {
      const onTrial = subscription.status === "trialing";
      const periodEnd = subscription.current_billing_period?.ends_at ?? null;
      const trialEnd = onTrial ? periodEnd : null;
      const priceId = subscription.items?.[0]?.price?.id ?? null;

      let discountPercent: number | null = null;
      const rawAmount = subscription.discount?.id
        ? await paddleFetch<{ data: { type: string; amount: string } }>(`/discounts/${subscription.discount.id}`)
            .then((d) => (d.data.type === "percentage" ? Number(d.data.amount) : null))
            .catch(() => null)
        : null;
      if (typeof rawAmount === "number" && rawAmount > 0) discountPercent = rawAmount;

      result = {
        subscribed: true,
        on_trial: onTrial,
        subscription_end: periodEnd,
        trial_end: trialEnd,
        price_id: priceId,
        cancel_at_period_end: subscription.scheduled_change?.action === "cancel",
        discount_percent: discountPercent,
      };
      subscription = {
        id: subscription.id,
        customer_id: subscription.customer_id,
        current_period_start: subscription.current_billing_period?.starts_at ?? null,
      };
    }

    logStep("Paddle checked", { subscribed: result.subscribed, priceId: result.price_id });

    await supabaseAdmin.from("subscription_cache").upsert({
      user_id: userId,
      ...result,
      checked_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    await syncPlanRecords(supabaseAdmin, userId, subscription, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
