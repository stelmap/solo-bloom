import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { backToCalendarLabel } from "@/lib/calendarReturn";

/** Shown only when the screen was opened from the calendar toolbar. */
export function BackToCalendar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  if (!(location.state as any)?.fromCalendar) return null;
  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      {backToCalendarLabel(lang)}
    </button>
  );
}
