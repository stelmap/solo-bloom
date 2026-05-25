import { AppSidebar } from "./AppSidebar";
import { DemoBanner } from "./DemoBanner";
import { useSoundReminder } from "@/hooks/useSoundReminder";
import { useTaxAccrualSync } from "@/hooks/useData";

export function AppLayout({ children }: { children: React.ReactNode }) {
  useSoundReminder();
  useTaxAccrualSync();
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="lg:ml-64 min-h-screen">
        <DemoBanner />
        <div className="p-4 lg:p-8 pt-16 lg:pt-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
