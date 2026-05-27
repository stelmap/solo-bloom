import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-time-picker";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Mail, Phone, Send } from "lucide-react";

type BookingRequest = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  language: string | null;
  source: string | null;
  status: "new" | "in_progress" | "done" | "archived";
  created_at: string;
};

const STATUSES = [
  { value: "all", label: "Усі" },
  { value: "new", label: "Нові" },
  { value: "in_progress", label: "В роботі" },
  { value: "done", label: "Завершено" },
  { value: "archived", label: "Архів" },
] as const;

const STATUS_VARIANT: Record<BookingRequest["status"], "default" | "secondary" | "outline"> = {
  new: "default",
  in_progress: "secondary",
  done: "outline",
  archived: "outline",
};

const STATUS_LABEL: Record<BookingRequest["status"], string> = {
  new: "Нова",
  in_progress: "В роботі",
  done: "Завершено",
  archived: "Архів",
};

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString("uk-UA", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return s;
  }
}

type EmailStatus = {
  status: string;
  error_message: string | null;
  created_at: string;
};

export default function AdminBookingRequestsPage() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<BookingRequest[]>([]);
  const [emailByBookingId, setEmailByBookingId] = useState<Record<string, EmailStatus>>({});
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(Boolean(data));
    });
  }, [user]);

  const load = useMemo(
    () => async () => {
      if (isAdmin !== true) return;
      setBusy(true);
      const params: Record<string, unknown> = {
        p_status: statusFilter === "all" ? null : statusFilter,
        p_from: from ? new Date(from).toISOString() : null,
        p_to: null as string | null,
      };
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        params.p_to = end.toISOString();
      }
      const { data, error } = await (supabase as any).rpc("admin_list_booking_requests", params);
      if (error) {
        setBusy(false);
        toast({ title: "Не вдалося завантажити заявки", description: error.message, variant: "destructive" });
        return;
      }
      const list = (data ?? []) as BookingRequest[];
      setRows(list);

      // Fetch email statuses via admin-gated RPC
      if (list.length > 0) {
        const { data: logs } = await (supabase as any).rpc("admin_list_booking_email_logs", {
          p_ids: list.map((r) => r.id),
        });
        const map: Record<string, EmailStatus> = {};
        ((logs ?? []) as any[]).forEach((l) => {
          if (l.message_id && !map[l.message_id]) {
            map[l.message_id] = {
              status: l.status,
              error_message: l.error_message,
              created_at: l.created_at,
            };
          }
        });
        setEmailByBookingId(map);
      } else {
        setEmailByBookingId({});
      }
      setBusy(false);
    },
    [isAdmin, statusFilter, from, to],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.name, r.email, r.phone ?? "", r.message ?? ""].some((v) => v.toLowerCase().includes(s)),
    );
  }, [rows, search]);

  const updateStatus = async (id: string, status: BookingRequest["status"]) => {
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    const { error } = await (supabase as any).rpc("admin_update_booking_request_status", {
      p_id: id,
      p_status: status,
    });
    if (error) {
      setRows(prev);
      toast({ title: "Помилка оновлення", description: error.message, variant: "destructive" });
    }
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
    <div className="min-h-screen bg-background px-4 sm:px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Заявки з форми бронювання</h1>
            <p className="text-sm text-muted-foreground">Перегляд та керування заявками з лендингу.</p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={busy} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Оновити
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div>
            <Label className="text-xs">Статус</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
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
          <div>
            <Label className="text-xs">Пошук</Label>
            <Input
              placeholder="Ім'я, email, телефон, текст…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="text-xs text-muted-foreground mb-2">
          Показано {filtered.length} з {rows.length}
        </div>

        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Дата</TableHead>
                <TableHead>Контакт</TableHead>
                <TableHead>Повідомлення</TableHead>
                <TableHead className="w-[90px]">Мова</TableHead>
                <TableHead className="w-[150px]">Email</TableHead>
                <TableHead className="w-[170px]">Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && !busy && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Немає заявок за вибраними фільтрами.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-muted-foreground align-top">{fmtDate(r.created_at)}</TableCell>
                  <TableCell className="align-top">
                    <div className="font-medium">{r.name}</div>
                    <a href={`mailto:${r.email}`} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {r.email}
                    </a>
                    {r.phone && (
                      <div>
                        <a href={`tel:${r.phone}`} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {r.phone}
                        </a>
                      </div>
                    )}
                    {r.source && (
                      <div className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                        <Send className="h-3 w-3" /> {r.source}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="align-top max-w-md">
                    <p className="text-sm whitespace-pre-wrap break-words">{r.message || <span className="text-muted-foreground">—</span>}</p>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="outline">{(r.language || "—").toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="align-top">
                    {(() => {
                      const e = emailByBookingId[`booking-${r.id}`];
                      if (!e) return <span className="text-xs text-muted-foreground">—</span>;
                      const tone =
                        e.status === "sent"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : e.status === "pending"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          : "bg-red-500/15 text-red-700 dark:text-red-400";
                      return (
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-medium ${tone}`}>
                            {e.status}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{fmtDate(e.created_at)}</span>
                          {e.error_message && (
                            <span className="text-[11px] text-red-600 break-words" title={e.error_message}>
                              {e.error_message.slice(0, 60)}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-1">
                      <Badge variant={STATUS_VARIANT[r.status]} className="w-fit">{STATUS_LABEL[r.status]}</Badge>
                      <Select
                        value={r.status}
                        onValueChange={(v) => updateStatus(r.id, v as BookingRequest["status"])}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">Нова</SelectItem>
                          <SelectItem value="in_progress">В роботі</SelectItem>
                          <SelectItem value="done">Завершено</SelectItem>
                          <SelectItem value="archived">Архів</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
