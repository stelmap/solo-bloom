import { describe, it, expect } from "vitest";
import { practiceClock, calendarDate, monthHiddenCount } from "../calendarClock";
import { fetchAllPages } from "../fetchAllPages";

describe("calendar synchronization", () => {
  it("compares practice wall clocks without shifting stored meeting hours", () => {
    const clock = practiceClock("Europe/Kyiv", Date.parse("2026-10-19T07:30:00Z"));
    expect(clock.dateKey).toBe("2026-10-19");
    expect(clock.minutes).toBe(630);
    expect(clock.wallClockMs).toBe(Date.parse("2026-10-19T10:30:00Z"));
  });
  it("uses practice day at timezone boundaries", () => {
    expect(practiceClock("America/Los_Angeles", Date.parse("2026-10-19T01:00:00Z")).dateKey).toBe("2026-10-18");
  });
  it("opens the stored meeting date regardless of browser timezone", () => {
    const date = calendarDate("2026-10-19T00:30:00Z");
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 19]);
  });
  it("reports the fourth meeting hidden by the monthly preview", () => {
    expect(monthHiddenCount(4, 0)).toBe(1);
    expect(monthHiddenCount(3, 2)).toBe(1);
  });
  it("loads newer meetings beyond the 1000-row API cap", async () => {
    const rows = Array.from({ length: 1423 }, (_, id) => ({ id }));
    const loaded = await fetchAllPages(async (from, to) => ({ data: rows.slice(from, to + 1), error: null }));
    expect(loaded).toHaveLength(1423);
    expect(loaded[1422].id).toBe(1422);
  });
  it("does not present a failed page as a successful incomplete schedule", async () => {
    await expect(fetchAllPages(async () => ({ data: null, error: new Error("network") }))).rejects.toThrow("network");
  });
});