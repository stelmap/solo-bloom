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
 * Returns information about the user's free starter status.
 * `isFreeStarter` is true for any signed-in user without an active paid plan
 * (and not on trial). `atClientLimit` is true once the active client count
 * reaches FREE_STARTER_CLIENT_LIMIT.
 */
export function useFreeStarterMode() {
  const { user, subscription } = useAuth();
  const isPaid = subscription.subscribed || subscription.on_trial;
  const isFreeStarter = !!user?.id && !subscription.loading && !isPaid;

  const { data: clientCount = 0, isLoading } = useQuery({
    queryKey: ["free-starter-client-count", user?.id],
    enabled: isFreeStarter,
    staleTime: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("status", "active")
        .eq("is_demo", false);
      if (error) {
        console.error("free-starter client count failed:", error);
        return 0;
      }
      return count ?? 0;
    },
  });

  const limit = FREE_STARTER_CLIENT_LIMIT;
  const atClientLimit = isFreeStarter && clientCount >= limit;

  return {
    isFreeStarter,
    clientCount,
    limit,
    atClientLimit,
    loading: subscription.loading || (isFreeStarter && isLoading),
  };
}

/** @deprecated No-op — we no longer auto-seed demo workspaces. */
export function useAutoSeedDemo() {
  // intentionally empty
}
