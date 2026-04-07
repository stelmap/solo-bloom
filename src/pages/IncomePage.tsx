import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, DollarSign, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useIncome, useCreateIncome, useDeleteIncome, useExpectedPayments, useMarkExpectedPaymentPaid } from "@/hooks/useData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

export default function IncomePage() {
  const { data: income = [], isLoading } = useIncome();
  const { data: expectedPayments = [], isLoading: epLoading } = useExpectedPayments();
  const createIncome = useCreateIncome();
  const deleteIncome = useDeleteIncome();
  const markPaid = useMarkExpectedPaymentPaid();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState<any>(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [form, setForm] = useState({ amount: 0, date: new Date().toISOString().split("T")[0], description: "", payment_method: "cash" });

  const total = income.reduce((s, i) => s + Number(i.amount), 0);
  const pendingTotal = (expectedPayments as any[]).reduce((s: number, ep: any) => s + Number(ep.amount), 0);

  const handleCreate = async () => {
    if (!form.amount) return;
    try {
      await createIncome.mutateAsync({ ...form, source: "manual" });
      setForm({ amount: 0, date: new Date().toISOString().split("T")[0], description: "", payment_method: "cash" });
      setOpen(false);
      toast({ title: "Income added" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteIncome.mutateAsync(deleteId);
      toast({ title: "Income deleted" });
      setDeleteId(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
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
      toast({ title: "Payment received! ✅", description: `€${Number(payDialog.amount).toFixed(2)} recorded as income.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const paymentLabel = (method: string) => PAYMENT_METHODS.find(m => m.value === method)?.label || method;

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
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={createIncome.isPending}>{createIncome.isPending ? "Adding..." : "Add Income"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
            <p className="text-sm text-muted-foreground">Confirmed Income</p>
            <p className="text-2xl font-bold text-foreground mt-1">€{total.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-xl border border-warning/30 p-5 animate-fade-in">
            <p className="text-sm text-warning">Pending Payments</p>
            <p className="text-2xl font-bold text-warning mt-1">€{pendingTotal.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{(expectedPayments as any[]).length} awaiting payment</p>
          </div>
        </div>

        <Tabs defaultValue="income" className="space-y-4">
          <TabsList>
            <TabsTrigger value="income">Confirmed Income</TabsTrigger>
            <TabsTrigger value="pending">
              Expected Payments
              {(expectedPayments as any[]).length > 0 && (
                <Badge className="ml-2 bg-warning/20 text-warning text-xs">{(expectedPayments as any[]).length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="income">
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
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Payment</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Source</th>
                        <th className="p-4 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {income.map((entry: any) => (
                        <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group">
                          <td className="p-4 text-sm font-medium text-foreground">
                            {entry.source === "appointment"
                              ? `${entry.appointments?.clients?.name} — ${entry.appointments?.services?.name}`
                              : entry.description || "Manual entry"}
                          </td>
                          <td className="p-4 text-sm font-semibold text-foreground">€{Number(entry.amount).toFixed(2)}</td>
                          <td className="p-4 text-sm text-muted-foreground">{entry.date}</td>
                          <td className="p-4"><Badge variant="outline" className="text-xs capitalize">{paymentLabel(entry.payment_method || "cash")}</Badge></td>
                          <td className="p-4"><Badge variant={entry.source === "appointment" ? "default" : "secondary"} className="text-xs">{entry.source === "appointment" ? "Appointment" : "Manual"}</Badge></td>
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
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : (expectedPayments as any[]).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No pending payments. All caught up! 🎉</p>
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
                    <p className="text-lg font-bold text-warning">€{Number(ep.amount).toFixed(2)}</p>
                    <Button size="sm" onClick={() => { setPayDialog(ep); setPayMethod("cash"); }}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Mark Paid
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
          <DialogHeader><DialogTitle>Confirm Payment</DialogTitle></DialogHeader>
          {payDialog && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span className="font-medium text-foreground">{payDialog.clients?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold text-foreground">€{Number(payDialog.amount).toFixed(2)}</span></div>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
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
                {markPaid.isPending ? "Saving..." : "Confirm Payment Received"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete income record?" description="This will permanently remove this income entry." loading={deleteIncome.isPending} />
    </AppLayout>
  );
}
