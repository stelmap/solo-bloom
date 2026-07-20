import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { FileSignature, Plus, Copy, Link as LinkIcon, Ban, ExternalLink, ChevronDown, ChevronUp, Mail, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { AgreementStatusTimeline } from "@/components/AgreementStatusTimeline";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

type Template = {
  id: string;
  name: string;
  description: string | null;
};
type ActiveVersion = {
  id: string;
  template_id: string;
  version_number: number;
  content: any;
  controls: any;
};
type Instance = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  template_version_id: string;
  current_revision_id: string | null;
  content: any;
  controls: any;
};
type Invitation = {
  id: string;
  instance_id: string;
  expires_at: string;
  revoked_at: string | null;
  opened_at: string | null;
  verified_at: string | null;
  accepted_at: string | null;
  created_at: string;
};

// SHA-256 hex helper
async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-accent text-accent-foreground",
  opened: "bg-primary/10 text-primary",
  verified: "bg-primary/15 text-primary",
  accepted: "bg-success/15 text-success",
  revoked: "bg-destructive/15 text-destructive",
  expired: "bg-muted text-muted-foreground",
};

export function ClientAgreementsCard({ clientId, clientEmail, clientName }: { clientId: string; clientEmail: string | null; clientName: string }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [templates, setTemplates] = useState<Array<Template & { activeVersion: ActiveVersion | null }>>([]);
  const [invitations, setInvitations] = useState<Record<string, Invitation | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [pickedTemplate, setPickedTemplate] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; url: string }>({ open: false, url: "" });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [previewInst, setPreviewInst] = useState<Instance | null>(null);
  const [deleteInst, setDeleteInst] = useState<Instance | null>(null);
  const [deleting, setDeleting] = useState(false);


  async function load() {
    if (!user) return;
    setLoading(true);

    const [{ data: ins }, { data: tpls }, { data: vers }] = await Promise.all([
      supabase.from("agreement_instances").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("agreement_templates").select("id,name,description"),
      supabase.from("agreement_template_versions").select("id,template_id,version_number,content,controls,status").eq("status", "active"),
    ]);

    const instList = (ins ?? []) as Instance[];
    setInstances(instList);

    const active = new Map<string, ActiveVersion>();
    (vers ?? []).forEach((v: any) => active.set(v.template_id, v));
    setTemplates((tpls ?? []).map((tpl: any) => ({ ...tpl, activeVersion: active.get(tpl.id) ?? null })));

    if (instList.length) {
      const { data: invs } = await supabase
        .from("agreement_invitations")
        .select("*")
        .in("instance_id", instList.map((i) => i.id))
        .order("created_at", { ascending: false });
      const byInst: Record<string, Invitation> = {};
      (invs ?? []).forEach((inv: any) => {
        if (!byInst[inv.instance_id]) byInst[inv.instance_id] = inv;
      });
      setInvitations(byInst);
    } else {
      setInvitations({});
    }
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [clientId, user?.id]);

  const availableTemplates = templates.filter((tpl) => tpl.activeVersion);

  async function createInstance() {
    if (!user || !pickedTemplate) return;
    const tpl = availableTemplates.find((t) => t.id === pickedTemplate);
    if (!tpl || !tpl.activeVersion) return;
    setCreating(true);
    try {
      const { data: inst, error } = await supabase
        .from("agreement_instances")
        .insert({
          user_id: user.id,
          client_id: clientId,
          template_version_id: tpl.activeVersion.id,
          status: "draft",
          content: tpl.activeVersion.content,
          controls: tpl.activeVersion.controls,
        })
        .select()
        .single();
      if (error) throw error;

      const contentString = JSON.stringify({ c: tpl.activeVersion.content, k: tpl.activeVersion.controls });
      const contentHash = await sha256Hex(contentString);

      const { data: rev, error: revErr } = await supabase
        .from("agreement_revisions")
        .insert({
          instance_id: inst.id,
          user_id: user.id,
          revision_number: 1,
          content_snapshot: tpl.activeVersion.content,
          controls_snapshot: tpl.activeVersion.controls,
          content_hash: contentHash,
        })
        .select()
        .single();
      if (revErr) throw revErr;

      await supabase.from("agreement_instances").update({ current_revision_id: rev.id }).eq("id", inst.id);
      await supabase.from("agreement_audit_events").insert({
        instance_id: inst.id, user_id: user.id, event_type: "instance_created", metadata: { template_id: tpl.id },
      });

      toast({ title: t("agreements.toast.created") });
      setNewOpen(false);
      setPickedTemplate("");
      await load();
    } catch (e: any) {
      toast({ title: t("agreements.toast.createFail"), description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function generateInvitation(instance: Instance) {
    if (!user) return;
    if (!clientEmail) {
      toast({ title: t("agreements.toast.needEmail"), variant: "destructive" });
      return;
    }
    if (!instance.current_revision_id) {
      toast({ title: t("agreements.toast.noRevision"), variant: "destructive" });
      return;
    }
    try {
      const token = randomToken();
      const tokenHash = await sha256Hex(token);
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from("agreement_invitations").insert({
        user_id: user.id,
        instance_id: instance.id,
        revision_id: instance.current_revision_id,
        client_id: clientId,
        token_hash: tokenHash,
        email_bound: clientEmail.trim().toLowerCase(),
        expires_at: expiresAt,
      });
      if (error) throw error;

      if (instance.status === "draft") {
        await supabase.from("agreement_instances").update({ status: "sent" }).eq("id", instance.id);
      }
      await supabase.from("agreement_audit_events").insert({
        instance_id: instance.id, user_id: user.id, event_type: "invitation_created",
      });

      const url = `${window.location.origin}/agreement/${token}`;
      try { await navigator.clipboard.writeText(url); } catch {}
      setLinkDialog({ open: true, url });
      await load();
    } catch (e: any) {
      toast({ title: t("agreements.toast.linkFail"), description: e.message, variant: "destructive" });
    }
  }

  async function revokeInvitation(instance: Instance) {
    if (!user) return;
    const inv = invitations[instance.id];
    if (!inv || inv.revoked_at || inv.accepted_at) return;
    const { error } = await supabase
      .from("agreement_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", inv.id);
    if (error) {
      toast({ title: t("agreements.toast.revokeFail"), description: error.message, variant: "destructive" });
      return;
    }
    await supabase.from("agreement_instances").update({ status: "revoked" }).eq("id", instance.id);
    await supabase.from("agreement_audit_events").insert({
      instance_id: instance.id, user_id: user.id, event_type: "invitation_revoked",
    });
    toast({ title: t("agreements.toast.revoked") });
    await load();
  }

  async function deleteInstance(instance: Instance) {
    if (!user) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("agreement_instances").delete().eq("id", instance.id);
      if (error) throw error;
      toast({ title: t("agreements.toast.deleted") });
      setDeleteInst(null);
      await load();
    } catch (e: any) {
      toast({ title: t("agreements.toast.deleteFail"), description: e?.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-primary" /> {t("agreements.card.title")}
        </h3>
        <Button size="sm" variant="outline" onClick={() => setNewOpen(true)} disabled={availableTemplates.length === 0}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("agreements.card.new")}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : instances.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {availableTemplates.length === 0 ? t("agreements.card.noTemplates") : t("agreements.card.empty")}
        </p>
      ) : (
        <div className="space-y-3">
          {instances.map((inst) => {
            const tplName = templates.find((tp) => tp.activeVersion?.id === inst.template_version_id)?.name
              ?? t("agreements.card.agreement");
            const inv = invitations[inst.id];
            const canLink = inst.status !== "accepted" && inst.status !== "revoked";
            const canRevoke = inv && !inv.revoked_at && !inv.accepted_at && inst.status !== "accepted";
            return (
              <div key={inst.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm text-foreground">{tplName}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(inst.created_at), "d MMM yyyy, HH:mm")}
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs ${STATUS_STYLE[inst.status] || ""}`}>
                    {t(`agreements.status.${inst.status}`)}
                  </Badge>
                </div>
                {inv && (
                  <div className="text-xs text-muted-foreground">
                    {inv.revoked_at
                      ? t("agreements.card.linkRevoked")
                      : inv.accepted_at
                        ? t("agreements.card.linkAccepted")
                        : t("agreements.card.linkExpires", { date: format(new Date(inv.expires_at), "d MMM yyyy") })}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setPreviewInst(inst)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> {t("agreements.card.preview")}
                  </Button>
                  {canLink && (
                    <Button size="sm" variant="outline" onClick={() => generateInvitation(inst)}>
                      <LinkIcon className="h-3.5 w-3.5 mr-1" />
                      {inv && !inv.revoked_at ? t("agreements.card.regenerate") : t("agreements.card.generateLink")}
                    </Button>
                  )}
                  {canRevoke && (
                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => revokeInvitation(inst)}>
                      <Ban className="h-3.5 w-3.5 mr-1" /> {t("agreements.card.revoke")}
                    </Button>
                  )}
                  {inst.status === "draft" && (
                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteInst(inst)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("common.delete")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto"
                    onClick={() => setExpanded((s) => ({ ...s, [inst.id]: !s[inst.id] }))}
                  >
                    {expanded[inst.id] ? (
                      <><ChevronUp className="h-3.5 w-3.5 mr-1" /> {t("agreements.timeline.hide")}</>
                    ) : (
                      <><ChevronDown className="h-3.5 w-3.5 mr-1" /> {t("agreements.timeline.show")}</>
                    )}
                  </Button>
                </div>
                {expanded[inst.id] && (
                  <div className="pt-2 border-t border-border">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {t("agreements.timeline.title")}
                    </div>
                    <AgreementStatusTimeline
                      data={{
                        instanceCreatedAt: inst.created_at,
                        invitationCreatedAt: inv?.created_at,
                        openedAt: inv?.opened_at,
                        verifiedAt: inv?.verified_at,
                        acceptedAt: inv?.accepted_at,
                        revokedAt: inv?.revoked_at,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("agreements.new.title")}</DialogTitle>
            <DialogDescription>{t("agreements.new.subtitle", { name: clientName })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">{t("agreements.new.template")}</label>
            <Select value={pickedTemplate} onValueChange={setPickedTemplate}>
              <SelectTrigger><SelectValue placeholder={t("agreements.new.selectTemplate")} /></SelectTrigger>
              <SelectContent>
                {availableTemplates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.name} · v{tpl.activeVersion?.version_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableTemplates.length === 0 && (
              <p className="text-xs text-muted-foreground">{t("agreements.new.noneActive")}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={createInstance} disabled={!pickedTemplate || creating}>
              {creating ? t("common.loading") : t("agreements.new.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkDialog.open} onOpenChange={(open) => setLinkDialog((s) => ({ ...s, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("agreements.link.title")}</DialogTitle>
            <DialogDescription>{t("agreements.link.subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs break-all font-mono">{linkDialog.url}</div>
          <DialogFooter className="flex flex-wrap gap-2 sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => window.open(linkDialog.url, "_blank")}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> {t("agreements.link.open")}
            </Button>
            <Button variant="outline" size="sm" disabled={!clientEmail || sendingEmail} onClick={async () => {
              if (!clientEmail) return;
              setSendingEmail(true);
              try {
                const { data: prof } = await supabase
                  .from("profiles")
                  .select("full_name, business_name, language")
                  .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
                  .maybeSingle();
                const specialistName =
                  (prof as any)?.business_name ||
                  (prof as any)?.full_name ||
                  t("agreements.link.defaultSpecialist");
                const { error } = await supabase.functions.invoke("send-transactional-email", {
                  body: {
                    templateName: "agreement-invitation",
                    recipientEmail: clientEmail,
                    idempotencyKey: `agreement-invite-${linkDialog.url.split("/").pop()}`,
                    templateData: {
                      clientName,
                      specialistName,
                      agreementUrl: linkDialog.url,
                      language: (prof as any)?.language || "en",
                    },
                  },
                });
                if (error) throw error;
                toast({ title: t("agreements.link.emailSent") });
              } catch (e: any) {
                toast({ title: t("agreements.link.emailFailed"), description: e?.message, variant: "destructive" });
              } finally {
                setSendingEmail(false);
              }
            }}>
              <Mail className="h-3.5 w-3.5 mr-1" /> {sendingEmail ? t("common.loading") : t("agreements.link.email")}
            </Button>
            <Button size="sm" onClick={async () => {
              try { await navigator.clipboard.writeText(linkDialog.url); toast({ title: t("agreements.link.copied") }); } catch {}
            }}>
              <Copy className="h-3.5 w-3.5 mr-1" /> {t("agreements.link.copy")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewInst} onOpenChange={(open) => !open && setPreviewInst(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewInst?.content?.title || t("agreements.preview.title")}</DialogTitle>
            <DialogDescription>{t("agreements.preview.subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(previewInst?.content?.sections ?? []).map((s: any) => (
              <section key={s.id}>
                <h2 className="text-base font-semibold text-foreground mb-1">{s.heading}</h2>
                <div className="text-sm text-foreground whitespace-pre-wrap">{s.body}</div>
              </section>
            ))}
            {((previewInst?.content?.sessionFormats?.length ?? 0) > 0 || previewInst?.content?.cycleLength || previewInst?.content?.frequency) && (
              <section className="pt-2">
                <h2 className="text-base font-semibold text-foreground mb-2">{t("af.title")}</h2>
                {(previewInst?.content?.sessionFormats ?? []).length > 0 && (() => {
                  const formats: any[] = previewInst?.content?.sessionFormats ?? [];
                  const anyPrice = formats.some((f) => f.price !== "" && f.price != null);
                  return (
                    <table className="w-full text-sm border border-border rounded overflow-hidden mb-2">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2">{t("af.label")}</th>
                          <th className="text-left p-2">{t("af.duration")}</th>
                          {anyPrice && <th className="text-left p-2">{t("af.price")}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {formats.map((f: any) => (
                          <tr key={f.id} className="border-t border-border">
                            <td className="p-2">{f.label || "—"}</td>
                            <td className="p-2">{f.durationMinutes ? `${f.durationMinutes} ${t("common.min")}` : "—"}</td>
                            {anyPrice && (
                              <td className="p-2">{f.price !== "" && f.price != null ? `${f.price} ${f.currency || ""}`.trim() : ""}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
                {previewInst?.content?.cycleLength ? (
                  <p className="text-sm text-foreground">{t("af.cycleLine", { n: String(previewInst.content.cycleLength) })}</p>
                ) : null}
                {previewInst?.content?.frequency ? (
                  <p className="text-sm text-foreground">{t("af.frequencyLine", { v: previewInst.content.frequency })}</p>
                ) : null}
              </section>
            )}
            {Array.isArray(previewInst?.controls) && previewInst!.controls.length > 0 && (
              <div className="pt-3 border-t border-border space-y-2">
                <div className="text-xs font-medium text-muted-foreground">{t("agreements.preview.controls")}</div>
                {previewInst!.controls.map((c: any) => (
                  <div key={c.id} className="text-sm text-foreground flex items-start gap-2">
                    <span className="mt-0.5">☐</span>
                    <span>{c.label}{c.required ? " *" : ""}</span>
                  </div>
                ))}
              </div>
            )}
            {(!previewInst?.content?.sections || previewInst.content.sections.length === 0) && (
              <p className="text-sm text-muted-foreground">{t("agreements.preview.empty")}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewInst(null)}>{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteInst}
        onOpenChange={(open) => !open && setDeleteInst(null)}
        onConfirm={() => deleteInst && deleteInstance(deleteInst)}
        loading={deleting}
        title={t("agreements.delete.title")}
        description={t("agreements.delete.description")}
      />
    </div>
  );
}
