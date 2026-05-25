import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/i18n/LanguageContext";
import { ProfileSection, AppearanceSection, SecuritySection, NotificationsSection } from "@/components/settings/AccountSections";
import { ConnectedAccountsSection } from "@/components/ConnectedAccountsSection";
import { SubscriptionSection } from "@/components/SubscriptionSection";
import { PrivacySection } from "@/components/settings/PrivacySection";
import { MfaAndTimeoutSection } from "@/components/settings/MfaAndTimeoutSection";

export default function SettingsPage() {
  const { t } = useLanguage();
  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("settings.subtitle")}</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="profile">{t("settings.profile")}</TabsTrigger>
            <TabsTrigger value="appearance">{t("settings.appearance")}</TabsTrigger>
            <TabsTrigger value="security">{t("settings.security")}</TabsTrigger>
            <TabsTrigger value="notifications">{t("settings.notifications")}</TabsTrigger>
            <TabsTrigger value="connected">{t("settings.connectedAccounts")}</TabsTrigger>
            <TabsTrigger value="subscription">{t("settings.subscriptionTab")}</TabsTrigger>
            <TabsTrigger value="privacy">Privacy & Data</TabsTrigger>
          </TabsList>

          <TabsContent value="profile"><ProfileSection /></TabsContent>
          <TabsContent value="appearance"><AppearanceSection /></TabsContent>
          <TabsContent value="security">
            <div className="space-y-6">
              <SecuritySection />
              <MfaAndTimeoutSection />
            </div>
          </TabsContent>
          <TabsContent value="notifications"><NotificationsSection /></TabsContent>
          <TabsContent value="connected"><ConnectedAccountsSection /></TabsContent>
          <TabsContent value="subscription"><SubscriptionSection /></TabsContent>
          <TabsContent value="privacy"><PrivacySection /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
