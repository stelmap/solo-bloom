import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { format } from "date-fns";
import { useDateLocale } from "@/lib/dateLocale";

interface Props {
  clientId: string;
}

export function LastSessionNotesCard({ clientId }: Props) {
  const { t } = useLanguage();
  const locale = useDateLocale();
  const [open, setOpen] = useState(false);

  const { data: note } = useQuery({
    queryKey: ["session_notes", "last-for-client", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_notes")
        .select("id, session_summary, has_homework, homework_text, transference, created_at, appointment_id, appointments!inner(starts_at, status)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  if (!note || (!note.session_summary && !note.homework_text && !note.transference && !note.has_homework)) {
    return null;
  }

  const sessionDate = note.appointments?.starts_at
    ? format(new Date(note.appointments.starts_at), "PPP", { locale })
    : format(new Date(note.created_at), "PPP", { locale });

  const preview = note.session_summary || note.transference || note.homework_text || "";
  const truncated = preview.length > 140 ? preview.slice(0, 140) + "…" : preview;

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> {t("sessionNotes.lastTitle")}
          </h3>
          <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
            <Eye className="h-3.5 w-3.5 mr-1" /> {t("common.view")}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">{sessionDate}</div>
        {truncated && (
          <div className="text-sm whitespace-pre-wrap line-clamp-3 text-foreground/90">{truncated}</div>
        )}
        {note.has_homework && (
          <Badge variant="outline" className="text-xs">{t("sessionNotes.homeworkYes")}</Badge>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {t("sessionNotes.lastTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground -mt-2">{sessionDate}</div>
          <div className="space-y-3 text-sm py-2">
            {note.session_summary && (
              <div>
                <div className="text-xs text-muted-foreground">{t("sessionNotes.summaryLabel")}</div>
                <div className="whitespace-pre-wrap">{note.session_summary}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-muted-foreground">{t("sessionNotes.homeworkLabel")}</div>
              <div className="whitespace-pre-wrap">
                {note.has_homework
                  ? (note.homework_text || t("sessionNotes.homeworkYes"))
                  : t("sessionNotes.homeworkNo")}
              </div>
            </div>
            {note.transference && (
              <div>
                <div className="text-xs text-muted-foreground">{t("sessionNotes.transferenceLabel")}</div>
                <div className="whitespace-pre-wrap">{note.transference}</div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
