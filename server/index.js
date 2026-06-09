import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: "http://127.0.0.1:5173", credentials: true }));
app.use(express.json());

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "906bc4bbefad4eb9bea5c580b633bb3d";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "405dbf6c25da4d77923d1297e386628b";
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || "http://127.0.0.1:8000/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://127.0.0.1:5173";

app.get("/login", (_req, res) => {
  const scopes = "user-read-email user-read-private";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: scopes,
    redirect_uri: SPOTIFY_REDIRECT_URI,
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

app.get("/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.redirect(`${FRONTEND_URL}?error=${encodeURIComponent(error)}`);
  }

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
      }),
    });

    const tokens = await tokenRes.json();
    if (tokens.error) {
      return res.redirect(`${FRONTEND_URL}?error=${encodeURIComponent(tokens.error_description || tokens.error)}`);
    }

    const params = new URLSearchParams({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    });
    res.redirect(`${FRONTEND_URL}/auth-callback?${params}`);
  } catch (err) {
    res.redirect(`${FRONTEND_URL}?error=token_exchange_failed`);
  }
});

app.post("/api/refresh", async (req, res) => {
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
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`OAuth server running on http://127.0.0.1:${PORT}`));
