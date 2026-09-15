// Shared persistence of Paddle subscription state into our own tables.
// Used by both the webhook (push, keeps renewals current) and check-subscription
// (pull, used when a user opens the app).

export type PaddleSyncInput = {
  userId: string;
  /** true when the subscription is active or trialing in Paddle */
  subscribed: boolean;
  onTrial?: boolean;
  subscriptionId?: string | null;
  customerId?: string | null;
  paddlePriceId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
};

const PRO_FEATURES = ["premium_access", "financial_access", "operational_access"];
const BASE_FEATURES = ["financial_access", "operational_access"];

/**
 * Upserts the subscriptions row and refreshes entitlements.
 * Never overwrites known Paddle ids with null — a cached/partial sync keeps
 * whatever the last authoritative sync stored.
 */
export async function syncSubscriptionRecords(supabaseAdmin: any, input: PaddleSyncInput): Promise<void> {
  const { userId } = input;

  if (!input.subscribed) {
    await Promise.all([
      supabaseAdmin
        .from("entitlements")
        .update({ is_active: false, active_until: new Date().toISOString() })
        .eq("user_id", userId)
        .in("source_type", ["paddle", "stripe"])
        .eq("is_active", true),
      supabaseAdmin
        .from("subscriptions")
        .update({ status: "inactive", current_period_end: null, current_period_start: null })
        .eq("user_id", userId),
    ]);
    return;
  }

  const priceRes = input.paddlePriceId
    ? await supabaseAdmin
        .from("plan_prices")
        .select("id, plan_id, plans(code)")
        .eq("paddle_price_id", input.paddlePriceId)
        .maybeSingle()
    : { data: null };

  const planCode = (priceRes.data as any)?.plans?.code as string | undefined;

  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("paddle_subscription_id, paddle_customer_id, current_plan_id, current_price_id, current_period_start, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  const keep = <T,>(next: T | null | undefined, prev: T | null | undefined) =>
    next !== null && next !== undefined ? next : (prev ?? null);

  const payload = {
    user_id: userId,
    status: input.onTrial ? "trialing" : "active",
    paddle_subscription_id: keep(input.subscriptionId, (existing as any)?.paddle_subscription_id),
    paddle_customer_id: keep(input.customerId, (existing as any)?.paddle_customer_id),
    current_plan_id: keep((priceRes.data as any)?.plan_id, (existing as any)?.current_plan_id),
    current_price_id: keep((priceRes.data as any)?.id, (existing as any)?.current_price_id),
    current_period_start: keep(input.periodStart, (existing as any)?.current_period_start),
    current_period_end: keep(input.periodEnd, (existing as any)?.current_period_end),
    legacy_full_access: false,
    legacy_access_until: null,
    updated_at: new Date().toISOString(),
  };

  const { data: subRow, error: subError } = await supabaseAdmin
    .from("subscriptions")
    .upsert(payload, { onConflict: "user_id" })
    .select("id")
    .single();

  if (subError) {
    console.log(`[PADDLE-SYNC] Subscription row sync failed - ${subError.message}`);
    return;
  }

  const activeUntil = payload.current_period_end;
  const features = planCode === "pro" ? PRO_FEATURES : BASE_FEATURES;

  await supabaseAdmin
    .from("entitlements")
    .update({ is_active: false, active_until: new Date().toISOString() })
    .eq("user_id", userId)
    .in("source_type", ["paddle", "stripe"])
    .eq("is_active", true);

  await supabaseAdmin.from("entitlements").insert(
    features.map((featureCode) => ({
      user_id: userId,
      feature_code: featureCode,
      source_type: "paddle",
      source_ref: (subRow as any).id,
      active_from: new Date().toISOString(),
      active_until: activeUntil,
      is_active: true,
      updated_at: new Date().toISOString(),
    })),
  );
}
