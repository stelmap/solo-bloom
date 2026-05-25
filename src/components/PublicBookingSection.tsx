import { useEffect, useMemo, useRef, useState } from "react";
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
import { Copy, RefreshCw, Loader2, ExternalLink, Check } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useWorkingSchedule } from "@/hooks/useData";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
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

export function PublicBookingSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

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

  const updateTimezone = useMutation({
    mutationFn: async (tz: string) => {
      const { error } = await supabase.from("profiles").update({ timezone: tz } as any).eq("user_id", userId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile_tz", userId] }),
  });

  // Auto-detect timezone from browser if not set yet
  useEffect(() => {
    if (!userId || !profile) return;
    if (!profile.timezone) {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (browserTz) updateTimezone.mutate(browserTz);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, profile]);

  const tzOptions = useMemo(() => {
    try {
      // @ts-ignore
      const all: string[] = (Intl as any).supportedValuesOf?.("timeZone") ?? [];
      return all;
    } catch {
      return [];
    }
  }, []);

  const { data: availability } = useQuery({
    queryKey: ["booking_availability", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("booking_availability").select("*").order("weekday");
      return data || [];
    },
  });

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

  const updateLink = useMutation({
    mutationFn: async (patch: Partial<{ is_active: boolean; mode: "manual" | "auto"; display_name: string }>) => {
      const { error } = await supabase.from("booking_links").update(patch).eq("user_id", userId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booking_link", userId] }),
  });

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

  const setSlug = useMutation({
    mutationFn: async (slug: string) => {
      const { error } = await supabase.rpc("set_booking_link_slug", { p_slug: slug });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Handle updated" });
      qc.invalidateQueries({ queryKey: ["booking_link", userId] });
    },
    onError: (e: any) =>
      toast({ title: "Could not update handle", description: e.message, variant: "destructive" }),
  });

  const [slugInput, setSlugInput] = useState("");
  useEffect(() => {
    setSlugInput((link as any)?.slug ?? "");
  }, [link?.id, (link as any)?.slug]);

  const handle = (link as any)?.slug || link?.token || "";
  const url = handle ? `${window.location.origin}/book/${handle}` : "";

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
            <Switch
              id="bk-active"
              checked={!!link?.is_active}
              onCheckedChange={(v) => updateLink.mutate({ is_active: v })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bk-display">Display name (shown to clients)</Label>
            <Input
              id="bk-display"
              defaultValue={link?.display_name || ""}
              onBlur={(e) => updateLink.mutate({ display_name: e.target.value })}
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
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                onBlur={() => {
                  if (slugInput !== ((link as any)?.slug ?? "")) setSlug.mutate(slugInput);
                }}
                placeholder="your-name"
                maxLength={40}
                className="flex-1 px-3 py-2 text-sm bg-background outline-none"
              />
              <span className="px-3 flex items-center text-xs text-muted-foreground">
                {setSlug.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              3–40 chars: lowercase letters, digits, hyphens. Leave empty to fall back to the auto-generated secret link.
            </p>
          </div>



          <div className="space-y-2">
            <Label>Booking mode</Label>
            <Select value={link?.mode || "manual"} onValueChange={(v) => updateLink.mutate({ mode: v as any })}>
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
              <Select
                value={profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                onValueChange={(v) => updateTimezone.mutate(v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {tzOptions.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={profile?.timezone || ""}
                onChange={(e) => updateTimezone.mutate(e.target.value)}
                placeholder="e.g. Europe/Kyiv"
              />
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

      <AvailabilityCard userId={userId} availability={availability || []} />
    </div>
  );
}

function AvailabilityCard({
  userId,
  availability,
}: {
  userId: string | undefined;
  availability: any[];
}) {
  const qc = useQueryClient();
  const { t } = useLanguage();
  const { data: workingSchedule } = useWorkingSchedule();

  const tx = (key: string, fallback: string) => {
    const v = t(key as any);
    return !v || v === key ? fallback : v;
  };

  const [inherit, setInheritState] = useState<boolean>(() => getInheritFlag(userId));
  useEffect(() => { setInheritState(getInheritFlag(userId)); }, [userId]);

  const byDay = useMemo(() => {
    const m: Record<number, any> = {};
    for (const r of availability) m[r.weekday] = r;
    return m;
  }, [availability]);

  // When inheritance is ON, derive display rows from the working schedule
  const inheritedByDay = useMemo(() => {
    const m: Record<number, { is_enabled: boolean; start_time: string; end_time: string }> = {};
    if (workingSchedule && workingSchedule.length > 0) {
      for (const ws of workingSchedule) {
        m[dowToWeekday(ws.day_of_week)] = {
          is_enabled: ws.is_working,
          start_time: ws.start_time,
          end_time: ws.end_time,
        };
      }
    }
    return m;
  }, [workingSchedule]);

  // shared settings come from first row, or sensible defaults
  const shared = availability[0] || {
    session_duration_minutes: 60,
    buffer_minutes: 10,
    min_notice_hours: 24,
    max_horizon_days: 30,
  };
  const [duration, setDuration] = useState(shared.session_duration_minutes);
  const [buffer, setBuffer] = useState(shared.buffer_minutes);
  const [minNotice, setMinNotice] = useState(shared.min_notice_hours);
  const [maxHorizon, setMaxHorizon] = useState(shared.max_horizon_days);

  useEffect(() => {
    if (availability[0]) {
      setDuration(availability[0].session_duration_minutes);
      setBuffer(availability[0].buffer_minutes);
      setMinNotice(availability[0].min_notice_hours);
      setMaxHorizon(availability[0].max_horizon_days);
    }
  }, [availability]);

  // Auto-sync booking_availability from working schedule when inheritance is ON
  useEffect(() => {
    if (!userId || !inherit || !workingSchedule || workingSchedule.length === 0) return;
    syncBookingAvailabilityFromSchedule(userId, workingSchedule).then(() => {
      qc.invalidateQueries({ queryKey: ["booking_availability", userId] });
    }).catch(() => {});
  }, [userId, inherit, workingSchedule, qc]);

  const handleToggleInherit = (on: boolean) => {
    if (!userId) return;
    setInheritFlag(userId, on);
    setInheritState(on);
    if (on && workingSchedule && workingSchedule.length > 0) {
      syncBookingAvailabilityFromSchedule(userId, workingSchedule).then(() => {
        qc.invalidateQueries({ queryKey: ["booking_availability", userId] });
        toast({ title: tx("settings.bookingInheritedFromSchedule", "Public booking now follows your working schedule") });
      }).catch(() => {});
    }
  };

  const upsertDay = useMutation({
    mutationFn: async (row: {
      weekday: number;
      is_enabled: boolean;
      start_time: string;
      end_time: string;
    }) => {
      if (!userId) return;
      const existing = byDay[row.weekday];
      const payload = {
        user_id: userId,
        weekday: row.weekday,
        is_enabled: row.is_enabled,
        start_time: row.start_time,
        end_time: row.end_time,
        session_duration_minutes: duration,
        buffer_minutes: buffer,
        min_notice_hours: minNotice,
        max_horizon_days: maxHorizon,
      };
      if (existing) {
        const { error } = await supabase.from("booking_availability").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("booking_availability").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booking_availability", userId] }),
  });

  const saveShared = useMutation({
    mutationFn: async (vals: { duration: number; buffer: number; minNotice: number; maxHorizon: number }) => {
      if (!userId) return;
      const { error } = await supabase
        .from("booking_availability")
        .update({
          session_duration_minutes: vals.duration,
          buffer_minutes: vals.buffer,
          min_notice_hours: vals.minNotice,
          max_horizon_days: vals.maxHorizon,
        })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking_availability", userId] });
    },
  });

  // Autosave shared rules (debounced) once values are hydrated
  const debouncedRules = useDebouncedValue({ duration, buffer, minNotice, maxHorizon }, 700);
  const rulesHydrated = useRef(false);
  useEffect(() => {
    if (!userId || availability.length === 0) return;
    if (!rulesHydrated.current) { rulesHydrated.current = true; return; }
    saveShared.mutate(debouncedRules);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedRules, userId]);


  const displayRow = (weekday: number) => {
    if (inherit) {
      const ws = inheritedByDay[weekday];
      return {
        enabled: !!ws?.is_enabled,
        start: (ws?.start_time || "09:00").slice(0, 5),
        end: (ws?.end_time || "18:00").slice(0, 5),
      };
    }
    const row = byDay[weekday];
    return {
      enabled: !!row?.is_enabled,
      start: row?.start_time?.slice(0, 5) || "09:00",
      end: row?.end_time?.slice(0, 5) || "18:00",
    };
  };

  return (
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
            onCheckedChange={(v) => handleToggleInherit(!!v)}
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
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
          {saveShared.isPending ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> {tx("common.saving", "Saving…")}</>
          ) : (
            <><Check className="h-3 w-3 text-primary" /> {tx("settings.autosaved", "Changes save automatically")}</>
          )}
        </p>


        <div className="space-y-2 pt-2 border-t">
          {inherit && (
            <p className="text-xs text-muted-foreground italic pb-1">
              {tx("settings.inheritedReadOnly", "Inherited from your working schedule. Uncheck the option above to customize.")}
            </p>
          )}
          {WEEKDAY_KEYS.map((dayKey, weekday) => {
            const { enabled, start, end } = displayRow(weekday);
            const disabled = inherit;
            return (
              <div key={weekday} className="flex items-center gap-3 py-1">
                <div className="flex items-center gap-2 w-32">
                  <Checkbox
                    checked={enabled}
                    disabled={disabled}
                    onCheckedChange={(v) =>
                      upsertDay.mutate({ weekday, is_enabled: !!v, start_time: start, end_time: end })
                    }
                  />
                  <span className="text-sm">{tx(dayKey, dayKey)}</span>
                </div>
                <Input
                  type="time"
                  value={start}
                  disabled={disabled || !enabled}
                  onChange={(e) =>
                    upsertDay.mutate({ weekday, is_enabled: enabled, start_time: e.target.value, end_time: end })
                  }
                  className="w-28"
                />
                <span className="text-muted-foreground text-xs">{tx("common.to", "to")}</span>
                <Input
                  type="time"
                  value={end}
                  disabled={disabled || !enabled}
                  onChange={(e) =>
                    upsertDay.mutate({ weekday, is_enabled: enabled, start_time: start, end_time: e.target.value })
                  }
                  className="w-28"
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
