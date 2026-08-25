import { describe, it, expect } from "vitest";
import {
  validateFlexibleCompletion,
  flexibleFinancialEffects,
  flexibleNextPaymentStatus,
  showsFlexibleLabel,
} from "../flexiblePrice";

const base = { paymentDate: "2026-08-25", source: "new_payment" as const, prepaidBalance: 0 };

describe("flexible session price", () => {
  it("requires an actual amount", () => {
    expect(validateFlexibleCompletion({ ...base, amount: "" }).error).toBe("amount_required");
  });
  it("rejects zero and negative amounts", () => {
    expect(validateFlexibleCompletion({ ...base, amount: 0 }).error).toBe("amount_not_positive");
    expect(validateFlexibleCompletion({ ...base, amount: -10 }).error).toBe("amount_not_positive");
  });
  it("rejects non-numeric input", () => {
    expect(validateFlexibleCompletion({ ...base, amount: "abc" }).error).toBe("amount_invalid");
  });
  it("requires a payment date", () => {
    expect(validateFlexibleCompletion({ ...base, amount: 1275, paymentDate: "" }).error).toBe("date_required");
  });
  it("accepts an amount above the standard price", () => {
    const r = validateFlexibleCompletion({ ...base, amount: "1275" });
    expect(r).toMatchObject({ valid: true, amount: 1275, error: null });
  });
  it("blocks prepaid source when the balance is insufficient", () => {
    const r = validateFlexibleCompletion({ ...base, amount: 1175, source: "prepaid_balance", prepaidBalance: 1000 });
    expect(r.error).toBe("insufficient_prepaid");
  });
  it("allows prepaid source when the balance covers the amount", () => {
    const r = validateFlexibleCompletion({ ...base, amount: 1175, source: "prepaid_balance", prepaidBalance: 2000 });
    expect(r.valid).toBe(true);
  });
  it("writes exactly one financial record", () => {
    expect(flexibleFinancialEffects("new_payment", 1275)).toEqual([
      { kind: "confirmed_income", amount: 1275, linkedToSession: true },
    ]);
    expect(flexibleFinancialEffects("prepaid_balance", 1175)).toEqual([
      { kind: "prepaid_allocation", amount: 1175, linkedToSession: true },
    ]);
  });
  it("maps the payment source to a fully-paid status", () => {
    expect(flexibleNextPaymentStatus("new_payment")).toBe("paid_now");
    expect(flexibleNextPaymentStatus("prepaid_balance")).toBe("paid_from_prepayment");
  });
  it("labels only when the amounts differ", () => {
    expect(showsFlexibleLabel(1200, 1275)).toBe(true);
    expect(showsFlexibleLabel(1200, 1200)).toBe(false);
  });
});
