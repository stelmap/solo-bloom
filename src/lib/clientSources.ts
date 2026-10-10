/** Client acquisition sources — pure metrics (no I/O). */

export const SOURCE_TYPES = [
  "referral", "social", "paid_ads", "organic_search", "website", "event", "partnership", "directory", "other",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export type PeriodKey = "this_month" | "last_month" | "last_3m" | "last_6m" | "this_year" | "all" | "custom";

export interface ClientSource { id: string; name: string; source_type: string; description: string | null; is_active: boolean }
export interface Campaign { id: string; source_id: string; name: string; start_date: string | null; end_date: string | null; status: string; notes: string | null }
export interface SourceClient { id: string; name?: string; created_at: string; source_id: string | null; campaign_id?: string | null; referred_by_client_id?: string | null; referred_by_name?: string | null }
export interface SourceExpense { amount: number; date: string; source_id: string | null; campaign_id: string | null; instance_status?: string | null }
export interface SourceIncome { amount: number; date: string; client_id: string | null; status?: string | null; source?: string | null }

export interface Range { from: string | null; to: string | null }

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Inclusive YYYY-MM-DD range for a period preset. */
export function periodRange(key: PeriodKey, now = new Date(), custom?: Range): Range {
  const y = now.getFullYear(), m = now.getMonth();
  switch (key) {
    case "this_month": return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
    case "last_month": return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case "last_3m": return { from: iso(new Date(y, m - 2, 1)), to: iso(new Date(y, m + 1, 0)) };
    case "last_6m": return { from: iso(new Date(y, m - 5, 1)), to: iso(new Date(y, m + 1, 0)) };
    case "this_year": return { from: iso(new Date(y, 0, 1)), to: iso(new Date(y, 11, 31)) };
    case "custom": return { from: custom?.from || null, to: custom?.to || null };
    default: return { from: null, to: null };
  }
}

const inRange = (date: string, r: Range) => {
  const d = date.slice(0, 10);
  return (!r.from || d >= r.from) && (!r.to || d <= r.to);
};

/** Money actually received (prepayment withdrawals would double count). */
export const isRevenueIncome = (i: SourceIncome) =>
  (i.status ?? "confirmed") === "confirmed" && i.source !== "prepayment_withdrawal";

export interface SourceMetrics {
  key: string; // source id, or "__none__"
  totalClients: number;
  newClients: number;
  expenses: number;
  revenue: number;
  /** null when there are no new clients but there are costs. */
  cac: number | null;
  /** null when there are no costs. */
  roi: number | null;
}

export const UNSPECIFIED = "__none__";

function metric(key: string, clients: SourceClient[], expenses: SourceExpense[], income: SourceIncome[], r: Range): SourceMetrics {
  const ids = new Set(clients.map((c) => c.id));
  const newClients = clients.filter((c) => inRange(c.created_at, r)).length;
  const exp = expenses
    .filter((e) => e.instance_status !== "cancelled" && inRange(e.date, r))
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const revenue = income
    .filter((i) => i.client_id && ids.has(i.client_id) && isRevenueIncome(i) && inRange(i.date, r))
    .reduce((s, i) => s + Number(i.amount || 0), 0);
  return {
    key,
    totalClients: clients.length,
    newClients,
    expenses: round(exp),
    revenue: round(revenue),
    cac: newClients > 0 ? round(exp / newClients) : exp > 0 ? null : 0,
    roi: exp > 0 ? Math.round((revenue / exp) * 10) / 10 : null,
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Metrics per source (plus an "unspecified" bucket for clients without one). */
export function computeSourceMetrics(
  sources: ClientSource[], clients: SourceClient[], expenses: SourceExpense[], income: SourceIncome[], r: Range,
): SourceMetrics[] {
  const rows = sources.map((s) =>
    metric(s.id, clients.filter((c) => c.source_id === s.id), expenses.filter((e) => e.source_id === s.id), income, r),
  );
  rows.push(metric(UNSPECIFIED, clients.filter((c) => !c.source_id), [], income, r));
  return rows;
}

/** Metrics per campaign of one source. Expenses tied to a campaign count for it. */
export function computeCampaignMetrics(
  campaigns: Campaign[], clients: SourceClient[], expenses: SourceExpense[], income: SourceIncome[], r: Range,
): SourceMetrics[] {
  return campaigns.map((c) =>
    metric(c.id, clients.filter((x) => x.campaign_id === c.id), expenses.filter((e) => e.campaign_id === c.id), income, r),
  );
}

export type Efficiency = "high" | "medium" | "low" | "none";
export function efficiency(m: SourceMetrics): Efficiency {
  if (m.revenue === 0 && m.expenses === 0) return "none";
  if (m.expenses === 0) return m.revenue > 0 ? "high" : "none";
  const roi = m.roi ?? 0;
  return roi >= 5 ? "high" : roi >= 2 ? "medium" : "low";
}

/** Referrer display name → number of referred clients. */
export function referralCounts(clients: SourceClient[]): Array<{ name: string; count: number }> {
  const byId = new Map(clients.map((c) => [c.id, c.name ?? ""]));
  const map = new Map<string, number>();
  for (const c of clients) {
    const n = c.referred_by_client_id ? byId.get(c.referred_by_client_id) : c.referred_by_name?.trim();
    if (n) map.set(n, (map.get(n) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}
