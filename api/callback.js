const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "906bc4bbefad4eb9bea5c580b633bb3d";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "405dbf6c25da4d77923d1297e386628b";
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || "http://127.0.0.1:8000/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://127.0.0.1:5173";

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(302, `${FRONTEND_URL}?error=${encodeURIComponent(error)}`);
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
      return res.redirect(302, `${FRONTEND_URL}?error=${encodeURIComponent(tokens.error_description || tokens.error)}`);
    }

    const params = new URLSearchParams({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    });
    res.redirect(302, `${FRONTEND_URL}/auth-callback?${params}`);
  } catch {
    res.redirect(302, `${FRONTEND_URL}?error=token_exchange_failed`);
  }
}
