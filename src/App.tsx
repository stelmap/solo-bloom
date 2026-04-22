import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FinanceGate } from "@/components/FinanceGate";
import { EntitlementGate } from "@/components/EntitlementGate";
import { lazy, Suspense } from "react";

// Eagerly loaded (landing + auth — needed immediately)
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// Lazy loaded (behind auth or rarely visited)
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const ClientDetailPage = lazy(() => import("./pages/ClientDetailPage"));
const GroupsPage = lazy(() => import("./pages/GroupsPage"));
const GroupDetailPage = lazy(() => import("./pages/GroupDetailPage"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const IncomePage = lazy(() => import("./pages/IncomePage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const BreakevenPage = lazy(() => import("./pages/BreakevenPage"));
const FinancialOverviewPage = lazy(() => import("./pages/FinancialOverviewPage"));
const FinanceOnboardingPage = lazy(() => import("./pages/FinanceOnboardingPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const ConfirmSessionPage = lazy(() => import("./pages/ConfirmSessionPage"));
const UnsubscribePage = lazy(() => import("./pages/UnsubscribePage"));
const SupervisionPage = lazy(() => import("./pages/SupervisionPage"));
const DiagnosticsPage = lazy(() => import("./pages/DiagnosticsPage"));
const PlansPage = lazy(() => import("./pages/PlansPage"));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-pulse text-muted-foreground text-sm">Loading…</div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/confirm-session" element={<ConfirmSessionPage />} />
                <Route path="/unsubscribe" element={<UnsubscribePage />} />

                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
                <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
                <Route path="/clients/:id" element={<ProtectedRoute><ClientDetailPage /></ProtectedRoute>} />
                <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
                <Route path="/groups/:id" element={<ProtectedRoute><GroupDetailPage /></ProtectedRoute>} />
                <Route path="/services" element={<ProtectedRoute><ServicesPage /></ProtectedRoute>} />

                {/* Finances module (gated by entitlement + setup completion) */}
                <Route path="/finances/onboarding" element={<ProtectedRoute><EntitlementGate feature="financial_access"><FinanceOnboardingPage /></EntitlementGate></ProtectedRoute>} />
                <Route path="/finances" element={<ProtectedRoute><EntitlementGate feature="financial_access"><FinanceGate><FinancialOverviewPage /></FinanceGate></EntitlementGate></ProtectedRoute>} />
                <Route path="/finances/income" element={<ProtectedRoute><EntitlementGate feature="financial_access"><FinanceGate><IncomePage /></FinanceGate></EntitlementGate></ProtectedRoute>} />
                <Route path="/finances/expenses" element={<ProtectedRoute><EntitlementGate feature="financial_access"><FinanceGate><ExpensesPage /></FinanceGate></EntitlementGate></ProtectedRoute>} />
                <Route path="/finances/breakeven" element={<ProtectedRoute><EntitlementGate feature="financial_access"><FinanceGate><BreakevenPage /></FinanceGate></EntitlementGate></ProtectedRoute>} />

                {/* Backwards-compatible redirects from old top-level routes */}
                <Route path="/income" element={<Navigate to="/finances/income" replace />} />
                <Route path="/expenses" element={<Navigate to="/finances/expenses" replace />} />
                <Route path="/breakeven" element={<Navigate to="/finances/breakeven" replace />} />
                <Route path="/financial" element={<Navigate to="/finances" replace />} />

                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/supervision" element={<ProtectedRoute><EntitlementGate feature="premium_access"><SupervisionPage /></EntitlementGate></ProtectedRoute>} />
                <Route path="/diagnostics" element={<ProtectedRoute><DiagnosticsPage /></ProtectedRoute>} />
                <Route path="/plans" element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
