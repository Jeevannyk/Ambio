import React, { useState } from 'react';
import { Plus } from 'lucide-react';

/*
 * Props:
 *   addTask(text: string, priority: 'low'|'med'|'high', due: string) — add a new task
 */
function TodoForm({ addTask }) {
  const [userInput, setUserInput] = useState('');
  const [priority, setPriority] = useState('med');
  const [due, setDue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    addTask(userInput, priority, due);
    setUserInput('');
    setDue('');
    setPriority('med');
  };

  return (
    <form className="todo-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="todo-input"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="Enter a task..."
        aria-label="Task description"
      />
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        aria-label="Priority"
      >
        <option value="low">Low</option>
        <option value="med">Med</option>
        <option value="high">High</option>
      </select>
      <input
        type="date"
        value={due}
        onChange={(e) => setDue(e.target.value)}
        aria-label="Due date"
      />
      <button type="submit"><Plus size={16} /> Add</button>
    </form>
  );
}

export default TodoForm;
