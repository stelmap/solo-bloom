import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Download, Search, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClients } from "@/hooks/useData";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { downloadCSV } from "@/lib/csvExport";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type AllocStatus = "linked" | "not_linked" | "partial" | "prepayment" | "overpayment";
type QuickFilter = "all" | AllocStatus | "confirmed" | "expected" | "draft" | "cancelled";

function useAuditData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["payment-audit", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [incRes, allocRes, invRes, expRes] = await Promise.all([
        supabase.from("income").select("*, clients(id,name), appointments(id,scheduled_at,services(name))").order("date", { ascending: false }),
        supabase.from("income_session_allocations").select("*, appointments(id,scheduled_at,price,services(name))"),
        supabase.from("invoices").select("id,invoice_number,appointment_id,client_id"),
        supabase.from("expected_payments").select("*, clients(id,name), appointments(id,scheduled_at,services(name))").eq("status", "pending"),
      ]);
      if (incRes.error) throw incRes.error;
      if (allocRes.error) throw allocRes.error;
      const allocs = (allocRes.data || []) as any[];
      const invoices = (invRes.data || []) as any[];
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
  const { symbol: cs } = useCurrency();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: clients = [] } = useClients();
  const { data, isLoading } = useAuditData();

  const [clientId, setClientId] = useState<string>(searchParams.get("client") || "all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sortBy, setSortBy] = useState<string>("date_desc");
  const [search, setSearch] = useState("");
  const [openRow, setOpenRow] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    if (clientId && clientId !== "all") setSearchParams({ client: clientId }, { replace: true });
    else if (searchParams.has("client")) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const rows = useMemo(() => {
    if (!data) return [];
    const incomeRows = data.income.map(inc => {
      const allocs = data.allocByIncome.get(inc.id) || [];
      const st = statusOf(Number(inc.amount), allocs);
      const inv = inc.appointment_id ? data.invByApt.get(inc.appointment_id) : null;
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
        raw: inc,
      };
    });
    const expectedRows = (data.expected || []).map(ep => ({
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
    let r = rows;
    if (clientId !== "all") r = r.filter(x => x.client_id === clientId);
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
    switch (quickFilter) {
      case "linked": r = r.filter(x => x.allocStatus === "linked"); break;
      case "not_linked": r = r.filter(x => x.allocStatus === "not_linked" || (x.kind === "income" && x.allocs.length === 0 && x.allocStatus !== "prepayment")); break;
      case "partial": r = r.filter(x => x.allocStatus === "partial"); break;
      case "prepayment": r = r.filter(x => x.allocStatus === "prepayment" || x.allocStatus === "overpayment"); break;
      case "confirmed": r = r.filter(x => x.paymentStatus === "confirmed"); break;
      case "expected": r = r.filter(x => x.paymentStatus === "expected"); break;
      case "draft": r = r.filter(x => x.paymentStatus === "draft"); break;
      case "cancelled": r = r.filter(x => x.paymentStatus === "cancelled"); break;
    }
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
  }, [rows, clientId, quickFilter, sortBy, search]);

  const summary = useMemo(() => {
    const scope = clientId === "all" ? rows : rows.filter(r => r.client_id === clientId);
    const confirmed = scope.filter(r => r.paymentStatus === "confirmed").reduce((s, r) => s + r.amount, 0);
    const expected = scope.filter(r => r.paymentStatus === "expected").reduce((s, r) => s + r.amount, 0);
    const prepaid = scope.filter(r => r.allocStatus === "prepayment").reduce((s, r) => s + r.remaining, 0)
      + scope.filter(r => r.allocStatus === "partial").reduce((s, r) => s + r.remaining, 0);
    const unlinked = scope.filter(r => r.allocStatus === "not_linked" || r.allocStatus === "prepayment").length;
    const partial = scope.filter(r => r.allocStatus === "partial").length;
    const cancelled = scope.filter(r => r.paymentStatus === "cancelled").length;
    return { confirmed, expected, prepaid, unlinked, partial, cancelled };
  }, [rows, clientId]);

  const handleExport = () => {
    const headers = ["Date","Client","Amount","Currency","Method","Invoice","Allocation","Status","Source","Linked sessions","Linked dates","Prepaid impact","Comment","Created"];
    const body = filtered.map(r => [
      r.date,
      r.client_name,
      String(r.amount),
      cs,
      r.method,
      r.invoice?.invoice_number || "",
      r.allocStatus,
      r.paymentStatus,
      r.source,
      String(r.allocs.length),
      r.allocs.map((a: any) => a.appointments?.scheduled_at?.split("T")[0]).filter(Boolean).join("; "),
      String(r.allocStatus === "prepayment" ? r.remaining : r.allocStatus === "partial" ? r.remaining : 0),
      r.raw?.description || r.raw?.comment || "",
      r.raw?.created_at || "",
    ]);
    downloadCSV(`payment-audit-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, body);
  };

  const quickFilters: { key: QuickFilter; label: string }[] = [
    { key: "all", label: t("audit.f.all") },
    { key: "linked", label: t("audit.f.linked") },
    { key: "not_linked", label: t("audit.f.notLinked") },
    { key: "partial", label: t("audit.f.partial") },
    { key: "prepayment", label: t("audit.f.prepayment") },
    { key: "confirmed", label: t("audit.f.confirmed") },
    { key: "expected", label: t("audit.f.expected") },
    { key: "draft", label: t("audit.f.draft") },
    { key: "cancelled", label: t("audit.f.cancelled") },
  ];

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-[1600px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t("audit.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("audit.subtitle")}</p>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2"><Download className="h-4 w-4" />{t("audit.export")}</Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <SumCard label={t("audit.sum.confirmed")} value={`${cs}${summary.confirmed.toFixed(2)}`} />
          <SumCard label={t("audit.sum.expected")} value={`${cs}${summary.expected.toFixed(2)}`} />
          <SumCard label={t("audit.sum.prepaid")} value={`${cs}${summary.prepaid.toFixed(2)}`} />
          <SumCard label={t("audit.sum.unlinked")} value={String(summary.unlinked)} />
          <SumCard label={t("audit.sum.partial")} value={String(summary.partial)} />
          <SumCard label={t("audit.sum.cancelled")} value={String(summary.cancelled)} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {quickFilters.map(f => (
            <button key={f.key}
              onClick={() => setQuickFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                quickFilter === f.key ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"
              )}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("audit.allClients")}</SelectItem>
              {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 w-[220px]" placeholder={t("audit.searchClient")} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">{t("audit.sort.dateDesc")}</SelectItem>
              <SelectItem value="date_asc">{t("audit.sort.dateAsc")}</SelectItem>
              <SelectItem value="amount_desc">{t("audit.sort.amountDesc")}</SelectItem>
              <SelectItem value="amount_asc">{t("audit.sort.amountAsc")}</SelectItem>
              <SelectItem value="client_asc">{t("audit.sort.clientAsc")}</SelectItem>
              <SelectItem value="client_desc">{t("audit.sort.clientDesc")}</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} {t("audit.records")}</span>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("audit.col.date")}</TableHead>
                <TableHead>{t("audit.col.client")}</TableHead>
                <TableHead className="text-right">{t("audit.col.amount")}</TableHead>
                <TableHead>{t("audit.col.method")}</TableHead>
                <TableHead>{t("audit.col.invoice")}</TableHead>
                <TableHead>{t("audit.col.allocation")}</TableHead>
                <TableHead>{t("audit.col.status")}</TableHead>
                <TableHead>{t("audit.col.source")}</TableHead>
                <TableHead>{t("audit.col.linked")}</TableHead>
                <TableHead className="text-right">{t("audit.col.prepaid")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">{t("common.loading") || "Loading…"}</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">{t("audit.empty")}</TableCell></TableRow>
              ) : filtered.map(r => {
                const ab = allocBadgeVariant(r.allocStatus);
                return (
                  <TableRow key={`${r.kind}-${r.id}`} onClick={() => setOpenRow(r)} className="cursor-pointer">
                    <TableCell className="whitespace-nowrap text-sm">{r.date}</TableCell>
                    <TableCell>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (r.client_id) navigate(`/clients/${r.client_id}`); }}
                        className="text-primary hover:underline text-sm font-medium"
                      >{r.client_name}</button>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{cs}{r.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-sm capitalize">{r.method.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-sm">{r.invoice?.invoice_number || <span className="text-muted-foreground">{t("audit.notGenerated")}</span>}</TableCell>
                    <TableCell><Badge variant="outline" className={cn("border", ab.cls)}>{t(ab.key as any)}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{t(`audit.pstatus.${r.paymentStatus}` as any) || r.paymentStatus}</Badge></TableCell>
                    <TableCell><span className="text-xs text-muted-foreground capitalize">{t(`audit.src.${r.source}` as any) || r.source}</span></TableCell>
                    <TableCell className="text-sm">
                      {r.allocs.length === 0
                        ? (r.allocStatus === "prepayment" ? `${t("audit.linked.prepay")}: ${cs}${r.remaining.toFixed(2)}` : t("audit.linked.none"))
                        : `${t("audit.linked.to")} ${r.allocs.length}`}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {r.allocStatus === "prepayment" ? `+${cs}${r.remaining.toFixed(2)}` :
                       r.allocStatus === "partial" ? `${cs}${r.remaining.toFixed(2)}` : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
              <Row label={t("audit.col.amount")} value={`${cs}${openRow.amount.toFixed(2)}`} />
              <Row label={t("audit.col.method")} value={openRow.method} />
              <Row label={t("audit.col.invoice")} value={openRow.invoice?.invoice_number || t("audit.notGenerated")} />
              <Row label={t("audit.col.status")} value={openRow.paymentStatus} />
              <Row label={t("audit.col.source")} value={openRow.source} />
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
                        <div className="text-sm tabular-nums">{cs}{Number(a.allocated_amount).toFixed(2)}</div>
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
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

function SumCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-0.5 tabular-nums">{value}</div>
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
