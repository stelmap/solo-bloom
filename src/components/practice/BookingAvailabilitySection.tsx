import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkingSchedule } from "@/hooks/useData";
import { dowToWeekday } from "@/lib/bookingAvailabilitySync";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import { CalendarDays, Check, Loader2 } from "lucide-react";

type Lang = "en" | "uk" | "ru" | "fr" | "pl";
const normLang = (v: unknown): Lang => {
  const s = String(v || "en").toLowerCase();
  return (["en", "uk", "ru", "fr", "pl"].includes(s) ? s : "en") as Lang;
};

const COPY: Record<Lang, {
  title: string; desc: string; days: string; hours: string;
  from: string; until: string; to: string; sync: string;
  save: string; saving: string; saved: string;
  errOrder: string; errNoDay: string;
  short: string[]; // Sun..Sat
}> = {
  en: {
    title: "Booking availability",
    desc: "Choose when clients can book through your public link. Busy times and days off are automatically excluded from your calendar.",
    days: "Available days",
    hours: "General booking hours",
    from: "Available from", until: "Available until", to: "to",
    sync: "Your public availability is synchronized with your SoloBizz calendar. Appointments, blocked time and days marked as off are not offered to clients.",
    save: "Save availability", saving: "Saving…", saved: "Availability saved",
    errOrder: "“Available until” must be later than “Available from”.",
    errNoDay: "Select at least one available day.",
    short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },
  uk: {
    title: "Доступність для запису",
    desc: "Оберіть, коли клієнти можуть записуватися через ваше публічне посилання. Зайнятий час і вихідні автоматично виключаються з календаря.",
    days: "Доступні дні",
    hours: "Загальні години запису",
    from: "Доступно з", until: "Доступно до", to: "до",
    sync: "Ваша публічна доступність синхронізована з календарем SoloBizz. Сесії, заблокований час і дні, позначені як вихідні, не пропонуються клієнтам.",
    save: "Зберегти доступність", saving: "Збереження…", saved: "Доступність збережено",
    errOrder: "«Доступно до» має бути пізніше за «Доступно з».",
    errNoDay: "Оберіть щонайменше один доступний день.",
    short: ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  },
  ru: {
    title: "Доступность для записи",
    desc: "Выберите, когда клиенты могут записываться через вашу публичную ссылку. Занятое время и выходные автоматически исключаются из календаря.",
    days: "Доступные дни",
    hours: "Общие часы записи",
    from: "Доступно с", until: "Доступно до", to: "до",
    sync: "Ваша публичная доступность синхронизирована с календарём SoloBizz. Сессии, заблокированное время и дни, отмеченные как выходные, не предлагаются клиентам.",
    save: "Сохранить доступность", saving: "Сохранение…", saved: "Доступность сохранена",
    errOrder: "«Доступно до» должно быть позже «Доступно с».",
    errNoDay: "Выберите хотя бы один доступный день.",
    short: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  },
  fr: {
    title: "Disponibilité de réservation",
    desc: "Choisissez quand les clients peuvent réserver via votre lien public. Les créneaux occupés et les jours de congé sont automatiquement exclus de votre calendrier.",
    days: "Jours disponibles",
    hours: "Horaires généraux de réservation",
    from: "Disponible à partir de", until: "Disponible jusqu'à", to: "à",
    sync: "Votre disponibilité publique est synchronisée avec votre calendrier SoloBizz. Les rendez-vous, les temps bloqués et les jours de congé ne sont pas proposés aux clients.",
    save: "Enregistrer la disponibilité", saving: "Enregistrement…", saved: "Disponibilité enregistrée",
    errOrder: "« Disponible jusqu'à » doit être après « Disponible à partir de ».",
    errNoDay: "Sélectionnez au moins un jour disponible.",
    short: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
  },
  pl: {
    title: "Dostępność rezerwacji",
    desc: "Wybierz, kiedy klienci mogą rezerwować przez Twój publiczny link. Zajęte terminy i dni wolne są automatycznie wykluczane z kalendarza.",
    days: "Dostępne dni",
    hours: "Ogólne godziny rezerwacji",
    from: "Dostępne od", until: "Dostępne do", to: "do",
    sync: "Twoja publiczna dostępność jest zsynchronizowana z kalendarzem SoloBizz. Wizyty, zablokowany czas i dni wolne nie są oferowane klientom.",
    save: "Zapisz dostępność", saving: "Zapisywanie…", saved: "Dostępność zapisana",
    errOrder: "„Dostępne do” musi być późniejsze niż „Dostępne od”.",
    errNoDay: "Wybierz przynajmniej jeden dostępny dzień.",
    short: ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"],
  },
};

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

function TimeSelect({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  const opts = useMemo(
    () => (value && !TIME_OPTIONS.includes(value) ? [value, ...TIME_OPTIONS] : TIME_OPTIONS),
    [value],
  );
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="font-mono"><SelectValue /></SelectTrigger>
      <SelectContent className="max-h-72">
        {opts.map((t) => <SelectItem key={t} value={t} className="font-mono">{t}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function BookingAvailabilitySection() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  const { toast } = useToast();
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
  const [saving, setSaving] = useState(false);
  const hydrated = useRef(false);

  // Hydrate: booking_availability → working schedule → Mon–Fri 09:00–18:00
  useEffect(() => {
    if (hydrated.current || !userId || isLoading || !availability) return;
    const enabled = (availability as any[]).filter((r) => r.is_enabled);
    if (enabled.length > 0) {
      setSelected(Array.from(new Set(enabled.map((r) => r.weekday as number))));
      setFrom(norm(enabled[0].start_time) || DEFAULT_FROM);
      setUntil(norm(enabled[0].end_time) || DEFAULT_UNTIL);
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
    hydrated.current = true;
    // Persist the initialized defaults so public slots work immediately.
    void persist(days, start, end, { silent: true }).catch(() => undefined);
  }, [availability, isLoading, workingSchedule, userId]);


  const toggleDay = (wd: number) =>
    setSelected((prev) => (prev.includes(wd) ? prev.filter((d) => d !== wd) : [...prev, wd]));

  const error = toMin(until) <= toMin(from)
    ? L.errOrder
    : selected.length === 0
      ? L.errNoDay
      : null;

  async function persist(days: number[], start: string, end: string, opts?: { silent?: boolean }) {
    if (!userId) return;
    const base = (availability as any[])?.[0];
    const shared = {
      session_duration_minutes: base?.session_duration_minutes ?? 60,
      buffer_minutes: base?.buffer_minutes ?? 10,
      min_notice_hours: base?.min_notice_hours ?? 24,
      max_horizon_days: base?.max_horizon_days ?? 30,
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
    // Drop any extra intervals from the legacy multi-block editor, then upsert
    // exactly one row per weekday — repeated saves never duplicate records.
    const { error: delErr } = await supabase
      .from("booking_availability")
      .delete()
      .eq("user_id", userId)
      .gt("sort_order", 0);
    if (delErr) throw delErr;
    const { error: upErr } = await supabase
      .from("booking_availability")
      .upsert(rows as any, { onConflict: "user_id,weekday,sort_order" });
    if (upErr) throw upErr;
    await qc.invalidateQueries({ queryKey: ["booking_availability", userId] });
    if (!opts?.silent) toast({ title: L.saved });
  }

  const handleSave = async () => {
    if (error) {
      toast({ title: error, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await persist(selected, from, until);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4" id="booking-availability">
      <div>
        <h2 className="font-semibold text-foreground">{L.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{L.desc}</p>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold">{L.days}</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {DISPLAY_ORDER.map((wd) => {
            const on = selected.includes(wd);
            return (
              <button
                key={wd}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDay(wd)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                  on ? "border-primary bg-primary/5 text-foreground" : "border-border hover:bg-accent text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "h-5 w-5 shrink-0 rounded-full border flex items-center justify-center",
                    on ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40",
                  )}
                >
                  {on && <Check className="h-3 w-3" />}
                </span>
                {L.short[wd]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold">{L.hours}</Label>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label htmlFor="bk-from" className="text-sm text-muted-foreground font-normal">{L.from}</Label>
            <TimeSelect id="bk-from" value={from} onChange={setFrom} />
          </div>
          <span className="hidden sm:block text-sm text-muted-foreground pb-2.5">{L.to}</span>
          <div className="flex-1 space-y-1">
            <Label htmlFor="bk-until" className="text-sm text-muted-foreground font-normal">{L.until}</Label>
            <TimeSelect id="bk-until" value={until} onChange={setUntil} />
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <CalendarDays className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">{L.sync}</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={saving || !!error}>
          {saving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{L.saving}</>) : L.save}
        </Button>
      </div>
    </section>
  );
}
