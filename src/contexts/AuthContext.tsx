import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { identifyUser, resetAnalytics } from "@/lib/analytics";

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
  beginRecovery: () => void;
  clearRecovery: () => void;
  signOut: () => Promise<void>;
  subscription: SubscriptionStatus;
  subscriptionError: string | null;
  refreshSubscription: (options?: { force?: boolean }) => Promise<void>;
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

const SUBSCRIPTION_RETRY_DELAYS_MS = [500, 1_000, 2_000];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getFunctionErrorStatus = (error: unknown) => {
  const context = (error as { context?: { status?: number } })?.context;
  return context?.status;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isRecovery: false,
  beginRecovery: () => {},
  clearRecovery: () => {},
  signOut: async () => {},
  subscription: defaultSubscription,
  subscriptionError: null,
  refreshSubscription: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatus>(defaultSubscription);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const subscriptionRefreshInFlight = useRef<Promise<void> | null>(null);

  const refreshSubscription = useCallback(async (options?: { force?: boolean }) => {
    if (!session?.access_token) {
      setSubscription({ ...defaultSubscription, loading: false });
      return;
    }

    if (subscriptionRefreshInFlight.current) {
      return subscriptionRefreshInFlight.current;
    }

    const run = (async () => {

    let lastError: unknown;
    for (let attempt = 0; attempt <= SUBSCRIPTION_RETRY_DELAYS_MS.length; attempt += 1) {
      const { data: latestSessionData } = await supabase.auth.getSession();
      let latestSession = latestSessionData.session;

      if (!latestSession?.access_token) {
        setSubscription({ ...defaultSubscription, loading: false });
        return;
      }

      if (latestSession.expires_at && latestSession.expires_at * 1000 <= Date.now() + 30_000) {
        const { data: refreshedSessionData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedSessionData.session?.access_token) {
          await supabase.auth.signOut();
          setSubscription({ ...defaultSubscription, loading: false });
          return;
        }
        latestSession = refreshedSessionData.session;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${latestSession.access_token}`,
        },
        body: options?.force ? { force: true } : undefined,
      });

      if (!error) {
        setSubscriptionError(null);
        setSubscription({
          subscribed: data.subscribed ?? false,
          on_trial: data.on_trial ?? false,
          subscription_end: data.subscription_end ?? null,
          trial_end: data.trial_end ?? null,
          price_id: data.price_id ?? null,
          cancel_at_period_end: data.cancel_at_period_end ?? false,
          loading: false,
        });
        return;
      }

      lastError = error;
      const status = getFunctionErrorStatus(error);
      if (status === 401 || status === 403) {
        await supabase.auth.signOut();
        setSubscriptionError(null);
        setSubscription({ ...defaultSubscription, loading: false });
        return;
      }
      const delay = SUBSCRIPTION_RETRY_DELAYS_MS[attempt];
      if (delay === undefined) break;
      await wait(delay);
    }

    console.error("Failed to check subscription after retries:", lastError);
    setSubscriptionError("We couldn't confirm your billing status right now. Please try refreshing in a moment.");
    setSubscription({ ...defaultSubscription, loading: false });
    })();

    subscriptionRefreshInFlight.current = run;
    try {
      await run;
    } finally {
      if (subscriptionRefreshInFlight.current === run) {
        subscriptionRefreshInFlight.current = null;
      }
    }
  }, [session]);

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Analytics: identify by Supabase user ID only (no PII)
      if (session?.user?.id) {
        identifyUser(session.user.id);
      }

      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      } else if (event === "SIGNED_OUT") {
        setIsRecovery(false);
        // Analytics: clear identity on sign-out
        resetAnalytics();
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Analytics: identify on initial session restore
      if (session?.user?.id) identifyUser(session.user.id);
    });

    return () => authSub.unsubscribe();
  }, []);

  // Check subscription when session changes
  useEffect(() => {
    if (session) {
      refreshSubscription({ force: true });
    } else {
      setSubscriptionError(null);
      setSubscription({ ...defaultSubscription, loading: false });
    }
  }, [session, refreshSubscription]);

  // Periodic refresh every 5 minutes (reduced from 60s to avoid Stripe rate limits at scale)
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(refreshSubscription, 300_000);
    return () => clearInterval(interval);
  }, [session, refreshSubscription]);

  const beginRecovery = () => setIsRecovery(true);

  const clearRecovery = () => setIsRecovery(false);

  const signOut = async () => {
    setIsRecovery(false);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isRecovery, beginRecovery, clearRecovery, signOut, subscription, subscriptionError, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
