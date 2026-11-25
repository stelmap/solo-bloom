import { describe, it, expect } from "vitest";
import { chargeableForAttendance } from "@/i18n/groupsExtra";

describe("group billing rules", () => {
  it("charges a missed held meeting when the group charges absences", () => {
    expect(chargeableForAttendance({ meetingStatus: "completed", attendance: "absent", chargeAbsent: true })).toBe(true);
  });
  it("does not charge a missed meeting when the group does not charge absences", () => {
    expect(chargeableForAttendance({ meetingStatus: "completed", attendance: "absent", chargeAbsent: false })).toBe(false);
  });
  it("never charges a cancelled meeting", () => {
    expect(chargeableForAttendance({ meetingStatus: "cancelled", attendance: "attended", chargeAbsent: true })).toBe(false);
  });
});
