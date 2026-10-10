import { describe, it, expect } from "vitest";
import { computeSourceMetrics, periodRange, UNSPECIFIED } from "@/lib/clientSources";

const all = { from: null, to: null };
const fb = { id: "fb", name: "Facebook", source_type: "paid_ads", description: null, is_active: true };

describe("client source metrics", () => {
  const clients = [1, 2, 3, 4, 5].map((n) => ({ id: `c${n}`, created_at: "2026-10-02", source_id: "fb" }));
  const expenses = [
    { amount: 300, date: "2026-10-05", source_id: "fb", campaign_id: null },
    { amount: 80, date: "2026-10-05", source_id: "fb", campaign_id: null },
    { amount: 120, date: "2026-10-05", source_id: "fb", campaign_id: null },
  ];
  const income = [{ amount: 1900, date: "2026-10-10", client_id: "c1", status: "confirmed", source: "appointment" }];

  it("CAC = source expenses / new clients (€500 / 5 = €100)", () => {
    const m = computeSourceMetrics([fb], clients, expenses, income, all)[0];
    expect(m.expenses).toBe(500);
    expect(m.cac).toBe(100);
  });

  it("revenue / cost = revenue divided by acquisition cost (1900/500 = 3.8x)", () => {
    expect(computeSourceMetrics([fb], clients, expenses, income, all)[0].roi).toBe(3.8);
  });

  it("prepayment withdrawals are not counted as revenue twice", () => {
    const m = computeSourceMetrics([fb], clients, expenses, [...income, { amount: 100, date: "2026-10-11", client_id: "c1", status: "confirmed", source: "prepayment_withdrawal" }], all)[0];
    expect(m.revenue).toBe(1900);
  });

  it("clients without a source fall into the 'unspecified' bucket", () => {
    const rows = computeSourceMetrics([fb], [{ id: "x", created_at: "2026-10-01", source_id: null }], [], [], all);
    expect(rows.find((r) => r.key === UNSPECIFIED)?.totalClients).toBe(1);
  });

  it("last month range covers the whole previous month", () => {
    expect(periodRange("last_month", new Date(2026, 9, 10))).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });
});
