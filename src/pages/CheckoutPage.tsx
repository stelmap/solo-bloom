import { useEffect, useState } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * Paddle hosted-checkout landing page. Paddle redirects buyers here with a
 * `_ptxn` transaction id; Paddle.js then opens the checkout overlay.
 */
export default function CheckoutPage() {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("paddle-config");
        if (error || !data?.clientToken) throw error ?? new Error("missing_client_token");
        const paddle: Paddle | undefined = await initializePaddle({
          token: data.clientToken,
          environment: data.environment === "production" ? "production" : "sandbox",
        });
        if (cancelled || !paddle) return;

        const txn = new URLSearchParams(window.location.search).get("_ptxn");
        if (txn) paddle.Checkout.open({ transactionId: txn });
        else setFailed(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-center">
      {failed ? (
        <p className="text-muted-foreground">{t("plans.checkoutFailed")}</p>
      ) : (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t("common.loading")}
        </p>
      )}
    </main>
  );
}
