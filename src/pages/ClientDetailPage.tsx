import { useParams, useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { SessionDetailSheet } from "@/components/SessionDetailSheet";
import { ClientNotesCard } from "@/components/ClientNotesCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import {
  useClient, useUpdateClient, useDeleteClient, useUnarchiveClient,
  useClientAppointments, useClientNotes, useCreateClientNote, useDeleteClientNote,
  useClientAttachments, useUploadAttachment, useDeleteAttachment, useProfile,
  useClientPriceHistory, useCreatePriceChange, useClientIncome,
  useClientCreditBalance, useClientAllocations, useClientDebt,
} from "@/hooks/useData";
import { useSupervisions, useSupervisionCount } from "@/hooks/useSupervisions";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Phone, Mail, Send, Calendar, Pencil, Trash2, Plus, Paperclip, FileText, Image, Download, X, Bell, DollarSign, History, CreditCard, ClipboardList, ShieldCheck, Archive, ArchiveRestore,
} from "lucide-react";
import { ArchiveClientDialog } from "@/components/ArchiveClientDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { getDateLocale } from "@/lib/dateLocale";
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
  const { t, lang } = useLanguage();
  const qc = useQueryClient();
  const dateLocale = getDateLocale(lang);
  const { symbol: cs } = useCurrency();
  const { isDemoMode } = useDemoMode();
  const { data: client, isLoading } = useClient(id);
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const unarchiveClient = useUnarchiveClient();
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
  const [archiveOpen, setArchiveOpen] = useState(false);
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
    paid_from_prepayment: { label: t("payment.paidAdvance"), color: "bg-success/10 text-success" },
    partially_paid: { label: t("incomeConfirm.partial"), color: "bg-warning/15 text-warning" },
    partially_paid_from_prepayment: { label: t("incomeConfirm.partial"), color: "bg-warning/15 text-warning" },
    not_applicable: { label: t("payment.na"), color: "bg-muted text-muted-foreground" },
  };


  const { data: creditBalance = 0 } = useClientCreditBalance(id);
  const { data: clientDebtData } = useClientDebt(id);

  // Auto-apply existing prepayment credits + aggregate overpayment to outstanding completed sessions.
  const autoApplyRanRef = useRef<string | null>(null);
  useEffect(() => {
    if (!id) return;
    const hasOutstanding = (appointments as any[]).some(
      (a) => a.status === "completed" &&
        ["waiting_for_payment", "unpaid", "partially_paid"].includes(a.payment_status),
    );
    if (!hasOutstanding) return;
    const key = `${id}:${creditBalance}:${(appointments as any[]).length}`;
    if (autoApplyRanRef.current === key) return;
    autoApplyRanRef.current = key;
    (async () => {
      try {
        if (Number(creditBalance) > 0) {
          await (supabase as any).rpc("auto_apply_credits_to_client_outstanding", { p_client_id: id });
        }
        await (supabase as any).rpc("settle_client_debts_from_overpayment", { p_client_id: id });
      } catch (e) {
        console.warn("auto-settle debts failed", e);
      } finally {
        ["appointments", "client-allocations", "client-credit-balance", "client-debt", "expected-payments"].forEach(
          (k) => qc.invalidateQueries({ queryKey: [k] }),
        );
      }
    })();
  }, [id, creditBalance, appointments]);


  const { data: clientAllocs = [] } = useClientAllocations(id);
  const allocByApt = useMemo(() => {
    const map: Record<string, { paid: number; minDate: string | null }> = {};
    for (const a of clientAllocs as any[]) {
      if (a.income?.status !== "confirmed") continue;
      const amt = Number(a.allocated_amount || 0);
      if (amt <= 0) continue;
      const cur = map[a.appointment_id] || { paid: 0, minDate: null };
      cur.paid += amt;
      const d = a.income?.date as string | undefined;
      if (d && (!cur.minDate || d < cur.minDate)) cur.minDate = d;
      map[a.appointment_id] = cur;
    }
    return map;
  }, [clientAllocs]);

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

  // Predicates — single source of truth for both card counts and filtered list.
  // See src/lib/paymentClassifiers.ts (unit-tested).

  const totalSessions = appointments.length;
  const completedSessions = (appointments as any[]).filter(isCompleted).length;
  const paidSessions = (appointments as any[]).filter(isPaid).length;
  const cancelledSessions = (appointments as any[]).filter(isCancelled).length;
  const awaitingSessions = (appointments as any[]).filter(isAwaiting).length;
  const prepaidSessions = (appointments as any[]).filter(isPrepaid).length;

  // Total Paid = sum of REAL payments received from this client (confirmed income only).
  // Never derived from appointment.price.
  const paidAmount = useMemo(() => {
    return (clientIncome as any[])
      .filter((i: any) => (i.status ?? "confirmed") === "confirmed")
      .reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
  }, [clientIncome]);

  // Apply selected statistic filter to the full appointment list
  const filteredAppointments = useMemo(() => {
    // Exclude planned/upcoming sessions from session history
    const PLANNED = new Set(["scheduled", "confirmed", "reminder_sent"]);
    const all = (sortedAppointments as any[]).filter((a) => !PLANNED.has(a.status));
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


  const derivePaymentStatus = (apt: any): string => {
    if (apt.status === "cancelled" || apt.status === "no-show" || apt.status === "rescheduled") {
      return "not_applicable";
    }
    // Non-completed (planned/confirmed/reminder_sent) → not payable yet
    if (apt.status !== "completed") {
      const info = allocByApt[apt.id];
      const paid = info?.paid || 0;
      if (paid > 0) {
        // Pre-payment exists
        const price = Number(apt.price || 0);
        if (price > 0 && paid + 0.001 >= price) return "paid_in_advance";
        return "partially_paid";
      }
      return "not_applicable";
    }
    const price = Number(apt.price || 0);
    const info = allocByApt[apt.id];
    const paid = info?.paid || 0;
    if (paid <= 0 || price <= 0) return apt.payment_status === "not_applicable" ? "waiting_for_payment" : (apt.payment_status || "waiting_for_payment");
    if (paid + 0.001 >= price) {
      const aptDate = (apt.scheduled_at || "").slice(0, 10);
      if (info?.minDate && aptDate && info.minDate < aptDate) return "paid_in_advance";
      return "paid_now";
    }
    return "partially_paid";
  };

  const paymentBadge = (apt: any) => {
    const status = derivePaymentStatus(apt);
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
              {client.status === "archived" && <Badge variant="secondary">{t("archive.badge")}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{t("clientDetail.profile")}</p>
          </div>
          {!isDemoMode && <>
            <Button variant="outline" size="sm" onClick={openEdit}><Pencil className="h-3.5 w-3.5 mr-1" /> {t("common.edit")}</Button>
            {client.status === "archived" ? (
              <Button variant="outline" size="sm" onClick={async () => {
                try { await unarchiveClient.mutateAsync(client.id); toast({ title: t("archive.toast.unarchived") }); }
                catch (e: any) { toast({ title: t("common.error"), description: e.message, variant: "destructive" }); }
              }}>
                <ArchiveRestore className="h-3.5 w-3.5 mr-1" /> {t("archive.action.unarchive")}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
                <Archive className="h-3.5 w-3.5 mr-1" /> {t("archive.action.archive")}
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("common.delete")}
            </Button>
          </>}
        </div>

        {client.status === "archived" && (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            {t("archive.banner.message")}
          </div>
        )}

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
                  <p className="text-xs text-muted-foreground">{t("clientDetail.clientSince", { date: format(new Date(client.created_at), "MMM yyyy", { locale: dateLocale }) })}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {client.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4 text-primary" />{client.phone}</div>}
                {client.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4 text-primary" />{client.email}</div>}
                
              </div>
            </div>

            {/* Client-level notes — moved up; reused in Supervision */}
            {!isDemoMode && <ClientNotesCard client={client as any} />}

            {/* Notification Settings */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" /> {t("notification.title")}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("notification.channel")}</span>
                  <Badge variant="outline" className="text-xs">
                    {(client as any).notification_preference === "email_only" || (client as any).notification_preference === "email_and_telegram" ? t("notification.emailOnly") :
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
                        <span className="text-xs text-muted-foreground">{format(new Date(ph.created_at), "MMM d, yyyy", { locale: dateLocale })}</span>
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
                        <p className="font-medium text-foreground">{format(new Date(sup.supervision_date + "T00:00:00"), "MMM d, yyyy", { locale: dateLocale })}</p>
                        <p className="text-xs text-muted-foreground">{(sup.imported_notes_snapshot || []).length} notes</p>
                      </div>
                      <span className="font-semibold text-foreground">{cs}{Number(sup.paid_amount).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

           </div>

          <div className="lg:col-span-2 flex">
            <div className="bg-card rounded-xl border border-border p-5 space-y-4 flex flex-col w-full">

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
                    <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
                      {isSup
                        ? pageItems.map((sup: any) => (
                            <div key={sup.id} onClick={() => navigate("/supervision")}
                              className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50 cursor-pointer hover:ring-2 hover:ring-ring/20">
                              <div className="flex items-center gap-3">
                                <ClipboardList className="h-4 w-4 text-primary" />
                                <div>
                                  <p className="text-sm font-medium text-foreground">{format(new Date(sup.supervision_date + "T00:00:00"), "MMM d, yyyy", { locale: dateLocale })}</p>
                                  <p className="text-xs text-muted-foreground">{(sup.imported_notes_snapshot || []).length} notes</p>
                                </div>
                              </div>
                              <span className="text-sm font-semibold text-foreground">{cs}{Number(sup.paid_amount).toFixed(0)}</span>
                            </div>
                          ))
                        : pageItems.map((apt: any) => {
                            const notePreview = apt.notes ? (apt.notes.length > 80 ? apt.notes.slice(0, 80) + "…" : apt.notes) : null;
                            const isNextUpcoming = apt.id === nextUpcomingId;
                            const dimmed = apt.status === "cancelled" || apt.status === "no-show";
                            const info = allocByApt[apt.id];
                            const paid = info?.paid || 0;
                            const price = Number(apt.price || 0);
                            const partial = paid > 0 && paid + 0.001 < price;
                            return (
                              <div
                                key={apt.id}
                                onClick={() => { setSessionApt(apt); setSessionSheetOpen(true); }}
                                className={cn(
                                  "p-3 rounded-lg border text-sm cursor-pointer hover:ring-1 hover:ring-ring/20 transition",
                                  isNextUpcoming ? "bg-primary/5 border-primary/30" :
                                  dimmed ? "bg-muted/30 border-border opacity-70" :
                                  "bg-muted/50 border-border"
                                )}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-medium text-foreground">
                                        {format(new Date(apt.scheduled_at), "MMM d, yyyy", { locale: dateLocale })}
                                      </p>
                                      <span className="text-xs text-muted-foreground">
                                        {formatScheduledTime(apt.scheduled_at, use12h)}
                                      </span>
                                      {isNextUpcoming && (
                                        <Badge className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-0">
                                          {t("status.scheduled")}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {apt.services?.name ?? "—"} · {apt.duration_minutes} {t("common.min")}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className="font-semibold text-foreground">{cs}{price.toFixed(0)}</span>
                                    {partial && (
                                      <span className="text-[10px] text-muted-foreground">
                                        {cs}{paid.toFixed(0)} / {cs}{price.toFixed(0)}
                                      </span>
                                    )}
                                    <div className="flex gap-1">
                                      {statusBadge(apt.status)}
                                      {paymentBadge(apt)}
                                    </div>
                                  </div>
                                </div>
                                {notePreview && (
                                  <p className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground italic">
                                    📝 {notePreview}
                                  </p>
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

        {/* Balance — payments are managed in Finance → Payment Audit */}
        {(() => {
          // Total payable from completed sessions only (price > 0, payable)
          const totalPayableCompleted = (appointments as any[])
            .filter((a: any) =>
              a.status === "completed" &&
              Number(a.price || 0) > 0 &&
              a.payment_status !== "not_applicable"
            )
            .reduce((s: number, a: any) => s + Number(a.price || 0), 0);

          // Aggregate balance based on real received payments vs payable completed amount.
          const outstanding = Math.max(0, totalPayableCompleted - Number(paidAmount || 0));
          const prepaid = Math.max(0, Number(paidAmount || 0) - totalPayableCompleted);
          const totalUnpaid = outstanding;
          return (
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-semibold text-foreground">{t("balance.title")}</h3>
                    <p className="text-xs text-muted-foreground">{t("audit.movedHint")}</p>
                  </div>
                </div>
                <Button size="sm" asChild disabled={!id}>
                  <Link to={`/finances/payment-audit?client=${encodeURIComponent(id ?? "")}`}>
                    <ShieldCheck className="h-4 w-4 mr-1" /> {t("audit.openAuditForClient")}
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <div className="text-xs text-muted-foreground">{t("balance.totalPaid")}</div>
                  <div className="text-base font-semibold text-foreground">{cs}{Number(paidAmount || 0).toFixed(2)}</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <div className="text-xs text-muted-foreground">{t("balance.outstanding")}</div>
                  <div className={cn("text-base font-semibold", outstanding > 0 ? "text-destructive" : "text-foreground")}>{cs}{outstanding.toFixed(2)}</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <div className="text-xs text-muted-foreground">{t("balance.prepaid")}</div>
                  <div className={cn("text-base font-semibold", prepaid > 0 ? "text-success" : "text-foreground")}>{cs}{prepaid.toFixed(2)}</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <div className="text-xs text-muted-foreground">{t("balance.totalUnpaid")}</div>
                  <div className={cn("text-base font-semibold", totalUnpaid > 0 ? "text-destructive" : "text-foreground")}>{cs}{totalUnpaid.toFixed(2)}</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Outstanding debt — per-session breakdown */}
        {clientDebtData && clientDebtData.items?.length > 0 && (
          <div className="bg-card rounded-xl border border-warning/30 p-5 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-semibold text-foreground">{t("clientDetail.outstandingDebt")}</h3>
                <p className="text-xs text-muted-foreground">{t("clientDetail.outstandingDebtHint")}</p>
              </div>
              <div className="text-lg font-semibold text-destructive">{cs}{Number(clientDebtData.total).toFixed(2)}</div>
            </div>
            <div className="space-y-2">
              {clientDebtData.items.map((d: any) => {
                const apt = d.appointment;
                const dateStr = apt?.scheduled_at
                  ? format(new Date(apt.scheduled_at), "MMM d, yyyy", { locale: dateLocale })
                  : "—";
                return (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{apt?.service?.name ?? t("session.title")}</p>
                      <p className="text-xs text-muted-foreground">{dateStr}</p>
                    </div>
                    <div className="font-semibold text-destructive">{cs}{Number(d.amount).toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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

      {client && (
        <ArchiveClientDialog
          open={archiveOpen}
          onOpenChange={setArchiveOpen}
          clientId={client.id}
          clientName={client.name}
        />
      )}

      <SessionDetailSheet
        appointment={sessionApt}
        open={sessionSheetOpen}
        onOpenChange={(o) => { setSessionSheetOpen(o); if (!o) setSessionApt(null); }}
        use12h={use12h}
      />

    </AppLayout>
  );
}
