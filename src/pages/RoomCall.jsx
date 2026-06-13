import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Video as Cam, VideoOff, MonitorUp, MonitorX, Hand,
  Smile, MessageSquare, Users, PhoneOff, Send, Shield, VolumeX, UserX, Crown,
} from 'lucide-react';
import { useRoomCall } from '../hooks/useRoomCall';
import { formatTime } from '../hooks/usePomodoro';
import VideoTile from '../components/room/VideoTile';
import './RoomCall.css';

const ROOMS_KEY = 'react-todo-app.rooms';
const NAME_KEY = 'react-todo-app.displayName';
const EMOJIS = ['👍', '❤️', '🎉', '😂', '🔥', '👏'];

function roomName(id) {
  try {
    const rooms = JSON.parse(localStorage.getItem(ROOMS_KEY)) || [];
    return rooms.find((r) => r.id === id)?.name || 'Focus Room';
  } catch {
    return 'Focus Room';
  }
}

function RoomCall({ isAdmin, pomodoro }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [displayName] = useState(() => localStorage.getItem(NAME_KEY) || `Guest ${Math.floor(Math.random() * 900 + 100)}`);

  const call = useRoomCall(id, displayName, isAdmin);
  const [panel, setPanel] = useState(null); // 'chat' | 'people' | null
  const [chatText, setChatText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (call.status === 'ended') navigate('/rooms');
  }, [call.status, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [call.messages, panel]);

  // Host streams the shared Pomodoro to the room.
  useEffect(() => {
    if (!call.isHost || !pomodoro) return;
    call.broadcastPomodoro({ mode: pomodoro.mode, secondsLeft: pomodoro.secondsLeft, running: pomodoro.running });
  }, [call.isHost, pomodoro?.mode, pomodoro?.secondsLeft, pomodoro?.running]); // eslint-disable-line

  const timer = call.isHost ? pomodoro : call.remotePomodoro;

  // Build the tile list: me first, then remotes.
  const tiles = [
    {
      key: 'me',
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
      key: p.id,
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

  return (
    <div className="rc">
      {/* Header */}
      <header className="rc-header">
        <div className="rc-title">
          <h2>{roomName(id)}</h2>
          <span className={'rc-status rc-status--' + call.status}>
            {call.status === 'connecting' ? 'Connecting…' : 'Live'}
          </span>
          {call.isHost && <span className="rc-host-badge"><Crown size={12} /> Host</span>}
        </div>
        {timer && (
          <div className="rc-timer">
            <span className="rc-timer-mode">{timer.mode === 'focus' ? 'Focus' : timer.mode === 'short' ? 'Break' : 'Long Break'}</span>
            <span className="rc-timer-time">{formatTime(timer.secondsLeft)}</span>
          </div>
        )}
        <div className="rc-invite">
          <span>Invite code: <strong>{id.slice(0, 8)}</strong></span>
        </div>
      </header>

      <div className="rc-body">
        {/* Video grid */}
        <div className="rc-stage">
          <div className="rc-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {tiles.map((t) => (
              <VideoTile key={t.key} {...t} spotlight={t.speaking && total > 2} />
            ))}
          </div>

          {/* Floating reactions */}
          <div className="rc-reactions">
            {call.reactions.map((r) => (
              <span key={r.key} className="rc-reaction">{r.emoji}</span>
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
        <button className="rc-ctrl rc-ctrl--leave" onClick={call.leave}>
          <PhoneOff size={20} />
          <span>Leave</span>
        </button>
      </footer>
    </div>
  );
}

export default RoomCall;
