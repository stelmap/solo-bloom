import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import {
  useClient, useUpdateClient, useDeleteClient,
  useClientAppointments, useClientNotes, useCreateClientNote, useDeleteClientNote,
  useClientAttachments, useUploadAttachment, useDeleteAttachment,
} from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Phone, Mail, Send, Calendar, CheckCircle, XCircle, Ban, Clock,
  DollarSign, Pencil, Trash2, Plus, Paperclip, FileText, Image, Download, X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useRef } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const SESSION_STATUS_STYLES: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Scheduled", color: "bg-muted text-muted-foreground" },
  confirmed: { label: "Confirmed", color: "bg-primary/15 text-primary" },
  completed: { label: "Completed", color: "bg-success/15 text-success" },
  cancelled: { label: "Cancelled", color: "bg-destructive/15 text-destructive" },
  "no-show": { label: "No-show", color: "bg-warning/15 text-warning" },
  rescheduled: { label: "Rescheduled", color: "bg-accent text-accent-foreground" },
};

const PAYMENT_STATUS_STYLES: Record<string, { label: string; color: string }> = {
  unpaid: { label: "Unpaid", color: "bg-destructive/10 text-destructive" },
  waiting_for_payment: { label: "Waiting", color: "bg-warning/10 text-warning" },
  paid_now: { label: "Paid", color: "bg-success/10 text-success" },
  paid_in_advance: { label: "Paid (advance)", color: "bg-success/10 text-success" },
  not_applicable: { label: "N/A", color: "bg-muted text-muted-foreground" },
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: client, isLoading } = useClient(id);
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const { data: appointments = [] } = useClientAppointments(id);
  const { data: notes = [] } = useClientNotes(id);
  const createNote = useCreateClientNote();
  const deleteNote = useDeleteClientNote();
  const { data: attachments = [] } = useClientAttachments(id);
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", notes: "", telegram: "" });

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center h-64 text-muted-foreground">Loading client...</div></AppLayout>;
  }
  if (!client) {
    return <AppLayout><div className="text-center py-16 text-muted-foreground">Client not found</div></AppLayout>;
  }

  const totalSessions = appointments.length;
  const paidSessions = appointments.filter((a: any) => a.payment_status === "paid_now" || a.payment_status === "paid_in_advance").length;
  const cancelledSessions = appointments.filter((a: any) => a.status === "cancelled" || a.status === "no-show").length;
  const pendingPayments = appointments.filter((a: any) => a.payment_status === "waiting_for_payment").length;

  const openEdit = () => {
    setEditForm({
      name: client.name, phone: client.phone || "", email: client.email || "",
      notes: client.notes || "", telegram: (client as any).telegram || "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) return;
    try {
      await updateClient.mutateAsync({ id: client.id, ...editForm });
      setEditOpen(false);
      toast({ title: "Client updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteClient.mutateAsync(client.id);
      toast({ title: "Client deleted" });
      navigate("/clients");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      await createNote.mutateAsync({ client_id: client.id, content: noteText.trim() });
      setNoteText("");
      toast({ title: "Note added" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAttachment.mutateAsync({ file, clientId: client.id });
      toast({ title: "File uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getFileUrl = (path: string) => {
    const { data } = supabase.storage.from("client-attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const statusBadge = (status: string) => {
    const s = SESSION_STATUS_STYLES[status] || SESSION_STATUS_STYLES.scheduled;
    return <Badge className={cn("text-xs", s.color)}>{s.label}</Badge>;
  };

  const paymentBadge = (status: string) => {
    const s = PAYMENT_STATUS_STYLES[status] || PAYMENT_STATUS_STYLES.unpaid;
    return <Badge variant="outline" className={cn("text-xs", s.color)}>{s.label}</Badge>;
  };

  const initials = client.name.split(" ").map(n => n[0]).join("").toUpperCase();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
            <p className="text-sm text-muted-foreground">Client Profile</p>
          </div>
          <Button variant="outline" size="sm" onClick={openEdit}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{totalSessions}</p>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold text-success">{paidSessions}</p>
            <p className="text-xs text-muted-foreground">Paid</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{cancelledSessions}</p>
            <p className="text-xs text-muted-foreground">Cancelled</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold text-warning">{pendingPayments}</p>
            <p className="text-xs text-muted-foreground">Pending Payments</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — Client info + Contact + Notes + Attachments */}
          <div className="space-y-6">
            {/* Client Info */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">{initials}</div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{client.name}</h3>
                  <p className="text-xs text-muted-foreground">Client since {format(new Date(client.created_at), "MMM yyyy")}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {client.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4 text-primary" />{client.phone}</div>}
                {client.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4 text-primary" />{client.email}</div>}
                {(client as any).telegram && <div className="flex items-center gap-2 text-muted-foreground"><Send className="h-4 w-4 text-primary" />@{(client as any).telegram}</div>}
              </div>
              {client.notes && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">📝 {client.notes}</p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Notes</h3>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a note..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  className="min-h-[60px] text-sm"
                />
                <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim() || createNote.isPending}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(notes as any[]).length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No notes yet</p>}
                {(notes as any[]).map((note: any) => (
                  <div key={note.id} className="bg-muted/50 rounded-lg p-3 group relative">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(note.created_at), "MMM d, yyyy · HH:mm")}</p>
                    <button
                      onClick={() => deleteNote.mutate({ id: note.id, clientId: client.id })}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Attachments */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><Paperclip className="h-4 w-4 text-primary" /> Attachments</h3>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              <Button variant="outline" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={uploadAttachment.isPending}>
                <Plus className="h-4 w-4 mr-1" /> {uploadAttachment.isPending ? "Uploading..." : "Upload File"}
              </Button>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(attachments as any[]).length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No attachments</p>}
                {(attachments as any[]).map((att: any) => (
                  <div key={att.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 group">
                    {att.file_type === "image" ? <Image className="h-4 w-4 text-primary shrink-0" /> : <FileText className="h-4 w-4 text-primary shrink-0" />}
                    <span className="text-sm text-foreground truncate flex-1">{att.file_name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={getFileUrl(att.file_path)} target="_blank" rel="noopener" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => deleteAttachment.mutate({ id: att.id, filePath: att.file_path, clientId: client.id })}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — Session History */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Session History
                <span className="text-xs text-muted-foreground ml-auto">{totalSessions} sessions</span>
              </h3>
              {appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No sessions yet</p>
              ) : (
                <div className="space-y-2">
                  {(appointments as any[]).map((apt: any) => (
                    <div key={apt.id} className={cn(
                      "flex items-center gap-4 p-4 rounded-lg border transition-colors",
                      apt.status === "cancelled" || apt.status === "no-show" ? "bg-muted/30 border-border opacity-60" : "bg-muted/50 border-border"
                    )}>
                      <div className="text-center min-w-[70px]">
                        <p className="text-sm font-semibold text-foreground">{format(new Date(apt.scheduled_at), "MMM d")}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(apt.scheduled_at), "HH:mm")}</p>
                      </div>
                      <div className="h-10 w-px bg-border" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{apt.services?.name}</p>
                        <p className="text-xs text-muted-foreground">{apt.duration_minutes} min</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-semibold text-foreground">€{Number(apt.price).toFixed(0)}</span>
                        <div className="flex gap-1">
                          {statusBadge(apt.status)}
                          {paymentBadge(apt.payment_status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Telegram</Label><Input placeholder="username" value={editForm.telegram} onChange={e => setEditForm(f => ({ ...f, telegram: e.target.value }))} /></div>
            <div className="space-y-2"><Label>General Notes</Label><Textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button onClick={handleSaveEdit} className="w-full" disabled={updateClient.isPending}>
              {updateClient.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete}
        title="Delete this client?" description="This will permanently delete this client, their session history, notes, and attachments."
        loading={deleteClient.isPending} />
    </AppLayout>
  );
}
