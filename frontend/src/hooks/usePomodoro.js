import { useState, useEffect, useCallback } from 'react';

export const POMODORO_MODES = {
  focus: { label: 'Focus', seconds: 25 * 60 },
  short: { label: 'Short Break', seconds: 5 * 60 },
  long: { label: 'Long Break', seconds: 15 * 60 },
};

export function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/*
 * Classic Pomodoro cycle: 4 × (Focus → Short Break), then a Long Break.
 * Lives in App so the timer keeps running while navigating between pages.
 */
export function usePomodoro() {
  const [mode, setModeState] = useState('focus');
  const [secondsLeft, setSecondsLeft] = useState(POMODORO_MODES.focus.seconds);
  const [running, setRunning] = useState(false);
  const [round, setRound] = useState(1);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  // Auto-advance through the cycle when a session ends.
  useEffect(() => {
    if (secondsLeft > 0) return;
    setRunning(false);
    if (mode === 'focus') {
      const next = round >= 4 ? 'long' : 'short';
      setModeState(next);
      setSecondsLeft(POMODORO_MODES[next].seconds);
    } else {
      if (mode === 'long') setRound(1);
      else setRound((r) => r + 1);
      setModeState('focus');
      setSecondsLeft(POMODORO_MODES.focus.seconds);
    }
  }, [secondsLeft, mode, round]);

  const setMode = useCallback((m) => {
    setModeState(m);
    setSecondsLeft(POMODORO_MODES[m].seconds);
    setRunning(false);
  }, []);

  const toggle = useCallback(() => setRunning((r) => !r), []);

  const reset = useCallback(() => {
    setSecondsLeft(POMODORO_MODES[mode].seconds);
    setRunning(false);
  }, [mode]);

  return { mode, secondsLeft, running, round, setMode, toggle, reset };
}
