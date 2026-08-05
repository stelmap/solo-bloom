import { AppLayout } from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, FileText, Archive, CheckCircle2, Pencil, Sparkles, Check, X, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  STARTER_TEMPLATE_NAME,
  STARTER_TEMPLATE_DESCRIPTION,
  STARTER_TEMPLATE_CONTENT,
  STARTER_TEMPLATE_CONTROLS,
} from "@/lib/agreementStarterTemplate";
import { useLanguage } from "@/i18n/LanguageContext";

type Template = {
  id: string;
  name: string;
  description: string | null;
  language: string;
  is_system_starter: boolean;
  created_at: string;
};

type Version = {
  id: string;
  template_id: string;
  version_number: number;
  status: "draft" | "active" | "archived";
  activated_at: string | null;
  created_at: string;
};

export default function AgreementTemplatesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [versions, setVersions] = useState<Record<string, Version[]>>({});
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { t } = useLanguage();

  async function deleteTemplate(tpl: Template) {
    setDeleting(true);
    try {
      const versionIds = (versions[tpl.id] || []).map((v) => v.id);
      if (versionIds.length) {
        const { count, error: cntErr } = await supabase
          .from("agreement_instances")
          .select("id", { count: "exact", head: true })
          .in("template_version_id", versionIds);
        if (cntErr) throw cntErr;
        if ((count ?? 0) > 0) {
          toast({
            title: t("agreements.templates.deleteBlocked"),
            description: t("agreements.templates.deleteBlockedDesc"),
            variant: "destructive",
          });
          setDeleteTarget(null);
          return;
        }
        await supabase.from("agreement_template_versions").delete().in("id", versionIds);
      }
      const { error } = await supabase.from("agreement_templates").delete().eq("id", tpl.id);
      if (error) throw error;
      setTemplates((prev) => prev.filter((x) => x.id !== tpl.id));
      setVersions((prev) => {
        const next = { ...prev };
        delete next[tpl.id];
        return next;
      });
      setDeleteTarget(null);
      toast({ title: t("agreements.templates.deleted") });
    } catch (e: any) {
      toast({ title: t("agreements.templates.deleteFail"), description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  async function renameTemplate(tpl: Template) {
    const name = renameValue.trim();
    if (!name || name === tpl.name) {
      setRenamingId(null);
      return;
    }
    const { error } = await supabase
      .from("agreement_templates")
      .update({ name })
      .eq("id", tpl.id);
    if (error) {
      toast({ title: t("agreements.templates.renameFail"), description: error.message, variant: "destructive" });
      return;
    }
    setRenamingId(null);
    setTemplates((prev) => prev.map((x) => (x.id === tpl.id ? { ...x, name } : x)));
  }

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data: tpls, error } = await supabase
      .from("agreement_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: t("agreements.templates.loadFail"), description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setTemplates((tpls ?? []) as Template[]);
    if (tpls && tpls.length) {
      const { data: vs } = await supabase
        .from("agreement_template_versions")
        .select("*")
        .in("template_id", tpls.map((t) => t.id))
        .order("version_number", { ascending: false });
      const grouped: Record<string, Version[]> = {};
      (vs ?? []).forEach((v: any) => {
        grouped[v.template_id] = grouped[v.template_id] || [];
        grouped[v.template_id].push(v as Version);
      });
      setVersions(grouped);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [user?.id]);

  async function createTemplate() {
    if (!user || !newName.trim()) return;
    setCreating(true);
    const { data: tpl, error } = await supabase
      .from("agreement_templates")
      .insert({ user_id: user.id, name: newName.trim(), language: "uk" })
      .select()
      .single();
    if (error || !tpl) {
      toast({ title: t("agreements.templates.createFail"), description: error?.message, variant: "destructive" });
      setCreating(false);
      return;
    }
    const { data: version } = await supabase
      .from("agreement_template_versions")
      .insert({
        template_id: tpl.id,
        user_id: user.id,
        version_number: 1,
        status: "draft",
        content: { title: newName.trim(), sections: [] },
        controls: [],
      })
      .select()
      .single();
    setNewName("");
    setCreating(false);
    await load();
    if (version) navigate(`/settings/agreements/version/${version.id}`);
  }

  async function newDraftFrom(v: Version) {
    if (!user) return;
    const nextNum = Math.max(...(versions[v.template_id] || []).map((x) => x.version_number)) + 1;
    const { data: source } = await supabase
      .from("agreement_template_versions")
      .select("content, controls")
      .eq("id", v.id)
      .single();
    const { data: created } = await supabase
      .from("agreement_template_versions")
      .insert({
        template_id: v.template_id,
        user_id: user.id,
        version_number: nextNum,
        status: "draft",
        content: source?.content ?? {},
        controls: source?.controls ?? [],
      })
      .select()
      .single();
    if (created) navigate(`/settings/agreements/version/${created.id}`);
  }

  async function activate(v: Version) {
    if (!user) return;
    // Archive other active versions first, then activate this one.
    await supabase
      .from("agreement_template_versions")
      .update({ status: "archived" })
      .eq("template_id", v.template_id)
      .eq("status", "active");
    const { error } = await supabase
      .from("agreement_template_versions")
      .update({ status: "active", activated_at: new Date().toISOString() })
      .eq("id", v.id);
    if (error) toast({ title: t("agreements.templates.activateFail"), description: error.message, variant: "destructive" });
    else toast({ title: t("agreements.templates.activatedToast", { n: v.version_number }) });
    await load();
  }

  async function archive(v: Version) {
    await supabase.from("agreement_template_versions").update({ status: "archived" }).eq("id", v.id);
    await load();
  }

  async function loadStarter() {
    if (!user) return;
    setSeeding(true);
    try {
      // Prevent duplicates: reuse existing system starter template if present.
      const { data: existing } = await supabase
        .from("agreement_templates")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_system_starter", true)
        .limit(1)
        .maybeSingle();
      if (existing) {
        const { data: existingVersion } = await supabase
          .from("agreement_template_versions")
          .select("id")
          .eq("template_id", existing.id)
          .order("version_number", { ascending: false })
          .limit(1)
          .maybeSingle();
        toast({ title: t("agreements.starter.done"), description: t("agreements.templates.starterExists") });
        if (existingVersion) navigate(`/settings/agreements/version/${existingVersion.id}`);
        return;
      }
      const { data: tpl, error } = await supabase
        .from("agreement_templates")
        .insert({
          user_id: user.id,
          name: STARTER_TEMPLATE_NAME,
          description: STARTER_TEMPLATE_DESCRIPTION,
          language: "uk",
          is_system_starter: true,
        })
        .select()
        .single();
      if (error || !tpl) throw error ?? new Error("insert failed");
      const { data: version } = await supabase
        .from("agreement_template_versions")
        .insert({
          template_id: tpl.id,
          user_id: user.id,
          version_number: 1,
          status: "draft",
          content: STARTER_TEMPLATE_CONTENT as any,
          controls: STARTER_TEMPLATE_CONTROLS as any,
        })
        .select()
        .single();
      toast({ title: t("agreements.starter.done") });
      await load();
      if (version) navigate(`/settings/agreements/version/${version.id}`);
    } catch (e: any) {
      toast({ title: t("agreements.starter.fail"), description: e?.message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  }


  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("agreements.templates.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("agreements.templates.subtitle")}
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("agreements.templates.newTemplate")}</CardTitle></CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <Input
              placeholder={t("agreements.templates.namePlaceholder")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTemplate()}
              className="flex-1 min-w-[240px]"
            />
            <Button onClick={createTemplate} disabled={creating || !newName.trim()}>
              <Plus className="w-4 h-4 mr-1" /> {t("agreements.templates.create")}
            </Button>
            <Button variant="outline" onClick={loadStarter} disabled={seeding}>
              <Sparkles className="w-4 h-4 mr-1" />
              {seeding ? t("agreements.starter.loading") : t("agreements.starter.button")}
            </Button>
          </CardContent>
        </Card>


        {loading && <div className="text-sm text-muted-foreground">{t("agreements.templates.loading")}</div>}
        {!loading && templates.length === 0 && (
          <div className="text-sm text-muted-foreground">
            {t("agreements.templates.empty")}
          </div>
        )}

        <div className="space-y-4">
          {templates.map((tpl) => {
            const vs = versions[tpl.id] || [];
            return (
              <Card key={tpl.id}>
                <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
                  <div className="min-w-0 flex-1">
                    {renamingId === tpl.id ? (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 shrink-0" />
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameTemplate(tpl);
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          className="h-8"
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => renameTemplate(tpl)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setRenamingId(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4" /> {tpl.name}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setRenameValue(tpl.name);
                            setRenamingId(tpl.id);
                          }}
                          aria-label={t("agreements.templates.rename")}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(tpl)}
                          aria-label={t("agreements.templates.delete")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </CardTitle>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("agreements.templates.language")}: {tpl.language.toUpperCase()} · {t("agreements.templates.created", { date: new Date(tpl.created_at).toLocaleDateString() })}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {vs.length === 0 && <div className="text-sm text-muted-foreground">{t("agreements.templates.noVersions")}</div>}
                  {vs.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between gap-2 rounded border border-border p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-medium">v{v.version_number}</span>
                        <Badge
                          variant={
                            v.status === "active"
                              ? "default"
                              : v.status === "draft"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {t(`agreements.status.${v.status}`)}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">
                          {v.activated_at
                            ? t("agreements.templates.activated", { date: new Date(v.activated_at).toLocaleDateString() })
                            : t("agreements.templates.created", { date: new Date(v.created_at).toLocaleDateString() })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/settings/agreements/version/${v.id}`)}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          {v.status === "draft" ? t("agreements.templates.edit") : t("agreements.templates.view")}
                        </Button>
                        {v.status === "draft" && (
                          <Button size="sm" onClick={() => activate(v)}>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> {t("agreements.templates.activate")}
                          </Button>
                        )}
                        {v.status === "active" && (
                          <Button variant="outline" size="sm" onClick={() => newDraftFrom(v)}>
                            {t("agreements.templates.newDraft")}
                          </Button>
                        )}
                        {v.status !== "archived" && v.status !== "active" && (
                          <Button variant="ghost" size="sm" onClick={() => archive(v)}>
                            <Archive className="w-4 h-4" aria-label={t("agreements.templates.archive")} />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
