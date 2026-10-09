import { describe, it, expect } from "vitest";
import { isSessionInProgress } from "../sessionNow";

const start = "2026-10-09T10:00:00Z";
const t = (iso: string) => new Date(iso).getTime();

describe("isSessionInProgress", () => {
  it("is current at the exact start time", () => {
    expect(isSessionInProgress({ scheduled_at: start, duration_minutes: 50, status: "scheduled" }, t(start))).toBe(true);
  });
  it("is not current at the exact end time", () => {
    expect(isSessionInProgress({ scheduled_at: start, duration_minutes: 50, status: "scheduled" }, t("2026-10-09T10:50:00Z"))).toBe(false);
  });
  it("is not current before it starts", () => {
    expect(isSessionInProgress({ scheduled_at: start, duration_minutes: 50 }, t("2026-10-09T09:59:00Z"))).toBe(false);
  });
  it("never highlights cancelled sessions", () => {
    expect(isSessionInProgress({ scheduled_at: start, duration_minutes: 50, status: "cancelled" }, t("2026-10-09T10:10:00Z"))).toBe(false);
  });
});
