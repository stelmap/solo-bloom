import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Calendar, Users, Scissors, DollarSign,
  TrendingDown, TrendingUp, Settings, Target, Menu, X, LogOut, BarChart3, UsersRound, ClipboardList,
  Wallet, ChevronDown, Lock, ShieldCheck, Sparkles, BadgeCheck, PanelLeftOpen, PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { TranslationKey } from "@/i18n/translations";
import { useEntitlements, type FeatureCode } from "@/hooks/useEntitlements";
import { useFreeStarterMode } from "@/hooks/useDemoWorkspace";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePracticeProfileStatus } from "@/hooks/usePracticeProfile";
import { useProfile } from "@/hooks/useData";

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
    children: [
      { icon: BarChart3, labelKey: "nav.practiceOverview", path: "/finances" },
      { icon: TrendingUp, labelKey: "nav.financialOverview", path: "/finances/overview" },
      { icon: DollarSign, labelKey: "nav.income", path: "/finances/income" },
      { icon: TrendingDown, labelKey: "nav.expenses", path: "/finances/expenses" },
      { icon: ShieldCheck, labelKey: "nav.paymentAudit", path: "/finances/payment-audit" },
      { icon: Target, labelKey: "nav.breakeven", path: "/finances/breakeven" },
      { icon: Settings, labelKey: "nav.financeSettings", path: "/finances/settings" },
    ],
  },
  { kind: "leaf", icon: ClipboardList, labelKey: "nav.supervision", path: "/supervision" },
  { kind: "leaf", icon: Settings, labelKey: "nav.settings", path: "/settings" },
];

const railItemBase =
  "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-0";

export function AppSidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { user, signOut, subscription } = useAuth();
  const { t } = useLanguage();
  const isTrial = !subscription.loading && subscription.on_trial && !subscription.subscribed;
  const { isFreeStarter, planCode } = useFreeStarterMode();
  const { has, loading: entLoading } = useEntitlements();
  const [isAdmin, setIsAdmin] = useState(false);
  const { data: practiceProfile } = useProfile();
  const practiceStatus = usePracticeProfileStatus();
  const emblemUrl = (practiceProfile as any)?.avatar_url as string | undefined;
  const practiceName =
    ((practiceProfile as any)?.business_name as string) ||
    ((practiceProfile as any)?.full_name as string) ||
    "";
  const practiceIncomplete = !practiceStatus.loading && !practiceStatus.complete;

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => setIsAdmin(data === true));
  }, [user]);

  // Escape closes the expanded overlay / mobile drawer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setExpanded(false); setMobileOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visibleNavItems = useMemo(
    () => navItems.filter((it) => !it.requires || has(it.requires) || isFreeStarter),
    [has, isFreeStarter]
  );
  const lockedCount = useMemo(
    () => (entLoading || isFreeStarter ? 0 : navItems.filter((it) => it.requires && !has(it.requires)).length),
    [entLoading, has, isFreeStarter]
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const isGroupActive = (basePath: string) =>
    location.pathname === basePath || location.pathname.startsWith(basePath + "/");
  const isGroupOpen = (basePath: string) => openGroups[basePath] ?? isGroupActive(basePath);
  const toggleGroup = (basePath: string) =>
    setOpenGroups((m) => ({ ...m, [basePath]: !isGroupOpen(basePath) }));

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "U";

  const isExactActive = (path: string) => location.pathname === path;

  const adminItems = useMemo(() => {
    if (!isAdmin) return [] as { icon: any; label: string; path: string }[];
    const items = [
      { icon: ShieldCheck, label: "Booking requests", path: "/admin/booking-requests" },
      { icon: ShieldCheck, label: "Users", path: "/admin/users" },
    ];
    if (user?.email?.toLowerCase() === "o.gilevich@gmail.com") {
      items.push(
        { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
        { icon: ShieldCheck, label: "Automated tests", path: "/admin/tests" },
      );
    }
    return items;
  }, [isAdmin, user?.email]);

  const planLabel =
    planCode === "pro" ? "Pro Practice"
      : planCode === "solo" ? "Solo Practice"
        : isTrial ? "Trial" : "Free Starter";
  const PlanIcon = planCode === "pro" || planCode === "solo" || isTrial ? BadgeCheck : Sparkles;

  const closeAll = () => { setExpanded(false); setMobileOpen(false); };

  /* ---------------- collapsed rail (icons only) ---------------- */
  const RailButton = ({
    icon: Icon, label, active, to, onClick,
  }: { icon: any; label: string; active: boolean; to?: string; onClick?: () => void }) => {
    const classes = cn(
      railItemBase,
      "h-11 w-11 justify-center",
      active
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
    );
    const inner = <Icon className="h-5 w-5 shrink-0" />;
    return (
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          {to ? (
            <Link to={to} aria-label={label} className={classes} onClick={closeAll}>{inner}</Link>
          ) : (
            <button type="button" aria-label={label} className={classes} onClick={onClick}>{inner}</button>
          )}
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  };

  /* ---------------- full nav (labels) ---------------- */
  const FullNav = () => (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {visibleNavItems.map((item) => {
        if (item.kind === "leaf") {
          const isActive = isExactActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeAll}
              className={cn(
                railItemBase, "px-3 py-2.5 min-h-11",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              <span className="flex-1 truncate">{t(item.labelKey)}</span>
            </Link>
          );
        }
        const groupActive = isGroupActive(item.basePath);
        const groupOpen = isGroupOpen(item.basePath);
        return (
          <div key={item.basePath}>
            <button
              type="button"
              onClick={() => toggleGroup(item.basePath)}
              className={cn(
                railItemBase, "w-full px-3 py-2.5 min-h-11",
                groupActive ? "text-sidebar-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
              aria-expanded={groupOpen}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              <span className="flex-1 text-left">{t(item.labelKey)}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform shrink-0", groupOpen ? "rotate-0" : "-rotate-90")} />
            </button>
            {groupOpen && (
              <div className="mt-1 ml-3 pl-3 border-l border-sidebar-border space-y-0.5">
                {item.children.map((child) => {
                  const isActive = isExactActive(child.path);
                  return (
                    <Link
                      key={child.path}
                      to={child.path}
                      onClick={closeAll}
                      className={cn(
                        railItemBase, "gap-2.5 px-3 py-2 rounded-md",
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
          onClick={closeAll}
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

      {adminItems.length > 0 && (
        <div className="mt-3 space-y-1">
          {adminItems.map((it) => (
            <Link
              key={it.path}
              to={it.path}
              onClick={closeAll}
              className={cn(
                railItemBase, "px-3 py-2.5 min-h-11",
                isExactActive(it.path)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <it.icon className="h-4.5 w-4.5 shrink-0" />
              <span className="flex-1 truncate">{it.label}</span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  );

  // Setup completion percentage derived from the practice profile required fields.
  const requiredTotal = 7;
  const setupPercent = practiceStatus.loading
    ? 0
    : practiceStatus.complete
      ? 100
      : Math.max(0, Math.min(100, Math.round(((requiredTotal - practiceStatus.missing.length) / requiredTotal) * 100)));

  const emblemLabel = practiceIncomplete
    ? t("sidebar.finishSetup")
    : user?.user_metadata?.full_name || user?.email || t("sidebar.account");

  /** Avatar with an orange progress ring when the practice setup is incomplete. */
  const ProfileAvatar = ({ size = 44 }: { size?: number }) => {
    const stroke = 2.5;
    const r = size / 2 - stroke / 2;
    const c = 2 * Math.PI * r;
    const inner = size - stroke * 2 - 2;
    return (
      <span className="relative shrink-0 flex items-center justify-center" style={{ height: size, width: size }}>
        {practiceIncomplete && (
          <svg className="absolute inset-0 -rotate-90" width={size} height={size} aria-hidden="true">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-sidebar-primary/20" />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              className="stroke-sidebar-primary transition-[stroke-dashoffset] duration-500"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - setupPercent / 100)}
            />
          </svg>
        )}
        <span
          className={cn(
            "rounded-full overflow-hidden flex items-center justify-center font-semibold",
            practiceIncomplete
              ? "bg-sidebar-primary/15 text-sidebar-primary"
              : "bg-sidebar-primary/20 text-sidebar-primary ring-1 ring-sidebar-border",
          )}
          style={{ height: inner, width: inner, fontSize: Math.max(11, Math.round(inner * 0.36)) }}
        >
          {emblemUrl ? (
            <img src={emblemUrl} alt={practiceName || "Profile"} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
      </span>
    );
  };

  const FullFooter = () => (
    <div className="p-4 border-t border-sidebar-border">
      <div className="flex items-center gap-3">
        <Link
          to="/settings/practice"
          onClick={closeAll}
          aria-label={practiceIncomplete ? t("sidebar.setupProgress", { p: setupPercent }) : emblemLabel}
          className="flex items-center gap-3 flex-1 min-w-0 rounded-lg px-1 py-1.5 -mx-1 hover:bg-sidebar-accent/50 transition-colors"
        >
          <ProfileAvatar size={44} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.user_metadata?.full_name || practiceName || user?.email}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
            {practiceIncomplete && (
              <p className="text-xs text-sidebar-primary flex items-center gap-1.5 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary inline-block shrink-0" />
                {t("sidebar.finishSetup")}
              </p>
            )}
          </div>
        </Link>
        <button
          onClick={signOut}
          aria-label={t("nav.signOut")}
          className="p-2 rounded-md hover:bg-sidebar-accent transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground shrink-0"
          title={t("nav.signOut")}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );


  const FullHeader = ({ onClose }: { onClose: () => void }) => (
    <div className="p-4 border-b border-sidebar-border">
      <div className="flex items-center gap-2">
        <div className="text-xl font-bold text-sidebar-foreground tracking-tight flex-1">
          Solo<span className="text-sidebar-primary">Bizz</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Collapse menu"
          className="h-11 w-11 -mr-2 flex items-center justify-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>
      </div>
      <p className="text-xs text-sidebar-foreground/50 mt-0.5">Business Manager</p>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-sidebar-primary/25 bg-sidebar-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-sidebar-primary">
        <PlanIcon className="h-3.5 w-3.5" />
        <span>{planLabel}</span>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-secondary text-secondary-foreground border border-sidebar-border shadow-lg"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Persistent Settings entry — always reachable, never only inside the menu */}
      <Link
        to="/settings"
        onClick={() => setMobileOpen(false)}
        className="fixed top-4 left-16 z-50 lg:hidden p-2 rounded-lg bg-secondary text-secondary-foreground border border-sidebar-border shadow-lg"
        aria-label="Settings"
        title="Settings"
      >
        <Settings className="h-5 w-5" />
      </Link>



      {/* Collapsed icon rail (desktop / tablet) */}
      <aside
        className="fixed left-0 top-0 z-30 h-full w-[68px] bg-sidebar border-r border-sidebar-border hidden lg:flex flex-col items-center py-4"
        aria-label="Main navigation"
      >
        <div className="h-9 w-9 rounded-lg bg-sidebar-primary/15 flex items-center justify-center text-sidebar-primary font-bold text-sm">
          SB
        </div>
        <div className="mt-3">
          <RailButton
            icon={PanelLeftOpen}
            label="Expand menu"
            active={false}
            onClick={() => setExpanded(true)}
          />
        </div>

        <nav className="flex-1 mt-3 flex flex-col items-center gap-1 overflow-y-auto invisible-scrollbar w-full">
          {visibleNavItems.map((item) =>
            item.kind === "leaf" ? (
              <RailButton
                key={item.path}
                icon={item.icon}
                label={t(item.labelKey)}
                active={isExactActive(item.path)}
                to={item.path}
              />
            ) : (
              <RailButton
                key={item.basePath}
                icon={item.icon}
                label={t(item.labelKey)}
                active={isGroupActive(item.basePath)}
                onClick={() => {
                  setOpenGroups((m) => ({ ...m, [item.basePath]: true }));
                  setExpanded(true);
                }}
              />
            )
          )}
          {lockedCount > 0 && (
            <RailButton icon={Lock} label="Unlock more" active={false} to="/plans" />
          )}
          {adminItems.map((it) => (
            <RailButton key={it.path} icon={it.icon} label={it.label} active={isExactActive(it.path)} to={it.path} />
          ))}
        </nav>

        <div className="mt-2 flex flex-col items-center gap-1">
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <Link
                to="/settings/practice"
                onClick={closeAll}
                aria-label={emblemLabel}
                className="h-11 w-11 flex items-center justify-center rounded-lg hover:bg-sidebar-accent/50 transition-colors"
              >
                <ProfileAvatar size={34} />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              {practiceIncomplete
                ? `${t("sidebar.finishSetup")} · ${setupPercent}%`
                : user?.user_metadata?.full_name || user?.email}
            </TooltipContent>
          </Tooltip>

          <RailButton icon={LogOut} label={t("nav.signOut")} active={false} onClick={signOut} />
        </div>
      </aside>

      {/* Overlay backdrop for expanded desktop menu / mobile drawer */}
      {(expanded || mobileOpen) && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
          onClick={closeAll}
          aria-hidden="true"
        />
      )}

      {/* Expanded overlay panel (desktop/tablet) */}
      <aside
        ref={panelRef}
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-[216px] bg-sidebar border-r border-sidebar-border shadow-2xl hidden lg:flex flex-col transition-transform duration-200 ease-out",
          expanded ? "translate-x-0" : "-translate-x-full pointer-events-none"
        )}
        aria-hidden={!expanded}
      >
        <FullHeader onClose={() => setExpanded(false)} />
        <FullNav />
        <FullFooter />
      </aside>

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar-border shadow-2xl flex flex-col lg:hidden transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!mobileOpen}
      >
        <FullHeader onClose={() => setMobileOpen(false)} />
        <FullNav />
        <FullFooter />
      </aside>
    </TooltipProvider>
  );
}
