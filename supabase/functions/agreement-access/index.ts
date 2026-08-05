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

const NOT_SPECIFIED: Record<string, string> = {
  en: "Not specified", uk: "Не вказано", ru: "Не указано", pl: "Nie podano", fr: "Non renseigné",
};
function notSpecifiedLabel(language: string) {
  return NOT_SPECIFIED[(language || "en").slice(0, 2)] || NOT_SPECIFIED.en;
}
function formatSignedAt(iso: string | null, language: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return d.toLocaleDateString(language || "en", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return d.toLocaleDateString("en");
  }
}

function renderVars(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{\s*([a-z_.]+)\s*\}\}/gi, (_, k) => vars[String(k).toLowerCase()] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const token = String(body?.token ?? "");
    const providedEmail = String(body?.email ?? "").trim().toLowerCase();
    const sessionToken = String(body?.session_token ?? "");
    if (!token || !sessionToken) {
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
    const email = String(inv.email_bound || "").toLowerCase();
    if (providedEmail && providedEmail !== email) {
      return new Response(JSON.stringify({ error: "email_mismatch" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate verified OTP session — content is only served after OTP verification
    const sessionHash = await sha256Hex(sessionToken);
    const { data: session } = await supabase
      .from("agreement_verified_sessions")
      .select("id, expires_at")
      .eq("session_token_hash", sessionHash)
      .eq("invitation_id", inv.id)
      .maybeSingle();
    if (!session) {
      return new Response(JSON.stringify({ error: "session_invalid" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (new Date(session.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "session_expired" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    const [{ data: rev }, { data: client }, { data: profile }, { data: instance }] = await Promise.all([
      supabase.from("agreement_revisions").select("id, revision_number, content_snapshot, controls_snapshot, content_hash").eq("id", inv.revision_id).maybeSingle(),
      supabase.from("clients").select("name, email, communication_language").eq("id", inv.client_id).maybeSingle(),
      supabase.from("profiles").select("full_name, business_name").eq("id", inv.user_id).maybeSingle(),
      supabase.from("agreement_instances").select("id, status, template_version_id").eq("id", inv.instance_id).maybeSingle(),
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

    const alreadyAccepted = !!inv.accepted_at;

    let acceptance: any = null;
    if (alreadyAccepted) {
      const { data: acc } = await supabase
        .from("agreement_acceptances")
        .select("id, answers, typed_name, accepted_at, evidence_hash")
        .eq("invitation_id", inv.id)
        .order("accepted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (acc) acceptance = acc;
    }

    // Personalize content
    const language = String((client as any).communication_language || "en");
    const signedAtIso: string | null = acceptance?.accepted_at || inv.accepted_at || null;
    const [first_name, ...rest] = String(client.name || "").trim().split(/\s+/);
    const notSpecified = notSpecifiedLabel(language);
    const signedAtLabel = formatSignedAt(signedAtIso, language);
    const vars: Record<string, string> = {
      "client.first_name": first_name || "",
      "client.last_name": rest.join(" "),
      "client.email": client.email || inv.email_bound,
      "therapist.business_name": profile?.business_name || notSpecified,
      "therapist.full_name": profile?.full_name || profile?.business_name || notSpecified,
      "document.signed_at": signedAtLabel,
      "today": signedAtLabel,
    };
    const contentRaw: any = rev.content_snapshot;
    const content = {
      ...(contentRaw && typeof contentRaw === "object" ? contentRaw : {}),
      title: renderVars(String(contentRaw?.title || ""), vars),
      sections: (contentRaw?.sections || []).map((s: any) => ({
        id: s.id, heading: renderVars(String(s.heading || ""), vars), body: renderVars(String(s.body || ""), vars),
      })),
    };

    const controlsRendered = (Array.isArray(rev.controls_snapshot) ? rev.controls_snapshot as any[] : []).map((c: any) => ({
      ...c, label: renderVars(String(c.label || ""), vars),
    }));

    let templateVersionNumber: number | null = null;
    if (instance.template_version_id) {
      const { data: tv } = await supabase
        .from("agreement_template_versions")
        .select("version_number")
        .eq("id", instance.template_version_id)
        .maybeSingle();
      templateVersionNumber = (tv as any)?.version_number ?? null;
    }

    return new Response(JSON.stringify({
      invitation_id: inv.id,
      instance_id: instance.id,
      revision_id: rev.id,
      status: instance.status,
      already_accepted: alreadyAccepted,
      accepted_at: inv.accepted_at,
      client_name: client.name,
      therapist_name: profile?.business_name || profile?.full_name || "",
      therapist_full_name: profile?.full_name || profile?.business_name || "",
      content,
      controls: controlsRendered,
      language,
      signed_at: signedAtIso,
      revision_number: (rev as any).revision_number ?? null,
      template_version_number: templateVersionNumber,
      acceptance,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: "server_error", message: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
