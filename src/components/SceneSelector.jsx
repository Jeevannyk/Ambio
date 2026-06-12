import React, { useState, useEffect } from 'react';
import { Search, Heart, ChevronLeft } from 'lucide-react';

const FAV_KEY = 'react-todo-app.favoriteThemes';

function loadFavs() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY)) || [];
  } catch {
    return [];
  }
}

/*
 * Props:
 *   scenes      : Array<{ id, label, icon, gradient, srcs }>
 *   activeIndex : number
 *   onSelect    : (index: number) => void
 *   open        : boolean — controlled by the sidebar's Themes button
 *   onClose     : () => void
 *
 * LifeAt-style light panel: tabs, search, thumbnail grid with hearts,
 * and a current-theme bar. Thumbnails show the first video frame
 * (preload="metadata") over the scene gradient as fallback.
 */
function SceneSelector({ scenes, activeIndex, onSelect, open, onClose }) {
  const [tab, setTab] = useState('videos');
  const [query, setQuery] = useState('');
  const [favs, setFavs] = useState(loadFavs);

  useEffect(() => {
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  }, [favs]);

  if (!open) return null;

  const toggleFav = (id) =>
    setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const q = query.trim().toLowerCase();
  const visible = scenes
    .map((scene, index) => ({ ...scene, index }))
    .filter((s) => (tab === 'favorites' ? favs.includes(s.id) : true))
    .filter((s) => !q || s.label.toLowerCase().includes(q));

  const active = scenes[activeIndex];

  return (
    <aside className="themes-panel" aria-label="Theme selector">
      <button className="themes-collapse-tab" onClick={onClose} aria-label="Close themes panel">
        <ChevronLeft size={14} />
      </button>

      <div className="themes-tabs">
        <button
          className={'themes-tab' + (tab === 'videos' ? ' themes-tab--active' : '')}
          onClick={() => setTab('videos')}
        >
          Videos
        </button>
        <button
          className={'themes-tab' + (tab === 'favorites' ? ' themes-tab--active' : '')}
          onClick={() => setTab('favorites')}
        >
          Favorites
        </button>
      </div>

      <div className="themes-search">
        <Search size={15} />
        <input
          placeholder="Search themes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <p className="themes-heading">Featured Themes</p>

      <div className="themes-scroll">
        {visible.length === 0 ? (
          <p className="themes-empty">
            {tab === 'favorites' ? 'No favorites yet — tap ♥ on a theme.' : 'No themes match.'}
          </p>
        ) : (
          <div className="themes-grid">
            {visible.map((scene) => (
              <div className="theme-card" key={scene.id}>
                <button
                  className={
                    'theme-card-thumb' + (scene.index === activeIndex ? ' theme-card-thumb--active' : '')
                  }
                  style={{ background: scene.gradient }}
                  onClick={() => onSelect(scene.index)}
                  aria-pressed={scene.index === activeIndex}
                  aria-label={`Switch to ${scene.label}`}
                >
                  <video src={scene.srcs[0]} muted playsInline preload="metadata" tabIndex={-1} />
                </button>
                <button
                  className={'theme-card-fav' + (favs.includes(scene.id) ? ' theme-card-fav--on' : '')}
                  onClick={() => toggleFav(scene.id)}
                  aria-label={favs.includes(scene.id) ? `Unfavorite ${scene.label}` : `Favorite ${scene.label}`}
                >
                  <Heart size={15} />
                </button>
                <p className="theme-card-name">{scene.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="themes-current">
        <p className="themes-current-name">{active.label}</p>
        <button
          className={'theme-card-fav theme-card-fav--inline' + (favs.includes(active.id) ? ' theme-card-fav--on' : '')}
          onClick={() => toggleFav(active.id)}
          aria-label={favs.includes(active.id) ? `Unfavorite ${active.label}` : `Favorite ${active.label}`}
        >
          <Heart size={16} />
        </button>
      </div>
    </aside>
  );
}

export default SceneSelector;
