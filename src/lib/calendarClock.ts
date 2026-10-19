/** Appointments store practice wall-clock values labelled UTC, not UTC instants. */
export function practiceClock(timezone?: string | null, instant = Date.now()) {
  const date = new Date(instant);
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(date);
    const value = (type: string) => parts.find(p => p.type === type)?.value || "00";
    const key = `${value("year")}-${value("month")}-${value("day")}`;
    const time = `${value("hour")}:${value("minute")}:${value("second")}`;
    return { dateKey: key, wallClockMs: Date.parse(`${key}T${time}Z`), minutes: Number(value("hour")) * 60 + Number(value("minute")) };
  } catch {
    return practiceClock("UTC", instant);
  }
}

export function calendarDate(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function monthHiddenCount(appointments: number, requests: number): number {
  return Math.max(appointments - 3, 0) + Math.max(requests - 1, 0);
}