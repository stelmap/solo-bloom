import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-time-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import {
  validateFlexibleCompletion,
  type FlexiblePaymentSource,
} from "@/lib/flexiblePrice";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  standardPrice: number;
  prepaidBalance: number;
  pending?: boolean;
  onConfirm: (payload: {
    actualAmount: number;
    paymentDate: string;
    source: FlexiblePaymentSource;
  }) => void;
}

export function FlexiblePriceCompleteDialog({
  open, onOpenChange, standardPrice, prepaidBalance, pending, onConfirm,
}: Props) {
  const { t } = useLanguage();
  const { symbol: cs } = useCurrency();

  const today = new Date().toISOString().split("T")[0];
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today);
  const [source, setSource] = useState<FlexiblePaymentSource>("new_payment");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setSource("new_payment");
    setTouched(false);
  }, [open]);

  const result = validateFlexibleCompletion({ amount, paymentDate, source, prepaidBalance });
  const errorMessages: Record<string, string> = {
    amount_required: t("flexPrice.err.required"),
    amount_invalid: t("flexPrice.err.invalid"),
    amount_not_positive: t("flexPrice.err.positive"),
    date_required: t("flexPrice.err.date"),
    source_required: t("flexPrice.err.source"),
    insufficient_prepaid: t("flexPrice.err.insufficient"),
  };
  const showError = touched && !!result.error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("flexPrice.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("flexPrice.dialogDesc")}</DialogDescription>
        </DialogHeader>

        <div className="rounded-md bg-muted/40 p-3 text-sm flex justify-between">
          <span className="text-muted-foreground">{t("flexPrice.standardPrice")}</span>
          <span className="font-medium">{cs}{Number(standardPrice || 0).toFixed(2)}</span>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flex-amount">{t("flexPrice.actualAmount")} *</Label>
            <Input
              id="flex-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setTouched(true); }}
              onBlur={() => setTouched(true)}
              placeholder={Number(standardPrice || 0).toFixed(2)}
              aria-invalid={showError || undefined}
            />
            {showError && (
              <p className="text-xs text-destructive">{errorMessages[result.error!]}</p>
            )}
          </div>

          <DatePicker
            date={paymentDate}
            onDateChange={(d: string) => { setPaymentDate(d); setTouched(true); }}
            label={t("flexPrice.paymentDate") + " *"}
          />

          <div className="space-y-2">
            <Label>{t("flexPrice.paymentSource")} *</Label>
            <RadioGroup
              value={source}
              onValueChange={(v) => { setSource(v as FlexiblePaymentSource); setTouched(true); }}
              className="gap-2"
            >
              <label className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer">
                <RadioGroupItem value="new_payment" id="flex-src-new" />
                <span className="text-sm">{t("flexPrice.sourceNew")}</span>
              </label>
              <label className="flex items-center justify-between gap-3 rounded-md border border-border p-3 cursor-pointer">
                <span className="flex items-center gap-3">
                  <RadioGroupItem value="prepaid_balance" id="flex-src-prepaid" />
                  <span className="text-sm">{t("flexPrice.sourcePrepaid")}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {cs}{Number(prepaidBalance || 0).toFixed(2)}
                </span>
              </label>
            </RadioGroup>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={!result.valid || pending}
            onClick={() => {
              setTouched(true);
              if (!result.valid || result.amount === null) return;
              onConfirm({ actualAmount: result.amount, paymentDate, source });
            }}
          >
            {t("flexPrice.confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
