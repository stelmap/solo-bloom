import { describe, it, expect } from "vitest";
import { dedupeAppointmentsById } from "../calendarDedupe";

/**
 * Regression: creating one appointment used to render as two on the calendar
 * because the cached list occasionally contained the same row twice (realtime
 * race for individual sessions, join fan-out for group sessions).
 *
 * These tests lock in "create 1 → show 1" for both flavours.
 */
describe("dedupeAppointmentsById", () => {
  it("individual: one created appointment renders once even if cache has duplicates", () => {
    const created = {
      id: "apt-1",
      scheduled_at: "2026-07-07T10:00:00Z",
      client_id: "c1",
      clients: { name: "Alice" },
      services: { name: "Manicure" },
      group_session_id: null,
    };
    // Realtime + optimistic update both push the same row into the cache.
    const cache = [created, created];

    const visible = dedupeAppointmentsById(cache);

    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe("apt-1");
  });

  it("group: one created group appointment renders once even with join fan-out", () => {
    // Postgres join on group_sessions/group_members can return the same
    // appointment row per participant. All of them share the same id.
    const groupApt = {
      id: "apt-group-1",
      scheduled_at: "2026-07-07T14:00:00Z",
      client_id: null,
      group_session_id: "gs-1",
      group_sessions: {
        id: "gs-1",
        group_id: "g-1",
        groups: { name: "Yoga class" },
      },
    };
    const cache = [groupApt, groupApt, groupApt];

    const visible = dedupeAppointmentsById(cache);

    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe("apt-group-1");
  });

  it("mixed individual + group: each unique appointment renders exactly once", () => {
    const individual = { id: "apt-1", scheduled_at: "2026-07-07T10:00:00Z" };
    const group = {
      id: "apt-2",
      scheduled_at: "2026-07-07T14:00:00Z",
      group_session_id: "gs-1",
    };
    const cache = [individual, group, individual, group, group];

    const visible = dedupeAppointmentsById(cache);

    expect(visible).toHaveLength(2);
    expect(visible.map((a) => a.id)).toEqual(["apt-1", "apt-2"]);
  });

  it("skips rows without an id so malformed cache entries never inflate the count", () => {
    const cache = [
      { id: "apt-1", scheduled_at: "2026-07-07T10:00:00Z" },
      { id: null, scheduled_at: "2026-07-07T10:00:00Z" },
      { id: undefined, scheduled_at: "2026-07-07T10:00:00Z" },
    ] as any[];

    const visible = dedupeAppointmentsById(cache);

    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe("apt-1");
  });
});
