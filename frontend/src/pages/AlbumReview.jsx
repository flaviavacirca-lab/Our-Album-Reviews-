import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { getAlbumTracks } from "../lib/spotify.js";
import { getReviewScores, upsertScore, getAllUsers } from "../lib/room.js";
import { useRealtime } from "../hooks/useRealtime.js";

const CATEGORIES = [
  { key: "catchiness", label: "Catch" },
  { key: "singability", label: "Sing" },
  { key: "lyrics", label: "Lyrics" },
  { key: "transition", label: "Flow" },
];

export default function AlbumReview({ user }) {
  const { reviewId } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [scores, setScores] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function load() {
      const { data: rev } = await supabase
        .from("reviews")
        .select("*")
        .eq("id", reviewId)
        .single();

      if (!rev) { navigate("/"); return; }
      setReview(rev);

      const { tracks: albumTracks } = await getAlbumTracks(rev.album_id);
      setTracks(albumTracks);

      const [scoresData, usersData] = await Promise.all([
        getReviewScores(reviewId),
        getAllUsers(),
      ]);
      setScores(scoresData);
      setUsers(usersData);
    }
    load();
  }, [reviewId, navigate]);

  const refreshScores = useCallback(() => {
    getReviewScores(reviewId).then(setScores);
  }, [reviewId]);

  useRealtime("scores", `review_id=eq.${reviewId}`, refreshScores);

  const partner = users.find((u) => u.id !== user.id);

  function getScore(trackId, userId, category) {
    const s = scores.find(
      (sc) => sc.track_id === trackId && sc.user_id === userId
    );
    return s?.[category] || "";
  }

  async function handleScoreChange(track, category, value) {
    const num = parseInt(value);
    if (value !== "" && (isNaN(num) || num < 1 || num > 5)) return;

    const existing = scores.find(
      (s) => s.track_id === track.id && s.user_id === user.id
    );
    const currentScores = {
      catchiness: existing?.catchiness || null,
      singability: existing?.singability || null,
      lyrics: existing?.lyrics || null,
      transition: existing?.transition || null,
    };
    currentScores[category] = value === "" ? null : num;

    setScores((prev) => {
      const without = prev.filter(
        (s) => !(s.track_id === track.id && s.user_id === user.id)
      );
      return [
        ...without,
        {
          ...existing,
          review_id: reviewId,
          user_id: user.id,
          track_id: track.id,
          track_name: track.name,
          track_number: track.track_number,
          ...currentScores,
        },
      ];
    });

    await upsertScore(reviewId, user.id, track, currentScores);
  }

  function openInSpotify(track) {
    const url = track.external_urls?.spotify;
    if (url) window.open(url, "_blank");
  }

  function trackAvg(trackId, userId) {
    const s = scores.find(
      (sc) => sc.track_id === trackId && sc.user_id === userId
    );
    if (!s) return null;
    const vals = CATEGORIES.map((c) => s[c.key]).filter((v) => v != null);
    if (!vals.length) return null;
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  }

  if (!review) {
    return <div className="loading-page"><div className="loader" /></div>;
  }

  const partnerName = partner?.display_name?.split(" ")[0];

  return (
    <div className="review-page">
      <header className="review-header">
        <button className="btn-back" onClick={() => navigate("/")}>←</button>
        <div className="review-album-info">
          {review.album_image && (
            <img src={review.album_image} alt="" className="review-album-art" />
          )}
          <div>
            <h1>{review.album_name}</h1>
            <p>{review.artist_name}</p>
          </div>
        </div>
      </header>

      <div className="spreadsheet-wrap">
        <table className="sheet">
          <thead>
            <tr>
              <th className="th-track">#</th>
              <th className="th-name">Track</th>
              {CATEGORIES.map((cat) => (
                <th key={cat.key} className="th-score" colSpan={partner ? 2 : 1}>
                  {cat.label}
                </th>
              ))}
              <th className="th-score" colSpan={partner ? 2 : 1}>Avg</th>
            </tr>
            {partner && (
              <tr className="row-who">
                <th></th>
                <th></th>
                {CATEGORIES.map((cat) => (
                  <React.Fragment key={cat.key}>
                    <th className="who you">You</th>
                    <th className="who them">{partnerName}</th>
                  </React.Fragment>
                ))}
                <th className="who you">You</th>
                <th className="who them">{partnerName}</th>
              </tr>
            )}
          </thead>
          <tbody>
            {tracks.map((track) => {
              const myAvg = trackAvg(track.id, user.id);
              const pAvg = partner ? trackAvg(track.id, partner.id) : null;

              return (
                <tr key={track.id}>
                  <td className="td-num">{track.track_number}</td>
                  <td className="td-name">
                    <button
                      className="play-link"
                      onClick={() => openInSpotify(track)}
                      title="Open in Spotify"
                    >
                      <span className="play-icon">▶</span>
                      {track.name}
                    </button>
                  </td>

                  {CATEGORIES.map((cat) => (
                    <React.Fragment key={cat.key}>
                      <td className="td-score">
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={getScore(track.id, user.id, cat.key)}
                          onChange={(e) => handleScoreChange(track, cat.key, e.target.value)}
                          className="inp you"
                          placeholder="–"
                        />
                      </td>
                      {partner && (
                        <td className="td-score">
                          <span className="val them">
                            {getScore(track.id, partner.id, cat.key) || "–"}
                          </span>
                        </td>
                      )}
                    </React.Fragment>
                  ))}

                  <td className="td-score">
                    <span className="val avg you">{myAvg || "–"}</span>
                  </td>
                  {partner && (
                    <td className="td-score">
                      <span className="val avg them">{pAvg || "–"}</span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="review-footer">
        <div className="legend">
          <span className="legend-you">● You</span>
          {partner && <span className="legend-them">● {partnerName}</span>}
        </div>
        <span className="guide">1 = nah · 5 = banger</span>
      </footer>
    </div>
  );
}
