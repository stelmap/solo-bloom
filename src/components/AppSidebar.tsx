import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Calendar, Users, Scissors, DollarSign,
  TrendingDown, Settings, Target, Menu, X, LogOut, BarChart3, UsersRound, ClipboardList,
  Wallet, ChevronDown, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { TranslationKey } from "@/i18n/translations";
import { useEntitlements, type FeatureCode } from "@/hooks/useEntitlements";

type LeafItem = { kind: "leaf"; icon: any; labelKey: TranslationKey; path: string; requires?: FeatureCode };
type GroupItem = {
  kind: "group";
  icon: any;
  labelKey: TranslationKey;
  basePath: string;
  requires?: FeatureCode;
  children: { icon: any; labelKey: TranslationKey; path: string }[];
};
type NavItem = LeafItem | GroupItem;

const navItems: NavItem[] = [
  { kind: "leaf", icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/dashboard" },
  { kind: "leaf", icon: Calendar, labelKey: "nav.calendar", path: "/calendar" },
  { kind: "leaf", icon: Users, labelKey: "nav.clients", path: "/clients" },
  { kind: "leaf", icon: UsersRound, labelKey: "nav.groups", path: "/groups" },
  { kind: "leaf", icon: Scissors, labelKey: "nav.services", path: "/services" },
  {
    kind: "group",
    icon: Wallet,
    labelKey: "nav.finances",
    basePath: "/finances",
    requires: "financial_access",
    children: [
      { icon: BarChart3, labelKey: "nav.financesDashboard", path: "/finances" },
      { icon: DollarSign, labelKey: "nav.income", path: "/finances/income" },
      { icon: TrendingDown, labelKey: "nav.expenses", path: "/finances/expenses" },
      { icon: Target, labelKey: "nav.breakeven", path: "/finances/breakeven" },
    ],
  },
  { kind: "leaf", icon: ClipboardList, labelKey: "nav.supervision", path: "/supervision", requires: "premium_access" },
  { kind: "leaf", icon: Settings, labelKey: "nav.settings", path: "/settings" },
];

export function AppSidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { has, loading: entLoading } = useEntitlements();

  const visibleNavItems = useMemo(
    () => navItems.filter((it) => !it.requires || has(it.requires)),
    [has]
  );
  const lockedCount = useMemo(
    () => (entLoading ? 0 : navItems.filter((it) => it.requires && !has(it.requires)).length),
    [entLoading, has]
  );

  // Auto-open the Finances group when the user is somewhere inside it
  const inFinances = useMemo(
    () => location.pathname === "/finances" || location.pathname.startsWith("/finances/"),
    [location.pathname]
  );
  const [financesOpen, setFinancesOpen] = useState<boolean>(inFinances);
  // keep open whenever route is inside finances
  const isFinancesOpen = financesOpen || inFinances;

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "U";

  const isExactActive = (path: string) => location.pathname === path;

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-secondary text-secondary-foreground border border-sidebar-border shadow-lg"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-foreground/40 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        "fixed left-0 top-0 z-40 h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200",
        "md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight">
            Solo<span className="text-sidebar-primary">Bizz</span>
          </h1>
          <p className="text-xs text-sidebar-foreground/50 mt-0.5">Business Manager</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            if (item.kind === "leaf") {
              const isActive = isExactActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  {t(item.labelKey)}
                </Link>
              );
            }

            // Group (Finances)
            const groupActive = inFinances;
            return (
              <div key={item.basePath}>
                <button
                  type="button"
                  onClick={() => setFinancesOpen((o) => !o)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    groupActive
                      ? "text-sidebar-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                  aria-expanded={isFinancesOpen}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  <span className="flex-1 text-left">{t(item.labelKey)}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform shrink-0",
                      isFinancesOpen ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>
                {isFinancesOpen && (
                  <div className="mt-1 ml-3 pl-3 border-l border-sidebar-border space-y-0.5">
                    {item.children.map((child) => {
                      const isActive = isExactActive(child.path);
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                          )}
                        >
                          <child.icon className="h-4 w-4 shrink-0" />
                          {t(child.labelKey)}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {lockedCount > 0 && (
            <Link
              to="/plans"
              onClick={() => setMobileOpen(false)}
              className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium border border-dashed border-sidebar-border text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-colors"
              title="Upgrade to unlock more features"
            >
              <Lock className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Unlock more</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-sidebar-primary/15 text-sidebar-primary">
                {lockedCount}
              </span>
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary text-sm font-semibold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.user_metadata?.full_name || user?.email}
              </p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
            </div>
            <button onClick={signOut} className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground" title={t("nav.signOut")}>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
