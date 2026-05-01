import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const TEMPLATES = [
  { id: "signup", label: "Signup confirmation" },
  { id: "magiclink", label: "Magic link" },
  { id: "recovery", label: "Password recovery" },
  { id: "invite", label: "Invite" },
  { id: "email_change", label: "Email change" },
  { id: "reauthentication", label: "Reauthentication (OTP)" },
] as const;

const LANGS = [
  { id: "en", label: "EN" },
  { id: "uk", label: "UK" },
  { id: "pl", label: "PL" },
] as const;

type Preview = { subject: string; html: string; text: string };

export default function AdminEmailPreviewPage() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [type, setType] = useState<string>("signup");
  const [lang, setLang] = useState<string>("en");
  const [view, setView] = useState<"html" | "text">("html");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (error) {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(Boolean(data));
    })();
  }, [user]);

  useEffect(() => {
    if (isAdmin !== true) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    setPreview(null);
    supabase.functions
      .invoke("admin-preview-auth-email", { body: { type, lang } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError(error.message);
        } else {
          setPreview(data as Preview);
        }
      })
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
  }, [isAdmin, type, lang]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Verifying access…
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <Card className="p-8 max-w-md text-center space-y-2">
          <h1 className="text-xl font-semibold">Admin only</h1>
          <p className="text-sm text-muted-foreground">
            You don't have permission to view this page.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Auth email preview</h1>
          <p className="text-sm text-muted-foreground">
            Preview every auth email template in EN / UK / PL before deployment.
            Sample data is used — no emails are sent.
          </p>
        </header>

        <Card className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((tpl) => (
              <Button
                key={tpl.id}
                size="sm"
                variant={type === tpl.id ? "default" : "outline"}
                onClick={() => setType(tpl.id)}
              >
                {tpl.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Tabs value={lang} onValueChange={setLang}>
              <TabsList>
                {LANGS.map((l) => (
                  <TabsTrigger key={l.id} value={l.id}>
                    {l.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Tabs value={view} onValueChange={(v) => setView(v as "html" | "text")}>
              <TabsList>
                <TabsTrigger value="html">HTML</TabsTrigger>
                <TabsTrigger value="text">Plain text</TabsTrigger>
              </TabsList>
            </Tabs>
            {preview && (
              <Badge variant="secondary" className="ml-auto">
                Subject: {preview.subject}
              </Badge>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          {busy && (
            <div className="p-12 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Rendering…
            </div>
          )}
          {!busy && error && (
            <div className="p-6 text-destructive text-sm">Error: {error}</div>
          )}
          {!busy && preview && view === "html" && (
            <iframe
              title="email-preview"
              srcDoc={preview.html}
              className="w-full h-[800px] bg-white"
              sandbox=""
            />
          )}
          {!busy && preview && view === "text" && (
            <pre className="p-6 text-sm whitespace-pre-wrap font-mono">
              {preview.text}
            </pre>
          )}
        </Card>
      </div>
    </div>
  );
}
