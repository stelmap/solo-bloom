import { AppSidebar } from "./AppSidebar";
import { DemoBanner } from "./DemoBanner";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="md:ml-64 min-h-screen">
        <DemoBanner />
        <div className="p-4 md:p-8 pt-16 md:pt-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
