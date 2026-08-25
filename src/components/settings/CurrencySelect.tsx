import { useProfile, useUpdateProfile } from "@/hooks/useData";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for the practice currency (profiles.currency).
 *
 * Rendered in both Practice Profile → Regional settings and Finance settings.
 * The value is always read straight from the profile (never mirrored into local
 * form state) and a change is persisted immediately, so the two sections can
 * never display or use different currencies.
 */
export const CURRENCY_OPTIONS = [
  { code: "EUR", label: "EUR — €" },
  { code: "UAH", label: "UAH — ₴" },
  { code: "PLN", label: "PLN — zł" },
  { code: "USD", label: "USD — $" },
] as const;

interface Props {
  label: string;
  savedLabel?: string;
  className?: string;
}

export function CurrencySelect({ label, savedLabel, className }: Props) {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const qc = useQueryClient();

  const value = ((profile as any)?.currency as string) || "EUR";

  const handleChange = async (next: string) => {
    if (next === value) return;
    try {
      await updateProfile.mutateAsync({ currency: next });
      // Refresh anything that renders money labels with the shared currency.
      ["profile", "dashboard-stats", "income", "income-all", "income-sum", "client-income", "expenses", "invoices", "breakeven-goals"].forEach(
        (k) => qc.invalidateQueries({ queryKey: [k] }),
      );
      if (savedLabel) toast({ title: savedLabel });
    } catch (e: any) {
      toast({ title: e?.message ?? "Error", variant: "destructive" });
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="font-semibold text-sm">{label}</Label>
      <Select value={value} onValueChange={handleChange} disabled={!profile || updateProfile.isPending}>
        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
        <SelectContent>
          {CURRENCY_OPTIONS.map((c) => (
            <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
