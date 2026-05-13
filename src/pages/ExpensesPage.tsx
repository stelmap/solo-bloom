import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Download, Check, X } from "lucide-react";
import { downloadCSV } from "@/lib/csvExport";
import { Badge } from "@/components/ui/badge";
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useUpdateExpensePaymentStatus, useUpdateExpenseSeries } from "@/hooks/useData";
import { explainExpenseDate, generateMonthlyOccurrences, generateYearlyOccurrences, isLastDayOfItsMonth } from "@/lib/recurringExpenses";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { TranslationKey } from "@/i18n/translations";
import { useSearchParams } from "react-router-dom";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subMonths, format } from "date-fns";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

const DEFAULT_CATEGORIES = ["Rent", "Materials", "Insurance", "Equipment", "Marketing", "Utilities", "Laundry", "Software", "Tax", "Other"];

type DateRangeKey = "today" | "week" | "month" | "quarter" | "last3" | "last12" | "all";

export default function ExpensesPage() {
  const [page, setPage] = useState(0);
  const { data: expenseResult, isLoading } = useExpenses(page);
  const expenses = expenseResult?.data ?? [];
  const totalCount = expenseResult?.totalCount ?? 0;
  const pageSize = expenseResult?.pageSize ?? 50;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const updateSeries = useUpdateExpenseSeries();
  const deleteExpense = useDeleteExpense();
  const updatePaymentStatus = useUpdateExpensePaymentStatus();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { symbol: cs } = useCurrency();
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editExpense, setEditExpense] = useState<any>(null);
  const [editScopeOpen, setEditScopeOpen] = useState(false);
  const [editScope, setEditScope] = useState<"single" | "series">("single");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteScope, setDeleteScope] = useState<"single" | "future" | "series">("single");
  const [deleteIncludePaid, setDeleteIncludePaid] = useState(false);
  const [form, setForm] = useState<{
    category: string;
    amount: number;
    date: string;
    description: string;
    recurrence: "one_time" | "monthly" | "yearly";
    recurring_start_date: string;
    instance_status: "planned" | "paid" | "cancelled";
  }>({ category: "Other", amount: 0, date: new Date().toISOString().split("T")[0], description: "", recurrence: "one_time", recurring_start_date: "", instance_status: "planned" });

  // Filters
  const initialRange = (searchParams.get("range") || "month") as DateRangeKey;
  const [dateRange, setDateRange] = useState<DateRangeKey>(initialRange);
  const [catFilter, setCatFilter] = useState("all");

  const CATEGORIES = useMemo(() => {
    const customCats = expenses
      .map((e: any) => e.category as string)
      .filter((c: string) => c && !DEFAULT_CATEGORIES.includes(c));
    return [...DEFAULT_CATEGORIES, ...Array.from(new Set(customCats))];
  }, [expenses]);

  const filtered = useMemo(() => {
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    let from = "";
    let to = "";
    if (dateRange === "today") {
      from = todayStr;
      to = todayStr;
    } else if (dateRange === "week") {
      from = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
      to = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    } else if (dateRange === "month") {
      from = format(startOfMonth(now), "yyyy-MM-dd");
      to = format(endOfMonth(now), "yyyy-MM-dd");
    } else if (dateRange === "quarter") {
      from = format(startOfQuarter(now), "yyyy-MM-dd");
      to = format(endOfQuarter(now), "yyyy-MM-dd");
    } else if (dateRange === "last3") {
      from = format(subMonths(now, 3), "yyyy-MM-dd");
      to = todayStr;
    } else if (dateRange === "last12") {
      from = format(subMonths(now, 12), "yyyy-MM-dd");
      to = todayStr;
    }

    // Instances are real DB rows now — just filter by date range and category.
    let result = expenses as any[];
    if (from) result = result.filter(e => e.date >= from && e.date <= to);
    if (catFilter !== "all") result = result.filter(e => e.category === catFilter);
    return result;
  }, [expenses, dateRange, catFilter]);

  const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const taxTotal = filtered.filter(e => e.category === "Tax").reduce((s, e) => s + Number(e.amount), 0);
  const expensesExTax = totalFiltered - taxTotal;
  const recurringTotal = filtered.filter(e => e.is_recurring).reduce((s, e) => s + Number(e.amount), 0);
  const unpaidTotal = filtered.filter(e => (e as any).payment_status === "unpaid").reduce((s, e) => s + Number(e.amount), 0);

  const catLabel = (cat: string) => {
    const key = `category.${cat}` as TranslationKey;
    const translated = t(key);
    return translated === key ? cat : translated;
  };

  const openEdit = (exp: any) => {
    // Virtual rows are expanded occurrences of a recurring template — resolve to the real template row.
    const target = exp.virtual
      ? (expenses as any[]).find(e => e.id === exp.template_id) || exp
      : exp;
    setEditExpense(target);
    if (target.is_recurring && target.recurring_group_id) {
      // Show scope choice dialog
      setEditScopeOpen(true);
      return;
    }
    startEdit(target, "single");
  };

  const startEdit = (exp: any, scope: "single" | "series") => {
    setEditId(exp.id);
    setEditScope(scope);
    const rec: "one_time" | "monthly" | "yearly" = exp.is_template
      ? (exp.recurrence_type || "monthly")
      : (exp.is_recurring ? (exp.recurrence_type || "monthly") : "one_time");
    setForm({
      category: exp.category,
      amount: Number(exp.amount),
      date: exp.date,
      description: exp.description || "",
      recurrence: rec,
      recurring_start_date: exp.recurring_start_date || exp.date,
      instance_status: (exp.instance_status as any) || (exp.payment_status === "paid" ? "paid" : "planned"),
    });
    setOpen(true);
  };

  const openCreate = () => {
    setEditId(null);
    const today = new Date().toISOString().split("T")[0];
    setForm({ category: "Other", amount: 0, date: today, description: "", recurrence: "one_time", recurring_start_date: today, instance_status: "planned" });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.amount) return;
    const isRecurring = form.recurrence !== "one_time";
    if (isRecurring && !form.recurring_start_date) {
      toast({ title: t("common.error"), description: "Recurring start date is required", variant: "destructive" });
      return;
    }
    try {
      if (editId) {
        if (editScope === "series" && editExpense?.recurring_group_id) {
          await updateSeries.mutateAsync({
            recurring_group_id: editExpense.recurring_group_id,
            category: form.category,
            amount: form.amount,
            description: form.description,
          });
        } else {
          await updateExpense.mutateAsync({
            id: editId,
            category: form.category,
            amount: form.amount,
            description: form.description,
            instance_status: form.instance_status,
            paid_date: form.instance_status === "paid" ? new Date().toISOString().split("T")[0] : null,
          });
        }
        toast({ title: t("toast.expenseUpdated") });
      } else {
        await createExpense.mutateAsync({
          category: form.category,
          amount: form.amount,
          date: form.date,
          description: form.description,
          recurrence: form.recurrence,
          recurring_start_date: isRecurring ? form.recurring_start_date : null,
          instance_status: form.instance_status,
        });
        toast({ title: t("toast.expenseAdded") });
      }
      setOpen(false);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteExpense.mutateAsync({ id: deleteId, scope: deleteScope, deletePaid: deleteIncludePaid });
      toast({ title: t("toast.expenseDeleted") });
      setDeleteId(null);
      setDeleteScope("single");
      setDeleteIncludePaid(false);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const togglePaymentStatus = async (expense: any) => {
    const target = expense.virtual
      ? (expenses as any[]).find(e => e.id === expense.template_id) || expense
      : expense;
    const newStatus = target.payment_status === "paid" ? "unpaid" : "paid";
    try {
      await updatePaymentStatus.mutateAsync({ id: target.id, payment_status: newStatus });
      track("payment_status_toggled", { entity: "expense", new_status: newStatus });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const filterButtons: { key: DateRangeKey; labelKey: string }[] = [
    { key: "today", labelKey: "filter.today" },
    { key: "week", labelKey: "filter.thisWeek" },
    { key: "month", labelKey: "filter.thisMonth" },
    { key: "quarter", labelKey: "filter.thisQuarter" },
    { key: "last3", labelKey: "filter.last3Months" },
    { key: "last12", labelKey: "filter.last12Months" },
    { key: "all", labelKey: "filter.allTime" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("expenses.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("expenses.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              downloadCSV("expenses.csv",
                [t("csv.header.date"), t("csv.header.category"), t("csv.header.amount"), t("csv.header.description"), t("csv.header.recurring"), t("csv.header.paymentStatus")],
                filtered.map((e: any) => [e.date, e.category, String(e.amount), e.description || "", e.is_recurring ? t("csv.value.yes") : t("csv.value.no"), e.payment_status || "unpaid"])
              );
            }}><Download className="h-4 w-4 mr-1" /> {t("export.csv")}</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> {t("expenses.addExpense")}</Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? t("expenses.editExpense") : t("expenses.addExpense")}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("common.category")}</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{catLabel(c)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>{t("common.amount")} *</Label><Input type="number" step="0.01" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} /></div>

                <div className="space-y-2">
                  <Label>Recurrence</Label>
                  <Select value={form.recurrence} onValueChange={(v: any) => setForm(f => ({
                    ...f,
                    recurrence: v,
                    recurring_start_date: v === "one_time" ? "" : (f.recurring_start_date || f.date),
                  }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One-time</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.recurrence === "one_time" ? (
                  <div className="space-y-1">
                    <Label>{t("common.date")}</Label>
                    <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                    <p className="text-xs text-muted-foreground">{explainExpenseDate({ recurrence: "one_time", date: form.date })}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label>{form.recurrence === "yearly" ? "Yearly start date" : t("expenses.recurringStartDate")}</Label>
                    <Input type="date" value={form.recurring_start_date} onChange={e => setForm(f => ({ ...f, recurring_start_date: e.target.value, date: e.target.value }))} />
                    <p className="text-xs text-muted-foreground">{explainExpenseDate({ recurrence: form.recurrence, date: form.recurring_start_date })}</p>
                  </div>
                )}

                <div className="space-y-2"><Label>{t("common.description")}</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.instance_status} onValueChange={(v: any) => setForm(f => ({ ...f, instance_status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.recurrence !== "one_time" && form.recurring_start_date && (() => {
                  const dates = form.recurrence === "monthly"
                    ? generateMonthlyOccurrences(form.recurring_start_date, isLastDayOfItsMonth(form.recurring_start_date), 4)
                    : generateYearlyOccurrences(form.recurring_start_date, 4);
                  const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
                  return (
                    <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-1">
                      <p className="font-medium text-foreground">Preview</p>
                      <p className="text-muted-foreground">
                        {form.recurrence === "monthly"
                          ? (isLastDayOfItsMonth(form.recurring_start_date)
                              ? "This expense will be planned on the last day of each month."
                              : "This expense will be planned monthly on the same day.")
                          : "This expense will be planned once a year on the same day."}
                      </p>
                      <p className="text-muted-foreground">First planned expense: <span className="text-foreground">{fmt(dates[0])}</span></p>
                      <p className="text-muted-foreground">Next planned expenses: <span className="text-foreground">{dates.slice(1).map(fmt).join(", ")}</span></p>
                      <p className="text-muted-foreground">Default status: <span className="text-foreground capitalize">{form.instance_status}</span></p>
                      {form.recurrence === "monthly" && <p className="text-muted-foreground">12 months will be generated and extended automatically.</p>}
                    </div>
                  );
                })()}

                <Button onClick={handleSubmit} className="w-full" disabled={createExpense.isPending || updateExpense.isPending}>
                  {editId ? t("common.save") : t("expenses.addExpense")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {filterButtons.map(({ key, labelKey }) => (
            <Button key={key} variant={dateRange === key ? "default" : "outline"} size="sm"
              onClick={() => setDateRange(key)}>
              {t(labelKey as any)}
            </Button>
          ))}
          <div className="w-px h-6 bg-border mx-1" />
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-36 h-8">
              <SelectValue placeholder={t("filter.category")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter.all")}</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{catLabel(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
            <p className="text-sm text-muted-foreground">{t("expenses.totalThisMonth")}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{cs}{totalFiltered.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
            <p className="text-sm text-muted-foreground">{t("finance.totalExpenses")}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{cs}{expensesExTax.toLocaleString()}</p>
          </div>
          <div className={cn("bg-card rounded-xl border p-5 animate-fade-in", taxTotal > 0 ? "border-warning/30" : "border-border")}>
            <p className={cn("text-sm", taxTotal > 0 ? "text-warning" : "text-muted-foreground")}>{t("finance.totalTaxes")}</p>
            <p className={cn("text-2xl font-bold mt-1", taxTotal > 0 ? "text-warning" : "text-foreground")}>{cs}{taxTotal.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
            <p className="text-sm text-muted-foreground">{t("expenses.recurringMonthly")}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{cs}{recurringTotal.toLocaleString()}</p>
          </div>
          <div className={cn("bg-card rounded-xl border p-5 animate-fade-in", unpaidTotal > 0 ? "border-destructive/30" : "border-border")}>
            <p className={cn("text-sm", unpaidTotal > 0 ? "text-destructive" : "text-muted-foreground")}>{t("expenses.unpaid")}</p>
            <p className={cn("text-2xl font-bold mt-1", unpaidTotal > 0 ? "text-destructive" : "text-foreground")}>{cs}{unpaidTotal.toLocaleString()}</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">{t("common.loading")}</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t("expenses.noExpenses")}</p>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.date")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.category")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.amount")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.description")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.type")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.payment")}</th>
                    <th className="p-4 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((expense: any) => {
                    const isTaxGenerated = !!expense.tax_setting_id;
                    const isPaid = expense.payment_status === "paid";
                    return (
                      <tr key={expense.id} className={cn(
                        "border-b border-border last:border-0 hover:bg-muted/30 transition-colors group",
                        expense.category === "Tax" && "bg-warning/5",
                        isTaxGenerated && "border-l-2 border-l-warning"
                      )}>
                        <td className="p-4 text-sm text-muted-foreground">{expense.date}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <Badge variant={expense.category === "Tax" ? "outline" : "secondary"}
                              className={cn("text-xs", expense.category === "Tax" && "border-warning text-warning")}>
                              {catLabel(expense.category)}
                            </Badge>
                            {isTaxGenerated && (
                              <Badge variant="outline" className="text-xs border-warning/50 text-warning/70">
                                {t("tax.autoGenerated")}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm font-semibold text-foreground">{cs}{Number(expense.amount).toFixed(2)}</td>
                        <td className="p-4 text-sm text-muted-foreground truncate max-w-[200px]">{expense.description || "—"}</td>
                        <td className="p-4">
                          <Badge variant={expense.is_recurring ? "default" : "secondary"} className="text-xs">
                            {expense.is_recurring ? t("expenses.recurring") : t("expenses.oneTime")}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => togglePaymentStatus(expense)}
                            className={cn(
                              "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors",
                              isPaid
                                ? "bg-success/10 border-success/30 text-success hover:bg-success/20"
                                : "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"
                            )}
                          >
                            {isPaid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            {isPaid ? t("expenses.paid") : t("expenses.unpaid")}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            {!isTaxGenerated && (
                              <button onClick={() => openEdit(expense)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button onClick={() => {
                              setDeleteId(expense.id);
                              setDeleteScope(expense.template_id ? "single" : "single");
                              setDeleteIncludePaid(false);
                            }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
      </div>

      <ConfirmDeleteDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={handleDelete}
        title={t("expenses.deleteTitle")} description={t("expenses.deleteDesc")}
        loading={deleteExpense.isPending}
      />

      {/* Edit scope choice dialog for recurring expenses */}
      <Dialog open={editScopeOpen} onOpenChange={setEditScopeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("expenses.editRecurring") || "Edit Recurring Expense"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("expenses.editRecurringDesc") || "This expense is part of a recurring series. How would you like to apply your changes?"}
          </p>
          <div className="flex flex-col gap-2 mt-2">
            <Button variant="outline" onClick={() => {
              setEditScopeOpen(false);
              if (editExpense) startEdit(editExpense, "single");
            }}>
              {t("expenses.editThisOnly") || "Edit only this record"}
            </Button>
            <Button onClick={() => {
              setEditScopeOpen(false);
              if (editExpense) startEdit(editExpense, "series");
            }}>
              {t("expenses.editEntireSeries") || "Edit entire series"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
