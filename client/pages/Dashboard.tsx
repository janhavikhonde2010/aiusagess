import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  AlertCircle,
  Calendar,
  DollarSign,
  Zap,
  TrendingUp,
  Activity,
  Eye,
  EyeOff,
  Key,
  Search,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  TableProperties,
  LayoutList,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

/* ---------------- TYPES ---------------- */
interface DailyUsage { day: string; tokens: number; cost: number }
interface DailyRequests { day: string; requests: number }
interface ProjectUsage {
  projectId: string;
  projectName: string;
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  dailyUsage: DailyUsage[];
  dailyRequests: DailyRequests[];
}
interface UsageResponse {
  startDate: string;
  endDate: string;
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  projects: ProjectUsage[];
  dailyUsage: DailyUsage[];
  dailyRequests: DailyRequests[];
}

/* ---------------- PRESETS ---------------- */
const PRESETS = [
  { label: "Last 7d", days: 7 },
  { label: "Last 14d", days: 14 },
  { label: "Last 30d", days: 30 },
  { label: "Last 90d", days: 90 },
];

/* ---------------- PROJECT COLORS ---------------- */
const PROJECT_COLORS = [
  "#FF7615", "#3b82f6", "#10b981", "#a855f7",
  "#f43f5e", "#f59e0b", "#06b6d4", "#84cc16",
  "#ec4899", "#14b8a6", "#8b5cf6", "#ef4444",
];

/* ================================================================
   MAIN COMPONENT
================================================================ */
export default function Dashboard() {
  const [adminKey, setAdminKey]     = useState("");
  const [showKey, setShowKey]       = useState(false);
  const [startDate, setStartDate]   = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate]       = useState(format(new Date(), "yyyy-MM-dd"));
  const [fetchParams, setFetchParams] = useState<null | { adminKey: string; startDate: string; endDate: string }>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<"projects" | "daywise">("projects");

  const isValidKey = adminKey.trim().length > 10;

  const { data, isLoading, error } = useQuery<UsageResponse>({
    queryKey: ["usage", fetchParams],
    queryFn: async () => {
      if (!fetchParams) throw new Error("No params");
      const res = await fetch("/api/token-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fetchParams),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Server error (${res.status})`);
      }
      return res.json();
    },
    enabled: !!fetchParams,
    retry: 1,
  });

  const handleSearch = () => {
    if (!isValidKey) return;
    setExpandedProject(null);
    setActiveTab("projects");
    setFetchParams({ adminKey: adminKey.trim(), startDate, endDate });
  };

  const applyPreset = (days: number) => {
    setStartDate(format(subDays(new Date(), days), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
  };

  /* Build day-wise stacked chart data + table rows */
  const { dayChartData, allDays } = useMemo(() => {
    if (!data?.projects?.length) return { dayChartData: [], allDays: [] };

    const days = data.dailyUsage.map((d) => d.day);

    const chartData = days.map((day) => {
      const row: Record<string, any> = { day };
      let total = 0;
      for (const proj of data.projects) {
        const du = proj.dailyUsage.find((d) => d.day === day);
        const tokens = du?.tokens ?? 0;
        row[proj.projectName] = tokens;
        row[`${proj.projectName}__cost`] = du?.cost ?? 0;
        total += tokens;
      }
      row["__total"] = total;
      return row;
    });

    return { dayChartData: chartData, allDays: days };
  }, [data]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background text-foreground">

      {/* HEADER */}
      <header className="sticky top-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow">
            <img src="/Gemini_Generated_Image_p42ap42ap42ap42a (1).png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-semibold text-primary">The Wise Parrot — AI Usage Analyzer</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">

        {/* FILTER CARD */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card rounded-3xl p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-1">Usage Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Enter your OpenAI Admin key — all projects will be discovered and visualized automatically.
            </p>
          </div>

          {/* Admin Key */}
          <div className="space-y-1">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Key size={14} className="text-primary" />
              OpenAI Admin API Key
            </label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                placeholder="sk-admin-..."
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="pr-10"
              />
              <button type="button" onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Sent securely to your server — never stored or logged.</p>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Calendar size={14} className="text-primary" />
              Date Range
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button key={p.label} onClick={() => applyPreset(p.days)}
                  className="px-3 py-1 text-xs rounded-full border border-primary/30 hover:bg-primary/10 text-primary transition">
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">From</p>
                <Input type="date" value={startDate} max={endDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">To</p>
                <Input type="date" value={endDate} min={startDate} max={format(new Date(), "yyyy-MM-dd")} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          <Button onClick={handleSearch} disabled={!isValidKey || isLoading} className="w-full bg-primary hover:bg-primary/90 text-white gap-2">
            <Search size={16} />
            {isLoading ? "Fetching all projects…" : "Analyze All Projects"}
          </Button>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-red-500/10 rounded-xl flex gap-3 border border-red-500/20">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-sm font-semibold text-red-600 mb-1">Error fetching data</p>
                  <p className="text-sm text-red-600">{error instanceof Error ? error.message : "Unknown error"}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* RESULTS */}
        <AnimatePresence>
          {data && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">

              {/* SUMMARY CARDS */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard title="Total Tokens"    value={compactNum(data.totalTokens)}             icon={<Zap size={20} />}        color="from-orange-500 to-amber-400" />
                <SummaryCard title="Total Cost"      value={`$${data.totalCost.toFixed(4)}`}          icon={<DollarSign size={20} />} color="from-emerald-500 to-teal-400" />
                <SummaryCard title="Total Requests"  value={data.totalRequests.toLocaleString()}       icon={<Activity size={20} />}   color="from-blue-500 to-indigo-400" />
                <SummaryCard title="Projects Found"  value={String(data.projects.length)}             icon={<FolderOpen size={20} />} color="from-purple-500 to-pink-400" />
              </div>

              {/* ORG-WIDE AREA CHART */}
              <ChartCard title="Organization — Daily Token Usage" icon={<TrendingUp size={18} className="text-primary" />}>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.dailyUsage}>
                    <defs>
                      <linearGradient id="orgGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#FF7615" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#FF7615" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={fmtDay} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} width={65} allowDecimals={false} tickFormatter={compactNum} />
                    <Tooltip formatter={(v: number) => [v.toLocaleString(), "Tokens"]} labelFormatter={fmtDay} />
                    <Area type="monotone" dataKey="tokens" stroke="#FF7615" strokeWidth={2.5} fill="url(#orgGrad)" dot={{ r: 3 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* TABS */}
              <div className="flex gap-2">
                <TabBtn active={activeTab === "projects"} onClick={() => setActiveTab("projects")} icon={<LayoutList size={15} />}>
                  By Project
                </TabBtn>
                <TabBtn active={activeTab === "daywise"} onClick={() => setActiveTab("daywise")} icon={<TableProperties size={15} />}>
                  Day-wise
                </TabBtn>
              </div>

              {/* ===== PROJECTS TAB ===== */}
              {activeTab === "projects" && (
                <ChartCard title="Projects Breakdown" icon={<FolderOpen size={18} className="text-purple-500" />}>
                  <div className="space-y-3">
                    {data.projects.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">No usage data found for this period.</p>
                    )}
                    {data.projects.map((proj, idx) => {
                      const color = PROJECT_COLORS[idx % PROJECT_COLORS.length];
                      const isOpen = expandedProject === proj.projectId;
                      const pct = data.totalTokens > 0 ? (proj.totalTokens / data.totalTokens) * 100 : 0;

                      return (
                        <div key={proj.projectId} className="border rounded-2xl overflow-hidden">
                          <button onClick={() => setExpandedProject(isOpen ? null : proj.projectId)}
                            className="w-full flex items-center gap-4 p-4 hover:bg-muted/40 transition text-left">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{proj.projectName}</p>
                              <p className="text-xs text-muted-foreground font-mono truncate">{proj.projectId}</p>
                            </div>
                            <div className="text-right shrink-0 space-y-0.5">
                              <p className="text-sm font-semibold">{compactNum(proj.totalTokens)} tokens</p>
                              <p className="text-xs text-emerald-600">${proj.totalCost.toFixed(4)}</p>
                            </div>
                            <div className="w-24 shrink-0 hidden sm:block">
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 text-right">{pct.toFixed(1)}%</p>
                            </div>
                            <div className="shrink-0 text-muted-foreground">
                              {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </button>

                          <AnimatePresence>
                            {isOpen && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                                <div className="p-4 pt-0 space-y-5 border-t bg-muted/20">
                                  <div className="grid grid-cols-3 gap-3 pt-4">
                                    <MiniStat label="Tokens"   value={proj.totalTokens.toLocaleString()}   color={color} />
                                    <MiniStat label="Cost"     value={`$${proj.totalCost.toFixed(6)}`}     color={color} />
                                    <MiniStat label="Requests" value={proj.totalRequests.toLocaleString()} color={color} />
                                  </div>

                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Daily Tokens</p>
                                    <ResponsiveContainer width="100%" height={180}>
                                      <BarChart data={proj.dailyUsage}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 10 }} tickFormatter={fmtDay} />
                                        <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} width={55} tickFormatter={compactNum} allowDecimals={false} />
                                        <Tooltip formatter={(v: number) => [v.toLocaleString(), "Tokens"]} labelFormatter={fmtDay} />
                                        <Bar dataKey="tokens" fill={color} radius={[3, 3, 0, 0]} opacity={0.85} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>

                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Daily Cost (USD)</p>
                                    <ResponsiveContainer width="100%" height={150}>
                                      <LineChart data={proj.dailyUsage}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 10 }} tickFormatter={fmtDay} />
                                        <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} width={65} tickFormatter={(v) => `$${v.toFixed(4)}`} />
                                        <Tooltip formatter={(v: number) => [`$${v.toFixed(6)}`, "Cost"]} labelFormatter={fmtDay} />
                                        <Line type="monotone" dataKey="cost" stroke={color} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>

                                  {/* Per-project day table */}
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b">
                                          <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Date</th>
                                          <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">Tokens</th>
                                          <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">Cost</th>
                                          <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">Requests</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {proj.dailyUsage.map((row, i) => {
                                          const req = proj.dailyRequests.find((r) => r.day === row.day);
                                          return (
                                            <tr key={row.day} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                                              <td className="py-1.5 px-2 font-mono">{row.day}</td>
                                              <td className="py-1.5 px-2 text-right font-mono">{row.tokens.toLocaleString()}</td>
                                              <td className="py-1.5 px-2 text-right font-mono text-emerald-600">${row.cost.toFixed(6)}</td>
                                              <td className="py-1.5 px-2 text-right font-mono text-blue-600">{req?.requests ?? 0}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </ChartCard>
              )}

              {/* ===== DAY-WISE TAB ===== */}
              {activeTab === "daywise" && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

                  {/* Stacked bar chart — all projects per day */}
                  <ChartCard title="Daily Tokens — All Projects Stacked" icon={<TrendingUp size={18} className="text-primary" />}>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={dayChartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={fmtDay} />
                        <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} width={65} allowDecimals={false} tickFormatter={compactNum} />
                        <Tooltip
                          formatter={(v: number, name: string) => [v.toLocaleString(), name]}
                          labelFormatter={fmtDay}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        {data.projects.map((proj, idx) => (
                          <Bar
                            key={proj.projectId}
                            dataKey={proj.projectName}
                            stackId="a"
                            fill={PROJECT_COLORS[idx % PROJECT_COLORS.length]}
                            radius={idx === data.projects.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* Day-wise table — one row per day, one column per project */}
                  <ChartCard title="Day-wise Breakdown Table" icon={<TableProperties size={18} className="text-blue-500" />}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b bg-muted/40">
                            <th className="text-left py-2 px-3 font-semibold sticky left-0 bg-muted/40 min-w-[100px]">Date</th>
                            {data.projects.map((proj, idx) => (
                              <th key={proj.projectId} className="text-right py-2 px-3 font-semibold min-w-[120px]">
                                <span className="inline-flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: PROJECT_COLORS[idx % PROJECT_COLORS.length] }} />
                                  <span className="truncate max-w-[90px] inline-block align-middle" title={proj.projectName}>{proj.projectName}</span>
                                </span>
                              </th>
                            ))}
                            <th className="text-right py-2 px-3 font-semibold min-w-[100px]">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dayChartData.map((row, i) => (
                            <tr key={row.day} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                              <td className="py-2 px-3 font-mono font-semibold sticky left-0 bg-inherit">{row.day}</td>
                              {data.projects.map((proj) => {
                                const tokens = (row[proj.projectName] as number) || 0;
                                return (
                                  <td key={proj.projectId} className="py-2 px-3 text-right font-mono">
                                    {tokens > 0 ? (
                                      <span>{tokens.toLocaleString()}</span>
                                    ) : (
                                      <span className="text-muted-foreground/40">—</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="py-2 px-3 text-right font-mono font-semibold text-primary">
                                {((row["__total"] as number) || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t font-bold bg-muted/40">
                            <td className="py-2 px-3 sticky left-0 bg-muted/40">Total</td>
                            {data.projects.map((proj) => (
                              <td key={proj.projectId} className="py-2 px-3 text-right font-mono">
                                {proj.totalTokens.toLocaleString()}
                              </td>
                            ))}
                            <td className="py-2 px-3 text-right font-mono text-primary">
                              {data.totalTokens.toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </ChartCard>

                  {/* Day-wise cost table */}
                  <ChartCard title="Day-wise Cost Table (USD)" icon={<DollarSign size={18} className="text-emerald-500" />}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b bg-muted/40">
                            <th className="text-left py-2 px-3 font-semibold sticky left-0 bg-muted/40 min-w-[100px]">Date</th>
                            {data.projects.map((proj, idx) => (
                              <th key={proj.projectId} className="text-right py-2 px-3 font-semibold min-w-[120px]">
                                <span className="inline-flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: PROJECT_COLORS[idx % PROJECT_COLORS.length] }} />
                                  <span className="truncate max-w-[90px] inline-block align-middle" title={proj.projectName}>{proj.projectName}</span>
                                </span>
                              </th>
                            ))}
                            <th className="text-right py-2 px-3 font-semibold min-w-[100px]">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dayChartData.map((row, i) => {
                            const totalCost = data.projects.reduce((s, p) => s + ((row[`${p.projectName}__cost`] as number) || 0), 0);
                            return (
                              <tr key={row.day} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                                <td className="py-2 px-3 font-mono font-semibold sticky left-0 bg-inherit">{row.day}</td>
                                {data.projects.map((proj) => {
                                  const cost = (row[`${proj.projectName}__cost`] as number) || 0;
                                  return (
                                    <td key={proj.projectId} className="py-2 px-3 text-right font-mono text-emerald-700">
                                      {cost > 0 ? `$${cost.toFixed(6)}` : <span className="text-muted-foreground/40">—</span>}
                                    </td>
                                  );
                                })}
                                <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-700">
                                  ${totalCost.toFixed(6)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t font-bold bg-muted/40">
                            <td className="py-2 px-3 sticky left-0 bg-muted/40">Total</td>
                            {data.projects.map((proj) => (
                              <td key={proj.projectId} className="py-2 px-3 text-right font-mono text-emerald-700">
                                ${proj.totalCost.toFixed(6)}
                              </td>
                            ))}
                            <td className="py-2 px-3 text-right font-mono text-emerald-700">
                              ${data.totalCost.toFixed(6)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </ChartCard>

                </motion.div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </motion.div>
  );
}

/* ================================================================
   HELPERS
================================================================ */
function fmtDay(d: string) {
  if (!d) return d;
  const p = d.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}` : d;
}

function compactNum(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

/* ================================================================
   SUB-COMPONENTS
================================================================ */
function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition border
        ${active ? "bg-primary text-white border-primary shadow" : "bg-background text-muted-foreground border-border hover:bg-muted"}`}
    >
      {icon}{children}
    </button>
  );
}

function SummaryCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <motion.div whileHover={{ y: -4, boxShadow: "0 16px 32px rgba(0,0,0,0.12)" }} transition={{ type: "spring", stiffness: 300 }}
      className={`rounded-2xl p-5 bg-gradient-to-br ${color} text-white`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-white/75 text-xs mb-1">{title}</p>
          <p className="text-xl font-bold leading-tight">{value}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">{icon}</div>
      </div>
    </motion.div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl p-6">
      <h3 className="flex items-center gap-2 font-semibold mb-5 text-base">{icon}{title}</h3>
      {children}
    </motion.div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3 bg-background border text-center">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="font-bold text-sm" style={{ color }}>{value}</p>
    </div>
  );
}
