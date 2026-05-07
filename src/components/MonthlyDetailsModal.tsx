import { useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type IncomeItem = {
  description: string;
  amount: number;
  date: string;
  type: "confirmed" | "expected";
};
type ExpenseItem = {
  description: string;
  amount: number;
  date: string;
  category?: string;
  isRecurring?: boolean;
};
type TaxLine = { id: string; label: string; amount: number; isForecast?: boolean };

interface MonthlyData {
  label: string;
  month: number;
  isFuture: boolean;
  income: number;
  confirmedIncome: number;
  expectedIncome: number;
  expenses: number;
  taxes: number;
  net: number;
  incomeItems: IncomeItem[];
  expenseItems: ExpenseItem[];
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  data: MonthlyData | null;
  year: number;
  taxLines: TaxLine[];
  fmt: (n: number) => string;
  t: (k: string) => string;
}

const PAGE = 10;

export function MonthlyDetailsModal({ open, onOpenChange, data, year, taxLines, fmt, t }: Props) {
  const [openIncome, setOpenIncome] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);
  const [showAllIncome, setShowAllIncome] = useState(false);
  const [showAllExpense, setShowAllExpense] = useState(false);
  const [incomeQ, setIncomeQ] = useState("");
  const [expenseQ, setExpenseQ] = useState("");

  const filteredIncome = useMemo(() => {
    if (!data) return [];
    const q = incomeQ.trim().toLowerCase();
    return q
      ? data.incomeItems.filter(i =>
          i.description.toLowerCase().includes(q) ||
          i.type.toLowerCase().includes(q) ||
          i.date.toLowerCase().includes(q)
        )
      : data.incomeItems;
  }, [data, incomeQ]);

  const filteredExpense = useMemo(() => {
    if (!data) return [];
    const q = expenseQ.trim().toLowerCase();
    return q
      ? data.expenseItems.filter(e =>
          e.description.toLowerCase().includes(q) ||
          (e.category || "").toLowerCase().includes(q) ||
          e.date.toLowerCase().includes(q)
        )
      : data.expenseItems;
  }, [data, expenseQ]);

  const incomeByDate = useMemo(() => {
    const map = new Map<string, IncomeItem[]>();
    for (const it of filteredIncome) {
      const arr = map.get(it.date) || [];
      arr.push(it);
      map.set(it.date, arr);
    }
    return Array.from(map.entries());
  }, [filteredIncome]);

  const visibleIncomeGroups = useMemo(() => {
    if (showAllIncome) return incomeByDate;
    let count = 0;
    const out: typeof incomeByDate = [];
    for (const [date, items] of incomeByDate) {
      if (count >= PAGE) break;
      const remaining = PAGE - count;
      out.push([date, items.slice(0, remaining)]);
      count += Math.min(items.length, remaining);
    }
    return out;
  }, [incomeByDate, showAllIncome]);

  const expenseGroups = useMemo(() => {
    const recurring = filteredExpense.filter(e => e.isRecurring);
    const oneTime = filteredExpense.filter(e => !e.isRecurring);
    return { recurring, oneTime };
  }, [filteredExpense]);

  const visibleExpense = useMemo(() => {
    if (showAllExpense) return { recurring: expenseGroups.recurring, oneTime: expenseGroups.oneTime };
    const r = expenseGroups.recurring.slice(0, PAGE);
    const remaining = Math.max(0, PAGE - r.length);
    const o = expenseGroups.oneTime.slice(0, remaining);
    return { recurring: r, oneTime: o };
  }, [expenseGroups, showAllExpense]);

  if (!data) return null;

  const totalIncomeRecords = data.incomeItems.length;
  const totalExpenseRecords = data.expenseItems.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-[900px] w-[95vw] sm:w-[90vw] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-5 sm:px-6 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold text-foreground">
              {data.label} {year}
            </h2>
            {data.isFuture && (
              <Badge variant="outline" className="border-dashed text-xs">
                {t("financial.forecast")}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <SummaryPill label={t("financial.income")} value={fmt(data.income)} accent="text-success" bg="bg-success/10" />
            <SummaryPill label={t("financial.expenses")} value={fmt(data.expenses)} accent="text-destructive" bg="bg-destructive/10" />
            <SummaryPill label={t("financial.taxes")} value={fmt(data.taxes)} accent="text-warning" bg="bg-warning/10" />
            <SummaryPill
              label={t("financial.netResult")}
              value={`${data.net < 0 ? "-" : ""}${fmt(data.net)}`}
              accent={data.net >= 0 ? "text-success" : "text-destructive"}
              bg={data.net >= 0 ? "bg-success/10" : "bg-destructive/10"}
            />
          </div>
        </div>

        {/* Single scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5">
          {/* Confirmed / expected breakdown */}
          {(data.confirmedIncome > 0 || data.expectedIncome > 0) && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{t("financial.confirmed")}</p>
                <p className="text-success font-semibold">{fmt(data.confirmedIncome)}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{t("financial.expected")}</p>
                <p className="text-primary font-semibold">{fmt(data.expectedIncome)}</p>
              </div>
            </div>
          )}

          {/* Tax breakdown */}
          {taxLines.length > 0 && data.taxes > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{t("financial.taxBreakdown")}</h3>
              <div className="rounded-lg border border-border divide-y divide-border">
                {taxLines.map(line => (
                  <div key={line.id} className="flex justify-between items-center px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground">{line.label}</span>
                      {line.isForecast && (
                        <Badge variant="outline" className="border-dashed text-[10px]">
                          {t("financial.forecast")}
                        </Badge>
                      )}
                    </div>
                    <span className="text-warning font-medium">{fmt(line.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center px-3 py-2 text-sm bg-muted/30">
                  <span className="font-medium text-foreground">{t("financial.taxes")}</span>
                  <span className="text-warning font-semibold">{fmt(data.taxes)}</span>
                </div>
              </div>
            </section>
          )}

          {/* Income details */}
          {totalIncomeRecords > 0 && (
            <Collapsible open={openIncome} onOpenChange={setOpenIncome}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {openIncome ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <ArrowUpRight className="h-4 w-4 text-success" />
                    {t("financial.incomeDetails")}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{totalIncomeRecords} {t("financial.records") || "records"}</span>
                    <span className="text-success font-semibold">{fmt(data.income)}</span>
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                {totalIncomeRecords > 20 && (
                  <SearchBox value={incomeQ} onChange={setIncomeQ} placeholder={t("common.search") || "Search"} />
                )}
                <div className="space-y-3">
                  {visibleIncomeGroups.map(([date, items]) => (
                    <div key={date} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{date}</p>
                      <div className="space-y-1">
                        {items.map((item, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex justify-between items-center text-sm rounded-md px-3 py-2",
                              item.type === "expected"
                                ? "bg-primary/5 border border-dashed border-primary/20"
                                : "bg-muted/40"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-foreground truncate">{item.description}</span>
                              {item.type === "expected" && (
                                <Badge variant="outline" className="text-[9px] border-dashed shrink-0">
                                  {t("financial.expected")}
                                </Badge>
                              )}
                            </div>
                            <span
                              className={cn(
                                "font-medium shrink-0 ml-2",
                                item.type === "expected" ? "text-primary" : "text-success"
                              )}
                            >
                              {fmt(item.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {!showAllIncome && filteredIncome.length > PAGE && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAllIncome(true)}>
                    {(t("financial.showAllIncome") || "Show all {n} income records").replace("{n}", String(filteredIncome.length))}
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Expense details */}
          {totalExpenseRecords > 0 && (
            <Collapsible open={openExpense} onOpenChange={setOpenExpense}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {openExpense ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <ArrowDownRight className="h-4 w-4 text-destructive" />
                    {t("financial.expenseDetails")}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{totalExpenseRecords} {t("financial.records") || "records"}</span>
                    <span className="text-destructive font-semibold">{fmt(data.expenses)}</span>
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                {totalExpenseRecords > 20 && (
                  <SearchBox value={expenseQ} onChange={setExpenseQ} placeholder={t("common.search") || "Search"} />
                )}
                {visibleExpense.recurring.length > 0 && (
                  <ExpenseGroup title={t("financial.recurringExpenses") || "Recurring Expenses"} items={visibleExpense.recurring} fmt={fmt} />
                )}
                {visibleExpense.oneTime.length > 0 && (
                  <ExpenseGroup title={t("financial.oneTimeExpenses") || "One-time Expenses"} items={visibleExpense.oneTime} fmt={fmt} />
                )}
                {!showAllExpense && filteredExpense.length > PAGE && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAllExpense(true)}>
                    {(t("financial.showAllExpenses") || "Show all {n} expense records").replace("{n}", String(filteredExpense.length))}
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {totalIncomeRecords === 0 && totalExpenseRecords === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">{t("financial.noData")}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryPill({ label, value, accent, bg }: { label: string; value: string; accent: string; bg: string }) {
  return (
    <div className={cn("rounded-lg px-3 py-2", bg)}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("font-bold text-base leading-tight", accent)}>{value}</p>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (s: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8 h-8 text-sm"
      />
    </div>
  );
}

function ExpenseGroup({ title, items, fmt }: { title: string; items: ExpenseItem[]; fmt: (n: number) => string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between items-center text-sm bg-muted/40 rounded-md px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-foreground truncate">{item.description}</span>
              {item.date && item.date !== "—" && (
                <span className="text-xs text-muted-foreground shrink-0">{item.date}</span>
              )}
            </div>
            <span className="text-destructive font-medium shrink-0 ml-2">{fmt(item.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
