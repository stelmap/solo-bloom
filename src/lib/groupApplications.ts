/** UI filters map 1:1 to stored group_registrations.status values; no new statuses. */
export const APPLICATION_FILTERS = ["all", "pending", "confirmed", "rejected", "waitlisted"] as const;
export type ApplicationFilter = typeof APPLICATION_FILTERS[number];

export interface ApplicationRow { id: string; person_name: string; email: string; status: string; submitted_at: string }

export function filterApplications<T extends ApplicationRow>(rows: T[], filter: ApplicationFilter, query: string, order: "newest" | "oldest" = "newest"): T[] {
  const q = query.trim().toLowerCase();
  return rows
    .filter(r => filter === "all" || r.status === filter)
    .filter(r => !q || r.person_name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q))
    .sort((a, b) => (Date.parse(b.submitted_at) - Date.parse(a.submitted_at)) * (order === "newest" ? 1 : -1));
}

export function countByStatus(rows: ApplicationRow[]): Record<ApplicationFilter, number> {
  const c = { all: rows.length, pending: 0, confirmed: 0, rejected: 0, waitlisted: 0 } as Record<ApplicationFilter, number>;
  for (const r of rows) if (r.status in c && r.status !== "all") c[r.status as ApplicationFilter]++;
  return c;
}

/** Actions offered for a status — mirrors the existing UI (decisions only on new or waitlisted applications). */
export function allowedDecisions(status: string): Array<"confirm" | "waitlist" | "reject"> {
  if (status === "pending") return ["confirm", "waitlist", "reject"];
  if (status === "waitlisted") return ["confirm", "reject"];
  return [];
}
