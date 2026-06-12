import React, { useState, useEffect, useMemo, useRef } from 'react';
import TodoForm from '../components/TodoForm';
import TodoList from '../components/TodoList';
import Toolbar from '../components/Toolbar';
import UndoToast from '../components/UndoToast';

const STORAGE_KEY = 'react-todo-app.tasks';

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function TasksPage() {
  const [tasks, setTasks] = useState(loadTasks);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [lastDeleted, setLastDeleted] = useState(null);
  const undoTimer = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const addTask = (text, priority, due) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTasks((prev) => [
      ...prev,
      { id: uid(), text: trimmed, done: false, priority, due: due || '' },
    ]);
  };

  const removeTask = (id) => {
    setTasks((prev) => {
      const index = prev.findIndex((t) => t.id === id);
      if (index === -1) return prev;
      setLastDeleted({ task: prev[index], index });
      clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setLastDeleted(null), 5000);
      return prev.filter((t) => t.id !== id);
    });
  };

  const undoDelete = () => {
    if (!lastDeleted) return;
    setTasks((prev) => {
      const next = [...prev];
      next.splice(lastDeleted.index, 0, lastDeleted.task);
      return next;
    });
    setLastDeleted(null);
    clearTimeout(undoTimer.current);
  };

  const toggleTask = (id) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const editTask = (id, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, text: trimmed } : t)));
  };

  const moveTask = (id, direction) => {
    setTasks((prev) => {
      const index = prev.findIndex((t) => t.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const clearCompleted = () => setTasks((prev) => prev.filter((t) => !t.done));

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (filter === 'active' && t.done) return false;
      if (filter === 'completed' && !t.done) return false;
      if (query && !t.text.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [tasks, filter, search]);

  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <div className="App">
      <header className="app-header">
        <h1>Todo List</h1>
      </header>

      <TodoForm addTask={addTask} />

      <Toolbar
        filter={filter}
        setFilter={setFilter}
        search={search}
        setSearch={setSearch}
        remaining={remaining}
        total={tasks.length}
        onClearCompleted={clearCompleted}
        hasCompleted={tasks.some((t) => t.done)}
      />

      <TodoList
        tasks={visibleTasks}
        removeTask={removeTask}
        toggleTask={toggleTask}
        editTask={editTask}
        moveTask={moveTask}
      />

      {lastDeleted && (
        <UndoToast text={lastDeleted.task.text} onUndo={undoDelete} />
      )}

    </div>
  );
}

export default TasksPage;
