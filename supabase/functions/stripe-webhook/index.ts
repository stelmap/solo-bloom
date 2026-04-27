import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const log = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey) {
    return new Response("STRIPE_SECRET_KEY not set", { status: 500, headers: corsHeaders });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Verify webhook signature when configured
  let event: Stripe.Event;
  const body = await req.text();

  if (webhookSecret) {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature", { status: 400, headers: corsHeaders });
    }
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      log("Signature verification failed", { error: String(err) });
      return new Response("Invalid signature", { status: 400, headers: corsHeaders });
    }
  } else {
    // Dev fallback — only use when STRIPE_WEBHOOK_SECRET is not set
    log("WARNING: STRIPE_WEBHOOK_SECRET not set; skipping signature verification");
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch {
      return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
    }
  }

  log("Event received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "invoice.paid": {
        const email = await extractCustomerEmail(stripe, event);
        if (!email) {
          log("No email found on event; skipping");
          break;
        }

        const userId = await findUserIdByEmail(supabaseAdmin, email);
        if (!userId) {
          log("No matching user for email", { email });
          break;
        }

        // Check the subscription is actually active/trialing before cleanup
        const isPaid = await isUserPaid(stripe, email);
        if (!isPaid) {
          log("Subscription not active; skipping cleanup", { userId });
          break;
        }

        // Run cleanup (idempotent)
        const { data, error } = await supabaseAdmin.rpc("cleanup_demo_workspace", {
          p_user_id: userId,
        });
        if (error) {
          log("cleanup_demo_workspace failed", { userId, error: error.message });
        } else {
          log("Demo cleanup completed", { userId, result: data });
        }

        // Invalidate subscription cache so the next /check-subscription is fresh
        await supabaseAdmin
          .from("subscription_cache")
          .update({ checked_at: new Date(0).toISOString() })
          .eq("user_id", userId);
        break;
      }
      default:
        log("Unhandled event type", { type: event.type });
    }
  } catch (err) {
    log("Handler error", { error: err instanceof Error ? err.message : String(err) });
    // Still return 200 so Stripe doesn't retry forever on logic errors;
    // signature/auth errors above already returned non-2xx.
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});

async function extractCustomerEmail(stripe: Stripe, event: Stripe.Event): Promise<string | null> {
  const obj = event.data.object as Record<string, unknown>;

  const directEmail = (obj["customer_email"] as string | undefined) ?? null;
  if (directEmail) return directEmail;

  const customerId = (obj["customer"] as string | undefined) ?? null;
  if (!customerId) return null;

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !customer.deleted && "email" in customer) {
      return customer.email ?? null;
    }
  } catch (e) {
    console.error("Failed to retrieve customer:", e);
  }
  return null;
}

async function findUserIdByEmail(
  supabaseAdmin: any,
  email: string
): Promise<string | null> {
  // Use admin auth API to find user by email
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error("listUsers failed:", error);
    return null;
  }
  const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}

async function isUserPaid(stripe: Stripe, email: string): Promise<boolean> {
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length === 0) return false;
  const customerId = customers.data[0].id;
  const active = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
  if (active.data.length > 0) return true;
  const trialing = await stripe.subscriptions.list({ customer: customerId, status: "trialing", limit: 1 });
  return trialing.data.length > 0;
}
