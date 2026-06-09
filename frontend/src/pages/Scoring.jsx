import { useState, useEffect, useCallback } from "react";
import StarRating from "../components/StarRating.jsx";
import { upsertScore, getReviewScores, markReviewComplete } from "../lib/room.js";
import { useRealtime } from "../hooks/useRealtime.js";

const CATEGORIES = ["catchiness", "singability", "lyrics", "transition"];

export default function Scoring({ review, tracks, user, partner, room, onBack, onViewComparison }) {
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [scores, setScores] = useState({});
  const [allScores, setAllScores] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadScores = useCallback(async () => {
    const data = await getReviewScores(review.id);
    setAllScores(data);

    const myScores = {};
    data
      .filter((s) => s.user_id === user.id)
      .forEach((s) => {
        myScores[s.track_id] = {
          catchiness: s.catchiness,
          singability: s.singability,
          lyrics: s.lyrics,
          transition: s.transition,
        };
      });
    setScores(myScores);
  }, [review.id, user.id]);

  useEffect(() => { loadScores(); }, [loadScores]);

  const handleScoreChange = useCallback(() => { loadScores(); }, [loadScores]);
  useRealtime("scores", `review_id=eq.${review.id}`, handleScoreChange);

  const track = tracks[currentTrackIdx];
  const trackScores = scores[track?.id] || {};

  const handleRate = async (category, value) => {
    const updated = { ...trackScores, [category]: value };
    setScores((prev) => ({ ...prev, [track.id]: updated }));

    setSaving(true);
    try {
      await upsertScore(review.id, user.id, track, updated);
    } finally {
      setSaving(false);
    }
  };

  const allTracksScored = tracks.every((t) => {
    const s = scores[t.id];
    return s && CATEGORIES.every((c) => s[c]);
  });

  const handleFinish = async () => {
    await markReviewComplete(review.id);
    onViewComparison();
  };

  const scoredCount = tracks.filter((t) => {
    const s = scores[t.id];
    return s && CATEGORIES.every((c) => s[c]);
  }).length;

  const partnerScoreCount = tracks.filter((t) =>
    allScores.some((s) => s.track_id === t.id && s.user_id !== user.id)
  ).length;

  return (
    <div className="scoring-page">
      <header className="app-header">
        <button className="btn-sm btn-ghost" onClick={onBack}>← Back</button>
        <div className="scoring-header-info">
          <h2>{review.album_name}</h2>
          <span className="artist-subtitle">{review.artist_name}</span>
        </div>
      </header>

      <div className="scoring-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(scoredCount / tracks.length) * 100}%` }}
          />
        </div>
        <span className="progress-text">
          You: {scoredCount}/{tracks.length}
          {partner && ` · Partner: ${partnerScoreCount}/${tracks.length}`}
        </span>
      </div>

      <div className="track-nav">
        {tracks.map((t, i) => {
          const s = scores[t.id];
          const done = s && CATEGORIES.every((c) => s[c]);
          return (
            <button
              key={t.id}
              className={`track-dot ${i === currentTrackIdx ? "active" : ""} ${done ? "done" : ""}`}
              onClick={() => setCurrentTrackIdx(i)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {track && (
        <div className="track-scoring">
          <div className="track-title">
            <span className="track-num">{track.track_number}.</span>
            <span>{track.name}</span>
            <span className="track-duration">
              {Math.floor(track.duration_ms / 60000)}:
              {String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, "0")}
            </span>
          </div>

          <div className="rating-grid">
            {CATEGORIES.map((cat) => (
              <StarRating
                key={cat}
                label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                value={trackScores[cat] || 0}
                onChange={(val) => handleRate(cat, val)}
              />
            ))}
          </div>

          {saving && <span className="save-indicator">Saving...</span>}

          <div className="track-controls">
            <button
              className="btn-secondary"
              disabled={currentTrackIdx === 0}
              onClick={() => setCurrentTrackIdx((i) => i - 1)}
            >
              ← Prev
            </button>
            {currentTrackIdx < tracks.length - 1 ? (
              <button
                className="btn-primary"
                onClick={() => setCurrentTrackIdx((i) => i + 1)}
              >
                Next →
              </button>
            ) : allTracksScored ? (
              <button className="btn-finish" onClick={handleFinish}>
                Finish Review
              </button>
            ) : (
              <button className="btn-secondary" disabled>
                Score all tracks to finish
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
