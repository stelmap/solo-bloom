import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ClientPicker } from "@/components/ClientPicker";
import { useClients, useServices, useCreateClient, useProfile } from "@/hooks/useData";
import {
  useBookingRequests, useConfirmBookingRequest,
  useDeclineBookingRequest, useLinkBookingRequestClient,
  type BookingRequestRow,
} from "@/hooks/useBookingInbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Mail, Phone, CheckCircle2, XCircle, UserPlus,
  RefreshCw, Inbox, ChevronDown, ChevronUp, MailCheck, MailX, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";


function fmt(s: string) {
  try { return new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
  catch { return s; }
}

export function BookingInboxPanel({ className }: { className?: string }) {
  const { data: rows = [], isLoading, refetch, isFetching } = useBookingRequests();
  const { data: services = [] } = useServices();
  const { data: clients = [] } = useClients();
  const { data: profile } = useProfile();
  const createClient = useCreateClient();

  const pending = useMemo(
    () => rows.filter((r) => r.status === "pending" || r.status === "needs_linking"),
    [rows],
  );
  // Surface the most recently confirmed requests so therapists can see
  // delivery status of the confirmation email and resend if needed.
  const recentlyConfirmed = useMemo(
    () => rows.filter((r) => r.status === "confirmed").slice(0, 5),
    [rows],
  );

  const confirm = useConfirmBookingRequest();
  const decline = useDeclineBookingRequest();
  const link = useLinkBookingRequestClient();

  const [linkingFor, setLinkingFor] = useState<BookingRequestRow | null>(null);
  const [linkClientId, setLinkClientId] = useState<string>("");
  const [confirmingFor, setConfirmingFor] = useState<BookingRequestRow | null>(null);
  const [confirmServiceId, setConfirmServiceId] = useState<string>("");
  const [confirmClientId, setConfirmClientId] = useState<string>("");
  const [collapsedMobile, setCollapsedMobile] = useState(true);

  // Create-client-from-request dialog state
  const [creatingFor, setCreatingFor] = useState<BookingRequestRow | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientNotes, setNewClientNotes] = useState("");

  async function sendConfirmationEmail(
    req: BookingRequestRow,
    serviceId?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    let result: { ok: boolean; error?: string };
    try {
      const slot = new Date(req.requested_slot_at);
      const lang = (profile as any)?.language || "en";
      const dateFmt = slot.toLocaleDateString(lang, { year: "numeric", month: "long", day: "numeric" });
      const timeFmt = slot.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
      const therapistName =
        (profile as any)?.business_name ||
        (profile as any)?.full_name ||
        "your specialist";
      const serviceName =
        (services as any[]).find((s) => s.id === serviceId)?.name ||
        undefined;
      const clientName =
        `${req.first_name}${req.last_name ? " " + req.last_name : ""}`.trim() || "Client";

      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "booking-confirmation",
          recipientEmail: req.email,
          // Stable per-request key — system de-duplicates so multiple confirms
          // (e.g. after refresh) won't trigger a second email.
          idempotencyKey: `booking-confirm-${req.id}`,
          templateData: {
            clientName,
            specialistName: therapistName,
            sessionDate: dateFmt,
            sessionTime: timeFmt,
            serviceName,
            language: lang,
          },
        },
      });
      if (error) {
        console.warn("booking-confirmation email failed", error);
        result = { ok: false, error: error.message || "Email send failed" };
      } else {
        result = { ok: true };
      }
    } catch (e: any) {
      console.warn("booking-confirmation email failed", e);
      result = { ok: false, error: e?.message || "Email send failed" };
    }

    // Persist delivery status on the request row so the inbox can show
    // it later (and the therapist can resend if it failed).
    try {
      await (supabase as any)
        .from("session_booking_requests")
        .update({
          confirmation_email_status: result.ok ? "sent" : "failed",
          confirmation_email_sent_at: result.ok ? new Date().toISOString() : null,
          confirmation_email_error: result.ok ? null : (result.error ?? "Unknown error"),
        })
        .eq("id", req.id);
    } catch (e) {
      console.warn("Could not persist email status", e);
    }
    refetch();
    return result;
  }

  async function resendConfirmationEmail(req: BookingRequestRow) {
    const res = await sendConfirmationEmail(req);
    if (res.ok) {
      toast({ title: "Confirmation email sent", description: `Sent to ${req.email}` });
    } else {
      toast({
        title: "Confirmation email failed",
        description: res.error,
        variant: "destructive",
      });
    }
  }

  async function handleConfirm(req: BookingRequestRow) {
    const cid = req.client_id ?? confirmClientId;
    if (!cid) {
      toast({ title: "Choose a client to confirm", variant: "destructive" });
      return;
    }
    try {
      await confirm.mutateAsync({ id: req.id, client_id: cid, service_id: confirmServiceId || undefined });
      // Notify the client at the exact email from the request, and surface
      // delivery status so the therapist knows whether the email went out.
      const emailRes = await sendConfirmationEmail(req, confirmServiceId || undefined);
      if (emailRes.ok) {
        toast({
          title: "Booking confirmed",
          description: `Confirmation email sent to ${req.email}`,
        });
      } else {
        toast({
          title: "Booking confirmed — but email failed",
          description: `Could not send confirmation to ${req.email}. ${emailRes.error ?? ""}`.trim(),
          variant: "destructive",
        });
      }
      setConfirmingFor(null); setConfirmClientId(""); setConfirmServiceId("");
    } catch (e: any) {
      toast({ title: "Could not confirm", description: e.message, variant: "destructive" });
    }
  }

  async function handleDecline(req: BookingRequestRow) {
    try {
      await decline.mutateAsync({ id: req.id, reason: "cancelled_therapist" });
      toast({ title: "Declined" });
    } catch (e: any) {
      toast({ title: "Could not decline", description: e.message, variant: "destructive" });
    }
  }

  async function handleLink() {
    if (!linkingFor || !linkClientId) return;
    try {
      await link.mutateAsync({ id: linkingFor.id, client_id: linkClientId });
      toast({ title: "Client linked" });
      setLinkingFor(null); setLinkClientId("");
    } catch (e: any) {
      toast({ title: "Could not link", description: e.message, variant: "destructive" });
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
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    try {
      // De-dup guard: if a client with this email already exists, link instead of creating
      const existing = (clients as any[]).find(
        (c) => (c.email || "").toLowerCase() === email,
      );
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
        title: existing ? "Linked to existing client" : "Client created and linked",
        description: existing ? `Matched ${existing.name} by email` : undefined,
      });
      setCreatingFor(null);
    } catch (e: any) {
      toast({ title: "Could not create client", description: e.message, variant: "destructive" });
    }
  }


  return (
    <aside className={cn("bg-card rounded-xl border border-border flex flex-col", className)}>
      <header className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Inbox className="h-4 w-4 text-primary" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Booking inbox</h2>
          <p className="text-xs text-muted-foreground">
            {pending.length === 0 ? "No pending requests" : `${pending.length} pending`}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 lg:hidden"
          aria-label={collapsedMobile ? "Expand" : "Collapse"}
          onClick={() => setCollapsedMobile((v) => !v)}
        >
          {collapsedMobile ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </header>

      <div className={cn(
        "flex-1 overflow-y-auto p-3 space-y-2",
        collapsedMobile ? "hidden lg:block" : "block",
      )}>
        {isLoading && (
          <div className="text-center text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
          </div>
        )}
        {!isLoading && pending.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            <Inbox className="h-6 w-6 mx-auto mb-2 opacity-40" />
            You're all caught up.
          </div>
        )}
        {pending.map((r) => (
          <div
            key={r.id}
            className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {r.first_name} {r.last_name ?? ""}
                </p>
                <p className="text-xs text-muted-foreground">{fmt(r.requested_slot_at)} · {r.duration_minutes}m</p>
              </div>
              {r.status === "needs_linking" && (
                <span className="text-[10px] font-semibold uppercase tracking-wide rounded bg-orange-500/15 text-orange-700 dark:text-orange-400 px-1.5 py-0.5">
                  Link
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <a href={`mailto:${r.email}`} className="hover:text-foreground inline-flex items-center gap-1">
                <Mail className="h-3 w-3" /> {r.email}
              </a>
              {r.phone && (
                <div>
                  <a href={`tel:${r.phone}`} className="hover:text-foreground inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {r.phone}
                  </a>
                </div>
              )}
              {r.matched_client_name && (
                <p className="text-foreground/80">Matched: {r.matched_client_name}</p>
              )}
            </div>
            {r.comment && (
              <p className="text-xs whitespace-pre-wrap break-words bg-background/60 rounded p-2 border border-border">
                {r.comment}
              </p>
            )}
            <div className="flex flex-wrap gap-1 pt-1">
              {r.status === "needs_linking" && (
                <>
                  <Button size="sm" variant="outline" className="h-7 px-2 gap-1"
                    onClick={() => { setLinkingFor(r); setLinkClientId(""); }}>
                    <UserPlus className="h-3 w-3" /> Link
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 gap-1"
                    onClick={() => openCreateClient(r)}>
                    <UserPlus className="h-3 w-3" /> Create new
                  </Button>
                </>
              )}
              <Button size="sm" className="h-7 px-2 gap-1 flex-1"
                onClick={() => {
                  setConfirmingFor(r);
                  setConfirmClientId(r.client_id ?? "");
                  setConfirmServiceId((services as any[])[0]?.id ?? "");
                }}>
                <CheckCircle2 className="h-3 w-3" /> Approve
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleDecline(r)}>
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            </div>

          </div>
        ))}
      </div>

      {/* Link client */}
      <Dialog open={!!linkingFor} onOpenChange={(o) => !o && setLinkingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach client to request</DialogTitle>
            <DialogDescription>
              {linkingFor && (<>Requester: <strong>{linkingFor.first_name} {linkingFor.last_name ?? ""}</strong> ({linkingFor.email})</>)}
            </DialogDescription>
          </DialogHeader>
          <ClientPicker clients={clients as any} value={linkClientId} onChange={setLinkClientId} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkingFor(null)}>Cancel</Button>
            <Button disabled={!linkClientId || link.isPending} onClick={handleLink}>
              {link.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Link client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm */}
      <Dialog open={!!confirmingFor} onOpenChange={(o) => !o && setConfirmingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm booking</DialogTitle>
            <DialogDescription>
              {confirmingFor && (<>Create an appointment on <strong>{fmt(confirmingFor.requested_slot_at)}</strong>.</>)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {confirmingFor && !confirmingFor.client_id && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Client</label>
                <ClientPicker clients={clients as any} value={confirmClientId} onChange={setConfirmClientId} />
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
            <Button disabled={confirm.isPending} onClick={() => confirmingFor && handleConfirm(confirmingFor)}>
              {confirm.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create new client from request */}
      <Dialog open={!!creatingFor} onOpenChange={(o) => !o && setCreatingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new client from request</DialogTitle>
            <DialogDescription>
              Pre-filled from the booking request. Review and edit before saving.
              If a client with this email already exists, it will be linked instead of duplicated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Email</label>
              <Input type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Phone</label>
              <Input value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Notes</label>
              <Input value={newClientNotes} onChange={(e) => setNewClientNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatingFor(null)}>Cancel</Button>
            <Button disabled={createClient.isPending || link.isPending} onClick={handleCreateClientAndLink}>
              {(createClient.isPending || link.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>

  );
}
