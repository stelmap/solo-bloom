import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useProfile, useUpdateProfile, useWorkingSchedule, useUpsertWorkingSchedule, useDaysOff, useCreateDayOff, useDeleteDayOff, useTaxSettings, useCreateTaxSetting, useUpdateTaxSetting, useDeleteTaxSetting, useBulkCancelForDayOff } from "@/hooks/useData";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage, translateFor } from "@/i18n/LanguageContext";
import { Language } from "@/i18n/translations";
import { Plus, Trash2, CalendarOff, Receipt, Pencil, Eye, EyeOff, Lock } from "lucide-react";
import { SubscriptionSection } from "@/components/SubscriptionSection";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);

const DAY_FULL_KEYS = ["day.monday", "day.tuesday", "day.wednesday", "day.thursday", "day.friday", "day.saturday", "day.sunday"] as const;

const DEFAULT_SCHEDULE = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i + 1,
  is_working: i < 5,
  start_time: "09:00",
  end_time: "18:00",
}));

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: workingSchedule } = useWorkingSchedule();
  const upsertSchedule = useUpsertWorkingSchedule();
  const { data: daysOff = [] } = useDaysOff();
  const createDayOff = useCreateDayOff();
  const deleteDayOff = useDeleteDayOff();
  const bulkCancelForDayOff = useBulkCancelForDayOff();
  const { data: taxSettings = [] } = useTaxSettings();
  const createTax = useCreateTaxSetting();
  const updateTax = useUpdateTaxSetting();
  const deleteTax = useDeleteTaxSetting();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [form, setForm] = useState({
    full_name: "", business_name: "", phone: "", language: "en", reminder_minutes: 1440,
    work_hours_start: "09:00", work_hours_end: "18:00", time_format: "24h", default_duration: 60,
    currency: "EUR", business_id: "", business_address: "", vat_mode: "none", vat_rate: 0,
  });

  // Password change state
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, newPass: false, confirm: false });
  const [changingPassword, setChangingPassword] = useState(false);

  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [dayOffOpen, setDayOffOpen] = useState(false);
  const [dayOffForm, setDayOffForm] = useState({ date: "", type: "day_off", label: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [affectedAppointments, setAffectedAppointments] = useState<string[]>([]);
  const [checkingAffected, setCheckingAffected] = useState(false);

  // Tax form
  const [taxOpen, setTaxOpen] = useState(false);
  const [taxEditId, setTaxEditId] = useState<string | null>(null);
  const [taxForm, setTaxForm] = useState({
    tax_name: "", tax_type: "percentage", tax_rate: 0, fixed_amount: 0,
    frequency: "monthly", calculate_on: "actual_income",
    start_calculation_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        business_name: profile.business_name || "",
        phone: profile.phone || "",
        language: profile.language,
        reminder_minutes: profile.reminder_minutes,
        work_hours_start: (profile as any).work_hours_start || "09:00",
        work_hours_end: (profile as any).work_hours_end || "18:00",
        time_format: (profile as any).time_format || "24h",
        default_duration: (profile as any).default_duration || 60,
        currency: (profile as any).currency || "EUR",
        business_id: (profile as any).business_id || "",
        business_address: (profile as any).business_address || "",
        vat_mode: (profile as any).vat_mode || "none",
        vat_rate: Number((profile as any).vat_rate) || 0,
      });
    }
  }, [profile]);

  useEffect(() => {
    if (workingSchedule && workingSchedule.length > 0) {
      setSchedule(workingSchedule.map(ws => ({
        day_of_week: ws.day_of_week,
        is_working: ws.is_working,
        start_time: ws.start_time,
        end_time: ws.end_time,
      })));
    }
  }, [workingSchedule]);

  const handleSave = async () => {
    try {
      const newLang = (form.language as Language) || "en";
      await Promise.all([
        updateProfile.mutateAsync(form),
        upsertSchedule.mutateAsync(schedule),
      ]);
      toast({ title: translateFor(newLang, "settings.saved") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPass.length < 6) {
      toast({ title: t("common.error"), description: t("password.tooShort"), variant: "destructive" });
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast({ title: t("common.error"), description: t("password.mismatch"), variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      // Verify current password by re-signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: passwordForm.current,
      });
      if (signInError) throw new Error(t("common.error"));

      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPass });
      if (error) throw error;
      toast({ title: t("password.changed") });
      setPasswordForm({ current: "", newPass: "", confirm: "" });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  // Step 1: User clicks "Add Day Off" -> we look up affected appointments and open confirmation
  const handleAddDayOff = async () => {
    if (!dayOffForm.date) return;
    setCheckingAffected(true);
    try {
      // Build [day start, day end) in local time, send as ISO so the DB can compare timestamptz correctly
      const [y, m, d] = dayOffForm.date.split("-").map(Number);
      const dayStart = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
      const dayEnd = new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999);
      const { data, error } = await supabase
        .from("appointments")
        .select("id")
        .eq("user_id", user!.id)
        .gte("scheduled_at", dayStart.toISOString())
        .lte("scheduled_at", dayEnd.toISOString())
        .not("status", "in", "(cancelled,no-show)");
      if (error) throw error;
      setAffectedAppointments((data ?? []).map((a: any) => a.id));
      setDayOffOpen(false);
      setConfirmOpen(true);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setCheckingAffected(false);
    }
  };

  // Step 2: User confirms -> create the day off, then bulk-cancel & email
  const handleConfirmDayOff = async () => {
    try {
      // Use the type label as the cancellation reason (e.g. "Sick day"), fall back to user-entered label
      const reason = dayOffForm.label?.trim()
        ? dayOffForm.label.trim()
        : dayOffTypeLabel(dayOffForm.type);
      await createDayOff.mutateAsync({
        date: dayOffForm.date,
        type: dayOffForm.type,
        label: dayOffForm.label || undefined,
        is_non_working: true,
      });
      if (affectedAppointments.length > 0) {
        await bulkCancelForDayOff.mutateAsync({
          appointmentIds: affectedAppointments,
          reason,
        });
      }
      const cancelled = affectedAppointments.length;
      toast({
        title: t("toast.dayOffAdded"),
        description: cancelled > 0
          ? t("toast.dayOffCancelledSessions").replace("{count}", String(cancelled))
          : undefined,
      });
      setDayOffForm({ date: "", type: "day_off", label: "" });
      setAffectedAppointments([]);
      setConfirmOpen(false);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteDayOff = async (id: string) => {
    try { await deleteDayOff.mutateAsync(id); toast({ title: t("toast.dayOffRemoved") }); }
    catch (e: any) { toast({ title: t("common.error"), description: e.message, variant: "destructive" }); }
  };

  const updateScheduleDay = (dayOfWeek: number, updates: Partial<typeof schedule[0]>) => {
    setSchedule(prev => prev.map(d => d.day_of_week === dayOfWeek ? { ...d, ...updates } : d));
  };

  const dayOffTypeLabel = (type: string) => {
    const map: Record<string, string> = { day_off: t("settings.dayOff"), vacation: t("settings.vacation"), holiday: t("settings.holiday"), sick: t("settings.sickDay") };
    return map[type] || type;
  };

  const dayOffTypeColor = (type: string) => {
    const map: Record<string, string> = {
      day_off: "bg-muted text-muted-foreground", vacation: "bg-primary/15 text-primary",
      holiday: "bg-accent text-accent-foreground", sick: "bg-destructive/15 text-destructive",
    };
    return map[type] || "bg-muted text-muted-foreground";
  };

  // Tax handlers
  const openCreateTax = () => {
    setTaxEditId(null);
    setTaxForm({ tax_name: "", tax_type: "percentage", tax_rate: 0, fixed_amount: 0, frequency: "monthly", calculate_on: "actual_income", start_calculation_date: new Date().toISOString().split("T")[0] });
    setTaxOpen(true);
  };
  const openEditTax = (tax: any) => {
    setTaxEditId(tax.id);
    setTaxForm({
      tax_name: tax.tax_name, tax_type: tax.tax_type, tax_rate: Number(tax.tax_rate),
      fixed_amount: Number(tax.fixed_amount), frequency: tax.frequency, calculate_on: tax.calculate_on,
      start_calculation_date: tax.start_calculation_date || new Date().toISOString().split("T")[0],
    });
    setTaxOpen(true);
  };
  const handleSaveTax = async () => {
    if (!taxForm.tax_name) return;
    try {
      if (taxEditId) {
        await updateTax.mutateAsync({ id: taxEditId, ...taxForm });
      } else {
        await createTax.mutateAsync(taxForm);
      }
      toast({ title: t("tax.saved") });
      setTaxOpen(false);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };
  const handleDeleteTax = async (id: string) => {
    try { await deleteTax.mutateAsync(id); toast({ title: t("tax.deleted") }); }
    catch (e: any) { toast({ title: t("common.error"), description: e.message, variant: "destructive" }); }
  };
  const handleToggleTax = async (id: string, isActive: boolean) => {
    try { await updateTax.mutateAsync({ id, is_active: isActive }); }
    catch (e: any) { toast({ title: t("common.error"), description: e.message, variant: "destructive" }); }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("settings.subtitle")}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-foreground">{t("settings.profile")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>{t("common.fullName")}</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>{t("common.email")}</Label><Input value={user?.email || ""} disabled /></div>
            <div className="space-y-2"><Label>{t("common.businessName")}</Label><Input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>{t("common.phone")}</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
        </div>

        <Separator />

        {/* Password Management */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="font-semibold text-foreground">{t("password.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("password.subtitle")}</p>
            </div>
          </div>
          <div className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <Label>{t("password.currentPassword")}</Label>
              <div className="relative">
                <Input
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordForm.current}
                  onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(s => ({ ...s, current: !s.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("password.newPassword")}</Label>
              <div className="relative">
                <Input
                  type={showPasswords.newPass ? "text" : "password"}
                  value={passwordForm.newPass}
                  onChange={e => setPasswordForm(f => ({ ...f, newPass: e.target.value }))}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(s => ({ ...s, newPass: !s.newPass }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.newPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("password.confirmPassword")}</Label>
              <div className="relative">
                <Input
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordForm.confirm}
                  onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(s => ({ ...s, confirm: !s.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !passwordForm.current || !passwordForm.newPass || !passwordForm.confirm}
              variant="outline"
            >
              {changingPassword ? t("password.changing") : t("password.changePassword")}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Billing & Invoice Settings */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">{t("settings.billing")}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("settings.businessId")}</Label>
              <Input value={form.business_id} onChange={e => setForm(f => ({ ...f, business_id: e.target.value }))} placeholder="e.g. UA1234567890" />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.businessAddress")}</Label>
              <Input value={form.business_address} onChange={e => setForm(f => ({ ...f, business_address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.vatMode")}</Label>
              <Select value={form.vat_mode} onValueChange={v => setForm(f => ({ ...f, vat_mode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("settings.vatNone")}</SelectItem>
                  <SelectItem value="included">{t("settings.vatIncluded")}</SelectItem>
                  <SelectItem value="excluded">{t("settings.vatExcluded")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.vat_mode !== "none" && (
              <div className="space-y-2">
                <Label>{t("settings.vatRate")}</Label>
                <Input type="number" min={0} max={100} value={form.vat_rate} onChange={e => setForm(f => ({ ...f, vat_rate: Number(e.target.value) }))} />
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-foreground">{t("settings.calendar")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("settings.workHoursStart")}</Label>
              <Select value={form.work_hours_start} onValueChange={v => setForm(f => ({ ...f, work_hours_start: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{HOUR_OPTIONS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2">
              <Label>{t("settings.workHoursEnd")}</Label>
              <Select value={form.work_hours_end} onValueChange={v => setForm(f => ({ ...f, work_hours_end: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{HOUR_OPTIONS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2">
              <Label>{t("settings.timeFormat")}</Label>
              <Select value={form.time_format} onValueChange={v => setForm(f => ({ ...f, time_format: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="24h">{t("settings.24h")}</SelectItem><SelectItem value="12h">{t("settings.12h")}</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2">
              <Label>{t("settings.defaultDuration")}</Label>
              <Select value={form.default_duration.toString()} onValueChange={v => setForm(f => ({ ...f, default_duration: parseInt(v) }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="30">{t("settings.30min")}</SelectItem><SelectItem value="60">{t("settings.60min")}</SelectItem><SelectItem value="90">{t("settings.90min")}</SelectItem><SelectItem value="120">{t("settings.120min")}</SelectItem></SelectContent></Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Working Schedule per weekday */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <div>
            <h2 className="font-semibold text-foreground">{t("settings.workingSchedule")}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("settings.workingScheduleDesc")}</p>
          </div>
          <div className="space-y-3">
            {schedule.map((day, i) => (
              <div key={day.day_of_week} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                <div className="w-24 shrink-0"><span className="text-sm font-medium text-foreground">{t(DAY_FULL_KEYS[i] as any)}</span></div>
                <Switch checked={day.is_working} onCheckedChange={v => updateScheduleDay(day.day_of_week, { is_working: v })} />
                {day.is_working ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Select value={day.start_time} onValueChange={v => updateScheduleDay(day.day_of_week, { start_time: v })}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent>{HOUR_OPTIONS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    <span className="text-muted-foreground text-sm">–</span>
                    <Select value={day.end_time} onValueChange={v => updateScheduleDay(day.day_of_week, { end_time: v })}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent>{HOUR_OPTIONS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">{t("settings.dayOff")}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Days Off */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">{t("settings.daysOff")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("settings.daysOffDesc")}</p>
            </div>
            <Dialog open={dayOffOpen} onOpenChange={setDayOffOpen}>
              <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> {t("settings.addDayOff")}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("settings.addDayOff")}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>{t("common.date")} *</Label><Input type="date" value={dayOffForm.date} onChange={e => setDayOffForm(f => ({ ...f, date: e.target.value }))} /></div>
                  <div className="space-y-2">
                    <Label>{t("settings.dayOffType")}</Label>
                    <Select value={dayOffForm.type} onValueChange={v => setDayOffForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="day_off">{t("settings.dayOff")}</SelectItem><SelectItem value="vacation">{t("settings.vacation")}</SelectItem><SelectItem value="holiday">{t("settings.holiday")}</SelectItem><SelectItem value="sick">{t("settings.sickDay")}</SelectItem></SelectContent></Select>
                  </div>
                  <div className="space-y-2"><Label>{t("settings.dayOffLabel")}</Label><Input value={dayOffForm.label} onChange={e => setDayOffForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Christmas" /></div>
                  <Button onClick={handleAddDayOff} className="w-full" disabled={createDayOff.isPending || !dayOffForm.date}>
                    {createDayOff.isPending ? t("common.adding") : t("settings.addDayOff")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {(daysOff as any[]).length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground"><CalendarOff className="h-8 w-8 mx-auto mb-2 opacity-40" />{t("settings.noDaysOff")}</div>
          ) : (
            <div className="space-y-2">
              {(daysOff as any[]).map((dayOff: any) => (
                <div key={dayOff.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{format(new Date(dayOff.date + "T12:00:00"), "MMM d, yyyy")}</span>
                    <Badge className={dayOffTypeColor(dayOff.type)}>{dayOffTypeLabel(dayOff.type)}</Badge>
                    {dayOff.label && <span className="text-xs text-muted-foreground">{dayOff.label}</span>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteDayOff(dayOff.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Tax Configuration */}
        <div className="bg-card rounded-xl border border-warning/20 p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-warning" />
              <div>
                <h2 className="font-semibold text-foreground">{t("tax.title")}</h2>
                <p className="text-sm text-muted-foreground">{t("tax.subtitle")}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={openCreateTax}><Plus className="h-4 w-4 mr-1" /> {t("tax.addTax")}</Button>
          </div>

          {(taxSettings as any[]).length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {t("tax.noTaxes")}
            </div>
          ) : (
            <div className="space-y-2">
              {(taxSettings as any[]).map((tax: any) => (
                <div key={tax.id} className={cn("flex items-center justify-between p-4 rounded-lg border", tax.is_active ? "bg-warning/5 border-warning/20" : "bg-muted/30 border-border opacity-60")}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{tax.tax_name}</span>
                      <Badge variant="outline" className={cn("text-xs", tax.is_active ? "border-warning text-warning" : "")}>
                        {tax.tax_type === "percentage" ? `${tax.tax_rate}%` : `${(profile as any)?.currency === "UAH" ? "₴" : "€"}${Number(tax.fixed_amount).toLocaleString()}`}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {tax.frequency === "quarterly" ? t("tax.quarterly") : t("tax.monthly")}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={tax.is_active} onCheckedChange={v => handleToggleTax(tax.id, v)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTax(tax)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteTax(tax.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tax Dialog */}
        <Dialog open={taxOpen} onOpenChange={setTaxOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{taxEditId ? t("tax.editTax") : t("tax.addTax")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>{t("tax.taxName")} *</Label><Input value={taxForm.tax_name} onChange={e => setTaxForm(f => ({ ...f, tax_name: e.target.value }))} placeholder="e.g. Income Tax" /></div>
              <div className="space-y-2">
                <Label>{t("tax.taxType")}</Label>
                <Select value={taxForm.tax_type} onValueChange={v => setTaxForm(f => ({ ...f, tax_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t("tax.percentage")}</SelectItem>
                    <SelectItem value="fixed">{t("tax.fixed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {taxForm.tax_type === "percentage" && (
                <>
                  <div className="space-y-2"><Label>{t("tax.taxRate")}</Label><Input type="number" step="0.1" value={taxForm.tax_rate || ""} onChange={e => setTaxForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) || 0 }))} /></div>
                  <div className="space-y-2">
                    <Label>{t("tax.calculateOn")}</Label>
                    <Select value={taxForm.calculate_on} onValueChange={v => setTaxForm(f => ({ ...f, calculate_on: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="actual_income">{t("tax.actualIncome")}</SelectItem>
                        <SelectItem value="all_income">{t("tax.allIncome")}</SelectItem>
                        <SelectItem value="expenses">{t("tax.percentageExpenses")}</SelectItem>
                        <SelectItem value="profit">{t("tax.percentageProfit")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {taxForm.tax_type === "fixed" && (
                <div className="space-y-2"><Label>{t("tax.fixedAmount")}</Label><Input type="number" step="0.01" value={taxForm.fixed_amount || ""} onChange={e => setTaxForm(f => ({ ...f, fixed_amount: parseFloat(e.target.value) || 0 }))} /></div>
              )}
              <div className="space-y-2">
                <Label>{t("tax.frequency")}</Label>
                <Select value={taxForm.frequency} onValueChange={v => setTaxForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">{t("tax.monthly")}</SelectItem>
                    <SelectItem value="quarterly">{t("tax.quarterly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("tax.startCalculationDate")} *</Label>
                <Input type="date" value={taxForm.start_calculation_date} onChange={e => setTaxForm(f => ({ ...f, start_calculation_date: e.target.value }))} />
                <p className="text-xs text-muted-foreground">{t("tax.startCalculationDateHint")}</p>
              </div>
              <Button onClick={handleSaveTax} className="w-full" disabled={createTax.isPending || updateTax.isPending || !taxForm.tax_name}>
                {(createTax.isPending || updateTax.isPending) ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Separator />

        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-foreground">{t("settings.currency")}</h2>
          <p className="text-sm text-muted-foreground">{t("settings.currencyDesc")}</p>
          <div className="max-w-xs space-y-2">
            <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">{t("currency.EUR")}</SelectItem>
                <SelectItem value="UAH">{t("currency.UAH")}</SelectItem>
              </SelectContent>
            </Select>
            {form.currency !== ((profile as any)?.currency || "EUR") && (
              <p className="text-xs text-warning">{t("settings.currencyWarning")}</p>
            )}
          </div>
        </div>

        <Separator />

        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-foreground">{t("settings.language")}</h2>
          <div className="max-w-xs space-y-2">
            <Label>{t("settings.displayLanguage")}</Label>
            <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="uk">Українська</SelectItem><SelectItem value="fr">Français</SelectItem></SelectContent></Select>
          </div>
        </div>

        <Separator />

        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-foreground">{t("settings.notifications")}</h2>
          <div className="max-w-xs space-y-2">
            <Label>{t("settings.reminderTime")}</Label>
            <Select value={form.reminder_minutes.toString()} onValueChange={v => setForm(f => ({ ...f, reminder_minutes: parseInt(v) }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="60">{t("settings.1hBefore")}</SelectItem><SelectItem value="180">{t("settings.3hBefore")}</SelectItem><SelectItem value="1440">{t("settings.24hBefore")}</SelectItem><SelectItem value="2880">{t("settings.48hBefore")}</SelectItem></SelectContent></Select>
          </div>
        </div>

        <div className="pt-2">
          <Button onClick={handleSave} disabled={updateProfile.isPending || upsertSchedule.isPending} className="w-full sm:w-auto">
            {(updateProfile.isPending || upsertSchedule.isPending) ? t("common.saving") : t("common.save")}
          </Button>
        </div>

        <Separator />

        <SubscriptionSection />
      </div>
    </AppLayout>
  );
}
