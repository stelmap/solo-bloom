import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";

const mockEvents = [
  { id: 1, day: 0, startHour: 9, duration: 1, client: "Maria K.", service: "Deep Tissue", color: "bg-primary/15 border-primary/30 text-primary" },
  { id: 2, day: 0, startHour: 11, duration: 0.75, client: "John D.", service: "Swedish", color: "bg-accent border-accent-foreground/20 text-accent-foreground" },
  { id: 3, day: 1, startHour: 10, duration: 1.5, client: "Anna S.", service: "Hot Stone", color: "bg-primary/15 border-primary/30 text-primary" },
  { id: 4, day: 2, startHour: 14, duration: 1, client: "Peter M.", service: "Sports", color: "bg-accent border-accent-foreground/20 text-accent-foreground" },
  { id: 5, day: 3, startHour: 9, duration: 1, client: "Sophie L.", service: "Relaxation", color: "bg-primary/15 border-primary/30 text-primary" },
  { id: 6, day: 4, startHour: 13, duration: 1, client: "David R.", service: "Deep Tissue", color: "bg-accent border-accent-foreground/20 text-accent-foreground" },
];

const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8 AM to 6 PM

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
            <p className="text-muted-foreground mt-1">Manage your appointments</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(d => addDays(d, -7))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-3 text-foreground">
                {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(d => addDays(d, 7))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-1" /> New Appointment
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
            <div className="p-3" />
            {days.map((day, i) => (
              <div
                key={i}
                className={`p-3 text-center border-l border-border ${
                  isSameDay(day, new Date()) ? "bg-accent" : ""
                }`}
              >
                <p className="text-xs text-muted-foreground">{format(day, "EEE")}</p>
                <p className={`text-lg font-semibold ${
                  isSameDay(day, new Date()) ? "text-accent-foreground" : "text-foreground"
                }`}>
                  {format(day, "d")}
                </p>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] max-h-[600px] overflow-y-auto">
            {hours.map((hour) => (
              <div key={hour} className="contents">
                <div className="p-2 text-right pr-3 border-b border-border">
                  <span className="text-xs text-muted-foreground">
                    {hour.toString().padStart(2, "0")}:00
                  </span>
                </div>
                {days.map((_, dayIdx) => {
                  const event = mockEvents.find(
                    (e) => e.day === dayIdx && e.startHour === hour
                  );
                  return (
                    <div
                      key={dayIdx}
                      className="relative border-l border-b border-border min-h-[60px] hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      {event && (
                        <div
                          className={`absolute inset-x-1 top-1 rounded-md border p-2 ${event.color}`}
                          style={{ height: `${event.duration * 60 - 8}px` }}
                        >
                          <p className="text-xs font-semibold truncate">{event.client}</p>
                          <p className="text-xs opacity-70 truncate">{event.service}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
