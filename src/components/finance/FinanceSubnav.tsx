import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";

const ITEMS = [
  { path: "/finances", labelKey: "nav.practiceOverview", end: true },
  { path: "/finances/overview", labelKey: "nav.financialOverview" },
  { path: "/finances/income", labelKey: "nav.income" },
  { path: "/finances/expenses", labelKey: "nav.expenses" },
  { path: "/finances/breakeven", labelKey: "nav.breakeven" },
  { path: "/finances/payment-audit", labelKey: "nav.paymentAudit" },
  { path: "/finances/settings", labelKey: "nav.financeSettings" },
];

export function FinanceSubnav() {
  const { t } = useLanguage();
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1">
      {ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )
          }
        >
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}
