import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCampaigns, useClientSources } from "@/hooks/useClientSources";
import { useClients } from "@/hooks/useData";
import { useSourceCopy } from "@/lib/clientSourcesCopy";
import { SourceDialog } from "./SourceDialogs";

export interface SourceValue {
  source_id: string | null;
  campaign_id: string | null;
  referred_by_client_id?: string | null;
  referred_by_name?: string | null;
}

const NONE = "__none__";

/**
 * Optional acquisition fields. `withReferral` shows "Who referred?" for
 * referral-type sources (client form); expenses only need source + campaign.
 */
export function SourcePicker({ value, onChange, withReferral = false, excludeClientId, title }: {
  value: SourceValue; onChange: (v: SourceValue) => void; withReferral?: boolean; excludeClientId?: string; title?: string;
}) {
  const c = useSourceCopy();
  const { data: sources = [] } = useClientSources();
  const { data: campaigns = [] } = useCampaigns();
  const { data: clients = [] } = useClients();
  const [createOpen, setCreateOpen] = useState(false);

  // Inactive sources are hidden, except the one already chosen.
  const options = sources.filter((s) => s.is_active || s.id === value.source_id);
  const current = sources.find((s) => s.id === value.source_id);
  const sourceCampaigns = campaigns.filter((x) => x.source_id === value.source_id && (x.status !== "finished" || x.id === value.campaign_id));
  const isReferral = current?.source_type === "referral";

  return (
    <div className="space-y-3 rounded-lg border border-border p-3 sm:col-span-2">
      <p className="text-sm font-medium text-foreground">{title ?? c("acquisition")}</p>
      <div className="space-y-2">
        <Label>{c("clientSource")}</Label>
        <div className="flex gap-2">
          <Select
            value={value.source_id ?? NONE}
            onValueChange={(v) => onChange({ ...value, source_id: v === NONE ? null : v, campaign_id: null, ...(withReferral ? { referred_by_client_id: null, referred_by_name: null } : {}) })}
          >
            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{c("none")}</SelectItem>
              {options.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="icon" onClick={() => setCreateOpen(true)} aria-label={c("createNew")} title={c("createNew")}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {value.source_id && sourceCampaigns.length > 0 && (
        <div className="space-y-2">
          <Label>{c("campaign")}</Label>
          <Select value={value.campaign_id ?? NONE} onValueChange={(v) => onChange({ ...value, campaign_id: v === NONE ? null : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{c("noCampaign")}</SelectItem>
              {sourceCampaigns.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {withReferral && isReferral && (
        <div className="space-y-2">
          <Label>{c("referredBy")}</Label>
          <Select
            value={value.referred_by_client_id ?? NONE}
            onValueChange={(v) => onChange({ ...value, referred_by_client_id: v === NONE ? null : v, referred_by_name: v === NONE ? value.referred_by_name ?? null : null })}
          >
            <SelectTrigger><SelectValue placeholder={c("referrerClient")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{c("referrerClient")}: —</SelectItem>
              {(clients as any[]).filter((x) => x.id !== excludeClientId).map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {!value.referred_by_client_id && (
            <Input
              value={value.referred_by_name ?? ""}
              maxLength={200}
              placeholder={c("referrerOther")}
              onChange={(e) => onChange({ ...value, referred_by_name: e.target.value || null })}
            />
          )}
        </div>
      )}

      <SourceDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={(s) => onChange({ ...value, source_id: s.id, campaign_id: null })} />
    </div>
  );
}
