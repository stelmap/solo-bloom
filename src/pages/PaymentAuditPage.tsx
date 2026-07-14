import { AppLayout } from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientPicker } from "@/components/ClientPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Download, Search, ExternalLink, Pencil, Trash2, CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDateLocale } from "@/lib/dateLocale";
import { IncomeConfirmationDialog } from "@/components/IncomeConfirmationDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useDeleteIncomeConfirmation } from "@/hooks/useData";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClients } from "@/hooks/useData";
import { usePaymentMethods, localizedMethodName } from "@/hooks/usePaymentMethods";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { downloadCSV } from "@/lib/csvExport";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { filterAuditRows } from "@/lib/paymentAuditFilters";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type AllocStatus = "linked" | "not_linked" | "partial" | "prepayment" | "overpayment";
type QuickFilter = "all" | AllocStatus | "confirmed" | "expected" | "draft" | "cancelled";

function useAuditData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["payment-audit", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [incRes, allocRes, invRes, expRes] = await Promise.all([
        supabase.from("income").select("*, clients(id,name), appointments(id,scheduled_at,client_id,clients(id,name),services(name))").order("date", { ascending: false }),
        supabase.from("income_session_allocations").select("*"),
        supabase.from("invoices").select("id,invoice_number,appointment_id,client_id"),
        supabase.from("expected_payments").select("*, clients(id,name), appointments(id,scheduled_at,status,payment_status,services(name))").eq("status", "pending"),
      ]);
      if (incRes.error) throw incRes.error;
      if (allocRes.error) throw allocRes.error;
      const allocs = (allocRes.data || []) as any[];
      const invoices = (invRes.data || []) as any[];

      // Fetch appointment metadata for allocations (no FK embed available)
      const aptIds = Array.from(new Set(allocs.map(a => a.appointment_id).filter(Boolean)));
      const aptById = new Map<string, any>();
      if (aptIds.length > 0) {
        const { data: apts } = await supabase
          .from("appointments")
          .select("id,scheduled_at,price,services(name)")
          .in("id", aptIds);
        (apts || []).forEach((a: any) => aptById.set(a.id, a));
      }
      allocs.forEach(a => { a.appointments = aptById.get(a.appointment_id) || null; });

      const allocByIncome = new Map<string, any[]>();
      allocs.forEach(a => {
        const arr = allocByIncome.get(a.income_id) || [];
        arr.push(a); allocByIncome.set(a.income_id, arr);
      });
      const invByApt = new Map<string, any>();
      const invById: any[] = invoices;
      invoices.forEach(i => { if (i.appointment_id) invByApt.set(i.appointment_id, i); });
      return {
        income: (incRes.data || []) as any[],
        expected: (expRes.data || []) as any[],
        allocByIncome,
        invByApt,
        invById,
      };
    },
  });
}

function statusOf(amount: number, allocs: any[]): { status: AllocStatus; allocated: number; remaining: number } {
  const allocated = allocs.reduce((s, a) => s + Number(a.allocated_amount || 0), 0);
  const remaining = Number(amount) - allocated;
  if (allocs.length === 0) return { status: "prepayment", allocated: 0, remaining: amount };
  if (Math.abs(remaining) < 0.01) return { status: "linked", allocated, remaining: 0 };
  if (remaining > 0) return { status: "partial", allocated, remaining };
  return { status: "overpayment", allocated, remaining };
}

const allocBadgeVariant = (s: AllocStatus): { cls: string; key: string } => {
  switch (s) {
    case "linked": return { cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", key: "audit.status.linked" };
    case "partial": return { cls: "bg-amber-500/15 text-amber-700 border-amber-500/30", key: "audit.status.partial" };
    case "prepayment": return { cls: "bg-blue-500/15 text-blue-700 border-blue-500/30", key: "audit.status.prepayment" };
    case "overpayment": return { cls: "bg-purple-500/15 text-purple-700 border-purple-500/30", key: "audit.status.overpayment" };
    default: return { cls: "bg-muted text-muted-foreground border-border", key: "audit.status.notLinked" };
  }
};

export default function PaymentAuditPage() {
  const { t } = useLanguage();
  const dateLocale = useDateLocale();
  const { symbol: cs } = useCurrency();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: clients = [] } = useClients();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const methodLabel = (code: string) => {
    const m = paymentMethods.find(pm => pm.code === code);
    if (m) return localizedMethodName(m, t);
    return code.replace(/_/g, " ");
  };
  const { data, isLoading } = useAuditData();

  const [clientId, setClientId] = useState<string>(searchParams.get("client") || "all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sortBy, setSortBy] = useState<string>("date_desc");
  const [search, setSearch] = useState("");
  const [openRow, setOpenRow] = useState<any>(null);
  const [editIncome, setEditIncome] = useState<any | null>(null);
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const deleteIncomeMut = useDeleteIncomeConfirmation();
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [txType, setTxType] = useState<"all" | "payment" | "prepayment" | "prepayment_withdrawal" | "refund" | "adjustment">("all");

  useEffect(() => {
    const urlClient = searchParams.get("client") || "all";
    if (urlClient !== clientId) setClientId(urlClient);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const urlClient = searchParams.get("client") || "all";
    if (clientId !== "all" && clientId !== urlClient) {
      setSearchParams({ client: clientId }, { replace: true });
    } else if (clientId === "all" && searchParams.has("client")) {
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const rows = useMemo(() => {
    if (!data) return [];
    const incomeRows = data.income.map(inc => {
      const isPrepayWithdrawal = inc.source === "prepayment_withdrawal";
      let allocs = data.allocByIncome.get(inc.id) || [];
      // Synthesize a virtual allocation when income is directly attached to an appointment
      // but has no rows in income_session_allocations (legacy / single-session payments).
      if (allocs.length === 0 && inc.appointment_id && !isPrepayWithdrawal) {
        allocs = [{
          id: `virtual-${inc.id}`,
          income_id: inc.id,
          appointment_id: inc.appointment_id,
          allocated_amount: Number(inc.amount),
          appointments: inc.appointments || null,
        }];
      }
      // For prepayment-withdrawal audit rows, synthesize a virtual link to the covered
      // session so the "Linked" column shows the session even though the ledger amount is €0.
      if (isPrepayWithdrawal && inc.appointment_id) {
        const movement = Number(inc.balance_before || 0) - Number(inc.balance_after || 0);
        allocs = [{
          id: `withdrawal-${inc.id}`,
          income_id: inc.id,
          appointment_id: inc.appointment_id,
          allocated_amount: movement,
          from_prepayment: true,
          appointments: inc.appointments || null,
        }];
      }
      const st = isPrepayWithdrawal
        ? { status: "linked" as AllocStatus, allocated: 0, remaining: 0 }
        : statusOf(Number(inc.amount), allocs);
      const inv = inc.appointment_id ? data.invByApt.get(inc.appointment_id) : null;
      const prepayMovement = isPrepayWithdrawal
        ? Number(inc.balance_before || 0) - Number(inc.balance_after || 0)
        : 0;
      return {
        kind: "income" as const,
        id: inc.id,
        date: inc.date,
        client_id: inc.client_id || inc.clients?.id || inc.appointments?.clients?.id,
        client_name: inc.clients?.name || inc.appointments?.clients?.name || "—",
        amount: Number(inc.amount),
        method: inc.payment_method || "not_specified",
        invoice: inv,
        allocStatus: st.status,
        allocated: st.allocated,
        remaining: st.remaining,
        paymentStatus: inc.status || "confirmed",
        source: inc.source || "manual",
        allocs,
        prepayMovement,
        isPrepayWithdrawal,
        raw: inc,
      };
    });
    const UNPAID_STATES = new Set([
      "unpaid",
      "waiting_for_payment",
      "partially_paid",
      "partially_paid_from_prepayment",
    ]);
    const expectedRows = (data.expected || [])
      // Only count expected payments tied to a completed session that is
      // still actually unpaid. Stale rows (appointment already paid /
      // cancelled / future) must not appear in the audit, otherwise they
      // would diverge from the Income page "Pending payments" list which
      // is derived from the appointments table.
      .filter((ep: any) =>
        ep.appointments?.status === "completed" &&
        UNPAID_STATES.has(ep.appointments?.payment_status),
      )
      .map(ep => ({
        kind: "expected" as const,
        id: ep.id,
        date: ep.created_at?.split("T")[0] || "",
        client_id: ep.client_id || ep.clients?.id,
        client_name: ep.clients?.name || "—",
        amount: Number(ep.amount),
        method: ep.payment_method || "not_specified",
        invoice: null as any,
        allocStatus: "not_linked" as AllocStatus,
        allocated: 0,
        remaining: Number(ep.amount),
        paymentStatus: "expected",
        source: "session",
        allocs: [] as any[],
        raw: ep,
      }));
    return [...incomeRows, ...expectedRows];
  }, [data]);

  const filtered = useMemo(() => {
    const r = filterAuditRows(rows as any, {
      clientId,
      quickFilter,
      search,
      dateFrom,
      dateTo,
      txType,
    }) as typeof rows;
    const sorted = [...r];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "date_asc": return (a.date || "").localeCompare(b.date || "");
        case "amount_desc": return b.amount - a.amount;
        case "amount_asc": return a.amount - b.amount;
        case "client_asc": return a.client_name.localeCompare(b.client_name);
        case "client_desc": return b.client_name.localeCompare(a.client_name);
        default: return (b.date || "").localeCompare(a.date || "");
      }
    });
    return sorted;
  }, [rows, clientId, quickFilter, sortBy, search, dateFrom, dateTo, txType]);

  useEffect(() => { setPage(1); }, [clientId, quickFilter, sortBy, search, pageSize, dateFrom, dateTo, txType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  const summary = useMemo(() => {
    let scope = clientId === "all" ? rows : rows.filter(r => r.client_id === clientId);
    if (dateFrom) scope = scope.filter(r => (r.date || "") >= dateFrom);
    if (dateTo) scope = scope.filter(r => (r.date || "") <= dateTo);
    const confirmed = scope.filter(r => r.paymentStatus === "confirmed").reduce((s, r) => s + r.amount, 0);
    const expected = scope.filter(r => r.paymentStatus === "expected").reduce((s, r) => s + r.amount, 0);
    const prepaid = scope.filter(r => r.allocStatus === "prepayment").reduce((s, r) => s + r.remaining, 0)
      + scope.filter(r => r.allocStatus === "partial").reduce((s, r) => s + r.remaining, 0);
    const unlinked = scope.filter(r => r.allocStatus === "not_linked" || r.allocStatus === "prepayment").length;
    const partial = scope.filter(r => r.allocStatus === "partial").length;
    const cancelled = scope.filter(r => r.paymentStatus === "cancelled").length;
    return { confirmed, expected, prepaid, unlinked, partial, cancelled };
  }, [rows, clientId, dateFrom, dateTo]);

  const buildCsv = (records: any[], filename: string) => {
    const headers = [
      t("csv.header.date"), t("csv.header.client"), t("csv.header.amount"), t("csv.header.currency"),
      t("csv.header.paymentMethod"), t("csv.header.invoice"), t("csv.header.allocation"), t("csv.header.status"),
      t("csv.header.source"), t("csv.header.linkedSessions"), t("csv.header.linkedDates"),
      t("csv.header.prepaidImpact"), t("csv.header.comment"), t("csv.header.created"), t("csv.header.updated"),
    ];
    const body = records.map(r => [
      r.date, r.client_name, String(r.amount), cs, r.method,
      r.invoice?.invoice_number || "", r.allocStatus, r.paymentStatus, r.source,
      String(r.allocs.length),
      r.allocs.map((a: any) => a.appointments?.scheduled_at?.split("T")[0]).filter(Boolean).join("; "),
      String(r.allocStatus === "prepayment" ? r.remaining : r.allocStatus === "partial" ? r.remaining : 0),
      r.raw?.description || r.raw?.comment || "",
      r.raw?.created_at || "", r.raw?.updated_at || "",
    ]);
    downloadCSV(filename, headers, body);
  };

  const handleExport = () => buildCsv(filtered, `payment-audit-${format(new Date(), "yyyy-MM-dd")}.csv`);

  const handleExportMonthly = () => {
    const monthStr = format(new Date(), "yyyy-MM");
    const recs = filtered.filter(r => (r.date || "").startsWith(monthStr));
    buildCsv(recs, `payment-audit-${monthStr}.csv`);
  };

  const handleExportClient = () => {
    if (clientId === "all") return;
    const recs = rows.filter(r => r.client_id === clientId);
    const cName = (clients.find((c: any) => c.id === clientId) as any)?.name || "client";
    buildCsv(recs, `payment-register-${cName}-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

    const quickFilters: { key: QuickFilter; label: string }[] = [
      { key: "all", label: t("audit.f.all") },
      { key: "linked", label: t("audit.f.linked") },
      { key: "draft", label: t("audit.f.draft") },
    ];

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{t("audit.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("audit.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {clientId !== "all" && (
              <Button onClick={() => setCreateOpen(true)} size="sm" className="h-9">{t("incomeConfirm.title")}</Button>
            )}
            <Button onClick={handleExport} variant="outline" size="sm" className="h-9 gap-2"><Download className="h-4 w-4" />{t("audit.export")}</Button>
            <Button onClick={handleExportMonthly} variant="outline" size="sm" className="h-9 gap-2"><Download className="h-4 w-4" />{t("audit.exportMonthly")}</Button>
            <Button onClick={handleExportClient} variant="outline" size="sm" disabled={clientId === "all"} className="h-9 gap-2"><Download className="h-4 w-4" />{t("audit.exportClient")}</Button>
          </div>
        </div>

        {/* Summary cards — clickable filters */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {([
            { key: "confirmed", label: t("audit.sum.confirmed"), value: `${cs}${summary.confirmed.toFixed(2)}` },
            { key: "expected", label: t("audit.sum.expected"), value: `${cs}${summary.expected.toFixed(2)}` },
            { key: "prepayment", label: t("audit.sum.prepaid"), value: `${cs}${summary.prepaid.toFixed(2)}` },
            { key: "not_linked", label: t("audit.sum.unlinked"), value: String(summary.unlinked) },
            { key: "partial", label: t("audit.sum.partial"), value: String(summary.partial) },
            { key: "cancelled", label: t("audit.sum.cancelled"), value: String(summary.cancelled) },
          ] as { key: QuickFilter; label: string; value: string }[]).map(c => (
            <SumCard
              key={c.key}
              label={c.label}
              value={c.value}
              active={quickFilter === c.key}
              onClick={() => setQuickFilter(quickFilter === c.key ? "all" : c.key)}
            />
          ))}
        </div>

        {/* Additional filter chips (not duplicated by cards) */}
        <div className="flex items-center gap-2 overflow-x-auto sm:flex-wrap pb-1 -mx-1 px-1">
          {quickFilters.map(f => (
            <button key={f.key}
              type="button"
              onClick={() => setQuickFilter(f.key)}
              data-testid={`audit-chip-${f.key}`}
              className={cn(
                "inline-flex items-center h-8 px-3 rounded-full text-xs font-medium border transition-colors whitespace-nowrap shrink-0",
                quickFilter === f.key ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"
              )}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-end gap-2">
          <ClientPicker
            clients={clients}
            value={clientId}
            onChange={setClientId}
            allOption={{ value: "all", label: t("audit.allClients") }}
            triggerClassName="h-9 w-[220px]"
          />
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              className="h-9 pl-8 w-full"
              placeholder={t("audit.searchPlaceholder")}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <DateFilterPopover
            label={t("audit.dateFrom")}
            value={dateFrom}
            onChange={setDateFrom}
            locale={dateLocale}
          />
          <DateFilterPopover
            label={t("audit.dateTo")}
            value={dateTo}
            onChange={setDateTo}
            locale={dateLocale}
          />
          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1"
              onClick={() => { setDateFrom(""); setDateTo(""); }}
            >
              <X className="h-3.5 w-3.5" />
              {t("audit.clearDates")}
            </Button>
          )}
          <Select value={txType} onValueChange={(v) => setTxType(v as any)}>
            <SelectTrigger className="h-9 w-[200px]" data-testid="audit-tx-type">
              <SelectValue placeholder={t("audit.txType.all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("audit.txType.all")}</SelectItem>
              <SelectItem value="payment">{t("audit.txType.payment")}</SelectItem>
              <SelectItem value="prepayment">{t("audit.txType.prepayment")}</SelectItem>
              <SelectItem value="prepayment_withdrawal">{t("audit.txType.withdrawal")}</SelectItem>
              <SelectItem value="refund">{t("audit.txType.refund")}</SelectItem>
              <SelectItem value="adjustment">{t("audit.txType.adjustment")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">{t("audit.sort.dateDesc")}</SelectItem>
              <SelectItem value="date_asc">{t("audit.sort.dateAsc")}</SelectItem>
              <SelectItem value="amount_desc">{t("audit.sort.amountDesc")}</SelectItem>
              <SelectItem value="amount_asc">{t("audit.sort.amountAsc")}</SelectItem>
              <SelectItem value="client_asc">{t("audit.sort.clientAsc")}</SelectItem>
              <SelectItem value="client_desc">{t("audit.sort.clientDesc")}</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-auto inline-flex items-center h-9 px-2 text-xs text-muted-foreground tabular-nums">
            {filtered.length} {t("audit.records")}
          </span>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="h-11 hover:bg-transparent">
                <TableHead className="h-11 py-0">{t("audit.col.date")}</TableHead>
                <TableHead className="h-11 py-0">{t("audit.col.client")}</TableHead>
                <TableHead className="h-11 py-0 text-right">{t("audit.col.amount")}</TableHead>
                <TableHead className="h-11 py-0">{t("audit.col.method")}</TableHead>
                <TableHead className="h-11 py-0">{t("audit.col.invoice")}</TableHead>
                <TableHead className="h-11 py-0">{t("audit.col.allocation")}</TableHead>
                <TableHead className="h-11 py-0">{t("audit.col.status")}</TableHead>
                <TableHead className="h-11 py-0">{t("audit.col.source")}</TableHead>
                <TableHead className="h-11 py-0">{t("audit.col.linked")}</TableHead>
                <TableHead className="h-11 py-0 text-right">{t("audit.col.prepaid")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={`sk-${i}`} className="h-12">
                    <TableCell colSpan={10}><Skeleton className="h-4 w-full" /></TableCell>
                  </TableRow>
                ))

              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">{t("audit.empty")}</TableCell></TableRow>
              ) : paged.map(r => {
                const ab = allocBadgeVariant(r.allocStatus);
                return (
                  <TableRow key={`${r.kind}-${r.id}`} onClick={() => setOpenRow(r)} className="cursor-pointer h-12">
                    <TableCell className="py-2 align-middle whitespace-nowrap text-sm">{r.date}</TableCell>
                    <TableCell className="py-2 align-middle">
                      <button
                        onClick={(e) => { e.stopPropagation(); if (r.client_id) navigate(`/clients/${r.client_id}`); }}
                        className="text-primary hover:underline text-sm font-medium text-left"
                      >{r.client_name}</button>
                    </TableCell>
                    <TableCell className="py-2 align-middle text-right font-medium tabular-nums">
                      {(r as any).isPrepayWithdrawal
                        ? <span className="text-amber-700">−{cs}{Number((r as any).prepayMovement || 0).toFixed(2)}</span>
                        : `${cs}${r.amount.toFixed(2)}`}
                    </TableCell>
                    <TableCell className="py-2 align-middle text-sm">{methodLabel(r.method)}</TableCell>
                    <TableCell className="py-2 align-middle text-sm">{r.invoice?.invoice_number || <span className="text-muted-foreground">{t("audit.notGenerated")}</span>}</TableCell>
                    <TableCell className="py-2 align-middle"><Badge variant="outline" className={cn("inline-flex items-center border", ab.cls)}>{t(ab.key as any)}</Badge></TableCell>
                    <TableCell className="py-2 align-middle"><Badge variant="outline" className="inline-flex items-center capitalize">{t(`audit.pstatus.${r.paymentStatus}` as any) || r.paymentStatus}</Badge></TableCell>
                    <TableCell className="py-2 align-middle"><span className="text-xs text-muted-foreground capitalize">{t(`audit.src.${r.source}` as any) || r.source}</span></TableCell>
                    <TableCell className="py-2 align-middle text-sm" onClick={(e) => e.stopPropagation()}>
                      <LinkedSessionsCell
                        allocs={r.allocs}
                        allocStatus={r.allocStatus}
                        remaining={r.remaining}
                        currencySymbol={cs}
                        t={t}
                        onOpenAppointment={(id) => navigate(`/calendar?appointment=${id}`)}
                      />
                    </TableCell>
                    <TableCell className="py-2 align-middle text-right text-sm tabular-nums">
                      {(r as any).isPrepayWithdrawal
                        ? <span className="text-amber-700">−{cs}{Number((r as any).prepayMovement || 0).toFixed(2)}</span>
                        : r.allocStatus === "prepayment" ? `+${cs}${r.remaining.toFixed(2)}` :
                          r.allocStatus === "partial" ? `${cs}${r.remaining.toFixed(2)}` : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-t bg-muted/20">
            <div className="text-xs text-muted-foreground">
              {filtered.length === 0
                ? t("audit.empty")
                : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} ${t("audit.of")} ${filtered.length}`}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("audit.rowsPerPage")}</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100, 200].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(1)}>«</Button>
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>‹</Button>
              <span className="text-xs tabular-nums px-2">{currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>›</Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}>»</Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Details */}
      <Sheet open={!!openRow} onOpenChange={(o) => !o && setOpenRow(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{t("audit.details")}</SheetTitle></SheetHeader>
          {openRow && (
            <div className="mt-4 space-y-4 text-sm">
              <Row label={t("audit.col.date")} value={openRow.date} />
              <Row label={t("audit.col.client")} value={openRow.client_name} />
              <Row label={t("audit.col.amount")} value={(openRow as any).isPrepayWithdrawal ? `−${cs}${Number((openRow as any).prepayMovement || 0).toFixed(2)}` : `${cs}${openRow.amount.toFixed(2)}`} />
              {(openRow as any).isPrepayWithdrawal && (
                <>
                  <Row label={t("audit.prepayMovement")} value={`−${cs}${Number((openRow as any).prepayMovement || 0).toFixed(2)}`} />
                  <Row label={t("audit.balanceBefore")} value={`${cs}${Number(openRow.raw?.balance_before || 0).toFixed(2)}`} />
                  <Row label={t("audit.balanceAfter")} value={`${cs}${Number(openRow.raw?.balance_after || 0).toFixed(2)}`} />
                </>
              )}
              <Row label={t("audit.col.method")} value={openRow.method} />
              <Row label={t("audit.col.invoice")} value={openRow.invoice?.invoice_number || t("audit.notGenerated")} />
              <Row label={t("audit.col.status")} value={openRow.paymentStatus} />
              <Row label={t("audit.col.source")} value={t(`audit.src.${openRow.source}` as any) || openRow.source} />
              <Row label={t("audit.col.allocation")} value={t(allocBadgeVariant(openRow.allocStatus).key as any)} />
              {openRow.raw?.description && <Row label={t("audit.comment")} value={openRow.raw.description} />}
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">{t("audit.linkedSessions")}</div>
                {openRow.allocs.length === 0 ? (
                  <div className="text-muted-foreground text-xs">{t("audit.linked.none")}</div>
                ) : (
                  <ul className="space-y-2">
                    {openRow.allocs.map((a: any) => (
                      <li key={a.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                        <div>
                          <div className="text-sm font-medium">{a.appointments?.services?.name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{a.appointments?.scheduled_at?.split("T")[0]}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm tabular-nums">{cs}{Number(a.allocated_amount).toFixed(2)}</div>
                          {a.appointment_id && (
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => navigate(`/calendar?appointment=${a.appointment_id}`)}>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {openRow.client_id && (
                  <Button size="sm" variant="outline" onClick={() => navigate(`/clients/${openRow.client_id}`)}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />{t("audit.openClient")}
                  </Button>
                )}
                {openRow.kind === "income" && openRow.client_id && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditClientId(openRow.client_id);
                      setEditIncome(openRow.raw);
                      setOpenRow(null);
                    }}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />{t("common.edit")}
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setDeleteId(openRow.id); }}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />{t("common.delete")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create new payment for selected client */}
      {clientId !== "all" && (
        <IncomeConfirmationDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          clientId={clientId}
          clientName={(clients.find((c: any) => c.id === clientId) as any)?.name}
        />
      )}

      {/* Edit existing income confirmation */}
      {editIncome && editClientId && (
        <IncomeConfirmationDialog
          open={!!editIncome}
          onOpenChange={(o) => { if (!o) { setEditIncome(null); setEditClientId(null); } }}
          clientId={editClientId}
          clientName={(clients.find((c: any) => c.id === editClientId) as any)?.name}
          existingIncome={editIncome}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        loading={deleteIncomeMut.isPending}
        description={t("audit.deleteWarning")}
        onConfirm={async () => {
          if (!deleteId) return;
          try {
            await deleteIncomeMut.mutateAsync(deleteId);
            toast({ title: t("audit.deleteSuccess") });
            setDeleteId(null);
            setOpenRow(null);
          } catch (e: any) {
            toast({ title: t("common.error"), description: e?.message, variant: "destructive" });
          }
        }}
      />
    </AppLayout>
  );
}

function SumCard({ label, value, active, onClick }: { label: string; value: string; active?: boolean; onClick?: () => void }) {
  return (
    <Card
      onClick={onClick}
      data-active={active ? "true" : "false"}
      className={cn(
        "p-3 h-full flex flex-col justify-between min-h-[76px] transition-colors",
        onClick && "cursor-pointer hover:bg-muted/40",
        active && "border-primary ring-1 ring-primary bg-primary/5"
      )}
    >
      <div className="text-xs text-muted-foreground line-clamp-2">{label}</div>
      <div className="text-lg font-semibold mt-1 tabular-nums">{value}</div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm font-medium text-right capitalize">{value}</span>
    </div>
  );
}

function LinkedSessionsCell({
  allocs, allocStatus, remaining, currencySymbol, t, onOpenAppointment,
}: {
  allocs: any[];
  allocStatus: string;
  remaining: number;
  currencySymbol: string;
  t: (k: any) => string;
  onOpenAppointment: (id: string) => void;
}) {
  if (allocs.length === 0) {
    if (allocStatus === "prepayment") {
      return (
        <span className="text-xs text-muted-foreground">
          {t("audit.linked.prepay")}: {currencySymbol}{remaining.toFixed(2)}
        </span>
      );
    }
    return <span className="text-muted-foreground">—</span>;
  }

  const items = allocs
    .map((a: any) => {
      const raw = a.appointments?.scheduled_at;
      if (!raw) return null;
      const d = new Date(raw);
      return {
        id: a.appointment_id as string | null,
        date: d,
        dateLabel: format(d, "MMM d, yyyy"),
        serviceName: a.appointments?.services?.name as string | undefined,
      };
    })
    .filter(Boolean) as { id: string | null; date: Date; dateLabel: string; serviceName?: string }[];

  if (items.length === 0) return <span className="text-muted-foreground">—</span>;

  const handleClick = (id: string | null) => {
    if (id) onOpenAppointment(id);
  };

  if (items.length <= 2) {
    return (
      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
        {items.map((it, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(it.id)}
            className={cn(
              "text-sm tabular-nums",
              it.id ? "text-primary hover:underline" : "text-foreground"
            )}
            title={it.serviceName || undefined}
          >
            {it.dateLabel}
            {i < items.length - 1 ? ";" : ""}
          </button>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="text-sm text-primary hover:underline">
            {items.length} {t("audit.sessionsCount") || "sessions"}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <ul className="space-y-1 text-xs">
            {items.map((it, i) => (
              <li key={i} className="tabular-nums">
                {it.dateLabel}
                {it.serviceName ? ` — ${it.serviceName}` : ""}
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function DateFilterPopover({
  label,
  value,
  onChange,
  locale,
}: {
  label: string;
  value: string;                       // ISO yyyy-MM-dd or ""
  onChange: (next: string) => void;
  locale: import("date-fns").Locale;
}) {
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;
  const display = selected ? format(selected, "P", { locale }) : label;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 w-[170px] justify-start text-left font-normal gap-2",
            !selected && "text-muted-foreground"
          )}
          aria-label={label}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{display}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")}
          locale={locale}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
