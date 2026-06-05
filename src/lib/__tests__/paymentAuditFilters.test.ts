import { describe, it, expect } from "vitest";
import {
  filterAuditRows,
  matchesQuickFilter,
  type AuditRow,
} from "../paymentAuditFilters";

const mk = (over: Partial<AuditRow>): AuditRow => ({
  id: over.id || Math.random().toString(36).slice(2),
  kind: over.kind || "income",
  date: over.date || "2026-06-01",
  client_id: over.client_id ?? "c1",
  client_name: over.client_name || "Molly Weasley",
  amount: over.amount ?? 100,
  method: over.method ?? "cash",
  invoice: over.invoice ?? null,
  allocStatus: over.allocStatus || "linked",
  allocated: over.allocated ?? 100,
  remaining: over.remaining ?? 0,
  paymentStatus: over.paymentStatus || "confirmed",
  source: over.source || "manual",
  allocs: over.allocs || [{ allocated_amount: 100 }],
  raw: over.raw,
  ...over,
});

const baseOpts = {
  clientId: "all",
  quickFilter: "all" as const,
  search: "",
  dateFrom: "",
  dateTo: "",
};

const rows: AuditRow[] = [
  mk({ id: "r-confirmed", paymentStatus: "confirmed", allocStatus: "linked", date: "2026-06-01" }),
  mk({ id: "r-expected", kind: "expected", paymentStatus: "expected", allocStatus: "not_linked", date: "2026-06-02", client_id: "c2", client_name: "Harry Potter" }),
  mk({ id: "r-prepay", paymentStatus: "confirmed", allocStatus: "prepayment", allocs: [], remaining: 50, date: "2026-06-03" }),
  mk({ id: "r-unlinked", paymentStatus: "confirmed", allocStatus: "not_linked", allocs: [], date: "2026-06-04" }),
  mk({ id: "r-partial", paymentStatus: "confirmed", allocStatus: "partial", remaining: 20, date: "2026-06-05" }),
  mk({ id: "r-cancelled", paymentStatus: "cancelled", allocStatus: "linked", date: "2026-06-06" }),
  mk({ id: "r-draft", paymentStatus: "draft", allocStatus: "linked", date: "2026-06-07" }),
  mk({ id: "r-outside-before", paymentStatus: "confirmed", allocStatus: "linked", date: "2026-05-30" }),
  mk({ id: "r-outside-after", paymentStatus: "confirmed", allocStatus: "linked", date: "2026-07-01" }),
];

const ids = (rs: AuditRow[]) => rs.map(r => r.id).sort();

describe("Payment Audit summary-card filters", () => {
  it("Confirmed payments card filters to paymentStatus=confirmed", () => {
    const r = filterAuditRows(rows, { ...baseOpts, quickFilter: "confirmed" });
    expect(r.every(x => x.paymentStatus === "confirmed")).toBe(true);
    expect(r.find(x => x.id === "r-cancelled")).toBeUndefined();
  });

  it("Expected card filters to paymentStatus=expected", () => {
    const r = filterAuditRows(rows, { ...baseOpts, quickFilter: "expected" });
    expect(ids(r)).toEqual(["r-expected"]);
  });

  it("Prepaid balance card filters to prepayment/overpayment allocations", () => {
    const r = filterAuditRows(rows, { ...baseOpts, quickFilter: "prepayment" });
    expect(ids(r)).toEqual(["r-prepay"]);
  });

  it("Unlinked card filters to not_linked allocations", () => {
    const r = filterAuditRows(rows, { ...baseOpts, quickFilter: "not_linked" });
    expect(r.find(x => x.id === "r-unlinked")).toBeDefined();
    expect(r.find(x => x.id === "r-expected")).toBeDefined();
    expect(r.find(x => x.allocStatus === "linked")).toBeUndefined();
  });

  it("Partially linked card filters to allocStatus=partial", () => {
    const r = filterAuditRows(rows, { ...baseOpts, quickFilter: "partial" });
    expect(ids(r)).toEqual(["r-partial"]);
  });

  it("Cancelled card filters to paymentStatus=cancelled", () => {
    const r = filterAuditRows(rows, { ...baseOpts, quickFilter: "cancelled" });
    expect(ids(r)).toEqual(["r-cancelled"]);
  });
});

describe("Payment Audit date range filtering (inclusive)", () => {
  it("Date from only — excludes records before, includes the boundary day", () => {
    const r = filterAuditRows(rows, { ...baseOpts, dateFrom: "2026-06-01" });
    expect(r.find(x => x.id === "r-outside-before")).toBeUndefined();
    expect(r.find(x => x.id === "r-confirmed")).toBeDefined();
  });

  it("Date to only — excludes records after, includes the boundary day", () => {
    const r = filterAuditRows(rows, { ...baseOpts, dateTo: "2026-06-07" });
    expect(r.find(x => x.id === "r-outside-after")).toBeUndefined();
    expect(r.find(x => x.id === "r-draft")).toBeDefined();
  });

  it("Date from + Date to — strictly inside [from, to] both inclusive", () => {
    const r = filterAuditRows(rows, {
      ...baseOpts,
      dateFrom: "2026-06-01",
      dateTo: "2026-06-04",
    });
    expect(ids(r)).toEqual(["r-confirmed", "r-expected", "r-prepay", "r-unlinked"]);
  });

  it("Date to includes the full selected day", () => {
    const r = filterAuditRows(rows, { ...baseOpts, dateFrom: "2026-06-04", dateTo: "2026-06-04" });
    expect(ids(r)).toEqual(["r-unlinked"]);
  });
});

describe("Payment Audit combined filters", () => {
  it("Date range + status filter", () => {
    const r = filterAuditRows(rows, {
      ...baseOpts,
      quickFilter: "confirmed",
      dateFrom: "2026-06-01",
      dateTo: "2026-06-04",
    });
    expect(ids(r)).toEqual(["r-confirmed", "r-prepay", "r-unlinked"]);
  });

  it("Date range + client filter", () => {
    const r = filterAuditRows(rows, {
      ...baseOpts,
      clientId: "c2",
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
    });
    expect(ids(r)).toEqual(["r-expected"]);
  });

  it("Date range + search", () => {
    const r = filterAuditRows(rows, {
      ...baseOpts,
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
      search: "Harry",
    });
    expect(ids(r)).toEqual(["r-expected"]);
  });
});

describe("matchesQuickFilter (unit)", () => {
  it("all passes everything", () => {
    expect(rows.every(r => matchesQuickFilter(r, "all"))).toBe(true);
  });
  it("linked only matches allocStatus=linked", () => {
    const r = rows.filter(x => matchesQuickFilter(x, "linked"));
    expect(r.every(x => x.allocStatus === "linked")).toBe(true);
  });
  it("draft only matches paymentStatus=draft", () => {
    const r = rows.filter(x => matchesQuickFilter(x, "draft"));
    expect(ids(r)).toEqual(["r-draft"]);
  });
});
