import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrency } from "@/hooks/useCurrency";
import { useClientSources, useSourceAnalyticsData } from "@/hooks/useClientSources";
import { computeSourceMetrics, periodRange, UNSPECIFIED, type PeriodKey, type Range, type SourceMetrics } from "@/lib/clientSources";
import { useSourceCopy } from "@/lib/clientSourcesCopy";

const PERIODS: PeriodKey[] = ["this_month", "last_month", "last_3m", "last_6m", "this_year", "all", "custom"];

export function usePeriod(initial: PeriodKey = "this_month") {
  const [period, setPeriod] = useState<PeriodKey>(initial);
  const [custom, setCustom] = useState<Range>({ from: null, to: null });
  const range = useMemo(() => periodRange(period, new Date(), custom), [period, custom]);
  return { period, setPeriod, custom, setCustom, range };
}

export function PeriodSelect({ p }: { p: ReturnType<typeof usePeriod> }) {
  const c = useSourceCopy();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={p.period} onValueChange={(v) => p.setPeriod(v as PeriodKey)}>
        <SelectTrigger className="w-[180px]" aria-label={c("period")}><SelectValue /></SelectTrigger>
        <SelectContent>{PERIODS.map((k) => <SelectItem key={k} value={k}>{c(`p_${k}` as any)}</SelectItem>)}</SelectContent>
      </Select>
      {p.period === "custom" && (
        <>
          <Input type="date" className="w-[150px]" value={p.custom.from ?? ""} onChange={(e) => p.setCustom({ ...p.custom, from: e.target.value || null })} />
          <Input type="date" className="w-[150px]" value={p.custom.to ?? ""} onChange={(e) => p.setCustom({ ...p.custom, to: e.target.value || null })} />
        </>
      )}
    </div>
  );
}

export function useSourceRows(range: Range) {
  const { data: sources = [] } = useClientSources();
  const { data, isLoading } = useSourceAnalyticsData();
  const rows = useMemo(
    () => (data ? computeSourceMetrics(sources, data.clients, data.expenses, data.income, range) : []),
    [sources, data, range],
  );
  const nameOf = (key: string) => sources.find((s) => s.id === key)?.name;
  return { rows, sources, isLoading, nameOf };
}

export const fmtRoi = (m: SourceMetrics) => (m.roi == null ? "—" : `${m.roi}x`);

/** Practice Overview: share of new clients per source. */
export function ClientSourcesShareBlock() {
  const c = useSourceCopy();
  const p = usePeriod("this_month");
  const { rows, nameOf } = useSourceRows(p.range);
  const visible = rows.filter((r) => r.newClients > 0).sort((a, b) => b.newClients - a.newClients);
  const total = visible.reduce((s, r) => s + r.newClients, 0);
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{c("whereFrom")}</CardTitle>
        <PeriodSelect p={p} />
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.length === 0 ? <p className="text-sm text-muted-foreground">{c("noData")}</p> : visible.map((r) => {
          const pct = Math.round((r.newClients / total) * 100);
          return (
            <div key={r.key} className="space-y-1">
              <div className="flex justify-between gap-2 text-sm">
                <span className="truncate text-foreground">{r.key === UNSPECIFIED ? c("none") : nameOf(r.key)}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{r.newClients} · {pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
        <Link to="/clients/sources" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          {c("openSources")} <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}

/** Financial Overview: CAC & revenue/cost per source. */
export function AcquisitionEfficiencyBlock() {
  const c = useSourceCopy();
  const { fmt } = useCurrency();
  const p = usePeriod("this_month");
  const { rows, nameOf } = useSourceRows(p.range);
  const visible = rows.filter((r) => r.key !== UNSPECIFIED && (r.newClients || r.expenses || r.revenue));
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{c("acqEfficiency")}</CardTitle>
        <PeriodSelect p={p} />
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? <p className="text-sm text-muted-foreground">{c("noData")}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground">
                <th className="py-2 text-left font-medium">{c("source")}</th>
                <th className="py-2 text-right font-medium">{c("newClients")}</th>
                <th className="py-2 text-right font-medium">{c("expenses")}</th>
                <th className="py-2 text-right font-medium">{c("cac")}</th>
                <th className="py-2 text-right font-medium">{c("revenue")}</th>
                <th className="py-2 text-right font-medium">{c("roi")}</th>
              </tr></thead>
              <tbody>{visible.map((r) => (
                <tr key={r.key} className="border-b last:border-0">
                  <td className="py-2"><Link className="text-foreground hover:text-primary" to={`/clients/sources/${r.key}`}>{nameOf(r.key)}</Link></td>
                  <td className="py-2 text-right tabular-nums">{r.newClients}</td>
                  <td className="py-2 text-right tabular-nums">{fmt(r.expenses, 2)}</td>
                  <td className="py-2 text-right tabular-nums">{r.cac == null ? "—" : fmt(r.cac, 2)}</td>
                  <td className="py-2 text-right tabular-nums">{fmt(r.revenue, 2)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtRoi(r)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
