import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

/* ---------------- TYPES ---------------- */
interface DailyUsage {
  day: string;
  tokens: number;
  cost: number;
}

interface UsageResponse {
  totalTokens: number;
  totalCost: number;
  startDate: string;
  endDate: string;
  dailyUsage: DailyUsage[];
}

/* ---------------- COMPONENT ---------------- */
export default function Dashboard() {
  const [projectId, setProjectId] = useState("");
  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [showResults, setShowResults] = useState(false);

  const isValidProjectId = projectId.startsWith("proj_");

  const { data, isLoading, error, refetch } = useQuery<UsageResponse>({
    queryKey: ["usage", projectId, startDate, endDate],
    queryFn: async () => {
      const res = await fetch("/api/token-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, startDate, endDate }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || `Server error (${res.status})`;
        throw new Error(errorMessage);
      }

      return res.json();
    },
    enabled: false,
    retry: 1,
  });

  const handleSearch = () => {
    if (!isValidProjectId) return;
    setShowResults(true);
    refetch();
  };

  useEffect(() => {
    if (isValidProjectId) {
      setShowResults(true);
      refetch();
    }
  }, [projectId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background text-foreground"
    >
      {/* ---------- HEADER ---------- */}
      <header className="sticky top-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          {/* LOGO */}
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow">
            <img
              src="/Gemini_Generated_Image_p42ap42ap42ap42a (1).png"
              alt="Wise Parrot Logo"
              className="w-full h-full object-cover"
            />
          </div>

          <h1 className="text-xl font-semibold text-primary">
            The Wise Parrot AI Usage Analyzer
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* ---------- FILTER CARD ---------- */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-card rounded-3xl p-8"
        >
          <h2 className="text-2xl font-semibold mb-2">
            Usage Dashboard
          </h2>
             <div className="space-y-4">
            <Input
              placeholder="Project ID (proj_...)"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            />

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <Button
              onClick={handleSearch}
              disabled={!isValidProjectId || isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              {isLoading ? "Fetching data..." : "Analyze Usage"}
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 rounded-xl flex gap-3 border border-red-500/20">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-600 mb-1">Error fetching data</p>
                <p className="text-sm text-red-600">
                  {error instanceof Error ? error.message : "An unknown error occurred"}
                </p>
                {showResults && (
                  <p className="text-xs text-red-500/70 mt-2">
                    Make sure your OpenAI API key is configured correctly on the server.
                  </p>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* ---------- RESULTS ---------- */}
        {showResults && data && (
          <>
            {/* ---------- SUMMARY CARDS ---------- */}
            <div className="grid md:grid-cols-3 gap-6">
              <SummaryCard
                title="Total Tokens"
                value={data.totalTokens.toLocaleString()}
                icon={<Zap />}
              />
              <SummaryCard
                title="Total Cost"
                value={`$${data.totalCost.toFixed(2)}`}
                icon={<DollarSign />}
              />
              <SummaryCard
                title="Period"
                value={`${format(new Date(data.startDate), "MMM d")} – ${format(
                  new Date(data.endDate),
                  "MMM d, yyyy"
                )}`}
                icon={<Calendar />}
              />
            </div>

            {/* ---------- DAILY TOKEN USAGE (FIXED Y AXIS) ---------- */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl p-10 w-full"
            >
              <h3 className="flex items-center gap-2 font-semibold mb-6">
                <TrendingUp className="text-primary" />
                Daily Token Usage 
              </h3>

              <ResponsiveContainer width="100%" height={420}>
                <LineChart data={data.dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="day"
                    stroke="#374151"
                    tick={{ fill: "#374151", fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#374151"
                    tick={{ fill: "#374151", fontSize: 12 }}
                    width={70}
                    allowDecimals={false}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="tokens"
                    stroke="#FF7615"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </>
        )}
      </main>
    </motion.div>
  );
}

/* ---------- SUMMARY CARD ---------- */
function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.div
      whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}
      transition={{ type: "spring", stiffness: 300 }}
      className="rounded-3xl p-6 bg-gradient-to-br from-primary via-[#ff8a3d] to-primary text-white"
    >
      <div className="flex justify-between">
        <div>
          <p className="text-white/80 text-sm mb-1">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
