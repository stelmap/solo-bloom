import { describe, it, expect } from "vitest";
import { recalcAppointmentPaymentStatus } from "../paymentStatus";

const SESSION = "2026-05-10T10:00:00Z";

describe("recalcAppointmentPaymentStatus", () => {
  describe("Unpaid", () => {
    it("returns unpaid when there are no allocations", () => {
      expect(
        recalcAppointmentPaymentStatus({
          price: 100,
          scheduled_at: SESSION,
          status: "scheduled",
          allocations: [],
        })
      ).toBe("unpaid");
    });

    it("downgrades a previously paid session to unpaid when allocations are removed", () => {
      expect(
        recalcAppointmentPaymentStatus({
          price: 100,
          scheduled_at: SESSION,
          status: "scheduled",
          allocations: [],
          currentPaymentStatus: "paid_now",
        })
      ).toBe("unpaid");
    });
  });

  describe("Partially paid", () => {
    it("marks partial when allocation < price", () => {
      expect(
        recalcAppointmentPaymentStatus({
          price: 100,
          scheduled_at: SESSION,
          status: "scheduled",
          allocations: [{ date: "2026-05-10", amount: 40 }],
        })
      ).toBe("partially_paid");
    });

    it("sums multiple allocations and stays partial below price", () => {
      expect(
        recalcAppointmentPaymentStatus({
          price: 100,
          scheduled_at: SESSION,
          status: "scheduled",
          allocations: [
            { date: "2026-05-10", amount: 30 },
            { date: "2026-05-10", amount: 50 },
          ],
        })
      ).toBe("partially_paid");
    });
  });

  describe("Paid (same-day)", () => {
    it("marks paid_now when allocation equals price on the session date", () => {
      expect(
        recalcAppointmentPaymentStatus({
          price: 100,
          scheduled_at: SESSION,
          status: "scheduled",
          allocations: [{ date: "2026-05-10", amount: 100 }],
        })
      ).toBe("paid_now");
    });

    it("treats overpayment of a single session as fully paid (excess is client credit)", () => {
      expect(
        recalcAppointmentPaymentStatus({
          price: 100,
          scheduled_at: SESSION,
          status: "scheduled",
          allocations: [{ date: "2026-05-10", amount: 150 }],
        })
      ).toBe("paid_now");
    });

    it("marks paid_now when payment received after the session", () => {
      expect(
        recalcAppointmentPaymentStatus({
          price: 100,
          scheduled_at: SESSION,
          status: "scheduled",
          allocations: [{ date: "2026-05-12", amount: 100 }],
        })
      ).toBe("paid_now");
    });
  });

  describe("Prepaid (paid in advance)", () => {
    it("marks paid_in_advance when payment date is before the session date", () => {
      expect(
        recalcAppointmentPaymentStatus({
          price: 100,
          scheduled_at: SESSION,
          status: "scheduled",
          allocations: [{ date: "2026-05-01", amount: 100 }],
        })
      ).toBe("paid_in_advance");
    });

    it("uses earliest allocation date to detect prepayment across multiple allocations", () => {
      expect(
        recalcAppointmentPaymentStatus({
          price: 100,
          scheduled_at: SESSION,
          status: "scheduled",
          allocations: [
            { date: "2026-05-01", amount: 60 },
            { date: "2026-05-12", amount: 40 },
          ],
        })
      ).toBe("paid_in_advance");
    });

    it("partial prepayment stays partially_paid (not prepaid) until fully covered", () => {
      expect(
        recalcAppointmentPaymentStatus({
          price: 100,
          scheduled_at: SESSION,
          status: "scheduled",
          allocations: [{ date: "2026-05-01", amount: 60 }],
        })
      ).toBe("partially_paid");
    });
  });

  describe("Cancelled / no-show preservation", () => {
    it("does not override payment_status for cancelled sessions", () => {
      expect(
        recalcAppointmentPaymentStatus({
          price: 100,
          scheduled_at: SESSION,
          status: "cancelled",
          allocations: [{ date: "2026-05-10", amount: 100 }],
          currentPaymentStatus: "waiting_for_payment",
        })
      ).toBe("waiting_for_payment");
    });

    it("does not override payment_status for no-show sessions", () => {
      expect(
        recalcAppointmentPaymentStatus({
          price: 100,
          scheduled_at: SESSION,
          status: "no-show",
          allocations: [],
          currentPaymentStatus: "unpaid",
        })
      ).toBe("unpaid");
    });
  });
});
