const API_BASE = "https://api.spotify.com/v1";
const SERVER_URL = "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("spotify_access_token");
}

async function refreshToken() {
  const refresh = localStorage.getItem("spotify_refresh_token");
  if (!refresh) throw new Error("No refresh token");

  const res = await fetch(`${SERVER_URL}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });

  const data = await res.json();
  if (data.access_token) {
    localStorage.setItem("spotify_access_token", data.access_token);
    if (data.refresh_token) {
      localStorage.setItem("spotify_refresh_token", data.refresh_token);
    }
    return data.access_token;
  }
  throw new Error("Refresh failed");
}

async function apiFetch(path, retried = false) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 && !retried) {
    await refreshToken();
    return apiFetch(path, true);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Spotify API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function searchAlbums(query) {
  if (!query.trim()) return [];
  const data = await apiFetch(`/search?type=album&q=${encodeURIComponent(query)}&limit=12`);
  return data.albums.items;
}

export async function getAlbumTracks(albumId) {
  const data = await apiFetch(`/albums/${albumId}`);
  return {
    album: data,
    tracks: data.tracks.items,
  };
}

export async function getCurrentUser() {
  return apiFetch("/me");
}
