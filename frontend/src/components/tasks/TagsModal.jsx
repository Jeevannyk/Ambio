import React, { useState } from 'react';
import { Check } from 'lucide-react';

// Tag palette (name + row tint).
const TAGS = [
  { name: 'Priority', color: '#caa92b' },
  { name: 'important', color: '#5e2530' },
  { name: 'family', color: '#5e2530' },
  { name: 'deadline', color: '#5a481d' },
  { name: 'nothing', color: '#4d4a1e' },
  { name: 'trackback', color: '#1f4a2e' },
  { name: 'science project', color: '#2c4a2f' },
];

/*
 * Multi-select tag picker. Save commits the chosen tag names; backdrop or
 * Cancel discards.
 */
function TagsModal({ selected = [], onSave, onCancel }) {
  const [picked, setPicked] = useState(() => new Set(selected));

  const toggle = (name) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  return (
    <div className="rm-overlay" onClick={onCancel}>
      <div className="rm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Tags">
        <div className="rm-head">Tags</div>
        <div className="tg-body">
          {TAGS.map((t) => {
            const on = picked.has(t.name);
            return (
              <button
                key={t.name}
                className={'tg-row' + (on ? ' tg-row--on' : '')}
                style={{ '--tg': t.color }}
                onClick={() => toggle(t.name)}
              >
                <span className="tg-box">{on && <Check size={12} />}</span>
                <span className="tg-name">{t.name}</span>
              </button>
            );
          })}
        </div>
        <div className="rm-foot">
          <button className="rm-cancel" onClick={onCancel}>Cancel</button>
          <span className="rm-foot-div" />
          <button className="rm-set" onClick={() => onSave([...picked])}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default TagsModal;
