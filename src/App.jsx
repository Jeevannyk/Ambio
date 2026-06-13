import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import Sidebar from './components/Sidebar';
import BackgroundVideo from './components/BackgroundVideo';
import YouTubeWallpaper from './components/YouTubeWallpaper';
import SceneSelector from './components/SceneSelector';
import YouTubePlayer from './components/YouTubePlayer';
import PomodoroWidget from './components/PomodoroWidget';
import { usePomodoro } from './hooks/usePomodoro';
import WelcomePage from './pages/WelcomePage';
import TasksPage from './pages/TasksPage';
import MyRoomPage from './pages/MyRoomPage';
import RoomsPage from './pages/RoomsPage';
import RoomCall from './pages/RoomCall';
import './App.css';

const THEME_KEY = 'react-todo-app.theme';

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

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light');
  const [sceneIndex, setSceneIndex] = useState(0);
  const [customVideoId, setCustomVideoId] = useState(null);
  const [themesOpen, setThemesOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const pomodoro = usePomodoro();

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.body.dataset.theme = theme;
  }, [theme]);

  const handleThemeToggle = (e) => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTheme(newTheme);
      return;
    }
    const x = e.clientX;
    const y = e.clientY;
    document.startViewTransition(() => setTheme(newTheme)).ready.then(() => {
      const maxRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`] },
        { duration: 500, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
      );
    });
  };

  return (
    <BrowserRouter>
      {customVideoId ? (
        <YouTubeWallpaper videoId={customVideoId} />
      ) : (
        <BackgroundVideo scene={SCENES[sceneIndex]} />
      )}

      <div className="app-shell">
        <Sidebar
          themesOpen={themesOpen}
          onToggleThemes={() => setThemesOpen((v) => !v)}
          musicOpen={playerOpen}
          onToggleMusic={() => setPlayerOpen((v) => !v)}
        />

        <main className="content-area">
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/my-room" element={<MyRoomPage pomodoro={pomodoro} />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/rooms/:id" element={<RoomCall pomodoro={pomodoro} />} />
          </Routes>
        </main>
      </div>

      <button
        className="theme-toggle theme-toggle--global"
        onClick={handleThemeToggle}
        aria-label="Toggle dark mode"
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      <SceneSelector
        scenes={SCENES}
        activeIndex={sceneIndex}
        open={themesOpen}
        onClose={() => setThemesOpen(false)}
        onSelect={(i) => {
          setSceneIndex(i);
          setCustomVideoId(null); // scene click returns to normal wallpapers
        }}
      />
      <YouTubePlayer
        onCustomVideo={setCustomVideoId}
        open={playerOpen}
        onToggleOpen={() => setPlayerOpen((v) => !v)}
      />
      <PomodoroWidget pomodoro={pomodoro} />
    </BrowserRouter>
  );
}

export default App;
