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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { priceId, withTrial = true } = await req.json();
    const validPrices = Object.values(PRICE_IDS);
    if (!priceId || !validPrices.includes(priceId)) {
      throw new Error("Invalid price ID");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;

      // Check if already has active subscription
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });
      if (subs.data.length > 0) {
        throw new Error("You already have an active subscription. Manage it from settings.");
      }
    }

    const origin = req.headers.get("origin") || "https://solo-bizz-app.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      ...(withTrial ? { subscription_data: { trial_period_days: 7 } } : {}),
      allow_promotion_codes: true,
      success_url: `${origin}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/plans?checkout=cancel`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
