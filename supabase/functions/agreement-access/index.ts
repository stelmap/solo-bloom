// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sha256Hex(s: string) {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function renderVars(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{\s*([a-z_.]+)\s*\}\}/gi, (_, k) => vars[k] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const token = String(body?.token ?? "");
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!token || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "invalid_input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const tokenHash = await sha256Hex(token);
    const { data: inv, error } = await supabase
      .from("agreement_invitations")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error || !inv) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (inv.revoked_at) {
      return new Response(JSON.stringify({ error: "revoked" }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (new Date(inv.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "expired" }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (String(inv.email_bound).toLowerCase() !== email) {
      return new Response(JSON.stringify({ error: "email_mismatch" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [{ data: rev }, { data: client }, { data: profile }, { data: instance }] = await Promise.all([
      supabase.from("agreement_revisions").select("id, content_snapshot, controls_snapshot, content_hash").eq("id", inv.revision_id).maybeSingle(),
      supabase.from("clients").select("name, email").eq("id", inv.client_id).maybeSingle(),
      supabase.from("profiles").select("full_name, business_name").eq("id", inv.user_id).maybeSingle(),
      supabase.from("agreement_instances").select("id, status").eq("id", inv.instance_id).maybeSingle(),
    ]);
    if (!rev || !client || !instance) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark opened and log audit (idempotent)
    if (!inv.opened_at) {
      await supabase.from("agreement_invitations").update({ opened_at: new Date().toISOString() }).eq("id", inv.id);
      if (instance.status === "sent" || instance.status === "draft") {
        await supabase.from("agreement_instances").update({ status: "opened" }).eq("id", instance.id);
      }
      await supabase.from("agreement_audit_events").insert({
        instance_id: instance.id, invitation_id: inv.id, user_id: inv.user_id, event_type: "invitation_opened",
      });
    }

    // Personalize content
    const [first_name, ...rest] = String(client.name || "").trim().split(/\s+/);
    const vars: Record<string, string> = {
      "client.first_name": first_name || "",
      "client.last_name": rest.join(" "),
      "client.email": client.email || inv.email_bound,
      "therapist.business_name": profile?.business_name || "",
      "therapist.full_name": profile?.full_name || "",
      "today": new Date().toLocaleDateString(),
    };
    const contentRaw: any = rev.content_snapshot;
    const content = {
      title: renderVars(String(contentRaw?.title || ""), vars),
      sections: (contentRaw?.sections || []).map((s: any) => ({
        id: s.id, heading: renderVars(String(s.heading || ""), vars), body: renderVars(String(s.body || ""), vars),
      })),
    };

    const alreadyAccepted = !!inv.accepted_at;

    return new Response(JSON.stringify({
      invitation_id: inv.id,
      instance_id: instance.id,
      revision_id: rev.id,
      status: instance.status,
      already_accepted: alreadyAccepted,
      accepted_at: inv.accepted_at,
      client_name: client.name,
      therapist_name: profile?.business_name || profile?.full_name || "",
      content,
      controls: rev.controls_snapshot,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: "server_error", message: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
