import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Clock, DollarSign, Pencil, Trash2 } from "lucide-react";
import { useServices, useCreateService, useUpdateService, useDeleteService } from "@/hooks/useData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ServicesPage() {
  const { data: services = [], isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", duration_minutes: 60, price: 0 });

  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({ name: s.name, duration_minutes: s.duration_minutes, price: Number(s.price) });
    setOpen(true);
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ name: "", duration_minutes: 60, price: 0 });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    try {
      if (editId) {
        await updateService.mutateAsync({ id: editId, ...form });
        toast({ title: "Service updated" });
      } else {
        await createService.mutateAsync(form);
        toast({ title: "Service added" });
      }
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteService.mutateAsync(deleteId);
      toast({ title: "Service deleted" });
      setDeleteId(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const colors = ["bg-primary/10 border-primary/20", "bg-accent border-accent-foreground/10"];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Services</h1>
            <p className="text-muted-foreground mt-1">Manage your service offerings</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Service</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Edit Service" : "Add Service"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Duration (minutes)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 60 }))} /></div>
                <div className="space-y-2"><Label>Price (€)</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} /></div>
                <Button onClick={handleSubmit} className="w-full" disabled={createService.isPending || updateService.isPending}>
                  {editId ? "Save Changes" : "Add Service"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : services.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No services yet. Add your first service!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service, i) => (
              <div key={service.id} className={`rounded-xl border p-5 animate-fade-in group relative ${colors[i % 2]}`}>
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(service)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(service.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <h3 className="font-semibold text-foreground text-lg mb-3">{service.name}</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-4 w-4" /><span className="text-sm">{service.duration_minutes} min</span></div>
                  <div className="flex items-center gap-1.5 text-foreground font-semibold"><DollarSign className="h-4 w-4" /><span className="text-sm">€{Number(service.price).toFixed(0)}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete service?"
        description="This will permanently delete this service. Existing appointments using this service won't be affected."
        loading={deleteService.isPending}
      />
    </AppLayout>
  );
}
