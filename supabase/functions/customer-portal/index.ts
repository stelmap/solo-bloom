import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { paddleCorsHeaders as corsHeaders, paddleFetch } from "../_shared/paddle.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const customers = await paddleFetch<{ data: Array<{ id: string }> }>(
      `/customers?email=${encodeURIComponent(user.email)}&per_page=1`,
    );
    const customerId = customers.data?.[0]?.id;
    if (!customerId) throw new Error("No billing account found");

    const subs = await paddleFetch<{ data: Array<{ id: string }> }>(
      `/subscriptions?customer_id=${customerId}&status=active,trialing,past_due,paused&per_page=20`,
    );

    const portal = await paddleFetch<{ data: { urls: { general: { overview: string } } } }>(
      `/customers/${customerId}/portal-sessions`,
      { method: "POST", body: { subscription_ids: subs.data?.map((s) => s.id) ?? [] } },
    );

    return new Response(JSON.stringify({ url: portal.data.urls.general.overview }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[CUSTOMER-PORTAL]", message);
    return new Response(JSON.stringify({ error: "Could not open the billing portal." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
