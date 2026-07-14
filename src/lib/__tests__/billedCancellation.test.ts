import { describe, it, expect } from "vitest";
import {
  isBilledCancellation,
  isDelivered,
  isCancelled,
  isAwaiting,
  isPaid,
} from "../paymentClassifiers";

/**
 * Product rule: a cancelled session that still carries a financial obligation
 * (late-cancel fee, paid from prepayment, or debt) is counted BOTH as
 * Delivered (session-management view) and as Cancelled (attendance view).
 * Finance metrics remain fully separate.
 */
describe("billed cancellation counters", () => {
  const billedCases = [
    "paid_now",
    "paid_in_advance",
    "paid_from_prepayment",
    "waiting_for_payment",
    "partially_paid",
    "partially_paid_from_prepayment",
  ];

  it.each(billedCases)("cancelled + %s is a billed cancellation", (ps) => {
    const a = { status: "cancelled", payment_status: ps };
    expect(isBilledCancellation(a)).toBe(true);
    expect(isDelivered(a)).toBe(true);
    expect(isCancelled(a)).toBe(true); // still cancelled — counters overlap by design
  });

  it("free cancellation (not_applicable) is NOT delivered", () => {
    const a = { status: "cancelled", payment_status: "not_applicable" };
    expect(isBilledCancellation(a)).toBe(false);
    expect(isDelivered(a)).toBe(false);
    expect(isCancelled(a)).toBe(true);
  });

  it("cancelled + paid_now shows in Paid counter (via isPaid)", () => {
    expect(isPaid({ status: "cancelled", payment_status: "paid_now" })).toBe(true);
  });

  it("cancelled + waiting_for_payment shows in Awaiting counter", () => {
    expect(
      isAwaiting({ status: "cancelled", payment_status: "waiting_for_payment" }),
    ).toBe(true);
  });

  it("no-show + paid_from_prepayment is also delivered", () => {
    expect(
      isDelivered({ status: "no-show", payment_status: "paid_from_prepayment" }),
    ).toBe(true);
  });
});
