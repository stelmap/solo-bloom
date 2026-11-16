import { describe, it, expect } from "vitest";
import { hasFeature, PLAN_FEATURES, SOLO_FEATURES } from "../planFeatures";
import { requiredPlanForPath } from "../practiceAccess";

const solo = { has_pro: false, can_write: true };
const pro = { has_pro: true, can_write: true };

describe("plan features", () => {
  it("Solo has calendar, clients, booking and payments", () => {
    for (const f of ["calendar", "clients", "online_booking", "payments"] as const) expect(hasFeature(solo, f)).toBe(true);
  });
  it("Solo lacks finances, groups, supervisions and public profile", () => {
    for (const f of ["finances", "groups", "supervisions", "public_profile"] as const) expect(hasFeature(solo, f)).toBe(false);
  });
  it("Pro includes every Solo feature plus Pro features", () => {
    for (const f of SOLO_FEATURES) expect(PLAN_FEATURES.pro.has(f)).toBe(true);
    expect(hasFeature(pro, "finances")).toBe(true);
    expect(hasFeature(pro, "public_profile")).toBe(true);
  });
  it("finance, groups and supervision pages require Pro", () => {
    expect(requiredPlanForPath("/finances/expenses")).toBe("pro");
    expect(requiredPlanForPath("/groups/1")).toBe("pro");
    expect(requiredPlanForPath("/supervision")).toBe("pro");
    expect(requiredPlanForPath("/calendar")).toBe(null);
    expect(requiredPlanForPath("/payments")).toBe(null);
  });
});
