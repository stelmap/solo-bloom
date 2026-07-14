import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export function BackButton() {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      aria-label={t("common.previous")}
    >
      <ArrowLeft className="h-4 w-4" />
      {t("common.previous")}
    </button>
  );
}
