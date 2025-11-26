export default async function handler(req, res) {
  // CORS headers for ALL responses
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body =
      req.body && Object.keys(req.body).length
        ? req.body
        : await getRawBody(req);

    const apiUrl = process.env.API_URL;
    const apiKey = process.env.RETOOL_KEY;

    if (!apiUrl || !apiKey) {
      return res.status(500).json({
        error: "Missing API_URL or RETOOL_KEY env vars",
      });
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Workflow-Api-Key": apiKey,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    return res.status(response.status).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}
