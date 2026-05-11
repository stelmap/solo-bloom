import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { track } from "@/lib/analytics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional context for analytics, e.g. "client_limit". */
  reason?: string;
}

export function PaywallDialog({ open, onOpenChange, reason = "client_limit" }: Props) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const tx = (key: string, fallback: string) => {
    const v = t(key as any);
    return !v || v === key ? fallback : v;
  };

  const title = tx("paywall.freeStarter.title", "Free Starter limit reached");
  const message = tx(
    "paywall.freeStarter.message",
    "You can manage up to 5 clients for free. To add more clients and continue growing your practice, please choose a subscription plan."
  );
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
