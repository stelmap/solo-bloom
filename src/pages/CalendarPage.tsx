import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Plus, CheckCircle, XCircle, Ban, Clock, Pencil, Trash2, DollarSign, Repeat } from "lucide-react";
import { useState } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import {
  useAppointments, useCreateAppointment, useUpdateAppointment,
  useDeleteAppointment, useCompleteAppointment, useCancelAppointment,
  useClients, useServices, useProfile, useCreateRecurringRule,
  useDeleteRecurringAppointments, useEditRecurringAppointments,
} from "@/hooks/useData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";

const DAY_KEYS = ["day.mon", "day.tue", "day.wed", "day.thu", "day.fri", "day.sat", "day.sun"] as const;

function formatTime(time: string, use12h: boolean) {
  if (!use12h) return time;
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: appointments = [] } = useAppointments();
  const { data: clients = [] } = useClients();
  const { data: services = [] } = useServices();
  const { data: profile } = useProfile();
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();
  const completeAppointment = useCompleteAppointment();
  const cancelAppointment = useCancelAppointment();
  const createRecurringRule = useCreateRecurringRule();
  const deleteRecurring = useDeleteRecurringAppointments();
  const editRecurring = useEditRecurringAppointments();
  const { toast } = useToast();
  const { t } = useLanguage();

  // Calendar settings from profile
  const startHour = parseInt((profile as any)?.work_hours_start || "09") || 9;
  const endHour = parseInt((profile as any)?.work_hours_end || "18") || 18;
  const use12h = (profile as any)?.time_format === "12h";
  const hours = Array.from({ length: endHour - startHour }, (_, i) => i + startHour);

  const STATUSES = [
    { value: "scheduled", label: t("status.scheduled"), color: "bg-muted text-muted-foreground" },
    { value: "confirmed", label: t("status.confirmed"), color: "bg-primary/15 text-primary" },
    { value: "completed", label: t("status.completed"), color: "bg-success/15 text-success" },
    { value: "cancelled", label: t("status.cancelled"), color: "bg-destructive/15 text-destructive" },
    { value: "no-show", label: t("status.noShow"), color: "bg-warning/15 text-warning" },
  ];

  const PAYMENT_METHODS = [
    { value: "cash", label: t("method.cash") },
    { value: "card", label: t("method.card") },
    { value: "bank_transfer", label: t("method.bankTransfer") },
  ];

  const PAYMENT_STATUSES = [
    { value: "paid_now", label: t("payment.paidNow"), description: t("payment.paidNowDesc") },
    { value: "paid_in_advance", label: t("payment.paidInAdvance"), description: t("payment.paidInAdvanceDesc") },
    { value: "waiting_for_payment", label: t("payment.waitingForPayment"), description: t("payment.waitingForPaymentDesc") },
  ];

  const [createOpen, setCreateOpen] = useState(false);
  const [detailApt, setDetailApt] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editAptId, setEditAptId] = useState<string | null>(null);
  const [completeAptId, setCompleteAptId] = useState<string | null>(null);
  const [completeClientId, setCompleteClientId] = useState<string | null>(null);
  const [recurringDeleteOpen, setRecurringDeleteOpen] = useState(false);
  const [recurringDeleteApt, setRecurringDeleteApt] = useState<any>(null);
  const [recurringEditScopeOpen, setRecurringEditScopeOpen] = useState(false);
  const [pendingEditApt, setPendingEditApt] = useState<any>(null);

  const [form, setForm] = useState({ client_id: "", service_id: "", date: "", time: "09:00", notes: "" });
  const [editForm, setEditForm] = useState({ client_id: "", service_id: "", date: "", time: "09:00", notes: "", price: 0 });
  const [completePrice, setCompletePrice] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("paid_now");

  // Recurring form state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurInterval, setRecurInterval] = useState(1);
  const [recurDays, setRecurDays] = useState<number[]>([1]);
  const [recurEndDate, setRecurEndDate] = useState("");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const toggleRecurDay = (d: number) => {
    setRecurDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const handleCreate = async () => {
    if (!form.client_id || !form.service_id || !form.date) return;
    const service = services.find(s => s.id === form.service_id);

    if (isRecurring) {
      try {
        const result = await createRecurringRule.mutateAsync({
          client_id: form.client_id, service_id: form.service_id,
          time: form.time, duration_minutes: service?.duration_minutes ?? 60,
          price: Number(service?.price ?? 0), notes: form.notes || undefined,
          recurrence_type: "weekly", interval_weeks: recurInterval,
          days_of_week: recurDays.length > 0 ? recurDays : [new Date(form.date).getDay() || 7],
          start_date: form.date, end_date: recurEndDate || undefined,
        });
        setForm({ client_id: "", service_id: "", date: "", time: "09:00", notes: "" });
        setIsRecurring(false);
        setRecurInterval(1);
        setRecurDays([1]);
        setRecurEndDate("");
        setCreateOpen(false);
        toast({
          title: t("recurring.seriesCreated"),
          description: t("recurring.seriesCreatedDesc", { count: (result as any).count }),
        });
      } catch (e: any) {
        toast({ title: t("common.error"), description: e.message, variant: "destructive" });
      }
    } else {
      try {
        await createAppointment.mutateAsync({
          client_id: form.client_id, service_id: form.service_id,
          scheduled_at: `${form.date}T${form.time}:00`,
          duration_minutes: service?.duration_minutes ?? 60,
          price: Number(service?.price ?? 0),
          notes: form.notes || undefined,
        });
        setForm({ client_id: "", service_id: "", date: "", time: "09:00", notes: "" });
        setCreateOpen(false);
        toast({ title: t("toast.appointmentCreated") });
      } catch (e: any) {
        toast({ title: t("common.error"), description: e.message, variant: "destructive" });
      }
    }
  };

  const openEditFromDetail = (apt: any) => {
    const d = new Date(apt.scheduled_at);
    setEditForm({
      client_id: apt.client_id, service_id: apt.service_id,
      date: format(d, "yyyy-MM-dd"), time: format(d, "HH:mm"),
      notes: apt.notes || "", price: Number(apt.price),
    });
    setEditAptId(apt.id);
    setDetailApt(null);

    if (apt.recurring_rule_id) {
      // For recurring: show scope dialog after edit form is saved
      setPendingEditApt(apt);
      setEditOpen(true);
    } else {
      setEditOpen(true);
    }
  };

  const handleEdit = async () => {
    if (!editAptId) return;

    // If it's a recurring appointment, show scope dialog instead of saving directly
    if (pendingEditApt?.recurring_rule_id) {
      setEditOpen(false);
      setRecurringEditScopeOpen(true);
      return;
    }

    try {
      const service = services.find(s => s.id === editForm.service_id);
      await updateAppointment.mutateAsync({
        id: editAptId, client_id: editForm.client_id, service_id: editForm.service_id,
        scheduled_at: `${editForm.date}T${editForm.time}:00`,
        duration_minutes: service?.duration_minutes ?? 60,
        price: editForm.price, notes: editForm.notes || undefined,
      });
      setEditOpen(false);
      toast({ title: t("toast.appointmentUpdated") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleRecurringEdit = async (scope: "this" | "following" | "all") => {
    if (!editAptId || !pendingEditApt) return;
    try {
      const service = services.find(s => s.id === editForm.service_id);
      if (scope === "this") {
        // For "this only", update the single appointment directly
        await updateAppointment.mutateAsync({
          id: editAptId, client_id: editForm.client_id, service_id: editForm.service_id,
          scheduled_at: `${editForm.date}T${editForm.time}:00`,
          duration_minutes: service?.duration_minutes ?? 60,
          price: editForm.price, notes: editForm.notes || undefined,
        });
      } else {
        // For "following" or "all", batch-update non-time fields
        await editRecurring.mutateAsync({
          ruleId: pendingEditApt.recurring_rule_id,
          scope,
          appointmentId: editAptId,
          updates: {
            client_id: editForm.client_id, service_id: editForm.service_id,
            duration_minutes: service?.duration_minutes ?? 60,
            price: editForm.price, notes: editForm.notes || undefined,
          },
        });
      }
      setRecurringEditScopeOpen(false);
      setPendingEditApt(null);
      toast({ title: t("toast.appointmentUpdated") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const openComplete = (apt: any) => {
    setCompletePrice(Number(apt.price));
    setPaymentMethod("cash");
    setPaymentStatus("paid_now");
    setCompleteAptId(apt.id);
    setCompleteClientId(apt.client_id);
    setDetailApt(null);
    setCompleteOpen(true);
  };

  const handleComplete = async () => {
    if (!completeAptId || !completeClientId) return;
    try {
      await completeAppointment.mutateAsync({
        appointmentId: completeAptId, clientId: completeClientId,
        price: completePrice, paymentMethod, paymentStatus,
      });
      setCompleteOpen(false);
      const msg = paymentStatus === "waiting_for_payment"
        ? t("toast.sessionCompletedExpected")
        : t("toast.sessionCompletedIncome", { amount: completePrice.toString() });
      toast({ title: t("toast.appointmentCompleted"), description: msg });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
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
      const statusLabel = STATUSES.find(s => s.value === status)?.label || status;
      toast({ title: t("toast.statusUpdated", { status: statusLabel }) });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAppointment.mutateAsync(deleteId);
      toast({ title: t("toast.appointmentDeleted") });
      setDeleteId(null);
      setDetailApt(null);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const openRecurringDelete = (apt: any) => {
    setRecurringDeleteApt(apt);
    setRecurringDeleteOpen(true);
    setDetailApt(null);
  };

  const handleRecurringDelete = async (scope: "this" | "following" | "all") => {
    if (!recurringDeleteApt) return;
    try {
      await deleteRecurring.mutateAsync({
        ruleId: recurringDeleteApt.recurring_rule_id,
        scope,
        appointmentId: recurringDeleteApt.id,
      });
      toast({ title: t("toast.appointmentDeleted") });
      setRecurringDeleteOpen(false);
      setRecurringDeleteApt(null);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const getEventsForDayHour = (day: Date, hour: number) =>
    appointments.filter(apt => { const d = new Date(apt.scheduled_at); return isSameDay(d, day) && d.getHours() === hour; });

  const statusInfo = (status: string) => STATUSES.find(s => s.value === status) || STATUSES[0];

  const fmtHour = (hour: number) => formatTime(`${hour.toString().padStart(2, "0")}:00`, use12h);
  const fmtTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return formatTime(format(d, "HH:mm"), use12h);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("calendar.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("calendar.subtitle")}</p>
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
                <Button><Plus className="h-4 w-4 mr-1" /> {t("calendar.newAppointment")}</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{t("calendar.newAppointment")}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("calendar.client")} *</Label>
                    <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                      <SelectTrigger><SelectValue placeholder={t("calendar.selectClient")} /></SelectTrigger>
                      <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("calendar.service")} *</Label>
                    <Select value={form.service_id} onValueChange={v => setForm(f => ({ ...f, service_id: v }))}>
                      <SelectTrigger><SelectValue placeholder={t("calendar.selectService")} /></SelectTrigger>
                      <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — €{Number(s.price).toFixed(0)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>{t("common.date")} *</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>{t("common.time")} *</Label><Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-2"><Label>{t("calendar.notes")}</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>

                  {/* Recurring section */}
                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox id="recurring" checked={isRecurring} onCheckedChange={v => setIsRecurring(!!v)} />
                      <Label htmlFor="recurring" className="flex items-center gap-1">
                        <Repeat className="h-3.5 w-3.5" /> {t("recurring.setup")}
                      </Label>
                    </div>
                    {isRecurring && (
                      <div className="space-y-3 pl-6 border-l-2 border-primary/20">
                        <div className="space-y-2">
                          <Label className="text-xs">{t("recurring.intervalWeeks")}</Label>
                          <Select value={recurInterval.toString()} onValueChange={v => setRecurInterval(parseInt(v))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">{t("recurring.weekly")}</SelectItem>
                              <SelectItem value="2">{t("recurring.biweekly")}</SelectItem>
                              <SelectItem value="3">{t("recurring.custom", { n: "3" })}</SelectItem>
                              <SelectItem value="4">{t("recurring.custom", { n: "4" })}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">{t("recurring.daysOfWeek")}</Label>
                          <div className="flex gap-1">
                            {DAY_KEYS.map((key, i) => (
                              <button key={i} onClick={() => toggleRecurDay(i + 1)}
                                className={cn("w-9 h-9 rounded-md text-xs font-medium transition-colors border",
                                  recurDays.includes(i + 1) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"
                                )}>
                                {t(key as any)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">{t("recurring.endDate")}</Label>
                          <Input type="date" value={recurEndDate} onChange={e => setRecurEndDate(e.target.value)} placeholder={t("recurring.ongoing")} />
                        </div>
                      </div>
                    )}
                  </div>

                  <Button onClick={handleCreate} className="w-full" disabled={createAppointment.isPending || createRecurringRule.isPending}>
                    {(createAppointment.isPending || createRecurringRule.isPending) ? t("calendar.creating") : (isRecurring ? t("recurring.seriesCreated").split(" ")[0] + "..." : t("calendar.createAppointment"))}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

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
                  <span className="text-xs text-muted-foreground">{fmtHour(hour)}</span>
                </div>
                {days.map((day, dayIdx) => {
                  const events = getEventsForDayHour(day, hour);
                  return (
                    <div key={dayIdx} className="relative border-l border-b border-border min-h-[60px] hover:bg-muted/30 transition-colors cursor-pointer">
                      {events.map((evt) => {
                        const si = statusInfo(evt.status);
                        return (
                          <div key={evt.id} onClick={() => setDetailApt(evt)}
                            className={cn("absolute inset-x-1 top-1 rounded-md border p-2 cursor-pointer hover:ring-2 hover:ring-ring/30 transition-all", si.color)}
                            style={{ height: `${(evt.duration_minutes / 60) * 60 - 8}px` }}>
                            <p className="text-xs font-semibold truncate">{(evt as any).clients?.name}</p>
                            <div className="flex items-center gap-1">
                              <p className="text-xs opacity-70 truncate">{(evt as any).services?.name}</p>
                              {(evt as any).recurring_rule_id && <Repeat className="h-2.5 w-2.5 opacity-50 shrink-0" />}
                            </div>
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

      {/* Detail dialog */}
      <Dialog open={!!detailApt} onOpenChange={(o) => { if (!o) setDetailApt(null); }}>
        <DialogContent>
          {detailApt && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {t("calendar.appointmentDetails")}
                  <Badge className={cn("text-xs", statusInfo(detailApt.status).color)}>{statusInfo(detailApt.status).label}</Badge>
                  {detailApt.recurring_rule_id && <Badge variant="outline" className="text-xs"><Repeat className="h-3 w-3 mr-1" />{t("recurring.badge")}</Badge>}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("calendar.client")}</span><span className="font-medium text-foreground">{detailApt.clients?.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("calendar.service")}</span><span className="font-medium text-foreground">{detailApt.services?.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("calendar.dateTime")}</span><span className="font-medium text-foreground">{format(new Date(detailApt.scheduled_at), "MMM d, yyyy")} · {fmtTime(detailApt.scheduled_at)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("calendar.duration")}</span><span className="font-medium text-foreground">{detailApt.duration_minutes} {t("common.min")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("calendar.price")}</span><span className="font-semibold text-foreground">€{Number(detailApt.price).toFixed(2)}</span></div>
                  {detailApt.notes && <div className="pt-2 border-t border-border"><p className="text-xs text-muted-foreground">{t("calendar.notes")}: {detailApt.notes}</p></div>}
                </div>
                {(detailApt.status === "scheduled" || detailApt.status === "confirmed") && (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => openComplete(detailApt)} className="flex-1"><CheckCircle className="h-4 w-4 mr-2" /> {t("calendar.complete")}</Button>
                    {detailApt.status === "scheduled" && (
                      <Button variant="outline" onClick={() => handleStatusChange(detailApt, "confirmed")} className="flex-1"><Clock className="h-4 w-4 mr-2" /> {t("calendar.confirm")}</Button>
                    )}
                    <Button variant="outline" onClick={() => handleStatusChange(detailApt, "cancelled")} className="text-destructive hover:text-destructive"><XCircle className="h-4 w-4 mr-1" /> {t("calendar.cancel")}</Button>
                    <Button variant="outline" onClick={() => handleStatusChange(detailApt, "no-show")} className="text-warning hover:text-warning"><Ban className="h-4 w-4 mr-1" /> {t("calendar.noShow")}</Button>
                  </div>
                )}
                <div className="flex gap-2 border-t border-border pt-3">
                  <Button variant="ghost" size="sm" onClick={() => openEditFromDetail(detailApt)}><Pencil className="h-3.5 w-3.5 mr-1" /> {t("calendar.edit")}</Button>
                  {detailApt.recurring_rule_id ? (
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => openRecurringDelete(detailApt)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("calendar.delete")}
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(detailApt.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("calendar.delete")}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("calendar.editAppointment")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("calendar.client")} *</Label>
              <Select value={editForm.client_id} onValueChange={v => setEditForm(f => ({ ...f, client_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("calendar.service")} *</Label>
              <Select value={editForm.service_id} onValueChange={v => {
                const svc = services.find(s => s.id === v);
                setEditForm(f => ({ ...f, service_id: v, price: Number(svc?.price ?? f.price) }));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — €{Number(s.price).toFixed(0)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("common.date")} *</Label><Input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>{t("common.time")} *</Label><Input type="time" value={editForm.time} onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>{t("calendar.price")} (€)</Label><Input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="space-y-2"><Label>{t("calendar.notes")}</Label><Input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button onClick={handleEdit} className="w-full" disabled={updateAppointment.isPending}>
              {updateAppointment.isPending ? t("calendar.saving") : t("calendar.saveChanges")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete dialog with payment status */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("calendar.completeAppointment")}</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">{t("calendar.confirmOutcome")}</p>
            <div className="space-y-2">
              <Label>{t("calendar.finalPrice")}</Label>
              <Input type="number" step="0.01" value={completePrice} onChange={e => setCompletePrice(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>{t("calendar.paymentStatus")}</Label>
              <div className="space-y-2">
                {PAYMENT_STATUSES.map(ps => (
                  <button key={ps.value} onClick={() => setPaymentStatus(ps.value)}
                    className={cn("w-full text-left p-3 rounded-lg border transition-colors",
                      paymentStatus === ps.value ? "bg-primary/10 border-primary" : "bg-card border-border hover:bg-muted"
                    )}>
                    <p className="text-sm font-medium text-foreground">{ps.label}</p>
                    <p className="text-xs text-muted-foreground">{ps.description}</p>
                  </button>
                ))}
              </div>
            </div>
            {(paymentStatus === "paid_now" || paymentStatus === "paid_in_advance") && (
              <div className="space-y-2">
                <Label>{t("calendar.paymentMethod")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                      className={cn("p-3 rounded-lg border text-sm font-medium transition-colors text-center",
                        paymentMethod === m.value ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"
                      )}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className={cn("rounded-lg p-4 flex items-center gap-3 border",
              paymentStatus === "waiting_for_payment" ? "bg-warning/10 border-warning/20" : "bg-success/10 border-success/20"
            )}>
              <DollarSign className={cn("h-5 w-5", paymentStatus === "waiting_for_payment" ? "text-warning" : "text-success")} />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {paymentStatus === "waiting_for_payment"
                    ? t("calendar.willBeExpected", { amount: completePrice.toFixed(2) })
                    : t("calendar.willBeIncome", { amount: completePrice.toFixed(2) })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {paymentStatus === "waiting_for_payment" ? t("calendar.markPaidLater") : t("calendar.paidVia", { method: PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label || "" })}
                </p>
              </div>
            </div>
            <Button onClick={handleComplete} className="w-full" disabled={completeAppointment.isPending}>
              {completeAppointment.isPending ? t("calendar.saving") : t("calendar.confirmComplete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recurring delete dialog */}
      <Dialog open={recurringDeleteOpen} onOpenChange={setRecurringDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("recurring.deleteScope")}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => handleRecurringDelete("this")}>
              {t("recurring.thisOnly")}
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => handleRecurringDelete("following")}>
              {t("recurring.thisAndFollowing")}
            </Button>
            <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => handleRecurringDelete("all")}>
              {t("recurring.allInSeries")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={handleDelete}
        title={t("calendar.deleteTitle")} description={t("calendar.deleteDesc")}
        loading={deleteAppointment.isPending} />
    </AppLayout>
  );
}
