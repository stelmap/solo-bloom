import { describe, it, expect } from "vitest";
import {
  generateMonthlyOccurrences,
  generateYearlyOccurrences,
  isLastDayOfItsMonth,
  occurrenceDateFor,
  daysInMonth,
} from "./recurringExpenses";

describe("recurringExpenses preview matches backend generation", () => {
  describe("isLastDayOfItsMonth", () => {
    it("detects last day across month lengths", () => {
      expect(isLastDayOfItsMonth("2026-01-31")).toBe(true);
      expect(isLastDayOfItsMonth("2026-02-28")).toBe(true); // non-leap
      expect(isLastDayOfItsMonth("2024-02-29")).toBe(true); // leap
      expect(isLastDayOfItsMonth("2026-04-30")).toBe(true);
      expect(isLastDayOfItsMonth("2026-04-29")).toBe(false);
      expect(isLastDayOfItsMonth("2026-01-30")).toBe(false);
    });
  });

  describe("daysInMonth", () => {
    it("returns correct length", () => {
      expect(daysInMonth(2026, 0)).toBe(31); // Jan
      expect(daysInMonth(2026, 1)).toBe(28); // Feb non-leap
      expect(daysInMonth(2024, 1)).toBe(29); // Feb leap
      expect(daysInMonth(2026, 3)).toBe(30); // Apr
    });
  });

  describe("monthly: last day of month rule", () => {
    it("Jan 31 → Feb 28 → Mar 31 → Apr 30 → May 31", () => {
      const dates = generateMonthlyOccurrences("2026-01-31", true, 5);
      expect(dates).toEqual([
        "2026-01-31",
        "2026-02-28",
        "2026-03-31",
        "2026-04-30",
        "2026-05-31",
      ]);
    });

    it("uses Feb 29 in a leap year when starting on a last day", () => {
      const dates = generateMonthlyOccurrences("2024-01-31", true, 3);
      expect(dates).toEqual(["2024-01-31", "2024-02-29", "2024-03-31"]);
    });

    it("Apr 30 (last-day) keeps end-of-month for following months", () => {
      const dates = generateMonthlyOccurrences("2026-04-30", true, 4);
      expect(dates).toEqual([
        "2026-04-30",
        "2026-05-31",
        "2026-06-30",
        "2026-07-31",
      ]);
    });
  });

  describe("monthly: fixed-day rule with short-month clamp", () => {
    it("Jan 30 → Feb 28 (clamp) → Mar 30 → Apr 30 → May 30", () => {
      const dates = generateMonthlyOccurrences("2026-01-30", false, 5);
      expect(dates).toEqual([
        "2026-01-30",
        "2026-02-28",
        "2026-03-30",
        "2026-04-30",
        "2026-05-30",
      ]);
    });

    it("Day 29 clamps to Feb 28 in non-leap, 29 in leap", () => {
      expect(occurrenceDateFor("2026-01-29", false, 2026, 1)).toBe("2026-02-28");
      expect(occurrenceDateFor("2024-01-29", false, 2024, 1)).toBe("2024-02-29");
    });

    it("Day 15 stays on the 15th every month", () => {
      const dates = generateMonthlyOccurrences("2026-01-15", false, 4);
      expect(dates).toEqual([
        "2026-01-15",
        "2026-02-15",
        "2026-03-15",
        "2026-04-15",
      ]);
    });

    it("rolls year boundary correctly", () => {
      const dates = generateMonthlyOccurrences("2026-11-30", false, 4);
      expect(dates).toEqual([
        "2026-11-30",
        "2026-12-30",
        "2027-01-30",
        "2027-02-28",
      ]);
    });
  });

  describe("timezone stability", () => {
    // The generators operate on yyyy-mm-dd strings and must NOT shift dates
    // due to local↔UTC parsing (the classic `new Date("2026-03-01")` UTC bug
    // that yields Feb 28 in negative-offset timezones).

    const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

    it("first occurrence equals the provided start date verbatim", () => {
      // In a UTC-shifted parse, "2026-03-01" could become "2026-02-28".
      expect(generateMonthlyOccurrences("2026-03-01", false, 1)[0]).toBe("2026-03-01");
      expect(generateMonthlyOccurrences("2026-01-01", false, 1)[0]).toBe("2026-01-01");
      expect(generateMonthlyOccurrences("2026-12-31", true, 1)[0]).toBe("2026-12-31");
      expect(generateYearlyOccurrences("2026-01-01", 1)[0]).toBe("2026-01-01");
      expect(generateYearlyOccurrences("2026-12-31", 1)[0]).toBe("2026-12-31");
    });

    it("DST-boundary days are not shifted (Mar/Nov in northern hemisphere)", () => {
      // In a TZ-naive impl, Mar 8 / Mar 29 / Nov 1 could drift by one day.
      expect(generateMonthlyOccurrences("2026-03-08", false, 3)).toEqual([
        "2026-03-08",
        "2026-04-08",
        "2026-05-08",
      ]);
      expect(generateMonthlyOccurrences("2026-03-29", false, 2)).toEqual([
        "2026-03-29",
        "2026-04-29",
      ]);
      expect(generateMonthlyOccurrences("2026-11-01", false, 2)).toEqual([
        "2026-11-01",
        "2026-12-01",
      ]);
    });

    it("always emits zero-padded yyyy-mm-dd strings (no Date#toISOString drift)", () => {
      const all = [
        ...generateMonthlyOccurrences("2026-01-05", false, 12),
        ...generateMonthlyOccurrences("2026-01-31", true, 12),
        ...generateYearlyOccurrences("2024-02-29", 5),
      ];
      for (const s of all) expect(s).toMatch(ISO_RE);
    });

    it("is deterministic — output is independent of wall-clock / Date.now", () => {
      const a = generateMonthlyOccurrences("2026-01-31", true, 12);
      const realNow = Date.now;
      try {
        // Simulate a different "now" — output must not change.
        Date.now = () => new Date(1970, 0, 1).getTime();
        const b = generateMonthlyOccurrences("2026-01-31", true, 12);
        expect(b).toEqual(a);
      } finally {
        Date.now = realNow;
      }
    });

    it("occurrenceDateFor returns the requested calendar date verbatim", () => {
      // Day 1 in a TZ-shifted impl could become last-day-of-previous-month.
      expect(occurrenceDateFor("2026-01-01", false, 2026, 2)).toBe("2026-03-01");
      expect(occurrenceDateFor("2026-01-01", false, 2026, 0)).toBe("2026-01-01");
      // Last-day flag respects the target month's length, not the start month's.
      expect(occurrenceDateFor("2026-01-31", true, 2026, 1)).toBe("2026-02-28");
      expect(occurrenceDateFor("2024-01-31", true, 2024, 1)).toBe("2024-02-29");
    });
  });

  describe("yearly", () => {
    it("repeats same month/day each year", () => {
      const dates = generateYearlyOccurrences("2026-03-15", 3);
      expect(dates).toEqual(["2026-03-15", "2027-03-15", "2028-03-15"]);
    });

    it("Feb 29 falls back to Feb 28 in non-leap years", () => {
      const dates = generateYearlyOccurrences("2024-02-29", 4);
      expect(dates).toEqual([
        "2024-02-29",
        "2025-02-28",
        "2026-02-28",
        "2027-02-28",
      ]);
    });
  });
});
