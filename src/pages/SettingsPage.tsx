import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useProfile, useUpdateProfile } from "@/hooks/useData";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const [form, setForm] = useState({ full_name: "", business_name: "", phone: "", language: "en", reminder_minutes: 1440 });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        business_name: profile.business_name || "",
        phone: profile.phone || "",
        language: profile.language,
        reminder_minutes: profile.reminder_minutes,
      });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(form);
      toast({ title: "Settings saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-foreground">Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Full Name</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={user?.email || ""} disabled /></div>
            <div className="space-y-2"><Label>Business Name</Label><Input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <Button onClick={handleSave} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <Separator />

        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-foreground">Language</h2>
          <div className="max-w-xs space-y-2">
            <Label>Display Language</Label>
            <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="uk">Українська</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-foreground">Notifications</h2>
          <div className="max-w-xs space-y-2">
            <Label>Reminder Time</Label>
            <Select value={form.reminder_minutes.toString()} onValueChange={v => setForm(f => ({ ...f, reminder_minutes: parseInt(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="60">1 hour before</SelectItem>
                <SelectItem value="180">3 hours before</SelectItem>
                <SelectItem value="1440">24 hours before</SelectItem>
                <SelectItem value="2880">48 hours before</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-foreground">Subscription</h2>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium text-foreground">Pro Plan — €20/month</p>
              <p className="text-sm text-muted-foreground">Stripe integration coming soon</p>
            </div>
            <Button variant="outline">Manage Billing</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
