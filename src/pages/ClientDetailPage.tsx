import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { SessionDetailSheet } from "@/components/SessionDetailSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import {
  useClient, useUpdateClient, useDeleteClient,
  useClientAppointments, useClientNotes, useCreateClientNote, useDeleteClientNote,
  useClientAttachments, useUploadAttachment, useDeleteAttachment, useProfile,
  useClientPriceHistory, useCreatePriceChange, useClientIncome,
  useClientCreditBalance, useDeleteIncomeConfirmation, useClientAllocations,
} from "@/hooks/useData";
import { useSupervisions, useSupervisionCount } from "@/hooks/useSupervisions";
import { IncomeConfirmationDialog } from "@/components/IncomeConfirmationDialog";
import { ConfirmDeleteDialog as ConfirmDelete2 } from "@/components/ConfirmDeleteDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Phone, Mail, Send, Calendar, Pencil, Trash2, Plus, Paperclip, FileText, Image, Download, X, Bell, DollarSign, History, CreditCard, ClipboardList,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useRef } from "react";
import { format } from "date-fns";
import { useMemo } from "react";
import { formatScheduledTime } from "@/lib/timeFormat";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useDemoMode } from "@/hooks/useDemoWorkspace";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { symbol: cs } = useCurrency();
  const { isDemoMode } = useDemoMode();
  const { data: client, isLoading } = useClient(id);
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const { data: appointments = [] } = useClientAppointments(id);
  const { data: notes = [] } = useClientNotes(id);
  const createNote = useCreateClientNote();
  const deleteNote = useDeleteClientNote();
  const { data: attachments = [] } = useClientAttachments(id);
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();
  const { data: profile } = useProfile();
  const { data: priceHistory = [] } = useClientPriceHistory(id);
  const createPriceChange = useCreatePriceChange();
  const { data: clientIncome = [] } = useClientIncome(id);
  const { data: supervisionCount = 0 } = useSupervisionCount(id);
  const { data: clientSupervisions = [] } = useSupervisions(id);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", notes: "", telegram: "", notification_preference: "no_reminder", confirmation_required: false, pricing_mode: "fixed", base_price: "", billing_address: "", billing_country: "", billing_tax_id: "", billing_company_name: "" });
  const [sessionApt, setSessionApt] = useState<any>(null);
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false);
  type StatFilter = "all" | "completed" | "paid" | "awaiting" | "cancelled" | "prepaid" | "supervision";
  const [statFilter, setStatFilter] = useState<StatFilter>("all");
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const setFilter = (f: StatFilter) => { setStatFilter(f); setPage(1); };
  const use12h = (profile as any)?.time_format === "12h";

  const SESSION_STATUS_STYLES: Record<string, { label: string; color: string }> = {
    scheduled: { label: t("status.scheduled"), color: "bg-muted text-muted-foreground" },
    reminder_sent: { label: t("status.reminderSent"), color: "bg-accent text-accent-foreground" },
    confirmed: { label: t("status.confirmed"), color: "bg-primary/15 text-primary" },
    completed: { label: t("status.completed"), color: "bg-success/15 text-success" },
    cancelled: { label: t("status.cancelled"), color: "bg-destructive/15 text-destructive" },
    "no-show": { label: t("status.noShow"), color: "bg-warning/15 text-warning" },
    rescheduled: { label: t("status.rescheduled"), color: "bg-accent text-accent-foreground" },
  };

  const PAYMENT_STATUS_STYLES: Record<string, { label: string; color: string }> = {
    unpaid: { label: t("payment.unpaid"), color: "bg-destructive/10 text-destructive" },
    waiting_for_payment: { label: t("payment.waiting"), color: "bg-warning/10 text-warning" },
    paid_now: { label: t("payment.paid"), color: "bg-success/10 text-success" },
    paid_in_advance: { label: t("payment.paidAdvance"), color: "bg-success/10 text-success" },
    partially_paid: { label: t("incomeConfirm.partial"), color: "bg-warning/15 text-warning" },
    not_applicable: { label: t("payment.na"), color: "bg-muted text-muted-foreground" },
  };

  const { data: creditBalance = 0 } = useClientCreditBalance(id);
  const deleteIncomeConfirm = useDeleteIncomeConfirmation();
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<any | null>(null);
  const [deleteIncomeId, setDeleteIncomeId] = useState<string | null>(null);

  // Sort: upcoming (nearest first), then past (newest first)
  const { sortedAppointments, nextUpcomingId } = useMemo(() => {
    const now = new Date();
    const upcoming: any[] = [];
    const past: any[] = [];
    for (const apt of appointments as any[]) {
      const d = new Date(apt.scheduled_at);
      if (d >= now && (apt.status === "scheduled" || apt.status === "confirmed" || apt.status === "reminder_sent")) {
        upcoming.push(apt);
      } else {
        past.push(apt);
      }
    }
    upcoming.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    past.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
    const sorted = [...upcoming, ...past];
    return { sortedAppointments: sorted, nextUpcomingId: upcoming.length > 0 ? upcoming[0].id : null };
  }, [appointments]);

  // Predicates — single source of truth for both card counts and filtered list
  const isCompleted = (a: any) => a.status === "completed";
  const isPaid = (a: any) => a.payment_status === "paid_now" || a.payment_status === "paid_in_advance";
  const isAwaiting = (a: any) =>
    (a.status === "completed" || a.status === "scheduled" || a.status === "confirmed" || a.status === "reminder_sent") &&
    (a.payment_status === "unpaid" || a.payment_status === "waiting_for_payment");
  const isCancelled = (a: any) => a.status === "cancelled" || a.status === "no-show";
  const isPrepaid = (a: any) => a.payment_status === "paid_in_advance";

  const totalSessions = appointments.length;
  const completedSessions = (appointments as any[]).filter(isCompleted).length;
  const paidSessions = (appointments as any[]).filter(isPaid).length;
  const cancelledSessions = (appointments as any[]).filter(isCancelled).length;
  const awaitingSessions = (appointments as any[]).filter(isAwaiting).length;
  const prepaidSessions = (appointments as any[]).filter(isPrepaid).length;

  // Paid amount (money) — separate from "paid sessions" (count)
  const paidAmount = useMemo(() => {
    const fromAppointments = (appointments as any[])
      .filter(isPaid)
      .reduce((s: number, a: any) => s + Number(a.price || 0), 0);
    const fromIncome = (clientIncome as any[]).reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    return fromAppointments + fromIncome;
  }, [appointments, clientIncome]);

  // Apply selected statistic filter to the full appointment list
  const filteredAppointments = useMemo(() => {
    const all = sortedAppointments as any[];
    switch (statFilter) {
      case "completed": return all.filter(isCompleted);
      case "paid": return all.filter(isPaid);
      case "awaiting": return all.filter(isAwaiting);
      case "cancelled": return all.filter(isCancelled);
      case "prepaid": return all.filter(isPrepaid);
      case "supervision": return [];
      default: return all;
    }
  }, [sortedAppointments, statFilter]);

  const filterLabelMap: Record<StatFilter, string> = {
    all: t("clientDetail.totalSessions"),
    completed: t("clientDetail.completedSessions"),
    paid: t("clientDetail.paidSessions"),
    awaiting: t("clientDetail.pendingPayments"),
    cancelled: t("clientDetail.cancelled"),
    prepaid: t("clientDetail.prepaidSessions"),
    supervision: t("clientDetail.supervisionSessions"),
  };

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center h-64 text-muted-foreground">{t("clientDetail.loading")}</div></AppLayout>;
  }
  if (!client) {
    return <AppLayout><div className="text-center py-16 text-muted-foreground">{t("clientDetail.notFound")}</div></AppLayout>;
  }

  const openEdit = () => {
    setEditForm({
      name: client.name, phone: client.phone || "", email: client.email || "",
      notes: client.notes || "", telegram: (client as any).telegram || "",
      notification_preference: (client as any).notification_preference || "no_reminder",
      confirmation_required: (client as any).confirmation_required || false,
      pricing_mode: (client as any).pricing_mode || "fixed",
      base_price: (client as any).base_price != null ? String((client as any).base_price) : "",
      billing_address: (client as any).billing_address || "",
      billing_country: (client as any).billing_country || "",
      billing_tax_id: (client as any).billing_tax_id || "",
      billing_company_name: (client as any).billing_company_name || "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) return;
    try {
      const oldBasePrice = (client as any).base_price;
      const newBasePrice = editForm.base_price ? Number(editForm.base_price) : null;
      const basePriceChanged = oldBasePrice !== newBasePrice && newBasePrice !== null;

      await updateClient.mutateAsync({
        id: client.id,
        name: editForm.name, phone: editForm.phone, email: editForm.email,
        notes: editForm.notes, telegram: editForm.telegram,
        notification_preference: editForm.notification_preference,
        confirmation_required: editForm.confirmation_required,
        pricing_mode: editForm.pricing_mode,
        base_price: newBasePrice,
        billing_address: editForm.billing_address || undefined,
        billing_country: editForm.billing_country || undefined,
        billing_tax_id: editForm.billing_tax_id || undefined,
        billing_company_name: editForm.billing_company_name || undefined,
      } as any);

      if (basePriceChanged) {
        await createPriceChange.mutateAsync({
          client_id: client.id,
          old_price: oldBasePrice ?? undefined,
          new_price: newBasePrice!,
          reason: "Base price updated",
          change_type: "base_price_change",
        });
      }

      setEditOpen(false);
      toast({ title: t("toast.clientUpdated") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteClient.mutateAsync(client.id);
      toast({ title: t("toast.clientDeleted") });
      navigate("/clients");
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      await createNote.mutateAsync({ client_id: client.id, content: noteText.trim() });
      setNoteText("");
      toast({ title: t("toast.noteAdded") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAttachment.mutateAsync({ file, clientId: client.id });
      toast({ title: t("toast.fileUploaded") });
    } catch (err: any) {
      toast({ title: t("toast.uploadFailed"), description: err.message, variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getSignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage.from("client-attachments").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return "";
    return data.signedUrl;
  };

  const statusBadge = (status: string) => {
    const s = SESSION_STATUS_STYLES[status] || SESSION_STATUS_STYLES.scheduled;
    return <Badge className={cn("text-xs", s.color)}>{s.label}</Badge>;
  };

  const paymentBadge = (status: string) => {
    const s = PAYMENT_STATUS_STYLES[status] || PAYMENT_STATUS_STYLES.unpaid;
    return <Badge variant="outline" className={cn("text-xs", s.color)}>{s.label}</Badge>;
  };

  const initials = client.name.split(" ").map(n => n[0]).join("").toUpperCase();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
            <p className="text-sm text-muted-foreground">{t("clientDetail.profile")}</p>
          </div>
          {!isDemoMode && <>
            <Button variant="outline" size="sm" onClick={openEdit}><Pencil className="h-3.5 w-3.5 mr-1" /> {t("common.edit")}</Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("common.delete")}
            </Button>
          </>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
          {([
            { key: "all", value: totalSessions, label: t("clientDetail.totalSessions"), color: "text-foreground", border: "border-border" },
            { key: "completed", value: completedSessions, label: t("clientDetail.completedSessions"), color: "text-foreground", border: "border-border" },
            { key: "paid", value: paidSessions, label: t("clientDetail.paidSessions"), color: "text-primary", border: "border-primary/30", icon: <CreditCard className="h-4 w-4 text-primary" />, sub: `${cs}${paidAmount.toFixed(0)}` },
            { key: "awaiting", value: awaitingSessions, label: t("clientDetail.pendingPayments"), color: "text-warning", border: "border-border" },
            { key: "cancelled", value: cancelledSessions, label: t("clientDetail.cancelled"), color: "text-destructive", border: "border-border" },
            { key: "prepaid", value: prepaidSessions, label: t("clientDetail.prepaidSessions"), color: prepaidSessions > 0 ? "text-success" : "text-muted-foreground", border: "border-success/30" },
            { key: "supervision", value: supervisionCount, label: t("clientDetail.supervisionSessions"), color: "text-primary", border: "border-primary/20", icon: <ClipboardList className="h-4 w-4 text-primary" /> },
          ] as Array<{ key: StatFilter; value: number; label: string; color: string; border: string; icon?: any; sub?: string }>).map((card) => {
            const active = statFilter === card.key;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setFilter(card.key)}
                aria-pressed={active}
                className={cn(
                  "bg-card rounded-xl border p-4 text-center transition-all hover:ring-2 hover:ring-ring/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  card.border,
                  active && "ring-2 ring-primary border-primary shadow-sm"
                )}
              >
                <div className="flex items-center justify-center gap-1">
                  {card.icon}
                  <p className={cn("text-2xl font-bold", card.color)}>{card.value}</p>
                </div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                {card.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{card.sub}</p>}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">{initials}</div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{client.name}</h3>
                  <p className="text-xs text-muted-foreground">{t("clientDetail.clientSince", { date: format(new Date(client.created_at), "MMM yyyy") })}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {client.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4 text-primary" />{client.phone}</div>}
                {client.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4 text-primary" />{client.email}</div>}
                {(client as any).telegram && <div className="flex items-center gap-2 text-muted-foreground"><Send className="h-4 w-4 text-primary" />@{(client as any).telegram}</div>}
              </div>
              {client.notes && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">📝 {client.notes}</p>
                </div>
              )}
            </div>

            {/* Notification Settings */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" /> {t("notification.title")}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("notification.channel")}</span>
                  <Badge variant="outline" className="text-xs">
                    {(client as any).notification_preference === "email_only" ? t("notification.emailOnly") :
                     (client as any).notification_preference === "telegram_only" ? t("notification.telegramOnly") :
                     (client as any).notification_preference === "email_and_telegram" ? t("notification.emailAndTelegram") :
                     t("notification.noReminder")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("notification.confirmationRequired")}</span>
                  <Badge variant="outline" className={cn("text-xs", (client as any).confirmation_required ? "text-primary" : "text-muted-foreground")}>
                    {(client as any).confirmation_required ? "✓" : "—"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" /> {t("pricing.title")}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("pricing.mode")}</span>
                  <Badge variant="outline" className="text-xs">
                    {(client as any).pricing_mode === "dynamic" ? t("pricing.dynamic") : t("pricing.fixed")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("pricing.currentBase")}</span>
                  <span className="font-semibold text-foreground">
                    {(client as any).base_price != null ? `${cs}${Number((client as any).base_price).toFixed(0)}` : t("pricing.notSet")}
                  </span>
                </div>
              </div>
            </div>

            {/* Price History */}
            {priceHistory.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> {t("pricing.history")}
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {priceHistory.map((ph: any) => (
                    <div key={ph.id} className="bg-muted/50 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {ph.change_type === "session_override" ? t("pricing.sessionOverrideLabel") : t("pricing.basePriceChange")}
                        </span>
                        <span className="text-xs text-muted-foreground">{format(new Date(ph.created_at), "MMM d, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {ph.old_price != null && <span className="text-muted-foreground line-through">{cs}{Number(ph.old_price).toFixed(0)}</span>}
                        <span className="text-foreground font-semibold">{cs}{Number(ph.new_price).toFixed(0)}</span>
                      </div>
                      {ph.reason && <p className="text-xs text-muted-foreground mt-1 italic">"{ph.reason}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> {t("clientDetail.notes")}</h3>
              {!isDemoMode && <div className="flex gap-2">
                <Textarea placeholder={t("clientDetail.addNote")} value={noteText} onChange={e => setNoteText(e.target.value)} className="min-h-[60px] text-sm" />
                <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim() || createNote.isPending}><Plus className="h-4 w-4" /></Button>
              </div>}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(notes as any[]).length === 0 && <p className="text-xs text-muted-foreground text-center py-2">{t("clientDetail.noNotes")}</p>}
                {(notes as any[]).map((note: any) => (
                  <div key={note.id} className="bg-muted/50 rounded-lg p-3 group relative">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(note.created_at), "MMM d, yyyy")} · {formatScheduledTime(note.created_at, use12h)}</p>
                    {!isDemoMode && <button onClick={() => deleteNote.mutate({ id: note.id, clientId: client.id })} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                      <X className="h-3 w-3" />
                    </button>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><Paperclip className="h-4 w-4 text-primary" /> {t("clientDetail.attachments")}</h3>
              {!isDemoMode && <>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                <Button variant="outline" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={uploadAttachment.isPending}>
                  <Plus className="h-4 w-4 mr-1" /> {uploadAttachment.isPending ? t("clientDetail.uploading") : t("clientDetail.uploadFile")}
                </Button>
              </>}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(attachments as any[]).length === 0 && <p className="text-xs text-muted-foreground text-center py-2">{t("clientDetail.noAttachments")}</p>}
                {(attachments as any[]).map((att: any) => (
                  <div key={att.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 group">
                    {att.file_type === "image" ? <Image className="h-4 w-4 text-primary shrink-0" /> : <FileText className="h-4 w-4 text-primary shrink-0" />}
                    <span className="text-sm text-foreground truncate flex-1">{att.file_name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={async () => {
                        const url = await getSignedUrl(att.file_path);
                        if (url) window.open(url, "_blank");
                      }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      {!isDemoMode && <button onClick={() => deleteAttachment.mutate({ id: att.id, filePath: att.file_path, clientId: client.id })} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Supervision History */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" /> {t("supervision.history")}
                <span className="text-xs text-muted-foreground ml-auto">{supervisionCount}</span>
              </h3>
              {clientSupervisions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">{t("supervision.noSupervisions")}</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {clientSupervisions.map((sup: any) => (
                    <div key={sup.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border text-sm cursor-pointer hover:ring-1 hover:ring-ring/20" onClick={() => navigate("/supervision")}>
                      <div>
                        <p className="font-medium text-foreground">{format(new Date(sup.supervision_date + "T00:00:00"), "MMM d, yyyy")}</p>
                        <p className="text-xs text-muted-foreground">{(sup.imported_notes_snapshot || []).length} notes</p>
                      </div>
                      <span className="font-semibold text-foreground">{cs}{Number(sup.paid_amount).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              {(() => {
                const totalForFilter = statFilter === "supervision" ? (clientSupervisions as any[]).length : filteredAppointments.length;
                const totalPages = Math.max(1, Math.ceil(totalForFilter / PAGE_SIZE));
                const safePage = Math.min(page, totalPages);
                const start = (safePage - 1) * PAGE_SIZE;
                const end = Math.min(start + PAGE_SIZE, totalForFilter);
                const shown = Math.max(end - start, 0);
                const labelLower = (statFilter === "all" ? t("dashboard.sessions") : filterLabelMap[statFilter]).toLowerCase();
                const countText = totalForFilter > PAGE_SIZE
                  ? t("clientDetail.resultCount", { shown: String(shown), total: String(totalForFilter), label: labelLower })
                  : t("clientDetail.resultCountSimple", { count: String(totalForFilter), label: labelLower });
                return (
                  <>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" /> {t("clientDetail.sessionHistory")}
                      <span className="text-xs text-muted-foreground ml-auto">{countText}</span>
                    </h3>
                  </>
                );
              })()}

              {statFilter !== "all" && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                  <span className="text-xs text-foreground">
                    {t("clientDetail.filterShowing", { filter: filterLabelMap[statFilter] })}
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setFilter("all")}>
                    <X className="h-3 w-3 mr-1" /> {t("clientDetail.clearFilter")}
                  </Button>
                </div>
              )}

              {(() => {
                const isSup = statFilter === "supervision";
                const fullList: any[] = isSup ? (clientSupervisions as any[]) : filteredAppointments;
                const total = fullList.length;
                const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
                const safePage = Math.min(page, totalPages);
                const start = (safePage - 1) * PAGE_SIZE;
                const pageItems = fullList.slice(start, start + PAGE_SIZE);

                if (!isSup && appointments.length === 0) {
                  return <p className="text-sm text-muted-foreground text-center py-8">{t("clientDetail.noSessions")}</p>;
                }
                if (total === 0) {
                  return <p className="text-sm text-muted-foreground text-center py-8">{t("clientDetail.noFilterResults")}</p>;
                }

                return (
                  <>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                      {isSup
                        ? pageItems.map((sup: any) => (
                            <div key={sup.id} onClick={() => navigate("/supervision")}
                              className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50 cursor-pointer hover:ring-2 hover:ring-ring/20">
                              <div className="flex items-center gap-3">
                                <ClipboardList className="h-4 w-4 text-primary" />
                                <div>
                                  <p className="text-sm font-medium text-foreground">{format(new Date(sup.supervision_date + "T00:00:00"), "MMM d, yyyy")}</p>
                                  <p className="text-xs text-muted-foreground">{(sup.imported_notes_snapshot || []).length} notes</p>
                                </div>
                              </div>
                              <span className="text-sm font-semibold text-foreground">{cs}{Number(sup.paid_amount).toFixed(0)}</span>
                            </div>
                          ))
                        : pageItems.map((apt: any) => {
                            const notePreview = apt.notes ? (apt.notes.length > 80 ? apt.notes.slice(0, 80) + "…" : apt.notes) : null;
                            const isNextUpcoming = apt.id === nextUpcomingId;
                            return (
                              <div key={apt.id}
                                onClick={() => { setSessionApt(apt); setSessionSheetOpen(true); }}
                                className={cn(
                                  "flex flex-col gap-2 p-4 rounded-lg border transition-colors cursor-pointer hover:ring-2 hover:ring-ring/20",
                                  isNextUpcoming ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" :
                                  apt.status === "cancelled" || apt.status === "no-show" ? "bg-muted/30 border-border opacity-60" : "bg-muted/50 border-border"
                                )}>
                                <div className="flex items-center gap-4">
                                  <div className="text-center min-w-[70px]">
                                    <p className="text-sm font-semibold text-foreground">{format(new Date(apt.scheduled_at), "MMM d")}</p>
                                    <p className="text-xs text-muted-foreground">{formatScheduledTime(apt.scheduled_at, use12h)}</p>
                                  </div>
                                  <div className="h-10 w-px bg-border" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-foreground truncate">{apt.services?.name}</p>
                                      {isNextUpcoming && <Badge className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-0">{t("status.scheduled")}</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{apt.duration_minutes} {t("common.min")}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm font-semibold text-foreground">{cs}{Number(apt.price).toFixed(0)}</span>
                                      {apt.price_override_reason && <Badge variant="outline" className="text-[10px] px-1 py-0">{t("pricing.overridden")}</Badge>}
                                    </div>
                                    <div className="flex gap-1">
                                      {statusBadge(apt.status)}
                                      {paymentBadge(apt.payment_status)}
                                    </div>
                                  </div>
                                </div>
                                {notePreview && (
                                  <div className="pl-[86px] border-t border-border/50 pt-2">
                                    <p className="text-xs text-muted-foreground italic">📝 {notePreview}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <span className="text-xs text-muted-foreground">
                          {t("clientDetail.pageOf", { page: String(safePage), total: String(totalPages) })}
                        </span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                            {t("common.previous")}
                          </Button>
                          <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                            {t("common.next")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle>{t("clientDetail.editClient")}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Contact info */}
            <section className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">{t("clientDetail.profile")}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2"><Label>{t("common.name")} *</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("common.phone")}</Label><Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("common.email")}</Label><Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>{t("common.telegram")}</Label><Input placeholder="username" value={editForm.telegram} onChange={e => setEditForm(f => ({ ...f, telegram: e.target.value }))} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>{t("common.generalNotes")}</Label><Textarea rows={3} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
            </section>

            <section className="border-t border-border pt-5 space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> {t("client.billingDetails")}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t("client.billingCompany")}</Label><Input value={editForm.billing_company_name} onChange={e => setEditForm(f => ({ ...f, billing_company_name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("client.billingTaxId")}</Label><Input value={editForm.billing_tax_id} onChange={e => setEditForm(f => ({ ...f, billing_tax_id: e.target.value }))} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>{t("client.billingAddress")}</Label><Input value={editForm.billing_address} onChange={e => setEditForm(f => ({ ...f, billing_address: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("client.billingCountry")}</Label><Input value={editForm.billing_country} onChange={e => setEditForm(f => ({ ...f, billing_country: e.target.value }))} /></div>
              </div>
            </section>

            <section className="border-t border-border pt-5 space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Bell className="h-4 w-4" /> {t("notification.title")}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div className="space-y-2">
                  <Label>{t("notification.channel")}</Label>
                  <Select value={editForm.notification_preference} onValueChange={v => setEditForm(f => ({ ...f, notification_preference: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_reminder">{t("notification.noReminder")}</SelectItem>
                      <SelectItem value="email_only">{t("notification.emailOnly")}</SelectItem>
                      <SelectItem value="telegram_only">{t("notification.telegramOnly")}</SelectItem>
                      <SelectItem value="email_and_telegram">{t("notification.emailAndTelegram")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div className="min-w-0">
                    <Label>{t("notification.confirmationRequired")}</Label>
                    <p className="text-xs text-muted-foreground mt-1">{t("notification.confirmationRequiredDesc")}</p>
                  </div>
                  <Switch checked={editForm.confirmation_required} onCheckedChange={v => setEditForm(f => ({ ...f, confirmation_required: v }))} />
                </div>
              </div>
            </section>

            <section className="border-t border-border pt-5 space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" /> {t("pricing.title")}</h4>
              <div className="space-y-2">
                <Label>{t("pricing.mode")}</Label>
                <RadioGroup value={editForm.pricing_mode} onValueChange={v => setEditForm(f => ({ ...f, pricing_mode: v }))} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                    <RadioGroupItem value="fixed" id="pricing-fixed" className="mt-0.5" />
                    <Label htmlFor="pricing-fixed" className="font-normal cursor-pointer">
                      {t("pricing.fixed")}
                      <span className="block text-xs text-muted-foreground mt-0.5">{t("pricing.fixedDesc")}</span>
                    </Label>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                    <RadioGroupItem value="dynamic" id="pricing-dynamic" className="mt-0.5" />
                    <Label htmlFor="pricing-dynamic" className="font-normal cursor-pointer">
                      {t("pricing.dynamic")}
                      <span className="block text-xs text-muted-foreground mt-0.5">{t("pricing.dynamicDesc")}</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2 max-w-xs">
                <Label>{t("pricing.basePrice")}</Label>
                <Input type="number" min="0" step="1" placeholder="0" value={editForm.base_price} onChange={e => setEditForm(f => ({ ...f, base_price: e.target.value }))} />
              </div>
            </section>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-6 py-4 border-t border-border bg-background shrink-0">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={updateClient.isPending}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateClient.isPending || !editForm.name.trim()}>
              {updateClient.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete}
        title={t("clientDetail.deleteClient")} description={t("clients.deleteDesc")}
        loading={deleteClient.isPending} />

      <SessionDetailSheet
        appointment={sessionApt}
        open={sessionSheetOpen}
        onOpenChange={(o) => { setSessionSheetOpen(o); if (!o) setSessionApt(null); }}
        use12h={use12h}
      />
    </AppLayout>
  );
}
