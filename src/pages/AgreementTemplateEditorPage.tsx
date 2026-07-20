import { AppLayout } from "@/components/AppLayout";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Save, Smartphone, Monitor, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Section = { id: string; heading: string; body: string };
type Control = {
  id: string;
  type: "required_checkbox" | "optional_checkbox" | "typed_acknowledgement";
  label: string;
  required: boolean;
};
type SessionFormat = {
  id: string;
  label: string;
  durationMinutes: number | "";
  price: number | "";
  currency: string;
};
type Content = {
  title: string;
  sections: Section[];
  sessionFormats?: SessionFormat[];
  cycleLength?: number | "";
  frequency?: string;
};

const AVAILABLE_VARIABLES = [
  "{{client.first_name}}",
  "{{client.last_name}}",
  "{{client.email}}",
  "{{therapist.business_name}}",
  "{{therapist.full_name}}",
  "{{today}}",
];

function uid() { return Math.random().toString(36).slice(2, 10); }

export default function AgreementTemplateEditorPage() {
  const { versionId } = useParams<{ versionId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"draft" | "active" | "archived">("draft");
  const [versionNumber, setVersionNumber] = useState(1);
  const [templateId, setTemplateId] = useState<string>("");
  const [content, setContent] = useState<Content>({ title: "", sections: [], sessionFormats: [], cycleLength: "", frequency: "" });
  const [controls, setControls] = useState<Control[]>([]);
  const [preview, setPreview] = useState<"desktop" | "mobile">("desktop");
  const [expand, setExpand] = useState<{
    title: string;
    value: string;
    multiline: boolean;
    onSave: (v: string) => void;
  } | null>(null);
  const [expandDraft, setExpandDraft] = useState("");

  function openExpand(opts: { title: string; value: string; multiline?: boolean; onSave: (v: string) => void }) {
    setExpand({ title: opts.title, value: opts.value, multiline: opts.multiline ?? true, onSave: opts.onSave });
    setExpandDraft(opts.value);
  }
  const ExpandBtn = ({ onClick }: { onClick: () => void }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      title="Expand editor"
      onClick={onClick}
    >
      <Maximize2 className="w-4 h-4" />
    </Button>
  );

  const readOnly = status !== "draft";

  useEffect(() => {
    (async () => {
      if (!versionId) return;
      const { data, error } = await supabase
        .from("agreement_template_versions")
        .select("*")
        .eq("id", versionId)
        .maybeSingle();
      if (error || !data) {
        toast({ title: "Not found", description: error?.message, variant: "destructive" });
        navigate("/settings/agreements");
        return;
      }
      setStatus(data.status as any);
      setVersionNumber(data.version_number);
      setTemplateId(data.template_id);
      const c = (data.content as any) || {};
      const rawSections = Array.isArray(c.sections) ? c.sections : [];
      const rawFormats = Array.isArray(c.sessionFormats) ? c.sessionFormats : [];
      setContent({
        title: typeof c.title === "string" ? c.title : "",
        sections: rawSections.map((s: any) => ({
          id: s.id ?? uid(),
          heading: s.heading ?? "",
          body: s.body ?? "",
        })),
        sessionFormats: rawFormats.map((f: any) => ({
          id: f.id ?? uid(),
          label: f.label ?? "",
          durationMinutes: typeof f.durationMinutes === "number" ? f.durationMinutes : "",
          price: typeof f.price === "number" ? f.price : "",
          currency: typeof f.currency === "string" ? f.currency : "",
        })),
        cycleLength: typeof c.cycleLength === "number" ? c.cycleLength : "",
        frequency: typeof c.frequency === "string" ? c.frequency : "",
      });
      const rawCtrls = Array.isArray(data.controls) ? (data.controls as any[]) : [];
      setControls(
        rawCtrls.map((x: any) => ({
          id: x.id ?? uid(),
          type: x.type ?? "required_checkbox",
          label: x.label ?? "",
          required: x.required ?? x.type === "required_checkbox",
        })),
      );
      setLoading(false);
    })();
  }, [versionId, navigate]);

  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (!content.title.trim()) errs.push("Title is required.");
    if (content.sections.length === 0) errs.push("Add at least one section.");
    content.sections.forEach((s, i) => {
      if (!s.heading.trim() && !s.body.trim())
        errs.push(`Section ${i + 1} is empty.`);
    });
    controls.forEach((c, i) => {
      if (!c.label.trim()) errs.push(`Control ${i + 1} needs a label.`);
    });
    const requiredAcks = controls.filter(
      (c) => c.type === "required_checkbox" || c.type === "typed_acknowledgement",
    );
    if (requiredAcks.length === 0)
      errs.push("Add at least one required acknowledgement control.");
    return errs;
  }, [content, controls]);

  async function save() {
    if (!versionId || readOnly) return;
    setSaving(true);
    const { error } = await supabase
      .from("agreement_template_versions")
      .update({ content: content as any, controls: controls as any })
      .eq("id", versionId);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Draft saved" });
  }

  async function activate() {
    if (!versionId || validationErrors.length) return;
    await save();
    await supabase
      .from("agreement_template_versions")
      .update({ status: "archived" })
      .eq("template_id", templateId)
      .eq("status", "active");
    const { error } = await supabase
      .from("agreement_template_versions")
      .update({ status: "active", activated_at: new Date().toISOString() })
      .eq("id", versionId);
    if (error) toast({ title: "Activate failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: `Version ${versionNumber} activated` });
      navigate("/settings/agreements");
    }
  }

  async function editAsNewDraft() {
    if (!templateId) return;
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { data: siblings } = await supabase
        .from("agreement_template_versions")
        .select("version_number")
        .eq("template_id", templateId);
      const nextNum = Math.max(0, ...(siblings ?? []).map((s: any) => s.version_number)) + 1;
      const { data: created, error } = await supabase
        .from("agreement_template_versions")
        .insert({
          template_id: templateId,
          user_id: uid,
          version_number: nextNum,
          status: "draft",
          content: content as any,
          controls: controls as any,
        })
        .select()
        .single();
      if (error) throw error;
      toast({ title: `Draft v${nextNum} created` });
      if (created) navigate(`/settings/agreements/version/${created.id}`);
    } catch (e: any) {
      toast({ title: "Failed to create draft", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function addSection() {
    setContent((c) => ({ ...c, sections: [...c.sections, { id: uid(), heading: "", body: "" }] }));
  }
  function updateSection(id: string, patch: Partial<Section>) {
    setContent((c) => ({ ...c, sections: c.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  }
  function removeSection(id: string) {
    setContent((c) => ({ ...c, sections: c.sections.filter((s) => s.id !== id) }));
  }

  function addFormat() {
    setContent((c) => ({
      ...c,
      sessionFormats: [...(c.sessionFormats ?? []), { id: uid(), label: "", durationMinutes: 60, price: "", currency: "" }],
    }));
  }
  function updateFormat(id: string, patch: Partial<SessionFormat>) {
    setContent((c) => ({
      ...c,
      sessionFormats: (c.sessionFormats ?? []).map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  }
  function removeFormat(id: string) {
    setContent((c) => ({ ...c, sessionFormats: (c.sessionFormats ?? []).filter((f) => f.id !== id) }));
  }

  function addControl() {
    setControls((cs) => [
      ...cs,
      { id: uid(), type: "required_checkbox", label: "", required: true },
    ]);
  }
  function updateControl(id: string, patch: Partial<Control>) {
    setControls((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function removeControl(id: string) {
    setControls((cs) => cs.filter((c) => c.id !== id));
  }

  if (loading) return <AppLayout><div className="p-6 text-sm text-muted-foreground">Loading…</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/settings/agreements")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              Version {versionNumber}
            </h1>
            <Badge variant={status === "active" ? "default" : status === "draft" ? "secondary" : "outline"}>
              {status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreview(preview === "desktop" ? "mobile" : "desktop")}>
              {preview === "desktop" ? <Smartphone className="w-4 h-4 mr-1" /> : <Monitor className="w-4 h-4 mr-1" />}
              {preview === "desktop" ? "Mobile preview" : "Desktop preview"}
            </Button>
            {readOnly && status === "active" && (
              <Button onClick={editAsNewDraft} disabled={saving}>
                <Save className="w-4 h-4 mr-1" /> Edit (new draft)
              </Button>
            )}
            {!readOnly && (
              <>
                <Button variant="outline" onClick={save} disabled={saving}>
                  <Save className="w-4 h-4 mr-1" /> Save draft
                </Button>
                <Button onClick={activate} disabled={validationErrors.length > 0}>
                  Activate
                </Button>
              </>
            )}
          </div>
        </div>

        {readOnly && (
          <div className="text-sm text-muted-foreground">
            {status === "active"
              ? "This version is active. Click \"Edit (new draft)\" to create an editable copy; activating it will replace the current active version."
              : "This version is archived and cannot be edited."}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Content</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <div className="flex gap-1">
                    <Input
                      value={content.title}
                      disabled={readOnly}
                      onChange={(e) => setContent({ ...content, title: e.target.value })}
                    />
                    <ExpandBtn onClick={() => openExpand({
                      title: "Title",
                      value: content.title,
                      multiline: false,
                      onSave: (v) => setContent({ ...content, title: v }),
                    })} />
                  </div>
                </div>
                {content.sections.map((s, idx) => (
                  <div key={s.id}>
                    <div className="rounded border border-border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Section {idx + 1}</span>
                        {!readOnly && (
                          <Button variant="ghost" size="icon" onClick={() => removeSection(s.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Input
                          placeholder="Heading"
                          value={s.heading}
                          disabled={readOnly}
                          onChange={(e) => updateSection(s.id, { heading: e.target.value })}
                        />
                        <ExpandBtn onClick={() => openExpand({
                          title: `Section ${idx + 1} — Heading`,
                          value: s.heading,
                          multiline: false,
                          onSave: (v) => updateSection(s.id, { heading: v }),
                        })} />
                      </div>
                      <div className="flex gap-1 items-start">
                        <Textarea
                          placeholder="Body text. Use variables like {{client.first_name}}."
                          rows={5}
                          value={s.body}
                          disabled={readOnly}
                          onChange={(e) => updateSection(s.id, { body: e.target.value })}
                        />
                        <ExpandBtn onClick={() => openExpand({
                          title: `Section ${idx + 1} — Body`,
                          value: s.body,
                          multiline: true,
                          onSave: (v) => updateSection(s.id, { body: v }),
                        })} />
                      </div>
                    </div>
                    {idx === 1 && (
                      <Card className="mt-6">
                        <CardHeader><CardTitle className="text-base">Session formats</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-xs text-muted-foreground">
                            Define the session durations, cycle length and frequency offered under this agreement. They render as a table in the signed document.
                          </p>
                          {(content.sessionFormats ?? []).map((f, idx) => (
                            <div key={f.id} className="rounded border border-border p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Format {idx + 1}</span>
                                {!readOnly && (
                                  <Button variant="ghost" size="icon" onClick={() => removeFormat(f.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                <div className="sm:col-span-2">
                                  <Label className="text-xs">Label</Label>
                                  <Input
                                    placeholder="Individual consultation"
                                    value={f.label}
                                    disabled={readOnly}
                                    onChange={(e) => updateFormat(f.id, { label: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Duration (min)</Label>
                                  <Input
                                    type="number"
                                    min={5}
                                    step={5}
                                    value={f.durationMinutes}
                                    disabled={readOnly}
                                    onChange={(e) => updateFormat(f.id, { durationMinutes: e.target.value === "" ? "" : Number(e.target.value) })}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Price</Label>
                                  <div className="flex gap-1">
                                    <Input
                                      type="number"
                                      min={0}
                                      step={1}
                                      value={f.price}
                                      disabled={readOnly}
                                      onChange={(e) => updateFormat(f.id, { price: e.target.value === "" ? "" : Number(e.target.value) })}
                                    />
                                    <Input
                                      placeholder="EUR"
                                      className="w-20"
                                      value={f.currency}
                                      disabled={readOnly}
                                      onChange={(e) => updateFormat(f.id, { currency: e.target.value })}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {!readOnly && (
                            <Button variant="outline" size="sm" onClick={addFormat}>
                              <Plus className="w-4 h-4 mr-1" /> Add format
                            </Button>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                            <div>
                              <Label className="text-xs">Cycle length (sessions)</Label>
                              <Input
                                type="number"
                                min={1}
                                value={content.cycleLength ?? ""}
                                disabled={readOnly}
                                onChange={(e) => setContent({ ...content, cycleLength: e.target.value === "" ? "" : Number(e.target.value) })}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Frequency</Label>
                              <Input
                                placeholder="e.g. 1 session per week"
                                value={content.frequency ?? ""}
                                disabled={readOnly}
                                onChange={(e) => setContent({ ...content, frequency: e.target.value })}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ))}
                {!readOnly && (
                  <Button variant="outline" size="sm" onClick={addSection}>
                    <Plus className="w-4 h-4 mr-1" /> Add section
                  </Button>
                )}
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Variables:</span>{" "}
                  {AVAILABLE_VARIABLES.map((v) => (
                    <code key={v} className="mr-1 px-1 py-0.5 bg-muted rounded">{v}</code>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Session formats</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Define the session durations, cycle length and frequency offered under this agreement. They render as a table in the signed document.
                </p>
                {(content.sessionFormats ?? []).map((f, idx) => (
                  <div key={f.id} className="rounded border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Format {idx + 1}</span>
                      {!readOnly && (
                        <Button variant="ghost" size="icon" onClick={() => removeFormat(f.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-2">
                        <Label className="text-xs">Label</Label>
                        <Input
                          placeholder="Individual consultation"
                          value={f.label}
                          disabled={readOnly}
                          onChange={(e) => updateFormat(f.id, { label: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Duration (min)</Label>
                        <Input
                          type="number"
                          min={5}
                          step={5}
                          value={f.durationMinutes}
                          disabled={readOnly}
                          onChange={(e) => updateFormat(f.id, { durationMinutes: e.target.value === "" ? "" : Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Price</Label>
                        <div className="flex gap-1">
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={f.price}
                            disabled={readOnly}
                            onChange={(e) => updateFormat(f.id, { price: e.target.value === "" ? "" : Number(e.target.value) })}
                          />
                          <Input
                            placeholder="EUR"
                            className="w-20"
                            value={f.currency}
                            disabled={readOnly}
                            onChange={(e) => updateFormat(f.id, { currency: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {!readOnly && (
                  <Button variant="outline" size="sm" onClick={addFormat}>
                    <Plus className="w-4 h-4 mr-1" /> Add format
                  </Button>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div>
                    <Label className="text-xs">Cycle length (sessions)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={content.cycleLength ?? ""}
                      disabled={readOnly}
                      onChange={(e) => setContent({ ...content, cycleLength: e.target.value === "" ? "" : Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Frequency</Label>
                    <Input
                      placeholder="e.g. 1 session per week"
                      value={content.frequency ?? ""}
                      disabled={readOnly}
                      onChange={(e) => setContent({ ...content, frequency: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>



            <Card>
              <CardHeader><CardTitle className="text-base">Client controls</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {controls.map((c, i) => (
                  <div key={c.id} className="rounded border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Control {i + 1}</span>
                      {!readOnly && (
                        <Button variant="ghost" size="icon" onClick={() => removeControl(c.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <Select
                      value={c.type}
                      disabled={readOnly}
                      onValueChange={(val: any) =>
                        updateControl(c.id, {
                          type: val,
                          required: val === "optional_checkbox" ? false : true,
                        })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="required_checkbox">Required checkbox</SelectItem>
                        <SelectItem value="optional_checkbox">Optional checkbox</SelectItem>
                        <SelectItem value="typed_acknowledgement">Typed acknowledgement</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1 items-start">
                      <Textarea
                        placeholder="Label shown to the client"
                        rows={2}
                        value={c.label}
                        disabled={readOnly}
                        onChange={(e) => updateControl(c.id, { label: e.target.value })}
                      />
                      <ExpandBtn onClick={() => openExpand({
                        title: `Control ${i + 1} — Label`,
                        value: c.label,
                        multiline: true,
                        onSave: (v) => updateControl(c.id, { label: v }),
                      })} />
                    </div>
                    {c.type === "optional_checkbox" && (
                      <div className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={c.required}
                          disabled={readOnly}
                          onCheckedChange={(v) => updateControl(c.id, { required: v })}
                        />
                        <span className="text-muted-foreground">Mark as required</span>
                      </div>
                    )}
                  </div>
                ))}
                {!readOnly && (
                  <Button variant="outline" size="sm" onClick={addControl}>
                    <Plus className="w-4 h-4 mr-1" /> Add control
                  </Button>
                )}
              </CardContent>
            </Card>

            {!readOnly && validationErrors.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base text-destructive">To activate, fix:</CardTitle></CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    {validationErrors.map((e) => <li key={e}>{e}</li>)}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Preview */}
          <div>
            <Card>
              <CardHeader><CardTitle className="text-base">Preview ({preview})</CardTitle></CardHeader>
              <CardContent>
                <div
                  className={
                    "mx-auto border border-border rounded bg-background p-4 overflow-auto " +
                    (preview === "mobile" ? "max-w-[380px]" : "w-full")
                  }
                  style={{ minHeight: 400 }}
                >
                  <h2 className="text-xl font-semibold mb-3">{content.title || "Untitled agreement"}</h2>
                  {content.sections.map((s) => (
                    <section key={s.id} className="mb-4">
                      {s.heading && <h3 className="font-medium mb-1">{s.heading}</h3>}
                      <p className="text-sm text-foreground whitespace-pre-wrap">{s.body}</p>
                    </section>
                  ))}
                  {((content.sessionFormats?.length ?? 0) > 0 || content.cycleLength || content.frequency) && (
                    <section className="mb-4">
                      <h3 className="font-medium mb-2">Session formats</h3>
                      {(content.sessionFormats ?? []).length > 0 && (
                        <table className="w-full text-sm border border-border rounded overflow-hidden mb-2">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-2">Format</th>
                              <th className="text-left p-2">Duration</th>
                              <th className="text-left p-2">Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(content.sessionFormats ?? []).map((f) => (
                              <tr key={f.id} className="border-t border-border">
                                <td className="p-2">{f.label || "—"}</td>
                                <td className="p-2">{f.durationMinutes ? `${f.durationMinutes} min` : "—"}</td>
                                <td className="p-2">{f.price !== "" ? `${f.price} ${f.currency || ""}`.trim() : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      {content.cycleLength ? (
                        <p className="text-sm text-foreground">Cycle: {content.cycleLength} sessions.</p>
                      ) : null}
                      {content.frequency ? (
                        <p className="text-sm text-foreground">Frequency: {content.frequency}.</p>
                      ) : null}
                    </section>
                  )}
                  {controls.length > 0 && (
                    <div className="mt-6 border-t border-border pt-4 space-y-3">
                      {controls.map((c) => (
                        <label key={c.id} className="flex items-start gap-2 text-sm">
                          {c.type === "typed_acknowledgement" ? (
                            <div className="w-full">
                              <div className="mb-1">
                                {c.label}
                                {c.required && <span className="text-destructive"> *</span>}
                              </div>
                              <Input placeholder="Type to acknowledge" disabled />
                            </div>
                          ) : (
                            <>
                              <input type="checkbox" disabled className="mt-1" />
                              <span>
                                {c.label}
                                {c.required && <span className="text-destructive"> *</span>}
                              </span>
                            </>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={!!expand} onOpenChange={(o) => !o && setExpand(null)}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>{expand?.title}</DialogTitle>
          </DialogHeader>
          {expand?.multiline ? (
            <Textarea
              value={expandDraft}
              onChange={(e) => setExpandDraft(e.target.value)}
              className="min-h-[60vh] font-mono text-sm"
              autoFocus
            />
          ) : (
            <Input
              value={expandDraft}
              onChange={(e) => setExpandDraft(e.target.value)}
              className="text-base"
              autoFocus
            />
          )}
          <div className="text-xs text-muted-foreground">
            Variables: {AVAILABLE_VARIABLES.map((v) => (
              <code key={v} className="mr-1 px-1 py-0.5 bg-muted rounded">{v}</code>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpand(null)}>Cancel</Button>
            <Button
              onClick={() => {
                expand?.onSave(expandDraft);
                setExpand(null);
              }}
              disabled={readOnly}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
