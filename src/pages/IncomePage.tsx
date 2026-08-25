import { AppLayout } from "@/components/AppLayout";
import { ListSkeleton } from "@/components/ListSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-time-picker";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, DollarSign, CheckCircle, Download, ArrowLeft } from "lucide-react";
import { downloadCSV } from "@/lib/csvExport";
import { Badge } from "@/components/ui/badge";
import { useIncome, useIncomeSum, useCreateIncome, useDeleteIncome, useExpectedPayments, useMarkExpectedPaymentPaid, useClients } from "@/hooks/useData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { IncomeConfirmationDialog } from "@/components/IncomeConfirmationDialog";
import { ClientCombobox } from "@/components/income/ClientCombobox";
import { INCOME_FLOW_COPY, INCOME_PAGE_COPY, normIncomeLang } from "@/lib/incomeFlowCopy";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useSearchParams, useNavigate } from "react-router-dom";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";

export default function IncomePage() {
  useEffect(() => { import("@/lib/analytics").then(({ track }) => track("income_page_opened")); }, []);
  const [page, setPage] = useState(0);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filters
  const initialRange = searchParams.get("range") || "month";
  const initialTab = searchParams.get("tab") === "pending" ? "pending" : "income";
  const fromDashboard = searchParams.has("range") || searchParams.has("tab");
  const [dateRange, setDateRange] = useState(initialRange);
  const [activeTab, setActiveTab] = useState(initialTab);

  const { dateFrom, dateTo, intervalStart, intervalEnd } = useMemo(() => {
    const now = new Date();
    if (dateRange === "today") {
      const d = format(now, "yyyy-MM-dd");
      return { dateFrom: d, dateTo: d, intervalStart: startOfDay(now), intervalEnd: endOfDay(now) };
    }
    if (dateRange === "week") {
      const s = startOfWeek(now, { weekStartsOn: 1 });
      const e = endOfWeek(now, { weekStartsOn: 1 });
      return { dateFrom: format(s, "yyyy-MM-dd"), dateTo: format(e, "yyyy-MM-dd"), intervalStart: startOfDay(s), intervalEnd: endOfDay(e) };
    }
    if (dateRange === "month") {
      const s = startOfMonth(now);
      const e = endOfMonth(now);
      return { dateFrom: format(s, "yyyy-MM-dd"), dateTo: format(e, "yyyy-MM-dd"), intervalStart: startOfDay(s), intervalEnd: endOfDay(e) };
    }
    if (dateRange === "quarter") {
      const s = startOfQuarter(now);
      const e = endOfQuarter(now);
      return { dateFrom: format(s, "yyyy-MM-dd"), dateTo: format(e, "yyyy-MM-dd"), intervalStart: startOfDay(s), intervalEnd: endOfDay(e) };
    }
    return { dateFrom: undefined as string | undefined, dateTo: undefined as string | undefined, intervalStart: undefined as Date | undefined, intervalEnd: undefined as Date | undefined };
  }, [dateRange]);

  // Reset to first page when filter changes
  useEffect(() => { setPage(0); }, [dateFrom, dateTo]);

  const { data: incomeResult, isLoading } = useIncome(page, dateFrom, dateTo);
  const income = incomeResult?.data ?? [];
  const totalCount = incomeResult?.totalCount ?? 0;
  const pageSize = incomeResult?.pageSize ?? 50;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const { data: periodTotal = 0 } = useIncomeSum(dateFrom, dateTo);
  const { data: expectedPayments = [], isLoading: epLoading } = useExpectedPayments();
  const { data: clients = [] } = useClients();
  const createIncome = useCreateIncome();
  const deleteIncome = useDeleteIncome();
  const markPaid = useMarkExpectedPaymentPaid();
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const IL = INCOME_FLOW_COPY[normIncomeLang(lang)];
  const IP = INCOME_PAGE_COPY[normIncomeLang(lang)];
  const { symbol: cs } = useCurrency();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState<any>(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [form, setForm] = useState({ amount: 0, date: new Date().toISOString().split("T")[0], description: "", payment_method: "cash", client_id: "" });
  const [linkedOpen, setLinkedOpen] = useState(false);
  const [linkedPrefill, setLinkedPrefill] = useState<{ clientId: string; clientName?: string; amount: number; date: string; payment_method: string; comment?: string } | null>(null);

  const filtered = income; // server-side filtered
  const total = periodTotal;
  // Expected payments are filtered by the related session's scheduled_at so the
  // selected period applies consistently to both Confirmed Income and Expected
  // Payments. "All time" shows everything.
  const filteredExpected = useMemo(() => {
    const list = expectedPayments as any[];
    if (!intervalStart || !intervalEnd) return list;
    return list.filter((ep) => {
      const raw = ep.appointments?.scheduled_at;
      if (!raw) return false;
      const d = typeof raw === "string" ? parseISO(raw) : new Date(raw);
      return isWithinInterval(d, { start: intervalStart, end: intervalEnd });
    });
  }, [expectedPayments, intervalStart, intervalEnd]);
  const pendingTotal = filteredExpected.reduce((s: number, ep: any) => s + Number(ep.amount), 0);



  const handleCreate = async () => {
    if (!form.amount) {
      toast({ title: t("common.error"), description: t("common.amount") + " *", variant: "destructive" });
      return;
    }
    if (!form.client_id) {
      toast({ title: t("income.clientRequired"), variant: "destructive" });
      return;
    }
    const client = (clients as any[]).find((c) => c.id === form.client_id);
    setLinkedPrefill({
      clientId: form.client_id,
      clientName: client?.name,
      amount: form.amount,
      date: form.date,
      payment_method: form.payment_method,
      comment: form.description || undefined,
    });
    setOpen(false);
    setLinkedOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteIncome.mutateAsync(deleteId);
      toast({ title: t("toast.incomeDeleted") });
      setDeleteId(null);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleMarkPaid = async () => {
    if (!payDialog) return;
    try {
      await markPaid.mutateAsync({
        id: payDialog.id,
        appointmentId: payDialog.appointment_id ?? null,
        amount: Number(payDialog.amount),
        paymentMethod: payMethod,
        paymentDate: payDate,
        kind: payDialog.kind ?? "individual",
        groupSessionPaymentId: payDialog.group_session_payment_id ?? null,
      });

      setPayDialog(null);
      toast({ title: t("toast.paymentReceived"), description: t("toast.paymentRecordedDesc", { symbol: cs, amount: Number(payDialog.amount).toFixed(2) }) });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {fromDashboard && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="self-start -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("common.backToDashboard")}
          </Button>
        )}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{IP.title}</h1>
            <p className="text-muted-foreground mt-1">{IP.subtitle}</p>
          </div>
          <div className="flex flex-col items-stretch sm:items-end gap-2">
            <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              downloadCSV("income.csv",
                [t("csv.header.date"), t("csv.header.amount"), t("csv.header.source"), t("csv.header.description")],
                filtered.map((i: any) => [i.date, String(i.amount), i.source || "", i.description || ""])
              );
            }}><Download className="h-4 w-4 mr-1" /> {IP.export}</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> {IP.addIncome}</Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>{t("income.addIncome")}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("income.paidBy")} *</Label>
                  <ClientCombobox
                    clients={clients as any[]}
                    value={form.client_id}
                    onChange={(id) => setForm((f) => ({ ...f, client_id: id }))}
                    placeholder={IL.selectOrSearch}
                    searchPlaceholder={IL.searchClients}
                    emptyLabel={IL.noClients}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("common.amount")} ({cs}) *</Label>
                  <Input type="number" step="0.01" min="0" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("common.date")} *</Label>
                  <DatePicker date={form.date} onDateChange={(d) => setForm(f => ({ ...f, date: d }))} />
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={!form.client_id || !(form.amount > 0) || !form.date}>
                  {IL.continue}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
            </div>
            <p className="text-sm text-muted-foreground sm:text-right">{IP.addIncomeHint}</p>
          </div>
        </div>

        {/* Summary cards double as the tab switcher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 rounded-xl border border-border bg-card overflow-hidden animate-fade-in">
          <button
            type="button"
            onClick={() => setActiveTab("income")}
            className={cn(
              "flex items-center gap-4 p-5 text-left transition-colors border-b-2",
              activeTab === "income" ? "bg-primary/5 border-primary" : "border-transparent hover:bg-muted/40",
            )}
          >
            <span className={cn("h-12 w-12 rounded-full grid place-items-center shrink-0", activeTab === "income" ? "bg-primary/10" : "bg-muted")}>
              <Wallet className={cn("h-5 w-5", activeTab === "income" ? "text-primary" : "text-muted-foreground")} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{IP.confirmedIncome}</span>
              <span className={cn("block text-2xl font-bold mt-0.5", activeTab === "income" ? "text-primary" : "text-foreground")}>
                {cs}{total.toLocaleString()}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={cn(
              "flex items-center gap-4 p-5 text-left transition-colors border-b-2 sm:border-l border-border",
              activeTab === "pending" ? "bg-primary/5 border-b-primary" : "border-b-transparent hover:bg-muted/40",
            )}
          >
            <span className={cn("h-12 w-12 rounded-full grid place-items-center shrink-0", activeTab === "pending" ? "bg-primary/10" : "bg-muted")}>
              <CalendarClock className={cn("h-5 w-5", activeTab === "pending" ? "text-primary" : "text-muted-foreground")} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">{IP.expectedPayments}</span>
              <span className={cn("block text-2xl font-bold mt-0.5", activeTab === "pending" ? "text-primary" : "text-foreground")}>
                {cs}{pendingTotal.toLocaleString()}
              </span>
            </span>
            {filteredExpected.length > 0 && (
              <span className="ml-auto shrink-0 h-8 min-w-8 px-2 rounded-full bg-primary/10 text-primary text-sm font-medium grid place-items-center">
                {filteredExpected.length}
              </span>
            )}
          </button>
        </div>

        {/* Filter bar */}
        <div className="rounded-xl border border-border bg-card p-3 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={IP.searchClient} className="pl-9" />
          </div>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="lg:w-56">
              <div className="flex items-center gap-2 truncate">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{IP.allClients}</SelectItem>
              {(clients as any[]).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortKey} onValueChange={setSortKey}>
            <SelectTrigger className="lg:w-56">
              <div className="flex items-center gap-2 truncate">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">{`${IL.sort}: ${IP.sortClientName}`}</SelectItem>
              <SelectItem value="newest">{`${IL.sort}: ${IP.sortDateNewest}`}</SelectItem>
              <SelectItem value="oldest">{`${IL.sort}: ${IP.sortDateOldest}`}</SelectItem>
              <SelectItem value="amount">{`${IL.sort}: ${IP.sortAmount}`}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date range filter */}
        <div className="flex gap-2 overflow-x-auto sm:flex-wrap -mx-1 px-1 pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {(["today", "week", "month", "quarter", "all"] as const).map(range => {
            const key = range === "all" ? "allTime" : range === "month" ? "thisMonth" : range === "week" ? "thisWeek" : range === "quarter" ? "thisQuarter" : "today";
            return (
              <Button key={range} variant={dateRange === range ? "secondary" : "ghost"} size="sm"
                className="shrink-0"
                onClick={() => setDateRange(range)}>
                {t(`filter.${key}` as any)}
              </Button>
            );
          })}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">


          <TabsContent value="income">
            {isLoading ? (
              <ListSkeleton variant="table" count={8} />

            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t("income.noIncome")}</p>
            ) : (
              <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.date")}</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.description")}</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.amount")}</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.source")}</th>
                        <th className="p-4 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((entry: any) => (
                        <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group">
                          <td className="p-4 text-sm text-muted-foreground">{entry.date}</td>
                          <td className="p-4 text-sm font-medium text-foreground">
                            {entry.source === "appointment"
                              ? `${entry.appointments?.clients?.name} — ${entry.appointments?.services?.name}`
                              : entry.description || t("income.manualEntry")}
                          </td>
                          <td className="p-4 text-sm font-semibold text-foreground">{cs}{Number(entry.amount).toFixed(2)}</td>
                          <td className="p-4"><Badge variant={entry.source === "appointment" ? "default" : "secondary"} className="text-xs">{entry.source === "appointment" ? t("income.appointment") : t("income.manual")}</Badge></td>
                          <td className="p-4">
                            {entry.source !== "appointment" && (
                              <button onClick={() => setDeleteId(entry.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">{page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} / {totalCount}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending">
            {epLoading ? (
              <ListSkeleton variant="table" count={6} />
            ) : filteredExpected.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t("income.noPending")}</p>
            ) : (
              <div className="bg-card rounded-xl border border-warning/30 overflow-hidden animate-fade-in">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-warning/5">
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.date")}</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("calendar.client")}</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.description")}</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.amount")}</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.status")}</th>
                        <th className="p-4 w-32"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpected.map((ep: any) => (
                        <tr key={ep.id} className="border-b border-border last:border-0 hover:bg-warning/5 transition-colors">
                          <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                            {ep.appointments?.scheduled_at ? new Date(ep.appointments.scheduled_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="p-4 text-sm font-medium text-foreground">{ep.clients?.name || "—"}</td>
                          <td className="p-4 text-sm text-muted-foreground">{ep.appointments?.services?.name || "—"}</td>
                          <td className="p-4 text-sm font-semibold text-warning whitespace-nowrap">{cs}{Number(ep.amount).toFixed(2)}</td>
                          <td className="p-4">
                            <Badge className="bg-warning/15 text-warning border-warning/30 text-xs">{t("income.pending") || "Очікує"}</Badge>
                          </td>
                          <td className="p-4 text-right">
                            <Button size="sm" onClick={() => { setPayDialog(ep); setPayMethod("cash"); setPayDate(new Date().toISOString().split("T")[0]); }}>
                              <CheckCircle className="h-4 w-4 mr-1" /> {t("income.markPaid")}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

        </Tabs>
      </div>

      {/* Mark as paid dialog */}
      <Dialog open={!!payDialog} onOpenChange={(o) => { if (!o) setPayDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("income.confirmPayment")}</DialogTitle></DialogHeader>
          {payDialog && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("calendar.client")}</span><span className="font-medium text-foreground">{payDialog.clients?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("common.amount")}</span><span className="font-semibold text-foreground">{cs}{Number(payDialog.amount).toFixed(2)}</span></div>
              </div>
              <div className="space-y-2">
                <Label>{t("common.paymentDate")}</Label>
                <DatePicker date={payDate} onDateChange={setPayDate} />
              </div>
              <Button onClick={handleMarkPaid} className="w-full" disabled={markPaid.isPending}>
                {markPaid.isPending ? t("common.saving") : t("income.confirmPaymentReceived")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={handleDelete}
        title={t("income.deleteTitle")} description={t("income.deleteDesc")} loading={deleteIncome.isPending} />

      {linkedPrefill && (
        <IncomeConfirmationDialog
          open={linkedOpen}
          onOpenChange={(o) => {
            setLinkedOpen(o);
            if (!o) {
              setLinkedPrefill(null);
              setForm({ amount: 0, date: new Date().toISOString().split("T")[0], description: "", payment_method: "cash", client_id: "" });
            }
          }}
          clientId={linkedPrefill.clientId}
          clientName={linkedPrefill.clientName}
          prefill={{
            amount: linkedPrefill.amount,
            date: linkedPrefill.date,
            payment_method: linkedPrefill.payment_method,
            comment: linkedPrefill.comment,
          }}
          onBack={() => { setLinkedOpen(false); setOpen(true); }}
        />
      )}
    </AppLayout>
  );
}
