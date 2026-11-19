import { durationFromEnd, meetingEndTime } from "@/lib/meetingDuration";

/**
 * Changing the start of an unavailable-time block keeps the end the user
 * chose; only when the end would no longer follow the start is it moved.
 */
export function blockedRangeAfterStartChange(start: string, currentEnd: string, fallbackMinutes = 60) {
  const keep = durationFromEnd(start, currentEnd);
  if (keep !== null && keep > 0) return { end: currentEnd, duration: keep };
  const end = meetingEndTime(start, fallbackMinutes);
  return { end, duration: end ? fallbackMinutes : null };
}

/** Half-open [start, end) overlap in minutes. */
export function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}
