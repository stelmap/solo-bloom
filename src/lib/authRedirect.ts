const ONBOARDED_KEY = "solo_bizz_onboarded";

/**
 * Default destination after any successful login / signup.
 * Always Calendar — by product decision the calendar is the workspace home.
 */
export function getPostAuthRedirect(): string {
  // Keep marker for any legacy reads, but always land on calendar.
  if (!localStorage.getItem(ONBOARDED_KEY)) {
    localStorage.setItem(ONBOARDED_KEY, "true");
  }
  return "/calendar";
}

export function peekPostAuthRedirect(): string {
  return "/calendar";
}
