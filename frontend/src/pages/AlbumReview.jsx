import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { getAlbumTracks } from "../lib/spotify.js";
import {
  getReviewScores,
  upsertScore,
  getAllUsers,
  getDisagrees,
  toggleDisagree,
} from "../lib/room.js";
import { useRealtime } from "../hooks/useRealtime.js";

const CATEGORIES = [
  { key: "catchiness", label: "Catch", emoji: "🪝" },
  { key: "singability", label: "Sing", emoji: "🎤" },
  { key: "lyrics", label: "Lyrics", emoji: "📝" },
  { key: "transition", label: "Trans", emoji: "🔀" },
];

export default function AlbumReview({ user }) {
  const { reviewId } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [scores, setScores] = useState([]);
  const [disagrees, setDisagrees] = useState([]);
  const [users, setUsers] = useState([]);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const audioRef = useRef(null);

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

      const [scoresData, usersData, disagreesData] = await Promise.all([
        getReviewScores(reviewId),
        getAllUsers(),
        getDisagrees(reviewId),
      ]);
      setScores(scoresData);
      setUsers(usersData);
      setDisagrees(disagreesData);
    }
    load();
  }, [reviewId, navigate]);

  const refreshScores = useCallback(() => {
    getReviewScores(reviewId).then(setScores);
  }, [reviewId]);

  const refreshDisagrees = useCallback(() => {
    getDisagrees(reviewId).then(setDisagrees);
  }, [reviewId]);

  useRealtime("scores", `review_id=eq.${reviewId}`, refreshScores);
  useRealtime("disagrees", `review_id=eq.${reviewId}`, refreshDisagrees);

  const partner = users.find((u) => u.id !== user.id);

  function getScore(trackId, userId, category) {
    const s = scores.find(
      (sc) => sc.track_id === trackId && sc.user_id === userId
    );
    return s?.[category] || "";
  }

  function hasDisagree(trackId, userId) {
    return disagrees.some(
      (d) => d.track_id === trackId && d.user_id === userId
    );
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

  async function handleDisagree(trackId) {
    const nowDisagreed = await toggleDisagree(reviewId, trackId, user.id);
    setDisagrees((prev) => {
      if (nowDisagreed) {
        return [...prev, { review_id: reviewId, track_id: trackId, user_id: user.id }];
      }
      return prev.filter(
        (d) => !(d.track_id === trackId && d.user_id === user.id)
      );
    });
  }

  function playPreview(track) {
    if (!track.preview_url) return;

    if (playingTrackId === track.id) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
      return;
    }

    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(track.preview_url);
    audio.volume = 0.5;
    audio.play();
    audio.onended = () => setPlayingTrackId(null);
    audioRef.current = audio;
    setPlayingTrackId(track.id);
  }

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

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

  return (
    <div className="review-page">
      <header className="review-header">
        <button className="btn-back" onClick={() => navigate("/")}>← Back</button>
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

      <div className="spreadsheet-container">
        <table className="spreadsheet">
          <thead>
            <tr>
              <th className="col-track">Track</th>
              {CATEGORIES.map((cat) => (
                <th key={cat.key} className="col-score" title={cat.key}>
                  <span className="cat-emoji">{cat.emoji}</span>
                  <span className="cat-label">{cat.label}</span>
                </th>
              ))}
              <th className="col-avg">Avg</th>
              <th className="col-disagree"></th>
            </tr>
            {partner && (
              <tr className="user-labels-row">
                <td></td>
                {CATEGORIES.map((cat) => (
                  <td key={cat.key} className="user-label-cell">
                    <span className="user-label you">You</span>
                    <span className="user-label them">{partner.display_name.split(" ")[0]}</span>
                  </td>
                ))}
                <td className="user-label-cell">
                  <span className="user-label you">You</span>
                  <span className="user-label them">{partner.display_name.split(" ")[0]}</span>
                </td>
                <td></td>
              </tr>
            )}
          </thead>
          <tbody>
            {tracks.map((track) => {
              const myAvg = trackAvg(track.id, user.id);
              const partnerAvg = partner ? trackAvg(track.id, partner.id) : null;
              const iDisagreed = hasDisagree(track.id, user.id);
              const partnerDisagreed = partner && hasDisagree(track.id, partner.id);
              const isPlaying = playingTrackId === track.id;

              return (
                <tr key={track.id} className={partnerDisagreed ? "row-disagreed" : ""}>
                  <td className="col-track">
                    <button
                      className={`track-play-btn ${isPlaying ? "playing" : ""} ${!track.preview_url ? "no-preview" : ""}`}
                      onClick={() => playPreview(track)}
                      disabled={!track.preview_url}
                      title={track.preview_url ? (isPlaying ? "Pause" : "Play preview") : "No preview available"}
                    >
                      {isPlaying ? "⏸" : "▶"}
                    </button>
                    <div className="track-info">
                      <span className="track-number">{track.track_number}</span>
                      <span className="track-name">{track.name}</span>
                    </div>
                  </td>

                  {CATEGORIES.map((cat) => (
                    <td key={cat.key} className="col-score">
                      <div className="score-pair">
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={getScore(track.id, user.id, cat.key)}
                          onChange={(e) => handleScoreChange(track, cat.key, e.target.value)}
                          className="score-input you"
                          placeholder="–"
                        />
                        {partner && (
                          <span className="score-display them">
                            {getScore(track.id, partner.id, cat.key) || "–"}
                          </span>
                        )}
                      </div>
                    </td>
                  ))}

                  <td className="col-avg">
                    <div className="avg-pair">
                      <span className="avg-val you">{myAvg || "–"}</span>
                      {partner && (
                        <span className="avg-val them">{partnerAvg || "–"}</span>
                      )}
                    </div>
                  </td>

                  <td className="col-disagree">
                    <button
                      className={`disagree-btn ${iDisagreed ? "active" : ""}`}
                      onClick={() => handleDisagree(track.id)}
                      title={iDisagreed ? "You disagree!" : "Disagree with this score?"}
                    >
                      👎
                    </button>
                    {partnerDisagreed && (
                      <span className="partner-disagree" title={`${partner.display_name} disagrees!`}>
                        🔥
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="review-footer">
        <div className="legend">
          <span className="legend-item you">■ You</span>
          {partner && (
            <span className="legend-item them">■ {partner.display_name.split(" ")[0]}</span>
          )}
        </div>
        <div className="scoring-guide">1 = nah · 5 = absolute banger</div>
      </div>
    </div>
  );
}
