// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadInvitationByToken, invitationErrorCode, randomDigits, sha256Hex } from "../_shared/agreement-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_NAME = "solo-bizz-app";
const SENDER_DOMAIN = "notify.one-bizz.com";
const FROM_DOMAIN = "notify.one-bizz.com";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function otpEmailHtml(code: string, therapist: string) {
  const safe = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
    <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px">
      <h1 style="margin:0 0 8px;font-size:20px">Your verification code</h1>
      <p style="margin:0 0 16px;color:#475569;font-size:14px">${safe(therapist)} has shared an agreement with you. Enter this code to open and sign it securely.</p>
      <div style="font-size:32px;letter-spacing:6px;font-weight:700;text-align:center;padding:16px;background:#f1f5f9;border-radius:8px">${safe(code)}</div>
      <p style="margin:16px 0 0;color:#64748b;font-size:12px">This code expires in ${OTP_TTL_MINUTES} minutes. If you did not request it, you can ignore this email.</p>
    </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const token = String(body?.token ?? "");
    const providedEmail = String(body?.email ?? "").trim().toLowerCase();
    if (!token) {
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

    // Rate limit: throttle if last challenge < 30s ago
    const { data: recent } = await supabase
      .from("agreement_otp_challenges")
      .select("id, created_at")
      .eq("invitation_id", inv.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent && Date.now() - new Date(recent.created_at).getTime() < 30_000) {
      return json({ error: "rate_limited", retry_after_seconds: 30 }, 429);
    }

    // Invalidate previous unconsumed challenges
    await supabase
      .from("agreement_otp_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("invitation_id", inv.id)
      .is("consumed_at", null);

    const code = randomDigits(6);
    const codeHash = await sha256Hex(`${inv.id}:${code}`);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();

    const { error: insErr } = await supabase.from("agreement_otp_challenges").insert({
      invitation_id: inv.id,
      otp_hash: codeHash,
      attempts: 0,
      max_attempts: MAX_ATTEMPTS,
      expires_at: expiresAt,
    });
    if (insErr) return json({ error: "server_error", message: insErr.message }, 500);

    // Look up therapist branding for email
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_name, full_name")
      .eq("id", inv.user_id)
      .maybeSingle();
    const therapistName = profile?.business_name || profile?.full_name || "Your therapist";

    // Enqueue email through managed pipeline (same as send-transactional-email)
    const messageId = crypto.randomUUID();
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: "agreement-otp",
      recipient_email: email,
      status: "pending",
    });
    const { error: qErr } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: email,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: `Your verification code: ${code}`,
        html: otpEmailHtml(code, therapistName),
        text: `Your verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
        purpose: "transactional",
        label: "agreement-otp",
        queued_at: new Date().toISOString(),
      },
    });
    if (qErr) {
      console.error("[agreement-otp-request] enqueue failed", qErr);
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "agreement-otp",
        recipient_email: email,
        status: "failed",
        error_message: qErr.message,
      });
      return json({ error: "email_send_failed" }, 500);
    }

    await supabase.from("agreement_audit_events").insert({
      instance_id: inv.instance_id,
      invitation_id: inv.id,
      user_id: inv.user_id,
      event_type: "otp_requested",
    });

    return json({ ok: true, expires_at: expiresAt, ttl_minutes: OTP_TTL_MINUTES });
  } catch (e) {
    return json({ error: "server_error", message: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
