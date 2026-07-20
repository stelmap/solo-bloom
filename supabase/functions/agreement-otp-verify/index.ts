// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadInvitationByToken, invitationErrorCode, randomHex, sha256Hex } from "../_shared/agreement-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SESSION_TTL_HOURS = 24;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const token = String(body?.token ?? "");
    const providedEmail = String(body?.email ?? "").trim().toLowerCase();
    const code = String(body?.code ?? "").trim();
    if (!token || !/^\d{6}$/.test(code)) {
      return json({ error: "invalid_input" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const inv = await loadInvitationByToken(supabase, token);
    const err = invitationErrorCode(inv);
    if (err) return json({ error: err }, err === "not_found" ? 404 : 410);
    const email = String(inv.email_bound || "").toLowerCase();
    if (providedEmail && providedEmail !== email) return json({ error: "email_mismatch" }, 403);

    const { data: challenge } = await supabase
      .from("agreement_otp_challenges")
      .select("*")
      .eq("invitation_id", inv.id)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!challenge) return json({ error: "otp_not_found" }, 404);
    if (new Date(challenge.expires_at).getTime() < Date.now()) return json({ error: "otp_expired" }, 410);
    if (challenge.attempts >= challenge.max_attempts) return json({ error: "otp_locked" }, 429);

    const codeHash = await sha256Hex(`${inv.id}:${code}`);
    if (codeHash !== challenge.otp_hash) {
      await supabase
        .from("agreement_otp_challenges")
        .update({ attempts: challenge.attempts + 1 })
        .eq("id", challenge.id);
      const remaining = Math.max(0, challenge.max_attempts - (challenge.attempts + 1));
      return json({ error: "otp_invalid", attempts_remaining: remaining }, 401);
    }

    // Consume challenge & mint session
    await supabase
      .from("agreement_otp_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", challenge.id);

    const sessionToken = randomHex(32);
    const sessionHash = await sha256Hex(sessionToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600_000).toISOString();

    const { error: insErr } = await supabase.from("agreement_verified_sessions").insert({
      invitation_id: inv.id,
      revision_id: inv.revision_id,
      session_token_hash: sessionHash,
      expires_at: expiresAt,
    });
    if (insErr) return json({ error: "server_error", message: insErr.message }, 500);

    await supabase.from("agreement_audit_events").insert({
      instance_id: inv.instance_id,
      invitation_id: inv.id,
      user_id: inv.user_id,
      event_type: "otp_verified",
    });

    return json({ ok: true, session_token: sessionToken, expires_at: expiresAt });
  } catch (e) {
    return json({ error: "server_error", message: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
