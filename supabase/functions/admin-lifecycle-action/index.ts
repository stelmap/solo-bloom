import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action =
  | "deactivate"
  | "cancel_deactivation"
  | "resend_email"
  | "delete_permanently"
  | "cancel_deletion";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleOk } = await admin.rpc("has_role", {
      _user_id: userData.user.id, _role: "admin",
    });
    if (!roleOk) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as Action;
    const targetUserId = body?.user_id as string;
    const confirmation = body?.confirmation as string | undefined;
    if (!action || !targetUserId) return json({ error: "Missing action or user_id" }, 400);

    // Load target user
    const { data: target } = await admin.auth.admin.getUserById(targetUserId);
    if (!target?.user) return json({ error: "User not found" }, 404);
    const targetEmail = target.user.email ?? null;

    // Load lifecycle row (create if missing)
    const { data: existing } = await admin
      .from("user_lifecycle")
      .select("*")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!existing) {
      await admin.from("user_lifecycle").insert({ user_id: targetUserId, status: "active" });
    }
    const previousStatus = existing?.status ?? "active";

    // Grace period
    const { data: settings } = await admin.from("lifecycle_settings").select("deletion_grace_days").maybeSingle();
    const graceDays = settings?.deletion_grace_days ?? 7;

    // Detect language from profile
    const { data: profile } = await admin.from("profiles").select("language").eq("user_id", targetUserId).maybeSingle();
    const language = (profile?.language === "uk" ? "uk" : "en");

    const audit = async (a: string, extra: Record<string, unknown> = {}, newStatus?: string) => {
      await admin.from("user_lifecycle_audit").insert({
        user_id: targetUserId,
        user_email: targetEmail,
        admin_id: userData.user!.id,
        action: a,
        previous_status: previousStatus,
        new_status: newStatus ?? null,
        ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || null,
        metadata: extra,
      });
    };

    const sendWarning = async () => {
      if (!targetEmail) return { ok: false, error: "no email" };
      const { data, error } = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "account-deactivation-warning",
          recipientEmail: targetEmail,
          idempotencyKey: `deactivation-warning-${targetUserId}-${Date.now()}`,
          templateData: { language, loginUrl: "https://solo-bizz.com/auth" },
        },
      });
      return { ok: !error, error, data };
    };

    switch (action) {
      case "deactivate": {
        if (previousStatus === "deleted") return json({ error: "User already deleted" }, 400);
        const planned = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000).toISOString();
        const emailRes = await sendWarning();
        await admin.from("user_lifecycle").update({
          status: "deactivation_pending",
          deactivation_email_sent_at: new Date().toISOString(),
          planned_deletion_date: planned,
          deactivated_by: userData.user.id,
          reactivated_at: null,
        }).eq("user_id", targetUserId);
        await audit("deactivated", { grace_days: graceDays, email_ok: emailRes.ok }, "deactivation_pending");
        return json({ ok: true, planned_deletion_date: planned, email_sent: emailRes.ok });
      }
      case "cancel_deactivation": {
        await admin.from("user_lifecycle").update({
          status: "active",
          planned_deletion_date: null,
          deactivation_email_sent_at: null,
          deactivated_by: null,
        }).eq("user_id", targetUserId);
        await audit("cancelled_deactivation", {}, "active");
        return json({ ok: true });
      }
      case "resend_email": {
        if (previousStatus !== "deactivation_pending") return json({ error: "User is not pending" }, 400);
        const emailRes = await sendWarning();
        await admin.from("user_lifecycle").update({
          deactivation_email_sent_at: new Date().toISOString(),
        }).eq("user_id", targetUserId);
        await audit("email_resent", { email_ok: emailRes.ok });
        return json({ ok: emailRes.ok });
      }
      case "cancel_deletion": {
        if (previousStatus !== "ready_for_deletion") return json({ error: "User is not ready for deletion" }, 400);
        await admin.from("user_lifecycle").update({
          status: "active",
          planned_deletion_date: null,
          deactivation_email_sent_at: null,
          deactivated_by: null,
        }).eq("user_id", targetUserId);
        await audit("cancelled_deletion", {}, "active");
        return json({ ok: true });
      }
      case "delete_permanently": {
        if (confirmation !== "DELETE") return json({ error: "Confirmation required (type DELETE)" }, 400);
        if (previousStatus !== "ready_for_deletion") return json({ error: "User is not ready for deletion" }, 400);

        // Send final email BEFORE deleting the auth user (address becomes unavailable after)
        if (targetEmail) {
          await admin.functions.invoke("send-transactional-email", {
            body: {
              templateName: "account-deleted-final",
              recipientEmail: targetEmail,
              idempotencyKey: `deletion-final-${targetUserId}-${Date.now()}`,
              templateData: { language },
            },
          });
        }

        // Mark lifecycle as deleted first (audit preserved even if auth delete fails)
        await admin.from("user_lifecycle").update({
          status: "deleted",
          deleted_at: new Date().toISOString(),
          deleted_by: userData.user.id,
        }).eq("user_id", targetUserId);

        // Delete auth.users row — user-owned data cascades via existing FKs; anything
        // not cascaded is orphaned but no longer reachable via auth.
        const { error: delErr } = await admin.auth.admin.deleteUser(targetUserId);
        await audit("deleted", { auth_delete_error: delErr?.message ?? null }, "deleted");
        if (delErr) return json({ ok: false, error: delErr.message }, 500);
        return json({ ok: true });
      }
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
