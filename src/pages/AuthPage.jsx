import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import './AuthPage.css';

// Small brand glyphs (lucide has no brand logos).
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C40.9 36 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M318.7 268c-.2-37 16.8-65 50.3-85.4-18.7-26.8-47-41.6-84.3-44.4-35.4-2.8-74 20.7-88.2 20.7-15 0-49.2-19.7-75.9-19.7C71.7 139.7 0 184.6 0 276c0 27 4.9 54.9 14.8 83.7 13.2 37.9 60.9 131 110.7 129.5 25.9-.6 44.2-18.4 78-18.4 32.8 0 49.7 18.4 78.5 18.4 50.2-.7 93.4-85.3 106-123.4-67-31.6-69.3-92.6-69.3-97.8zM256.4 84.5c25.6-30.4 23.3-58 22.5-67.9-22.6 1.3-48.8 15.4-63.7 32.7-16.5 18.6-26.2 41.6-24.1 66.5 24.5 1.9 46.8-10.7 65.3-31.3z" />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('signup'); // 'signup' | 'signin'
  const [anim, setAnim] = useState(''); // '' | 'out' | 'in' | 'exit'
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const clock = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const switchMode = () => {
    if (anim) return;
    setErr(''); setInfo('');
    setAnim('out');
  };

  const onCardAnimEnd = () => {
    if (anim === 'out') {
      setMode((m) => (m === 'signup' ? 'signin' : 'signup'));
      setAnim('in');
    } else if (anim === 'in') {
      setAnim('');
    } else if (anim === 'exit') {
      navigate('/'); // navigate only after the fade-away fully finishes
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setInfo('');
    if (!isSupabaseConfigured) { setErr('Auth not configured yet (missing Supabase keys).'); return; }
    setBusy(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.name } },
        });
        if (error) throw error;
        // If email confirmation is ON, there's no session yet.
        if (!data.session) {
          setInfo('Check your email to confirm your account, then sign in.');
          setBusy(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
      }
      setBusy(false);
      setAnim('exit'); // session set → play fade-away, then navigate home
    } catch (e2) {
      setErr(e2.message || 'Something went wrong.');
      setBusy(false);
    }
  };

  const oauth = async (provider) => {
    setErr('');
    if (!isSupabaseConfigured) { setErr('Auth not configured yet (missing Supabase keys).'); return; }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) setErr(error.message);
  };

  return (
    <div className="auth-screen">
      <video className="auth-bg-video" autoPlay loop muted playsInline>
        <source src="/videos/rainy-night.mp4" type="video/mp4" />
      </video>
      <div className="auth-bg-tint" />
      <div
        className={'auth-card' + (anim === 'out' ? ' auth-card--out' : '') + (anim === 'in' ? ' auth-card--in' : '') + (anim === 'exit' ? ' auth-card--exit' : '')}
        onAnimationEnd={onCardAnimEnd}
      >
        {/* Left — form */}
        <div className="auth-left">
          <div className="auth-brand">◉ Ambio</div>

          <div className="auth-form-wrap">
            <h1 className="auth-title">{isSignup ? 'Step inside' : 'Welcome back'}</h1>
            <p className="auth-sub">{isSignup ? 'Create your account — your focus room is waiting' : 'Sign in to return to your room'}</p>

            <form className="auth-form" onSubmit={submit}>
              {isSignup && (
                <label className="auth-field">
                  <span>Full name</span>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={form.name}
                    required
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </label>
              )}

              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  required
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>

              <label className="auth-field">
                <span>Password</span>
                <div className="auth-pw">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={form.password}
                    required
                    minLength={6}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                  <button type="button" className="auth-pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label="Toggle password">
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              {err && <p className="auth-msg auth-msg--err">{err}</p>}
              {info && <p className="auth-msg auth-msg--ok">{info}</p>}

              <button type="submit" className="auth-submit" disabled={busy}>
                {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <div className="auth-social">
              <button type="button" className="auth-social-btn" onClick={() => oauth('apple')}><AppleIcon /> Apple</button>
              <button type="button" className="auth-social-btn" onClick={() => oauth('google')}><GoogleIcon /> Google</button>
            </div>
          </div>

          <div className="auth-foot">
            <span>
              {isSignup ? 'Have an account? ' : "Don't have an account? "}
              <button type="button" className="auth-foot-link" onClick={switchMode}>
                {isSignup ? 'Sign in' : 'Sign up'}
              </button>
            </span>
            <button type="button" className="auth-foot-terms">Terms &amp; Conditions</button>
          </div>
        </div>

        {/* Right — window into the focus room */}
        <div className="auth-right">
          <button className="auth-close" onClick={() => navigate('/')} aria-label="Close"><X size={18} /></button>

          <video className="auth-window-video" autoPlay loop muted playsInline>
            <source src="/videos/rainy-night.mp4" type="video/mp4" />
          </video>
          <div className="auth-window-glow" aria-hidden="true" />

          <div className="auth-window-clock">{clock}</div>

          <div className="auth-window-foot">
            <span className="auth-window-dot" aria-hidden="true" />
            <span>Rainy night · your room is ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
