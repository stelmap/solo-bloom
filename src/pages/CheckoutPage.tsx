import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LifeBuoy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { SeoHead } from "@/components/SeoHead";
import { track } from "@/lib/analytics";
import { SUPPORT_OPEN_EVENT } from "@/lib/support";
import { CANONICAL_HOST, isApprovedHost, openPaddleCheckout } from "@/lib/paddleCheckout";

/**
 * Legacy hosted-checkout route kept for existing links (`/checkout?_ptxn=…`).
 * It opens the Paddle overlay immediately — there is no intermediate
 * "complete payment" screen. Closing Paddle returns to plan selection; the
 * subscription is activated only after Paddle confirms the payment.
 */
export default function CheckoutPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  const txn = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("_ptxn") : null;

  const open = useCallback(async () => {
    if (!txn) {
      navigate("/plans", { replace: true });
      return;
    }
    if (!isApprovedHost(window.location.host)) {
      window.location.replace(`https://${CANONICAL_HOST}/checkout?_ptxn=${encodeURIComponent(txn)}`);
      return;
    }
    setFailed(false);
    track("checkout_started", { surface: "paddle_checkout_page" });
    try {
      await openPaddleCheckout(txn, lang, {
        onCompleted: () => {
          track("checkout_completed", { surface: "paddle_checkout_page" });
          track("payment_succeeded", { surface: "paddle_checkout_page" });
          navigate("/purchase-success", { replace: true });
        },
        onClosed: () => navigate("/plans?checkout=cancel", { replace: true }),
        onError: () => {
          setFailed(true);
          track("payment_failed", { surface: "paddle_checkout_page" });
        },
      });
    } catch {
      setFailed(true);
      track("payment_failed", { surface: "paddle_checkout_page", reason: "overlay_open_failed" });
    }
  }, [txn, lang, navigate]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void open();
  }, [open]);

  const contactSupport = () => {
    window.dispatchEvent(
      new CustomEvent(SUPPORT_OPEN_EVENT, {
        detail: { context: { module: "billing", path: "/checkout" }, prefill: t("checkout.errorTitle") },
      }),
    );
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <SeoHead path="/checkout" title="Checkout — Solo .Bizz" description="Secure checkout for your Solo .Bizz subscription, processed by Paddle." noindex />
      {failed ? (
        <section className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <h1 className="text-lg font-medium text-destructive">{t("checkout.errorTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("checkout.errorBody")}</p>
          <div className="mt-4 space-y-2">
            <Button className="w-full" size="lg" onClick={() => void open()}>{t("checkout.retry")}</Button>
            <Button className="w-full" size="lg" variant="outline" onClick={() => navigate("/plans")}>
              {t("plans.title") || "Plans"}
            </Button>
            <Button className="w-full" size="lg" variant="ghost" onClick={contactSupport}>
              <LifeBuoy className="h-4 w-4" aria-hidden="true" />
              {t("checkout.contactSupport")}
            </Button>
          </div>
        </section>
      ) : (
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
      )}
    </main>
  );
}
