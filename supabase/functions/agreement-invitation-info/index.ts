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

function maskEmail(email: string): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  const head = local.length <= 2 ? local[0] || "" : local.slice(0, 2);
  return `${head}${"•".repeat(Math.max(4, Math.min(8, Math.max(1, local.length - head.length))))}@${domain}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token ?? "");
    if (!token) return json({ error: "invalid_input" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const tokenHash = await sha256Hex(token);
    const { data: inv } = await supabase
      .from("agreement_invitations")
      .select("id, user_id, email_bound, revoked_at, expires_at, accepted_at, revision_id")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (!inv) return json({ error: "not_found" }, 404);

    const revoked = !!inv.revoked_at;
    const expired = new Date(inv.expires_at).getTime() < Date.now();
    const alreadyAccepted = !!inv.accepted_at;

    const [{ data: profile }, { data: rev }] = await Promise.all([
      supabase.from("profiles").select("full_name, business_name, avatar_url").eq("id", inv.user_id).maybeSingle(),
      supabase.from("agreement_revisions").select("content_snapshot").eq("id", inv.revision_id).maybeSingle(),
    ]);

    const contentRaw: any = rev?.content_snapshot ?? {};
    return json({
      therapist_name: profile?.full_name || "",
      business_name: profile?.business_name || "",
      therapist_avatar_url: profile?.avatar_url || "",
      masked_email: maskEmail(String(inv.email_bound || "").toLowerCase()),
      agreement_title: String(contentRaw?.title || ""),
      revoked,
      expired,
      already_accepted: alreadyAccepted,
    });
  } catch (e) {
    return json({ error: "server_error", message: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
