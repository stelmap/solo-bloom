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

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
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
    const typedName = String(body?.typed_name ?? "").trim();
    const answersInput = (body?.answers ?? {}) as Record<string, any>;

    if (!token || !email || !typedName || typedName.length > 200) {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const tokenHash = await sha256Hex(token);
    const { data: inv } = await supabase
      .from("agreement_invitations")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (!inv) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (inv.revoked_at) return new Response(JSON.stringify({ error: "revoked" }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (inv.accepted_at) return new Response(JSON.stringify({ error: "already_accepted" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (new Date(inv.expires_at).getTime() < Date.now()) return new Response(JSON.stringify({ error: "expired" }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (String(inv.email_bound).toLowerCase() !== email) return new Response(JSON.stringify({ error: "email_mismatch" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: rev } = await supabase.from("agreement_revisions").select("*").eq("id", inv.revision_id).maybeSingle();
    const { data: client } = await supabase.from("clients").select("name, email").eq("id", inv.client_id).maybeSingle();
    const { data: profile } = await supabase.from("profiles").select("full_name, business_name").eq("id", inv.user_id).maybeSingle();
    if (!rev || !client) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Validate controls
    const controls = Array.isArray(rev.controls_snapshot) ? rev.controls_snapshot as any[] : [];
    const cleanAnswers: Record<string, any> = {};
    for (const c of controls) {
      const val = answersInput[c.id];
      if (c.type === "required_checkbox") {
        if (val !== true) {
          return new Response(JSON.stringify({ error: "missing_required", control_id: c.id }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        cleanAnswers[c.id] = true;
      } else if (c.type === "optional_checkbox") {
        cleanAnswers[c.id] = val === true;
      } else if (c.type === "typed_acknowledgement") {
        const s = String(val ?? "").trim();
        if (!s || s.length > 500) {
          return new Response(JSON.stringify({ error: "missing_required", control_id: c.id }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        cleanAnswers[c.id] = s;
      }
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;
    const acceptedAt = new Date().toISOString();

    const evidencePayload = JSON.stringify({
      revision_hash: rev.content_hash,
      answers: cleanAnswers,
      typed_name: typedName,
      email,
      accepted_at: acceptedAt,
      ip,
      user_agent: userAgent,
    });
    const evidenceHash = await sha256Hex(evidencePayload);

    // Insert acceptance
    const { data: acc, error: accErr } = await supabase
      .from("agreement_acceptances")
      .insert({
        user_id: inv.user_id,
        instance_id: inv.instance_id,
        revision_id: rev.id,
        invitation_id: inv.id,
        client_id: inv.client_id,
        answers: cleanAnswers,
        typed_name: typedName,
        ip_address: ip,
        user_agent: userAgent,
        accepted_at: acceptedAt,
        evidence_hash: evidenceHash,
      })
      .select()
      .single();
    if (accErr) throw accErr;

    // Render final document HTML
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
    const sectionsHtml = (contentRaw?.sections || [])
      .map((s: any) => `<section><h2>${escapeHtml(renderVars(s.heading || "", vars))}</h2><div>${escapeHtml(renderVars(s.body || "", vars)).replace(/\n/g, "<br/>")}</div></section>`)
      .join("");
    const controlsHtml = controls.map((c: any) => {
      const ans = cleanAnswers[c.id];
      const answer = c.type === "typed_acknowledgement" ? `"${escapeHtml(String(ans))}"` : (ans ? "✓" : "—");
      return `<li><strong>${escapeHtml(c.label || "")}</strong> — ${answer}</li>`;
    }).join("");

    const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(contentRaw?.title || "Agreement")}</title>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#111;line-height:1.55}h1{font-size:22px}h2{font-size:16px;margin-top:24px}ul{padding-left:20px}.evidence{margin-top:40px;padding:16px;background:#f7f7f9;border-radius:8px;font-size:12px;color:#444}</style>
</head><body>
<h1>${escapeHtml(renderVars(contentRaw?.title || "", vars))}</h1>
${sectionsHtml}
<h2>Client acknowledgements</h2>
<ul>${controlsHtml}</ul>
<div class="evidence">
<p><strong>Signed by:</strong> ${escapeHtml(typedName)} &lt;${escapeHtml(email)}&gt;</p>
<p><strong>Accepted at:</strong> ${escapeHtml(acceptedAt)}</p>
<p><strong>IP:</strong> ${escapeHtml(ip || "n/a")}</p>
<p><strong>User agent:</strong> ${escapeHtml(userAgent || "n/a")}</p>
<p><strong>Revision hash:</strong> ${escapeHtml(rev.content_hash)}</p>
<p><strong>Evidence hash:</strong> ${escapeHtml(evidenceHash)}</p>
</div>
</body></html>`;

    const storagePath = `${inv.user_id}/${inv.instance_id}/${acc.id}.html`;
    const upload = await supabase.storage.from("agreement-documents").upload(storagePath, new Blob([doc], { type: "text/html" }), {
      contentType: "text/html", upsert: true,
    });
    if (upload.error) throw upload.error;

    await supabase.from("accepted_documents").insert({
      user_id: inv.user_id,
      instance_id: inv.instance_id,
      revision_id: rev.id,
      acceptance_id: acc.id,
      client_id: inv.client_id,
      storage_bucket: "agreement-documents",
      storage_path: storagePath,
      mime_type: "text/html",
      evidence_hash: evidenceHash,
    });

    await supabase.from("agreement_invitations").update({ accepted_at: acceptedAt, verified_at: inv.verified_at || acceptedAt }).eq("id", inv.id);
    await supabase.from("agreement_instances").update({ status: "accepted" }).eq("id", inv.instance_id);
    await supabase.from("agreement_audit_events").insert({
      instance_id: inv.instance_id, invitation_id: inv.id, user_id: inv.user_id, event_type: "acceptance_recorded", metadata: { evidence_hash: evidenceHash },
    });

    return new Response(JSON.stringify({ ok: true, acceptance_id: acc.id, accepted_at: acceptedAt, evidence_hash: evidenceHash }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "server_error", message: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
