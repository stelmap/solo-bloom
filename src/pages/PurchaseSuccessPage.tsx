import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, ArrowRight, Users, Briefcase, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Phase = "working" | "ready" | "error";

/**
 * Landing page after a successful checkout. Triggers a forced subscription
 * refresh and runs demo cleanup for the current user, then guides them into
 * their real workspace.
 */
export default function PurchaseSuccessPage() {
  const { user, refreshSubscription } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("working");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      try {
        // Force subscription refresh so the cache reflects the new plan
        await refreshSubscription();

        // Cleanup demo data — server is authoritative; webhook may have done
        // this already, but the RPC is idempotent.
        const { error } = await supabase.rpc("cleanup_demo_workspace", {
          p_user_id: user.id,
        });
        if (cancelled) return;
        if (error) throw error;

        // Refresh all cached lists
        qc.invalidateQueries();
        setPhase("ready");
      } catch (e) {
        if (cancelled) return;
        console.error("Post-purchase cleanup failed:", e);
        setErrorMsg(e instanceof Error ? e.message : "Unknown error");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, refreshSubscription, qc]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {phase === "working" && (
          <Card className="p-10 text-center">
            <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin text-primary" />
            <h1 className="text-2xl font-semibold mb-2">Setting up your workspace…</h1>
            <p className="text-muted-foreground">
              Activating your plan and removing demo data.
            </p>
          </Card>
        )}

        {phase === "ready" && (
          <Card className="p-10">
            <div className="text-center mb-8">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-semibold mb-2">Your workspace is ready</h1>
              <p className="text-muted-foreground">
                Demo data has been removed. Let's configure your real practice.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-8">
              <NextStep
                icon={<Users className="h-5 w-5" />}
                title="Add your first client"
                to="/clients"
              />
              <NextStep
                icon={<Briefcase className="h-5 w-5" />}
                title="Configure services"
                to="/services"
              />
              <NextStep
                icon={<Settings className="h-5 w-5" />}
                title="Review settings"
                to="/settings"
              />
            </div>

            <div className="flex justify-center">
              <Button asChild size="lg">
                <Link to="/dashboard">
                  Go to dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        )}

        {phase === "error" && (
          <Card className="p-10 text-center">
            <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              Your payment was successful, but we couldn't finish cleanup automatically.
              {errorMsg ? ` (${errorMsg})` : ""}
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => navigate(0)}>Retry</Button>
              <Button asChild>
                <Link to="/dashboard">Continue to dashboard</Link>
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function NextStep({ icon, title, to }: { icon: React.ReactNode; title: string; to: string }) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-border p-4 hover:border-primary/40 hover:bg-accent/40 transition-colors text-left"
    >
      <div className="text-primary mb-2">{icon}</div>
      <div className="text-sm font-medium">{title}</div>
    </Link>
  );
}
