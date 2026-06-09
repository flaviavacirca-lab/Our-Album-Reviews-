import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { searchAlbums, getAlbumTracks } from "../lib/spotify.js";
import { startReview, getRoomReviews } from "../lib/room.js";
import { useRealtime } from "../hooks/useRealtime.js";
import Scoring from "./Scoring.jsx";
import Comparison from "./Comparison.jsx";

export default function Room({ user }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [partner, setPartner] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeReview, setActiveReview] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [viewingComparison, setViewingComparison] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: roomData } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();
      if (!roomData) { navigate("/"); return; }
      setRoom(roomData);

      const partnerId = roomData.created_by === user.id ? roomData.partner_id : roomData.created_by;
      if (partnerId) {
        const { data: partnerData } = await supabase
          .from("users")
          .select("*")
          .eq("id", partnerId)
          .single();
        setPartner(partnerData);
      }

      const revs = await getRoomReviews(roomId);
      setReviews(revs);
    }
    load();
  }, [roomId, user.id, navigate]);

  const handleRoomChange = useCallback((payload) => {
    if (payload.new) setRoom(payload.new);
  }, []);

  useRealtime("rooms", `id=eq.${roomId}`, handleRoomChange);

  const handleReviewChange = useCallback(() => {
    getRoomReviews(roomId).then(setReviews);
  }, [roomId]);

  useRealtime("reviews", `room_id=eq.${roomId}`, handleReviewChange);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const albums = await searchAlbums(query);
        setResults(albums);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectAlbum = async (album) => {
    const review = await startReview(roomId, album);
    const { tracks: albumTracks } = await getAlbumTracks(album.id);
    setTracks(albumTracks);
    setActiveReview(review);
    setQuery("");
    setResults([]);
  };

  const handleResumeReview = async (review) => {
    const { tracks: albumTracks } = await getAlbumTracks(review.album_id);
    setTracks(albumTracks);
    setActiveReview(review);
    setViewingComparison(null);
  };

  if (viewingComparison) {
    return (
      <Comparison
        review={viewingComparison}
        user={user}
        partner={partner}
        room={room}
        onBack={() => setViewingComparison(null)}
      />
    );
  }

  if (activeReview) {
    return (
      <Scoring
        review={activeReview}
        tracks={tracks}
        user={user}
        partner={partner}
        room={room}
        onBack={() => { setActiveReview(null); handleReviewChange(); }}
        onViewComparison={() => {
          setViewingComparison(activeReview);
          setActiveReview(null);
        }}
      />
    );
  }

  return (
    <div className="room-page">
      <header className="app-header">
        <button className="btn-sm btn-ghost" onClick={() => navigate("/")}>← Back</button>
        <div className="room-header-info">
          <h2>Room {room?.code}</h2>
          {partner ? (
            <span className="badge badge-paired">
              With {partner.display_name}
            </span>
          ) : (
            <span className="badge badge-waiting">Waiting for partner</span>
          )}
        </div>
      </header>

      {!partner && room && (
        <div className="share-code-banner">
          <p>Share this code with your partner:</p>
          <div className="big-code" onClick={() => navigator.clipboard?.writeText(room.code)}>
            {room.code}
          </div>
          <small>Tap to copy</small>
        </div>
      )}

      <section className="search-section">
        <h3>Search for an album</h3>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Album or artist name..."
          className="input-search"
        />
        {searching && <div className="spinner-sm" />}
        {results.length > 0 && (
          <div className="album-results">
            {results.map((album) => (
              <button
                key={album.id}
                className="album-card"
                onClick={() => handleSelectAlbum(album)}
              >
                {album.images?.[1] && (
                  <img src={album.images[1].url} alt="" className="album-thumb" />
                )}
                <div className="album-info">
                  <strong>{album.name}</strong>
                  <span>{album.artists.map((a) => a.name).join(", ")}</span>
                  <span className="album-year">
                    {album.release_date?.split("-")[0]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {reviews.length > 0 && (
        <section className="reviews-section">
          <h3>Album History</h3>
          <div className="review-list">
            {reviews.map((rev) => (
              <div key={rev.id} className="review-card">
                {rev.album_image && (
                  <img src={rev.album_image} alt="" className="review-thumb" />
                )}
                <div className="review-info">
                  <strong>{rev.album_name}</strong>
                  <span>{rev.artist_name}</span>
                  <span className="review-date">
                    {new Date(rev.started_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="review-actions">
                  {rev.completed ? (
                    <button
                      className="btn-sm btn-secondary"
                      onClick={() => setViewingComparison(rev)}
                    >
                      Compare
                    </button>
                  ) : (
                    <button
                      className="btn-sm btn-primary"
                      onClick={() => handleResumeReview(rev)}
                    >
                      Continue
                    </button>
                  )}
                  <button
                    className="btn-sm btn-ghost"
                    onClick={() => setViewingComparison(rev)}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
