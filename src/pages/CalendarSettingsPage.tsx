import { AppLayout } from "@/components/AppLayout";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Store } from "lucide-react";

export default function CalendarSettingsPage() {
  const { t } = useLanguage();
  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <Link to="/calendar" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("nav.calendar")}
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{t("settings.calendarSettings")}</h1>
        </div>

        

        <Card>
          <CardContent className="flex items-center justify-between gap-4 flex-wrap pt-6">
            <div className="flex items-start gap-3">
              <Store className="h-5 w-5 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground max-w-xl">
                {t("settings.practiceProfileDesc")}
              </p>
            </div>
            <Button asChild>
              <Link to="/settings/practice#booking-availability">
                {t("settings.practiceProfile")} <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>

          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
