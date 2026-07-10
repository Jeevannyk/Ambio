import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Focus, Users, Heart } from 'lucide-react';
import { ListChecks, VideoCamera, Timer } from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import { useScrollReveal } from '../hooks/useScrollReveal';

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

// Split text into per-character animated spans
function AnimChars({ text, offset = 0 }) {
  return (
    <>
      {[...text].map((ch, i) =>
        ch === ' ' ? (
          <span key={i} style={{ display: 'inline-block', width: '0.28em' }}>{' '}</span>
        ) : (
          <span key={i} className="anim-char" style={{ '--ci': offset + i }}>
            {ch}
          </span>
        )
      )}
    </>
  );
}

function WelcomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cardsRef = useRef(null);
  const canvasRef = useRef(null);

  useScrollReveal();

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // ── 3D holographic tilt + inner shimmer ──────────────────────────
  useEffect(() => {
    const container = cardsRef.current;
    if (!container) return;
    const cards = [...container.querySelectorAll('.welcome-card')];
    const cleanups = [];

    cards.forEach((card) => {
      const shine = card.querySelector('.wc-shine');

      const onMove = (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;

        card.style.transition = 'box-shadow 0.06s';
        card.style.transform = `perspective(700px) rotateX(${-y * 18}deg) rotateY(${x * 18}deg) translateZ(14px)`;
        card.style.boxShadow = `${x * -28}px ${y * -28}px 52px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.12)`;

        if (shine) {
          shine.style.opacity = '1';
          shine.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,0.15), transparent 62%)`;
        }
      };

      const onLeave = () => {
        card.style.transition = 'transform 0.9s cubic-bezier(0.22,1,0.36,1), box-shadow 0.9s cubic-bezier(0.22,1,0.36,1)';
        card.style.transform = '';
        card.style.boxShadow = '';
        if (shine) shine.style.opacity = '0';
      };

      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        card.removeEventListener('mousemove', onMove);
        card.removeEventListener('mouseleave', onLeave);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  // ── Canvas particle network ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w = 0, h = 0;
    const resize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const pts = Array.from({ length: 65 }, () => ({
      x: Math.random() * (w || 640),
      y: Math.random() * (h || 320),
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
    }));

    let mx = -999, my = -999;
    const onMouse = (e) => {
      const r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    };
    window.addEventListener('mousemove', onMouse, { passive: true });

    let raf;
    const LINK = 105;
    const CURSOR = 160;

    const tick = () => {
      ctx.clearRect(0, 0, w, h);

      pts.forEach((p) => {
        p.x = ((p.x + p.vx) + w) % w;
        p.y = ((p.y + p.vy) + h) % h;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fill();
      });

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          if (d < LINK) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(255,255,255,${0.09 * (1 - d / LINK)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
        const dc = Math.hypot(pts[i].x - mx, pts[i].y - my);
        if (dc < CURSOR) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(mx, my);
          ctx.strokeStyle = `rgba(96,165,250,${0.28 * (1 - dc / CURSOR)})`;
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return (
    <div className="welcome-page">

      {/* ── Hero ─────────────────────────────────────────── */}
      <header className="welcome-hero">
        <canvas ref={canvasRef} className="welcome-canvas" aria-hidden="true" />

        <div className="welcome-hero-content">
          <div className="welcome-badge">◉ Ambio</div>
          <p className="welcome-greeting">{greeting}, {firstName}.</p>
          <h1 className="welcome-display">
            <span className="welcome-display-line1">
              <AnimChars text="Your calm space" offset={0} />
            </span>
            <br />
            <span className="welcome-display-accent">to work.</span>
          </h1>
          <p className="welcome-sub">
            Tasks, rooms, and ambient music — all in one corner.
          </p>
        </div>
      </header>

      {/* ── Feature cards (Asymmetric Bento Grid) ─────────── */}
      <div className="welcome-cards" ref={cardsRef}>
        {/* Master Card: My Room (Focus Space) */}
        <button className="welcome-card welcome-card--featured" onClick={() => navigate('/my-room')}>
          <div className="wc-shine" />
          <div className="welcome-card-top">
            <div className="welcome-card-icon-wrapper focus-icon">
              <Timer size={26} weight="duotone" />
            </div>
            <div className="welcome-card-glow focus-glow" />
          </div>
          <div className="welcome-card-body">
            <h3>My Room</h3>
            <p className="welcome-card-desc">Your personal ambient focus space. Start a Pomodoro session, choose a calming background, and tune in to built-in lo-fi channels.</p>
          </div>
          <div className="welcome-card-footer">
            <span className="welcome-card-cta">Step Inside <ArrowRight size={14} /></span>
          </div>
        </button>

        {/* Compact Card: Tasks */}
        <button className="welcome-card" onClick={() => navigate('/tasks')}>
          <div className="wc-shine" />
          <div className="welcome-card-top-compact">
            <div className="welcome-card-icon-wrapper tasks-icon">
              <ListChecks size={22} weight="duotone" />
            </div>
            <div className="welcome-card-glow tasks-glow" />
          </div>
          <div className="welcome-card-body">
            <h3>Tasks</h3>
            <p>Organize daily to-dos with structured priorities, tags, and reminders.</p>
          </div>
          <div className="welcome-card-footer">
            <span className="welcome-card-cta">Manage To-Dos <ArrowRight size={13} /></span>
          </div>
        </button>

        {/* Compact Card: Rooms */}
        <button className="welcome-card" onClick={() => navigate('/rooms')}>
          <div className="wc-shine" />
          <div className="welcome-card-top-compact">
            <div className="welcome-card-icon-wrapper rooms-icon">
              <VideoCamera size={22} weight="duotone" />
            </div>
            <div className="welcome-card-glow rooms-glow" />
          </div>
          <div className="welcome-card-body">
            <h3>Focus Rooms</h3>
            <p>Work alongside creators, developers, and students in live shared spaces.</p>
          </div>
          <div className="welcome-card-footer">
            <span className="welcome-card-cta">Join a Room <ArrowRight size={13} /></span>
          </div>
        </button>
      </div>

      {/* ── Story ─────────────────────────────────────────── */}
      <section className="welcome-story reveal">
        <span className="welcome-story-tag"><Sparkles size={13} /> The story</span>
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
          <p>"Focus shouldn't feel like a fight. The right space does half the work."</p>
        </div>
      </section>

      {/* ── Values ────────────────────────────────────────── */}
      <section className="welcome-values reveal">
        <div className="welcome-value">
          <span className="welcome-value-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
            <Focus size={20} />
          </span>
          <h4>Calm by design</h4>
          <p>Soft visuals, gentle motion, zero clutter — built to lower the friction of starting.</p>
        </div>
        <div className="welcome-value">
          <span className="welcome-value-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
            <Sparkles size={20} />
          </span>
          <h4>All in one</h4>
          <p>Tasks, timer, ambience, and music together — no more juggling five tabs.</p>
        </div>
        <div className="welcome-value">
          <span className="welcome-value-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>
            <Users size={20} />
          </span>
          <h4>Better together</h4>
          <p>Join a room and work alongside others when solo focus isn't enough.</p>
        </div>
      </section>

      {/* ── Creator ───────────────────────────────────────── */}
      <section className="welcome-creator reveal">
        <div className="welcome-creator-avatar">
          <img
            src="/photo.png"
            alt="Jeevan"
            onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.textContent = 'J'; }}
          />
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
