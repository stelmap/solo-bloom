import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle } from "lucide-react";
import { useArchiveClient, useClientFutureAppointments } from "@/hooks/useData";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  hasOutstandingBalance?: boolean;
  onArchived?: () => void;
}

export function ArchiveClientDialog({ open, onOpenChange, clientId, clientName, hasOutstandingBalance, onArchived }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const archive = useArchiveClient();
  const { data: futureAppointments = [] } = useClientFutureAppointments(open ? clientId : undefined);
  const [reason, setReason] = useState<string>("therapy_completed");
  const [comment, setComment] = useState("");
  const [futureAction, setFutureAction] = useState<"keep" | "cancel">("keep");

  const reasonOptions = [
    { value: "therapy_completed", label: t("archive.reason.therapyCompleted") },
    { value: "training_completed", label: t("archive.reason.trainingCompleted") },
    { value: "service_completed", label: t("archive.reason.serviceCompleted") },
    { value: "client_paused", label: t("archive.reason.clientPaused") },
    { value: "client_stopped", label: t("archive.reason.clientStopped") },
    { value: "other", label: t("archive.reason.other") },
  ];

  const handleArchive = async () => {
    try {
      await archive.mutateAsync({
        id: clientId,
        reason,
        comment: comment.trim() || undefined,
        cancelFutureSessions: futureAppointments.length > 0 && futureAction === "cancel",
      });
      toast({ title: t("archive.toast.archived", { name: clientName }) });
      onOpenChange(false);
      setComment("");
      onArchived?.();
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("archive.dialog.title")}</DialogTitle>
          <DialogDescription>{t("archive.dialog.description")}</DialogDescription>
        </DialogHeader>

        {hasOutstandingBalance && (
          <div className="flex gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-foreground">{t("archive.warning.outstandingBalance")}</p>
          </div>
        )}

        {futureAppointments.length > 0 && (
          <div className="space-y-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-foreground">{t("archive.warning.futureSessions", { count: futureAppointments.length })}</p>
            </div>
            <RadioGroup value={futureAction} onValueChange={(v) => setFutureAction(v as any)} className="ml-6">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="keep" id="keep" />
                <Label htmlFor="keep" className="font-normal cursor-pointer">{t("archive.future.keep")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="cancel" id="cancel" />
                <Label htmlFor="cancel" className="font-normal cursor-pointer">{t("archive.future.cancel")}</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        <div className="space-y-2">
          <Label>{t("archive.field.reason")}</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {reasonOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("archive.field.comment")}</Label>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleArchive} disabled={archive.isPending}>
            {archive.isPending ? "..." : t("archive.button.archive")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
