import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import BrandName from "@/components/BrandName";
import { SeoHead } from "@/components/SeoHead";

/**
 * Paddle hosted-checkout landing page. Paddle redirects buyers here with a
 * `_ptxn` transaction id; a single button opens the secure payment overlay,
 * and a clear success state is shown once the payment completes.
 */
export default function CheckoutPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const paddleRef = useRef<Paddle | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed" | "done">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("paddle-config");
        if (error || !data?.clientToken) throw error ?? new Error("missing_client_token");
        const paddle: Paddle | undefined = await initializePaddle({
          token: data.clientToken,
          environment: data.environment === "production" ? "production" : "sandbox",
          eventCallback: (event) => {
            if (event?.name === "checkout.completed") setStatus("done");
          },
        });
        if (cancelled || !paddle) return;
        paddleRef.current = paddle;
        const txn = new URLSearchParams(window.location.search).get("_ptxn");
        setStatus(txn ? "ready" : "failed");
      } catch {
        if (!cancelled) setStatus("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCheckout = useCallback(() => {
    const txn = new URLSearchParams(window.location.search).get("_ptxn");
    if (!paddleRef.current || !txn) {
      setStatus("failed");
      return;
    }
    // Paddle has no Ukrainian locale; fall back to English for it.
    const paddleLocale = ["en", "pl", "fr", "ru"].includes(lang) ? lang : "en";
    paddleRef.current.Checkout.open({
      transactionId: txn,
      settings: { locale: paddleLocale, displayMode: "overlay" },
    });
  }, [lang]);

  // Open the Paddle overlay automatically as soon as it is ready, so picking a
  // plan goes straight to payment; the button below is the manual retry.
  const autoOpened = useRef(false);
  useEffect(() => {
    if (status === "ready" && !autoOpened.current) {
      autoOpened.current = true;
      openCheckout();
    }
  }, [status, openCheckout]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <SeoHead
        path="/checkout"
        title="Checkout — Solo .Bizz"
        description="Secure checkout for your Solo .Bizz subscription, processed by Paddle."
        noindex
      />
      <section className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        {status === "done" ? (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" aria-hidden="true" />
            <h1 className="text-2xl font-semibold tracking-tight">{t("checkout.successTitle")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("checkout.successBody")}</p>
            <Button className="mt-6 w-full" size="lg" onClick={() => navigate("/purchase-success")}>
              {t("checkout.goToApp")}
            </Button>
          </>
        ) : (
          <>
            <div className="mb-4 flex justify-center">
              <BrandName className="text-lg font-semibold" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("checkout.title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("checkout.subtitle")}</p>

            {status === "failed" ? (
              <>
                <p className="mt-6 text-sm text-destructive">{t("plans.checkoutFailed")}</p>
                <Button className="mt-4 w-full" size="lg" variant="outline" onClick={() => navigate("/plans")}>
                  {t("checkout.retry")}
                </Button>
              </>
            ) : (
              <Button
                className="mt-6 w-full"
                size="lg"
                disabled={status === "loading"}
                onClick={openCheckout}
              >
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                )}
                {t("checkout.pay")}
              </Button>
            )}

            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {t("plans.footerSecure")}
            </p>
          </>
        )}
      </section>
    </main>
  );
}
