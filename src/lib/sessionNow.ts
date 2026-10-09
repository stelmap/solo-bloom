/** A session is "now" when start <= now < end and it is not cancelled. */
export function isSessionInProgress(
  apt: { scheduled_at: string; duration_minutes?: number | null; status?: string | null },
  nowMs: number,
): boolean {
  if (!apt?.scheduled_at) return false;
  if (String(apt.status ?? "").startsWith("cancel")) return false;
  const start = new Date(apt.scheduled_at).getTime();
  if (!Number.isFinite(start)) return false;
  const end = start + Math.max(0, Number(apt.duration_minutes ?? 0)) * 60_000;
  return start <= nowMs && nowMs < end;
}

const NOW: Record<string, string> = { en: "Now", uk: "Зараз", ru: "Сейчас", pl: "Teraz", fr: "En cours" };
export const nowBadgeLabel = (lang: string) => NOW[lang] ?? NOW.en;
