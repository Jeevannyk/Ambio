import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  ListChecks, ArrowUpDown, Filter, MoreHorizontal, Trash2, Search,
  RefreshCw, Headphones, CalendarDays, Bell, FileText, Hash, Plus,
  Target, Archive, Check, ArrowUp,
} from 'lucide-react';
import ReminderModal from '../components/tasks/ReminderModal';
import MoveToModal from '../components/tasks/MoveToModal';
import TagsModal from '../components/tasks/TagsModal';
import './TasksPage.css';

const STORAGE_KEY = 'react-todo-app.tasks';
const LISTS = ['Personal', 'Work', 'Grocery List'];

const reminderLabel = (r) => {
  if (!r) return 'Remind me';
  if (r.someday) return 'Someday';
  const d = new Date(`${r.date}T00:00`);
  const md = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return r.time ? `${md}, ${r.time}` : md;
};

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Load + normalise older tasks (which only had {id,text,done,priority,due}).
function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.map((t) => ({ list: 'Personal', notes: '', subtasks: [], tags: [], reminder: null, ...t }));
  } catch {
    return [];
  }
}

function TasksPage() {
  const [tasks, setTasks] = useState(loadTasks);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [subDraft, setSubDraft] = useState('');
  const [modal, setModal] = useState(null); // 'reminder' | 'move' | 'tags' | null
  const rowsRef = useRef(null);
  const posRef = useRef(new Map()); // task id -> last viewport top (for FLIP)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  // FLIP: smoothly slide rows to their new position when the order changes
  // (e.g. a completed task sinking to the bottom).
  useLayoutEffect(() => {
    const container = rowsRef.current;
    if (!container) return;
    const rows = container.querySelectorAll('[data-tid]');
    const next = new Map();
    rows.forEach((el) => {
      const id = el.dataset.tid;
      const top = el.offsetTop; // scroll-independent (container is the offset parent)
      next.set(id, top);
      const prev = posRef.current.get(id);
      if (prev != null && Math.abs(prev - top) > 1) {
        el.style.transition = 'none';
        el.style.transform = `translateY(${prev - top}px)`;
        requestAnimationFrame(() => {
          el.style.transition = 'transform 340ms cubic-bezier(0.2, 0.8, 0.2, 1)';
          el.style.transform = '';
          const clear = () => { el.style.transition = ''; el.removeEventListener('transitionend', clear); };
          el.addEventListener('transitionend', clear);
        });
      }
    });
    posRef.current = next;
  });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? tasks.filter((t) => t.text.toLowerCase().includes(q)) : tasks;
    // Completed tasks sink to the bottom (stable sort keeps insertion order otherwise).
    return [...filtered].sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
  }, [tasks, search]);

  // Keep a valid selection.
  useEffect(() => {
    if (selectedId && tasks.some((t) => t.id === selectedId)) return;
    setSelectedId(visible[0]?.id ?? null);
  }, [tasks, visible, selectedId]);

  const selected = tasks.find((t) => t.id === selectedId) || null;

  const update = (id, patch) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const addTask = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const task = { id: uid(), text, done: false, list: 'Personal', notes: '', subtasks: [], tags: [], reminder: null };
    setTasks((prev) => [...prev, task]);
    setSelectedId(task.id);
    setDraft('');
  };

  const toggleTask = (id) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const removeTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const clearCompleted = () => setTasks((prev) => prev.filter((t) => !t.done));

  // ── Subtasks ──
  const addSubtask = (e) => {
    e.preventDefault();
    const text = subDraft.trim();
    if (!text || !selected) return;
    update(selected.id, { subtasks: [...selected.subtasks, { id: uid(), text, done: false }] });
    setSubDraft('');
  };

  const toggleSubtask = (sid) => {
    if (!selected) return;
    update(selected.id, {
      subtasks: selected.subtasks.map((s) => (s.id === sid ? { ...s, done: !s.done } : s)),
    });
  };

  const removeSubtask = (sid) => {
    if (!selected) return;
    update(selected.id, { subtasks: selected.subtasks.filter((s) => s.id !== sid) });
  };

  const hasCompleted = tasks.some((t) => t.done);
  const subDone = selected ? selected.subtasks.filter((s) => s.done).length : 0;

  return (
    <div className="tasks2">
      {/* Top bar */}
      <header className="tasks2-topbar">
        <div className="t2-leftbar">
          <div className="t2-title">
            <span className="t2-title-icon"><ListChecks size={18} /></span>
            <strong>All my tasks</strong>
          </div>
          <span className="t2-divider" />
          <button className="t2-menu-btn"><ArrowUpDown size={15} /> View</button>
          <button className="t2-menu-btn"><Filter size={15} /> Filter</button>
          <button className="t2-menu-btn t2-menu-btn--icon"><MoreHorizontal size={16} /></button>
        </div>
        {hasCompleted && (
          <button className="t2-clear" onClick={clearCompleted}>
            <Trash2 size={15} /> Clear completed
          </button>
        )}
        <div className="t2-tools">
          <button className="t2-tool" title="Sync"><RefreshCw size={16} /></button>
          <button className="t2-tool" title="Focus"><Headphones size={16} /></button>
          <button className="t2-tool t2-tool--dot" title="Calendar"><CalendarDays size={16} /></button>
          <label className="t2-search" title="Search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
            />
          </label>
        </div>
      </header>

      {/* Body: list + detail */}
      <div className="tasks2-body">
        {/* List pane */}
        <section className="tasks2-list">
          <div className="t2-list-head">Today</div>
          <div className="t2-rows" ref={rowsRef}>
            {visible.length === 0 && (
              <p className="t2-empty">No tasks yet. Add one below.</p>
            )}
            {visible.map((t) => (
              <button
                key={t.id}
                data-tid={t.id}
                className={'t2-row' + (t.id === selectedId ? ' t2-row--active' : '')}
                onClick={() => setSelectedId(t.id)}
              >
                <span
                  className={'t2-check' + (t.done ? ' t2-check--done' : '')}
                  role="checkbox"
                  aria-checked={t.done}
                  onClick={(e) => { e.stopPropagation(); toggleTask(t.id); }}
                >
                  {t.done && <Check size={12} />}
                </span>
                <span className="t2-row-text">
                  <span className={'t2-row-title' + (t.done ? ' t2-row-title--done' : '')}>{t.text}</span>
                  <span className="t2-row-sub">{t.list}</span>
                </span>
              </button>
            ))}
          </div>
          <form className="t2-add" onSubmit={addTask}>
            <Plus size={16} />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add Task"
            />
            {draft.trim() && (
              <button type="submit" className="t2-add-send" aria-label="Add task">
                <ArrowUp size={18} />
              </button>
            )}
          </form>
        </section>

        {/* Detail pane */}
        <section className="tasks2-detail">
          {selected ? (
            <>
              <div className="t2-detail-head">
                <span className="t2-crumb">
                  <Target size={13} /> My lists <span className="t2-crumb-sep">›</span> {selected.list}
                </span>
                <div className="t2-detail-actions">
                  <button
                    className={'t2-complete' + (selected.done ? ' t2-complete--done' : '')}
                    onClick={() => toggleTask(selected.id)}
                  >
                    {selected.done ? 'Completed' : 'Mark as complete'}
                  </button>
                  <button className="t2-icon-btn" title="Focus"><Target size={17} /></button>
                  <button className="t2-icon-btn" title="Delete" onClick={() => removeTask(selected.id)}>
                    <Archive size={17} />
                  </button>
                </div>
              </div>

              <input
                className="t2-detail-title"
                value={selected.text}
                onChange={(e) => update(selected.id, { text: e.target.value })}
                placeholder="Task name"
              />

              <div className="t2-chips">
                <button className="t2-chip" onClick={() => setModal('reminder')}>
                  <Bell size={15} className="t2-chip-i t2-chip-i--red" /> {reminderLabel(selected.reminder)}
                </button>
                <button className="t2-chip" onClick={() => setModal('move')}>
                  <FileText size={15} className="t2-chip-i t2-chip-i--amber" /> {selected.list}
                </button>
                <button className="t2-chip" onClick={() => setModal('tags')}>
                  <Hash size={15} className="t2-chip-i t2-chip-i--blue" />
                  {selected.tags?.length ? `Tags · ${selected.tags.length}` : 'Tags'}
                </button>
              </div>

              <div className="t2-section-label">Notes</div>
              <textarea
                className="t2-notes"
                value={selected.notes}
                onChange={(e) => update(selected.id, { notes: e.target.value })}
                placeholder="Insert your notes here"
              />

              <div className="t2-section-label t2-section-label--row">
                <span>Subtasks <span className="t2-count">{subDone}/{selected.subtasks.length}</span></span>
                <MoreHorizontal size={16} />
              </div>
              <div className="t2-subs">
                {selected.subtasks.map((s) => (
                  <div key={s.id} className="t2-sub">
                    <span
                      className={'t2-check t2-check--sm' + (s.done ? ' t2-check--done' : '')}
                      onClick={() => toggleSubtask(s.id)}
                      role="checkbox"
                      aria-checked={s.done}
                    >
                      {s.done && <Check size={11} />}
                    </span>
                    <span className={'t2-sub-text' + (s.done ? ' t2-sub-text--done' : '')}>{s.text}</span>
                    <button className="t2-sub-del" onClick={() => removeSubtask(s.id)} aria-label="Remove subtask">×</button>
                  </div>
                ))}
                <form className="t2-sub t2-sub-add" onSubmit={addSubtask}>
                  <span className="t2-check t2-check--sm t2-check--ghost" />
                  <input
                    value={subDraft}
                    onChange={(e) => setSubDraft(e.target.value)}
                    placeholder="Add a new subtask"
                  />
                </form>
              </div>

              <div className="t2-section-label">Attachments</div>
              <div className="t2-attach">Click to add / drop your files here</div>
            </>
          ) : (
            <div className="t2-detail-empty">
              <ListChecks size={40} opacity={0.25} />
              <p>Select a task to see its details</p>
            </div>
          )}
        </section>
      </div>

      {/* Detail chip modals */}
      {selected && modal === 'reminder' && (
        <ReminderModal
          initial={selected.reminder}
          onCancel={() => setModal(null)}
          onSet={(r) => { update(selected.id, { reminder: r }); setModal(null); }}
        />
      )}
      {selected && modal === 'move' && (
        <MoveToModal
          current={selected.list}
          lists={LISTS}
          onCancel={() => setModal(null)}
          onSelect={(l) => { update(selected.id, { list: l }); setModal(null); }}
        />
      )}
      {selected && modal === 'tags' && (
        <TagsModal
          selected={selected.tags}
          onCancel={() => setModal(null)}
          onSave={(tags) => { update(selected.id, { tags }); setModal(null); }}
        />
      )}
    </div>
  );
}

export default TasksPage;
