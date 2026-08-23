import React, { useEffect, useRef, useState } from 'react';
import {
  CaretLeft, CaretRight, CalendarBlank, ArrowClockwise, Bell, BellSlash, Trash, SpeakerHigh,
} from '@phosphor-icons/react';
import { DEFAULT_REMINDER_TIME, fmtTime, parseTime } from '../../lib/reminders';

const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const REPEATS = [['', 'Never'], ['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly']];

const fmtDate = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const toKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// now + 3h, rounded up to the next whole hour.
const laterToday = (from) => {
  const d = new Date(from);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + (from.getMinutes() > 0 ? 4 : 3));
  return d;
};

// The coming Monday — on a Monday that's a full week out, not today.
const nextMonday = (from) => {
  const d = startOfDay(from);
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d;
};

// "Today" / "Tomorrow" / weekday inside the week / a date beyond it.
const dayLabel = (d, base) => {
  const delta = Math.round((startOfDay(d) - startOfDay(base)) / 86400000);
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Tomorrow';
  if (delta > 1 && delta < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return fmtDate(d);
};

/*
 * Reminder picker — a one-line summary of the resolved reminder, quick pills,
 * then the calendar and repeat rows as collapsed escape hatches. Calls
 * onSet({ date:'YYYY-MM-DD', time, repeat } | { someday:true } | null).
 * Stays mounted while closed so it can transition out (see .rm-overlay[hidden]).
 */
function ReminderModal({ initial, open, origin, sound, onCancel, onSet }) {
  const now = new Date();
  const today = startOfDay(now);
  const init = initial?.date ? new Date(`${initial.date}T00:00`) : null;
  const [sel, setSel] = useState(initial?.someday ? null : init);
  const [someday, setSomeday] = useState(!!initial?.someday);
  const [time, setTime] = useState(initial?.time || DEFAULT_REMINDER_TIME);
  const [repeat, setRepeat] = useState(initial?.repeat?.unit || '');
  const [view, setView] = useState({ y: (init || now).getFullYear(), m: (init || now).getMonth() });
  const [calOpen, setCalOpen] = useState(false);
  const [repeatOpen, setRepeatOpen] = useState(!!initial?.repeat);
  const [focusKey, setFocusKey] = useState(() => toKey(init && init >= today ? init : today));

  const modalRef = useRef(null);
  const gridRef = useRef(null);
  const timeRef = useRef(null);
  const pendingFocus = useRef(false);

  const parsed = parseTime(time);
  const canSet = someday || !!(sel && parsed);

  const selDate = (d) => {
    setSel(d);
    setSomeday(false);
    setView({ y: d.getFullYear(), m: d.getMonth() });
    setFocusKey(toKey(d));
  };
  const quick = (d, t) => {
    selDate(d);
    setTime(t);
  };
  const pickSomeday = () => {
    setSomeday(true);
    setSel(null);
    setRepeat(''); // a repeat needs a date to advance from
    setRepeatOpen(false);
  };
  const shift = (delta) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
    setFocusKey(toKey(d < today ? today : d)); // keep a tab stop inside the new grid
  };

  const handleSet = () => {
    if (someday) return onSet({ someday: true });
    if (!sel || !parsed) return;
    onSet({ date: toKey(sel), time: fmtTime(parsed.h, parsed.m), repeat: repeat ? { unit: repeat } : null });
  };

  // ---- focus: first control on open, Tab trapped inside, arrows roam the grid.
  const focusables = () =>
    [...(modalRef.current?.querySelectorAll(
      'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), [tabindex="0"]'
    ) || [])].filter((el) => el.offsetParent !== null);

  useEffect(() => {
    if (open) focusables()[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    gridRef.current?.querySelector(`[data-day="${focusKey}"]`)?.focus();
  }, [calOpen, focusKey, view]);

  const onKeyDown = (e) => {
    // Escape also closes it from TasksPage's document handler; going through
    // onCancel here is what hands focus back to the chip.
    if (e.key === 'Escape') return onCancel();
    if (e.key !== 'Tab') return;
    const els = focusables();
    if (!els.length) return;
    const [first, last] = [els[0], els[els.length - 1]];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const gridKeys = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  const onGridKey = (e) => {
    if (!(e.key in gridKeys)) return;
    e.preventDefault();
    const d = new Date(`${focusKey}T00:00`);
    d.setDate(d.getDate() + gridKeys[e.key]);
    if (d < today) return; // past cells are disabled, so there's nothing to land on
    setFocusKey(toKey(d));
    if (d.getMonth() !== view.m || d.getFullYear() !== view.y) setView({ y: d.getFullYear(), m: d.getMonth() });
    pendingFocus.current = true;
  };

  const openCalendar = () => {
    if (calOpen) {
      gridRef.current?.querySelector(`[data-day="${focusKey}"]`)?.focus();
      return;
    }
    setCalOpen(true);
    pendingFocus.current = true;
  };

  // 6-week grid; cells outside the current month show muted.
  const first = new Date(view.y, view.m, 1);
  const startDay = (first.getDay() + 6) % 7; // 0 = Monday
  const cells = [];
  for (let i = 0; i < 42; i++) cells.push(new Date(view.y, view.m, 1 + (i - startDay)));

  const later = laterToday(now);
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const monday = nextMonday(now);
  const isSel = (d) => sel && d.toDateString() === sel.toDateString();
  const pills = [
    // Clutter after ~6pm: "later today" stops meaning anything useful.
    now.getHours() < 18 && ['Later today', fmtTime(later.getHours(), later.getMinutes()),
      () => quick(later, fmtTime(later.getHours(), later.getMinutes())),
      isSel(later) && time === fmtTime(later.getHours(), later.getMinutes())],
    ['Tomorrow', DEFAULT_REMINDER_TIME, () => quick(tomorrow, DEFAULT_REMINDER_TIME), isSel(tomorrow)],
    ['Next week', monday.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      () => quick(monday, DEFAULT_REMINDER_TIME), isSel(monday)],
    ['Someday', 'No date', pickSomeday, someday],
  ].filter(Boolean);

  return (
    <div className="rm-overlay" hidden={!open} onClick={onCancel}>
      <div
        className="rm-modal rm-modal--rem"
        style={origin ? { '--rm-ox': `${origin.x}px`, '--rm-oy': `${origin.y}px` } : undefined}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="Reminder"
      >
        <div className="rm-head">Reminder</div>

        <div className="rm-body">
          <p className="rm-summary">
            Remind me{' '}
            <button type="button" className="rm-summary-b" onClick={openCalendar}>
              {someday ? 'Someday' : sel ? dayLabel(sel, now) : 'pick a date'}
            </button>
            {!someday && (
              <>
                {' at '}
                <button type="button" className="rm-summary-b" onClick={() => timeRef.current?.focus()}>
                  {parsed ? fmtTime(parsed.h, parsed.m) : 'a valid time'}
                </button>
              </>
            )}
            {!someday && repeat && (
              <>, repeating <span className="rm-summary-rep">{REPEATS.find(([u]) => u === repeat)[1].toLowerCase()}</span></>
            )}
          </p>

          <div className="rm-quick">
            {pills.map(([label, meta, onPick, on]) => (
              <button key={label} type="button" className={'rm-pill' + (on ? ' rm-pill--on' : '')} aria-pressed={!!on} onClick={onPick}>
                <span className="rm-pill-t">{label}</span>
                <span className="rm-pill-s">{meta}</span>
              </button>
            ))}
          </div>

          {!someday && (
            <label className="rm-time">
              <span>Time</span>
              <input
                ref={timeRef}
                value={time}
                aria-invalid={!parsed}
                onChange={(e) => setTime(e.target.value)}
                onBlur={() => parsed && setTime(fmtTime(parsed.h, parsed.m))}
                placeholder="9:00 AM"
              />
              {!parsed && <em className="rm-time-err">Try 9am, 14:30 or noon</em>}
            </label>
          )}

          <button type="button" className="rm-disc" aria-expanded={calOpen} onClick={() => setCalOpen((v) => !v)}>
            <CalendarBlank size={15} />
            <span className="rm-disc-l">Pick a date</span>
            <span className="rm-disc-v">{someday ? 'Someday' : sel ? fmtDate(sel) : 'None'}</span>
            <CaretRight size={13} className={'rm-disc-c' + (calOpen ? ' rm-disc-c--open' : '')} />
          </button>

          <div className="rm-cal" hidden={!calOpen}>
            <div className="rm-cal-head">
              <strong>{MONTHS[view.m]} {view.y}</strong>
              <div className="rm-nav">
                <button type="button" onClick={() => shift(-1)} aria-label="Previous month"><CaretLeft size={18} /></button>
                <button type="button" onClick={() => shift(1)} aria-label="Next month"><CaretRight size={18} /></button>
              </div>
            </div>
            <div className="rm-grid rm-grid--wd">
              {WD.map((w) => <span key={w} className="rm-wd">{w}</span>)}
            </div>
            {/* Roving tabindex: one natural tab stop, arrows move within the grid. */}
            <div className="rm-grid" ref={gridRef} role="group" aria-label="Choose a date" onKeyDown={onGridKey}>
              {cells.map((d) => {
                const key = toKey(d);
                const past = d < today;
                return (
                  <button
                    key={key}
                    type="button"
                    data-day={key}
                    className={'rm-day'
                      + (d.getMonth() === view.m ? '' : ' rm-day--mut')
                      + (key === toKey(today) ? ' rm-day--today' : '')
                      + (isSel(d) ? ' rm-day--sel' : '')}
                    tabIndex={key === focusKey ? 0 : -1}
                    disabled={past}
                    aria-pressed={!!isSel(d)}
                    aria-label={d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    onClick={() => selDate(d)}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {!someday && (
            <>
              <button type="button" className="rm-disc" aria-expanded={repeatOpen} onClick={() => setRepeatOpen((v) => !v)}>
                <ArrowClockwise size={15} />
                <span className="rm-disc-l">Repeat</span>
                <span className="rm-disc-v">{REPEATS.find(([u]) => u === repeat)[1]}</span>
                <CaretRight size={13} className={'rm-disc-c' + (repeatOpen ? ' rm-disc-c--open' : '')} />
              </button>
              <div className="rm-repeat" hidden={!repeatOpen}>
                {REPEATS.map(([unit, label]) => (
                  <button
                    key={label}
                    type="button"
                    className={'rm-rep' + (repeat === unit ? ' rm-rep--on' : '')}
                    aria-pressed={repeat === unit}
                    onClick={() => setRepeat(unit)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {repeat && <p className="rm-repeat-note">Completing it reschedules from the day you tick it off.</p>}
            </>
          )}
        </div>

        <div className="rm-foot rm-foot--split">
          {initial && (
            <button type="button" className="rm-remove" onClick={() => onSet(null)}>
              <Trash size={14} /> Remove
            </button>
          )}
          <span className="rm-foot-sp" />
          <button type="button" className="rm-cancel" onClick={onCancel}>Cancel</button>
          <button type="button" className="rm-set" disabled={!canSet} onClick={handleSet}>Set</button>
        </div>

        {sound && (
          <div className="rm-sound">
            <button type="button" className="rm-sound-b" aria-pressed={!sound.muted} onClick={sound.toggleMuted}>
              {sound.muted ? <BellSlash size={14} /> : <Bell size={14} />}
              {sound.muted ? 'Sound off' : 'Sound on'}
            </button>
            <button type="button" className="rm-sound-b" onClick={sound.preview}>
              <SpeakerHigh size={14} /> Preview
            </button>
            {sound.notifyPermission === 'default' && (
              <button type="button" className="rm-sound-b" onClick={sound.enableNotifications}>
                Enable notifications
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReminderModal;
