import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Plus, X, Users, LogIn, Trash2, Copy, Check } from 'lucide-react';

const ROOMS_KEY = 'react-todo-app.rooms';

// Readable 6-char code (no ambiguous 0/O/1/I) — doubles as the room's id and
// its connection key, so anyone with the code can reach the same peer room.
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function loadRooms() {
  try {
    const saved = localStorage.getItem(ROOMS_KEY);
    return saved ? JSON.parse(saved) : [
      { id: 'DEEP42', name: 'Deep Work', description: 'Silent focus — no distractions.', max: 5, joined: false },
      { id: 'STUDY7', name: 'Study Hall', description: 'Group studying session.', max: 5, joined: false },
    ];
  } catch { return []; }
}

function RoomsPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState(loadRooms);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', max: 5 });
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copiedId, setCopiedId] = useState('');

  useEffect(() => {
    localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
  }, [rooms]);

  const createRoom = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Room name is required.'); return; }
    const max = Math.min(6, Math.max(2, Number(form.max) || 5));
    setRooms((prev) => [
      ...prev,
      { id: genCode(), name: form.name.trim(), description: form.description.trim(), max, joined: false },
    ]);
    setForm({ name: '', description: '', max: 5 });
    setShowForm(false);
    setError('');
  };

  // Card "Join": go to the gate WITHOUT the code so it must be typed.
  const enterRoom = (id) => navigate(`/rooms/${id}`);

  // Code box: they already typed the code, so pass it through to skip retyping.
  const joinByCode = (e) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code) navigate(`/rooms/${code}`, { state: { code } });
  };

  const copyCode = (id) => {
    navigator.clipboard?.writeText(id).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 1500);
    });
  };

  const deleteRoom = (id) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="rooms-page">
      <div className="rooms-header">
        <div>
          <h2 className="rooms-title">Rooms</h2>
          <p className="rooms-sub">Join a focus room to work alongside others.</p>
        </div>
        <button className="rooms-create-btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Create Room'}
        </button>
      </div>

      <form className="room-join-code" onSubmit={joinByCode}>
        <input
          className="room-input"
          placeholder="Have an invite code? Paste it to join…"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
        />
        <button type="submit" className="room-submit-btn">Join</button>
      </form>

      {showForm && (
        <form className="room-form" onSubmit={createRoom}>
          <h3 className="room-form-title">New Room</h3>
          {error && <p className="room-form-error">{error}</p>}
          <input
            className="room-input"
            placeholder="Room name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            className="room-input"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="room-form-row">
            <label className="room-label">Max participants</label>
            <input
              type="number"
              min="2"
              max="6"
              className="room-input room-input--small"
              value={form.max}
              onChange={(e) => setForm((f) => ({ ...f, max: e.target.value }))}
            />
          </div>
          <p className="room-form-hint">Best with 2–6 people — video quality drops with larger groups.</p>
          <button type="submit" className="room-submit-btn">Create Room</button>
        </form>
      )}

      {rooms.length === 0 ? (
        <div className="rooms-empty">
          <Video size={40} opacity={0.3} />
          <p>No rooms yet. Create one above.</p>
        </div>
      ) : (
        <div className="rooms-grid">
          {rooms.map((room) => (
            <div key={room.id} className="room-card">
              <div className="room-card-top">
                <div className="room-card-icon">
                  <Video size={20} />
                </div>
                <button className="room-delete-btn" onClick={() => deleteRoom(room.id)} aria-label="Delete room">
                  <Trash2 size={14} />
                </button>
              </div>
              <h3 className="room-card-name">{room.name}</h3>
              {room.description && <p className="room-card-desc">{room.description}</p>}
              <button
                className="room-card-code"
                onClick={() => copyCode(room.id)}
                title="Copy room code"
              >
                <span className="room-card-code-label">Code</span>
                <span className="room-card-code-value">{room.id}</span>
                {copiedId === room.id ? <Check size={13} /> : <Copy size={13} />}
              </button>
              <div className="room-card-footer">
                <span className="room-card-max">
                  <Users size={13} /> Max {room.max}
                </span>
                <button className="room-join-btn" onClick={() => enterRoom(room.id)}>
                  <LogIn size={14} /> Join
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RoomsPage;
