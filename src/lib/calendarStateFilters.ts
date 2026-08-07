/**
 * Predicates backing the Calendar filter's multi-select state checkboxes.
 * Presentation-only: reuses the existing payment classifiers so the calendar
 * stays consistent with the rest of the app.
 */
import { isPaid, isBilledCancellation, type AppointmentLike } from "./paymentClassifiers";
import type { CalendarStateKey } from "@/hooks/useCalendarDisplay";

const isCancelledLike = (a: AppointmentLike) =>
  a.status === "cancelled" || a.status === "no-show";

export function matchesCalendarState(a: AppointmentLike, key: CalendarStateKey): boolean {
  switch (key) {
    case "paid":
      return isPaid(a);
    case "unpaid":
      return !isPaid(a) && !(isCancelledLike(a) && !isBilledCancellation(a));
    case "confirmed":
      return a.status === "confirmed";
    case "cancelled_charged":
      return isBilledCancellation(a);
    case "cancelled_free":
      return isCancelledLike(a) && !isBilledCancellation(a);
    default:
      return true;
  }
}
