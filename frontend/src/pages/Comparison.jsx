import { useState, useEffect, useCallback } from "react";
import { getReviewScores } from "../lib/room.js";
import { useRealtime } from "../hooks/useRealtime.js";

const CATEGORIES = ["catchiness", "singability", "lyrics", "transition"];

function avg(scores, cat) {
  const vals = scores.filter((s) => s[cat] != null).map((s) => s[cat]);
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function overallAvg(scores) {
  const allVals = scores.flatMap((s) =>
    CATEGORIES.map((c) => s[c]).filter((v) => v != null)
  );
  if (!allVals.length) return 0;
  return allVals.reduce((a, b) => a + b, 0) / allVals.length;
}

export default function Comparison({ review, user, partner, room, onBack }) {
  const [allScores, setAllScores] = useState([]);

  const loadScores = useCallback(async () => {
    const data = await getReviewScores(review.id);
    setAllScores(data);
  }, [review.id]);

  useEffect(() => { loadScores(); }, [loadScores]);

  const handleChange = useCallback(() => { loadScores(); }, [loadScores]);
  useRealtime("scores", `review_id=eq.${review.id}`, handleChange);

  const myScores = allScores.filter((s) => s.user_id === user.id);
  const partnerScores = allScores.filter((s) => s.user_id !== user.id);

  const tracks = [...new Set(allScores.map((s) => s.track_id))].map((tid) => {
    const score = allScores.find((s) => s.track_id === tid);
    return { id: tid, name: score.track_name, number: score.track_number };
  }).sort((a, b) => a.number - b.number);

  const myOverall = overallAvg(myScores);
  const partnerOverall = overallAvg(partnerScores);

  return (
    <div className="comparison-page">
      <header className="app-header">
        <button className="btn-sm btn-ghost" onClick={onBack}>← Back</button>
        <div className="comparison-header">
          <h2>{review.album_name}</h2>
          <span className="artist-subtitle">{review.artist_name}</span>
        </div>
      </header>

      <div className="overall-scores">
        <div className="overall-card you">
          <span className="overall-label">You</span>
          <span className="overall-num">{myOverall.toFixed(1)}</span>
        </div>
        {partnerScores.length > 0 && (
          <div className="overall-card partner">
            <span className="overall-label">{partner?.display_name || "Partner"}</span>
            <span className="overall-num">{partnerOverall.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="category-averages">
        {CATEGORIES.map((cat) => {
          const myAvg = avg(myScores, cat);
          const pAvg = avg(partnerScores, cat);
          return (
            <div key={cat} className="cat-row">
              <span className="cat-name">{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
              <div className="cat-bars">
                <div className="cat-bar you" style={{ width: `${(myAvg / 5) * 100}%` }}>
                  {myAvg.toFixed(1)}
                </div>
                {partnerScores.length > 0 && (
                  <div className="cat-bar partner" style={{ width: `${(pAvg / 5) * 100}%` }}>
                    {pAvg.toFixed(1)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="track-comparison">
        <h3>Track by Track</h3>
        {tracks.map((track) => {
          const my = myScores.find((s) => s.track_id === track.id);
          const theirs = partnerScores.find((s) => s.track_id === track.id);
          return (
            <div key={track.id} className="track-compare-row">
              <div className="track-compare-name">
                <span className="track-num">{track.number}.</span>
                {track.name}
              </div>
              <div className="track-compare-scores">
                {CATEGORIES.map((cat) => (
                  <div key={cat} className="score-cell">
                    <span className="score-label">{cat.slice(0, 3)}</span>
                    <span className="score-you">{my?.[cat] ?? "—"}</span>
                    {theirs && <span className="score-partner">{theirs[cat] ?? "—"}</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="comparison-legend">
        <span className="legend-you">■ You</span>
        {partnerScores.length > 0 && (
          <span className="legend-partner">■ {partner?.display_name || "Partner"}</span>
        )}
      </div>
    </div>
  );
}
