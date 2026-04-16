import { RequestHandler } from "express";

/* ================= CONSTANTS ================= */

const COST_PER_TOKEN = 0.0000015;
const TOKEN_MULTIPLIER = 1.25;

const BASE_URL = "https://api.openai.com/v1/organization/usage/completions";

/* ================= TYPES ================= */

interface TokenUsageRequest {
  projectId: string;
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

async function fetchUsage(
  startTime: number,
  endTime: number,
  days: number,
  apiKey: string,
) {
  const params = new URLSearchParams({
    start_time: String(startTime),
    end_time: String(endTime),
    bucket_width: "1d",
    limit: String(days),
    group_by: "project_id",
  });

  const url = `${BASE_URL}?${params.toString()}`;
  console.log("[fetchUsage] Making request to:", url);
  console.log("[fetchUsage] Params:", {
    start_time: startTime,
    end_time: endTime,
    bucket_width: "1d",
    limit: days,
    group_by: "project_id",
  });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  console.log("[fetchUsage] Response status:", response.status);

  if (!response.ok) {
    const text = await response.text();
    console.log("[fetchUsage] Error response body:", text);
    throw new Error(`OpenAI API error (${response.status}): ${text}`);
  }

  const data = await response.json();

  console.log("[fetchUsage] ✅ Success, response keys:", Object.keys(data || {}).join(", "));
  console.log("[fetchUsage] data.data is array?", Array.isArray(data?.data));
  console.log("[fetchUsage] data.data length:", data?.data?.length || 0);

  if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
    console.log("[fetchUsage] First bucket keys:", Object.keys(data.data[0] || {}).join(", "));
    console.log("[fetchUsage] First bucket results count:", data.data[0]?.results?.length || 0);
    if (data.data[0]?.results?.[0]) {
      console.log("[fetchUsage] First result keys:", Object.keys(data.data[0].results[0]).join(", "));
    }
  }

  return data;
}

/* ================= CONTROLLER ================= */

export const handleTokenUsage: RequestHandler = async (req, res) => {
  try {
    console.log("[handleTokenUsage] Request received at:", new Date().toISOString());
    console.log("[handleTokenUsage] Environment check - OPENAI_ADMIN_KEY exists:", !!process.env.OPENAI_ADMIN_KEY);

    const { projectId, startDate, endDate, adminKey } = req.body as TokenUsageRequest;

    // Accept key from request body first, fall back to environment variable
    const OPENAI_ADMIN_KEY = adminKey || process.env.OPENAI_ADMIN_KEY;

    if (!OPENAI_ADMIN_KEY) {
      console.error("[handleTokenUsage] ❌ CRITICAL: Missing OPENAI_ADMIN_KEY");
      return res.status(500).json({
        error: "OpenAI Admin API key is required. Please provide it in the input field.",
        details: "No admin key provided in request or server environment",
      });
    }

    console.log("[handleTokenUsage] Request body:", {
      projectId,
      startDate,
      endDate,
    });

    if (!projectId || !startDate || !endDate) {
      console.log("[handleTokenUsage] Missing required fields");
      return res.status(400).json({ error: "Missing fields" });
    }

    if (!projectId.startsWith("proj_")) {
      console.log("[handleTokenUsage] Invalid project ID format:", projectId);
      return res.status(400).json({
        error: "Project ID must start with 'proj_'",
      });
    }

    // IST → UTC
    const istOffsetMs = 5.5 * 60 * 60 * 1000;

    const startDt = new Date(`${startDate}T00:00:00Z`);
    const endDt = new Date(`${endDate}T00:00:00Z`);
    endDt.setDate(endDt.getDate() + 1);

    startDt.setTime(startDt.getTime() - istOffsetMs);
    endDt.setTime(endDt.getTime() - istOffsetMs);

    const startTime = Math.floor(startDt.getTime() / 1000);
    const endTime = Math.floor(endDt.getTime() / 1000) - 1;

    const days =
      Math.floor(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1;

    const data = await fetchUsage(startTime, endTime, days, OPENAI_ADMIN_KEY);

    // Validate that we got data back
    if (!data || typeof data !== "object") {
      console.error("[handleTokenUsage] Invalid response from OpenAI API");
      throw new Error("Invalid response format from OpenAI API");
    }

    console.log("[handleTokenUsage] Processing API response, data.data type:", Array.isArray(data.data) ? "array" : typeof data.data);

    const allDates = getAllDates(startDate, endDate);
    const dailyUsageMap = new Map<string, DailyUsage>();
    const dailyRequestMap = new Map<string, number>();

    let totalTokensRaw = 0;
    let totalRequests = 0;

    for (const day of allDates) {
      dailyUsageMap.set(day, { day, tokens: 0, cost: 0 });
      dailyRequestMap.set(day, 0);
    }

    // Safely iterate through data
    const buckets = Array.isArray(data.data) ? data.data : [];
    console.log("[handleTokenUsage] Processing", buckets.length, "buckets from OpenAI API");

    for (const bucket of buckets) {
      if (!bucket || typeof bucket !== "object") {
        console.warn("[handleTokenUsage] Skipping invalid bucket:", bucket);
        continue;
      }

      // Validate bucket structure
      if (!bucket.start_time && bucket.start_time !== 0) {
        console.warn("[handleTokenUsage] Bucket missing start_time:", bucket);
        continue;
      }

      const day = tsToDate(bucket.start_time);
      console.log("[handleTokenUsage] Processing bucket for day:", day);

      // Check if day is in our expected date range
      if (!dailyUsageMap.has(day)) {
        console.warn("[handleTokenUsage] Bucket date outside requested range:", day);
        continue;
      }

      const results = Array.isArray(bucket.results) ? bucket.results : [];

      for (const r of results) {
        if (!r || typeof r !== "object") {
          console.warn("[handleTokenUsage] Skipping invalid result:", r);
          continue;
        }

        if (r.project_id !== projectId) {
          continue;
        }

        const rawTokens =
          Number(r.input_tokens || 0) + Number(r.output_tokens || 0);

        const displayTokens = rawTokens * TOKEN_MULTIPLIER;
        const cost = displayTokens * COST_PER_TOKEN;
        const requests = Number(r.num_requests || 0);

        totalTokensRaw += displayTokens;
        totalRequests += requests;

        // Safely get and update daily usage
        const du = dailyUsageMap.get(day);
        if (du) {
          du.tokens += displayTokens;
          du.cost += cost;
        }

        // Update daily requests
        dailyRequestMap.set(day, (dailyRequestMap.get(day) || 0) + requests);

        console.log("[handleTokenUsage] Updated day", day, '- tokens:', displayTokens, 'requests:', requests);
      }
    }

    const response: UsageResponse = {
      totalTokens: Math.round(totalTokensRaw),
      totalCost: Number((totalTokensRaw * COST_PER_TOKEN).toFixed(6)),
      totalRequests,
      responsesAndChatCompletions: totalRequests,
      startDate,
      endDate,
      dailyUsage: [...dailyUsageMap.values()].map((d) => ({
        ...d,
        tokens: Math.round(d.tokens),
        cost: Number(d.cost.toFixed(6)),
      })),
      dailyRequests: [...dailyRequestMap.entries()].map(([day, requests]) => ({
        day,
        requests,
      })),
    };

    console.log("[handleTokenUsage] Success, sending response");
    return res.json(response);
  } catch (err: any) {
    console.error("[handleTokenUsage] ❌ Error caught:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      status: err.status,
    });

    // Provide specific error messages based on error type
    let errorMessage = "Failed to fetch token usage";
    let details = err.message;

    if (err.message?.includes("unauthorized") || err.message?.includes("401")) {
      errorMessage = "Invalid OpenAI API key - please verify your credentials";
      details = "The OpenAI API key configuration is incorrect or has expired";
    } else if (err.message?.includes("not found") || err.message?.includes("404")) {
      errorMessage = "Project not found in your OpenAI organization";
      details = "Verify that the project ID is correct and belongs to your organization";
    } else if (err.message?.includes("rate limit") || err.message?.includes("429")) {
      errorMessage = "API rate limit exceeded";
      details = "Please wait a moment and try again";
    } else if (err.message?.includes("Cannot read properties of undefined")) {
      errorMessage = "Failed to process API response";
      details = "The response format from OpenAI was unexpected - check the server logs";
    }

    console.error("[handleTokenUsage] Returning error to client:", { errorMessage, details });

    return res.status(500).json({
      error: errorMessage,
      details: details,
    });
  }
};
