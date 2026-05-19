import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw } from "lucide-react";
import { SeoHead } from "@/components/SeoHead";

const CANONICAL_URL = "https://www.solo-bizz.com/";
const COUNTDOWN_SECONDS = 8;

export default function ServerUpdatePage() {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      window.location.replace(CANONICAL_URL);
      return;
    }
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [secondsLeft]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-muted/40 px-4 py-12">
      <SeoHead
        title="SoloBizz is moving — continue at www.solo-bizz.com"
        description="This SoloBizz address is being updated. The app is live at www.solo-bizz.com — you'll be redirected automatically."
        path="/server-update"
        noindex
      />
      <div className="w-full max-w-md text-center space-y-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <RefreshCw className="h-8 w-8 animate-spin-slow" aria-hidden />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            We're updating SoloBizz
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            This address is being refreshed. The app is live and ready for you at our
            main domain.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 text-left shadow-sm">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Continue on
          </div>
          <div className="font-mono text-base text-foreground break-all">
            www.solo-bizz.com
          </div>
        </div>

        <div className="space-y-3">
          <Button asChild size="lg" className="w-full">
            <a href={CANONICAL_URL} rel="noreferrer">
              Take me there
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Redirecting automatically in {secondsLeft}s…
          </p>
        </div>
      </div>
    </main>
  );
}
