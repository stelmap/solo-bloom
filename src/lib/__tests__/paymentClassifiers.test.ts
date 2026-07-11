import { describe, it, expect } from "vitest";
import {
  isPaid,
  isAwaiting,
  isCancelled,
  isCompleted,
  isPrepaid,
} from "../paymentClassifiers";

describe("paymentClassifiers", () => {
  describe("isPaid", () => {
    it.each([
      ["paid_now"],
      ["paid_in_advance"],
      ["paid_from_prepayment"],
    ])("treats %s as paid", (ps) => {
      expect(isPaid({ payment_status: ps })).toBe(true);
    });

    it.each([
      ["unpaid"],
      ["partially_paid"],
      ["partially_paid_from_prepayment"],
      ["waiting_for_payment"],
      [null],
      [undefined],
    ])("treats %s as NOT paid", (ps) => {
      expect(isPaid({ payment_status: ps as any })).toBe(false);
    });
  });

  describe("isPrepaid", () => {
    it("counts paid_in_advance as prepaid", () => {
      expect(isPrepaid({ payment_status: "paid_in_advance" })).toBe(true);
    });
    it("counts paid_from_prepayment as prepaid (consumed credit)", () => {
      expect(isPrepaid({ payment_status: "paid_from_prepayment" })).toBe(true);
    });
    it("does not count plain paid_now as prepaid", () => {
      expect(isPrepaid({ payment_status: "paid_now" })).toBe(false);
    });
  });

  describe("isAwaiting", () => {
    it("requires session to be completed", () => {
      expect(
        isAwaiting({ status: "scheduled", payment_status: "unpaid" })
      ).toBe(false);
    });

    it.each([
      ["unpaid"],
      ["waiting_for_payment"],
      ["partially_paid"],
      ["partially_paid_from_prepayment"],
    ])("flags completed session with %s as awaiting", (ps) => {
      expect(isAwaiting({ status: "completed", payment_status: ps })).toBe(true);
    });

    it("does not flag paid_from_prepayment as awaiting (it's settled)", () => {
      expect(
        isAwaiting({ status: "completed", payment_status: "paid_from_prepayment" })
      ).toBe(false);
    });

    it("does not flag paid_now as awaiting", () => {
      expect(
        isAwaiting({ status: "completed", payment_status: "paid_now" })
      ).toBe(false);
    });
  });

  describe("isCompleted / isCancelled", () => {
    it("isCompleted matches only completed", () => {
      expect(isCompleted({ status: "completed" })).toBe(true);
      expect(isCompleted({ status: "scheduled" })).toBe(false);
    });

    it("isCancelled covers only cancelled (not no-show)", () => {
      expect(isCancelled({ status: "cancelled" })).toBe(true);
      expect(isCancelled({ status: "no-show" })).toBe(false);
      expect(isCancelled({ status: "completed" })).toBe(false);
    });

  });

  describe("paid + awaiting are mutually exclusive", () => {
    const statuses = [
      "unpaid",
      "paid_now",
      "paid_in_advance",
      "paid_from_prepayment",
      "partially_paid",
      "partially_paid_from_prepayment",
      "waiting_for_payment",
    ];
    it.each(statuses)("for completed session with %s", (ps) => {
      const a = { status: "completed", payment_status: ps };
      expect(isPaid(a) && isAwaiting(a)).toBe(false);
    });
  });
});
