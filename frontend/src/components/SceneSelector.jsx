import React, { useState, useEffect } from 'react';
import { MagnifyingGlass, Heart, Sparkle, Check } from '@phosphor-icons/react';

const FAV_KEY = 'react-todo-app.favoriteThemes';

function loadFavs() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY)) || [];
  } catch {
    return [];
  }
}

function SceneSelector({ scenes, activeIndex, onSelect, open, onClose }) {
  const [tab, setTab] = useState('videos');
  const [query, setQuery] = useState('');
  const [favs, setFavs] = useState(loadFavs);

  useEffect(() => {
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  }, [favs]);

  const toggleFav = (id) =>
    setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const q = query.trim().toLowerCase();
  const visible = scenes
    .map((scene, index) => ({ ...scene, index }))
    .filter((s) => (tab === 'favorites' ? favs.includes(s.id) : true))
    .filter((s) => !q || s.label.toLowerCase().includes(q));

  const active = scenes[activeIndex];

  return (
    <aside className="themes-panel" aria-label="Theme selector" hidden={!open}>
      {/* Header Tabs */}
      <div className="themes-tabs-header">
        <div className="themes-tabs">
          <button
            className={'themes-tab' + (tab === 'videos' ? ' themes-tab--active' : '')}
            onClick={() => setTab('videos')}
          >
            All Themes
          </button>
          <button
            className={'themes-tab' + (tab === 'favorites' ? ' themes-tab--active' : '')}
            onClick={() => setTab('favorites')}
          >
            Favorites ({favs.length})
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="themes-search">
        <MagnifyingGlass size={14} className="search-icon" />
        <input
          placeholder="Filter ambiance..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="themes-section-meta">
        <span>{tab === 'favorites' ? 'Saved Atmospheres' : 'Available Atmospheres'}</span>
      </div>

      {/* Themes Video Grid */}
      <div className="themes-scroll">
        {visible.length === 0 ? (
          <div className="themes-empty">
            <Sparkle size={24} className="empty-sparkle" />
            <p>{tab === 'favorites' ? 'No favorite themes saved yet. Tap the heart icon on any card.' : 'No matching video themes found.'}</p>
          </div>
        ) : (
          <div className="themes-grid">
            {visible.map((scene) => {
              const isActive = scene.index === activeIndex;
              const isFav = favs.includes(scene.id);

              return (
                <div className={'theme-card' + (isActive ? ' theme-card--active' : '')} key={scene.id}>
                  <button
                    className="theme-card-thumb"
                    style={{ background: scene.gradient }}
                    onClick={() => onSelect(scene.index)}
                    aria-pressed={isActive}
                    aria-label={`Switch to ${scene.label}`}
                  >
                    {/* The panel now stays mounted, so don't fetch thumbnail
                        metadata until it has actually been opened. */}
                    <video src={scene.srcs[0]} muted playsInline preload={open ? 'metadata' : 'none'} tabIndex={-1} />

                    {/* Active Overlay Check Indicator */}
                    {isActive && (
                      <span className="theme-active-badge">
                        <Check size={12} /> Active
                      </span>
                    )}
                  </button>

                  <button
                    className={'theme-card-fav' + (isFav ? ' theme-card-fav--on' : '')}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFav(scene.id);
                    }}
                    aria-label={isFav ? `Unfavorite ${scene.label}` : `Favorite ${scene.label}`}
                  >
                    <Heart size={13} fill={isFav ? 'currentColor' : 'none'} />
                  </button>

                  <div className="theme-card-info">
                    <p className="theme-card-name">{scene.label}</p>
                    <span className="theme-card-count">{scene.srcs.length} clips</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Current Theme Footer Bar */}
      {active && (
        <div className="themes-current">
          <div className="themes-current-meta">
            <span className="themes-current-label">Current Scene</span>
            <p className="themes-current-name">{active.label}</p>
          </div>
          <button
            className={'theme-card-fav theme-card-fav--inline' + (favs.includes(active.id) ? ' theme-card-fav--on' : '')}
            onClick={() => toggleFav(active.id)}
            aria-label={favs.includes(active.id) ? `Unfavorite ${active.label}` : `Favorite ${active.label}`}
          >
            <Heart size={15} fill={favs.includes(active.id) ? 'currentColor' : 'none'} />
          </button>
        </div>
      )}
    </aside>
  );
}

export default SceneSelector;
