import { Clock } from "lucide-react";

const mockAppointments = [
  { id: 1, client: "Maria K.", service: "Deep Tissue Massage", time: "09:00", duration: "60 min", price: 80 },
  { id: 2, client: "John D.", service: "Swedish Massage", time: "11:00", duration: "45 min", price: 60 },
  { id: 3, client: "Anna S.", service: "Hot Stone Therapy", time: "14:00", duration: "90 min", price: 120 },
  { id: 4, client: "Peter M.", service: "Sports Massage", time: "16:30", duration: "60 min", price: 85 },
];

export function UpcomingAppointments() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
            <Clock className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Today's Appointments</h3>
            <p className="text-sm text-muted-foreground">{mockAppointments.length} sessions scheduled</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {mockAppointments.map((apt) => (
          <div
            key={apt.id}
            className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="text-center min-w-[50px]">
              <p className="text-sm font-semibold text-foreground">{apt.time}</p>
              <p className="text-xs text-muted-foreground">{apt.duration}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{apt.client}</p>
              <p className="text-xs text-muted-foreground truncate">{apt.service}</p>
            </div>
            <span className="text-sm font-semibold text-foreground">€{apt.price}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
