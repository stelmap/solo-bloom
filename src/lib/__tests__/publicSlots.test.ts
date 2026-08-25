import { describe, expect, it } from "vitest";
import {
  availableSlots,
  blocksAvailability,
  candidateSlots,
  overlaps,
  slotCount,
} from "@/lib/publicSlots";

const hm = (h: number, m = 0) => h * 60 + m;
const at = (h: number, m: number, dur: number) => ({ start: hm(h, m), end: hm(h, m) + dur });
const label = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

const day = { windowStart: hm(9), windowEnd: hm(18), durationMinutes: 50, bufferMinutes: 10 };

describe("overlap rule", () => {
  it("treats adjacent intervals as free", () => {
    expect(overlaps(hm(9), hm(9, 50), hm(10), hm(10, 50))).toBe(false);
    expect(overlaps(hm(12), hm(12, 50), hm(12, 50), hm(13, 40))).toBe(false);
  });
  it("detects real overlaps", () => {
    expect(overlaps(hm(9, 30), hm(10, 20), hm(10), hm(10, 50))).toBe(true);
  });
});

describe("candidate generation", () => {
  it("uses duration + buffer as the stride and fits the window", () => {
    expect(candidateSlots(day).map(label)).toEqual([
      "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
    ]);
  });
  it("ignores buffer when none is configured", () => {
    expect(candidateSlots({ ...day, bufferMinutes: 0 }).map(label)[1]).toBe("09:50");
  });
});

describe("availability", () => {
  it("keeps morning and gap slots around midday/afternoon appointments", () => {
    const slots = availableSlots(day, [at(10, 0, 50), at(13, 0, 50), at(14, 0, 50)]);
    expect(slots.map(label)).toEqual(["09:00", "11:00", "12:00", "15:00", "16:00", "17:00"]);
  });

  it("an evening appointment does not hide morning slots", () => {
    expect(availableSlots(day, [at(17, 0, 50)]).map(label)).toContain("09:00");
  });

  it("a morning appointment does not hide later slots", () => {
    const slots = availableSlots(day, [at(9, 0, 50)]).map(label);
    expect(slots).not.toContain("09:00");
    expect(slots).toContain("16:00");
  });

  it("shows a gap only when the full duration fits", () => {
    const tight = { ...day, bufferMinutes: 0 };
    const slots = availableSlots(tight, [at(9, 0, 50), at(9, 50, 50)]).map(label);
    expect(slots[0]).toBe("10:40");
  });

  it("pending requests and unavailable-time blocks block only their interval", () => {
    const slots = availableSlots(day, [at(11, 0, 60), { start: hm(15), end: hm(16) }]).map(label);
    expect(slots).toEqual(["09:00", "10:00", "12:00", "13:00", "14:00", "16:00", "17:00"]);
  });

  it("cancelled / rejected / no-show records never block", () => {
    for (const s of ["cancelled", "no-show", "no_show", "rejected", "declined", "deleted", "completed"]) {
      expect(blocksAvailability(s)).toBe(false);
    }
    for (const s of ["scheduled", "confirmed", "pending", "needs_linking", "reminder_sent"]) {
      expect(blocksAvailability(s)).toBe(true);
    }
  });

  it("applies the minimum-notice cutoff without removing later slots", () => {
    const slots = availableSlots(day, [], hm(14, 11)).map(label);
    expect(slots).toEqual(["15:00", "16:00", "17:00"]);
  });

  it("does not cap slots by a daily workload capacity", () => {
    expect(availableSlots(day, []).length).toBeGreaterThan(6);
  });

  it("date-card count equals the rendered slot list", () => {
    const slots = availableSlots(day, [at(10, 0, 50)]);
    expect(slotCount(slots)).toBe(slots.length);
  });

  it("handles a day-boundary window without shifting slots", () => {
    const late = { windowStart: hm(22), windowEnd: hm(24), durationMinutes: 50, bufferMinutes: 10 };
    expect(candidateSlots(late).map(label)).toEqual(["22:00", "23:00"]);
  });
});
