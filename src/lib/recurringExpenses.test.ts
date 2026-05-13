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
