import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { CreditCard, X } from "lucide-react";

type Copy = { title: string; body: string; cta: string; later: string };

const COPY: Record<string, Copy> = {
  en: {
    title: "We are moving payments to Paddle",
    body: "Your current subscription stays active. Please set up your subscription again with our new payment provider — your price stays the same.",
    cta: "Move my subscription",
    later: "Later",
  },
  uk: {
    title: "Ми переходимо на оплату через Paddle",
    body: "Ваша поточна підписка залишається активною. Будь ласка, оформіть її ще раз у новій платіжній системі — ціна залишається такою самою.",
    cta: "Перенести підписку",
    later: "Пізніше",
  },
  ru: {
    title: "Мы переходим на оплату через Paddle",
    body: "Ваша текущая подписка остаётся активной. Пожалуйста, оформите её заново в новой платёжной системе — цена остаётся прежней.",
    cta: "Перенести подписку",
    later: "Позже",
  },
  pl: {
    title: "Przechodzimy na płatności przez Paddle",
    body: "Twoja obecna subskrypcja pozostaje aktywna. Prosimy o ponowne jej zamówienie u nowego operatora płatności — cena pozostaje bez zmian.",
    cta: "Przenieś subskrypcję",
    later: "Później",
  },
  fr: {
    title: "Nous passons aux paiements via Paddle",
    body: "Votre abonnement actuel reste actif. Merci de le souscrire à nouveau auprès de notre nouveau prestataire de paiement — le prix reste identique.",
    cta: "Transférer mon abonnement",
    later: "Plus tard",
  },
};

export function PaddleMigrationBanner() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("status, paddle_subscription_id, stripe_subscription_id, migration_prompt_dismissed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      const row = data as any;
      const needsMigration =
        !!row.stripe_subscription_id &&
        !row.paddle_subscription_id &&
        (row.status === "active" || row.status === "trialing") &&
        !row.migration_prompt_dismissed_at;
      setShow(needsMigration);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!show) return null;

  const copy = COPY[lang] ?? COPY.en;

  async function dismiss() {
    setShow(false);
    try { await supabase.rpc("dismiss_paddle_migration_prompt" as any); } catch { /* noop */ }
  }

  return (
    <div className="border-b border-orange-200 bg-orange-50 px-4 py-3 lg:px-10">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3">
        <CreditCard className="h-4 w-4 shrink-0 text-orange-600" />
        <div className="min-w-[200px] flex-1">
          <div className="text-sm font-semibold text-orange-900">{copy.title}</div>
          <div className="text-sm text-orange-800">{copy.body}</div>
        </div>
        <Button size="sm" onClick={() => navigate("/plans?migrate=1")}>{copy.cta}</Button>
        <Button size="sm" variant="ghost" onClick={() => void dismiss()} aria-label={copy.later}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
