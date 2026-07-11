import { describe, it, expect } from "vitest";
import {
  remainingDebt,
  sortOldestFirst,
  validateAllocations,
  autoAllocate,
  planExpectedPaymentAdjustment,
  balanceHolds,
  type AllocSession,
} from "../manualPaymentAllocation";

const s = (
  id: string,
  price: number,
  otherPaid: number,
  scheduled_at: string,
  status: string = "completed",
): AllocSession => ({ id, price, otherPaid, scheduled_at, status });

describe("manualPaymentAllocation", () => {
  describe("remainingDebt", () => {
    it("returns price − otherPaid", () => {
      expect(remainingDebt(s("a", 180, 100, "2026-01-01"))).toBe(80);
    });
    it("never returns negative", () => {
      expect(remainingDebt(s("a", 100, 150, "2026-01-01"))).toBe(0);
    });
  });

  describe("sortOldestFirst (AC9)", () => {
    it("orders by scheduled_at ascending", () => {
      const rows = [
        s("new", 100, 0, "2026-05-10"),
        s("old", 100, 0, "2026-01-01"),
        s("mid", 100, 0, "2026-03-15"),
      ];
      expect(sortOldestFirst(rows).map((r) => r.id)).toEqual(["old", "mid", "new"]);
    });
  });

  describe("validateAllocations", () => {
    it("AC1: allocating remaining debt exactly is valid", () => {
      const sessions = [s("x", 180, 100, "2026-01-01")];
      const r = validateAllocations({ amount: 80, allocations: { x: 80 }, sessions });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.prepaidRemainder).toBe(0);
    });

    it("AC2: partial allocation leaves session partially paid, remainder=0", () => {
      const sessions = [s("x", 180, 100, "2026-01-01")];
      const r = validateAllocations({ amount: 50, allocations: { x: 50 }, sessions });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.totalAllocated).toBe(50);
    });

    it("AC3: rejects allocation above remaining debt", () => {
      const sessions = [s("x", 100, 20, "2026-01-01")]; // debt = 80
      const r = validateAllocations({ amount: 500, allocations: { x: 100 }, sessions });
      expect(r.ok).toBe(false);
      const err = r as Extract<typeof r, { ok: false }>;
      expect(err.code).toBe("over_session");
      expect(err.sessionId).toBe("x");
      expect(err.max).toBe(80);
    });

    it("AC7: sum below amount produces prepaid remainder", () => {
      const sessions = [s("a", 200, 0, "2026-01-01"), s("b", 200, 0, "2026-02-01")];
      const r = validateAllocations({
        amount: 500,
        allocations: { a: 200, b: 180 },
        sessions,
      });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.prepaidRemainder).toBe(120);
    });

    it("rejects total allocations exceeding payment amount", () => {
      const sessions = [s("a", 300, 0, "2026-01-01")];
      const r = validateAllocations({ amount: 100, allocations: { a: 300 }, sessions });
      expect(r.ok).toBe(false);
    });

    it("rejects negative allocations", () => {
      const sessions = [s("a", 100, 0, "2026-01-01")];
      const r = validateAllocations({ amount: 100, allocations: { a: -5 }, sessions });
      expect(r.ok).toBe(false);
    });
  });

  describe("autoAllocate (AC10)", () => {
    it("fills oldest debts first and caps at each session's remaining", () => {
      const sessions = [
        s("newest", 100, 0, "2026-05-01"),
        s("oldest", 100, 40, "2026-01-01"), // debt 60
        s("middle", 100, 0, "2026-03-01"),
      ];
      const { allocations, prepaidRemainder } = autoAllocate(200, sessions);
      expect(allocations.oldest).toBe(60);
      expect(allocations.middle).toBe(100);
      expect(allocations.newest).toBe(40);
      expect(prepaidRemainder).toBe(0);
    });

    it("puts leftover into prepaid remainder (AC7)", () => {
      const sessions = [s("a", 100, 0, "2026-01-01")];
      const { allocations, prepaidRemainder } = autoAllocate(400, sessions);
      expect(allocations.a).toBe(100);
      expect(prepaidRemainder).toBe(300);
    });

    it("skips sessions with no remaining debt", () => {
      const sessions = [
        s("paid", 100, 100, "2026-01-01"),
        s("owed", 100, 0, "2026-02-01"),
      ];
      const { allocations } = autoAllocate(150, sessions);
      expect(allocations.paid).toBeUndefined();
      expect(allocations.owed).toBe(100);
    });
  });

  describe("planExpectedPaymentAdjustment", () => {
    it("AC4: fully covered EP → cancel with manual_payment_recorded", () => {
      const plan = planExpectedPaymentAdjustment({ id: "ep1", amount: 180 }, 180);
      expect(plan).toEqual({
        epId: "ep1",
        action: "cancel",
        reason: "manual_payment_recorded",
      });
    });

    it("AC5: partially covered EP → split with new remaining amount", () => {
      const plan = planExpectedPaymentAdjustment({ id: "ep1", amount: 180 }, 100);
      expect(plan.action).toBe("split");
      if (plan.action === "split") {
        expect(plan.reason).toBe("partially_covered_by_manual_payment");
        expect(plan.newAmount).toBe(80);
      }
    });

    it("tolerates float noise when deciding fully covered", () => {
      const plan = planExpectedPaymentAdjustment({ id: "ep1", amount: 100 }, 99.9995);
      expect(plan.action).toBe("cancel");
    });
  });

  describe("balanceHolds (AC11)", () => {
    it("holds when allocations + prepaid === amount", () => {
      expect(balanceHolds(500, { a: 200, b: 180 }, 120)).toBe(true);
    });
    it("fails when identity is broken", () => {
      expect(balanceHolds(500, { a: 200 }, 100)).toBe(false);
    });
  });
});
