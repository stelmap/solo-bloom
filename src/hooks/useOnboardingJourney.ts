import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointments, useAllExpenses, useProfile } from "@/hooks/useData";
import { usePracticeProfileStatus } from "@/hooks/usePracticeProfile";

/**
 * Guided first-use journey. The wizard only explains and navigates — it never
 * creates sessions, payments or expenses on the user's behalf.
 *
 * Completion is derived from real persisted data. Only the purely observational
 * steps (view payment / view debt / daily overview / finance analytics) rely on
 * a stored "viewed" flag in `profiles.onboarding_state`, and those flags are
 * only set when the user genuinely opens the matching page with the matching
 * data in place.
 */
export type OnboardingStepKey =
  | "practice"
  | "sessions"
  | "paid"
  | "unpaid"
  | "payment"
  | "debt"
  | "day"
  | "finance"
  | "expense";

export const ONBOARDING_STEP_KEYS: OnboardingStepKey[] = [
  "practice", "sessions", "paid", "unpaid", "payment", "debt", "day", "finance", "expense",
];

const PAID_STATUSES = new Set(["paid_now", "paid_in_advance", "paid_from_prepayment"]);
const OUTSTANDING_STATUSES = new Set([
  "waiting_for_payment", "unpaid", "partially_paid", "partially_paid_from_prepayment",
]);

export type OnboardingState = {
  viewed?: Partial<Record<OnboardingStepKey, boolean>>;
  /** Steps the user has genuinely completed at least once — never reversed. */
  achieved?: Partial<Record<OnboardingStepKey, boolean>>;
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
        achieved: { ...(current.achieved ?? {}), ...(patch.achieved ?? {}) },
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

  const viewedKey = JSON.stringify(current.viewed ?? {});
  const markViewed = useCallback(
    (key: OnboardingStepKey) => {
      if (!user) return;
      if (current.viewed?.[key]) return;
      mutation.mutate({ viewed: { [key]: true } });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, viewedKey],
  );

  return { patch: mutation.mutate, markViewed, state: current };
}

/** Marks an observational onboarding step as viewed when the page is opened. */
export function useMarkOnboardingViewed(key: OnboardingStepKey) {
  const { markViewed } = useSetOnboardingState();
  return markViewed.bind(null, key);
}

const OPEN_STATUSES = new Set(["scheduled", "confirmed", "reminder_sent"]);

export function useOnboardingJourney() {
  const { data: profile } = useProfile();
  const { data: appointments = [] } = useAppointments();
  const { data: expenses = [] } = useAllExpenses();
  const { complete: practiceComplete, loading: practiceLoading } = usePracticeProfileStatus();
  const state = useOnboardingState();
  const { patch } = useSetOnboardingState();


  const flags = useMemo(() => {
    let sessionCount = 0;
    let hasPaid = false;
    let hasUnpaid = false;
    const open: any[] = [];
    for (const a of appointments as any[]) {
      sessionCount += 1;
      if (a.status === "completed") {
        if (PAID_STATUSES.has(a.payment_status)) hasPaid = true;
        // An outstanding session must actually owe money.
        else if (OUTSTANDING_STATUSES.has(a.payment_status) && Number(a.price ?? 0) > 0) hasUnpaid = true;
      }
      if (OPEN_STATUSES.has(String(a.status))) open.push(a);
    }
    open.sort(
      (a, b) =>
        new Date(a.scheduled_at ?? 0).getTime() - new Date(b.scheduled_at ?? 0).getTime(),
    );
    return { sessionCount, hasPaid, hasUnpaid, openSessions: open };
  }, [appointments]);

  // Live view of the current data state.
  const derived: Record<OnboardingStepKey, boolean> = {
    practice: practiceComplete,
    sessions: flags.sessionCount >= 2,
    paid: flags.hasPaid,
    unpaid: flags.hasUnpaid,
    // Observational steps need BOTH the underlying data and a real page visit,
    // regardless of whether the visit started from the wizard.
    payment: flags.hasPaid && !!state.viewed?.payment,
    debt: flags.hasUnpaid && !!state.viewed?.debt,
    day: !!state.viewed?.day,
    finance: !!state.viewed?.finance,
    expense: (expenses as any[]).length > 0,
  };

  // A step that was genuinely completed once stays completed forever, even if
  // the underlying business data later changes (e.g. an unpaid session is paid).
  const achieved = state.achieved ?? {};
  const done = ONBOARDING_STEP_KEYS.reduce((acc, k) => {
    acc[k] = derived[k] || !!achieved[k];
    return acc;
  }, {} as Record<OnboardingStepKey, boolean>);

  const ready = !!profile && !practiceLoading;
  const newlyAchieved = ready
    ? ONBOARDING_STEP_KEYS.filter((k) => derived[k] && !achieved[k])
    : [];
  const newlyAchievedKey = newlyAchieved.join(",");

  useEffect(() => {
    if (!newlyAchievedKey) return;
    const next: Partial<Record<OnboardingStepKey, boolean>> = {};
    for (const k of newlyAchievedKey.split(",") as OnboardingStepKey[]) next[k] = true;
    patch({ achieved: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newlyAchievedKey]);

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
    openSessions: flags.openSessions,
    // Closing/minimizing the wizard is session-local UI state, never persisted:
    // only a fully completed journey permanently stops the wizard.
    dismissed: !!(profile as any)?.onboarding_completed,

  };
}
