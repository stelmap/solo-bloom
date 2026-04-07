import { Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/i18n/LanguageContext";

interface BreakevenProgressProps {
  currentIncome: number;
  requiredIncome: number;
  currency?: string;
}

export function BreakevenProgress({ currentIncome, requiredIncome, currency = "€" }: BreakevenProgressProps) {
  const { t } = useLanguage();
  const percentage = Math.min((currentIncome / requiredIncome) * 100, 100);
  const remaining = Math.max(requiredIncome - currentIncome, 0);

  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
          <Target className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{t("breakeven.title")}</h3>
          <p className="text-sm text-muted-foreground">{t("breakeven.thisMonth")}</p>
        </div>
      </div>

      <div className="space-y-3">
        <Progress value={percentage} className="h-3" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {currency}{currentIncome.toLocaleString()} {t("breakeven.earned")}
          </span>
          <span className="font-medium text-foreground">
            {currency}{requiredIncome.toLocaleString()} {t("breakeven.needed")}
          </span>
        </div>
        {remaining > 0 ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{currency}{remaining.toLocaleString()}</span> {t("breakeven.moreToGo")}
          </p>
        ) : (
          <p className="text-sm font-medium text-success">{t("breakeven.reached")}</p>
        )}
      </div>
    </div>
  );
}
