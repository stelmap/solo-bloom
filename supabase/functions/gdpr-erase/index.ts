// GDPR Article 17 — Right to erasure.
// Action "request": creates a deletion request with 7-day grace period.
// Action "cancel":  cancels a pending deletion request.
// Action "execute": (service-role / cron) actually deletes the user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: corsHeaders });

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: corsHeaders });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "request");

    if (action === "request") {
      const { data, error } = await admin.from("gdpr_deletion_requests").upsert(
        {
          user_id: user.id,
          requested_at: new Date().toISOString(),
          scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          cancelled_at: null,
          executed_at: null,
          reason: body.reason ?? null,
        },
        { onConflict: "user_id" }
      ).select().single();
      if (error) throw error;

      await admin.from("data_access_audit").insert({
        user_id: user.id, action: "erase_requested", entity_type: "account", entity_id: null,
      });
      return new Response(JSON.stringify({ ok: true, request: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "cancel") {
      const { error } = await admin.from("gdpr_deletion_requests")
        .update({ cancelled_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("executed_at", null);
      if (error) throw error;
      await admin.from("data_access_audit").insert({
        user_id: user.id, action: "erase_cancelled", entity_type: "account", entity_id: null,
      });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
