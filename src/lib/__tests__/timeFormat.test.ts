import { describe, it, expect } from "vitest";
import { formatTime, formatScheduledTime } from "@/lib/timeFormat";

describe("formatTime", () => {
  it("returns raw HH:mm in 24h mode", () => {
    expect(formatTime("09:00", false)).toBe("09:00");
    expect(formatTime("13:30", false)).toBe("13:30");
    expect(formatTime("22:00", false)).toBe("22:00");
    expect(formatTime("00:00", false)).toBe("00:00");
  });

  it("converts to 12h format with AM/PM", () => {
    expect(formatTime("09:00", true)).toBe("9:00 AM");
    expect(formatTime("13:30", true)).toBe("1:30 PM");
    expect(formatTime("00:00", true)).toBe("12:00 AM");
    expect(formatTime("12:00", true)).toBe("12:00 PM");
    expect(formatTime("23:45", true)).toBe("11:45 PM");
  });

  it("returns empty string for empty input", () => {
    expect(formatTime("", false)).toBe("");
    expect(formatTime("", true)).toBe("");
  });
});

describe("formatScheduledTime", () => {
  it("extracts UTC time in 24h mode", () => {
    expect(formatScheduledTime("2026-04-07T09:00:00Z", false)).toBe("09:00");
    expect(formatScheduledTime("2026-04-07T14:30:00Z", false)).toBe("14:30");
    expect(formatScheduledTime("2026-04-07T22:00:00Z", false)).toBe("22:00");
  });

  it("extracts UTC time in 12h mode", () => {
    expect(formatScheduledTime("2026-04-07T09:00:00Z", true)).toBe("9:00 AM");
    expect(formatScheduledTime("2026-04-07T14:30:00Z", true)).toBe("2:30 PM");
    expect(formatScheduledTime("2026-04-07T22:00:00Z", true)).toBe("10:00 PM");
  });

  it("uses UTC regardless of local timezone", () => {
    // Midnight UTC should always be 00:00, not shifted by local tz
    const result = formatScheduledTime("2026-04-07T00:00:00Z", false);
    expect(result).toBe("00:00");
  });
});
