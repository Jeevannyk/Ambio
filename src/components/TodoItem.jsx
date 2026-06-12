import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Pencil, Trash2 } from 'lucide-react';

/*
 * Props:
 *   task       : { id: string, text: string, done: boolean, priority: 'low'|'med'|'high', due: string }
 *   isFirst    : boolean — disables move-up button when true
 *   isLast     : boolean — disables move-down button when true
 *   removeTask(id: string) — delete the task
 *   toggleTask(id: string) — toggle done/undone
 *   editTask(id: string, text: string) — save edited text
 *   moveTask(id: string, direction: -1|1) — reorder by one position
 */

// Returns true if a YYYY-MM-DD due date is before today.
function isOverdue(due) {
  if (!due) return false;
  const today = new Date().toISOString().slice(0, 10);
  return due < today;
}

function TodoItem({
  task,
  isFirst,
  isLast,
  removeTask,
  toggleTask,
  editTask,
  moveTask,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEdit = () => {
    setDraft(task.text);
    setEditing(true);
  };

  const commitEdit = () => {
    editTask(task.id, draft);
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(false); // cancel, keep original
  };

  const overdue = !task.done && isOverdue(task.due);
  const classes = [
    'todo-item',
    task.done ? 'done' : '',
    overdue ? 'overdue' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className={classes}>
      <span
        className={`priority-dot priority-${task.priority || 'med'}`}
        title={`${task.priority || 'med'} priority`}
      />

      {editing ? (
        <input
          ref={inputRef}
          className="edit-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <div className="todo-main">
          <div className="checkbox-wrapper">
            <input
              type="checkbox"
              id={`check-${task.id}`}
              checked={task.done}
              onChange={() => toggleTask(task.id)}
            />
            <label htmlFor={`check-${task.id}`} className="label">
              <svg width="28" height="28" viewBox="0 0 95 95">
                <rect x="30" y="20" width="50" height="50" stroke="black" fill="none" />
                <g transform="translate(0,-952.36222)">
                  <path
                    d="m 56,963 c -102,122 6,9 7,9 17,-5 -66,69 -38,52 122,-77 -7,14 18,4 29,-11 45,-43 23,-4"
                    stroke="black"
                    strokeWidth="3"
                    fill="none"
                    className="path1"
                  />
                </g>
              </svg>
            </label>
          </div>
          <span className="todo-text" onDoubleClick={startEdit}>
            {task.text}
          </span>
          {task.due && <span className="due-date">{task.due}</span>}
        </div>
      )}

      <div className="todo-actions">
        <button
          className="icon-btn"
          onClick={() => moveTask(task.id, -1)}
          disabled={isFirst}
          aria-label="Move up"
        >
          <ChevronUp size={14} />
        </button>
        <button
          className="icon-btn"
          onClick={() => moveTask(task.id, 1)}
          disabled={isLast}
          aria-label="Move down"
        >
          <ChevronDown size={14} />
        </button>
        <button className="icon-btn" onClick={startEdit} aria-label="Edit">
          <Pencil size={14} />
        </button>
        <button
          className="delete-btn icon-btn"
          onClick={() => removeTask(task.id)}
          aria-label="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

export default TodoItem;
