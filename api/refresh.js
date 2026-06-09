const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "906bc4bbefad4eb9bea5c580b633bb3d";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "405dbf6c25da4d77923d1297e386628b";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ error: "refresh_token required" });
  }

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
      }),
    });

    const tokens = await tokenRes.json();
    res.json(tokens);
  } catch {
    res.status(500).json({ error: "refresh_failed" });
  }
}
