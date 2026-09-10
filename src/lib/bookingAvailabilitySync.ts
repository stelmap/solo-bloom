import { supabase } from "@/integrations/supabase/client";

// working_schedule.day_of_week: 1=Mon..7=Sun
// booking_availability.weekday: 0=Sun..6=Sat
export const dowToWeekday = (dow: number) => (dow === 7 ? 0 : dow);

export type ScheduleDay = {
  day_of_week: number;
  is_working: boolean;
  start_time: string;
  end_time: string;
};

const t = (s: string) => (s && s.length === 5 ? `${s}:00` : s);

export async function syncBookingAvailabilityFromSchedule(
  userId: string,
  schedule: ScheduleDay[],
) {
  // Make sure the session is still valid and belongs to this user, otherwise
  // row-level security would silently reject the writes below.
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth?.user || auth.user.id !== userId) {
    throw new Error("SESSION_EXPIRED");
  }

  const { data: existing, error: readError } = await supabase
    .from("booking_availability")
    .select("*")
    .eq("user_id", userId);
  if (readError) throw readError;

  const first = (existing && (existing as any[])[0]) as any | undefined;
  const shared = {
    session_duration_minutes: first?.session_duration_minutes ?? 60,
    buffer_minutes: first?.buffer_minutes ?? 10,
    min_notice_hours: first?.min_notice_hours ?? 24,
    max_horizon_days: first?.max_horizon_days ?? 30,
  };

  const rows = schedule.map((day) => ({
    user_id: userId,
    weekday: dowToWeekday(day.day_of_week),
    is_enabled: day.is_working,
    start_time: t(day.start_time),
    end_time: t(day.end_time),
    sort_order: 0,
    ...shared,
  }));

  // Insert the new rows FIRST, so a rejected insert can never leave the user
  // with zero availability. Only once they exist do we drop the old rows.
  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("booking_availability")
      .insert(rows as any);
    if (insertError) throw insertError;
  }

  const staleIds = ((existing as any[]) ?? []).map((r) => r.id).filter(Boolean);
  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("booking_availability")
      .delete()
      .eq("user_id", userId)
      .in("id", staleIds);
    if (deleteError) throw deleteError;
  }
}

const INHERIT_KEY = (uid: string) => `bk_inherit_schedule:${uid}`;

export function getInheritFlag(uid: string | undefined): boolean {
  if (!uid || typeof window === "undefined") return true;
  const v = window.localStorage.getItem(INHERIT_KEY(uid));
  return v === null ? true : v === "1";
}

export function setInheritFlag(uid: string, on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INHERIT_KEY(uid), on ? "1" : "0");
}
