import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>

        {/* Profile */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-foreground">Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input placeholder="Your name" defaultValue="Solo Professional" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="email@example.com" defaultValue="user@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input placeholder="Your business name" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="+380..." />
            </div>
          </div>
          <Button>Save Changes</Button>
        </div>

        <Separator />

        {/* Language */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-foreground">Language</h2>
          <div className="max-w-xs space-y-2">
            <Label>Display Language</Label>
            <Select defaultValue="en">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="uk">Українська</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Notifications */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-foreground">Notifications</h2>
          <div className="max-w-xs space-y-2">
            <Label>Reminder Time</Label>
            <Select defaultValue="24h">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 hour before</SelectItem>
                <SelectItem value="3h">3 hours before</SelectItem>
                <SelectItem value="24h">24 hours before</SelectItem>
                <SelectItem value="48h">48 hours before</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Subscription */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4 animate-fade-in">
          <h2 className="font-semibold text-foreground">Subscription</h2>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="font-medium text-foreground">Pro Plan — €20/month</p>
              <p className="text-sm text-muted-foreground">Next billing: May 7, 2026</p>
            </div>
            <Button variant="outline">Manage Billing</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
