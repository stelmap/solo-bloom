import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Clock, DollarSign } from "lucide-react";

const mockServices = [
  { id: 1, name: "Deep Tissue Massage", duration: 60, price: 80, color: "bg-primary/10 border-primary/20" },
  { id: 2, name: "Swedish Massage", duration: 45, price: 60, color: "bg-accent border-accent-foreground/10" },
  { id: 3, name: "Hot Stone Therapy", duration: 90, price: 120, color: "bg-primary/10 border-primary/20" },
  { id: 4, name: "Sports Massage", duration: 60, price: 85, color: "bg-accent border-accent-foreground/10" },
  { id: 5, name: "Relaxation Massage", duration: 60, price: 70, color: "bg-primary/10 border-primary/20" },
  { id: 6, name: "Head & Shoulders", duration: 30, price: 40, color: "bg-accent border-accent-foreground/10" },
];

export default function ServicesPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Services</h1>
            <p className="text-muted-foreground mt-1">Manage your service offerings</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-1" /> Add Service
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockServices.map((service) => (
            <div
              key={service.id}
              className={`rounded-xl border p-5 hover:shadow-md transition-shadow cursor-pointer animate-fade-in ${service.color}`}
            >
              <h3 className="font-semibold text-foreground text-lg mb-3">{service.name}</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">{service.duration} min</span>
                </div>
                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">€{service.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
