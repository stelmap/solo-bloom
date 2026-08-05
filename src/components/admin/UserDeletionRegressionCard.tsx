import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Check = { name: string; passed: boolean; detail?: string };
type Report = { ok: boolean; passed: number; total: number; checks: Check[] };

/**
 * Runs the mandatory pre-release regression for Safe User Data Deletion.
 * The edge function seeds its own Test User A / Test User B fixtures, deletes
 * only User A through the production path, and verifies tenant isolation.
 */
export function UserDeletionRegressionCard() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  async function run() {
    setRunning(true);
    setReport(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-regression-user-deletion");
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const r = data as Report;
      setReport(r);
      toast({
        title: r.ok ? "Regression passed" : "Regression FAILED — block release",
        description: `${r.passed}/${r.total} checks passed.`,
        variant: r.ok ? undefined : "destructive",
      });
    } catch (e: any) {
      toast({ title: "Regression run failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Critical regression — Safe User Data Deletion</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Seeds Test User A and Test User B (2 clients, 3 sessions, notes, 1 document, 1 service,
              finance records), deletes only User A via the real admin flow, and verifies User B and the
              admin account are untouched. Mandatory before release.
            </p>
          </div>
        </div>
        <Button onClick={run} disabled={running} variant="outline" size="sm">
          {running && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Run regression
        </Button>
      </CardHeader>
      {report && (
        <CardContent className="space-y-2">
          <Badge variant={report.ok ? "default" : "destructive"}>
            {report.ok ? "PASSED" : "FAILED"} · {report.passed}/{report.total}
          </Badge>
          <ul className="space-y-1">
            {report.checks.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                {c.passed
                  ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  : <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />}
                <span>
                  {c.name}
                  {!c.passed && c.detail && (
                    <span className="block text-xs text-muted-foreground break-all">{c.detail}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
