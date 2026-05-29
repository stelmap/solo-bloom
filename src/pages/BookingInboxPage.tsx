import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ClientPicker } from "@/components/ClientPicker";
import { useClients, useCreateClient, useServices, useProfile } from "@/hooks/useData";
import { sendBookingConfirmationEmail } from "@/lib/sendBookingConfirmationEmail";
import {
  useBookingRequests, useConfirmBookingRequest,
  useDeclineBookingRequest, useLinkBookingRequestClient,
  type BookingRequestRow,
} from "@/hooks/useBookingInbox";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { getDateLocale } from "@/lib/dateLocale";
import { format as fnsFormat } from "date-fns";
import { Loader2, Mail, Phone, CheckCircle2, XCircle, UserPlus, RefreshCw, AlertCircle, Sparkles } from "lucide-react";

type Lang = "en" | "uk" | "fr" | "pl";

const COPY: Record<Lang, {
  title: string; subtitle: string; refresh: string;
  actionNeeded: string;
  pendingOne: string; pendingMany: (n: number) => string;
  needLinkingOne: string; needLinkingMany: (n: number) => string;
  showPending: string;
  statusAll: string; statusPending: string; statusNeedsLinking: string;
  statusConfirmed: string; statusDeclined: string; statusSpam: string;
  statusLabel: Record<string, string>;
  colSlot: string; colRequester: string; colMatched: string; colComment: string; colStatus: string; colActions: string;
  loading: string; empty: string; notLinked: string; newBadge: string; minutes: (n: number) => string;
  actLink: string; actCreateNew: string; actConfirm: string;
  toastChooseClient: string; toastConfirmed: string; toastCouldNotConfirm: string;
  toastMarkedSpam: string; toastDeclined: string; toastCouldNotUpdate: string;
  toastLinked: string; toastCouldNotLink: string;
  toastNameEmailReq: string; toastLinkedExisting: string; toastMatchedBy: (n: string) => string;
  toastCreated: string; toastCouldNotCreate: string;
  linkTitle: string; requesterLbl: string; cancel: string; linkBtn: string;
  confirmTitle: string; confirmDesc: (s: string) => string;
  clientLbl: string; serviceLbl: string; pickService: string; confirmBtn: string;
  createTitle: string; createDesc: string;
  nameLbl: string; emailLbl: string; phoneLbl: string; notesLbl: string; createBtn: string;
}> = {
  en: {
    title: "Booking inbox", subtitle: "Incoming requests from your public booking link.", refresh: "Refresh",
    actionNeeded: "Action needed.",
    pendingOne: "1 new request to review", pendingMany: (n) => `${n} new requests to review`,
    needLinkingOne: "1 needs client linking", needLinkingMany: (n) => `${n} need client linking`,
    showPending: "Show pending",
    statusAll: "All", statusPending: "Pending", statusNeedsLinking: "Needs linking",
    statusConfirmed: "Confirmed", statusDeclined: "Declined", statusSpam: "Spam",
    statusLabel: { pending: "pending", needs_linking: "needs linking", confirmed: "confirmed", cancelled_therapist: "declined", cancelled_client: "cancelled", spam: "spam", expired: "expired" },
    colSlot: "Requested slot", colRequester: "Requester", colMatched: "Matched client", colComment: "Comment", colStatus: "Status", colActions: "Actions",
    loading: "Loading…", empty: "No booking requests.", notLinked: "Not linked", newBadge: "New", minutes: (n) => `${n} min`,
    actLink: "Link", actCreateNew: "Create new", actConfirm: "Confirm",
    toastChooseClient: "Choose a client to confirm", toastConfirmed: "Booking confirmed", toastCouldNotConfirm: "Could not confirm",
    toastMarkedSpam: "Marked as spam", toastDeclined: "Declined", toastCouldNotUpdate: "Could not update",
    toastLinked: "Client linked", toastCouldNotLink: "Could not link",
    toastNameEmailReq: "Name and email are required", toastLinkedExisting: "Linked to existing client",
    toastMatchedBy: (n) => `Matched ${n} by email`, toastCreated: "Client created and linked", toastCouldNotCreate: "Could not create client",
    linkTitle: "Attach client to request", requesterLbl: "Requester:", cancel: "Cancel", linkBtn: "Link client",
    confirmTitle: "Confirm booking", confirmDesc: (s) => `This will create an appointment on ${s}.`,
    clientLbl: "Client", serviceLbl: "Service", pickService: "Pick a service", confirmBtn: "Confirm booking",
    createTitle: "Create new client from request", createDesc: "If a client with this email already exists, it will be linked instead of duplicated.",
    nameLbl: "Name", emailLbl: "Email", phoneLbl: "Phone", notesLbl: "Notes", createBtn: "Create & link",
  },
  uk: {
    title: "Вхідні бронювання", subtitle: "Запити з вашого публічного посилання для бронювання.", refresh: "Оновити",
    actionNeeded: "Потрібна дія.",
    pendingOne: "1 новий запит на розгляд", pendingMany: (n) => `${n} нових запитів на розгляд`,
    needLinkingOne: "1 потребує прив'язки клієнта", needLinkingMany: (n) => `${n} потребують прив'язки клієнта`,
    showPending: "Показати очікувані",
    statusAll: "Усі", statusPending: "Очікують", statusNeedsLinking: "Потребує прив'язки",
    statusConfirmed: "Підтверджено", statusDeclined: "Відхилено", statusSpam: "Спам",
    statusLabel: { pending: "очікує", needs_linking: "потребує прив'язки", confirmed: "підтверджено", cancelled_therapist: "відхилено", cancelled_client: "скасовано", spam: "спам", expired: "прострочено" },
    colSlot: "Бажаний час", colRequester: "Заявник", colMatched: "Прив'язаний клієнт", colComment: "Коментар", colStatus: "Статус", colActions: "Дії",
    loading: "Завантаження…", empty: "Немає запитів на бронювання.", notLinked: "Не прив'язано", newBadge: "Нове", minutes: (n) => `${n} хв`,
    actLink: "Прив'язати", actCreateNew: "Створити нового", actConfirm: "Підтвердити",
    toastChooseClient: "Оберіть клієнта для підтвердження", toastConfirmed: "Бронювання підтверджено", toastCouldNotConfirm: "Не вдалося підтвердити",
    toastMarkedSpam: "Позначено як спам", toastDeclined: "Відхилено", toastCouldNotUpdate: "Не вдалося оновити",
    toastLinked: "Клієнта прив'язано", toastCouldNotLink: "Не вдалося прив'язати",
    toastNameEmailReq: "Ім'я та email обов'язкові", toastLinkedExisting: "Прив'язано до існуючого клієнта",
    toastMatchedBy: (n) => `Знайдено ${n} за email`, toastCreated: "Клієнта створено та прив'язано", toastCouldNotCreate: "Не вдалося створити клієнта",
    linkTitle: "Прив'язати клієнта до запиту", requesterLbl: "Заявник:", cancel: "Скасувати", linkBtn: "Прив'язати клієнта",
    confirmTitle: "Підтвердити бронювання", confirmDesc: (s) => `Це створить зустріч на ${s}.`,
    clientLbl: "Клієнт", serviceLbl: "Послуга", pickService: "Оберіть послугу", confirmBtn: "Підтвердити бронювання",
    createTitle: "Створити нового клієнта із запиту", createDesc: "Якщо клієнт з таким email вже існує, його буде прив'язано без дублювання.",
    nameLbl: "Ім'я", emailLbl: "Email", phoneLbl: "Телефон", notesLbl: "Нотатки", createBtn: "Створити та прив'язати",
  },
  fr: {
    title: "Boîte de réservations", subtitle: "Demandes entrantes via votre lien public de réservation.", refresh: "Actualiser",
    actionNeeded: "Action requise.",
    pendingOne: "1 nouvelle demande à examiner", pendingMany: (n) => `${n} nouvelles demandes à examiner`,
    needLinkingOne: "1 à associer à un client", needLinkingMany: (n) => `${n} à associer à un client`,
    showPending: "Afficher en attente",
    statusAll: "Toutes", statusPending: "En attente", statusNeedsLinking: "À associer",
    statusConfirmed: "Confirmé", statusDeclined: "Refusé", statusSpam: "Spam",
    statusLabel: { pending: "en attente", needs_linking: "à associer", confirmed: "confirmé", cancelled_therapist: "refusé", cancelled_client: "annulé", spam: "spam", expired: "expiré" },
    colSlot: "Créneau demandé", colRequester: "Demandeur", colMatched: "Client associé", colComment: "Commentaire", colStatus: "Statut", colActions: "Actions",
    loading: "Chargement…", empty: "Aucune demande de réservation.", notLinked: "Non associé", newBadge: "Nouveau", minutes: (n) => `${n} min`,
    actLink: "Associer", actCreateNew: "Créer nouveau", actConfirm: "Confirmer",
    toastChooseClient: "Choisissez un client à confirmer", toastConfirmed: "Réservation confirmée", toastCouldNotConfirm: "Échec de la confirmation",
    toastMarkedSpam: "Marqué comme spam", toastDeclined: "Refusé", toastCouldNotUpdate: "Échec de la mise à jour",
    toastLinked: "Client associé", toastCouldNotLink: "Échec de l'association",
    toastNameEmailReq: "Nom et email requis", toastLinkedExisting: "Associé au client existant",
    toastMatchedBy: (n) => `Correspondance avec ${n} par email`, toastCreated: "Client créé et associé", toastCouldNotCreate: "Échec de la création",
    linkTitle: "Associer un client à la demande", requesterLbl: "Demandeur :", cancel: "Annuler", linkBtn: "Associer le client",
    confirmTitle: "Confirmer la réservation", confirmDesc: (s) => `Un rendez-vous sera créé le ${s}.`,
    clientLbl: "Client", serviceLbl: "Service", pickService: "Choisir un service", confirmBtn: "Confirmer la réservation",
    createTitle: "Créer un nouveau client depuis la demande", createDesc: "Si un client existe déjà avec cet email, il sera associé sans doublon.",
    nameLbl: "Nom", emailLbl: "Email", phoneLbl: "Téléphone", notesLbl: "Notes", createBtn: "Créer et associer",
  },
  pl: {
    title: "Skrzynka rezerwacji", subtitle: "Przychodzące prośby z Twojego publicznego linku rezerwacji.", refresh: "Odśwież",
    actionNeeded: "Wymagane działanie.",
    pendingOne: "1 nowa prośba do rozpatrzenia", pendingMany: (n) => `${n} nowych próśb do rozpatrzenia`,
    needLinkingOne: "1 wymaga powiązania klienta", needLinkingMany: (n) => `${n} wymaga powiązania klienta`,
    showPending: "Pokaż oczekujące",
    statusAll: "Wszystkie", statusPending: "Oczekujące", statusNeedsLinking: "Do powiązania",
    statusConfirmed: "Potwierdzone", statusDeclined: "Odrzucone", statusSpam: "Spam",
    statusLabel: { pending: "oczekuje", needs_linking: "do powiązania", confirmed: "potwierdzone", cancelled_therapist: "odrzucone", cancelled_client: "anulowane", spam: "spam", expired: "wygasłe" },
    colSlot: "Żądany termin", colRequester: "Wnioskodawca", colMatched: "Powiązany klient", colComment: "Komentarz", colStatus: "Status", colActions: "Akcje",
    loading: "Ładowanie…", empty: "Brak próśb o rezerwację.", notLinked: "Niepowiązane", newBadge: "Nowe", minutes: (n) => `${n} min`,
    actLink: "Powiąż", actCreateNew: "Utwórz nowego", actConfirm: "Potwierdź",
    toastChooseClient: "Wybierz klienta do potwierdzenia", toastConfirmed: "Rezerwacja potwierdzona", toastCouldNotConfirm: "Nie udało się potwierdzić",
    toastMarkedSpam: "Oznaczono jako spam", toastDeclined: "Odrzucono", toastCouldNotUpdate: "Nie udało się zaktualizować",
    toastLinked: "Klient powiązany", toastCouldNotLink: "Nie udało się powiązać",
    toastNameEmailReq: "Imię i email są wymagane", toastLinkedExisting: "Powiązano z istniejącym klientem",
    toastMatchedBy: (n) => `Dopasowano ${n} po emailu`, toastCreated: "Klient utworzony i powiązany", toastCouldNotCreate: "Nie udało się utworzyć klienta",
    linkTitle: "Przypisz klienta do prośby", requesterLbl: "Wnioskodawca:", cancel: "Anuluj", linkBtn: "Powiąż klienta",
    confirmTitle: "Potwierdź rezerwację", confirmDesc: (s) => `To utworzy spotkanie w dniu ${s}.`,
    clientLbl: "Klient", serviceLbl: "Usługa", pickService: "Wybierz usługę", confirmBtn: "Potwierdź rezerwację",
    createTitle: "Utwórz nowego klienta z prośby", createDesc: "Jeśli klient z tym emailem już istnieje, zostanie powiązany bez duplikatu.",
    nameLbl: "Imię", emailLbl: "Email", phoneLbl: "Telefon", notesLbl: "Notatki", createBtn: "Utwórz i powiąż",
  },
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  needs_linking: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  confirmed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelled_therapist: "bg-muted text-muted-foreground",
  cancelled_client: "bg-muted text-muted-foreground",
  spam: "bg-red-500/15 text-red-700 dark:text-red-400",
  expired: "bg-muted text-muted-foreground",
};

export default function BookingInboxPage() {
  const { lang } = useLanguage();
  const L = COPY[(lang as Lang)] ?? COPY.en;
  const dateLocale = getDateLocale(lang);
  const fmt = (s: string) => {
    try { return fnsFormat(new Date(s), "PP p", { locale: dateLocale }); }
    catch { return s; }
  };

  const [status, setStatus] = useState<string>("all");
  const { data: rows = [], isLoading, refetch, isFetching } = useBookingRequests(status);
  const { data: services = [] } = useServices();
  const { data: clients = [] } = useClients();
  const { data: profile } = useProfile();

  const confirm = useConfirmBookingRequest();
  const decline = useDeclineBookingRequest();
  const link = useLinkBookingRequestClient();
  const createClient = useCreateClient();

  const [linkingFor, setLinkingFor] = useState<BookingRequestRow | null>(null);
  const [linkClientId, setLinkClientId] = useState<string>("");
  const [confirmingFor, setConfirmingFor] = useState<BookingRequestRow | null>(null);
  const [confirmServiceId, setConfirmServiceId] = useState<string>("");
  const [confirmClientId, setConfirmClientId] = useState<string>("");
  const [creatingFor, setCreatingFor] = useState<BookingRequestRow | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientNotes, setNewClientNotes] = useState("");

  const STATUS_OPTIONS = [
    { value: "all", label: L.statusAll },
    { value: "pending", label: L.statusPending },
    { value: "needs_linking", label: L.statusNeedsLinking },
    { value: "confirmed", label: L.statusConfirmed },
    { value: "cancelled_therapist", label: L.statusDeclined },
    { value: "spam", label: L.statusSpam },
  ];

  const counts = useMemo(() => {
    const c = { pending: 0, needs_linking: 0 };
    rows.forEach((r) => {
      if (r.status === "pending") c.pending++;
      if (r.status === "needs_linking") c.needs_linking++;
    });
    return c;
  }, [rows]);

  async function handleConfirm(req: BookingRequestRow) {
    const cid = req.client_id ?? confirmClientId;
    if (!cid) {
      toast({ title: L.toastChooseClient, variant: "destructive" });
      return;
    }
    try {
      await confirm.mutateAsync({ id: req.id, client_id: cid, service_id: confirmServiceId || undefined });
      const emailRes = await sendBookingConfirmationEmail({
        req,
        profile,
        services: services as any[],
        serviceId: confirmServiceId || undefined,
      });
      refetch();
      if (emailRes.ok) {
        toast({ title: L.toastConfirmed, description: `Confirmation email sent to ${req.email}` });
      } else {
        toast({
          title: L.toastConfirmed,
          description: `Email failed: ${emailRes.error ?? ""} — you can resend from the inbox.`,
          variant: "destructive",
        });
      }
      setConfirmingFor(null);
      setConfirmClientId("");
      setConfirmServiceId("");
    } catch (e: any) {
      toast({ title: L.toastCouldNotConfirm, description: e.message, variant: "destructive" });
    }
  }

  async function handleDecline(req: BookingRequestRow, reason: "cancelled_therapist" | "spam") {
    try {
      await decline.mutateAsync({ id: req.id, reason });
      toast({ title: reason === "spam" ? L.toastMarkedSpam : L.toastDeclined });
    } catch (e: any) {
      toast({ title: L.toastCouldNotUpdate, description: e.message, variant: "destructive" });
    }
  }

  async function handleLink() {
    if (!linkingFor || !linkClientId) return;
    try {
      await link.mutateAsync({ id: linkingFor.id, client_id: linkClientId });
      toast({ title: L.toastLinked });
      setLinkingFor(null);
      setLinkClientId("");
    } catch (e: any) {
      toast({ title: L.toastCouldNotLink, description: e.message, variant: "destructive" });
    }
  }

  function openCreateClient(req: BookingRequestRow) {
    setCreatingFor(req);
    setNewClientName(`${req.first_name}${req.last_name ? " " + req.last_name : ""}`.trim());
    setNewClientEmail(req.email);
    setNewClientPhone(req.phone ?? "");
    setNewClientNotes(req.comment ?? "");
  }

  async function handleCreateClientAndLink() {
    if (!creatingFor) return;
    const email = newClientEmail.trim().toLowerCase();
    if (!newClientName.trim() || !email) {
      toast({ title: L.toastNameEmailReq, variant: "destructive" });
      return;
    }
    try {
      const existing = (clients as any[]).find((c) => (c.email || "").toLowerCase() === email);
      const clientId = existing
        ? existing.id
        : (await createClient.mutateAsync({
            name: newClientName.trim(),
            email,
            phone: newClientPhone.trim() || undefined,
            notes: newClientNotes.trim() || undefined,
          })).id;
      await link.mutateAsync({ id: creatingFor.id, client_id: clientId });
      toast({
        title: existing ? L.toastLinkedExisting : L.toastCreated,
        description: existing ? L.toastMatchedBy(existing.name) : undefined,
      });
      setCreatingFor(null);
    } catch (e: any) {
      toast({ title: L.toastCouldNotCreate, description: e.message, variant: "destructive" });
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{L.title}</h1>
            <p className="text-muted-foreground text-sm mt-1">{L.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> {L.refresh}
            </Button>
          </div>
        </div>

        {(counts.pending > 0 || counts.needs_linking > 0) && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex-1 text-sm">
              <span className="font-semibold text-foreground">{L.actionNeeded}</span>{" "}
              <span className="text-muted-foreground">
                {counts.pending > 0 && (counts.pending === 1 ? L.pendingOne : L.pendingMany(counts.pending))}
                {counts.pending > 0 && counts.needs_linking > 0 && " · "}
                {counts.needs_linking > 0 && (counts.needs_linking === 1 ? L.needLinkingOne : L.needLinkingMany(counts.needs_linking))}
              </span>
            </div>
            {status !== "pending" && counts.pending > 0 && (
              <Button size="sm" variant="outline" onClick={() => setStatus("pending")}>
                {L.showPending}
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">{L.colSlot}</TableHead>
                <TableHead>{L.colRequester}</TableHead>
                <TableHead>{L.colMatched}</TableHead>
                <TableHead>{L.colComment}</TableHead>
                <TableHead className="w-[130px]">{L.colStatus}</TableHead>
                <TableHead className="w-[260px] text-right">{L.colActions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> {L.loading}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    {L.empty}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const actionable = r.status === "pending" || r.status === "needs_linking";
                const isNew = r.status === "pending" && (Date.now() - new Date(r.created_at).getTime()) < 24 * 60 * 60 * 1000;
                return (
                  <TableRow
                    key={r.id}
                    className={actionable ? "bg-amber-500/[0.04] border-l-2 border-l-amber-500 hover:bg-amber-500/[0.07]" : ""}
                  >
                    <TableCell className="align-top">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">{fmt(r.requested_slot_at)}</div>
                        {isNew && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                            <Sparkles className="h-2.5 w-2.5" /> {L.newBadge}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{L.minutes(r.duration_minutes)}</div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="font-medium">
                        {r.first_name} {r.last_name ?? ""}
                      </div>
                      <a href={`mailto:${r.email}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {r.email}
                      </a>
                      {r.phone && (
                        <div>
                          <a href={`tel:${r.phone}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {r.phone}
                          </a>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      {r.matched_client_name ? (
                        <span className="text-sm">{r.matched_client_name}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{L.notLinked}</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top max-w-xs">
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {r.comment || <span className="text-muted-foreground">—</span>}
                      </p>
                    </TableCell>
                    <TableCell className="align-top">
                      <span className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status] ?? ""}`}>
                        {L.statusLabel[r.status] ?? r.status.replace("_", " ")}
                      </span>
                      <div className="text-[11px] text-muted-foreground mt-1">{fmt(r.created_at)}</div>
                    </TableCell>
                    <TableCell className="align-top text-right">
                      {actionable ? (
                        <div className="flex justify-end gap-1 flex-wrap">
                          {r.status === "needs_linking" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => { setLinkingFor(r); setLinkClientId(""); }}
                              >
                                <UserPlus className="h-3.5 w-3.5" /> {L.actLink}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => openCreateClient(r)}
                              >
                                <UserPlus className="h-3.5 w-3.5" /> {L.actCreateNew}
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              setConfirmingFor(r);
                              setConfirmClientId(r.client_id ?? "");
                              setConfirmServiceId(services[0]?.id ?? "");
                            }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> {L.actConfirm}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDecline(r, "cancelled_therapist")}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Link client dialog */}
      <Dialog open={!!linkingFor} onOpenChange={(o) => !o && setLinkingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{L.linkTitle}</DialogTitle>
            <DialogDescription>
              {linkingFor && (
                <>
                  {L.requesterLbl} <strong>{linkingFor.first_name} {linkingFor.last_name ?? ""}</strong> ({linkingFor.email})
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <ClientPicker
              clients={clients as any}
              value={linkClientId}
              onChange={setLinkClientId}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkingFor(null)}>{L.cancel}</Button>
            <Button disabled={!linkClientId || link.isPending} onClick={handleLink}>
              {link.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {L.linkBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <Dialog open={!!confirmingFor} onOpenChange={(o) => !o && setConfirmingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{L.confirmTitle}</DialogTitle>
            <DialogDescription>
              {confirmingFor && L.confirmDesc(fmt(confirmingFor.requested_slot_at))}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {confirmingFor && !confirmingFor.client_id && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{L.clientLbl}</label>
                <ClientPicker
                  clients={clients as any}
                  value={confirmClientId}
                  onChange={setConfirmClientId}
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{L.serviceLbl}</label>
              <Select value={confirmServiceId} onValueChange={setConfirmServiceId}>
                <SelectTrigger><SelectValue placeholder={L.pickService} /></SelectTrigger>
                <SelectContent>
                  {(services as any[]).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingFor(null)}>{L.cancel}</Button>
            <Button
              disabled={confirm.isPending}
              onClick={() => confirmingFor && handleConfirm(confirmingFor)}
            >
              {confirm.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {L.confirmBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create new client from request */}
      <Dialog open={!!creatingFor} onOpenChange={(o) => !o && setCreatingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{L.createTitle}</DialogTitle>
            <DialogDescription>{L.createDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{L.nameLbl}</label>
              <Input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{L.emailLbl}</label>
              <Input type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{L.phoneLbl}</label>
              <Input value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{L.notesLbl}</label>
              <Textarea rows={3} value={newClientNotes} onChange={(e) => setNewClientNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatingFor(null)}>{L.cancel}</Button>
            <Button disabled={createClient.isPending || link.isPending} onClick={handleCreateClientAndLink}>
              {(createClient.isPending || link.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {L.createBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
