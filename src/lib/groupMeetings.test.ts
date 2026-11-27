import { describe, it, expect } from "vitest";
import { splitMeetings, paginate, sharedServiceName, isOverdue, recentActivity } from "./groupMeetings";

const m = (id: string, at: string, status: string, svc = "A") => ({ id, appointments: { scheduled_at: at, status, services: { name: svc } } });
const now = Date.parse("2026-11-26T12:00:00Z");

describe("group meetings", () => {
  it("keeps later-today meetings upcoming", () => {
    expect(splitMeetings([m("today", "2026-11-26T13:00:00Z", "scheduled")], now).upcoming.map(x => x.id)).toEqual(["today"]);
  });
  it("keeps an in-progress meeting upcoming until its end", () => {
    const meeting = { ...m("live", "2026-11-26T11:30:00Z", "confirmed"), appointments: { scheduled_at: "2026-11-26T11:30:00Z", duration_minutes: 60, status: "confirmed" } };
    expect(splitMeetings([meeting], now).upcoming.map(x => x.id)).toEqual(["live"]);
    expect(isOverdue(meeting, now)).toBe(false);
    expect(splitMeetings([meeting], Date.parse("2026-11-26T12:30:00Z")).history.map(x => x.id)).toEqual(["live"]);
  });
  it("always places completed meetings in history even before their scheduled end", () => {
    expect(splitMeetings([m("done", "2026-11-26T13:00:00Z", "completed")], now).history.map(x => x.id)).toEqual(["done"]);
  });
  it("upcoming are future open meetings ascending; history descending incl. overdue", () => {
    const { upcoming, history } = splitMeetings([m("1", "2026-12-03T18:00:00Z", "scheduled"), m("2", "2026-11-27T18:00:00Z", "confirmed"), m("3", "2026-11-20T18:00:00Z", "scheduled"), m("4", "2026-11-25T18:00:00Z", "completed"), m("5", "2026-12-01T18:00:00Z", "cancelled")], now);
    expect(upcoming.map(x => x.id)).toEqual(["2", "1"]);
    expect(history.map(x => x.id)).toEqual(["5", "4", "3"]);
    expect(isOverdue(history[2], now)).toBe(true);
  });
  it("paginates 10 per page without losing records", () => {
    const items = Array.from({ length: 103 }, (_, i) => i);
    expect(paginate(items, 1).items).toHaveLength(10);
    expect(paginate(items, 11)).toMatchObject({ pages: 11, items: [100, 101, 102] });
  });
  it("service shown only when all meetings share it", () => {
    expect(sharedServiceName([m("1", "2026-01-01T00:00:00Z", "completed"), m("2", "2026-01-02T00:00:00Z", "completed")])).toBe("A");
    expect(sharedServiceName([m("1", "2026-01-01T00:00:00Z", "completed"), m("2", "2026-01-02T00:00:00Z", "completed", "B")])).toBeNull();
  });
  it("activity uses only stored submission and decision timestamps", () => {
    const a = recentActivity([{ id: "r", person_name: "Anna", status: "confirmed", submitted_at: "2026-11-01T10:00:00Z", decision_at: "2026-11-02T10:00:00Z" }, { id: "p", person_name: "Bo", status: "pending", submitted_at: "2026-11-03T10:00:00Z", decision_at: null }]);
    expect(a.map(x => x.key)).toEqual(["p-s", "r-d", "r-s"]);
  });
});
