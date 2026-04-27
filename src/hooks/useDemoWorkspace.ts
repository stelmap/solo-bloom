import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const SEED_ATTEMPT_KEY = "demo_seed_attempted";
export const DEMO_ACTION_MESSAGE = "This action is available after choosing a subscription.";

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
  const { subscription } = useAuth();
  const { data: hasDemoData = false, isLoading } = useHasDemoData();
  const isPaid = subscription.subscribed || subscription.on_trial;
  const isDemoMode = !subscription.loading && !isPaid && hasDemoData;

  return {
    isDemoMode,
    loading: subscription.loading || isLoading,
    message: DEMO_ACTION_MESSAGE,
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
        // Quick check: do we already have demo data?
        const { data: hasDemo } = await supabase.rpc("user_has_demo_data", {
          p_user_id: user.id,
        });
        if (cancelled) return;
        if (hasDemo) {
          sessionStorage.setItem(attemptKey, "1");
          setDone(true);
          return;
        }

        // Check if the user has any real records of their own. If they do,
        // don't seed — they're already using the app.
        const [{ count: clientCount }, { count: aptCount }] = await Promise.all([
          supabase.from("clients").select("id", { count: "exact", head: true }),
          supabase.from("appointments").select("id", { count: "exact", head: true }),
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
