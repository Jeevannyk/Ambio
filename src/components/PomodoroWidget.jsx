import React from 'react';
import { useLocation } from 'react-router-dom';
import { Play, Pause } from 'lucide-react';
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

  const { mode, secondsLeft, running, toggle } = pomodoro;

  return (
    <div className="pomo-widget">
      <span className={'pomo-widget-dot' + (running ? ' pomo-widget-dot--on' : '')} />
      <div className="pomo-widget-info">
        <span className="pomo-widget-mode">{POMODORO_MODES[mode].label}</span>
        <span className="pomo-widget-time">{formatTime(secondsLeft)}</span>
      </div>
      <button
        className="pomo-widget-btn"
        onClick={toggle}
        aria-label={running ? 'Pause timer' : 'Start timer'}
      >
        {running ? <Pause size={14} /> : <Play size={14} />}
      </button>
    </div>
  );
}

export default PomodoroWidget;
