import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { campaignText, type PromoValidationStatus } from "@/lib/supportUkraine";

interface Props {
  lang: string;
  eligible: boolean;
  planCode?: string | null;
  onApply: (code: string, planCode?: string | null) => { status: PromoValidationStatus; message: string };
  className?: string;
}

/** Promo-code entry for users who were not automatically recognised. */
export function SupportUkrainePromoInput({ lang, eligible, planCode, onApply, className = "" }: Props) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<{ status: PromoValidationStatus; message: string } | null>(null);

  const ok = result?.status === "applied" || result?.status === "already_active";

  return (
    <div className={className}>
      {eligible ? (
        <p className="flex items-center gap-2 text-sm text-primary font-medium">
          <Check className="h-4 w-4" />
          {campaignText(lang, "eligibilityNotice")}
        </p>
      ) : (
        <>
          <label className="block text-sm font-medium text-foreground mb-2" htmlFor="support-ua-promo">
            {campaignText(lang, "promoLabel")}
          </label>
          <div className="flex gap-2">
            <Input
              id="support-ua-promo"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={campaignText(lang, "promoPlaceholder")}
              autoComplete="off"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setResult(onApply(value, planCode))}
              disabled={!value.trim()}
            >
              {campaignText(lang, "promoApply")}
            </Button>
          </div>
        </>
      )}
      {result && !eligible && (
        <p className={`mt-2 text-sm ${ok ? "text-primary" : "text-destructive"}`}>{result.message}</p>
      )}
    </div>
  );
}

export default SupportUkrainePromoInput;
