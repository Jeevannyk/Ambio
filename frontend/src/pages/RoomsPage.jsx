// frontend/src/pages/RoomsPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Users, SignIn, Trash, Copy, Check, Shield, ArrowRight, Radio } from '@phosphor-icons/react';
import { VideoCamera, Key, ArrowsClockwise, Lock, Globe } from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { useScrollReveal } from '../hooks/useScrollReveal';
import './RoomsPage.css';

// Same base as the token endpoint, one path over. Derived here rather than
// imported from useRoomCall.js, which owns the twin of this helper: that module
// pulls in the whole livekit-client bundle, and browsing the rooms list has no
// business downloading it.
const OCCUPANCY_ENDPOINT = (import.meta.env.VITE_TOKEN_ENDPOINT || '/api/token')
  .replace(/\/token$/, '/rooms/occupancy');

/*
 * Live participant counts for the given room ids — { [roomId]: count }, with a
 * room nobody is in left out entirely (LiveKit only knows about rooms that
 * exist, so absent means zero). The browser can't read this itself: the count
 * comes from LiveKit's admin API, which needs the secret, so it goes through
 * our own server — same reason /api/kick exists.
 *
 * Returns null, not {}, on any failure, so a caller can tell "nobody is in
 * these rooms" apart from "we don't know" and show capacity alone in the second
 * case. This is a hint on a card, never a gate, so it swallows its errors.
 */
async function fetchOccupancy(ids) {
  if (!ids.length) return null;
  try {
    const { data } = await supabase.auth.getSession();
    const accessToken = data?.session?.access_token;
    const resp = await fetch(`${OCCUPANCY_ENDPOINT}?ids=${encodeURIComponent(ids.join(','))}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    if (!resp.ok) return null;
    const counts = await resp.json();
    return counts && typeof counts === 'object' ? counts : null;
  } catch {
    return null;
  }
}

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/*
 * One confirm dialog for both destructive room actions, on the shared .rm-*
 * shell (styles/modal.css). Regenerating a code locks out everyone holding the
 * old one — including someone part-way through the code gate — and deleting is
 * permanent with no undo, so neither may happen on a single stray click.
 * Stays mounted while closed so it can transition out (see .rm-overlay[hidden]).
 */
function ConfirmRoomAction({ open, kind, room, origin, error, onCancel, onConfirm }) {
  const cancelRef = useRef(null);
  const del = kind === 'delete';

  // Land on Cancel, never on the destructive button.
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  return (
    <div className="rm-overlay" hidden={!open} onClick={onCancel}>
      <div
        className="rm-modal"
        style={origin ? { '--rm-ox': `${origin.x}px`, '--rm-oy': `${origin.y}px` } : undefined}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
        role="dialog"
        aria-modal="true"
        aria-label={del ? 'Delete room' : 'Regenerate room code'}
      >
        <div className="rm-head">{del ? 'Delete room' : 'Regenerate code'}</div>
        <div className="rm-body">
          <p className="rooms-confirm-text">
            {del ? (
              <>“{room.name}” and its code <strong>{room.id}</strong> go away for good. This can’t be undone.</>
            ) : (
              <>“{room.name}” gets a new code. <strong>{room.id}</strong> stops working straight away, so anyone you gave it to will need the new one.</>
            )}
          </p>
          {error && <p className="rooms-panel-error">{error}</p>}
        </div>
        <div className="rm-foot">
          <button type="button" className="rm-cancel" ref={cancelRef} onClick={onCancel}>Cancel</button>
          <span className="rm-foot-div" />
          <button type="button" className="rm-set rm-set--danger" onClick={onConfirm}>
            {del ? 'Delete' : 'Regenerate'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoomsPage() {
  const navigate = useNavigate();
  const { isAdmin: admin } = useAuth();
  const [rooms, setRooms] = useState([]);
  // {id: live participant count} once we've heard back, null while we haven't —
  // a card shows capacity alone until then. See the effect below.
  const [occupancy, setOccupancy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', max: 5, isPublic: false });
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [toasts, setToasts] = useState([]); // {key, text}
  // Kept in state after closing (with open: false) so the dialog can animate
  // out — see .rm-overlay[hidden].
  const [confirm, setConfirm] = useState(null); // {kind, room, origin, open}
  const [confirmError, setConfirmError] = useState('');

  // Same mechanism as the room call's join/leave toasts: each toast owns its
  // own expiry, so a second one can't cut the first short.
  const pushToast = (text) => {
    const key = `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { key, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.key !== key)), 4000);
  };

  // Rooms live in Supabase so they're shared across users and devices.
  // RLS decides what comes back, not this query: your own rooms, plus any room
  // flagged public by anyone (0004_rooms_visibility.sql). So a non-admin's list
  // is exactly the public rooms — there is nothing to filter client-side, and
  // adding a filter here would only hide rows the database already vetted.
  // Private rooms you weren't given the code to simply aren't in the result;
  // joining by code doesn't come through here at all, it goes via /api/token.
  useEffect(() => {
    if (!supabase) { setFetchError('Supabase is not configured.'); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase
        .from('rooms')
        .select('id, name, description, max, is_public')
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (err) setFetchError('Could not load rooms. Check your connection and try again.');
      else setRooms(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // How many people are actually in each of those rooms right now, so a card
  // reads "3 / 6 seats" instead of just "6 seats" and a full room is obvious
  // before anyone tries the door. It's a separate round trip because only the
  // server can ask LiveKit (fetchOccupancy), and it stays in its own state
  // rather than being merged into `rooms` — that array mirrors the table.
  //
  // Fetched once per list, deliberately not polled: this is a hint on a card,
  // not a live meter, and every card re-reads it on the next visit. Keyed on a
  // joined id string so it re-runs when the list really changes (create, delete,
  // regenerate) and not on every render.
  const roomIds = rooms.map((r) => r.id).join(',');
  useEffect(() => {
    if (!roomIds) return;
    let cancelled = false;
    // null back means the fetch failed; leave whatever we had, so a blip
    // doesn't wipe counts that were on screen a second ago.
    fetchOccupancy(roomIds.split(',')).then((counts) => {
      if (!cancelled && counts) setOccupancy(counts);
    });
    return () => { cancelled = true; };
  }, [roomIds]);

  const createRoom = async (e) => {
    e.preventDefault();
    if (!admin) return;
    if (!form.name.trim()) { setError('Room name is required.'); return; }
    const max = Math.min(6, Math.max(2, Number(form.max) || 5));
    const room = {
      id: genCode(),
      name: form.name.trim(),
      description: form.description.trim(),
      max,
      is_public: form.isPublic,
    };
    // created_by is filled in by the column's `default auth.uid()` — the DB owns
    // that, not this payload (0002_rooms_owner.sql).
    const { error: err } = await supabase.from('rooms').insert(room);
    if (err) { console.error('createRoom failed:', err); setError('Could not create the room. Please try again.'); return; }
    setRooms((prev) => [...prev, room]);
    setForm({ name: '', description: '', max: 5, isPublic: false });
    setShowForm(false);
    setError('');
    // A private room's code is only ever shown to you, so this is the moment to
    // notice it. A public one doesn't need passing on at all.
    pushToast(room.is_public
      ? `“${room.name}” is live — anyone signed in can join`
      : `“${room.name}” is live — code ${room.id}`);
  };

  // Hand the code over so nobody is stopped at the gate for a room they were
  // just shown: the creator is reading the code off this very card, and a
  // public room isn't gated by its code at all — that's what public means.
  // Same shape Quick Join uses.
  const enterRoom = (room) => navigate(`/rooms/${room.id}`, { state: { code: room.id } });

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

  const openConfirm = (kind, room, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // The modal is centred, so 50% of its own box is the viewport centre —
    // offsetting from there anchors it on the button that opened it.
    setConfirm({
      kind,
      room,
      origin: {
        x: rect.left + rect.width / 2 - window.innerWidth / 2,
        y: rect.top + rect.height / 2 - window.innerHeight / 2,
      },
      open: true,
    });
    setConfirmError('');
  };

  const closeConfirm = () => setConfirm((c) => (c ? { ...c, open: false } : null));

  // Both destructive actions land here, once confirmed. A failure keeps the
  // dialog open and says so — a delete that silently no-ops just looks like a
  // broken button. `.select()` is what makes that check honest: a write RLS
  // refuses comes back with no error at all, just zero affected rows.
  const runConfirm = async () => {
    if (!admin || !confirm) return;
    const { kind, room } = confirm;
    if (kind === 'delete') {
      const { data, error: err } = await supabase.from('rooms').delete().eq('id', room.id).select('id');
      if (err || !data?.length) { setConfirmError('Could not delete the room. Please try again.'); return; }
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
      pushToast(`“${room.name}” deleted`);
    } else {
      // The code IS the primary key. Nothing has a foreign key onto rooms.id
      // (see 0001_rooms_rls.sql), so re-keying the row is safe.
      const next = genCode();
      const { data, error: err } = await supabase.from('rooms').update({ id: next }).eq('id', room.id).select('id');
      if (err || !data?.length) { setConfirmError('Could not regenerate the code. Please try again.'); return; }
      setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, id: next } : r)));
      pushToast(`“${room.name}” has a new code — ${next}`);
    }
    closeConfirm();
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
          {/* This was admin-only because nobody else's list could ever hold a
              room — it would read "0 rooms / 0 seats" right above an empty
              state. Public rooms can fill it for anyone now, so it shows
              whenever there's something to count. */}
          {(admin || rooms.length > 0) && (
            <div className="rooms-stats">
              <span className="stat-chip">
                <strong>{rooms.length}</strong> {rooms.length === 1 ? 'room' : 'rooms'}
              </span>
              <span className="stat-chip">
                <strong>{totalSeats}</strong> seats
              </span>
            </div>
          )}
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
              {/* Private is the default and stays the default — publishing a
                  room to every signed-in user is a deliberate act, so each
                  option spells out what it actually means. */}
              <div className="panel-field">
                <label>Visibility</label>
                <div className="visibility-choice" role="radiogroup" aria-label="Room visibility">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!form.isPublic}
                    className={`visibility-option${form.isPublic ? '' : ' is-active'}`}
                    tabIndex={showForm ? 0 : -1}
                    onClick={() => setForm((f) => ({ ...f, isPublic: false }))}
                  >
                    <Lock size={14} weight="bold" />
                    <span className="visibility-name">Private</span>
                    <span className="visibility-hint">Only you see the code — share it yourself.</span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={form.isPublic}
                    className={`visibility-option${form.isPublic ? ' is-active' : ''}`}
                    tabIndex={showForm ? 0 : -1}
                    onClick={() => setForm((f) => ({ ...f, isPublic: true }))}
                  >
                    <Globe size={14} weight="bold" />
                    <span className="visibility-name">Public</span>
                    <span className="visibility-hint">Anyone signed in can see and join.</span>
                  </button>
                </div>
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
      {loading ? (
        <div className="rooms-grid">
          {[0, 1].map((i) => (
            <div key={i} className="room-card room-card--skeleton" style={{ '--i': i }}>
              <div className="sk-line sk-line--badge" />
              <div className="sk-line sk-line--title" />
              <div className="sk-line sk-line--text" />
              <div className="sk-line sk-line--footer" />
            </div>
          ))}
        </div>
      ) : fetchError ? (
        <div className="rooms-empty-state">
          <VideoCamera size={44} weight="duotone" className="empty-icon" />
          <h3>Rooms unavailable</h3>
          <p>{fetchError}</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="rooms-empty-state">
          <VideoCamera size={44} weight="duotone" className="empty-icon" />
          <h3>No active channels running</h3>
          {/* Only reached when the list is genuinely empty, which for a
              non-admin now means no public room exists — so the ask-for-a-code
              line is the right advice again rather than a blanket assumption. */}
          <p>{admin ? 'Deploy a new room using the control bar above.' : 'Nothing public is running right now. Request a room code from an admin, or join directly below.'}</p>
        </div>
      ) : (
        <div className="rooms-grid">
          {rooms.map((room, index) => {
            // null until the counts land (or if they never do) — every seat
            // readout below falls back to capacity alone in that case.
            const taken = occupancy ? occupancy[room.id] || 0 : null;
            const full = taken !== null && taken >= room.max;
            return (
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
                  {/* Which rooms a stranger can walk into is the one thing that
                      must be readable at a glance, so it takes the badge line. */}
                  <span className={`card-badge-label${room.is_public ? ' card-badge-label--public' : ''}`}>
                    {room.is_public ? <Globe size={12} weight="bold" /> : <Lock size={12} weight="bold" />}
                    {room.is_public ? 'Public' : 'Private'}
                  </span>
                  {/* Sits beside it on the same line for the same reason: a
                      room you'd only be bounced out of is worth knowing about
                      before you click, not after. */}
                  {full && (
                    <span className="card-badge-label card-badge-label--full">
                      <Users size={12} weight="bold" />
                      Full
                    </span>
                  )}
                </div>
                {admin && (
                  <button
                    className="card-delete-btn"
                    onClick={(e) => openConfirm('delete', room, e)}
                    title="Terminate Room"
                  >
                    <Trash size={13} />
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
                    <span
                      key={i}
                      className={`seat-dot${taken !== null && i < taken ? ' seat-dot--taken' : ''}`}
                      style={{ '--d': i }}
                    />
                  ))}
                </span>
                <span className="seat-count">
                  <Users size={12} /> {taken !== null ? `${taken} / ${room.max}` : room.max} seats
                </span>
              </div>

              <div className="card-bottom">
                {/* The code and the two destructive actions belong to whoever
                    made the room. Since creating is still admin-only, `admin`
                    IS "I made this" — a public room listed for anyone else
                    shows its name, seats and a way in, nothing to manage. */}
                {admin && (
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
                )}

                {admin && (
                  <button
                    className="code-regen-btn"
                    onClick={(e) => openConfirm('regen', room, e)}
                    title="New code (the old one stops working)"
                    aria-label="Regenerate room code"
                  >
                    <ArrowsClockwise size={13} />
                  </button>
                )}

                {/* Dimmed when full, never disabled: this count is a snapshot
                    that can be seconds stale, and LiveKit's own check at
                    connect time is the authority (useRoomCall's capacity
                    bounce). Same spirit as CodeGate — a courtesy, not a gate. */}
                <button
                  className={`join-action-btn${full ? ' is-full' : ''}`}
                  onClick={() => enterRoom(room)}
                  title={full ? 'Looks full right now — you may be turned away' : undefined}
                >
                  <SignIn size={14} />
                  <span>Connect</span>
                </button>
              </div>
            </article>
            );
          })}
        </div>
      )}

      {confirm && (
        <ConfirmRoomAction
          open={confirm.open}
          kind={confirm.kind}
          room={confirm.room}
          origin={confirm.origin}
          error={confirmError}
          onCancel={closeConfirm}
          onConfirm={runConfirm}
        />
      )}

      {/* Same pill as the room call's join/leave toasts (styles/toast.css). */}
      <div className="rooms-toasts">
        {toasts.map((t) => (
          <div key={t.key} className="rc-toast">{t.text}</div>
        ))}
      </div>
    </div>
  );
}

export default RoomsPage;
