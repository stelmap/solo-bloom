import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionStatus {
  subscribed: boolean;
  on_trial: boolean;
  subscription_end: string | null;
  trial_end: string | null;
  price_id: string | null;
  cancel_at_period_end: boolean;
  loading: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isRecovery: boolean;
  clearRecovery: () => void;
  signOut: () => Promise<void>;
  subscription: SubscriptionStatus;
  refreshSubscription: () => Promise<void>;
}

const defaultSubscription: SubscriptionStatus = {
  subscribed: false,
  on_trial: false,
  subscription_end: null,
  trial_end: null,
  price_id: null,
  cancel_at_period_end: false,
  loading: true,
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isRecovery: false,
  clearRecovery: () => {},
  signOut: async () => {},
  subscription: defaultSubscription,
  refreshSubscription: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatus>(defaultSubscription);

  const refreshSubscription = useCallback(async () => {
    if (!session) {
      setSubscription({ ...defaultSubscription, loading: false });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubscription({
        subscribed: data.subscribed ?? false,
        on_trial: data.on_trial ?? false,
        subscription_end: data.subscription_end ?? null,
        trial_end: data.trial_end ?? null,
        price_id: data.price_id ?? null,
        cancel_at_period_end: data.cancel_at_period_end ?? false,
        loading: false,
      });
    } catch (err) {
      console.error("Failed to check subscription:", err);
      setSubscription({ ...defaultSubscription, loading: false });
    }
  }, [session]);

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => authSub.unsubscribe();
  }, []);

  // Check subscription when session changes
  useEffect(() => {
    if (session) {
      refreshSubscription();
    } else {
      setSubscription({ ...defaultSubscription, loading: false });
    }
  }, [session, refreshSubscription]);

  // Periodic refresh every 5 minutes (reduced from 60s to avoid Stripe rate limits at scale)
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(refreshSubscription, 300_000);
    return () => clearInterval(interval);
  }, [session, refreshSubscription]);

  const clearRecovery = () => setIsRecovery(false);

  const signOut = async () => {
    setIsRecovery(false);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isRecovery, clearRecovery, signOut, subscription, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
