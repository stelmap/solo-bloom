import { describe, expect, it } from "vitest";
import { blockedRangeAfterStartChange, intervalsOverlap } from "@/lib/blockedTimeRange";

const m = (t: string) => { const [h, mm] = t.split(":").map(Number); return h * 60 + mm; };

describe("unavailable time range", () => {
  it("keeps 13:00 end when start moves from 09:00 to 11:00", () => {
    expect(blockedRangeAfterStartChange("11:00", "13:00")).toEqual({ end: "13:00", duration: 120 });
  });
  it("keeps 14:00 end for an 11:00 start", () => {
    expect(blockedRangeAfterStartChange("11:00", "14:00").end).toBe("14:00");
  });
  it("moves the end only when it would precede the new start", () => {
    expect(blockedRangeAfterStartChange("15:00", "13:00").end).toBe("16:00");
  });
});

describe("booking overlap with block 11:00–13:00", () => {
  it("rejects a 50-minute meeting at 12:30", () => {
    expect(intervalsOverlap(m("12:30"), m("12:30") + 50, m("11:00"), m("13:00"))).toBe(true);
  });
  it("allows a 50-minute meeting at 13:00", () => {
    expect(intervalsOverlap(m("13:00"), m("13:00") + 50, m("11:00"), m("13:00"))).toBe(false);
  });
});
