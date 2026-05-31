import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Post-checkout redirect. The legacy "Your workspace is ready" intermediate
 * screen has been retired — we now activate the plan in the background and
 * send the user straight to the dashboard.
 */
export default function PurchaseSuccessPage() {
  const { user, refreshSubscription } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      try {
        // Poll briefly so the Stripe webhook has time to flip the flag.
        for (let attempt = 0; attempt < 6 && !cancelled; attempt += 1) {
          const { data } = await supabase.functions.invoke("check-subscription", {
            body: { force: true },
          });
          if (data?.subscribed || data?.on_trial) break;
          await new Promise((r) => setTimeout(r, 1500));
        }
        if (cancelled) return;
        await refreshSubscription({ force: true });
        qc.invalidateQueries();
        toast.success("Your plan is active.");
      } catch (e) {
        console.error("Plan activation refresh failed:", e);
      } finally {
        if (!cancelled) navigate("/dashboard", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshSubscription, qc, navigate]);

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>Activating your plan…</span>
      </div>
    </div>
  );
}
