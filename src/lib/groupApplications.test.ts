import { describe, it, expect } from "vitest";
import { filterApplications, countByStatus, allowedDecisions } from "./groupApplications";
const rows = [
  { id: "a", person_name: "Anna K", email: "anna@x.com", status: "pending", submitted_at: "2026-11-01T10:00:00Z" },
  { id: "b", person_name: "Bohdan", email: "bo@y.com", status: "confirmed", submitted_at: "2026-11-03T10:00:00Z" },
  { id: "c", person_name: "Clara", email: "clara@x.com", status: "waitlisted", submitted_at: "2026-11-02T10:00:00Z" },
];
describe("group applications", () => {
  it("sorts newest first by default", () => expect(filterApplications(rows, "all", "").map(r => r.id)).toEqual(["b", "c", "a"]));
  it("filters by stored status", () => expect(filterApplications(rows, "waitlisted", "").map(r => r.id)).toEqual(["c"]));
  it("searches name or email", () => expect(filterApplications(rows, "all", "X.COM").map(r => r.id)).toEqual(["c", "a"]));
  it("counts per status", () => expect(countByStatus(rows)).toEqual({ all: 3, pending: 1, confirmed: 1, rejected: 0, waitlisted: 1 }));
  it("confirmed applications offer no repeat confirmation", () => {
    expect(allowedDecisions("confirmed")).toEqual([]);
    expect(allowedDecisions("waitlisted")).toEqual(["confirm", "reject"]);
  });
});
