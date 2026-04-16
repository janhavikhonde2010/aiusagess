import { useState } from "react";
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
];

/* ================================================================
   MAIN COMPONENT
================================================================ */
export default function Dashboard() {
  const [adminKey, setAdminKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [fetchParams, setFetchParams] = useState<null | { adminKey: string; startDate: string; endDate: string }>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

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
    setFetchParams({ adminKey: adminKey.trim(), startDate, endDate });
  };

  const applyPreset = (days: number) => {
    setStartDate(format(subDays(new Date(), days), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
  };

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
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
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
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.days)}
                  className="px-3 py-1 text-xs rounded-full border border-primary/30 hover:bg-primary/10 text-primary transition"
                >
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

              {/* ORG SUMMARY CARDS */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard title="Total Tokens" value={compactNum(data.totalTokens)} icon={<Zap size={20} />} color="from-orange-500 to-amber-400" />
                <SummaryCard title="Total Cost" value={`$${data.totalCost.toFixed(4)}`} icon={<DollarSign size={20} />} color="from-emerald-500 to-teal-400" />
                <SummaryCard title="Total Requests" value={data.totalRequests.toLocaleString()} icon={<Activity size={20} />} color="from-blue-500 to-indigo-400" />
                <SummaryCard
                  title="Projects Found"
                  value={String(data.projects.length)}
                  icon={<FolderOpen size={20} />}
                  color="from-purple-500 to-pink-400"
                />
              </div>

              {/* ORG-WIDE DAILY CHARTS */}
              <ChartCard title="Organization — Daily Token Usage" icon={<TrendingUp size={18} className="text-primary" />}>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.dailyUsage}>
                    <defs>
                      <linearGradient id="orgTokenGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF7615" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#FF7615" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={fmtDay} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} width={65} allowDecimals={false} tickFormatter={compactNum} />
                    <Tooltip formatter={(v: number) => [v.toLocaleString(), "Tokens"]} labelFormatter={fmtDay} />
                    <Area type="monotone" dataKey="tokens" stroke="#FF7615" strokeWidth={2.5} fill="url(#orgTokenGrad)" dot={{ r: 3 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* PROJECTS TABLE + EXPANDABLE DETAIL */}
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
                        {/* Row header */}
                        <button
                          onClick={() => setExpandedProject(isOpen ? null : proj.projectId)}
                          className="w-full flex items-center gap-4 p-4 hover:bg-muted/40 transition text-left"
                        >
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{proj.projectName}</p>
                            <p className="text-xs text-muted-foreground font-mono truncate">{proj.projectId}</p>
                          </div>
                          <div className="text-right shrink-0 space-y-1">
                            <p className="text-sm font-semibold">{compactNum(proj.totalTokens)} tokens</p>
                            <p className="text-xs text-emerald-600">${proj.totalCost.toFixed(4)}</p>
                          </div>
                          <div className="w-24 shrink-0 hidden sm:block">
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 text-right">{pct.toFixed(1)}%</p>
                          </div>
                          <div className="shrink-0 text-muted-foreground">
                            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </button>

                        {/* Expanded detail */}
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 pt-0 space-y-6 border-t bg-muted/20">
                                {/* Mini stats */}
                                <div className="grid grid-cols-3 gap-3 pt-4">
                                  <MiniStat label="Tokens" value={proj.totalTokens.toLocaleString()} color={color} />
                                  <MiniStat label="Cost" value={`$${proj.totalCost.toFixed(6)}`} color={color} />
                                  <MiniStat label="Requests" value={proj.totalRequests.toLocaleString()} color={color} />
                                </div>

                                {/* Daily tokens chart */}
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

                                {/* Daily cost chart */}
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Daily Cost (USD)</p>
                                  <ResponsiveContainer width="100%" height={160}>
                                    <LineChart data={proj.dailyUsage}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                      <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 10 }} tickFormatter={fmtDay} />
                                      <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} width={65} tickFormatter={(v) => `$${v.toFixed(4)}`} />
                                      <Tooltip formatter={(v: number) => [`$${v.toFixed(6)}`, "Cost"]} labelFormatter={fmtDay} />
                                      <Line type="monotone" dataKey="cost" stroke={color} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>

                                {/* Daily table */}
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
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

/* ================================================================
   SUB-COMPONENTS
================================================================ */
function SummaryCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 16px 32px rgba(0,0,0,0.12)" }}
      transition={{ type: "spring", stiffness: 300 }}
      className={`rounded-2xl p-5 bg-gradient-to-br ${color} text-white`}
    >
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
