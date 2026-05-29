import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, CheckCircle2, ChevronLeft, Clock, Globe, Loader2, MapPin, Mail, Building2 } from "lucide-react";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";

type PageInfo = {
  display_name: string;
  session_duration_minutes: number;
  mode: "manual" | "auto";
  is_active: boolean;
  language: string;
  timezone: string;
  show_practice_profile?: boolean;
  business_name?: string | null;
  business_address?: string | null;
  practice_email?: string | null;
  avatar_url?: string | null;
};

type Lang = "en" | "uk" | "fr" | "pl";
function normLang(v: unknown): Lang {
  const s = String(v || "").toLowerCase().slice(0, 2);
  return s === "uk" || s === "fr" || s === "pl" ? (s as Lang) : "en";
}

const COPY: Record<Lang, {
  invalid: string; inactive: string;
  thankYou: string; requestReceived: string; sessionConfirmed: string;
  minSession: (n: number) => string;
  chooseTime: string;
  noSlots14: string; contactDirect: string;
  slot: (n: number) => string;
  noTimesThisDay: string;
  changeTime: string;
  yourSession: string;
  minutes: (n: number) => string;
  yourDetails: string;
  firstName: string; lastName: string; email: string; phone: string; comment: string;
  consent: string;
  confirmBooking: string; requestBooking: string;
  manualNote: string;
  checkForm: string;
  takenTitle: string; takenDesc: string; couldNotBook: string;
}> = {
  en: {
    invalid: "This booking link is not valid or has been disabled.",
    inactive: "This booking link is no longer active. Please contact the specialist directly.",
    thankYou: "Thank you!",
    requestReceived: "Your booking request has been registered. You'll receive a confirmation email once the specialist approves it.",
    sessionConfirmed: "Your booking request has been registered. You'll receive a confirmation email once the specialist approves it.",
    minSession: (n) => `${n} min session`,
    chooseTime: "Choose a time",
    noSlots14: "No available slots in the next 14 days.",
    contactDirect: "Please contact the specialist directly to arrange a time.",
    slot: (n) => (n === 1 ? "slot" : "slots"),
    noTimesThisDay: "No times available on this day.",
    changeTime: "Change time",
    yourSession: "Your session",
    minutes: (n) => `${n} minutes`,
    yourDetails: "Your details",
    firstName: "First name *", lastName: "Last name", email: "Email *", phone: "Phone (optional)", comment: "Comment (optional)",
    consent: "I consent to the processing of my personal data for the purpose of arranging this session.",
    confirmBooking: "Confirm booking", requestBooking: "Request booking",
    manualNote: "The specialist will review and confirm your request via email.",
    checkForm: "Please check the form fields.",
    takenTitle: "This time was just booked", takenDesc: "Please pick another available time.", couldNotBook: "Could not book",
  },
  uk: {
    invalid: "Це посилання для бронювання недійсне або вимкнене.",
    inactive: "Це посилання більше не активне. Будь ласка, зверніться до спеціаліста безпосередньо.",
    thankYou: "Дякуємо!",
    requestReceived: "Ваш запит на сеанс зареєстровано. Ви отримаєте лист із підтвердженням після того, як спеціаліст підтвердить запис.",
    sessionConfirmed: "Ваш запит на сеанс зареєстровано. Ви отримаєте лист із підтвердженням після того, як спеціаліст підтвердить запис.",
    minSession: (n) => `Сеанс ${n} хв`,
    chooseTime: "Оберіть час",
    noSlots14: "Немає доступних слотів у найближчі 14 днів.",
    contactDirect: "Будь ласка, зверніться до спеціаліста безпосередньо, щоб домовитися про час.",
    slot: (_n) => "слотів",
    noTimesThisDay: "На цей день немає доступного часу.",
    changeTime: "Змінити час",
    yourSession: "Ваш сеанс",
    minutes: (n) => `${n} хвилин`,
    yourDetails: "Ваші дані",
    firstName: "Ім'я *", lastName: "Прізвище", email: "Email *", phone: "Телефон (необов'язково)", comment: "Коментар (необов'язково)",
    consent: "Я погоджуюся на обробку моїх персональних даних для організації цього сеансу.",
    confirmBooking: "Підтвердити бронювання", requestBooking: "Запросити бронювання",
    manualNote: "Спеціаліст перегляне та підтвердить ваш запит електронною поштою.",
    checkForm: "Будь ласка, перевірте поля форми.",
    takenTitle: "Цей час щойно зайняли", takenDesc: "Будь ласка, оберіть інший доступний час.", couldNotBook: "Не вдалося забронювати",
  },
  fr: {
    invalid: "Ce lien de réservation n'est pas valide ou a été désactivé.",
    inactive: "Ce lien de réservation n'est plus actif. Veuillez contacter le spécialiste directement.",
    thankYou: "Merci !",
    requestReceived: "Votre demande de réservation a été enregistrée. Vous recevrez un email de confirmation dès que le spécialiste l'aura validée.",
    sessionConfirmed: "Votre demande de réservation a été enregistrée. Vous recevrez un email de confirmation dès que le spécialiste l'aura validée.",
    minSession: (n) => `Séance de ${n} min`,
    chooseTime: "Choisir un horaire",
    noSlots14: "Aucun créneau disponible dans les 14 prochains jours.",
    contactDirect: "Veuillez contacter le spécialiste directement pour fixer un rendez-vous.",
    slot: (n) => (n === 1 ? "créneau" : "créneaux"),
    noTimesThisDay: "Aucun horaire disponible ce jour-là.",
    changeTime: "Changer l'horaire",
    yourSession: "Votre séance",
    minutes: (n) => `${n} minutes`,
    yourDetails: "Vos coordonnées",
    firstName: "Prénom *", lastName: "Nom", email: "Email *", phone: "Téléphone (optionnel)", comment: "Commentaire (optionnel)",
    consent: "Je consens au traitement de mes données personnelles aux fins de l'organisation de cette séance.",
    confirmBooking: "Confirmer la réservation", requestBooking: "Demander une réservation",
    manualNote: "Le spécialiste examinera et confirmera votre demande par email.",
    checkForm: "Veuillez vérifier les champs du formulaire.",
    takenTitle: "Ce créneau vient d'être réservé", takenDesc: "Veuillez choisir un autre horaire disponible.", couldNotBook: "Échec de la réservation",
  },
  pl: {
    invalid: "Ten link rezerwacji jest nieprawidłowy lub został wyłączony.",
    inactive: "Ten link rezerwacji nie jest już aktywny. Skontaktuj się ze specjalistą bezpośrednio.",
    thankYou: "Dziękujemy!",
    requestReceived: "Twoja prośba o rezerwację została zarejestrowana. Otrzymasz email z potwierdzeniem, gdy specjalista ją zatwierdzi.",
    sessionConfirmed: "Twoja prośba o rezerwację została zarejestrowana. Otrzymasz email z potwierdzeniem, gdy specjalista ją zatwierdzi.",
    minSession: (n) => `Sesja ${n} min`,
    chooseTime: "Wybierz termin",
    noSlots14: "Brak dostępnych terminów w ciągu najbliższych 14 dni.",
    contactDirect: "Skontaktuj się ze specjalistą bezpośrednio, aby umówić termin.",
    slot: (n) => (n === 1 ? "termin" : "terminów"),
    noTimesThisDay: "Brak dostępnych godzin tego dnia.",
    changeTime: "Zmień termin",
    yourSession: "Twoja sesja",
    minutes: (n) => `${n} minut`,
    yourDetails: "Twoje dane",
    firstName: "Imię *", lastName: "Nazwisko", email: "Email *", phone: "Telefon (opcjonalnie)", comment: "Komentarz (opcjonalnie)",
    consent: "Wyrażam zgodę na przetwarzanie moich danych osobowych w celu organizacji tej sesji.",
    confirmBooking: "Potwierdź rezerwację", requestBooking: "Poproś o rezerwację",
    manualNote: "Specjalista przejrzy i potwierdzi Twoją prośbę przez email.",
    checkForm: "Sprawdź pola formularza.",
    takenTitle: "Ten termin został właśnie zarezerwowany", takenDesc: "Wybierz inny dostępny termin.", couldNotBook: "Nie udało się zarezerwować",
  },
};

const LOCALE_MAP: Record<Lang, string> = { en: "en-US", uk: "uk-UA", fr: "fr-FR", pl: "pl-PL" };

const formSchema = z.object({
  first_name: z.string().trim().min(1).max(120),
  last_name: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  comment: z.string().trim().max(2000).optional().or(z.literal("")),
  consent: z.literal(true),
});

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function PublicBookingPage() {
  const { token } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [info, setInfo] = useState<PageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ requiresApproval: boolean } | null>(null);
  const [langOverride, setLangOverride] = useState<Lang | null>(null);

  // Resolve language: URL param > manual override > browser > therapist default > 'en'
  const urlLang = searchParams.get("lang");
  const browserLang = useMemo<Lang | null>(() => {
    if (typeof navigator === "undefined") return null;
    const candidate = String(navigator.language || "").toLowerCase().slice(0, 2);
    return candidate === "uk" || candidate === "fr" || candidate === "pl" || candidate === "en"
      ? (candidate as Lang)
      : null;
  }, []);
  const lang: Lang = urlLang
    ? normLang(urlLang)
    : langOverride ?? browserLang ?? (info?.language ? normLang(info.language) : "en");
  const L = COPY[lang];
  const intlLocale = LOCALE_MAP[lang];

  function changeLang(next: Lang) {
    setLangOverride(next);
    const params = new URLSearchParams(searchParams);
    params.set("lang", next);
    setSearchParams(params, { replace: true });
  }

  // noindex
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase.rpc("public_get_booking_page", { p_token: token });
      if (!active) return;
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setError(COPY.en.invalid);
      } else {
        const row = (Array.isArray(data) ? data[0] : data) as PageInfo;
        if (!row.is_active) setError(COPY[normLang(row.language)].inactive);
        else setInfo(row);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [token]);

  // Load next 14 days of slots
  useEffect(() => {
    if (!info || !token) return;
    setSlotsLoading(true);
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 14);
    supabase
      .rpc("public_get_available_slots", { p_token: token, p_from_date: fmtDate(from), p_to_date: fmtDate(to) })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          setSlots(((data as any[]) || []).map((r) => r.slot_at).slice(0, 200));
        }
        setSlotsLoading(false);
      });
  }, [info, token]);

  // Display label for the practitioner's working timezone (informational only).
  const tzLabel = info?.timezone || "UTC";
  // Slot timestamps are stored in wall-clock UTC (same convention as the
  // internal Calendar), so render them in UTC to stay in sync.
  const tz = "UTC";

  const groupedByDay = useMemo(() => {
    const m: Record<string, { label: string; slots: string[] }> = {};
    for (const s of slots) {
      const d = new Date(s);
      const key = d.toLocaleDateString("en-CA", { timeZone: tz });
      const label = d.toLocaleDateString(intlLocale, {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: tz,
      });
      if (!m[key]) m[key] = { label, slots: [] };
      m[key].slots.push(s);
    }
    return m;
  }, [slots, tz, intlLocale]);

  const dayKeys = useMemo(() => Object.keys(groupedByDay).sort(), [groupedByDay]);

  useEffect(() => {
    if (!activeDay && dayKeys.length > 0) setActiveDay(dayKeys[0]);
    if (activeDay && !dayKeys.includes(activeDay) && dayKeys.length > 0) setActiveDay(dayKeys[0]);
  }, [dayKeys, activeDay]);

  async function getIpHash(): Promise<string | null> {
    try {
      const fingerprint = `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}`;
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprint));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
    } catch {
      return null;
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSlot || !token) return;
    const fd = new FormData(e.currentTarget);
    const parsed = formSchema.safeParse({
      first_name: String(fd.get("first_name") ?? ""),
      last_name: String(fd.get("last_name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      comment: String(fd.get("comment") ?? ""),
      consent: fd.get("consent") === "on",
    });
    if (!parsed.success) {
      toast({ title: L.checkForm, variant: "destructive" });
      return;
    }
    if (fd.get("website")) return;

    setSubmitting(true);
    const ip_hash = await getIpHash();
    const { data, error } = await supabase.rpc("public_create_booking", {
      p_token: token,
      p_slot_at: selectedSlot,
      p_first_name: parsed.data.first_name,
      p_last_name: parsed.data.last_name || null,
      p_email: parsed.data.email,
      p_phone: parsed.data.phone || null,
      p_comment: parsed.data.comment || null,
      p_consent: true,
      p_ip_hash: ip_hash,
    });
    setSubmitting(false);
    if (error) {
      const isTaken = /no longer available/i.test(error.message);
      toast({
        title: isTaken ? L.takenTitle : L.couldNotBook,
        description: isTaken ? L.takenDesc : error.message,
        variant: "destructive",
      });
      if (isTaken) {
        setSelectedSlot(null);
        setSlotsLoading(true);
        const from = new Date();
        const to = new Date();
        to.setDate(to.getDate() + 14);
        const { data: fresh } = await supabase.rpc("public_get_available_slots", {
          p_token: token,
          p_from_date: fmtDate(from),
          p_to_date: fmtDate(to),
        });
        setSlots(((fresh as any[]) || []).map((r) => r.slot_at).slice(0, 200));
        setSlotsLoading(false);
      }
      return;
    }
    const row = Array.isArray(data) ? data[0] : (data as any);
    setDone({ requiresApproval: !!row?.requires_approval });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center text-muted-foreground">{error}</CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary mb-3" />
            <h2 className="text-xl font-semibold mb-2">{L.thankYou}</h2>
            <p className="text-sm text-muted-foreground">
              {done.requiresApproval ? L.requestReceived : L.sessionConfirmed}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeSlots = activeDay ? groupedByDay[activeDay]?.slots ?? [] : [];

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-end">
          <Select value={lang} onValueChange={(v) => changeLang(v as Lang)}>
            <SelectTrigger className="h-8 w-auto gap-2 text-xs">
              <Globe className="h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="uk">Українська</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="pl">Polski</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <header className="text-center space-y-3">
          {info.show_practice_profile !== false && (info.avatar_url || info.business_name || info.business_address || info.practice_email) && (
            <div className="flex flex-col items-center gap-3 pb-2">
              {info.avatar_url && (
                <img
                  src={info.avatar_url}
                  alt={info.business_name || info.display_name}
                  className="h-20 w-20 rounded-full object-cover border border-border shadow-sm"
                />
              )}
              {info.business_name && (
                <div className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {info.business_name}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {info.business_address && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {info.business_address}
                  </span>
                )}
                {info.practice_email && (
                  <a href={`mailto:${info.practice_email}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {info.practice_email}
                  </a>
                )}
              </div>
            </div>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{info.display_name}</h1>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {L.minSession(info.session_duration_minutes)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              {tzLabel}
            </span>
          </div>
        </header>

        {!selectedSlot ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {L.chooseTime}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {slotsLoading ? (
                <div className="space-y-3">
                  <div className="flex gap-2 overflow-hidden">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-20 rounded-md flex-shrink-0" />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 rounded-md" />
                    ))}
                  </div>
                </div>
              ) : dayKeys.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <MapPin className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-sm text-muted-foreground">{L.noSlots14}</p>
                  <p className="text-xs text-muted-foreground">{L.contactDirect}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                    {dayKeys.map((key) => {
                      const isActive = key === activeDay;
                      const g = groupedByDay[key];
                      const d = new Date(`${key}T12:00:00Z`);
                      const dayNum = d.toLocaleDateString(intlLocale, { day: "numeric", timeZone: tz });
                      const dayWk = d.toLocaleDateString(intlLocale, { weekday: "short", timeZone: tz });
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setActiveDay(key)}
                          className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-lg border transition-colors ${
                            isActive
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-accent border-border"
                          }`}
                          aria-pressed={isActive}
                        >
                          <span className="text-[10px] uppercase font-medium tracking-wide opacity-80">
                            {dayWk}
                          </span>
                          <span className="text-lg font-semibold leading-tight">{dayNum}</span>
                          <span className={`text-[10px] ${isActive ? "opacity-90" : "text-muted-foreground"}`}>
                            {g.slots.length} {L.slot(g.slots.length)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {activeSlots.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {activeSlots.map((s) => (
                        <Button
                          key={s}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10"
                          onClick={() => setSelectedSlot(s)}
                        >
                          {new Date(s).toLocaleTimeString(intlLocale, {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: tz,
                          })}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">{L.noTimesThisDay}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="space-y-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-fit -ml-2 h-8 text-muted-foreground"
                onClick={() => setSelectedSlot(null)}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
                {L.changeTime}
              </Button>
              <div className="rounded-lg bg-muted p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  {L.yourSession}
                </div>
                <div className="font-semibold text-base">
                  {new Date(selectedSlot).toLocaleString(intlLocale, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: tz,
                    timeZoneName: "short",
                  })}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {L.minutes(info.session_duration_minutes)}
                </div>
              </div>
              <CardTitle className="text-base">{L.yourDetails}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">{L.firstName}</Label>
                    <Input id="first_name" name="first_name" required maxLength={120} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">{L.lastName}</Label>
                    <Input id="last_name" name="last_name" maxLength={120} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{L.email}</Label>
                  <Input id="email" name="email" type="email" required maxLength={254} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{L.phone}</Label>
                  <Input id="phone" name="phone" type="tel" maxLength={40} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comment">{L.comment}</Label>
                  <Textarea id="comment" name="comment" rows={3} maxLength={2000} />
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox id="consent" name="consent" required />
                  <Label htmlFor="consent" className="text-sm font-normal leading-snug">
                    {L.consent}
                  </Label>
                </div>
                <Button type="submit" disabled={submitting} className="w-full gap-2" size="lg">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {info.mode === "auto" ? L.confirmBooking : L.requestBooking}
                </Button>
                {info.mode === "manual" && (
                  <p className="text-xs text-muted-foreground text-center">{L.manualNote}</p>
                )}
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
