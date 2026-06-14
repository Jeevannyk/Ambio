import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';

const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

const fmtDate = (d) => `${d.getMonth() + 1}.${d.getDate()}.${d.getFullYear()}`;
const fmtTime = (d) => {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
};
const toKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/*
 * Reminder picker — date/time fields, a month calendar (Mon-first), and quick
 * shortcuts. Calls onSet({ date:'YYYY-MM-DD', time } | { someday:true, time }).
 */
function ReminderModal({ initial, onCancel, onSet }) {
  const now = new Date();
  const init = initial?.date ? new Date(`${initial.date}T00:00`) : now;
  const [sel, setSel] = useState(initial?.someday ? null : init);
  const [view, setView] = useState({ y: (sel || now).getFullYear(), m: (sel || now).getMonth() });
  const [time, setTime] = useState(initial?.time || fmtTime(now));
  const [someday, setSomeday] = useState(!!initial?.someday);

  const selDate = (d) => {
    setSel(d);
    setSomeday(false);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const shift = (delta) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const quick = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    selDate(d);
  };

  // 6-week grid; cells outside the current month show muted.
  const first = new Date(view.y, view.m, 1);
  const startDay = (first.getDay() + 6) % 7; // 0 = Monday
  const cells = [];
  for (let i = 0; i < 42; i++) cells.push(new Date(view.y, view.m, 1 + (i - startDay)));

  const isSel = (d) => sel && d.toDateString() === sel.toDateString();
  const isCur = (d) => d.getMonth() === view.m;

  const handleSet = () => {
    if (someday) return onSet({ someday: true, time });
    if (!sel) return onSet(null);
    onSet({ date: toKey(sel), time });
  };

  return (
    <div className="rm-overlay" onClick={onCancel}>
      <div className="rm-modal rm-modal--lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Reminder">
        <div className="rm-head">Reminder</div>

        <div className="rm-body">
          <div className="rm-fields">
            <label className="rm-field">
              <span>Date</span>
              <input readOnly value={someday ? 'Someday' : sel ? fmtDate(sel) : ''} />
            </label>
            <label className="rm-field">
              <span>Time</span>
              <input value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>

          <div className="rm-cal-wrap">
            <div className="rm-cal">
              <div className="rm-cal-head">
                <strong>{MONTHS[view.m]} {view.y}</strong>
                <div className="rm-nav">
                  <button onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
                  <button onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={18} /></button>
                </div>
              </div>
              <div className="rm-grid rm-grid--wd">
                {WD.map((w) => <span key={w} className="rm-wd">{w}</span>)}
              </div>
              <div className="rm-grid">
                {cells.map((d, i) => (
                  <button
                    key={i}
                    className={'rm-day' + (isCur(d) ? '' : ' rm-day--mut') + (isSel(d) ? ' rm-day--sel' : '')}
                    onClick={() => selDate(d)}
                  >
                    {d.getDate()}
                  </button>
                ))}
              </div>
            </div>

            <div className="rm-quick">
              <button onClick={() => quick(1)}>Tomorrow</button>
              <button onClick={() => quick(7)}>Next week</button>
              <button onClick={() => { setSomeday(true); setSel(null); }}>Someday</button>
              <button className="rm-quick-rec" type="button"><RotateCw size={14} /> Recurring</button>
            </div>
          </div>
        </div>

        <div className="rm-foot">
          <button className="rm-cancel" onClick={onCancel}>Cancel</button>
          <span className="rm-foot-div" />
          <button className="rm-set" onClick={handleSet}>Set</button>
        </div>
      </div>
    </div>
  );
}

export default ReminderModal;
