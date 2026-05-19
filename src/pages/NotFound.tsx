import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Compass, ExternalLink } from "lucide-react";
import { SeoHead } from "@/components/SeoHead";

const CANONICAL_HOST = "www.solo-bizz.com";
const CANONICAL_ORIGIN = "https://www.solo-bizz.com";

const ASCII_GHOST = String.raw`
    .|||||||||.
   |||||||||||||   where am i?
  |||||||||||' .\
  \`||||||||||_,__o
`;

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOffCanonical, setIsOffCanonical] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      setIsOffCanonical(
        host === "solo-bizz.com" ||
          (host.endsWith("solo-bizz.com") && host !== CANONICAL_HOST && !host.endsWith("lovable.app")),
      );
    }
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const canonicalUrl = `${CANONICAL_ORIGIN}${location.pathname}${location.search}`;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-muted/40 px-4 py-12">
      <SeoHead
        title="Page not found — SoloBizz"
        description="That page doesn't exist. Head back to SoloBizz and we'll get you on track."
        path="/404"
        noindex
      />

      <div className="w-full max-w-lg text-center space-y-8">
        <pre
          aria-hidden
          className="mx-auto text-left text-primary text-xs sm:text-sm leading-tight font-mono whitespace-pre select-none"
        >
{ASCII_GHOST}
        </pre>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Error 404
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            This page wandered off
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            We couldn't find{" "}
            <code className="font-mono text-foreground/80 bg-muted px-1.5 py-0.5 rounded">
              {location.pathname}
            </code>
            . It may have been moved, renamed, or never existed.
          </p>
        </div>

        {isOffCanonical && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-left">
            <p className="text-xs uppercase tracking-wider text-primary mb-1">
              Looks like you're on the old address
            </p>
            <p className="text-sm text-foreground mb-3">
              SoloBizz lives at{" "}
              <span className="font-mono font-medium">{CANONICAL_HOST}</span>. Continue
              there to find what you were looking for.
            </p>
            <Button asChild size="sm" className="w-full sm:w-auto">
              <a href={canonicalUrl} rel="noreferrer">
                Go to {CANONICAL_HOST}
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" onClick={() => navigate(-1)} variant="outline" className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Back to home
            </Link>
          </Button>
        </div>

        <div className="pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-3 inline-flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5" />
            Or jump to:
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
            <Link to="/dashboard" className="text-primary hover:underline">Dashboard</Link>
            <span className="text-border" aria-hidden>·</span>
            <Link to="/calendar" className="text-primary hover:underline">Calendar</Link>
            <span className="text-border" aria-hidden>·</span>
            <Link to="/clients" className="text-primary hover:underline">Clients</Link>
            <span className="text-border" aria-hidden>·</span>
            <Link to="/settings" className="text-primary hover:underline">Settings</Link>
          </nav>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
