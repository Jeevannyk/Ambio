import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  ListChecks, ArrowUpDown, Filter, MoreHorizontal, Trash2, Search,
  Headset, CalendarDays, Bell, FileText, Hash, Plus,
  Target, Archive, Check, ArrowUp, Lock, LayoutGrid, Layers, Printer,
  ChevronRight, ChevronLeft, CircleCheck, Paperclip, Download, Flame,
} from 'lucide-react';
import ReminderModal from '../components/tasks/ReminderModal';
import MoveToModal from '../components/tasks/MoveToModal';
import TagsModal from '../components/tasks/TagsModal';
import { Calendar } from '@/components/ui/calendar';
import './TasksPage.css';

const STORAGE_KEY = 'react-todo-app.tasks';
const LAYOUT_KEY = 'react-todo-app.tasks.layout';
const VIEW_KEY = 'react-todo-app.tasks.view';
const STREAK_KEY = 'react-todo-app.streak';
const LISTS = ['Personal', 'Work', 'Grocery List'];
const DAY_MS = 24 * 60 * 60 * 1000;

const VIEW_BUCKETS = [
  { key: 'today', title: 'Today', subtitle: (date) => date.toLocaleDateString(undefined, { weekday: 'long' }) },
  { key: 'tomorrow', title: 'Tomorrow', subtitle: (date) => date.toLocaleDateString(undefined, { weekday: 'long' }) },
  { key: 'upcoming', title: 'Upcoming', subtitle: () => '' },
  { key: 'someday', title: 'Someday', subtitle: () => '' },
];

const reminderLabel = (r) => {
  if (!r) return 'Remind me';
  if (r.someday) return 'Someday';
  const d = new Date(`${r.date}T00:00`);
  const md = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return r.time ? `${md}, ${r.time}` : md;
};

const toDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const today = () => startOfDay(new Date());
const offsetDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

// Generate a fresh random jagged lightning path each strike (viewBox 400x800),
// so the bolt forks a different direction every time.
function genBolt() {
  const H = 800;
  let x = 60 + Math.random() * 280;
  const pts = [[x, -20]];
  const segs = 5 + Math.floor(Math.random() * 3);
  for (let i = 1; i <= segs; i++) {
    x += (Math.random() - 0.5) * 170;
    x = Math.max(25, Math.min(375, x));
    pts.push([x, Math.round((H / segs) * i)]);
  }
  const toPath = (arr) => 'M' + arr.map((p) => `${Math.round(p[0])} ${Math.round(p[1])}`).join(' L');
  // branch forking off a random middle vertex
  const bi = 1 + Math.floor(Math.random() * (pts.length - 2));
  let bx = pts[bi][0];
  let by = pts[bi][1];
  const bpts = [[bx, by]];
  const bsegs = 2 + Math.floor(Math.random() * 2);
  for (let i = 1; i <= bsegs; i++) {
    bx += (Math.random() - 0.5) * 150;
    by += 70 + Math.random() * 80;
    bpts.push([bx, by]);
  }
  return { main: toPath(pts), branch: toPath(bpts) };
}

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Current + longest streak from a Set of 'YYYY-MM-DD' activity day-keys.
// Current streak stays "alive" through today even if today isn't done yet.
function computeStreaks(daySet) {
  if (!daySet.size) return { current: 0, longest: 0 };
  const keys = [...daySet].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    const diff = Math.round((new Date(keys[i]) - new Date(keys[i - 1])) / 86400000);
    if (diff === 1) { run += 1; longest = Math.max(longest, run); }
    else if (diff > 1) { run = 1; }
  }
  let current = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const has = (d) => daySet.has(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  if (!has(cursor)) cursor.setDate(cursor.getDate() - 1); // today not done yet — count from yesterday
  while (has(cursor)) { current += 1; cursor.setDate(cursor.getDate() - 1); }
  return { current, longest: Math.max(longest, current) };
}

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.map((t) => ({ list: 'Personal', notes: '', subtasks: [], tags: [], reminder: null, attachments: [], ...t }));
  } catch {
    return [];
  }
}

const taskDate = (task) => {
  if (task.reminder?.someday) return null;
  if (task.reminder?.date) return new Date(`${task.reminder.date}T00:00`);
  if (task.due) return new Date(`${task.due}T00:00`);
  return null;
};

const bucketForTask = (task, now = today()) => {
  if (task.reminder?.someday) return 'someday';
  const date = taskDate(task);
  if (!date) return 'today';
  const delta = Math.round((startOfDay(date).getTime() - now.getTime()) / DAY_MS);
  if (delta <= 0) return 'today';
  if (delta === 1) return 'tomorrow';
  return 'upcoming';
};

function TasksPage() {
  const [tasks, setTasks] = useState(loadTasks);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [subDraft, setSubDraft] = useState('');
  const [lightningFlash, setLightningFlash] = useState(false);
  const [bolt, setBolt] = useState({ main: '', branch: '' });
  const [attachError, setAttachError] = useState('');
  const [attachDrag, setAttachDrag] = useState(false);
  const fileInputRef = useRef(null);
  const [modal, setModal] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState(() => localStorage.getItem(LAYOUT_KEY) || 'default');
  const [sortMode, setSortMode] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(VIEW_KEY) || '{}').sortMode || 'time';
    } catch {
      return 'time';
    }
  });
  const [showDetails, setShowDetails] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(VIEW_KEY) || '{}');
      return saved.showDetails ?? true;
    } catch {
      return true;
    }
  });
  const [boardDrafts, setBoardDrafts] = useState({ today: '', tomorrow: '', upcoming: '', someday: '' });
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const calendarRef = useRef(null);
  const [activity, setActivity] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(STREAK_KEY) || '[]')); } catch { return new Set(); }
  });
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportForm, setSupportForm] = useState({ name: '', email: '', message: '' });
  const [supportSent, setSupportSent] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPanel, setFilterPanel] = useState(null); // 'lists' | 'tags' | 'status' | null
  const [filterByLists, setFilterByLists] = useState(() => new Set());
  const [filterByTags, setFilterByTags] = useState(() => new Set());
  const [filterByStatus, setFilterByStatus] = useState('all'); // 'all' | 'active' | 'done'
  const rowsRef = useRef(null);
  const menuRef = useRef(null);
  const viewRef = useRef(null);
  const filterRef = useRef(null);
  const posRef = useRef(new Map());

  useEffect(() => {
    const onDocClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
      if (viewRef.current && !viewRef.current.contains(event.target)) setViewOpen(false);
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterOpen(false);
        setFilterPanel(null);
      }
      if (calendarRef.current && !calendarRef.current.contains(event.target)) setCalendarOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setViewOpen(false);
        setFilterOpen(false);
        setFilterPanel(null);
        setCalendarOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      setAttachError('Storage full — remove some attachments to save changes.');
    }
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(LAYOUT_KEY, layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    localStorage.setItem(STREAK_KEY, JSON.stringify([...activity]));
  }, [activity]);

  const markActiveToday = () => setActivity((prev) => {
    const k = toDateKey(new Date());
    if (prev.has(k)) return prev;
    return new Set(prev).add(k);
  });

  const { current: currentStreak, longest: longestStreak } = useMemo(() => computeStreaks(activity), [activity]);
  const streakDays = useMemo(() => [...activity].map((k) => new Date(`${k}T00:00`)), [activity]);

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, JSON.stringify({ sortMode, showDetails }));
  }, [sortMode, showDetails]);

  useLayoutEffect(() => {
    const container = rowsRef.current;
    if (!container) return;
    const rows = container.querySelectorAll('[data-tid]');
    const next = new Map();
    rows.forEach((el) => {
      const id = el.dataset.tid;
      const top = el.offsetTop;
      next.set(id, top);
      const prev = posRef.current.get(id);
      if (prev != null && Math.abs(prev - top) > 1) {
        el.style.transition = 'none';
        el.style.transform = `translateY(${prev - top}px)`;
        requestAnimationFrame(() => {
          el.style.transition = 'transform 340ms cubic-bezier(0.2, 0.8, 0.2, 1)';
          el.style.transform = '';
          const clear = () => {
            el.style.transition = '';
            el.removeEventListener('transitionend', clear);
          };
          el.addEventListener('transitionend', clear);
        });
      }
    });
    posRef.current = next;
  });

  const allTags = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => (t.tags || []).forEach((tag) => set.add(tag)));
    return [...set].sort();
  }, [tasks]);

  const activeFilterCount = (filterByLists.size > 0 ? 1 : 0) + (filterByTags.size > 0 ? 1 : 0) + (filterByStatus !== 'all' ? 1 : 0);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = q ? tasks.filter((t) => t.text.toLowerCase().includes(q)) : tasks;
    if (filterByLists.size > 0) filtered = filtered.filter((t) => filterByLists.has(t.list));
    if (filterByTags.size > 0) filtered = filtered.filter((t) => (t.tags || []).some((tag) => filterByTags.has(tag)));
    if (filterByStatus === 'active') filtered = filtered.filter((t) => !t.done);
    if (filterByStatus === 'done') filtered = filtered.filter((t) => t.done);
    const byDone = (a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1);
    return [...filtered].sort((a, b) => {
      if (sortMode === 'time') {
        const left = taskDate(a)?.getTime() ?? Number.POSITIVE_INFINITY;
        const right = taskDate(b)?.getTime() ?? Number.POSITIVE_INFINITY;
        if (left !== right) return left - right;
      } else if (sortMode === 'tags') {
        const ta = (a.tags || [])[0] || '￿';
        const tb = (b.tags || [])[0] || '￿';
        if (ta !== tb) return ta.localeCompare(tb);
      } else if (sortMode === 'list') {
        if (a.list !== b.list) return a.list.localeCompare(b.list);
      }
      return byDone(a, b);
    });
  }, [tasks, search, sortMode, filterByLists, filterByTags, filterByStatus]);

  useEffect(() => {
    if (selectedId && tasks.some((t) => t.id === selectedId)) return;
    setSelectedId(visible[0]?.id ?? null);
  }, [tasks, visible, selectedId]);

  const selected = tasks.find((t) => t.id === selectedId) || null;
  const selectedTaskIds = useMemo(() => tasks.filter((t) => selectedIds.has(t.id)).map((t) => t.id), [tasks, selectedIds]);
  const clearSelectedIds = () => setSelectedIds(new Set());
  const updateBoardDraft = (bucket, value) => setBoardDrafts((prev) => ({ ...prev, [bucket]: value }));

  const toggleTaskSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Drag-to-select: press a row and drag — every row between the anchor and
  // the one under the cursor gets selected live.
  const dragAnchorRef = useRef(null);
  const draggingRef = useRef(false);
  const selectRange = (fromIdx, toIdx) => {
    const lo = Math.min(fromIdx, toIdx);
    const hi = Math.max(fromIdx, toIdx);
    const ids = visible.slice(lo, hi + 1).map((t) => t.id);
    setSelectedIds(new Set(ids));
  };
  const startDragSelect = (idx) => {
    draggingRef.current = true;
    dragAnchorRef.current = idx;
    selectRange(idx, idx);
  };
  const dragOverRow = (idx) => {
    if (draggingRef.current && dragAnchorRef.current != null) selectRange(dragAnchorRef.current, idx);
  };
  useEffect(() => {
    const end = () => { draggingRef.current = false; dragAnchorRef.current = null; };
    window.addEventListener('pointerup', end);
    return () => window.removeEventListener('pointerup', end);
  }, []);

  const update = (id, patch) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const addTask = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const task = { id: uid(), text, done: false, list: 'Personal', notes: '', subtasks: [], tags: [], reminder: null, attachments: [] };
    setTasks((prev) => [...prev, task]);
    setSelectedId(task.id);
    setDraft('');
  };

  const addTaskToBucket = (bucket) => (e) => {
    e.preventDefault();
    const text = boardDrafts[bucket].trim();
    if (!text) return;
    const task = { id: uid(), text, done: false, list: 'Personal', notes: '', subtasks: [], tags: [], reminder: null, attachments: [] };
    const base = today();
    if (bucket === 'tomorrow') task.reminder = { date: toDateKey(offsetDays(base, 1)), time: '9:00 AM' };
    if (bucket === 'upcoming') task.reminder = { date: toDateKey(offsetDays(base, 3)), time: '9:00 AM' };
    if (bucket === 'someday') task.reminder = { someday: true, time: '9:00 AM' };
    setTasks((prev) => [...prev, task]);
    setSelectedId(task.id);
    updateBoardDraft(bucket, '');
  };

  const toggleTask = (id) => {
    const t = tasks.find((x) => x.id === id);
    if (t && !t.done) markActiveToday(); // completing one keeps today's streak
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  };
  const removeTask = (id) => setTasks((prev) => prev.filter((t) => t.id !== id));
  const removeSelectedTasks = () => {
    if (!selectedTaskIds.length) return;
    setTasks((prev) => prev.filter((t) => !selectedIds.has(t.id)));
    clearSelectedIds();
    setMultiSelect(false);
  };
  const markSelectedDone = () => {
    if (!selectedTaskIds.length) return;
    markActiveToday();
    setTasks((prev) => prev.map((t) => (selectedIds.has(t.id) ? { ...t, done: true } : t)));
  };
  const cycleLayout = () => {
    setMenuOpen(false);
    setLayoutMode((prev) => (prev === 'default' ? 'compact' : prev === 'compact' ? 'expanded' : 'default'));
  };
  const handlePrint = () => {
    setMenuOpen(false);
    window.print();
  };
  const SORT_CYCLE = ['time', 'tags', 'list'];
  const toggleViewSort = () => {
    setSortMode((prev) => {
      const idx = SORT_CYCLE.indexOf(prev);
      return SORT_CYCLE[(idx + 1) % SORT_CYCLE.length];
    });
  };
  const sortLabel = sortMode === 'time' ? 'Time' : sortMode === 'tags' ? 'Tags' : 'List';
  const toggleDetailsVisibility = () => {
    setShowDetails((prev) => !prev);
    setViewOpen(false);
  };

  const addSubtask = (e) => {
    e.preventDefault();
    const text = subDraft.trim();
    if (!text || !selected) return;
    update(selected.id, { subtasks: [...selected.subtasks, { id: uid(), text, done: false }] });
    setSubDraft('');
    setBolt(genBolt());
    setLightningFlash(true);
    setTimeout(() => setLightningFlash(false), 900);
  };

  const toggleSubtask = (sid) => {
    if (!selected) return;
    update(selected.id, { subtasks: selected.subtasks.map((s) => (s.id === sid ? { ...s, done: !s.done } : s)) });
  };

  const removeSubtask = (sid) => {
    if (!selected) return;
    update(selected.id, { subtasks: selected.subtasks.filter((s) => s.id !== sid) });
  };

  const MAX_ATTACH_BYTES = 2 * 1024 * 1024; // 2MB per file (localStorage limit)
  const addAttachments = (fileList) => {
    if (!selected || !fileList?.length) return;
    const files = [...fileList];
    let rejected = false;
    Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            if (file.size > MAX_ATTACH_BYTES) {
              rejected = true;
              resolve(null);
              return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve({ id: uid(), name: file.name, type: file.type, size: file.size, dataUrl: reader.result });
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          })
      )
    ).then((results) => {
      const ok = results.filter(Boolean);
      if (ok.length) {
        setTasks((prev) => prev.map((t) => (t.id === selected.id ? { ...t, attachments: [...(t.attachments || []), ...ok] } : t)));
      }
      if (rejected) setAttachError('Some files skipped — max 2MB each.');
      else setAttachError('');
    });
  };

  const removeAttachment = (aid) => {
    if (!selected) return;
    update(selected.id, { attachments: (selected.attachments || []).filter((a) => a.id !== aid) });
  };

  const formatBytes = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);

  const subDone = selected ? selected.subtasks.filter((s) => s.done).length : 0;
  const layoutLabel = layoutMode === 'default' ? 'Default' : layoutMode === 'compact' ? 'Compact' : 'Expanded';
  const groupedTasks = useMemo(() => {
    const now = today();
    const buckets = { today: [], tomorrow: [], upcoming: [], someday: [] };
    visible.forEach((task) => {
      buckets[bucketForTask(task, now)].push(task);
    });
    return buckets;
  }, [visible]);

  const renderTaskRow = (task, { compact = false } = {}) => (
    <button
      key={task.id}
      data-tid={task.id}
      className={
        't2-row t2-row--grouped' +
        (compact ? ' t2-row--compact' : '') +
        (task.id === selectedId ? ' t2-row--active' : '') +
        (multiSelect && selectedIds.has(task.id) ? ' t2-row--selected' : '')
      }
      onClick={() => {
        if (multiSelect) toggleTaskSelection(task.id);
        else setSelectedId(task.id);
      }}
    >
      {multiSelect ? (
        <span
          className={'t2-check t2-check--select' + (selectedIds.has(task.id) ? ' t2-check--done' : '')}
          role="checkbox"
          aria-checked={selectedIds.has(task.id)}
          onClick={(e) => {
            e.stopPropagation();
            toggleTaskSelection(task.id);
          }}
        >
          {selectedIds.has(task.id) && <Check size={12} />}
        </span>
      ) : (
        <span
          className={'t2-check' + (task.done ? ' t2-check--done' : '')}
          role="checkbox"
          aria-checked={task.done}
          onClick={(e) => {
            e.stopPropagation();
            toggleTask(task.id);
          }}
        >
          {task.done && <Check size={12} />}
        </span>
      )}
      <span className="t2-row-text">
        <span className={'t2-row-title' + (task.done ? ' t2-row-title--done' : '')}>{task.text}</span>
        <span className="t2-row-sub">{task.list}</span>
      </span>
    </button>
  );

  const renderSection = (bucket, { compact = false } = {}) => {
    const bucketTasks = groupedTasks[bucket.key];
    const subtitleDate = bucket.key === 'today' ? today() : bucket.key === 'tomorrow' ? offsetDays(today(), 1) : null;
    const subtitle = subtitleDate ? bucket.subtitle(subtitleDate) : '';

    return (
      <section className={'t2-section-card' + (compact ? ' t2-section-card--compact' : '')} key={bucket.key}>
        <header className="t2-section-head">
          <h2>
            {bucket.title}
            {subtitle ? <span>{subtitle}</span> : null}
          </h2>
          <span className="t2-section-count">{bucketTasks.length}</span>
        </header>

        <div className="t2-section-body">
          {bucketTasks.length === 0 ? (
            <p className="t2-board-empty">No tasks here yet.</p>
          ) : (
            bucketTasks.map((task) => renderTaskRow(task, { compact }))
          )}
        </div>

        <form className="t2-board-add" onSubmit={addTaskToBucket(bucket.key)}>
          <Plus size={16} />
          <input
            value={boardDrafts[bucket.key]}
            onChange={(e) => updateBoardDraft(bucket.key, e.target.value)}
            placeholder="Add Task"
          />
        </form>
      </section>
    );
  };

  return (
    <div className={'tasks2' + (layoutMode === 'compact' ? ' tasks2--compact' : '') + (layoutMode === 'expanded' ? ' tasks2--expanded' : '') + (!showDetails ? ' tasks2--details-hidden' : '') + (multiSelect ? ' tasks2--multi' : '')}>
      <header className="tasks2-topbar">
        <div className="t2-leftbar">
          <div className="t2-title">
            <span className="t2-title-icon"><ListChecks size={18} /></span>
            <strong>All my tasks</strong>
          </div>
          <span className="t2-divider" />
          <div className="t2-menu-wrap" ref={viewRef}>
            <button
              className={'t2-menu-btn' + (viewOpen ? ' t2-menu-btn--open' : '')}
              onClick={() => {
                setViewOpen((v) => !v);
                setMenuOpen(false);
              }}
              aria-haspopup="menu"
              aria-expanded={viewOpen}
              aria-label="View options"
            >
              <ArrowUpDown size={15} /> View
            </button>
            {viewOpen && (
              <div className="t2-menu-pop t2-menu-pop--view" role="menu" aria-label="View options">
                <button className="t2-menu-item t2-menu-item--on" role="menuitem" onClick={toggleViewSort}>
                  <span>Sort by</span>
                  <span className="t2-menu-meta">{sortLabel}</span>
                </button>
                <button className="t2-menu-item" role="menuitem" onClick={toggleDetailsVisibility}>
                  <span>Task details</span>
                  <span className="t2-menu-meta">{showDetails ? 'Hide' : 'Show'}</span>
                </button>
              </div>
            )}
          </div>
          <div className="t2-menu-wrap" ref={filterRef}>
            <button
              className={'t2-menu-btn' + (filterOpen ? ' t2-menu-btn--open' : '') + (activeFilterCount > 0 ? ' t2-menu-btn--active' : '')}
              onClick={() => { setFilterOpen((v) => !v); setFilterPanel(null); setMenuOpen(false); setViewOpen(false); }}
              aria-haspopup="menu"
              aria-expanded={filterOpen}
              aria-label="Filter tasks"
            >
              <Filter size={15} /> Filter{activeFilterCount > 0 && <span className="t2-filter-badge">{activeFilterCount}</span>}
            </button>
            {filterOpen && (
              <div className="t2-menu-pop t2-filter-pop" role="menu" aria-label="Filter options">
                {!filterPanel ? (
                  <>
                    <button className="t2-menu-item t2-menu-item--nav" role="menuitem" onClick={() => setFilterPanel('lists')}>
                      <span className="t2-menu-item-left"><Lock size={15} className="t2-menu-item-icon" /> My lists</span>
                      <span className="t2-menu-nav-right">{filterByLists.size > 0 && <span className="t2-filter-badge">{filterByLists.size}</span>}<ChevronRight size={14} /></span>
                    </button>
                    <button className="t2-menu-item t2-menu-item--nav" role="menuitem" onClick={() => setFilterPanel('tags')}>
                      <span className="t2-menu-item-left"><Hash size={15} className="t2-menu-item-icon" /> Tags</span>
                      <span className="t2-menu-nav-right">{filterByTags.size > 0 && <span className="t2-filter-badge">{filterByTags.size}</span>}<ChevronRight size={14} /></span>
                    </button>
                    <button className="t2-menu-item t2-menu-item--nav" role="menuitem" onClick={() => setFilterPanel('status')}>
                      <span className="t2-menu-item-left"><CircleCheck size={15} className="t2-menu-item-icon" /> Status</span>
                      <span className="t2-menu-nav-right">{filterByStatus !== 'all' && <span className="t2-filter-badge">1</span>}<ChevronRight size={14} /></span>
                    </button>
                    {activeFilterCount > 0 && (
                      <button className="t2-filter-clear" onClick={() => { setFilterByLists(new Set()); setFilterByTags(new Set()); setFilterByStatus('all'); }}>
                        Clear all filters
                      </button>
                    )}
                  </>
                ) : filterPanel === 'lists' ? (
                  <>
                    <button className="t2-filter-back" onClick={() => setFilterPanel(null)}><ChevronLeft size={14} /> My lists</button>
                    {LISTS.map((list) => (
                      <button
                        key={list}
                        className={'t2-menu-item t2-menu-item--check' + (filterByLists.has(list) ? ' t2-menu-item--on' : '')}
                        role="menuitemcheckbox"
                        aria-checked={filterByLists.has(list)}
                        onClick={() => setFilterByLists((prev) => { const next = new Set(prev); next.has(list) ? next.delete(list) : next.add(list); return next; })}
                      >
                        <span className="t2-menu-item-left"><span className={'t2-check-dot' + (filterByLists.has(list) ? ' t2-check-dot--on' : '')}>{filterByLists.has(list) && <Check size={10} />}</span>{list}</span>
                      </button>
                    ))}
                  </>
                ) : filterPanel === 'tags' ? (
                  <>
                    <button className="t2-filter-back" onClick={() => setFilterPanel(null)}><ChevronLeft size={14} /> Tags</button>
                    {allTags.length === 0 ? (
                      <p className="t2-filter-empty">No tags yet. Add tags to tasks first.</p>
                    ) : allTags.map((tag) => (
                      <button
                        key={tag}
                        className={'t2-menu-item t2-menu-item--check' + (filterByTags.has(tag) ? ' t2-menu-item--on' : '')}
                        role="menuitemcheckbox"
                        aria-checked={filterByTags.has(tag)}
                        onClick={() => setFilterByTags((prev) => { const next = new Set(prev); next.has(tag) ? next.delete(tag) : next.add(tag); return next; })}
                      >
                        <span className="t2-menu-item-left"><span className={'t2-check-dot' + (filterByTags.has(tag) ? ' t2-check-dot--on' : '')}>{filterByTags.has(tag) && <Check size={10} />}</span>#{tag}</span>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <button className="t2-filter-back" onClick={() => setFilterPanel(null)}><ChevronLeft size={14} /> Status</button>
                    {[['all', 'All tasks'], ['active', 'Active'], ['done', 'Completed']].map(([val, label]) => (
                      <button
                        key={val}
                        className={'t2-menu-item t2-menu-item--check' + (filterByStatus === val ? ' t2-menu-item--on' : '')}
                        role="menuitemradio"
                        aria-checked={filterByStatus === val}
                        onClick={() => setFilterByStatus(val)}
                      >
                        <span className="t2-menu-item-left"><span className={'t2-check-dot' + (filterByStatus === val ? ' t2-check-dot--on' : '')}>{filterByStatus === val && <Check size={10} />}</span>{label}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="t2-menu-wrap" ref={menuRef}>
            <button
              className={'t2-menu-btn t2-menu-btn--icon' + (menuOpen ? ' t2-menu-btn--open' : '')}
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="More options"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div className="t2-menu-pop" role="menu" aria-label="Task actions">
                <button className="t2-menu-item" role="menuitem" onClick={cycleLayout}>
                  <span className="t2-menu-item-left"><LayoutGrid size={15} className="t2-menu-item-icon" /> Layout</span>
                  <span className="t2-menu-meta">{layoutLabel}</span>
                </button>
                <button
                  className={'t2-menu-item' + (multiSelect ? ' t2-menu-item--on' : '')}
                  role="menuitem"
                  onClick={() => {
                    const next = !multiSelect;
                    setMultiSelect(next);
                    if (!next) clearSelectedIds();
                    setMenuOpen(false);
                  }}
                >
                  <span className="t2-menu-item-left"><Layers size={15} className="t2-menu-item-icon" /> Multi-select</span>
                  <span className="t2-menu-meta">{multiSelect ? 'On' : 'Off'}</span>
                </button>
                <button className="t2-menu-item" role="menuitem" onClick={handlePrint}>
                  <span className="t2-menu-item-left"><Printer size={15} className="t2-menu-item-icon" /> Print</span>
                  <span className="t2-menu-meta">Visible tasks</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="t2-tools">
          <button
            className={'t2-streak' + (currentStreak > 0 ? ' t2-streak--active' : '')}
            title={`${currentStreak}-day streak`}
            onClick={() => setCalendarOpen((v) => !v)}
          >
            <Flame size={15} className="t2-streak-flame" />
            <span className="t2-streak-num">{currentStreak}</span>
          </button>
          <button
            className={'t2-tool t2-tool--support' + (supportOpen ? ' t2-tool--on' : '')}
            title="Support"
            onClick={() => { setSupportOpen((v) => !v); setSupportSent(false); }}
          >
            <Headset size={16} />
          </button>
          <div style={{ position: 'relative' }} ref={calendarRef}>
            <button
              className={'t2-tool t2-tool--dot' + (calendarOpen ? ' t2-tool--on' : '')}
              title="Calendar"
              onClick={() => setCalendarOpen((v) => !v)}
            >
              <CalendarDays size={16} />
            </button>
            {calendarOpen && (
              <div className="t2-cal-pop">
                <div className="t2-cal-streakbar">
                  <div className="t2-cal-streak-main">
                    <Flame size={22} className="t2-cal-streak-flame" />
                    <div className="t2-cal-streak-text">
                      <span className="t2-cal-streak-count">{currentStreak}</span>
                      <span className="t2-cal-streak-label">day streak</span>
                    </div>
                  </div>
                  <div className="t2-cal-streak-best">
                    <span className="t2-cal-streak-best-num">{longestStreak}</span>
                    <span className="t2-cal-streak-best-label">best</span>
                  </div>
                </div>
                <Calendar
                  mode="single"
                  selected={calendarDate}
                  onSelect={(d) => d && setCalendarDate(d)}
                  captionLayout="dropdown"
                  className="t2-cal-inner"
                  modifiers={{ streak: streakDays }}
                  modifiersClassNames={{ streak: 't2-cal-streak-day' }}
                />
                <div className="t2-cal-tasks">
                  {(() => {
                    const key = toDateKey(calendarDate);
                    const dayTasks = tasks.filter((t) => {
                      const d = taskDate(t);
                      return d && toDateKey(d) === key;
                    });
                    return dayTasks.length === 0
                      ? <p className="t2-cal-empty">No tasks on this day.</p>
                      : dayTasks.map((t) => (
                        <div key={t.id} className={'t2-cal-task' + (t.done ? ' t2-cal-task--done' : '')}
                          onClick={() => { setSelectedId(t.id); setCalendarOpen(false); }}>
                          <span className="t2-cal-dot" />
                          {t.text}
                        </div>
                      ));
                  })()}
                </div>
              </div>
            )}
          </div>
          <label className="t2-search" title="Search">
            <Search size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" />
          </label>
        </div>
      </header>

      {showDetails ? (
        <div className="tasks2-body">
          <section className="tasks2-list">
            <div className="t2-list-head">All tasks</div>
            {multiSelect && (
              <div className="t2-bulkbar">
                <span>{selectedTaskIds.length ? `${selectedTaskIds.length} selected` : 'Select tasks for bulk actions'}</span>
                <div className="t2-bulk-actions">
                  <button onClick={markSelectedDone} disabled={!selectedTaskIds.length}>Mark done</button>
                  <button onClick={removeSelectedTasks} disabled={!selectedTaskIds.length}>Delete</button>
                  <button onClick={() => { clearSelectedIds(); setMultiSelect(false); }}>Done</button>
                </div>
              </div>
            )}
            <div className="t2-rows" ref={rowsRef}>
              {visible.length === 0 && <p className="t2-empty">No tasks yet. Add one below.</p>}
              {visible.map((t, i) => (
                <button
                  key={t.id}
                  data-tid={t.id}
                  className={'t2-row' + (t.id === selectedId ? ' t2-row--active' : '') + (multiSelect && selectedIds.has(t.id) ? ' t2-row--selected' : '')}
                  style={multiSelect ? { touchAction: 'none' } : undefined}
                  onClick={() => {
                    if (!multiSelect) setSelectedId(t.id);
                  }}
                  onPointerDown={() => { if (multiSelect) startDragSelect(i); }}
                  onPointerEnter={() => dragOverRow(i)}
                >
                  {multiSelect ? (
                    <span
                      className={'t2-check t2-check--select' + (selectedIds.has(t.id) ? ' t2-check--done' : '')}
                      role="checkbox"
                      aria-checked={selectedIds.has(t.id)}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskSelection(t.id);
                      }}
                    >
                      {selectedIds.has(t.id) && <Check size={12} />}
                    </span>
                  ) : (
                    <span
                      className={'t2-check' + (t.done ? ' t2-check--done' : '')}
                      role="checkbox"
                      aria-checked={t.done}
                      onClick={(e) => { e.stopPropagation(); toggleTask(t.id); }}
                    >
                      {t.done && <Check size={12} />}
                    </span>
                  )}
                  <span className="t2-row-text">
                    <span className={'t2-row-title' + (t.done ? ' t2-row-title--done' : '')}>{t.text}</span>
                    <span className="t2-row-sub">{t.list}</span>
                  </span>
                </button>
              ))}
            </div>
            <form className="t2-add" onSubmit={addTask}>
              <Plus size={16} />
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add Task" />
              {draft.trim() && (
                <button type="submit" className="t2-add-send" aria-label="Add task">
                  <ArrowUp size={18} />
                </button>
              )}
            </form>
          </section>

          <section className="tasks2-detail">
            {selected ? (
              <>
                <div className="t2-detail-head">
                  <span className="t2-crumb">
                    <Target size={13} /> My lists <span className="t2-crumb-sep">›</span> {selected.list}
                  </span>
                  <div className="t2-detail-actions">
                    <button className={'t2-complete' + (selected.done ? ' t2-complete--done' : '')} onClick={() => toggleTask(selected.id)}>
                      {selected.done ? 'Completed' : 'Mark as complete'}
                    </button>
                    <button className="t2-icon-btn" title="Delete" onClick={() => removeTask(selected.id)}>
                      <Archive size={17} />
                    </button>
                  </div>
                </div>

                <input className="t2-detail-title" value={selected.text} onChange={(e) => update(selected.id, { text: e.target.value })} placeholder="Task name" />

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
                  ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                  onChange={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                    update(selected.id, { notes: e.target.value });
                  }}
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
                  <div className="t2-sub-add-wrap">
                    <form className="t2-sub t2-sub-add" onSubmit={addSubtask}>
                      <span className="t2-check t2-check--sm t2-check--ghost" />
                      <input
                        value={subDraft}
                        onChange={(e) => setSubDraft(e.target.value)}
                        placeholder="Add a new subtask"
                      />
                    </form>
                  </div>
                </div>

                <div className="t2-section-label">Attachments</div>
                {selected.attachments?.length > 0 && (
                  <div className="t2-attach-list">
                    {selected.attachments.map((a) => (
                      <div key={a.id} className="t2-attach-item">
                        {a.type?.startsWith('image/') ? (
                          <img src={a.dataUrl} alt={a.name} className="t2-attach-thumb" />
                        ) : (
                          <span className="t2-attach-fileicon"><FileText size={16} /></span>
                        )}
                        <span className="t2-attach-meta">
                          <span className="t2-attach-name">{a.name}</span>
                          <span className="t2-attach-size">{formatBytes(a.size)}</span>
                        </span>
                        <a className="t2-attach-act" href={a.dataUrl} download={a.name} title="Download"><Download size={15} /></a>
                        <button className="t2-attach-act" onClick={() => removeAttachment(a.id)} title="Remove"><Trash2 size={15} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div
                  className={'t2-attach' + (attachDrag ? ' t2-attach--drag' : '')}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setAttachDrag(true); }}
                  onDragLeave={() => setAttachDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setAttachDrag(false); addAttachments(e.dataTransfer.files); }}
                >
                  <Paperclip size={15} /> Click to add / drop your files here
                </div>
                {attachError && <p className="t2-attach-error">{attachError}</p>}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => { addAttachments(e.target.files); e.target.value = ''; }}
                />
              </>
            ) : (
              <div className="t2-detail-empty">
                <ListChecks size={40} opacity={0.25} />
                <p>Select a task to see its details</p>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="tasks2-body tasks2-body--board">
          <div className="tasks2-board">
            {VIEW_BUCKETS.map((bucket) => renderSection(bucket, { compact: false }))}
          </div>
        </div>
      )}

      {selected && modal === 'reminder' && (
        <ReminderModal
          initial={selected.reminder}
          onCancel={() => setModal(null)}
          onSet={(r) => {
            update(selected.id, { reminder: r });
            setModal(null);
          }}
        />
      )}
      {selected && modal === 'move' && (
        <MoveToModal
          current={selected.list}
          lists={LISTS}
          onCancel={() => setModal(null)}
          onSelect={(l) => {
            update(selected.id, { list: l });
            setModal(null);
          }}
        />
      )}
      {selected && modal === 'tags' && (
        <TagsModal
          selected={selected.tags}
          onCancel={() => setModal(null)}
          onSave={(tags) => {
            update(selected.id, { tags });
            setModal(null);
          }}
        />
      )}

      {lightningFlash && (
        <div className="lightning-overlay" aria-hidden="true">
          <div className="lightning-flash" />
          <svg className="lightning-bolt" viewBox="0 0 400 800" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="lgMain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff" />
                <stop offset="35%" stopColor="#bae6fd" />
                <stop offset="70%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            {/* wide soft glow path */}
            <path className="lightning-glow"
              d={bolt.main} pathLength="1"
              stroke="#38bdf8" strokeWidth="22" strokeLinejoin="round" strokeLinecap="round" fill="none" />
            {/* branch */}
            <path className="lightning-branch"
              d={bolt.branch} pathLength="1"
              stroke="url(#lgMain)" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" fill="none" />
            {/* bright core */}
            <path className="lightning-core"
              d={bolt.main} pathLength="1"
              stroke="url(#lgMain)" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" fill="none" />
          </svg>
        </div>
      )}

      {supportOpen && (
        <div className="t2-support-pop">
          <div className="t2-support-head">
            <span className="t2-support-title"><Headset size={15} /> Support</span>
            <button className="t2-support-close" onClick={() => setSupportOpen(false)} aria-label="Close">×</button>
          </div>
          {supportSent ? (
            <div className="t2-support-sent">
              <CircleCheck size={32} color="#22c55e" />
              <p>Message sent! We'll get back to you soon.</p>
              <button className="t2-support-submit" onClick={() => { setSupportSent(false); setSupportForm({ name: '', email: '', message: '' }); }}>
                Send another
              </button>
            </div>
          ) : (
            <form
              className="t2-support-form"
              onSubmit={(e) => {
                e.preventDefault();
                const { name, email, message } = supportForm;
                const subject = encodeURIComponent(`Ambio Support Request from ${name}`);
                const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
                const a = document.createElement('a');
                a.href = `mailto:bharath2003n@gmail.com?subject=${subject}&body=${body}`;
                a.rel = 'noopener';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setSupportSent(true);
              }}
            >
              <input
                className="t2-support-input"
                placeholder="Your name"
                value={supportForm.name}
                required
                onChange={(e) => setSupportForm((f) => ({ ...f, name: e.target.value }))}
              />
              <input
                className="t2-support-input"
                placeholder="Your email"
                type="email"
                value={supportForm.email}
                required
                onChange={(e) => setSupportForm((f) => ({ ...f, email: e.target.value }))}
              />
              <textarea
                className="t2-support-input t2-support-textarea"
                placeholder="Describe your issue…"
                value={supportForm.message}
                required
                rows={4}
                onChange={(e) => setSupportForm((f) => ({ ...f, message: e.target.value }))}
              />
              <button type="submit" className="t2-support-submit">Send message</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default TasksPage;