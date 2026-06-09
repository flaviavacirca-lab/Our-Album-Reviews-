const API_BASE = "https://api.spotify.com/v1";

function getToken() {
  return localStorage.getItem("spotify_access_token");
}

async function apiFetch(path) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    throw new Error("Token expired");
  }
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);
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
