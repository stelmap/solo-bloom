import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SessionDetailSheet } from "@/components/SessionDetailSheet";
import { DateTimePicker, DatePicker } from "@/components/ui/date-time-picker";
import { ChevronLeft, ChevronRight, Plus, Repeat, CalendarOff, BarChart3, GripVertical } from "lucide-react";
import { useState, useMemo, useCallback, useRef } from "react";
import { format, addDays, startOfWeek, isSameDay, isBefore, startOfDay } from "date-fns";
import { formatTime, formatScheduledTime } from "@/lib/timeFormat";
import {
  useAppointments, useCreateAppointment, useUpdateAppointment,
  useClients, useServices, useProfile, useCreateRecurringRule,
  useWorkingSchedule, useDaysOff, useCreateDayOff, useDeleteDayOff,
  useBulkCancelForDayOff, useEditRecurringAppointments,
} from "@/hooks/useData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";

const DAY_KEYS = ["day.mon", "day.tue", "day.wed", "day.thu", "day.fri", "day.sat", "day.sun"] as const;


export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: appointments = [] } = useAppointments();
  const { data: clients = [] } = useClients();
  const { data: services = [] } = useServices();
  const { data: profile } = useProfile();
  const { data: workingSchedule = [] } = useWorkingSchedule();
  const { data: daysOff = [] } = useDaysOff();
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const createRecurringRule = useCreateRecurringRule();
  const editRecurring = useEditRecurringAppointments();
  const createDayOff = useCreateDayOff();
  const deleteDayOff = useDeleteDayOff();
  const bulkCancel = useBulkCancelForDayOff();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { symbol: cs } = useCurrency();

  // Drag-and-drop state
  const [dragAptId, setDragAptId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [recurMoveOpen, setRecurMoveOpen] = useState(false);
  const pendingMove = useRef<{ aptId: string; newDate: string; newTime: string } | null>(null);

  // Calendar settings from profile
  const startHour = parseInt((profile as any)?.work_hours_start || "09") || 9;
  const endHour = parseInt((profile as any)?.work_hours_end || "18") || 18;
  const use12h = (profile as any)?.time_format === "12h";
  const hours = Array.from({ length: endHour - startHour }, (_, i) => i + startHour);

  // Build schedule map: day_of_week -> { is_working, start_time, end_time }
  const scheduleMap = useMemo(() => {
    const map: Record<number, { is_working: boolean; start_time: string; end_time: string }> = {};
    if (workingSchedule.length > 0) {
      for (const ws of workingSchedule) {
        map[ws.day_of_week] = { is_working: ws.is_working, start_time: ws.start_time, end_time: ws.end_time };
      }
    }
    return map;
  }, [workingSchedule]);

  // Build days off set
  const daysOffSet = useMemo(() => {
    const set = new Set<string>();
    for (const d of daysOff as any[]) {
      if (d.is_non_working) set.add(d.date);
    }
    return set;
  }, [daysOff]);

  const getDayOfWeek = (date: Date) => {
    const d = date.getDay();
    return d === 0 ? 7 : d; // 1=Mon, 7=Sun
  };

  const isDayOff = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return daysOffSet.has(dateStr);
  };

  const isDayWorking = (date: Date) => {
    if (isDayOff(date)) return false;
    const dow = getDayOfWeek(date);
    if (scheduleMap[dow] !== undefined) return scheduleMap[dow].is_working;
    return dow <= 5; // Default Mon-Fri
  };

  const isHourWorking = (date: Date, hour: number) => {
    if (!isDayWorking(date)) return false;
    const dow = getDayOfWeek(date);
    const sched = scheduleMap[dow];
    if (sched) {
      const sh = parseInt(sched.start_time);
      const eh = parseInt(sched.end_time);
      return hour >= sh && hour < eh;
    }
    return hour >= startHour && hour < endHour;
  };

  const hasConflict = (date: string, time: string, durationMinutes: number, excludeId?: string) => {
    const newStart = new Date(`${date}T${time}:00Z`).getTime();
    const newEnd = newStart + durationMinutes * 60 * 1000;
    return appointments.some(apt => {
      if (excludeId && apt.id === excludeId) return false;
      if (apt.status === "cancelled") return false;
      const aptStart = new Date(apt.scheduled_at).getTime();
      const aptEnd = aptStart + apt.duration_minutes * 60 * 1000;
      return newStart < aptEnd && newEnd > aptStart;
    });
  };


  const [createOpen, setCreateOpen] = useState(false);
  const [detailApt, setDetailApt] = useState<any>(null);
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false);
  const [dayOffConfirm, setDayOffConfirm] = useState<{ date: Date; affectedApts: any[] } | null>(null);

  const [form, setForm] = useState({ client_id: "", service_id: "", date: "", time: "09:00", notes: "" });

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

  // Validation for create
  const createValidation = useMemo(() => {
    if (!form.date || !form.time) return null;
    const date = new Date(form.date);
    if (isDayOff(date)) return t("calendar.dayOffBlocked");
    if (!isDayWorking(date)) return t("calendar.outsideHours");
    const hour = parseInt(form.time);
    if (!isHourWorking(date, hour)) return t("calendar.outsideHours");
    const service = services.find(s => s.id === form.service_id);
    if (form.service_id && hasConflict(form.date, form.time, service?.duration_minutes ?? 60)) {
      return t("calendar.doubleBooking");
    }
    return null;
  }, [form.date, form.time, form.service_id, services, appointments, scheduleMap, daysOffSet]);

  const handleCreate = async () => {
    if (!form.client_id || !form.service_id || !form.date) return;
    if (createValidation && !isRecurring) return;
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
        setIsRecurring(false); setRecurInterval(1); setRecurDays([1]); setRecurEndDate("");
        setCreateOpen(false);
        toast({ title: t("recurring.seriesCreated"), description: t("recurring.seriesCreatedDesc", { count: (result as any).count }) });
      } catch (e: any) { toast({ title: t("common.error"), description: e.message, variant: "destructive" }); }
    } else {
      try {
        await createAppointment.mutateAsync({
          client_id: form.client_id, service_id: form.service_id,
          scheduled_at: `${form.date}T${form.time}:00Z`,
          duration_minutes: service?.duration_minutes ?? 60,
          price: Number(service?.price ?? 0),
          notes: form.notes || undefined,
        });
        setForm({ client_id: "", service_id: "", date: "", time: "09:00", notes: "" });
        setCreateOpen(false);
        toast({ title: t("toast.appointmentCreated") });
      } catch (e: any) { toast({ title: t("common.error"), description: e.message, variant: "destructive" }); }
    }
  };

  const openSessionSheet = (apt: any) => {
    setDetailApt(apt);
    setSessionSheetOpen(true);
  };

  const handleQuickDayOff = async (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const existing = (daysOff as any[]).find((d: any) => d.date === dateStr);
    if (existing) {
      await deleteDayOff.mutateAsync(existing.id);
      toast({ title: t("toast.dayOffRemoved") });
    } else {
      // Check for affected sessions
      const affected = appointments.filter(apt => {
        if (apt.status === "cancelled" || apt.status === "completed") return false;
        return toUTCDateStr(new Date(apt.scheduled_at)) === format(date, "yyyy-MM-dd");
      });
      if (affected.length > 0) {
        setDayOffConfirm({ date, affectedApts: affected });
      } else {
        await createDayOff.mutateAsync({ date: dateStr, type: "day_off", is_non_working: true });
        toast({ title: t("toast.dayOffAdded") });
      }
    }
  };

  const handleConfirmDayOffCancel = async () => {
    if (!dayOffConfirm) return;
    const dateStr = format(dayOffConfirm.date, "yyyy-MM-dd");
    const reason = t("dayOff.cancelReason");
    try {
      await bulkCancel.mutateAsync({
        appointmentIds: dayOffConfirm.affectedApts.map((a: any) => a.id),
        reason,
      });
      await createDayOff.mutateAsync({ date: dateStr, type: "day_off", is_non_working: true });
      toast({ title: t("toast.sessionsCancelled", { count: dayOffConfirm.affectedApts.length.toString() }) });
      setDayOffConfirm(null);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const toUTCDateStr = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

  const getEventsForDayHour = (day: Date, hour: number) => {
    const dayStr = format(day, "yyyy-MM-dd"); // local calendar day string
    return appointments.filter(apt => {
      const d = new Date(apt.scheduled_at);
      return toUTCDateStr(d) === dayStr && d.getUTCHours() === hour;
    });
  };

  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    scheduled: { label: t("status.scheduled"), color: "bg-muted text-muted-foreground" },
    reminder_sent: { label: t("status.reminderSent"), color: "bg-accent text-accent-foreground" },
    confirmed: { label: t("status.confirmed"), color: "bg-primary/15 text-primary" },
    completed: { label: t("status.completed"), color: "bg-success/15 text-success" },
    cancelled: { label: t("status.cancelled"), color: "bg-destructive/15 text-destructive" },
    "no-show": { label: t("status.noShow"), color: "bg-warning/15 text-warning" },
  };
  const statusInfo = (status: string) => STATUS_MAP[status] || STATUS_MAP.scheduled;

  const fmtHour = (hour: number) => formatTime(`${hour.toString().padStart(2, "0")}:00`, use12h);
  const fmtTime = (dateStr: string) => formatScheduledTime(dateStr, use12h);

  // Weekly capacity calculations
  const weekCapacity = useMemo(() => {
    const sessionsPerDay = (profile as any)?.sessions_per_day ?? 6;
    let totalSlots = 0;
    const dayStats = days.map(day => {
      const working = isDayWorking(day);
      const slots = working ? sessionsPerDay : 0;
      totalSlots += slots;
      const booked = appointments.filter(apt => {
        const dayStr = format(day, "yyyy-MM-dd");
        return toUTCDateStr(new Date(apt.scheduled_at)) === dayStr && apt.status !== "cancelled";
      }).length;
      return { day, working, slots, booked, free: Math.max(slots - booked, 0) };
    });
    const totalBooked = dayStats.reduce((s, d) => s + d.booked, 0);
    return { totalSlots, totalBooked, totalFree: Math.max(totalSlots - totalBooked, 0), dayStats };
  }, [days, appointments, profile, scheduleMap, daysOffSet]);

  // Drag-and-drop handlers
  const canDropOnSlot = useCallback((day: Date, hour: number, aptId: string) => {
    if (isDayOff(day)) return false;
    if (!isHourWorking(day, hour)) return false;
    const slotTime = new Date(day);
    slotTime.setHours(hour, 0, 0, 0);
    if (isBefore(slotTime, new Date())) return false;
    const dateStr = format(day, "yyyy-MM-dd");
    const timeStr = `${hour.toString().padStart(2, "0")}:00`;
    const apt = appointments.find(a => a.id === aptId);
    if (apt && hasConflict(dateStr, timeStr, apt.duration_minutes, aptId)) return false;
    return true;
  }, [appointments, scheduleMap, daysOffSet]);

  const handleDragStart = useCallback((e: React.DragEvent, aptId: string) => {
    e.dataTransfer.setData("text/plain", aptId);
    e.dataTransfer.effectAllowed = "move";
    setDragAptId(aptId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    const slotKey = `${format(day, "yyyy-MM-dd")}-${hour}`;
    setDragOverSlot(slotKey);
    if (dragAptId && canDropOnSlot(day, hour, dragAptId)) {
      e.dataTransfer.dropEffect = "move";
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  }, [dragAptId, canDropOnSlot]);

  const handleDragLeave = useCallback(() => {
    setDragOverSlot(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragAptId(null);
    setDragOverSlot(null);
  }, []);

  const executeMoveAppointment = async (aptId: string, newDate: string, newTime: string) => {
    try {
      await updateAppointment.mutateAsync({
        id: aptId,
        scheduled_at: `${newDate}T${newTime}:00Z`,
      });
      toast({ title: t("calendar.sessionMoved") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleRecurringMoveScope = async (scope: "this" | "following" | "all") => {
    if (!pendingMove.current) return;
    const { aptId, newDate, newTime } = pendingMove.current;
    const apt = appointments.find(a => a.id === aptId);
    // Close dialog immediately for responsiveness
    setRecurMoveOpen(false);
    pendingMove.current = null;

    if (!apt) return;

    const oldScheduled = new Date(apt.scheduled_at);
    const newScheduled = new Date(`${newDate}T${newTime}:00Z`);
    const deltaMs = newScheduled.getTime() - oldScheduled.getTime();

    try {
      if (scope === "this") {
        await updateAppointment.mutateAsync({
          id: aptId,
          scheduled_at: newScheduled.toISOString(),
        });
      } else if (apt.recurring_rule_id) {
        // Fetch affected appointments
        let query = supabase.from("appointments").select("id, scheduled_at, status")
          .eq("recurring_rule_id", apt.recurring_rule_id);

        if (scope === "following") {
          query = query.gte("scheduled_at", apt.scheduled_at);
        }

        const { data: seriesApts, error: fetchErr } = await query;
        if (fetchErr) throw fetchErr;

        // Build batch updates - only move non-completed/non-cancelled appointments
        const updates = (seriesApts || [])
          .filter(a => a.status === "scheduled" || a.status === "confirmed" || a.status === "reminder_sent")
          .map(a => {
            const shifted = new Date(new Date(a.scheduled_at).getTime() + deltaMs);
            return supabase.from("appointments")
              .update({ scheduled_at: shifted.toISOString() })
              .eq("id", a.id);
          });

        await Promise.all(updates);
      }
      toast({ title: t("calendar.sessionMoved") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    setDragAptId(null);
    setDragOverSlot(null);
    const aptId = e.dataTransfer.getData("text/plain");
    if (!aptId) return;

    if (!canDropOnSlot(day, hour, aptId)) {
      const reason = isDayOff(day) ? t("calendar.dayOffBlocked")
        : !isHourWorking(day, hour) ? t("calendar.outsideHours")
        : (() => {
            const slotTime = new Date(day);
            slotTime.setHours(hour, 0, 0, 0);
            return isBefore(slotTime, new Date()) ? t("calendar.movePastBlocked") : t("calendar.doubleBooking");
          })();
      toast({ title: t("calendar.moveBlocked"), description: reason, variant: "destructive" });
      return;
    }

    const newDate = format(day, "yyyy-MM-dd");
    const newTime = `${hour.toString().padStart(2, "0")}:00`;
    const apt = appointments.find(a => a.id === aptId);

    if (apt?.recurring_rule_id) {
      pendingMove.current = { aptId, newDate, newTime };
      setRecurMoveOpen(true);
    } else {
      executeMoveAppointment(aptId, newDate, newTime);
    }
  }, [appointments, canDropOnSlot, toast, t]);

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
                      <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {cs}{Number(s.price).toFixed(0)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <DateTimePicker
                    date={form.date}
                    time={form.time}
                    onDateChange={v => setForm(f => ({ ...f, date: v }))}
                    onTimeChange={v => setForm(f => ({ ...f, time: v }))}
                    use12h={use12h}
                    dateLabel={t("common.date")}
                    timeLabel={t("common.time")}
                  />

                  {createValidation && !isRecurring && (
                    <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                      ⚠️ {createValidation}
                    </div>
                  )}

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
                          <DatePicker date={recurEndDate} onDateChange={setRecurEndDate} placeholder={t("recurring.ongoing")} />
                        </div>
                      </div>
                    )}
                  </div>

                  <Button onClick={handleCreate} className="w-full"
                    disabled={createAppointment.isPending || createRecurringRule.isPending || (!isRecurring && !!createValidation)}>
                    {(createAppointment.isPending || createRecurringRule.isPending) ? t("calendar.creating") : (isRecurring ? t("recurring.seriesCreated").split(" ")[0] + "..." : t("calendar.createAppointment"))}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Weekly capacity bar */}
        <div className="bg-card rounded-xl border border-border p-4 animate-fade-in">
          <div className="flex items-center gap-3 mb-3">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{t("capacity.title")}</span>
            <div className="flex items-center gap-4 ml-auto text-xs text-muted-foreground">
              <span>{t("capacity.totalSlots")}: {weekCapacity.totalSlots}</span>
              <span>{t("capacity.booked")}: {weekCapacity.totalBooked}</span>
              <span>{t("capacity.free")}: {weekCapacity.totalFree}</span>
            </div>
          </div>
          <div className="grid grid-cols-[72px_repeat(7,1fr)] gap-0">
            <div />{/* spacer for time column */}
            {weekCapacity.dayStats.map((ds, i) => {
              const pct = ds.slots > 0 ? (ds.booked / ds.slots) * 100 : 0;
              const isFull = ds.slots > 0 && ds.booked >= ds.slots;
              const isLow = ds.working && ds.slots > 0 && pct < 30;
              return (
                <div key={i} className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t(DAY_KEYS[i] as any)}</p>
                  {ds.working ? (
                    <>
                      <Progress value={pct} className={cn("h-2", isFull ? "[&>div]:bg-destructive" : isLow ? "[&>div]:bg-warning" : "")} />
                      <p className="text-xs mt-1">
                        <span className="font-medium text-foreground">{ds.booked}</span>
                        <span className="text-muted-foreground">/{ds.slots}</span>
                      </p>
                      {isFull && <Badge variant="outline" className="text-[10px] px-1 mt-0.5 border-destructive/30 text-destructive">{t("capacity.fullyBooked")}</Badge>}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-6">
                      <CalendarOff className="h-3.5 w-3.5 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in flex flex-col" style={{ maxHeight: "calc(100vh - 280px)" }}>
          <div className="overflow-y-auto flex-1 min-h-0" style={{ scrollbarGutter: "stable" }}>
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col className="w-[72px]" />
                {days.map((_, i) => <col key={i} />)}
              </colgroup>
              <thead className="sticky top-0 z-20 bg-card">
                <tr className="border-b border-border">
                  <th className="p-3" />
                  {days.map((day, i) => {
                    const dayOffStatus = isDayOff(day);
                    const working = isDayWorking(day);
                    return (
                      <th key={i} className={cn(
                        "p-3 text-center border-l border-border relative group font-normal",
                        isSameDay(day, new Date()) ? "bg-accent" : "",
                        dayOffStatus ? "bg-destructive/5" : !working ? "bg-muted/30" : "",
                      )}>
                        <p className="text-xs text-muted-foreground">{format(day, "EEE")}</p>
                        <p className={cn("text-lg font-semibold", isSameDay(day, new Date()) ? "text-accent-foreground" : dayOffStatus ? "text-destructive/60" : "text-foreground")}>
                          {format(day, "d")}
                        </p>
                        {dayOffStatus && (
                          <Badge variant="outline" className="text-[9px] px-1 border-destructive/20 text-destructive/60 absolute top-1 right-1">
                            <CalendarOff className="h-2.5 w-2.5" />
                          </Badge>
                        )}
                        <button
                          onClick={() => handleQuickDayOff(day)}
                          className="absolute bottom-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-muted-foreground hover:text-foreground"
                          title={dayOffStatus ? t("calendar.removeDayOff") : t("calendar.addDayOff")}
                        >
                          {dayOffStatus ? "✓" : <CalendarOff className="h-3 w-3" />}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {hours.map((hour) => (
                  <tr key={hour}>
                    <td className="h-[60px] text-right pr-3 border-b border-border align-middle">
                      <span className="text-xs text-muted-foreground font-medium">{fmtHour(hour)}</span>
                    </td>
                    {days.map((day, dayIdx) => {
                      const events = getEventsForDayHour(day, hour);
                      const working = isHourWorking(day, hour);
                      const dayOff = isDayOff(day);
                      return (
                        <td key={dayIdx}
                          onClick={() => {
                            if (dayOff || !working) return;
                            if (events.length > 0) return;
                            const dateStr = format(day, "yyyy-MM-dd");
                            const timeStr = `${hour.toString().padStart(2, "0")}:00`;
                            setForm(f => ({ ...f, date: dateStr, time: timeStr }));
                            setCreateOpen(true);
                          }}
                          onDragOver={(e) => handleDragOver(e, day, hour)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, day, hour)}
                          className={cn(
                            "relative border-l border-b border-border h-[60px] transition-colors",
                            dayOff ? "bg-destructive/5 cursor-not-allowed" : !working ? "bg-muted/20 cursor-not-allowed" : events.length === 0 ? "hover:bg-primary/5 cursor-pointer group/slot" : "",
                            dragOverSlot === `${format(day, "yyyy-MM-dd")}-${hour}` && dragAptId && canDropOnSlot(day, hour, dragAptId) && "bg-primary/15 ring-2 ring-primary/30 ring-inset",
                            dragOverSlot === `${format(day, "yyyy-MM-dd")}-${hour}` && dragAptId && !canDropOnSlot(day, hour, dragAptId) && "bg-destructive/10 ring-2 ring-destructive/30 ring-inset",
                          )}>
                          {events.length === 0 && working && !dayOff && !dragAptId && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity pointer-events-none">
                              <Plus className="h-4 w-4 text-primary/40" />
                            </div>
                          )}
                          {events.map((evt) => {
                            const si = statusInfo(evt.status);
                            const heightPx = Math.max((evt.duration_minutes / 60) * 60 - 4, 20);
                            const isActiveEvt = evt.status === "scheduled" || evt.status === "confirmed" || evt.status === "reminder_sent";
                            const client = clients.find(c => c.id === evt.client_id);
                            const needsConfirmation = client?.confirmation_required && evt.confirmation_status !== "confirmed";
                            const isConfirmed = evt.confirmation_status === "confirmed";
                            return (
                              <div key={evt.id}
                                draggable={isActiveEvt}
                                onDragStart={isActiveEvt ? (e) => handleDragStart(e, evt.id) : undefined}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => { e.stopPropagation(); openSessionSheet(evt); }}
                                className={cn(
                                  "absolute inset-x-1 top-0 rounded-md border p-1.5 cursor-pointer hover:ring-2 hover:ring-ring/30 transition-all z-10 overflow-hidden",
                                  si.color,
                                  needsConfirmation && "border-warning/50",
                                  isConfirmed && "border-success/50",
                                  isActiveEvt && "cursor-grab active:cursor-grabbing",
                                  dragAptId === evt.id && "opacity-40 ring-2 ring-primary",
                                )}
                                style={{ height: `${heightPx}px` }}>
                                <div className="flex items-center gap-1">
                                  <p className="text-xs font-semibold truncate flex-1">{(evt as any).clients?.name}</p>
                                  {needsConfirmation && (
                                    <span className="shrink-0 h-2 w-2 rounded-full bg-warning" title={t("confirmation.pending")} />
                                  )}
                                  {isConfirmed && (
                                    <span className="shrink-0 h-2 w-2 rounded-full bg-success" title={t("confirmation.confirmed")} />
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <p className="text-xs opacity-70 truncate">{(evt as any).services?.name}</p>
                                  {(evt as any).recurring_rule_id && <Repeat className="h-2.5 w-2.5 opacity-50 shrink-0" />}
                                </div>
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <SessionDetailSheet
        appointment={detailApt}
        open={sessionSheetOpen}
        onOpenChange={(o) => { setSessionSheetOpen(o); if (!o) setDetailApt(null); }}
        use12h={use12h}
      />

      {/* Day-off cancellation confirmation modal */}
      <Dialog open={!!dayOffConfirm} onOpenChange={(o) => { if (!o) setDayOffConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dayOff.cancelTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("dayOff.cancelDesc", { count: dayOffConfirm?.affectedApts.length.toString() ?? "0" })}
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {dayOffConfirm?.affectedApts.map((apt: any) => (
                <div key={apt.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                  <span className="font-medium">{apt.clients?.name}</span>
                  <span className="text-muted-foreground">
                    {fmtTime(apt.scheduled_at)} · {apt.services?.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDayOffConfirm(null)}>
              {t("dayOff.keepSessions")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDayOffCancel} disabled={bulkCancel.isPending}>
              {bulkCancel.isPending ? t("common.saving") : t("dayOff.cancelConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recurring move scope dialog */}
      <Dialog open={recurMoveOpen} onOpenChange={(o) => { if (!o) { setRecurMoveOpen(false); pendingMove.current = null; } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("calendar.moveRecurringTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("calendar.moveRecurringDesc")}</p>
          <div className="flex flex-col gap-2 mt-2">
            <Button variant="outline" onClick={() => handleRecurringMoveScope("this")}>
              {t("recurring.thisOnly")}
            </Button>
            <Button variant="outline" onClick={() => handleRecurringMoveScope("following")}>
              {t("recurring.thisAndFollowing")}
            </Button>
            <Button variant="outline" onClick={() => handleRecurringMoveScope("all")}>
              {t("recurring.allInSeries")}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setRecurMoveOpen(false); pendingMove.current = null; }}>
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
