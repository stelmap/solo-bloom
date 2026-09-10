import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, ShieldCheck, Star } from "lucide-react";

type ModerationStatus = "pending" | "approved" | "rejected" | "hidden" | "deleted" | "spam";
type VerificationStatus = "verified_user" | "not_verified" | "verification_failed";

type Review = {
  id: string;
  created_at: string;
  display_name: string;
  email: string;
  profession: string;
  plan: string | null;
  rating: number;
  body: string;
  language: string | null;
  verification_status: VerificationStatus;
  verified_records_count: number;
  verification_checked_at: string | null;
  moderation_status: ModerationStatus;
  published_at: string | null;
  admin_reply: string | null;
  admin_reply_at: string | null;
};

type HistoryRow = {
  id: string;
  created_at: string;
  from_status: string | null;
  to_status: string;
  action: string;
  note: string | null;
};

const MOD_LABEL: Record<ModerationStatus, string> = {
  pending: "Очікує модерації",
  approved: "Опубліковано",
  rejected: "Відхилено",
  hidden: "Приховано",
  deleted: "Видалено",
  spam: "Спам",
};

const VER_LABEL: Record<VerificationStatus, string> = {
  verified_user: "Підтверджений користувач",
  not_verified: "Не підтверджено",
  verification_failed: "Перевірка не пройдена",
};

const PLAN_LABEL: Record<string, string> = {
  free_starter: "Free Starter",
  solo_practice: "Solo Practice",
  pro_practice: "Pro Practice",
  unknown: "Не вказано",
};

function fmt(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("uk-UA", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return s;
  }
}

export default function AdminReviewsPage() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Review[]>([]);
  const [busy, setBusy] = useState(false);
  const [modFilter, setModFilter] = useState("pending");
  const [verFilter, setVerFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Review | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [reply, setReply] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Review | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(Boolean(data));
    });
  }, [user]);

  const load = useCallback(async () => {
    if (isAdmin !== true) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("admin_list_reviews");
    setBusy(false);
    if (error) {
      toast({ title: "Не вдалося завантажити відгуки", description: error.message, variant: "destructive" });
      return;
    }
    setRows((data ?? []) as Review[]);
  }, [isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (modFilter !== "all" && r.moderation_status !== modFilter) return false;
      if (verFilter !== "all" && r.verification_status !== verFilter) return false;
      if (ratingFilter !== "all" && String(r.rating) !== ratingFilter) return false;
      if (planFilter !== "all" && (r.plan ?? "unknown") !== planFilter) return false;
      if (from && new Date(r.created_at) < new Date(from)) return false;
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (new Date(r.created_at) > end) return false;
      }
      if (s && ![r.display_name, r.email].some((v) => v.toLowerCase().includes(s))) return false;
      return true;
    });
  }, [rows, modFilter, verFilter, ratingFilter, planFilter, from, to, search]);

  const openDetail = async (r: Review) => {
    setSelected(r);
    setReply(r.admin_reply ?? "");
    setHistory([]);
    const { data } = await (supabase as any).rpc("admin_list_review_history", { p_review_id: r.id });
    setHistory((data ?? []) as HistoryRow[]);
  };

  const notify = async (review: Review, kind: "approved" | "rejected") => {
    try {
      await supabase.functions.invoke("notify-review-status", {
        body: { reviewId: review.id, kind },
      });
    } catch {
      /* email failure must not block moderation */
    }
  };

  const act = async (review: Review, action: string, notifyUser = false) => {
    setActing(true);
    const { data, error } = await (supabase as any).rpc("admin_update_review", {
      p_review_id: review.id,
      p_action: action,
    });
    setActing(false);
    if (error) {
      toast({ title: "Дію не виконано", description: error.message, variant: "destructive" });
      return;
    }
    const updated = data as Review;
    setRows((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    if (selected?.id === updated.id) void openDetail(updated);
    if (notifyUser && (action === "approve" || action === "reject")) {
      void notify(updated, action === "approve" ? "approved" : "rejected");
    }
    toast({ title: "Готово", description: MOD_LABEL[updated.moderation_status] });
  };

  const saveReply = async () => {
    if (!selected) return;
    setActing(true);
    const { data, error } = await (supabase as any).rpc("admin_set_review_reply", {
      p_review_id: selected.id,
      p_reply: reply.trim() ? reply.trim() : null,
    });
    setActing(false);
    if (error) {
      toast({ title: "Не вдалося зберегти відповідь", description: error.message, variant: "destructive" });
      return;
    }
    const updated = data as Review;
    setRows((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    setSelected(updated);
    toast({ title: reply.trim() ? "Відповідь збережено" : "Відповідь видалено" });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Перевірка доступу…
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Доступ лише для адміністраторів.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Відгуки</h1>
            <p className="text-sm text-muted-foreground">Модерація відгуків користувачів SoloBizz.</p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={busy} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Оновити
          </Button>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs">Статус модерації</Label>
            <Select value={modFilter} onValueChange={setModFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Усі</SelectItem>
                {(Object.keys(MOD_LABEL) as ModerationStatus[]).map((k) => (
                  <SelectItem key={k} value={k}>{MOD_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Перевірка користувача</Label>
            <Select value={verFilter} onValueChange={setVerFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Усі</SelectItem>
                {(Object.keys(VER_LABEL) as VerificationStatus[]).map((k) => (
                  <SelectItem key={k} value={k}>{VER_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Оцінка</Label>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Усі</SelectItem>
                {[5, 4, 3, 2, 1].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} ★</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Тариф</Label>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Усі</SelectItem>
                {Object.keys(PLAN_LABEL).map((k) => (
                  <SelectItem key={k} value={k}>{PLAN_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Від</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">До</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Пошук за ім’ям або email</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Пошук…" />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Ім’я</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Професія</TableHead>
                <TableHead>Тариф</TableHead>
                <TableHead>Оцінка</TableHead>
                <TableHead>Відгук</TableHead>
                <TableHead>Перевірка</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Публікація</TableHead>
                <TableHead className="text-right">Дії</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                    Відгуків не знайдено.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{fmt(r.created_at)}</TableCell>
                    <TableCell className="font-medium">{r.display_name}</TableCell>
                    <TableCell className="text-xs">{r.email}</TableCell>
                    <TableCell className="text-xs">{r.profession}</TableCell>
                    <TableCell className="text-xs">{PLAN_LABEL[r.plan ?? "unknown"] ?? r.plan}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-sm">
                        {r.rating} <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">{r.body}</TableCell>
                    <TableCell>
                      {r.verification_status === "verified_user" ? (
                        <Badge className="gap-1"><ShieldCheck className="h-3 w-3" /> Підтверджено</Badge>
                      ) : (
                        <Badge variant="outline">{VER_LABEL[r.verification_status]}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.moderation_status === "approved" ? "default" : "secondary"}>
                        {MOD_LABEL[r.moderation_status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{fmt(r.published_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => void openDetail(r)}>Відкрити</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Відгук — {selected.display_name}</DialogTitle>
                <DialogDescription>
                  {selected.profession} · {PLAN_LABEL[selected.plan ?? "unknown"]} · {selected.rating} ★
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <p className="whitespace-pre-line rounded-xl bg-muted/50 p-4">{selected.body}</p>

                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div><dt className="text-muted-foreground">Email</dt><dd>{selected.email}</dd></div>
                  <div><dt className="text-muted-foreground">Мова</dt><dd>{selected.language ?? "—"}</dd></div>
                  <div><dt className="text-muted-foreground">Надіслано</dt><dd>{fmt(selected.created_at)}</dd></div>
                  <div><dt className="text-muted-foreground">Опубліковано</dt><dd>{fmt(selected.published_at)}</dd></div>
                  <div><dt className="text-muted-foreground">Перевірка</dt><dd>{VER_LABEL[selected.verification_status]}</dd></div>
                  <div><dt className="text-muted-foreground">Записів на момент перевірки</dt><dd>{selected.verified_records_count}</dd></div>
                  <div><dt className="text-muted-foreground">Дата перевірки</dt><dd>{fmt(selected.verification_checked_at)}</dd></div>
                  <div><dt className="text-muted-foreground">Статус</dt><dd>{MOD_LABEL[selected.moderation_status]}</dd></div>
                </dl>

                <div className="space-y-2">
                  <Label htmlFor="admin-reply">Відповідь SoloBizz</Label>
                  <Textarea id="admin-reply" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} />
                  <Button size="sm" variant="outline" onClick={() => void saveReply()} disabled={acting}>
                    Зберегти відповідь
                  </Button>
                </div>

                <div>
                  <h4 className="mb-2 font-semibold">Історія статусів</h4>
                  {history.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Змін ще не було.</p>
                  ) : (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {history.map((h) => (
                        <li key={h.id}>
                          {fmt(h.created_at)} — {h.from_status ?? "—"} → {h.to_status} ({h.action})
                          {h.note ? ` · ${h.note}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <DialogFooter className="flex-wrap gap-2 sm:justify-start">
                <Button size="sm" disabled={acting} onClick={() => void act(selected, "approve", true)}>
                  Схвалити та опублікувати
                </Button>
                <Button size="sm" variant="outline" disabled={acting} onClick={() => void act(selected, "reject", true)}>
                  Відхилити та повідомити
                </Button>
                <Button size="sm" variant="outline" disabled={acting} onClick={() => void act(selected, "reject")}>
                  Відхилити без листа
                </Button>
                <Button size="sm" variant="outline" disabled={acting} onClick={() => void act(selected, "hide")}>
                  Приховати із сайту
                </Button>
                <Button size="sm" variant="outline" disabled={acting} onClick={() => void act(selected, "restore")}>
                  Повернути на сайт
                </Button>
                <Button size="sm" variant="outline" disabled={acting} onClick={() => void act(selected, "spam")}>
                  Позначити як спам
                </Button>
                <Button size="sm" variant="destructive" disabled={acting} onClick={() => setConfirmDelete(selected)}>
                  Видалити
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити відгук?</AlertDialogTitle>
            <AlertDialogDescription>
              Відгук більше не показуватиметься на сайті. Цю дію не можна скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) void act(confirmDelete, "delete");
                setConfirmDelete(null);
                setSelected(null);
              }}
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
