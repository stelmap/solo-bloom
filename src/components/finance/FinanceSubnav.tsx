import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import { invoiceRegisterCopy } from "@/lib/invoiceRegister";

const ITEMS = [
  { path: "/finances", labelKey: "nav.practiceOverview", end: true },
  { path: "/finances/overview", labelKey: "nav.financialOverview" },
  { path: "/finances/cost-efficiency", labelKey: "nav.costEfficiency" },
  { path: "/finances/registers/invoices", labelKey: "registers" },
  { path: "/finances/settings", labelKey: "nav.financeSettings" },
];

export function FinanceSubnav() {
  const { t, lang } = useLanguage();
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
          {item.labelKey === "registers" ? invoiceRegisterCopy[lang].registers : t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}
