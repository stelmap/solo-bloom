import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useData";

export type PracticeProfileField =
  | "avatar_url"
  | "business_name"
  | "full_name"
  | "public_email"
  | "phone"
  | "business_id"
  | "currency"
  | "language"
  | "timezone";

// Fields that must be present for the practice profile to count as complete.
const REQUIRED_FIELDS: PracticeProfileField[] = [
  "business_name",
  "full_name",
  "public_email",
  "phone",
  "currency",
  "language",
  "timezone",
];

export function usePracticeProfileStatus() {
  const { data: profile, isLoading } = useProfile();
  const p = profile as any;

  const missing: PracticeProfileField[] = profile
    ? REQUIRED_FIELDS.filter((f) => {
        const v = p?.[f];
        return v === null || v === undefined || String(v).trim() === "";
      })
    : [];

  return {
    loading: isLoading || !profile,
    complete: !!profile && missing.length === 0,
    missing,
  };
}

export function useBookingLink() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["booking_link", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("booking_links").select("*").maybeSingle();
      return data;
    },
  });
}
