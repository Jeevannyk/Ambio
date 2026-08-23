import { useCallback, useEffect, useRef, useState } from 'react';
import { fmtTime, reminderDueAt } from '../lib/reminders';

const TASKS_KEY = 'react-todo-app.tasks';
const FIRED_KEY = 'react-todo-app.reminders.fired';
const CHECK_KEY = 'react-todo-app.reminders.lastCheck';
const MUTE_KEY = 'react-todo-app.reminders.muted';
const POLL_MS = 20000;
const OVERDUE_MS = 5 * 60 * 1000;
const FIRED_TTL = 7 * 24 * 60 * 60 * 1000;

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

// One AudioContext for the whole app. Built lazily at fire time it can still be
// suspended (no gesture yet), and then the scheduled tones play silently — so
// the first pointerdown/keydown creates and resumes it instead.
let audioCtx = null;
function unlockAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch {
    return null; // audio not available — fail silently
  }
}

// Soft two-note "ding-dong" chime — synthesized with the Web Audio API so
// there's no audio file to ship. Sounds like a polished to-do app.
function playReminderChime() {
  const ctx = unlockAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  // Two bell tones (C6 then G5) with a quick attack and gentle decay.
  [[1046.5, 0], [783.99, 0.18]].forEach(([freq, delay]) => {
    const t = now + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.95);
  });
}

/*
 * Every reminder that came due in (last, now]. Working from a persisted
 * last-check timestamp instead of a fixed "due in the past 2 minutes" window is
 * what makes catch-up correct after the tab slept or sat on another route.
 */
export function dueSince(tasks, last, now) {
  return tasks
    .filter((task) => !task.done)
    .map((task) => ({ task, due: reminderDueAt(task.reminder) }))
    .filter(({ due }) => due && due.getTime() > last && due.getTime() <= now);
}

/*
 * Watches every task's reminder and chimes (+ notifies) when one comes due.
 * Lives in App so reminders keep firing while the user is on /my-room or in a
 * room call — inside TasksPage they died the moment you navigated away. Tasks
 * are read straight from localStorage, which TasksPage already treats as the
 * store of record, so there's no second copy of the list to keep in sync.
 */
export function useReminders() {
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === '1');
  const [notifyPermission, setNotifyPermission] = useState(() =>
    (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission));
  const [firedAt, setFiredAt] = useState({}); // task id → timestamp, for the row flash
  const mutedRef = useRef(muted);
  const notifyRef = useRef(notifyPermission);

  useEffect(() => {
    mutedRef.current = muted;
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  }, [muted]);

  useEffect(() => {
    notifyRef.current = notifyPermission;
  }, [notifyPermission]);

  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const notify = (task, due, overdue) => {
      // A notification while the tab is already focused adds nothing.
      if (notifyRef.current !== 'granted' || !document.hidden) return;
      try {
        const note = new Notification(task.text, {
          body: overdue ? `Overdue — was due at ${fmtTime(due.getHours(), due.getMinutes())}` : 'Reminder',
          tag: task.id, // duplicate reminders replace instead of stacking
        });
        note.onclick = () => {
          window.focus();
          note.close();
        };
      } catch {
        /* notifications unavailable — the chime already fired */
      }
    };

    const check = () => {
      const now = Date.now();
      const last = Number(localStorage.getItem(CHECK_KEY)) || now;
      const fired = readJSON(FIRED_KEY, {});
      const justFired = {};
      let dirty = false;

      dueSince(readJSON(TASKS_KEY, []), last, now).forEach(({ task, due }) => {
        const key = `${task.id}|${due.getTime()}`; // normalized ts: re-typing "9AM" isn't a new key
        if (fired[key]) return;
        fired[key] = now;
        justFired[task.id] = now;
        dirty = true;
        if (!mutedRef.current) playReminderChime();
        notify(task, due, now - due.getTime() > OVERDUE_MS);
      });

      Object.keys(fired).forEach((key) => {
        if (now - fired[key] > FIRED_TTL) {
          delete fired[key];
          dirty = true;
        }
      });

      localStorage.setItem(CHECK_KEY, String(now));
      if (dirty) localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
      if (Object.keys(justFired).length) setFiredAt(justFired);
    };

    check();
    const id = setInterval(check, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const toggleMuted = useCallback(() => setMuted((m) => !m), []);
  const preview = useCallback(() => playReminderChime(), []);

  const enableNotifications = useCallback(() => {
    if (typeof Notification === 'undefined') return;
    Notification.requestPermission().then(setNotifyPermission).catch(() => {});
  }, []);

  // A rescheduled repeat has to be allowed to fire again.
  const clearFired = useCallback((taskId) => {
    const fired = readJSON(FIRED_KEY, {});
    let dirty = false;
    Object.keys(fired).forEach((key) => {
      if (key.startsWith(`${taskId}|`)) {
        delete fired[key];
        dirty = true;
      }
    });
    if (dirty) localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
  }, []);

  return { muted, toggleMuted, preview, notifyPermission, enableNotifications, firedAt, clearFired };
}
