// frontend/src/pages/RoomsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Users, LogIn, Trash2, Copy, Check, Shield, ArrowRight, Radio } from 'lucide-react';
import { VideoCamera, Key } from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import { useScrollReveal } from '../hooks/useScrollReveal';
import './RoomsPage.css';

const ROOMS_KEY = 'react-todo-app.rooms';

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

  // Cursor-tracked spotlight: publish pointer position as CSS vars per card.
  const handleSpotlight = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    card.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  useScrollReveal();

  const totalSeats = rooms.reduce((sum, r) => sum + (r.max || 0), 0);

  return (
    <div className="rooms-container">
      {/* ── Header: title, live status, network stats ──────────── */}
      <header className="rooms-hud-bar">
        <div className="rooms-hud-title">
          <div className="rooms-live-indicator">
            <span className="live-pulse" />
            <Radio size={14} className="radio-icon" />
            <span>LIVE NETWORK</span>
          </div>
          <h1>Focus Rooms</h1>
          <div className="rooms-stats">
            <span className="stat-chip">
              <strong>{rooms.length}</strong> {rooms.length === 1 ? 'room' : 'rooms'}
            </span>
            <span className="stat-chip">
              <strong>{totalSeats}</strong> seats
            </span>
          </div>
        </div>

        <div className="rooms-hud-actions">
          {admin && (
            <button
              className={`rooms-admin-toggle${showForm ? ' is-open' : ''}`}
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? <X size={15} /> : <Plus size={15} />}
              <span>{showForm ? 'Close' : 'New Room'}</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Quick join by code ─────────────────────────────────── */}
      <form className="rooms-quickjoin" onSubmit={joinByCode}>
        <span className="quickjoin-label">
          <Key size={15} weight="duotone" />
          Have a code?
        </span>
        <input
          className="quickjoin-input"
          placeholder="ABC123"
          maxLength={6}
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          aria-label="Room access code"
        />
        <button type="submit" className="quickjoin-btn" disabled={!joinCode.trim()}>
          <span>Join</span>
          <ArrowRight size={14} />
        </button>
      </form>

      {/* ── Admin Room Creation Panel (smooth expand/collapse) ── */}
      {admin && (
        <div className={`rooms-creator-wrap${showForm ? ' is-open' : ''}`} aria-hidden={!showForm}>
          <div className="rooms-creator-inner">
            <form className="rooms-creator-panel" onSubmit={createRoom}>
              <div className="panel-header">
                <h3><Shield size={14} /> Initialize Workspace Channel</h3>
                <p className="panel-sub">Configure capacity and parameters for live session.</p>
              </div>
              {error && <p className="rooms-panel-error">{error}</p>}
              <div className="panel-grid">
                <div className="panel-field">
                  <label>Room Identifier</label>
                  <input
                    className="rooms-input"
                    placeholder="e.g. Quiet Library, CS Lab"
                    value={form.name}
                    tabIndex={showForm ? 0 : -1}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="panel-field">
                  <label>Capacity limit (2–6)</label>
                  <input
                    type="number"
                    min="2"
                    max="6"
                    className="rooms-input"
                    value={form.max}
                    tabIndex={showForm ? 0 : -1}
                    onChange={(e) => setForm((f) => ({ ...f, max: e.target.value }))}
                  />
                </div>
              </div>
              <div className="panel-field">
                <label>Purpose / Rules</label>
                <input
                  className="rooms-input"
                  placeholder="e.g. Cameras optional, silent study only..."
                  value={form.description}
                  tabIndex={showForm ? 0 : -1}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="panel-footer">
                <span className="quality-note">Optimal performance is achieved at 2–5 concurrent video streams.</span>
                <button type="submit" className="rooms-submit-btn" tabIndex={showForm ? 0 : -1}>
                  Deploy Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Rooms Grid ─────────────────────────────────────────── */}
      {rooms.length === 0 ? (
        <div className="rooms-empty-state">
          <VideoCamera size={44} weight="duotone" className="empty-icon" />
          <h3>No active channels running</h3>
          <p>{admin ? 'Deploy a new room using the control bar above.' : 'Request a room code from an admin, or join directly below.'}</p>
        </div>
      ) : (
        <div className="rooms-grid">
          {rooms.map((room, index) => (
            <article
              key={room.id}
              className="room-card"
              style={{ '--i': index }}
              onMouseMove={handleSpotlight}
            >
              <div className="card-spotlight" />

              <div className="card-top">
                <div className="card-badge">
                  <span className="card-badge-icon">
                    <VideoCamera size={18} weight="duotone" />
                  </span>
                  <span className="card-badge-label">Open channel</span>
                </div>
                {admin && (
                  <button
                    className="card-delete-btn"
                    onClick={() => deleteRoom(room.id)}
                    title="Terminate Room"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div className="card-body">
                <h3 className="room-name">{room.name}</h3>
                <p className="room-desc">{room.description || 'General study and deep focus channel.'}</p>
              </div>

              <div className="card-seats">
                <span className="seat-dots" aria-hidden="true">
                  {Array.from({ length: room.max }).map((_, i) => (
                    <span key={i} className="seat-dot" style={{ '--d': i }} />
                  ))}
                </span>
                <span className="seat-count">
                  <Users size={12} /> {room.max} seats
                </span>
              </div>

              <div className="card-bottom">
                <button
                  className="code-copy-btn"
                  onClick={() => copyCode(room.id)}
                  title="Copy room invite code"
                >
                  <span className="code-label">CODE</span>
                  <span className="code-val">{room.id}</span>
                  <span className="copy-icon" key={copiedId === room.id ? 'done' : 'idle'}>
                    {copiedId === room.id
                      ? <Check size={13} className="copied-check" />
                      : <Copy size={13} />}
                  </span>
                </button>

                <button className="join-action-btn" onClick={() => enterRoom(room.id)}>
                  <LogIn size={14} />
                  <span>Connect</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default RoomsPage;
