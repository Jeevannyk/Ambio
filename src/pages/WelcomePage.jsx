import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ListTodo, Video, Shield, ArrowRight } from 'lucide-react';

function WelcomePage({ isAdmin }) {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <div className="welcome-hero">
        <div className="welcome-badge">✦ Ambio</div>
        <h1 className="welcome-title">Welcome back</h1>
        <p className="welcome-sub">
          Stay productive. Manage your tasks, join rooms, and keep the flow going.
        </p>
        {isAdmin && (
          <span className="welcome-admin-badge">
            <Shield size={13} /> Admin Mode Active
          </span>
        )}
      </div>

      <div className="welcome-cards">
        <button className="welcome-card" onClick={() => navigate('/tasks')}>
          <div className="welcome-card-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <ListTodo size={28} color="var(--accent)" />
          </div>
          <div className="welcome-card-body">
            <h3>Tasks</h3>
            <p>Add, manage, and track your daily to-dos.</p>
          </div>
          <ArrowRight size={18} className="welcome-card-arrow" />
        </button>

        <button className="welcome-card" onClick={() => navigate('/rooms')}>
          <div className="welcome-card-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <Video size={28} color="#10b981" />
          </div>
          <div className="welcome-card-body">
            <h3>Rooms</h3>
            <p>Join focus rooms or {isAdmin ? 'create new ones.' : 'ask an admin to create one.'}</p>
          </div>
          <ArrowRight size={18} className="welcome-card-arrow" />
        </button>
      </div>
    </div>
  );
}

export default WelcomePage;
