import { useCallback, useEffect, useState } from "react";

export type CalendarView = "day" | "week" | "month";
export type Density = "compact" | "comfortable" | "detailed";

export type DisplayFlags = {
  showColors: boolean;
  showLabels: boolean;
  showUrgent: boolean;
  showNew: boolean;
  showRescheduled: boolean;
  showLegend: boolean;
};

export type CalendarFilters = {
  types: { individual: boolean; group: boolean; pair: boolean };
  status: "all" | "scheduled" | "confirmed" | "completed" | "cancelled" | "no-show";
  urgentOnly: boolean;
  newOnly: boolean;
  search: string;
};

const VIEW_KEY = "calendar.view";
const DEFAULT_VIEW_KEY = "calendar.defaultView";
const DENSITY_KEY = "calendar.cardDensity";
const FLAGS_KEY = "calendar.display.flags";

const defaultFlags: DisplayFlags = {
  showColors: true,
  showLabels: true,
  showUrgent: true,
  showNew: true,
  showRescheduled: true,
  showLegend: true,
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  window.dispatchEvent(new CustomEvent("calendar-display-changed"));
}

export function useCalendarDisplay() {
  const [view, setViewState] = useState<CalendarView>(() =>
    read<CalendarView>(VIEW_KEY, read<CalendarView>(DEFAULT_VIEW_KEY, "week"))
  );
  const [defaultView, setDefaultViewState] = useState<CalendarView>(() =>
    read<CalendarView>(DEFAULT_VIEW_KEY, "week")
  );
  const [density, setDensityState] = useState<Density>(() =>
    read<Density>(DENSITY_KEY, "comfortable")
  );
  const [flags, setFlagsState] = useState<DisplayFlags>(() =>
    ({ ...defaultFlags, ...read<Partial<DisplayFlags>>(FLAGS_KEY, {}) })
  );

  useEffect(() => {
    const onChange = () => {
      setViewState(read<CalendarView>(VIEW_KEY, read<CalendarView>(DEFAULT_VIEW_KEY, "week")));
      setDefaultViewState(read<CalendarView>(DEFAULT_VIEW_KEY, "week"));
      setDensityState(read<Density>(DENSITY_KEY, "comfortable"));
      setFlagsState({ ...defaultFlags, ...read<Partial<DisplayFlags>>(FLAGS_KEY, {}) });
    };
    window.addEventListener("calendar-display-changed", onChange);
    return () => window.removeEventListener("calendar-display-changed", onChange);
  }, []);

  const setView = useCallback((v: CalendarView) => { write(VIEW_KEY, v); setViewState(v); }, []);
  const setDefaultView = useCallback((v: CalendarView) => { write(DEFAULT_VIEW_KEY, v); setDefaultViewState(v); }, []);
  const setDensity = useCallback((d: Density) => { write(DENSITY_KEY, d); setDensityState(d); }, []);
  const setFlag = useCallback((k: keyof DisplayFlags, v: boolean) => {
    setFlagsState(prev => {
      const next = { ...prev, [k]: v };
      write(FLAGS_KEY, next);
      return next;
    });
  }, []);

  return { view, setView, defaultView, setDefaultView, density, setDensity, flags, setFlag };
}

export const initialFilters: CalendarFilters = {
  types: { individual: true, group: true, pair: true },
  status: "all",
  urgentOnly: false,
  newOnly: false,
  search: "",
};

export function isFiltersActive(f: CalendarFilters): boolean {
  return (
    !f.types.individual || !f.types.group || !f.types.pair ||
    f.status !== "all" || f.urgentOnly || f.newOnly || !!f.search.trim()
  );
}
