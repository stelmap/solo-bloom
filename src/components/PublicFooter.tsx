import { Link } from "react-router-dom";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} SoloBizz. All rights reserved.</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Legal links">
          <Link to="/terms" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Terms & Conditions
          </Link>
          <Link to="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
          <Link to="/cookie-policy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Cookie Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}