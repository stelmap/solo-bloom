import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { useAppointments, useCreateAppointment, useClients, useServices } from "@/hooks/useData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const hours = Array.from({ length: 11 }, (_, i) => i + 8);

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: appointments = [] } = useAppointments();
  const { data: clients = [] } = useClients();
  const { data: services = [] } = useServices();
  const createAppointment = useCreateAppointment();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_id: "", service_id: "", date: "", time: "09:00", notes: "" });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleCreate = async () => {
    if (!form.client_id || !form.service_id || !form.date) return;
    const service = services.find(s => s.id === form.service_id);
    try {
      await createAppointment.mutateAsync({
        client_id: form.client_id,
        service_id: form.service_id,
        scheduled_at: `${form.date}T${form.time}:00`,
        duration_minutes: service?.duration_minutes ?? 60,
        price: Number(service?.price ?? 0),
        notes: form.notes || undefined,
      });
      setForm({ client_id: "", service_id: "", date: "", time: "09:00", notes: "" });
      setOpen(false);
      toast({ title: "Appointment created" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const getEventsForDayHour = (day: Date, hour: number) => {
    return appointments.filter(apt => {
      const d = new Date(apt.scheduled_at);
      return isSameDay(d, day) && d.getHours() === hour;
    });
  };

  const colors = [
    "bg-primary/15 border-primary/30 text-primary",
    "bg-accent border-accent-foreground/20 text-accent-foreground",
  ];

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
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(d => addDays(d, -7))}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium px-3 text-foreground">
                {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(d => addDays(d, 7))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> New Appointment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Appointment</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Client *</Label>
                    <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Service *</Label>
                    <Select value={form.service_id} onValueChange={v => setForm(f => ({ ...f, service_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                      <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — €{Number(s.price).toFixed(0)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>Time *</Label><Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                  <Button onClick={handleCreate} className="w-full" disabled={createAppointment.isPending}>
                    {createAppointment.isPending ? "Creating..." : "Create Appointment"}
                  </Button>
                  {clients.length === 0 && <p className="text-xs text-muted-foreground text-center">Add clients first in the Clients page</p>}
                  {services.length === 0 && <p className="text-xs text-muted-foreground text-center">Add services first in the Services page</p>}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden animate-fade-in">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
            <div className="p-3" />
            {days.map((day, i) => (
              <div key={i} className={`p-3 text-center border-l border-border ${isSameDay(day, new Date()) ? "bg-accent" : ""}`}>
                <p className="text-xs text-muted-foreground">{format(day, "EEE")}</p>
                <p className={`text-lg font-semibold ${isSameDay(day, new Date()) ? "text-accent-foreground" : "text-foreground"}`}>{format(day, "d")}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[60px_repeat(7,1fr)] max-h-[600px] overflow-y-auto">
            {hours.map((hour) => (
              <div key={hour} className="contents">
                <div className="p-2 text-right pr-3 border-b border-border">
                  <span className="text-xs text-muted-foreground">{hour.toString().padStart(2, "0")}:00</span>
                </div>
                {days.map((day, dayIdx) => {
                  const events = getEventsForDayHour(day, hour);
                  return (
                    <div key={dayIdx} className="relative border-l border-b border-border min-h-[60px] hover:bg-muted/30 transition-colors cursor-pointer">
                      {events.map((evt, ei) => (
                        <div key={evt.id} className={`absolute inset-x-1 top-1 rounded-md border p-2 ${colors[ei % 2]}`}
                          style={{ height: `${(evt.duration_minutes / 60) * 60 - 8}px` }}>
                          <p className="text-xs font-semibold truncate">{(evt as any).clients?.name}</p>
                          <p className="text-xs opacity-70 truncate">{(evt as any).services?.name}</p>
                        </div>
                      ))}
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
