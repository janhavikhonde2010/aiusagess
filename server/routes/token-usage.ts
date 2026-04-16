import { RequestHandler } from "express";

/* ================= CONSTANTS ================= */

const COST_PER_TOKEN = 0.0000015;
const TOKEN_MULTIPLIER = 1.25;

const USAGE_URL = "https://api.openai.com/v1/organization/usage/completions";
const PROJECTS_URL = "https://api.openai.com/v1/organization/projects";

/* ================= TYPES ================= */

interface TokenUsageRequest {
  startDate: string;
  endDate: string;
  adminKey?: string;
}

interface DailyUsage {
  day: string;
  tokens: number;
  cost: number;
}

interface DailyRequests {
  day: string;
  requests: number;
}

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

/* ================= HELPERS ================= */

function tsToDate(ts: number): string {
  return new Date(ts * 1000).toISOString().split("T")[0];
}

function getAllDates(start: string, end: string): string[] {
  const dates: string[] = [];
  let current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

async function fetchProjectNames(apiKey: string): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>();
  try {
    let after: string | null = null;
    let page = 0;

    // Paginate through all projects
    while (true) {
      page++;
      const params = new URLSearchParams({ limit: "100" });
      if (after) params.set("after", after);

      const res = await fetch(`${PROJECTS_URL}?${params}`, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      });

      console.log(`[fetchProjectNames] Page ${page} status:`, res.status);

      if (!res.ok) {
        const text = await res.text();
        console.warn(`[fetchProjectNames] Non-OK response (${res.status}):`, text);
        break;
      }

      const data = await res.json();
      console.log("[fetchProjectNames] Response keys:", Object.keys(data || {}).join(", "));

      const projects = Array.isArray(data?.data) ? data.data : [];
      console.log(`[fetchProjectNames] Page ${page}: ${projects.length} projects`);

      for (const p of projects) {
        if (p?.id && p?.name) {
          nameMap.set(p.id, p.name);
          console.log(`[fetchProjectNames] Mapped: ${p.id} → "${p.name}"`);
        }
      }

      // Stop if no more pages
      if (!data.has_more || projects.length === 0) break;
      after = projects[projects.length - 1]?.id ?? null;
      if (!after) break;
    }

    console.log(`[fetchProjectNames] Total names resolved: ${nameMap.size}`);
  } catch (e) {
    console.warn("[fetchProjectNames] Error fetching project names:", e);
  }
  return nameMap;
}

async function fetchUsage(startTime: number, endTime: number, days: number, apiKey: string) {
  const params = new URLSearchParams({
    start_time: String(startTime),
    end_time: String(endTime),
    bucket_width: "1d",
    limit: String(days),
    group_by: "project_id",
  });

  const res = await fetch(`${USAGE_URL}?${params}`, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${text}`);
  }

  return res.json();
}

/* ================= CONTROLLER ================= */

export const handleTokenUsage: RequestHandler = async (req, res) => {
  try {
    const { startDate, endDate, adminKey } = req.body as TokenUsageRequest;

    const OPENAI_ADMIN_KEY = adminKey || process.env.OPENAI_ADMIN_KEY;

    if (!OPENAI_ADMIN_KEY) {
      return res.status(500).json({
        error: "OpenAI Admin API key is required. Please provide it in the input field.",
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }

    // IST → UTC offset
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const startDt = new Date(`${startDate}T00:00:00Z`);
    const endDt = new Date(`${endDate}T00:00:00Z`);
    endDt.setDate(endDt.getDate() + 1);
    startDt.setTime(startDt.getTime() - istOffsetMs);
    endDt.setTime(endDt.getTime() - istOffsetMs);

    const startTime = Math.floor(startDt.getTime() / 1000);
    const endTime = Math.floor(endDt.getTime() / 1000) - 1;
    const days =
      Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Fetch usage data and project names in parallel
    const [data, projectNames] = await Promise.all([
      fetchUsage(startTime, endTime, days, OPENAI_ADMIN_KEY),
      fetchProjectNames(OPENAI_ADMIN_KEY),
    ]);

    if (!data || typeof data !== "object") throw new Error("Invalid response from OpenAI API");

    const allDates = getAllDates(startDate, endDate);
    const buckets = Array.isArray(data.data) ? data.data : [];

    // Per-project accumulators
    const projectMap = new Map<string, {
      tokens: number;
      cost: number;
      requests: number;
      dailyUsage: Map<string, DailyUsage>;
      dailyRequests: Map<string, number>;
    }>();

    // Global accumulators
    const globalDailyUsage = new Map<string, DailyUsage>();
    const globalDailyRequests = new Map<string, number>();
    for (const day of allDates) {
      globalDailyUsage.set(day, { day, tokens: 0, cost: 0 });
      globalDailyRequests.set(day, 0);
    }

    for (const bucket of buckets) {
      if (!bucket || !bucket.start_time && bucket.start_time !== 0) continue;
      const day = tsToDate(bucket.start_time);
      const results = Array.isArray(bucket.results) ? bucket.results : [];

      for (const r of results) {
        if (!r || typeof r !== "object") continue;

        const pid = r.project_id as string;
        if (!pid) continue;

        const rawTokens = Number(r.input_tokens || 0) + Number(r.output_tokens || 0);
        const displayTokens = rawTokens * TOKEN_MULTIPLIER;
        const cost = displayTokens * COST_PER_TOKEN;
        const requests = Number(r.num_requests || 0);

        // Init project if new
        if (!projectMap.has(pid)) {
          const perDayUsage = new Map<string, DailyUsage>();
          const perDayReq = new Map<string, number>();
          for (const d of allDates) {
            perDayUsage.set(d, { day: d, tokens: 0, cost: 0 });
            perDayReq.set(d, 0);
          }
          projectMap.set(pid, { tokens: 0, cost: 0, requests: 0, dailyUsage: perDayUsage, dailyRequests: perDayReq });
        }

        const proj = projectMap.get(pid)!;
        proj.tokens += displayTokens;
        proj.cost += cost;
        proj.requests += requests;

        if (proj.dailyUsage.has(day)) {
          const du = proj.dailyUsage.get(day)!;
          du.tokens += displayTokens;
          du.cost += cost;
        }
        if (proj.dailyRequests.has(day)) {
          proj.dailyRequests.set(day, (proj.dailyRequests.get(day) || 0) + requests);
        }

        // Global
        if (globalDailyUsage.has(day)) {
          const gdu = globalDailyUsage.get(day)!;
          gdu.tokens += displayTokens;
          gdu.cost += cost;
        }
        globalDailyRequests.set(day, (globalDailyRequests.get(day) || 0) + requests);
      }
    }

    // Build projects array sorted by total tokens desc
    const projects: ProjectUsage[] = [...projectMap.entries()]
      .map(([pid, acc]) => ({
        projectId: pid,
        projectName: projectNames.get(pid) || pid,
        totalTokens: Math.round(acc.tokens),
        totalCost: Number((acc.cost).toFixed(6)),
        totalRequests: acc.requests,
        dailyUsage: [...acc.dailyUsage.values()].map((d) => ({
          ...d,
          tokens: Math.round(d.tokens),
          cost: Number(d.cost.toFixed(6)),
        })),
        dailyRequests: [...acc.dailyRequests.entries()].map(([day, requests]) => ({ day, requests })),
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens);

    const grandTotalTokens = projects.reduce((s, p) => s + p.totalTokens, 0);
    const grandTotalCost = projects.reduce((s, p) => s + p.totalCost, 0);
    const grandTotalRequests = projects.reduce((s, p) => s + p.totalRequests, 0);

    const response: UsageResponse = {
      startDate,
      endDate,
      totalTokens: grandTotalTokens,
      totalCost: Number(grandTotalCost.toFixed(6)),
      totalRequests: grandTotalRequests,
      projects,
      dailyUsage: [...globalDailyUsage.values()].map((d) => ({
        ...d,
        tokens: Math.round(d.tokens),
        cost: Number(d.cost.toFixed(6)),
      })),
      dailyRequests: [...globalDailyRequests.entries()].map(([day, requests]) => ({ day, requests })),
    };

    return res.json(response);
  } catch (err: any) {
    console.error("[handleTokenUsage] Error:", err.message);

    let errorMessage = "Failed to fetch token usage";
    if (err.message?.includes("401") || err.message?.includes("unauthorized")) {
      errorMessage = "Invalid OpenAI Admin API key — please check your key and try again";
    } else if (err.message?.includes("429")) {
      errorMessage = "Rate limit exceeded — please wait a moment and try again";
    } else if (err.message?.includes("403")) {
      errorMessage = "Access denied — make sure you're using an Admin key, not a regular API key";
    }

    return res.status(500).json({ error: errorMessage, details: err.message });
  }
};
