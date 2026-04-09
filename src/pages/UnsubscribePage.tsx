import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, MailX } from "lucide-react";

type Status = "loading" | "valid" | "unsubscribed" | "already_unsubscribed" | "invalid" | "error";

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    validateToken();
  }, [token]);

  async function validateToken() {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
        { headers: { apikey: anonKey } }
      );
      const data = await response.json();

      if (!response.ok) {
        setStatus("invalid");
        return;
      }

      if (data.valid === false && data.reason === "already_unsubscribed") {
        setStatus("already_unsubscribed");
        return;
      }

      setStatus("valid");
    } catch {
      setStatus("error");
    }
  }

  async function handleUnsubscribe() {
    if (!token) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });

      if (error) {
        setStatus("error");
        return;
      }

      const result = typeof data === "string" ? JSON.parse(data) : data;
      if (result.success) {
        setStatus("unsubscribed");
      } else if (result.reason === "already_unsubscribed") {
        setStatus("already_unsubscribed");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setProcessing(false);
    }
  }

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
              <p className="text-muted-foreground">Validating...</p>
            </div>
          )}

          {status === "valid" && (
            <div className="text-center">
              <MailX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Unsubscribe from Emails</h2>
              <p className="text-muted-foreground mb-6">
                Are you sure you want to stop receiving notification emails from Solo.Biz?
              </p>
              <Button
                onClick={handleUnsubscribe}
                disabled={processing}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                {processing ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
                ) : (
                  "Confirm Unsubscribe"
                )}
              </Button>
            </div>
          )}

          {status === "unsubscribed" && (
            <div className="text-center py-4">
              <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Unsubscribed</h2>
              <p className="text-muted-foreground">
                You've been successfully unsubscribed. You will no longer receive notification emails.
              </p>
            </div>
          )}

          {status === "already_unsubscribed" && (
            <div className="text-center py-4">
              <CheckCircle className="h-14 w-14 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Already Unsubscribed</h2>
              <p className="text-muted-foreground">
                You're already unsubscribed from our notification emails.
              </p>
            </div>
          )}

          {status === "invalid" && (
            <div className="text-center py-4">
              <XCircle className="h-14 w-14 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invalid Link</h2>
              <p className="text-muted-foreground">
                This unsubscribe link is invalid or has expired.
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-4">
              <XCircle className="h-14 w-14 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Something Went Wrong</h2>
              <p className="text-muted-foreground">
                Please try again later.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
