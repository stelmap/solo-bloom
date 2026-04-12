import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Download } from "lucide-react";
import { downloadCSV } from "@/lib/csvExport";
import { Badge } from "@/components/ui/badge";
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from "@/hooks/useData";
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
import { startOfWeek, startOfMonth, format } from "date-fns";
import { cn } from "@/lib/utils";

const DEFAULT_CATEGORIES = ["Rent", "Materials", "Insurance", "Equipment", "Marketing", "Utilities", "Laundry", "Software", "Tax", "Other"];

export default function ExpensesPage() {
  const [page, setPage] = useState(0);
  const { data: expenseResult, isLoading } = useExpenses(page);
  const expenses = expenseResult?.data ?? [];
  const totalCount = expenseResult?.totalCount ?? 0;
  const pageSize = expenseResult?.pageSize ?? 50;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { symbol: cs } = useCurrency();
  const [searchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ category: "Other", amount: 0, date: new Date().toISOString().split("T")[0], description: "", is_recurring: false, recurring_start_date: "" });

  // Filters
  const initialRange = searchParams.get("range") || "month";
  const [dateRange, setDateRange] = useState(initialRange);
  const [catFilter, setCatFilter] = useState("all");

  // Merge default categories with any custom ones from saved data
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
    if (dateRange === "today") from = todayStr;
    else if (dateRange === "week") from = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
    else if (dateRange === "month") from = format(startOfMonth(now), "yyyy-MM-dd");

    let result = from ? expenses.filter(e => e.date >= from) : expenses;
    if (catFilter !== "all") result = result.filter(e => e.category === catFilter);
    return result;
  }, [expenses, dateRange, catFilter]);

  const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const taxTotal = filtered.filter(e => e.category === "Tax").reduce((s, e) => s + Number(e.amount), 0);
  const expensesExTax = totalFiltered - taxTotal;
  const recurringTotal = filtered.filter(e => e.is_recurring).reduce((s, e) => s + Number(e.amount), 0);

  const catLabel = (cat: string) => {
    const key = `category.${cat}` as TranslationKey;
    const translated = t(key);
    // If translation returns the key itself, it's a custom category — show raw name
    return translated === key ? cat : translated;
  };

  const openEdit = (exp: any) => {
    setEditId(exp.id);
    setForm({ category: exp.category, amount: Number(exp.amount), date: exp.date, description: exp.description || "", is_recurring: exp.is_recurring, recurring_start_date: exp.recurring_start_date || exp.date });
    setOpen(true);
  };

  const openCreate = () => {
    setEditId(null);
    const today = new Date().toISOString().split("T")[0];
    setForm({ category: "Other", amount: 0, date: today, description: "", is_recurring: false, recurring_start_date: today });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.amount) return;
    try {
      if (editId) {
        await updateExpense.mutateAsync({ id: editId, ...form });
        toast({ title: t("toast.expenseUpdated") });
      } else {
        await createExpense.mutateAsync(form);
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
      await deleteExpense.mutateAsync(deleteId);
      toast({ title: t("toast.expenseDeleted") });
      setDeleteId(null);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

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
                ["Date", "Category", "Amount", "Description", "Recurring"],
                filtered.map((e: any) => [e.date, e.category, String(e.amount), e.description || "", e.is_recurring ? "Yes" : "No"])
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
                <div className="space-y-2"><Label>{t("common.date")}</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("common.description")}</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.is_recurring} onCheckedChange={v => setForm(f => ({ ...f, is_recurring: !!v, recurring_start_date: !!v ? (f.recurring_start_date || f.date) : "" }))} id="recurring" />
                  <Label htmlFor="recurring">{t("expenses.recurringMonthlyCheckbox")}</Label>
                </div>
                {form.is_recurring && (
                  <div className="space-y-1">
                    <Label>{t("expenses.recurringStartDate")}</Label>
                    <Input type="date" value={form.recurring_start_date} onChange={e => setForm(f => ({ ...f, recurring_start_date: e.target.value }))} />
                    <p className="text-xs text-muted-foreground">{t("expenses.recurringStartDateHint")}</p>
                  </div>
                )}
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
          {(["today", "week", "month", "all"] as const).map(range => (
            <Button key={range} variant={dateRange === range ? "default" : "outline"} size="sm"
              onClick={() => setDateRange(range)}>
              {t(`filter.${range === "all" ? "allTime" : range === "month" ? "thisMonth" : range === "week" ? "thisWeek" : "today"}` as any)}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <th className="p-4 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((expense) => (
                    <tr key={expense.id} className={cn(
                      "border-b border-border last:border-0 hover:bg-muted/30 transition-colors group",
                      expense.category === "Tax" && "bg-warning/5"
                    )}>
                      <td className="p-4 text-sm text-muted-foreground">{expense.date}</td>
                      <td className="p-4">
                        <Badge variant={expense.category === "Tax" ? "outline" : "secondary"}
                          className={cn("text-xs", expense.category === "Tax" && "border-warning text-warning")}>
                          {catLabel(expense.category)}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm font-semibold text-foreground">{cs}{Number(expense.amount).toFixed(2)}</td>
                      <td className="p-4 text-sm text-muted-foreground truncate max-w-[200px]">{expense.description || "—"}</td>
                      <td className="p-4">
                        <Badge variant={expense.is_recurring ? "default" : "secondary"} className="text-xs">
                          {expense.is_recurring ? t("expenses.recurring") : t("expenses.oneTime")}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(expense)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteId(expense.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
      </div>

      <ConfirmDeleteDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={handleDelete}
        title={t("expenses.deleteTitle")} description={t("expenses.deleteDesc")}
        loading={deleteExpense.isPending}
      />
    </AppLayout>
  );
}
