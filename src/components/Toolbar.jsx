import React from 'react';
import { Search, Trash2 } from 'lucide-react';

/*
 * Props:
 *   filter           : 'all'|'active'|'completed'
 *   setFilter        : (filter: string) => void
 *   search           : string
 *   setSearch        : (search: string) => void
 *   remaining        : number — count of incomplete tasks
 *   total            : number — total task count
 *   onClearCompleted : () => void
 *   hasCompleted     : boolean
 */

const FILTERS = ['all', 'active', 'completed'];

function Toolbar({
  filter,
  setFilter,
  search,
  setSearch,
  remaining,
  total,
  onClearCompleted,
  hasCompleted,
}) {
  if (total === 0) return null; // Nothing to filter/search yet

  return (
    <nav className="toolbar" aria-label="Filter and search tasks">
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
        <input
          type="search"
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          aria-label="Search tasks"
          style={{ paddingLeft: '2rem', width: '100%' }}
        />
      </div>

      <div className="filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={filter === f ? 'filter active' : 'filter'}
            onClick={() => setFilter(f)}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="toolbar-footer">
        <span className="counter">
          {remaining} of {total} left
        </span>
        {hasCompleted && (
          <button className="clear-completed" onClick={onClearCompleted} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Trash2 size={13} /> Clear completed
          </button>
        )}
      </div>
    </nav>
  );
}

export default Toolbar;
