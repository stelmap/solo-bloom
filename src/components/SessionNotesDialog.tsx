import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface SessionNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string | null;
  clientId: string | null;
}

export function SessionNotesDialog({ open, onOpenChange, appointmentId, clientId }: SessionNotesDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [summary, setSummary] = useState("");
  const [hasHomework, setHasHomework] = useState(false);
  const [homework, setHomework] = useState("");
  const [transference, setTransference] = useState("");
  const [saving, setSaving] = useState(false);

  const [loading, setLoading] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSummary("");
    setHasHomework(false);
    setHomework("");
    setTransference("");
    setExistingId(null);
    if (!appointmentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("session_notes")
          .select("id, session_summary, has_homework, homework_text, transference")
          .eq("appointment_id", appointmentId)
          .maybeSingle();
        if (error) throw error;
        if (cancelled || !data) return;
        setExistingId(data.id);
        setSummary(data.session_summary ?? "");
        setHasHomework(!!data.has_homework);
        setHomework(data.homework_text ?? "");
        setTransference(data.transference ?? "");
      } catch (e: any) {
        if (!cancelled) toast({ title: t("common.error"), description: e.message, variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, appointmentId]);


  const handleSave = async () => {
    if (!appointmentId || !clientId) return;
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const { error } = await supabase.from("session_notes").upsert(
        {
          user_id: uid,
          appointment_id: appointmentId,
          client_id: clientId,
          session_summary: summary.trim() || null,
          has_homework: hasHomework,
          homework_text: hasHomework ? homework.trim() || null : null,
          transference: transference.trim() || null,
        },
        { onConflict: "appointment_id" }
      );
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["session_notes"] });
      toast({ title: t("sessionNotes.saved") });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("sessionNotes.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("sessionNotes.summaryLabel")}</Label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={t("sessionNotes.summaryPlaceholder")}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="has-homework"
                checked={hasHomework}
                onCheckedChange={(v) => setHasHomework(!!v)}
              />
              <Label htmlFor="has-homework" className="cursor-pointer font-normal">
                {t("sessionNotes.hasHomework")}
              </Label>
            </div>
            {hasHomework && (
              <Textarea
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                placeholder={t("sessionNotes.homeworkPlaceholder")}
                className="min-h-[80px]"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("sessionNotes.transferenceLabel")}</Label>
            <Textarea
              value={transference}
              onChange={(e) => setTransference(e.target.value)}
              placeholder={t("sessionNotes.transferencePlaceholder")}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("common.close")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("common.saving") : t("sessionNotes.saveAndFinish")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
