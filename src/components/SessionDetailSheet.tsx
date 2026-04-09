import { useState, useEffect } from "react";
import { format } from "date-fns";
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
  CheckCircle, XCircle, Ban, Clock, Pencil, Trash2, DollarSign, Repeat, Save, X, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  useUpdateAppointment, useDeleteAppointment, useCompleteAppointment,
  useCancelAppointment, useClients, useServices,
  useDeleteRecurringAppointments, useEditRecurringAppointments,
} from "@/hooks/useData";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SessionDetailSheetProps {
  appointment: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  use12h?: boolean;
}

function formatTime(time: string, use12h: boolean) {
  if (!use12h) return time;
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function SessionDetailSheet({ appointment: apt, open, onOpenChange, use12h = false }: SessionDetailSheetProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: clients = [] } = useClients();
  const { data: services = [] } = useServices();
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();
  const completeAppointment = useCompleteAppointment();
  const cancelAppointment = useCancelAppointment();
  const deleteRecurring = useDeleteRecurringAppointments();
  const editRecurring = useEditRecurringAppointments();

  const [mode, setMode] = useState<"view" | "edit" | "complete">("view");
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [recurDeleteOpen, setRecurDeleteOpen] = useState(false);
  const [recurEditScopeOpen, setRecurEditScopeOpen] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({ client_id: "", service_id: "", date: "", time: "", notes: "", price: 0 });

  // Complete form
  const [completePrice, setCompletePrice] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("paid_now");

  useEffect(() => {
    if (apt) {
      setNotes(apt.notes || "");
      setNotesDirty(false);
      setMode("view");
    }
  }, [apt?.id, apt?.notes]);

  if (!apt) return null;

  const STATUSES: Record<string, { label: string; color: string }> = {
    scheduled: { label: t("status.scheduled"), color: "bg-muted text-muted-foreground" },
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
  const fmtTime = (dateStr: string) => formatTime(format(new Date(dateStr), "HH:mm"), use12h);
  const isActive = apt.status === "scheduled" || apt.status === "confirmed";

  const handleSaveNotes = async () => {
    try {
      await updateAppointment.mutateAsync({ id: apt.id, notes });
      setNotesDirty(false);
      toast({ title: t("session.notesSaved") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const openEdit = () => {
    const d = new Date(apt.scheduled_at);
    setEditForm({
      client_id: apt.client_id, service_id: apt.service_id,
      date: format(d, "yyyy-MM-dd"), time: format(d, "HH:mm"),
      notes: apt.notes || "", price: Number(apt.price),
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
      await updateAppointment.mutateAsync({
        id: apt.id, client_id: editForm.client_id, service_id: editForm.service_id,
        scheduled_at: `${editForm.date}T${editForm.time}:00`,
        duration_minutes: service?.duration_minutes ?? 60,
        price: editForm.price, notes: editForm.notes || undefined,
      });
      setMode("view");
      toast({ title: t("toast.appointmentUpdated") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleRecurringEdit = async (scope: "this" | "following" | "all") => {
    try {
      const service = services.find(s => s.id === editForm.service_id);
      if (scope === "this") {
        await updateAppointment.mutateAsync({
          id: apt.id, client_id: editForm.client_id, service_id: editForm.service_id,
          scheduled_at: `${editForm.date}T${editForm.time}:00`,
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
    setMode("complete");
  };

  const handleComplete = async () => {
    try {
      // Save notes first if dirty
      if (notesDirty) {
        await updateAppointment.mutateAsync({ id: apt.id, notes });
      }
      await completeAppointment.mutateAsync({
        appointmentId: apt.id, clientId: apt.client_id,
        price: completePrice, paymentMethod, paymentStatus,
      });
      const msg = paymentStatus === "waiting_for_payment"
        ? t("toast.sessionCompletedExpected") : t("toast.sessionCompletedIncome", { amount: completePrice.toString() });
      toast({ title: t("toast.appointmentCompleted"), description: msg });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleStatusChange = async (status: "confirmed" | "cancelled" | "no-show") => {
    try {
      if (notesDirty) await updateAppointment.mutateAsync({ id: apt.id, notes });
      if (status === "cancelled" || status === "no-show") {
        await cancelAppointment.mutateAsync({ id: apt.id, status });
      } else {
        await updateAppointment.mutateAsync({ id: apt.id, status });
      }
      toast({ title: t("toast.statusUpdated", { status: STATUSES[status]?.label || status }) });
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
              <span>{t("session.title")}</span>
              <Badge className={cn("text-xs", statusInfo.color)}>{statusInfo.label}</Badge>
              {apt.recurring_rule_id && (
                <Badge variant="outline" className="text-xs"><Repeat className="h-3 w-3 mr-1" />{t("recurring.badge")}</Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          {mode === "view" && (
            <div className="space-y-5">
              {/* Session info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("calendar.client")}</span>
                  <span className="font-medium text-foreground">{apt.clients?.name}</span>
                </div>
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
                  <span className="font-semibold text-foreground">€{Number(apt.price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("common.payment")}</span>
                  <span className={cn("font-medium", payInfo.color)}>{payInfo.label}</span>
                </div>
              </div>

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
                  <Button variant="outline" size="sm" onClick={() => handleStatusChange("no-show")} className="text-warning hover:text-warning">
                    <Ban className="h-3.5 w-3.5 mr-1" /> {t("calendar.noShow")}
                  </Button>
                </div>
              )}

              <div className="flex gap-2 border-t border-border pt-3">
                <Button variant="ghost" size="sm" onClick={openEdit}>
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
                  <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — €{Number(s.price).toFixed(0)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t("common.date")} *</Label><Input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("common.time")} *</Label><Input type="time" value={editForm.time} onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))} /></div>
              </div>
              <div className="space-y-2">
                <Label>{t("calendar.price")} (€)</Label>
                <Input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("session.notes")}</Label>
                <Textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="min-h-[100px]" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} className="flex-1" disabled={updateAppointment.isPending}>
                  {updateAppointment.isPending ? t("calendar.saving") : t("calendar.saveChanges")}
                </Button>
                <Button variant="outline" onClick={() => setMode("view")}><X className="h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {mode === "complete" && (
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
    </>
  );
}
