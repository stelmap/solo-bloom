import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { EntitlementGate } from "@/components/EntitlementGate";
import { lazy, Suspense, ComponentType } from "react";

// Wrap lazy() so stale-chunk errors after a deploy trigger a one-time reload
// instead of leaving the user on a blank screen.
function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      const msg = String(err?.message || err);
      const isChunkError =
        /Importing a module script failed|Failed to fetch dynamically imported module|ChunkLoadError|Loading chunk [\d]+ failed/i.test(
          msg
        );
      if (isChunkError && typeof window !== "undefined") {
        const KEY = "__chunk_reload_at";
        const last = Number(sessionStorage.getItem(KEY) || 0);
        if (Date.now() - last > 10000) {
          sessionStorage.setItem(KEY, String(Date.now()));
          window.location.reload();
          // Return a stub while the reload happens
          return { default: (() => null) as unknown as T };
        }
      }
      throw err;
    }
  });
}

// Eagerly loaded (landing + auth — needed immediately)
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// Lazy loaded (behind auth or rarely visited)
const ResetPasswordPage = lazyWithReload(() => import("./pages/ResetPasswordPage"));
const Dashboard = lazyWithReload(() => import("./pages/Dashboard"));
const CalendarPage = lazyWithReload(() => import("./pages/CalendarPage"));
const ClientsPage = lazyWithReload(() => import("./pages/ClientsPage"));
const ClientDetailPage = lazyWithReload(() => import("./pages/ClientDetailPage"));
const GroupsPage = lazyWithReload(() => import("./pages/GroupsPage"));
const GroupDetailPage = lazyWithReload(() => import("./pages/GroupDetailPage"));
const ServicesPage = lazyWithReload(() => import("./pages/ServicesPage"));
const IncomePage = lazyWithReload(() => import("./pages/IncomePage"));
const ExpensesPage = lazyWithReload(() => import("./pages/ExpensesPage"));
const BreakevenPage = lazyWithReload(() => import("./pages/BreakevenPage"));
const FinancialOverviewPage = lazyWithReload(() => import("./pages/FinancialOverviewPage"));
const PaymentAuditPage = lazyWithReload(() => import("./pages/PaymentAuditPage"));
const SettingsPage = lazyWithReload(() => import("./pages/SettingsPage"));
const PrivacyPage = lazyWithReload(() => import("./pages/PrivacyPage"));
const TermsPage = lazyWithReload(() => import("./pages/TermsPage"));
const CookiePolicyPage = lazyWithReload(() => import("./pages/CookiePolicyPage"));
const CareersPage = lazyWithReload(() => import("./pages/CareersPage"));
const AdminBookingRequestsPage = lazyWithReload(() => import("./pages/AdminBookingRequestsPage"));
const ConfirmSessionPage = lazyWithReload(() => import("./pages/ConfirmSessionPage"));
const PublicBookingPage = lazyWithReload(() => import("./pages/PublicBookingPage"));
const UnsubscribePage = lazyWithReload(() => import("./pages/UnsubscribePage"));
const SupervisionPage = lazyWithReload(() => import("./pages/SupervisionPage"));
const DiagnosticsPage = lazyWithReload(() => import("./pages/DiagnosticsPage"));
const PlansPage = lazyWithReload(() => import("./pages/PlansPage"));
const PurchaseSuccessPage = lazyWithReload(() => import("./pages/PurchaseSuccessPage"));

const AdminEmailPreviewPage = lazyWithReload(() => import("./pages/AdminEmailPreviewPage"));
const AdminUsersPage = lazyWithReload(() => import("./pages/AdminUsersPage"));
const AdminDomainsPage = lazyWithReload(() => import("./pages/AdminDomainsPage"));
const ServerUpdatePage = lazyWithReload(() => import("./pages/ServerUpdatePage"));

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
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/cookie-policy" element={<CookiePolicyPage />} />
                <Route path="/careers" element={<CareersPage />} />
                <Route path="/confirm-session" element={<ConfirmSessionPage />} />
                <Route path="/unsubscribe" element={<UnsubscribePage />} />
                <Route path="/server-update" element={<ServerUpdatePage />} />

                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
                <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
                <Route path="/clients/:id" element={<ProtectedRoute><ClientDetailPage /></ProtectedRoute>} />
                <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
                <Route path="/groups/:id" element={<ProtectedRoute><GroupDetailPage /></ProtectedRoute>} />
                <Route path="/services" element={<ProtectedRoute><ServicesPage /></ProtectedRoute>} />

                {/* Finances module (gated by entitlement) */}
                <Route path="/finances" element={<ProtectedRoute><EntitlementGate feature="financial_access"><FinancialOverviewPage /></EntitlementGate></ProtectedRoute>} />
                <Route path="/finances/income" element={<ProtectedRoute><EntitlementGate feature="financial_access"><IncomePage /></EntitlementGate></ProtectedRoute>} />
                <Route path="/finances/expenses" element={<ProtectedRoute><EntitlementGate feature="financial_access"><ExpensesPage /></EntitlementGate></ProtectedRoute>} />
                <Route path="/finances/breakeven" element={<ProtectedRoute><EntitlementGate feature="financial_access"><BreakevenPage /></EntitlementGate></ProtectedRoute>} />
                <Route path="/finances/payment-audit" element={<ProtectedRoute><EntitlementGate feature="financial_access"><PaymentAuditPage /></EntitlementGate></ProtectedRoute>} />

                {/* Backwards-compatible redirects from old top-level routes */}
                <Route path="/income" element={<Navigate to="/finances/income" replace />} />
                <Route path="/expenses" element={<Navigate to="/finances/expenses" replace />} />
                <Route path="/breakeven" element={<Navigate to="/finances/breakeven" replace />} />
                <Route path="/financial" element={<Navigate to="/finances" replace />} />

                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/supervision" element={<ProtectedRoute><EntitlementGate feature="premium_access"><SupervisionPage /></EntitlementGate></ProtectedRoute>} />
                <Route path="/diagnostics" element={<ProtectedRoute><DiagnosticsPage /></ProtectedRoute>} />
                <Route path="/plans" element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />
                <Route path="/purchase-success" element={<ProtectedRoute><PurchaseSuccessPage /></ProtectedRoute>} />
                <Route path="/admin/email-preview" element={<ProtectedRoute><AdminEmailPreviewPage /></ProtectedRoute>} />
                <Route path="/admin/booking-requests" element={<ProtectedRoute><AdminBookingRequestsPage /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute><AdminUsersPage /></ProtectedRoute>} />
                <Route path="/admin/domains" element={<ProtectedRoute><AdminDomainsPage /></ProtectedRoute>} />
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
