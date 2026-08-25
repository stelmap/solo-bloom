/**
 * Shared shell styling for every block rendered inside a calendar cell
 * (sessions, incoming booking requests, unavailable time).
 *
 * All blocks share the same radius, padding, border and left color indicator;
 * only the tint of the indicator/background differs per type. Blocks are
 * positioned inside the cell (inset) so they never paint the whole cell.
 */
export const CALENDAR_BLOCK_BASE =
  "absolute rounded-md border border-l-4 px-2 py-1 overflow-hidden shadow-sm transition-all cursor-pointer";

/** Unavailable / blocked time — light pink. */
export const CALENDAR_BLOCK_UNAVAILABLE =
  "bg-destructive/[0.08] border-destructive/25 border-l-destructive text-destructive hover:bg-destructive/15";

/** Incoming booking request — light orange, no dashed border. */
export const CALENDAR_BLOCK_REQUEST =
  "bg-warning/10 border-warning/30 border-l-warning text-foreground hover:bg-warning/20";

/** Compact (month view) variant of the same shells. */
export const CALENDAR_CHIP_BASE =
  "text-[10px] px-1.5 py-0.5 rounded border border-l-4 truncate cursor-pointer transition-colors";
