import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Play, Pause, ArrowCounterClockwise, Lightning, Coffee, X } from '@phosphor-icons/react';
import { POMODORO_MODES, formatTime } from '../hooks/usePomodoro';
import { isAuthRoute } from '../lib/auth';

function PomodoroWidget({ pomodoro }) {
  const location = useLocation();
  const path = location.pathname;
  if (path === '/my-room' || path === '/tasks' || isAuthRoute(path) || /^\/rooms\/.+/.test(path)) return null;

  const { mode, secondsLeft, running, round, setMode, toggle, reset } = pomodoro;
  const [expanded, setExpanded] = useState(false);

  const total = POMODORO_MODES[mode].seconds;
  const pct = Math.max(0, Math.min(100, ((total - secondsLeft) / total) * 100));
  const ModeIcon = mode === 'focus' ? Lightning : Coffee;

  const handlePlay = (e) => {
    e.stopPropagation();
    toggle();
    setExpanded(true);
  };

  return (
    <div className="pomo-widget-wrap">

      {/* ── Expanded panel ───────────────────────────────────── */}
      {/* Stays mounted so it can transition out instead of vanishing. */}
      <div className="pomo-expand" onClick={(e) => e.stopPropagation()} hidden={!expanded}>

        {/* header row */}
        <div className="pomo-expand-head">
          <span className="pomo-expand-label">Pomodoro</span>
          <button className="pomo-expand-close" onClick={() => setExpanded(false)} aria-label="Close">
            <X size={13} />
          </button>
        </div>

        {/* big ring */}
        <div className="pomo-expand-ring-wrap">
          <div className="pomo-expand-ring" style={{ '--pomo-pct': `${pct}%` }}>
            <div className="pomo-expand-ring-inner">
              <span className="pomo-expand-mode-lbl">{POMODORO_MODES[mode].label.toUpperCase()}</span>
              <span className="pomo-expand-time-big">{formatTime(secondsLeft)}</span>
            </div>
          </div>
        </div>

        {/* mode chips */}
        <div className="pomo-expand-chips">
          {Object.entries(POMODORO_MODES).map(([key, m]) => (
            <button
              key={key}
              className={'pomo-expand-chip' + (mode === key ? ' pomo-expand-chip--on' : '')}
              onClick={() => setMode(key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* round dots */}
        <div className="pomo-expand-rounds">
          {Array.from({ length: 4 }, (_, i) => (
            <span
              key={i}
              className={
                'pomo-expand-dot' +
                (i < round - 1 || (i === round - 1 && mode !== 'focus')
                  ? ' pomo-expand-dot--done'
                  : '')
              }
            />
          ))}
          <span className="pomo-expand-round-text">Round {round} / 4</span>
        </div>

        {/* controls */}
        <div className="pomo-expand-controls">
          <button
            className="pomo-expand-play"
            onClick={() => toggle()}
            aria-label={running ? 'Pause' : 'Start'}
          >
            {running
              ? <Pause size={20} fill="currentColor" />
              : <Play  size={20} fill="currentColor" />}
          </button>
          <button className="pomo-expand-reset" onClick={reset} aria-label="Reset">
            <ArrowCounterClockwise size={16} />
          </button>
        </div>

      </div>

      {/* ── Compact pill ────────────────────────────────────── */}
      <div className={'pomo-widget' + (running ? ' pomo-widget--running' : '') + (expanded ? ' pomo-widget--open' : '')}>
        <span className="pomo-widget-badge"><ModeIcon size={14} /></span>
        <div className="pomo-widget-info">
          <span className="pomo-widget-mode">{POMODORO_MODES[mode].label}</span>
          <span className="pomo-widget-time">{formatTime(secondsLeft)}</span>
        </div>
        <button
          className="pomo-widget-reset"
          onClick={(e) => { e.stopPropagation(); reset(); }}
          aria-label="Reset"
        >
          <ArrowCounterClockwise size={13} />
        </button>
        <div className="pomo-widget-ring" style={{ '--pomo-pct': `${pct}%` }}>
          <button className="pomo-widget-btn" onClick={handlePlay} aria-label={running ? 'Pause' : 'Start'}>
            {running ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>
        </div>
      </div>

    </div>
  );
}

export default PomodoroWidget;
