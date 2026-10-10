import { useCallback, useEffect, useState } from "react";

export type CalendarPaymentFilter = "all" | "paid" | "awaiting" | "unpaid";
export type CalendarStatusFilter = "all" | "scheduled" | "confirmed" | "completed" | "cancelled" | "no-show";

export type CalendarQuickFilters = {
  clientId: string; // "all" = no constraint
  status: CalendarStatusFilter;
  payment: CalendarPaymentFilter;
};

export type CalendarPrefs = {
  density: "comfortable" | "compact";
  gridMode: "fit" | "scroll";
  highlightOutsideBooking: boolean;
  filters: CalendarQuickFilters;
};

export const defaultQuickFilters: CalendarQuickFilters = { clientId: "all", status: "all", payment: "all" };

export const defaultCalendarPrefs: CalendarPrefs = {
  density: "comfortable",
  gridMode: "fit",
  highlightOutsideBooking: true,
  filters: defaultQuickFilters,
};

export function countActiveQuickFilters(f: CalendarQuickFilters): number {
  return (f.clientId !== "all" ? 1 : 0) + (f.status !== "all" ? 1 : 0) + (f.payment !== "all" ? 1 : 0);
}

const keyFor = (userId?: string | null) => `calendar.prefs.${userId || "anon"}`;

function load(userId?: string | null): CalendarPrefs {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) {
      const legacyDensity = localStorage.getItem("calendar.density");
      return { ...defaultCalendarPrefs, density: legacyDensity === "compact" ? "compact" : "comfortable" };
    }
    const p = JSON.parse(raw);
    return { ...defaultCalendarPrefs, ...p, filters: { ...defaultQuickFilters, ...(p?.filters || {}) } };
  } catch {
    return defaultCalendarPrefs;
  }
}

/** Per-user calendar view + filter preferences, persisted across reloads and navigation. */
export function useCalendarPrefs(userId?: string | null) {
  const [prefs, setPrefs] = useState<CalendarPrefs>(() => load(userId));
  useEffect(() => { setPrefs(load(userId)); }, [userId]);
  const update = useCallback((patch: Partial<CalendarPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(keyFor(userId), JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [userId]);
  const setFilters = useCallback((patch: Partial<CalendarQuickFilters>) => {
    setPrefs((prev) => {
      const next = { ...prev, filters: { ...prev.filters, ...patch } };
      try { localStorage.setItem(keyFor(userId), JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [userId]);
  const resetFilters = useCallback(() => setFilters(defaultQuickFilters), [setFilters]);
  return { prefs, update, setFilters, resetFilters };
}
