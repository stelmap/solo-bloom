import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-time-picker";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useToast } from "@/hooks/use-toast";
import { useCorrectPayment } from "@/hooks/useData";
import { formatScheduledTime } from "@/lib/timeFormat";

interface PaymentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: any;
  use12h?: boolean;
  onSaved?: () => void;
}

export function PaymentEditDialog({ open, onOpenChange, appointment: apt, use12h = false, onSaved }: PaymentEditDialogProps) {
  const { t } = useLanguage();
  const { symbol: cs } = useCurrency();
  const { toast } = useToast();
  const correct = useCorrectPayment();

  const isCurrentlyPaid = apt?.payment_status === "paid_now" || apt?.payment_status === "paid_in_advance";
  const today = new Date().toISOString().split("T")[0];

  const [status, setStatus] = useState<"paid" | "unpaid">(isCurrentlyPaid ? "paid" : "unpaid");
  const [paymentDate, setPaymentDate] = useState<string>(today);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!apt || !open) return;
    const paid = apt.payment_status === "paid_now" || apt.payment_status === "paid_in_advance";
    setStatus(paid ? "paid" : "unpaid");
    const incomeRow = (apt as any).income?.[0];
    const existingDate = incomeRow?.date || today;
    setPaymentDate(existingDate);
    setPaymentMethod(incomeRow?.payment_method || "cash");
    setComment("");
  }, [apt?.id, open]);

  if (!apt) return null;

  const sessionTime = formatScheduledTime(apt.scheduled_at, use12h);
  const sessionDate = format(new Date(apt.scheduled_at), "PP");
  const clientOrGroupName =
    apt.clients?.name || (apt as any).group_sessions?.groups?.name || (apt as any).group_name || "—";
  const serviceName = apt.services?.name || "—";

  const PAYMENT_METHODS = [
    { value: "cash", label: t("method.cash") },
    { value: "card", label: t("method.card") },
    { value: "bank_transfer", label: t("method.bankTransfer") },
  ];

  const PAYMENT_LABELS: Record<string, string> = {
    paid_now: t("payment.paid"),
    paid_in_advance: t("payment.paidAdvance"),
    waiting_for_payment: t("payment.waiting"),
    unpaid: t("payment.unpaid"),
    not_applicable: t("payment.unpaid"),
  };

  const handleSave = async () => {
    if (status === "paid" && !paymentDate) {
      toast({ title: t("paymentEdit.errorMissingDate"), variant: "destructive" });
      return;
    }
    try {
      await correct.mutateAsync({
        appointmentId: apt.id,
        clientId: apt.client_id,
        amount: Number(apt.price || 0),
        newPaymentStatus: status,
        newPaymentDate: status === "paid" ? paymentDate : null,
        newPaymentMethod: status === "paid" ? paymentMethod : null,
        correctionComment: comment.trim() || undefined,
      });
      toast({ title: t("paymentEdit.success") });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: t("paymentEdit.errorRecalc"),
        description: e?.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("paymentEdit.title")}</DialogTitle>
        </DialogHeader>

        {/* Read-only context */}
        <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">{t("calendar.client")}</span><span className="font-medium">{clientOrGroupName}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("common.date")}</span><span>{sessionDate}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("common.time")}</span><span>{sessionTime}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("calendar.service")}</span><span>{serviceName}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("session.status")}</span><span>{apt.status}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("paymentEdit.currentStatus")}</span><span>{PAYMENT_LABELS[apt.payment_status] || apt.payment_status}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t("calendar.price")}</span><span>{cs}{Number(apt.price || 0).toFixed(2)}</span></div>
        </div>

        <Separator />

        {/* Editable */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("paymentEdit.paymentStatus")} *</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "paid" | "unpaid")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">{t("payment.paid")}</SelectItem>
                <SelectItem value="unpaid">{t("payment.unpaid")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === "paid" && (
            <>
              <DatePicker
                date={paymentDate}
                onDateChange={setPaymentDate}
                label={t("paymentEdit.paymentDate") + " *"}
              />
              <div className="space-y-2">
                <Label>{t("paymentEdit.paymentMethod")}</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>{t("paymentEdit.comment")}</Label>
            <Textarea
              placeholder={t("paymentEdit.commentPlaceholder")}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[70px]"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={correct.isPending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={correct.isPending}>
            {correct.isPending ? t("calendar.saving") : t("paymentEdit.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
