import { describe, expect, it } from "vitest";
import { durationFromEnd, meetingEndTime, parseMeetingDuration, parseNonnegativePrice, serviceMeetingDuration, MEETING_DURATION_PRESETS } from "../meetingDuration";

describe("meeting duration rules", () => {
  it("accepts a 40-minute service", () => expect(parseMeetingDuration("40")).toBe(40));
  it("initializes the meeting from its 40-minute service", () => expect(serviceMeetingDuration({ duration_minutes: 40 })).toBe("40"));
  it("accepts any positive whole-minute override", () => {
    for (const minutes of [1, 30, 35, 45, 55, 1440, 1500]) expect(parseMeetingDuration(String(minutes))).toBe(minutes);
    for (const value of ["", "0", "-1", "1.5", "invalid"]) expect(parseMeetingDuration(value)).toBeNull();
  });
  it("ends a 13:00 meeting after 40 minutes at 13:40", () => expect(meetingEndTime("13:00", 40)).toBe("13:40"));
  it("preserves custom duration when the start changes", () => expect(meetingEndTime("14:00", 35)).toBe("14:35"));
  it("derives 55 minutes when the end changes to 13:55", () => expect(durationFromEnd("13:00", "13:55")).toBe(55));
  it("does not clamp meetings ending late or crossing midnight", () => {
    expect(meetingEndTime("23:00", 55)).toBe("23:55");
    expect(meetingEndTime("23:30", 60)).toBe("00:30");
  });
  it("allows clearing numeric drafts and a free service price", () => {
    expect(parseMeetingDuration("")).toBeNull();
    expect(parseNonnegativePrice("")).toBeNull();
    expect(parseNonnegativePrice("0")).toBe(0);
    expect(parseNonnegativePrice("12.50")).toBe(12.5);
    expect(parseNonnegativePrice("-1")).toBeNull();
  });
  it("does not change a service when its meeting is overridden", () => {
    const service = { duration_minutes: 40 };
    const draft = serviceMeetingDuration(service);
    expect(parseMeetingDuration(draft)).toBe(40);
    expect(parseMeetingDuration("35")).toBe(35);
    expect(service.duration_minutes).toBe(40);
  });
  it("offers the requested quick durations", () => expect(MEETING_DURATION_PRESETS).toEqual([30, 45, 50, 60, 90, 120]));
});