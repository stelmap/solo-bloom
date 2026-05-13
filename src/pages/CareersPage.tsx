import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Briefcase, ArrowLeft, Mail } from "lucide-react";
import { getStoredLang } from "@/i18n/LanguageContext";
import { SeoHead } from "@/components/SeoHead";

const COPY = {
  uk: {
    back: "На головну",
    title: "Вакансії",
    empty: "Зараз відкритих вакансій немає.",
    note: "Якщо хочете долучитися до команди Solo Bizz у майбутньому — напишіть нам, і ми збережемо ваше резюме.",
  },
  en: {
    back: "Home",
    title: "Careers",
    empty: "No vacancy open for now.",
    note: "If you'd like to join the Solo Bizz team in the future — drop us a line and we'll keep your CV on file.",
  },
  fr: {
    back: "Accueil",
    title: "Carrières",
    empty: "Aucun poste ouvert pour le moment.",
    note: "Si vous souhaitez rejoindre l'équipe Solo Bizz à l'avenir — écrivez-nous et nous garderons votre CV.",
  },
  pl: {
    back: "Strona główna",
    title: "Kariera",
    empty: "Obecnie nie mamy otwartych wakatów.",
    note: "Jeśli chcesz w przyszłości dołączyć do zespołu Solo Bizz — napisz do nas, zachowamy Twoje CV.",
  },
} as const;

export default function CareersPage() {
  const stored = getStoredLang() as any;
  const lang: "uk" | "en" | "fr" | "pl" = (["uk","en","fr","pl"].includes(stored) ? stored : "en");
  const t = COPY[lang];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SeoHead
        path="/careers"
        title="Careers — Solo Bizz"
        description="Open roles at Solo Bizz. We're a small team building calm, focused tools for psychologists, therapists, coaches and tutors running solo practices."
      />
      <header className="border-b border-border px-4 sm:px-6 h-16 flex items-center">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-foreground">Solo Bizz</Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> {t.back}
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-5">
            <Briefcase className="h-6 w-6" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">{t.title}</h1>
          <p className="text-lg text-muted-foreground mb-8">{t.empty}</p>
          <p className="text-sm text-muted-foreground mb-8">{t.note}</p>
          <a href="mailto:info@solo-bizz.com?subject=Careers%20%E2%80%94%20Solo%20Bizz">
            <Button size="lg" className="gap-2">
              <Mail className="h-4 w-4" /> info@solo-bizz.com
            </Button>
          </a>
        </div>
      </main>
    </div>
  );
}
