import { describe, it, expect } from "vitest";
import {
  isFutureSession,
  isUnpaidSession,
  isPartiallyPaidSession,
  isBillableCancelledSession,
  isFullyPaid,
  matchesFilter,
  type AppointmentBucketInput,
} from "../incomeAppointmentFilters";

const NOW = new Date("2026-07-12T12:00:00Z");
const future = "2026-08-01T10:00:00Z";
const past = "2026-06-01T10:00:00Z";

const make = (o: Partial<AppointmentBucketInput>): AppointmentBucketInput => ({
  status: "scheduled",
  payment_status: "unpaid",
  scheduled_at: future,
  price: 50,
  remaining: 50,
  otherPaid: 0,
  ...o,
});

describe("isFutureSession", () => {
  it("includes future scheduled/confirmed/reminder_sent/custom sessions", () => {
    for (const s of ["scheduled", "confirmed", "reminder_sent", "pending_reschedule", ""]) {
      expect(isFutureSession(make({ status: s }), NOW)).toBe(true);
    }
  });
  it("excludes cancelled/no-show/completed/deleted/past", () => {
    expect(isFutureSession(make({ status: "cancelled" }), NOW)).toBe(false);
    expect(isFutureSession(make({ status: "no-show" }), NOW)).toBe(false);
    expect(isFutureSession(make({ status: "completed" }), NOW)).toBe(false);
    expect(isFutureSession(make({ is_deleted: true }), NOW)).toBe(false);
    expect(isFutureSession(make({ scheduled_at: past }), NOW)).toBe(false);
    expect(isFutureSession(make({ scheduled_at: null }), NOW)).toBe(false);
  });
});

describe("isFullyPaid", () => {
  it.each(["paid_now", "paid_in_advance", "paid_from_prepayment"])(
    "%s counts as paid regardless of remaining",
    (ps) => {
      expect(isFullyPaid(make({ payment_status: ps, remaining: 0 }))).toBe(true);
    },
  );
  it("remaining <= 0 counts as paid", () => {
    expect(isFullyPaid(make({ payment_status: "unpaid", remaining: 0 }))).toBe(true);
  });
});

describe("isUnpaidSession (AC1–AC3)", () => {
  it("AC1: completed + paid_now + remaining 0 is NOT unpaid", () => {
    expect(
      isUnpaidSession(
        make({ status: "completed", payment_status: "paid_now", scheduled_at: past, remaining: 0, otherPaid: 50 }),
        NOW,
      ),
    ).toBe(false);
  });

  it("AC1 (regression): paid session with no allocation row is NOT unpaid", () => {
    // The exact bug from the screenshot: legacy paid session has payment_status
    // set but no allocation record. Must not appear as Unpaid.
    expect(
      isUnpaidSession(
        make({ status: "completed", payment_status: "paid_now", scheduled_at: past, remaining: 0, otherPaid: 0 }),
        NOW,
      ),
    ).toBe(false);
  });

  it("AC2: future scheduled session is NOT unpaid", () => {
    expect(isUnpaidSession(make({ status: "scheduled", scheduled_at: future }), NOW)).toBe(false);
  });

  it("completed + unpaid + remaining > 0 IS unpaid", () => {
    expect(
      isUnpaidSession(
        make({ status: "completed", payment_status: "unpaid", scheduled_at: past, remaining: 50, otherPaid: 0 }),
        NOW,
      ),
    ).toBe(true);
  });

  it("completed + waiting_for_payment IS unpaid", () => {
    expect(
      isUnpaidSession(
        make({ status: "completed", payment_status: "waiting_for_payment", scheduled_at: past }),
        NOW,
      ),
    ).toBe(true);
  });

  it("partially paid session is NOT in unpaid bucket", () => {
    expect(
      isUnpaidSession(
        make({ status: "completed", payment_status: "partially_paid", remaining: 30, otherPaid: 20, scheduled_at: past }),
        NOW,
      ),
    ).toBe(false);
  });

  it("cancelled sessions are NOT unpaid", () => {
    expect(isUnpaidSession(make({ status: "cancelled", scheduled_at: past }), NOW)).toBe(false);
  });

  it("not_applicable payment status is NOT unpaid", () => {
    expect(
      isUnpaidSession(make({ status: "completed", payment_status: "not_applicable", scheduled_at: past }), NOW),
    ).toBe(false);
  });

  it("deleted sessions are NOT unpaid", () => {
    expect(
      isUnpaidSession(
        make({ status: "completed", payment_status: "unpaid", scheduled_at: past, is_deleted: true }),
        NOW,
      ),
    ).toBe(false);
  });
});

describe("isPartiallyPaidSession (AC4–AC5)", () => {
  it("AC4: partial payment status + remaining > 0", () => {
    expect(
      isPartiallyPaidSession(
        make({ status: "completed", payment_status: "partially_paid", remaining: 30, otherPaid: 20, scheduled_at: past }),
        NOW,
      ),
    ).toBe(true);
  });
  it("AC5: fully paid session is NOT partially paid", () => {
    expect(
      isPartiallyPaidSession(
        make({ status: "completed", payment_status: "paid_now", remaining: 0, otherPaid: 50, scheduled_at: past }),
        NOW,
      ),
    ).toBe(false);
  });
  it("unpaid session (no allocation) is NOT partially paid", () => {
    expect(
      isPartiallyPaidSession(
        make({ status: "completed", payment_status: "unpaid", remaining: 50, otherPaid: 0, scheduled_at: past }),
        NOW,
      ),
    ).toBe(false);
  });
  it("future session is NOT partially paid even if prepaid", () => {
    expect(
      isPartiallyPaidSession(
        make({ status: "scheduled", payment_status: "partially_paid", remaining: 20, otherPaid: 30 }),
        NOW,
      ),
    ).toBe(false);
  });
});

describe("isBillableCancelledSession (AC6–AC7)", () => {
  it("AC6: cancelled + billable + remaining > 0", () => {
    expect(
      isBillableCancelledSession(
        make({ status: "cancelled", is_billable_cancellation: true, remaining: 50, scheduled_at: past }),
      ),
    ).toBe(true);
  });
  it("AC7: cancelled + non-billable is excluded", () => {
    expect(
      isBillableCancelledSession(
        make({ status: "cancelled", is_billable_cancellation: false, remaining: 50, scheduled_at: past }),
      ),
    ).toBe(false);
  });
  it("cancelled + fully paid is excluded", () => {
    expect(
      isBillableCancelledSession(
        make({ status: "cancelled", remaining: 0, otherPaid: 50, scheduled_at: past }),
      ),
    ).toBe(false);
  });
});

describe("matchesFilter — full 'New Payment Test' scenario", () => {
  // Client with 2 completed+paid sessions and 1 future scheduled session.
  const sessions: AppointmentBucketInput[] = [
    { status: "completed", payment_status: "paid_now", scheduled_at: "2026-07-07T16:00:00Z", price: 50, remaining: 0, otherPaid: 50 },
    { status: "completed", payment_status: "paid_now", scheduled_at: "2026-07-09T16:00:00Z", price: 50, remaining: 0, otherPaid: 50 },
    { status: "scheduled", payment_status: "unpaid", scheduled_at: "2026-07-12T14:00:00Z", price: 50, remaining: 50, otherPaid: 0 },
  ];

  it("Unpaid tab is empty", () => {
    expect(sessions.filter((s) => matchesFilter(s, "unpaid", NOW))).toHaveLength(0);
  });
  it("Partially paid tab is empty", () => {
    expect(sessions.filter((s) => matchesFilter(s, "partial", NOW))).toHaveLength(0);
  });
  it("Future tab shows exactly 1 session (Jul 12)", () => {
    const fut = sessions.filter((s) => matchesFilter(s, "future", NOW));
    expect(fut).toHaveLength(1);
    expect(fut[0].scheduled_at).toBe("2026-07-12T14:00:00Z");
  });
  it("Billable cancelled tab is empty", () => {
    expect(sessions.filter((s) => matchesFilter(s, "cancelled_billable", NOW))).toHaveLength(0);
  });
  it("AC8: All tab shows all 3 sessions", () => {
    expect(sessions.filter((s) => matchesFilter(s, "all", NOW))).toHaveLength(3);
  });
});
