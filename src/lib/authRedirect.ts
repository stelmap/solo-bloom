const ONBOARDED_KEY = "solo_bizz_onboarded";

export function getPostAuthRedirect(): string {
  const onboarded = localStorage.getItem(ONBOARDED_KEY);
  if (!onboarded) {
    localStorage.setItem(ONBOARDED_KEY, "true");
    return "/calendar";
  }
  return "/dashboard";
}

export function peekPostAuthRedirect(): string {
  return localStorage.getItem(ONBOARDED_KEY) ? "/dashboard" : "/calendar";
}
