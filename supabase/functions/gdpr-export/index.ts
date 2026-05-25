// GDPR Article 15/20 — Right of access & data portability.
// Returns a JSON bundle of everything the authenticated user owns.
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: corsHeaders });

    const uid = user.id;
    const tables = [
      "profiles", "clients", "client_notes", "client_attachments", "client_credits",
      "client_price_changes", "client_status_audit", "appointments", "services",
      "groups", "group_members", "group_sessions", "group_attendance", "group_session_payments",
      "income", "income_session_allocations", "income_audit", "expected_payments",
      "expenses", "supervisions", "invoices", "payment_corrections", "payment_methods",
      "recurring_rules", "booking_links", "booking_availability", "session_booking_requests",
      "days_off", "breakeven_goals", "data_access_audit",
    ];

    const bundle: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      user: { id: user.id, email: user.email, created_at: user.created_at },
    };

    for (const t of tables) {
      const { data, error } = await supabase.from(t).select("*").eq("user_id", uid);
      bundle[t] = error ? { error: error.message } : data;
    }

    await supabase.from("data_access_audit").insert({
      user_id: uid, action: "export", entity_type: "account", entity_id: null,
      metadata: { format: "json" },
    });

    return new Response(JSON.stringify(bundle, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="my-data-${uid}-${Date.now()}.json"`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
