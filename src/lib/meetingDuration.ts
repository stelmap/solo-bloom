export const MEETING_DURATION_PRESETS = [30, 45, 50, 60, 90, 120] as const;

export function parseMeetingDuration(value: string | number): number | null {
  if (String(value).trim() === "") return null;
  const minutes = Number(value);
  return Number.isSafeInteger(minutes) && minutes >= 1 ? minutes : null;
}

export function parseNonnegativePrice(value: string | number): number | null {
  if (String(value).trim() === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function timeMinutes(time: string): number {
  if (!/^\d{2}:\d{2}$/.test(time)) return NaN;
  const [hours, minutes] = time.split(":").map(Number);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : NaN;
}

export function meetingEndTime(start: string, duration: number): string {
  const total = timeMinutes(start) + duration;
  if (!Number.isFinite(total)) return "";
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

// End controls represent the same day; durations may extend into later days.
export function durationFromEnd(start: string, end: string): number | null {
  return parseMeetingDuration(timeMinutes(end) - timeMinutes(start));
}

export function serviceMeetingDuration(service?: { duration_minutes?: number | null }): string {
  return String(parseMeetingDuration(service?.duration_minutes ?? 60) ?? 60);
}