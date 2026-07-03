import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ListTodo, Video, User, ArrowRight, Sparkles, Focus, Users, Heart } from 'lucide-react';

// lucide dropped brand/social glyphs (trademark) — inline them.
const LinkedinIcon = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  </svg>
);
const InstagramIcon = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <div className="welcome-hero">
        <div className="welcome-badge">✦ Ambio</div>
        <h1 className="welcome-title">Welcome back</h1>
        <p className="welcome-sub">
          Stay productive. Manage your tasks, join rooms, and keep the flow going.
        </p>
      </div>

      <div className="welcome-cards">
        <button className="welcome-card" onClick={() => navigate('/tasks')}>
          <div className="welcome-card-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <ListTodo size={28} color="var(--accent)" />
          </div>
          <div className="welcome-card-body">
            <h3>Tasks</h3>
            <p>Add, manage, and track your daily to-dos.</p>
          </div>
          <ArrowRight size={18} className="welcome-card-arrow" />
        </button>

        <button className="welcome-card" onClick={() => navigate('/my-room')}>
          <div className="welcome-card-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <User size={28} color="#f59e0b" />
          </div>
          <div className="welcome-card-body">
            <h3>My Room</h3>
            <p>Your personal focus space with timer and ambience.</p>
          </div>
          <ArrowRight size={18} className="welcome-card-arrow" />
        </button>

        <button className="welcome-card" onClick={() => navigate('/rooms')}>
          <div className="welcome-card-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <Video size={28} color="#10b981" />
          </div>
          <div className="welcome-card-body">
            <h3>Rooms</h3>
            <p>Create focus rooms and work alongside others.</p>
          </div>
          <ArrowRight size={18} className="welcome-card-arrow" />
        </button>
      </div>

      {/* ── The story ─────────────────────────────────────────────── */}
      <section className="welcome-story">
        <span className="welcome-story-tag"><Sparkles size={14} /> The story</span>
        <h2 className="welcome-story-title">Why Ambio exists</h2>
        <p className="welcome-story-text">
          Ambio started with a simple frustration. Most to-do apps are loud, cluttered, and
          built to make you feel <em>behind</em>. The focus tools lived in one place, the
          calming music in another, and study-with-me rooms somewhere else entirely. Staying
          productive meant juggling five tabs — and that noise was the opposite of focus.
        </p>
        <p className="welcome-story-text">
          So I built the calm corner I always wanted: tasks, a Pomodoro timer, ambient
          wallpapers, music, and live focus rooms — all in one quiet space. No clutter,
          no guilt. Just you, your work, and an environment that helps you actually start.
        </p>

        <div className="welcome-quote">
          <p>“Focus shouldn't feel like a fight. The right space does half the work.”</p>
        </div>
      </section>

      {/* ── Values ────────────────────────────────────────────────── */}
      <section className="welcome-values">
        <div className="welcome-value">
          <span className="welcome-value-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}><Focus size={20} /></span>
          <h4>Calm by design</h4>
          <p>Soft visuals, gentle motion, zero clutter — built to lower the friction of starting.</p>
        </div>
        <div className="welcome-value">
          <span className="welcome-value-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}><Sparkles size={20} /></span>
          <h4>All in one</h4>
          <p>Tasks, timer, ambience, and music together — no more juggling five tabs.</p>
        </div>
        <div className="welcome-value">
          <span className="welcome-value-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}><Users size={20} /></span>
          <h4>Better together</h4>
          <p>Join a room and work alongside others when solo focus isn't enough.</p>
        </div>
      </section>

      {/* ── Creator ───────────────────────────────────────────────── */}
      <section className="welcome-creator">
        <div className="welcome-creator-avatar">
          <img src="/photo.png" alt="Jeevan" onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.textContent = 'J'; }} />
        </div>
        <div className="welcome-creator-body">
          <h4>Built by Jeevan</h4>
          <p>
            A student who got tired of switching between apps to stay focused — and decided to
            design one calm home for all of it. Ambio is a passion project, shaped by real
            study sessions and a lot of late-night iteration.
          </p>
          <span className="welcome-creator-made"><Heart size={13} /> Made with care, still evolving</span>

          <div className="welcome-socials">
            <a
              className="welcome-social"
              href="https://www.linkedin.com/in/jeevan-nayak-b6663131b"
              target="_blank"
              rel="noopener noreferrer"
            >
              <LinkedinIcon /> LinkedIn
            </a>
            <a
              className="welcome-social"
              href="https://www.instagram.com/nayak__789/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <InstagramIcon /> Instagram
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default WelcomePage;
