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
  const { data: existing } = await supabase
    .from("booking_availability")
    .select("*")
    .eq("user_id", userId);

  const first = (existing && (existing as any[])[0]) as any | undefined;
  const shared = {
    session_duration_minutes: first?.session_duration_minutes ?? 60,
    buffer_minutes: first?.buffer_minutes ?? 10,
    min_notice_hours: first?.min_notice_hours ?? 24,
    max_horizon_days: first?.max_horizon_days ?? 30,
  };

  const byWeekday: Record<number, any> = {};
  for (const r of (existing as any[]) || []) byWeekday[r.weekday] = r;

  for (const day of schedule) {
    const weekday = dowToWeekday(day.day_of_week);
    const payload = {
      user_id: userId,
      weekday,
      is_enabled: day.is_working,
      start_time: t(day.start_time),
      end_time: t(day.end_time),
      ...shared,
    };
    if (byWeekday[weekday]) {
      await supabase
        .from("booking_availability")
        .update(payload)
        .eq("id", byWeekday[weekday].id);
    } else {
      await supabase.from("booking_availability").insert(payload as any);
    }
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
