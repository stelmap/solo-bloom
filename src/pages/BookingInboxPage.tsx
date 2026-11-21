import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ClientPicker } from "@/components/ClientPicker";
import { useClients, useCreateClient, useServices, useProfile } from "@/hooks/useData";
import { sendBookingConfirmationEmail } from "@/lib/sendBookingConfirmationEmail";
import {
  useBookingRequests, useConfirmBookingRequest,
  useDeclineBookingRequest, useLinkBookingRequestClient,
  type BookingRequestRow,
} from "@/hooks/useBookingInbox";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { Loader2, Mail, Phone, CheckCircle2, XCircle, UserPlus, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { describeError } from "@/lib/errorMessages";
import { formatWallClock } from "@/lib/timeFormat";

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  needs_linking: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  confirmed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelled_therapist: "bg-muted text-muted-foreground",
  cancelled_client: "bg-muted text-muted-foreground",
  spam: "bg-red-500/15 text-red-700 dark:text-red-400",
  expired: "bg-muted text-muted-foreground",
};

export default function BookingInboxPage() {
  const { lang, t } = useLanguage();
  // Booking slots are stored as wall-clock times labelled UTC — always render
  // them in UTC so the inbox matches the public booking page and the calendar.
  const fmt = (s: string) => formatWallClock(s, lang);

  const initialStatus = (() => {
    if (typeof window === "undefined") return "all";
    return new URLSearchParams(window.location.search).get("status") || "all";
  })();
  const [status, setStatus] = useState<string>(initialStatus);
  const { data: rows = [], isLoading, refetch, isFetching } = useBookingRequests(status);
  const { data: services = [] } = useServices();
  const { data: clients = [] } = useClients();
  const activeClients = (clients as any[]).filter((c: any) => c.status !== "archived");
  const { data: profile } = useProfile();

  const confirm = useConfirmBookingRequest();
  const decline = useDeclineBookingRequest();
  const link = useLinkBookingRequestClient();
  const createClient = useCreateClient();

  const [linkingFor, setLinkingFor] = useState<BookingRequestRow | null>(null);
  const [linkClientId, setLinkClientId] = useState<string>("");
  const [confirmingFor, setConfirmingFor] = useState<BookingRequestRow | null>(null);
  const [confirmServiceId, setConfirmServiceId] = useState<string>("");
  const [confirmClientId, setConfirmClientId] = useState<string>("");
  const [creatingFor, setCreatingFor] = useState<BookingRequestRow | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientNotes, setNewClientNotes] = useState("");

  const STATUS_OPTIONS = [
    { value: "all", label: t("bookingInbox.statusAll") },
    { value: "pending", label: t("bookingInbox.statusPending") },
    { value: "needs_linking", label: t("bookingInbox.statusNeedsLinking") },
    { value: "confirmed", label: t("bookingInbox.statusConfirmed") },
    { value: "cancelled_therapist", label: t("bookingInbox.statusDeclined") },
    { value: "spam", label: t("bookingInbox.statusSpam") },
  ];

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
      toast({ title: t("bookingInbox.toastChooseClient"), variant: "destructive" });
      return;
    }
    try {
      await confirm.mutateAsync({ id: req.id, client_id: cid, service_id: confirmServiceId || undefined });
      const emailRes = await sendBookingConfirmationEmail({
        req,
        profile,
        services: services as any[],
        serviceId: confirmServiceId || undefined,
      });
      refetch();
      if (emailRes.ok) {
        toast({ title: t("bookingInbox.toastConfirmed"), description: t("bookingInbox.confirmedEmailSentTo", { email: req.email }) });
      } else {
        toast({
          title: t("bookingInbox.toastConfirmed"),
          description: t("bookingInbox.emailFailedRetry", { email: req.email }),
          variant: "destructive",
        });
      }
      setConfirmingFor(null);
      setConfirmClientId("");
      setConfirmServiceId("");
    } catch (e: any) {
      toast({ title: t("bookingInbox.toastCouldNotConfirm"), description: describeError(e.message), variant: "destructive" });
    }
  }

  async function handleDecline(req: BookingRequestRow, reason: "cancelled_therapist" | "spam") {
    try {
      await decline.mutateAsync({ id: req.id, reason });
      toast({ title: reason === "spam" ? t("bookingInbox.toastMarkedSpam") : t("bookingInbox.toastDeclined") });
    } catch (e: any) {
      toast({ title: t("bookingInbox.toastCouldNotUpdate"), description: describeError(e.message), variant: "destructive" });
    }
  }

  async function handleLink() {
    if (!linkingFor || !linkClientId) return;
    try {
      await link.mutateAsync({ id: linkingFor.id, client_id: linkClientId });
      toast({ title: t("bookingInbox.toastLinked") });
      setLinkingFor(null);
      setLinkClientId("");
    } catch (e: any) {
      toast({ title: t("bookingInbox.toastCouldNotLink"), description: describeError(e.message), variant: "destructive" });
    }
  }

  function openCreateClient(req: BookingRequestRow) {
    setCreatingFor(req);
    setNewClientName(`${req.first_name}${req.last_name ? " " + req.last_name : ""}`.trim());
    setNewClientEmail(req.email);
    setNewClientPhone(req.phone ?? "");
    setNewClientNotes(req.comment ?? "");
  }

  async function handleCreateClientAndLink() {
    if (!creatingFor) return;
    const email = newClientEmail.trim().toLowerCase();
    if (!newClientName.trim() || !email) {
      toast({ title: t("bookingInbox.toastNameEmailReq"), variant: "destructive" });
      return;
    }
    try {
      const existing = (clients as any[]).find((c) => (c.email || "").toLowerCase() === email);
      const clientId = existing
        ? existing.id
        : (await createClient.mutateAsync({
            name: newClientName.trim(),
            email,
            phone: newClientPhone.trim() || undefined,
            notes: newClientNotes.trim() || undefined,
          })).id;
      await link.mutateAsync({ id: creatingFor.id, client_id: clientId });
      toast({
        title: existing ? t("bookingInbox.toastLinkedExisting") : t("bookingInbox.toastCreated"),
        description: existing ? t("bookingInbox.toastMatchedBy", { name: existing.name }) : undefined,
      });
      // Continue straight into confirmation so the booking itself is created
      // for the client we just linked — never leave a half-finished request.
      const req = creatingFor;
      setCreatingFor(null);
      setConfirmingFor({ ...req, client_id: clientId });
      setConfirmClientId(clientId);
      setConfirmServiceId((services as any[])[0]?.id ?? "");
    } catch (e: any) {
      toast({ title: t("bookingInbox.toastCouldNotCreate"), description: describeError(e.message), variant: "destructive" });
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("bookingInbox.title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("bookingInbox.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> {t("bookingInbox.refresh")}
            </Button>
          </div>
        </div>

        {(counts.pending > 0 || counts.needs_linking > 0) && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex-1 text-sm">
              <span className="font-semibold text-foreground">{t("bookingInbox.actionNeeded")}</span>{" "}
              <span className="text-muted-foreground">
                {counts.pending > 0 && (counts.pending === 1 ? t("bookingInbox.pendingOne") : t("bookingInbox.pendingMany", { count: counts.pending }))}
                {counts.pending > 0 && counts.needs_linking > 0 && " · "}
                {counts.needs_linking > 0 && (counts.needs_linking === 1 ? t("bookingInbox.needLinkingOne") : t("bookingInbox.needLinkingMany", { count: counts.needs_linking }))}
              </span>
            </div>
            {status !== "pending" && counts.pending > 0 && (
              <Button size="sm" variant="outline" onClick={() => setStatus("pending")}>
                {t("bookingInbox.showPending")}
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
                <TableHead className="w-[160px]">{t("bookingInbox.colSlot")}</TableHead>
                <TableHead>{t("bookingInbox.colRequester")}</TableHead>
                <TableHead>{t("bookingInbox.colMatched")}</TableHead>
                <TableHead>{t("bookingInbox.colComment")}</TableHead>
                <TableHead className="w-[130px]">{t("bookingInbox.colStatus")}</TableHead>
                <TableHead className="w-[260px] text-right">{t("bookingInbox.colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> {t("bookingInbox.loading")}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    {t("bookingInbox.empty")}
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
                            <Sparkles className="h-2.5 w-2.5" /> {t("bookingInbox.newBadge")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{t("bookingInbox.minutes", { count: r.duration_minutes })}</div>
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
                        <span className="text-xs text-muted-foreground">{t("bookingInbox.notLinked")}</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top max-w-xs">
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {r.comment || <span className="text-muted-foreground">—</span>}
                      </p>
                    </TableCell>
                    <TableCell className="align-top">
                      <span className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status] ?? ""}`}>
                        {t(`bookingInbox.status.${r.status}`)}
                      </span>
                      <div className="text-[11px] text-muted-foreground mt-1">{fmt(r.created_at)}</div>
                    </TableCell>
                    <TableCell className="align-top text-right">
                      {actionable ? (
                        <div className="flex justify-end gap-1 flex-wrap">
                          {r.status === "needs_linking" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => { setLinkingFor(r); setLinkClientId(""); }}
                              >
                                <UserPlus className="h-3.5 w-3.5" /> {t("bookingInbox.actLink")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => openCreateClient(r)}
                              >
                                <UserPlus className="h-3.5 w-3.5" /> {t("bookingInbox.actCreateNew")}
                              </Button>
                            </>
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
                            <CheckCircle2 className="h-3.5 w-3.5" /> {t("bookingInbox.actConfirm")}
                          </Button>
                          <Button size="sm" variant="ghost" aria-label={t("bookingInbox.statusDeclined")} onClick={() => handleDecline(r, "cancelled_therapist")}>
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
            <DialogTitle>{t("bookingInbox.linkTitle")}</DialogTitle>
            <DialogDescription>
              {linkingFor && (
                <>
                  {t("bookingInbox.requesterLbl")} <strong>{linkingFor.first_name} {linkingFor.last_name ?? ""}</strong> ({linkingFor.email})
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <ClientPicker
              clients={activeClients as any}
              value={linkClientId}
              onChange={setLinkClientId}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkingFor(null)}>{t("bookingInbox.cancel")}</Button>
            <Button disabled={!linkClientId || link.isPending} onClick={handleLink}>
              {link.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("bookingInbox.linkBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <Dialog open={!!confirmingFor} onOpenChange={(o) => !o && setConfirmingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("bookingInbox.confirmTitle")}</DialogTitle>
            <DialogDescription>
              {confirmingFor && t("bookingInbox.confirmDesc", { slot: fmt(confirmingFor.requested_slot_at) })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {confirmingFor && !confirmingFor.client_id && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t("bookingInbox.clientLbl")}</label>
                <ClientPicker
                  clients={activeClients as any}
                  value={confirmClientId}
                  onChange={setConfirmClientId}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 mt-1"
                  onClick={() => {
                    const req = confirmingFor;
                    setConfirmingFor(null);
                    openCreateClient(req);
                  }}
                >
                  <UserPlus className="h-3.5 w-3.5" /> {t("bookingInbox.actCreateNew")}
                </Button>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("bookingInbox.serviceLbl")}</label>
              <Select value={confirmServiceId} onValueChange={setConfirmServiceId}>
                <SelectTrigger><SelectValue placeholder={t("bookingInbox.pickService")} /></SelectTrigger>
                <SelectContent>
                  {(services as any[]).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingFor(null)}>{t("bookingInbox.cancel")}</Button>
            <Button
              disabled={confirm.isPending}
              onClick={() => confirmingFor && handleConfirm(confirmingFor)}
            >
              {confirm.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("bookingInbox.confirmBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create new client from request */}
      <Dialog open={!!creatingFor} onOpenChange={(o) => !o && setCreatingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("bookingInbox.createTitle")}</DialogTitle>
            <DialogDescription>{t("bookingInbox.createDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("bookingInbox.nameLbl")}</label>
              <Input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("bookingInbox.emailLbl")}</label>
              <Input type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("bookingInbox.phoneLbl")}</label>
              <Input value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t("bookingInbox.notesLbl")}</label>
              <Textarea rows={3} value={newClientNotes} onChange={(e) => setNewClientNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatingFor(null)}>{t("bookingInbox.cancel")}</Button>
            <Button disabled={createClient.isPending || link.isPending} onClick={handleCreateClientAndLink}>
              {(createClient.isPending || link.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("bookingInbox.createBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
