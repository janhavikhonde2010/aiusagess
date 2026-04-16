import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

/* ---------------- TYPES ---------------- */
interface DailyUsage {
  day: string;
  tokens: number;
  cost: number;
}

interface DailyRequests {
  day: string;
  requests: number;
}

interface UsageResponse {
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  responsesAndChatCompletions: number;
  startDate: string;
  endDate: string;
  dailyUsage: DailyUsage[];
  dailyRequests: DailyRequests[];
}

/* ---------------- QUICK RANGE PRESETS ---------------- */
const PRESETS = [
  { label: "Last 7d", days: 7 },
  { label: "Last 14d", days: 14 },
  { label: "Last 30d", days: 30 },
  { label: "Last 90d", days: 90 },
];

/* ---------------- COMPONENT ---------------- */
export default function Dashboard() {
  const [adminKey, setAdminKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [fetchParams, setFetchParams] = useState<null | {
    adminKey: string;
    projectId: string;
    startDate: string;
    endDate: string;
  }>(null);

  const isValidProjectId = projectId.startsWith("proj_");
  const isValidKey = adminKey.trim().length > 0;

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
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error (${res.status})`);
      }
      return res.json();
    },
    enabled: !!fetchParams,
    retry: 1,
  });

  const handleSearch = () => {
    if (!isValidProjectId || !isValidKey) return;
    setFetchParams({
      adminKey: adminKey.trim(),
      projectId,
      startDate,
      endDate,
    });
  };

  const applyPreset = (days: number) => {
    setStartDate(format(subDays(new Date(), days), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background text-foreground"
    >
      {/* ---------- HEADER ---------- */}
      <header className="sticky top-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow">
            <img
              src="/Gemini_Generated_Image_p42ap42ap42ap42a (1).png"
              alt="Wise Parrot Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-xl font-semibold text-primary">
            The Wise Parrot — AI Usage Analyzer
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* ---------- FILTER CARD ---------- */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-card rounded-3xl p-8 space-y-6"
        >
          <div>
            <h2 className="text-2xl font-semibold mb-1">Usage Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Enter your OpenAI Admin key and project ID to visualize token usage.
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
            <p className="text-xs text-muted-foreground">
              Your key is sent directly to your server — never stored or logged.
            </p>
          </div>

          {/* Project ID */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Project ID</label>
            <Input
              placeholder="proj_..."
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            />
            {projectId && !isValidProjectId && (
              <p className="text-xs text-red-500">
                Must start with <code>proj_</code>
              </p>
            )}
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Calendar size={14} className="text-primary" />
              Date Range
            </label>
            {/* Quick presets */}
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
                <Input
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">To</p>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={!isValidProjectId || !isValidKey || isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-white gap-2"
          >
            <Search size={16} />
            {isLoading ? "Fetching data…" : "Analyze Usage"}
          </Button>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-red-500/10 rounded-xl flex gap-3 border border-red-500/20"
              >
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-sm font-semibold text-red-600 mb-1">
                    Error fetching data
                  </p>
                  <p className="text-sm text-red-600">
                    {error instanceof Error
                      ? error.message
                      : "An unknown error occurred"}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ---------- RESULTS ---------- */}
        <AnimatePresence>
          {data && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* Summary Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                  title="Total Tokens"
                  value={data.totalTokens.toLocaleString()}
                  icon={<Zap size={20} />}
                  color="from-orange-500 to-amber-400"
                />
                <SummaryCard
                  title="Total Cost"
                  value={`$${data.totalCost.toFixed(4)}`}
                  icon={<DollarSign size={20} />}
                  color="from-emerald-500 to-teal-400"
                />
                <SummaryCard
                  title="Total Requests"
                  value={data.totalRequests.toLocaleString()}
                  icon={<Activity size={20} />}
                  color="from-blue-500 to-indigo-400"
                />
                <SummaryCard
                  title="Period"
                  value={`${format(new Date(data.startDate + "T12:00:00"), "MMM d")} – ${format(
                    new Date(data.endDate + "T12:00:00"),
                    "MMM d, yyyy"
                  )}`}
                  icon={<Calendar size={20} />}
                  color="from-purple-500 to-pink-400"
                />
              </div>

              {/* Daily Token Usage */}
              <ChartCard title="Daily Token Usage" icon={<TrendingUp size={18} className="text-primary" />}>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={data.dailyUsage}>
                    <defs>
                      <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF7615" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#FF7615" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={formatDay} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} width={70} allowDecimals={false} tickFormatter={compactNum} />
                    <Tooltip formatter={(v: number) => [v.toLocaleString(), "Tokens"]} labelFormatter={formatDay} />
                    <Area
                      type="monotone"
                      dataKey="tokens"
                      stroke="#FF7615"
                      strokeWidth={2.5}
                      fill="url(#tokenGrad)"
                      dot={{ r: 3, fill: "#FF7615" }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Daily Cost */}
              <ChartCard title="Daily Cost (USD)" icon={<DollarSign size={18} className="text-emerald-500" />}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.dailyUsage}>
                    <defs>
                      <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={formatDay} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} width={70} tickFormatter={(v) => `$${v.toFixed(4)}`} />
                    <Tooltip formatter={(v: number) => [`$${v.toFixed(6)}`, "Cost"]} labelFormatter={formatDay} />
                    <Bar dataKey="cost" fill="url(#costGrad)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Daily Requests */}
              {data.dailyRequests && data.dailyRequests.length > 0 && (
                <ChartCard title="Daily Requests" icon={<Activity size={18} className="text-blue-500" />}>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={data.dailyRequests}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={formatDay} />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} width={55} allowDecimals={false} />
                      <Tooltip formatter={(v: number) => [v.toLocaleString(), "Requests"]} labelFormatter={formatDay} />
                      <Line
                        type="monotone"
                        dataKey="requests"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#3b82f6" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Data Table */}
              <ChartCard title="Daily Breakdown" icon={<Calendar size={18} className="text-purple-500" />}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Date</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Tokens</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Cost</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Requests</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dailyUsage.map((row, i) => {
                        const req = data.dailyRequests?.find((r) => r.day === row.day);
                        return (
                          <tr key={row.day} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                            <td className="py-2 px-3 font-mono text-xs">{row.day}</td>
                            <td className="py-2 px-3 text-right font-mono text-xs">{row.tokens.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right font-mono text-xs text-emerald-600">${row.cost.toFixed(6)}</td>
                            <td className="py-2 px-3 text-right font-mono text-xs text-blue-600">{req?.requests ?? 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-semibold">
                        <td className="py-2 px-3">Total</td>
                        <td className="py-2 px-3 text-right font-mono text-xs">{data.totalTokens.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono text-xs text-emerald-600">${data.totalCost.toFixed(6)}</td>
                        <td className="py-2 px-3 text-right font-mono text-xs text-blue-600">{data.totalRequests.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </ChartCard>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </motion.div>
  );
}

/* ---------- HELPERS ---------- */
function formatDay(d: string) {
  if (!d) return d;
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}`;
}

function compactNum(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

/* ---------- SUMMARY CARD ---------- */
function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
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
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- CHART CARD ---------- */
function ChartCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-3xl p-6"
    >
      <h3 className="flex items-center gap-2 font-semibold mb-5 text-base">
        {icon}
        {title}
      </h3>
      {children}
    </motion.div>
  );
}
