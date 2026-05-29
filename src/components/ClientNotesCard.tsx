import { useEffect, useRef, useState } from "react";
import { FileText, Maximize2, X, CheckCircle2, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useUpdateClient } from "@/hooks/useData";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Props = {
  client: { id: string; name: string; notes?: string | null; updated_at?: string | null };
  /**
   * "edit"     — full editor with autosave + expand action (Client Profile)
   * "preview"  — read-only block with "Edit" action (Supervision)
   */
  mode?: "edit" | "preview";
  /**
   * In preview mode: when true, Edit/Add Note opens an inline dialog editor
   * instead of calling onEditRequested. Keeps the user on the current screen.
   */
  inlineEdit?: boolean;
  onEditRequested?: () => void;
  disabled?: boolean;
};

export function ClientNotesCard({ client, mode = "edit", inlineEdit, onEditRequested, disabled }: Props) {

  const update = useUpdateClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [value, setValue] = useState(client.notes ?? "");
  const [expanded, setExpanded] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(client.updated_at ? new Date(client.updated_at) : null);
  const [dirty, setDirty] = useState(false);
  const lastSaved = useRef(client.notes ?? "");
  const debounceRef = useRef<number | null>(null);

  // sync if external value changes (e.g. another tab)
  useEffect(() => {
    if ((client.notes ?? "") !== lastSaved.current && !dirty) {
      setValue(client.notes ?? "");
      lastSaved.current = client.notes ?? "";
      if (client.updated_at) setSavedAt(new Date(client.updated_at));
    }
  }, [client.notes, client.updated_at, dirty]);

  const persist = async (next: string) => {
    if (next === lastSaved.current) {
      setDirty(false);
      return;
    }
    try {
      await update.mutateAsync({ id: client.id, notes: next });
      lastSaved.current = next;
      setSavedAt(new Date());
      setDirty(false);
    } catch (e: any) {
      toast({ title: t("clientNotes.saveFailed"), description: e.message, variant: "destructive" });
    }
  };

  const handleChange = (next: string) => {
    setValue(next);
    setDirty(next !== lastSaved.current);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => persist(next), 1200);
  };

  const handleManualSave = async () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    await persist(value);
  };

  const isEmpty = !value.trim();
  const saving = update.isPending;
  const status = saving
    ? { icon: <Loader2 className="h-3 w-3 animate-spin" />, text: t("clientNotes.saving"), tone: "text-muted-foreground" }
    : dirty
      ? { icon: <Pencil className="h-3 w-3" />, text: t("clientNotes.unsaved"), tone: "text-warning" }
      : value.length > 0
        ? { icon: <CheckCircle2 className="h-3 w-3" />, text: t("clientNotes.saved"), tone: "text-success" }
        : null;

  if (mode === "preview") {
    const handleEditClick = () => {
      if (inlineEdit) {
        setDraft(value);
        setInlineOpen(true);
      } else {
        onEditRequested?.();
      }
    };
    const showEditAction = inlineEdit || onEditRequested;
    return (
      <>
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> {t("clientNotes.shortTitle")}
          </h3>
          {!isEmpty && showEditAction && (
            <Button variant="ghost" size="sm" onClick={handleEditClick}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> {inlineEdit ? t("clientNotes.save") : t("clientNotes.editInProfile")}
            </Button>
          )}
        </div>
        {isEmpty ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">{t("clientNotes.noneShort")}</p>
            {showEditAction && (
              <Button variant="outline" size="sm" onClick={handleEditClick}>{t("clientNotes.addNote")}</Button>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-muted/50 p-3 max-h-56 overflow-y-auto">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{value}</p>
            {savedAt && (
              <p className="text-[11px] text-muted-foreground mt-2">
                {t("clientNotes.updated")} {format(savedAt, "dd.MM.yyyy HH:mm")}
              </p>
            )}
          </div>
        )}
      </div>
      {inlineEdit && (
        <Dialog open={inlineOpen} onOpenChange={(o) => { if (!o) setInlineOpen(false); }}>
          <DialogContent className="max-w-2xl w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle>{t("clientNotes.shortTitle")} — {client.name}</DialogTitle>
            </DialogHeader>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("clientNotes.placeholder")}
              className="min-h-[260px] resize-none text-sm leading-relaxed"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setInlineOpen(false)}>
                <X className="h-4 w-4 mr-1" /> {t("clientNotes.close")}
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await update.mutateAsync({ id: client.id, notes: draft });
                    lastSaved.current = draft;
                    setValue(draft);
                    setSavedAt(new Date());
                    setInlineOpen(false);
                  } catch (e: any) {
                    toast({ title: t("clientNotes.saveFailed"), description: e.message, variant: "destructive" });
                  }
                }}
                disabled={saving}
              >
                {t("clientNotes.save")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </>
    );
  }


  const editor = (full: boolean) => (
    <Textarea
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleManualSave}
      placeholder={t("clientNotes.placeholder")}
      disabled={disabled}
      className={cn(
        "resize-none text-sm leading-relaxed",
        full ? "min-h-[60vh]" : "min-h-[180px]",
      )}
    />
  );

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> {t("clientNotes.title")}
          </h3>
          <div className="flex items-center gap-2">
            {status && (
              <span className={cn("inline-flex items-center gap-1 text-xs", status.tone)}>
                {status.icon}{status.text}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(true)}
              title={t("clientNotes.openLarge")}
            >
              <Maximize2 className="h-3.5 w-3.5 mr-1" /> {t("clientNotes.expand")}
            </Button>
          </div>
        </div>

        {isEmpty && !dirty ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground mb-2">{t("clientNotes.empty")}</p>
            {editor(false)}
          </div>
        ) : (
          editor(false)
        )}

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{value.length} {t("clientNotes.chars")}</span>
          {savedAt && !dirty && !saving && (
            <span>{t("clientNotes.updated")} {format(savedAt, "dd.MM.yyyy HH:mm")}</span>
          )}
        </div>
      </div>

      <Dialog open={expanded} onOpenChange={(o) => { if (!o) handleManualSave(); setExpanded(o); }}>
        <DialogContent className="max-w-3xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3 pr-6">
              <span>{t("clientNotes.title")} — {client.name}</span>
              {status && (
                <Badge variant="outline" className={cn("font-normal", status.tone)}>
                  <span className="inline-flex items-center gap-1">{status.icon}{status.text}</span>
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {editor(true)}
          <div className="flex items-center justify-between gap-2 pt-2">
            <p className="text-xs text-muted-foreground">
              {savedAt ? `${t("clientNotes.lastSave")}: ${format(savedAt, "dd.MM.yyyy HH:mm")}` : t("clientNotes.notSavedYet")}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setExpanded(false)}>
                <X className="h-4 w-4 mr-1" /> {t("clientNotes.close")}
              </Button>
              <Button onClick={async () => { await handleManualSave(); setExpanded(false); }} disabled={saving}>
                {t("clientNotes.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
