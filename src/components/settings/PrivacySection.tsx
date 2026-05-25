import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Download, Trash2, Shield, History, AlertTriangle } from "lucide-react";
import { useAuditLog, useDeletionRequest, useRequestDeletion, useCancelDeletion, downloadMyData } from "@/hooks/useGdpr";

export function PrivacySection() {
  const { data: audit = [], isLoading: auditLoading } = useAuditLog(50);
  const { data: deletionReq } = useDeletionRequest();
  const requestDeletion = useRequestDeletion();
  const cancelDeletion = useCancelDeletion();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      await downloadMyData();
      toast({ title: "Export ready", description: "Your data was downloaded as a JSON file." });
    } catch (e) {
      toast({ title: "Export failed", description: String(e), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleRequestDeletion = async () => {
    try {
      await requestDeletion.mutateAsync(undefined);
      toast({ title: "Deletion scheduled", description: "Your account and data will be permanently deleted in 7 days. You can cancel any time before then." });
    } catch (e) {
      toast({ title: "Request failed", description: String(e), variant: "destructive" });
    }
  };

  const handleCancelDeletion = async () => {
    try {
      await cancelDeletion.mutateAsync();
      toast({ title: "Deletion cancelled" });
    } catch (e) {
      toast({ title: "Cancel failed", description: String(e), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" />Export my data</CardTitle>
          <CardDescription>Download a JSON archive of every record we hold about you (GDPR Art. 15 & 20).</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? "Preparing…" : "Download my data"}
          </Button>
        </CardContent>
      </Card>

      {/* Deletion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" />Delete my account</CardTitle>
          <CardDescription>Permanently erase your account and all associated data (GDPR Art. 17). A 7-day grace period applies.</CardDescription>
        </CardHeader>
        <CardContent>
          {deletionReq ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Deletion scheduled</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>Your account is scheduled for permanent deletion on <strong>{format(new Date(deletionReq.scheduled_for), "PPpp")}</strong>.</p>
                <Button variant="outline" size="sm" onClick={handleCancelDeletion} disabled={cancelDeletion.isPending}>
                  Cancel deletion
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Request account deletion</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will schedule the permanent deletion of your account, clients, sessions, notes, attachments and financial records in 7 days. You can cancel any time before then. This action cannot be undone after the grace period.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my account</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRequestDeletion} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, schedule deletion
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>

      {/* Compliance summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Security & compliance</CardTitle>
          <CardDescription>How your data is protected.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Encryption in transit:</strong> All traffic uses TLS 1.2+.</p>
          <p><strong className="text-foreground">Encryption at rest:</strong> Database storage and file uploads are encrypted on disk.</p>
          <p><strong className="text-foreground">Access control:</strong> Row-level security ensures only you can see your data.</p>
          <p><strong className="text-foreground">Audit trail:</strong> Every change to clients, notes, sessions and supervisions is logged below.</p>
          <p><strong className="text-foreground">Data location:</strong> Stored in the EU (Frankfurt) region.</p>
        </CardContent>
      </Card>

      {/* Audit log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Recent access log</CardTitle>
          <CardDescription>Latest 50 changes and reads on your sensitive records.</CardDescription>
        </CardHeader>
        <CardContent>
          {auditLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ScrollArea className="h-80 pr-4">
              <ul className="space-y-2">
                {audit.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 text-sm border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant={e.action === "delete" || e.action.startsWith("erase") ? "destructive" : "secondary"} className="shrink-0">
                        {e.action}
                      </Badge>
                      <span className="text-muted-foreground truncate">{e.entity_type}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{format(new Date(e.at), "PPp")}</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
