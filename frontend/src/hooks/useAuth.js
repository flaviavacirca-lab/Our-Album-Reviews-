import { useState, useEffect, useCallback } from "react";
import { getCurrentUser } from "../lib/spotify.js";
import { ensureUser } from "../lib/room.js";

export function useAuth() {
  const [spotifyUser, setSpotifyUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("spotify_access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const profile = await getCurrentUser();
      setSpotifyUser(profile);
      const user = await ensureUser(profile);
      setDbUser(user);
    } catch {
      localStorage.removeItem("spotify_access_token");
      localStorage.removeItem("spotify_refresh_token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = () => {
    window.location.href = "http://127.0.0.1:8000/login";
  };

  const logout = () => {
    localStorage.removeItem("spotify_access_token");
    localStorage.removeItem("spotify_refresh_token");
    setSpotifyUser(null);
    setDbUser(null);
  };

  return { spotifyUser, dbUser, loading, login, logout, refresh: loadUser };
}
