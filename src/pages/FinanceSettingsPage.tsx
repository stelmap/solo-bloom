import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/i18n/LanguageContext";
import { CurrencyInvoicingSection, RevenueRecognitionSection, TaxesSection } from "@/components/settings/FinanceSections";
import { InvoiceSignatureSection } from "@/components/settings/InvoiceSignatureSection";
import { PaymentMethodsSection } from "@/components/PaymentMethodsSection";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function FinanceSettingsPage() {
  const { t } = useLanguage();
  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <Link to="/finances" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> {t("nav.finances")}
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{t("settings.financeSettings")}</h1>
        </div>

        <Tabs defaultValue="currency" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="currency">{t("settings.currencyInvoicing")}</TabsTrigger>
            <TabsTrigger value="revenue">{t("settings.revenueRecognition")}</TabsTrigger>
            <TabsTrigger value="methods">{t("settings.paymentMethodsTab")}</TabsTrigger>
            <TabsTrigger value="taxes">{t("settings.taxesTab")}</TabsTrigger>
          </TabsList>

          <TabsContent value="currency">
            <div className="space-y-6">
              <CurrencyInvoicingSection />
              <InvoiceSignatureSection />
            </div>
          </TabsContent>
          <TabsContent value="revenue"><RevenueRecognitionSection /></TabsContent>
          <TabsContent value="methods"><PaymentMethodsSection /></TabsContent>
          <TabsContent value="taxes"><TaxesSection /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
