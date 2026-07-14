export type LifecycleStatus =
  | "active"
  | "deactivation_pending"
  | "ready_for_deletion"
  | "deleted";

export type LifecycleAction =
  | "deactivate"
  | "cancel_deactivation"
  | "resend_email"
  | "delete_permanently"
  | "cancel_deletion"
  | "send_warning_email_uk"
  | "send_warning_email_en";

export function allowedActions(status: LifecycleStatus): LifecycleAction[] {
  switch (status) {
    case "active": return ["deactivate", "send_warning_email_uk", "send_warning_email_en"];
    case "deactivation_pending": return ["cancel_deactivation", "resend_email", "send_warning_email_uk", "send_warning_email_en"];
    case "ready_for_deletion": return ["delete_permanently", "cancel_deletion", "send_warning_email_uk", "send_warning_email_en"];
    case "deleted": return [];
  }
}


export function computePlannedDeletionDate(
  now: Date,
  graceDays = 7,
): Date {
  return new Date(now.getTime() + graceDays * 24 * 60 * 60 * 1000);
}

export function canAutoReactivate(
  status: LifecycleStatus,
  plannedDeletionDate: Date | null,
  now = new Date(),
): boolean {
  if (status !== "deactivation_pending") return false;
  if (!plannedDeletionDate) return true;
  return plannedDeletionDate.getTime() > now.getTime();
}

export function statusLabel(status: LifecycleStatus): string {
  switch (status) {
    case "active": return "Active";
    case "deactivation_pending": return "Deactivation pending";
    case "ready_for_deletion": return "Ready for deletion";
    case "deleted": return "Deleted";
  }
}

export function statusBadgeVariant(status: LifecycleStatus): "default" | "outline" | "destructive" | "secondary" {
  switch (status) {
    case "active": return "default";
    case "deactivation_pending": return "secondary";
    case "ready_for_deletion": return "destructive";
    case "deleted": return "outline";
  }
}
