/** Shared by preview and checkout so an accepted code cannot disappear. */
export function normalizePromoCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9_-]{3,40}$/.test(code) ? code : null;
}