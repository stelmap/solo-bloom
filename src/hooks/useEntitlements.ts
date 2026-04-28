import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type FeatureCode = "operational_access" | "financial_access" | "premium_access";

export interface EntitlementsState {
  loading: boolean;
  codes: Set<FeatureCode>;
  isLegacy: boolean;
  legacyAccessUntil: string | null;
  has: (code: FeatureCode) => boolean;
  hasOperational: boolean;
  hasFinancial: boolean;
  hasPremium: boolean;
}

const PRICE_TO_PLAN_CODE: Record<string, "solo" | "pro"> = {
  price_1TPQ3DRxXuU3N5IFMcxZCvva: "solo",
  price_1TPQ5FRxXuU3N5IF5ufGLkV1: "solo",
  price_1TPQ60RxXuU3N5IFBiGOuz8f: "solo",
  price_1TPQahRxXuU3N5IF3umwA0Bd: "pro",
  price_1TPQbIRxXuU3N5IFPVrvG60z: "pro",
  price_1TPQbmRxXuU3N5IFirrjnqdi: "pro",
};

/**
 * Reads active entitlements for the current user.
 *
 * Tier hierarchy (premium ⊃ financial ⊃ operational):
 *   - premium_access  → unlocks everything
 *   - financial_access → unlocks operational + finances
 *   - operational_access → operational only
 *
 * Fallback: if no entitlement rows exist yet but the user has an active paid
 * subscription / trial in `subscription_cache`, we grant premium_access so we
 * don't break access for paying users until the legacy migration runs for them.
 */
export function useEntitlements(): EntitlementsState {
  const { user, subscription } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["entitlements", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const [entRes, subRes] = await Promise.all([
        supabase
          .from("entitlements")
          .select("feature_code, source_type, active_until, is_active")
          .eq("is_active", true),
        supabase
          .from("subscriptions")
          .select("legacy_full_access, legacy_access_until, status")
          .eq("user_id", user!.id)
          .maybeSingle(),
      ]);

      const rows = (entRes.data ?? []).filter(
        (r: any) => !r.active_until || r.active_until > nowIso
      );

      const codes = new Set<FeatureCode>();
      for (const r of rows) {
        if (r.feature_code) codes.add(r.feature_code as FeatureCode);
      }

      const sub = subRes.data as any | null;
      const legacyActive =
        !!sub?.legacy_full_access &&
        (!sub.legacy_access_until || sub.legacy_access_until > nowIso);

      return {
        codes,
        isLegacy: legacyActive,
        legacyAccessUntil: sub?.legacy_access_until ?? null,
      };
    },
  });

  const codes = new Set<FeatureCode>(data?.codes ?? []);

  // Paying user fallback (subscription_cache via AuthContext) — preserve tier
  // based on the Stripe price while DB entitlements are syncing.
  const hasActivePaidAccess =
    !subscription.loading && (subscription.subscribed || subscription.on_trial);
  if (hasActivePaidAccess) {
    const planCode = subscription.price_id ? PRICE_TO_PLAN_CODE[subscription.price_id] : undefined;
    if (planCode === "pro") {
      codes.add("premium_access");
    } else {
      codes.add("operational_access");
    }
  }

  // Hierarchy: premium implies the rest; financial implies operational.
  if (codes.has("premium_access")) {
    codes.add("financial_access");
    codes.add("operational_access");
  }
  if (codes.has("financial_access")) {
    codes.add("operational_access");
  }

  const has = (code: FeatureCode) => codes.has(code);

  return {
    loading: isLoading || subscription.loading,
    codes,
    isLegacy: data?.isLegacy ?? false,
    legacyAccessUntil: data?.legacyAccessUntil ?? null,
    has,
    hasOperational: has("operational_access"),
    hasFinancial: has("financial_access"),
    hasPremium: has("premium_access"),
  };
}
