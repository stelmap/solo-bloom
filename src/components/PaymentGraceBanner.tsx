import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

const COPY: Record<string, (d: string) => [string, string]> = {
  uk: (d) => [`Не вдалося списати оплату підписки. Доступ збережено до ${d}.`, "Оновити платіжні дані"],
  en: (d) => [`Your subscription payment failed. Access is kept until ${d}.`, "Update payment details"],
  pl: (d) => [`Płatność za subskrypcję nie powiodła się. Dostęp zachowany do ${d}.`, "Zaktualizuj dane płatności"],
  de: (d) => [`Die Abozahlung ist fehlgeschlagen. Der Zugang bleibt bis ${d} erhalten.`, "Zahlungsdaten aktualisieren"],
  fr: (d) => [`Le paiement de l’abonnement a échoué. L’accès est conservé jusqu’au ${d}.`, "Mettre à jour le paiement"],
  ru: (d) => [`Не удалось списать оплату подписки. Доступ сохранён до ${d}.`, "Обновить платёжные данные"],
};

export function PaymentGraceBanner({ until }: { until: string }) {
  const { lang } = useLanguage();
  const [busy, setBusy] = useState(false);
  const date = new Date(until).toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric" });
  const [text, cta] = (COPY[lang] ?? COPY.en)(date);
  const open = async () => {
    setBusy(true);
    const { data } = await supabase.functions.invoke("customer-portal");
    setBusy(false);
    if (data?.url) window.open(data.url, "_blank");
  };
  return (
    <div role="alert" className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-destructive px-4 py-2 text-sm text-destructive-foreground">
      <AlertTriangle className="h-4 w-4" />
      <span>{text}</span>
      <Button size="sm" variant="secondary" onClick={open} disabled={busy}>{cta}</Button>
    </div>
  );
}
