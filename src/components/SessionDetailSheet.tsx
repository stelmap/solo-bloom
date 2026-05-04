import { useState, useEffect, useMemo } from "react";
import { InvoiceButton } from "@/components/InvoiceButton";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { format } from "date-fns";
import { formatTime, formatScheduledTime } from "@/lib/timeFormat";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import {
  CheckCircle, XCircle, Ban, Clock, Pencil, Trash2, DollarSign, Repeat, Save, X, FileText, Bell, Send, Users, Check, MinusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useToast } from "@/hooks/use-toast";
import {
  useUpdateAppointment, useDeleteAppointment, useCompleteAppointment,
  useCancelAppointment, useClients, useServices,
  useDeleteRecurringAppointments, useEditRecurringAppointments,
  useProfile, useCreatePriceChange,
} from "@/hooks/useData";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useGroupAttendance, useUpdateAttendance, useGroup, useGroupMembers, useCompleteGroupSession, useGroupSessionPayments } from "@/hooks/useGroups";
import { PaymentEditDialog } from "@/components/PaymentEditDialog";

interface SessionDetailSheetProps {
  appointment: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  use12h?: boolean;
}

const DAY_KEYS = ["day.mon", "day.tue", "day.wed", "day.thu", "day.fri", "day.sat", "day.sun"];

export function SessionDetailSheet({ appointment: apt, open, onOpenChange, use12h = false }: SessionDetailSheetProps) {
  const { t } = useLanguage();
  const { symbol: cs } = useCurrency();
  const { toast } = useToast();
  const { data: clients = [] } = useClients();
  const { data: services = [] } = useServices();
  const { data: profile } = useProfile();
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();
  const completeAppointment = useCompleteAppointment();
  const cancelAppointment = useCancelAppointment();
  const deleteRecurring = useDeleteRecurringAppointments();
  const editRecurring = useEditRecurringAppointments();

  // Group attendance hooks — must be before any early return
  const groupSessionId = apt?.group_session_id
    ? ((apt as any).group_sessions?.id || apt.group_session_id)
    : undefined;
  const groupId = (apt as any)?.group_sessions?.group_id || undefined;
  const { data: groupAttendance = [] } = useGroupAttendance(groupSessionId);
  const { data: groupData } = useGroup(groupId);
  const { data: groupMembers = [] } = useGroupMembers(groupId);
  const { data: existingPayments = [] } = useGroupSessionPayments(groupSessionId);
  const updateAttendance = useUpdateAttendance();
  const completeGroupSession = useCompleteGroupSession();
  const createPriceChange = useCreatePriceChange();

  const [mode, setMode] = useState<"view" | "edit" | "complete">("view");
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [recurDeleteOpen, setRecurDeleteOpen] = useState(false);
  const [recurEditScopeOpen, setRecurEditScopeOpen] = useState(false);
  const [editChoiceOpen, setEditChoiceOpen] = useState(false);
  const [paymentEditOpen, setPaymentEditOpen] = useState(false);
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({ client_id: "", service_id: "", date: "", time: "", notes: "", price: 0, days_of_week: [1] as number[], interval_weeks: 1, price_override_reason: "" });

  // Complete form
  const [completePrice, setCompletePrice] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("paid_now");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [groupPaymentState, setGroupPaymentState] = useState("paid_now");
  const [groupPaymentMethod, setGroupPaymentMethod] = useState("cash");

  useEffect(() => {
    if (apt) {
      setNotes(apt.notes || "");
      setNotesDirty(false);
      setMode("view");
    }
  }, [apt?.id, apt?.notes]);

  // Group billing data — must be before early return
  const isGroupSession = !!apt?.group_session_id;
  const groupBillingData = useMemo(() => {
    if (!isGroupSession || !groupData || groupAttendance.length === 0) return [];
    const sessionPrice = Number(apt?.price || 0);
    return groupAttendance.map((att: any) => {
      const member = groupMembers.find((m: any) => m.client_id === att.client_id);
      const memberPrice = member?.price_per_session != null ? Number(member.price_per_session) : sessionPrice;
      const billable =
        (att.status === "attended" && groupData.bill_present) ||
        ((att.status === "absent" || att.status === "skipped") && groupData.bill_absent);
      return {
        clientId: att.client_id,
        clientName: att.clients?.name || "Unknown",
        attendanceStatus: att.status,
        billable: !!billable,
        amount: memberPrice,
      };
    });
  }, [isGroupSession, groupData, groupAttendance, groupMembers, apt?.price]);

  const groupBillingSummary = useMemo(() => {
    const total = groupBillingData.length;
    const billable = groupBillingData.filter(p => p.billable);
    const expectedAmount = billable.reduce((sum, p) => sum + p.amount, 0);
    return { total, billableCount: billable.length, expectedAmount };
  }, [groupBillingData]);

  if (!apt) return null;

  const STATUSES: Record<string, { label: string; color: string }> = {
    scheduled: { label: t("status.scheduled"), color: "bg-muted text-muted-foreground" },
    reminder_sent: { label: t("status.reminderSent"), color: "bg-accent text-accent-foreground" },
    confirmed: { label: t("status.confirmed"), color: "bg-primary/15 text-primary" },
    completed: { label: t("status.completed"), color: "bg-success/15 text-success" },
    cancelled: { label: t("status.cancelled"), color: "bg-destructive/15 text-destructive" },
    "no-show": { label: t("status.noShow"), color: "bg-warning/15 text-warning" },
  };

  const PAYMENT_METHODS = [
    { value: "cash", label: t("method.cash") },
    { value: "card", label: t("method.card") },
    { value: "bank_transfer", label: t("method.bankTransfer") },
  ];

  const PAYMENT_STATUSES = [
    { value: "paid_now", label: t("payment.paidNow"), description: t("payment.paidNowDesc") },
    { value: "paid_in_advance", label: t("payment.paidInAdvance"), description: t("payment.paidInAdvanceDesc") },
    { value: "waiting_for_payment", label: t("payment.waitingForPayment"), description: t("payment.waitingForPaymentDesc") },
  ];

  const PAYMENT_STATUS_STYLES: Record<string, { label: string; color: string }> = {
    unpaid: { label: t("payment.unpaid"), color: "text-destructive" },
    waiting_for_payment: { label: t("payment.waiting"), color: "text-warning" },
    paid_now: { label: t("payment.paid"), color: "text-success" },
    paid_in_advance: { label: t("payment.paidAdvance"), color: "text-success" },
  };

  const statusInfo = STATUSES[apt.status] || STATUSES.scheduled;
  const payInfo = PAYMENT_STATUS_STYLES[apt.payment_status] || PAYMENT_STATUS_STYLES.unpaid;
  const fmtTime = (dateStr: string) => formatScheduledTime(dateStr, use12h);
  const isActive = apt.status === "scheduled" || apt.status === "confirmed" || apt.status === "reminder_sent";

  const CONFIRMATION_STYLES: Record<string, { label: string; color: string }> = {
    pending: { label: t("confirmation.pending"), color: "text-warning" },
    confirmed: { label: t("confirmation.confirmed"), color: "text-success" },
    not_required: { label: t("confirmation.notRequired"), color: "text-muted-foreground" },
  };
  const confirmInfo = CONFIRMATION_STYLES[apt.confirmation_status] || CONFIRMATION_STYLES.not_required;

  // Group session detection (isGroupSession already declared above early return)
  const groupName = (apt as any).group_sessions?.groups?.name;

  // Determine if client requires confirmation
  const client = clients.find(c => c.id === apt.client_id);
  const clientRequiresConfirmation = !isGroupSession && client?.confirmation_required === true;
  const clientWantsEmail = !isGroupSession && ["email_only", "email_and_telegram"].includes(client?.notification_preference || "");
  const showConfirmationState = !isGroupSession && (clientRequiresConfirmation || (apt.confirmation_status && apt.confirmation_status !== "not_required"));
  const canSendReminder = !isGroupSession && isActive && clientWantsEmail && (
    clientRequiresConfirmation ? apt.confirmation_status !== "confirmed" : true
  );

  const handleSendReminder = async () => {
    if (!client?.email) {
      toast({ title: t("confirmation.noEmail"), variant: "destructive" });
      return;
    }
    setSendingReminder(true);
    try {
      const scheduledDate = new Date(apt.scheduled_at);
      const specialistName = (profile as any)?.full_name || (profile as any)?.business_name || "your specialist";

      // Generate confirmation URL if needed
      let confirmationUrl: string | undefined;
      if (clientRequiresConfirmation && apt.confirmation_status !== "confirmed") {
        const { data: confirmation, error: confError } = await supabase
          .from("session_confirmations")
          .insert({ appointment_id: apt.id })
          .select("token")
          .single();
        if (!confError && confirmation) {
          // Always use the published app URL for confirmation links so emails
          // sent from the preview environment still resolve to a public,
          // unauthenticated page that the client can open.
          const origin = window.location.origin;
          const isPreview = /lovable(project)?\.app|lovableproject\.com|localhost/i.test(origin);
          const appUrl = isPreview ? "https://solo-bizz-app.lovable.app" : origin;
          confirmationUrl = `${appUrl}/confirm-session?token=${confirmation.token}`;
        }
        // Mark confirmation_status as pending
        await updateAppointment.mutateAsync({ id: apt.id, confirmation_status: "pending" } as any);
      }

      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "session-reminder",
          recipientEmail: client.email,
          idempotencyKey: `manual-reminder-${apt.id}-${Date.now()}`,
          templateData: {
            clientName: client.name,
            specialistName,
            sessionDate: scheduledDate.toLocaleDateString("en-US", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            }),
            sessionTime: scheduledDate.toLocaleTimeString("en-US", {
              hour: "2-digit", minute: "2-digit",
            }),
            confirmationUrl,
          },
        },
      });
      if (error) throw error;
      // Update status to reminder_sent
      await updateAppointment.mutateAsync({ id: apt.id, status: "reminder_sent" });
      toast({ title: t("confirmation.reminderSent") });
    } catch (e: any) {
      toast({ title: t("confirmation.reminderFailed"), description: e.message, variant: "destructive" });
    } finally {
      setSendingReminder(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      await updateAppointment.mutateAsync({ id: apt.id, notes });
      setNotesDirty(false);
      toast({ title: t("session.notesSaved") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const openEdit = async () => {
    const d = new Date(apt.scheduled_at);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const min = String(d.getUTCMinutes()).padStart(2, "0");
    let days_of_week = [1];
    let interval_weeks = 1;
    if (apt.recurring_rule_id) {
      const { data: rule } = await supabase.from("recurring_rules").select("days_of_week, interval_weeks").eq("id", apt.recurring_rule_id).single();
      if (rule) {
        days_of_week = rule.days_of_week || [1];
        interval_weeks = rule.interval_weeks || 1;
      }
    }
    setEditForm({
      client_id: apt.client_id, service_id: apt.service_id,
      date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}`,
      notes: apt.notes || "", price: Number(apt.price),
      days_of_week, interval_weeks,
      price_override_reason: (apt as any).price_override_reason || "",
    });
    setMode("edit");
  };

  const handleSaveEdit = async () => {
    if (apt.recurring_rule_id) {
      setRecurEditScopeOpen(true);
      return;
    }
    try {
      const service = services.find(s => s.id === editForm.service_id);
      const priceChanged = editForm.price !== Number(apt.price);
      const overrideReason = priceChanged ? editForm.price_override_reason : (apt as any).price_override_reason;

      await updateAppointment.mutateAsync({
        id: apt.id, client_id: editForm.client_id, service_id: editForm.service_id,
        scheduled_at: `${editForm.date}T${editForm.time}:00Z`,
        duration_minutes: service?.duration_minutes ?? 60,
        price: editForm.price, notes: editForm.notes || undefined,
        price_override_reason: overrideReason || undefined,
      });

      if (priceChanged) {
        await createPriceChange.mutateAsync({
          client_id: apt.client_id,
          appointment_id: apt.id,
          old_price: Number(apt.price),
          new_price: editForm.price,
          reason: editForm.price_override_reason || undefined,
          change_type: "session_override",
        });
      }

      setMode("view");
      toast({ title: t("toast.appointmentUpdated") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleRecurringEdit = async (scope: "this" | "following" | "all") => {
    try {
      const service = services.find(s => s.id === editForm.service_id);
      const newScheduled = new Date(`${editForm.date}T${editForm.time}:00Z`);
      const oldScheduled = new Date(apt.scheduled_at);
      const deltaMs = newScheduled.getTime() - oldScheduled.getTime();

      if (scope === "this") {
        await updateAppointment.mutateAsync({
          id: apt.id, client_id: editForm.client_id, service_id: editForm.service_id,
          scheduled_at: newScheduled.toISOString(),
          duration_minutes: service?.duration_minutes ?? 60,
          price: editForm.price, notes: editForm.notes || undefined,
        });
      } else {
        await editRecurring.mutateAsync({
          ruleId: apt.recurring_rule_id, scope, appointmentId: apt.id,
          updates: {
            client_id: editForm.client_id, service_id: editForm.service_id,
            duration_minutes: service?.duration_minutes ?? 60,
            price: editForm.price, notes: editForm.notes || undefined,
          },
          deltaMs: deltaMs !== 0 ? deltaMs : undefined,
          recurrenceUpdates: {
            days_of_week: editForm.days_of_week,
            interval_weeks: editForm.interval_weeks,
          },
        });
      }
      setRecurEditScopeOpen(false);
      setMode("view");
      toast({ title: t("toast.appointmentUpdated") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const openComplete = () => {
    setCompletePrice(Number(apt.price));
    setPaymentMethod("cash");
    setPaymentStatus("paid_now");
    setGroupPaymentState("paid_now");
    setGroupPaymentMethod("cash");
    setMode("complete");
  };


  const handleComplete = async () => {
    try {
      if (notesDirty) {
        await updateAppointment.mutateAsync({ id: apt.id, notes });
      }

      if (isGroupSession && groupSessionId && groupId) {
        await completeGroupSession.mutateAsync({
          appointmentId: apt.id,
          groupId,
          groupSessionId,
          participants: groupBillingData.map(p => ({
            clientId: p.clientId,
            attendanceStatus: p.attendanceStatus,
            billable: p.billable,
            amount: p.amount,
          })),
          paymentState: groupPaymentState,
          paymentMethod: groupPaymentMethod,
        });
        toast({ title: t("groups.sessionCompleted") });
      } else {
        await completeAppointment.mutateAsync({
          appointmentId: apt.id, clientId: apt.client_id,
          price: completePrice, paymentMethod, paymentStatus, paymentDate,
        });
        const msg = paymentStatus === "waiting_for_payment"
          ? t("toast.sessionCompletedExpected") : t("toast.sessionCompletedIncome", { amount: completePrice.toString() });
        toast({ title: t("toast.appointmentCompleted"), description: msg });
      }
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleStatusChange = async (status: "confirmed" | "cancelled" | "no-show", waiveFee = false) => {
    try {
      if (notesDirty) await updateAppointment.mutateAsync({ id: apt.id, notes });
      if (status === "cancelled" || status === "no-show") {
        await cancelAppointment.mutateAsync({
          id: apt.id, status,
          clientId: waiveFee ? undefined : apt.client_id,
          price: waiveFee ? 0 : Number(apt.price),
        });
      } else {
        await updateAppointment.mutateAsync({ id: apt.id, status });
      }
      toast({ title: t("toast.statusUpdated", { status: STATUSES[status]?.label || status }) });
      setNoShowOpen(false);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAppointment.mutateAsync(apt.id);
      toast({ title: t("toast.appointmentDeleted") });
      setDeleteOpen(false);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleRecurringDelete = async (scope: "this" | "following" | "all") => {
    try {
      await deleteRecurring.mutateAsync({ ruleId: apt.recurring_rule_id, scope, appointmentId: apt.id });
      toast({ title: t("toast.appointmentDeleted") });
      setRecurDeleteOpen(false);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2 flex-wrap">
              {isGroupSession && <Users className="h-4 w-4" />}
              <span>{isGroupSession ? (groupName || t("groups.groupSession")) : t("session.title")}</span>
              <Badge className={cn("text-xs", statusInfo.color)}>{statusInfo.label}</Badge>
              {isGroupSession && (
                <Badge variant="outline" className="text-xs border-primary/30 text-primary"><Users className="h-3 w-3 mr-1" />{t("groups.groupSession")}</Badge>
              )}
              {apt.recurring_rule_id && (
                <Badge variant="outline" className="text-xs"><Repeat className="h-3 w-3 mr-1" />{t("recurring.badge")}</Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          {mode === "view" && (
            <div className="space-y-5">
              {/* Session info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2.5 text-sm">
                {isGroupSession ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("groups.group")}</span>
                    <span className="font-medium text-foreground">{groupName || "—"}</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("calendar.client")}</span>
                    <span className="font-medium text-foreground">{apt.clients?.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("calendar.service")}</span>
                  <span className="font-medium text-foreground">{apt.services?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("calendar.dateTime")}</span>
                  <span className="font-medium text-foreground">
                    {format(new Date(apt.scheduled_at), "MMM d, yyyy")} · {fmtTime(apt.scheduled_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("calendar.duration")}</span>
                  <span className="font-medium text-foreground">{apt.duration_minutes} {t("common.min")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("calendar.price")}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{cs}{Number(apt.price).toFixed(2)}</span>
                    {(apt as any).price_override_reason && <Badge variant="outline" className="text-[10px]">{t("pricing.overridden")}</Badge>}
                  </div>
                </div>
                {(apt as any).price_override_reason && (
                  <div className="bg-muted/50 rounded-md p-2">
                    <p className="text-xs text-muted-foreground italic">💰 {(apt as any).price_override_reason}</p>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("common.payment")}</span>
                  <span className={cn("font-medium", payInfo.color)}>{payInfo.label}</span>
                </div>
                {showConfirmationState && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("confirmation.status")}</span>
                    <Badge variant="outline" className={cn("text-xs", 
                      apt.confirmation_status === "confirmed" ? "border-success/30 text-success bg-success/10" :
                      apt.confirmation_status === "pending" ? "border-warning/30 text-warning bg-warning/10" :
                      "border-border text-muted-foreground"
                    )}>
                      {apt.confirmation_status === "confirmed" && <CheckCircle className="h-3 w-3 mr-1" />}
                      {apt.confirmation_status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                      {confirmInfo.label}
                    </Badge>
                  </div>
                )}
                {apt.confirmation_timestamp && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("confirmation.timestamp")}</span>
                    <span className="font-medium text-foreground">{format(new Date(apt.confirmation_timestamp), "MMM d")} · {fmtTime(apt.confirmation_timestamp)}</span>
                  </div>
                )}
                {apt.cancellation_reason && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("calendar.cancel")}</span>
                    <span className="font-medium text-destructive text-xs text-right max-w-[60%]">{apt.cancellation_reason}</span>
                  </div>
                )}
              </div>

              {/* Send Reminder / Request Confirmation */}
              {canSendReminder && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Bell className="h-4 w-4" />
                      <span>
                        {clientRequiresConfirmation
                          ? (apt.confirmation_status === "pending" ? t("confirmation.pending") : t("confirmation.requestConfirmation"))
                          : t("confirmation.sendReminder")}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleSendReminder} disabled={sendingReminder}
                      className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary">
                      <Send className="h-3.5 w-3.5 mr-1" />
                      {sendingReminder ? "..." : t("confirmation.sendReminder")}
                    </Button>
                  </div>
                </div>
              )}

              {/* Group attendance tracking */}
              {isGroupSession && groupAttendance.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">{t("groups.attendance")} ({groupAttendance.length})</Label>
                  </div>
                  <div className="space-y-2">
                    {groupAttendance.map((att: any) => {
                      const attStatusColor: Record<string, string> = {
                        attended: "bg-success/10 border-success/30 text-success",
                        absent: "bg-destructive/10 border-destructive/30 text-destructive",
                        skipped: "bg-warning/10 border-warning/30 text-warning",
                      };
                      return (
                        <div key={att.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-semibold">
                              {att.clients?.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <span className="text-sm font-medium">{att.clients?.name}</span>
                          </div>
                          <Select value={att.status} onValueChange={async (v) => {
                            try {
                              await updateAttendance.mutateAsync({ id: att.id, status: v, groupSessionId: groupSessionId! });
                            } catch (e: any) {
                              toast({ title: t("common.error"), description: e.message, variant: "destructive" });
                            }
                          }}>
                            <SelectTrigger className={cn("w-28 h-7 text-xs border", attStatusColor[att.status] || "")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="attended">{t("groups.attended")}</SelectItem>
                              <SelectItem value="absent">{t("groups.absent")}</SelectItem>
                              <SelectItem value="skipped">{t("groups.skipped")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Group session payment summary (for completed sessions) */}
              {isGroupSession && apt.status === "completed" && existingPayments.length > 0 && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <DollarSign className="h-4 w-4 text-primary" /> {t("groups.participantBilling")}
                  </Label>
                  <div className="space-y-1.5">
                    {existingPayments.map((ep: any) => (
                      <div key={ep.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ep.clients?.name}</span>
                          <Badge variant="outline" className={cn("text-[10px]",
                            ep.payment_state === "paid_now" || ep.payment_state === "paid_in_advance" ? "border-success/30 text-success" :
                            ep.payment_state === "waiting_for_payment" ? "border-warning/30 text-warning" :
                            "border-border text-muted-foreground"
                          )}>
                            {ep.billing_rule_applied
                              ? (ep.payment_state === "paid_now" ? t("payment.paid") : ep.payment_state === "paid_in_advance" ? t("payment.paidAdvance") : ep.payment_state === "waiting_for_payment" ? t("payment.waiting") : "—")
                              : t("groups.notBillable")}
                          </Badge>
                        </div>
                        <span className={cn("font-semibold", ep.billing_rule_applied ? "" : "text-muted-foreground line-through")}>
                          {cs}{Number(ep.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-border p-3 grid grid-cols-2 gap-1 text-sm">
                    <span className="text-muted-foreground">{t("groups.expectedAmount")}</span>
                    <span className="text-right font-semibold">
                      {cs}{existingPayments.filter((ep: any) => ep.billing_rule_applied).reduce((s: number, ep: any) => s + Number(ep.amount), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Invoice */}
              {apt.status === "completed" && !isGroupSession && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> {t("invoice.title")}
                  </Label>
                  <InvoiceButton
                    appointment={apt}
                    client={clients.find(c => c.id === apt.client_id)}
                    service={services.find(s => s.id === apt.service_id)}
                  />
                </div>
              )}

              {/* Session notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> {t("session.notes")}
                  </Label>
                  {notesDirty && (
                    <Button size="sm" variant="ghost" onClick={handleSaveNotes} disabled={updateAppointment.isPending}>
                      <Save className="h-3.5 w-3.5 mr-1" /> {t("session.saveNotes")}
                    </Button>
                  )}
                </div>
                <Textarea
                  placeholder={t("session.notesPlaceholder")}
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
                  className="min-h-[120px] text-sm"
                />
              </div>

              <Separator />

              {/* Actions */}
              {isActive && (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={openComplete} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" /> {t("calendar.complete")}
                  </Button>
                  {apt.status === "scheduled" && (
                    <Button variant="outline" onClick={() => handleStatusChange("confirmed")} className="flex-1">
                      <Clock className="h-4 w-4 mr-2" /> {t("calendar.confirm")}
                    </Button>
                  )}
                </div>
              )}

              {isActive && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleStatusChange("cancelled")} className="text-destructive hover:text-destructive">
                    <XCircle className="h-3.5 w-3.5 mr-1" /> {t("calendar.cancel")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setNoShowOpen(true)} className="text-warning hover:text-warning">
                    <Ban className="h-3.5 w-3.5 mr-1" /> {t("calendar.noShow")}
                  </Button>
                </div>
              )}

              <div className="flex gap-2 border-t border-border pt-3">
                <Button variant="ghost" size="sm" onClick={() => setEditChoiceOpen(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> {t("calendar.edit")}
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                  onClick={() => apt.recurring_rule_id ? setRecurDeleteOpen(true) : setDeleteOpen(true)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("calendar.delete")}
                </Button>
              </div>
            </div>
          )}

          {mode === "edit" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("calendar.client")} *</Label>
                <Select value={editForm.client_id} onValueChange={v => setEditForm(f => ({ ...f, client_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("calendar.service")} *</Label>
                <Select value={editForm.service_id} onValueChange={v => {
                  const svc = services.find(s => s.id === v);
                  setEditForm(f => ({ ...f, service_id: v, price: Number(svc?.price ?? f.price) }));
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {cs}{Number(s.price).toFixed(0)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <DateTimePicker
                date={editForm.date}
                time={editForm.time}
                onDateChange={v => setEditForm(f => ({ ...f, date: v }))}
                onTimeChange={v => setEditForm(f => ({ ...f, time: v }))}
                use12h={use12h}
                dateLabel={t("common.date")}
                timeLabel={t("common.time")}
              />
              <div className="space-y-2">
                <Label>{t("calendar.price")} ({cs})</Label>
                <Input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
              </div>
              {editForm.price !== Number(apt.price) && (
                <div className="space-y-2">
                  <Label>{t("pricing.overrideReason")}</Label>
                  <Input placeholder={t("pricing.overrideReason")} value={editForm.price_override_reason} onChange={e => setEditForm(f => ({ ...f, price_override_reason: e.target.value }))} />
                </div>
              )}
              <div className="space-y-2">
                <Label>{t("session.notes")}</Label>
                <Textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="min-h-[100px]" />
              </div>
              {apt.recurring_rule_id && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="flex items-center gap-1.5"><Repeat className="h-3.5 w-3.5" /> {t("recurring.title")}</Label>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{t("recurring.daysOfWeek")}</Label>
                      <div className="flex gap-1.5 flex-wrap">
                        {DAY_KEYS.map((dk, i) => {
                          const dayNum = i + 1;
                          const isSelected = editForm.days_of_week.includes(dayNum);
                          return (
                            <button key={dk} type="button"
                              className={cn("h-9 w-9 rounded-full text-xs font-medium border transition-colors",
                                isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"
                              )}
                              onClick={() => {
                                setEditForm(f => {
                                  const next = isSelected ? f.days_of_week.filter(d => d !== dayNum) : [...f.days_of_week, dayNum].sort();
                                  return { ...f, days_of_week: next.length > 0 ? next : f.days_of_week };
                                });
                              }}>
                              {t(dk as any)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{t("recurring.intervalWeeks")}</Label>
                      <Select value={String(editForm.interval_weeks)} onValueChange={v => setEditForm(f => ({ ...f, interval_weeks: Number(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">{t("recurring.weekly")}</SelectItem>
                          <SelectItem value="2">{t("recurring.biweekly")}</SelectItem>
                          <SelectItem value="3">{t("recurring.custom", { n: "3" })}</SelectItem>
                          <SelectItem value="4">{t("recurring.custom", { n: "4" })}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} className="flex-1" disabled={updateAppointment.isPending}>
                  {updateAppointment.isPending ? t("calendar.saving") : t("calendar.saveChanges")}
                </Button>
                <Button variant="outline" onClick={() => setMode("view")}><X className="h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {mode === "complete" && !isGroupSession && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">{t("calendar.confirmOutcome")}</p>

              {/* Notes before completing */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {t("session.notes")}</Label>
                <Textarea
                  placeholder={t("session.notesPlaceholder")}
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
                  className="min-h-[80px] text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label>{t("calendar.finalPrice")}</Label>
                <Input type="number" step="0.01" value={completePrice} onChange={e => setCompletePrice(parseFloat(e.target.value) || 0)} />
              </div>

              <div className="space-y-2">
                <Label>{t("calendar.paymentStatus")}</Label>
                <div className="space-y-2">
                  {PAYMENT_STATUSES.map(ps => (
                    <button key={ps.value} onClick={() => setPaymentStatus(ps.value)}
                      className={cn("w-full text-left p-3 rounded-lg border transition-colors",
                        paymentStatus === ps.value ? "bg-primary/10 border-primary" : "bg-card border-border hover:bg-muted"
                      )}>
                      <p className="text-sm font-medium text-foreground">{ps.label}</p>
                      <p className="text-xs text-muted-foreground">{ps.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {(paymentStatus === "paid_now" || paymentStatus === "paid_in_advance") && (
                <>
                  <div className="space-y-2">
                    <Label>{t("common.paymentDate")}</Label>
                    <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("calendar.paymentMethod")}</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS.map(m => (
                        <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                          className={cn("p-3 rounded-lg border text-sm font-medium transition-colors text-center",
                            paymentMethod === m.value ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"
                          )}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className={cn("rounded-lg p-4 flex items-center gap-3 border",
                paymentStatus === "waiting_for_payment" ? "bg-warning/10 border-warning/20" : "bg-success/10 border-success/20"
              )}>
                <DollarSign className={cn("h-5 w-5", paymentStatus === "waiting_for_payment" ? "text-warning" : "text-success")} />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {paymentStatus === "waiting_for_payment"
                      ? t("calendar.willBeExpected", { amount: completePrice.toFixed(2) })
                      : t("calendar.willBeIncome", { amount: completePrice.toFixed(2) })}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleComplete} className="flex-1" disabled={completeAppointment.isPending}>
                  {completeAppointment.isPending ? t("calendar.saving") : t("calendar.confirmComplete")}
                </Button>
                <Button variant="outline" onClick={() => setMode("view")}><X className="h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {/* GROUP SESSION COMPLETE MODE */}
          {mode === "complete" && isGroupSession && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">{t("groups.completeGroupSession")}</p>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {t("session.notes")}</Label>
                <Textarea placeholder={t("session.notesPlaceholder")} value={notes}
                  onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
                  className="min-h-[60px] text-sm" />
              </div>

              {/* Participant billing table */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" /> {t("groups.participantBilling")}
                </Label>
                <div className="space-y-2">
                  {groupBillingData.map((p) => (
                    <div key={p.clientId} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.clientName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className={cn("text-[10px]",
                            p.attendanceStatus === "attended" ? "border-success/30 text-success" :
                            p.attendanceStatus === "absent" ? "border-destructive/30 text-destructive" :
                            "border-warning/30 text-warning"
                          )}>
                            {t(`groups.${p.attendanceStatus}` as any)}
                          </Badge>
                          <Badge variant={p.billable ? "default" : "secondary"} className="text-[10px]">
                            {p.billable ? t("groups.billable") : t("groups.notBillable")}
                          </Badge>
                        </div>
                      </div>
                      <span className={cn("text-sm font-semibold", p.billable ? "text-foreground" : "text-muted-foreground line-through")}>
                        {cs}{p.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session summary */}
              <div className="rounded-lg border border-border p-4 space-y-2">
                <Label className="text-sm font-semibold">{t("groups.sessionSummary")}</Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">{t("groups.totalParticipants")}</span>
                  <span className="text-right font-medium">{groupBillingSummary.total}</span>
                  <span className="text-muted-foreground">{t("groups.billableParticipants")}</span>
                  <span className="text-right font-medium">{groupBillingSummary.billableCount}</span>
                  <span className="text-muted-foreground">{t("groups.expectedAmount")}</span>
                  <span className="text-right font-semibold text-foreground">{cs}{groupBillingSummary.expectedAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment state */}
              <div className="space-y-2">
                <Label>{t("calendar.paymentStatus")}</Label>
                <div className="space-y-2">
                  {PAYMENT_STATUSES.map(ps => (
                    <button key={ps.value} onClick={() => setGroupPaymentState(ps.value)}
                      className={cn("w-full text-left p-3 rounded-lg border transition-colors",
                        groupPaymentState === ps.value ? "bg-primary/10 border-primary" : "bg-card border-border hover:bg-muted"
                      )}>
                      <p className="text-sm font-medium text-foreground">{ps.label}</p>
                      <p className="text-xs text-muted-foreground">{ps.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {(groupPaymentState === "paid_now" || groupPaymentState === "paid_in_advance") && (
                <div className="space-y-2">
                  <Label>{t("calendar.paymentMethod")}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map(m => (
                      <button key={m.value} onClick={() => setGroupPaymentMethod(m.value)}
                        className={cn("p-3 rounded-lg border text-sm font-medium transition-colors text-center",
                          groupPaymentMethod === m.value ? "bg-primary/10 border-primary text-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"
                        )}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className={cn("rounded-lg p-4 flex items-center gap-3 border",
                groupPaymentState === "waiting_for_payment" ? "bg-warning/10 border-warning/20" : "bg-success/10 border-success/20"
              )}>
                <DollarSign className={cn("h-5 w-5", groupPaymentState === "waiting_for_payment" ? "text-warning" : "text-success")} />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {groupPaymentState === "waiting_for_payment"
                      ? t("calendar.willBeExpected", { amount: groupBillingSummary.expectedAmount.toFixed(2) })
                      : t("calendar.willBeIncome", { amount: groupBillingSummary.expectedAmount.toFixed(2) })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {groupBillingSummary.billableCount} / {groupBillingSummary.total} {t("groups.billableParticipants").toLowerCase()}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleComplete} className="flex-1" disabled={completeGroupSession.isPending}>
                  {completeGroupSession.isPending ? t("calendar.saving") : t("calendar.confirmComplete")}
                </Button>
                <Button variant="outline" onClick={() => setMode("view")}><X className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <ConfirmDeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete}
        title={t("calendar.deleteAppointment")} description={t("confirmDelete.cannotUndo")}
        loading={deleteAppointment.isPending} />

      {/* Recurring delete scope */}
      <Dialog open={recurDeleteOpen} onOpenChange={setRecurDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("recurring.deleteScope")}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => handleRecurringDelete("this")}>{t("recurring.thisOnly")}</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => handleRecurringDelete("following")}>{t("recurring.thisAndFollowing")}</Button>
            <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => handleRecurringDelete("all")}>{t("recurring.allInSeries")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recurring edit scope */}
      <Dialog open={recurEditScopeOpen} onOpenChange={setRecurEditScopeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("recurring.editScope")}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => handleRecurringEdit("this")}>{t("recurring.thisOnly")}</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => handleRecurringEdit("following")}>{t("recurring.thisAndFollowing")}</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => handleRecurringEdit("all")}>{t("recurring.allInSeries")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit choice (session vs payment) */}
      <Dialog open={editChoiceOpen} onOpenChange={setEditChoiceOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("editChoice.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("editChoice.description")}</p>
          <div className="space-y-2 pt-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => { setEditChoiceOpen(false); openEdit(); }}
            >
              <Pencil className="h-4 w-4 mr-2" /> {t("editChoice.session")}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => { setEditChoiceOpen(false); setPaymentEditOpen(true); }}
            >
              <DollarSign className="h-4 w-4 mr-2" /> {t("editChoice.payment")}
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setEditChoiceOpen(false)}
            >
              <X className="h-4 w-4 mr-2" /> {t("common.cancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment correction modal */}
      <PaymentEditDialog
        open={paymentEditOpen}
        onOpenChange={setPaymentEditOpen}
        appointment={apt}
        use12h={use12h}
      />
      <Dialog open={noShowOpen} onOpenChange={setNoShowOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("calendar.noShow")}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{t("noShow.description")}</p>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => handleStatusChange("no-show", false)}>
              <DollarSign className="h-4 w-4 mr-2 text-warning" />
              <div className="text-left">
                <p className="text-sm font-medium">{t("noShow.charge")}</p>
                <p className="text-xs text-muted-foreground">{cs}{Number(apt.price).toFixed(2)} {t("noShow.chargeDesc")}</p>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => handleStatusChange("no-show", true)}>
              <XCircle className="h-4 w-4 mr-2 text-muted-foreground" />
              <div className="text-left">
                <p className="text-sm font-medium">{t("noShow.waive")}</p>
                <p className="text-xs text-muted-foreground">{t("noShow.waiveDesc")}</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
