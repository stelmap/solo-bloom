import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/i18n/LanguageContext";
import { WorkingHoursSection, DaysOffSection, PracticeProfileSection } from "@/components/settings/CalendarSections";
import { PublicBookingSection } from "@/components/PublicBookingSection";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

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

        <Tabs defaultValue="hours" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="hours">{t("settings.workingHours")}</TabsTrigger>
            <TabsTrigger value="daysOff">{t("settings.daysOff")}</TabsTrigger>
            <TabsTrigger value="booking">{t("settings.publicBooking")}</TabsTrigger>
            <TabsTrigger value="practice">{t("settings.practiceProfile")}</TabsTrigger>
          </TabsList>

          <TabsContent value="hours"><WorkingHoursSection /></TabsContent>
          <TabsContent value="daysOff"><DaysOffSection /></TabsContent>
          <TabsContent value="booking"><PublicBookingSection /></TabsContent>
          <TabsContent value="practice"><PracticeProfileSection /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
