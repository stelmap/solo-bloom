/** Only a server-verified request owner may bypass the public trigger window. */
export function canTriggerBookingConfirmation(
  request: { user_id: string; created_at: string },
  verifiedUserId: string | undefined,
  now = Date.now(),
): boolean {
  if (verifiedUserId === request.user_id) return true;
  const age = now - new Date(request.created_at).getTime();
  return Number.isFinite(age) && age >= 0 && age <= 10 * 60 * 1000;
}