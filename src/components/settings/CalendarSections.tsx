import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-time-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  useProfile, useUpdateProfile, useWorkingSchedule, useUpsertWorkingSchedule,
  useDaysOff, useCreateDayOff, useDeleteDayOff, useBulkCancelForDayOff,
} from "@/hooks/useData";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Plus, Trash2, CalendarOff, Image as ImageIcon, Check, Loader2 } from "lucide-react";
import { syncBookingAvailabilityFromSchedule, getInheritFlag } from "@/lib/bookingAvailabilitySync";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);
const DAY_FULL_KEYS = ["day.monday", "day.tuesday", "day.wednesday", "day.thursday", "day.friday", "day.saturday", "day.sunday"] as const;
const DEFAULT_SCHEDULE = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i + 1, is_working: i < 5, start_time: "09:00", end_time: "18:00",
}));

function SaveStatus({ pending, savedAt }: { pending: boolean; savedAt: number | null }) {
  const { t } = useLanguage();
  const [showSaved, setShowSaved] = useState(false);
  useEffect(() => {
    if (savedAt) {
      setShowSaved(true);
      const id = setTimeout(() => setShowSaved(false), 1500);
      return () => clearTimeout(id);
    }
  }, [savedAt]);
  if (pending) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> {t("common.saving")}
      </span>
    );
  }
  if (showSaved) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Check className="h-3 w-3 text-primary" /> {t("settings.saved")}
      </span>
    );
  }
  return null;
}

export function WorkingHoursSection() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: workingSchedule } = useWorkingSchedule();
  const upsertSchedule = useUpsertWorkingSchedule();

  const [form, setForm] = useState({
    work_hours_start: "09:00", work_hours_end: "18:00", time_format: "24h", default_duration: 60,
  });
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);

  useEffect(() => {
    if (profile) {
      setForm({
        work_hours_start: (profile as any).work_hours_start || "09:00",
        work_hours_end: (profile as any).work_hours_end || "18:00",
        time_format: (profile as any).time_format || "24h",
        default_duration: (profile as any).default_duration || 60,
      });
    }
  }, [profile]);

  useEffect(() => {
    if (workingSchedule && workingSchedule.length > 0) {
      setSchedule(workingSchedule.map(ws => ({
        day_of_week: ws.day_of_week, is_working: ws.is_working,
        start_time: ws.start_time, end_time: ws.end_time,
      })));
    }
  }, [workingSchedule]);

  const updateScheduleDay = (dayOfWeek: number, updates: Partial<typeof schedule[0]>) => {
    setSchedule(prev => prev.map(d => d.day_of_week === dayOfWeek ? { ...d, ...updates } : d));
  };

  const [savedAt, setSavedAt] = useState<number | null>(null);
  const isPending = updateProfile.isPending || upsertSchedule.isPending;

  const handleSave = async () => {
    try {
      await Promise.all([
        updateProfile.mutateAsync(form),
        upsertSchedule.mutateAsync(schedule),
      ]);
      if (user && getInheritFlag(user.id)) {
        try { await syncBookingAvailabilityFromSchedule(user.id, schedule); } catch {}
      }
      setSavedAt(Date.now());
      toast({ title: t("settings.saved") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{t("settings.calendar")}</h2>
          <SaveStatus pending={isPending} savedAt={savedAt} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("settings.workHoursStart")}</Label>
            <Select value={form.work_hours_start} onValueChange={v => setForm(f => ({ ...f, work_hours_start: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{HOUR_OPTIONS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("settings.workHoursEnd")}</Label>
            <Select value={form.work_hours_end} onValueChange={v => setForm(f => ({ ...f, work_hours_end: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{HOUR_OPTIONS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("settings.timeFormat")}</Label>
            <Select value={form.time_format} onValueChange={v => setForm(f => ({ ...f, time_format: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">{t("settings.24h")}</SelectItem>
                <SelectItem value="12h">{t("settings.12h")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="default-duration">{t("settings.defaultDuration")}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="default-duration"
                type="number"
                min={5}
                max={480}
                step={5}
                value={form.default_duration}
                onChange={e => {
                  const n = parseInt(e.target.value);
                  setForm(f => ({ ...f, default_duration: Number.isFinite(n) ? n : 0 }));
                }}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[30, 45, 50, 60, 75, 90, 120].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, default_duration: v }))}
                  className={cn(
                    "text-xs px-2 py-1 rounded-md border transition-colors",
                    form.default_duration === v
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted",
                  )}
                >
                  {v} min
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
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
                  <Select value={day.start_time} onValueChange={v => updateScheduleDay(day.day_of_week, { start_time: v })}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>{HOUR_OPTIONS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                  <span className="text-muted-foreground text-sm">–</span>
                  <Select value={day.end_time} onValueChange={v => updateScheduleDay(day.day_of_week, { end_time: v })}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>{HOUR_OPTIONS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground italic">{t("settings.dayOff")}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("common.saving")}</>) : t("common.save")}
        </Button>
      </div>
    </div>
  );
}

export function DaysOffSection() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: daysOff = [] } = useDaysOff();
  const createDayOff = useCreateDayOff();
  const deleteDayOff = useDeleteDayOff();
  const bulkCancelForDayOff = useBulkCancelForDayOff();

  const [dayOffOpen, setDayOffOpen] = useState(false);
  const [dayOffForm, setDayOffForm] = useState({ date: "", type: "day_off", label: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [affectedAppointments, setAffectedAppointments] = useState<string[]>([]);
  const [checkingAffected, setCheckingAffected] = useState(false);

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

  const handleAddDayOff = async () => {
    if (!dayOffForm.date) return;
    setCheckingAffected(true);
    try {
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

  const handleConfirmDayOff = async () => {
    try {
      const reason = dayOffForm.label?.trim() ? dayOffForm.label.trim() : dayOffTypeLabel(dayOffForm.type);
      await createDayOff.mutateAsync({
        date: dayOffForm.date, type: dayOffForm.type,
        label: dayOffForm.label || undefined, is_non_working: true,
      });
      if (affectedAppointments.length > 0) {
        await bulkCancelForDayOff.mutateAsync({ appointmentIds: affectedAppointments, reason });
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

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">{t("settings.daysOff")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("settings.daysOffDesc")}</p>
        </div>
        <Dialog open={dayOffOpen} onOpenChange={setDayOffOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> {t("settings.addDayOff")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("settings.addDayOff")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>{t("common.date")} *</Label><Input type="date" value={dayOffForm.date} onChange={e => setDayOffForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>{t("settings.dayOffType")}</Label>
                <Select value={dayOffForm.type} onValueChange={v => setDayOffForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day_off">{t("settings.dayOff")}</SelectItem>
                    <SelectItem value="vacation">{t("settings.vacation")}</SelectItem>
                    <SelectItem value="holiday">{t("settings.holiday")}</SelectItem>
                    <SelectItem value="sick">{t("settings.sickDay")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>{t("settings.dayOffLabel")}</Label><Input value={dayOffForm.label} onChange={e => setDayOffForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Christmas" /></div>
              <Button onClick={handleAddDayOff} className="w-full" disabled={checkingAffected || !dayOffForm.date}>
                {checkingAffected ? t("common.adding") : t("settings.addDayOff")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("settings.dayOffConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {affectedAppointments.length > 0
                  ? t("settings.dayOffConfirmDesc").replace("{count}", String(affectedAppointments.length))
                  : t("settings.dayOffConfirmNone")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={createDayOff.isPending || bulkCancelForDayOff.isPending}>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDayOff} disabled={createDayOff.isPending || bulkCancelForDayOff.isPending}>
                {createDayOff.isPending || bulkCancelForDayOff.isPending ? t("common.saving") : t("common.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
  );
}

export function PracticeProfileSection() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const [form, setForm] = useState({
    full_name: "",
    business_name: "",
    phone: "",
    business_address: "",
    public_email: "",
    avatar_url: "" as string,
    show_practice_profile_on_booking: true,
  });
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        business_name: profile.business_name || "",
        phone: profile.phone || "",
        business_address: (profile as any).business_address || "",
        public_email: (profile as any).public_email || "",
        avatar_url: (profile as any).avatar_url || "",
        show_practice_profile_on_booking:
          (profile as any).show_practice_profile_on_booking ?? true,
      });
    }
  }, [profile]);

  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(form as any);
      setSavedAt(Date.now());
      toast({ title: t("settings.saved") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: t("common.error"), description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t("common.error"), description: "Image must be smaller than 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("practice-avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("practice-avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      await updateProfile.mutateAsync({ avatar_url: url } as any);
      setForm((f) => ({ ...f, avatar_url: url }));
      toast({ title: t("settings.saved") });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      await updateProfile.mutateAsync({ avatar_url: null } as any);
      setForm((f) => ({ ...f, avatar_url: "" }));
      toast({ title: t("settings.saved") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">{t("settings.practiceProfile")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("settings.practiceProfileDesc")}</p>
        </div>
        <SaveStatus pending={updateProfile.isPending} savedAt={savedAt} />
      </div>

      <div className="flex items-start gap-4">
        <div className="relative h-20 w-20 rounded-xl bg-muted border border-dashed border-border flex items-center justify-center text-muted-foreground shrink-0 overflow-hidden">
          {form.avatar_url ? (
            <img src={form.avatar_url} alt="Practice avatar" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-7 w-7" />
          )}
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" disabled={uploading}>
              <label className="cursor-pointer">
                {uploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("common.uploading") || "Uploading…"}</>
                ) : form.avatar_url ? (
                  t("settings.replacePhoto") || "Replace photo"
                ) : (
                  t("settings.uploadPhoto") || "Upload photo"
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </label>
            </Button>
            {form.avatar_url && (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemoveImage} disabled={uploading}>
                <Trash2 className="h-4 w-4 mr-1" /> {t("common.remove") || "Remove"}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t("settings.photoHint") || "PNG, JPG up to 5MB."}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2"><Label>{t("settings.displayName")}</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Dr. Jane Doe" /></div>
        <div className="space-y-2"><Label>{t("common.businessName")}</Label><Input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} /></div>
        <div className="space-y-2"><Label>{t("common.phone")}</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
        <div className="space-y-2"><Label>{t("settings.businessAddress")}</Label><Input value={form.business_address} onChange={e => setForm(f => ({ ...f, business_address: e.target.value }))} /></div>
        <div className="space-y-2 sm:col-span-2">
          <Label>{t("settings.publicEmail") || "Public email (shown on booking page)"}</Label>
          <Input
            type="email"
            value={form.public_email}
            onChange={e => setForm(f => ({ ...f, public_email: e.target.value }))}
            placeholder={user?.email || ""}
          />
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex-1">
          <Label htmlFor="show-practice-profile" className="cursor-pointer">
            {t("settings.showPracticeProfileOnBooking") || "Show practice profile on public booking page"}
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            {t("settings.showPracticeProfileOnBookingHint") || "When enabled, your photo, business name, address and email are shown to clients on your booking page."}
          </p>
        </div>
        <Switch
          id="show-practice-profile"
          checked={form.show_practice_profile_on_booking}
          onCheckedChange={(v) => setForm((f) => ({ ...f, show_practice_profile_on_booking: v }))}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={updateProfile.isPending}>
          {updateProfile.isPending ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("common.saving")}</>) : t("common.save")}
        </Button>
      </div>
    </div>
  );
}
