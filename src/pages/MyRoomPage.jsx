import React from 'react';
import { User, Play, Pause, RotateCcw, CameraOff } from 'lucide-react';
import { POMODORO_MODES, formatTime } from '../hooks/usePomodoro';

function MyRoomPage({ pomodoro }) {
  const { mode, secondsLeft, running, round, setMode, toggle, reset } = pomodoro;

  const total = POMODORO_MODES[mode].seconds;
  const progress = total ? ((total - secondsLeft) / total) * 100 : 0;

  const status = running
    ? mode === 'focus'
      ? 'Focusing…'
      : 'On a break — breathe.'
    : 'Ready when you are';

  return (
    <div className="my-room-page">
      <div className="my-room-header">
        <h2 className="rooms-title">My Room</h2>
        <p className="rooms-sub">
          <CameraOff size={13} /> Your private space — no camera, no one else. Just you and your focus.
        </p>
      </div>

      <div className="my-room-card">
        <div className="my-room-avatar">
          <User size={20} />
        </div>
        <p className="my-room-status">{status}</p>

        <div className="my-room-durations">
          {Object.entries(POMODORO_MODES).map(([key, m]) => (
            <button
              key={key}
              className={'my-room-chip' + (mode === key ? ' my-room-chip--active' : '')}
              onClick={() => setMode(key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <p className="my-room-time">{formatTime(secondsLeft)}</p>

        <div className="my-room-progress">
          <div className="my-room-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="my-room-rounds">
          <span className="pomo-round-dots">
            {Array.from({ length: 4 }, (_, i) => (
              <span
                key={i}
                className={'pomo-round-dot' + (i < round - 1 || (i === round - 1 && mode !== 'focus') ? ' pomo-round-dot--done' : '')}
              />
            ))}
          </span>
          Round {round} of 4
        </div>

        <div className="my-room-controls">
          <button className="my-room-btn my-room-btn--primary" onClick={toggle}>
            {running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Start</>}
          </button>
          <button className="my-room-btn" onClick={reset}>
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </div>
    </div>
  );
}

export default MyRoomPage;
