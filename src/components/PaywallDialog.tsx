import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { track } from "@/lib/analytics";
import { useFreeStarterMode } from "@/hooks/useDemoWorkspace";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional context for analytics, e.g. "client_limit". */
  reason?: string;
}

export function PaywallDialog({ open, onOpenChange, reason = "client_limit" }: Props) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { planCode, limit } = useFreeStarterMode();

  const tx = (key: string, fallback: string, params?: Record<string, string | number>) => {
    const v = t(key as any, params);
    return !v || v === key ? fallback : v;
  };

  let title: string;
  let message: string;
  if (planCode === "solo") {
    const lim = limit ?? 20;
    title = tx("paywall.solo.title", "Solo Practice limit reached");
    message = tx(
      "paywall.solo.message",
      `Solo Practice allows up to ${lim} active clients. To add more clients, please upgrade to Pro Practice.`,
      { limit: lim },
    );
  } else {
    const lim = limit ?? 5;
    title = tx("paywall.freeStarter.title", "Free Starter limit reached");
    message = tx(
      "paywall.freeStarter.message",
      `Free Starter allows up to ${lim} active clients. To add more clients, please upgrade to Solo Practice or Pro Practice.`,
      { limit: lim },
    );
  }
  const viewPlans = tx("paywall.freeStarter.viewPlans", "View Plans");
  const maybeLater = tx("paywall.freeStarter.maybeLater", "Maybe Later");

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) track("paywall_shown", { reason });
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center pt-2">
            {message}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {tx("privacy.shortClients", "Your clients' data is protected. We don't see or use client information.")}
          </p>
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-center gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => {
              track("paywall_dismissed", { reason });
              onOpenChange(false);
            }}
            className="w-full sm:w-auto"
          >
            {maybeLater}
          </Button>
          <Button
            onClick={() => {
              track("paywall_cta_clicked", { reason });
              onOpenChange(false);
              navigate("/plans");
            }}
            className="w-full sm:w-auto"
          >
            {viewPlans}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
