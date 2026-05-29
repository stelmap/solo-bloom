import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type BookingRequestRow = {
  id: string;
  link_id: string | null;
  appointment_id: string | null;
  client_id: string | null;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  comment: string | null;
  requested_slot_at: string;
  duration_minutes: number;
  status:
    | "pending"
    | "needs_linking"
    | "confirmed"
    | "cancelled_client"
    | "cancelled_therapist"
    | "spam"
    | "expired";
  matched_client_name: string | null;
  created_at: string;
  confirmation_email_status: "sent" | "failed" | null;
  confirmation_email_sent_at: string | null;
  confirmation_email_error: string | null;
};

const ACTIONABLE = ["pending", "needs_linking"] as const;

export function useBookingRequests(status?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["booking-requests", user?.id, status ?? "all"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("list_session_booking_requests", {
        p_status: status && status !== "all" ? status : null,
        p_limit: 200,
      });
      if (error) throw error;
      return (data ?? []) as BookingRequestRow[];
    },
  });
}

export function useBookingInboxCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["booking-requests-count", user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("list_session_booking_requests", {
        p_status: null,
        p_limit: 200,
      });
      if (error) return 0;
      return ((data ?? []) as BookingRequestRow[]).filter((r) =>
        (ACTIONABLE as readonly string[]).includes(r.status),
      ).length;
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["booking-requests"] });
  qc.invalidateQueries({ queryKey: ["booking-requests-count"] });
  qc.invalidateQueries({ queryKey: ["appointments"] });
}

export function useConfirmBookingRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; client_id?: string; service_id?: string }) => {
      const { data, error } = await (supabase as any).rpc("confirm_booking_request", {
        p_id: vars.id,
        p_client_id: vars.client_id ?? null,
        p_service_id: vars.service_id ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeclineBookingRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; reason?: "cancelled_therapist" | "spam" }) => {
      const { error } = await (supabase as any).rpc("decline_booking_request", {
        p_id: vars.id,
        p_reason: vars.reason ?? "cancelled_therapist",
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useLinkBookingRequestClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; client_id: string }) => {
      const { error } = await (supabase as any).rpc("link_booking_request_client", {
        p_id: vars.id,
        p_client_id: vars.client_id,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}
