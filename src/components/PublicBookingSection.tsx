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
import { Copy, RefreshCw, Loader2, ExternalLink, Plus, X } from "lucide-react";
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

type Interval = { start: string; end: string };
type DayState = { is_enabled: boolean; intervals: Interval[] };

type Lang = "en" | "uk" | "ru" | "fr" | "pl";
const normLang = (v: unknown): Lang => {
  const s = String(v || "en").toLowerCase();
  return (["en", "uk", "ru", "fr", "pl"].includes(s) ? s : "en") as Lang;
};

const COPY: Record<Lang, {
  cardTitle: string; cardDesc: string;
  enable: string; displayName: string; displayNamePh: string;
  customHandle: string; handleHelp: string; handlePh: string;
  mode: string; modeManual: string; modeAuto: string;
  timezone: string; timezoneHelp: string; tzPh: string;
  yourLink: string; linkCopied: string; linkRegenerated: string;
  regenerateConfirm: string;
  addBlock: string; removeBlock: string;
  errOrder: string; errOverlap: string; errEmpty: string;
}> = {
  en: {
    cardTitle: "Public booking link",
    cardDesc: "Share a single link clients can use to book a session. They only see free time — never any private calendar data.",
    enable: "Enable public booking",
    displayName: "Display name (shown to clients)",
    displayNamePh: "Your name or practice",
    customHandle: "Custom handle (optional)",
    handleHelp: "3–40 chars: lowercase letters, digits, hyphens. Leave empty to fall back to the auto-generated secret link.",
    handlePh: "your-name",
    mode: "Booking mode",
    modeManual: "Manual approval (recommended)",
    modeAuto: "Auto-confirm (matched clients only)",
    timezone: "Timezone (shown to clients)",
    timezoneHelp: "All booking times on the public page will be shown in this timezone.",
    tzPh: "e.g. Europe/Kyiv",
    yourLink: "Your booking link",
    linkCopied: "Link copied",
    linkRegenerated: "Link regenerated. Old link no longer works.",
    regenerateConfirm: "Regenerate link? The old link will stop working immediately.",
    addBlock: "Add time block",
    removeBlock: "Remove time block",
    errOrder: "Start time must be before end time",
    errOverlap: "Time blocks cannot overlap",
    errEmpty: "Enabled days need at least one time block",
  },
  uk: {
    cardTitle: "Посилання для публічного бронювання",
    cardDesc: "Поділіться одним посиланням, за яким клієнти зможуть забронювати сесію. Вони бачать лише вільний час — жодних приватних даних календаря.",
    enable: "Увімкнути публічне бронювання",
    displayName: "Ім'я для відображення (видно клієнтам)",
    displayNamePh: "Ваше ім'я або практика",
    customHandle: "Власний ідентифікатор (опційно)",
    handleHelp: "3–40 символів: малі літери, цифри, дефіси. Залиште порожнім, щоб використати автоматично згенероване секретне посилання.",
    handlePh: "ваше-імʼя",
    mode: "Режим бронювання",
    modeManual: "Ручне підтвердження (рекомендовано)",
    modeAuto: "Авто-підтвердження (лише для відомих клієнтів)",
    timezone: "Часовий пояс (видно клієнтам)",
    timezoneHelp: "Усі часи бронювання на публічній сторінці показуватимуться в цьому часовому поясі.",
    tzPh: "напр. Europe/Kyiv",
    yourLink: "Ваше посилання для бронювання",
    linkCopied: "Посилання скопійовано",
    linkRegenerated: "Посилання оновлено. Старе більше не працює.",
    regenerateConfirm: "Згенерувати нове посилання? Старе перестане працювати негайно.",
    addBlock: "Додати інтервал",
    removeBlock: "Видалити інтервал",
    errOrder: "Час початку має бути раніше часу завершення",
    errOverlap: "Інтервали не можуть перетинатися",
    errEmpty: "Увімкнені дні потребують щонайменше одного інтервалу",
  },
  fr: {
    cardTitle: "Lien de réservation public",
    cardDesc: "Partagez un seul lien que vos clients peuvent utiliser pour réserver une séance. Ils ne voient que les créneaux libres — jamais vos données privées du calendrier.",
    enable: "Activer la réservation publique",
    displayName: "Nom affiché (visible par les clients)",
    displayNamePh: "Votre nom ou cabinet",
    customHandle: "Identifiant personnalisé (facultatif)",
    handleHelp: "3 à 40 caractères : lettres minuscules, chiffres, tirets. Laisser vide pour utiliser le lien secret généré automatiquement.",
    handlePh: "votre-nom",
    mode: "Mode de réservation",
    modeManual: "Validation manuelle (recommandé)",
    modeAuto: "Confirmation automatique (clients connus uniquement)",
    timezone: "Fuseau horaire (visible par les clients)",
    timezoneHelp: "Tous les horaires affichés sur la page publique seront dans ce fuseau.",
    tzPh: "ex. Europe/Paris",
    yourLink: "Votre lien de réservation",
    linkCopied: "Lien copié",
    linkRegenerated: "Lien régénéré. L'ancien lien ne fonctionne plus.",
    regenerateConfirm: "Régénérer le lien ? L'ancien cessera immédiatement de fonctionner.",
    addBlock: "Ajouter un créneau",
    removeBlock: "Supprimer le créneau",
    errOrder: "L'heure de début doit précéder l'heure de fin",
    errOverlap: "Les créneaux ne peuvent pas se chevaucher",
    errEmpty: "Les jours activés doivent avoir au moins un créneau",
  },
  pl: {
    cardTitle: "Publiczny link do rezerwacji",
    cardDesc: "Udostępnij jeden link, którego klienci mogą użyć do rezerwacji sesji. Widzą tylko wolne terminy — nigdy prywatnych danych kalendarza.",
    enable: "Włącz publiczną rezerwację",
    displayName: "Nazwa wyświetlana (widoczna dla klientów)",
    displayNamePh: "Twoje imię lub nazwa praktyki",
    customHandle: "Własny identyfikator (opcjonalnie)",
    handleHelp: "3–40 znaków: małe litery, cyfry, myślniki. Pozostaw puste, aby użyć automatycznie wygenerowanego sekretnego linku.",
    handlePh: "twoja-nazwa",
    mode: "Tryb rezerwacji",
    modeManual: "Ręczna akceptacja (zalecane)",
    modeAuto: "Auto-potwierdzenie (tylko znani klienci)",
    timezone: "Strefa czasowa (widoczna dla klientów)",
    timezoneHelp: "Wszystkie godziny rezerwacji na publicznej stronie będą w tej strefie czasowej.",
    tzPh: "np. Europe/Warsaw",
    yourLink: "Twój link do rezerwacji",
    linkCopied: "Link skopiowany",
    linkRegenerated: "Link wygenerowany ponownie. Stary link już nie działa.",
    regenerateConfirm: "Wygenerować nowy link? Stary natychmiast przestanie działać.",
    addBlock: "Dodaj blok czasowy",
    removeBlock: "Usuń blok czasowy",
    errOrder: "Czas rozpoczęcia musi być wcześniejszy niż czas zakończenia",
    errOverlap: "Bloki czasowe nie mogą się nakładać",
    errEmpty: "Włączone dni wymagają przynajmniej jednego bloku czasowego",
  },
};

// Generate time options every 15 minutes from 00:00 to 23:45
const TIME_OPTIONS = (() => {
  const arr: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      arr.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return arr;
})();

function TimeSelect({
  value, onChange, disabled, className,
}: { value: string; onChange: (v: string) => void; disabled?: boolean; className?: string }) {
  // Always show provided value, even if not 15-min aligned
  const opts = useMemo(() => {
    if (value && !TIME_OPTIONS.includes(value)) return [value, ...TIME_OPTIONS];
    return TIME_OPTIONS;
  }, [value]);
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className || "w-28"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {opts.map((t) => (
          <SelectItem key={t} value={t}>{t}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const norm = (s: string) => (s && s.length >= 5 ? s.slice(0, 5) : s);
const toMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

function validateDays(days: Record<number, DayState>, L: typeof COPY[Lang]): string | null {
  for (let wd = 0; wd < 7; wd++) {
    const d = days[wd];
    if (!d || !d.is_enabled) continue;
    if (!d.intervals.length) return L.errEmpty;
    for (const iv of d.intervals) {
      if (toMin(iv.start) >= toMin(iv.end)) return L.errOrder;
    }
    const sorted = d.intervals.slice().sort((a, b) => toMin(a.start) - toMin(b.start));
    for (let i = 1; i < sorted.length; i++) {
      if (toMin(sorted[i].start) < toMin(sorted[i - 1].end)) return L.errOverlap;
    }
  }
  return null;
}

export function PublicBookingSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;
  const { t, lang: ctxLang } = useLanguage();
  const L = COPY[normLang(ctxLang)];
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
      const { data } = await supabase
        .from("booking_availability")
        .select("*")
        .order("weekday")
        .order("sort_order")
        .order("start_time");
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
  const [days, setDays] = useState<Record<number, DayState>>({});
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
    const m: Record<number, DayState> = {};
    for (let wd = 0; wd < 7; wd++) m[wd] = { is_enabled: false, intervals: [] };
    for (const r of availability as any[]) {
      const wd = r.weekday as number;
      if (!m[wd]) m[wd] = { is_enabled: false, intervals: [] };
      // Day is enabled if any row for it is enabled
      if (r.is_enabled) m[wd].is_enabled = true;
      if (r.is_enabled) {
        m[wd].intervals.push({
          start: norm(r.start_time || "09:00"),
          end: norm(r.end_time || "18:00"),
        });
      }
    }
    // Sort intervals within each day
    for (const wd of Object.keys(m)) {
      m[+wd].intervals.sort((a, b) => toMin(a.start) - toMin(b.start));
    }
    setDays(m);
    if (availability[0]) {
      setDuration((availability[0] as any).session_duration_minutes);
      setBuffer((availability[0] as any).buffer_minutes);
      setMinNotice((availability[0] as any).min_notice_hours);
      setMaxHorizon((availability[0] as any).max_horizon_days);
    }
  }, [availability]);

  // When inheritance is ON, show working schedule values (read-only)
  const displayDays = useMemo(() => {
    if (!inherit) return days;
    if (!workingSchedule) return days;
    const m: Record<number, DayState> = {};
    for (let wd = 0; wd < 7; wd++) m[wd] = { is_enabled: false, intervals: [] };
    for (const ws of workingSchedule) {
      const wd = dowToWeekday(ws.day_of_week);
      m[wd] = {
        is_enabled: ws.is_working,
        intervals: ws.is_working
          ? [{ start: norm(ws.start_time || "09:00"), end: norm(ws.end_time || "18:00") }]
          : [],
      };
    }
    return m;
  }, [inherit, days, workingSchedule]);

  const validationError = useMemo(() => (inherit ? null : validateDays(days, L)), [inherit, days, L]);

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
      toast({ title: L.linkRegenerated });
      qc.invalidateQueries({ queryKey: ["booking_link", userId] });
    },
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!userId) return;
    if (validationError) {
      toast({ title: tx("common.error", "Error"), description: validationError, variant: "destructive" });
      return;
    }
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
        // Replace all rows for this user with the new interval set.
        const { error: delErr } = await supabase
          .from("booking_availability")
          .delete()
          .eq("user_id", userId);
        if (delErr) throw delErr;

        const rows: any[] = [];
        for (let wd = 0; wd < 7; wd++) {
          const d = days[wd];
          if (d && d.is_enabled && d.intervals.length > 0) {
            const sorted = d.intervals.slice().sort((a, b) => toMin(a.start) - toMin(b.start));
            sorted.forEach((iv, idx) => {
              rows.push({
                user_id: userId,
                weekday: wd,
                is_enabled: true,
                start_time: `${iv.start}:00`,
                end_time: `${iv.end}:00`,
                sort_order: idx,
                session_duration_minutes: duration,
                buffer_minutes: buffer,
                min_notice_hours: minNotice,
                max_horizon_days: maxHorizon,
              });
            });
          } else {
            // Keep a disabled row so settings (duration/buffer/...) survive in case of empty day
            rows.push({
              user_id: userId,
              weekday: wd,
              is_enabled: false,
              start_time: "09:00:00",
              end_time: "18:00:00",
              sort_order: 0,
              session_duration_minutes: duration,
              buffer_minutes: buffer,
              min_notice_hours: minNotice,
              max_horizon_days: maxHorizon,
            });
          }
        }
        if (rows.length > 0) {
          const { error: insErr } = await supabase.from("booking_availability").insert(rows as any);
          if (insErr) throw insErr;
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

  const setDay = (wd: number, patch: Partial<DayState>) => {
    setDays((prev) => {
      const cur = prev[wd] || { is_enabled: false, intervals: [] };
      return { ...prev, [wd]: { ...cur, ...patch } };
    });
  };
  const toggleDay = (wd: number, on: boolean) => {
    setDays((prev) => {
      const cur = prev[wd] || { is_enabled: false, intervals: [] };
      // When turning a day on with no intervals, seed one default block
      const intervals = on && cur.intervals.length === 0
        ? [{ start: "09:00", end: "18:00" }]
        : cur.intervals;
      return { ...prev, [wd]: { is_enabled: on, intervals } };
    });
  };
  const addInterval = (wd: number) => {
    setDays((prev) => {
      const cur = prev[wd] || { is_enabled: true, intervals: [] };
      const last = cur.intervals[cur.intervals.length - 1];
      const start = last ? last.end : "09:00";
      const startMin = toMin(start);
      const end = TIME_OPTIONS.find((t) => toMin(t) > startMin + 30) || "18:00";
      return { ...prev, [wd]: { ...cur, is_enabled: true, intervals: [...cur.intervals, { start, end }] } };
    });
  };
  const removeInterval = (wd: number, idx: number) => {
    setDays((prev) => {
      const cur = prev[wd] || { is_enabled: false, intervals: [] };
      const next = cur.intervals.filter((_, i) => i !== idx);
      return { ...prev, [wd]: { ...cur, intervals: next, is_enabled: cur.is_enabled && next.length > 0 } };
    });
  };
  const updateInterval = (wd: number, idx: number, patch: Partial<Interval>) => {
    setDays((prev) => {
      const cur = prev[wd] || { is_enabled: false, intervals: [] };
      const intervals = cur.intervals.map((iv, i) => (i === idx ? { ...iv, ...patch } : iv));
      return { ...prev, [wd]: { ...cur, intervals } };
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{L.cardTitle}</CardTitle>
          <CardDescription>{L.cardDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="bk-active">{L.enable}</Label>
            <Switch id="bk-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bk-display">{L.displayName}</Label>
            <Input
              id="bk-display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={L.displayNamePh}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bk-slug">{L.customHandle}</Label>
            <div className="flex items-stretch rounded-md border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring">
              <span className="px-3 flex items-center text-xs text-muted-foreground bg-muted border-r border-input whitespace-nowrap">
                {typeof window !== "undefined" ? window.location.host : ""}/book/
              </span>
              <input
                id="bk-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder={L.handlePh}
                maxLength={40}
                className="flex-1 px-3 py-2 text-sm bg-background outline-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">{L.handleHelp}</p>
          </div>

          <div className="space-y-2">
            <Label>{L.mode}</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">{L.modeManual}</SelectItem>
                <SelectItem value="auto">{L.modeAuto}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{L.timezone}</Label>
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
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder={L.tzPh} />
            )}
            <p className="text-xs text-muted-foreground">{L.timezoneHelp}</p>
          </div>

          {url && (
            <div className="space-y-2">
              <Label>{L.yourLink}</Label>
              <div className="flex gap-2">
                <Input value={url} readOnly className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(url);
                    toast({ title: L.linkCopied });
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
                    if (confirm(L.regenerateConfirm)) regenerate.mutate();
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

          <div className="space-y-3 pt-2 border-t">
            {inherit && (
              <p className="text-xs text-muted-foreground italic pb-1">
                {tx("settings.inheritedReadOnly", "Inherited from your working schedule. Uncheck the option above to customize.")}
              </p>
            )}
            {WEEKDAY_KEYS.map((dayKey, weekday) => {
              const row = displayDays[weekday] || { is_enabled: false, intervals: [] as Interval[] };
              const disabled = inherit;
              return (
                <div key={weekday} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-36">
                      <Checkbox
                        checked={row.is_enabled}
                        disabled={disabled}
                        onCheckedChange={(v) => toggleDay(weekday, !!v)}
                      />
                      <span className="text-sm font-medium">{tx(dayKey, dayKey)}</span>
                    </div>
                    {!row.is_enabled && (
                      <span className="text-xs text-muted-foreground">
                        {tx("settings.dayDisabled", "Not available for booking")}
                      </span>
                    )}
                  </div>

                  {row.is_enabled && (
                    <div className="pl-8 space-y-2">
                      {row.intervals.length === 0 && (
                        <p className="text-xs text-destructive">{L.errEmpty}</p>
                      )}
                      {row.intervals.map((iv, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <TimeSelect
                            value={iv.start}
                            disabled={disabled}
                            onChange={(v) => updateInterval(weekday, idx, { start: v })}
                          />
                          <span className="text-muted-foreground text-xs">
                            {tx("common.to", "to")}
                          </span>
                          <TimeSelect
                            value={iv.end}
                            disabled={disabled}
                            onChange={(v) => updateInterval(weekday, idx, { end: v })}
                          />
                          {!disabled && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={L.removeBlock}
                              onClick={() => removeInterval(weekday, idx)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {!disabled && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addInterval(weekday)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {L.addBlock}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !!validationError}>
          {saving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{tx("common.saving", "Saving…")}</>) : tx("common.save", "Save Changes")}
        </Button>
      </div>
    </div>
  );
}
