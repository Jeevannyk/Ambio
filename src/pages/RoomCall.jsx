import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Mic, MicOff, Video as Cam, VideoOff, MonitorUp, MonitorX, Hand,
  Smile, MessageSquare, Users, PhoneOff, Send, Shield, VolumeX, UserX, Crown,
  LayoutGrid, Monitor, Maximize, Minimize,
} from 'lucide-react';
import { useRoomCall } from '../hooks/useRoomCall';
import { formatTime } from '../hooks/usePomodoro';
import VideoTile from '../components/room/VideoTile';
import PreJoin from '../components/room/PreJoin';
import CodeGate from '../components/room/CodeGate';
import './RoomCall.css';

const ROOMS_KEY = 'react-todo-app.rooms';
const EMOJIS = ['👍', '❤️', '🎉', '😂', '🔥', '👏'];

function roomInfo(id) {
  try {
    const rooms = JSON.parse(localStorage.getItem(ROOMS_KEY)) || [];
    const r = rooms.find((x) => x.id === id);
    return { name: r?.name || 'Focus Room', max: r?.max ?? Infinity };
  } catch {
    return { name: 'Focus Room', max: Infinity };
  }
}

/*
 * Gate: show the pre-join screen until the user enters a name, then mount
 * the live room. Keying RoomLive on the joined session id guarantees a
 * clean hook lifecycle.
 */
function RoomCall({ pomodoro }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const info = roomInfo(id);
  // Auto-pass the gate only if they JUST typed the code on the Rooms page
  // (so the invite-code flow doesn't ask them to type it twice).
  const [verified, setVerified] = useState(
    () => (location.state?.code || '').trim().toUpperCase() === String(id).trim().toUpperCase()
  );
  const [session, setSession] = useState(null); // { name, micOn, camOn } | null

  if (!verified) {
    return (
      <CodeGate
        roomName={info.name}
        expected={id}
        onVerified={() => setVerified(true)}
        onBack={() => navigate('/rooms')}
      />
    );
  }

  if (!session) {
    return (
      <PreJoin
        roomName={info.name}
        onJoin={(name, prefs) => setSession({ name, ...prefs })}
        onBack={() => navigate('/rooms')}
      />
    );
  }

  return (
    <RoomLive
      id={id}
      info={info}
      pomodoro={pomodoro}
      displayName={session.name}
      initial={{
        micOn: session.micOn,
        camOn: session.camOn,
        videoDeviceId: session.videoDeviceId,
        audioDeviceId: session.audioDeviceId,
      }}
    />
  );
}

function RoomLive({ id, info, pomodoro, displayName, initial }) {
  const navigate = useNavigate();
  const call = useRoomCall(id, displayName, info.max, initial);
  const [panel, setPanel] = useState(null); // 'chat' | 'people' | null
  const [chatText, setChatText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [viewMode, setViewMode] = useState('gallery'); // 'gallery' | 'speaker'
  const [pinnedId, setPinnedId] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [toasts, setToasts] = useState([]); // {key, text}
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chatEndRef = useRef(null);
  const rcRef = useRef(null);
  const knownRef = useRef(new Map()); // id -> last known name (for join/leave toasts)

  // Track fullscreen state (also catches Esc / browser-driven exits).
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      rcRef.current?.requestFullscreen?.();
    }
  };

  const pushToast = useCallback((text) => {
    const key = `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { key, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.key !== key)), 3500);
  }, []);

  // Announce joins/leaves once a participant's name is known.
  useEffect(() => {
    const known = knownRef.current;
    const currentIds = new Set();
    call.participants.forEach((p) => {
      currentIds.add(p.id);
      const name = p.name && p.name !== 'Connecting…' ? p.name : null;
      if (name && !known.has(p.id)) {
        known.set(p.id, name);
        pushToast(`${name} joined`);
      } else if (name) {
        known.set(p.id, name);
      }
    });
    // Anyone we knew about who's now gone has left.
    [...known.keys()].forEach((kid) => {
      if (!currentIds.has(kid)) {
        pushToast(`${known.get(kid)} left`);
        known.delete(kid);
      }
    });
  }, [call.participants, pushToast]);

  useEffect(() => {
    if (call.status === 'ended') navigate('/rooms');
  }, [call.status, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [call.messages, panel]);

  // Host broadcasts Pomodoro to the room.
  useEffect(() => {
    if (!call.isHost || !pomodoro) return;
    call.broadcastPomodoro({ mode: pomodoro.mode, secondsLeft: pomodoro.secondsLeft, running: pomodoro.running });
  }, [call.isHost, pomodoro?.mode, pomodoro?.secondsLeft, pomodoro?.running]); // eslint-disable-line

  // Clear pin if pinned person leaves.
  useEffect(() => {
    if (pinnedId && !call.participants.find((p) => p.id === pinnedId) && pinnedId !== 'me') {
      setPinnedId(null);
    }
  }, [call.participants, pinnedId]);

  const timer = call.isHost ? pomodoro : call.remotePomodoro;

  // Tile list: me first, then remotes.
  const tiles = [
    {
      tileId: 'me',
      stream: call.localStream,
      name: displayName,
      micOn: call.micOn,
      camOn: call.camOn,
      hand: call.handRaised,
      sharing: call.sharing,
      isLocal: true,
      speaking: call.speakingIds.includes('me'),
    },
    ...call.participants.map((p) => ({
      tileId: p.id,
      stream: p.stream,
      name: p.name || 'Connecting…',
      micOn: p.micOn,
      camOn: p.camOn,
      hand: p.hand,
      sharing: false,
      isLocal: false,
      speaking: call.speakingIds.includes(p.id),
    })),
  ];

  const total = tiles.length;
  const cols = total <= 1 ? 1 : total <= 4 ? 2 : 3;

  // Speaker view: pinned > active speaker > first tile
  const activeSpeakerId = call.speakingIds.find((sid) => sid !== null);
  const mainTileId = pinnedId || activeSpeakerId || tiles[0]?.tileId;
  const mainTile = tiles.find((t) => t.tileId === mainTileId) || tiles[0];
  const stripTiles = tiles.filter((t) => t !== mainTile);

  const submitChat = (e) => {
    e.preventDefault();
    call.sendChat(chatText);
    setChatText('');
  };

  if (call.status === 'error') {
    return (
      <div className="rc-error">
        <h2>Camera / mic blocked</h2>
        <p>Allow camera and microphone access in your browser, then rejoin.</p>
        <button className="rc-leave-btn" onClick={() => navigate('/rooms')}>Back to Rooms</button>
      </div>
    );
  }

  if (call.status === 'full') {
    return (
      <div className="rc-error">
        <h2>Room is full</h2>
        <p>This room has reached its {info.max}-participant limit. Try again later or join a different room.</p>
        <button className="rc-leave-btn" onClick={() => navigate('/rooms')}>Back to Rooms</button>
      </div>
    );
  }

  return (
    <div className="rc" ref={rcRef}>
      {/* Header */}
      <header className="rc-header">
        <div className="rc-title">
          <h2>{info.name}</h2>
          <span className={'rc-status rc-status--' + call.status}>
            {call.status === 'connecting' ? 'Connecting…' : 'Live'}
          </span>
          {call.isHost && <span className="rc-host-badge"><Crown size={12} /> Host</span>}
        </div>

        <div className="rc-view-toggle">
          <button
            className={viewMode === 'gallery' ? 'active' : ''}
            onClick={() => setViewMode('gallery')}
            title="Gallery view"
          >
            <LayoutGrid size={14} /> Gallery
          </button>
          <button
            className={viewMode === 'speaker' ? 'active' : ''}
            onClick={() => setViewMode('speaker')}
            title="Speaker view"
          >
            <Monitor size={14} /> Speaker
          </button>
        </div>

        {timer && (
          <div className="rc-timer">
            <span className="rc-timer-mode">{timer.mode === 'focus' ? 'Focus' : timer.mode === 'short' ? 'Break' : 'Long Break'}</span>
            <span className="rc-timer-time">{formatTime(timer.secondsLeft)}</span>
          </div>
        )}
        <div className="rc-invite">
          <span>Code: <strong>{id}</strong></span>
        </div>
      </header>

      <div className="rc-body">
        {/* Video area */}
        <div className="rc-stage">
          {viewMode === 'gallery' ? (
            <div className="rc-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {tiles.map(({ tileId, ...t }) => (
                <VideoTile
                  key={tileId}
                  {...t}
                  spotlight={t.speaking && total > 2}
                  onClick={() => { setPinnedId(tileId); setViewMode('speaker'); }}
                />
              ))}
            </div>
          ) : (
            <div className="rc-speaker-layout">
              <div className="rc-speaker-main">
                {mainTile && (
                  <VideoTile
                    key={mainTile.tileId}
                    stream={mainTile.stream}
                    name={mainTile.name}
                    micOn={mainTile.micOn}
                    camOn={mainTile.camOn}
                    hand={mainTile.hand}
                    sharing={mainTile.sharing}
                    isLocal={mainTile.isLocal}
                    speaking={mainTile.speaking}
                  />
                )}
              </div>
              {stripTiles.length > 0 && (
                <div className="rc-strip">
                  {stripTiles.map(({ tileId, ...t }) => (
                    <div
                      key={tileId}
                      className={'rc-strip-item' + (tileId === pinnedId ? ' rc-strip-item--pinned' : '')}
                      onClick={() => setPinnedId(pinnedId === tileId ? null : tileId)}
                      title={pinnedId === tileId ? 'Unpin' : 'Pin to main view'}
                    >
                      <VideoTile {...t} thumb />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Floating reactions */}
          <div className="rc-reactions">
            {call.reactions.map((r) => (
              <span key={r.key} className="rc-reaction">{r.emoji}</span>
            ))}
          </div>

          {/* Join / leave toasts */}
          <div className="rc-toasts">
            {toasts.map((t) => (
              <div key={t.key} className="rc-toast">{t.text}</div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        {panel === 'chat' && (
          <aside className="rc-panel">
            <div className="rc-panel-head">
              <h3>Chat</h3>
              <button onClick={() => setPanel(null)} aria-label="Close">×</button>
            </div>
            <div className="rc-chat-log">
              {call.messages.length === 0 && <p className="rc-chat-empty">No messages yet. Say hi 👋</p>}
              {call.messages.map((m, i) => (
                <div key={i} className={'rc-msg' + (m.id === call.myId ? ' rc-msg--me' : '')}>
                  <span className="rc-msg-name">{m.id === call.myId ? 'You' : m.name}</span>
                  <span className="rc-msg-text">{m.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form className="rc-chat-input" onSubmit={submitChat}>
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Type a message…"
              />
              <button type="submit" aria-label="Send"><Send size={16} /></button>
            </form>
          </aside>
        )}

        {panel === 'people' && (
          <aside className="rc-panel">
            <div className="rc-panel-head">
              <h3>People ({total})</h3>
              <button onClick={() => setPanel(null)} aria-label="Close">×</button>
            </div>
            <div className="rc-people">
              <div className="rc-person">
                <span className="rc-person-name">{displayName} (You){call.isHost && ' 👑'}</span>
                {!call.micOn && <MicOff size={14} />}
              </div>
              {call.participants.map((p) => (
                <div key={p.id} className="rc-person">
                  <span className="rc-person-name">
                    {p.name || 'Connecting…'} {p.hand && '✋'}
                  </span>
                  <span className="rc-person-actions">
                    {!p.micOn && <MicOff size={14} />}
                    {call.isAdmin && (
                      <>
                        <button onClick={() => call.muteParticipant(p.id)} title="Mute" aria-label="Mute participant">
                          <VolumeX size={14} />
                        </button>
                        <button onClick={() => call.kickParticipant(p.id)} title="Remove" aria-label="Remove participant">
                          <UserX size={14} />
                        </button>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
            {call.isAdmin && (
              <p className="rc-admin-note"><Shield size={12} /> You have host controls — mute or remove anyone.</p>
            )}
          </aside>
        )}
      </div>

      {/* Control bar */}
      <footer className="rc-controls">
        <button className={'rc-ctrl' + (call.micOn ? '' : ' rc-ctrl--off')} onClick={call.toggleMic}>
          {call.micOn ? <Mic size={20} /> : <MicOff size={20} />}
          <span>{call.micOn ? 'Mute' : 'Unmute'}</span>
        </button>
        <button className={'rc-ctrl' + (call.camOn ? '' : ' rc-ctrl--off')} onClick={call.toggleCam}>
          {call.camOn ? <Cam size={20} /> : <VideoOff size={20} />}
          <span>{call.camOn ? 'Stop Video' : 'Start Video'}</span>
        </button>
        <button className={'rc-ctrl' + (call.sharing ? ' rc-ctrl--active' : '')} onClick={call.sharing ? call.stopScreenShare : call.startScreenShare}>
          {call.sharing ? <MonitorX size={20} /> : <MonitorUp size={20} />}
          <span>{call.sharing ? 'Stop Share' : 'Share'}</span>
        </button>
        <button className={'rc-ctrl' + (call.handRaised ? ' rc-ctrl--active' : '')} onClick={call.raiseHand}>
          <Hand size={20} />
          <span>{call.handRaised ? 'Lower' : 'Raise'}</span>
        </button>
        <div className="rc-ctrl-wrap">
          <button className="rc-ctrl" onClick={() => setShowEmoji((v) => !v)}>
            <Smile size={20} />
            <span>React</span>
          </button>
          {showEmoji && (
            <div className="rc-emoji-pop">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => { call.sendReaction(e); setShowEmoji(false); }}>{e}</button>
              ))}
            </div>
          )}
        </div>
        <button className={'rc-ctrl' + (panel === 'chat' ? ' rc-ctrl--active' : '')} onClick={() => setPanel(panel === 'chat' ? null : 'chat')}>
          <MessageSquare size={20} />
          <span>Chat</span>
        </button>
        <button className={'rc-ctrl' + (panel === 'people' ? ' rc-ctrl--active' : '')} onClick={() => setPanel(panel === 'people' ? null : 'people')}>
          <Users size={20} />
          <span>People</span>
        </button>
        <button className="rc-ctrl" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
        </button>
        <div className="rc-ctrl-wrap">
          <button className="rc-ctrl rc-ctrl--leave" onClick={() => setConfirmLeave((v) => !v)}>
            <PhoneOff size={20} />
            <span>Leave</span>
          </button>
          {confirmLeave && (
            <div className="rc-leave-pop">
              <p>Leave this room?</p>
              <div className="rc-leave-pop-actions">
                <button onClick={() => setConfirmLeave(false)}>Cancel</button>
                <button className="rc-leave-pop-confirm" onClick={call.leave}>Leave</button>
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

export default RoomCall;
