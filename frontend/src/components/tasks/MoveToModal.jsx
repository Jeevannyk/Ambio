import React from 'react';
import { Lock, Check } from 'lucide-react';

/*
 * "Move to…" — single-select list picker. Clicking a list applies it and
 * closes; clicking the backdrop cancels.
 */
function MoveToModal({ current, lists, onSelect, onCancel }) {
  return (
    <div className="rm-overlay" onClick={onCancel}>
      <div className="rm-modal rm-modal--sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Move to list">
        <div className="rm-head">Move to…</div>
        <div className="mv-body">
          <div className="mv-head">My lists <Lock size={13} /></div>
          {lists.map((l) => (
            <button
              key={l}
              className={'mv-item' + (l === current ? ' mv-item--active' : '')}
              onClick={() => onSelect(l)}
            >
              <span>{l}</span>
              {l === current && <span className="mv-check"><Check size={13} /></span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MoveToModal;
