import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { searchAlbums, getAlbumTracks } from "../lib/spotify.js";
import { startReview, getAllReviews } from "../lib/room.js";

export default function Home({ user, spotifyUser, onLogout }) {
  const [reviews, setReviews] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    getAllReviews().then(setReviews);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        setError("");
        setResults(await searchAlbums(query));
      } catch (err) {
        setResults([]);
        setError(err.message);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectAlbum = async (album) => {
    const review = await startReview(album);
    navigate(`/review/${review.id}`);
  };

  return (
    <div className="home-page">
      <header className="app-header">
        <div className="header-left">
          <span className="header-logo">♫</span>
          <h1>Our Albums</h1>
        </div>
        <div className="user-info">
          {spotifyUser?.images?.[0] && (
            <img src={spotifyUser.images[0].url} alt="" className="avatar" />
          )}
          <span className="user-name">{spotifyUser?.display_name}</span>
          <button className="btn-ghost" onClick={onLogout}>Log out</button>
        </div>
      </header>

      <main className="home-main">
        <section className="search-section">
          <h2>What are we listening to?</h2>
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for an album or artist..."
              className="search-input"
              autoFocus
            />
            {searching && <div className="search-spinner" />}
          </div>
          {error && <p className="search-error">{error}</p>}

          {results.length > 0 && (
            <div className="album-grid">
              {results.map((album) => (
                <button
                  key={album.id}
                  className="album-card"
                  onClick={() => handleSelectAlbum(album)}
                >
                  <div className="album-art-wrap">
                    {album.images?.[1] ? (
                      <img src={album.images[1].url} alt="" className="album-art" />
                    ) : (
                      <div className="album-art-placeholder">♫</div>
                    )}
                  </div>
                  <div className="album-meta">
                    <span className="album-title">{album.name}</span>
                    <span className="album-artist">
                      {album.artists.map((a) => a.name).join(", ")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {reviews.length > 0 && (
          <section className="history-section">
            <h2>Previously reviewed</h2>
            <div className="history-list">
              {reviews.map((rev) => (
                <button
                  key={rev.id}
                  className="history-card"
                  onClick={() => navigate(`/review/${rev.id}`)}
                >
                  {rev.album_image && (
                    <img src={rev.album_image} alt="" className="history-art" />
                  )}
                  <div className="history-meta">
                    <span className="history-title">{rev.album_name}</span>
                    <span className="history-artist">{rev.artist_name}</span>
                  </div>
                  <span className="history-date">
                    {new Date(rev.started_at).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
