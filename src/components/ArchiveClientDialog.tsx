import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft } from "lucide-react";
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

type FutureAction = "keep" | "cancel" | "delete";

export function ArchiveClientDialog({ open, onOpenChange, clientId, clientName, hasOutstandingBalance, onArchived }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const archive = useArchiveClient();
  const { data: futureAppointments = [] } = useClientFutureAppointments(open ? clientId : undefined);
  const [step, setStep] = useState<"reason" | "future">("reason");
  const [reason, setReason] = useState<string>("completed");
  const [comment, setComment] = useState("");
  const [futureAction, setFutureAction] = useState<FutureAction>("delete");

  const reasonOptions = [
    { value: "completed", label: t("archive.reason.completed") },
    { value: "client_paused", label: t("archive.reason.clientPaused") },
    { value: "client_stopped", label: t("archive.reason.clientStopped") },
    { value: "other", label: t("archive.reason.other") },
  ];

  // Reset state when the dialog closes
  useEffect(() => {
    if (!open) {
      setStep("reason");
      setReason("completed");
      setComment("");
      setFutureAction("delete");
    }
  }, [open]);

  // When the reason changes, set the recommended default for future action
  useEffect(() => {
    if (reason === "client_paused") setFutureAction("keep");
    else setFutureAction("delete");
  }, [reason]);

  const hasFuture = futureAppointments.length > 0;

  const performArchive = async (action: FutureAction | undefined) => {
    try {
      await archive.mutateAsync({
        id: clientId,
        reason,
        comment: comment.trim() || undefined,
        futureSessionsAction: action,
      });
      toast({
        title: hasFuture
          ? t("archive.toast.archivedFull", { name: clientName })
          : t("archive.toast.archived", { name: clientName }),
      });
      onOpenChange(false);
      onArchived?.();
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handlePrimary = async () => {
    if (step === "reason") {
      if (hasFuture) {
        setStep("future");
        return;
      }
      await performArchive(undefined);
    } else {
      await performArchive(futureAction);
    }
  };

  // Options available in step 2 depend on the reason
  const futureOptions: Array<{ value: FutureAction; label: string; desc: string; recommended?: boolean }> =
    reason === "client_paused"
      ? [
          { value: "keep", label: t("archive.future.keep"), desc: t("archive.future.keep.desc"), recommended: true },
          { value: "cancel", label: t("archive.future.cancelKeep"), desc: t("archive.future.cancelKeep.desc") },
          { value: "delete", label: t("archive.future.delete"), desc: t("archive.future.delete.desc") },
        ]
      : [
          { value: "delete", label: t("archive.future.delete"), desc: t("archive.future.delete.desc"), recommended: true },
          { value: "cancel", label: t("archive.future.cancelKeep"), desc: t("archive.future.cancelKeep.desc") },
        ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {step === "reason" ? (
          <>
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
              <Button onClick={handlePrimary} disabled={archive.isPending}>
                {archive.isPending ? "..." : t("archive.button.archive")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("archive.step.future.title")}</DialogTitle>
              <DialogDescription>
                {t("archive.warning.futureSessions", { count: futureAppointments.length })}
              </DialogDescription>
            </DialogHeader>

            <RadioGroup
              value={futureAction}
              onValueChange={(v) => setFutureAction(v as FutureAction)}
              className="space-y-2"
            >
              {futureOptions.map((o) => (
                <label
                  key={o.value}
                  htmlFor={`fa-${o.value}`}
                  className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/40"
                >
                  <RadioGroupItem value={o.value} id={`fa-${o.value}`} className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{o.label}</span>
                      {o.recommended && (
                        <Badge variant="secondary" className="text-[10px]">
                          {t("archive.future.recommended")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{o.desc}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button variant="ghost" onClick={() => setStep("reason")} disabled={archive.isPending}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("archive.button.back")}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={archive.isPending}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handlePrimary} disabled={archive.isPending}>
                  {archive.isPending ? "..." : t("archive.button.confirmArchive")}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
