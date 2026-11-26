import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, MinusCircle } from "lucide-react";
import { useGroupAttendance, useUpdateAttendance, useUpdateSupervisionParticipation } from "@/hooks/useGroups";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { groupsText } from "@/i18n/groupsExtra";
import { describeError } from "@/lib/errorMessages";
import { cn } from "@/lib/utils";

export function GroupAttendanceDialog({ groupSessionId, open, onOpenChange, supervision }: { groupSessionId: string; open: boolean; onOpenChange: (o: boolean) => void; supervision?: boolean }) {
  const { t, lang } = useLanguage();
  const gx = groupsText(lang);
  const updateSup = useUpdateSupervisionParticipation();
  const { toast } = useToast();
  const { data: attendance = [], isLoading } = useGroupAttendance(groupSessionId);
  const updateAttendance = useUpdateAttendance();

  const handleStatusChange = async (attId: string, newStatus: string) => {
    try {
      await updateAttendance.mutateAsync({ id: attId, status: newStatus, groupSessionId });
    } catch (e: any) {
      toast({ title: t("common.error"), description: describeError(e.message), variant: "destructive" });
    }
  };

  const STATUS_ICON: Record<string, typeof Check> = { attended: Check, absent: X, skipped: MinusCircle };
  const STATUS_COLOR: Record<string, string> = {
    attended: "bg-success/10 border-success/30 text-success",
    absent: "bg-destructive/10 border-destructive/30 text-destructive",
    skipped: "bg-warning/10 border-warning/30 text-warning",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("groups.manageAttendance")}</DialogTitle></DialogHeader>
        {isLoading ? (
          <p className="text-muted-foreground text-sm text-center py-4">{t("common.loading")}</p>
        ) : attendance.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">{t("groups.noAttendanceRecords")}</p>
        ) : (
          <div className="space-y-3">
            {attendance.map((att: any) => {
              const Icon = STATUS_ICON[att.status] || Check;
              return (
                <div key={att.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                      {att.clients?.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span className="text-sm font-medium">{att.clients?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                  {supervision && (
                    <Select value={att.supervision_participation ?? "not_applicable"} onValueChange={(v) => updateSup.mutate({ id: att.id, value: v })}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active_work">{gx.supActive}</SelectItem>
                        <SelectItem value="observer">{gx.supObserver}</SelectItem>
                        <SelectItem value="not_applicable">{gx.supNA}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={att.status} onValueChange={(v) => handleStatusChange(att.id, v)}>
                    <SelectTrigger className={cn("w-32 h-8 text-xs border", STATUS_COLOR[att.status] || "")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attended">{t("groups.attended")}</SelectItem>
                      <SelectItem value="absent">{t("groups.absent")}</SelectItem>
                      <SelectItem value="skipped">{t("groups.skipped")}</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
