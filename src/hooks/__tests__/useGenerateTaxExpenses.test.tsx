/**
 * Regression tests for useGenerateTaxExpenses.
 *
 * Locks in the contract that auto-generated tax expense rows preserve the
 * user-edited `payment_status` and `paid_date` across:
 *   - repeat syncs with identical entries (no-op)
 *   - amount/description updates for the same period
 *   - schedule changes (new periods added, stale periods removed)
 *
 * Previously the hook deleted every row for the tax_setting_id and re-inserted
 * with payment_status="unpaid", silently resetting any "Paid" mark after page
 * refresh. These tests fail against that old behaviour.
 */
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";

// ── In-memory expenses table ────────────────────────────────────────────────
type Row = {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  is_recurring: boolean;
  tax_setting_id: string;
  payment_status: string;
  paid_date: string | null;
};

const db = vi.hoisted(() => ({
  rows: [] as Row[],
  nextId: 1,
}));

const TAX_ID = "tax-rule-1";

function makeFromExpenses() {
  return {
    select: (_cols: string) => ({
      eq: (_col: string, val: string) => {
        const data = db.rows.filter((r) => r.tax_setting_id === val);
        return Promise.resolve({ data, error: null });
      },
    }),
    delete: () => ({
      in: (_col: string, ids: string[]) => {
        db.rows = db.rows.filter((r) => !ids.includes(r.id));
        return Promise.resolve({ data: null, error: null });
      },
      eq: (_col: string, val: string) => {
        db.rows = db.rows.filter((r) => r.tax_setting_id !== val);
        return Promise.resolve({ data: null, error: null });
      },
    }),
    update: (patch: Partial<Row>) => ({
      eq: (_col: string, id: string) => {
        db.rows = db.rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
        return Promise.resolve({ data: null, error: null });
      },
    }),
    insert: (rows: any) => {
      const list = Array.isArray(rows) ? rows : [rows];
      for (const r of list) {
        db.rows.push({
          id: `row-${db.nextId++}`,
          payment_status: "unpaid",
          paid_date: null,
          ...r,
        } as Row);
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "expenses") return makeFromExpenses();
      throw new Error(`Unexpected table ${table}`);
    }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/useDemoWorkspace", () => ({
  useDemoMode: () => ({ isDemoMode: false }),
  useDemoWriteGuard: () => () => {},
  useFreeStarterMode: () => ({ isFreeStarter: false }),
  getDemoActionMessage: () => "",
  FREE_STARTER_CLIENT_LIMIT: 3,
}));

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

// Some unrelated default exports inside useData touch these — silence them.
vi.mock("@/lib/recurringExpenses", () => ({
  generateMonthlyOccurrences: () => [],
  generateYearlyOccurrences: () => [],
  isLastDayOfItsMonth: () => false,
}));

import { useGenerateTaxExpenses } from "@/hooks/useData";

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

async function runSync(entries: Array<{ date: string; amount: number; description: string }>) {
  const { result } = renderHook(() => useGenerateTaxExpenses(), { wrapper: wrapper() });
  await act(async () => {
    await result.current.mutateAsync({ taxSettingId: TAX_ID, entries });
  });
}

function byDate(date: string) {
  return db.rows.find((r) => r.date === date && r.tax_setting_id === TAX_ID);
}

beforeEach(() => {
  db.rows = [];
  db.nextId = 1;
});

describe("useGenerateTaxExpenses — paid status persistence", () => {
  const base = [
    { date: "2026-01-31", amount: 100, description: "Tax for 2026-01" },
    { date: "2026-02-28", amount: 100, description: "Tax for 2026-02" },
    { date: "2026-03-31", amount: 100, description: "Tax for 2026-03" },
  ];

  it("inserts rows as unpaid on first sync", async () => {
    await runSync(base);
    expect(db.rows).toHaveLength(3);
    for (const r of db.rows) {
      expect(r.payment_status).toBe("unpaid");
      expect(r.paid_date).toBeNull();
      expect(r.tax_setting_id).toBe(TAX_ID);
    }
  });

  it("preserves user-edited paid status across an identical re-sync (page refresh)", async () => {
    await runSync(base);

    // User marks the January row as paid.
    const jan = byDate("2026-01-31")!;
    jan.payment_status = "paid";
    jan.paid_date = "2026-02-05";
    const janIdBefore = jan.id;

    // Page refresh triggers the auto-sync with the exact same entries.
    await runSync(base);

    const janAfter = byDate("2026-01-31")!;
    expect(janAfter.id).toBe(janIdBefore); // not recreated
    expect(janAfter.payment_status).toBe("paid");
    expect(janAfter.paid_date).toBe("2026-02-05");
    expect(db.rows).toHaveLength(3);
  });

  it("preserves paid status when amount/description change for the same period", async () => {
    await runSync(base);
    const feb = byDate("2026-02-28")!;
    feb.payment_status = "paid";
    feb.paid_date = "2026-03-10";
    const febIdBefore = feb.id;

    // Income recalculated — same date, different amount + description.
    await runSync([
      { date: "2026-01-31", amount: 100, description: "Tax for 2026-01" },
      { date: "2026-02-28", amount: 145, description: "Tax for 2026-02 (updated)" },
      { date: "2026-03-31", amount: 100, description: "Tax for 2026-03" },
    ]);

    const febAfter = byDate("2026-02-28")!;
    expect(febAfter.id).toBe(febIdBefore);
    expect(febAfter.amount).toBe(145);
    expect(febAfter.description).toBe("Tax for 2026-02 (updated)");
    expect(febAfter.payment_status).toBe("paid");
    expect(febAfter.paid_date).toBe("2026-03-10");
  });

  it("removes stale periods but keeps paid status on surviving periods", async () => {
    await runSync(base);
    const jan = byDate("2026-01-31")!;
    jan.payment_status = "paid";
    jan.paid_date = "2026-02-05";

    // Schedule now drops March and adds April.
    await runSync([
      { date: "2026-01-31", amount: 100, description: "Tax for 2026-01" },
      { date: "2026-02-28", amount: 100, description: "Tax for 2026-02" },
      { date: "2026-04-30", amount: 110, description: "Tax for 2026-04" },
    ]);

    expect(db.rows).toHaveLength(3);
    expect(byDate("2026-03-31")).toBeUndefined();

    const janAfter = byDate("2026-01-31")!;
    expect(janAfter.payment_status).toBe("paid");
    expect(janAfter.paid_date).toBe("2026-02-05");

    const apr = byDate("2026-04-30")!;
    expect(apr.payment_status).toBe("unpaid");
    expect(apr.paid_date).toBeNull();
  });

  it("does not re-issue updates when nothing changed (idempotent sync)", async () => {
    await runSync(base);
    const idsBefore = db.rows.map((r) => r.id).sort();
    const updatedAtSnapshot = JSON.stringify(db.rows);

    await runSync(base);

    const idsAfter = db.rows.map((r) => r.id).sort();
    expect(idsAfter).toEqual(idsBefore); // no inserts, no deletes
    expect(JSON.stringify(db.rows)).toBe(updatedAtSnapshot); // no field churn
  });
});
