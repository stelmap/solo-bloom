import { describe, it, expect } from "vitest";
import {
  completionOptionsFor,
  prepaymentPreview,
  financialEffectsFor,
  isPrepaymentInsufficient,
  shouldCreateExpectedPayment,
  nextPaymentStatus,
} from "../sessionCompletionOptions";

describe("session completion sync (AC1–AC8)", () => {
  describe("AC8 · Pay in advance option is removed", () => {
    it("never returns 'paid_in_advance' among completion modes", () => {
      const opts = completionOptionsFor({ price: 180, prepaidBalance: 0 });
      expect(opts.map((o) => o.mode)).not.toContain("paid_in_advance" as never);
    });
    it("returns exactly pay_now + waiting when no prepayment exists", () => {
      const opts = completionOptionsFor({ price: 180, prepaidBalance: 0 });
      expect(opts.map((o) => o.mode)).toEqual(["pay_now", "waiting"]);
      expect(opts.find((o) => o.mode === "pay_now")?.primary).toBe(true);
    });
    it("adds from_prepayment as primary when prepayment fully covers the session", () => {
      const opts = completionOptionsFor({ price: 180, prepaidBalance: 3620 });
      expect(opts[0].mode).toBe("from_prepayment");
      expect(opts[0].primary).toBe(true);
      expect(opts.map((o) => o.mode)).toEqual(["from_prepayment", "pay_now", "waiting"]);
    });
    it("locks to already_paid when the session was pre-allocated", () => {
      const opts = completionOptionsFor({ price: 180, prepaidBalance: 0, preallocatedToSession: 180 });
      expect(opts).toEqual([{ mode: "already_paid", primary: true }]);
    });
  });

  describe("Prepayment preview (§2)", () => {
    it("matches the example in the spec (€3 620 pool, €180 session)", () => {
      expect(prepaymentPreview({ prepaidBalance: 3620, price: 180 })).toEqual({
        sessionPrice: 180,
        amountToDeduct: 180,
        prepaymentRemainingAfter: 3440,
        approxSessionsCovered: 20,
      });
    });
    it("caps the deduction at the prepayment pool", () => {
      expect(prepaymentPreview({ prepaidBalance: 100, price: 180 })).toMatchObject({
        amountToDeduct: 100,
        prepaymentRemainingAfter: 0,
      });
    });
  });

  describe("Financial effects (§3, §4, AC1–AC5)", () => {
    it("AC1 · Pay now writes one Confirmed Income and no Expected Payment", () => {
      const fx = financialEffectsFor("pay_now", { price: 180, prepaidBalance: 0 });
      expect(fx).toEqual([{ kind: "confirmed_income", amount: 180, source: "session_payment" }]);
      expect(fx.some((r) => r.kind === "expected_payment")).toBe(false);
    });
    it("AC2 · Waiting creates one Expected Payment and no Income row", () => {
      const fx = financialEffectsFor("waiting", { price: 180, prepaidBalance: 0 });
      expect(fx).toEqual([{ kind: "expected_payment", amount: 180 }]);
      expect(fx.some((r) => r.kind === "confirmed_income")).toBe(false);
    });
    it("AC3/AC5 · From prepayment writes a deduction + a €0 confirmed income and no EP", () => {
      const fx = financialEffectsFor("from_prepayment", { price: 180, prepaidBalance: 3620 });
      expect(fx).toEqual([
        { kind: "prepayment_deduction", amount: 180, from_prepayment: true },
        { kind: "confirmed_income_zero", source: "paid_from_prepayment" },
      ]);
      expect(fx.some((r) => r.kind === "expected_payment")).toBe(false);
    });
    it("AC4 · No new cash-carrying income row when paid from prepayment (no double income)", () => {
      const fx = financialEffectsFor("from_prepayment", { price: 180, prepaidBalance: 3620 });
      const cashRows = fx.filter((r) => r.kind === "confirmed_income");
      expect(cashRows).toHaveLength(0);
    });
    it("refuses from_prepayment when the pool is smaller than the session price", () => {
      expect(() =>
        financialEffectsFor("from_prepayment", { price: 180, prepaidBalance: 100 }),
      ).toThrow(/insufficient_prepayment/);
    });
  });

  describe("Insufficient prepayment (§8)", () => {
    it("flags a partial pool as insufficient", () => {
      expect(isPrepaymentInsufficient({ price: 180, prepaidBalance: 100 })).toBe(true);
    });
    it("does not flag an empty pool (from_prepayment simply isn't offered)", () => {
      expect(isPrepaymentInsufficient({ price: 180, prepaidBalance: 0 })).toBe(false);
    });
    it("does not flag a sufficient pool", () => {
      expect(isPrepaymentInsufficient({ price: 180, prepaidBalance: 200 })).toBe(false);
    });
    it("does not offer from_prepayment for group sessions", () => {
      const opts = completionOptionsFor({ price: 180, prepaidBalance: 3620, isGroupSession: true });
      expect(opts.map((o) => o.mode)).toEqual(["pay_now", "waiting"]);
    });
  });

  describe("Status + EP flags", () => {
    it("shouldCreateExpectedPayment is true only for 'waiting'", () => {
      expect(shouldCreateExpectedPayment("pay_now")).toBe(false);
      expect(shouldCreateExpectedPayment("waiting")).toBe(true);
      expect(shouldCreateExpectedPayment("from_prepayment")).toBe(false);
    });
    it("nextPaymentStatus maps modes to appointment.payment_status", () => {
      expect(nextPaymentStatus("pay_now")).toBe("paid_now");
      expect(nextPaymentStatus("waiting")).toBe("waiting_for_payment");
      expect(nextPaymentStatus("from_prepayment")).toBe("paid_from_prepayment");
    });
  });
});
