import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSidebarPinned } from "@/hooks/useSidebarPinned";
import { AppSidebar } from "./AppSidebar";
import { DemoBanner } from "./DemoBanner";
import { useSoundReminder } from "@/hooks/useSoundReminder";
import { useTaxAccrualSync } from "@/hooks/useData";
import { track } from "@/lib/analytics";

const PRODUCT_ENTERED_KEY = "__product_entered_at";

export function AppLayout({ children, fluid = false }: { children: React.ReactNode; fluid?: boolean }) {
  const [pinned] = useSidebarPinned();
  // Content shifts only for the pinned sidebar; hover expansion floats above it.
  const sidebarOffset = pinned ? "lg:ml-[216px]" : "lg:ml-[68px]";
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

  if (fluid) {
    // Full-height workspace: the page itself never scrolls; inner regions do.
    return (
      <div className="h-[100dvh] overflow-hidden bg-background">
        <AppSidebar />
        <main className={cn(sidebarOffset, "transition-[margin] duration-200 ease-out h-[100dvh] overflow-hidden flex flex-col")}>
          <DemoBanner />
          <div className="flex-1 min-h-0 overflow-hidden w-full px-4 lg:px-6 py-3 lg:py-4 pt-16 lg:pt-4">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className={cn(sidebarOffset, "transition-[margin] duration-200 ease-out min-h-screen")}>
        <DemoBanner />
        <div className="p-4 lg:px-10 xl:px-14 lg:py-8 pt-16 lg:pt-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

