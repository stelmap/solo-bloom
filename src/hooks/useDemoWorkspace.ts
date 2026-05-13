import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { translations, type Language } from "@/i18n/translations";

/**
 * Free Starter Mode
 * -----------------
 * Unpaid users get full access to SoloBiz with a soft cap of 5 active clients.
 * The legacy "demo mode" (read-only seeded workspace) has been retired:
 *   - `useDemoMode().isDemoMode` is now always `false` so the old `!isDemoMode &&`
 *     UI gates render their controls again.
 *   - `useDemoWriteGuard()` is a no-op so all writes are allowed.
 *   - `useAutoSeedDemo()` is a no-op so we never auto-create demo records.
 * Callers that need to know if a user is on the free tier should use
 * `useFreeStarterMode()` instead.
 */

export const FREE_STARTER_CLIENT_LIMIT = 5;

function readLangFromStorage(): Language {
  try {
    const raw = (localStorage.getItem("app_lang") || localStorage.getItem("landing_lang") || "").toLowerCase();
    if (raw === "uk" || raw === "fr" || raw === "pl" || raw === "en") return raw as Language;
    const browser = (navigator?.language || "").toLowerCase();
    if (browser.startsWith("uk")) return "uk";
    if (browser.startsWith("fr")) return "fr";
    if (browser.startsWith("pl")) return "pl";
  } catch {}
  return "en";
}

/** @deprecated Free Starter Mode no longer raises this error. Kept for backward compat. */
export function getDemoActionMessage(): string {
  const lang = readLangFromStorage();
  const entry = translations["demo.restrictedBusiness"];
  return entry?.[lang] || entry?.en || "";
}

/** @deprecated */
export const DEMO_ACTION_MESSAGE = "";

/** @deprecated kept for backward compat — always returns false now. */
export function useHasDemoData() {
  return useQuery({
    queryKey: ["has-demo-data-disabled"],
    queryFn: async () => false,
    staleTime: Infinity,
  });
}

/**
 * @deprecated Use `useFreeStarterMode()` instead.
 * Always returns `isDemoMode: false` so legacy `!isDemoMode &&` UI gates
 * render their action buttons.
 */
export function useDemoMode() {
  return {
    isDemoMode: false as const,
    loading: false,
    message: "",
  };
}

/** @deprecated No-op. Free Starter Mode allows all writes. */
export function useDemoWriteGuard() {
  return () => {};
}

/**
 * Returns information about the user's plan-based active-client limit.
 * - `isFreeStarter` is true for any signed-in user without an active paid plan.
 * - `planCode` is "free" | "solo" | "pro" | other plan codes.
 * - `limit` is `null` for unlimited plans.
 * - `atClientLimit` is true once the active client count reaches the limit.
 */
export function useFreeStarterMode() {
  const { user, subscription } = useAuth();
  const isPaid = subscription.subscribed || subscription.on_trial;
  const isFreeStarter = !!user?.id && !subscription.loading && !isPaid;

  // Resolve the user's plan code from their active price_id.
  const { data: planCode } = useQuery({
    queryKey: ["current-plan-code", user?.id, subscription.price_id],
    enabled: !!user?.id && !subscription.loading,
    staleTime: 60_000,
    queryFn: async (): Promise<"free" | "solo" | "pro" | string> => {
      if (!isPaid) return "free";
      if (!subscription.price_id) return "pro"; // legacy/unknown -> unlimited
      const { data, error } = await supabase
        .from("plan_prices")
        .select("plans!inner(code)")
        .eq("stripe_price_id", subscription.price_id)
        .maybeSingle();
      if (error || !data) return "pro";
      // @ts-ignore - relational shape
      return (data.plans?.code as string) ?? "pro";
    },
  });

  const resolvedPlanCode: string = planCode ?? (isPaid ? "pro" : "free");
  const limit: number | null =
    resolvedPlanCode === "free" ? FREE_STARTER_CLIENT_LIMIT
    : resolvedPlanCode === "solo" ? 20
    : null; // pro / legacy → unlimited

  const { data: clientCount = 0, isLoading } = useQuery({
    queryKey: ["plan-active-client-count", user?.id],
    enabled: !!user?.id && !subscription.loading && limit !== null,
    staleTime: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("status", "active")
        .eq("is_demo", false);
      if (error) {
        console.error("active client count failed:", error);
        return 0;
      }
      return count ?? 0;
    },
  });

  const atClientLimit = limit !== null && clientCount >= limit;

  return {
    isFreeStarter,
    planCode: resolvedPlanCode,
    clientCount,
    limit,
    atClientLimit,
    loading: subscription.loading || (limit !== null && isLoading),
  };
}

/** @deprecated No-op — we no longer auto-seed demo workspaces. */
export function useAutoSeedDemo() {
  // intentionally empty
}
