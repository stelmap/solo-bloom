import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MapPin, Send } from "lucide-react";
import { BrandName } from "@/components/BrandName";
import { SeoHead } from "@/components/SeoHead";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

type Copy = { back: string; title: string; lead: string; whatTitle: string; what: string; whoTitle: string; who: string; nameTitle: string; name: string; contactTitle: string; cta: string };

const COPY: Record<string, Copy> = {
  uk: { back: "На головну", title: "Про Solo .Bizz", lead: "Solo .Bizz — робочий простір для психологів, психотерапевтів, коучів і репетиторів, які ведуть приватну практику.", whatTitle: "Що ми робимо", what: "Календар, клієнти, зустрічі, оплати, інвойси та особиста сторінка фахівця — в одному місці, щоб менше часу йшло на адміністрування.", whoTitle: "Хто ми", who: "Невелика команда з Вроцлава, Польща. Сервіс доступний українською, англійською, польською, німецькою, французькою та російською.", nameTitle: "Наша назва", name: "Офіційна назва — Solo .Bizz. Єдиний офіційний сайт — solo-bizz.com.", contactTitle: "Контакти", cta: "Спробувати 14 днів безкоштовно" },
  en: { back: "Home", title: "About Solo .Bizz", lead: "Solo .Bizz is a workspace for psychologists, therapists, coaches and tutors who run a private practice.", whatTitle: "What we do", what: "Calendar, clients, meetings, payments, invoices and a personal specialist page in one place, so less time goes to administration.", whoTitle: "Who we are", who: "A small team based in Wrocław, Poland. The service is available in Ukrainian, English, Polish, German, French and Russian.", nameTitle: "Our name", name: "The official name is Solo .Bizz. The only official website is solo-bizz.com.", contactTitle: "Contact", cta: "Try 14 days free" },
  pl: { back: "Strona główna", title: "O Solo .Bizz", lead: "Solo .Bizz to przestrzeń robocza dla psychologów, psychoterapeutów, coachów i korepetytorów prowadzących prywatną praktykę.", whatTitle: "Co robimy", what: "Kalendarz, klienci, spotkania, płatności, faktury i osobista strona specjalisty w jednym miejscu — mniej czasu na administrację.", whoTitle: "Kim jesteśmy", who: "Mały zespół z Wrocławia. Serwis działa po ukraińsku, angielsku, polsku, niemiecku, francusku i rosyjsku.", nameTitle: "Nasza nazwa", name: "Oficjalna nazwa to Solo .Bizz. Jedyna oficjalna strona to solo-bizz.com.", contactTitle: "Kontakt", cta: "Wypróbuj 14 dni za darmo" },
  de: { back: "Startseite", title: "Über Solo .Bizz", lead: "Solo .Bizz ist ein Arbeitsbereich für Psychologen, Therapeuten, Coaches und Nachhilfelehrer mit eigener Praxis.", whatTitle: "Was wir tun", what: "Kalender, Klienten, Termine, Zahlungen, Rechnungen und eine persönliche Profilseite an einem Ort – damit weniger Zeit in Verwaltung fließt.", whoTitle: "Wer wir sind", who: "Ein kleines Team aus Wrocław, Polen. Verfügbar auf Ukrainisch, Englisch, Polnisch, Deutsch, Französisch und Russisch.", nameTitle: "Unser Name", name: "Der offizielle Name ist Solo .Bizz. Die einzige offizielle Website ist solo-bizz.com.", contactTitle: "Kontakt", cta: "14 Tage kostenlos testen" },
  fr: { back: "Accueil", title: "À propos de Solo .Bizz", lead: "Solo .Bizz est un espace de travail pour psychologues, thérapeutes, coachs et tuteurs en cabinet indépendant.", whatTitle: "Ce que nous faisons", what: "Agenda, clients, rendez-vous, paiements, factures et page personnelle du praticien au même endroit, pour moins d'administratif.", whoTitle: "Qui sommes-nous", who: "Une petite équipe basée à Wrocław, en Pologne. Disponible en ukrainien, anglais, polonais, allemand, français et russe.", nameTitle: "Notre nom", name: "Le nom officiel est Solo .Bizz. Le seul site officiel est solo-bizz.com.", contactTitle: "Contact", cta: "Essai gratuit de 14 jours" },
  ru: { back: "На главную", title: "О Solo .Bizz", lead: "Solo .Bizz — рабочее пространство для психологов, психотерапевтов, коучей и репетиторов с частной практикой.", whatTitle: "Что мы делаем", what: "Календарь, клиенты, встречи, оплаты, счета и личная страница специалиста в одном месте — меньше времени на администрирование.", whoTitle: "Кто мы", who: "Небольшая команда из Вроцлава, Польша. Сервис доступен на украинском, английском, польском, немецком, французском и русском.", nameTitle: "Наше название", name: "Официальное название — Solo .Bizz. Единственный официальный сайт — solo-bizz.com.", contactTitle: "Контакты", cta: "Попробовать 14 дней бесплатно" },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  url: "https://solo-bizz.com/about",
  name: "About Solo .Bizz",
  isPartOf: { "@id": "https://solo-bizz.com/#website" },
  about: {
    "@type": "Organization",
    "@id": "https://solo-bizz.com/#organization",
    name: "Solo .Bizz",
    alternateName: ["Solo.Bizz", "SoloBizz", "Solo Bizz"],
    url: "https://solo-bizz.com/",
    logo: "https://solo-bizz.com/logo.png",
    email: "info@solo-bizz.com",
    sameAs: ["https://t.me/solobizzcontact"],
  },
};

export default function AboutBrandPage() {
  const { lang } = useLanguage();
  const t = COPY[lang] ?? COPY.en;
  const sections = [[t.whatTitle, t.what], [t.whoTitle, t.who], [t.nameTitle, t.name]];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SeoHead
        path="/about"
        title="About Solo .Bizz — practice management for independent practitioners"
        description="Solo .Bizz is the official workspace at solo-bizz.com for psychologists, therapists, coaches and tutors: calendar, clients, payments and invoices."
        jsonLd={JSON_LD}
      />
      <header className="border-b border-border px-4 sm:px-6 h-16 flex items-center">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-foreground"><BrandName /></Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> {t.back}
          </Link>
        </div>
      </header>
      <main className="flex-1 px-4 sm:px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col items-center text-center">
            <img src="/logo.png" alt="Solo .Bizz logo" width={96} height={96} className="h-24 w-24 rounded-2xl shadow-md" />
            <h1 className="mt-6 text-3xl sm:text-4xl font-bold text-foreground">
              {t.title.split("Solo .Bizz")[0]}<BrandName />{t.title.split("Solo .Bizz")[1]}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{t.lead}</p>
          </div>
          <div className="mt-12 space-y-8">
            {sections.map(([h, p]) => (
              <section key={h}>
                <h2 className="text-xl font-semibold text-foreground">{h}</h2>
                <p className="mt-2 text-muted-foreground leading-relaxed">{p}</p>
              </section>
            ))}
            <section>
              <h2 className="text-xl font-semibold text-foreground">{t.contactTitle}</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /><a href="mailto:info@solo-bizz.com" className="hover:text-foreground">info@solo-bizz.com</a></li>
                <li className="flex items-center gap-2"><Send className="h-4 w-4 text-primary" /><a href="https://t.me/solobizzcontact" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Telegram</a></li>
                <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Gwiaździsta 16, 53-413 Wrocław, PL</li>
              </ul>
            </section>
          </div>
          <div className="mt-12 text-center">
            <Button asChild size="lg"><Link to="/auth">{t.cta}</Link></Button>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
