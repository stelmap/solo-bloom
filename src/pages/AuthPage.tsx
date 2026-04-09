import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function AuthPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="animate-pulse text-secondary-foreground/50">{t("common.loading")}</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: t("auth.accountCreated"),
          description: t("auth.checkEmail"),
        });
      }
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: t("auth.resetLinkSent"),
        description: t("auth.checkEmailForReset"),
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — dark hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-secondary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-accent to-secondary" />
        <div className="relative z-10 max-w-md space-y-6 text-center">
          <h1 className="text-4xl font-bold text-secondary-foreground tracking-tight">
            Solo<span className="text-primary">Pro</span>
          </h1>
          <p className="text-secondary-foreground/70 text-lg leading-relaxed">
            {t("auth.heroText")}
          </p>
          <div className="flex items-center justify-center gap-8 pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">100%</p>
              <p className="text-xs text-secondary-foreground/50 mt-1">{t("auth.cloudBased")}</p>
            </div>
            <div className="h-8 w-px bg-secondary-foreground/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{t("auth.simple")}</p>
              <p className="text-xs text-secondary-foreground/50 mt-1">{t("auth.easyToUse")}</p>
            </div>
            <div className="h-8 w-px bg-secondary-foreground/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{t("auth.secure")}</p>
              <p className="text-xs text-secondary-foreground/50 mt-1">{t("auth.yourDataSafe")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2 lg:hidden">
            <h1 className="text-2xl font-bold text-foreground">
              Solo<span className="text-primary">Pro</span>
            </h1>
          </div>

          {mode === "forgot" ? (
            <>
              <div className="space-y-1">
                <button
                  onClick={() => setMode("login")}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("auth.backToLogin")}
                </button>
                <h2 className="text-xl font-bold text-foreground">{t("auth.resetPassword")}</h2>
                <p className="text-sm text-muted-foreground">{t("auth.resetPasswordDesc")}</p>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("common.email")}</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("auth.sending") : t("auth.sendResetLink")}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-foreground">
                  {mode === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {mode === "login" ? t("auth.signInToManage") : t("auth.getStarted")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label>{t("common.fullName")}</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t("auth.yourName")}
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{t("common.email")}</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t("auth.password")}</Label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs text-primary hover:underline"
                      >
                        {t("auth.forgotPassword")}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("common.loading") : mode === "login" ? t("auth.signIn") : t("auth.createAccount")}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
                <button
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="text-primary font-medium hover:underline"
                >
                  {mode === "login" ? t("auth.signUp") : t("auth.signIn")}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
