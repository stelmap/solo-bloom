import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = "gdpr.idleTimeoutMinutes";
const DEFAULT_MINUTES = 30;
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"];

export function readIdleTimeoutMinutes(): number {
  if (typeof window === "undefined") return DEFAULT_MINUTES;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const n = raw ? parseInt(raw, 10) : DEFAULT_MINUTES;
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MINUTES;
}

export function writeIdleTimeoutMinutes(minutes: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, String(minutes));
  window.dispatchEvent(new Event("gdpr-idle-timeout-changed"));
}

/**
 * Auto sign-out after N minutes of user inactivity.
 * Set minutes = 0 to disable.
 */
export function useIdleTimeout() {
  const { user } = useAuth();
  const timerRef = useRef<number | null>(null);
  const minutesRef = useRef<number>(readIdleTimeoutMinutes());

  useEffect(() => {
    if (!user) return;

    const reset = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const mins = minutesRef.current;
      if (mins <= 0) return;
      timerRef.current = window.setTimeout(async () => {
        try {
          await supabase.auth.signOut();
          toast({
            title: "Signed out",
            description: `You were signed out after ${mins} minutes of inactivity.`,
          });
        } catch {/* ignore */}
      }, mins * 60_000);
    };

    const onChange = () => {
      minutesRef.current = readIdleTimeoutMinutes();
      reset();
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    window.addEventListener("gdpr-idle-timeout-changed", onChange);
    reset();

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, reset));
      window.removeEventListener("gdpr-idle-timeout-changed", onChange);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [user]);
}
