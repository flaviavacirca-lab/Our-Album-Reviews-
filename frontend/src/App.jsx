import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth.js";
import Login from "./pages/Login.jsx";
import AuthCallback from "./pages/AuthCallback.jsx";
import Home from "./pages/Home.jsx";
import AlbumReview from "./pages/AlbumReview.jsx";

export default function App() {
  const { spotifyUser, dbUser, loading, login, logout, refresh } = useAuth();

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loader" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth-callback" element={<AuthCallback onAuth={refresh} />} />
        {!dbUser ? (
          <Route path="*" element={<Login onLogin={login} />} />
        ) : (
          <>
            <Route
              path="/"
              element={<Home user={dbUser} spotifyUser={spotifyUser} onLogout={logout} />}
            />
            <Route
              path="/review/:reviewId"
              element={<AlbumReview user={dbUser} />}
            />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}
