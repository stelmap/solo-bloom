import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useClients } from "@/hooks/useData";
import {
  useSupervisions, useCreateSupervision, useUpdateSupervision,
  useDeleteSupervision, useUnusedClientNotes,
} from "@/hooks/useSupervisions";
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye, Trash2, Calendar, DollarSign, FileText, ClipboardList, MessageSquare, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function SupervisionPage() {
  const { t } = useLanguage();
  const { symbol: cs, fmt } = useCurrency();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: clients = [] } = useClients();
  const [filterClientId, setFilterClientId] = useState<string>("all");
  const { data: supervisions = [], isLoading } = useSupervisions(filterClientId === "all" ? undefined : filterClientId);
  const createSupervision = useCreateSupervision();
  const updateSupervision = useUpdateSupervision();
  const deleteSupervision = useDeleteSupervision();

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ client_id: "", supervision_date: new Date().toISOString().split("T")[0], paid_amount: "" });
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const { data: unusedNotes = [] } = useUnusedClientNotes(selectedClientId);

  // Detail view
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [editFields, setEditFields] = useState({ supervision_outcome: "", supervisor_feedback: "", next_steps: "" });
  const [dirty, setDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState(false);

  useEffect(() => {
    if (createForm.client_id) setSelectedClientId(createForm.client_id);
  }, [createForm.client_id]);

  const openDetail = (sup: any) => {
    setDetailId(sup.id);
    setDetailData(sup);
    setEditFields({
      supervision_outcome: sup.supervision_outcome || "",
      supervisor_feedback: sup.supervisor_feedback || "",
      next_steps: sup.next_steps || "",
    });
    setDirty(false);
    setExpandedNotes(false);
  };

  const handleCreate = async () => {
    if (!createForm.client_id || !createForm.paid_amount) return;
    try {
      const snapshot = unusedNotes.map((n: any) => ({
        id: n.id,
        content: n.content,
        created_at: n.created_at,
        appointment_id: n.appointment_id,
        source: n.source,
        service_name: n.service_name,
      }));
      // Only mark actual client_notes (not appointment-sourced notes)
      const clientNoteIds = unusedNotes
        .filter((n: any) => n.source === "client_note")
        .map((n: any) => n.id);
      await createSupervision.mutateAsync({
        client_id: createForm.client_id,
        supervision_date: createForm.supervision_date,
        paid_amount: Number(createForm.paid_amount),
        imported_notes_snapshot: snapshot,
        note_ids: clientNoteIds,
      });
      toast({ title: t("supervision.created") });
      setCreateOpen(false);
      setCreateForm({ client_id: "", supervision_date: new Date().toISOString().split("T")[0], paid_amount: "" });
      setSelectedClientId(undefined);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleSaveDetail = async () => {
    if (!detailId) return;
    try {
      await updateSupervision.mutateAsync({ id: detailId, ...editFields });
      toast({ title: t("supervision.updated") });
      setDirty(false);
      // Update local data
      setDetailData((prev: any) => prev ? { ...prev, ...editFields } : prev);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!detailData) return;
    try {
      await deleteSupervision.mutateAsync({ id: detailData.id, expenseId: detailData.expense_id });
      toast({ title: t("supervision.deleted") });
      setDetailId(null);
      setDetailData(null);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const importedNotes = detailData?.imported_notes_snapshot || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("supervision.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("supervision.history")}</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> {t("supervision.new")}
          </Button>
        </div>

        {/* Filter */}
        <div className="flex gap-3 items-center">
          <Select value={filterClientId} onValueChange={setFilterClientId}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("supervision.allClients")}</SelectItem>
              {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className={cn("space-y-3", detailData ? "lg:col-span-1" : "lg:col-span-3")}>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">{t("dashboard.loading")}</p>
            ) : supervisions.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{t("supervision.noSupervisions")}</p>
              </div>
            ) : (
              supervisions.map((sup: any) => (
                <div
                  key={sup.id}
                  onClick={() => openDetail(sup)}
                  className={cn(
                    "bg-card rounded-xl border p-4 cursor-pointer hover:ring-2 hover:ring-ring/20 transition-all",
                    detailId === sup.id ? "border-primary ring-1 ring-primary/20" : "border-border"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <ClipboardList className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{sup.clients?.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(sup.supervision_date + "T00:00:00"), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{fmt(Number(sup.paid_amount))}</p>
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        {(sup.imported_notes_snapshot || []).length} notes
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detail panel */}
          {detailData && (
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{detailData.clients?.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(detailData.supervision_date + "T00:00:00"), "MMMM d, yyyy")} · {fmt(Number(detailData.paid_amount))}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/clients/${detailData.client_id}`)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Client
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Imported Notes (read-only) */}
                <div className="space-y-2">
                  <button
                    onClick={() => setExpandedNotes(!expandedNotes)}
                    className="flex items-center gap-2 w-full text-left"
                  >
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground text-sm">{t("supervision.importedNotes")}</span>
                    <Badge variant="secondary" className="text-xs ml-1">{importedNotes.length}</Badge>
                    {expandedNotes ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />}
                  </button>
                  <p className="text-xs text-muted-foreground">{t("supervision.importedNotesDesc")}</p>
                  {expandedNotes && (
                    <div className="space-y-2 max-h-80 overflow-y-auto border border-border rounded-lg p-3 bg-muted/30">
                      {importedNotes.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">{t("supervision.noNotesToImport")}</p>
                      ) : (
                        importedNotes.map((note: any, i: number) => (
                          <div key={note.id || i} className="bg-background rounded-lg p-3 border border-border">
                            <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {note.service_name && <span className="font-medium">{note.service_name} · </span>}
                              {t("supervision.notesFromSession")} {format(new Date(note.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Editable fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" /> {t("supervision.outcome")}
                    </Label>
                    <Textarea
                      placeholder={t("supervision.outcomePlaceholder")}
                      value={editFields.supervision_outcome}
                      onChange={e => { setEditFields(f => ({ ...f, supervision_outcome: e.target.value })); setDirty(true); }}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" /> {t("supervision.feedback")}
                    </Label>
                    <Textarea
                      placeholder={t("supervision.feedbackPlaceholder")}
                      value={editFields.supervisor_feedback}
                      onChange={e => { setEditFields(f => ({ ...f, supervisor_feedback: e.target.value })); setDirty(true); }}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5" /> {t("supervision.nextSteps")}
                    </Label>
                    <Textarea
                      placeholder={t("supervision.nextStepsPlaceholder")}
                      value={editFields.next_steps}
                      onChange={e => { setEditFields(f => ({ ...f, next_steps: e.target.value })); setDirty(true); }}
                      className="min-h-[80px]"
                    />
                  </div>
                  {dirty && (
                    <Button onClick={handleSaveDetail} disabled={updateSupervision.isPending} className="w-full">
                      {t("common.save")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t("supervision.new")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("supervision.selectClient")} *</Label>
              <Select value={createForm.client_id} onValueChange={v => setCreateForm(f => ({ ...f, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder={t("supervision.selectClient")} /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("supervision.date")} *</Label>
              <Input type="date" value={createForm.supervision_date} onChange={e => setCreateForm(f => ({ ...f, supervision_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t("supervision.paidAmount")} *</Label>
              <Input type="number" min="0" step="1" placeholder="0" value={createForm.paid_amount} onChange={e => setCreateForm(f => ({ ...f, paid_amount: e.target.value }))} />
            </div>

            {/* Preview of notes to import */}
            {createForm.client_id && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> {t("supervision.importedNotes")}
                  <Badge variant="secondary" className="text-xs ml-1">{unusedNotes.length}</Badge>
                </Label>
                <p className="text-xs text-muted-foreground">{t("supervision.importedNotesDesc")}</p>
                <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 bg-muted/30 space-y-1.5">
                  {unusedNotes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">{t("supervision.noNotesToImport")}</p>
                  ) : (
                    unusedNotes.map((n: any) => (
                      <div key={n.id} className="bg-background rounded p-2 border border-border text-sm">
                        <p className="text-foreground whitespace-pre-wrap">{n.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(n.created_at), "MMM d, yyyy")}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <Button onClick={handleCreate} className="w-full" disabled={!createForm.client_id || !createForm.paid_amount || createSupervision.isPending}>
              {createSupervision.isPending ? t("common.saving") : t("supervision.create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title={t("supervision.deleteConfirm")}
        description={t("supervision.deleteDesc")}
        loading={deleteSupervision.isPending}
      />
    </AppLayout>
  );
}
