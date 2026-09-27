import { useEffect, useState } from "react";
import { Star, Banknote, CreditCard, Landmark, Receipt, Settings, Wallet, CircleDollarSign } from "lucide-react";
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
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <CircleDollarSign className="h-4 w-4" /> {L.label}
        </h3>
        <button type="button" onClick={() => setOpen(true)} aria-label={L.configure} title={L.configure}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <Settings className="h-4 w-4" />
        </button>
      </div>
      <div role="radiogroup" aria-label={L.label} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {methods.map((m) => {
          const Icon = ICONS[m.code] ?? Wallet;
          const selected = value === m.code;
          return (
            <button key={m.id} type="button" role="radio" aria-checked={selected} onClick={() => onChange(m.code)}
              className={cn(
                "relative flex min-h-[52px] items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                selected ? "border-accent-soft-border bg-accent-soft" : "border-border bg-card hover:bg-muted/50",
              )}>
              <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                selected ? "border-primary" : "border-muted-foreground/40")}>
                {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
              </span>
              <Icon className="h-4 w-4 shrink-0 text-foreground" />
              <span className="min-w-0 flex-1 break-words leading-tight text-foreground">{localizedMethodName(m, t)}</span>
              {m.is_default && (
                <Star className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" aria-label={L.default}>
                  <title>{L.default}</title>
                </Star>
              )}
            </button>
          );
        })}
      </div>
      <PaymentMethodsDialog open={open} onOpenChange={setOpen} />
    </section>
  );
}
