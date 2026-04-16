import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Phone, Mail, Send, Trash2, Download, Upload } from "lucide-react";
import { downloadCSV } from "@/lib/csvExport";
import { useState, memo, useRef } from "react";
import * as XLSX from "xlsx";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useNavigate } from "react-router-dom";
import { useClients, useCreateClient, useDeleteClient } from "@/hooks/useData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

const ClientCard = memo(({ client, onNavigate, onDelete, t }: {
  client: any; onNavigate: (id: string) => void; onDelete: (id: string) => void; t: any;
}) => (
  <div
    onClick={() => onNavigate(client.id)}
    className="bg-card rounded-xl border border-border p-5 animate-fade-in group relative cursor-pointer hover:border-primary/30 hover:shadow-md transition-all"
  >
    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
      <button onClick={(e) => { e.stopPropagation(); onDelete(client.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
    <div className="flex items-start gap-3 mb-3">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
        {client.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
      </div>
      <div className="min-w-0">
        <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
      </div>
    </div>
    <div className="space-y-1.5 text-sm">
      {client.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" /><span className="truncate">{client.phone}</span></div>}
      {client.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /><span className="truncate">{client.email}</span></div>}
      {client.telegram && <div className="flex items-center gap-2 text-muted-foreground"><Send className="h-3.5 w-3.5" /><span className="truncate">@{client.telegram}</span></div>}
    </div>
    {client.notes && <p className="mt-3 text-xs text-muted-foreground bg-muted/50 rounded-md p-2 line-clamp-2">📝 {client.notes}</p>}
  </div>
));
ClientCard.displayName = "ClientCard";

export default function ClientsPage() {
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "", telegram: "" });

  const debouncedSearch = useDebouncedValue(search, 200);
  const filtered = clients.filter((c) => c.name.toLowerCase().includes(debouncedSearch.toLowerCase()));

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    try {
      await createClient.mutateAsync(form);
      setForm({ name: "", phone: "", email: "", notes: "", telegram: "" });
      setOpen(false);
      toast({ title: t("toast.clientAdded") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteClient.mutateAsync(deleteId);
      toast({ title: t("toast.clientDeleted") });
      setDeleteId(null);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("clients.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("clients.totalClients", { count: clients.length })}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              downloadCSV("clients.csv",
                ["Name", "Phone", "Email", "Telegram", "Notes"],
                clients.map(c => [c.name, c.phone || "", c.email || "", c.telegram || "", c.notes || ""])
              );
            }}><Download className="h-4 w-4 mr-1" /> {t("export.csv")}</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> {t("clients.addClient")}</Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("clients.addClient")}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>{t("common.name")} *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("common.phone")}</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("common.email")}</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("common.telegram")}</Label><Input placeholder="username" value={form.telegram} onChange={e => setForm(f => ({ ...f, telegram: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("common.notes")}</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                <Button onClick={handleCreate} className="w-full" disabled={createClient.isPending}>
                  {createClient.isPending ? t("common.adding") : t("clients.addClient")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("clients.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">{t("common.loading")}</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t("clients.noClients")}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onNavigate={(id) => navigate(`/clients/${id}`)}
                onDelete={(id) => setDeleteId(id)}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDeleteDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={handleDelete}
        title={t("clients.deleteTitle")} description={t("clients.deleteDesc")}
        loading={deleteClient.isPending} />
    </AppLayout>
  );
}
