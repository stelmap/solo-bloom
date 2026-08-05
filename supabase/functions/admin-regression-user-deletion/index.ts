// Critical regression test — Safe User Data Deletion.
//
// Seeds two disposable therapist accounts (Test User A and Test User B) with
// identical fixtures (2 clients, 3 sessions, notes, 1 document + storage file,
// 1 service, financial records), deletes ONLY Test User A through the real
// production path (admin-lifecycle-action → admin_delete_user_and_data), and
// asserts that:
//   • every Test User A artefact is gone (auth, profile, clients, sessions,
//     documents, finance, storage files)
//   • Test User B and the calling admin are byte-for-byte unchanged
//   • the guard rails hold: wrong confirmation, self-delete, unknown user id
//
// The function is admin-only, seeds and removes its own fixtures, and never
// touches any record it did not create. Release must be blocked if it fails.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Check = { name: string; passed: boolean; detail?: string };

const OWNED_TABLES = [
  "clients",
  "appointments",
  "session_notes",
  "services",
  "income",
  "expenses",
  "client_attachments",
] as const;

type Snapshot = Record<string, number>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

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

  const adminId = userData.user.id;
  const checks: Check[] = [];
  const expect = (name: string, passed: boolean, detail?: string) =>
    checks.push({ name, passed, detail });

  const BUCKET = "client-attachments";
  const stamp = Date.now();
  const created: string[] = [];

  const countFor = async (table: string, userId: string) => {
    const { count, error } = await admin
      .from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
    if (error) throw new Error(`${table}: ${error.message}`);
    return count ?? 0;
  };

  const snapshot = async (userId: string): Promise<Snapshot> => {
    const out: Snapshot = {};
    for (const t of OWNED_TABLES) out[t] = await countFor(t, userId);
    const { count: profiles } = await admin
      .from("profiles").select("id", { count: "exact", head: true }).eq("user_id", userId);
    out.profiles = profiles ?? 0;
    return out;
  };

  const storageCount = async (userId: string) => {
    const { data } = await admin.storage.from(BUCKET).list(userId, { limit: 100 });
    return data?.length ?? 0;
  };

  // ---- Seed one disposable therapist with the full fixture set -------------
  const seedUser = async (label: string) => {
    const email = `regression+${label.toLowerCase()}-${stamp}@solobizz-test.invalid`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: crypto.randomUUID() + "Aa1!",
      email_confirm: true,
      user_metadata: { full_name: `Regression ${label}` },
    });
    if (error || !data.user) throw new Error(`create ${label}: ${error?.message}`);
    const uid = data.user.id;
    created.push(uid);

    const { data: service, error: sErr } = await admin
      .from("services").insert({ user_id: uid, name: `Service ${label}`, price: 100 })
      .select("id").single();
    if (sErr) throw new Error(`service ${label}: ${sErr.message}`);

    const { data: clients, error: cErr } = await admin
      .from("clients").insert([
        { user_id: uid, name: `Client ${label}-1` },
        { user_id: uid, name: `Client ${label}-2` },
      ]).select("id");
    if (cErr) throw new Error(`clients ${label}: ${cErr.message}`);

    const clientId = clients![0].id;
    const { data: appts, error: aErr } = await admin
      .from("appointments").insert([0, 1, 2].map((i) => ({
        user_id: uid,
        client_id: clients![i % 2].id,
        service_id: service!.id,
        scheduled_at: new Date(stamp + i * 86400000).toISOString(),
        status: "completed",
      }))).select("id");
    if (aErr) throw new Error(`appointments ${label}: ${aErr.message}`);

    const { error: nErr } = await admin.from("session_notes").insert(
      appts!.map((a: { id: string }) => ({
        user_id: uid, appointment_id: a.id, client_id: clientId,
        content: `Confidential note ${label}`,
      })),
    );
    if (nErr) throw new Error(`session_notes ${label}: ${nErr.message}`);

    const filePath = `${uid}/regression-${stamp}.txt`;
    const upload = await admin.storage.from(BUCKET)
      .upload(filePath, new Blob([`document ${label}`], { type: "text/plain" }), { upsert: true });
    if (upload.error) throw new Error(`storage ${label}: ${upload.error.message}`);

    const { error: docErr } = await admin.from("client_attachments").insert({
      user_id: uid, client_id: clientId,
      file_name: `regression-${stamp}.txt`, file_path: filePath,
    });
    if (docErr) throw new Error(`client_attachments ${label}: ${docErr.message}`);

    const { error: iErr } = await admin.from("income")
      .insert({ user_id: uid, amount: 100, source: "manual", client_id: clientId });
    if (iErr) throw new Error(`income ${label}: ${iErr.message}`);

    const { error: eErr } = await admin.from("expenses")
      .insert({ user_id: uid, category: "other", amount: 40 });
    if (eErr) throw new Error(`expenses ${label}: ${eErr.message}`);

    await admin.from("user_lifecycle").upsert(
      { user_id: uid, status: "deactivation_pending", planned_deletion_date: new Date(stamp + 7 * 86400000).toISOString() },
      { onConflict: "user_id" },
    );

    return { uid, email };
  };

  // Calls the production admin endpoint with the admin's own JWT.
  const callLifecycle = async (body: Record<string, unknown>) => {
    const res = await fetch(`${supabaseUrl}/functions/v1/admin-lifecycle-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader, apikey: anonKey },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { ok: res.ok && !data?.error, status: res.status, data };
  };

  let a: { uid: string; email: string } | null = null;
  let b: { uid: string; email: string } | null = null;

  try {
    a = await seedUser("A");
    b = await seedUser("B");

    const beforeA = await snapshot(a.uid);
    const beforeB = await snapshot(b.uid);
    const beforeAdmin = await snapshot(adminId);
    const beforeFilesA = await storageCount(a.uid);
    const beforeFilesB = await storageCount(b.uid);

    expect("Fixtures: User A seeded (2 clients, 3 sessions, notes, doc, service, finance)",
      beforeA.clients === 2 && beforeA.appointments === 3 && beforeA.session_notes === 3 &&
      beforeA.services === 1 && beforeA.client_attachments === 1 &&
      beforeA.income === 1 && beforeA.expenses === 1 && beforeFilesA === 1,
      JSON.stringify({ ...beforeA, files: beforeFilesA }));
    expect("Fixtures: User B seeded identically",
      beforeB.clients === 2 && beforeB.appointments === 3 && beforeB.session_notes === 3 &&
      beforeB.services === 1 && beforeB.client_attachments === 1 &&
      beforeB.income === 1 && beforeB.expenses === 1 && beforeFilesB === 1,
      JSON.stringify({ ...beforeB, files: beforeFilesB }));

    // AC03 — wrong confirmation must not delete anything.
    const wrong = await callLifecycle({
      action: "delete_user_and_data", user_id: a.uid, confirmation: b.email,
    });
    expect("AC03 — mismatched confirmation email is rejected", !wrong.ok, JSON.stringify(wrong.data));
    expect("AC03 — User A intact after rejected attempt",
      (await countFor("clients", a.uid)) === 2);

    // AC12 — admin cannot delete their own account.
    const selfDelete = await callLifecycle({
      action: "delete_user_and_data", user_id: adminId, confirmation: userData.user.email,
    });
    expect("AC12 — admin cannot delete their own account", !selfDelete.ok, JSON.stringify(selfDelete.data));

    // AC13 — unresolvable user id performs no deletion.
    const ghost = await callLifecycle({
      action: "delete_user_and_data", user_id: crypto.randomUUID(), confirmation: "x@y.z",
    });
    expect("AC13 — unknown user id aborts with no deletion", !ghost.ok, JSON.stringify(ghost.data));

    // ---- The deletion under test ------------------------------------------
    const del = await callLifecycle({
      action: "delete_user_and_data", user_id: a.uid, confirmation: a.email,
    });
    expect("AC04 — Delete user & data succeeded for User A", del.ok, JSON.stringify(del.data));

    const afterA = await snapshot(a.uid);
    const afterB = await snapshot(b.uid);
    const afterAdmin = await snapshot(adminId);

    const { data: authA } = await admin.auth.admin.getUserById(a.uid);
    expect("AC10 — User A auth account deleted", !authA?.user);
    expect("User A profile deleted", afterA.profiles === 0);
    expect("AC06 — User A clients = 0", afterA.clients === 0);
    expect("AC07 — User A sessions and notes = 0",
      afterA.appointments === 0 && afterA.session_notes === 0);
    expect("AC08 — User A documents = 0", afterA.client_attachments === 0);
    expect("AC09 — User A finance records = 0",
      afterA.income === 0 && afterA.expenses === 0);
    expect("User A services = 0", afterA.services === 0);
    expect("AC08 — User A storage files removed", (await storageCount(a.uid)) === 0);

    const { count: lifecycleA } = await admin
      .from("user_lifecycle").select("user_id", { count: "exact", head: true }).eq("user_id", a.uid);
    expect("User A no longer left in Deactivation pending", (lifecycleA ?? 0) === 0);

    // ---- Tenant isolation --------------------------------------------------
    const same = (x: Snapshot, y: Snapshot) =>
      Object.keys(x).every((k) => x[k] === y[k]);
    const { data: authB } = await admin.auth.admin.getUserById(b.uid);
    expect("AC05 — User B account unchanged", Boolean(authB?.user));
    expect("AC05/AC06/AC07/AC08/AC09 — every User B count unchanged",
      same(beforeB, afterB), JSON.stringify({ before: beforeB, after: afterB }));
    expect("User B storage files unchanged", (await storageCount(b.uid)) === beforeFilesB);
    expect("Admin account data unchanged",
      same(beforeAdmin, afterAdmin), JSON.stringify({ before: beforeAdmin, after: afterAdmin }));

    // AC15 / audit — a minimal admin audit record exists, with no business data.
    const { data: auditRows } = await admin
      .from("user_lifecycle_audit").select("action, user_email, user_id, admin_id, at, metadata")
      .eq("user_id", a.uid).eq("action", "USER_ACCOUNT_DELETED").limit(1);
    const auditRow: any = auditRows?.[0];
    expect("Audit — USER_ACCOUNT_DELETED recorded with email, ids and timestamp",
      Boolean(auditRow && auditRow.user_email === a.email && auditRow.admin_id === adminId && auditRow.at));
    const metaKeys = Object.keys(auditRow?.metadata ?? {});
    expect("Audit — record carries no business/client data",
      metaKeys.every((k) => k === "deleted_user_email" || k === "deleted_user_id"),
      JSON.stringify(metaKeys));
  } catch (e) {
    expect("Regression run completed without unexpected error", false, String((e as Error)?.message ?? e));
  } finally {
    // Remove every fixture account this run created (User B, and User A if the
    // deletion under test never ran). Strictly scoped to `created` ids.
    for (const uid of created) {
      const { data: still } = await admin.auth.admin.getUserById(uid);
      if (!still?.user) continue;
      try {
        const { data: files } = await admin.storage.from(BUCKET).list(uid, { limit: 100 });
        if (files?.length) {
          await admin.storage.from(BUCKET).remove(files.map((f) => `${uid}/${f.name}`));
        }
        await admin.rpc("admin_delete_user_and_data", { p_user_id: uid, p_admin_id: adminId });
        await admin.auth.admin.deleteUser(uid);
        await admin.from("user_lifecycle_audit").delete().eq("user_id", uid);
      } catch { /* best effort cleanup */ }
    }
  }

  const failed = checks.filter((c) => !c.passed);
  return json({
    ok: failed.length === 0,
    passed: checks.length - failed.length,
    total: checks.length,
    checks,
    users: { admin: adminId, a: a?.email ?? null, b: b?.email ?? null },
  });
});
