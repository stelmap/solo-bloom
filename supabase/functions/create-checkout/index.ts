import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_IDS = {
  // Solo plan
  solo_monthly: "price_1TPQ3DRxXuU3N5IFMcxZCvva",
  solo_quarterly: "price_1TPQ5FRxXuU3N5IF5ufGLkV1",
  solo_yearly: "price_1TPQ60RxXuU3N5IFBiGOuz8f",
  // Pro plan
  pro_monthly: "price_1TPQahRxXuU3N5IF3umwA0Bd",
  pro_quarterly: "price_1TPQbIRxXuU3N5IFPVrvG60z",
  pro_yearly: "price_1TPQbmRxXuU3N5IFirrjnqdi",
};

const log = (step: string, details?: unknown) => {
  const tail = details !== undefined ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${tail}`);
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      log("STRIPE_SECRET_KEY missing");
      return json({ error: "Server is not configured for payments. Please contact support." }, 500);
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "You must be signed in to start checkout." }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseClient.auth.getUser(token);
    if (userErr) log("auth.getUser error", { message: userErr.message });
    const user = userData?.user;
    if (!user?.email) {
      return json({ error: "You must be signed in to start checkout." }, 401);
    }
    log("User authenticated", { userId: user.id, email: user.email });

    let body: { priceId?: string; withTrial?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid request body." }, 400);
    }
    const { priceId, withTrial = true } = body;
    const validPrices = Object.values(PRICE_IDS);
    if (!priceId || !validPrices.includes(priceId)) {
      log("Invalid price ID", { priceId });
      return json({ error: "Invalid plan selected. Please refresh and try again." }, 400);
    }
    log("Price validated", { priceId, withTrial });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Look up existing customer (idempotent: matching on email is fine for most accounts).
    let customerId: string | undefined;
    try {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        log("Found existing customer", { customerId });

        // Block double-subscribe.
        const subs = await stripe.subscriptions.list({
          customer: customerId,
          status: "active",
          limit: 1,
        });
        if (subs.data.length > 0) {
          log("Customer already has active subscription", { customerId });
          return json(
            {
              error:
                "You already have an active subscription. Manage it from Settings → Subscription.",
              code: "already_subscribed",
            },
            409
          );
        }
      }
    } catch (stripeErr) {
      const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      log("Stripe customer lookup failed", { message: msg });
      // Don't block checkout on a transient lookup error — fall through with no customerId.
    }

    const origin = req.headers.get("origin") || "https://solo-bizz-app.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      payment_method_collection: "always",
      ...(withTrial ? { subscription_data: { trial_period_days: 7 } } : {}),
      allow_promotion_codes: true,
      success_url: `${origin}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/plans?checkout=cancel`,
    });

    if (!session.url) {
      log("Stripe returned no checkout URL", { sessionId: session.id });
      return json({ error: "Could not create checkout session. Please try again." }, 502);
    }

    log("Checkout session created", { sessionId: session.id });
    return json({ url: session.url, sessionId: session.id }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("Unhandled error", { message });
    return json({ error: message || "Unexpected error. Please try again." }, 500);
  }
});
