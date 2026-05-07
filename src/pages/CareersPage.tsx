import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Briefcase, ArrowLeft, Mail } from "lucide-react";

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-4 sm:px-6 h-16 flex items-center">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-foreground">Solo Bizz</Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> На головну
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-5">
            <Briefcase className="h-6 w-6" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">Вакансії</h1>
          <p className="text-lg text-muted-foreground mb-8">
            No vacancy open for now.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Якщо ви хочете долучитися до команди Solo Bizz у майбутньому — напишіть нам, і ми збережемо ваше резюме.
          </p>
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
