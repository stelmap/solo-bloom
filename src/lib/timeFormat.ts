/**
 * Shared time formatting utility.
 * Always use this instead of hardcoding "HH:mm" or toLocaleTimeString.
 */

/** Format a "HH:mm" string respecting 12h/24h preference */
export function formatTime(time: string, use12h: boolean): string {
  if (!time) return "";
  if (!use12h) return time;
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

/** Extract "HH:mm" from an ISO date string using UTC and format it */
export function formatScheduledTime(isoDate: string, use12h: boolean): string {
  const d = new Date(isoDate);
  const hh = d.getUTCHours().toString().padStart(2, "0");
  const mm = d.getUTCMinutes().toString().padStart(2, "0");
  return formatTime(`${hh}:${mm}`, use12h);
}
