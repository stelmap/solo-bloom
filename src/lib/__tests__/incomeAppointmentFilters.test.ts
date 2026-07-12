import { describe, it, expect } from "vitest";
import {
  isFutureSession,
  matchesFilter,
  type AppointmentBucketInput,
} from "../incomeAppointmentFilters";

const NOW = new Date("2026-07-12T12:00:00Z");
const future = "2026-08-01T10:00:00Z";
const past = "2026-06-01T10:00:00Z";

const make = (o: Partial<AppointmentBucketInput>): AppointmentBucketInput => ({
  status: "scheduled",
  scheduled_at: future,
  remaining: 100,
  otherPaid: 0,
  ...o,
});

describe("isFutureSession", () => {
  it("includes future scheduled sessions", () => {
    expect(isFutureSession(make({ status: "scheduled" }), NOW)).toBe(true);
  });

  it("includes future confirmed / reminder_sent sessions (regression)", () => {
    expect(isFutureSession(make({ status: "confirmed" }), NOW)).toBe(true);
    expect(isFutureSession(make({ status: "reminder_sent" }), NOW)).toBe(true);
  });

  it("includes future sessions with any non-terminal custom status (regression)", () => {
    expect(isFutureSession(make({ status: "pending_reschedule" }), NOW)).toBe(true);
    expect(isFutureSession(make({ status: "" }), NOW)).toBe(true);
  });

  it("excludes cancelled / no-show even in the future", () => {
    expect(isFutureSession(make({ status: "cancelled" }), NOW)).toBe(false);
    expect(isFutureSession(make({ status: "no-show" }), NOW)).toBe(false);
  });

  it("excludes completed sessions", () => {
    expect(isFutureSession(make({ status: "completed" }), NOW)).toBe(false);
  });

  it("excludes past-dated sessions", () => {
    expect(isFutureSession(make({ scheduled_at: past }), NOW)).toBe(false);
  });

  it("excludes sessions with no scheduled_at", () => {
    expect(isFutureSession(make({ scheduled_at: null }), NOW)).toBe(false);
  });
});

describe("matchesFilter", () => {
  it("future filter surfaces confirmed sessions the old code missed (bug fix)", () => {
    const a = make({ status: "confirmed", scheduled_at: future });
    expect(matchesFilter(a, "future", NOW)).toBe(true);
  });

  it("unpaid filter excludes cancelled sessions", () => {
    expect(
      matchesFilter(make({ status: "cancelled", remaining: 100 }), "unpaid", NOW),
    ).toBe(false);
  });

  it("unpaid filter requires nothing paid yet", () => {
    expect(matchesFilter(make({ otherPaid: 40, remaining: 60 }), "unpaid", NOW)).toBe(false);
    expect(matchesFilter(make({ otherPaid: 0, remaining: 100 }), "unpaid", NOW)).toBe(true);
  });

  it("partial filter requires both otherPaid > 0 and remaining > 0", () => {
    expect(matchesFilter(make({ otherPaid: 40, remaining: 60 }), "partial", NOW)).toBe(true);
    expect(matchesFilter(make({ otherPaid: 100, remaining: 0 }), "partial", NOW)).toBe(false);
    expect(matchesFilter(make({ otherPaid: 0, remaining: 100 }), "partial", NOW)).toBe(false);
  });

  it("cancelled_billable filter needs cancelled + remaining debt", () => {
    expect(
      matchesFilter(make({ status: "cancelled", remaining: 100 }), "cancelled_billable", NOW),
    ).toBe(true);
    expect(
      matchesFilter(make({ status: "cancelled", remaining: 0 }), "cancelled_billable", NOW),
    ).toBe(false);
    expect(
      matchesFilter(make({ status: "scheduled", remaining: 100 }), "cancelled_billable", NOW),
    ).toBe(false);
  });

  it("all filter returns everything", () => {
    expect(matchesFilter(make({ status: "cancelled" }), "all", NOW)).toBe(true);
    expect(matchesFilter(make({ status: "completed", remaining: 0 }), "all", NOW)).toBe(true);
  });
});
