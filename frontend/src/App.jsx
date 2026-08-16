import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Cursor } from '@phosphor-icons/react';
import Sidebar from './components/Sidebar';
import CustomCursor from './components/CustomCursor';
import BackgroundVideo from './components/BackgroundVideo';
import YouTubeWallpaper from './components/YouTubeWallpaper';
import SceneSelector from './components/SceneSelector';
import YouTubePlayer from './components/YouTubePlayer';
import PomodoroWidget from './components/PomodoroWidget';
import { usePomodoro } from './hooks/usePomodoro';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { isAuthRoute } from './lib/auth';
import './styles/cursor.css';
import './styles/tokens.css';
import './styles/shell.css';
import './styles/todo-card.css';
import './styles/themes-panel.css';
import './styles/background.css';
import './styles/overlays.css';
import './styles/myroom.css';
import './styles/pomodoro.css';
import './styles/responsive.css';

// Route pages are code-split: the heavy room/video stack (LiveKit) and the
// large Tasks page only download when the user actually visits those routes,
// keeping the initial bundle small.
const WelcomePage = lazy(() => import('./pages/WelcomePage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const MyRoomPage = lazy(() => import('./pages/MyRoomPage'));
const RoomsPage = lazy(() => import('./pages/RoomsPage'));
const RoomCall = lazy(() => import('./pages/RoomCall'));

const SCENES = [
  {
    id: 'forest',
    label: 'Forest',
    icon: 'F',
    gradient: 'linear-gradient(135deg, #1a4f1a 0%, #2d7a2d 100%)',
    srcs: ['/videos/forest-1.mp4', '/videos/forest-2.mp4', '/videos/forest-3.mp4', '/videos/forest-4.mp4'],
  },
  {
    id: 'ocean',
    label: 'Ocean',
    icon: 'O',
    gradient: 'linear-gradient(135deg, #0077b6 0%, #00b4d8 100%)',
    srcs: ['/videos/ocean-1.mp4', '/videos/ocean-2.mp4', '/videos/ocean-3.mp4', '/videos/ocean-4.mp4'],
  },
  {
    id: 'city-night',
    label: 'City Night',
    icon: 'C',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    srcs: ['/videos/city-night-1.mp4', '/videos/city-night-2.mp4', '/videos/city-night-3.mp4', '/videos/city-night-4.mp4'],
  },
  {
    id: 'rain',
    label: 'Rainy Night',
    icon: 'R',
    gradient: 'linear-gradient(135deg, #2c3e50 0%, #3a6073 100%)',
    srcs: ['/videos/rainy-night.mp4'],
  },
];

// Branded route/auth loader — centered gold pulsing dot. Inline styles (plus an
// injected keyframe) so it works without any CSS-file dependency.
function RouteLoader() {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
    >
      <style>{`
        @keyframes ambio-route-pulse {
          0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(245, 197, 24, 0.45); }
          50% { transform: scale(1.35); opacity: 0.75; box-shadow: 0 0 0 12px rgba(245, 197, 24, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ambio-route-loader-dot { animation: none; }
        }
      `}</style>
      <span
        className="ambio-route-loader-dot"
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: 'var(--brand, #f5c518)',
          animation: 'ambio-route-pulse 1.2s ease-in-out infinite',
        }}
      />
    </div>
  );
}

// Block protected pages until the user has signed in; bounce to /login.
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <RouteLoader />; // wait for the session check before deciding
  // Carry the intended destination so AuthPage can return there after sign-in
  // (e.g. an invitee opening a shared room link).
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

// Custom-cursor opt-out toggle — top-right; hidden on live rooms, auth
// pages, and /tasks.
function GlobalCursorToggle({ enabled, onToggle }) {
  const { pathname } = useLocation();
  if (/^\/rooms\/.+/.test(pathname) || isAuthRoute(pathname) || pathname === '/tasks') return null;
  return (
    <button
      className="theme-toggle theme-toggle--global theme-toggle--cursor"
      onClick={onToggle}
      aria-label="Toggle custom cursor"
    >
      {enabled ? <Cursor size={18} weight="fill" /> : <Cursor size={18} />}
    </button>
  );
}

// The scene wallpaper is a full-viewport layer behind every route. Auth pages
// are an opaque full-screen takeover, so skip rendering (and decoding) it there.
function AppBackground({ customVideoId, scene }) {
  const { pathname } = useLocation();
  if (isAuthRoute(pathname)) return null;
  return customVideoId ? <YouTubeWallpaper videoId={customVideoId} /> : <BackgroundVideo scene={scene} />;
}

// The route shell. Auth pages drop the entry animation — see .content-area--plain.
function ContentArea({ children }) {
  const { pathname } = useLocation();
  return (
    <main className={'content-area' + (isAuthRoute(pathname) ? ' content-area--plain' : '')}>
      {children}
    </main>
  );
}

// Themes + music panels. Both stay mounted on auth routes — YouTubePlayer's
// hidden iframe must survive so playback continues — they just render closed,
// and reopen in their prior state afterwards.
function FloatingPanels({ scenes, activeIndex, themesOpen, onCloseThemes, onSelectScene, playerOpen, onTogglePlayer, onCustomVideo }) {
  const { pathname } = useLocation();
  const isAuth = isAuthRoute(pathname);
  return (
    <>
      <SceneSelector
        scenes={scenes}
        activeIndex={activeIndex}
        open={themesOpen && !isAuth}
        onClose={onCloseThemes}
        onSelect={onSelectScene}
      />
      <YouTubePlayer
        onCustomVideo={onCustomVideo}
        open={playerOpen && !isAuth}
        onToggleOpen={onTogglePlayer}
      />
    </>
  );
}

function App() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [customVideoId, setCustomVideoId] = useState(null);
  const [themesOpen, setThemesOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [cursorEnabled, setCursorEnabled] = useState(() => localStorage.getItem('ambio.cursor') !== 'off');
  const [cursorMotionOk] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pomodoro = usePomodoro();

  // The app is dark-only; the attribute stays so body[data-theme='dark']
  // selectors keep matching (tokens default to the dark palette anyway).
  useEffect(() => {
    document.body.dataset.theme = 'dark';
  }, []);

  useEffect(() => {
    localStorage.setItem('ambio.cursor', cursorEnabled ? 'on' : 'off');
    document.body.dataset.cursor = cursorEnabled ? 'custom' : 'native';
  }, [cursorEnabled]);

  return (
    <AuthProvider>
    <BrowserRouter>
      <AppBackground customVideoId={customVideoId} scene={SCENES[sceneIndex]} />

      <div className="app-shell">
        <Sidebar
          themesOpen={themesOpen}
          onToggleThemes={() => setThemesOpen((v) => !v)}
          musicOpen={playerOpen}
          onToggleMusic={() => setPlayerOpen((v) => !v)}
        />

        <ContentArea>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/login" element={<AuthPage />} />
              <Route path="/signup" element={<AuthPage />} />
              <Route path="/" element={<RequireAuth><WelcomePage /></RequireAuth>} />
              <Route path="/tasks" element={<RequireAuth><TasksPage /></RequireAuth>} />
              <Route path="/my-room" element={<RequireAuth><MyRoomPage pomodoro={pomodoro} /></RequireAuth>} />
              <Route path="/rooms" element={<RequireAuth><RoomsPage /></RequireAuth>} />
              <Route path="/rooms/:id" element={<RequireAuth><RoomCall pomodoro={pomodoro} /></RequireAuth>} />
            </Routes>
          </Suspense>
        </ContentArea>
      </div>

      <GlobalCursorToggle enabled={cursorEnabled} onToggle={() => setCursorEnabled((v) => !v)} />

      <FloatingPanels
        scenes={SCENES}
        activeIndex={sceneIndex}
        themesOpen={themesOpen}
        onCloseThemes={() => setThemesOpen(false)}
        onSelectScene={(i) => {
          setSceneIndex(i);
          setCustomVideoId(null); // scene click returns to normal wallpapers
        }}
        playerOpen={playerOpen}
        onTogglePlayer={() => setPlayerOpen((v) => !v)}
        onCustomVideo={setCustomVideoId}
      />
      <PomodoroWidget pomodoro={pomodoro} />
      {cursorEnabled && cursorMotionOk && <CustomCursor />}
    </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
