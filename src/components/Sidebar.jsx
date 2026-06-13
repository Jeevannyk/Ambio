import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ListTodo, Video, User, Palette, Music } from 'lucide-react';

const NAV = [
  { to: '/',        label: 'Home',    icon: Home },
  { to: '/tasks',   label: 'Tasks',   icon: ListTodo },
  { to: '/my-room', label: 'My Room', icon: User },
  { to: '/rooms',   label: 'Rooms',   icon: Video },
];

/*
 * LifeAt-style floating rail: two small white cards with icon + tiny
 * label, hovering over the environment instead of a full-height bar.
 * Tools (Themes, Music) open overlay panels; nothing pushes content.
 */
function Sidebar({ themesOpen, onToggleThemes, musicOpen, onToggleMusic }) {
  return (
    <aside className="rail" aria-label="Navigation">
      <div className="rail-group">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            className={({ isActive }) =>
              'rail-item' + (isActive ? ' rail-item--active' : '')
            }
          >
            <Icon size={20} />
            <span className="rail-item-label">{label}</span>
          </NavLink>
        ))}
      </div>

      <div className="rail-group">
        <button
          className={'rail-item' + (themesOpen ? ' rail-item--active' : '')}
          onClick={onToggleThemes}
          title="Themes"
          aria-expanded={themesOpen}
        >
          <Palette size={20} />
          <span className="rail-item-label">Themes</span>
        </button>

        <button
          className={'rail-item' + (musicOpen ? ' rail-item--active' : '')}
          onClick={onToggleMusic}
          title="Music"
          aria-expanded={musicOpen}
        >
          <Music size={20} />
          <span className="rail-item-label">Music</span>
        </button>

      </div>
    </aside>
  );
}

export default Sidebar;
