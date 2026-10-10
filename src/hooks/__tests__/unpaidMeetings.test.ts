import { describe, it, expect } from "vitest";
import { computeUnpaidMeeting } from "@/hooks/useUnpaidMeetings";

describe("computeUnpaidMeeting", () => {
  it("lists a completed unpaid meeting with full remaining", () => {
    expect(computeUnpaidMeeting({ status: "completed", payment_status: "waiting_for_payment", price: 900 }, 0)?.remaining).toBe(900);
  });
  it("keeps a partially paid meeting with the balance left", () => {
    expect(computeUnpaidMeeting({ status: "completed", payment_status: "partially_paid", price: 1200 }, 600)?.remaining).toBe(600);
  });
  it("does not treat a scheduled meeting whose time passed as debt", () => {
    expect(computeUnpaidMeeting({ status: "scheduled", payment_status: "unpaid", price: 800 }, 0)).toBeNull();
  });
  it("excludes meetings covered by prepayment", () => {
    expect(computeUnpaidMeeting({ status: "completed", payment_status: "paid_from_prepayment", price: 800 }, 0)).toBeNull();
  });
});
