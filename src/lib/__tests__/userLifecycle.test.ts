import { describe, it, expect } from "vitest";
import {
  allowedActions,
  computePlannedDeletionDate,
  canAutoReactivate,
} from "../userLifecycle";

describe("userLifecycle", () => {
  it("returns correct actions per status", () => {
    expect(allowedActions("active")).toEqual(["deactivate"]);
    expect(allowedActions("deactivation_pending")).toEqual(["cancel_deactivation", "resend_email"]);
    expect(allowedActions("ready_for_deletion")).toEqual(["delete_permanently", "cancel_deletion"]);
    expect(allowedActions("deleted")).toEqual([]);
  });

  it("computes planned deletion date with default 7 days", () => {
    const now = new Date("2026-07-10T00:00:00Z");
    const d = computePlannedDeletionDate(now);
    expect(d.toISOString()).toBe("2026-07-17T00:00:00.000Z");
  });

  it("respects configurable grace period", () => {
    const now = new Date("2026-07-10T00:00:00Z");
    const d = computePlannedDeletionDate(now, 14);
    expect(d.toISOString()).toBe("2026-07-24T00:00:00.000Z");
  });

  it("auto-reactivates a pending user before planned deletion", () => {
    const now = new Date("2026-07-12T00:00:00Z");
    const planned = new Date("2026-07-17T00:00:00Z");
    expect(canAutoReactivate("deactivation_pending", planned, now)).toBe(true);
  });

  it("does not auto-reactivate after planned deletion", () => {
    const now = new Date("2026-07-18T00:00:00Z");
    const planned = new Date("2026-07-17T00:00:00Z");
    expect(canAutoReactivate("deactivation_pending", planned, now)).toBe(false);
  });

  it("does not auto-reactivate non-pending users", () => {
    expect(canAutoReactivate("active", null)).toBe(false);
    expect(canAutoReactivate("ready_for_deletion", new Date("2027-01-01"))).toBe(false);
    expect(canAutoReactivate("deleted", null)).toBe(false);
  });
});
