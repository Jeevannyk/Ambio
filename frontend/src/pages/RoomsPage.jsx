import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Users, LogIn, Trash2, Copy, Check, Shield } from 'lucide-react';
import { VideoCamera } from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import { useScrollReveal } from '../hooks/useScrollReveal';

const ROOMS_KEY = 'react-todo-app.rooms';

const CARD_GRADIENTS = [
  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%)',
  'linear-gradient(135deg, #10b981 0%, #065f46 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #92400e 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #155e75 100%)',
  'linear-gradient(135deg, #f43f5e 0%, #9f1239 100%)',
];

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
  const { isAdmin: admin } = useAuth();
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
    if (!admin) return;
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

  const enterRoom = (id) => navigate(`/rooms/${id}`);

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
    if (!admin) return;
    setRooms((prev) => prev.filter((r) => r.id !== id));
  };

  useScrollReveal();

  return (
    <div className="rooms-page">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="rooms-header">
        <div>
          <h2 className="rooms-title">
            Focus Rooms
            {admin && <span className="rooms-admin-badge"><Shield size={11} /> Admin</span>}
          </h2>
          <p className="rooms-sub">
            {admin
              ? 'Create and manage focus rooms, or join one.'
              : 'Join a focus room with an invite code.'}
          </p>
        </div>
        {admin && (
          <button className="rooms-create-btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? 'Cancel' : 'New Room'}
          </button>
        )}
      </div>

      {/* ── Create form ──────────────────────────────────── */}
      {admin && showForm && (
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

      {/* ── Grid / Empty ─────────────────────────────────── */}
      {rooms.length === 0 ? (
        <div className="rooms-empty">
          <VideoCamera size={48} weight="duotone" />
          <p>{admin ? 'No rooms yet. Create one above.' : 'No rooms available. Ask an admin, or join with an invite code.'}</p>
        </div>
      ) : (
        <div className="rooms-grid">
          {rooms.map((room, i) => (

            <div
              key={room.id}
              className={`room-card reveal${room.joined ? ' room-card--joined' : ''}`}
            >
              {/* Gradient banner */}
              <div
                className="room-card-banner"
                style={{ background: CARD_GRADIENTS[i % CARD_GRADIENTS.length] }}
              >
                <VideoCamera
                  size={56}
                  weight="duotone"
                  className="room-card-banner-watermark"
                />
                {admin && (
                  <button
                    className="room-card-delete"
                    onClick={() => deleteRoom(room.id)}
                    aria-label="Delete room"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="room-card-body">
                <h3 className="room-card-name">{room.name}</h3>
                {room.description && (
                  <p className="room-card-desc">{room.description}</p>
                )}
              </div>

              {/* Code pill */}
              <button
                className="room-card-code"
                onClick={() => copyCode(room.id)}
                title="Copy room code"
              >
                <span className="room-card-code-label">Code</span>
                <span className="room-card-code-value">{room.id}</span>
                {copiedId === room.id ? <Check size={13} /> : <Copy size={13} />}
              </button>

              {/* Footer */}
              <div className="room-card-footer">
                <span className="room-card-max">
                  <Users size={12} /> Max {room.max}
                </span>
                <button className="room-join-btn" onClick={() => enterRoom(room.id)}>
                  <LogIn size={13} /> Join
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Join bar (secondary action — below grid) ──────── */}
      <div className="rooms-join-section reveal">
        <p className="rooms-join-label">Have an invite code?</p>
        <form className="rooms-join-bar" onSubmit={joinByCode}>
          <input
            className="rooms-join-input"
            placeholder="Enter code to join a private room…"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button type="submit" className="rooms-join-submit">Join →</button>
        </form>
      </div>
    </div>
  );
}

export default RoomsPage;
