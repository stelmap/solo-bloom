import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="animate-pulse text-secondary-foreground/50">Loading...</div>
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
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
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
          title: "Account created!",
          description: "Check your email to verify your account.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
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
            For solo business owners. No bloat. No cross-feature confusion. Just the tool you need.
          </p>
          <div className="flex items-center justify-center gap-8 pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">100%</p>
              <p className="text-xs text-secondary-foreground/50 mt-1">Cloud-based</p>
            </div>
            <div className="h-8 w-px bg-secondary-foreground/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">Simple</p>
              <p className="text-xs text-secondary-foreground/50 mt-1">Easy to use</p>
            </div>
            <div className="h-8 w-px bg-secondary-foreground/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">Secure</p>
              <p className="text-xs text-secondary-foreground/50 mt-1">Your data safe</p>
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
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Sign in to manage your business" : "Get started in seconds"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  required={!isLogin}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-medium hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
