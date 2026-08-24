import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile } from "@/hooks/useData";
import { useBookingLink } from "@/hooks/usePracticeProfile";
import { BookingAvailabilitySection } from "@/components/practice/BookingAvailabilitySection";

import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { AppLanguage } from "@/i18n/translations";
import { cn } from "@/lib/utils";
import { ArrowLeft, ImageIcon, Loader2, Copy, RefreshCw, ExternalLink } from "lucide-react";

type Lang = "en" | "uk" | "ru" | "fr" | "pl";
const normLang = (v: unknown): Lang => {
  const s = String(v || "en").toLowerCase();
  return (["en", "uk", "ru", "fr", "pl"].includes(s) ? s : "en") as Lang;
};

const COPY: Record<Lang, Record<string, string>> = {
  en: {
    title: "Practice profile",
    subtitle: "Used in public booking, invoices and everywhere your practice is shown.",
    identity: "Identity",
    emblem: "Practice emblem", optional: "(optional)",
    upload: "Upload logo", replace: "Replace logo", remove: "Remove",
    uploadHint: "PNG, JPG or SVG · 2MB max",
    practiceName: "Practice name", practiceNamePh: "e.g. Mindful Healing Therapy",
    therapistName: "Therapist name", therapistNamePh: "e.g. Olga Stelmakh",
    contact: "Contact & legal data",
    email: "Email", phone: "Phone",
    legalName: "Business / legal name", taxId: "Tax ID / Legal ID", taxIdPh: "e.g. 12-3456789",
    address: "Business address",
    regional: "Regional preferences",
    currency: "Currency", language: "Language", timezone: "Time zone",
    booking: "Public booking",
    enable: "Enable public booking",
    enableDesc: "Clients can book free slots through your personal link.",
    link: "Your booking link",
    linkDesc: "Generated automatically from your practice profile.",
    mode: "Booking mode",
    modeManual: "Manual approval (recommended)",
    modeAuto: "Auto approval (matched clients only)",
    copied: "Link copied",
    regenerate: "Regenerate",
    regenerateConfirm: "Regenerate link? The old link will stop working immediately.",
    regenerated: "Link regenerated. The old link no longer works.",
    save: "Save profile", saving: "Saving…", saved: "Saved",
    incomplete: "Complete the highlighted fields to finish setup.",
    back: "Settings",
  },
  uk: {
    title: "Профіль практики",
    subtitle: "Використовується в публічному записі, рахунках і всюди, де показано вашу практику.",
    identity: "Ідентичність",
    emblem: "Емблема практики", optional: "(необов'язково)",
    upload: "Завантажити лого", replace: "Замінити лого", remove: "Видалити",
    uploadHint: "PNG, JPG або SVG · до 2 МБ",
    practiceName: "Назва практики", practiceNamePh: "напр. Простір терапії",
    therapistName: "Ім'я терапевта", therapistNamePh: "напр. Ольга Стельмах",
    contact: "Контактні та юридичні дані",
    email: "Email", phone: "Телефон",
    legalName: "Юридична назва", taxId: "Податковий / юридичний номер", taxIdPh: "напр. 1234567890",
    address: "Юридична адреса",
    regional: "Регіональні налаштування",
    currency: "Валюта", language: "Мова", timezone: "Часовий пояс",
    booking: "Публічний запис",
    enable: "Увімкнути публічний запис",
    enableDesc: "Клієнти можуть бронювати вільні слоти за вашим особистим посиланням.",
    link: "Ваше посилання для запису",
    linkDesc: "Генерується автоматично з профілю практики.",
    mode: "Режим запису",
    modeManual: "Ручне підтвердження (рекомендовано)",
    modeAuto: "Авто-підтвердження (лише відомі клієнти)",
    copied: "Посилання скопійовано",
    regenerate: "Оновити",
    regenerateConfirm: "Створити нове посилання? Старе перестане працювати негайно.",
    regenerated: "Посилання оновлено. Старе більше не працює.",
    save: "Зберегти профіль", saving: "Збереження…", saved: "Збережено",
    incomplete: "Заповніть підсвічені поля, щоб завершити налаштування.",
    back: "Налаштування",
  },
  ru: {
    title: "Профиль практики",
    subtitle: "Используется в публичной записи, счетах и везде, где показана ваша практика.",
    identity: "Идентичность",
    emblem: "Эмблема практики", optional: "(необязательно)",
    upload: "Загрузить лого", replace: "Заменить лого", remove: "Удалить",
    uploadHint: "PNG, JPG или SVG · до 2 МБ",
    practiceName: "Название практики", practiceNamePh: "напр. Пространство терапии",
    therapistName: "Имя терапевта", therapistNamePh: "напр. Ольга Стельмах",
    contact: "Контактные и юридические данные",
    email: "Email", phone: "Телефон",
    legalName: "Юридическое название", taxId: "Налоговый / юридический номер", taxIdPh: "напр. 1234567890",
    address: "Юридический адрес",
    regional: "Региональные настройки",
    currency: "Валюта", language: "Язык", timezone: "Часовой пояс",
    booking: "Публичная запись",
    enable: "Включить публичную запись",
    enableDesc: "Клиенты могут записываться на свободные слоты по вашей персональной ссылке.",
    link: "Ваша ссылка для записи",
    linkDesc: "Генерируется автоматически из профиля практики.",
    mode: "Режим записи",
    modeManual: "Ручное подтверждение (рекомендуется)",
    modeAuto: "Авто-подтверждение (только известные клиенты)",
    copied: "Ссылка скопирована",
    regenerate: "Обновить",
    regenerateConfirm: "Создать новую ссылку? Старая перестанет работать немедленно.",
    regenerated: "Ссылка обновлена. Старая больше не работает.",
    save: "Сохранить профиль", saving: "Сохранение…", saved: "Сохранено",
    incomplete: "Заполните подсвеченные поля, чтобы завершить настройку.",
    back: "Настройки",
  },
  fr: {
    title: "Profil du cabinet",
    subtitle: "Utilisé pour la réservation publique, les factures et partout où votre cabinet apparaît.",
    identity: "Identité",
    emblem: "Emblème du cabinet", optional: "(facultatif)",
    upload: "Téléverser un logo", replace: "Remplacer le logo", remove: "Supprimer",
    uploadHint: "PNG, JPG ou SVG · 2 Mo max",
    practiceName: "Nom du cabinet", practiceNamePh: "ex. Cabinet Mindful",
    therapistName: "Nom du thérapeute", therapistNamePh: "ex. Olga Stelmakh",
    contact: "Coordonnées et données légales",
    email: "Email", phone: "Téléphone",
    legalName: "Raison sociale", taxId: "Numéro fiscal / légal", taxIdPh: "ex. 12-3456789",
    address: "Adresse professionnelle",
    regional: "Préférences régionales",
    currency: "Devise", language: "Langue", timezone: "Fuseau horaire",
    booking: "Réservation publique",
    enable: "Activer la réservation publique",
    enableDesc: "Les clients réservent des créneaux libres via votre lien personnel.",
    link: "Votre lien de réservation",
    linkDesc: "Généré automatiquement à partir de votre profil.",
    mode: "Mode de réservation",
    modeManual: "Validation manuelle (recommandé)",
    modeAuto: "Confirmation automatique (clients connus)",
    copied: "Lien copié",
    regenerate: "Régénérer",
    regenerateConfirm: "Régénérer le lien ? L'ancien cessera de fonctionner immédiatement.",
    regenerated: "Lien régénéré. L'ancien ne fonctionne plus.",
    save: "Enregistrer le profil", saving: "Enregistrement…", saved: "Enregistré",
    incomplete: "Complétez les champs surlignés pour terminer la configuration.",
    back: "Paramètres",
  },
  pl: {
    title: "Profil praktyki",
    subtitle: "Używany w publicznej rezerwacji, fakturach i wszędzie, gdzie widoczna jest praktyka.",
    identity: "Tożsamość",
    emblem: "Emblemat praktyki", optional: "(opcjonalnie)",
    upload: "Prześlij logo", replace: "Zmień logo", remove: "Usuń",
    uploadHint: "PNG, JPG lub SVG · maks. 2 MB",
    practiceName: "Nazwa praktyki", practiceNamePh: "np. Gabinet Mindful",
    therapistName: "Imię terapeuty", therapistNamePh: "np. Olga Stelmakh",
    contact: "Dane kontaktowe i prawne",
    email: "Email", phone: "Telefon",
    legalName: "Nazwa firmy / prawna", taxId: "NIP / numer prawny", taxIdPh: "np. 1234567890",
    address: "Adres firmy",
    regional: "Preferencje regionalne",
    currency: "Waluta", language: "Język", timezone: "Strefa czasowa",
    booking: "Publiczna rezerwacja",
    enable: "Włącz publiczną rezerwację",
    enableDesc: "Klienci rezerwują wolne terminy przez Twój osobisty link.",
    link: "Twój link do rezerwacji",
    linkDesc: "Generowany automatycznie z profilu praktyki.",
    mode: "Tryb rezerwacji",
    modeManual: "Ręczna akceptacja (zalecane)",
    modeAuto: "Automatyczne potwierdzenie (znani klienci)",
    copied: "Link skopiowany",
    regenerate: "Wygeneruj ponownie",
    regenerateConfirm: "Wygenerować nowy link? Stary przestanie działać natychmiast.",
    regenerated: "Link wygenerowany ponownie. Stary już nie działa.",
    save: "Zapisz profil", saving: "Zapisywanie…", saved: "Zapisano",
    incomplete: "Uzupełnij podświetlone pola, aby zakończyć konfigurację.",
    back: "Ustawienia",
  },
};

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export default function PracticeProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { lang, setLang } = useLanguage();
  const L = COPY[normLang(lang)];
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: link } = useBookingLink();

  const [form, setForm] = useState({
    avatar_url: "",
    business_name: "",
    full_name: "",
    public_email: "",
    phone: "",
    business_id: "",
    business_address: "",
    currency: "EUR",
    language: "en",
    timezone: "",
  });
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const p = profile as any;
    setForm({
      avatar_url: p.avatar_url || "",
      business_name: p.business_name || "",
      full_name: p.full_name || "",
      public_email: p.public_email || user?.email || "",
      phone: p.phone || "",
      business_id: p.business_id || "",
      business_address: p.business_address || "",
      currency: p.currency || "EUR",
      language: p.language || "en",
      timezone: p.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }, [profile, user?.email]);

  useEffect(() => {
    if (link) {
      setIsActive(!!(link as any).is_active);
      setMode((((link as any).mode as any) || "manual") as "manual" | "auto");
    }
  }, [link]);

  // Ensure a booking link row exists so the URL can be shown right away.
  const ensureLink = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase.from("booking_links").insert({ user_id: user.id } as any);
      if (error && !String(error.message).includes("duplicate")) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booking_link", user?.id] }),
  });
  useEffect(() => {
    if (user?.id && link === null) ensureLink.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, link]);
  // Deep-link support: /settings/practice#booking-availability
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.location.hash.replace("#", "");
    if (!id) return;
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
    return () => window.clearTimeout(timer);
  }, []);


  const tzOptions = useMemo(() => {
    try {
      // @ts-ignore
      const all: string[] = (Intl as any).supportedValuesOf?.("timeZone") ?? [];
      return all;
    } catch {
      return [];
    }
  }, []);

  const handle = ((link as any)?.slug as string) || (link as any)?.token || "";
  const url = handle ? `${window.location.origin}/book/${handle}` : "";

  const missing = (key: keyof typeof form) => touched && !String(form[key] || "").trim();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: L.uploadHint, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/emblem-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("practice-avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("practice-avatars").getPublicUrl(path);
      await updateProfile.mutateAsync({ avatar_url: pub.publicUrl } as any);
      setForm((f) => ({ ...f, avatar_url: pub.publicUrl }));
      toast({ title: L.saved });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    await updateProfile.mutateAsync({ avatar_url: null } as any);
    setForm((f) => ({ ...f, avatar_url: "" }));
  };

  const regenerate = async () => {
    if (!window.confirm(L.regenerateConfirm)) return;
    const { error } = await supabase.rpc("regenerate_booking_link_token");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: L.regenerated });
    qc.invalidateQueries({ queryKey: ["booking_link", user?.id] });
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setTouched(true);
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        ...form,
        avatar_url: form.avatar_url || null,
      } as any);

      const displayName = form.business_name || form.full_name || "";
      const { error: linkErr } = await supabase
        .from("booking_links")
        .update({ is_active: isActive, mode, display_name: displayName } as any)
        .eq("user_id", user.id);
      if (linkErr) throw linkErr;

      // Auto-generate a readable handle from the practice identity when none exists.
      if (!((link as any)?.slug) && displayName) {
        const candidate = slugify(displayName);
        if (candidate.length >= 3) {
          await supabase.rpc("set_booking_link_slug", { p_slug: candidate });
        }
      }

      setLang((form.language as AppLanguage) || "en");
      qc.invalidateQueries({ queryKey: ["booking_link", user.id] });
      toast({ title: L.saved });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof form, label: string, placeholder?: string, type = "text") => (
    <div className="space-y-2">
      <Label className="font-semibold">{label}</Label>
      <Input
        type={type}
        value={form[key] as string}
        placeholder={placeholder}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className={cn(missing(key) && "border-destructive")}
      />
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <Link to="/settings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> {L.back}
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{L.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{L.subtitle}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 space-y-6">
          {/* A. Identity */}
          <section className="space-y-4">
            <h2 className="font-semibold text-foreground">{L.identity}</h2>
            <div className="space-y-2">
              <Label className="font-semibold">
                {L.emblem} <span className="text-muted-foreground font-normal">{L.optional}</span>
              </Label>
              <div className="flex items-start gap-4">
                <label className="h-28 w-40 rounded-xl border border-dashed border-border bg-muted/40 flex flex-col items-center justify-center gap-1 cursor-pointer overflow-hidden text-center">
                  {form.avatar_url ? (
                    <img src={form.avatar_url} alt={form.business_name || "Practice emblem"} className="h-full w-full object-contain p-2" />
                  ) : uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm font-medium">{L.upload}</span>
                      <span className="text-[11px] text-muted-foreground px-2">{L.uploadHint}</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </label>
                {form.avatar_url && (
                  <Button variant="ghost" size="sm" onClick={removeImage}>{L.remove}</Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("business_name", L.practiceName, L.practiceNamePh)}
              {field("full_name", L.therapistName, L.therapistNamePh)}
            </div>
          </section>

          <Separator />

          {/* B. Contact & legal */}
          <section className="space-y-4">
            <h2 className="font-semibold text-foreground">{L.contact}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("public_email", L.email, "name@example.com", "email")}
              {field("phone", L.phone, "+380 …")}
              {field("business_id", L.taxId, L.taxIdPh)}
              {field("business_address", L.address)}
            </div>
          </section>

          <Separator />

          {/* C. Regional */}
          <section className="space-y-4">
            <h2 className="font-semibold text-foreground">{L.regional}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-semibold">{L.currency}</Label>
                <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR — €</SelectItem>
                    <SelectItem value="UAH">UAH — ₴</SelectItem>
                    <SelectItem value="PLN">PLN — zł</SelectItem>
                    <SelectItem value="USD">USD — $</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">{L.language}</Label>
                <Select value={form.language} onValueChange={(v) => setForm((f) => ({ ...f, language: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                    <SelectItem value="uk">🇺🇦 Українська</SelectItem>
                    <SelectItem value="ru">🇷🇺 Русский</SelectItem>
                    <SelectItem value="fr">🇫🇷 Français</SelectItem>
                    <SelectItem value="pl">🇵🇱 Polski</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">{L.timezone}</Label>
                {tzOptions.length > 0 ? (
                  <Select value={form.timezone} onValueChange={(v) => setForm((f) => ({ ...f, timezone: v }))}>
                    <SelectTrigger className={cn(missing("timezone") && "border-destructive")}><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {tzOptions.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} />
                )}
              </div>
            </div>
          </section>

          <Separator />

          {/* D. Public booking */}
          <section className="space-y-4">
            <h2 className="font-semibold text-foreground">{L.booking}</h2>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="font-semibold">{L.enable}</Label>
                <p className="text-xs text-muted-foreground mt-1">{L.enableDesc}</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">{L.link}</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input readOnly value={url} className="flex-1 min-w-[220px] font-mono text-xs" />
                <Button type="button" variant="outline" size="sm" disabled={!url}
                  onClick={() => { navigator.clipboard.writeText(url); toast({ title: L.copied }); }}>
                  <Copy className="h-4 w-4 mr-1" />
                </Button>
                <Button type="button" variant="outline" size="sm" asChild disabled={!url}>
                  <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={regenerate}>
                  <RefreshCw className="h-4 w-4 mr-1" /> {L.regenerate}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{L.linkDesc}</p>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">{L.mode}</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="grid gap-2 sm:grid-cols-2">
                {([["manual", L.modeManual], ["auto", L.modeAuto]] as const).map(([v, label]) => (
                  <Label key={v} htmlFor={`mode-${v}`} className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                    mode === v ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                  )}>
                    <RadioGroupItem id={`mode-${v}`} value={v} />
                    <span className="text-sm">{label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          </section>

          <Separator />

          <BookingAvailabilitySection />


          <div className="flex items-center justify-end gap-3 pt-2">
            {touched && Object.entries(form).some(([k, v]) =>
              ["business_name", "full_name", "public_email", "phone", "timezone"].includes(k) && !String(v || "").trim()
            ) && <p className="text-xs text-destructive mr-auto">{L.incomplete}</p>}
            <Button onClick={handleSave} disabled={saving || updateProfile.isPending}>
              {saving ? L.saving : L.save}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
