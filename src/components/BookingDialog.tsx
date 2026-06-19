import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";
import { CheckCircle2, Loader2 } from "lucide-react";

type Lang = "en" | "uk" | "fr" | "pl" | "ru";

const COPY: Record<Lang, {
  title: string; desc: string; name: string; email: string; phone: string;
  message: string; submit: string; sending: string; success: string;
  successDesc: string; error: string; placeholderMsg: string;
}> = {
  uk: {
    title: "Поспілкуватися",
    desc: "Залиште заявку — ми зв'яжемося з вами та покажемо, як Solo Bizz може спростити вашу роботу.",
    name: "Ім'я", email: "Email", phone: "Телефон (необов'язково)",
    message: "Що вас цікавить? (необов'язково)",
    submit: "Надіслати заявку", sending: "Надсилаємо…",
    success: "Дякуємо!", successDesc: "Ми зв'яжемося з вами найближчим часом.",
    error: "Не вдалося надіслати. Спробуйте ще раз або напишіть на info@solo-bizz.com.",
    placeholderMsg: "Кілька слів про вашу практику або питання…",
  },
  en: {
    title: "Talk to us",
    desc: "Leave a request — we'll get in touch and show how Solo Bizz can simplify your work.",
    name: "Name", email: "Email", phone: "Phone (optional)",
    message: "What are you interested in? (optional)",
    submit: "Send request", sending: "Sending…",
    success: "Thank you!", successDesc: "We'll get back to you shortly.",
    error: "Couldn't send. Please try again or email info@solo-bizz.com.",
    placeholderMsg: "A few words about your practice or question…",
  },
  fr: {
    title: "Discuter",
    desc: "Laissez une demande — nous reviendrons vers vous et vous montrerons comment Solo Bizz peut simplifier votre travail.",
    name: "Nom", email: "Email", phone: "Téléphone (optionnel)",
    message: "Qu'est-ce qui vous intéresse ? (optionnel)",
    submit: "Envoyer la demande", sending: "Envoi…",
    success: "Merci !", successDesc: "Nous vous recontacterons rapidement.",
    error: "Échec de l'envoi. Réessayez ou écrivez à info@solo-bizz.com.",
    placeholderMsg: "Quelques mots sur votre pratique ou votre question…",
  },
  pl: {
    title: "Porozmawiaj",
    desc: "Zostaw zgłoszenie — odezwiemy się i pokażemy, jak Solo Bizz może uprościć Twoją pracę.",
    name: "Imię", email: "Email", phone: "Telefon (opcjonalnie)",
    message: "Co Cię interesuje? (opcjonalnie)",
    submit: "Wyślij zgłoszenie", sending: "Wysyłanie…",
    success: "Dziękujemy!", successDesc: "Skontaktujemy się wkrótce.",
    error: "Nie udało się wysłać. Spróbuj ponownie lub napisz na info@solo-bizz.com.",
    placeholderMsg: "Kilka słów o Twojej praktyce lub pytanie…",
  },
  ru: {
    title: "Связаться с нами",
    desc: "Оставьте заявку — мы свяжемся с вами и покажем, как Solo Bizz упростит вашу работу.",
    name: "Имя", email: "Email", phone: "Телефон (необязательно)",
    message: "Что вас интересует? (необязательно)",
    submit: "Отправить заявку", sending: "Отправляем…",
    success: "Спасибо!", successDesc: "Мы свяжемся с вами в ближайшее время.",
    error: "Не удалось отправить. Попробуйте ещё раз или напишите на info@solo-bizz.com.",
    placeholderMsg: "Несколько слов о вашей практике или вопрос…",
  },
};

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

export function BookingDialog({
  trigger, lang = "uk", source = "landing",
}: {
  trigger: React.ReactNode;
  lang?: Lang;
  source?: string;
}) {
  const t = COPY[lang] ?? COPY.en;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const parsed = schema.safeParse({
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      message: String(data.get("message") ?? ""),
    });
    if (!parsed.success) {
      toast({ title: t.error, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("booking_requests").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      message: parsed.data.message || null,
      language: lang,
      source,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: t.error, variant: "destructive" });
      return;
    }
    track("booking_request_submitted", { source_page: source, lang });
    track("cta_clicked", { source_page: source, cta: "booking_request_submitted", lang });
    setDone(true);
    form.reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setTimeout(() => setDone(false), 200);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary mb-3" />
            <h3 className="text-lg font-semibold">{t.success}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t.successDesc}</p>
            <Button className="mt-6" onClick={() => setOpen(false)}>OK</Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bk-name">{t.name}</Label>
              <Input id="bk-name" name="name" required maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bk-email">{t.email}</Label>
              <Input id="bk-email" name="email" type="email" required maxLength={254} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bk-phone">{t.phone}</Label>
              <Input id="bk-phone" name="phone" type="tel" maxLength={40} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bk-message">{t.message}</Label>
              <Textarea id="bk-message" name="message" rows={3} maxLength={2000} placeholder={t.placeholderMsg} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full gap-2">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> {t.sending}</> : t.submit}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
