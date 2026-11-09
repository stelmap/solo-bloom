import { describe, it, expect, beforeEach } from "vitest";
import { calcCommission, splitBalance, captureReferralFromUrl, readStoredReferral } from "@/lib/referral";

const start = new Date("2026-01-01T00:00:00Z");
const end = new Date("2026-07-01T00:00:00Z"); // 6 months

describe("referral commission", () => {
  it("10% of €12 is exactly €1.20", () => {
    expect(calcCommission({ netAmount: 12, percent: 10, rewardStart: start, rewardEnd: end, paidAt: new Date("2026-02-01") })).toBe(1.2);
  });
  it("six monthly €12 payments earn €7.20", () => {
    let total = 0;
    for (let m = 0; m < 6; m++) total += calcCommission({ netAmount: 12, percent: 10, rewardStart: start, rewardEnd: end, paidAt: new Date(Date.UTC(2026, m, 5)) });
    expect(Math.round(total * 100) / 100).toBe(7.2);
  });
  it("payment outside the six-month period earns nothing", () => {
    expect(calcCommission({ netAmount: 12, percent: 10, rewardStart: start, rewardEnd: end, paidAt: new Date("2026-07-02") })).toBe(0);
  });
  it("annual plan is prorated to the reward window", () => {
    const c = calcCommission({ netAmount: 120, percent: 10, rewardStart: start, rewardEnd: end, paidAt: start, periodStart: start, periodEnd: new Date("2027-01-01T00:00:00Z") });
    expect(c).toBeCloseTo(5.95, 2); // 181/365 of €120 × 10%
  });
});

describe("subscription coverage", () => {
  it("€18 earned with €12 subscription: €12 covered, €6 withdrawable", () => {
    expect(splitBalance({ balance: 18, ownPrice: 12 })).toEqual({ covered: 12, remaining: 0, withdrawable: 6 });
  });
  it("€8 earned with €12 subscription: €8 covered, €4 remaining, nothing to withdraw", () => {
    expect(splitBalance({ balance: 8, ownPrice: 12 })).toEqual({ covered: 8, remaining: 4, withdrawable: 0 });
  });
  it("credit already applied this period is not deducted twice", () => {
    expect(splitBalance({ balance: 6, ownPrice: 12, creditThisPeriod: 12 })).toEqual({ covered: 12, remaining: 0, withdrawable: 6 });
  });
});

describe("referral attribution", () => {
  beforeEach(() => localStorage.clear());
  it("keeps the first link within 30 days", () => {
    captureReferralFromUrl("https://solo-bizz.com/?ref=aaaa1111", 0);
    captureReferralFromUrl("https://solo-bizz.com/?ref=bbbb2222", 1000);
    expect(readStoredReferral(2000)?.code).toBe("aaaa1111");
  });
  it("expires after 30 days", () => {
    captureReferralFromUrl("https://solo-bizz.com/?ref=aaaa1111", 0);
    expect(readStoredReferral(31 * 86400000)).toBeNull();
  });
});
