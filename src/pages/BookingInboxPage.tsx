import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { ClientPicker } from "@/components/ClientPicker";
import { useClients, useServices } from "@/hooks/useData";
import {
  useBookingRequests, useConfirmBookingRequest,
  useDeclineBookingRequest, useLinkBookingRequestClient,
  type BookingRequestRow,
} from "@/hooks/useBookingInbox";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, Phone, CheckCircle2, XCircle, UserPlus, RefreshCw, AlertCircle, Sparkles } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "needs_linking", label: "Needs linking" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled_therapist", label: "Declined" },
  { value: "spam", label: "Spam" },
] as const;

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  needs_linking: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  confirmed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelled_therapist: "bg-muted text-muted-foreground",
  cancelled_client: "bg-muted text-muted-foreground",
  spam: "bg-red-500/15 text-red-700 dark:text-red-400",
  expired: "bg-muted text-muted-foreground",
};

function fmt(s: string) {
  try { return new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
  catch { return s; }
}

export default function BookingInboxPage() {
  const [status, setStatus] = useState<string>("all");
  const { data: rows = [], isLoading, refetch, isFetching } = useBookingRequests(status);
  const { data: services = [] } = useServices();
  const { data: clients = [] } = useClients();

  const confirm = useConfirmBookingRequest();
  const decline = useDeclineBookingRequest();
  const link = useLinkBookingRequestClient();

  const [linkingFor, setLinkingFor] = useState<BookingRequestRow | null>(null);
  const [linkClientId, setLinkClientId] = useState<string>("");
  const [confirmingFor, setConfirmingFor] = useState<BookingRequestRow | null>(null);
  const [confirmServiceId, setConfirmServiceId] = useState<string>("");
  const [confirmClientId, setConfirmClientId] = useState<string>("");

  const counts = useMemo(() => {
    const c = { pending: 0, needs_linking: 0 };
    rows.forEach((r) => {
      if (r.status === "pending") c.pending++;
      if (r.status === "needs_linking") c.needs_linking++;
    });
    return c;
  }, [rows]);

  async function handleConfirm(req: BookingRequestRow) {
    const cid = req.client_id ?? confirmClientId;
    if (!cid) {
      toast({ title: "Choose a client to confirm", variant: "destructive" });
      return;
    }
    try {
      await confirm.mutateAsync({ id: req.id, client_id: cid, service_id: confirmServiceId || undefined });
      toast({ title: "Booking confirmed" });
      setConfirmingFor(null);
      setConfirmClientId("");
      setConfirmServiceId("");
    } catch (e: any) {
      toast({ title: "Could not confirm", description: e.message, variant: "destructive" });
    }
  }

  async function handleDecline(req: BookingRequestRow, reason: "cancelled_therapist" | "spam") {
    try {
      await decline.mutateAsync({ id: req.id, reason });
      toast({ title: reason === "spam" ? "Marked as spam" : "Declined" });
    } catch (e: any) {
      toast({ title: "Could not update", description: e.message, variant: "destructive" });
    }
  }

  async function handleLink() {
    if (!linkingFor || !linkClientId) return;
    try {
      await link.mutateAsync({ id: linkingFor.id, client_id: linkClientId });
      toast({ title: "Client linked" });
      setLinkingFor(null);
      setLinkClientId("");
    } catch (e: any) {
      toast({ title: "Could not link", description: e.message, variant: "destructive" });
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Booking inbox</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Incoming requests from your public booking link.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        {(counts.pending > 0 || counts.needs_linking > 0) && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex-1 text-sm">
              <span className="font-semibold text-foreground">Action needed.</span>{" "}
              <span className="text-muted-foreground">
                {counts.pending > 0 && (
                  <>
                    <span className="font-medium text-foreground">{counts.pending}</span> new request{counts.pending === 1 ? "" : "s"} to review
                  </>
                )}
                {counts.pending > 0 && counts.needs_linking > 0 && " · "}
                {counts.needs_linking > 0 && (
                  <>
                    <span className="font-medium text-foreground">{counts.needs_linking}</span> need client linking
                  </>
                )}
              </span>
            </div>
            {status !== "pending" && counts.pending > 0 && (
              <Button size="sm" variant="outline" onClick={() => setStatus("pending")}>
                Show pending
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Requested slot</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Matched client</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead className="w-[130px]">Status</TableHead>
                <TableHead className="w-[260px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    No booking requests.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const actionable = r.status === "pending" || r.status === "needs_linking";
                const isNew = r.status === "pending" && (Date.now() - new Date(r.created_at).getTime()) < 24 * 60 * 60 * 1000;
                return (
                  <TableRow
                    key={r.id}
                    className={actionable ? "bg-amber-500/[0.04] border-l-2 border-l-amber-500 hover:bg-amber-500/[0.07]" : ""}
                  >
                    <TableCell className="align-top">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">{fmt(r.requested_slot_at)}</div>
                        {isNew && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                            <Sparkles className="h-2.5 w-2.5" /> New
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{r.duration_minutes} min</div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="font-medium">
                        {r.first_name} {r.last_name ?? ""}
                      </div>
                      <a href={`mailto:${r.email}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {r.email}
                      </a>
                      {r.phone && (
                        <div>
                          <a href={`tel:${r.phone}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {r.phone}
                          </a>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      {r.matched_client_name ? (
                        <span className="text-sm">{r.matched_client_name}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not linked</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top max-w-xs">
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {r.comment || <span className="text-muted-foreground">—</span>}
                      </p>
                    </TableCell>
                    <TableCell className="align-top">
                      <span className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status] ?? ""}`}>
                        {r.status.replace("_", " ")}
                      </span>
                      <div className="text-[11px] text-muted-foreground mt-1">{fmt(r.created_at)}</div>
                    </TableCell>
                    <TableCell className="align-top text-right">
                      {actionable ? (
                        <div className="flex justify-end gap-1 flex-wrap">
                          {r.status === "needs_linking" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => { setLinkingFor(r); setLinkClientId(""); }}
                            >
                              <UserPlus className="h-3.5 w-3.5" /> Link
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              setConfirmingFor(r);
                              setConfirmClientId(r.client_id ?? "");
                              setConfirmServiceId(services[0]?.id ?? "");
                            }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDecline(r, "cancelled_therapist")}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Link client dialog */}
      <Dialog open={!!linkingFor} onOpenChange={(o) => !o && setLinkingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach client to request</DialogTitle>
            <DialogDescription>
              {linkingFor && (
                <>
                  Requester: <strong>{linkingFor.first_name} {linkingFor.last_name ?? ""}</strong> ({linkingFor.email})
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <ClientPicker
              clients={clients as any}
              value={linkClientId}
              onChange={setLinkClientId}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkingFor(null)}>Cancel</Button>
            <Button disabled={!linkClientId || link.isPending} onClick={handleLink}>
              {link.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Link client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <Dialog open={!!confirmingFor} onOpenChange={(o) => !o && setConfirmingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm booking</DialogTitle>
            <DialogDescription>
              {confirmingFor && (
                <>This will create an appointment on <strong>{fmt(confirmingFor.requested_slot_at)}</strong>.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {confirmingFor && !confirmingFor.client_id && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Client</label>
                <ClientPicker
                  clients={clients as any}
                  value={confirmClientId}
                  onChange={setConfirmClientId}
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Service</label>
              <Select value={confirmServiceId} onValueChange={setConfirmServiceId}>
                <SelectTrigger><SelectValue placeholder="Pick a service" /></SelectTrigger>
                <SelectContent>
                  {(services as any[]).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingFor(null)}>Cancel</Button>
            <Button
              disabled={confirm.isPending}
              onClick={() => confirmingFor && handleConfirm(confirmingFor)}
            >
              {confirm.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
