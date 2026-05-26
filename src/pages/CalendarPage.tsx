import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SessionDetailSheet } from "@/components/SessionDetailSheet";
import { ClientPicker } from "@/components/ClientPicker";
import { DateTimePicker, DatePicker } from "@/components/ui/date-time-picker";
import { ChevronLeft, ChevronRight, Plus, Repeat, CalendarOff, BarChart3, GripVertical, Users, Settings as SettingsIcon, UserPlus, Briefcase, CheckCircle2, Circle } from "lucide-react";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfWeek, isSameDay, isBefore, startOfDay } from "date-fns";
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
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBookingRequests, type BookingRequestRow } from "@/hooks/useBookingInbox";
import { useNavigate } from "react-router-dom";
import { Inbox } from "lucide-react";
import { BookingInboxPanel } from "@/components/BookingInboxPanel";
import { WorkingHoursSection, DaysOffSection, PracticeProfileSection } from "@/components/settings/CalendarSections";
import { PublicBookingSection } from "@/components/PublicBookingSection";

const DAY_KEYS = ["day.mon", "day.tue", "day.wed", "day.thu", "day.fri", "day.sat", "day.sun"] as const;

type LangKey = "en" | "uk" | "fr" | "pl";
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



export default function CalendarPage() {
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
  const pendingRequests = useMemo(
    () => bookingRequests.filter(r => r.status === "pending" || r.status === "needs_linking"),
    [bookingRequests],
  );
  const { data: clients = [] } = useClients();
  const { data: services = [] } = useServices();
  const { data: profile } = useProfile();
  const { data: workingSchedule = [] } = useWorkingSchedule();
  const { data: daysOff = [] } = useDaysOff();
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

  // Realtime: invalidate appointments + booking-requests when DB changes
  useEffect(() => {
    const channel = supabase
      .channel("calendar-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "session_booking_requests" }, () => {
        qc.invalidateQueries({ queryKey: ["booking-requests"] });
        qc.invalidateQueries({ queryKey: ["booking-requests-count"] });
        qc.invalidateQueries({ queryKey: ["appointments"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        qc.invalidateQueries({ queryKey: ["appointments"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);



  // Drag-and-drop state
  const [dragAptId, setDragAptId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [recurMoveOpen, setRecurMoveOpen] = useState(false);
  const pendingMove = useRef<{ aptId: string; newDate: string; newTime: string } | null>(null);

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
  const L = NEW_COPY[(["en", "uk", "fr", "pl"].includes(lang as any) ? lang : "en") as LangKey];

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
  const days = isMobile ? [currentDate] : weekDays;

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
              });
              const ruleId = (result as any).rule?.id;
              if (ruleId) {
                const { data: ruleApts } = await supabase.from("appointments")
                  .select("id").eq("recurring_rule_id", ruleId).order("scheduled_at");
                if (ruleApts && ruleApts.length > 0) {
                  await supabase.from("appointments")
                    .update({ notes: `[Group: ${groupName}] ${savedNotes || ""}`.trim() } as any)
                    .eq("recurring_rule_id", ruleId);
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
        await createAppointment.mutateAsync({
          client_id: form.client_id, service_id: form.service_id,
          scheduled_at: `${form.date}T${form.time}:00Z`,
          duration_minutes: service?.duration_minutes ?? 60,
          price: Number(service?.price ?? 0),
          notes: form.notes || undefined,
        });

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
        await createAppointment.mutateAsync({
          client_id: form.client_id, service_id: form.service_id,
          scheduled_at: `${form.date}T${form.time}:00Z`,
          duration_minutes: service?.duration_minutes ?? 60,
          price: Number(service?.price ?? 0),
          notes: form.notes || undefined,
        });
        setForm({ client_id: "", service_id: "", date: "", time: "09:00", notes: "" });
        setServiceError(false);
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

  const getPendingRequestsForDayHour = (day: Date, hour: number): BookingRequestRow[] => {
    const dayStr = format(day, "yyyy-MM-dd");
    return pendingRequests.filter(req => {
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

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <section className="space-y-6 flex-1 min-w-0" aria-label="Calendar">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("calendar.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("calendar.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {isMobile ? (
              <div className="flex items-center gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  aria-label={t("calendar.previousDay") || "Previous day"}
                  onClick={() => setCurrentDate(d => addDays(d, -1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t("calendar.prev") || "Prev"}
                </Button>
                <Button
                  variant={isSameDay(currentDate, new Date()) ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                  aria-label={t("calendar.today") || "Today"}
                >
                  {t("calendar.today") || "Today"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  aria-label={t("calendar.nextDay") || "Next day"}
                  onClick={() => setCurrentDate(d => addDays(d, 1))}
                >
                  {t("calendar.next") || "Next"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
                <Button variant="ghost" size="icon" aria-label="Previous week" onClick={() => setCurrentDate(d => addDays(d, -7))}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm font-medium px-2 sm:px-3 text-foreground whitespace-nowrap">
                  {`${format(weekStart, "MMM d", { locale: dateLocale })} – ${format(addDays(weekStart, 6), "MMM d, yyyy", { locale: dateLocale })}`}
                </span>
                <Button variant="ghost" size="icon" aria-label="Next week" onClick={() => setCurrentDate(d => addDays(d, 7))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
            {isMobile && (
              <div className="w-full text-center text-sm font-semibold text-foreground" aria-live="polite">
                {format(currentDate, "EEEE, MMM d, yyyy", { locale: dateLocale })}
              </div>
            )}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> {t("calendar.newAppointment")}</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[92vh] sm:max-h-[85vh] overflow-y-auto max-w-[calc(100vw-1rem)] sm:max-w-[520px] rounded-2xl shadow-2xl p-0 mx-2 sm:mx-0">
                {(() => {
                  const stepClient = !!form.client_id || (isGroupSession && !!groupId);
                  const stepService = !!form.service_id;
                  const stepDate = !!form.date && !!form.time;
                  const stepNotes = !!form.notes || stepDate;
                  const steps = [stepClient, stepService, stepDate, stepNotes];
                  return (
                    <div className="grid grid-cols-4 gap-1.5 px-4 pt-4 sm:px-5">
                      {steps.map((done, i) => (
                        <div key={i} className={cn("h-1 rounded-full transition-colors", done ? "bg-primary" : "bg-muted")} />
                      ))}
                    </div>
                  );
                })()}

                <DialogHeader className="px-4 pt-4 pb-1 space-y-0.5 text-left sm:px-5">
                  <DialogTitle className="text-xl font-bold tracking-tight">{t("calendar.newAppointment")}</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">{L.modalSubtitle}</DialogDescription>
                </DialogHeader>

                <div className="px-4 pt-3 pb-5 space-y-4 sm:px-5">
                  {/* Session type — two large pills */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setIsGroupSession(false); setGroupId(""); }}
                      className={cn(
                        "flex items-center justify-center gap-1.5 h-9 rounded-xl border-2 text-sm font-medium transition-all",
                        !isGroupSession
                          ? "border-foreground bg-background text-foreground shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-muted-foreground/60"
                      )}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>{L.individualSession}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsGroupSession(true); setForm(f => ({ ...f, client_id: "" })); }}
                      disabled={activeGroups.length === 0}
                      className={cn(
                        "flex items-center justify-center gap-1.5 h-9 rounded-xl border-2 text-sm font-medium transition-all",
                        isGroupSession
                          ? "border-foreground bg-background text-foreground shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-muted-foreground/60",
                        activeGroups.length === 0 && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>{L.groupSession}</span>
                    </button>
                  </div>

                  {/* Client / Group */}
                  {isGroupSession ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">
                        {t("groups.selectGroup")} <span className="text-primary">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <Select value={groupId} onValueChange={setGroupId}>
                          <SelectTrigger className="h-9 flex-1"><SelectValue placeholder={t("groups.selectGroup")} /></SelectTrigger>
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
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">
                        {t("calendar.client")} <span className="text-primary">*</span>
                      </Label>
                      {clients.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-3 space-y-1.5 bg-muted/20 text-center">
                          <p className="text-sm text-muted-foreground">{L.noClientsYet}</p>
                          <Button type="button" variant="outline" size="sm" className="gap-1 h-8" onClick={() => setQaClientOpen(true)}>
                            <UserPlus className="h-3.5 w-3.5" /> {L.addNewClient}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <ClientPicker
                            clients={clients}
                            value={form.client_id}
                            onChange={v => setForm(f => ({ ...f, client_id: v }))}
                            placeholder={t("calendar.selectClient")}
                            triggerClassName="h-9 flex-1"
                          />
                          <Button type="button" variant="outline" className="h-9 px-2.5 gap-1 whitespace-nowrap shrink-0" onClick={() => setQaClientOpen(true)}>
                            <Plus className="h-3.5 w-3.5" /> {L.addNewClient}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Service */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">
                      {t("calendar.service")} <span className="text-primary">*</span>
                    </Label>
                    {services.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-3 space-y-1.5 bg-muted/20 text-center">
                        <p className="text-sm text-muted-foreground">{L.noServicesYet}</p>
                        <Button type="button" variant="outline" size="sm" className="gap-1 h-8" onClick={() => setQaServiceOpen(true)}>
                          <Briefcase className="h-3.5 w-3.5" /> {L.addNewService}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <Select value={form.service_id} onValueChange={v => { setForm(f => ({ ...f, service_id: v })); setServiceError(false); }}>
                            <SelectTrigger className={cn("h-9 flex-1", serviceError && "border-destructive")}><SelectValue placeholder={t("calendar.selectService")} /></SelectTrigger>
                            <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {cs}{Number(s.price).toFixed(0)}</SelectItem>)}</SelectContent>
                          </Select>
                          <Button type="button" variant="outline" className="h-9 px-2.5 gap-1 whitespace-nowrap shrink-0" onClick={() => setQaServiceOpen(true)}>
                            <Plus className="h-3.5 w-3.5" /> {L.addNewService}
                          </Button>
                        </div>
                        {serviceError && (
                          <p className="text-sm text-destructive">⚠️ {t("calendar.service")} is required</p>
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
                    <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                      ⚠️ {createValidation}
                    </div>
                  )}

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">{t("calendar.notes")}</Label>
                    <Textarea
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder={isGroupSession ? L.notesGroupPlaceholder : L.notesPlaceholder}
                      rows={2}
                      className="resize-none min-h-[68px] rounded-lg"
                    />
                  </div>

                  {/* Repeat session — orange highlighted toggle row */}
                  <div className={cn(
                    "rounded-xl border-2 transition-all overflow-hidden",
                    isRecurring ? "border-primary bg-primary/10" : "border-border bg-background"
                  )}>
                    <button
                      type="button"
                      onClick={() => setIsRecurring(v => !v)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                    >
                      <span className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors",
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
                      <div className="px-3 pb-3 pt-0.5 space-y-3 bg-muted/30 border-t border-border/60">
                        <div className="space-y-1 pt-2">
                          <Label className="text-xs font-bold uppercase text-muted-foreground">{t("recurring.intervalWeeks")}</Label>
                          <Select value={recurInterval.toString()} onValueChange={v => setRecurInterval(parseInt(v))}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">{t("recurring.weekly")}</SelectItem>
                              <SelectItem value="2">{t("recurring.biweekly")}</SelectItem>
                              <SelectItem value="3">{t("recurring.custom", { n: "3" })}</SelectItem>
                              <SelectItem value="4">{t("recurring.custom", { n: "4" })}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-bold uppercase text-muted-foreground">{t("recurring.daysOfWeek")}</Label>
                          <div className="grid grid-cols-7 gap-1">
                            {DAY_KEYS.map((key, i) => {
                              const active = recurDays.includes(i + 1);
                              return (
                                <button key={i} type="button" onClick={() => toggleRecurDay(i + 1)}
                                  className={cn("h-8 rounded-md text-xs font-medium transition-colors border-2",
                                    active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:border-muted-foreground/60"
                                  )}>
                                  {t(key as any)}
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
                      <div className="space-y-2 pt-0.5">
                        {!missingRequired && summaryParts.length > 0 && (
                          <div className="rounded-xl border-2 border-primary/40 bg-primary/10 px-3 py-2 flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                            <p className="text-xs font-medium text-foreground leading-relaxed">
                              {summaryParts.join(" · ")}
                            </p>
                          </div>
                        )}
                        <Button
                          onClick={handleCreate}
                          className="w-full h-10 text-sm font-semibold rounded-xl"
                          disabled={disabled}
                        >
                          {ctaLabel}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCreateOpen(false)}
                          className="w-full h-10 text-sm font-medium rounded-xl"
                        >
                          {L.cancel}
                        </Button>
                        {missingRequired && (
                          <p className="text-xs text-muted-foreground text-center">{L.disabledHint}</p>
                        )}
                      </div>
                    );
                  })()}
                </div>

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
                            onChange={e => setQaService(s => ({ ...s, duration_minutes: parseInt(e.target.value) || 0 }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>{L.servicePrice} ({cs})</Label>
                          <Input type="number" min={0} step="0.01" value={qaService.price}
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("settings.calendarSettings") || "Calendar settings"}
                  onClick={() => setSettingsOpen(true)}
                >
                  <SettingsIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("settings.calendarSettings") || "Calendar settings"}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {pendingRequests.length > 0 && (
          <button
            type="button"
            onClick={() => navigate("/booking-inbox")}
            className="w-full flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 hover:bg-warning/15 p-3 sm:p-4 text-left animate-fade-in transition-colors"
          >
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/20">
              <Inbox className="h-4 w-4 text-warning" />
              <span className="absolute inset-0 rounded-full ring-2 ring-warning/40 animate-ping" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {pendingRequests.length === 1
                  ? (t("booking.pendingBannerOne") || "1 new booking request awaiting your review")
                  : (t("booking.pendingBannerMany") || `${pendingRequests.length} new booking requests awaiting your review`).replace("{count}", String(pendingRequests.length))}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {t("booking.pendingBannerHint") || "Pending requests are highlighted on the calendar below. Click to review and approve."}
              </p>
            </div>
            <Badge variant="outline" className="border-warning/40 text-warning shrink-0">
              {pendingRequests.length}
            </Badge>
          </button>
        )}



        {/* Weekly capacity bar */}
        <div className="bg-card rounded-xl border border-border p-3 sm:p-4 animate-fade-in">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 flex-wrap">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{t("capacity.title")}</span>
            <div className="flex items-center gap-2 sm:gap-4 ml-auto text-xs text-muted-foreground">
              <span>{t("capacity.totalSlots")}: {weekCapacity.totalSlots}</span>
              <span>{t("capacity.booked")}: {weekCapacity.totalBooked}</span>
              <span>{t("capacity.free")}: {weekCapacity.totalFree}</span>
            </div>
          </div>
          <div className={cn("grid gap-0", isMobile ? "grid-cols-[56px_1fr]" : "grid-cols-[72px_repeat(7,1fr)]")}>
            <div />{/* spacer for time column */}
            {weekCapacity.dayStats.map((ds, i) => {
              const dow = days[i].getDay();
              const dayKeyIdx = dow === 0 ? 6 : dow - 1;
              const pct = ds.slots > 0 ? (ds.booked / ds.slots) * 100 : 0;
              const isFull = ds.slots > 0 && ds.booked >= ds.slots;
              const isLow = ds.working && ds.slots > 0 && pct < 30;
              return (
                <div key={i} className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t(DAY_KEYS[dayKeyIdx] as any)}</p>
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

        <div
          className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in flex flex-col"
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
                    return (
                      <th key={i} className={cn(
                        "p-3 text-center border-l border-border relative group font-normal",
                        isSameDay(day, new Date()) ? "bg-accent" : "",
                        dayOffStatus ? "bg-destructive/5" : !working ? "bg-muted/30" : "",
                      )}>
                        <p className="text-xs text-muted-foreground">{format(day, "EEE", { locale: dateLocale })}</p>
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
                                onClick={(e) => { e.stopPropagation(); navigate("/booking-inbox"); }}
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
                          {events.map((evt) => {
                            const si = statusInfo(evt.status);
                            const heightPx = Math.max((evt.duration_minutes / 60) * 60 - 4, 20);
                            const isActiveEvt = evt.status === "scheduled" || evt.status === "confirmed" || evt.status === "reminder_sent";
                            const client = clients.find(c => c.id === evt.client_id);
                            const isGroupEvt = !!(evt as any).group_session_id;
                            const groupName = (evt as any).group_sessions?.groups?.name;
                            const needsConfirmation = !isGroupEvt && client?.confirmation_required && evt.confirmation_status !== "confirmed";
                            const isConfirmed = !isGroupEvt && evt.confirmation_status === "confirmed";
                            const displayName = isGroupEvt && groupName ? groupName : (evt as any).clients?.name;
                            return (
                              <div key={evt.id}
                                draggable={isActiveEvt}
                                onDragStart={isActiveEvt ? (e) => handleDragStart(e, evt.id) : undefined}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => { e.stopPropagation(); openSessionSheet(evt); }}
                                className={cn(
                                  "absolute inset-x-1 top-0 rounded-md border p-1.5 cursor-pointer hover:ring-2 hover:ring-ring/30 transition-all z-10 overflow-hidden",
                                  si.color,
                                  isGroupEvt && "border-primary/40",
                                  needsConfirmation && "border-warning/50",
                                  isConfirmed && "border-success/50",
                                  isActiveEvt && "cursor-grab active:cursor-grabbing",
                                  dragAptId === evt.id && "opacity-40 ring-2 ring-primary",
                                )}
                                style={{ height: `${heightPx}px` }}>
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
        </section>

        <section aria-label="Booking inbox">
          <BookingInboxPanel className="w-full" />
        </section>
      </div>


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

