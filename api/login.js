const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "906bc4bbefad4eb9bea5c580b633bb3d";
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || "http://127.0.0.1:8000/callback";

export default function handler(req, res) {
  const scopes = "user-read-email user-read-private";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: scopes,
    redirect_uri: SPOTIFY_REDIRECT_URI,
  });
  res.redirect(302, `https://accounts.spotify.com/authorize?${params}`);
}
