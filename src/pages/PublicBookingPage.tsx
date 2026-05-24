import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";

type PageInfo = {
  display_name: string;
  session_duration_minutes: number;
  mode: "manual" | "auto";
  is_active: boolean;
  language: string;
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

  const groupedByDay = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const s of slots) {
      const d = new Date(s);
      const key = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      (m[key] ||= []).push(s);
    }
    return m;
  }, [slots]);

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
    // honeypot
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
      toast({ title: "Could not book", description: error.message, variant: "destructive" });
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

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-semibold">{info.display_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Book a {info.session_duration_minutes}-minute session
          </p>
        </header>

        {!selectedSlot ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Choose a time</CardTitle>
            </CardHeader>
            <CardContent>
              {slotsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin inline text-muted-foreground" />
                </div>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No available slots in the next 14 days. Please contact the specialist directly.
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedByDay).map(([day, daySlots]) => (
                    <div key={day}>
                      <div className="text-sm font-medium mb-2">{day}</div>
                      <div className="flex flex-wrap gap-2">
                        {daySlots.map((s) => (
                          <Button
                            key={s}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSlot(s)}
                          >
                            {new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {new Date(selectedSlot).toLocaleString([], {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2"
                  onClick={() => setSelectedSlot(null)}
                  type="button"
                >
                  Change
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* honeypot */}
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
                <Button type="submit" disabled={submitting} className="w-full gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {info.mode === "auto" ? "Confirm booking" : "Request booking"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
