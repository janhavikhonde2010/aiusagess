export default async function handler(req, res) {
  try {
    const apiKey = process.env.OPENAI_ADMIN_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API key missing" });
    }

    const { projectId, startDate, endDate } = req.body || {};

    const response = await fetch(
      `https://api.openai.com/v1/organization/usage/completions?group_by=project_id`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    console.error("ERROR:", error);
    return res.status(500).json({ error: "Server error" });
  }
}