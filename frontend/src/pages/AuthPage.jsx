import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeClosed, X } from '@phosphor-icons/react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
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

function DiscordIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

// Keep in sync with the .auth-card--exit animation duration in AuthPage.css.
const EXIT_MS = 500;

// Supabase error codes → copy a human can act on. Anything unmapped falls back
// to the raw message.
const ERROR_COPY = {
  invalid_credentials: 'Email or password is incorrect.',
  user_already_exists: 'That email already has an account.',
  email_not_confirmed: 'Confirm your email first — the link is in your inbox.',
  over_email_send_rate_limit: 'Too many emails sent. Wait a minute and try again.',
  weak_password: 'That password is too weak — use at least 6 characters.',
};

// auth-js wraps a failed browser fetch as AuthRetryableFetchError with status 0,
// so an offline user would otherwise read the raw "Failed to fetch".
function errorCopy(e) {
  if (ERROR_COPY[e?.code]) return ERROR_COPY[e.code];
  if (e?.name === 'AuthRetryableFetchError' && e.status === 0) {
    return "Can't reach Ambio. Check your connection and try again.";
  }
  return e?.message || 'Something went wrong.';
}

function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { pathname } = location;
  const [mode, setMode] = useState(() => (pathname === '/login' ? 'signin' : 'signup')); // 'signup' | 'signin'
  const [anim, setAnim] = useState(''); // '' | 'out' | 'in' | 'exit'
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  // rainy-night.mp4 is 5 MB. .auth-right is display:none ≤800px but a rendered
  // <video> downloads anyway, so gate it here instead of leaving it to CSS.
  const [showRoomVideo] = useState(() => window.matchMedia('(min-width: 801px)').matches);

  const isSignup = mode === 'signup';

  // Keep the mode in sync if the route changes while mounted (/login ↔ /signup).
  useEffect(() => {
    setMode(pathname === '/login' ? 'signin' : 'signup');
  }, [pathname]);

  const close = useCallback(() => navigate('/'), [navigate]);

  // Dismissing only means something with a session: '/' is behind RequireAuth,
  // so a signed-out visitor would be bounced straight back here — the X and
  // Escape looked broken. Both are wired up only when there's a room to return
  // to (someone already signed in who wandered onto /login); otherwise the card
  // is the whole page and admits it by not offering a way out. Same call as
  // NotFoundPage's `home`.
  const canClose = !!user;

  // The card reads as a dismissible modal, so Escape does what the X does.
  useEffect(() => {
    if (!canClose) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, canClose]);

  // Where to land after a successful sign-in: back to whatever the user was
  // trying to reach (RequireAuth stashes it), else home.
  const navigatedRef = useRef(false);
  const goAfterAuth = useCallback(() => {
    if (navigatedRef.current) return; // timer and animationend both race here
    navigatedRef.current = true;
    navigate(location.state?.from?.pathname ?? '/', { replace: true });
  }, [navigate, location.state]);

  // Navigation is driven by a timer, not by `animationend` alone: with
  // animations disabled (extension, user stylesheet) that event never fires and
  // the user would sit authenticated but stuck on /login. onCardAnimEnd is only
  // an early-completion path — whichever lands first wins.
  useEffect(() => {
    if (anim !== 'exit') return undefined;
    const t = setTimeout(goAfterAuth, EXIT_MS);
    return () => clearTimeout(t);
  }, [anim, goAfterAuth]);

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

  const onCardAnimEnd = (e) => {
    if (e.target !== e.currentTarget) return; // animation events bubble
    if (anim === 'out') {
      // Flip the URL, not local state — the pathname effect drives `mode`, so a
      // refresh mid-signup doesn't drop the user back into sign-in. `state` is
      // carried so a deep-link destination survives the toggle.
      navigate(isSignup ? '/login' : '/signup', { state: location.state });
      setAnim('in');
    } else if (anim === 'in') {
      setAnim('');
    } else if (anim === 'exit') {
      goAfterAuth(); // the fade-away finished ahead of the timer
    }
  };

  // Editing any field clears whatever message is on screen — a stale "check
  // your email" box otherwise sits there while the user retypes.
  const setField = (key) => (e) => {
    const { value } = e.target;
    setForm((f) => ({ ...f, [key]: value }));
    setErr(''); setInfo('');
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
          // Pin the confirmation link to the origin the user actually signed up
          // on. Without it Supabase falls back to the project's Site URL, which
          // has pointed at localhost in production. Mirrors oauth()'s redirectTo.
          options: { emailRedirectTo: window.location.origin, data: { full_name: form.name } },
        });
        if (error) throw error;
        // If email confirmation is ON, there's no session yet. Supabase also
        // returns this exact shape (obfuscated user, `identities: []`) for an
        // already-registered email — deliberately, so the response can't be
        // used to enumerate accounts. The copy therefore stays identical either
        // way; the "sign in instead" link rides along unconditionally.
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
      setErr(errorCopy(e2));
      setBusy(false);
    }
  };

  // Set while we're handing the tab over to an OAuth provider — see the release
  // effect below.
  const oauthHandoffRef = useRef(false);

  // `busy` survives the OAuth handoff on purpose (the redirect is meant to take
  // the page with it), but the handoff isn't always final: Back — or a provider
  // that bounces the user right back — restores this document from the bfcache
  // with the flag still true, and every control stays disabled forever.
  // `pageshow` fires both on a bfcache restore (event.persisted) and on a plain
  // load, so we don't branch on it: a back-nav that missed the cache re-runs the
  // module with busy already false, where releasing is a no-op. And since
  // pageshow only ever fires on load/restore, it can't cut an in-flight submit
  // loose. visibilitychange is the fallback for a page that's never unloaded at
  // all (an in-app browser sheet dismissed on iOS) — that one has to check we
  // were mid-handoff, or tab-switching during a password submit would unlock the
  // form while the request is still running.
  useEffect(() => {
    const release = () => { oauthHandoffRef.current = false; setBusy(false); };
    const onVisibility = () => { if (!document.hidden && oauthHandoffRef.current) release(); };
    window.addEventListener('pageshow', release);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pageshow', release);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const oauth = async (provider) => {
    setErr(''); setInfo('');
    if (!isSupabaseConfigured) { setErr('Auth not configured yet (missing Supabase keys).'); return; }
    // signInWithOAuth does a round-trip before it redirects; without a busy flag
    // a slow connection looks like a dead button and gets clicked again.
    setBusy(true);
    oauthHandoffRef.current = true;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    // Otherwise the redirect takes over — and if the user comes back instead,
    // the release effect above clears busy.
    if (error) { setErr(errorCopy(error)); setBusy(false); oauthHandoffRef.current = false; }
  };

  return (
    <div className="auth-screen">
      <div
        className={`auth-card ${anim ? `auth-card--${anim}` : ''}`}
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
                    name="name"
                    autoComplete="name"
                    placeholder="Your name"
                    value={form.name}
                    required
                    autoFocus
                    onChange={setField('name')}
                  />
                </label>
              )}

              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  required
                  autoFocus={!isSignup}
                  onChange={setField('email')}
                />
              </label>

              <label className="auth-field">
                <span>
                  Password
                  {isSignup && <span className="auth-hint">6+ characters</span>}
                </span>
                <div className="auth-pw">
                  <input
                    type={showPw ? 'text' : 'password'}
                    name="password"
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    placeholder="••••••••••••"
                    value={form.password}
                    required
                    /* Only a signup constraint — enforcing it on sign-in blocks
                       legacy passwords behind a useless browser tooltip. */
                    minLength={isSignup ? 6 : undefined}
                    onChange={setField('password')}
                  />
                  <button
                    type="button"
                    className="auth-pw-toggle"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    aria-pressed={showPw}
                  >
                    {showPw ? <EyeClosed size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              {err && <p className="auth-msg auth-msg--err" role="alert">{err}</p>}
              {info && (
                <p className="auth-msg auth-msg--ok" role="status">
                  {info}{' '}
                  <button type="button" className="auth-msg-link" onClick={switchMode}>
                    Already registered? Sign in
                  </button>
                </p>
              )}

              <button type="submit" className="auth-submit" disabled={busy}>
                {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <div className="auth-divider">or continue with</div>

            <div className="auth-social">
              <button type="button" className="auth-social-btn" onClick={() => oauth('google')} disabled={busy}><GoogleIcon /> Google</button>
              <button type="button" className="auth-social-btn" onClick={() => oauth('discord')} disabled={busy}><DiscordIcon /> Discord</button>
            </div>
          </div>

          <div className="auth-foot">
            <span>
              {isSignup ? 'Have an account? ' : "Don't have an account? "}
              <button type="button" className="auth-foot-link" onClick={switchMode}>
                {isSignup ? 'Sign in' : 'Sign up'}
              </button>
            </span>
          </div>
        </div>

        {/* Right — window into the focus room */}
        <div className="auth-right">
          {showRoomVideo && (
            <video className="auth-window-video" autoPlay loop muted playsInline preload="none">
              <source src="/videos/rainy-night.mp4" type="video/mp4" />
            </video>
          )}
          <div className="auth-window-glow" aria-hidden="true" />

          <div className="auth-window-clock">{clock}</div>

          <div className="auth-window-foot">
            <span className="auth-window-dot" aria-hidden="true" />
            <span>Rainy night · your room is ready</span>
          </div>
        </div>

        {/* Last in the DOM so the first Tab lands on a field, not "Close"; it's
            absolutely positioned against .auth-card, so order doesn't move it.
            Kept off .auth-right — that column is hidden ≤800px and would take
            the only way out of /login with it. Only shown when there's a session
            to close back to (see `canClose`), and not during the sign-in
            fade-away, where it would pop in as the card leaves. */}
        {canClose && anim !== 'exit' && (
          <button className="auth-close" onClick={close} disabled={busy} aria-label="Close"><X size={18} /></button>
        )}
      </div>
    </div>
  );
}

export default AuthPage;
