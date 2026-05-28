import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Download, Trash2, Shield, History, AlertTriangle } from "lucide-react";
import { useAuditLog, useDeletionRequest, useRequestDeletion, useCancelDeletion, downloadMyData } from "@/hooks/useGdpr";
import { useLanguage } from "@/i18n/LanguageContext";
import { useDateFormat } from "@/lib/dateLocale";

export function PrivacySection() {
  const { t } = useLanguage();
  const fmt = useDateFormat();
  const { data: audit = [], isLoading: auditLoading } = useAuditLog(50);
  const { data: deletionReq } = useDeletionRequest();
  const requestDeletion = useRequestDeletion();
  const cancelDeletion = useCancelDeletion();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      await downloadMyData();
      toast({ title: t("privacy.export.successTitle"), description: t("privacy.export.successDesc") });
    } catch (e) {
      toast({ title: t("privacy.export.failTitle"), description: String(e), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleRequestDeletion = async () => {
    try {
      await requestDeletion.mutateAsync(undefined);
      toast({ title: t("privacy.delete.toastScheduled"), description: t("privacy.delete.toastScheduledDesc") });
    } catch (e) {
      toast({ title: t("privacy.delete.failTitle"), description: String(e), variant: "destructive" });
    }
  };

  const handleCancelDeletion = async () => {
    try {
      await cancelDeletion.mutateAsync();
      toast({ title: t("privacy.delete.toastCancelled") });
    } catch (e) {
      toast({ title: t("privacy.delete.cancelFailTitle"), description: String(e), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" />{t("privacy.export.title")}</CardTitle>
          <CardDescription>{t("privacy.export.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? t("privacy.export.preparing") : t("privacy.export.button")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" />{t("privacy.delete.title")}</CardTitle>
          <CardDescription>{t("privacy.delete.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {deletionReq ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("privacy.delete.scheduledTitle")}</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{t("privacy.delete.scheduledOn", { date: fmt(new Date(deletionReq.scheduled_for), "PPpp") })}</p>
                <Button variant="outline" size="sm" onClick={handleCancelDeletion} disabled={cancelDeletion.isPending}>
                  {t("privacy.delete.cancel")}
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">{t("privacy.delete.button")}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("privacy.delete.confirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("privacy.delete.confirmDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("privacy.delete.keep")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRequestDeletion} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {t("privacy.delete.confirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{t("privacy.security.title")}</CardTitle>
          <CardDescription>{t("privacy.security.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong className="text-foreground">{t("privacy.security.transit")}</strong> {t("privacy.security.transitDesc")}</p>
          <p><strong className="text-foreground">{t("privacy.security.rest")}</strong> {t("privacy.security.restDesc")}</p>
          <p><strong className="text-foreground">{t("privacy.security.access")}</strong> {t("privacy.security.accessDesc")}</p>
          <p><strong className="text-foreground">{t("privacy.security.audit")}</strong> {t("privacy.security.auditDesc")}</p>
          <p><strong className="text-foreground">{t("privacy.security.location")}</strong> {t("privacy.security.locationDesc")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />{t("privacy.audit.title")}</CardTitle>
          <CardDescription>{t("privacy.audit.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {auditLoading ? (
            <p className="text-sm text-muted-foreground">{t("privacy.audit.loading")}</p>
          ) : audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("privacy.audit.empty")}</p>
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
                    <span className="text-xs text-muted-foreground shrink-0">{fmt(new Date(e.at), "PPp")}</span>
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
