// api/proxy-chat.js
// Node Serverless function for Vercel
// - Accepts POST at /api/proxy-chat
// - Forwards body to RETOOL workflow using API key from env

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*"); // Lock this down in prod
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // read body (Vercel usually parses JSON into req.body for application/json)
    const body =
      req.body && Object.keys(req.body).length
        ? req.body
        : await getRawBody(req);

    const apiUrl = process.env.API_URL;
    const apiKey = process.env.RETOOL_KEY;

    if (!apiUrl || !apiKey) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res
        .status(500)
        .json({ error: "Missing API_URL or RETOOL_KEY env vars" });
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Workflow-Api-Key": apiKey,
      },
      body: JSON.stringify(body),
    });

    // Forward status and JSON (try text if JSON parse fails)
    const text = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    res.setHeader("Access-Control-Allow-Origin", "*"); // restrict in production
    return res.status(response.status).json(parsed);
  } catch (err) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({ error: err.message || String(err) });
  }
}

// helper: fallback to raw body if req.body is empty
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        return resolve(JSON.parse(data || "{}"));
      } catch {
        return resolve(data || {});
      }
    });
    req.on("error", reject);
  });
}
