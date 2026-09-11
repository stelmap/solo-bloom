import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointments, useAllExpenses, useProfile } from "@/hooks/useData";
import { usePracticeProfileStatus } from "@/hooks/usePracticeProfile";

/**
 * Guided first-use journey: practice setup → first session → paid session →
 * unpaid session → daily overview → finance dashboard → first expense.
 *
 * Completion is always derived from real persisted data. Only the two purely
 * educational steps (daily overview / finance dashboard) rely on a stored
 * "viewed" flag, kept in `profiles.onboarding_state` so it survives refresh,
 * re-login and other devices.
 */
export type OnboardingStepKey =
  | "practice"
  | "session"
  | "paid"
  | "unpaid"
  | "day"
  | "finance"
  | "expense";

export const ONBOARDING_STEP_KEYS: OnboardingStepKey[] = [
  "practice", "session", "paid", "unpaid", "day", "finance", "expense",
];

const PAID_STATUSES = new Set(["paid_now", "paid_in_advance", "paid_from_prepayment"]);
const OUTSTANDING_STATUSES = new Set([
  "waiting_for_payment", "unpaid", "partially_paid", "partially_paid_from_prepayment",
]);

export type OnboardingState = {
  viewed?: Partial<Record<OnboardingStepKey, boolean>>;
  minimized?: boolean;
  dismissed?: boolean;
};

export function useOnboardingState() {
  const { data: profile } = useProfile();
  return ((profile as any)?.onboarding_state ?? {}) as OnboardingState;
}

export function useSetOnboardingState() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const current = ((profile as any)?.onboarding_state ?? {}) as OnboardingState;

  const mutation = useMutation({
    mutationFn: async (patch: OnboardingState) => {
      const next: OnboardingState = {
        ...current,
        ...patch,
        viewed: { ...(current.viewed ?? {}), ...(patch.viewed ?? {}) },
      };
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_state: next } as any)
        .eq("user_id", user!.id);
      if (error) throw error;
      return next;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const markViewed = useCallback(
    (key: OnboardingStepKey) => {
      if (!user) return;
      if (current.viewed?.[key]) return;
      mutation.mutate({ viewed: { [key]: true } });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, current.viewed?.day, current.viewed?.finance],
  );

  return { patch: mutation.mutate, markViewed, state: current };
}

/** Marks an educational onboarding step as viewed when the page is opened. */
export function useMarkOnboardingViewed(key: OnboardingStepKey) {
  const { markViewed } = useSetOnboardingState();
  return markViewed.bind(null, key);
}

export function useOnboardingJourney() {
  const { data: profile } = useProfile();
  const { data: appointments = [] } = useAppointments();
  const { data: expenses = [] } = useAllExpenses();
  const { complete: practiceComplete, loading: practiceLoading } = usePracticeProfileStatus();
  const state = useOnboardingState();

  const flags = useMemo(() => {
    let hasSession = false;
    let hasPaid = false;
    let hasUnpaid = false;
    for (const a of appointments as any[]) {
      hasSession = true;
      if (a.status === "completed") {
        if (PAID_STATUSES.has(a.payment_status)) hasPaid = true;
        else if (OUTSTANDING_STATUSES.has(a.payment_status)) hasUnpaid = true;
      }
    }
    return { hasSession, hasPaid, hasUnpaid };
  }, [appointments]);

  const done: Record<OnboardingStepKey, boolean> = {
    practice: practiceComplete,
    session: flags.hasSession,
    paid: flags.hasPaid,
    unpaid: flags.hasUnpaid,
    day: !!state.viewed?.day,
    finance: !!state.viewed?.finance,
    expense: (expenses as any[]).length > 0,
  };

  const completedCount = ONBOARDING_STEP_KEYS.filter((k) => done[k]).length;
  const total = ONBOARDING_STEP_KEYS.length;
  const allDone = completedCount === total;
  const currentStep = ONBOARDING_STEP_KEYS.find((k) => !done[k]) ?? null;

  return {
    loading: !profile || practiceLoading,
    done,
    completedCount,
    total,
    allDone,
    currentStep,
    dismissed: !!state.dismissed || !!(profile as any)?.onboarding_completed,
    minimized: !!state.minimized,
  };
}
