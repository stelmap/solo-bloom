import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const mockIncome = [
  { id: 1, client: "Maria K.", service: "Deep Tissue Massage", amount: 80, date: "Apr 7, 2026", type: "appointment" as const },
  { id: 2, client: "John D.", service: "Swedish Massage", amount: 60, date: "Apr 7, 2026", type: "appointment" as const },
  { id: 3, client: "—", service: "Product sale", amount: 35, date: "Apr 6, 2026", type: "manual" as const },
  { id: 4, client: "Anna S.", service: "Hot Stone Therapy", amount: 120, date: "Apr 6, 2026", type: "appointment" as const },
  { id: 5, client: "Peter M.", service: "Sports Massage", amount: 85, date: "Apr 5, 2026", type: "appointment" as const },
  { id: 6, client: "Sophie L.", service: "Relaxation Massage", amount: 70, date: "Apr 5, 2026", type: "appointment" as const },
];

export default function IncomePage() {
  const total = mockIncome.reduce((s, i) => s + i.amount, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Income</h1>
            <p className="text-muted-foreground mt-1">Track your earnings</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-1" /> Add Manual Entry
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 animate-fade-in">
          <p className="text-sm text-muted-foreground">This Month</p>
          <p className="text-2xl font-bold text-foreground mt-1">€{total.toLocaleString()}</p>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Client</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Service</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Source</th>
                </tr>
              </thead>
              <tbody>
                {mockIncome.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4 text-sm font-medium text-foreground">{entry.client}</td>
                    <td className="p-4 text-sm text-muted-foreground">{entry.service}</td>
                    <td className="p-4 text-sm font-semibold text-foreground">€{entry.amount}</td>
                    <td className="p-4 text-sm text-muted-foreground">{entry.date}</td>
                    <td className="p-4">
                      <Badge variant={entry.type === "appointment" ? "default" : "secondary"} className="text-xs">
                        {entry.type === "appointment" ? "Appointment" : "Manual"}
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
