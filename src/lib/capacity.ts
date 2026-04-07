/**
 * Realistic capacity calculator.
 * Computes max sessions based on actual working schedule, session duration, and days off.
 */

import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, format } from "date-fns";

interface ScheduleDay {
  day_of_week: number; // 1=Mon..7=Sun
  is_working: boolean;
  start_time: string;
  end_time: string;
}

interface DayOff {
  date: string;
  is_non_working: boolean;
  custom_start_time: string | null;
  custom_end_time: string | null;
}

/** Convert JS getDay (0=Sun) to our format (1=Mon..7=Sun) */
function jsToWeekday(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

/** Minutes available in a time range */
function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max((eh * 60 + em) - (sh * 60 + sm), 0);
}

/** How many sessions fit in a time range given duration + optional buffer between sessions */
function sessionsInRange(startTime: string, endTime: string, durationMinutes: number, bufferMinutes = 0): number {
  const available = minutesBetween(startTime, endTime);
  if (durationMinutes <= 0) return 0;
  return Math.floor(available / (durationMinutes + bufferMinutes));
}

export interface CapacityResult {
  /** Total possible sessions this month (remaining working days, minus days off) */
  maxMonthlyCapacity: number;
  /** Total possible sessions in the full month (all working days, minus days off) */
  totalMonthlyCapacity: number;
  /** Working days remaining this month */
  remainingWorkingDays: number;
  /** Total working days this month */
  totalWorkingDays: number;
  /** Max sessions per week based on schedule */
  weeklyCapacity: number;
  /** Sessions available today */
  todayCapacity: number;
}

/**
 * Calculate realistic capacity for a given month.
 * @param schedule - working schedule rows (if empty, falls back to Mon-Fri 09:00-18:00)
 * @param daysOff - days off in this month
 * @param defaultDuration - default appointment duration in minutes
 * @param referenceDate - the date to calculate for (defaults to now)
 * @param fallbackWorkDays - fallback working days per week if no schedule configured
 * @param fallbackSessionsPerDay - fallback sessions per day if no schedule configured
 */
export function calculateCapacity(
  schedule: ScheduleDay[],
  daysOff: DayOff[],
  defaultDuration: number,
  referenceDate = new Date(),
  fallbackWorkDays = 5,
  fallbackSessionsPerDay = 6,
): CapacityResult {
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  const today = format(referenceDate, "yyyy-MM-dd");
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const daysOffMap = new Map<string, DayOff>();
  for (const d of daysOff) {
    daysOffMap.set(d.date, d);
  }

  // Build schedule lookup: weekday -> { start, end, working }
  const scheduleMap = new Map<number, ScheduleDay>();
  for (const s of schedule) {
    scheduleMap.set(s.day_of_week, s);
  }

  const hasSchedule = schedule.length > 0;

  let totalMonthlyCapacity = 0;
  let maxMonthlyCapacity = 0; // remaining from today onward
  let totalWorkingDays = 0;
  let remainingWorkingDays = 0;
  let todayCapacity = 0;
  let weeklyCapacity = 0;

  // Calculate weekly capacity (for a typical week without days off)
  if (hasSchedule) {
    for (let dow = 1; dow <= 7; dow++) {
      const s = scheduleMap.get(dow);
      if (s && s.is_working) {
        weeklyCapacity += sessionsInRange(s.start_time, s.end_time, defaultDuration);
      }
    }
  } else {
    weeklyCapacity = fallbackWorkDays * fallbackSessionsPerDay;
  }

  for (const day of allDays) {
    const dateStr = format(day, "yyyy-MM-dd");
    const weekday = jsToWeekday(getDay(day));
    const dayOff = daysOffMap.get(dateStr);

    let sessionsThisDay = 0;

    if (dayOff) {
      if (dayOff.is_non_working) {
        // Full day off — 0 sessions
        sessionsThisDay = 0;
      } else if (dayOff.custom_start_time && dayOff.custom_end_time) {
        // Partial day — custom hours
        sessionsThisDay = sessionsInRange(dayOff.custom_start_time, dayOff.custom_end_time, defaultDuration);
      }
    } else if (hasSchedule) {
      const s = scheduleMap.get(weekday);
      if (s && s.is_working) {
        sessionsThisDay = sessionsInRange(s.start_time, s.end_time, defaultDuration);
      }
    } else {
      // Fallback: Mon-Fri
      if (weekday >= 1 && weekday <= fallbackWorkDays) {
        sessionsThisDay = fallbackSessionsPerDay;
      }
    }

    if (sessionsThisDay > 0) {
      totalMonthlyCapacity += sessionsThisDay;
      totalWorkingDays++;

      if (dateStr >= today) {
        maxMonthlyCapacity += sessionsThisDay;
        remainingWorkingDays++;
      }

      if (dateStr === today) {
        todayCapacity = sessionsThisDay;
      }
    }
  }

  return {
    maxMonthlyCapacity,
    totalMonthlyCapacity,
    remainingWorkingDays,
    totalWorkingDays,
    weeklyCapacity,
    todayCapacity,
  };
}

/**
 * Calculate how many more sessions are needed to reach a target amount,
 * capped by the remaining monthly capacity.
 */
export function sessionsNeededForTarget(
  remaining: number,
  avgPrice: number,
  remainingCapacity: number,
): { sessionsNeeded: number; isRealistic: boolean } {
  if (remaining <= 0) return { sessionsNeeded: 0, isRealistic: true };
  if (avgPrice <= 0) return { sessionsNeeded: 0, isRealistic: false };

  const raw = Math.ceil(remaining / avgPrice);
  const isRealistic = raw <= remainingCapacity;
  return { sessionsNeeded: raw, isRealistic };
}
