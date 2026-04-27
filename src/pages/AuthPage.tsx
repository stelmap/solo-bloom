import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { getStoredLang } from "@/i18n/LanguageContext";
import { track } from "@/lib/analytics";
import { PublicFooter } from "@/components/PublicFooter";

const PLAN_PRICE_MAP: Record<string, string> = {
  solo_monthly: "price_1TPQ3DRxXuU3N5IFMcxZCvva",
  solo_quarterly: "price_1TPQ5FRxXuU3N5IF5ufGLkV1",
  solo_yearly: "price_1TPQ60RxXuU3N5IFBiGOuz8f",
  pro_monthly: "price_1TPQahRxXuU3N5IF3umwA0Bd",
  pro_quarterly: "price_1TPQbIRxXuU3N5IFPVrvG60z",
  pro_yearly: "price_1TPQbmRxXuU3N5IFirrjnqdi",
  monthly: "price_1TPQ3DRxXuU3N5IFMcxZCvva",
  quarterly: "price_1TPQ5FRxXuU3N5IF5ufGLkV1",
  yearly: "price_1TPQ60RxXuU3N5IFBiGOuz8f",
};

export default function AuthPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get("plan");
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(searchParams.get("mode") === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const checkoutTriggeredRef = useRef(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const [checkoutRedirecting, setCheckoutRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const modeCopy = useMemo(() => {
    if (mode === "signup") return { title: t("auth.createAccount"), subtitle: t("auth.registerDesc"), button: t("auth.createAccountButton") };
    if (mode === "forgot") return { title: t("auth.resetPassword"), subtitle: t("auth.resetPasswordDesc"), button: t("auth.sendResetLink") };
    return { title: t("auth.welcomeBack"), subtitle: t("auth.signInToManage"), button: t("auth.signIn") };
  }, [mode, t]);

  const resetMode = (nextMode: "login" | "signup" | "forgot") => {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setFormError(null);
    setSent(false);
  };

  const validateForm = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return t("auth.emailRequired");
    if (!isValidEmail(trimmedEmail)) return t("auth.invalidEmail");
    if (mode !== "forgot" && !password) return t("auth.passwordRequired");
    if (mode === "signup" && password !== confirmPassword) return t("auth.passwordsMismatch");
    return null;
  };

  const startPlanCheckout = async (plan: string) => {
    const priceId = PLAN_PRICE_MAP[plan];
    if (!priceId) return;
    setCheckoutError(null);
    setCheckoutRedirecting(true);
    try {
      track("checkout_started", { plan_type: plan });
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId, withTrial: true },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (err: any) {
      const msg = err?.message || "Failed to start checkout";
      setCheckoutError(msg);
      setCheckoutRedirecting(false);
      checkoutTriggeredRef.current = false;
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (user && planParam && PLAN_PRICE_MAP[planParam] && !checkoutTriggeredRef.current) {
      checkoutTriggeredRef.current = true;
      startPlanCheckout(planParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, planParam]);

  if (authLoading) {
    return <div className="min-h-screen bg-secondary flex items-center justify-center"><div className="animate-pulse text-secondary-foreground/50">{t("common.loading")}</div></div>;
  }

  if (user && !planParam) {
    return <Navigate to="/dashboard" replace />;
  }

  if (user && planParam && (checkoutRedirecting || checkoutTriggeredRef.current) && !checkoutError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <h2 className="text-lg font-semibold text-foreground">Redirecting to secure payment page…</h2>
          <p className="text-sm text-muted-foreground">Please don't close this tab.</p>
        </div>
      </div>
    );
  }

  if (user && planParam && checkoutError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <h2 className="text-lg font-semibold text-foreground">We couldn't open the payment page</h2>
          <p className="text-sm text-muted-foreground">{checkoutError}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => startPlanCheckout(planParam)}>Try again</Button>
            <Button variant="outline" onClick={() => navigate("/dashboard", { replace: true })}>Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const lang = getStoredLang();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
          data: { language: lang },
          shouldCreateUser: mode === "signup",
        },
      });
      if (error) throw error;
      track(mode === "signup" ? "sign_up_started" : "login_completed", { plan_type: planParam ?? undefined, lang });
      setSent(true);
      toast({ title: t("auth.checkEmailToContinue"), description: t("auth.checkEmail") });
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative">
      <Link to="/" className="absolute top-4 left-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/80 hover:bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Main page
      </Link>

      <div className="hidden lg:flex lg:w-1/2 bg-secondary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-accent to-secondary" />
        <div className="relative z-10 max-w-md space-y-6 text-center">
          <h1 className="text-4xl font-bold text-secondary-foreground tracking-tight">Solo<span className="text-primary">Bizz</span></h1>
          <p className="text-secondary-foreground/70 text-lg leading-relaxed">{t("auth.heroText")}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-background">
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2 lg:hidden">
              <h1 className="text-2xl font-bold text-foreground">Solo<span className="text-primary">Bizz</span></h1>
            </div>
            {sent ? (
              <div className="space-y-4 text-center">
                <h2 className="text-xl font-bold text-foreground">{t("auth.checkEmailToContinue")}</h2>
                <p className="text-sm text-muted-foreground">{t("auth.checkEmail")}</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-foreground">{mode === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}</h2>
                  <p className="text-sm text-muted-foreground">{mode === "login" ? t("auth.signInToManage") : t("auth.getStarted")}</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("common.email")}</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>{loading ? t("common.loading") : mode === "login" ? t("auth.signIn") : t("auth.signUp")}</Button>
                </form>
                <p className="text-center text-sm text-muted-foreground">
                  {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")} {" "}
                  <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-primary font-medium hover:underline">
                    {mode === "login" ? t("auth.signUp") : t("auth.signIn")}
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
        <PublicFooter />
      </div>
    </div>
  );
}
