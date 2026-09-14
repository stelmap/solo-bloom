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
import { describeError } from "@/lib/errorMessages";

type Lang = "en" | "uk" | "ru" | "pl" | "fr";

const LANGS: Lang[] = ["en", "uk", "ru", "pl", "fr"];
const asLang = (l: string): Lang => (LANGS.includes(l as Lang) ? (l as Lang) : "en");

export const CONTACT_REQUEST_TYPE_VALUES = [
  "demo",
  "consultation",
  "support",
  "info",
  "partnership",
  "other",
] as const;

type RequestTypeValue = (typeof CONTACT_REQUEST_TYPE_VALUES)[number];

const TYPE_LABELS: Record<Lang, Record<RequestTypeValue, string>> = {
  uk: {
    demo: "Замовити демо Solo .Bizz",
    consultation: "Замовити консультаційний дзвінок",
    support: "Отримати дзвінок технічної підтримки",
    info: "Отримати більше інформації про Solo .Bizz",
    partnership: "Партнерство / співпраця",
    other: "Інше",
  },
  en: {
    demo: "Book a Solo .Bizz demo",
    consultation: "Book a consultation call",
    support: "Get a technical support call",
    info: "Get more information about Solo .Bizz",
    partnership: "Partnership / cooperation",
    other: "Other",
  },
  ru: {
    demo: "Заказать демо Solo .Bizz",
    consultation: "Заказать консультационный звонок",
    support: "Получить звонок технической поддержки",
    info: "Получить больше информации о Solo .Bizz",
    partnership: "Партнёрство / сотрудничество",
    other: "Другое",
  },
  pl: {
    demo: "Zamów demo Solo .Bizz",
    consultation: "Zamów rozmowę konsultacyjną",
    support: "Rozmowa ze wsparciem technicznym",
    info: "Więcej informacji o Solo .Bizz",
    partnership: "Partnerstwo / współpraca",
    other: "Inne",
  },
  fr: {
    demo: "Réserver une démo Solo .Bizz",
    consultation: "Réserver un appel de conseil",
    support: "Recevoir un appel du support technique",
    info: "Plus d'informations sur Solo .Bizz",
    partnership: "Partenariat / coopération",
    other: "Autre",
  },
};

interface Copy {
  title: string;
  subtitle: string;
  name: string;
  phone: string;
  email: string;
  want: string;
  otherLabel: string;
  comment: string;
  commentPlaceholder: string;
  consent: string;
  privacy: string;
  submit: string;
  doneTitle: string;
  doneText: string;
  doneCta: string;
  errName: string;
  errPhone: string;
  errPhoneFormat: string;
  errEmail: string;
  errType: string;
  errOther: string;
  errConsent: string;
  failTitle: string;
  wantPrefix: string;
  requestPrefix: string;
  commentPrefix: string;
}

const COPY: Record<Lang, Copy> = {
  uk: {
    title: "Передзвоніть мені, будь ласка",
    subtitle: "Залиште свої контакти та оберіть, чим ми можемо допомогти.",
    name: "Ім’я*",
    phone: "Телефон*",
    email: "Email",
    want: "Я хочу…*",
    otherLabel: "Опишіть, будь ласка, ваш запит",
    comment: "Коментар",
    commentPlaceholder: "Напишіть додаткову інформацію, якщо потрібно.",
    consent: "Я погоджуюся на обробку моїх даних для зв’язку зі мною відповідно до",
    privacy: "Політики конфіденційності",
    submit: "Надіслати запит",
    doneTitle: "Дякуємо! Запит отримано.",
    doneText: "Ми зв’яжемося з вами найближчим часом.",
    doneCta: "Готово",
    errName: "Вкажіть, будь ласка, ваше ім’я.",
    errPhone: "Вкажіть, будь ласка, телефон.",
    errPhoneFormat: "Перевірте формат номера телефону.",
    errEmail: "Перевірте формат email.",
    errType: "Оберіть, будь ласка, тему звернення.",
    errOther: "Опишіть, будь ласка, ваш запит.",
    errConsent: "Потрібна згода на обробку даних.",
    failTitle: "Не вдалося надіслати запит",
    wantPrefix: "Я хочу",
    requestPrefix: "Запит",
    commentPrefix: "Коментар",
  },
  en: {
    title: "Please call me back",
    subtitle: "Leave your contact details and tell us how we can help.",
    name: "Name*",
    phone: "Phone*",
    email: "Email",
    want: "I would like to…*",
    otherLabel: "Please describe your request",
    comment: "Comment",
    commentPlaceholder: "Add any extra details if needed.",
    consent: "I agree to the processing of my data so you can contact me, in line with the",
    privacy: "Privacy Policy",
    submit: "Send request",
    doneTitle: "Thank you! We got your request.",
    doneText: "We will get in touch with you shortly.",
    doneCta: "Done",
    errName: "Please enter your name.",
    errPhone: "Please enter your phone number.",
    errPhoneFormat: "Please check the phone number format.",
    errEmail: "Please check the email format.",
    errType: "Please choose a topic.",
    errOther: "Please describe your request.",
    errConsent: "Your consent is required.",
    failTitle: "Could not send the request",
    wantPrefix: "I want",
    requestPrefix: "Request",
    commentPrefix: "Comment",
  },
  ru: {
    title: "Перезвоните мне, пожалуйста",
    subtitle: "Оставьте свои контакты и выберите, чем мы можем помочь.",
    name: "Имя*",
    phone: "Телефон*",
    email: "Email",
    want: "Я хочу…*",
    otherLabel: "Опишите, пожалуйста, ваш запрос",
    comment: "Комментарий",
    commentPlaceholder: "Напишите дополнительную информацию, если нужно.",
    consent: "Я соглашаюсь на обработку моих данных для связи со мной в соответствии с",
    privacy: "Политикой конфиденциальности",
    submit: "Отправить запрос",
    doneTitle: "Спасибо! Запрос получен.",
    doneText: "Мы свяжемся с вами в ближайшее время.",
    doneCta: "Готово",
    errName: "Укажите, пожалуйста, ваше имя.",
    errPhone: "Укажите, пожалуйста, телефон.",
    errPhoneFormat: "Проверьте формат номера телефона.",
    errEmail: "Проверьте формат email.",
    errType: "Выберите, пожалуйста, тему обращения.",
    errOther: "Опишите, пожалуйста, ваш запрос.",
    errConsent: "Требуется согласие на обработку данных.",
    failTitle: "Не удалось отправить запрос",
    wantPrefix: "Я хочу",
    requestPrefix: "Запрос",
    commentPrefix: "Комментарий",
  },
  pl: {
    title: "Proszę o kontakt telefoniczny",
    subtitle: "Zostaw swoje dane kontaktowe i wybierz, w czym możemy pomóc.",
    name: "Imię*",
    phone: "Telefon*",
    email: "Email",
    want: "Chcę…*",
    otherLabel: "Opisz swoje zapytanie",
    comment: "Komentarz",
    commentPlaceholder: "Dodaj dodatkowe informacje, jeśli to potrzebne.",
    consent: "Wyrażam zgodę na przetwarzanie moich danych w celu kontaktu, zgodnie z",
    privacy: "Polityką prywatności",
    submit: "Wyślij zapytanie",
    doneTitle: "Dziękujemy! Otrzymaliśmy zapytanie.",
    doneText: "Skontaktujemy się z Tobą wkrótce.",
    doneCta: "Gotowe",
    errName: "Podaj swoje imię.",
    errPhone: "Podaj numer telefonu.",
    errPhoneFormat: "Sprawdź format numeru telefonu.",
    errEmail: "Sprawdź format adresu email.",
    errType: "Wybierz temat zapytania.",
    errOther: "Opisz swoje zapytanie.",
    errConsent: "Wymagana jest zgoda na przetwarzanie danych.",
    failTitle: "Nie udało się wysłać zapytania",
    wantPrefix: "Chcę",
    requestPrefix: "Zapytanie",
    commentPrefix: "Komentarz",
  },
  fr: {
    title: "Rappelez-moi, s'il vous plaît",
    subtitle: "Laissez vos coordonnées et indiquez comment nous pouvons vous aider.",
    name: "Nom*",
    phone: "Téléphone*",
    email: "Email",
    want: "Je souhaite…*",
    otherLabel: "Décrivez votre demande",
    comment: "Commentaire",
    commentPlaceholder: "Ajoutez des informations complémentaires si nécessaire.",
    consent: "J'accepte le traitement de mes données afin d'être contacté, conformément à la",
    privacy: "Politique de confidentialité",
    submit: "Envoyer la demande",
    doneTitle: "Merci ! Votre demande a bien été reçue.",
    doneText: "Nous vous contacterons très prochainement.",
    doneCta: "Terminé",
    errName: "Veuillez indiquer votre nom.",
    errPhone: "Veuillez indiquer votre téléphone.",
    errPhoneFormat: "Vérifiez le format du numéro de téléphone.",
    errEmail: "Vérifiez le format de l'email.",
    errType: "Veuillez choisir un sujet.",
    errOther: "Veuillez décrire votre demande.",
    errConsent: "Votre consentement est requis.",
    failTitle: "Impossible d'envoyer la demande",
    wantPrefix: "Je souhaite",
    requestPrefix: "Demande",
    commentPrefix: "Commentaire",
  },
};

/** Localized label for a stored request type (admin screens default to Ukrainian). */
export function contactRequestTypeLabel(value: string | null | undefined, lang: string = "uk") {
  if (!value) return "—";
  const labels = TYPE_LABELS[asLang(lang)];
  return (labels as Record<string, string>)[value] ?? value;
}

/** Kept for existing admin filters: value/label pairs in Ukrainian. */
export const CONTACT_REQUEST_TYPES = CONTACT_REQUEST_TYPE_VALUES.map((value) => ({
  value,
  label: TYPE_LABELS.uk[value],
}));

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
  const L = asLang(lang);
  const t = COPY[L];
  const typeLabels = TYPE_LABELS[L];
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
    if (!name.trim()) e.name = t.errName;
    if (!phone.trim()) e.phone = t.errPhone;
    else if (!PHONE_RE.test(phone.trim())) e.phone = t.errPhoneFormat;
    if (email.trim() && !EMAIL_RE.test(email.trim())) e.email = t.errEmail;
    if (!requestType) e.requestType = t.errType;
    if (requestType === "other" && !otherText.trim()) e.otherText = t.errOther;
    if (!consent) e.consent = t.errConsent;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    const messageParts = [
      `${t.wantPrefix}: ${contactRequestTypeLabel(requestType, L)}`,
      requestType === "other" && otherText.trim() ? `${t.requestPrefix}: ${otherText.trim()}` : "",
      comment.trim() ? `${t.commentPrefix}: ${comment.trim()}` : "",
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
      language: L,
      source: "Landing Page — Contact Us",
      status: "new",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: t.failTitle, description: describeError(error.message), variant: "destructive" });
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
              <DialogTitle className="text-center">{t.doneTitle}</DialogTitle>
              <DialogDescription className="text-center">{t.doneText}</DialogDescription>
            </DialogHeader>
            <Button
              className="mt-6 w-full sm:w-auto"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
            >
              {t.doneCta}
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t.title}</DialogTitle>
              <DialogDescription>{t.subtitle}</DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label htmlFor="cr-name">{t.name}</Label>
              <Input id="cr-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cr-phone">{t.phone}</Label>
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
                <Label htmlFor="cr-email">{t.email}</Label>
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
              <legend className="text-sm font-medium">{t.want}</legend>
              <RadioGroup value={requestType} onValueChange={setRequestType} className="gap-2">
                {CONTACT_REQUEST_TYPE_VALUES.map((value) => (
                  <div key={value} className="flex items-center gap-2">
                    <RadioGroupItem id={`cr-${value}`} value={value} />
                    <Label htmlFor={`cr-${value}`} className="font-normal">{typeLabels[value]}</Label>
                  </div>
                ))}
              </RadioGroup>
              {errors.requestType && <p className="text-xs text-destructive">{errors.requestType}</p>}
            </fieldset>

            {requestType === "other" && (
              <div className="space-y-1.5">
                <Label htmlFor="cr-other">{t.otherLabel}</Label>
                <Textarea id="cr-other" value={otherText} onChange={(e) => setOtherText(e.target.value)} maxLength={500} rows={3} />
                {errors.otherText && <p className="text-xs text-destructive">{errors.otherText}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="cr-comment">{t.comment}</Label>
              <Textarea
                id="cr-comment"
                placeholder={t.commentPlaceholder}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                rows={3}
              />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="cr-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <Label htmlFor="cr-consent" className="text-xs font-normal leading-relaxed text-muted-foreground">
                {t.consent}{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  {t.privacy}
                </a>
                .
              </Label>
            </div>
            {errors.consent && <p className="text-xs text-destructive">{errors.consent}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.submit}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export const CONTACT_CTA_LABEL: Record<Lang, string> = {
  uk: "Зв’язатися з нами",
  en: "Contact us",
  ru: "Связаться с нами",
  pl: "Skontaktuj się z nami",
  fr: "Nous contacter",
};

export function contactCtaLabel(lang: string) {
  return CONTACT_CTA_LABEL[asLang(lang)];
}

export default ContactRequestDialog;
