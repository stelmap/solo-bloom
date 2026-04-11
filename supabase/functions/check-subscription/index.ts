import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

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

    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) throw new Error("Authentication failed");

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;
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
