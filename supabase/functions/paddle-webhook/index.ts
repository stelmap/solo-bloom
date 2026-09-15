import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, paddle-signature",
};

const log = (step: string, details?: unknown) => {
  const tail = details !== undefined ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PADDLE-WEBHOOK] ${step}${tail}`);
};

/** Paddle sends `Paddle-Signature: ts=<unix>;h1=<hex hmac sha256 of `${ts}:${rawBody}`>` */
async function verifySignature(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(";").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  ) as Record<string, string>;
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  // Reject payloads older than 5 minutes (replay protection).
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 300) {
    log("Timestamp outside tolerance", { ts });
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}:${rawBody}`));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected.length !== h1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ h1.charCodeAt(i);
  return diff === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const webhookSecret = Deno.env.get("PADDLE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    log("PADDLE_WEBHOOK_SECRET not configured");
    return new Response("PADDLE_WEBHOOK_SECRET not configured", { status: 500, headers: corsHeaders });
  }

  const rawBody = await req.text();
  const valid = await verifySignature(rawBody, req.headers.get("paddle-signature"), webhookSecret);
  if (!valid) {
    log("Signature verification failed");
    return new Response("Invalid signature", { status: 400, headers: corsHeaders });
  }

  let event: { event_type?: string; event_id?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  log("Event received", { type: event.event_type, id: event.event_id });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    switch (event.event_type) {
      case "subscription.created":
      case "subscription.updated":
      case "subscription.activated":
      case "subscription.canceled":
      case "subscription.paused":
      case "subscription.resumed":
      case "transaction.completed": {
        const data = (event.data ?? {}) as Record<string, any>;
        const userId: string | null =
          (data.custom_data?.user_id as string | undefined) ?? null;

        if (!userId) {
          log("No user_id in custom_data; skipping", { type: event.event_type });
          break;
        }

        // Invalidate the subscription cache so the next entitlement check is fresh.
        await supabaseAdmin
          .from("subscription_cache")
          .update({ checked_at: new Date(0).toISOString() })
          .eq("user_id", userId);

        log("Cache invalidated", { userId, type: event.event_type });
        break;
      }
      default:
        log("Unhandled event type", { type: event.event_type });
    }
  } catch (err) {
    log("Handler error", { error: err instanceof Error ? err.message : String(err) });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
