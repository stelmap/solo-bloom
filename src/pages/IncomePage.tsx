import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useIncome, useCreateIncome } from "@/hooks/useData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function IncomePage() {
  const { data: income = [], isLoading } = useIncome();
  const createIncome = useCreateIncome();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: 0, date: new Date().toISOString().split("T")[0], description: "" });

  const total = income.reduce((s, i) => s + Number(i.amount), 0);

  const handleCreate = async () => {
    if (!form.amount) return;
    try {
      await createIncome.mutateAsync({ ...form, source: "manual" });
      setForm({ amount: 0, date: new Date().toISOString().split("T")[0], description: "" });
      setOpen(false);
      toast({ title: "Income added" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Income</h1>
            <p className="text-muted-foreground mt-1">Track your earnings</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Add Manual Entry</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Income</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Amount (€) *</Label><Input type="number" step="0.01" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <Button onClick={handleCreate} className="w-full" disabled={createIncome.isPending}>
                  {createIncome.isPending ? "Adding..." : "Add Income"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
          <p className="text-sm text-muted-foreground">Total Income</p>
          <p className="text-2xl font-bold text-foreground mt-1">€{total.toLocaleString()}</p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : income.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No income recorded yet.</p>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Description</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {income.map((entry) => (
                    <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-sm font-medium text-foreground">
                        {entry.source === "appointment"
                          ? `${(entry.appointments as any)?.clients?.name} — ${(entry.appointments as any)?.services?.name}`
                          : entry.description || "Manual entry"}
                      </td>
                      <td className="p-4 text-sm font-semibold text-foreground">€{Number(entry.amount).toFixed(2)}</td>
                      <td className="p-4 text-sm text-muted-foreground">{entry.date}</td>
                      <td className="p-4">
                        <Badge variant={entry.source === "appointment" ? "default" : "secondary"} className="text-xs">
                          {entry.source === "appointment" ? "Appointment" : "Manual"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
