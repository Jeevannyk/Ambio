/*
 * Reminder primitives shared by the picker, the tasks page and the app-level
 * scheduler hook — one parser and one default so the three can't disagree.
 */

export const DEFAULT_REMINDER_TIME = '9:00 AM';

const NAMED = { noon: { h: 12, m: 0 }, midnight: { h: 0, m: 0 } };

/*
 * Forgiving time parser: "9", "9am", "9 AM", "9:30", "9:30pm", "9.30",
 * "21:30", "0930", "noon", "midnight". Returns 24-hour { h, m }, or null when
 * the input can't be trusted — never a midnight fallback, which is how a bare
 * "14:30" used to silently become 2:30 AM.
 */
export function parseTime(input) {
  const raw = String(input ?? '').trim().toLowerCase();
  if (!raw) return null;
  if (NAMED[raw]) return NAMED[raw];
  const match = /^(\d{1,2})(?:[:.]?(\d{2}))?\s*(am|pm)?$/.exec(raw);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  if (m > 59) return null;
  if (match[3]) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (match[3] === 'pm' ? 12 : 0);
  } else if (h > 23) {
    return null;
  }
  return { h, m };
}

// Canonical display form — every stored reminder time is normalized to this.
export function fmtTime(h, m) {
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

// A reminder's real firing moment (local time), or null when it can't fire.
export function reminderDueAt(reminder) {
  if (!reminder || reminder.someday || !reminder.date) return null;
  const at = parseTime(reminder.time);
  if (!at) return null;
  const due = new Date(`${reminder.date}T00:00`);
  if (Number.isNaN(due.getTime())) return null;
  due.setHours(at.h, at.m, 0, 0);
  return due;
}

/*
 * Next occurrence of a repeating reminder, measured from `from` (the moment it
 * was completed) rather than the old due date — finishing a weekly chore three
 * days late should land seven days from now, not four.
 */
export function nextRepeatDate(unit, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (unit === 'week') d.setDate(d.getDate() + 7);
  else if (unit === 'month') {
    const day = d.getDate();
    d.setMonth(d.getMonth() + 1);
    if (d.getDate() !== day) d.setDate(0); // Jan 31 → Feb 28, not Mar 3
  } else d.setDate(d.getDate() + 1);
  return d;
}
