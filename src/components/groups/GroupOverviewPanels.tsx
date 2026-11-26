import { Button } from "@/components/ui/button";
import { Check, Link2, CalendarPlus, UserPlus, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { groupTabsText } from "@/i18n/groupTabsText";
import { groupsText, groupSignupUrl } from "@/i18n/groupsExtra";
import { recentActivity } from "@/lib/groupMeetings";

export function GroupQuickStart({ group, hasMeetings, membersCount, onOpenForm }: { group: any; hasMeetings: boolean; membersCount: number; onOpenForm: () => void }) {
  const { lang } = useLanguage();
  const gt = groupTabsText(lang); const gx = groupsText(lang);
  const navigate = useNavigate(); const { toast } = useToast();
  const published = group.publication_status === "published";
  if ((published && hasMeetings) || group.lifecycle_status !== "active") return null;
  const share = async () => {
    if (!published) { onOpenForm(); return; }
    await navigator.clipboard.writeText(groupSignupUrl(group.registration_token, lang));
    toast({ title: gx.linkCopied });
  };
  const item = (done: boolean, Icon: typeof Link2, title: string, hint: string, onClick: () => void, disabled = false) => (
    <button type="button" onClick={onClick} disabled={done || disabled}
      className="flex items-start gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted/40 disabled:opacity-60 disabled:hover:bg-transparent transition-colors">
      <span className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span>
      <span><span className="block text-sm font-medium">{title}</span><span className="block text-xs text-muted-foreground">{done ? gt.done : hint}</span></span>
    </button>
  );
  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-3">
      <h2 className="text-lg font-semibold">{gt.quickStart}</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {item(false, Link2, gt.shareLink, published ? gt.shareLinkHint : gt.publishFirst, share)}
        {item(hasMeetings, CalendarPlus, gt.addFirst, "", () => navigate(`/calendar?new=1&groupId=${group.id}`), membersCount === 0)}
      </div>
    </div>
  );
}

export function GroupRecentActivity({ registrations }: { registrations: any[] }) {
  const { lang } = useLanguage();
  const gt = groupTabsText(lang);
  const items = recentActivity(registrations);
  if (items.length === 0) return null;
  const fmt = (iso: string) => new Intl.DateTimeFormat(lang, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const label = (k: string, st: string) => k === "submitted" ? gt.actSubmitted : st === "confirmed" ? gt.actConfirmed : st === "rejected" ? gt.actRejected : gt.actWaitlisted;
  const icon = (k: string, st: string) => k === "submitted" ? UserPlus : st === "confirmed" ? CheckCircle2 : st === "rejected" ? XCircle : Clock;
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h2 className="text-lg font-semibold mb-2">{gt.recent}</h2>
      {items.map(a => { const Icon = icon(a.kind, a.status); return (
        <div key={a.key} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
          <span className="h-9 w-9 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-4 w-4" /></span>
          <div><p className="text-sm font-medium">{label(a.kind, a.status).replace("{name}", a.name)}</p><p className="text-xs text-muted-foreground">{fmt(a.at)}</p></div>
        </div>
      ); })}
    </div>
  );
}
