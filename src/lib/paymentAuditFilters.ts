/**
 * Pure filtering utilities for the Payment Audit page.
 * Extracted so quick-filter behavior (including the clickable summary cards)
 * and date-range boundaries can be unit-tested without rendering the page.
 */
export type AuditAllocStatus =
  | "linked"
  | "not_linked"
  | "partial"
  | "prepayment"
  | "overpayment";

export type AuditQuickFilter =
  | "all"
  | AuditAllocStatus
  | "confirmed"
  | "expected"
  | "draft"
  | "cancelled";

export type AuditTxType =
  | "all"
  | "payment"
  | "prepayment"
  | "prepayment_withdrawal"
  | "refund"
  | "adjustment";

export interface AuditRow {
  id: string;
  kind: "income" | "expected";
  /** ISO yyyy-MM-dd (no time component) — the Payment Audit "Date" column. */
  date: string;
  client_id?: string | null;
  client_name: string;
  amount: number;
  method?: string | null;
  invoice?: { invoice_number?: string | null } | null;
  allocStatus: AuditAllocStatus;
  allocated: number;
  remaining: number;
  paymentStatus: string;
  source: string;
  allocs: { allocated_amount?: number | string }[];
  raw?: any;
}

export interface AuditFilterOptions {
  clientId: string; // "all" or client UUID
  quickFilter: AuditQuickFilter;
  search: string;
  /** yyyy-MM-dd, inclusive. */
  dateFrom: string;
  /** yyyy-MM-dd, inclusive. */
  dateTo: string;
  /** Optional filter on transaction type. */
  txType?: AuditTxType;
}

/** Classify a row into a coarse transaction type shown in the Payment Audit filter. */
export function classifyTxType(row: AuditRow): AuditTxType {
  const s = (row.source || "").toLowerCase();
  if (s === "prepayment_withdrawal") return "prepayment_withdrawal";
  if (s === "refund") return "refund";
  if (s === "adjustment") return "adjustment";
  if (row.allocStatus === "prepayment" || row.allocStatus === "overpayment") return "prepayment";
  return "payment";
}


/** Apply the quick-filter chip / summary-card filter to a single row. */
export function matchesQuickFilter(row: AuditRow, qf: AuditQuickFilter): boolean {
  switch (qf) {
    case "all":
      return true;
    case "linked":
      return row.allocStatus === "linked";
    case "not_linked":
      return (
        row.allocStatus === "not_linked" ||
        (row.kind === "income" && row.allocs.length === 0 && row.allocStatus !== "prepayment")
      );
    case "partial":
      return row.allocStatus === "partial";
    case "prepayment":
      return row.allocStatus === "prepayment" || row.allocStatus === "overpayment";
    case "confirmed":
      return row.paymentStatus === "confirmed";
    case "expected":
      return row.paymentStatus === "expected";
    case "draft":
      return row.paymentStatus === "draft";
    case "cancelled":
      return row.paymentStatus === "cancelled";
    default:
      return true;
  }
}

/**
 * Filter rows by all currently active filters.
 * Date bounds are interpreted on the payment-audit "Date" column (yyyy-MM-dd)
 * and are inclusive on both ends.
 */
export function filterAuditRows(rows: AuditRow[], opts: AuditFilterOptions): AuditRow[] {
  const { clientId, quickFilter, search, dateFrom, dateTo, txType } = opts;
  let r = rows;
  if (clientId !== "all") r = r.filter(x => x.client_id === clientId);
  if (dateFrom) r = r.filter(x => (x.date || "") >= dateFrom);
  if (dateTo) r = r.filter(x => (x.date || "") <= dateTo);
  if (search.trim()) {
    const q = search.toLowerCase();
    r = r.filter(x =>
      x.client_name.toLowerCase().includes(q) ||
      (x.invoice?.invoice_number || "").toLowerCase().includes(q) ||
      (x.method || "").toLowerCase().includes(q) ||
      String(x.amount).includes(q) ||
      (x.raw?.description || "").toLowerCase().includes(q) ||
      (x.raw?.comment || "").toLowerCase().includes(q) ||
      (x.date || "").includes(q)
    );
  }
  r = r.filter(x => matchesQuickFilter(x, quickFilter));
  if (txType && txType !== "all") {
    r = r.filter(x => classifyTxType(x) === txType);
  }
  return r;
}
