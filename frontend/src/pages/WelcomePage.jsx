import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Focus, Users, Heart } from 'lucide-react';
import { ListChecks, VideoCamera, Timer } from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import { useScrollReveal } from '../hooks/useScrollReveal';
import './WelcomePage.css';

const LinkedinIcon = (props) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  </svg>
);

const InstagramIcon = (props) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

function AnimChars({ text, offset = 0 }) {
  return (
    <span className="anim-word-wrapper">
      {[...text].map((ch, i) =>
        ch === ' ' ? (
          <span key={i} className="anim-space" aria-hidden="true">&nbsp;</span>
        ) : (
          <span key={i} className="anim-char" style={{ '--ci': offset + i }}>
            {ch}
          </span>
        )
      )}
    </span>
  );
}

function WelcomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const matrixRef = useRef(null);

  useScrollReveal();

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there';

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000); // Ticks faster for live UI precision feel
    return () => clearInterval(t);
  }, []);

  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLine = now
    .toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
    .toUpperCase();
  const clock = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });

  // Interactive mouse tracking grid aura
  useEffect(() => {
    const grid = matrixRef.current;
    if (!grid || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const handleMouseMove = (e) => {
      const rect = grid.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      grid.style.setProperty('--mouse-x', `${x}px`);
      grid.style.setProperty('--mouse-y', `${y}px`);
    };

    grid.addEventListener('mousemove', handleMouseMove);
    return () => grid.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="ambio-workspace-container" ref={matrixRef}>
      {/* Dynamic Mesh Layer */}
      <div className="ambio-mesh-grid" aria-hidden="true" />

      {/* ── Top Dashboard Header ── */}
      <header className="ambio-hud-header">
        <div className="ambio-badge-pill">
          <span className="pulse-indicator"></span>
          <span>SYSTEM ONLINE</span>
        </div>
        <div className="ambio-chronograph">
          <span className="date-segment">{dateLine}</span>
          <span className="divider-segment">//</span>
          <span className="time-segment">{clock}</span>
        </div>
      </header>

      {/* ── Primary Kinetic Typo Hero ── */}
      <section className="ambio-hero-cluster">
        <h1 className="ambio-glance-title">
          <span className="block-line">
            <AnimChars text={`${greeting},`} offset={0} />
          </span>
          <span className="block-line dynamic-name">
            <AnimChars text={`${firstName}.`} offset={greeting.length + 1} />
          </span>
        </h1>
        <div className="ambio-ambient-descriptor">
          <p>The rain&rsquo;s on. Your desk is ready.</p>
          <span className="decorative-coordinates">47.6062&deg; N, 122.3321&deg; W</span>
        </div>
      </section>

      {/* ── Interactive Workspace Gateways ── */}
      <nav className="ambio-matrix-gateways">
        <button className="gateway-card premium-span" onClick={() => navigate('/my-room')}>
          <div className="card-scanner-line" />
          <div className="gateway-icon-container gold-glow">
            <Timer size={26} weight="duotone" />
          </div>
          <div className="gateway-meta">
            <h3>My Room</h3>
            <p>Your desk, timer, and lo-fi — a Pomodoro away from starting.</p>
          </div>
          <div className="gateway-action">
            <span>Initialize Session</span>
            <ArrowRight size={16} className="arrow-tr" />
          </div>
        </button>

        <button className="gateway-card" onClick={() => navigate('/tasks')}>
          <div className="card-scanner-line" />
          <div className="gateway-icon-container">
            <ListChecks size={24} weight="duotone" />
          </div>
          <div className="gateway-meta">
            <h3>Tasks</h3>
            <p>What needs doing tonight — priorities, tags, reminders.</p>
          </div>
          <div className="gateway-action">
            <span>Open Backlog</span>
            <ArrowRight size={14} className="arrow-tr" />
          </div>
        </button>

        <button className="gateway-card" onClick={() => navigate('/rooms')}>
          <div className="card-scanner-line" />
          <div className="gateway-icon-container">
            <VideoCamera size={24} weight="duotone" />
          </div>
          <div className="gateway-meta">
            <h3>Focus Rooms</h3>
            <p>Work beside others, live — quiet company for deep work.</p>
          </div>
          <div className="gateway-action">
            <span>Synchronize</span>
            <ArrowRight size={14} className="arrow-tr" />
          </div>
        </button>
      </nav>

      {/* ── Purpose Manifesto ── */}
      <section className="ambio-manifesto reveal">
        <div className="manifesto-inner">
          <blockquote className="manifesto-quote">
            &ldquo;Focus shouldn&rsquo;t feel like a fight. The right space does half the work.&rdquo;
          </blockquote>
          <div className="manifesto-body-grid">
            <p>
              Ambio started with a simple frustration. Most to-do apps are loud, cluttered,
              and built to make you feel <em>behind</em>. The focus tools lived in one place,
              the calming music in another, and study-with-me rooms somewhere else entirely.
            </p>
            <p>
              So I built the calm corner I always wanted: tasks, a Pomodoro timer, ambient
              wallpapers, music, and live focus rooms — one quiet space. No clutter, no
              guilt. Just you, your work, and a room that helps you actually start.
            </p>
          </div>
        </div>
      </section>

      {/* ── Core Systems Pillars ── */}
      <section className="ambio-pillars reveal">
        <div className="pillar-tile">
          <div className="pillar-header">
            <Focus size={20} className="pillar-icon" />
            <h4>Calm by design</h4>
          </div>
          <p>Soft visuals, gentle motion, zero clutter — less friction to start.</p>
        </div>
        <div className="pillar-tile">
          <div className="pillar-header">
            <Sparkles size={20} className="pillar-icon" />
            <h4>All in one</h4>
          </div>
          <p>Tasks, timer, ambience, and music together — no juggling tabs.</p>
        </div>
        <div className="pillar-tile">
          <div className="pillar-header">
            <Users size={20} className="pillar-icon" />
            <h4>Better together</h4>
          </div>
          <p>Join a room when solo focus isn&rsquo;t enough.</p>
        </div>
      </section>

      {/* ── Engineering Signature Module ── */}
      <footer className="ambio-signature-deck reveal">
        <div className="signature-card">
          <div className="avatar-wrapper" data-fallback="J">
            <img
              src="/photo.png"
              alt="Jeevan Portfolio Avatar"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div className="signature-details">
            <div className="signature-headline">
              <h4>Built by Jeevan</h4>
              <span className="dev-tag">Core Architect</span>
            </div>
            <p>
              A student who got tired of switching between apps to stay focused — so he
              designed one calm home for all of it. Shaped by real study sessions and a
              lot of late-night iteration.
            </p>
            <div className="signature-footer">
              <span className="craft-note">
                <Heart size={12} className="heart-pulse" /> Made with care, still evolving
              </span>
              <div className="network-channels">
                <a
                  className="channel-link"
                  href="https://www.linkedin.com/in/jeevan-nayak-b6663131b"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LinkedinIcon /> <span>LinkedIn</span>
                </a>
                <a
                  className="channel-link"
                  href="https://www.instagram.com/nayak__789/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <InstagramIcon /> <span>Instagram</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default WelcomePage;
