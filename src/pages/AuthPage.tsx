import { useState, useRef, useEffect } from "react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { getStoredLang, setStoredLang } from "@/i18n/LanguageContext";
import { Language } from "@/i18n/translations";
import { Eye, EyeOff, ArrowLeft, Globe } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { track } from "@/lib/analytics";

const PLAN_PRICE_MAP: Record<string, string> = {
  // New: tier_cycle keys
  solo_monthly: "price_1TPQ3DRxXuU3N5IFMcxZCvva",
  solo_quarterly: "price_1TPQ5FRxXuU3N5IF5ufGLkV1",
  solo_yearly: "price_1TPQ60RxXuU3N5IFBiGOuz8f",
  pro_monthly: "price_1TPQahRxXuU3N5IF3umwA0Bd",
  pro_quarterly: "price_1TPQbIRxXuU3N5IFPVrvG60z",
  pro_yearly: "price_1TPQbmRxXuU3N5IFirrjnqdi",
  // Backward compat: cycle-only keys default to Solo tier
  monthly: "price_1TPQ3DRxXuU3N5IFMcxZCvva",
  quarterly: "price_1TPQ5FRxXuU3N5IF5ufGLkV1",
  yearly: "price_1TPQ60RxXuU3N5IFBiGOuz8f",
};

export default function AuthPage() {
  const { user, loading: authLoading, beginRecovery } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get("plan");
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "otp">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const resetEmailRef = useRef("");
  const checkoutTriggeredRef = useRef(false);
  const { toast } = useToast();
  const { t, lang } = useLanguage();

  // If user is already logged in and a plan was selected, auto-start checkout.
  // Redirect in the SAME tab to avoid popup blockers and the "flicker" caused by
  // opening a new tab and immediately navigating the current one to /dashboard.
  const [checkoutRedirecting, setCheckoutRedirecting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

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
      // Same-tab redirect — single, clean handoff to Stripe.
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
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="animate-pulse text-secondary-foreground/50">{t("common.loading")}</div>
      </div>
    );
  }

  if (user && !planParam) {
    return <Navigate to="/dashboard" replace />;
  }

  // While auto-checkout is in progress, show a clear loading state in the SAME tab.
  // No more navigating to /dashboard before checkout — that was the source of the
  // "blink/flicker" the user reported.
  if (user && planParam && (checkoutRedirecting || checkoutTriggeredRef.current) && !checkoutError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <h2 className="text-lg font-semibold text-foreground">{t("auth.redirectingToCheckout") || "Redirecting to secure payment page…"}</h2>
          <p className="text-sm text-muted-foreground">{t("auth.dontClose") || "Please don't close this tab."}</p>
        </div>
      </div>
    );
  }

  if (user && planParam && checkoutError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{t("auth.checkoutFailed") || "We couldn't open the payment page"}</h2>
          <p className="text-sm text-muted-foreground">{checkoutError}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => startPlanCheckout(planParam)}>{t("common.retry") || "Try again"}</Button>
            <Button variant="outline" onClick={() => navigate("/dashboard", { replace: true })}>
              {t("common.cancel") || "Cancel"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Analytics: successful password login
        track("login_completed", { plan_type: planParam ?? undefined });
        // Navigation handled by useEffect (auto-checkout if plan param) or Navigate component
      } else if (mode === "signup") {
        // Analytics: sign-up form submitted (attempt)
        track("sign_up_started", { plan_type: planParam ?? undefined });
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        // Analytics: sign-up succeeded (email verification may still be pending)
        track("sign_up_completed", { plan_type: planParam ?? undefined });
        toast({ title: t("auth.accountCreated"), description: t("auth.checkEmail") });
      }
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Analytics: user requested a password reset email
      track("password_reset_started");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      resetEmailRef.current = email;
      toast({ title: t("auth.otpSent"), description: t("auth.otpSentDesc") });
      setMode("otp");
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue.length !== 8) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: resetEmailRef.current,
        token: otpValue.trim(),
        type: "recovery",
      });
      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("expired")) {
          throw new Error(t("auth.otpExpired"));
        }
        if (message.includes("used")) {
          throw new Error(t("auth.otpAlreadyUsed"));
        }
        if (message.includes("invalid") || message.includes("token") || message.includes("code")) {
          throw new Error(t("auth.invalidOtp"));
        }
        throw error;
      }

      if (!data?.session && !data?.user) {
        throw new Error(t("auth.invalidOtp"));
      }

      beginRecovery();
      navigate("/reset-password", { replace: true, state: { recoveryVerified: true } });
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      setOtpValue("");
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = (title: string, subtitle: string, onBack?: () => void) => (
    <div className="space-y-2">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("auth.backToLogin")}
        </button>
      )}
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );

  const renderForm = () => {
    if (mode === "otp") {
      return (
        <>
          {renderHeader(t("auth.enterOtp"), t("auth.otpDescription"), () => { setMode("forgot"); setOtpValue(""); })}
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="flex justify-center py-2">
              <InputOTP maxLength={8} value={otpValue} onChange={setOtpValue}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                  <InputOTPSlot index={6} />
                  <InputOTPSlot index={7} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button type="submit" className="w-full" disabled={loading || otpValue.length !== 8}>
              {loading ? t("auth.verifying") : t("auth.verifyCode")}
            </Button>
            <p className="text-center text-xs text-muted-foreground">{t("auth.otpExpiry")}</p>
          </form>
        </>
      );
    }

    if (mode === "forgot") {
      return (
        <>
          {renderHeader(t("auth.resetPassword"), t("auth.resetPasswordOtpDesc"), () => setMode("login"))}
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
              {loading ? t("auth.sending") : t("auth.sendOtp")}
            </Button>
          </form>
        </>
      );
    }

    return (
      <>
        {renderHeader(
          mode === "login" ? t("auth.welcomeBack") : t("auth.createAccount"),
          mode === "login" ? t("auth.signInToManage") : t("auth.getStarted"),
        )}

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
    );
  };

  const LANG_CYCLE: Language[] = ["en", "fr", "uk"];
  const toggleLang = () => {
    const current = getStoredLang();
    const idx = LANG_CYCLE.indexOf(current);
    const next: Language = LANG_CYCLE[(idx + 1) % LANG_CYCLE.length];
    setStoredLang(next);
    window.location.reload();
  };
  const langLabel = lang === "en" ? "EN" : lang === "fr" ? "FR" : "UA";

  return (
    <div className="min-h-screen flex relative">
      {/* Language toggle */}
      <button
        onClick={toggleLang}
        className="absolute top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/80 hover:bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        title={t("settings.language")}
      >
        <Globe className="h-4 w-4" />
        {langLabel}
      </button>

      {/* Left panel — dark hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-secondary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-accent to-secondary" />
        <div className="relative z-10 max-w-md space-y-6 text-center">
          <h1 className="text-4xl font-bold text-secondary-foreground tracking-tight">
            Solo<span className="text-primary">Bizz</span>
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
              Solo<span className="text-primary">Bizz</span>
            </h1>
          </div>
          {renderForm()}
        </div>
      </div>
    </div>
  );
}
