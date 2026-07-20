import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/i18n/LanguageContext";
import { ProfileSection, AppearanceSection, SecuritySection, NotificationsSection } from "@/components/settings/AccountSections";
import { ConnectedAccountsSection } from "@/components/ConnectedAccountsSection";
import { SubscriptionSection } from "@/components/SubscriptionSection";
import { PrivacySection } from "@/components/settings/PrivacySection";
import { MfaAndTimeoutSection } from "@/components/settings/MfaAndTimeoutSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

export default function SettingsPage() {
  useEffect(() => { track("settings_opened"); }, []);
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
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="privacy">{t("settings.privacyAndData")}</TabsTrigger>
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
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Information agreements
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-sm text-muted-foreground max-w-xl">
                  Create reusable agreement templates you can send to clients. Each template
                  can have one active version used when generating new client agreements.
                </p>
                <Button asChild>
                  <Link to="/settings/agreements">
                    Manage templates <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="privacy"><PrivacySection /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
