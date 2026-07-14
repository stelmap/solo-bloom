import { describe, it, expect } from "vitest";
import {
  computeCancellationOutcome,
  validateCancellationChoice,
  type CancellationInput,
} from "../cancellationOutcome";
import { isPaid, isPrepaid, isCancelled } from "../paymentClassifiers";

const base: CancellationInput = {
  status: "cancelled",
  chargeFee: true,
  priorAppointmentStatus: "scheduled",
  priorPaymentStatus: "paid_in_advance",
  price: 50,
  clientBalance: 300,
};

describe("Session cancellation matrix", () => {
  // ---------- TC-01 ----------
  it("TC-01: prepaid + payable → paid_from_prepayment, balance -€50, withdrawal audit, no new income", () => {
    const r = computeCancellationOutcome(base);
    expect(r.ok).toBe(true);
    expect(r.appointmentStatus).toBe("cancelled");
    expect(r.paymentStatus).toBe("paid_from_prepayment");
    expect(r.balanceAfter).toBe(250);
    expect(r.balanceDelta).toBe(50);
    expect(r.createdPrepaymentWithdrawal).toBe(true);
    expect(r.createdNewIncome).toBe(false);
    expect(r.createdExpectedPayment).toBe(false);
    expect(r.totalPaidDelta).toBe(0);
    // UI classifiers on the resulting row
    const after = { status: r.appointmentStatus!, payment_status: r.paymentStatus! };
    expect(isCancelled(after)).toBe(true);
    expect(isPaid(after)).toBe(true);
    expect(isPrepaid(after)).toBe(false);
  });

  // ---------- TC-02 ----------
  it("TC-02: unpaid + payable → waiting_for_payment, debt row created", () => {
    const r = computeCancellationOutcome({
      ...base,
      priorPaymentStatus: "unpaid",
      clientBalance: 0,
    });
    expect(r.ok).toBe(true);
    expect(r.paymentStatus).toBe("waiting_for_payment");
    expect(r.createdExpectedPayment).toBe(true);
    expect(r.createdPrepaymentWithdrawal).toBe(false);
    expect(r.balanceDelta).toBe(0);
    expect(r.counters).toEqual({ prepaid: 0, paid: 0, cancelled: 1, awaiting: 1 });
  });

  // ---------- TC-03 ----------
  it("TC-03: prepaid + non-payable → allocation released, balance unchanged", () => {
    const r = computeCancellationOutcome({ ...base, chargeFee: false });
    expect(r.paymentStatus).toBe("not_applicable");
    expect(r.balanceAfter).toBe(300);
    expect(r.createdAllocationReleased).toBe(true);
    expect(r.createdPrepaymentWithdrawal).toBe(false);
    expect(r.createdNewIncome).toBe(false);
    expect(r.counters).toEqual({ prepaid: -1, paid: 0, cancelled: 1, awaiting: 0 });
  });

  // ---------- TC-04 ----------
  it("TC-04: unpaid + non-payable → clean cancel, no debt, no income", () => {
    const r = computeCancellationOutcome({
      ...base,
      chargeFee: false,
      priorPaymentStatus: "unpaid",
      clientBalance: 0,
    });
    expect(r.paymentStatus).toBe("not_applicable");
    expect(r.createdExpectedPayment).toBe(false);
    expect(r.createdAllocationReleased).toBe(false);
    expect(r.counters).toEqual({ prepaid: 0, paid: 0, cancelled: 1, awaiting: 0 });
  });

  // ---------- TC-05 ----------
  it("TC-05: financial choice is required before confirm", () => {
    expect(validateCancellationChoice(undefined)).toBe("financial_choice_required");
    expect(validateCancellationChoice(true)).toBeNull();
    expect(validateCancellationChoice(false)).toBeNull();
  });

  // ---------- TC-10 ----------
  it("TC-10: a cancelled+paid session is NEVER reported as prepaid", () => {
    const r = computeCancellationOutcome(base);
    const row = { status: r.appointmentStatus!, payment_status: r.paymentStatus! };
    // Allowed
    expect(isCancelled(row) && isPaid(row)).toBe(true);
    // Forbidden
    expect(isPrepaid(row)).toBe(false);
  });

  // ---------- TC-11 / TC-12 ----------
  it("TC-11/TC-12: payable prepaid cancel produces exactly one withdrawal, no income, no Total Paid bump", () => {
    const r = computeCancellationOutcome(base);
    expect(r.createdPrepaymentWithdrawal).toBe(true);
    expect(r.createdNewIncome).toBe(false);
    expect(r.totalPaidDelta).toBe(0);
  });

  // ---------- TC-13 ----------
  it("TC-13: non-payable prepaid cancel releases allocation with €0 audit, no withdrawal", () => {
    const r = computeCancellationOutcome({ ...base, chargeFee: false });
    expect(r.createdAllocationReleased).toBe(true);
    expect(r.createdPrepaymentWithdrawal).toBe(false);
    expect(r.balanceDelta).toBe(0);
  });

  // ---------- TC-14 ----------
  it("TC-14: insufficient balance is rejected — balance never goes negative", () => {
    const r = computeCancellationOutcome({ ...base, clientBalance: 30 });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("insufficient_balance");
    expect(r.balanceAfter).toBe(30);
  });

  // ---------- TC-15 ----------
  it("TC-15: zero balance with paid_in_advance is flagged invalid, no withdrawal, no auto-Paid", () => {
    const r = computeCancellationOutcome({ ...base, clientBalance: 0 });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("invalid_state");
    expect(r.createdPrepaymentWithdrawal).toBe(false);
    expect(r.paymentStatus).toBeUndefined();
  });

  // ---------- TC-16 ----------
  it("TC-16: cancelling an already cancelled session is a no-op", () => {
    const r = computeCancellationOutcome({
      ...base,
      priorAppointmentStatus: "cancelled",
      priorPaymentStatus: "paid_from_prepayment",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("already_cancelled");
    expect(r.balanceAfter).toBe(300);
    expect(r.balanceDelta).toBe(0);
  });

  // ---------- TC-08 / TC-09 counter deltas ----------
  it("TC-08: payable cancel of prepaid session → prepaid-1, paid+1, cancelled+1", () => {
    const r = computeCancellationOutcome(base);
    expect(r.counters).toEqual({ prepaid: -1, paid: 1, cancelled: 1, awaiting: 0 });
  });
  it("TC-09: non-payable cancel of prepaid session → prepaid-1, paid unchanged", () => {
    const r = computeCancellationOutcome({ ...base, chargeFee: false });
    expect(r.counters).toEqual({ prepaid: -1, paid: 0, cancelled: 1, awaiting: 0 });
  });

  // ---------- TC-18 ----------
  it("TC-18: 6 prepaid × €50 with €300 balance — cancel 2 payable + 1 non-payable", () => {
    let balance = 300;
    const outcomes: ReturnType<typeof computeCancellationOutcome>[] = [];
    // Two payable cancellations
    for (let i = 0; i < 2; i++) {
      const r = computeCancellationOutcome({ ...base, clientBalance: balance });
      outcomes.push(r);
      balance = r.balanceAfter;
    }
    // One non-payable
    const nonPay = computeCancellationOutcome({
      ...base,
      chargeFee: false,
      clientBalance: balance,
    });
    outcomes.push(nonPay);
    balance = nonPay.balanceAfter;

    expect(balance).toBe(200);
    expect(outcomes.filter(o => o.createdPrepaymentWithdrawal)).toHaveLength(2);
    expect(outcomes.filter(o => o.createdAllocationReleased)).toHaveLength(1);
    expect(outcomes.every(o => o.createdNewIncome === false)).toBe(true);

    // Aggregate counter deltas: prepaid-3, paid+2, cancelled+3
    const agg = outcomes.reduce(
      (a, o) => ({
        prepaid: a.prepaid + o.counters.prepaid,
        paid: a.paid + o.counters.paid,
        cancelled: a.cancelled + o.counters.cancelled,
        awaiting: a.awaiting + o.counters.awaiting,
      }),
      { prepaid: 0, paid: 0, cancelled: 0, awaiting: 0 },
    );
    expect(agg).toEqual({ prepaid: -3, paid: 2, cancelled: 3, awaiting: 0 });
  });

  // ---------- TC-07 (idempotency at the pure layer) ----------
  it("TC-07: replaying the same cancel input on the resulting row is rejected (no double withdraw)", () => {
    const first = computeCancellationOutcome(base);
    const second = computeCancellationOutcome({
      ...base,
      priorAppointmentStatus: first.appointmentStatus!,
      priorPaymentStatus: first.paymentStatus!,
      clientBalance: first.balanceAfter,
    });
    expect(second.ok).toBe(false);
    expect(second.error).toBe("already_cancelled");
    expect(second.balanceAfter).toBe(250); // unchanged from first result
  });
});
