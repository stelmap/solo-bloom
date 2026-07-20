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
import { Plus, FileText, Archive, CheckCircle2, Pencil, Sparkles } from "lucide-react";
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
  const { t } = useLanguage();

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data: tpls, error } = await supabase
      .from("agreement_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
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
      toast({ title: "Could not create", description: error?.message, variant: "destructive" });
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
    if (error) toast({ title: "Activate failed", description: error.message, variant: "destructive" });
    else toast({ title: `Version ${v.version_number} is now active` });
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
        toast({ title: t("agreements.starter.done"), description: "Starter template already exists — opening it." });
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
          <h1 className="text-2xl font-bold text-foreground">Information Agreements</h1>
          <p className="text-muted-foreground mt-1">
            Reusable agreement templates. Each template can have one active version used when creating client agreements.
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">New template</CardTitle></CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <Input
              placeholder="Template name (e.g. Informed consent — individual therapy)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTemplate()}
              className="flex-1 min-w-[240px]"
            />
            <Button onClick={createTemplate} disabled={creating || !newName.trim()}>
              <Plus className="w-4 h-4 mr-1" /> Create
            </Button>
            <Button variant="outline" onClick={loadStarter} disabled={seeding}>
              <Sparkles className="w-4 h-4 mr-1" />
              {seeding ? t("agreements.starter.loading") : t("agreements.starter.button")}
            </Button>
          </CardContent>
        </Card>


        {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!loading && templates.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No templates yet. Create your first template above.
          </div>
        )}

        <div className="space-y-4">
          {templates.map((tpl) => {
            const vs = versions[tpl.id] || [];
            return (
              <Card key={tpl.id}>
                <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4" /> {tpl.name}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">
                      Language: {tpl.language.toUpperCase()} · Created {new Date(tpl.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {vs.length === 0 && <div className="text-sm text-muted-foreground">No versions.</div>}
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
                          {v.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">
                          {v.activated_at
                            ? `Activated ${new Date(v.activated_at).toLocaleDateString()}`
                            : `Created ${new Date(v.created_at).toLocaleDateString()}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/settings/agreements/version/${v.id}`)}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          {v.status === "draft" ? "Edit" : "View"}
                        </Button>
                        {v.status === "draft" && (
                          <Button size="sm" onClick={() => activate(v)}>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Activate
                          </Button>
                        )}
                        {v.status === "active" && (
                          <Button variant="outline" size="sm" onClick={() => newDraftFrom(v)}>
                            New draft
                          </Button>
                        )}
                        {v.status !== "archived" && v.status !== "active" && (
                          <Button variant="ghost" size="sm" onClick={() => archive(v)}>
                            <Archive className="w-4 h-4" />
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
