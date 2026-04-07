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
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { TranslationKey } from "@/i18n/translations";

const CATEGORIES = ["Rent", "Materials", "Insurance", "Equipment", "Marketing", "Utilities", "Laundry", "Software", "Other"];

export default function ExpensesPage() {
  const { data: expenses = [], isLoading } = useExpenses();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ category: "Other", amount: 0, date: new Date().toISOString().split("T")[0], description: "", is_recurring: false });

  const totalMonthly = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const recurringTotal = expenses.filter(e => e.is_recurring).reduce((s, e) => s + Number(e.amount), 0);

  const catLabel = (cat: string) => {
    const key = `category.${cat}` as TranslationKey;
    return t(key);
  };

  const openEdit = (exp: any) => {
    setEditId(exp.id);
    setForm({ category: exp.category, amount: Number(exp.amount), date: exp.date, description: exp.description || "", is_recurring: exp.is_recurring });
    setOpen(true);
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ category: "Other", amount: 0, date: new Date().toISOString().split("T")[0], description: "", is_recurring: false });
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
                expenses.map((e: any) => [e.date, e.category, String(e.amount), e.description || "", e.is_recurring ? "Yes" : "No"])
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
                  <Checkbox checked={form.is_recurring} onCheckedChange={v => setForm(f => ({ ...f, is_recurring: !!v }))} id="recurring" />
                  <Label htmlFor="recurring">{t("expenses.recurringMonthlyCheckbox")}</Label>
                </div>
                <Button onClick={handleSubmit} className="w-full" disabled={createExpense.isPending || updateExpense.isPending}>
                  {editId ? t("common.save") : t("expenses.addExpense")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
            <p className="text-sm text-muted-foreground">{t("expenses.totalThisMonth")}</p>
            <p className="text-2xl font-bold text-foreground mt-1">€{totalMonthly.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
            <p className="text-sm text-muted-foreground">{t("expenses.recurringMonthly")}</p>
            <p className="text-2xl font-bold text-foreground mt-1">€{recurringTotal.toLocaleString()}</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">{t("common.loading")}</p>
        ) : expenses.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t("expenses.noExpenses")}</p>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.category")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.amount")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.date")}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t("common.type")}</th>
                    <th className="p-4 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group">
                      <td className="p-4 text-sm font-medium text-foreground">{catLabel(expense.category)}</td>
                      <td className="p-4 text-sm font-semibold text-foreground">€{Number(expense.amount).toFixed(2)}</td>
                      <td className="p-4 text-sm text-muted-foreground">{expense.date}</td>
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
