import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const apiKey = process.env.OPENAI_ADMIN_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API key missing" });
    }

    const response = await fetch(
      "https://api.openai.com/v1/organization/usage/completions?group_by=project_id",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    console.log("OPENAI RAW DATA:", data);

    const usage = data?.data || [];

    let totalTokens = 0;
    let totalCost = 0;

    usage.forEach((item: any) => {
      totalTokens += item?.n_tokens_total || 0;
      totalCost += item?.cost || 0;
    });

    return res.status(200).json({
      totalTokens,
      totalCost,
      count: usage.length,
      startDate: new Date().toISOString(), // ✅ always valid
      endDate: new Date().toISOString(),   // ✅ always valid
      usage: usage || [],                  // ✅ safe fallback
    });

  } catch (error) {
    console.error("ERROR:", error);
    return res.status(500).json({
      error: "Server error",
      totalTokens: 0,
      totalCost: 0,
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      usage: [],
    });
  }
}