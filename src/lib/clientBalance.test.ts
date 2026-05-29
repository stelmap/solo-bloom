import { describe, it, expect } from "vitest";
import { computeClientBalance, type AppointmentLike } from "./clientBalance";

const apt = (
  id: string,
  price: number,
  payment_status: string,
  status = "completed",
): AppointmentLike => ({ id, price, payment_status, status });

describe("computeClientBalance", () => {
  it("fully-paid sessions only — no prepaid, no outstanding", () => {
    const r = computeClientBalance({
      appointments: [apt("a", 100, "paid_now"), apt("b", 80, "paid_in_advance")],
      allocByApt: { a: { paid: 100 }, b: { paid: 80 } },
      totalPaid: 180,
    });
    expect(r).toMatchObject({ prepaid: 0, outstanding: 0, fullyPaidTotal: 180 });
  });

  it("fully-unpaid completed session produces outstanding", () => {
    const r = computeClientBalance({
      appointments: [apt("a", 200, "unpaid")],
      allocByApt: {},
      totalPaid: 0,
    });
    expect(r.outstanding).toBe(200);
    expect(r.prepaid).toBe(0);
  });

  it("partially-paid session: prepaid pool auto-covers the gap (Blaze Zabini case)", () => {
    // One partially-paid completed session: price 180, paid 120, missing 60.
    // Total confirmed payments = 1660. Of that, 1000 is unallocated prepayment,
    // 660 is allocated to fully-paid earlier sessions (totaling 660 across statuses).
    // Simulate: 4 fully-paid sessions = 660 + this partial session.
    const r = computeClientBalance({
      appointments: [
        apt("s1", 165, "paid_now"),
        apt("s2", 165, "paid_now"),
        apt("s3", 165, "paid_now"),
        apt("s4", 165, "paid_now"),
        apt("s5", 180, "partially_paid"),
      ],
      allocByApt: {
        s1: { paid: 165 },
        s2: { paid: 165 },
        s3: { paid: 165 },
        s4: { paid: 165 },
        s5: { paid: 120 },
      },
      totalPaid: 1660,
    });
    // rawPrepaid = 1660 − 660 = 1000; rawOutstanding = 60; covered = 60.
    expect(r.rawPrepaid).toBe(1000);
    expect(r.rawOutstanding).toBe(60);
    expect(r.prepaid).toBe(940);
    expect(r.outstanding).toBe(0);
  });

  it("prepaid pool partially covers a large outstanding", () => {
    const r = computeClientBalance({
      appointments: [apt("a", 500, "unpaid")],
      allocByApt: {},
      totalPaid: 200,
    });
    expect(r.prepaid).toBe(0);
    expect(r.outstanding).toBe(300);
  });

  it("ignores non-completed and not_applicable sessions", () => {
    const r = computeClientBalance({
      appointments: [
        apt("a", 100, "unpaid", "scheduled"),
        apt("b", 100, "not_applicable"),
        apt("c", 100, "unpaid"),
      ],
      allocByApt: {},
      totalPaid: 0,
    });
    expect(r.outstanding).toBe(100);
    expect(r.payableCompleted).toHaveLength(1);
  });

  it("zero-price completed sessions are excluded", () => {
    const r = computeClientBalance({
      appointments: [apt("a", 0, "unpaid"), apt("b", 50, "unpaid")],
      allocByApt: {},
      totalPaid: 0,
    });
    expect(r.outstanding).toBe(50);
    expect(r.payableCompleted).toHaveLength(1);
  });

  it("prepayment with no completed sessions yet — full prepaid balance", () => {
    const r = computeClientBalance({
      appointments: [],
      allocByApt: {},
      totalPaid: 500,
    });
    expect(r.prepaid).toBe(500);
    expect(r.outstanding).toBe(0);
  });

  it("mixed: fully-paid + partial + unpaid with sufficient prepaid pool", () => {
    const r = computeClientBalance({
      appointments: [
        apt("a", 100, "paid_now"),
        apt("b", 100, "partially_paid"),
        apt("c", 100, "unpaid"),
      ],
      allocByApt: { a: { paid: 100 }, b: { paid: 40 } },
      // 100 covers 'a' fully, plus 40 toward 'b', plus 500 prepayment buffer
      totalPaid: 640,
    });
    // rawPrepaid = 640 − 100 = 540; rawOutstanding = (100−40) + 100 = 160
    expect(r.rawPrepaid).toBe(540);
    expect(r.rawOutstanding).toBe(160);
    expect(r.prepaid).toBe(380);
    expect(r.outstanding).toBe(0);
  });
});

describe("autoCoveredApptIds", () => {
  it("flags a partially-paid session whose gap is fully covered by prepaid pool", () => {
    const r = computeClientBalance({
      appointments: [
        { id: "s1", status: "completed", price: 165, payment_status: "paid_now", scheduled_at: "2026-05-01" },
        { id: "s5", status: "completed", price: 180, payment_status: "partially_paid", scheduled_at: "2026-05-29" },
      ],
      allocByApt: { s1: { paid: 165 }, s5: { paid: 120 } },
      totalPaid: 1165, // 165 covers s1 fully, 1000 prepayment pool
    });
    expect(r.autoCoveredApptIds.has("s5")).toBe(true);
    expect(r.prepaid).toBe(940);
  });

  it("does not flag a session when prepaid pool is insufficient", () => {
    const r = computeClientBalance({
      appointments: [
        { id: "s1", status: "completed", price: 180, payment_status: "partially_paid", scheduled_at: "2026-05-29" },
      ],
      allocByApt: { s1: { paid: 120 } },
      totalPaid: 150, // 30 in pool, gap is 60 — cannot cover
    });
    expect(r.autoCoveredApptIds.has("s1")).toBe(false);
    expect(r.outstanding).toBe(30);
  });

  it("covers oldest outstanding sessions first", () => {
    const r = computeClientBalance({
      appointments: [
        { id: "newer", status: "completed", price: 100, payment_status: "unpaid", scheduled_at: "2026-05-29" },
        { id: "older", status: "completed", price: 100, payment_status: "partially_paid", scheduled_at: "2026-05-01" },
      ],
      allocByApt: { older: { paid: 40 } }, // gap 60
      totalPaid: 60, // only enough to cover the older one's gap
    });
    expect(r.autoCoveredApptIds.has("older")).toBe(true);
    expect(r.autoCoveredApptIds.has("newer")).toBe(false);
  });
});
