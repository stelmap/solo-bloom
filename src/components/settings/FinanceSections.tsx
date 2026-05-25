import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-time-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useProfile, useUpdateProfile,
  useTaxSettings, useCreateTaxSetting, useUpdateTaxSetting, useDeleteTaxSetting,
  useTaxAccrualStatus, useGenerateTaxExpenses,
} from "@/hooks/useData";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import { Receipt, Plus, Trash2, Pencil, RefreshCw, AlertCircle } from "lucide-react";
import { nextAccrualDate } from "@/lib/taxExpenseGenerator";
import { Link } from "react-router-dom";

export function CurrencyInvoicingSection() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const [form, setForm] = useState({
    currency: "EUR", business_id: "", business_address: "", vat_mode: "none", vat_rate: 0,
  });
  useEffect(() => {
    if (profile) {
      setForm({
        currency: (profile as any).currency || "EUR",
        business_id: (profile as any).business_id || "",
        business_address: (profile as any).business_address || "",
        vat_mode: (profile as any).vat_mode || "none",
        vat_rate: Number((profile as any).vat_rate) || 0,
      });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(form);
      toast({ title: t("settings.saved") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-foreground">{t("settings.currency")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.currencyDesc")}</p>
        <div className="max-w-xs space-y-2">
          <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">{t("currency.EUR")}</SelectItem>
              <SelectItem value="UAH">{t("currency.UAH")}</SelectItem>
              <SelectItem value="PLN">{t("currency.PLN")}</SelectItem>
              <SelectItem value="USD">{t("currency.USD")}</SelectItem>
            </SelectContent>
          </Select>
          {form.currency !== ((profile as any)?.currency || "EUR") && (
            <p className="text-xs text-warning">{t("settings.currencyWarning")}</p>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">{t("settings.billing")}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>{t("settings.businessId")}</Label><Input value={form.business_id} onChange={e => setForm(f => ({ ...f, business_id: e.target.value }))} placeholder="e.g. UA1234567890" /></div>
          <div className="space-y-2"><Label>{t("settings.businessAddress")}</Label><Input value={form.business_address} onChange={e => setForm(f => ({ ...f, business_address: e.target.value }))} /></div>
          <div className="space-y-2">
            <Label>{t("settings.vatMode")}</Label>
            <Select value={form.vat_mode} onValueChange={v => setForm(f => ({ ...f, vat_mode: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("settings.vatNone")}</SelectItem>
                <SelectItem value="included">{t("settings.vatIncluded")}</SelectItem>
                <SelectItem value="excluded">{t("settings.vatExcluded")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.vat_mode !== "none" && (
            <div className="space-y-2">
              <Label>{t("settings.vatRate")}</Label>
              <Input type="number" min={0} max={100} value={form.vat_rate} onChange={e => setForm(f => ({ ...f, vat_rate: Number(e.target.value) }))} />
            </div>
          )}
        </div>
        <div className="pt-2">
          <Button onClick={handleSave} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RevenueRecognitionSection() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [method, setMethod] = useState<string>("payment_date");

  useEffect(() => {
    if (profile) setMethod((profile as any).income_recognition_method || "payment_date");
  }, [profile]);

  const save = async (v: string) => {
    setMethod(v);
    try {
      await updateProfile.mutateAsync({ income_recognition_method: v } as any);
      toast({ title: t("settings.saved") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-foreground">{t("settings.financialAnalytics")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.incomeRecognitionDesc")}</p>
      </div>
      <div className="space-y-2">
        <Label>{t("settings.incomeRecognition")}</Label>
        <RadioGroup value={method} onValueChange={save} className="grid gap-2">
          {(["payment_date", "session_date"] as const).map((val) => {
            const labelKey = val === "payment_date" ? "settings.byPaymentDate" : "settings.bySessionDate";
            const descKey = val === "payment_date" ? "settings.byPaymentDateDesc" : "settings.bySessionDateDesc";
            return (
              <Label key={val} htmlFor={`irm-${val}`} className={cn(
                "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                method === val ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
              )}>
                <RadioGroupItem id={`irm-${val}`} value={val} className="mt-0.5" />
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-foreground">{t(labelKey as any)}</div>
                  <div className="text-xs text-muted-foreground">{t(descKey as any)}</div>
                </div>
              </Label>
            );
          })}
        </RadioGroup>
        <p className="text-xs text-muted-foreground">{t("settings.incomeRecognitionHelper")}</p>
      </div>

      <div className="pt-3 border-t border-border">
        <Link to="/finances/breakeven" className="text-sm text-primary hover:underline">
          {t("nav.breakeven")} →
        </Link>
      </div>
    </div>
  );
}

export function TaxesSection() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const { data: taxSettings = [] } = useTaxSettings();
  const { data: accrualStatus = {}, refetch: refetchAccrual } = useTaxAccrualStatus();
  const generateTax = useGenerateTaxExpenses();
  const createTax = useCreateTaxSetting();
  const updateTax = useUpdateTaxSetting();
  const deleteTax = useDeleteTaxSetting();

  const [taxOpen, setTaxOpen] = useState(false);
  const [taxEditId, setTaxEditId] = useState<string | null>(null);
  const [taxForm, setTaxForm] = useState({
    tax_name: "", tax_type: "percentage", tax_rate: 0, fixed_amount: 0,
    frequency: "monthly", calculate_on: "actual_income",
    start_calculation_date: new Date().toISOString().split("T")[0],
  });

  const openCreateTax = () => {
    setTaxEditId(null);
    setTaxForm({ tax_name: "", tax_type: "percentage", tax_rate: 0, fixed_amount: 0, frequency: "monthly", calculate_on: "actual_income", start_calculation_date: new Date().toISOString().split("T")[0] });
    setTaxOpen(true);
  };
  const openEditTax = (tax: any) => {
    setTaxEditId(tax.id);
    setTaxForm({
      tax_name: tax.tax_name, tax_type: tax.tax_type, tax_rate: Number(tax.tax_rate),
      fixed_amount: Number(tax.fixed_amount), frequency: tax.frequency, calculate_on: tax.calculate_on,
      start_calculation_date: tax.start_calculation_date || new Date().toISOString().split("T")[0],
    });
    setTaxOpen(true);
  };
  const handleSaveTax = async () => {
    if (!taxForm.tax_name) return;
    try {
      if (taxEditId) await updateTax.mutateAsync({ id: taxEditId, ...taxForm });
      else await createTax.mutateAsync(taxForm);
      toast({ title: t("tax.saved") });
      setTaxOpen(false);
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };
  const handleDeleteTax = async (id: string) => {
    try { await deleteTax.mutateAsync(id); toast({ title: t("tax.deleted") }); }
    catch (e: any) { toast({ title: t("common.error"), description: e.message, variant: "destructive" }); }
  };
  const handleToggleTax = async (id: string, isActive: boolean) => {
    try { await updateTax.mutateAsync({ id, is_active: isActive }); }
    catch (e: any) { toast({ title: t("common.error"), description: e.message, variant: "destructive" }); }
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-warning/20 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-warning" />
            <div>
              <h2 className="font-semibold text-foreground">{t("tax.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("tax.subtitle")}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={openCreateTax}><Plus className="h-4 w-4 mr-1" /> {t("tax.addTax")}</Button>
        </div>

        {(taxSettings as any[]).length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
            {t("tax.noTaxes")}
          </div>
        ) : (
          <div className="space-y-2">
            {(taxSettings as any[]).map((tax: any) => {
              const status = (accrualStatus as any)[tax.id];
              const needsUpdate = !!status?.needsUpdate;
              const handleRefresh = async () => {
                try {
                  // Refetch the status to get fresh expected entries based on
                  // the latest income/expense data before regenerating.
                  const fresh = await refetchAccrual();
                  const freshEntries = (fresh.data as any)?.[tax.id]?.expected || status?.expected || [];
                  await generateTax.mutateAsync({ taxSettingId: tax.id, entries: freshEntries });
                  toast({ title: t("tax.refreshed") });
                } catch (e: any) {
                  toast({ title: t("common.error"), description: e.message, variant: "destructive" });
                }
              };
              return (
              <div key={tax.id} className={cn("p-4 rounded-lg border", tax.is_active ? "bg-warning/5 border-warning/20" : "bg-muted/30 border-border opacity-60")}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{tax.tax_name}</span>
                      <Badge variant="outline" className={cn("text-xs", tax.is_active ? "border-warning text-warning" : "")}>
                        {tax.tax_type === "percentage" ? `${tax.tax_rate}%` : `${(profile as any)?.currency === "UAH" ? "₴" : (profile as any)?.currency === "PLN" ? "zł" : (profile as any)?.currency === "USD" ? "$" : "€"}${Number(tax.fixed_amount).toLocaleString()}`}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {tax.frequency === "quarterly" ? t("tax.quarterly") : t("tax.monthly")}
                      </Badge>
                      {needsUpdate && (
                        <Badge variant="outline" className="text-xs border-destructive text-destructive gap-1">
                          <AlertCircle className="h-3 w-3" /> {t("tax.needsUpdate")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {needsUpdate && (
                      <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleRefresh} disabled={generateTax.isPending}>
                        <RefreshCw className={cn("h-3.5 w-3.5", generateTax.isPending && "animate-spin")} /> {t("tax.refresh")}
                      </Button>
                    )}
                    <Switch checked={tax.is_active} onCheckedChange={v => handleToggleTax(tax.id, v)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTax(tax)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteTax(tax.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {tax.is_active && (() => {
                  const next = nextAccrualDate(tax as any);
                  return next ? (
                    <p className="text-xs text-muted-foreground mt-2">{t("tax.nextAccrual")}: {next.toLocaleDateString()}</p>
                  ) : null;
                })()}
              </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={taxOpen} onOpenChange={setTaxOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{taxEditId ? t("tax.editTax") : t("tax.addTax")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>{t("tax.taxName")} *</Label><Input value={taxForm.tax_name} onChange={e => setTaxForm(f => ({ ...f, tax_name: e.target.value }))} placeholder="e.g. Income Tax" /></div>
            <div className="space-y-2">
              <Label>{t("tax.taxType")}</Label>
              <Select value={taxForm.tax_type} onValueChange={v => setTaxForm(f => ({ ...f, tax_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{t("tax.percentage")}</SelectItem>
                  <SelectItem value="fixed">{t("tax.fixed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {taxForm.tax_type === "percentage" && (
              <>
                <div className="space-y-2"><Label>{t("tax.taxRate")}</Label><Input type="number" step="0.1" value={taxForm.tax_rate || ""} onChange={e => setTaxForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="space-y-2">
                  <Label>{t("tax.calculateOn")}</Label>
                  <Select value={taxForm.calculate_on} onValueChange={v => setTaxForm(f => ({ ...f, calculate_on: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actual_income">{t("tax.actualIncome")}</SelectItem>
                      <SelectItem value="all_income">{t("tax.allIncome")}</SelectItem>
                      <SelectItem value="expenses">{t("tax.percentageExpenses")}</SelectItem>
                      <SelectItem value="profit">{t("tax.percentageProfit")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {taxForm.tax_type === "fixed" && (
              <div className="space-y-2"><Label>{t("tax.fixedAmount")}</Label><Input type="number" step="0.01" value={taxForm.fixed_amount || ""} onChange={e => setTaxForm(f => ({ ...f, fixed_amount: parseFloat(e.target.value) || 0 }))} /></div>
            )}
            <div className="space-y-2">
              <Label>{t("tax.frequency")}</Label>
              <Select value={taxForm.frequency} onValueChange={v => setTaxForm(f => ({ ...f, frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t("tax.monthly")}</SelectItem>
                  <SelectItem value="quarterly">{t("tax.quarterly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("tax.startCalculationDate")} *</Label>
              <DatePicker date={taxForm.start_calculation_date} onDateChange={v => setTaxForm(f => ({ ...f, start_calculation_date: v }))} />
              <p className="text-xs text-muted-foreground">{t("tax.startCalculationDateHint")}</p>
            </div>
            <Button onClick={handleSaveTax} className="w-full" disabled={createTax.isPending || updateTax.isPending || !taxForm.tax_name}>
              {(createTax.isPending || updateTax.isPending) ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
