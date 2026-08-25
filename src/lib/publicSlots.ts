/**
 * Shared availability rules for the Public Booking page.
 *
 * This module mirrors, in pure TypeScript, the rules applied by the
 * `public_get_available_slots` database function so both the slot list and the
 * date-card counters can be reasoned about (and tested) in one place.
 *
 * All times are handled as minutes-from-midnight in the practitioner's LOCAL
 * timezone: the backend emits slots as local wall-clock instants, so no extra
 * timezone conversion happens here (avoiding double conversion).
 */

export interface BlockingInterval {
  /** Start in minutes from local midnight. */
  start: number;
  /** End in minutes from local midnight (exclusive). */
  end: number;
}

export interface SlotSource {
  /** Availability window start/end in minutes from local midnight. */
  windowStart: number;
  windowEnd: number;
  /** Service duration in minutes. */
  durationMinutes: number;
  /** Buffer between sessions (added to the stride), 0 when not configured. */
  bufferMinutes?: number;
}

/** True only when the two intervals genuinely overlap (adjacency is fine). */
export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** Statuses that never block a public slot. */
const NON_BLOCKING_STATUSES = new Set([
  "cancelled",
  "canceled",
  "no-show",
  "no_show",
  "declined",
  "rejected",
  "deleted",
  "completed",
]);

export function blocksAvailability(status: string | null | undefined): boolean {
  const s = String(status ?? "").toLowerCase();
  return !NON_BLOCKING_STATUSES.has(s);
}

/** All candidate start times for a day, regardless of conflicts. */
export function candidateSlots(src: SlotSource): number[] {
  const dur = Number(src.durationMinutes);
  if (!Number.isFinite(dur) || dur <= 0) return [];
  const stride = dur + Math.max(0, Number(src.bufferMinutes) || 0);
  const out: number[] = [];
  for (let s = src.windowStart; s + dur <= src.windowEnd; s += stride) out.push(s);
  return out;
}

/**
 * Free slot start times for a single day. A candidate is removed only when its
 * own interval overlaps a blocking interval — never because the day merely
 * contains other appointments.
 */
export function availableSlots(
  src: SlotSource,
  blocking: BlockingInterval[],
  /** Minutes-from-midnight cutoff from the minimum-notice rule (optional). */
  minNoticeCutoff?: number,
): number[] {
  const dur = Number(src.durationMinutes);
  return candidateSlots(src).filter((start) => {
    const end = start + dur;
    if (typeof minNoticeCutoff === "number" && start < minNoticeCutoff) return false;
    return !blocking.some((b) => overlaps(start, end, b.start, b.end));
  });
}

/**
 * The date-card counter must always be derived from the rendered slot list —
 * never computed independently (e.g. from a daily workload capacity).
 */
export function slotCount(slots: unknown[]): number {
  return slots.length;
}
