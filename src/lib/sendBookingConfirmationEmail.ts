import { supabase } from "@/integrations/supabase/client";
import type { BookingRequestRow } from "@/hooks/useBookingInbox";

interface SendArgs {
  req: BookingRequestRow;
  profile?: any;
  services?: any[];
  serviceId?: string;
}

/**
 * Send the booking-confirmation transactional email for a manually-confirmed
 * booking request and persist delivery status on the request row.
 *
 * Shared by the booking inbox panel, the full Booking Inbox page, and the
 * dashboard quick-confirm action so every manual-approval path delivers an
 * email to the client.
 */
export async function sendBookingConfirmationEmail({
  req,
  profile,
  services = [],
  serviceId,
}: SendArgs): Promise<{ ok: boolean; error?: string }> {
  let result: { ok: boolean; error?: string };
  try {
    const slot = new Date(req.requested_slot_at);
    const lang = (profile as any)?.language || "en";
    const dateFmt = slot.toLocaleDateString(lang, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeFmt = slot.toLocaleTimeString(lang, {
      hour: "2-digit",
      minute: "2-digit",
    });
    const specialistName =
      (profile as any)?.business_name ||
      (profile as any)?.full_name ||
      "your specialist";
    const serviceName =
      (services as any[]).find((s) => s.id === serviceId)?.name || undefined;
    const clientName =
      `${req.first_name}${req.last_name ? " " + req.last_name : ""}`.trim() ||
      "Client";

    const { error } = await supabase.functions.invoke(
      "send-transactional-email",
      {
        body: {
          templateName: "booking-confirmation",
          recipientEmail: req.email,
          // Stable per-request idempotency key so multiple manual confirms
          // (refresh, double-click) never produce duplicate emails.
          idempotencyKey: `booking-confirm-${req.id}`,
          templateData: {
            clientName,
            specialistName,
            sessionDate: dateFmt,
            sessionTime: timeFmt,
            serviceName,
            language: lang,
          },
        },
      },
    );
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

  // Persist delivery status on the request row so the inbox can show it
  // later and the therapist can resend if it failed.
  try {
    await (supabase as any)
      .from("session_booking_requests")
      .update({
        confirmation_email_status: result.ok ? "sent" : "failed",
        confirmation_email_sent_at: result.ok
          ? new Date().toISOString()
          : null,
        confirmation_email_error: result.ok
          ? null
          : result.error ?? "Unknown error",
      })
      .eq("id", req.id);
  } catch (e) {
    console.warn("Could not persist email status", e);
  }

  return result;
}
