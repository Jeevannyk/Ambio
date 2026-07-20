import React from 'react';
import TodoItem from './TodoItem';

/*
 * Props:
 *   tasks      : Array<{ id: string, text: string, done: boolean, priority: 'low'|'med'|'high', due: string }>
 *   removeTask(id: string)
 *   toggleTask(id: string)
 *   editTask(id: string, text: string)
 *   moveTask(id: string, direction: -1|1)
 */
function TodoList({ tasks, removeTask, toggleTask, editTask, moveTask }) {
  if (tasks.length === 0) {
    return <p className="empty-state">No tasks to show.</p>;
  }

  return (
    <ul className="todo-list">
      {tasks.map((task, index) => (
        <TodoItem
          key={task.id}
          task={task}
          isFirst={index === 0}
          isLast={index === tasks.length - 1}
          removeTask={removeTask}
          toggleTask={toggleTask}
          editTask={editTask}
          moveTask={moveTask}
        />
      ))}
    </ul>
  );
}

export default TodoList;
