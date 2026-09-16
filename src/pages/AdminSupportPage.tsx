import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/sessionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { describeError } from "@/lib/errorMessages";
import { Loader2, RefreshCw, Plus } from "lucide-react";

type Conversation = {
  id: string;
  created_at: string;
  user_id: string | null;
  anon_id: string | null;
  surface: string;
  language: string;
  module: string | null;
  category: string | null;
  page_path: string | null;
  error_code: string | null;
  error_connected: boolean;
  resolved_by_bot: boolean | null;
  escalated: boolean;
  feedback: string | null;
  feedback_comment: string | null;
  first_question: string | null;
};

type Issue = {
  id: string;
  created_at: string;
  status: string;
  user_id: string | null;
  description: string | null;
  question: string | null;
  bot_answer: string | null;
  category: string | null;
  module: string | null;
  page_path: string | null;
  error_code: string | null;
  language: string | null;
  user_agent: string | null;
  admin_note: string | null;
};

type Article = {
  id: string;
  module: string;
  slug: string;
  language: string;
  title: string;
  body: string;
  is_published: boolean;
  sort_order: number;
};

const ISSUE_STATUSES = ["new", "reviewing", "known_issue", "resolved", "closed"];
const MODULES = [
  "Getting Started", "Onboarding", "Dashboard", "Calendar", "Clients", "Groups",
  "Services", "Booking", "Payments", "Finances", "Notifications", "Subscription",
  "Settings", "Troubleshooting",
];

function fmt(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function countBy<T>(rows: T[], pick: (row: T) => string | null | undefined) {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const key = pick(row) || "—";
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export default function AdminSupportPage() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState("");
  const [openConversation, setOpenConversation] = useState<Conversation | null>(null);
  const [transcript, setTranscript] = useState<{ role: string; content: string }[]>([]);
  const [editing, setEditing] = useState<Partial<Article> | null>(null);

  useEffect(() => {
    if (!user) return;
    checkIsAdmin().then(setIsAdmin);
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, i, a] = await Promise.all([
      supabase.from("support_conversations").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("support_issues").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("support_articles").select("*").order("module").order("sort_order"),
    ]);
    setConversations((c.data as Conversation[]) ?? []);
    setIssues((i.data as Issue[]) ?? []);
    setArticles((a.data as Article[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      [c.first_question, c.category, c.module, c.error_code, c.page_path]
        .some((v) => v?.toLowerCase().includes(q)));
  }, [conversations, search]);

  const openTranscript = useCallback(async (conversation: Conversation) => {
    setOpenConversation(conversation);
    const { data } = await supabase
      .from("support_messages")
      .select("role, content")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });
    setTranscript((data as { role: string; content: string }[]) ?? []);
  }, []);

  const updateIssue = useCallback(async (id: string, patch: Partial<Issue>) => {
    const { error } = await supabase.from("support_issues").update(patch).eq("id", id);
    if (error) {
      toast({ title: describeError(error), variant: "destructive" });
      return;
    }
    setIssues((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const saveArticle = useCallback(async () => {
    if (!editing?.title || !editing.body || !editing.module || !editing.slug) {
      toast({ title: "Module, slug, title and body are required", variant: "destructive" });
      return;
    }
    const payload = {
      module: editing.module,
      slug: editing.slug,
      language: editing.language ?? "en",
      title: editing.title,
      body: editing.body,
      is_published: editing.is_published ?? true,
      sort_order: editing.sort_order ?? 0,
    };
    const { error } = editing.id
      ? await supabase.from("support_articles").update(payload).eq("id", editing.id)
      : await supabase.from("support_articles").insert(payload);
    if (error) {
      toast({ title: describeError(error), variant: "destructive" });
      return;
    }
    setEditing(null);
    load();
  }, [editing, load]);

  const analytics = useMemo(() => {
    const total = conversations.length;
    const unresolved = conversations.filter((c) => c.resolved_by_bot === false).length;
    const notHelpful = conversations.filter((c) => c.feedback === "not_helpful").length;
    const escalated = conversations.filter((c) => c.escalated).length;
    return {
      total,
      unresolved,
      notHelpful,
      escalated,
      byCategory: countBy(conversations, (c) => c.category),
      byModule: countBy(conversations, (c) => c.module),
      byError: countBy(conversations.filter((c) => c.error_code), (c) => c.error_code),
      topQuestions: countBy(conversations, (c) => c.first_question?.slice(0, 80)).slice(0, 15),
      byDay: countBy(conversations, (c) => c.created_at.slice(0, 10)).sort((a, b) => a[0].localeCompare(b[0])),
      featureRequests: conversations.filter((c) => c.category === "Feature request").length,
    };
  }, [conversations]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user || !isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Support / Helpdesk</h1>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="conversations">
        <TabsList>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="kb">Knowledge base</TabsTrigger>
        </TabsList>

        {/* ---------------- Conversations ---------------- */}
        <TabsContent value="conversations" className="mt-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search question, category, module, error code..."
            className="mb-3 max-w-md"
          />
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Escalated</TableHead>
                  <TableHead>Feedback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => openTranscript(c)}>
                    <TableCell className="whitespace-nowrap">{fmt(c.created_at)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {c.user_id ? c.user_id.slice(0, 8) : `visitor ${c.anon_id?.slice(0, 6) ?? "—"}`}
                    </TableCell>
                    <TableCell>{c.category ?? "—"}</TableCell>
                    <TableCell className="max-w-[24rem] truncate">{c.first_question ?? "—"}</TableCell>
                    <TableCell>{c.module ?? "—"}</TableCell>
                    <TableCell>{c.error_code ?? "—"}</TableCell>
                    <TableCell>{c.resolved_by_bot === null ? "—" : c.resolved_by_bot ? "Yes" : "No"}</TableCell>
                    <TableCell>{c.escalated ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      {c.feedback === "helpful" && <Badge>Helpful</Badge>}
                      {c.feedback === "not_helpful" && <Badge variant="destructive">Not helpful</Badge>}
                      {!c.feedback && "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ---------------- Issues ---------------- */}
        <TabsContent value="issues" className="mt-4">
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Device</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="whitespace-nowrap">{fmt(i.created_at)}</TableCell>
                    <TableCell>
                      <Select value={i.status} onValueChange={(v) => updateIssue(i.id, { status: v })}>
                        <SelectTrigger className="w-[9.5rem]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ISSUE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{i.module ?? "—"}</TableCell>
                    <TableCell>{i.error_code ?? "—"}</TableCell>
                    <TableCell className="max-w-[18rem] truncate">{i.question ?? "—"}</TableCell>
                    <TableCell className="max-w-[18rem] truncate">{i.description ?? "—"}</TableCell>
                    <TableCell className="max-w-[12rem] truncate text-xs">{i.user_agent ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ---------------- Analytics ---------------- */}
        <TabsContent value="analytics" className="mt-4 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Support questions", analytics.total],
              ["Unresolved by bot", analytics.unresolved],
              ["Marked not helpful", analytics.notHelpful],
              ["Escalated to issues", analytics.escalated],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {[
              ["Top questions", analytics.topQuestions],
              ["Categories", analytics.byCategory],
              ["Modules generating support", analytics.byModule],
              ["Most common errors", analytics.byError],
              ["Volume over time", analytics.byDay],
            ].map(([title, rows]) => (
              <div key={String(title)} className="rounded-lg border border-border p-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground">{title as string}</h2>
                {(rows as [string, number][]).length === 0 && (
                  <p className="text-sm text-muted-foreground">No data yet.</p>
                )}
                <ul className="space-y-1 text-sm">
                  {(rows as [string, number][]).slice(0, 15).map(([label, count]) => (
                    <li key={label} className="flex justify-between gap-4">
                      <span className="truncate text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ---------------- Knowledge base ---------------- */}
        <TabsContent value="kb" className="mt-4">
          <Button size="sm" className="mb-3" onClick={() => setEditing({ language: "en", is_published: true })}>
            <Plus className="mr-2 h-4 w-4" /> New article
          </Button>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.module}</TableCell>
                    <TableCell className="max-w-[24rem] truncate">{a.title}</TableCell>
                    <TableCell>{a.language}</TableCell>
                    <TableCell>{a.is_published ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(a)}>Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Conversation transcript */}
      <Dialog open={!!openConversation} onOpenChange={(o) => !o && setOpenConversation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Conversation</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto text-sm">
            <p className="text-xs text-muted-foreground">
              {fmt(openConversation?.created_at ?? null)} · {openConversation?.language} ·{" "}
              {openConversation?.module ?? "—"} · {openConversation?.page_path ?? "—"} ·{" "}
              {openConversation?.error_code ?? "no error"}
            </p>
            {openConversation?.feedback_comment && (
              <p className="rounded-lg border border-border p-2 text-xs">
                Feedback: {openConversation.feedback_comment}
              </p>
            )}
            {transcript.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-foreground" : "text-muted-foreground"}>
                <span className="text-xs font-semibold uppercase">{m.role}</span>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Article editor */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit article" : "New article"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Module</Label>
                <Select value={editing?.module} onValueChange={(v) => setEditing((e) => ({ ...e, module: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                  <SelectContent>
                    {MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Language</Label>
                <Select value={editing?.language ?? "en"} onValueChange={(v) => setEditing((e) => ({ ...e, language: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["en", "uk", "pl", "fr", "ru"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={editing?.slug ?? ""} onChange={(e) => setEditing((p) => ({ ...p, slug: e.target.value }))} />
            </div>
            <div>
              <Label>Title</Label>
              <Input value={editing?.title ?? ""} onChange={(e) => setEditing((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea
                rows={12}
                value={editing?.body ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, body: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing?.is_published ?? true}
                onChange={(e) => setEditing((p) => ({ ...p, is_published: e.target.checked }))}
              />
              Published (used by the assistant)
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveArticle}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
