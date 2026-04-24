import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const PRICE_TO_PLAN_CODE: Record<string, "solo" | "pro"> = {
  price_1TPQ3DRxXuU3N5IFMcxZCvva: "solo",
  price_1TPQ5FRxXuU3N5IF5ufGLkV1: "solo",
  price_1TPQ60RxXuU3N5IFBiGOuz8f: "solo",
  price_1TPQahRxXuU3N5IF3umwA0Bd: "pro",
  price_1TPQbIRxXuU3N5IFPVrvG60z: "pro",
  price_1TPQbmRxXuU3N5IFirrjnqdi: "pro",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

async function syncPlanRecords(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  subscription: Stripe.Subscription | null,
  result: {
    subscribed: boolean;
    on_trial: boolean;
    subscription_end: string | null;
    trial_end: string | null;
    price_id: string | null;
  },
) {
  if (!result.subscribed && !result.on_trial) {
    await Promise.all([
      supabaseAdmin
        .from("entitlements")
        .update({ is_active: false, active_until: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("source_type", "stripe")
        .eq("is_active", true),
      supabaseAdmin
        .from("subscriptions")
        .update({ status: "inactive", current_period_end: null, current_period_start: null })
        .eq("user_id", userId),
    ]);
    return;
  }

  const planCode = result.price_id ? PRICE_TO_PLAN_CODE[result.price_id] : undefined;
  const planRes = planCode
    ? await supabaseAdmin.from("plans").select("id").eq("code", planCode).maybeSingle()
    : { data: null };
  const priceRes = result.price_id
    ? await supabaseAdmin.from("plan_prices").select("id").eq("stripe_price_id", result.price_id).maybeSingle()
    : { data: null };

  const periodStart = typeof subscription?.current_period_start === "number"
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : null;
  const activeUntil = result.on_trial ? result.trial_end : result.subscription_end;

  const { data: subRow, error: subError } = await supabaseAdmin
    .from("subscriptions")
    .upsert({
      user_id: userId,
      status: result.on_trial ? "trialing" : "active",
      stripe_subscription_id: subscription?.id ?? null,
      current_plan_id: (planRes.data as any)?.id ?? null,
      current_price_id: (priceRes.data as any)?.id ?? null,
      current_period_start: periodStart,
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

  const features = planCode === "pro"
    ? ["premium_access", "financial_access", "operational_access"]
    : ["operational_access"];

  await supabaseAdmin
    .from("entitlements")
    .update({ is_active: false, active_until: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("source_type", "stripe")
    .eq("is_active", true);

  await supabaseAdmin.from("entitlements").upsert(
    features.map((featureCode) => ({
      user_id: userId,
      feature_code: featureCode,
      source_type: "stripe",
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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");

    // Use a user-context client to validate the JWT
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !userData?.user) {
      logStep("Authentication failed", { message: userError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    if (!userEmail) throw new Error("User email not available");
    logStep("User authenticated", { email: userEmail });

    // Check for force refresh param
    let forceRefresh = false;
    try {
      const body = await req.clone().json();
      forceRefresh = body?.force === true;
    } catch {
      // No body or not JSON — that's fine
    }

    // Check cache first
    if (!forceRefresh) {
      const { data: cached } = await supabaseAdmin
        .from("subscription_cache")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (cached) {
        const cacheAge = Date.now() - new Date(cached.checked_at).getTime();
        if (cacheAge < CACHE_TTL_MS) {
          logStep("Returning cached result", { cacheAgeMs: cacheAge });
          return new Response(
            JSON.stringify({
              subscribed: cached.subscribed,
              on_trial: cached.on_trial,
              subscription_end: cached.subscription_end,
              trial_end: cached.trial_end,
              price_id: cached.price_id,
              cancel_at_period_end: cached.cancel_at_period_end,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
      }
    }

    // Cache miss or stale — query Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      const result = { subscribed: false, on_trial: false, subscription_end: null, trial_end: null, price_id: null, cancel_at_period_end: false };
      // Update cache
      await supabaseAdmin.from("subscription_cache").upsert({
        user_id: userId,
        ...result,
        checked_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    const activeSubs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    const trialingSubs = await stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 1 });
    const subscription = activeSubs.data[0] || trialingSubs.data[0];

    let result;
    if (!subscription) {
      logStep("No active or trialing subscription");
      result = { subscribed: false, on_trial: false, subscription_end: null, trial_end: null, price_id: null, cancel_at_period_end: false };
    } else {
      const onTrial = subscription.status === "trialing";

      // Safely convert Stripe unix timestamps (seconds) to ISO strings
      let subscriptionEnd: string | null = null;
      if (typeof subscription.current_period_end === "number" && subscription.current_period_end > 0) {
        subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      }

      let trialEnd: string | null = null;
      if (typeof subscription.trial_end === "number" && subscription.trial_end > 0) {
        trialEnd = new Date(subscription.trial_end * 1000).toISOString();
      }

      const priceId = subscription.items.data[0]?.price?.id || null;

      logStep("Subscription found", {
        status: subscription.status,
        onTrial,
        subscriptionEnd,
        trialEnd,
        priceId,
        rawPeriodEnd: subscription.current_period_end,
        rawTrialEnd: subscription.trial_end,
      });

      result = {
        subscribed: true,
        on_trial: onTrial,
        subscription_end: subscriptionEnd,
        trial_end: trialEnd,
        price_id: priceId,
        cancel_at_period_end: subscription.cancel_at_period_end,
      };
    }

    // Update cache
    await supabaseAdmin.from("subscription_cache").upsert({
      user_id: userId,
      ...result,
      checked_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
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
