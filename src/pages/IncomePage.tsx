import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, DollarSign, CheckCircle, Download } from "lucide-react";
import { downloadCSV } from "@/lib/csvExport";
import { Badge } from "@/components/ui/badge";
import { useIncome, useCreateIncome, useDeleteIncome, useExpectedPayments, useMarkExpectedPaymentPaid } from "@/hooks/useData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useSearchParams } from "react-router-dom";
import { startOfWeek, startOfMonth, format } from "date-fns";

export default function IncomePage() {
  const [page, setPage] = useState(0);
  const { data: incomeResult, isLoading } = useIncome(page);
  const income = incomeResult?.data ?? [];
  const totalCount = incomeResult?.totalCount ?? 0;
  const pageSize = incomeResult?.pageSize ?? 50;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const { data: expectedPayments = [], isLoading: epLoading } = useExpectedPayments();
  const createIncome = useCreateIncome();
  const deleteIncome = useDeleteIncome();
  const markPaid = useMarkExpectedPaymentPaid();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { symbol: cs } = useCurrency();
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState<any>(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [form, setForm] = useState({ amount: 0, date: new Date().toISOString().split("T")[0], description: "", payment_method: "cash" });

  // Filters
  const initialRange = searchParams.get("range") || "month";
  const [dateRange, setDateRange] = useState(initialRange);

  const filtered = useMemo(() => {
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    let from = "";
    if (dateRange === "today") from = todayStr;
    else if (dateRange === "week") from = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    else if (dateRange === "month") from = format(startOfMonth(now), "yyyy-MM-dd");
    else return income; // all
    return income.filter((i: any) => i.date >= from);
  }, [income, dateRange]);

  const total = filtered.reduce((s: number, i: any) => s + Number(i.amount), 0);
  const pendingTotal = (expectedPayments as any[]).reduce((s: number, ep: any) => s + Number(ep.amount), 0);

  const PAYMENT_METHODS = [
    { value: "cash", label: t("method.cashLabel") },
    { value: "card", label: t("method.cardLabel") },
    { value: "bank_transfer", label: t("method.bankTransferLabel") },
  ];

  const paymentLabel = (method: string) => PAYMENT_METHODS.find(m => m.value === method)?.label || method;

  const handleCreate = async () => {
    if (!form.amount) return;
    try {
      await createIncome.mutateAsync({ ...form, source: "manual" });
      setForm({ amount: 0, date: new Date().toISOString().split("T")[0], description: "", payment_method: "cash" });
      setOpen(false);
      toast({ title: t("toast.incomeAdded") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
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
        id: payDialog.id, appointmentId: payDialog.appointment_id,
        amount: Number(payDialog.amount), paymentMethod: payMethod,
      });
      setPayDialog(null);
      toast({ title: t("toast.paymentReceived"), description: t("toast.paymentRecordedDesc", { amount: Number(payDialog.amount).toFixed(2) }) });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("income.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("income.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              downloadCSV("income.csv",
                ["Date", "Amount", "Source", "Payment Method", "Description"],
                filtered.map((i: any) => [i.date, String(i.amount), i.source || "", i.payment_method || "", i.description || ""])
              );
            }}><Download className="h-4 w-4 mr-1" /> {t("export.csv")}</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> {t("income.addManual")}</Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("income.addIncome")}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>{t("common.amount")} *</Label><Input type="number" step="0.01" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><Label>{t("common.date")}</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("common.description")}</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div className="space-y-2">
                  <Label>{t("calendar.paymentMethod")}</Label>
                  <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={createIncome.isPending}>{createIncome.isPending ? t("common.adding") : t("income.addIncome")}</Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Date range filter */}
        <div className="flex gap-2 flex-wrap">
          {(["today", "week", "month", "all"] as const).map(range => (
            <Button key={range} variant={dateRange === range ? "default" : "outline"} size="sm"
              onClick={() => setDateRange(range)}>
              {t(`filter.${range === "all" ? "allTime" : range === "month" ? "thisMonth" : range === "week" ? "thisWeek" : "today"}` as any)}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
            <p className="text-sm text-muted-foreground">{t("income.confirmedIncome")}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{cs}{total.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-xl border border-warning/30 p-5 animate-fade-in">
            <p className="text-sm text-warning">{t("income.pendingPayments")}</p>
            <p className="text-2xl font-bold text-warning mt-1">{cs}{pendingTotal.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("income.awaitingPayment", { count: (expectedPayments as any[]).length })}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
            <p className="text-sm text-muted-foreground">{t("finance.expectedIncome")}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{cs}{(total + pendingTotal).toLocaleString()}</p>
          </div>
        </div>

        <Tabs defaultValue="income" className="space-y-4">
          <TabsList>
            <TabsTrigger value="income">{t("income.confirmedIncome")}</TabsTrigger>
            <TabsTrigger value="pending">
              {t("income.expectedPayments")}
              {(expectedPayments as any[]).length > 0 && (
                <Badge className="ml-2 bg-warning/20 text-warning text-xs">{(expectedPayments as any[]).length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="income">
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">{t("common.loading")}</p>
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
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.payment")}</th>
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
                          <td className="p-4"><Badge variant="outline" className="text-xs capitalize">{paymentLabel(entry.payment_method || "cash")}</Badge></td>
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
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending">
            {epLoading ? (
              <p className="text-muted-foreground text-center py-8">{t("common.loading")}</p>
            ) : (expectedPayments as any[]).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t("income.noPending")}</p>
            ) : (
              <div className="space-y-3">
                {(expectedPayments as any[]).map((ep: any) => (
                  <div key={ep.id} className="bg-card rounded-xl border border-warning/20 p-4 flex items-center gap-4 animate-fade-in">
                    <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{ep.clients?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ep.appointments?.services?.name} · {ep.appointments?.scheduled_at ? new Date(ep.appointments.scheduled_at).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-warning">{cs}{Number(ep.amount).toFixed(2)}</p>
                    <Button size="sm" onClick={() => { setPayDialog(ep); setPayMethod("cash"); }}>
                      <CheckCircle className="h-4 w-4 mr-1" /> {t("income.markPaid")}
                    </Button>
                  </div>
                ))}
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
                <Label>{t("calendar.paymentMethod")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.value} onClick={() => setPayMethod(m.value)}
                      className={cn("p-3 rounded-lg border text-sm font-medium transition-colors text-center",
                        payMethod === m.value ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"
                      )}>
                      {m.label}
                    </button>
                  ))}
                </div>
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
    </AppLayout>
  );
}
