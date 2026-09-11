import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2 } from "lucide-react";

export const CONTACT_REQUEST_TYPES = [
  { value: "demo", label: "Замовити демо Solo .Bizz" },
  { value: "consultation", label: "Замовити консультаційний дзвінок" },
  { value: "support", label: "Отримати дзвінок технічної підтримки" },
  { value: "info", label: "Отримати більше інформації про Solo .Bizz" },
  { value: "partnership", label: "Партнерство / співпраця" },
  { value: "other", label: "Інше" },
] as const;

export function contactRequestTypeLabel(value: string | null | undefined) {
  return CONTACT_REQUEST_TYPES.find((t) => t.value === value)?.label ?? value ?? "—";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: string;
  /** Which CTA opened the form, stored alongside the request. */
  placement?: string;
}

const PHONE_RE = /^\+?[0-9\s()-]{7,20}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function ContactRequestDialog({ open, onOpenChange, lang, placement = "Top Promo Banner" }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [requestType, setRequestType] = useState<string>("");
  const [otherText, setOtherText] = useState("");
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setDone(false);
    setErrors({});
    if (!user) return;
    setEmail((prev) => prev || user.email || "");
    void supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setName((prev) => prev || data.full_name || "");
        setPhone((prev) => prev || data.phone || "");
      });
  }, [open, user]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Вкажіть, будь ласка, ваше ім’я.";
    if (!phone.trim()) e.phone = "Вкажіть, будь ласка, телефон.";
    else if (!PHONE_RE.test(phone.trim())) e.phone = "Перевірте формат номера телефону.";
    if (email.trim() && !EMAIL_RE.test(email.trim())) e.email = "Перевірте формат email.";
    if (!requestType) e.requestType = "Оберіть, будь ласка, тему звернення.";
    if (requestType === "other" && !otherText.trim()) e.otherText = "Опишіть, будь ласка, ваш запит.";
    if (!consent) e.consent = "Потрібна згода на обробку даних.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    const messageParts = [
      `Я хочу: ${contactRequestTypeLabel(requestType)}`,
      requestType === "other" && otherText.trim() ? `Запит: ${otherText.trim()}` : "",
      comment.trim() ? `Коментар: ${comment.trim()}` : "",
      `CTA: ${placement}`,
    ].filter(Boolean);

    const { error } = await supabase.from("booking_requests").insert({
      name: name.trim().slice(0, 120),
      email: email.trim() ? email.trim().slice(0, 254) : null,
      phone: phone.trim().slice(0, 40),
      message: messageParts.join("\n").slice(0, 2000),
      request_type: requestType,
      request_type_other: requestType === "other" ? otherText.trim().slice(0, 500) : null,
      user_id: user?.id ?? null,
      language: lang,
      source: "Landing Page — Contact Us",
      status: "new",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Не вдалося надіслати запит", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
  };

  const reset = () => {
    setRequestType("");
    setOtherText("");
    setComment("");
    setConsent(false);
    setDone(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {done ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-primary" />
            <DialogHeader>
              <DialogTitle className="text-center">Дякуємо! Запит отримано.</DialogTitle>
              <DialogDescription className="text-center">
                Ми зв’яжемося з вами найближчим часом.
              </DialogDescription>
            </DialogHeader>
            <Button
              className="mt-6 w-full sm:w-auto"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
            >
              Готово
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Передзвоніть мені, будь ласка</DialogTitle>
              <DialogDescription>
                Залиште свої контакти та оберіть, чим ми можемо допомогти.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label htmlFor="cr-name">Ім’я*</Label>
              <Input id="cr-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cr-phone">Телефон*</Label>
                <Input
                  id="cr-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+48 600 000 000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={40}
                  autoComplete="tel"
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cr-email">Email</Label>
                <Input
                  id="cr-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={254}
                  autoComplete="email"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Я хочу…*</legend>
              <RadioGroup value={requestType} onValueChange={setRequestType} className="gap-2">
                {CONTACT_REQUEST_TYPES.map((t) => (
                  <div key={t.value} className="flex items-center gap-2">
                    <RadioGroupItem id={`cr-${t.value}`} value={t.value} />
                    <Label htmlFor={`cr-${t.value}`} className="font-normal">{t.label}</Label>
                  </div>
                ))}
              </RadioGroup>
              {errors.requestType && <p className="text-xs text-destructive">{errors.requestType}</p>}
            </fieldset>

            {requestType === "other" && (
              <div className="space-y-1.5">
                <Label htmlFor="cr-other">Опишіть, будь ласка, ваш запит</Label>
                <Textarea id="cr-other" value={otherText} onChange={(e) => setOtherText(e.target.value)} maxLength={500} rows={3} />
                {errors.otherText && <p className="text-xs text-destructive">{errors.otherText}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="cr-comment">Коментар</Label>
              <Textarea
                id="cr-comment"
                placeholder="Напишіть додаткову інформацію, якщо потрібно."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                rows={3}
              />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="cr-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <Label htmlFor="cr-consent" className="text-xs font-normal leading-relaxed text-muted-foreground">
                Я погоджуюся на обробку моїх даних для зв’язку зі мною відповідно до{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Політики конфіденційності
                </a>
                .
              </Label>
            </div>
            {errors.consent && <p className="text-xs text-destructive">{errors.consent}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Надіслати запит
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ContactRequestDialog;
