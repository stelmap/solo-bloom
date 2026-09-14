import { describe, it, expect } from "vitest";
import {
  ONBOARDING_STEP_KEYS,
  mergeStickyDone,
  newlyAchievedSteps,
  type OnboardingStepKey,
} from "@/hooks/useOnboardingJourney";

const base = (over: Partial<Record<OnboardingStepKey, boolean>> = {}) =>
  ONBOARDING_STEP_KEYS.reduce((acc, k) => {
    acc[k] = !!over[k];
    return acc;
  }, {} as Record<OnboardingStepKey, boolean>);

describe("onboarding sticky completion", () => {
  it("marks steps done from live data", () => {
    const done = mergeStickyDone(base({ paid: true, unpaid: true }), {});
    expect(done.paid).toBe(true);
    expect(done.unpaid).toBe(true);
    expect(done.expense).toBe(false);
  });

  it("keeps the unpaid step completed after the session gets paid", () => {
    const achieved = { paid: true, unpaid: true };
    // Business state changed: no outstanding session anymore.
    const done = mergeStickyDone(base({ paid: true, unpaid: false }), achieved);
    expect(done.unpaid).toBe(true);
    expect(done.paid).toBe(true);
  });

  it("reports only steps that are newly achieved", () => {
    expect(newlyAchievedSteps(base({ paid: true, unpaid: true }), { paid: true }))
      .toEqual(["unpaid"]);
    expect(newlyAchievedSteps(base({ unpaid: false }), { unpaid: true })).toEqual([]);
  });

  it("never unsets an achieved flag", () => {
    const achieved = ONBOARDING_STEP_KEYS.reduce((a, k) => ({ ...a, [k]: true }), {});
    const done = mergeStickyDone(base(), achieved);
    expect(ONBOARDING_STEP_KEYS.every((k) => done[k])).toBe(true);
  });
});
