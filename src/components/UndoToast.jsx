import React from 'react';
import { RotateCcw } from 'lucide-react';

/*
 * Props:
 *   text   : string — text of the deleted task
 *   onUndo : () => void — restores the deleted task
 */
function UndoToast({ text, onUndo }) {
  return (
    <div className="undo-toast" role="status">
      <span>Deleted “{text}”</span>
      <button onClick={onUndo} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <RotateCcw size={13} /> Undo
      </button>
    </div>
  );
}

export default UndoToast;
