import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom, joinRoom, getUserRooms } from "../lib/room.js";

export default function Home({ user, spotifyUser, onLogout }) {
  const [rooms, setRooms] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getUserRooms(user.id).then(setRooms);
  }, [user.id]);

  const handleCreate = async () => {
    setCreating(true);
    setError("");
    try {
      const room = await createRoom(user.id);
      navigate(`/room/${room.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError("");
    if (!joinCode.trim()) return;
    try {
      const room = await joinRoom(joinCode, user.id);
      navigate(`/room/${room.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="home-page">
      <header className="app-header">
        <h1>♫ Our Album Reviews</h1>
        <div className="user-info">
          {spotifyUser?.images?.[0] && (
            <img src={spotifyUser.images[0].url} alt="" className="avatar" />
          )}
          <span>{spotifyUser?.display_name}</span>
          <button className="btn-sm btn-ghost" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <main className="home-content">
        <section className="room-actions">
          <button className="btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? "Creating..." : "Create New Room"}
          </button>

          <div className="divider"><span>or join a room</span></div>

          <form onSubmit={handleJoin} className="join-form">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-letter code"
              maxLength={6}
              className="input-code"
            />
            <button type="submit" className="btn-secondary" disabled={joinCode.length < 6}>
              Join
            </button>
          </form>
        </section>

        {error && <p className="error-msg">{error}</p>}

        {rooms.length > 0 && (
          <section className="room-history">
            <h2>Your Rooms</h2>
            <div className="room-list">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  className="room-card"
                  onClick={() => navigate(`/room/${room.id}`)}
                >
                  <span className="room-code">{room.code}</span>
                  <span className="room-date">
                    {new Date(room.created_at).toLocaleDateString()}
                  </span>
                  {room.partner_id ? (
                    <span className="badge badge-paired">Paired</span>
                  ) : (
                    <span className="badge badge-waiting">Waiting</span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
