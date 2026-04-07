import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useProfile, useUpdateProfile } from "@/hooks/useData";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [form, setForm] = useState({ full_name: "", business_name: "", phone: "", language: "en", reminder_minutes: 1440 });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        business_name: profile.business_name || "",
        phone: profile.phone || "",
        language: profile.language,
        reminder_minutes: profile.reminder_minutes,
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
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("settings.subtitle")}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-foreground">{t("settings.profile")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>{t("common.fullName")}</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>{t("common.email")}</Label><Input value={user?.email || ""} disabled /></div>
            <div className="space-y-2"><Label>{t("common.businessName")}</Label><Input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>{t("common.phone")}</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <Button onClick={handleSave} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>

        <Separator />

        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-foreground">{t("settings.language")}</h2>
          <div className="max-w-xs space-y-2">
            <Label>{t("settings.displayLanguage")}</Label>
            <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="uk">Українська</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-foreground">{t("settings.notifications")}</h2>
          <div className="max-w-xs space-y-2">
            <Label>{t("settings.reminderTime")}</Label>
            <Select value={form.reminder_minutes.toString()} onValueChange={v => setForm(f => ({ ...f, reminder_minutes: parseInt(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="60">{t("settings.1hBefore")}</SelectItem>
                <SelectItem value="180">{t("settings.3hBefore")}</SelectItem>
                <SelectItem value="1440">{t("settings.24hBefore")}</SelectItem>
                <SelectItem value="2880">{t("settings.48hBefore")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-foreground">{t("settings.subscription")}</h2>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium text-foreground">Pro Plan — €20/month</p>
              <p className="text-sm text-muted-foreground">{t("settings.comingSoon")}</p>
            </div>
            <Button variant="outline">{t("settings.manageBilling")}</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
