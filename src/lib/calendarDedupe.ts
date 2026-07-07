/**
 * Calendar dedupe helpers.
 *
 * The appointments cache can briefly contain duplicate rows for the same id
 * (react-query cache races with realtime updates, group-session join fan-out
 * on Postgres, or overlapping invalidations right after a create). If the
 * calendar renders that raw list, the user sees a single created appointment
 * appear twice — once for an individual booking, and once again for a group
 * session because the join to `group_sessions` returns the same row.
 *
 * Every calendar render funnels through these helpers so "create 1 → show 1"
 * holds for both individual and group appointments.
 */

export type CalendarAppointmentLike = {
  id?: string | null;
  scheduled_at?: string | null;
  [key: string]: unknown;
};

/** Return a list with duplicate ids removed, preserving first-seen order. */
export function dedupeAppointmentsById<T extends CalendarAppointmentLike>(list: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const apt of list) {
    const id = apt?.id;
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(apt);
  }
  return out;
}
