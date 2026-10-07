import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  House,
  Notepad,
  Timer,
  VideoCamera,
  PaintBrush,
  MusicNotes,
  Bell,
  BellSlash,
  SignOut,
} from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import { isAuthRoute } from '../lib/auth';

const NAV = [
  { to: '/',        label: 'Home',    icon: House },
  { to: '/tasks',   label: 'Tasks',   icon: Notepad },
  { to: '/my-room', label: 'My Room', icon: Timer },
  { to: '/rooms',   label: 'Rooms',   icon: VideoCamera },
];

function Sidebar({ themesOpen, onToggleThemes, musicOpen, onToggleMusic, remindersMuted, onToggleReminders }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();

  // Auth pages are a standalone experience — no app chrome.
  if (isAuthRoute(pathname)) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

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
            <Icon size={22} weight="duotone" />
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
          <PaintBrush size={22} weight="duotone" />
          <span className="rail-item-label">Themes</span>
        </button>

        <button
          className={'rail-item' + (musicOpen ? ' rail-item--active' : '')}
          onClick={onToggleMusic}
          title="Music"
          aria-expanded={musicOpen}
        >
          <MusicNotes size={22} weight="duotone" />
          <span className="rail-item-label">Music</span>
        </button>

        {/* Reminder chimes need a kill switch that's reachable mid-call, not
            only from the task page that set them. */}
        <button
          className="rail-item"
          onClick={onToggleReminders}
          title={remindersMuted ? 'Reminder sound off' : 'Reminder sound on'}
          aria-pressed={!remindersMuted}
        >
          {remindersMuted ? <BellSlash size={22} weight="duotone" /> : <Bell size={22} weight="duotone" />}
          <span className="rail-item-label">{remindersMuted ? 'Muted' : 'Alerts'}</span>
        </button>

        {user && (
          <button className="rail-item" onClick={handleSignOut} title="Sign out">
            <SignOut size={22} weight="duotone" />
            <span className="rail-item-label">Logout</span>
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
