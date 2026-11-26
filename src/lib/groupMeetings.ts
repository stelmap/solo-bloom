/** Classification of a group's meetings for the Overview tab. Timestamps are practice wall clocks labelled UTC. */
export const UPCOMING_STATUSES = ["scheduled", "confirmed", "reminder_sent"];
export const HISTORY_PAGE_SIZE = 10;

export interface MeetingLike { id: string; appointments?: { scheduled_at: string; status: string; service_id?: string | null; services?: { name?: string } | null } | null }

export function splitMeetings<T extends MeetingLike>(sessions: T[], nowWallClockMs: number) {
  const upcoming: T[] = []; const history: T[] = [];
  for (const s of sessions) {
    const a = s.appointments; if (!a) continue;
    const t = Date.parse(a.scheduled_at);
    if (UPCOMING_STATUSES.includes(a.status) && t >= nowWallClockMs) upcoming.push(s); else history.push(s);
  }
  const at = (s: T) => Date.parse(s.appointments!.scheduled_at);
  upcoming.sort((x, y) => at(x) - at(y));
  history.sort((x, y) => at(y) - at(x));
  return { upcoming, history };
}

/** Past meeting still in an open status — shown in history, flagged so it is never silently hidden. */
export function isOverdue(m: MeetingLike, nowWallClockMs: number) {
  const a = m.appointments; return !!a && UPCOMING_STATUSES.includes(a.status) && Date.parse(a.scheduled_at) < nowWallClockMs;
}

/** Service name only when every meeting shares the same service. */
export function sharedServiceName(sessions: MeetingLike[]): string | null {
  const names = new Set<string>(); let missing = false;
  for (const s of sessions) { const n = s.appointments?.services?.name; if (n) names.add(n); else if (s.appointments) missing = true; }
  return names.size === 1 && !missing ? [...names][0] : null;
}

export function paginate<T>(items: T[], page: number, size = HISTORY_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const p = Math.min(Math.max(1, page), pages);
  return { page: p, pages, items: items.slice((p - 1) * size, p * size) };
}

export const STATUS_KEY: Record<string, string> = {
  scheduled: "status.scheduled", reminder_sent: "status.scheduled", confirmed: "status.confirmed",
  completed: "status.completed", cancelled: "status.cancelled", "no-show": "status.noShow",
};

export interface RegistrationLike { id: string; person_name: string; status: string; submitted_at: string; decision_at: string | null }
export type ActivityItem = { key: string; kind: "submitted" | "decision"; name: string; status: string; at: string };

/** Activity derived only from persisted application timestamps. */
export function recentActivity(regs: RegistrationLike[], limit = 5): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const r of regs) {
    if (r.submitted_at) items.push({ key: `${r.id}-s`, kind: "submitted", name: r.person_name, status: r.status, at: r.submitted_at });
    if (r.decision_at && ["confirmed", "rejected", "waitlisted"].includes(r.status)) items.push({ key: `${r.id}-d`, kind: "decision", name: r.person_name, status: r.status, at: r.decision_at });
  }
  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
}
