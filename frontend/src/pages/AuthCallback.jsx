import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AuthCallback({ onAuth }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken) {
      localStorage.setItem("spotify_access_token", accessToken);
      if (refreshToken) localStorage.setItem("spotify_refresh_token", refreshToken);
      onAuth();
      navigate("/", { replace: true });
    } else {
      navigate("/?error=auth_failed", { replace: true });
    }
  }, [params, navigate, onAuth]);

  return (
    <div className="loading-page">
      <div className="spinner" />
      <p>Logging you in...</p>
    </div>
  );
}
