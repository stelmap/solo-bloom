/**
 * Income dedupe helpers.
 *
 * Mirrors the DB safeguard `income_dedup_uniq`:
 *   UNIQUE (user_id, appointment_id, amount, date)
 *   WHERE status = 'confirmed' AND is_demo = false AND appointment_id IS NOT NULL
 *
 * Used to:
 *  - Deduplicate income rows returned by the API before rendering / summing.
 *  - Guard against double-click races on the "Confirm payment" action so we
 *    never send the same insert twice in the same tick.
 *  - Validate demo seed output — the seeder must not produce two rows with
 *    the same (user, appointment, amount, date) key for a confirmed non-demo
 *    income record.
 */

export type IncomeLike = {
  id?: string | null;
  user_id?: string | null;
  appointment_id?: string | null;
  amount?: number | string | null;
  date?: string | null;
  status?: string | null;
  is_demo?: boolean | null;
};

/** Canonical dedupe key. Returns null when the row is not covered by the unique index. */
export function incomeDedupeKey(row: IncomeLike): string | null {
  if (!row) return null;
  if (row.status !== "confirmed") return null;
  if (row.is_demo === true) return null;
  if (!row.user_id || !row.appointment_id || !row.date) return null;
  const amount = Number(row.amount);
  if (!Number.isFinite(amount)) return null;
  return [row.user_id, row.appointment_id, amount.toFixed(2), row.date].join("|");
}

/** Return the list with duplicates collapsed to the first occurrence. */
export function dedupeIncome<T extends IncomeLike>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const key = incomeDedupeKey(row);
    if (key === null) {
      out.push(row);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/** True when adding `candidate` to `existing` would create a duplicate. */
export function wouldDuplicateIncome(
  existing: readonly IncomeLike[],
  candidate: IncomeLike,
): boolean {
  const key = incomeDedupeKey(candidate);
  if (key === null) return false;
  return existing.some((row) => incomeDedupeKey(row) === key);
}

/**
 * Guard the "Confirm payment" click path against double submits.
 *
 * `inFlightKeys` is a Set the caller keeps for the lifetime of the screen.
 * Returns `true` when the caller should proceed with the insert; `false`
 * means an identical insert is already in flight (or just committed) and
 * this click must be ignored.
 */
export function claimPaymentSlot(
  inFlightKeys: Set<string>,
  candidate: IncomeLike,
): boolean {
  const key = incomeDedupeKey(candidate);
  if (key === null) return true;
  if (inFlightKeys.has(key)) return false;
  inFlightKeys.add(key);
  return true;
}
