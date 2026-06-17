import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useProfile, useUpdateProfile } from "@/hooks/useData";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage, translateFor } from "@/i18n/LanguageContext";
import { Language, AppLanguage } from "@/i18n/translations";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Lock, Sun, Moon, Monitor, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "@/hooks/useTheme";
import { readSoundReminder, writeSoundReminder, type SoundReminderSettings } from "@/hooks/useSoundReminder";

export function ProfileSection() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { t, setLang } = useLanguage();
  const { toast } = useToast();

  const [form, setForm] = useState({
    full_name: "", business_name: "", phone: "", language: "en",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        business_name: profile.business_name || "",
        phone: profile.phone || "",
        language: profile.language || "en",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    const newLang = (form.language as AppLanguage) || "en";
    const langChanged = newLang !== (profile?.language as AppLanguage);
    try {
      await updateProfile.mutateAsync(form);
      setLang(newLang);
      toast({ title: langChanged ? translateFor(newLang, "language.updated") : translateFor(newLang, "settings.saved") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-foreground">{t("settings.profile")}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2"><Label>{t("common.fullName")}</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
        <div className="space-y-2"><Label>{t("common.email")}</Label><Input value={user?.email || ""} disabled /></div>
        <div className="space-y-2"><Label>{t("common.businessName")}</Label><Input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} /></div>
        <div className="space-y-2"><Label>{t("common.phone")}</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
      </div>

      <Separator />

      <div className="space-y-2">
        <h3 className="font-medium text-foreground text-sm">{t("language.dialogTitle")}</h3>
        <RadioGroup
          value={form.language}
          onValueChange={(v) => setForm((f) => ({ ...f, language: v }))}
          className="grid gap-2 sm:grid-cols-2"
        >
          {(["en", "uk", "ru", "fr", "pl"] as const).map((code) => {
            const isCurrent = form.language === code;
            const native: Record<string, string> = { en: "English", uk: "Українська", ru: "Русский", fr: "Français", pl: "Polski" };
            const flag: Record<string, string> = { en: "🇬🇧", uk: "🇺🇦", ru: "", fr: "🇫🇷", pl: "🇵🇱" };
            return (
              <Label key={code} htmlFor={`lang-${code}`} className={cn(
                "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                isCurrent ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
              )}>
                <RadioGroupItem id={`lang-${code}`} value={code} />
                <span className="text-xl" aria-hidden>{flag[code]}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">{native[code]}</div>
                  <div className="text-xs text-muted-foreground uppercase">{code}</div>
                </div>
                {isCurrent && <Badge variant="secondary" className="shrink-0">{t("language.current")}</Badge>}
              </Label>
            );
          })}
        </RadioGroup>
      </div>

      <div className="pt-2">
        <Button onClick={handleSave} disabled={updateProfile.isPending}>
          {updateProfile.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </div>
  );
}

export function AppearanceSection() {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <h2 className="font-semibold text-foreground">{t("settings.appearance")}</h2>
      <div className="space-y-2">
        <Label>{t("settings.theme")}</Label>
        <p className="text-xs text-muted-foreground">{t("settings.themeDesc")}</p>
        <div className="grid grid-cols-3 gap-2 max-w-md pt-1">
          {([
            { v: "light", icon: Sun, label: t("settings.themeLight") },
            { v: "dark", icon: Moon, label: t("settings.themeDark") },
            { v: "system", icon: Monitor, label: t("settings.themeSystem") },
          ] as const).map(({ v, icon: Icon, label }) => (
            <button key={v} type="button" onClick={() => setTheme(v as Theme)}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-sm transition-colors",
                theme === v
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={theme === v}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SecuritySection() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, newPass: false, confirm: false });
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (passwordForm.newPass.length < 6) {
      toast({ title: t("common.error"), description: t("password.tooShort"), variant: "destructive" });
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast({ title: t("common.error"), description: t("password.mismatch"), variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "", password: passwordForm.current,
      });
      if (signInError) throw new Error(t("common.error"));
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPass });
      if (error) throw error;
      toast({ title: t("password.changed") });
      setPasswordForm({ current: "", newPass: "", confirm: "" });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  const renderField = (label: string, key: "current" | "newPass" | "confirm") => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type={showPasswords[key] ? "text" : "password"}
          value={passwordForm[key]}
          onChange={e => setPasswordForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder="••••••••"
          className="pr-10"
        />
        <button type="button"
          onClick={() => setShowPasswords(s => ({ ...s, [key]: !s[key] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {showPasswords[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="font-semibold text-foreground">{t("password.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("password.subtitle")}</p>
        </div>
      </div>
      <div className="space-y-4 max-w-sm">
        {renderField(t("password.currentPassword"), "current")}
        {renderField(t("password.newPassword"), "newPass")}
        {renderField(t("password.confirmPassword"), "confirm")}
        <Button onClick={handleChangePassword}
          disabled={changingPassword || !passwordForm.current || !passwordForm.newPass || !passwordForm.confirm}
          variant="outline">
          {changingPassword ? t("password.changing") : t("password.changePassword")}
        </Button>
      </div>
    </div>
  );
}

export function NotificationsSection() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [reminder, setReminder] = useState<number>(1440);
  const [sound, setSound] = useState<SoundReminderSettings>(() => readSoundReminder());

  useEffect(() => { writeSoundReminder(sound); }, [sound]);
  useEffect(() => {
    if (profile) setReminder(profile.reminder_minutes ?? 1440);
  }, [profile]);

  const save = async (val: number) => {
    setReminder(val);
    try {
      await updateProfile.mutateAsync({ reminder_minutes: val });
      toast({ title: t("settings.saved") });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <h2 className="font-semibold text-foreground">{t("settings.notifications")}</h2>
      <div className="max-w-xs space-y-2">
        <Label>{t("settings.reminderTime")}</Label>
        <Select value={reminder.toString()} onValueChange={v => save(parseInt(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="60">{t("settings.1hBefore")}</SelectItem>
            <SelectItem value="180">{t("settings.3hBefore")}</SelectItem>
            <SelectItem value="1440">{t("settings.24hBefore")}</SelectItem>
            <SelectItem value="2880">{t("settings.48hBefore")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label className="flex items-center gap-2"><Volume2 className="h-4 w-4" /> {t("settings.soundReminder")}</Label>
            <p className="text-xs text-muted-foreground">{t("settings.soundReminderDesc")}</p>
          </div>
          <Switch checked={sound.enabled} onCheckedChange={(v) => setSound(s => ({ ...s, enabled: v }))} />
        </div>
        {sound.enabled && (
          <div className="max-w-xs space-y-2">
            <Label>{t("settings.soundLeadTime")}</Label>
            <Select value={sound.minutesBefore.toString()} onValueChange={v => setSound(s => ({ ...s, minutesBefore: parseInt(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t("settings.1minBefore")}</SelectItem>
                <SelectItem value="5">{t("settings.5minBefore")}</SelectItem>
                <SelectItem value="10">{t("settings.10minBefore")}</SelectItem>
                <SelectItem value="15">{t("settings.15minBefore")}</SelectItem>
                <SelectItem value="30">{t("settings.30minBefore")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
