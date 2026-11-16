import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { BrandName } from "@/components/BrandName";

type Copy = Record<"title" | "body" | "primary" | "secondary" | "formTitle" | "formBody" | "email" | "message" | "placeholder" | "send" | "doneTitle" | "doneBody" | "error" | "signOut", string>;
const COPY: Record<string, Copy> = {
  uk: { title: "Потрібна ліцензія", body: "Щоб і далі користуватися Solo .Bizz, потрібна активна ліцензія. Ваші дані, клієнти й записи збережено — нічого не видалено.", primary: "Запросити ліцензію зі знижкою", secondary: "Переглянути тарифи", formTitle: "Запит на ліцензію зі знижкою", formBody: "Ми розглянемо запит і зв’яжемося з вами. Доступ відкривається лише після призначення ліцензії.", email: "Email", message: "Повідомлення (необов’язково)", placeholder: "Розкажіть коротко про вашу практику", send: "Надіслати запит", doneTitle: "Запит надіслано", doneBody: "Дякуємо! Ми розглянемо його та напишемо вам на email.", error: "Не вдалося надіслати. Спробуйте ще раз.", signOut: "Вийти" },
  en: { title: "A license is required", body: "To keep using Solo .Bizz you need an active license. Your data, clients and meetings are kept safe — nothing has been deleted.", primary: "Request a Discounted License", secondary: "View Subscription Plans", formTitle: "Request a discounted license", formBody: "We'll review your request and get back to you. Access opens only after a license is assigned.", email: "Email", message: "Message (optional)", placeholder: "Tell us briefly about your practice", send: "Send request", doneTitle: "Request sent", doneBody: "Thank you! We'll review it and reply by email.", error: "Could not send. Please try again.", signOut: "Sign out" },
  pl: { title: "Wymagana licencja", body: "Aby dalej korzystać z Solo .Bizz, potrzebujesz aktywnej licencji. Twoje dane, klienci i spotkania są bezpieczne — nic nie usunięto.", primary: "Poproś o licencję ze zniżką", secondary: "Zobacz plany", formTitle: "Prośba o licencję ze zniżką", formBody: "Rozpatrzymy prośbę i odezwiemy się. Dostęp otwiera się dopiero po przypisaniu licencji.", email: "Email", message: "Wiadomość (opcjonalnie)", placeholder: "Opowiedz krótko o swojej praktyce", send: "Wyślij prośbę", doneTitle: "Prośba wysłana", doneBody: "Dziękujemy! Odpowiemy e-mailem.", error: "Nie udało się wysłać. Spróbuj ponownie.", signOut: "Wyloguj" },
  de: { title: "Lizenz erforderlich", body: "Um Solo .Bizz weiter zu nutzen, benötigen Sie eine aktive Lizenz. Ihre Daten, Klienten und Termine bleiben erhalten — nichts wurde gelöscht.", primary: "Rabattierte Lizenz anfragen", secondary: "Tarife ansehen", formTitle: "Rabattierte Lizenz anfragen", formBody: "Wir prüfen Ihre Anfrage und melden uns. Der Zugang wird erst nach Zuweisung einer Lizenz freigeschaltet.", email: "E-Mail", message: "Nachricht (optional)", placeholder: "Erzählen Sie kurz von Ihrer Praxis", send: "Anfrage senden", doneTitle: "Anfrage gesendet", doneBody: "Danke! Wir antworten per E-Mail.", error: "Senden fehlgeschlagen. Bitte erneut versuchen.", signOut: "Abmelden" },
  fr: { title: "Une licence est requise", body: "Pour continuer à utiliser Solo .Bizz, une licence active est nécessaire. Vos données, clients et rendez-vous sont conservés — rien n’a été supprimé.", primary: "Demander une licence à prix réduit", secondary: "Voir les offres", formTitle: "Demande de licence à prix réduit", formBody: "Nous étudierons votre demande et reviendrons vers vous. L’accès n’est ouvert qu’après l’attribution d’une licence.", email: "E-mail", message: "Message (facultatif)", placeholder: "Présentez brièvement votre pratique", send: "Envoyer la demande", doneTitle: "Demande envoyée", doneBody: "Merci ! Nous vous répondrons par e-mail.", error: "Échec de l’envoi. Réessayez.", signOut: "Se déconnecter" },
  ru: { title: "Нужна лицензия", body: "Чтобы продолжить пользоваться Solo .Bizz, нужна активная лицензия. Ваши данные, клиенты и встречи сохранены — ничего не удалено.", primary: "Запросить лицензию со скидкой", secondary: "Посмотреть тарифы", formTitle: "Запрос лицензии со скидкой", formBody: "Мы рассмотрим запрос и свяжемся с вами. Доступ открывается только после назначения лицензии.", email: "Email", message: "Сообщение (необязательно)", placeholder: "Коротко расскажите о вашей практике", send: "Отправить запрос", doneTitle: "Запрос отправлен", doneBody: "Спасибо! Мы ответим вам по email.", error: "Не удалось отправить. Попробуйте ещё раз.", signOut: "Выйти" },
};

export function LicenseRequiredScreen() {
  const { user, signOut } = useAuth();
  const { lang } = useLanguage();
  const c = COPY[lang] ?? COPY.en;
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(em) || em.length > 320) { setErr(c.error); return; }
    setSending(true); setErr(null);
    const { data, error } = await supabase.from("license_requests")
      .insert({ user_id: user!.id, email: em, message: message.trim().slice(0, 2000) || null })
      .select("id").single();
    setSending(false);
    if (error || !data) { setErr(c.error); return; }
    setDone(true);
    supabase.functions.invoke("send-license-request-notification", { body: { requestId: data.id } })
      .catch((e2) => console.warn("license request email failed", e2));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="text-2xl font-bold"><BrandName /></div>
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{c.title}</h1>
          <p className="text-muted-foreground">{c.body}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={() => { setOpen(true); setDone(false); }}>{c.primary}</Button>
          <Button asChild variant="outline"><Link to="/plans">{c.secondary}</Link></Button>
        </div>
        <button type="button" onClick={() => signOut()} className="text-sm text-muted-foreground underline">{c.signOut}</button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          {done ? (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
              <DialogTitle>{c.doneTitle}</DialogTitle>
              <DialogDescription>{c.doneBody}</DialogDescription>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>{c.formTitle}</DialogTitle>
                <DialogDescription>{c.formBody}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="lr-email">{c.email}</Label>
                <Input id="lr-email" type="email" required maxLength={320} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lr-msg">{c.message}</Label>
                <Textarea id="lr-msg" maxLength={2000} placeholder={c.placeholder} value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button type="submit" className="w-full" disabled={sending}>
                {sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{c.send}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
