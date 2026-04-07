import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Plus, CheckCircle, XCircle, Ban, Clock, Pencil, Trash2, DollarSign } from "lucide-react";
import { useState } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import {
  useAppointments, useCreateAppointment, useUpdateAppointment,
  useDeleteAppointment, useCompleteAppointment, useCancelAppointment,
  useClients, useServices,
} from "@/hooks/useData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const hours = Array.from({ length: 11 }, (_, i) => i + 8);

const STATUSES = [
  { value: "scheduled", label: "Scheduled", color: "bg-muted text-muted-foreground" },
  { value: "confirmed", label: "Confirmed", color: "bg-primary/15 text-primary" },
  { value: "completed", label: "Completed", color: "bg-success/15 text-success" },
  { value: "cancelled", label: "Cancelled", color: "bg-destructive/15 text-destructive" },
  { value: "no-show", label: "No-show", color: "bg-warning/15 text-warning" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "💵 Cash" },
  { value: "card", label: "💳 Card" },
  { value: "bank_transfer", label: "🏦 Bank Transfer" },
];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: appointments = [] } = useAppointments();
  const { data: clients = [] } = useClients();
  const { data: services = [] } = useServices();
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();
  const completeAppointment = useCompleteAppointment();
  const cancelAppointment = useCancelAppointment();
  const { toast } = useToast();

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [detailApt, setDetailApt] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Create form
  const [form, setForm] = useState({ client_id: "", service_id: "", date: "", time: "09:00", notes: "" });

  // Edit form
  const [editForm, setEditForm] = useState({ client_id: "", service_id: "", date: "", time: "09:00", notes: "", price: 0 });

  // Complete form
  const [completePrice, setCompletePrice] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleCreate = async () => {
    if (!form.client_id || !form.service_id || !form.date) return;
    const service = services.find(s => s.id === form.service_id);
    try {
      await createAppointment.mutateAsync({
        client_id: form.client_id,
        service_id: form.service_id,
        scheduled_at: `${form.date}T${form.time}:00`,
        duration_minutes: service?.duration_minutes ?? 60,
        price: Number(service?.price ?? 0),
        notes: form.notes || undefined,
      });
      setForm({ client_id: "", service_id: "", date: "", time: "09:00", notes: "" });
      setCreateOpen(false);
      toast({ title: "Appointment created" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const openDetail = (apt: any) => {
    setDetailApt(apt);
  };

  const openEdit = (apt: any) => {
    const d = new Date(apt.scheduled_at);
    setEditForm({
      client_id: apt.client_id,
      service_id: apt.service_id,
      date: format(d, "yyyy-MM-dd"),
      time: format(d, "HH:mm"),
      notes: apt.notes || "",
      price: Number(apt.price),
    });
    setDetailApt(null);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!detailApt && !editForm.client_id) return;
    const aptId = (detailApt as any)?.id;
    // We stored the id before clearing detailApt, so we need to capture it
    try {
      const service = services.find(s => s.id === editForm.service_id);
      await updateAppointment.mutateAsync({
        id: aptId || (window as any).__editAptId,
        client_id: editForm.client_id,
        service_id: editForm.service_id,
        scheduled_at: `${editForm.date}T${editForm.time}:00`,
        duration_minutes: service?.duration_minutes ?? 60,
        price: editForm.price,
        notes: editForm.notes || undefined,
      });
      setEditOpen(false);
      toast({ title: "Appointment updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const openEditFromDetail = (apt: any) => {
    const d = new Date(apt.scheduled_at);
    setEditForm({
      client_id: apt.client_id,
      service_id: apt.service_id,
      date: format(d, "yyyy-MM-dd"),
      time: format(d, "HH:mm"),
      notes: apt.notes || "",
      price: Number(apt.price),
    });
    (window as any).__editAptId = apt.id;
    setDetailApt(null);
    setEditOpen(true);
  };

  const openComplete = (apt: any) => {
    setCompletePrice(Number(apt.price));
    setPaymentMethod("cash");
    (window as any).__completeAptId = apt.id;
    setDetailApt(null);
    setCompleteOpen(true);
  };

  const handleComplete = async () => {
    try {
      await completeAppointment.mutateAsync({
        appointmentId: (window as any).__completeAptId,
        price: completePrice,
        paymentMethod,
      });
      setCompleteOpen(false);
      toast({ title: "Appointment completed! ✅", description: `Income of €${completePrice} recorded.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleStatusChange = async (apt: any, status: "confirmed" | "cancelled" | "no-show") => {
    try {
      if (status === "cancelled" || status === "no-show") {
        await cancelAppointment.mutateAsync({ id: apt.id, status });
      } else {
        await updateAppointment.mutateAsync({ id: apt.id, status });
      }
      setDetailApt(null);
      toast({ title: `Status updated to ${status}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAppointment.mutateAsync(deleteId);
      toast({ title: "Appointment deleted" });
      setDeleteId(null);
      setDetailApt(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const getEventsForDayHour = (day: Date, hour: number) => {
    return appointments.filter(apt => {
      const d = new Date(apt.scheduled_at);
      return isSameDay(d, day) && d.getHours() === hour;
    });
  };

  const statusInfo = (status: string) => STATUSES.find(s => s.value === status) || STATUSES[0];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
            <p className="text-muted-foreground mt-1">Manage your appointments</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(d => addDays(d, -7))}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium px-3 text-foreground">
                {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(d => addDays(d, 7))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> New Appointment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Appointment</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Client *</Label>
                    <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Service *</Label>
                    <Select value={form.service_id} onValueChange={v => setForm(f => ({ ...f, service_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                      <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — €{Number(s.price).toFixed(0)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Time *</Label><Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                  <Button onClick={handleCreate} className="w-full" disabled={createAppointment.isPending}>
                    {createAppointment.isPending ? "Creating..." : "Create Appointment"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Weekly calendar grid */}
        <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
            <div className="p-3" />
            {days.map((day, i) => (
              <div key={i} className={`p-3 text-center border-l border-border ${isSameDay(day, new Date()) ? "bg-accent" : ""}`}>
                <p className="text-xs text-muted-foreground">{format(day, "EEE")}</p>
                <p className={`text-lg font-semibold ${isSameDay(day, new Date()) ? "text-accent-foreground" : "text-foreground"}`}>{format(day, "d")}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[60px_repeat(7,1fr)] max-h-[600px] overflow-y-auto">
            {hours.map((hour) => (
              <div key={hour} className="contents">
                <div className="p-2 text-right pr-3 border-b border-border">
                  <span className="text-xs text-muted-foreground">{hour.toString().padStart(2, "0")}:00</span>
                </div>
                {days.map((day, dayIdx) => {
                  const events = getEventsForDayHour(day, hour);
                  return (
                    <div key={dayIdx} className="relative border-l border-b border-border min-h-[60px] hover:bg-muted/30 transition-colors cursor-pointer">
                      {events.map((evt) => {
                        const si = statusInfo(evt.status);
                        return (
                          <div
                            key={evt.id}
                            onClick={() => openDetail(evt)}
                            className={cn("absolute inset-x-1 top-1 rounded-md border p-2 cursor-pointer hover:ring-2 hover:ring-ring/30 transition-all", si.color)}
                            style={{ height: `${(evt.duration_minutes / 60) * 60 - 8}px` }}
                          >
                            <p className="text-xs font-semibold truncate">{(evt as any).clients?.name}</p>
                            <p className="text-xs opacity-70 truncate">{(evt as any).services?.name}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Appointment detail dialog */}
      <Dialog open={!!detailApt} onOpenChange={(o) => { if (!o) setDetailApt(null); }}>
        <DialogContent>
          {detailApt && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  Appointment Details
                  <Badge className={cn("text-xs", statusInfo(detailApt.status).color)}>
                    {statusInfo(detailApt.status).label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Client</span>
                    <span className="font-medium text-foreground">{detailApt.clients?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-medium text-foreground">{detailApt.services?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date & Time</span>
                    <span className="font-medium text-foreground">{format(new Date(detailApt.scheduled_at), "MMM d, yyyy · HH:mm")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium text-foreground">{detailApt.duration_minutes} min</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-semibold text-foreground">€{Number(detailApt.price).toFixed(2)}</span>
                  </div>
                  {detailApt.notes && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">Notes: {detailApt.notes}</p>
                    </div>
                  )}
                </div>

                {/* Actions based on status */}
                <div className="flex flex-wrap gap-2">
                  {(detailApt.status === "scheduled" || detailApt.status === "confirmed") && (
                    <>
                      <Button onClick={() => openComplete(detailApt)} className="flex-1">
                        <CheckCircle className="h-4 w-4 mr-2" /> Complete
                      </Button>
                      {detailApt.status === "scheduled" && (
                        <Button variant="outline" onClick={() => handleStatusChange(detailApt, "confirmed")} className="flex-1">
                          <Clock className="h-4 w-4 mr-2" /> Confirm
                        </Button>
                      )}
                    </>
                  )}
                  {(detailApt.status === "scheduled" || detailApt.status === "confirmed") && (
                    <>
                      <Button variant="outline" onClick={() => handleStatusChange(detailApt, "cancelled")} className="text-destructive hover:text-destructive">
                        <XCircle className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                      <Button variant="outline" onClick={() => handleStatusChange(detailApt, "no-show")} className="text-warning hover:text-warning">
                        <Ban className="h-4 w-4 mr-1" /> No-show
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex gap-2 border-t border-border pt-3">
                  <Button variant="ghost" size="sm" onClick={() => openEditFromDetail(detailApt)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setDeleteId(detailApt.id); }}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit appointment dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Appointment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={editForm.client_id} onValueChange={v => setEditForm(f => ({ ...f, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Service *</Label>
              <Select value={editForm.service_id} onValueChange={v => {
                const svc = services.find(s => s.id === v);
                setEditForm(f => ({ ...f, service_id: v, price: Number(svc?.price ?? f.price) }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — €{Number(s.price).toFixed(0)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date *</Label><Input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Time *</Label><Input type="time" value={editForm.time} onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Price (€)</Label><Input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="space-y-2"><Label>Notes</Label><Input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button onClick={handleEdit} className="w-full" disabled={updateAppointment.isPending}>
              {updateAppointment.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete appointment dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete Appointment</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">Confirm the final price and how the client paid. An income record will be created automatically.</p>
            <div className="space-y-2">
              <Label>Final Price (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={completePrice}
                onChange={e => setCompletePrice(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setPaymentMethod(m.value)}
                    className={cn(
                      "p-3 rounded-lg border text-sm font-medium transition-colors text-center",
                      paymentMethod === m.value
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-card border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-semibold text-foreground">€{completePrice.toFixed(2)} will be recorded as income</p>
                <p className="text-xs text-muted-foreground">Paid via {PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label}</p>
              </div>
            </div>
            <Button onClick={handleComplete} className="w-full" disabled={completeAppointment.isPending}>
              {completeAppointment.isPending ? "Saving..." : "Confirm & Complete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete appointment?"
        description="This will permanently delete this appointment and any related income record."
        loading={deleteAppointment.isPending}
      />
    </AppLayout>
  );
}
