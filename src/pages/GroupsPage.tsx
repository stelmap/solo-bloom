import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Calendar, Pencil } from "lucide-react";
import { useState, useMemo, memo } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useNavigate } from "react-router-dom";
import { useGroups, useCreateGroup } from "@/hooks/useGroups";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

const GroupCard = memo(({ group, onNavigate, inactive }: { group: any; onNavigate: (id: string) => void; inactive?: boolean }) => (
  <div
    onClick={() => onNavigate(group.id)}
    className={`bg-card rounded-xl border p-5 animate-fade-in cursor-pointer transition-all ${
      inactive
        ? "border-border/50 opacity-50 grayscale hover:opacity-70"
        : "border-border hover:border-primary/30 hover:shadow-md"
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
        inactive ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
      }`}>
        <Users className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-foreground break-words">{group.name}</h3>
        {group.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{group.description}</p>
        )}
      </div>
    </div>
  </div>
));
GroupCard.displayName = "GroupCard";

export default function GroupsPage() {
  const { data: groups = [], isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 200);

  const filtered = useMemo(() => {
    let result = groups;
    if (statusFilter !== "all") {
      result = result.filter(g => g.status === statusFilter);
    }
    if (debouncedSearch) {
      result = result.filter(g => g.name.toLowerCase().includes(debouncedSearch.toLowerCase()));
    }
    return result;
  }, [groups, debouncedSearch, statusFilter]);

  const activeGroups = useMemo(() => filtered.filter(g => g.status === "active"), [filtered]);
  const inactiveGroups = useMemo(() => filtered.filter(g => g.status !== "active"), [filtered]);

  const handleCreate = async () => {
    if (!form.name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created = await createGroup.mutateAsync({ name: form.name.trim(), description: form.description.trim() });
      toast({ title: t("groups.created") });
      setForm({ name: "", description: "" });
      setOpen(false);
      navigate(`/groups/${(created as any).id}`);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("groups.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("groups.subtitle")}</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> {t("groups.createGroup")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("groups.createGroup")}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("groups.groupName")} *</Label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={t("groups.groupNamePlaceholder")}
                    maxLength={100}
                  />
                  {form.name.length > 0 && form.name.trim().length === 0 && (
                    <p className="text-xs text-destructive">{t("groups.nameRequired")}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t("common.description")}</Label>
                  <Textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder={t("groups.descriptionPlaceholder")}
                    rows={3}
                    maxLength={500}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={!form.name.trim() || submitting}>
                  {submitting ? t("common.saving") : t("groups.createGroup")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("groups.searchPlaceholder")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter.all")}</SelectItem>
              <SelectItem value="active">{t("groups.active")}</SelectItem>
              <SelectItem value="inactive">{t("groups.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">{t("common.loading")}</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{groups.length === 0 ? t("groups.noGroups") : t("groups.noResults")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(group => (
              <GroupCard key={group.id} group={group} onNavigate={id => navigate(`/groups/${id}`)} t={t} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
