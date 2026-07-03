import React from 'react';
import { useLocation } from 'react-router-dom';
import { Play, Pause, RotateCcw, Zap, Coffee } from 'lucide-react';
import { POMODORO_MODES, formatTime } from '../hooks/usePomodoro';

/*
 * Compact always-visible timer docked at the side, so the Pomodoro keeps
 * ticking (and stays visible) on every page. Hidden on the full-screen
 * workspaces — /my-room (full card), /tasks (would overlap the list), and a
 * live room (header shows it; dock would overlap the video).
 */
function PomodoroWidget({ pomodoro }) {
  const location = useLocation();
  const path = location.pathname;
  if (path === '/my-room' || path === '/tasks' || /^\/rooms\/.+/.test(path)) return null;

  const { mode, secondsLeft, running, toggle, reset } = pomodoro;
  const total = POMODORO_MODES[mode].seconds;
  const pct = Math.max(0, Math.min(100, ((total - secondsLeft) / total) * 100));
  const ModeIcon = mode === 'focus' ? Zap : Coffee;

  return (
    <div className={'pomo-widget' + (running ? ' pomo-widget--running' : '')}>
      <span className="pomo-widget-badge"><ModeIcon size={14} /></span>

      <div className="pomo-widget-info">
        <span className="pomo-widget-mode">{POMODORO_MODES[mode].label}</span>
        <span className="pomo-widget-time">{formatTime(secondsLeft)}</span>
      </div>

      <button className="pomo-widget-reset" onClick={reset} aria-label="Reset timer" title="Reset">
        <RotateCcw size={14} />
      </button>

      <div className="pomo-widget-ring" style={{ '--pomo-pct': `${pct}%` }}>
        <button
          className="pomo-widget-btn"
          onClick={toggle}
          aria-label={running ? 'Pause timer' : 'Start timer'}
        >
          {running ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
        </button>
      </div>
    </div>
  );
}

export default PomodoroWidget;
