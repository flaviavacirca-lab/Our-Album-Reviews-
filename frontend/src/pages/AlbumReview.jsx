import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { getAlbumTracks } from "../lib/spotify.js";
import {
  getReviewScores,
  upsertScore,
  getAllUsers,
  getReactions,
  setReaction,
  removeReaction,
} from "../lib/room.js";
import { useRealtime } from "../hooks/useRealtime.js";

const CATEGORIES = [
  { key: "catchiness", label: "Catch" },
  { key: "singability", label: "Sing" },
  { key: "lyrics", label: "Lyrics" },
  { key: "transition", label: "Flow" },
];

const SCORE_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

const REACTION_EMOJIS = ["🔥", "😭", "💀", "🤌", "❤️", "🥱"];

const HOT_TAKE_PROMPTS = [
  "Someone explain themselves...",
  "This needs a discussion!",
  "Are we even listening to the same song?",
  "Couple's therapy incoming",
  "The audacity!",
  "This is grounds for divorce",
];

function pickPrompt(trackId) {
  let hash = 0;
  for (let i = 0; i < trackId.length; i++) hash = ((hash << 5) - hash + trackId.charCodeAt(i)) | 0;
  return HOT_TAKE_PROMPTS[Math.abs(hash) % HOT_TAKE_PROMPTS.length];
}

export default function AlbumReview({ user }) {
  const { reviewId } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [scores, setScores] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [playerTrackId, setPlayerTrackId] = useState(null);
  const [openPicker, setOpenPicker] = useState(null);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: rev } = await supabase
        .from("reviews").select("*").eq("id", reviewId).single();
      if (!rev) { navigate("/"); return; }
      setReview(rev);

      const { tracks: t } = await getAlbumTracks(rev.album_id);
      setTracks(t);

      const [sc, u, rx] = await Promise.all([
        getReviewScores(reviewId),
        getAllUsers(),
        getReactions(reviewId),
      ]);
      setScores(sc);
      setUsers(u);
      setReactions(rx);
    }
    load();
  }, [reviewId, navigate]);

  const refreshScores = useCallback(() => {
    getReviewScores(reviewId).then(setScores);
  }, [reviewId]);

  const refreshReactions = useCallback(() => {
    getReactions(reviewId).then(setReactions);
  }, [reviewId]);

  useRealtime("scores", `review_id=eq.${reviewId}`, refreshScores);
  useRealtime("reactions", `review_id=eq.${reviewId}`, refreshReactions);

  const partner = users.find((u) => u.id !== user.id);
  const partnerName = partner?.display_name?.split(" ")[0];

  function getScore(trackId, userId, cat) {
    const s = scores.find((sc) => sc.track_id === trackId && sc.user_id === userId);
    return s?.[cat] ?? null;
  }

  function bothScored(trackId, cat) {
    if (!partner) return true;
    return getScore(trackId, user.id, cat) != null && getScore(trackId, partner.id, cat) != null;
  }

  function allCatsScored(trackId) {
    return CATEGORIES.every((c) => bothScored(trackId, c.key));
  }

  function hotTakeDiff(trackId) {
    if (!partner) return 0;
    let maxDiff = 0;
    for (const c of CATEGORIES) {
      const mine = getScore(trackId, user.id, c.key);
      const theirs = getScore(trackId, partner.id, c.key);
      if (mine != null && theirs != null) {
        maxDiff = Math.max(maxDiff, Math.abs(mine - theirs));
      }
    }
    return maxDiff;
  }

  async function handleScore(track, cat, value) {
    const existing = scores.find((s) => s.track_id === track.id && s.user_id === user.id);
    const cur = {
      catchiness: existing?.catchiness ?? null,
      singability: existing?.singability ?? null,
      lyrics: existing?.lyrics ?? null,
      transition: existing?.transition ?? null,
    };
    cur[cat] = value;

    setScores((prev) => {
      const without = prev.filter((s) => !(s.track_id === track.id && s.user_id === user.id));
      return [...without, {
        ...existing, review_id: reviewId, user_id: user.id,
        track_id: track.id, track_name: track.name,
        track_number: track.track_number, ...cur,
      }];
    });

    await upsertScore(reviewId, user.id, track, cur);
  }

  async function handleReaction(trackId, emoji) {
    const existing = reactions.find(
      (r) => r.track_id === trackId && r.user_id === user.id && r.emoji === emoji
    );

    if (existing) {
      setReactions((prev) => prev.filter((r) => r !== existing));
      setOpenPicker(null);
      await removeReaction(reviewId, trackId, user.id, emoji);
    } else {
      setReactions((prev) => [
        ...prev,
        { review_id: reviewId, track_id: trackId, user_id: user.id, emoji },
      ]);
      setOpenPicker(null);
      await setReaction(reviewId, trackId, user.id, emoji);
    }
  }

  function getReactionsForUser(trackId, userId) {
    return reactions
      .filter((r) => r.track_id === trackId && r.user_id === userId)
      .map((r) => r.emoji);
  }

  function trackAvg(trackId, userId) {
    const s = scores.find((sc) => sc.track_id === trackId && sc.user_id === userId);
    if (!s) return null;
    const vals = CATEGORIES.map((c) => s[c.key]).filter((v) => v != null);
    if (!vals.length) return null;
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  }

  function togglePlayer(trackId) {
    setPlayerTrackId((prev) => (prev === trackId ? null : trackId));
  }

  // Summary stats
  const allDone = partner && tracks.length > 0 && tracks.every((t) => allCatsScored(t.id));

  function summaryStats() {
    if (!partner) return null;

    let myTotal = 0, pTotal = 0, myCount = 0, pCount = 0;
    let bestTrack = null, bestAvg = 0;
    let hottestTrack = null, hottestDiff = 0;

    for (const t of tracks) {
      const myA = trackAvg(t.id, user.id);
      const pA = trackAvg(t.id, partner.id);
      if (myA) { myTotal += parseFloat(myA); myCount++; }
      if (pA) { pTotal += parseFloat(pA); pCount++; }

      const combined = (parseFloat(myA || 0) + parseFloat(pA || 0)) / 2;
      if (combined > bestAvg) { bestAvg = combined; bestTrack = t; }

      const diff = hotTakeDiff(t.id);
      if (diff > hottestDiff) { hottestDiff = diff; hottestTrack = t; }
    }

    const myAvg = myCount ? (myTotal / myCount).toFixed(1) : "–";
    const pAvg = pCount ? (pTotal / pCount).toFixed(1) : "–";

    let agreement = 0, total = 0;
    for (const t of tracks) {
      for (const c of CATEGORIES) {
        const m = getScore(t.id, user.id, c.key);
        const p = getScore(t.id, partner.id, c.key);
        if (m != null && p != null) {
          agreement += 5 - Math.abs(m - p);
          total += 5;
        }
      }
    }
    const compat = total ? Math.round((agreement / total) * 100) : 0;

    return { myAvg, pAvg, bestTrack, hottestTrack, hottestDiff, compat };
  }

  if (!review) {
    return <div className="loading-page"><div className="loader" /></div>;
  }

  const stats = allDone ? summaryStats() : null;

  return (
    <div className="review-page">
      <header className="review-header">
        <button className="btn-back" onClick={() => navigate("/")}>←</button>
        <div className="review-album-info">
          {review.album_image && (
            <img src={review.album_image} alt="" className="review-album-art" />
          )}
          <div className="review-album-text">
            <h1>{review.album_name}</h1>
            <p>{review.artist_name}</p>
          </div>
        </div>
        {allDone && (
          <button
            className={`verdict-btn ${showSummary ? "active" : ""}`}
            onClick={() => setShowSummary((s) => !s)}
          >
            🏆 Verdict
          </button>
        )}
      </header>

      {/* Album art background blur */}
      {review.album_image && (
        <div className="album-backdrop" style={{ backgroundImage: `url(${review.album_image})` }} />
      )}

      {showSummary && stats && (
        <div className="summary-card">
          <h2>Album Verdict</h2>
          <div className="summary-grid">
            <div className="stat-box">
              <span className="stat-label">Your avg</span>
              <span className="stat-val you">{stats.myAvg}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">{partnerName}'s avg</span>
              <span className="stat-val them">{stats.pAvg}</span>
            </div>
            <div className="stat-box compat">
              <span className="stat-label">Taste match</span>
              <span className="stat-val">{stats.compat}%</span>
            </div>
          </div>
          {stats.bestTrack && (
            <div className="summary-highlight">
              🥇 Favorite track: <strong>{stats.bestTrack.name}</strong>
            </div>
          )}
          {stats.hottestTrack && stats.hottestDiff >= 2 && (
            <div className="summary-highlight hot">
              🔥 Biggest disagreement: <strong>{stats.hottestTrack.name}</strong>
              <span className="hot-diff">({stats.hottestDiff}pt gap)</span>
            </div>
          )}
        </div>
      )}

      <div className="spreadsheet-wrap">
        <table className="sheet">
          <thead>
            <tr>
              <th className="th-track">#</th>
              <th className="th-name">Track</th>
              {CATEGORIES.map((cat) => (
                <th key={cat.key} className="th-cat" colSpan={partner ? 2 : 1}>
                  {cat.label}
                </th>
              ))}
              <th className="th-cat" colSpan={partner ? 2 : 1}>Avg</th>
              <th className="th-react"></th>
            </tr>
            {partner && (
              <tr className="row-who">
                <th></th><th></th>
                {CATEGORIES.map((cat) => (
                  <React.Fragment key={cat.key}>
                    <th className="who you">You</th>
                    <th className="who them">{partnerName}</th>
                  </React.Fragment>
                ))}
                <th className="who you">You</th>
                <th className="who them">{partnerName}</th>
                <th></th>
              </tr>
            )}
          </thead>
          <tbody>
            {tracks.map((track, idx) => {
              const myAvg = trackAvg(track.id, user.id);
              const pAvg = partner ? trackAvg(track.id, partner.id) : null;
              const isHotTake = partner && allCatsScored(track.id) && hotTakeDiff(track.id) >= 2;
              const myReactions = getReactionsForUser(track.id, user.id);
              const partnerReactions = partner ? getReactionsForUser(track.id, partner.id) : [];
              const isPlayerOpen = playerTrackId === track.id;

              return (
                <React.Fragment key={track.id}>
                  <tr
                    className={`track-row ${isHotTake ? "hot-take" : ""}`}
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <td className="td-num">{track.track_number}</td>
                    <td className="td-name">
                      <button className="play-link" onClick={() => togglePlayer(track.id)}>
                        <span className={`play-icon ${isPlayerOpen ? "active" : ""}`}>
                          {isPlayerOpen ? "⏸" : "▶"}
                        </span>
                        <span className="track-name-text">{track.name}</span>
                      </button>
                      {isHotTake && (
                        <span className="hot-take-badge" title={pickPrompt(track.id)}>
                          🔥 Hot take!
                        </span>
                      )}
                    </td>

                    {CATEGORIES.map((cat) => {
                      const myVal = getScore(track.id, user.id, cat.key);
                      const partnerVal = partner ? getScore(track.id, partner.id, cat.key) : null;

                      return (
                        <React.Fragment key={cat.key}>
                          <td className="td-score">
                            <ScorePicker
                              value={myVal}
                              onChange={(v) => handleScore(track, cat.key, v)}
                              variant="you"
                            />
                          </td>
                          {partner && (
                            <td className="td-score">
                              <span className={`pill them ${partnerVal != null ? "" : "empty"}`}>
                                {partnerVal != null ? partnerVal : "–"}
                              </span>
                            </td>
                          )}
                        </React.Fragment>
                      );
                    })}

                    <td className="td-score">
                      <span className="pill avg you">{myAvg || "–"}</span>
                    </td>
                    {partner && (
                      <td className="td-score">
                        <span className={`pill avg them ${pAvg ? "" : "empty"}`}>
                          {pAvg || "–"}
                        </span>
                      </td>
                    )}

                    <td className="td-react">
                      <div className="reaction-cell">
                        <div className="reaction-emojis">
                          {myReactions.map((em) => (
                            <span key={em} className="my-reaction">{em}</span>
                          ))}
                          {partnerReactions.map((em) => (
                            <span key={em} className="partner-reaction" title={`${partnerName}`}>
                              {em}
                            </span>
                          ))}
                        </div>
                        <button
                          className="react-btn"
                          onClick={() => setOpenPicker(openPicker === track.id ? null : track.id)}
                        >
                          +
                        </button>
                        {openPicker === track.id && (
                          <div className="emoji-picker">
                            {REACTION_EMOJIS.map((em) => (
                              <button
                                key={em}
                                className={`emoji-opt ${myReactions.includes(em) ? "selected" : ""}`}
                                onClick={() => handleReaction(track.id, em)}
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>

                  {isPlayerOpen && (
                    <tr className="player-row">
                      <td colSpan={99}>
                        <div className="embed-player">
                          <iframe
                            src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`}
                            width="100%"
                            height="80"
                            frameBorder="0"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
        <span className="guide">Tap a cell to score · 1 = nah · 5 = banger</span>
      </footer>
    </div>
  );
}

function ScorePicker({ value, onChange, variant }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="score-picker-wrap">
      <button
        className={`pill ${variant} ${value != null ? "scored" : "empty"}`}
        onClick={() => setOpen(!open)}
      >
        {value != null ? value : "–"}
      </button>
      {open && (
        <div className="score-dropdown">
          {SCORE_OPTIONS.map((opt) => (
            <button
              key={opt}
              className={`score-opt ${opt === value ? "active" : ""}`}
              onClick={() => { onChange(opt); setOpen(false); }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
