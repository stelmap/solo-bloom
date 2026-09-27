import { useEffect, useState } from "react";
import { Banknote, CreditCard, Landmark, Receipt, Settings, Wallet, CircleDollarSign } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useActivePaymentMethods, localizedMethodName } from "@/hooks/usePaymentMethods";
import { PaymentMethodsDialog } from "./PaymentMethodsManager";
import { pmCopy } from "./paymentMethodsCopy";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Wallet> = {
  cash: Banknote, card: CreditCard, check: Receipt, paypal: Wallet, bank_transfer: Landmark,
};

/** Horizontal radio cards of active, invoice-visible payment methods (Session Details). */
export function PaymentMethodCards({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const { t, lang } = useLanguage();
  const L = pmCopy(lang);
  const { data: all } = useActivePaymentMethods();
  const methods = all.filter((m) => m.show_on_invoice);
  const [open, setOpen] = useState(false);

  // Always start on the user's default (or first visible) method.
  useEffect(() => {
    if (methods.length && !methods.some((m) => m.code === value)) {
      onChange(methods.find((m) => m.is_default)?.code ?? methods[0].code);
    }
  }, [methods.map((m) => m.code).join(","), value]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CircleDollarSign className="h-4 w-4 text-muted-foreground" /> {L.label}
        </h3>
        <button type="button" onClick={() => setOpen(true)} aria-label={L.configure} title={L.configure}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <Settings className="h-4 w-4" />
        </button>
      </div>
      <div role="radiogroup" aria-label={L.label} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {methods.map((m) => {
          const Icon = ICONS[m.code] ?? Wallet;
          const selected = value === m.code;
          return (
            <button key={m.id} type="button" role="radio" aria-checked={selected} onClick={() => onChange(m.code)}
              className={cn(
                "relative flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-center text-sm transition-colors",
                selected ? "border-primary/60 bg-primary/5" : "border-border bg-background hover:bg-muted/50",
              )}>
              <span className={cn("absolute left-2 top-2 flex h-4 w-4 items-center justify-center rounded-full border",
                selected ? "border-primary" : "border-muted-foreground/40")}>
                {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
              </span>
              <Icon className="h-5 w-5 text-foreground" />
              <span className="break-words leading-tight text-foreground">{localizedMethodName(m, t)}</span>
              {m.is_default && <span className="text-[10px] text-muted-foreground">{L.default}</span>}
            </button>
          );
        })}
      </div>
      <PaymentMethodsDialog open={open} onOpenChange={setOpen} />
    </section>
  );
}
