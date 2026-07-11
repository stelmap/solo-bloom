import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { CheckCircle2, XCircle, MinusCircle, FlaskConical } from "lucide-react";
import {
  TEST_REGISTRY,
  TEST_SECTIONS,
  summarizeBySection,
  type TestSection,
  type TestStatus,
} from "@/lib/testRegistry";

const ADMIN_EMAIL = "o.gilevich@gmail.com";

const STATUS_COLORS: Record<TestStatus, string> = {
  passed: "hsl(var(--success, 142 71% 45%))",
  failed: "hsl(var(--destructive))",
  skipped: "hsl(var(--muted-foreground))",
};

function statusBadge(status: TestStatus) {
  if (status === "passed")
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1">
        <CheckCircle2 className="h-3 w-3" /> Passed
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1">
        <XCircle className="h-3 w-3" /> Failed
      </Badge>
    );
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <MinusCircle className="h-3 w-3" /> Skipped
    </Badge>
  );
}

export default function AdminTestsPage() {
  const { user } = useAuth();
  const [section, setSection] = useState<TestSection | "all">("all");
  const [query, setQuery] = useState("");

  const summaries = useMemo(() => summarizeBySection(), []);

  const totals = useMemo(() => {
    return summaries.reduce(
      (acc, s) => {
        acc.total += s.total;
        acc.passed += s.passed;
        acc.failed += s.failed;
        acc.skipped += s.skipped;
        acc.cases += s.cases;
        return acc;
      },
      { total: 0, passed: 0, failed: 0, skipped: 0, cases: 0 },
    );
  }, [summaries]);

  const overallPassRate =
    totals.passed + totals.failed === 0
      ? 0
      : Math.round((totals.passed / (totals.passed + totals.failed)) * 100);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEST_REGISTRY.filter((t) => {
      if (section !== "all" && t.section !== section) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.file.toLowerCase().includes(q) ||
        t.section.toLowerCase().includes(q)
      );
    });
  }, [section, query]);

  const barData = summaries.map((s) => ({
    section: s.section,
    Passed: s.passed,
    Failed: s.failed,
    Skipped: s.skipped,
  }));

  const pieData = [
    { name: "Passed", value: totals.passed, color: STATUS_COLORS.passed },
    { name: "Failed", value: totals.failed, color: STATUS_COLORS.failed },
    { name: "Skipped", value: totals.skipped, color: STATUS_COLORS.skipped },
  ].filter((d) => d.value > 0);

  if (!user) return <Navigate to="/auth" replace />;
  if (user.email !== ADMIN_EMAIL) return <Navigate to="/dashboard" replace />;

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Automated tests</h1>
              <p className="text-sm text-muted-foreground">
                Test suites grouped by product section with the latest run status.
              </p>
            </div>
          </div>
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total suites</p>
              <p className="text-2xl font-semibold">{totals.total}</p>
              <p className="text-xs text-muted-foreground mt-1">{totals.cases} test cases</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pass rate</p>
              <p className="text-2xl font-semibold text-emerald-600">{overallPassRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Passed</p>
              <p className="text-2xl font-semibold text-emerald-600">{totals.passed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-2xl font-semibold text-destructive">{totals.failed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Skipped</p>
              <p className="text-2xl font-semibold text-muted-foreground">{totals.skipped}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Results by section</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="section" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Passed" stackId="a" fill={STATUS_COLORS.passed} />
                  <Bar dataKey="Failed" stackId="a" fill={STATUS_COLORS.failed} />
                  <Bar dataKey="Skipped" stackId="a" fill={STATUS_COLORS.skipped} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overall status</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Section breakdown cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {summaries.map((s) => {
            const active = section === s.section;
            return (
              <button
                key={s.section}
                onClick={() => setSection(active ? "all" : s.section)}
                className={`text-left rounded-lg border p-3 hover:border-primary/60 transition ${
                  active ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{s.section}</p>
                  <Badge variant="outline" className="text-xs">
                    {s.total}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-emerald-600">✓ {s.passed}</span>
                  <span className="text-destructive">✕ {s.failed}</span>
                  <span className="text-muted-foreground">– {s.skipped}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${s.passRate}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {s.passRate}% pass · {s.cases} cases
                </p>
              </button>
            );
          })}
        </div>

        {/* Filters + Table */}
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Test suites</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                placeholder="Search by name or file..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-64"
              />
              {section !== "all" && (
                <Button variant="ghost" size="sm" onClick={() => setSection("all")}>
                  Clear filter: {section}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={section} onValueChange={(v) => setSection(v as any)}>
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                {TEST_SECTIONS.map((s) => (
                  <TabsTrigger key={s} value={s}>
                    {s}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={section} className="mt-4">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Test</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Kind</TableHead>
                        <TableHead className="text-right">Cases</TableHead>
                        <TableHead>File</TableHead>
                        <TableHead>Last run</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{statusBadge(t.status)}</TableCell>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{t.section}</Badge>
                          </TableCell>
                          <TableCell className="capitalize text-muted-foreground text-sm">
                            {t.kind}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{t.cases}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {t.file}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {t.lastRun ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filtered.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No tests match the current filter.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
