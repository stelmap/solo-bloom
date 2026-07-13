import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Runs daily via pg_cron. Promotes overdue deactivation_pending users
// to ready_for_deletion. Deletion itself remains a manual admin action.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // With verify_jwt = true, the gateway has verified the JWT signature.
    // We additionally enforce that only service_role tokens (pg_cron) can invoke.
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    try {
      const verifier = createClient(supabaseUrl, anonKey);
      const { data, error } = await verifier.auth.getClaims(bearer);
      if (error || data?.claims?.role !== "service_role") {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: settings } = await admin
      .from("lifecycle_settings")
      .select("cron_enabled")
      .maybeSingle();

    if (settings && settings.cron_enabled === false) {
      return new Response(JSON.stringify({ ok: true, skipped: "cron_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await admin.rpc("promote_expired_deactivations");
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, promoted: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
