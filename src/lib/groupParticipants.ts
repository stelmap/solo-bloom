// Billing (SessionDetailSheet) charges the member override, else the specific meeting's price.
// Without an override there is no fixed amount to show: the participant "uses meeting price".
export function effectiveMemberPrice(override: number | string | null | undefined): { price: number | null; individual: boolean } {
  if (override != null && override !== "") return { price: Number(override), individual: true };
  return { price: null, individual: false };
}

export function filterParticipants<T extends { clients?: { name?: string | null; email?: string | null; phone?: string | null } | null }>(members: T[], q: string): T[] {
  const s = q.trim().toLowerCase();
  if (!s) return members;
  return members.filter((m) => [m.clients?.name, m.clients?.email, m.clients?.phone].some((v) => (v || "").toLowerCase().includes(s)));
}

/** Returns parsed price or null when invalid (negative / not a number). Empty → invalid. */
export function parsePriceInput(v: string): number | null {
  const n = Number(v.replace(",", ".").trim());
  if (!v.trim() || !Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}
