import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useProfile, useUpdateProfile } from "@/hooks/useData";
import { useToast } from "@/hooks/use-toast";
import { CurrencySelect } from "@/components/settings/CurrencySelect";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import { ArrowLeft, Info, Loader2, PenLine, Receipt } from "lucide-react";
import { TaxesSection } from "@/components/settings/FinanceSections";
import { InvoiceSignatureSection } from "@/components/settings/InvoiceSignatureSection";
import {
  BUSINESS_COUNTRIES,
  TAX_ID_OPTIONS,
  getDefaultTaxIdForCountry,
  isValidTaxIdForCountry,
  type BusinessCountry,
} from "@/lib/taxIdentifiers";

type Lang = "en" | "uk" | "ru" | "fr" | "pl";
const normLang = (v: unknown): Lang => {
  const s = String(v || "en").toLowerCase();
  return (["en", "uk", "ru", "fr", "pl"].includes(s) ? s : "en") as Lang;
};

const COPY: Record<Lang, Record<string, string>> = {
  en: {
    back: "Finances",
    title: "Finance settings",
    subtitle: "Set your currency, financial reports, invoice details and taxes.",
    currency: "Main currency",
    currencyDesc: "Prices, income, expenses and reports are shown in this currency.",
    currencyLabel: "Currency",
    recognition: "When should income appear in reports?",
    recognitionDesc: "Choose how you want to see your earnings.",
    byPayment: "On the payment date",
    byPaymentDesc: "The client paid on 10 May — income is shown in May.",
    bySession: "On the session date",
    bySessionDesc: "The session was on 28 April, payment arrived on 10 May — income is shown in April.",
    recognitionNote: "This only changes how data is displayed in reports.",
    invoiceDetails: "Invoice details",
    invoiceDetailsDesc: "These details are used automatically on client invoices.",
    country: "Country of practice",
    legalName: "Legal name or personal name",
    legalAddress: "Legal address",
    taxIdType: "Tax number type",
    taxNumber: "Tax / legal number",
    vatMode: "VAT mode",
    vatRate: "VAT rate (%)",
    vatNone: "No VAT",
    vatIncluded: "VAT included",
    vatExcluded: "VAT excluded",
    signature: "Invoice appearance",
    signatureDesc: "Signature and stamp",
    taxes: "Taxes",
    taxesDesc: "Taxes and recurring payments",
    cancel: "Cancel",
    save: "Save changes",
    saving: "Saving…",
    saved: "Settings saved",
  },
  uk: {
    back: "Фінанси",
    title: "Налаштування фінансів",
    subtitle: "Налаштуйте валюту, фінансові звіти, реквізити для рахунків і податки.",
    currency: "Основна валюта",
    currencyDesc: "У цій валюті відображатимуться ціни, доходи, витрати та звіти.",
    currencyLabel: "Валюта",
    recognition: "Коли показувати дохід у звітах?",
    recognitionDesc: "Оберіть, як ви хочете бачити свої заробітки.",
    byPayment: "У день отримання оплати",
    byPaymentDesc: "Клієнт оплатив 10 травня — дохід буде показано у травні.",
    bySession: "У день проведення сесії",
    bySessionDesc: "Сесія відбулася 28 квітня, оплата надійшла 10 травня — дохід буде показано у квітні.",
    recognitionNote: "Це змінює лише відображення даних у звітах.",
    invoiceDetails: "Реквізити для рахунків",
    invoiceDetailsDesc: "Ці дані автоматично використовуватимуться у рахунках для клієнтів.",
    country: "Країна ведення практики",
    legalName: "Юридична назва або ім'я",
    legalAddress: "Юридична адреса",
    taxIdType: "Тип податкового номера",
    taxNumber: "Податковий / юридичний номер",
    vatMode: "Режим ПДВ",
    vatRate: "Ставка ПДВ (%)",
    vatNone: "Без ПДВ",
    vatIncluded: "З ПДВ (включено)",
    vatExcluded: "ПДВ зверху",
    signature: "Оформлення рахунків",
    signatureDesc: "Підпис і печатка",
    taxes: "Податки",
    taxesDesc: "Податки та регулярні платежі",
    cancel: "Скасувати",
    save: "Зберегти зміни",
    saving: "Збереження…",
    saved: "Налаштування збережено",
  },
  ru: {
    back: "Финансы",
    title: "Настройки финансов",
    subtitle: "Настройте валюту, финансовые отчёты, реквизиты для счетов и налоги.",
    currency: "Основная валюта",
    currencyDesc: "В этой валюте будут отображаться цены, доходы, расходы и отчёты.",
    currencyLabel: "Валюта",
    recognition: "Когда показывать доход в отчётах?",
    recognitionDesc: "Выберите, как вы хотите видеть свой заработок.",
    byPayment: "В день получения оплаты",
    byPaymentDesc: "Клиент оплатил 10 мая — доход будет показан в мае.",
    bySession: "В день проведения сессии",
    bySessionDesc: "Сессия состоялась 28 апреля, оплата пришла 10 мая — доход будет показан в апреле.",
    recognitionNote: "Это меняет только отображение данных в отчётах.",
    invoiceDetails: "Реквизиты для счетов",
    invoiceDetailsDesc: "Эти данные автоматически используются в счетах для клиентов.",
    country: "Страна ведения практики",
    legalName: "Юридическое название или имя",
    legalAddress: "Юридический адрес",
    taxIdType: "Тип налогового номера",
    taxNumber: "Налоговый / юридический номер",
    vatMode: "Режим НДС",
    vatRate: "Ставка НДС (%)",
    vatNone: "Без НДС",
    vatIncluded: "С НДС (включено)",
    vatExcluded: "НДС сверху",
    signature: "Оформление счетов",
    signatureDesc: "Подпись и печать",
    taxes: "Налоги",
    taxesDesc: "Налоги и регулярные платежи",
    cancel: "Отмена",
    save: "Сохранить изменения",
    saving: "Сохранение…",
    saved: "Настройки сохранены",
  },
  fr: {
    back: "Finances",
    title: "Paramètres financiers",
    subtitle: "Configurez la devise, les rapports financiers, les mentions de facturation et les taxes.",
    currency: "Devise principale",
    currencyDesc: "Les prix, revenus, dépenses et rapports s'affichent dans cette devise.",
    currencyLabel: "Devise",
    recognition: "Quand afficher les revenus dans les rapports ?",
    recognitionDesc: "Choisissez comment vous souhaitez voir vos revenus.",
    byPayment: "À la date du paiement",
    byPaymentDesc: "Le client a payé le 10 mai — le revenu apparaît en mai.",
    bySession: "À la date de la séance",
    bySessionDesc: "La séance a eu lieu le 28 avril, le paiement le 10 mai — le revenu apparaît en avril.",
    recognitionNote: "Cela modifie uniquement l'affichage des données dans les rapports.",
    invoiceDetails: "Mentions de facturation",
    invoiceDetailsDesc: "Ces informations sont utilisées automatiquement sur les factures.",
    country: "Pays d'exercice",
    legalName: "Raison sociale ou nom",
    legalAddress: "Adresse légale",
    taxIdType: "Type de numéro fiscal",
    taxNumber: "Numéro fiscal / légal",
    vatMode: "Régime de TVA",
    vatRate: "Taux de TVA (%)",
    vatNone: "Sans TVA",
    vatIncluded: "TVA incluse",
    vatExcluded: "TVA en sus",
    signature: "Apparence des factures",
    signatureDesc: "Signature et tampon",
    taxes: "Taxes",
    taxesDesc: "Taxes et paiements récurrents",
    cancel: "Annuler",
    save: "Enregistrer",
    saving: "Enregistrement…",
    saved: "Paramètres enregistrés",
  },
  pl: {
    back: "Finanse",
    title: "Ustawienia finansów",
    subtitle: "Ustaw walutę, raporty finansowe, dane do faktur i podatki.",
    currency: "Waluta główna",
    currencyDesc: "W tej walucie wyświetlane są ceny, przychody, wydatki i raporty.",
    currencyLabel: "Waluta",
    recognition: "Kiedy pokazywać przychód w raportach?",
    recognitionDesc: "Wybierz, jak chcesz widzieć swoje zarobki.",
    byPayment: "W dniu otrzymania płatności",
    byPaymentDesc: "Klient zapłacił 10 maja — przychód pojawi się w maju.",
    bySession: "W dniu sesji",
    bySessionDesc: "Sesja odbyła się 28 kwietnia, płatność 10 maja — przychód pojawi się w kwietniu.",
    recognitionNote: "To zmienia wyłącznie sposób prezentacji danych w raportach.",
    invoiceDetails: "Dane do faktur",
    invoiceDetailsDesc: "Te dane są automatycznie używane na fakturach dla klientów.",
    country: "Kraj prowadzenia praktyki",
    legalName: "Nazwa firmy lub imię i nazwisko",
    legalAddress: "Adres rejestrowy",
    taxIdType: "Rodzaj numeru podatkowego",
    taxNumber: "Numer podatkowy / prawny",
    vatMode: "Tryb VAT",
    vatRate: "Stawka VAT (%)",
    vatNone: "Bez VAT",
    vatIncluded: "VAT wliczony",
    vatExcluded: "VAT doliczany",
    signature: "Wygląd faktur",
    signatureDesc: "Podpis i pieczątka",
    taxes: "Podatki",
    taxesDesc: "Podatki i płatności cykliczne",
    cancel: "Anuluj",
    save: "Zapisz zmiany",
    saving: "Zapisywanie…",
    saved: "Ustawienia zapisane",
  },
};

const EMPTY = {
  income_recognition_method: "payment_date",
  business_country: "UA" as BusinessCountry,
  business_name: "",
  business_address: "",
  tax_id_type: "ipn",
  business_id: "",
  vat_mode: "none",
  vat_rate: 0,
};

export default function FinanceSettingsPage() {
  const { lang, t } = useLanguage();
  const L = COPY[normLang(lang)];
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const [form, setForm] = useState(EMPTY);
  const [baseline, setBaseline] = useState<string>("");

  useEffect(() => {
    if (!profile) return;
    const p = profile as any;
    const country = (p.business_country as BusinessCountry) || "UA";
    const next = {
      income_recognition_method: p.income_recognition_method || "payment_date",
      business_country: country,
      business_name: p.business_name || "",
      business_address: p.business_address || "",
      tax_id_type: isValidTaxIdForCountry(country, p.tax_id_type || "")
        ? p.tax_id_type
        : getDefaultTaxIdForCountry(country),
      business_id: p.business_id || "",
      vat_mode: p.vat_mode || "none",
      vat_rate: Number(p.vat_rate) || 0,
    };
    setForm(next);
    setBaseline(JSON.stringify(next));
  }, [profile]);

  const dirty = baseline !== "" && baseline !== JSON.stringify(form);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(form as any);
      setBaseline(JSON.stringify(form));
      toast({ title: L.saved });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  const handleCancel = () => {
    if (baseline) setForm(JSON.parse(baseline));
  };

  return (
    <AppLayout>
      <div className="pb-24">
        <div className="space-y-5 max-w-5xl">
          <div>
            <Link to="/finances" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-1">
              <ArrowLeft className="h-4 w-4 mr-1" /> {L.back}
            </Link>
            <h1 className="text-2xl font-bold text-foreground">{L.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{L.subtitle}</p>
          </div>

          {/* Currency + revenue recognition */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-4 items-stretch">
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <div>
                <h2 className="font-semibold text-foreground">{L.currency}</h2>
                <p className="text-sm text-muted-foreground mt-1">{L.currencyDesc}</p>
              </div>
              <CurrencySelect label={L.currencyLabel} savedLabel={L.saved} />
            </div>

            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <div>
                <h2 className="font-semibold text-foreground">{L.recognition}</h2>
                <p className="text-sm text-muted-foreground mt-1">{L.recognitionDesc}</p>
              </div>
              <RadioGroup
                value={form.income_recognition_method}
                onValueChange={(v) => setForm((f) => ({ ...f, income_recognition_method: v }))}
                className="grid gap-3"
              >
                {(["payment_date", "session_date"] as const).map((val) => {
                  const selected = form.income_recognition_method === val;
                  return (
                    <Label
                      key={val}
                      htmlFor={`irm-${val}`}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                        selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                      )}
                    >
                      <RadioGroupItem id={`irm-${val}`} value={val} className="mt-0.5" />
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-foreground">
                          {val === "payment_date" ? L.byPayment : L.bySession}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {val === "payment_date" ? L.byPaymentDesc : L.bySessionDesc}
                        </div>
                      </div>
                    </Label>
                  );
                })}
              </RadioGroup>
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                {L.recognitionNote}
              </p>
            </div>
          </div>

          {/* Invoice details */}
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <div>
              <h2 className="font-semibold text-foreground">{L.invoiceDetails}</h2>
              <p className="text-sm text-muted-foreground mt-1">{L.invoiceDetailsDesc}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">{L.country}</Label>
                  <Select
                    value={form.business_country}
                    onValueChange={(v) => {
                      const country = v as BusinessCountry;
                      setForm((f) => ({
                        ...f,
                        business_country: country,
                        tax_id_type: isValidTaxIdForCountry(country, f.tax_id_type)
                          ? f.tax_id_type
                          : getDefaultTaxIdForCountry(country),
                      }));
                    }}
                  >
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUSINESS_COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>{t(`country.${c}` as any)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">{L.legalAddress}</Label>
                  <Input
                    className="h-10"
                    value={form.business_address}
                    onChange={(e) => setForm((f) => ({ ...f, business_address: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-sm">{L.legalName}</Label>
                <Input
                  className="h-10"
                  value={form.business_name}
                  onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">{L.taxIdType}</Label>
                  <RadioGroup
                    value={form.tax_id_type}
                    onValueChange={(v) => setForm((f) => ({ ...f, tax_id_type: v }))}
                    className="flex gap-4 flex-wrap"
                  >
                    {TAX_ID_OPTIONS[form.business_country].map((opt) => (
                      <Label key={opt.code} htmlFor={`tit-${opt.code}`} className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem id={`tit-${opt.code}`} value={opt.code} />
                        <span className="text-sm font-normal">{opt.label}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">{L.taxNumber}</Label>
                  <Input
                    className="h-10"
                    value={form.business_id}
                    placeholder={TAX_ID_OPTIONS[form.business_country].find((o) => o.code === form.tax_id_type)?.placeholder}
                    onChange={(e) => setForm((f) => ({ ...f, business_id: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-4 self-end">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">{L.vatMode}</Label>
                  <Select value={form.vat_mode} onValueChange={(v) => setForm((f) => ({ ...f, vat_mode: v }))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{L.vatNone}</SelectItem>
                      <SelectItem value="included">{L.vatIncluded}</SelectItem>
                      <SelectItem value="excluded">{L.vatExcluded}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.vat_mode !== "none" && (
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-sm">{L.vatRate}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className="h-10"
                      value={form.vat_rate}
                      onChange={(e) => setForm((f) => ({ ...f, vat_rate: Number(e.target.value) }))}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Collapsible sections */}
          <Accordion type="multiple" className="space-y-3">
            <AccordionItem value="signature" className="bg-card rounded-xl border border-border px-5 border-b">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="flex items-center gap-3 text-left">
                  <PenLine className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-foreground">{L.signature}</span>
                  <span className="text-sm text-muted-foreground font-normal">{L.signatureDesc}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-5">
                <InvoiceSignatureSection />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="taxes" className="bg-card rounded-xl border border-border px-5 border-b">
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="flex items-center gap-3 text-left">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-foreground">{L.taxes}</span>
                  <span className="text-sm text-muted-foreground font-normal">{L.taxesDesc}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-5">
                <TaxesSection />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 border-t border-border bg-background/95 backdrop-blur px-4 sm:px-6 lg:px-8 py-3 flex justify-end gap-3">
        <Button variant="ghost" onClick={handleCancel} disabled={!dirty || updateProfile.isPending}>
          {L.cancel}
        </Button>
        <Button onClick={handleSave} disabled={!dirty || updateProfile.isPending}>
          {updateProfile.isPending ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{L.saving}</>) : L.save}
        </Button>
      </div>
    </AppLayout>
  );
}
