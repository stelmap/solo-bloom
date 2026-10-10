import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SeoHead } from "@/components/SeoHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { CampaignDialog, SourceDialog } from "@/components/sources/SourceDialogs";
import { PeriodSelect, fmtRoi, usePeriod, useSourceRows } from "@/components/sources/SourceAnalytics";
import { useCampaigns, useDeleteCampaign, useDeleteSource, useSourceAnalyticsData } from "@/hooks/useClientSources";
import { useAppointments } from "@/hooks/useData";
import { useCurrency } from "@/hooks/useCurrency";
import { computeCampaignMetrics, efficiency, isRevenueIncome, referralCounts, UNSPECIFIED, type Campaign, type ClientSource } from "@/lib/clientSources";
import { useSourceCopy } from "@/lib/clientSourcesCopy";

export default function ClientSourcesPage() {
  const { id } = useParams();
  return <AppLayout>{id ? <SourceDetail id={id} /> : <SourceList />}</AppLayout>;
}

function SourceList() {
  const c = useSourceCopy();
  const { fmt } = useCurrency();
  const navigate = useNavigate();
  const p = usePeriod("all");
  const { rows, sources } = useSourceRows(p.range);
  const { data } = useSourceAnalyticsData();
  const [dialog, setDialog] = useState<{ open: boolean; source?: ClientSource | null }>({ open: false });
  const referrers = useMemo(() => referralCounts(data?.clients ?? []).slice(0, 5), [data]);

  return (
    <div className="space-y-5">
      <SeoHead path="/clients/sources" title={`${c("title")} — Solo .Bizz`} description={c("subtitle")} noindex />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{c("title")}</h1>
          <p className="mt-1 text-muted-foreground">{c("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PeriodSelect p={p} />
          <Button onClick={() => setDialog({ open: true, source: null })}><Plus className="mr-1 h-4 w-4" />{c("add")}</Button>
        </div>
      </div>

      <Card><CardContent className="p-0">
        {sources.length === 0 ? <p className="p-6 text-sm text-muted-foreground">{c("empty")}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground">
                {[c("source"), c("type"), c("clients"), c("expenses"), c("revenue"), c("cac"), c("roi"), c("efficiency")].map((h, i) => (
                  <th key={h} className={`p-3 font-medium ${i >= 2 && i <= 6 ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{rows.map((r) => {
                const s = sources.find((x) => x.id === r.key);
                const eff = efficiency(r);
                return (
                  <tr key={r.key} className={`border-b last:border-0 ${s ? "cursor-pointer hover:bg-muted/40" : ""}`} onClick={() => s && navigate(`/clients/sources/${s.id}`)}>
                    <td className="p-3 font-medium text-foreground">
                      {s ? s.name : c("none")}{s && !s.is_active && <Badge variant="outline" className="ml-2 text-xs">{c("inactive")}</Badge>}
                    </td>
                    <td className="p-3 text-muted-foreground">{s ? c(`t_${s.source_type}` as any) : "—"}</td>
                    <td className="p-3 text-right tabular-nums">{p.period === "all" ? r.totalClients : r.newClients}</td>
                    <td className="p-3 text-right tabular-nums">{s ? fmt(r.expenses, 2) : "—"}</td>
                    <td className="p-3 text-right tabular-nums">{fmt(r.revenue, 2)}</td>
                    <td className="p-3 text-right tabular-nums">{!s || r.cac == null ? "—" : fmt(r.cac, 2)}</td>
                    <td className="p-3 text-right tabular-nums">{s ? fmtRoi(r) : "—"}</td>
                    <td className="p-3">{s && eff !== "none" ? <Badge variant={eff === "high" ? "default" : eff === "medium" ? "secondary" : "outline"}>{c(`eff_${eff}`)}</Badge> : "—"}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </CardContent></Card>

      {referrers.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{c("referrers")}</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {referrers.map((r) => <p key={r.name}><span className="font-medium text-foreground">{r.name}</span> <span className="text-muted-foreground">→ {c("referredN", { n: r.count })}</span></p>)}
          </CardContent>
        </Card>
      )}

      <SourceDialog open={dialog.open} source={dialog.source} onOpenChange={(o) => setDialog({ open: o })} />
    </div>
  );
}

function SourceDetail({ id }: { id: string }) {
  const c = useSourceCopy();
  const { fmt } = useCurrency();
  const navigate = useNavigate();
  const p = usePeriod("all");
  const { rows, sources } = useSourceRows(p.range);
  const { data } = useSourceAnalyticsData();
  const { data: campaigns = [] } = useCampaigns();
  const { data: appointments = [] } = useAppointments();
  const delSource = useDeleteSource();
  const delCampaign = useDeleteCampaign();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [campDialog, setCampDialog] = useState<{ open: boolean; campaign?: Campaign | null }>({ open: false });

  const source = sources.find((s) => s.id === id);
  const m = rows.find((r) => r.key === id);
  const myCampaigns = campaigns.filter((x) => x.source_id === id);
  const clients = (data?.clients ?? []).filter((x) => x.source_id === id);
  const campMetrics = data ? computeCampaignMetrics(myCampaigns, data.clients, data.expenses, data.income, p.range) : [];
  const expenses = (data?.expenses ?? []).filter((e: any) => e.source_id === id).sort((a, b) => b.date.localeCompare(a.date));

  if (!source || id === UNSPECIFIED) {
    return <Link to="/clients/sources" className="text-primary">{c("back")}</Link>;
  }

  const clientRevenue = (cid: string) => (data?.income ?? []).filter((i) => i.client_id === cid && isRevenueIncome(i)).reduce((s, i) => s + Number(i.amount), 0);
  const meetings = (cid: string) => (appointments as any[]).filter((a) => a.client_id === cid && a.status === "completed").length;

  const stats = m ? [
    [c("clients"), m.totalClients], [c("newClients"), m.newClients], [c("expenses"), fmt(m.expenses, 2)],
    [c("cac"), m.cac == null ? "—" : fmt(m.cac, 2)], [c("revenue"), fmt(m.revenue, 2)], [c("roi"), fmtRoi(m)],
  ] : [];

  return (
    <div className="space-y-5">
      <SeoHead path={`/clients/sources/${id}`} title={`${source.name} — Solo .Bizz`} description={c("subtitle")} noindex />
      <Link to="/clients/sources" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{c("back")}</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{source.name}</h1>
          <p className="mt-1 text-muted-foreground">{c(`t_${source.source_type}` as any)}{!source.is_active && ` · ${c("inactive")}`}{source.description ? ` · ${source.description}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PeriodSelect p={p} />
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="mr-1 h-4 w-4" />{c("edit")}</Button>
          <Button variant="outline" onClick={() => setConfirmDel(true)} aria-label={c("delete")}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([k, v]) => (
          <Card key={String(k)}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{v}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{c("clients")}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-muted-foreground">
              <th className="p-3 text-left font-medium">{c("clients")}</th><th className="p-3 text-left font-medium">{c("date")}</th>
              <th className="p-3 text-left font-medium">{c("campaign")}</th><th className="p-3 text-right font-medium">{c("meetings")}</th>
              <th className="p-3 text-right font-medium">{c("revenue")}</th>
            </tr></thead>
            <tbody>{clients.map((x) => (
              <tr key={x.id} className="border-b last:border-0">
                <td className="p-3"><Link className="text-foreground hover:text-primary" to={`/clients/${x.id}`}>{x.name}</Link></td>
                <td className="p-3 text-muted-foreground">{new Date(x.created_at).toLocaleDateString()}</td>
                <td className="p-3 text-muted-foreground">{myCampaigns.find((k) => k.id === x.campaign_id)?.name ?? "—"}</td>
                <td className="p-3 text-right tabular-nums">{meetings(x.id)}</td>
                <td className="p-3 text-right tabular-nums">{fmt(clientRevenue(x.id), 2)}</td>
              </tr>
            ))}</tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{c("campaigns")}</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setCampDialog({ open: true, campaign: null })}><Plus className="mr-1 h-4 w-4" />{c("addCampaign")}</Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {myCampaigns.length > 0 && (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground">
                <th className="p-3 text-left font-medium">{c("campaign")}</th><th className="p-3 text-left font-medium">{c("status")}</th>
                <th className="p-3 text-right font-medium">{c("clients")}</th><th className="p-3 text-right font-medium">{c("expenses")}</th>
                <th className="p-3 text-right font-medium">{c("cac")}</th><th className="p-3 text-right font-medium">{c("revenue")}</th><th />
              </tr></thead>
              <tbody>{myCampaigns.map((k) => {
                const cm = campMetrics.find((x) => x.key === k.id)!;
                return (
                  <tr key={k.id} className="border-b last:border-0">
                    <td className="p-3 font-medium text-foreground">{k.name}<span className="block text-xs font-normal text-muted-foreground">{[k.start_date, k.end_date].filter(Boolean).join(" – ")}</span></td>
                    <td className="p-3 text-muted-foreground">{c(`st_${k.status}` as any)}</td>
                    <td className="p-3 text-right tabular-nums">{p.period === "all" ? cm.totalClients : cm.newClients}</td>
                    <td className="p-3 text-right tabular-nums">{fmt(cm.expenses, 2)}</td>
                    <td className="p-3 text-right tabular-nums">{cm.cac == null ? "—" : fmt(cm.cac, 2)}</td>
                    <td className="p-3 text-right tabular-nums">{fmt(cm.revenue, 2)}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" aria-label={c("edit")} onClick={() => setCampDialog({ open: true, campaign: k })}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" aria-label={c("delete")} onClick={() => delCampaign.mutate(k.id)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{c("expenses")}</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {expenses.length === 0 ? <p className="text-muted-foreground">—</p> : expenses.map((e: any) => (
            <div key={e.id} className="flex justify-between gap-2 border-b py-1.5 last:border-0">
              <span className="text-foreground">{e.date} · {e.description || e.category}{e.campaign_id && <span className="text-muted-foreground"> · {myCampaigns.find((k) => k.id === e.campaign_id)?.name}</span>}</span>
              <span className="tabular-nums">{fmt(Number(e.amount), 2)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <SourceDialog open={editOpen} onOpenChange={setEditOpen} source={source} />
      <CampaignDialog open={campDialog.open} onOpenChange={(o) => setCampDialog({ open: o })} campaign={campDialog.campaign} sourceId={id} sources={sources} />
      <ConfirmDeleteDialog open={confirmDel} onOpenChange={setConfirmDel} description={c("deleteConfirm")} loading={delSource.isPending}
        onConfirm={async () => { await delSource.mutateAsync(id); navigate("/clients/sources"); }} />
    </div>
  );
}
