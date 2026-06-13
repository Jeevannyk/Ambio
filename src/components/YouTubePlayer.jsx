import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, Volume1, VolumeX, Play, Pause, ArrowLeft, ArrowRight, Heart } from 'lucide-react';
import './YouTubePlayer.css';

/*
 * Curated YouTube playlists / live streams for each vibe.
 * All IDs verified embeddable (some channels disable embedding — test before
 * swapping: load https://www.youtube.com/embed/<id> from a localhost page).
 */
const PLAYLISTS = [
  { id: 'lofi', label: 'Lo-fi Beats', icon: '🎧', videoId: '5yx6BWlEVcY' },
  { id: 'jazz', label: 'Jazz & Coffee', icon: '☕', videoId: 'Dx5qFachd3A' },
  { id: 'classical', label: 'Classical Focus', icon: '🎻', videoId: 'jgpJVI3tDbY' },
  { id: 'ambient', label: 'Ambient Chill', icon: '🌌', videoId: 'S_MOd40zlYU' },
  { id: 'nature', label: 'Nature Sounds', icon: '🌿', videoId: '1ZYbU82GVz4' },
];

const LIKED_KEY = 'react-todo-app.likedTracks';

// Accepts watch/share/shorts/embed/live URLs or a bare 11-char video ID.
export function parseYouTubeId(input) {
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (!/(^|\.)((youtube\.com)|(youtu\.be))$/.test(url.hostname)) return null;
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    const v = url.searchParams.get('v');
    if (v && /^[\w-]{11}$/.test(v)) return v;
    const match = url.pathname.match(/\/(embed|shorts|live)\/([\w-]{11})/);
    if (match) return match[2];
  } catch {
    /* not a URL */
  }
  return null;
}

function loadLiked() {
  try {
    return JSON.parse(localStorage.getItem(LIKED_KEY)) || [];
  } catch {
    return [];
  }
}

function formatTime(secs) {
  const s = Math.max(0, Math.floor(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function YouTubePlayer({ onCustomVideo, open, onToggleOpen }) {
  // Latches true on first open; the hidden iframe stays mounted after that
  // so music keeps playing while the card is closed.
  const [hasOpened, setHasOpened] = useState(false);
  const [activeId, setActiveId] = useState(PLAYLISTS[0].id);
  const [customVideoId, setCustomVideoId] = useState(null);
  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState('');
  const [liked, setLiked] = useState(loadLiked);
  const [volume, setVolume] = useState(100); // 0–100, matches YouTube's default
  const [showVolume, setShowVolume] = useState(false);
  // Live playback info streamed from the YouTube iframe API (postMessage).
  const [info, setInfo] = useState({ title: '', author: '', currentTime: 0, duration: 0, playerState: -1, muted: false });
  const iframeRef = useRef(null);

  useEffect(() => {
    if (open) setHasOpened(true);
  }, [open]);

  useEffect(() => {
    localStorage.setItem(LIKED_KEY, JSON.stringify(liked));
  }, [liked]);

  useEffect(() => {
    const onMessage = (e) => {
      if (typeof e.data !== 'string' || !e.origin.includes('youtube.com')) return;
      let data;
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
      if (data.event === 'infoDelivery' && data.info) {
        setInfo((prev) => ({
          currentTime: data.info.currentTime ?? prev.currentTime,
          duration: data.info.duration ?? prev.duration,
          playerState: data.info.playerState ?? prev.playerState,
          muted: data.info.muted ?? prev.muted,
          title: data.info.videoData?.title || prev.title,
          author: data.info.videoData?.author || prev.author,
        }));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const startListening = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'listening', id: 'ambio-player', channel: 'widget' }),
      '*'
    );
  }, []);

  const command = useCallback((func, args = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args, id: 'ambio-player', channel: 'widget' }),
      '*'
    );
  }, []);

  const list = customVideoId
    ? [...PLAYLISTS, { id: 'custom', label: 'Your Mix', icon: '🔗', videoId: customVideoId }]
    : PLAYLISTS;
  const active = list.find((p) => p.id === activeId) || PLAYLISTS[0];

  const switchTo = (id) => {
    setActiveId(id);
    setInfo((prev) => ({ ...prev, title: '', author: '', currentTime: 0, duration: 0 }));
    onCustomVideo?.(id === 'custom' ? customVideoId : null);
  };

  const step = (dir) => {
    const idx = list.findIndex((p) => p.id === active.id);
    switchTo(list[(idx + dir + list.length) % list.length].id);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const id = parseYouTubeId(linkInput);
    if (!id) {
      setLinkError('Paste a valid YouTube link or video ID.');
      return;
    }
    setLinkError('');
    setCustomVideoId(id);
    setActiveId('custom');
    setLinkInput('');
    setInfo((prev) => ({ ...prev, title: '', author: '', currentTime: 0, duration: 0 }));
    onCustomVideo?.(id); // wallpaper follows the custom video
  };

  const isPlaying = info.playerState === 1;
  const isLive = !info.duration || info.duration <= 0 || info.duration > 86400;
  const pct = isLive ? 100 : Math.min(100, (info.currentTime / info.duration) * 100);
  const isLiked = liked.includes(active.videoId);

  const toggleLiked = () =>
    setLiked((l) => (l.includes(active.videoId) ? l.filter((x) => x !== active.videoId) : [...l, active.videoId]));

  const handleSeek = (e) => {
    if (isLive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    command('seekTo', [((e.clientX - rect.left) / rect.width) * info.duration, true]);
  };

  const changeVolume = (val) => {
    setVolume(val);
    command('setVolume', [val]);
    // Dragging the slider up should take the player out of a muted state.
    if (val > 0 && info.muted) command('unMute');
    if (val === 0 && !info.muted) command('mute');
  };

  const silent = info.muted || volume === 0;
  const VolIcon = silent ? VolumeX : volume < 50 ? Volume1 : Volume2;

  // playlist=<id> makes loop=1 work for VODs; enablejsapi powers the custom UI
  const embedUrl = `https://www.youtube.com/embed/${active.videoId}?autoplay=1&rel=0&loop=1&playlist=${active.videoId}&enablejsapi=1`;

  return (
    <>
      {/* Hidden audio engine — mounted once, survives the card closing */}
      <div className="yt-iframe-host" aria-hidden="true">
        {hasOpened && (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            onLoad={startListening}
            title="Music player engine"
            allow="autoplay; encrypted-media"
          />
        )}
      </div>

      {open && (
        <div className="yt-card">
          {/* ── Player face ─────────────────────────────────────────── */}
          <div className="sp2-face">
            <div className="sp2-top">
              <div className="sp2-art">
                <span className={`sp2-eq${isPlaying ? '' : ' sp2-eq--paused'}`}>
                  <i /><i /><i />
                </span>
              </div>
              <div className="sp2-meta">
                <p className="sp2-title">{info.title || active.label}</p>
                <p className="sp2-artist">{info.author || 'YouTube'}</p>
              </div>
            </div>

            <div className="sp2-controls">
              <div className="sp2-vol-wrap">
                <button
                  className={'sp2-icon-btn' + (showVolume ? ' sp2-icon-btn--active' : '')}
                  onClick={() => setShowVolume((v) => !v)}
                  aria-label="Volume"
                  aria-expanded={showVolume}
                >
                  <VolIcon size={20} />
                </button>
                {showVolume && (
                  <div className="sp2-volume-pop">
                    <button
                      className="sp2-volume-mute"
                      onClick={() => command(info.muted ? 'unMute' : 'mute')}
                      aria-label={silent ? 'Unmute' : 'Mute'}
                    >
                      <VolIcon size={16} />
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={silent ? 0 : volume}
                      onChange={(e) => changeVolume(Number(e.target.value))}
                      className="sp2-volume-slider"
                      style={{ '--vol': `${silent ? 0 : volume}%` }}
                      aria-label="Volume level"
                    />
                    <span className="sp2-volume-pct">{silent ? 0 : volume}</span>
                  </div>
                )}
              </div>

              <div className="sp2-center">
                <button className="sp2-round-btn" onClick={() => step(-1)} aria-label="Previous">
                  <ArrowLeft size={15} />
                </button>
                <button
                  className="sp2-round-btn"
                  onClick={() => command(isPlaying ? 'pauseVideo' : 'playVideo')}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <button className="sp2-round-btn" onClick={() => step(1)} aria-label="Next">
                  <ArrowRight size={15} />
                </button>
              </div>

              <button
                className={'sp2-icon-btn sp2-heart' + (isLiked ? ' sp2-heart--on' : '')}
                onClick={toggleLiked}
                aria-label={isLiked ? 'Unlike' : 'Like'}
              >
                <Heart size={20} />
              </button>
            </div>

            <div className="sp2-bar" onClick={handleSeek}>
              <div className="sp2-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="sp2-times">
              <span>{formatTime(info.currentTime)}</span>
              <span>{isLive ? 'LIVE' : formatTime(info.duration)}</span>
            </div>
          </div>

          {/* ── Playlist selector ───────────────────────────────────── */}
          <div className="yt-playlists">
            <p className="yt-pl-title">Playlists</p>
            {list.map((pl) => (
              <button
                key={pl.id}
                className={`yt-pl-btn${pl.id === active.id ? ' yt-pl-btn--active' : ''}`}
                onClick={() => switchTo(pl.id)}
              >
                <span className="yt-pl-icon">{pl.icon}</span>
                <span className="yt-pl-name">{pl.label}</span>
                {pl.id === active.id && (
                  <span className="yt-pl-playing">
                    <span className="yt-pl-playing-bar" />
                    <span className="yt-pl-playing-bar" />
                    <span className="yt-pl-playing-bar" />
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Custom link ─────────────────────────────────────────── */}
          <form className="yt-custom" onSubmit={handleCustomSubmit}>
            <p className="yt-pl-title">Play Your Own</p>
            {linkError && <p className="yt-custom-error">{linkError}</p>}
            <div className="yt-custom-row">
              <input
                className="yt-custom-input"
                placeholder="Paste a YouTube link…"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
              />
              <button type="submit" className="yt-custom-btn">Play</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export default YouTubePlayer;
