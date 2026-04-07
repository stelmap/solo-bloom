import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const mockExpenses = [
  { id: 1, category: "Rent", amount: 800, date: "Apr 1, 2026", recurring: true },
  { id: 2, category: "Materials & Oils", amount: 250, date: "Apr 3, 2026", recurring: false },
  { id: 3, category: "Insurance", amount: 150, date: "Apr 1, 2026", recurring: true },
  { id: 4, category: "Equipment", amount: 120, date: "Apr 5, 2026", recurring: false },
  { id: 5, category: "Marketing", amount: 80, date: "Apr 2, 2026", recurring: true },
  { id: 6, category: "Utilities", amount: 100, date: "Apr 1, 2026", recurring: true },
  { id: 7, category: "Laundry", amount: 60, date: "Apr 4, 2026", recurring: true },
  { id: 8, category: "Software", amount: 40, date: "Apr 1, 2026", recurring: true },
];

const totalMonthly = mockExpenses.reduce((sum, e) => sum + e.amount, 0);
const recurringTotal = mockExpenses.filter(e => e.recurring).reduce((sum, e) => sum + e.amount, 0);

export default function ExpensesPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
            <p className="text-muted-foreground mt-1">Track your business costs</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-1" /> Add Expense
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
            <p className="text-sm text-muted-foreground">Total This Month</p>
            <p className="text-2xl font-bold text-foreground mt-1">€{totalMonthly.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
            <p className="text-sm text-muted-foreground">Recurring Monthly</p>
            <p className="text-2xl font-bold text-foreground mt-1">€{recurringTotal.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Category</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                </tr>
              </thead>
              <tbody>
                {mockExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="p-4 text-sm font-medium text-foreground">{expense.category}</td>
                    <td className="p-4 text-sm font-semibold text-foreground">€{expense.amount}</td>
                    <td className="p-4 text-sm text-muted-foreground">{expense.date}</td>
                    <td className="p-4">
                      <Badge variant={expense.recurring ? "default" : "secondary"} className="text-xs">
                        {expense.recurring ? "Recurring" : "One-time"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
