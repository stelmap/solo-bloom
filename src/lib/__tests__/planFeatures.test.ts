import { describe, it, expect } from "vitest";
import { hasFeature, PLAN_FEATURES, SOLO_FEATURES } from "../planFeatures";
import { requiredPlanForPath } from "../practiceAccess";

const solo = { has_pro: false, can_write: true };
const pro = { has_pro: true, can_write: true };

describe("plan features", () => {
  it("Solo has calendar, clients, booking and payments", () => {
    for (const f of ["calendar", "clients", "online_booking", "payments"] as const) expect(hasFeature(solo, f)).toBe(true);
  });
  it("Solo lacks finances, groups and supervisions", () => {
    for (const f of ["finances", "groups", "supervisions"] as const) expect(hasFeature(solo, f)).toBe(false);
  });
  it("Solo keeps the public therapist page", () => {
    expect(hasFeature(solo, "public_profile")).toBe(true);
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

import { needsLicense, isLicenseExemptPath } from "../practiceAccess";
describe("licence required", () => {
  it("blocks accounts without a paid plan, trial or grant", () => {
    expect(needsLicense({ plan_code: "expired" }, false)).toBe(true);
  });
  it("does not block paid, trial, legacy-granted or admin accounts", () => {
    expect(needsLicense({ plan_code: "solo" }, false)).toBe(false);
    expect(needsLicense({ plan_code: "pro" }, false)).toBe(false);
    expect(needsLicense({ plan_code: "trial" }, false)).toBe(false);
    expect(needsLicense({ plan_code: "expired" }, true)).toBe(false);
  });
  it("keeps plans and checkout reachable", () => {
    expect(isLicenseExemptPath("/plans")).toBe(true);
    expect(isLicenseExemptPath("/checkout")).toBe(true);
    expect(isLicenseExemptPath("/calendar")).toBe(false);
  });
});

import { aboutProfileAccess } from "../planFeatures";
describe("About me profile trial", () => {
  it("is free for everyone until 17 May 2027", () => {
    expect(aboutProfileAccess({ has_pro: false, can_write: true }, new Date("2027-05-17T23:00:00Z")).allowed).toBe(true);
  });
  it("is Pro only from 18 May 2027", () => {
    expect(aboutProfileAccess({ has_pro: false, can_write: true }, new Date("2027-05-18T00:00:01Z")).allowed).toBe(false);
    expect(aboutProfileAccess({ has_pro: true, can_write: true }, new Date("2027-05-18T00:00:01Z")).allowed).toBe(true);
  });
});
