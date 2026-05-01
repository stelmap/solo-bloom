import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { getStoredLang, translateFor } from "@/i18n/LanguageContext";

const SEED_ATTEMPT_KEY = "demo_seed_attempted";
const DEMO_MODE_KEY = "demo_mode_enabled";

/**
 * Localized restriction message for business-data writes (clients, services, groups, etc.)
 * blocked in demo mode. Personal/account settings (language, currency, profile, schedule)
 * must NEVER throw this — they are always editable.
 */
export function getDemoActionMessage(): string {
  try {
    return translateFor(getStoredLang(), "demo.restrictedBusiness");
  } catch {
    return "Editing clients and services is available only after registration.";
  }
}

/** @deprecated Prefer getDemoActionMessage() so the message is localized. */
export const DEMO_ACTION_MESSAGE = "Editing clients and services is available only after registration.";

const getDemoModeStorageKey = (userId?: string) => `${DEMO_MODE_KEY}:${userId ?? "anonymous"}`;

const readPersistedDemoMode = (userId?: string) => {
  if (typeof window === "undefined" || !userId) return false;
  return localStorage.getItem(getDemoModeStorageKey(userId)) === "1";
};

const persistDemoMode = (userId: string, enabled: boolean) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(getDemoModeStorageKey(userId), enabled ? "1" : "0");
};

/**
 * Returns whether the current user has any demo records in their workspace.
 */
export function useHasDemoData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["has-demo-data", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc("user_has_demo_data", {
        p_user_id: user.id,
      });
      if (error) {
        console.error("user_has_demo_data failed:", error);
        return false;
      }
      return Boolean(data);
    },
  });
}

export function useDemoMode() {
  const { user } = useAuth();
  const { subscription } = useAuth();
  const { data: hasDemoData = false, isLoading } = useHasDemoData();
  const [persistedDemoMode, setPersistedDemoMode] = useState(() => readPersistedDemoMode(user?.id));
  const isPaid = subscription.subscribed || subscription.on_trial;
  const isUnpaidUser = !!user?.id && !subscription.loading && !isPaid;
  const isDemoMode = isUnpaidUser || (!subscription.loading && !isPaid && (hasDemoData || persistedDemoMode));

  useEffect(() => {
    setPersistedDemoMode(readPersistedDemoMode(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || subscription.loading || isLoading) return;
    const nextPersistedDemoMode = !isPaid;
    persistDemoMode(user.id, nextPersistedDemoMode);
    setPersistedDemoMode(nextPersistedDemoMode);
  }, [user?.id, subscription.loading, isLoading, isPaid, hasDemoData]);

  return {
    isDemoMode,
    loading: subscription.loading || isLoading,
    message: getDemoActionMessage(),
  };
}

export function useDemoWriteGuard() {
  const { isDemoMode } = useDemoMode();
  return () => {
    if (isDemoMode) throw new Error(getDemoActionMessage());
  };
}

/**
 * On first login, if the user has no real data and no demo data yet, seed
 * a curated demo workspace. Runs at most once per session per user.
 *
 * Skipped for users with an active paid subscription (or trial) — they
 * should land on a clean real workspace.
 */
export function useAutoSeedDemo() {
  const { user, subscription } = useAuth();
  const qc = useQueryClient();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    if (!user?.id) return;
    if (subscription.loading) return;
    // Don't seed for paid/trial users
    if (subscription.subscribed || subscription.on_trial) {
      setDone(true);
      return;
    }

    const attemptKey = `${SEED_ATTEMPT_KEY}:${user.id}`;
    if (sessionStorage.getItem(attemptKey)) {
      setDone(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // Check if the user has any real records of their own. If they do,
        // don't seed — they're already using the app. Demo records are ignored
        // here so existing demo workspaces can be refreshed by the idempotent RPC.
        const [{ count: clientCount }, { count: aptCount }] = await Promise.all([
          supabase.from("clients").select("id", { count: "exact", head: true }).eq("is_demo", false),
          supabase.from("appointments").select("id", { count: "exact", head: true }).eq("is_demo", false),
        ]);
        if (cancelled) return;
        if ((clientCount ?? 0) > 0 || (aptCount ?? 0) > 0) {
          sessionStorage.setItem(attemptKey, "1");
          setDone(true);
          return;
        }

        const { error } = await supabase.rpc("seed_demo_workspace", {
          p_user_id: user.id,
        });
        if (cancelled) return;
        if (error) {
          console.error("seed_demo_workspace failed:", error);
        } else {
          // Refresh queries that may now have data
          qc.invalidateQueries();
        }
      } finally {
        if (!cancelled) {
          sessionStorage.setItem(attemptKey, "1");
          setDone(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, subscription.loading, subscription.subscribed, subscription.on_trial, done, qc]);
}
