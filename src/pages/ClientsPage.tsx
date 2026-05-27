import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Phone, Mail, Send, Trash2, Download, Upload, Archive, ArchiveRestore, MoreVertical, X, ArrowLeft } from "lucide-react";
import { downloadCSV } from "@/lib/csvExport";
import { useState, memo, useRef, useMemo } from "react";
import ExcelJS from "exceljs";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useClients, useCreateClient, useDeleteClient, useUnarchiveClient, useAppointments } from "@/hooks/useData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { ArchiveClientDialog } from "@/components/ArchiveClientDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFreeStarterMode } from "@/hooks/useDemoWorkspace";
import { PaywallDialog } from "@/components/PaywallDialog";
import { ListSkeleton } from "@/components/ListSkeleton";


const getArchiveReasonLabel = (reason: string, t: any) => {
  const keyMap: Record<string, string> = {
    completed: "archive.reason.completed",
    client_paused: "archive.reason.clientPaused",
    client_stopped: "archive.reason.clientStopped",
    other: "archive.reason.other",
  };
  return t(keyMap[reason] ?? "archive.reason.other");
};

const getArchiveReasonVariant = (reason: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (reason) {
    case "completed": return "default";
    case "client_paused": return "outline";
    case "client_stopped": return "destructive";
    default: return "secondary";
  }
};

const ClientCard = memo(({ client, onNavigate, onDelete, onArchive, onUnarchive, t }: {
  client: any; onNavigate: (id: string) => void;
  onDelete?: (id: string) => void;
  onArchive?: (client: any) => void;
  onUnarchive?: (id: string) => void;
  t: any;
}) => {
  const isArchived = client.status === "archived";
  return (
  <div
    onClick={() => onNavigate(client.id)}
    className={`bg-card rounded-xl border border-border p-5 animate-fade-in group relative cursor-pointer hover:border-primary/30 hover:shadow-md transition-all ${isArchived ? "opacity-75" : ""}`}
  >
    {(onDelete || onArchive || onUnarchive) && (
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors">
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {!isArchived && onArchive && (
              <DropdownMenuItem onClick={() => onArchive(client)}>
                <Archive className="h-3.5 w-3.5 mr-2" /> {t("archive.action.archive")}
              </DropdownMenuItem>
            )}
            {isArchived && onUnarchive && (
              <DropdownMenuItem onClick={() => onUnarchive(client.id)}>
                <ArchiveRestore className="h-3.5 w-3.5 mr-2" /> {t("archive.action.unarchive")}
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem onClick={() => onDelete(client.id)} className="text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> {t("common.delete")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )}
    <div className="flex items-start gap-3 mb-3">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
        {client.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
          {isArchived && (
            <Badge variant={getArchiveReasonVariant(client.archive_reason)} className="text-[10px]">
              {getArchiveReasonLabel(client.archive_reason, t)}
            </Badge>
          )}
        </div>
      </div>
    </div>
    <div className="space-y-1.5 text-sm">
      {client.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" /><span className="truncate">{client.phone}</span></div>}
      {client.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /><span className="truncate">{client.email}</span></div>}
      
    </div>
    {client.notes && <p className="mt-3 text-xs text-muted-foreground bg-muted/50 rounded-md p-2 line-clamp-2">📝 {client.notes}</p>}
  </div>
  );
});
ClientCard.displayName = "ClientCard";

export default function ClientsPage() {
  const { data: clients = [], isLoading } = useClients();
  const { data: appointments = [] } = useAppointments();
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();
  const unarchiveClient = useUnarchiveClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { isFreeStarter, atClientLimit } = useFreeStarterMode();
  const isDemoMode = false; // Free Starter Mode allows all client edits — gating is now via paywall on creation only.
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "", telegram: "" });

  const debouncedSearch = useDebouncedValue(search, 200);
  const counts = {
    active: clients.filter((c: any) => (c.status ?? "active") === "active").length,
    archived: clients.filter((c: any) => c.status === "archived").length,
    all: clients.length,
  };

  // Build map of client_id -> concatenated service names from their appointment history
  const clientServices = (() => {
    const map = new Map<string, string>();
    for (const a of appointments as any[]) {
      const svc = a?.services?.name;
      if (!a?.client_id || !svc) continue;
      const prev = map.get(a.client_id);
      map.set(a.client_id, prev ? `${prev} ${svc}` : svc);
    }
    return map;
  })();

  const monthFilter = searchParams.get("filter") as "activeThisMonth" | "newThisMonth" | "completedThisMonth" | "droppedThisMonth" | "withoutNextSession" | null;

  const isThisMonth = (dateStr: string | null | undefined) => {
    if (!dateStr) return false;
    const now = new Date();
    const d = new Date(dateStr);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  const COMPLETED_ARCHIVE_REASONS = new Set(["completed", "therapy_completed", "training_completed", "service_completed"]);
  const DROPPED_ARCHIVE_REASONS = new Set(["client_paused", "client_stopped"]);

  // When arriving via month filters, force the Archived tab
  const effectiveStatusFilter =
    monthFilter === "completedThisMonth" || monthFilter === "droppedThisMonth"
      ? "archived"
      : monthFilter === "withoutNextSession"
      ? "active"
      : statusFilter;

  const activeClientIdsThisMonth = useMemo(() => {
    const ids = new Set<string>();
    for (const a of appointments as any[]) {
      if (a.status !== "cancelled" && isThisMonth(a.scheduled_at)) {
        ids.add(a.client_id);
      }
    }
    return ids;
  }, [appointments]);

  const newClientIds = useMemo(() => {
    const ids = new Set<string>();
    const firstSessionByClient = new Map<string, string>();
    for (const a of appointments as any[]) {
      if (!firstSessionByClient.has(a.client_id)) {
        firstSessionByClient.set(a.client_id, a.scheduled_at);
      }
    }
    for (const [cid, firstAt] of firstSessionByClient) {
      if (isThisMonth(firstAt)) ids.add(cid);
    }
    for (const c of clients) {
      if (!firstSessionByClient.has(c.id) && isThisMonth(c.created_at)) {
        ids.add(c.id);
      }
    }
    return ids;
  }, [appointments, clients]);

  const clientsWithFutureSession = useMemo(() => {
    const ids = new Set<string>();
    const now = new Date().toISOString();
    for (const a of appointments as any[]) {
      if (a.status !== "cancelled" && a.scheduled_at > now) {
        ids.add(a.client_id);
      }
    }
    return ids;
  }, [appointments]);

  const q = debouncedSearch.trim().toLowerCase();
  const filtered = clients
    .filter((c: any) => effectiveStatusFilter === "all" ? true : (c.status ?? "active") === effectiveStatusFilter)
    .filter((c: any) => {
      if (monthFilter === "activeThisMonth") return activeClientIdsThisMonth.has(c.id);
      if (monthFilter === "newThisMonth") return newClientIds.has(c.id);
      if (monthFilter === "completedThisMonth") {
        return (
          c.status === "archived" &&
          COMPLETED_ARCHIVE_REASONS.has(c.archive_reason ?? "") &&
          isThisMonth(c.archived_at)
        );
      }
      if (monthFilter === "droppedThisMonth") {
        return (
          c.status === "archived" &&
          DROPPED_ARCHIVE_REASONS.has(c.archive_reason ?? "") &&
          isThisMonth(c.archived_at)
        );
      }
      return true;
    })
    .filter((c: any) => {
      if (!q) return true;
      const hay = [
        c.name,
        c.phone,
        c.email,
        c.telegram,
        clientServices.get(c.id) || "",
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });

  const handleUnarchive = async (id: string) => {
    try {
      await unarchiveClient.mutateAsync(id);
      toast({ title: t("archive.toast.unarchived") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    try {
      await createClient.mutateAsync(form);
      setForm({ name: "", phone: "", email: "", notes: "", telegram: "" });
      setOpen(false);
      toast({ title: t("toast.clientAdded") });
    } catch (e: any) {
      if (e?.message === "FREE_STARTER_CLIENT_LIMIT_REACHED" || e?.message?.startsWith?.("PLAN_CLIENT_LIMIT_REACHED")) {
        setOpen(false);
        setPaywallOpen(true);
        return;
      }
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

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data);
      const sheet = workbook.worksheets[0];
      if (!sheet) {
        toast({ title: t("common.error"), description: "No data found in file", variant: "destructive" });
        return;
      }

      // Build rows as objects keyed by header row
      const headerRow = sheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell, col) => {
        headers[col] = String(cell.value ?? "").trim();
      });

      const rows: Record<string, any>[] = [];
      for (let r = 2; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const obj: Record<string, any> = {};
        let hasValue = false;
        row.eachCell((cell, col) => {
          const key = headers[col];
          if (!key) return;
          const v = cell.value;
          obj[key] = v == null ? "" : (typeof v === "object" && "text" in (v as any) ? (v as any).text : v);
          if (obj[key] !== "") hasValue = true;
        });
        if (hasValue) rows.push(obj);
      }

      if (rows.length === 0) {
        toast({ title: t("common.error"), description: "No data found in file", variant: "destructive" });
        return;
      }

      const normalize = (row: any, keys: string[]) => {
        for (const k of keys) {
          const found = Object.keys(row).find(rk => rk.toLowerCase().trim() === k.toLowerCase());
          if (found) return String(row[found]).trim();
        }
        return "";
      };

      let imported = 0;
      for (const row of rows) {
        const name = normalize(row, ["name", "имя", "фио", "клиент", "client"]);
        if (!name) continue;
        const phone = normalize(row, ["phone", "телефон", "тел"]);
        const email = normalize(row, ["email", "e-mail", "почта", "емейл"]);
        const telegram = normalize(row, ["telegram", "телеграм", "tg"]);
        const notes = normalize(row, ["notes", "заметки", "примечание", "комментарий"]);
        await createClient.mutateAsync({ name, phone, email, telegram, notes });
        imported++;
      }

      toast({ title: t("toast.clientAdded"), description: `${imported} clients imported` });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  return (
    <AppLayout>
      <div className="space-y-6">
        {monthFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="self-start -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("common.backToDashboard")}
          </Button>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("clients.title")}</h1>
            <p className="text-muted-foreground mt-1">{t(`clients.count.${statusFilter}` as any, { count: counts[statusFilter] })}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              downloadCSV("clients.csv",
                [t("csv.header.name"), t("csv.header.phone"), t("csv.header.email"), t("csv.header.notes")],
                clients.map(c => [c.name, c.phone || "", c.email || "", c.notes || ""])
              );
            }}><Download className="h-4 w-4 mr-1" /> {t("export.csv")}</Button>
            {!isDemoMode && <>
              <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                <Upload className="h-4 w-4 mr-1" /> {importing ? "..." : "Import"}
              </Button>
            </>}
            <Dialog open={open} onOpenChange={setOpen}>
              <Button
                onClick={() => {
                  if (atClientLimit) {
                    setPaywallOpen(true);
                  } else {
                    setOpen(true);
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> {t("clients.addClient")}
              </Button>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("clients.addClient")}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>{t("common.name")} *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("common.phone")}</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{t("common.email")}</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                
                <div className="space-y-2"><Label>{t("common.notes")}</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                <Button onClick={handleCreate} className="w-full" disabled={createClient.isPending}>
                  {createClient.isPending ? t("common.adding") : t("clients.addClient")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="active">{t("archive.tab.active")} ({counts.active})</TabsTrigger>
              <TabsTrigger value="archived">{t("archive.tab.archived")} ({counts.archived})</TabsTrigger>
              <TabsTrigger value="all">{t("archive.tab.all")} ({counts.all})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("clients.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>

        {monthFilter && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {monthFilter === "activeThisMonth"
                ? t("ops.activeClientsThisMonth")
                : monthFilter === "newThisMonth"
                ? t("ops.newClientsThisMonth")
                : monthFilter === "completedThisMonth"
                ? t("ops.completedTherapyThisMonth")
                : t("ops.droppedTherapyThisMonth")}
            </Badge>
            <button
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete("filter");
                setSearchParams(next);
              }}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              <X className="h-3 w-3" /> {t("common.clear")}
            </button>
          </div>
        )}

        {isLoading ? (
          <ListSkeleton variant="cards" count={6} />

        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t("clients.noClients")}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onNavigate={(id) => navigate(`/clients/${id}`)}
                onDelete={isDemoMode ? undefined : (id) => setDeleteId(id)}
                onArchive={isDemoMode ? undefined : (c) => setArchiveTarget({ id: c.id, name: c.name })}
                onUnarchive={isDemoMode ? undefined : handleUnarchive}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDeleteDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={handleDelete}
        title={t("clients.deleteTitle")} description={t("clients.deleteDesc")}
        loading={deleteClient.isPending} />
      {archiveTarget && (
        <ArchiveClientDialog
          open={!!archiveTarget}
          onOpenChange={(o) => !o && setArchiveTarget(null)}
          clientId={archiveTarget.id}
          clientName={archiveTarget.name}
        />
      )}
      <PaywallDialog open={paywallOpen} onOpenChange={setPaywallOpen} reason="client_limit" />
    </AppLayout>
  );
}
