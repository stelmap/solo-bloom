import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SessionDetailSheet } from "@/components/SessionDetailSheet";
import { ClientPicker } from "@/components/ClientPicker";
import { DateTimePicker, DatePicker } from "@/components/ui/date-time-picker";
import { ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon, Plus, Repeat, CalendarOff, BarChart3, GripVertical, Users, Settings as SettingsIcon, UserPlus, Briefcase, CheckCircle2, Circle, Flag, Search, X as XIcon, AlertTriangle, CalendarDays, SlidersHorizontal, MoreHorizontal, ChevronDown, ExternalLink, Copy, PanelRightOpen } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { Switch } from "@/components/ui/switch";
import {
  useCalendarDisplay, initialFilters, isFiltersActive,
  type CalendarFilters, type CalendarView,
} from "@/hooks/useCalendarDisplay";
import {
  isUrgent, toggleUrgent, isNew, markNew, markSeen,
  isRescheduled, markRescheduled, getSessionKind,
  typeColorClasses, typeDotClasses, statusOverlayClasses,
  type SessionKind,
} from "@/lib/calendarVisuals";
import { dedupeAppointmentsById } from "@/lib/calendarDedupe";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { format, addDays, startOfWeek, isSameDay, isBefore, startOfDay, addMonths, startOfMonth, endOfMonth, endOfWeek, endOfDay, eachDayOfInterval, isSameMonth } from "date-fns";
import { getDateLocale } from "@/lib/dateLocale";
import { formatTime, formatScheduledTime } from "@/lib/timeFormat";
import {
  useAppointments, useCreateAppointment, useUpdateAppointment,
  useClients, useServices, useProfile, useCreateRecurringRule,
  useWorkingSchedule, useDaysOff, useCreateDayOff, useDeleteDayOff,
  useBulkCancelForDayOff, useCreateClient, useCreateService,
} from "@/hooks/useData";
import { useGroups, useGroupMembers, useCreateGroupSession } from "@/hooks/useGroups";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBookingRequests, type BookingRequestRow } from "@/hooks/useBookingInbox";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Inbox } from "lucide-react";
import { BookingInboxPanel } from "@/components/BookingInboxPanel";
import { WorkingHoursSection, DaysOffSection, PracticeProfileSection } from "@/components/settings/CalendarSections";
import { PublicBookingSection } from "@/components/PublicBookingSection";

const DAY_KEYS = ["day.mon", "day.tue", "day.wed", "day.thu", "day.fri", "day.sat", "day.sun"] as const;

type LangKey = "en" | "uk" | "ru" | "fr" | "pl";
type BookingAvailabilityRule = {
  session_duration_minutes?: number | null;
  buffer_minutes?: number | null;
};

const NEW_COPY: Record<LangKey, {
  noClientsYet: string; addNewClient: string; noServicesYet: string; addNewService: string;
  createFirstTitle: string; createFirstDesc: string;
  stepAddClient: string; stepAddService: string; stepDateTime: string; stepSave: string;
  disabledHint: string;
  qaClientTitle: string; qaServiceTitle: string;
  clientName: string; clientEmail: string; clientPhone: string;
  serviceName: string; serviceDuration: string; servicePrice: string;
  saveClient: string; saveService: string; cancel: string;
  durationMin: string;
  modalSubtitle: string;
  sessionTypeLabel: string; individualSession: string; groupSession: string;
  participants: string;
  notesPlaceholder: string; notesGroupPlaceholder: string;
  ctaIndividual: string; ctaGroup: string;
  summaryWillCreate: string; summaryWillCreateGroup: string;
}> = {
  en: {
    noClientsYet: "No clients yet. Add your first client to create a session.",
    addNewClient: "Add new client",
    noServicesYet: "No services yet. Add your first service to continue.",
    addNewService: "Add new service",
    createFirstTitle: "Create your first session",
    createFirstDesc: "Add a client, choose a service, set the date and time, then save.",
    stepAddClient: "Add client", stepAddService: "Add service",
    stepDateTime: "Choose date & time", stepSave: "Save session",
    disabledHint: "Fill required fields to create a session.",
    qaClientTitle: "Add new client", qaServiceTitle: "Add new service",
    clientName: "Name", clientEmail: "Email (optional)", clientPhone: "Phone (optional)",
    serviceName: "Name", serviceDuration: "Duration", servicePrice: "Price",
    saveClient: "Save client", saveService: "Save service", cancel: "Cancel",
    durationMin: "min",
    modalSubtitle: "Schedule an individual or group session",
    sessionTypeLabel: "Session type",
    individualSession: "Individual session", groupSession: "Group session",
    participants: "Participants",
    notesPlaceholder: "Add a short note for the session",
    notesGroupPlaceholder: "Add a note for the group session",
    ctaIndividual: "Create session", ctaGroup: "Create group session",
    summaryWillCreate: "Will create session:",
    summaryWillCreateGroup: "Will create group session:",
  },
  uk: {
    noClientsYet: "Ще немає клієнтів. Додайте першого клієнта, щоб створити сесію.",
    addNewClient: "Додати клієнта",
    noServicesYet: "Ще немає послуг. Додайте першу послугу, щоб продовжити.",
    addNewService: "Додати послугу",
    createFirstTitle: "Створіть першу сесію",
    createFirstDesc: "Додайте клієнта, оберіть послугу, встановіть дату й час та збережіть.",
    stepAddClient: "Додати клієнта", stepAddService: "Додати послугу",
    stepDateTime: "Обрати дату й час", stepSave: "Зберегти сесію",
    disabledHint: "Заповніть обовʼязкові поля, щоб створити сесію.",
    qaClientTitle: "Новий клієнт", qaServiceTitle: "Нова послуга",
    clientName: "Ім'я", clientEmail: "Email (необов'язково)", clientPhone: "Телефон (необов'язково)",
    serviceName: "Назва", serviceDuration: "Тривалість", servicePrice: "Ціна",
    saveClient: "Зберегти клієнта", saveService: "Зберегти послугу", cancel: "Скасувати",
    durationMin: "хв",
    modalSubtitle: "Заплануйте індивідуальну або групову сесію",
    sessionTypeLabel: "Тип сесії",
    individualSession: "Індивідуальна сесія", groupSession: "Групова сесія",
    participants: "Учасники",
    notesPlaceholder: "Додайте коротку нотатку до сесії",
    notesGroupPlaceholder: "Додайте нотатку для групової сесії",
    ctaIndividual: "Створити сесію", ctaGroup: "Створити групову сесію",
    summaryWillCreate: "Буде створено сесію:",
    summaryWillCreateGroup: "Буде створено групову сесію:",
  },
  ru: {
    noClientsYet: "Пока нет клиентов. Добавьте первого клиента, чтобы создать сессию.",
    addNewClient: "Добавить клиента",
    noServicesYet: "Пока нет услуг. Добавьте первую услугу, чтобы продолжить.",
    addNewService: "Добавить услугу",
    createFirstTitle: "Создайте первую сессию",
    createFirstDesc: "Добавьте клиента, выберите услугу, укажите дату и время, затем сохраните.",
    stepAddClient: "Добавить клиента", stepAddService: "Добавить услугу",
    stepDateTime: "Выбрать дату и время", stepSave: "Сохранить сессию",
    disabledHint: "Заполните обязательные поля, чтобы создать сессию.",
    qaClientTitle: "Новый клиент", qaServiceTitle: "Новая услуга",
    clientName: "Имя", clientEmail: "Email (необязательно)", clientPhone: "Телефон (необязательно)",
    serviceName: "Название", serviceDuration: "Длительность", servicePrice: "Цена",
    saveClient: "Сохранить клиента", saveService: "Сохранить услугу", cancel: "Отмена",
    durationMin: "мин",
    modalSubtitle: "Запланируйте индивидуальную или групповую сессию",
    sessionTypeLabel: "Тип сессии",
    individualSession: "Индивидуальная сессия", groupSession: "Групповая сессия",
    participants: "Участники",
    notesPlaceholder: "Добавьте короткую заметку к сессии",
    notesGroupPlaceholder: "Добавьте заметку к групповой сессии",
    ctaIndividual: "Создать сессию", ctaGroup: "Создать групповую сессию",
    summaryWillCreate: "Будет создана сессия:",
    summaryWillCreateGroup: "Будет создана групповая сессия:",
  },
  fr: {
    noClientsYet: "Aucun client. Ajoutez votre premier client pour créer une séance.",
    addNewClient: "Ajouter un client",
    noServicesYet: "Aucun service. Ajoutez votre premier service pour continuer.",
    addNewService: "Ajouter un service",
    createFirstTitle: "Créez votre première séance",
    createFirstDesc: "Ajoutez un client, choisissez un service, définissez la date et l'heure, puis enregistrez.",
    stepAddClient: "Ajouter un client", stepAddService: "Ajouter un service",
    stepDateTime: "Choisir date et heure", stepSave: "Enregistrer la séance",
    disabledHint: "Remplissez les champs requis pour créer une séance.",
    qaClientTitle: "Nouveau client", qaServiceTitle: "Nouveau service",
    clientName: "Nom", clientEmail: "Email (optionnel)", clientPhone: "Téléphone (optionnel)",
    serviceName: "Nom", serviceDuration: "Durée", servicePrice: "Prix",
    saveClient: "Enregistrer", saveService: "Enregistrer", cancel: "Annuler",
    durationMin: "min",
    modalSubtitle: "Planifiez une séance individuelle ou de groupe",
    sessionTypeLabel: "Type de séance",
    individualSession: "Séance individuelle", groupSession: "Séance de groupe",
    participants: "Participants",
    notesPlaceholder: "Ajoutez une courte note pour la séance",
    notesGroupPlaceholder: "Ajoutez une note pour la séance de groupe",
    ctaIndividual: "Créer la séance", ctaGroup: "Créer la séance de groupe",
    summaryWillCreate: "Séance à créer :",
    summaryWillCreateGroup: "Séance de groupe à créer :",
  },
  pl: {
    noClientsYet: "Brak klientów. Dodaj pierwszego klienta, aby utworzyć sesję.",
    addNewClient: "Dodaj klienta",
    noServicesYet: "Brak usług. Dodaj pierwszą usługę, aby kontynuować.",
    addNewService: "Dodaj usługę",
    createFirstTitle: "Utwórz pierwszą sesję",
    createFirstDesc: "Dodaj klienta, wybierz usługę, ustaw datę i godzinę, a następnie zapisz.",
    stepAddClient: "Dodaj klienta", stepAddService: "Dodaj usługę",
    stepDateTime: "Wybierz datę i godzinę", stepSave: "Zapisz sesję",
    disabledHint: "Wypełnij wymagane pola, aby utworzyć sesję.",
    qaClientTitle: "Nowy klient", qaServiceTitle: "Nowa usługa",
    clientName: "Imię", clientEmail: "Email (opcjonalnie)", clientPhone: "Telefon (opcjonalnie)",
    serviceName: "Nazwa", serviceDuration: "Czas trwania", servicePrice: "Cena",
    saveClient: "Zapisz klienta", saveService: "Zapisz usługę", cancel: "Anuluj",
    durationMin: "min",
    modalSubtitle: "Zaplanuj sesję indywidualną lub grupową",
    sessionTypeLabel: "Typ sesji",
    individualSession: "Sesja indywidualna", groupSession: "Sesja grupowa",
    participants: "Uczestnicy",
    notesPlaceholder: "Dodaj krótką notatkę do sesji",
    notesGroupPlaceholder: "Dodaj notatkę do sesji grupowej",
    ctaIndividual: "Utwórz sesję", ctaGroup: "Utwórz sesję grupową",
    summaryWillCreate: "Zostanie utworzona sesja:",
    summaryWillCreateGroup: "Zostanie utworzona sesja grupowa:",
  },
};



type Density = "compact" | "cozy" | "comfortable";
function useDensity(): Density {
  const [d, setD] = useState<Density>(() => {
    if (typeof window === "undefined") return "cozy";
    const h = window.innerHeight;
    return h < 760 ? "compact" : h < 1000 ? "cozy" : "comfortable";
  });
  useEffect(() => {
    const onResize = () => {
      const h = window.innerHeight;
      setD(h < 760 ? "compact" : h < 1000 ? "cozy" : "comfortable");
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return d;
}

export default function CalendarPage() {
  useEffect(() => { import("@/lib/analytics").then(({ track }) => track("calendar_opened")); }, []);
  const density = useDensity();
  const D = {
    pad: density === "compact" ? "px-4 pt-2 pb-3 sm:px-5" : density === "cozy" ? "px-4 pt-3 pb-4 sm:px-5" : "px-5 pt-4 pb-5 sm:px-6",
    gap: density === "compact" ? "space-y-2" : density === "cozy" ? "space-y-3" : "space-y-4",
    field: density === "compact" ? "h-8" : density === "cozy" ? "h-9" : "h-10",
    pill: density === "compact" ? "h-8" : density === "cozy" ? "h-9" : "h-10",
    cta: density === "compact" ? "h-9" : density === "cozy" ? "h-10" : "h-11",
    title: density === "compact" ? "text-base" : density === "cozy" ? "text-lg" : "text-xl",
    subtitle: density !== "compact",
    notes: density === "compact" ? "min-h-[44px]" : density === "cozy" ? "min-h-[56px]" : "min-h-[72px]",
    label: density === "compact" ? "space-y-1" : "space-y-1.5",
    headPad: density === "compact" ? "px-4 pt-2 pb-0 sm:px-5" : density === "cozy" ? "px-4 pt-3 pb-1 sm:px-5" : "px-5 pt-4 pb-1 sm:px-6",
    maxW: density === "comfortable" ? "sm:max-w-[560px]" : "sm:max-w-[500px]",
  };
  const [currentDate, setCurrentDate] = useState(new Date());

  const appointmentsRange = useMemo(() => {
    // Quantize to month so week-navigation reuses the cached window
    const anchor = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const from = addDays(anchor, -60).toISOString();
    const to = addDays(anchor, 240).toISOString();
    return { from, to };
  }, [currentDate.getFullYear(), currentDate.getMonth()]);
  const { data: appointments = [] } = useAppointments(appointmentsRange);
  const { data: bookingRequests = [] } = useBookingRequests();
  const navigate = useNavigate();

  // Calendar view + filters + inbox drawer
  const { view, setView } = useCalendarDisplay();
  const [filters, setFilters] = useState<CalendarFilters>(initialFilters);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [, setVisualsTick] = useState(0);
  useEffect(() => {
    const onChange = () => setVisualsTick(t => t + 1);
    window.addEventListener("calendar-visuals-changed", onChange);
    return () => window.removeEventListener("calendar-visuals-changed", onChange);
  }, []);
  const filtersActive = isFiltersActive(filters);
  const clearFilters = () => setFilters(initialFilters);
  const pendingRequests = useMemo(
    () => bookingRequests.filter(r => r.status === "pending" || r.status === "needs_linking"),
    [bookingRequests],
  );
  const { data: clients = [] } = useClients();
  const activeClients = useMemo(() => (clients as any[]).filter((c: any) => c.status !== "archived"), [clients]);
  const { data: services = [] } = useServices();
  const { data: profile } = useProfile();
  const { data: workingSchedule = [] } = useWorkingSchedule();
  const { data: daysOff = [] } = useDaysOff();
  const { data: bookingAvailability = [] } = useQuery({
    queryKey: ["booking-availability-rules"],
    queryFn: async () => {
      const { data } = await supabase
        .from("booking_availability")
        .select("session_duration_minutes, buffer_minutes")
        .limit(1);
      return data || [];
    },
  });
  const firstBookingRule = (bookingAvailability as BookingAvailabilityRule[])[0];
  const bookingSessionDurationValue = Number(firstBookingRule?.session_duration_minutes) || 0;
  const bookingSessionDuration = bookingSessionDurationValue > 0 ? Math.max(15, bookingSessionDurationValue) : null;
  const bufferMinutes = Math.max(0, Number(firstBookingRule?.buffer_minutes) || 0);
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const createRecurringRule = useCreateRecurringRule();
  const createDayOff = useCreateDayOff();
  const deleteDayOff = useDeleteDayOff();
  const bulkCancel = useBulkCancelForDayOff();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { t, lang } = useLanguage();
  const dateLocale = getDateLocale(lang);
  const { symbol: cs } = useCurrency();

  // Realtime: invalidate appointments + booking-requests when DB changes.
  // Topic MUST end with ":<user_id>" so realtime.messages RLS allows the
  // subscription. Row-level RLS on appointments/session_booking_requests
  // already filters payloads to the owner, but topic scoping prevents another
  // user from even subscribing to this user's channel.
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`calendar-live:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_booking_requests", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["booking-requests"] });
        qc.invalidateQueries({ queryKey: ["booking-requests-count"] });
        qc.invalidateQueries({ queryKey: ["appointments"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["appointments"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc, user?.id]);




  // Drag-and-drop state
  const [dragAptId, setDragAptId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [recurMoveOpen, setRecurMoveOpen] = useState(false);
  const pendingMove = useRef<{ aptId: string; newDate: string; newTime: string } | null>(null);
  const submittingRef = useRef(false);

  // Calendar settings from profile
  const startHour = parseInt((profile as any)?.work_hours_start || "09") || 9;
  const endHour = parseInt((profile as any)?.work_hours_end || "18") || 18;
  const use12h = (profile as any)?.time_format === "12h";
  // Always render a full readable day range so users can scroll to later slots
  // even when their working hours end early. Working hours are still highlighted below.
  const displayStart = Math.min(startHour, 8);
  const displayEnd = Math.max(endHour, 22);
  const hours = Array.from({ length: displayEnd - displayStart }, (_, i) => i + displayStart);

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
    const dur = Number(durationMinutes);
    if (!Number.isFinite(newStart) || !Number.isFinite(dur) || dur <= 0) return false;
    const newEnd = newStart + dur * 60 * 1000;
    // Only actively-scheduled future-blocking sessions count as conflicts.
    // Completed / cancelled / no-show sessions are historical records and
    // must not block new slots, otherwise dense seeded data makes every
    // slot appear "occupied" even when the calendar cell is visually empty.
    const BLOCKING = new Set(["scheduled", "confirmed", "reminder_sent"]);
    // Dedupe by id to neutralize duplicate rows from realtime cache races.
    const seen = new Set<string>();
    return (appointments as any[]).some((apt: any) => {
      if (!apt?.id || !apt?.scheduled_at) return false;
      if (seen.has(apt.id)) return false;
      seen.add(apt.id);
      if (excludeId && apt.id === excludeId) return false;
      if (!BLOCKING.has(apt.status)) return false;
      const aptStart = new Date(apt.scheduled_at).getTime();
      const aptDur = Number(apt.duration_minutes);
      if (!Number.isFinite(aptStart) || !Number.isFinite(aptDur) || aptDur <= 0) return false;
      const aptEnd = aptStart + aptDur * 60 * 1000;
      return newStart < aptEnd && newEnd > aptStart;
    });
  };


  const [createOpen, setCreateOpen] = useState(false);
  const [detailApt, setDetailApt] = useState<any>(null);
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false);
  const [dayOffConfirm, setDayOffConfirm] = useState<{ date: Date; affectedApts: any[] } | null>(null);

  const [form, setForm] = useState({ client_id: "", service_id: "", date: "", time: "09:00", notes: "" });
  const [serviceError, setServiceError] = useState(false);

  // Group session state
  const [isGroupSession, setIsGroupSession] = useState(false);
  const [groupId, setGroupId] = useState("");
  const { data: groups = [] } = useGroups();
  const activeGroups = useMemo(() => groups.filter((g: any) => g.status === "active"), [groups]);
  const { data: groupMembers = [] } = useGroupMembers(groupId || undefined);
  const createGroupSession = useCreateGroupSession();

  // Recurring form state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurInterval, setRecurInterval] = useState(1);
  const [recurDays, setRecurDays] = useState<number[]>([1]);
  const [recurEndDate, setRecurEndDate] = useState("");

  // Localized copy for new empty-state / onboarding UI inside the create modal
  const L = NEW_COPY[(["en", "uk", "ru", "fr", "pl"].includes(lang as any) ? lang : "en") as LangKey];

  // Quick-add nested dialogs (open from inside the create-session modal,
  // form state is preserved because it lives in the parent component).
  const createClient = useCreateClient();
  const createService = useCreateService();
  const [qaClientOpen, setQaClientOpen] = useState(false);
  const [qaServiceOpen, setQaServiceOpen] = useState(false);
  const [qaClient, setQaClient] = useState({ name: "", email: "", phone: "" });
  const [qaService, setQaService] = useState({ name: "", duration_minutes: 60, price: 0 });

  const handleQuickAddClient = async () => {
    const name = qaClient.name.trim();
    if (!name) return;
    try {
      const c: any = await createClient.mutateAsync({
        name,
        email: qaClient.email.trim() || undefined,
        phone: qaClient.phone.trim() || undefined,
      });
      // Push into the clients cache immediately so the Select can render
      // the new option on the same tick (invalidate refetch is async).
      qc.setQueriesData({ queryKey: ["clients"] }, (prev: any) =>
        prev ? [...prev, c] : [c],
      );
      setForm(f => ({ ...f, client_id: c.id }));
      setQaClient({ name: "", email: "", phone: "" });
      setQaClientOpen(false);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleQuickAddService = async () => {
    const name = qaService.name.trim();
    if (!name || qaService.duration_minutes <= 0) return;
    try {
      const s: any = await createService.mutateAsync({
        name,
        duration_minutes: Number(qaService.duration_minutes),
        price: Number(qaService.price || 0),
      });
      qc.setQueriesData({ queryKey: ["services"] }, (prev: any) =>
        prev ? [...prev, s] : [s],
      );
      setForm(f => ({ ...f, service_id: s.id }));
      setServiceError(false);
      setQaService({ name: "", duration_minutes: 60, price: 0 });
      setQaServiceOpen(false);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };


  const isMobile = useIsMobile();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const effectiveView: CalendarView = isMobile ? "day" : view;
  // Time-grid days (day or week view). Month view uses its own grid below.
  const days = effectiveView === "day" ? [currentDate] : weekDays;

  // Period selection (for analytics + month grid)
  const periodStart = useMemo(() => {
    if (effectiveView === "day") return startOfDay(currentDate);
    if (effectiveView === "month") return startOfMonth(currentDate);
    return weekStart;
  }, [effectiveView, currentDate, weekStart]);
  const periodEnd = useMemo(() => {
    if (effectiveView === "day") return endOfDay(currentDate);
    if (effectiveView === "month") return endOfMonth(currentDate);
    return endOfDay(addDays(weekStart, 6));
  }, [effectiveView, currentDate, weekStart]);
  const periodDays = useMemo(
    () => eachDayOfInterval({ start: periodStart, end: periodEnd }),
    [periodStart, periodEnd],
  );
  // Full month grid (Mon-Sun rows) for month view
  const monthGridDays = useMemo(() => {
    if (effectiveView !== "month") return [] as Date[];
    const gridStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [effectiveView, currentDate]);

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
    // Guard against rapid double-submits (Enter+click, double-click)
    // since `isPending` flips asynchronously and won't block a second call
    // fired in the same tick.
    if (createAppointment.isPending || createRecurringRule.isPending || createGroupSession.isPending || submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    try {
    // Validate service selection
    if (!form.service_id) {
      setServiceError(true);
      return;
    }


    if (isGroupSession) {
      if (!groupId || !form.date) return;
      if (createValidation && !isRecurring) return;
      const service = services.find(s => s.id === form.service_id);
      const firstMember = groupMembers[0];
      if (!firstMember) {
        toast({ title: t("common.error"), description: t("groups.noMembers"), variant: "destructive" });
        return;
      }
      const groupName = activeGroups.find(g => g.id === groupId)?.name || "";
      const memberClientIds = groupMembers.map((m: any) => m.client_id);

      if (isRecurring) {
        try {
          // Create the first appointment immediately
          const firstApt = await createAppointment.mutateAsync({
            client_id: firstMember.client_id,
            service_id: form.service_id,
            scheduled_at: `${form.date}T${form.time}:00Z`,
            duration_minutes: service?.duration_minutes ?? 60,
            price: Number(service?.price ?? 0),
            notes: `[Group: ${groupName}] ${form.notes || ""}`.trim(),
          });
          markNew((firstApt as any).id);
          await createGroupSession.mutateAsync({
            groupId,
            appointmentId: (firstApt as any).id,
            notes: form.notes || "",
            memberClientIds,
          });

          // Close modal immediately
          const savedForm = { ...form };
          const savedRecurDays = [...recurDays];
          const savedRecurInterval = recurInterval;
          const savedRecurEndDate = recurEndDate;
          const savedNotes = form.notes;
          setForm({ client_id: "", service_id: "", date: "", time: "09:00", notes: "" });
          setIsGroupSession(false); setIsRecurring(false);
          setGroupId(""); setRecurInterval(1); setRecurDays([1]); setRecurEndDate("");
          setServiceError(false);
          setCreateOpen(false);
          toast({ title: t("groups.groupSessionCreated"), description: "Creating remaining sessions..." });

          // Background: create recurring rule and remaining group sessions
          (async () => {
            try {
              const result = await createRecurringRule.mutateAsync({
                client_id: firstMember.client_id,
                service_id: savedForm.service_id,
                time: savedForm.time,
                duration_minutes: service?.duration_minutes ?? 60,
                price: Number(service?.price ?? 0),
                notes: savedNotes || undefined,
                recurrence_type: "weekly",
                interval_weeks: savedRecurInterval,
                days_of_week: savedRecurDays.length > 0 ? savedRecurDays : [new Date(savedForm.date).getDay() || 7],
                start_date: savedForm.date,
                end_date: savedRecurEndDate || undefined,
                firstAppointmentId: (firstApt as any).id,
              });
              const ruleId = (result as any).rule?.id;
              if (ruleId) {
                const firstAptId = (firstApt as any).id;
                const { data: ruleApts } = await supabase.from("appointments")
                  .select("id").eq("recurring_rule_id", ruleId).neq("id", firstAptId).order("scheduled_at");
                if (ruleApts && ruleApts.length > 0) {
                  await supabase.from("appointments")
                    .update({ notes: `[Group: ${groupName}] ${savedNotes || ""}`.trim() } as any)
                    .eq("recurring_rule_id", ruleId)
                    .neq("id", firstAptId);
                  for (const apt of ruleApts) {
                    await createGroupSession.mutateAsync({
                      groupId,
                      appointmentId: apt.id,
                      notes: savedNotes || "",
                      memberClientIds,
                    });
                  }
                }
              }
              qc.invalidateQueries({ queryKey: ["appointments"] });
              toast({ title: t("recurring.seriesCreated"), description: t("recurring.seriesCreatedDesc", { count: (result as any).count }) });
            } catch (e: any) {
              toast({ title: t("common.error"), description: e.message, variant: "destructive" });
            }
          })();
        } catch (e: any) {
          toast({ title: t("common.error"), description: e.message, variant: "destructive" });
        }
      } else {
        // Single group session
        try {
          const apt = await createAppointment.mutateAsync({
            client_id: firstMember.client_id,
            service_id: form.service_id,
            scheduled_at: `${form.date}T${form.time}:00Z`,
            duration_minutes: service?.duration_minutes ?? 60,
            price: Number(service?.price ?? 0),
            notes: `[Group: ${groupName}] ${form.notes || ""}`.trim(),
          });
          markNew((apt as any).id);
          await createGroupSession.mutateAsync({
            groupId,
            appointmentId: (apt as any).id,
            notes: form.notes || "",
            memberClientIds,
          });
          setForm({ client_id: "", service_id: "", date: "", time: "09:00", notes: "" });
          setIsGroupSession(false);
          setGroupId("");
          setServiceError(false);
          setCreateOpen(false);
          toast({ title: t("groups.groupSessionCreated") });
        } catch (e: any) {
          toast({ title: t("common.error"), description: e.message, variant: "destructive" });
        }
      }
      return;
    }

    if (!form.client_id || !form.date) return;
    if (createValidation && !isRecurring) return;
    const service = services.find(s => s.id === form.service_id);

    if (isRecurring) {
      try {
        // Create the first appointment immediately
        const firstRecApt = await createAppointment.mutateAsync({
          client_id: form.client_id, service_id: form.service_id,
          scheduled_at: `${form.date}T${form.time}:00Z`,
          duration_minutes: service?.duration_minutes ?? 60,
          price: Number(service?.price ?? 0),
          notes: form.notes || undefined,
        });
        markNew((firstRecApt as any).id);

        // Close modal immediately
        const savedForm = { ...form };
        const savedRecurDays = [...recurDays];
        const savedRecurInterval = recurInterval;
        const savedRecurEndDate = recurEndDate;
        setForm({ client_id: "", service_id: "", date: "", time: "09:00", notes: "" });
        setIsRecurring(false); setRecurInterval(1); setRecurDays([1]); setRecurEndDate("");
        setServiceError(false);
        setCreateOpen(false);
        toast({ title: t("toast.appointmentCreated"), description: "Creating remaining sessions..." });

        // Background: create remaining recurring appointments
        (async () => {
          try {
            const result = await createRecurringRule.mutateAsync({
              client_id: savedForm.client_id, service_id: savedForm.service_id,
              time: savedForm.time, duration_minutes: service?.duration_minutes ?? 60,
              price: Number(service?.price ?? 0), notes: savedForm.notes || undefined,
              recurrence_type: "weekly", interval_weeks: savedRecurInterval,
              days_of_week: savedRecurDays.length > 0 ? savedRecurDays : [new Date(savedForm.date).getDay() || 7],
              start_date: savedForm.date, end_date: savedRecurEndDate || undefined,
              firstAppointmentId: (firstRecApt as any).id,
            });
            qc.invalidateQueries({ queryKey: ["appointments"] });
            toast({ title: t("recurring.seriesCreated"), description: t("recurring.seriesCreatedDesc", { count: (result as any).count }) });
          } catch (e: any) {
            toast({ title: t("common.error"), description: e.message, variant: "destructive" });
          }
        })();
      } catch (e: any) { toast({ title: t("common.error"), description: e.message, variant: "destructive" }); }
    } else {
      try {
        const newApt = await createAppointment.mutateAsync({
          client_id: form.client_id, service_id: form.service_id,
          scheduled_at: `${form.date}T${form.time}:00Z`,
          duration_minutes: service?.duration_minutes ?? 60,
          price: Number(service?.price ?? 0),
          notes: form.notes || undefined,
        });
        markNew((newApt as any).id);
        setForm({ client_id: "", service_id: "", date: "", time: "09:00", notes: "" });
        setServiceError(false);
        setCreateOpen(false);
        toast({ title: t("toast.appointmentCreated") });
      } catch (e: any) { toast({ title: t("common.error"), description: e.message, variant: "destructive" }); }
    }
    } finally {
      submittingRef.current = false;
    }
  };

  const openSessionSheet = (apt: any) => {
    setDetailApt(apt);
    setSessionSheetOpen(true);
    if (apt?.id) markSeen(apt.id);
  };

  // Deep-link: when navigating from Dashboard with ?appointmentId=..., jump the
  // calendar to that day and open the session sheet directly.
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkAppointmentId = searchParams.get("appointmentId");
  const handledDeepLinkRef = useRef<string | null>(null);
  useEffect(() => {
    if (!deepLinkAppointmentId) return;
    if (handledDeepLinkRef.current === deepLinkAppointmentId) return;
    const apt = (appointments as any[]).find((a) => a.id === deepLinkAppointmentId);
    if (!apt) return; // wait until the appointment window loads
    handledDeepLinkRef.current = deepLinkAppointmentId;
    setCurrentDate(new Date(apt.scheduled_at));
    openSessionSheet(apt);
    const next = new URLSearchParams(searchParams);
    next.delete("appointmentId");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkAppointmentId, appointments]);


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

  // Apply user filters before the calendar reads events
  const visibleAppointments = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    // Dedupe by id first — guards against duplicate rows from realtime races,
    // overlapping cache updates after creation, or group-session join fan-out.
    const unique = dedupeAppointmentsById(appointments as any[]);
    const result: any[] = [];
    for (const apt of unique) {
      const kind = getSessionKind(apt);
      if (!filters.types[kind]) continue;
      if (filters.status !== "all" && apt.status !== filters.status) continue;
      if (filters.urgentOnly && !isUrgent(apt.id)) continue;
      if (filters.newOnly && !isNew(apt.id, apt.created_at)) continue;
      if (q) {
        const name = apt.clients?.name || apt.group_sessions?.groups?.name || "";
        const svc = apt.services?.name || "";
        if (!name.toLowerCase().includes(q) && !svc.toLowerCase().includes(q)) continue;
      }
      result.push(apt);
    }
    return result;
  }, [appointments, filters]);

  // Slots already covered by a real appointment — used to hide pending
  // booking requests that have already been converted into a session.
  const appointmentSlotKeys = useMemo(() => {
    const set = new Set<string>();
    for (const apt of appointments as any[]) {
      if (!apt?.scheduled_at) continue;
      const ts = new Date(apt.scheduled_at).getTime();
      if (apt.client_id) set.add(`${apt.client_id}|${ts}`);
    }
    return set;
  }, [appointments]);

  const visiblePendingRequests = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    // Pending requests show only when status is "all" or "scheduled" (pending shows when no specific session-status filter)
    if (filters.status !== "all") return [];
    const notYetAppointment = (req: any) => {
      if (req.appointment_id) return false;
      const ts = new Date(req.requested_slot_at).getTime();
      if (req.client_id && appointmentSlotKeys.has(`${req.client_id}|${ts}`)) return false;
      return true;
    };
    const base = (pendingRequests as any[]).filter(notYetAppointment);
    if (filters.newOnly || filters.urgentOnly) return base; // still surface them
    return base.filter(req => {
      if (!q) return true;
      const name = `${req.first_name} ${req.last_name || ""} ${req.matched_client_name || ""}`.toLowerCase();
      return name.includes(q);
    });
  }, [pendingRequests, filters, appointmentSlotKeys]);

  const getEventsForDayHour = (day: Date, hour: number) => {
    const dayStr = format(day, "yyyy-MM-dd"); // local calendar day string
    const seen = new Set<string>();
    return visibleAppointments.filter(apt => {
      const d = new Date(apt.scheduled_at);
      if (toUTCDateStr(d) !== dayStr || d.getUTCHours() !== hour) return false;
      if (seen.has(apt.id)) return false;
      seen.add(apt.id);
      return true;
    });
  };

  const getPendingRequestsForDayHour = (day: Date, hour: number): BookingRequestRow[] => {
    const dayStr = format(day, "yyyy-MM-dd");
    return visiblePendingRequests.filter(req => {
      const d = new Date(req.requested_slot_at);
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

  // Period capacity (Day / Week / Month) — analytics recompute by selected view
  const periodCapacity = useMemo(() => {
    const sessionsPerDay = (profile as any)?.sessions_per_day ?? 6;
    let totalSlots = 0;
    let totalBooked = 0;
    let totalRevenue = 0;
    const dayStats = periodDays.map(day => {
      const working = isDayWorking(day);
      // Slot count = working hours per day (60-min slots), fallback to sessionsPerDay
      let slots = 0;
      if (working) {
        const dow = getDayOfWeek(day);
        const sched = scheduleMap[dow];
        const sh = sched ? (parseInt(sched.start_time) || startHour) : startHour;
        const eh = sched ? (parseInt(sched.end_time) || endHour) : endHour;
        slots = eh > sh ? (eh - sh) : sessionsPerDay;
      }
      totalSlots += slots;
      const dayStr = format(day, "yyyy-MM-dd");
      const dayApts = appointments.filter(
        apt => toUTCDateStr(new Date(apt.scheduled_at)) === dayStr && apt.status !== "cancelled",
      );
      const bookedRaw = dayApts.length;
      const booked = Math.min(bookedRaw, slots);
      totalBooked += booked;
      totalRevenue += dayApts.reduce((s, a: any) => s + Number(a.price ?? 0), 0);
      return { day, working, slots, booked, free: Math.max(slots - booked, 0) };
    });
    const pendingInPeriod = pendingRequests.filter(r => {
      const d = new Date(r.requested_slot_at);
      return d >= periodStart && d <= periodEnd;
    }).length;
    return {
      totalSlots,
      totalBooked,
      totalFree: Math.max(totalSlots - totalBooked, 0),
      totalRevenue,
      pendingInPeriod,
      dayStats,
    };
  }, [periodDays, periodStart, periodEnd, appointments, profile, scheduleMap, daysOffSet, pendingRequests, startHour, endHour]);

  // Fill-rate forecasts: this week, next week, next 30 days
  // Based on real working hours per day, default session duration, and unique
  // booked minutes (clipped to working window, overlaps merged).
  const fillRates = useMemo(() => {
    // Always use 60-minute slots for capacity counting (1 slot = 1 hour)
    const defaultDuration = 60;
    const today = startOfDay(new Date());

    // Current range follows the selected calendar view (day / week / month)
    let curStart: Date;
    let curEnd: Date;
    let nextStart: Date;
    let nextEnd: Date;
    if (effectiveView === "day") {
      curStart = startOfDay(currentDate);
      curEnd = endOfDay(currentDate);
      nextStart = startOfDay(addDays(currentDate, 1));
      nextEnd = endOfDay(addDays(currentDate, 1));
    } else if (effectiveView === "month") {
      curStart = startOfMonth(currentDate);
      curEnd = endOfMonth(currentDate);
      nextStart = startOfMonth(addMonths(currentDate, 1));
      nextEnd = endOfMonth(addMonths(currentDate, 1));
    } else {
      curStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      curEnd = endOfDay(addDays(curStart, 6));
      nextStart = addDays(curStart, 7);
      nextEnd = endOfDay(addDays(nextStart, 6));
    }
    const next30Start = today;
    const next30End = endOfDay(addDays(today, 29));

    // Working window [startMin, endMin) in minutes-from-midnight for a given day
    const workingWindow = (date: Date): [number, number] | null => {
      if (!isDayWorking(date)) return null;
      const dow = getDayOfWeek(date);
      const sched = scheduleMap[dow];
      let sh = startHour;
      let eh = endHour;
      if (sched) {
        sh = parseInt(sched.start_time) || startHour;
        eh = parseInt(sched.end_time) || endHour;
      }
      if (eh <= sh) return null;
      return [sh * 60, eh * 60];
    };

    const slotUnit = defaultDuration;

    const computeRange = (rangeStart: Date, rangeEnd: Date) => {
      const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
      let totalWorkingMinutes = 0;
      const rangeStartMs = startOfDay(rangeStart).getTime();
      const rangeEndMs = endOfDay(rangeEnd).getTime();

      for (const day of days) {
        const win = workingWindow(day);
        if (!win) continue;
        totalWorkingMinutes += win[1] - win[0];
      }

      let totalOccupiedMinutes = 0;
      for (const a of appointments) {
        if (a.status === "cancelled" || a.status === "deleted") continue;
        const t = new Date(a.scheduled_at).getTime();
        if (t < rangeStartMs || t > rangeEndMs) continue;
        const dur = Number((a as any).duration_minutes) || defaultDuration;
        totalOccupiedMinutes += dur;
      }
      for (const r of pendingRequests as any[]) {
        if (r.status && (r.status === "rejected" || r.status === "cancelled")) continue;
        const t = new Date(r.requested_slot_at).getTime();
        if (t < rangeStartMs || t > rangeEndMs) continue;
        const dur = Number(r.duration_minutes) || defaultDuration;
        totalOccupiedMinutes += dur;
      }

      const slots = slotUnit > 0 ? Math.floor(totalWorkingMinutes / slotUnit) : 0;
      const availableMinutes = slots * slotUnit;
      const occupied = slotUnit > 0
        ? Math.min(slots, Math.round(totalOccupiedMinutes / slotUnit))
        : 0;
      const occupiedMinutes = Math.min(totalOccupiedMinutes, availableMinutes);
      const pctRaw = slots > 0 ? (occupied / slots) * 100 : 0;
      const pct = Math.min(100, Math.round(pctRaw * 100) / 100);
      const occupiedHours = Math.round((occupiedMinutes / 60) * 10) / 10;
      const availableHours = Math.round((availableMinutes / 60) * 10) / 10;
      return { slots, occupied, pct, occupiedMinutes, availableMinutes, occupiedHours, availableHours };
    };

    return {
      thisWeek: computeRange(curStart, curEnd),
      nextWeek: computeRange(nextStart, nextEnd),
      next30: computeRange(next30Start, next30End),
    };
  }, [appointments, pendingRequests, scheduleMap, daysOffSet, startHour, endHour, effectiveView, currentDate]);
  // Back-compat alias used by the per-day bar (only relevant in Day/Week views)
  const weekCapacity = periodCapacity;

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
      markRescheduled(aptId);
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
        // Invalidate appointments cache to reflect changes
        qc.invalidateQueries({ queryKey: ["appointments"] });
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

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [needsOpen, setNeedsOpen] = useState(false);

  const { data: bookingLink } = useQuery({
    queryKey: ["booking-link-calendar"],
    queryFn: async () => {
      const { data } = await supabase.from("booking_links").select("*").maybeSingle();
      return data as any;
    },
  });
  const bookingHandle = (bookingLink?.slug as string) || (bookingLink?.token as string) || "";
  const bookingUrl = bookingHandle && typeof window !== "undefined" ? `${window.location.origin}/book/${bookingHandle}` : "";

  // ---- Adaptive Agenda data (presentation only) ----
  const agendaDate = currentDate;
  const agendaSessions = (visibleAppointments as any[])
    .filter((a) => a.status !== "cancelled" && isSameDay(new Date(a.scheduled_at), agendaDate))
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const nowMs = Date.now();
  const nextIdx = agendaSessions.findIndex((a) => new Date(a.scheduled_at).getTime() >= nowMs);
  const agendaNext = nextIdx >= 0 ? agendaSessions[nextIdx] : null;
  const attentionItems = (visibleAppointments as any[]).filter((a) => {
    if (a.status === "cancelled" || a.status === "completed") return false;
    if (new Date(a.scheduled_at).getTime() < nowMs) return false;
    if (a.group_session_id) return false;
    const c = clients.find((cl: any) => cl.id === a.client_id) as any;
    return !!c?.confirmation_required && a.confirmation_status !== "confirmed";
  });
  const attentionCount = attentionItems.length + pendingRequests.length;

  const agendaName = (a: any) =>
    a.group_session_id ? (a.group_sessions?.groups?.name || "") : a.clients?.name;

  const agendaContent = (
    <div className="bg-card rounded-xl border border-border animate-fade-in divide-y divide-border">
      <div className="flex items-center justify-between gap-2 p-4">
        <h2 className="text-base font-semibold text-foreground">{(t as any)("calendar.agenda") || "Adaptive Agenda"}</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={(t as any)("common.actions") || "Actions"}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              {t("settings.calendarSettings") || "Calendar settings"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setInboxOpen(true)}>
              {t("booking.inbox") || "Booking inbox"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCurrentDate(new Date())}>
              {t("calendar.today") || "Today"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <p className="text-base font-semibold text-foreground">
            {format(agendaDate, "EEEE, d MMMM", { locale: dateLocale })}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {(t as any)("calendar.todaysSessions") || "Today's sessions"}
          </p>
        </div>

        {agendaSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-4 text-center">
            {(t as any)("calendar.noUpcoming") || "No upcoming sessions"}
          </p>
        ) : (
          <ol className="relative space-y-4">
            {agendaSessions.map((s: any) => {
              const si = statusInfo(s.status);
              const isNext = agendaNext?.id === s.id;
              return (
                <li key={s.id} className="flex gap-3">
                  <div className="flex flex-col items-center pt-1 w-14 shrink-0">
                    <span className="text-xs font-semibold text-foreground tabular-nums">{fmtTime(s.scheduled_at)}</span>
                  </div>
                  <span className={cn("mt-2 h-2 w-2 rounded-full shrink-0", isNext ? "bg-primary" : "bg-muted-foreground/50")} />
                  <div className={cn("flex-1 min-w-0", isNext && "rounded-xl border border-primary/30 bg-primary/[0.06] p-3 -mt-1")}>
                    {isNext && (
                      <span className="inline-flex items-center rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary mb-1">
                        {(t as any)("calendar.next") || "Next"}
                      </span>
                    )}
                    <p className="text-sm font-semibold text-foreground truncate">{agendaName(s)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.services?.name} · {s.duration_minutes} {L.durationMin}
                    </p>
                    <span className={cn("mt-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", si.color)}>
                      {si.label}
                    </span>
                    {isNext && (
                      <Button className="w-full mt-2" onClick={() => openSessionSheet(s)}>
                        {(t as any)("calendar.openSession") || "Open Session"}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
            <li className="flex gap-3">
              <div className="w-14 shrink-0 pt-1 text-xs text-muted-foreground text-center">—</div>
              <span className="mt-2 h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {(t as any)("calendar.noMoreToday") || "No more sessions today"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(t as any)("calendar.allSetToday") || "You're all set for the rest of the day."}
                </p>
              </div>
            </li>
          </ol>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setNeedsOpen(o => !o)}
          aria-expanded={needsOpen}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 min-h-[48px] text-left hover:bg-accent/40 transition-colors"
        >
          <span className="text-sm font-medium text-foreground">
            {(t as any)("calendar.needsAttention") || "Needs attention"} · {attentionCount}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", needsOpen && "rotate-180")} />
        </button>
        {needsOpen && (
          <div className="px-4 pb-3 space-y-2">
            {pendingRequests.length > 0 && (
              <button
                type="button"
                onClick={() => setInboxOpen(true)}
                className="w-full flex items-center gap-2 rounded-lg border border-border p-2 text-left text-sm hover:bg-accent/40"
              >
                <Inbox className="h-4 w-4 text-warning shrink-0" />
                <span className="truncate">{(t as any)("booking.pendingRequests") || "Pending requests"}</span>
                <span className="ml-auto tabular-nums font-semibold">{pendingRequests.length}</span>
              </button>
            )}
            {attentionItems.slice(0, 6).map((a: any) => (
              <button
                key={a.id}
                type="button"
                onClick={() => openSessionSheet(a)}
                className="w-full flex items-center gap-2 rounded-lg border border-border p-2 text-left text-sm hover:bg-accent/40"
              >
                <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                <span className="truncate">{agendaName(a)}</span>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums shrink-0">
                  {format(new Date(a.scheduled_at), "MMM d", { locale: dateLocale })} · {fmtTime(a.scheduled_at)}
                </span>
              </button>
            ))}
            {attentionCount === 0 && (
              <p className="text-xs text-muted-foreground">{(t as any)("calendar.allClear") || "Nothing needs attention."}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 p-4">
        <span className="text-sm font-medium text-foreground">{(t as any)("booking.link") || "Booking link"}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline" size="icon" className="h-9 w-9"
            aria-label={(t as any)("booking.openLink") || "Open booking link"}
            disabled={!bookingUrl}
            onClick={() => bookingUrl && window.open(bookingUrl, "_blank", "noopener")}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={(t as any)("common.actions") || "Actions"}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={!bookingUrl}
                onClick={() => {
                  if (!bookingUrl) return;
                  navigator.clipboard.writeText(bookingUrl);
                  toast({ title: (t as any)("common.copied") || "Copied" });
                }}
              >
                <Copy className="h-4 w-4 mr-2" /> {(t as any)("common.copyLink") || "Copy link"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                {t("settings.publicBooking") || "Public booking"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  return (

    <AppLayout>
      <div className="flex flex-col gap-6">
        <section className="space-y-6 flex-1 min-w-0" aria-label="Calendar">

        <div className="flex flex-wrap items-center gap-2">
          {/* Period navigation */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
            <Button
              variant="ghost" size="icon" className="h-10 w-10 rounded-lg"
              aria-label={t("calendar.prev") || "Previous"}
              onClick={() => setCurrentDate(d => effectiveView === "month" ? addMonths(d, -1) : addDays(d, effectiveView === "day" ? -1 : -7))}
            ><ChevronLeft className="h-4 w-4" /></Button>
            <span className="px-2 text-sm font-semibold text-foreground whitespace-nowrap" aria-live="polite">
              {effectiveView === "day"
                ? format(currentDate, "EEE, MMM d, yyyy", { locale: dateLocale })
                : effectiveView === "month"
                  ? format(currentDate, "MMMM yyyy", { locale: dateLocale })
                  : `${format(weekStart, "EEE, MMM d", { locale: dateLocale })} – ${format(addDays(weekStart, 6), "EEE, MMM d, yyyy", { locale: dateLocale })}`}
            </span>
            <Button
              variant="ghost" size="icon" className="h-10 w-10 rounded-lg"
              aria-label={t("calendar.next") || "Next"}
              onClick={() => setCurrentDate(d => effectiveView === "month" ? addMonths(d, 1) : addDays(d, effectiveView === "day" ? 1 : 7))}
            ><ChevronRight className="h-4 w-4" /></Button>
          </div>

          <Button variant="outline" className="h-10 rounded-xl" onClick={() => setCurrentDate(new Date())}>
            {t("calendar.today") || "Today"}
          </Button>

          {!isMobile && (
            <div role="tablist" aria-label="Calendar view" className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
              {(["day", "week", "month"] as CalendarView[]).map(v => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    "h-8 px-4 text-xs font-semibold rounded-lg transition-colors capitalize",
                    view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t(`calendar.view.${v}` as any) || v}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {/* Filters */}
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline" size="icon"
                      className={cn("h-10 w-10 rounded-xl relative", filtersActive && "border-primary text-primary")}
                      aria-label={(t as any)("calendar.filters") || "Filters"}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      {filtersActive && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary" />}
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>{(t as any)("calendar.filters") || "Filters"}</TooltipContent>
              </Tooltip>
              <PopoverContent align="end" className="w-72 space-y-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder={(t as any)("common.search") || "Search"}
                    value={filters.search}
                    onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{(t as any)("calendar.status") || "Status"}</Label>
                  <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v as CalendarFilters["status"] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["all", "scheduled", "confirmed", "completed", "cancelled", "no-show"] as const).map(s => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{(t as any)("calendar.sessionType") || "Type"}</Label>
                  {(["individual", "group", "pair"] as const).map(k => (
                    <label key={k} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                      <Checkbox
                        checked={filters.types[k]}
                        onCheckedChange={(c) => setFilters(f => ({ ...f, types: { ...f.types, [k]: !!c } }))}
                      />
                      {k}
                    </label>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="w-full" onClick={clearFilters} disabled={!filtersActive}>
                  {(t as any)("common.clear") || "Clear"}
                </Button>
              </PopoverContent>
            </Popover>

            {/* Persistent Settings entry */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline" size="icon" className="h-10 w-10 rounded-xl"
                  aria-label={t("settings.title") || "Settings"}
                  onClick={() => navigate("/settings")}
                >
                  <SettingsIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("settings.title") || "Settings"}</TooltipContent>
            </Tooltip>

            {/* Agenda drawer trigger below xl */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline" size="icon" className="h-10 w-10 rounded-xl xl:hidden"
                  aria-label={(t as any)("calendar.agenda") || "Adaptive Agenda"}
                  onClick={() => setAgendaOpen(true)}
                >
                  <PanelRightOpen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{(t as any)("calendar.agenda") || "Adaptive Agenda"}</TooltipContent>
            </Tooltip>

            {pendingRequests.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl relative" aria-label="Booking inbox" onClick={() => setInboxOpen(true)}>
                    <Inbox className="h-4 w-4" />
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {pendingRequests.length}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("booking.inbox") || "Booking inbox"}</TooltipContent>
              </Tooltip>
            )}

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> {t("calendar.newAppointment")}</Button>
              </DialogTrigger>
              <DialogContent className={cn("max-h-[96vh] sm:max-h-[94vh] overflow-y-auto max-w-[calc(100vw-1rem)] rounded-2xl shadow-2xl p-0 mx-2 sm:mx-0", D.maxW)}>
                {(() => {
                  const stepClient = !!form.client_id || (isGroupSession && !!groupId);
                  const stepService = !!form.service_id;
                  const stepDate = !!form.date && !!form.time;
                  const stepNotes = !!form.notes || stepDate;
                  const steps = [stepClient, stepService, stepDate, stepNotes];
                  return (
                    <div className={cn("grid grid-cols-4 gap-1.5", D.headPad, "pb-0")}>
                      {steps.map((done, i) => (
                        <div key={i} className={cn("h-1 rounded-full transition-colors", done ? "bg-primary" : "bg-muted")} />
                      ))}
                    </div>
                  );
                })()}

                <DialogHeader className={cn(D.headPad, "space-y-0 text-left")}>
                  <DialogTitle id="new-appointment-title" className={cn(D.title, "font-bold tracking-tight leading-tight")}>{t("calendar.newAppointment")}</DialogTitle>
                  {D.subtitle && (
                    <DialogDescription className="text-xs text-muted-foreground leading-tight">{L.modalSubtitle}</DialogDescription>
                  )}
                </DialogHeader>

                <form
                  className={cn(D.pad, D.gap)}
                  onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
                  aria-labelledby="new-appointment-title"
                >
                  {/* Session type — two large pills */}
                  <div
                    role="radiogroup"
                    aria-label={L.individualSession + " / " + L.groupSession}
                    className="grid grid-cols-2 gap-2"
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                        e.preventDefault();
                        if (activeGroups.length > 0) { setIsGroupSession(true); setForm(f => ({ ...f, client_id: "" })); }
                      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                        e.preventDefault();
                        setIsGroupSession(false); setGroupId("");
                      }
                    }}
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!isGroupSession}
                      tabIndex={!isGroupSession ? 0 : -1}
                      onClick={() => { setIsGroupSession(false); setGroupId(""); }}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-xl border-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", D.pill,
                        !isGroupSession
                          ? "border-foreground bg-background text-foreground shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-muted-foreground/60"
                      )}
                    >
                      <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{L.individualSession}</span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isGroupSession}
                      tabIndex={isGroupSession ? 0 : -1}
                      onClick={() => { setIsGroupSession(true); setForm(f => ({ ...f, client_id: "" })); }}
                      disabled={activeGroups.length === 0}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-xl border-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", D.pill,
                        isGroupSession
                          ? "border-foreground bg-background text-foreground shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-muted-foreground/60",
                        activeGroups.length === 0 && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{L.groupSession}</span>
                    </button>
                  </div>

                  {/* Client / Group */}
                  {isGroupSession ? (
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">
                        {t("groups.selectGroup")} <span className="text-primary">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <Select value={groupId} onValueChange={setGroupId}>
                          <SelectTrigger className={cn("flex-1", D.field)}><SelectValue placeholder={t("groups.selectGroup")} /></SelectTrigger>
                          <SelectContent>{activeGroups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      {groupId && groupMembers.length > 0 && (
                        <div className="pt-0.5 space-y-1">
                          <p className="text-xs text-muted-foreground">{L.participants} · {groupMembers.length}</p>
                          <div className="flex flex-wrap gap-1">
                            {groupMembers.map((m: any) => (
                              <span key={m.client_id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
                                {m.clients?.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {groupId && groupMembers.length === 0 && (
                        <p className="text-xs text-warning">{t("groups.noMembers")}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">
                        {t("calendar.client")} <span className="text-primary">*</span>
                      </Label>
                      {activeClients.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-3 space-y-1 bg-muted/20 text-center">
                          <p className="text-sm text-muted-foreground">{L.noClientsYet}</p>
                          <Button type="button" variant="outline" size="sm" className="gap-1 h-9 sm:h-8" onClick={() => setQaClientOpen(true)}>
                            <UserPlus className="h-3.5 w-3.5" /> {L.addNewClient}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <ClientPicker
                            clients={activeClients}
                            value={form.client_id}
                            onChange={v => setForm(f => ({ ...f, client_id: v }))}
                            placeholder={t("calendar.selectClient")}
                            triggerClassName={cn("flex-1", D.field)}
                            onAddNew={() => setQaClientOpen(true)}
                            addNewLabel={L.addNewClient}
                          />
                          <Button type="button" variant="outline" className={cn("px-2.5 gap-1 whitespace-nowrap shrink-0", D.field)} onClick={() => setQaClientOpen(true)}>
                            <Plus className="h-3.5 w-3.5" /> {L.addNewClient}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Service */}
                  <div className="space-y-1">
                    <Label htmlFor="appt-service" className="text-xs font-bold uppercase text-muted-foreground">
                      {t("calendar.service")} <span className="text-primary" aria-hidden="true">*</span>
                    </Label>
                    {services.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-3 space-y-1 bg-muted/20 text-center">
                        <p className="text-sm text-muted-foreground">{L.noServicesYet}</p>
                        <Button type="button" variant="outline" size="sm" className="gap-1 h-9 sm:h-8" onClick={() => setQaServiceOpen(true)}>
                          <Briefcase className="h-3.5 w-3.5" aria-hidden="true" /> {L.addNewService}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Select value={form.service_id} onValueChange={v => { setForm(f => ({ ...f, service_id: v })); setServiceError(false); }}>
                            <SelectTrigger
                              id="appt-service"
                              aria-required="true"
                              aria-invalid={serviceError}
                              aria-describedby={serviceError ? "appt-service-error" : undefined}
                              className={cn("flex-1", D.field, serviceError && "border-destructive")}
                            >
                              <SelectValue placeholder={t("calendar.selectService")} />
                            </SelectTrigger>
                            <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {cs}{Number(s.price).toFixed(0)}</SelectItem>)}</SelectContent>
                          </Select>
                          <Button type="button" variant="outline" className={cn("px-2.5 gap-1 whitespace-nowrap shrink-0", D.field)} onClick={() => setQaServiceOpen(true)}>
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> {L.addNewService}
                          </Button>
                        </div>
                        {serviceError && (
                          <p id="appt-service-error" role="alert" className="text-sm text-destructive">⚠️ {t("calendar.service")} is required</p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Date / Time */}
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
                    <div role="alert" className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                      ⚠️ {createValidation}
                    </div>
                  )}

                  {/* Notes */}
                  <div className="space-y-1">
                    <Label htmlFor="appt-notes" className="text-xs font-bold uppercase text-muted-foreground">{t("calendar.notes")}</Label>
                    <Textarea
                      id="appt-notes"
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder={isGroupSession ? L.notesGroupPlaceholder : L.notesPlaceholder}
                      rows={2}
                      className={cn("resize-none rounded-lg", D.notes)}
                    />
                  </div>

                  {/* Repeat session — orange highlighted toggle row */}
                  <div className={cn(
                    "rounded-xl border-2 transition-all overflow-hidden",
                    isRecurring ? "border-primary bg-primary/10" : "border-border bg-background"
                  )}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isRecurring}
                      aria-label={t("recurring.setup")}
                      onClick={() => setIsRecurring(v => !v)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                    >
                      <span aria-hidden="true" className={cn(
                        "relative inline-flex h-5 w-9 sm:h-5 sm:w-9 shrink-0 rounded-full transition-colors",
                        isRecurring ? "bg-primary" : "bg-muted"
                      )}>
                        <span className={cn(
                          "inline-block h-4 w-4 rounded-full bg-background shadow transition-transform mt-0.5",
                          isRecurring ? "translate-x-[18px]" : "translate-x-0.5"
                        )} />
                      </span>
                      <span className="flex-1 font-medium text-sm text-foreground">{t("recurring.setup")}</span>
                      {isRecurring && (() => {
                        const freqLabel = recurInterval === 1 ? t("recurring.weekly")
                          : recurInterval === 2 ? t("recurring.biweekly")
                          : t("recurring.custom", { n: String(recurInterval) });
                        const dayLabels = recurDays.map(d => t(DAY_KEYS[d - 1] as any)).join(", ");
                        return (
                          <span className="text-xs text-muted-foreground">{freqLabel}{dayLabels ? ` · ${dayLabels}` : ""}</span>
                        );
                      })()}
                    </button>
                    {isRecurring && (
                      <div className="px-3 pb-2 pt-0.5 space-y-2 bg-muted/30 border-t border-border/60">
                        <div className="space-y-1 pt-2">
                          <Label className="text-xs font-bold uppercase text-muted-foreground">{t("recurring.intervalWeeks")}</Label>
                          <Select value={recurInterval.toString()} onValueChange={v => setRecurInterval(parseInt(v))}>
                            <SelectTrigger className={D.field}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">{t("recurring.weekly")}</SelectItem>
                              <SelectItem value="2">{t("recurring.biweekly")}</SelectItem>
                              <SelectItem value="3">{t("recurring.custom", { n: "3" })}</SelectItem>
                              <SelectItem value="4">{t("recurring.custom", { n: "4" })}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label id="recur-days-label" className="text-xs font-bold uppercase text-muted-foreground">{t("recurring.daysOfWeek")}</Label>
                          <div role="group" aria-labelledby="recur-days-label" className="grid grid-cols-7 gap-1">
                            {DAY_KEYS.map((key, i) => {
                              const active = recurDays.includes(i + 1);
                              const dayName = t(key as any);
                              return (
                                <button key={i} type="button" onClick={() => toggleRecurDay(i + 1)}
                                  aria-pressed={active}
                                  aria-label={dayName}
                                  className={cn("h-8 sm:h-7 rounded-md text-xs font-medium transition-colors border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:border-muted-foreground/60"
                                  )}>
                                  {dayName}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-bold uppercase text-muted-foreground">{t("recurring.endDate")}</Label>
                          <DatePicker date={recurEndDate} onDateChange={setRecurEndDate} placeholder={t("recurring.ongoing")} />
                        </div>
                      </div>
                    )}
                  </div>

                  {(() => {
                    const missingRequired = isGroupSession
                      ? (!groupId || groupMembers.length === 0 || !form.service_id || !form.date || !form.time)
                      : (!form.client_id || !form.service_id || !form.date || !form.time);
                    const disabled = createAppointment.isPending || createRecurringRule.isPending || createGroupSession.isPending
                      || missingRequired
                      || (!isRecurring && !isGroupSession && !!createValidation);

                    const selectedService = services.find(s => s.id === form.service_id);
                    const selectedClient = clients.find(c => c.id === form.client_id);
                    const selectedGroup = activeGroups.find((g: any) => g.id === groupId);
                    let summaryDate = "";
                    if (form.date) {
                      try {
                        const [y, m, d] = form.date.split("-").map(Number);
                        summaryDate = format(new Date(y, m - 1, d), "d MMMM", { locale: dateLocale });
                      } catch { summaryDate = form.date; }
                    }
                    const recurSummary = isRecurring
                      ? `${(recurInterval === 1 ? t("recurring.weekly") : recurInterval === 2 ? t("recurring.biweekly") : t("recurring.custom", { n: String(recurInterval) })).toLowerCase()} ${recurDays.map(d => t(DAY_KEYS[d - 1] as any)).join(",")}`
                      : "";
                    const summaryParts = [
                      isGroupSession ? selectedGroup?.name : selectedClient?.name,
                      summaryDate,
                      form.time ? formatTime(form.time, use12h) : "",
                      selectedService ? `${cs}${Number(selectedService.price).toFixed(0)}` : "",
                      recurSummary,
                    ].filter(Boolean);

                    const ctaLabel = (createAppointment.isPending || createRecurringRule.isPending || createGroupSession.isPending)
                      ? t("calendar.creating")
                      : (isGroupSession ? L.ctaGroup : L.ctaIndividual);

                    return (
                      <div className="space-y-1.5 pt-0.5">
                        <div aria-live="polite" aria-atomic="true">
                          {!missingRequired && summaryParts.length > 0 && (
                            <div className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 flex items-center gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                              <p className="text-xs font-medium text-foreground leading-tight">
                                <span className="sr-only">{L.modalSubtitle}: </span>
                                {summaryParts.join(" · ")}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCreateOpen(false)}
                            className={cn("flex-1 text-sm font-medium rounded-xl", D.cta)}
                          >
                            {L.cancel}
                          </Button>
                          <Button
                            type="submit"
                            className={cn("flex-[2] text-sm font-semibold rounded-xl", D.cta)}
                            disabled={disabled}
                            aria-disabled={disabled}
                          >
                            {ctaLabel}
                          </Button>
                        </div>
                        {missingRequired && (
                          <p className="text-[11px] text-muted-foreground text-center leading-tight" role="status">{L.disabledHint}</p>
                        )}
                      </div>
                    );
                  })()}
                </form>

                {/* Nested quick-add: client */}
                <Dialog open={qaClientOpen} onOpenChange={setQaClientOpen}>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{L.qaClientTitle}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label>{L.clientName} *</Label>
                        <Input value={qaClient.name} onChange={e => setQaClient(s => ({ ...s, name: e.target.value }))} autoFocus />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{L.clientEmail}</Label>
                        <Input type="email" value={qaClient.email} onChange={e => setQaClient(s => ({ ...s, email: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{L.clientPhone}</Label>
                        <Input value={qaClient.phone} onChange={e => setQaClient(s => ({ ...s, phone: e.target.value }))} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setQaClientOpen(false)}>{L.cancel}</Button>
                      <Button onClick={handleQuickAddClient} disabled={!qaClient.name.trim() || createClient.isPending}>
                        {createClient.isPending ? t("calendar.creating") : L.saveClient}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Nested quick-add: service */}
                <Dialog open={qaServiceOpen} onOpenChange={setQaServiceOpen}>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{L.qaServiceTitle}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label>{L.serviceName} *</Label>
                        <Input value={qaService.name} onChange={e => setQaService(s => ({ ...s, name: e.target.value }))} autoFocus />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>{L.serviceDuration} ({L.durationMin}) *</Label>
                          <Input type="number" min={5} step={5} value={qaService.duration_minutes}
                            onFocus={e => e.currentTarget.select()}
                            onChange={e => setQaService(s => ({ ...s, duration_minutes: parseInt(e.target.value) || 0 }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>{L.servicePrice} ({cs})</Label>
                          <Input type="number" min={0} step="0.01" value={qaService.price}
                            onFocus={e => e.currentTarget.select()}
                            onChange={e => setQaService(s => ({ ...s, price: parseFloat(e.target.value) || 0 }))} />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setQaServiceOpen(false)}>{L.cancel}</Button>
                      <Button onClick={handleQuickAddService} disabled={!qaService.name.trim() || qaService.duration_minutes <= 0 || createService.isPending}>
                        {createService.isPending ? t("calendar.creating") : L.saveService}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </DialogContent>
            </Dialog>
          </div>
        </div>




        {/* Compact weekly capacity row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-0.5">
          <div className="shrink-0">
            <p className="text-2xl font-bold tabular-nums leading-none text-foreground">
              {fillRates.thisWeek.pct}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {(t as any)("capacity.fillRateThisWeek") || "Fill rate this week"}
            </p>
          </div>

          <div className="hidden sm:block self-stretch w-px bg-border" />

          <div className="flex-1 min-w-[200px] space-y-2">
            <p className="text-sm text-foreground">
              <span className="font-bold tabular-nums">{fillRates.thisWeek.occupied} / {fillRates.thisWeek.slots}</span>{" "}
              <span className="text-muted-foreground">{(t as any)("capacity.slotsThisWeek") || "slots this week"}</span>
            </p>
            <Progress
              value={Math.min(fillRates.thisWeek.pct, 100)}
              className={cn("h-2 w-full max-w-[640px]", fillRates.thisWeek.pct >= 100 ? "[&>div]:bg-destructive" : "")}
            />
          </div>

          {pendingRequests.length > 0 && (
            <button
              type="button"
              onClick={() => setInboxOpen(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Inbox className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
              <span className="font-semibold text-foreground tabular-nums">{pendingRequests.length}</span>
              {(t as any)("booking.pendingRequests") || "Pending requests"}
            </button>
          )}
        </div>




        {effectiveView === "month" && (
          <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
            <div className="grid grid-cols-7 border-b border-border bg-muted/30">
              {DAY_KEYS.map((dk) => (
                <div key={dk} className="p-2 text-center text-xs font-medium text-muted-foreground">
                  {t(dk as any)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthGridDays.map((day, i) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const inMonth = isSameMonth(day, currentDate);
                const dayOff = isDayOff(day);
                const working = isDayWorking(day);
                const dayApts = visibleAppointments.filter(
                  (apt) => toUTCDateStr(new Date(apt.scheduled_at)) === dayStr && apt.status !== "cancelled",
                );
                const dayPending = visiblePendingRequests.filter(
                  (r) => toUTCDateStr(new Date(r.requested_slot_at)) === dayStr,
                );
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (!working || dayOff) return;
                      setForm((f) => ({ ...f, date: dayStr, time: f.time || "09:00" }));
                      const dow = day.getDay();
                      setRecurDays([dow === 0 ? 7 : dow]);
                      setServiceError(false);
                      setCreateOpen(true);
                    }}
                    className={cn(
                      "min-h-[110px] border-l border-b border-border p-1.5 cursor-pointer transition-colors",
                      !inMonth && "bg-muted/20 text-muted-foreground",
                      dayOff && "bg-destructive/5",
                      !working && inMonth && !dayOff && "bg-muted/10",
                      working && !dayOff && "hover:bg-primary/5",
                      isToday && "bg-accent",
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-xs font-semibold", isToday && "text-accent-foreground", dayOff && "text-destructive")}>
                        {format(day, "d")}
                      </span>
                      {dayOff && <CalendarOff className="h-3 w-3 text-destructive" />}
                    </div>
                    <div className="space-y-0.5">
                      {dayApts.slice(0, 3).map((apt: any) => {
                        const si = statusInfo(apt.status);
                        const isGroupEvt = !!apt.group_session_id;
                        const groupName = apt.group_sessions?.groups?.name;
                        const displayName = isGroupEvt && groupName ? groupName : apt.clients?.name;
                        return (
                          <div
                            key={apt.id}
                            onClick={(e) => { e.stopPropagation(); openSessionSheet(apt); }}
                            className={cn("text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer hover:ring-1 hover:ring-ring/30", si.color)}
                            title={`${fmtTime(apt.scheduled_at)} · ${displayName}`}
                          >
                            <span className="font-medium">{fmtTime(apt.scheduled_at)}</span> {displayName}
                          </div>
                        );
                      })}
                      {dayPending.slice(0, 1).map((req) => (
                        <div
                          key={req.id}
                          onClick={(e) => { e.stopPropagation(); setInboxOpen(true); }}
                          className="text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer border border-dashed border-warning/70 bg-warning/15 text-warning-foreground"
                          title={t("booking.pendingRequest") || "Pending request"}
                        >
                          ⏳ {req.matched_client_name || req.first_name}
                        </div>
                      ))}
                      {(dayApts.length + dayPending.length) > 4 && (
                        <div className="text-[10px] text-muted-foreground px-1.5">
                          +{dayApts.length + dayPending.length - 4} {(t as any)("calendar.more") || "more"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {effectiveView !== "month" && (
        <div className="flex flex-col xl:flex-row gap-4 items-start">
        <div
          className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in flex flex-col flex-1 min-w-0 w-full"
          style={{ maxHeight: "calc(100vh - 180px)", minHeight: "480px", touchAction: isMobile ? "pan-y" : undefined }}
          onTouchStart={isMobile ? (e) => {
            const t = e.touches[0];
            (e.currentTarget as any)._swipe = { x: t.clientX, y: t.clientY, cancelled: false };
          } : undefined}
          onTouchMove={isMobile ? (e) => {
            const s = (e.currentTarget as any)._swipe;
            if (!s || s.cancelled) return;
            const t = e.touches[0];
            const dx = t.clientX - s.x;
            const dy = t.clientY - s.y;
            // If vertical movement dominates, treat as scroll and cancel swipe
            if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
              s.cancelled = true;
            }
          } : undefined}
          onTouchEnd={isMobile ? (e) => {
            const s = (e.currentTarget as any)._swipe;
            (e.currentTarget as any)._swipe = null;
            if (!s || s.cancelled) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - s.x;
            const dy = t.clientY - s.y;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) {
              setCurrentDate((d) => addDays(d, dx < 0 ? 1 : -1));
            }
          } : undefined}
        >
          <div className="overflow-auto flex-1 min-h-0" style={{ scrollbarGutter: "stable" }}>
            <table className="w-full border-collapse table-fixed min-w-[760px]">
              <colgroup>
                <col className={isMobile ? "w-[56px]" : "w-[72px]"} />
                {days.map((_, i) => <col key={i} />)}
              </colgroup>
              <thead className="sticky top-0 z-20 bg-card">
                <tr className="border-b border-border">
                  <th className="p-3" />
                  {days.map((day, i) => {
                    const dayOffStatus = isDayOff(day);
                    const working = isDayWorking(day);
                    const isTodayCol = isSameDay(day, new Date());
                    const ds = periodCapacity.dayStats[i];
                    return (
                      <th key={i} className={cn(
                        "px-2 py-2.5 text-center border-l border-border relative group font-normal",
                        isTodayCol ? "bg-primary/[0.06]" : "",
                        dayOffStatus ? "bg-destructive/5" : !working ? "bg-muted/30" : "",
                      )}>
                        <p className={cn(
                          "text-[11px] uppercase tracking-wide",
                          isTodayCol ? "text-primary font-semibold" : "text-muted-foreground",
                        )}>{format(day, "EEE", { locale: dateLocale })}</p>
                        <p className={cn(
                          "text-base font-semibold mt-0.5",
                          isTodayCol ? "text-primary" : dayOffStatus ? "text-destructive" : "text-foreground",
                        )}>
                          {format(day, "MMM d", { locale: dateLocale })}
                        </p>
                        {ds?.working && ds.slots > 0 && (
                          <p className={cn(
                            "text-[10px] tabular-nums mt-0.5",
                            isTodayCol ? "text-primary/80" : "text-muted-foreground",
                          )}>{ds.booked} / {ds.slots}</p>
                        )}

                        {dayOffStatus && (
                          <Badge variant="outline" className="text-[9px] px-1 border-destructive/20 text-destructive absolute top-1 right-1">
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
                      const pendingReqs = getPendingRequestsForDayHour(day, hour);
                      const working = isHourWorking(day, hour);
                      const dayOff = isDayOff(day);
                      const hasAny = events.length > 0 || pendingReqs.length > 0;
                      return (
                        <td key={dayIdx}
                          onClick={() => {
                            if (dayOff || !working) return;
                            if (hasAny) return;
                            const dateStr = format(day, "yyyy-MM-dd");
                            const timeStr = `${hour.toString().padStart(2, "0")}:00`;
                            setForm(f => ({ ...f, date: dateStr, time: timeStr }));
                            // Preselect the weekday for recurrence (1=Mon..7=Sun)
                            const dow = day.getDay();
                            setRecurDays([dow === 0 ? 7 : dow]);
                            setServiceError(false);
                            setCreateOpen(true);
                          }}
                          onDragOver={(e) => handleDragOver(e, day, hour)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, day, hour)}
                          className={cn(
                            "relative border-l border-b border-border h-[60px] transition-colors",
                            dayOff ? "bg-destructive/5 cursor-not-allowed" : !working ? "bg-muted/20 cursor-not-allowed" : !hasAny ? "hover:bg-primary/5 cursor-pointer group/slot" : "",
                            dragOverSlot === `${format(day, "yyyy-MM-dd")}-${hour}` && dragAptId && canDropOnSlot(day, hour, dragAptId) && "bg-primary/15 ring-2 ring-primary/30 ring-inset",
                            dragOverSlot === `${format(day, "yyyy-MM-dd")}-${hour}` && dragAptId && !canDropOnSlot(day, hour, dragAptId) && "bg-destructive/10 ring-2 ring-destructive/30 ring-inset",
                          )}>
                          {!hasAny && working && !dayOff && !dragAptId && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity pointer-events-none">
                              <Plus className="h-4 w-4 text-primary/40" />
                            </div>
                          )}
                          {pendingReqs.map((req, idx) => {
                            const heightPx = Math.max((req.duration_minutes / 60) * 60 - 4, 20);
                            const name = req.matched_client_name || `${req.first_name}${req.last_name ? " " + req.last_name : ""}`.trim();
                            return (
                              <div
                                key={req.id}
                                onClick={(e) => { e.stopPropagation(); setInboxOpen(true); }}
                                className={cn(
                                  "absolute inset-x-1 rounded-md border-2 border-dashed border-warning/70 bg-warning/15 text-warning-foreground p-1.5 cursor-pointer hover:ring-2 hover:ring-warning/50 transition-all z-20 overflow-hidden shadow-sm",
                                  "animate-pulse-soft",
                                )}

                                style={{ top: `${idx * 4}px`, height: `${heightPx}px` }}
                                title={t("booking.pendingRequest") || "Pending booking request"}
                              >
                                <div className="flex items-center gap-1">
                                  <Inbox className="h-3 w-3 shrink-0 opacity-70" />
                                  <p className="text-xs font-semibold truncate flex-1">{name}</p>
                                </div>
                                <p className="text-[10px] opacity-70 truncate">
                                  {req.status === "needs_linking" ? (t("booking.needsLinking") || "Needs linking") : (t("booking.pending") || "Pending")}
                                </p>
                              </div>
                            );
                          })}
                          {events.map((evt, evtIdx) => {
                            const si = statusInfo(evt.status);
                            const heightPx = Math.max((evt.duration_minutes / 60) * 60 - 4, 20);
                            const isActiveEvt = evt.status === "scheduled" || evt.status === "confirmed" || evt.status === "reminder_sent";
                            const client = clients.find(c => c.id === evt.client_id);
                            const isGroupEvt = !!(evt as any).group_session_id;
                            const groupName = (evt as any).group_sessions?.groups?.name;
                            const needsConfirmation = !isGroupEvt && client?.confirmation_required && evt.confirmation_status !== "confirmed";
                            const isConfirmed = !isGroupEvt && evt.confirmation_status === "confirmed";
                            const displayName = isGroupEvt && groupName ? groupName : (evt as any).clients?.name;
                            // Split slot horizontally so concurrent events don't overlap (each is visible & clickable)
                            const total = events.length;
                            const widthPct = 100 / total;
                            const leftPct = widthPct * evtIdx;
                            return (
                              <div key={evt.id}
                                draggable={isActiveEvt}
                                onDragStart={isActiveEvt ? (e) => handleDragStart(e, evt.id) : undefined}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => { e.stopPropagation(); openSessionSheet(evt); }}
                                className={cn(
                                  "absolute top-0 rounded-md border p-1.5 cursor-pointer hover:ring-2 hover:ring-ring/30 transition-all z-10 overflow-hidden",
                                  si.color,
                                  isGroupEvt && "border-primary/40",
                                  needsConfirmation && "border-warning/50",
                                  isConfirmed && "border-success/50",
                                  isActiveEvt && "cursor-grab active:cursor-grabbing",
                                  dragAptId === evt.id && "opacity-40 ring-2 ring-primary",
                                )}
                                style={{ height: `${heightPx}px`, left: `calc(${leftPct}% + 4px)`, width: `calc(${widthPct}% - 8px)` }}>

                                <div className="flex items-center gap-1">
                                  {isGroupEvt && <Users className="h-3 w-3 shrink-0 opacity-70" />}
                                  <p className="text-xs font-semibold truncate flex-1">{displayName}</p>
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

          <aside className="hidden xl:block w-[340px] shrink-0">
            {agendaContent}
          </aside>

        </div>
        )}

        </section>

      </div>


      <Sheet open={agendaOpen} onOpenChange={setAgendaOpen}>
        <SheetContent side={isMobile ? "bottom" : "right"} className={cn("overflow-y-auto", isMobile ? "h-[85vh] rounded-t-2xl" : "w-full sm:max-w-md")}>
          <SheetHeader className="sr-only">
            <SheetTitle>{(t as any)("calendar.agenda") || "Adaptive Agenda"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{agendaContent}</div>
        </SheetContent>
      </Sheet>

      <Sheet open={inboxOpen} onOpenChange={setInboxOpen}>

        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Inbox className="h-4 w-4" /> {t("booking.inbox") || "Booking inbox"}
              {pendingRequests.length > 0 && (
                <Badge variant="outline" className="border-warning/40 text-warning">{pendingRequests.length}</Badge>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <BookingInboxPanel className="w-full" />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("settings.calendarSettings") || "Calendar settings"}</SheetTitle>
          </SheetHeader>
          <Tabs defaultValue="hours" className="mt-4 space-y-4">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="hours">{t("settings.workingHours")}</TabsTrigger>
              <TabsTrigger value="daysOff">{t("settings.daysOff")}</TabsTrigger>
              <TabsTrigger value="booking">{t("settings.publicBooking")}</TabsTrigger>
              <TabsTrigger value="practice">{t("settings.practiceProfile")}</TabsTrigger>
            </TabsList>
            <TabsContent value="hours"><WorkingHoursSection /></TabsContent>
            <TabsContent value="daysOff"><DaysOffSection /></TabsContent>
            <TabsContent value="booking"><PublicBookingSection /></TabsContent>
            <TabsContent value="practice"><PracticeProfileSection /></TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

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
                  <span className="font-medium">{apt.group_session_id && apt.group_sessions?.groups?.name ? apt.group_sessions.groups.name : apt.clients?.name}</span>
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

