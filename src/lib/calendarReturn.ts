/**
 * Saves the calendar context (date, filters, grid scroll) before jumping to
 * another screen, so "Back to calendar" and the browser Back button restore it.
 * The Day/Week/Month view is already persisted by useCalendarDisplay.
 */
const KEY = "calendar.returnState";

export type CalendarReturnState = { date: string; filters: unknown; scrollTop: number };

export function saveCalendarReturn(s: CalendarReturnState) {
  try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function takeCalendarReturn(): CalendarReturnState | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as CalendarReturnState;
  } catch {
    return null;
  }
}

const LABEL: Record<string, string> = {
  en: "Back to calendar", uk: "Назад до календаря", ru: "Назад к календарю",
  pl: "Wróć do kalendarza", fr: "Retour au calendrier",
};
export const backToCalendarLabel = (lang: string) => LABEL[lang] ?? LABEL.en;
