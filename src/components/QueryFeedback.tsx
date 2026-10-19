import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { describeError } from "@/lib/errorMessages";
import { Loader2, RotateCcw } from "lucide-react";

export function QueryFeedback({ pending, error, retry }: { pending: boolean; error: Error | null; retry: () => unknown }) {
  const { t } = useLanguage();
  if (error) return <div role="alert" className="flex flex-wrap items-center gap-3 p-3 text-destructive">
    <span className="text-sm">{describeError(error.message)}</span>
    <Button variant="outline" size="icon" aria-label={t("common.retry")} onClick={retry}><RotateCcw className="h-4 w-4" /></Button>
  </div>;
  if (pending) return <div role="status" className="flex items-center gap-2 p-3 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />{t("common.loading")}</div>;
  return null;
}