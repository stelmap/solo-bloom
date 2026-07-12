import { describe, it, expect } from "vitest";
import { isRealSession } from "../paymentClassifiers";

/**
 * Regression: client card was hiding past-dated `scheduled` sessions from
 * Total Sessions & Session History because the old rule required the session
 * to be completed OR in the future. Now every non-terminal appointment counts
 * regardless of date.
 */
describe("isRealSession", () => {
  const past = "2026-06-01T10:00:00Z";
  const future = "2026-08-01T10:00:00Z";

  it.each([
    ["scheduled", past],
    ["scheduled", future],
    ["confirmed", past],
    ["confirmed", future],
    ["reminder_sent", past],
    ["completed", past],
    ["cancelled", past],
    ["no-show", past],
  ])("counts %s @ %s as a real session", (status, scheduled_at) => {
    expect(isRealSession({ status, scheduled_at })).toBe(true);
  });

  it("does not count unknown/inflight states we don't yet model", () => {
    expect(isRealSession({ status: "draft" })).toBe(false);
    expect(isRealSession({ status: "" })).toBe(false);
    expect(isRealSession({ status: null })).toBe(false);
  });

  it("counts a scheduled session even when past-dated (main bug fix)", () => {
    expect(isRealSession({ status: "scheduled", scheduled_at: past })).toBe(true);
  });
});
