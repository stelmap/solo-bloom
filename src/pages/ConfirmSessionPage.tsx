import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, CalendarCheck } from "lucide-react";

type Status = "loading" | "valid" | "confirmed" | "already_confirmed" | "invalid" | "error";

export default function ConfirmSessionPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [confirming, setConfirming] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{
    scheduledAt?: string;
    serviceName?: string;
    clientName?: string;
  }>({});

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    validateToken();
  }, [token]);

  async function validateToken() {
    try {
      const { data, error } = await supabase
        .from("session_confirmations")
        .select("*, appointments(scheduled_at, clients(name), services(name))")
        .eq("token", token!)
        .maybeSingle();

      if (error || !data) {
        setStatus("invalid");
        return;
      }

      if (data.confirmed_at) {
        setStatus("already_confirmed");
        return;
      }

      const apt = data.appointments as any;
      if (apt) {
        setSessionInfo({
          scheduledAt: apt.scheduled_at,
          serviceName: apt.services?.name,
          clientName: apt.clients?.name,
        });
      }

      setStatus("valid");
    } catch {
      setStatus("error");
    }
  }

  async function handleConfirm() {
    if (!token) return;
    setConfirming(true);
    try {
      // Update confirmation record
      const { data: conf, error: confError } = await supabase
        .from("session_confirmations")
        .update({ confirmed_at: new Date().toISOString() })
        .eq("token", token)
        .is("confirmed_at", null)
        .select("appointment_id")
        .single();

      if (confError || !conf) {
        setStatus("already_confirmed");
        return;
      }

      // Update the appointment
      await supabase
        .from("appointments")
        .update({
          status: "confirmed",
          confirmation_status: "confirmed",
          confirmation_timestamp: new Date().toISOString(),
        } as any)
        .eq("id", conf.appointment_id);

      setStatus("confirmed");
    } catch {
      setStatus("error");
    } finally {
      setConfirming(false);
    }
  }

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    }) + " at " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Solo<span className="text-primary">.Biz</span>
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border p-8">
          {status === "loading" && (
            <div className="text-center py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Validating your confirmation link...</p>
            </div>
          )}

          {status === "valid" && (
            <div className="text-center">
              <CalendarCheck className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Confirm Your Session</h2>
              {sessionInfo.scheduledAt && (
                <div className="bg-muted rounded-xl p-4 mb-6 text-left">
                  <p className="text-sm text-muted-foreground mb-1">Scheduled for</p>
                  <p className="font-semibold text-foreground">{formatDate(sessionInfo.scheduledAt)}</p>
                  {sessionInfo.serviceName && (
                    <>
                      <p className="text-sm text-muted-foreground mt-3 mb-1">Service</p>
                      <p className="font-medium text-foreground">{sessionInfo.serviceName}</p>
                    </>
                  )}
                </div>
              )}
              <Button
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full"
                size="lg"
              >
                {confirming ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Confirming...</>
                ) : (
                  "Confirm Session"
                )}
              </Button>
            </div>
          )}

          {status === "confirmed" && (
            <div className="text-center py-4">
              <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Session Confirmed!</h2>
              <p className="text-muted-foreground">
                Thank you! Your session has been confirmed. See you soon!
              </p>
            </div>
          )}

          {status === "already_confirmed" && (
            <div className="text-center py-4">
              <CheckCircle className="h-14 w-14 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Already Confirmed</h2>
              <p className="text-muted-foreground">
                This session has already been confirmed. No further action needed.
              </p>
            </div>
          )}

          {status === "invalid" && (
            <div className="text-center py-4">
              <XCircle className="h-14 w-14 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
              <p className="text-muted-foreground">
                This confirmation link is invalid or has expired.
                Please contact your specialist for assistance.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-4">
              <XCircle className="h-14 w-14 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Something Went Wrong</h2>
              <p className="text-muted-foreground">
                We couldn't process your request. Please try again later.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
