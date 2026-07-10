import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tables whose rows count as "meaningful product activity" for a user.
// Each must have a `user_id` and a `created_at` column.
const ACTIVITY_TABLES = [
  "clients",
  "appointments",
  "expenses",
  "services",
  "groups",
  "booking_links",
  "income",
  "supervisions",
  "client_notes_raw",
  "session_booking_requests",
] as const;

type ActivityMap = Map<string, string>; // user_id -> ISO timestamp (max)

async function collectActivity(admin: ReturnType<typeof createClient>): Promise<ActivityMap> {
  const map: ActivityMap = new Map();
  await Promise.all(
    ACTIVITY_TABLES.map(async (table) => {
      // Pull only user_id + created_at, paginated to keep memory low.
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await admin
          .from(table)
          .select("user_id, created_at")
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error || !data) break;
        for (const row of data as Array<{ user_id: string | null; created_at: string | null }>) {
          if (!row.user_id || !row.created_at) continue;
          const prev = map.get(row.user_id);
          if (!prev || row.created_at > prev) map.set(row.user_id, row.created_at);
        }
        if (data.length < pageSize) break;
        from += pageSize;
        if (from > 100000) break; // hard safety cap
      }
    }),
  );
  return map;
}

async function collectStripeVisits(admin: ReturnType<typeof createClient>): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await admin
      .from("user_activity_events")
      .select("user_id, created_at")
      .eq("event_name", "stripe_checkout_started")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error || !data) break;
    for (const row of data as Array<{ user_id: string; created_at: string }>) {
      const prev = map.get(row.user_id);
      if (!prev || row.created_at > prev) map.set(row.user_id, row.created_at);
    }
    if (data.length < pageSize) break;
    from += pageSize;
    if (from > 100000) break;
  }
  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleOk } = await admin.rpc("has_role", {
      _user_id: userData.user.id, _role: "admin",
    });
    if (!roleOk) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const users: any[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      users.push(...data.users);
      if (data.users.length < perPage) break;
      page++;
      if (page > 20) break;
    }

    const [activityMap, stripeMap, lifecycleRes] = await Promise.all([
      collectActivity(admin),
      collectStripeVisits(admin),
      admin.from("user_lifecycle").select("user_id, status, planned_deletion_date, deactivation_email_sent_at, last_login_at, reactivated_at"),
    ]);

    const lifecycleMap = new Map<string, any>();
    for (const row of (lifecycleRes.data ?? []) as any[]) {
      lifecycleMap.set(row.user_id, row);
    }

    const result = users.map((u) => {
      const lastProductActivityAt = activityMap.get(u.id) ?? null;
      const visitedStripeAt = stripeMap.get(u.id) ?? null;
      const lc = lifecycleMap.get(u.id);
      return {
        id: u.id,
        email: u.email,
        full_name: (u.user_metadata?.full_name as string) || null,
        provider: u.app_metadata?.provider || null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        has_records: Boolean(lastProductActivityAt),
        last_product_activity_at: lastProductActivityAt,
        visited_stripe: Boolean(visitedStripeAt),
        visited_stripe_at: visitedStripeAt,
        lifecycle_status: (lc?.status ?? "active") as string,
        planned_deletion_date: lc?.planned_deletion_date ?? null,
        deactivation_email_sent_at: lc?.deactivation_email_sent_at ?? null,
      };
    });


    return new Response(JSON.stringify({ users: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
