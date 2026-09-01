import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkingSchedule } from "@/hooks/useData";
import { dowToWeekday } from "@/lib/bookingAvailabilitySync";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import { CalendarDays, Check } from "lucide-react";

type Lang = "en" | "uk" | "ru" | "fr" | "pl";
const normLang = (v: unknown): Lang => {
  const s = String(v || "en").toLowerCase();
  return (["en", "uk", "ru", "fr", "pl"].includes(s) ? s : "en") as Lang;
};

const COPY: Record<Lang, {
  days: string; from: string; until: string; to: string; sync: string;
  errOrder: string; errNoDay: string;
  notice: string; noticeHint: string; horizon: string; horizonHint: string;
  noNotice: string; hours: (n: number) => string; days_: (n: number) => string;
  short: string[]; // Sun..Sat
}> = {
  en: {
    days: "Availability",
    from: "Available from", until: "Available until", to: "to",
    sync: "Busy time and days off are automatically excluded from the public calendar.",
    errOrder: "“Available until” must be later than “Available from”.",
    errNoDay: "Select at least one available day.",
    notice: "Minimum notice", noticeHint: "Slots sooner than this are hidden from the public link.",
    horizon: "Booking horizon", horizonHint: "How far ahead clients can book.",
    noNotice: "No minimum", hours: (n) => `${n} h`, days_: (n) => `${n} days`,
    short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },
  uk: {
    days: "Доступність",
    from: "Доступно з", until: "Доступно до", to: "до",
    sync: "Зайнятий час і вихідні автоматично виключаються з публічного календаря.",
    errOrder: "«Доступно до» має бути пізніше за «Доступно з».",
    errNoDay: "Оберіть щонайменше один доступний день.",
    notice: "Мінімальний час до запису", noticeHint: "Слоти раніше цього часу не показуються в публічному посиланні.",
    horizon: "Горизонт запису", horizonHint: "Наскільки наперед клієнти можуть записатися.",
    noNotice: "Без обмеження", hours: (n) => `${n} год`, days_: (n) => `${n} дн.`,
    short: ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  },
  ru: {
    days: "Доступность",
    from: "Доступно с", until: "Доступно до", to: "до",
    sync: "Занятое время и выходные автоматически исключаются из публичного календаря.",
    errOrder: "«Доступно до» должно быть позже «Доступно с».",
    errNoDay: "Выберите хотя бы один доступный день.",
    notice: "Минимальное время до записи", noticeHint: "Слоты раньше этого времени не показываются в публичной ссылке.",
    horizon: "Горизонт записи", horizonHint: "Насколько заранее клиенты могут записаться.",
    noNotice: "Без ограничения", hours: (n) => `${n} ч`, days_: (n) => `${n} дн.`,
    short: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  },
  fr: {
    days: "Disponibilité",
    from: "Disponible à partir de", until: "Disponible jusqu'à", to: "à",
    sync: "Les créneaux occupés et les jours de congé sont automatiquement exclus du calendrier public.",
    errOrder: "« Disponible jusqu'à » doit être après « Disponible à partir de ».",
    errNoDay: "Sélectionnez au moins un jour disponible.",
    notice: "Préavis minimum", noticeHint: "Les créneaux plus proches sont masqués du lien public.",
    horizon: "Horizon de réservation", horizonHint: "Jusqu'à quand les clients peuvent réserver.",
    noNotice: "Aucun", hours: (n) => `${n} h`, days_: (n) => `${n} jours`,
    short: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
  },
  pl: {
    days: "Dostępność",
    from: "Dostępne od", until: "Dostępne do", to: "do",
    sync: "Zajęty czas i dni wolne są automatycznie wykluczane z publicznego kalendarza.",
    errOrder: "„Dostępne do” musi być późniejsze niż „Dostępne od”.",
    errNoDay: "Wybierz przynajmniej jeden dostępny dzień.",
    notice: "Minimalne wyprzedzenie", noticeHint: "Wcześniejsze terminy są ukryte w publicznym linku.",
    horizon: "Horyzont rezerwacji", horizonHint: "Jak daleko w przód klienci mogą rezerwować.",
    noNotice: "Brak", hours: (n) => `${n} h`, days_: (n) => `${n} dni`,
    short: ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"],
  },
};

const NOTICE_OPTIONS = [0, 1, 2, 3, 6, 12, 24, 48, 72];
const HORIZON_OPTIONS = [7, 14, 30, 60, 90, 180];


const TIME_OPTIONS = (() => {
  const arr: string[] = [];
  for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 15) {
    arr.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return arr;
})();

const norm = (s?: string | null) => (s && s.length >= 5 ? s.slice(0, 5) : s || "");
const toMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Display order Mon..Sun, values are DB weekday numbers (0 = Sunday)
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_DAYS = [1, 2, 3, 4, 5];
const DEFAULT_FROM = "09:00";
const DEFAULT_UNTIL = "18:00";

export type BookingAvailabilityHandle = {
  /** Persist current availability. Throws on validation/DB error. */
  save: () => Promise<void>;
  /** Current validation error message, or null. */
  validate: () => string | null;
};

function TimeSelect({ value, onChange, id, disabled }: { value: string; onChange: (v: string) => void; id?: string; disabled?: boolean }) {
  const opts = useMemo(
    () => (value && !TIME_OPTIONS.includes(value) ? [value, ...TIME_OPTIONS] : TIME_OPTIONS),
    [value],
  );
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className="font-mono h-10"><SelectValue /></SelectTrigger>
      <SelectContent className="max-h-72">
        {opts.map((t) => <SelectItem key={t} value={t} className="font-mono">{t}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

interface Props {
  disabled?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

export const BookingAvailabilitySection = forwardRef<BookingAvailabilityHandle, Props>(
  function BookingAvailabilitySection({ disabled, onDirtyChange }, ref) {
    const { user } = useAuth();
    const userId = user?.id;
    const qc = useQueryClient();
    const { lang } = useLanguage();
    const L = COPY[normLang(lang)];

    const { data: availability, isLoading } = useQuery({
      queryKey: ["booking_availability", userId],
      enabled: !!userId,
      queryFn: async () => {
        const { data } = await supabase
          .from("booking_availability")
          .select("*")
          .eq("user_id", userId!)
          .order("weekday");
        return data || [];
      },
    });
    const { data: workingSchedule } = useWorkingSchedule();

    const [selected, setSelected] = useState<number[]>(DEFAULT_DAYS);
    const [from, setFrom] = useState(DEFAULT_FROM);
    const [until, setUntil] = useState(DEFAULT_UNTIL);
    const [notice, setNotice] = useState(24);
    const [horizon, setHorizon] = useState(30);
    const hydrated = useRef(false);
    const baseline = useRef<string>("");

    const snapshot = (days: number[], s: string, e: string, n: number, h: number) =>
      JSON.stringify({ d: [...days].sort((a, b) => a - b), s, e, n, h });

    // Hydrate: booking_availability → working schedule → Mon–Fri 09:00–18:00
    useEffect(() => {
      if (hydrated.current || !userId || isLoading || !availability) return;
      const rows = availability as any[];
      const enabled = rows.filter((r) => r.is_enabled);
      const n = Number(rows[0]?.min_notice_hours ?? 24);
      const h = Number(rows[0]?.max_horizon_days ?? 30);
      if (enabled.length > 0) {
        const days = Array.from(new Set(enabled.map((r) => r.weekday as number)));
        const s = norm(enabled[0].start_time) || DEFAULT_FROM;
        const e = norm(enabled[0].end_time) || DEFAULT_UNTIL;
        setSelected(days);
        setFrom(s);
        setUntil(e);
        setNotice(n);
        setHorizon(h);
        baseline.current = snapshot(days, s, e, n, h);
        hydrated.current = true;
        return;
      }
      // No availability yet — try working schedule (loaded async)
      if (workingSchedule === undefined) return;
      const working = (workingSchedule || []).filter((w: any) => w.is_working);
      let days = DEFAULT_DAYS;
      let start = DEFAULT_FROM;
      let end = DEFAULT_UNTIL;
      if (working.length > 0) {
        days = Array.from(new Set(working.map((w: any) => dowToWeekday(w.day_of_week))));
        start = norm(working[0].start_time) || DEFAULT_FROM;
        end = norm(working[0].end_time) || DEFAULT_UNTIL;
      }
      setSelected(days);
      setFrom(start);
      setUntil(end);
      setNotice(n);
      setHorizon(h);
      baseline.current = snapshot(days, start, end, n, h);
      hydrated.current = true;
      // Persist the initialized defaults so public slots work immediately.
      void persist(days, start, end, n, h).catch(() => undefined);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availability, isLoading, workingSchedule, userId]);

    const dirty = hydrated.current && baseline.current !== snapshot(selected, from, until, notice, horizon);
    useEffect(() => {
      onDirtyChange?.(dirty);
    }, [dirty, onDirtyChange]);

    const toggleDay = (wd: number) =>
      setSelected((prev) => (prev.includes(wd) ? prev.filter((d) => d !== wd) : [...prev, wd]));

    const error = toMin(until) <= toMin(from)
      ? L.errOrder
      : selected.length === 0
        ? L.errNoDay
        : null;

    async function persist(days: number[], start: string, end: string, noticeHours: number, horizonDays: number) {
      if (!userId) return;
      const base = (availability as any[])?.[0];
      const shared = {
        session_duration_minutes: base?.session_duration_minutes ?? 60,
        buffer_minutes: base?.buffer_minutes ?? 10,
        min_notice_hours: noticeHours,
        max_horizon_days: horizonDays,
      };
      const rows = Array.from({ length: 7 }, (_, wd) => ({
        user_id: userId,
        weekday: wd,
        sort_order: 0,
        is_enabled: days.includes(wd),
        start_time: `${start}:00`,
        end_time: `${end}:00`,
        ...shared,
      }));
      // Replace all rows for this user: an upsert would fire the BEFORE INSERT
      // overlap trigger against the still-existing rows and fail.
      const { error: delErr } = await supabase
        .from("booking_availability")
        .delete()
        .eq("user_id", userId);
      if (delErr) throw delErr;
      const { error: upErr } = await supabase
        .from("booking_availability")
        .insert(rows as any);
      if (upErr) throw upErr;
      await qc.invalidateQueries({ queryKey: ["booking_availability", userId] });
      baseline.current = snapshot(days, start, end, noticeHours, horizonDays);
      onDirtyChange?.(false);
    }


    useImperativeHandle(ref, () => ({
      validate: () => error,
      save: async () => {
        if (error) throw new Error(error);
        await persist(selected, from, until, notice, horizon);
      },
    }));

    return (
      <div className="space-y-3" id="booking-availability">
        <div className="space-y-2">
          <Label className="font-semibold">{L.days}</Label>
          <div className="flex flex-wrap gap-2">
            {DISPLAY_ORDER.map((wd) => {
              const on = selected.includes(wd);
              return (
                <button
                  key={wd}
                  type="button"
                  aria-pressed={on}
                  disabled={disabled}
                  onClick={() => toggleDay(wd)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    on ? "border-primary bg-primary/5 text-foreground" : "border-border hover:bg-accent text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "h-4 w-4 shrink-0 rounded-full border flex items-center justify-center",
                      on ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40",
                    )}
                  >
                    {on && <Check className="h-2.5 w-2.5" />}
                  </span>
                  {L.short[wd]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="bk-from" className="text-xs text-muted-foreground font-normal">{L.from}</Label>
            <TimeSelect id="bk-from" value={from} onChange={setFrom} disabled={disabled} />
          </div>
          <span className="hidden sm:block text-sm text-muted-foreground pb-2.5">{L.to}</span>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="bk-until" className="text-xs text-muted-foreground font-normal">{L.until}</Label>
            <TimeSelect id="bk-until" value={until} onChange={setUntil} disabled={disabled} />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <CalendarDays className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">{L.sync}</p>
        </div>
      </div>
    );
  },
);
