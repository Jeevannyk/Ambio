import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Plus, X, Users, LogIn, Trash2, Lock } from 'lucide-react';

const ROOMS_KEY = 'react-todo-app.rooms';

function loadRooms() {
  try {
    const saved = localStorage.getItem(ROOMS_KEY);
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Deep Work', description: 'Silent focus — no distractions.', max: 10, joined: false },
      { id: '2', name: 'Study Hall', description: 'Group studying session.', max: 20, joined: false },
    ];
  } catch { return []; }
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function RoomsPage({ isAdmin }) {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState(loadRooms);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', max: 10 });
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
  }, [rooms]);

  const createRoom = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Room name is required.'); return; }
    setRooms((prev) => [
      ...prev,
      { id: uid(), name: form.name.trim(), description: form.description.trim(), max: Number(form.max) || 10, joined: false },
    ]);
    setForm({ name: '', description: '', max: 10 });
    setShowForm(false);
    setError('');
  };

  const enterRoom = (id) => navigate(`/rooms/${id}`);

  const joinByCode = (e) => {
    e.preventDefault();
    const code = joinCode.trim();
    if (code) navigate(`/rooms/${code}`);
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
        {isAdmin ? (
          <button className="rooms-create-btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancel' : 'Create Room'}
          </button>
        ) : (
          <span className="rooms-locked-hint">
            <Lock size={13} /> Only admins can create rooms
          </span>
        )}
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

      {showForm && isAdmin && (
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
              max="100"
              className="room-input room-input--small"
              value={form.max}
              onChange={(e) => setForm((f) => ({ ...f, max: e.target.value }))}
            />
          </div>
          <button type="submit" className="room-submit-btn">Create Room</button>
        </form>
      )}

      {rooms.length === 0 ? (
        <div className="rooms-empty">
          <Video size={40} opacity={0.3} />
          <p>No rooms yet.{isAdmin ? ' Create one above.' : ' Ask an admin to create one.'}</p>
        </div>
      ) : (
        <div className="rooms-grid">
          {rooms.map((room) => (
            <div key={room.id} className="room-card">
              <div className="room-card-top">
                <div className="room-card-icon">
                  <Video size={20} />
                </div>
                {isAdmin && (
                  <button className="room-delete-btn" onClick={() => deleteRoom(room.id)} aria-label="Delete room">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <h3 className="room-card-name">{room.name}</h3>
              {room.description && <p className="room-card-desc">{room.description}</p>}
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
