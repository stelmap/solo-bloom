import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, CheckCircle2, ChevronLeft, Clock, Globe, Loader2, MapPin } from "lucide-react";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";

type PageInfo = {
  display_name: string;
  session_duration_minutes: number;
  mode: "manual" | "auto";
  is_active: boolean;
  language: string;
  timezone: string;
};

const formSchema = z.object({
  first_name: z.string().trim().min(1).max(120),
  last_name: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  comment: z.string().trim().max(2000).optional().or(z.literal("")),
  consent: z.literal(true),
});

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function PublicBookingPage() {
  const { token } = useParams();
  const [info, setInfo] = useState<PageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ requiresApproval: boolean } | null>(null);

  // noindex
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase.rpc("public_get_booking_page", { p_token: token });
      if (!active) return;
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setError("This booking link is not valid or has been disabled.");
      } else {
        const row = (Array.isArray(data) ? data[0] : data) as PageInfo;
        if (!row.is_active) setError("This booking link is no longer active. Please contact the specialist directly.");
        else setInfo(row);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [token]);

  // Load next 14 days of slots
  useEffect(() => {
    if (!info || !token) return;
    setSlotsLoading(true);
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 14);
    supabase
      .rpc("public_get_available_slots", { p_token: token, p_from_date: fmtDate(from), p_to_date: fmtDate(to) })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          setSlots(((data as any[]) || []).map((r) => r.slot_at).slice(0, 200));
        }
        setSlotsLoading(false);
      });
  }, [info, token]);

  const tz = info?.timezone || "UTC";

  const groupedByDay = useMemo(() => {
    const m: Record<string, { label: string; slots: string[] }> = {};
    for (const s of slots) {
      const d = new Date(s);
      const key = d.toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD stable
      const label = d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: tz,
      });
      if (!m[key]) m[key] = { label, slots: [] };
      m[key].slots.push(s);
    }
    return m;
  }, [slots, tz]);

  const dayKeys = useMemo(() => Object.keys(groupedByDay).sort(), [groupedByDay]);

  // Auto-select first day with slots
  useEffect(() => {
    if (!activeDay && dayKeys.length > 0) setActiveDay(dayKeys[0]);
    if (activeDay && !dayKeys.includes(activeDay) && dayKeys.length > 0) setActiveDay(dayKeys[0]);
  }, [dayKeys, activeDay]);

  async function getIpHash(): Promise<string | null> {
    try {
      const fingerprint = `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}`;
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprint));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
    } catch {
      return null;
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSlot || !token) return;
    const fd = new FormData(e.currentTarget);
    const parsed = formSchema.safeParse({
      first_name: String(fd.get("first_name") ?? ""),
      last_name: String(fd.get("last_name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      comment: String(fd.get("comment") ?? ""),
      consent: fd.get("consent") === "on",
    });
    if (!parsed.success) {
      toast({ title: "Please check the form fields.", variant: "destructive" });
      return;
    }
    if (fd.get("website")) return;

    setSubmitting(true);
    const ip_hash = await getIpHash();
    const { data, error } = await supabase.rpc("public_create_booking", {
      p_token: token,
      p_slot_at: selectedSlot,
      p_first_name: parsed.data.first_name,
      p_last_name: parsed.data.last_name || null,
      p_email: parsed.data.email,
      p_phone: parsed.data.phone || null,
      p_comment: parsed.data.comment || null,
      p_consent: true,
      p_ip_hash: ip_hash,
    });
    setSubmitting(false);
    if (error) {
      const isTaken = /no longer available/i.test(error.message);
      toast({
        title: isTaken ? "This time was just booked" : "Could not book",
        description: isTaken
          ? "Please pick another available time."
          : error.message,
        variant: "destructive",
      });
      if (isTaken) {
        // Refresh slots and step back
        setSelectedSlot(null);
        setSlotsLoading(true);
        const from = new Date();
        const to = new Date();
        to.setDate(to.getDate() + 14);
        const { data: fresh } = await supabase.rpc("public_get_available_slots", {
          p_token: token,
          p_from_date: fmtDate(from),
          p_to_date: fmtDate(to),
        });
        setSlots(((fresh as any[]) || []).map((r) => r.slot_at).slice(0, 200));
        setSlotsLoading(false);
      }
      return;
    }
    const row = Array.isArray(data) ? data[0] : (data as any);
    setDone({ requiresApproval: !!row?.requires_approval });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center text-muted-foreground">{error}</CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary mb-3" />
            <h2 className="text-xl font-semibold mb-2">Thank you!</h2>
            <p className="text-sm text-muted-foreground">
              {done.requiresApproval
                ? "Your booking request has been received. The specialist will confirm it shortly via email."
                : "Your session has been confirmed. You will receive a confirmation email."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeSlots = activeDay ? groupedByDay[activeDay]?.slots ?? [] : [];

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{info.display_name}</h1>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {info.session_duration_minutes} min session
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              {tz}
            </span>
          </div>
        </header>

        {!selectedSlot ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Choose a time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {slotsLoading ? (
                <div className="space-y-3">
                  <div className="flex gap-2 overflow-hidden">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-20 rounded-md flex-shrink-0" />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 rounded-md" />
                    ))}
                  </div>
                </div>
              ) : dayKeys.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <MapPin className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No available slots in the next 14 days.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Please contact the specialist directly to arrange a time.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Day selector strip */}
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                    {dayKeys.map((key) => {
                      const isActive = key === activeDay;
                      const g = groupedByDay[key];
                      const d = new Date(`${key}T12:00:00Z`);
                      const dayNum = d.toLocaleDateString(undefined, { day: "numeric", timeZone: tz });
                      const dayWk = d.toLocaleDateString(undefined, { weekday: "short", timeZone: tz });
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setActiveDay(key)}
                          className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-lg border transition-colors ${
                            isActive
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-accent border-border"
                          }`}
                          aria-pressed={isActive}
                        >
                          <span className="text-[10px] uppercase font-medium tracking-wide opacity-80">
                            {dayWk}
                          </span>
                          <span className="text-lg font-semibold leading-tight">{dayNum}</span>
                          <span className={`text-[10px] ${isActive ? "opacity-90" : "text-muted-foreground"}`}>
                            {g.slots.length} {g.slots.length === 1 ? "slot" : "slots"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Slots grid for selected day */}
                  {activeSlots.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {activeSlots.map((s) => (
                        <Button
                          key={s}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10"
                          onClick={() => setSelectedSlot(s)}
                        >
                          {new Date(s).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: tz,
                          })}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No times available on this day.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="space-y-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-fit -ml-2 h-8 text-muted-foreground"
                onClick={() => setSelectedSlot(null)}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
                Change time
              </Button>
              <div className="rounded-lg bg-muted p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  Your session
                </div>
                <div className="font-semibold text-base">
                  {new Date(selectedSlot).toLocaleString([], {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: tz,
                    timeZoneName: "short",
                  })}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {info.session_duration_minutes} minutes
                </div>
              </div>
              <CardTitle className="text-base">Your details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First name *</Label>
                    <Input id="first_name" name="first_name" required maxLength={120} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last name</Label>
                    <Input id="last_name" name="last_name" maxLength={120} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" required maxLength={254} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input id="phone" name="phone" type="tel" maxLength={40} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comment">Comment (optional)</Label>
                  <Textarea id="comment" name="comment" rows={3} maxLength={2000} />
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox id="consent" name="consent" required />
                  <Label htmlFor="consent" className="text-sm font-normal leading-snug">
                    I consent to the processing of my personal data for the purpose of arranging this session.
                  </Label>
                </div>
                <Button type="submit" disabled={submitting} className="w-full gap-2" size="lg">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {info.mode === "auto" ? "Confirm booking" : "Request booking"}
                </Button>
                {info.mode === "manual" && (
                  <p className="text-xs text-muted-foreground text-center">
                    The specialist will review and confirm your request via email.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
