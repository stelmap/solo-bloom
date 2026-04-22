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

  // Paying user fallback (subscription_cache via AuthContext) — grant premium
  // until DB migration assigns a real plan. Keeps current users unblocked.
  const hasActivePaidAccess =
    !subscription.loading && (subscription.subscribed || subscription.on_trial);
  if (hasActivePaidAccess) codes.add("premium_access");

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
