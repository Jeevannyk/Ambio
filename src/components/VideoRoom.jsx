import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  MessageSquare, Hand, PhoneOff, Smile, X, Send, Users,
} from 'lucide-react';
import './VideoRoom.css';

/* ── Simulated participants ───────────────────────────────────────────── */
const FAKE_PARTICIPANTS = [
  { id: 'fp1', name: 'Alex Chen', initials: 'AC', color: '#6366f1', muted: false },
  { id: 'fp2', name: 'Sarah Kim', initials: 'SK', color: '#ec4899', muted: true },
  { id: 'fp3', name: 'Dev Patel', initials: 'DP', color: '#f59e0b', muted: false },
];

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👏', '😮', '🚀'];
const CHAT_EMOJIS = ['😊', '👍', '❤️', '😂', '🎉', '🔥', '✅', '💯'];

/* ── Timer helper ─────────────────────────────────────────────────────── */
function formatTimer(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ══════════════════════════════════════════════════════════════════════ */

function VideoRoom({ room, onLeave }) {
  /* ── Media state ─────────────────────────────────────────────────── */
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);

  /* ── UI state ────────────────────────────────────────────────────── */
  const [chatOpen, setChatOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [timer, setTimer] = useState(0);

  /* ── Chat state ──────────────────────────────────────────────────── */
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  /* ── Reactions ───────────────────────────────────────────────────── */
  const [reactions, setReactions] = useState([]);
  const reactionIdRef = useRef(0);

  /* ── Media refs ──────────────────────────────────────────────────── */
  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const streamRef = useRef(null);
  const screenStreamRef = useRef(null);

  /* ── Call timer ──────────────────────────────────────────────────── */
  useEffect(() => {
    const id = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  /* ── Start camera + mic ─────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (err) {
        console.warn('Camera/mic access denied:', err);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /* ── Mic toggle ─────────────────────────────────────────────────── */
  const toggleMic = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    }
    setMicOn((v) => !v);
  }, []);

  /* ── Camera toggle ──────────────────────────────────────────────── */
  const toggleCam = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    }
    setCamOn((v) => !v);
  }, []);

  /* ── Screen share ───────────────────────────────────────────────── */
  const toggleScreenShare = useCallback(async () => {
    if (screenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setScreenSharing(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      if (screenVideoRef.current) screenVideoRef.current.srcObject = stream;
      setScreenSharing(true);
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        screenStreamRef.current = null;
        setScreenSharing(false);
      });
    } catch {
      /* user cancelled */
    }
  }, [screenSharing]);

  /* ── Leave call ─────────────────────────────────────────────────── */
  const handleLeave = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    onLeave();
  }, [onLeave]);

  /* ── Send chat message ──────────────────────────────────────────── */
  const sendMessage = useCallback((text) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { id: Date.now(), name: 'You', text: trimmed, time: nowTime() }]);
    setChatInput('');

    // Simulated reply after 2–4s
    const replyDelay = 2000 + Math.random() * 2000;
    const participant = FAKE_PARTICIPANTS[Math.floor(Math.random() * FAKE_PARTICIPANTS.length)];
    const replies = [
      'Sounds good! 👍', 'I agree', 'Let me look into that', 'Great point!',
      'Can you share your screen?', '😂😂', 'Noted, thanks!', 'Let\'s discuss after',
      'Sure, go ahead!', 'Makes sense to me', 'I\'ll update the doc', '100% 🔥',
    ];
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), name: participant.name, text: replies[Math.floor(Math.random() * replies.length)], time: nowTime() },
      ]);
    }, replyDelay);
  }, []);

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatInput);
    }
  };

  const insertChatEmoji = (emoji) => {
    setChatInput((prev) => prev + emoji);
  };

  /* ── Auto-scroll chat ───────────────────────────────────────────── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Emoji reactions ────────────────────────────────────────────── */
  const fireReaction = useCallback((emoji) => {
    const id = ++reactionIdRef.current;
    const left = 15 + Math.random() * 70;
    setReactions((prev) => [...prev, { id, emoji, left }]);
    setEmojiPickerOpen(false);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2600);
  }, []);

  /* ── Keyboard shortcuts ─────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      // Alt+A = toggle mic
      if (e.altKey && e.key.toLowerCase() === 'a') { e.preventDefault(); toggleMic(); }
      // Alt+V = toggle cam
      if (e.altKey && e.key.toLowerCase() === 'v') { e.preventDefault(); toggleCam(); }
      // Escape = close pickers / leave
      if (e.key === 'Escape') {
        if (emojiPickerOpen) setEmojiPickerOpen(false);
        else if (chatOpen) setChatOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleMic, toggleCam, emojiPickerOpen, chatOpen]);

  /* ── Determine grid layout ──────────────────────────────────────── */
  const totalTiles = 1 + FAKE_PARTICIPANTS.length + (screenSharing ? 1 : 0);
  const gridClass = totalTiles <= 1 ? 'vr-grid--1'
    : totalTiles <= 2 ? 'vr-grid--2'
    : 'vr-grid--4';

  /* ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="vr-overlay">
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="vr-topbar">
        <div className="vr-topbar-left">
          <span className="vr-room-name">{room.name}</span>
          <span className="vr-room-separator" />
          <span className="vr-participants-count">
            <Users size={13} /> {1 + FAKE_PARTICIPANTS.length}
          </span>
        </div>
        <div className="vr-topbar-right">
          <span className="vr-recording-dot" />
          <span className="vr-timer">{formatTimer(timer)}</span>
        </div>
      </div>

      {/* ── Main area ────────────────────────────────────────────── */}
      <div className="vr-main">
        <div className="vr-video-area">
          <div className={`vr-grid ${gridClass}`}>
            {/* Screen share tile (if active) */}
            {screenSharing && (
              <div className="vr-screenshare-tile" style={{ gridColumn: 'span 2' }}>
                <video ref={screenVideoRef} autoPlay playsInline />
                <span className="vr-screenshare-badge">
                  <Monitor size={12} /> You are sharing your screen
                </span>
              </div>
            )}

            {/* Your video tile */}
            <div className={`vr-tile vr-tile--you${micOn ? ' vr-tile--speaking' : ''}`}>
              {camOn ? (
                <video ref={localVideoRef} autoPlay playsInline muted />
              ) : (
                <div className="vr-tile-avatar">
                  You
                </div>
              )}
              <div className="vr-tile-bottom">
                <span className="vr-tile-name">
                  You <span className="vr-tile-you-badge">YOU</span>
                </span>
                <div className="vr-tile-indicators">
                  {handRaised && <span className="vr-tile-hand">🖐️</span>}
                  {!micOn && (
                    <span className="vr-tile-muted">
                      <MicOff size={12} color="#fff" />
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Simulated participant tiles */}
            {FAKE_PARTICIPANTS.map((p) => (
              <div key={p.id} className={`vr-tile${!p.muted ? ' vr-tile--speaking' : ''}`}>
                <div className="vr-tile-avatar" style={{ background: `linear-gradient(135deg, ${p.color} 0%, ${p.color}cc 100%)` }}>
                  {p.initials}
                </div>
                <div className="vr-tile-bottom">
                  <span className="vr-tile-name">{p.name}</span>
                  <div className="vr-tile-indicators">
                    {p.muted && (
                      <span className="vr-tile-muted">
                        <MicOff size={12} color="#fff" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Floating emoji reactions */}
          {reactions.map((r) => (
            <span key={r.id} className="vr-reaction" style={{ left: `${r.left}%`, bottom: '100px' }}>
              {r.emoji}
            </span>
          ))}

          {/* Emoji picker */}
          {emojiPickerOpen && (
            <div className="vr-emoji-picker">
              {REACTION_EMOJIS.map((emoji) => (
                <button key={emoji} className="vr-emoji-btn" onClick={() => fireReaction(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Chat panel ──────────────────────────────────────────── */}
        {chatOpen && (
          <div className="vr-chat">
            <div className="vr-chat-header">
              <p className="vr-chat-title">Meeting Chat</p>
              <button className="vr-chat-close" onClick={() => setChatOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {messages.length === 0 ? (
              <div className="vr-chat-empty">
                <span className="vr-chat-empty-icon">💬</span>
                <span>No messages yet</span>
                <span>Send a message to start chatting</span>
              </div>
            ) : (
              <div className="vr-chat-messages">
                {messages.map((msg) => (
                  <div key={msg.id} className="vr-chat-msg">
                    <div className="vr-chat-msg-header">
                      <span className="vr-chat-msg-name">{msg.name}</span>
                      <span className="vr-chat-msg-time">{msg.time}</span>
                    </div>
                    <p className="vr-chat-msg-text">{msg.text}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}

            <div className="vr-chat-emoji-row">
              {CHAT_EMOJIS.map((e) => (
                <button key={e} className="vr-chat-emoji-btn" onClick={() => insertChatEmoji(e)}>
                  {e}
                </button>
              ))}
            </div>

            <div className="vr-chat-input-row">
              <input
                className="vr-chat-input"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                autoFocus
              />
              <button className="vr-chat-send" onClick={() => sendMessage(chatInput)}>
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom controls ──────────────────────────────────────── */}
      <div className="vr-controls">
        {/* Mic */}
        <button className={`vr-ctrl-btn${!micOn ? ' vr-ctrl-btn--off' : ''}`} onClick={toggleMic}>
          <span className="vr-ctrl-icon">
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          </span>
          <span className="vr-ctrl-label">{micOn ? 'Mute' : 'Unmute'}</span>
        </button>

        {/* Camera */}
        <button className={`vr-ctrl-btn${!camOn ? ' vr-ctrl-btn--off' : ''}`} onClick={toggleCam}>
          <span className="vr-ctrl-icon">
            {camOn ? <Video size={20} /> : <VideoOff size={20} />}
          </span>
          <span className="vr-ctrl-label">{camOn ? 'Stop Video' : 'Start Video'}</span>
        </button>

        <div className="vr-ctrl-divider" />

        {/* Screen Share */}
        <button className={`vr-ctrl-btn${screenSharing ? ' vr-ctrl-btn--active' : ''}`} onClick={toggleScreenShare}>
          <span className="vr-ctrl-icon">
            {screenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
          </span>
          <span className="vr-ctrl-label">{screenSharing ? 'Stop Share' : 'Share Screen'}</span>
        </button>

        {/* Reactions */}
        <button
          className={`vr-ctrl-btn${emojiPickerOpen ? ' vr-ctrl-btn--active' : ''}`}
          onClick={() => setEmojiPickerOpen((v) => !v)}
        >
          <span className="vr-ctrl-icon"><Smile size={20} /></span>
          <span className="vr-ctrl-label">Reactions</span>
        </button>

        {/* Chat */}
        <button className={`vr-ctrl-btn${chatOpen ? ' vr-ctrl-btn--active' : ''}`} onClick={() => setChatOpen((v) => !v)}>
          <span className="vr-ctrl-icon">
            <MessageSquare size={20} />
          </span>
          <span className="vr-ctrl-label">Chat</span>
        </button>

        {/* Raise Hand */}
        <button className={`vr-ctrl-btn${handRaised ? ' vr-ctrl-btn--active' : ''}`} onClick={() => setHandRaised((v) => !v)}>
          <span className="vr-ctrl-icon"><Hand size={20} /></span>
          <span className="vr-ctrl-label">{handRaised ? 'Lower Hand' : 'Raise Hand'}</span>
        </button>

        <div className="vr-ctrl-divider" />

        {/* Leave */}
        <button className="vr-ctrl-btn vr-ctrl-btn--leave" onClick={handleLeave}>
          <span className="vr-ctrl-icon"><PhoneOff size={20} /></span>
          <span className="vr-ctrl-label">Leave</span>
        </button>
      </div>
    </div>
  );
}

export default VideoRoom;
