import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Phone, Mail } from "lucide-react";
import { useState } from "react";

const mockClients = [
  { id: 1, name: "Maria Kovalenko", phone: "+380 67 123 4567", email: "maria@email.com", visits: 12, lastVisit: "Apr 5, 2026", notes: "Prefers deep pressure" },
  { id: 2, name: "John Davidson", phone: "+380 50 987 6543", email: "john@email.com", visits: 8, lastVisit: "Apr 3, 2026", notes: "Lower back issues" },
  { id: 3, name: "Anna Shevchenko", phone: "+380 63 555 7890", email: "", visits: 5, lastVisit: "Mar 28, 2026", notes: "Allergic to lavender oil" },
  { id: 4, name: "Peter Miller", phone: "+380 95 222 3344", email: "peter@email.com", visits: 15, lastVisit: "Apr 6, 2026", notes: "" },
  { id: 5, name: "Sophie Laurent", phone: "+380 73 111 2233", email: "sophie@email.com", visits: 3, lastVisit: "Apr 1, 2026", notes: "New client, prefers morning slots" },
  { id: 6, name: "David Rodriguez", phone: "+380 68 444 5566", email: "", visits: 20, lastVisit: "Apr 7, 2026", notes: "Regular weekly client" },
];

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const filtered = mockClients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clients</h1>
            <p className="text-muted-foreground mt-1">{mockClients.length} total clients</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-1" /> Add Client
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <div
              key={client.id}
              className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow cursor-pointer animate-fade-in"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {client.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
                  <p className="text-xs text-muted-foreground">{client.visits} visits · Last: {client.lastVisit}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span className="truncate">{client.phone}</span>
                </div>
                {client.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
              </div>

              {client.notes && (
                <p className="mt-3 text-xs text-muted-foreground bg-muted/50 rounded-md p-2 line-clamp-2">
                  📝 {client.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
