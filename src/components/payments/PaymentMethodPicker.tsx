import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLanguage } from "@/i18n/LanguageContext";
import { useActivePaymentMethods, localizedMethodName } from "@/hooks/usePaymentMethods";
import { PaymentMethodsDialog } from "./PaymentMethodsManager";
import { pmCopy } from "./paymentMethodsCopy";
import { cn } from "@/lib/utils";

/** Radio row of active payment methods + gear shortcut to the shared settings. */
export function PaymentMethodPicker({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const { t, lang } = useLanguage();
  const L = pmCopy(lang);
  const { data: methods } = useActivePaymentMethods();
  const [open, setOpen] = useState(false);

  // If the current value is no longer an active method, fall back to the default.
  useEffect(() => {
    if (methods.length && !methods.some((m) => m.code === value)) {
      onChange(methods.find((m) => m.is_default)?.code ?? methods[0].code);
    }
  }, [methods, value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{L.label}</Label>
        <button type="button" onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <Settings className="h-3.5 w-3.5" /> {L.configure}
        </button>
      </div>
      <RadioGroup value={value} onValueChange={onChange} className="flex flex-wrap gap-2">
        {methods.map((m) => (
          <label key={m.id}
            className={cn("flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm max-w-full",
              value === m.code ? "border-primary bg-primary/5" : "border-border")}>
            <RadioGroupItem value={m.code} id={`pm-${m.id}`} />
            <span className="break-words">{localizedMethodName(m, t)}</span>
          </label>
        ))}
      </RadioGroup>
      <PaymentMethodsDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
