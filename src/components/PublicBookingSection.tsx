import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Copy, RefreshCw, Loader2, ExternalLink } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useWorkingSchedule } from "@/hooks/useData";
import {
  syncBookingAvailabilityFromSchedule,
  getInheritFlag,
  setInheritFlag,
  dowToWeekday,
} from "@/lib/bookingAvailabilitySync";

const WEEKDAY_KEYS = [
  "day.sunday", "day.monday", "day.tuesday", "day.wednesday",
  "day.thursday", "day.friday", "day.saturday",
] as const;

type DayRow = { is_enabled: boolean; start_time: string; end_time: string };

export function PublicBookingSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;
  const { t } = useLanguage();
  const tx = (key: string, fallback: string) => {
    const v = t(key as any);
    return !v || v === key ? fallback : v;
  };

  const { data: link } = useQuery({
    queryKey: ["booking_link", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("booking_links").select("*").maybeSingle();
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile_tz", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("timezone").eq("user_id", userId!).maybeSingle();
      return data;
    },
  });

  const { data: availability } = useQuery({
    queryKey: ["booking_availability", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("booking_availability").select("*").order("weekday");
      return data || [];
    },
  });

  const { data: workingSchedule } = useWorkingSchedule();

  const ensureLink = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase.from("booking_links").insert({ user_id: userId } as any);
      if (error && !String(error.message).includes("duplicate")) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booking_link", userId] }),
  });

  useEffect(() => {
    if (userId && link === null) ensureLink.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, link]);

  // ===== Local form state =====
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [timezone, setTimezone] = useState("");
  const [inherit, setInheritState] = useState<boolean>(false);
  const [days, setDays] = useState<Record<number, DayRow>>({});
  const [duration, setDuration] = useState(60);
  const [buffer, setBuffer] = useState(10);
  const [minNotice, setMinNotice] = useState(24);
  const [maxHorizon, setMaxHorizon] = useState(30);

  // Hydrate from server
  useEffect(() => {
    if (link) {
      setIsActive(!!link.is_active);
      setMode(((link as any).mode as any) || "manual");
      setDisplayName(link.display_name || "");
      setSlug(((link as any).slug as string) || "");
    }
  }, [link]);

  useEffect(() => {
    if (profile?.timezone) setTimezone(profile.timezone);
    else if (!profile?.timezone && profile) setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [profile]);

  useEffect(() => {
    if (userId) setInheritState(getInheritFlag(userId));
  }, [userId]);

  useEffect(() => {
    if (!availability) return;
    const m: Record<number, DayRow> = {};
    for (const r of availability) {
      m[r.weekday] = {
        is_enabled: r.is_enabled,
        start_time: (r.start_time || "09:00").slice(0, 5),
        end_time: (r.end_time || "18:00").slice(0, 5),
      };
    }
    setDays(m);
    if (availability[0]) {
      setDuration(availability[0].session_duration_minutes);
      setBuffer(availability[0].buffer_minutes);
      setMinNotice(availability[0].min_notice_hours);
      setMaxHorizon(availability[0].max_horizon_days);
    }
  }, [availability]);

  // When inheritance is ON, show working schedule values (read-only)
  const displayDays = useMemo(() => {
    if (!inherit) return days;
    if (!workingSchedule) return days;
    const m: Record<number, DayRow> = {};
    for (const ws of workingSchedule) {
      m[dowToWeekday(ws.day_of_week)] = {
        is_enabled: ws.is_working,
        start_time: (ws.start_time || "09:00").slice(0, 5),
        end_time: (ws.end_time || "18:00").slice(0, 5),
      };
    }
    return m;
  }, [inherit, days, workingSchedule]);

  const tzOptions = useMemo(() => {
    try {
      // @ts-ignore
      const all: string[] = (Intl as any).supportedValuesOf?.("timeZone") ?? [];
      return all;
    } catch {
      return [];
    }
  }, []);

  const regenerate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("regenerate_booking_link_token");
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Link regenerated. Old link no longer works." });
      qc.invalidateQueries({ queryKey: ["booking_link", userId] });
    },
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      // 1. Profile timezone
      if (timezone) {
        const { error } = await supabase.from("profiles").update({ timezone } as any).eq("user_id", userId);
        if (error) throw error;
      }

      // 2. Booking link basic fields
      const linkPatch: any = { is_active: isActive, mode, display_name: displayName };
      const { error: linkErr } = await supabase.from("booking_links").update(linkPatch).eq("user_id", userId);
      if (linkErr) throw linkErr;

      // 3. Slug if changed
      if (slug !== (((link as any)?.slug as string) || "")) {
        const { error: slugErr } = await supabase.rpc("set_booking_link_slug", { p_slug: slug });
        if (slugErr) throw slugErr;
      }

      // 4. Inheritance flag + availability
      setInheritFlag(userId, inherit);
      if (inherit && workingSchedule && workingSchedule.length > 0) {
        await syncBookingAvailabilityFromSchedule(userId, workingSchedule);
        // Then update shared rules on top
        await supabase
          .from("booking_availability")
          .update({
            session_duration_minutes: duration,
            buffer_minutes: buffer,
            min_notice_hours: minNotice,
            max_horizon_days: maxHorizon,
          })
          .eq("user_id", userId);
      } else {
        // Save each weekday row
        const byDayServer: Record<number, any> = {};
        for (const r of availability || []) byDayServer[r.weekday] = r;
        for (let wd = 0; wd < 7; wd++) {
          const row = days[wd] || { is_enabled: false, start_time: "09:00", end_time: "18:00" };
          const payload = {
            user_id: userId,
            weekday: wd,
            is_enabled: row.is_enabled,
            start_time: row.start_time,
            end_time: row.end_time,
            session_duration_minutes: duration,
            buffer_minutes: buffer,
            min_notice_hours: minNotice,
            max_horizon_days: maxHorizon,
          };
          const existing = byDayServer[wd];
          if (existing) {
            const { error } = await supabase.from("booking_availability").update(payload).eq("id", existing.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from("booking_availability").insert(payload as any);
            if (error) throw error;
          }
        }
      }

      qc.invalidateQueries({ queryKey: ["booking_link", userId] });
      qc.invalidateQueries({ queryKey: ["profile_tz", userId] });
      qc.invalidateQueries({ queryKey: ["booking_availability", userId] });
      toast({ title: tx("settings.saved", "Saved") });
    } catch (e: any) {
      toast({ title: tx("common.error", "Error"), description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handle = slug || link?.token || "";
  const url = handle ? `${window.location.origin}/book/${handle}` : "";

  const updateDay = (wd: number, patch: Partial<DayRow>) => {
    setDays((prev) => ({
      ...prev,
      [wd]: { ...(prev[wd] || { is_enabled: false, start_time: "09:00", end_time: "18:00" }), ...patch },
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Public booking link</CardTitle>
          <CardDescription>
            Share a single link clients can use to book a session. They only see free time — never any private calendar
            data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="bk-active">Enable public booking</Label>
            <Switch id="bk-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bk-display">Display name (shown to clients)</Label>
            <Input
              id="bk-display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name or practice"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bk-slug">Custom handle (optional)</Label>
            <div className="flex items-stretch rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring">
              <span className="px-3 flex items-center text-xs text-muted-foreground bg-muted border-r border-input whitespace-nowrap">
                {typeof window !== "undefined" ? window.location.host : ""}/book/
              </span>
              <input
                id="bk-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="your-name"
                maxLength={40}
                className="flex-1 px-3 py-2 text-sm bg-background outline-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              3–40 chars: lowercase letters, digits, hyphens. Leave empty to fall back to the auto-generated secret link.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Booking mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual approval (recommended)</SelectItem>
                <SelectItem value="auto">Auto-confirm (matched clients only)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Timezone (shown to clients)</Label>
            {tzOptions.length > 0 ? (
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {tzOptions.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="e.g. Europe/Kyiv" />
            )}
            <p className="text-xs text-muted-foreground">
              All booking times on the public page will be shown in this timezone.
            </p>
          </div>

          {url && (
            <div className="space-y-2">
              <Label>Your booking link</Label>
              <div className="flex gap-2">
                <Input value={url} readOnly className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(url);
                    toast({ title: "Link copied" });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (confirm("Regenerate link? The old link will stop working immediately.")) regenerate.mutate();
                  }}
                  disabled={regenerate.isPending}
                >
                  {regenerate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tx("settings.availability", "Availability")}</CardTitle>
          <CardDescription>
            {tx("settings.availabilityDesc", "Days, hours and rules used to compute the free slots shown to clients.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
            <Checkbox
              id="inherit-schedule"
              checked={inherit}
              onCheckedChange={(v) => setInheritState(!!v)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label htmlFor="inherit-schedule" className="cursor-pointer">
                {tx("settings.useWorkingScheduleForBooking", "Use my working schedule for public booking")}
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {tx(
                  "settings.useWorkingScheduleForBookingHelper",
                  "Public booking uses your working schedule by default. You can customize it if you want to offer fewer public booking slots than your full working hours.",
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{tx("settings.sessionLength", "Session length (min)")}</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={15} max={240} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tx("settings.bufferMin", "Buffer (min)")}</Label>
              <Input type="number" value={buffer} onChange={(e) => setBuffer(Number(e.target.value))} min={0} max={120} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tx("settings.minNoticeHours", "Min notice (hours)")}</Label>
              <Input type="number" value={minNotice} onChange={(e) => setMinNotice(Number(e.target.value))} min={0} max={336} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tx("settings.maxHorizonDays", "Max horizon (days)")}</Label>
              <Input type="number" value={maxHorizon} onChange={(e) => setMaxHorizon(Number(e.target.value))} min={1} max={365} />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            {inherit && (
              <p className="text-xs text-muted-foreground italic pb-1">
                {tx("settings.inheritedReadOnly", "Inherited from your working schedule. Uncheck the option above to customize.")}
              </p>
            )}
            {WEEKDAY_KEYS.map((dayKey, weekday) => {
              const row = displayDays[weekday] || { is_enabled: false, start_time: "09:00", end_time: "18:00" };
              const disabled = inherit;
              return (
                <div key={weekday} className="flex items-center gap-3 py-1">
                  <div className="flex items-center gap-2 w-32">
                    <Checkbox
                      checked={row.is_enabled}
                      disabled={disabled}
                      onCheckedChange={(v) => updateDay(weekday, { is_enabled: !!v })}
                    />
                    <span className="text-sm">{tx(dayKey, dayKey)}</span>
                  </div>
                  <Input
                    type="time"
                    value={row.start_time}
                    disabled={disabled || !row.is_enabled}
                    onChange={(e) => updateDay(weekday, { start_time: e.target.value })}
                    className="w-28"
                  />
                  <span className="text-muted-foreground text-xs">{tx("common.to", "to")}</span>
                  <Input
                    type="time"
                    value={row.end_time}
                    disabled={disabled || !row.is_enabled}
                    onChange={(e) => updateDay(weekday, { end_time: e.target.value })}
                    className="w-28"
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{tx("common.saving", "Saving…")}</>) : tx("common.save", "Save Changes")}
        </Button>
      </div>
    </div>
  );
}
