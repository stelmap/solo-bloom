import { useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { DemoBanner } from "./DemoBanner";
import { useSoundReminder } from "@/hooks/useSoundReminder";
import { useTaxAccrualSync } from "@/hooks/useData";
import { track } from "@/lib/analytics";

const PRODUCT_ENTERED_KEY = "__product_entered_at";

export function AppLayout({ children }: { children: React.ReactNode }) {
  useSoundReminder();
  useTaxAccrualSync();

  useEffect(() => {
    // Fire `product_entered` once per browser session on first authenticated render.
    try {
      if (!sessionStorage.getItem(PRODUCT_ENTERED_KEY)) {
        sessionStorage.setItem(PRODUCT_ENTERED_KEY, String(Date.now()));
        track("product_entered", { path: window.location.pathname });
      }
    } catch {
      /* noop */
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="lg:ml-64 min-h-screen">
        <DemoBanner />
        <div className="p-4 lg:px-10 xl:px-14 lg:py-8 pt-16 lg:pt-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
