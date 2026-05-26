// Calendar visual helpers — client-side only.
// Urgency, "new" and "rescheduled" markers live in localStorage since the DB
// schema doesn't track them. Keep the API small and pure so it's easy to test.

const URGENT_KEY = "calendar.urgent";       // Set<id>
const NEW_KEY = "calendar.new";             // Map<id, createdAtMs>
const SEEN_KEY = "calendar.seen";           // Set<id>
const RESCHED_KEY = "calendar.rescheduled"; // Set<id>
const NEW_TTL_MS = 24 * 60 * 60 * 1000;

function readSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(Array.from(set))); } catch {}
  // notify listeners in same tab
  window.dispatchEvent(new CustomEvent("calendar-visuals-changed", { detail: key }));
}

function readMap(key: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeMap(key: string, map: Record<string, number>) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(map)); } catch {}
  window.dispatchEvent(new CustomEvent("calendar-visuals-changed", { detail: key }));
}

// ---------- Urgent ----------
export function isUrgent(id: string): boolean {
  return readSet(URGENT_KEY).has(id);
}
export function toggleUrgent(id: string): boolean {
  const s = readSet(URGENT_KEY);
  const next = !s.has(id);
  if (next) s.add(id); else s.delete(id);
  writeSet(URGENT_KEY, s);
  return next;
}

// ---------- New ----------
export function markNew(id: string) {
  const m = readMap(NEW_KEY);
  m[id] = Date.now();
  writeMap(NEW_KEY, m);
  // ensure not pre-seen
  const seen = readSet(SEEN_KEY); seen.delete(id); writeSet(SEEN_KEY, seen);
}
export function markSeen(id: string) {
  const seen = readSet(SEEN_KEY);
  if (!seen.has(id)) { seen.add(id); writeSet(SEEN_KEY, seen); }
}
export function isNew(id: string, createdAt?: string): boolean {
  if (readSet(SEEN_KEY).has(id)) return false;
  const m = readMap(NEW_KEY);
  const ts = m[id] ?? (createdAt ? new Date(createdAt).getTime() : 0);
  if (!ts) return false;
  return Date.now() - ts < NEW_TTL_MS;
}

// ---------- Rescheduled ----------
export function isRescheduled(id: string): boolean {
  return readSet(RESCHED_KEY).has(id);
}
export function markRescheduled(id: string) {
  const s = readSet(RESCHED_KEY);
  if (!s.has(id)) { s.add(id); writeSet(RESCHED_KEY, s); }
}
export function clearRescheduled(id: string) {
  const s = readSet(RESCHED_KEY);
  if (s.has(id)) { s.delete(id); writeSet(RESCHED_KEY, s); }
}

// ---------- Session type ----------
export type SessionKind = "individual" | "group" | "pair";

export function getSessionKind(apt: any, clients: any[] = []): SessionKind {
  if (apt?.group_session_id) return "group";
  const notes = (apt?.notes || "").toLowerCase();
  if (notes.includes("pair") || notes.includes("couple")) return "pair";
  const svc = (apt?.services?.name || "").toLowerCase();
  if (svc.includes("pair") || svc.includes("couple")) return "pair";
  return "individual";
}

// Tailwind classes for a card's base color by type.
// Status overrides happen at the card layer.
export function typeColorClasses(kind: SessionKind): string {
  switch (kind) {
    case "group":
      return "bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-100";
    case "pair":
      return "bg-violet-500/10 border-violet-500/40 text-violet-900 dark:text-violet-100";
    default:
      return "bg-muted border-border text-foreground";
  }
}

export function typeDotClasses(kind: SessionKind): string {
  switch (kind) {
    case "group": return "bg-emerald-500";
    case "pair":  return "bg-violet-500";
    default:      return "bg-muted-foreground";
  }
}

// Status overlay (does not replace type color, only adds accents)
export function statusOverlayClasses(status: string): string {
  switch (status) {
    case "cancelled":
      return "opacity-60 line-through";
    case "completed":
      return "ring-1 ring-success/40";
    case "no-show":
      return "ring-1 ring-warning/40 border-dashed";
    case "confirmed":
      return "ring-1 ring-primary/30";
    default:
      return "";
  }
}
