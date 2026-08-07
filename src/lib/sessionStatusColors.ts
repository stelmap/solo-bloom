/**
 * Single source of truth for session status colors.
 *
 * Presentation only: the state itself is derived from the SAVED session /
 * payment status via the existing classifiers (never from date or time).
 * Every surface (calendar cards, filters, badges, legends, charts, tooltips)
 * must read its colors from here so the status system stays consistent.
 */
import { isPaid, isBilledCancellation, type AppointmentLike } from "./paymentClassifiers";

export type SessionStateKey =
  | "paid"
  | "unpaid"
  | "confirmed"
  | "cancelled_charged"
  | "cancelled_free";

export interface SessionStateStyle {
  /** i18n key for the human-readable status name (never rely on color alone). */
  labelKey: string;
  labelFallback: string;
  /** Solid indicator (dot / filter circle / chart legend swatch). */
  dot: string;
  /** Soft tinted card with a solid left border accent. */
  card: string;
  /** Compact badge / pill. */
  badge: string;
  /** Raw CSS color for charts (Recharts fill/stroke). */
  chart: string;
}

export const SESSION_STATE_STYLES: Record<SessionStateKey, SessionStateStyle> = {
  paid: {
    labelKey: "calendar.state.paid",
    labelFallback: "Paid",
    dot: "bg-state-paid",
    card: "bg-state-paid/10 border-state-paid/30 border-l-4 border-l-state-paid text-foreground",
    badge: "bg-state-paid/15 text-foreground border border-state-paid/40",
    chart: "hsl(var(--state-paid))",
  },
  unpaid: {
    labelKey: "calendar.state.unpaid",
    labelFallback: "Unpaid",
    dot: "bg-state-unpaid",
    card: "bg-state-unpaid/20 border-state-unpaid/50 border-l-4 border-l-state-unpaid text-foreground",
    badge: "bg-state-unpaid/25 text-foreground border border-state-unpaid",
    chart: "hsl(var(--state-unpaid))",
  },
  confirmed: {
    labelKey: "calendar.state.confirmed",
    labelFallback: "Confirmed",
    dot: "bg-state-confirmed",
    card: "bg-state-confirmed/10 border-state-confirmed/30 border-l-4 border-l-state-confirmed text-foreground",
    badge: "bg-state-confirmed/15 text-foreground border border-state-confirmed/40",
    chart: "hsl(var(--state-confirmed))",
  },
  cancelled_charged: {
    labelKey: "calendar.state.cancelledCharged",
    labelFallback: "Cancelled — client charged",
    dot: "bg-state-cancelled-charged",
    card: "bg-state-cancelled-charged/10 border-state-cancelled-charged/30 border-l-4 border-l-state-cancelled-charged text-foreground",
    badge: "bg-state-cancelled-charged/15 text-foreground border border-state-cancelled-charged/40",
    chart: "hsl(var(--state-cancelled-charged))",
  },
  cancelled_free: {
    labelKey: "calendar.state.cancelledFree",
    labelFallback: "Cancelled — no charge",
    dot: "bg-state-cancelled-free",
    card: "bg-state-cancelled-free/10 border-state-cancelled-free/30 border-l-4 border-l-state-cancelled-free text-foreground",
    badge: "bg-state-cancelled-free/15 text-foreground border border-state-cancelled-free/40",
    chart: "hsl(var(--state-cancelled-free))",
  },
};

export const SESSION_STATE_ORDER: SessionStateKey[] = [
  "paid",
  "unpaid",
  "confirmed",
  "cancelled_charged",
  "cancelled_free",
];

const isCancelledLike = (a: AppointmentLike) =>
  a.status === "cancelled" || a.status === "no-show";

/**
 * Maps a saved appointment to exactly one display state.
 * Order matters: money first, then lifecycle.
 */
export function getSessionStateKey(a: AppointmentLike): SessionStateKey {
  if (isCancelledLike(a)) {
    return isBilledCancellation(a) ? "cancelled_charged" : "cancelled_free";
  }
  if (isPaid(a)) return "paid";
  if (a.status === "confirmed") return "confirmed";
  return "unpaid";
}

export function getSessionStateStyle(a: AppointmentLike): SessionStateStyle {
  return SESSION_STATE_STYLES[getSessionStateKey(a)];
}
