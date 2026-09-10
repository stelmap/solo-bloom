import { useMemo, useRef, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MIN_BODY = 30;
const MAX_BODY = 1000;

type Copy = {
  title: string;
  intro: string;
  ratingLabel: string;
  planLabel: string;
  plans: { value: string; label: string }[];
  professionLabel: string;
  professions: string[];
  professionOther: string;
  professionOtherPlaceholder: string;
  bodyLabel: string;
  bodyPlaceholder: string;
  bodyHint: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailHint: string;
  consent: string;
  submit: string;
  thanks: string;
  close: string;
  errorRequired: string;
  errorRate: string;
  errorGeneric: string;
};

const COPY: Record<string, Copy> = {
  uk: {
    title: "Поділіться своїм досвідом із SoloBizz",
    intro: "Ваш відгук допоможе іншим фахівцям краще зрозуміти, як SoloBizz може підтримати їхню практику. Перед публікацією відгук буде перевірено.",
    ratingLabel: "Як ви оцінюєте роботу SoloBizz?",
    planLabel: "Яким тарифом SoloBizz ви користуєтеся?",
    plans: [
      { value: "free_starter", label: "Free Starter" },
      { value: "solo_practice", label: "Solo Practice" },
      { value: "pro_practice", label: "Pro Practice" },
      { value: "unknown", label: "Не знаю / Важко відповісти" },
    ],
    professionLabel: "Чим ви займаєтеся?",
    professions: ["Психолог", "Психотерапевт", "Коуч", "Консультант", "Викладач", "Beauty-фахівець"],
    professionOther: "Інше",
    professionOtherPlaceholder: "Вкажіть свою професію",
    bodyLabel: "Ваш відгук",
    bodyPlaceholder: "Розкажіть, як SoloBizz допомагає вам у роботі та що вам подобається найбільше.",
    bodyHint: "від 30 до 1000 символів",
    nameLabel: "Ім’я, яке буде показане у відгуку",
    namePlaceholder: "Олена Л.",
    emailLabel: "Електронна пошта вашого акаунта SoloBizz",
    emailHint: "Email потрібен лише для підтвердження, що ви користуєтеся SoloBizz. Він не буде опублікований.",
    consent: "Я погоджуюся на публікацію мого імені, професії, оцінки та тексту відгуку на сайті SoloBizz.",
    submit: "Надіслати відгук",
    thanks: "Дякуємо! Ваш відгук надіслано на перевірку. Ми повідомимо вас після його публікації.",
    close: "Закрити",
    errorRequired: "Заповніть, будь ласка, всі обов’язкові поля.",
    errorRate: "Забагато спроб. Спробуйте пізніше.",
    errorGeneric: "Не вдалося надіслати відгук. Спробуйте ще раз.",
  },
  en: {
    title: "Share your experience with SoloBizz",
    intro: "Your review helps other professionals understand how SoloBizz can support their practice. Every review is checked before publication.",
    ratingLabel: "How would you rate SoloBizz?",
    planLabel: "Which SoloBizz plan do you use?",
    plans: [
      { value: "free_starter", label: "Free Starter" },
      { value: "solo_practice", label: "Solo Practice" },
      { value: "pro_practice", label: "Pro Practice" },
      { value: "unknown", label: "I'm not sure" },
    ],
    professionLabel: "What do you do?",
    professions: ["Psychologist", "Psychotherapist", "Coach", "Consultant", "Teacher", "Beauty specialist"],
    professionOther: "Other",
    professionOtherPlaceholder: "Enter your profession",
    bodyLabel: "Your review",
    bodyPlaceholder: "Tell us how SoloBizz helps you at work and what you like most.",
    bodyHint: "between 30 and 1000 characters",
    nameLabel: "Name shown with the review",
    namePlaceholder: "Olena L.",
    emailLabel: "Email of your SoloBizz account",
    emailHint: "The email is only used to confirm you are a SoloBizz user. It will not be published.",
    consent: "I agree to publish my name, profession, rating and review text on the SoloBizz site.",
    submit: "Send review",
    thanks: "Thank you! Your review has been sent for verification. We'll let you know once it is published.",
    close: "Close",
    errorRequired: "Please fill in all required fields.",
    errorRate: "Too many attempts. Please try again later.",
    errorGeneric: "The review could not be sent. Please try again.",
  },
  pl: {
    title: "Podziel się swoim doświadczeniem z SoloBizz",
    intro: "Twoja opinia pomoże innym specjalistom zrozumieć, jak SoloBizz może wesprzeć ich praktykę. Przed publikacją opinia jest weryfikowana.",
    ratingLabel: "Jak oceniasz SoloBizz?",
    planLabel: "Z jakiego planu SoloBizz korzystasz?",
    plans: [
      { value: "free_starter", label: "Free Starter" },
      { value: "solo_practice", label: "Solo Practice" },
      { value: "pro_practice", label: "Pro Practice" },
      { value: "unknown", label: "Nie wiem" },
    ],
    professionLabel: "Czym się zajmujesz?",
    professions: ["Psycholog", "Psychoterapeuta", "Coach", "Konsultant", "Wykładowca", "Specjalista beauty"],
    professionOther: "Inne",
    professionOtherPlaceholder: "Podaj swój zawód",
    bodyLabel: "Twoja opinia",
    bodyPlaceholder: "Napisz, jak SoloBizz pomaga Ci w pracy i co podoba Ci się najbardziej.",
    bodyHint: "od 30 do 1000 znaków",
    nameLabel: "Imię widoczne przy opinii",
    namePlaceholder: "Olena L.",
    emailLabel: "E-mail Twojego konta SoloBizz",
    emailHint: "E-mail służy wyłącznie do potwierdzenia, że korzystasz z SoloBizz. Nie zostanie opublikowany.",
    consent: "Zgadzam się na publikację mojego imienia, zawodu, oceny i treści opinii na stronie SoloBizz.",
    submit: "Wyślij opinię",
    thanks: "Dziękujemy! Twoja opinia została wysłana do weryfikacji. Poinformujemy Cię po jej publikacji.",
    close: "Zamknij",
    errorRequired: "Uzupełnij wszystkie wymagane pola.",
    errorRate: "Zbyt wiele prób. Spróbuj później.",
    errorGeneric: "Nie udało się wysłać opinii. Spróbuj ponownie.",
  },
  fr: {
    title: "Partagez votre expérience avec SoloBizz",
    intro: "Votre avis aide d'autres professionnels à comprendre comment SoloBizz peut soutenir leur activité. Chaque avis est vérifié avant publication.",
    ratingLabel: "Comment évaluez-vous SoloBizz ?",
    planLabel: "Quelle formule SoloBizz utilisez-vous ?",
    plans: [
      { value: "free_starter", label: "Free Starter" },
      { value: "solo_practice", label: "Solo Practice" },
      { value: "pro_practice", label: "Pro Practice" },
      { value: "unknown", label: "Je ne sais pas" },
    ],
    professionLabel: "Quel est votre métier ?",
    professions: ["Psychologue", "Psychothérapeute", "Coach", "Consultant", "Enseignant", "Professionnel beauté"],
    professionOther: "Autre",
    professionOtherPlaceholder: "Indiquez votre métier",
    bodyLabel: "Votre avis",
    bodyPlaceholder: "Racontez comment SoloBizz vous aide au quotidien et ce que vous appréciez le plus.",
    bodyHint: "entre 30 et 1000 caractères",
    nameLabel: "Nom affiché avec l'avis",
    namePlaceholder: "Olena L.",
    emailLabel: "E-mail de votre compte SoloBizz",
    emailHint: "L'e-mail sert uniquement à confirmer que vous utilisez SoloBizz. Il ne sera pas publié.",
    consent: "J'accepte la publication de mon nom, de mon métier, de ma note et de mon avis sur le site SoloBizz.",
    submit: "Envoyer l'avis",
    thanks: "Merci ! Votre avis a été envoyé pour vérification. Nous vous préviendrons dès sa publication.",
    close: "Fermer",
    errorRequired: "Merci de remplir tous les champs obligatoires.",
    errorRate: "Trop de tentatives. Réessayez plus tard.",
    errorGeneric: "L'avis n'a pas pu être envoyé. Réessayez.",
  },
  ru: {
    title: "Поделитесь своим опытом с SoloBizz",
    intro: "Ваш отзыв поможет другим специалистам понять, как SoloBizz может поддержать их практику. Перед публикацией отзыв проверяется.",
    ratingLabel: "Как вы оцениваете работу SoloBizz?",
    planLabel: "Каким тарифом SoloBizz вы пользуетесь?",
    plans: [
      { value: "free_starter", label: "Free Starter" },
      { value: "solo_practice", label: "Solo Practice" },
      { value: "pro_practice", label: "Pro Practice" },
      { value: "unknown", label: "Не знаю / Затрудняюсь ответить" },
    ],
    professionLabel: "Чем вы занимаетесь?",
    professions: ["Психолог", "Психотерапевт", "Коуч", "Консультант", "Преподаватель", "Бьюти-специалист"],
    professionOther: "Другое",
    professionOtherPlaceholder: "Укажите свою профессию",
    bodyLabel: "Ваш отзыв",
    bodyPlaceholder: "Расскажите, как SoloBizz помогает вам в работе и что нравится больше всего.",
    bodyHint: "от 30 до 1000 символов",
    nameLabel: "Имя, которое будет показано в отзыве",
    namePlaceholder: "Елена Л.",
    emailLabel: "Электронная почта вашего аккаунта SoloBizz",
    emailHint: "Email нужен только для подтверждения, что вы пользуетесь SoloBizz. Он не будет опубликован.",
    consent: "Я согласен(на) на публикацию моего имени, профессии, оценки и текста отзыва на сайте SoloBizz.",
    submit: "Отправить отзыв",
    thanks: "Спасибо! Ваш отзыв отправлен на проверку. Мы сообщим вам после публикации.",
    close: "Закрыть",
    errorRequired: "Пожалуйста, заполните все обязательные поля.",
    errorRate: "Слишком много попыток. Попробуйте позже.",
    errorGeneric: "Не удалось отправить отзыв. Попробуйте ещё раз.",
  },
};

export function ReviewDialog({
  open,
  onOpenChange,
  lang,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: string;
}) {
  const c = COPY[lang] ?? COPY.en;
  const openedAt = useRef<number>(Date.now());
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [plan, setPlan] = useState<string>("unknown");
  const [profession, setProfession] = useState<string>("");
  const [professionOther, setProfessionOther] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const finalProfession = profession === "__other" ? professionOther.trim() : profession;

  const valid = useMemo(
    () =>
      rating >= 1 &&
      finalProfession.length >= 2 &&
      body.trim().length >= MIN_BODY &&
      body.trim().length <= MAX_BODY &&
      name.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
      consent,
    [rating, finalProfession, body, name, email, consent],
  );

  function reset() {
    setRating(0); setHover(0); setPlan("unknown"); setProfession(""); setProfessionOther("");
    setBody(""); setName(""); setEmail(""); setConsent(false); setWebsite("");
    setError(null); setDone(false); openedAt.current = Date.now();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) {
      if (!valid) setError(c.errorRequired);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("submit-review", {
        body: {
          rating,
          plan,
          profession: finalProfession,
          body: body.trim(),
          displayName: name.trim(),
          email: email.trim(),
          consent,
          language: lang,
          website,
          elapsedMs: Date.now() - openedAt.current,
        },
      });
      if (fnError) {
        const status = (fnError as { context?: { status?: number } })?.context?.status;
        setError(status === 429 ? c.errorRate : c.errorGeneric);
        return;
      }
      if ((data as { ok?: boolean } | null)?.ok !== true) {
        setError(c.errorGeneric);
        return;
      }
      setDone(true);
    } catch {
      setError(c.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setTimeout(reset, 200);
        else openedAt.current = Date.now();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{c.title}</DialogTitle>
          <DialogDescription>{c.intro}</DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="space-y-6 py-2">
            <p className="text-sm text-foreground">{c.thanks}</p>
            <Button type="button" className="w-full" onClick={() => onOpenChange(false)}>
              {c.close}
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label>{c.ratingLabel} *</Label>
              <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n}/5`}
                    aria-pressed={rating === n}
                    onMouseEnter={() => setHover(n)}
                    onClick={() => setRating(n)}
                    className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Star
                      className={cn(
                        "h-7 w-7 transition-colors",
                        (hover || rating) >= n ? "fill-primary text-primary" : "text-muted-foreground/40",
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-plan">{c.planLabel}</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger id="review-plan"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {c.plans.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-profession">{c.professionLabel} *</Label>
              <Select value={profession} onValueChange={setProfession}>
                <SelectTrigger id="review-profession"><SelectValue placeholder={c.professionLabel} /></SelectTrigger>
                <SelectContent>
                  {c.professions.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                  <SelectItem value="__other">{c.professionOther}</SelectItem>
                </SelectContent>
              </Select>
              {profession === "__other" && (
                <Input
                  value={professionOther}
                  onChange={(e) => setProfessionOther(e.target.value)}
                  placeholder={c.professionOtherPlaceholder}
                  maxLength={80}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-body">{c.bodyLabel} *</Label>
              <Textarea
                id="review-body"
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
                placeholder={c.bodyPlaceholder}
                rows={5}
              />
              <p className="text-right text-xs text-muted-foreground">
                {body.trim().length}/{MAX_BODY} · {c.bodyHint}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-name">{c.nameLabel} *</Label>
              <Input id="review-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={c.namePlaceholder} maxLength={80} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-email">{c.emailLabel} *</Label>
              <Input id="review-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} />
              <p className="text-xs text-muted-foreground">{c.emailHint}</p>
            </div>

            {/* Honeypot — hidden from users, filled by bots */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="review-website">Website</label>
              <input id="review-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="review-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <Label htmlFor="review-consent" className="text-sm font-normal leading-relaxed text-muted-foreground">
                {c.consent} *
              </Label>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {c.submit}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
