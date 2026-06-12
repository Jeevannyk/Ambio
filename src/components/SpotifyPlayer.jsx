import React, { useState, useEffect, useRef, useCallback } from 'react';
import './SpotifyPlayer.css';
import {
  hasClientId,
  isLoggedIn,
  login,
  logout,
  handleCallback,
  getPlaybackState,
  togglePlayback,
  skipNext,
  skipPrev,
  checkSaved,
  toggleSaved,
} from '../utils/spotify';

/*
 * Props: none
 * Real Spotify player — PKCE OAuth, no backend required.
 * Setup: REACT_APP_SPOTIFY_CLIENT_ID=<id> in .env, restart dev server.
 */

function formatMs(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function SpotifyPlayer() {
  const [connected, setConnected] = useState(isLoggedIn);
  const [playback, setPlayback] = useState(null);
  const [liked, setLiked] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const pollRef = useRef(null);
  const tickRef = useRef(null);
  const lastTrackId = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;
    handleCallback(code).then((ok) => {
      if (ok) {
        window.history.replaceState({}, '', window.location.pathname);
        setConnected(true);
      }
    });
  }, []);

  const fetchPlayback = useCallback(async () => {
    const state = await getPlaybackState();
    if (!state) return;
    setPlayback(state);
    setLocalProgress(state.progress_ms ?? 0);
    if (state.item?.id && state.item.id !== lastTrackId.current) {
      lastTrackId.current = state.item.id;
      checkSaved(state.item.id).then(setLiked);
    }
  }, []);

  useEffect(() => {
    if (!connected) return;
    fetchPlayback();
    pollRef.current = setInterval(fetchPlayback, 3000);
    return () => clearInterval(pollRef.current);
  }, [connected, fetchPlayback]);

  useEffect(() => {
    clearInterval(tickRef.current);
    if (playback?.is_playing) {
      tickRef.current = setInterval(
        () => setLocalProgress((p) => p + 1000),
        1000
      );
    }
    return () => clearInterval(tickRef.current);
  }, [playback?.is_playing, playback?.progress_ms]);

  const handlePlayPause = async () => {
    if (!playback) return;
    await togglePlayback(playback.is_playing);
    setPlayback((prev) => prev && { ...prev, is_playing: !prev.is_playing });
  };

  const handleNext = async () => {
    await skipNext();
    setTimeout(fetchPlayback, 600);
  };

  const handlePrev = async () => {
    await skipPrev();
    setTimeout(fetchPlayback, 600);
  };

  const handleLike = async () => {
    if (!playback?.item?.id) return;
    await toggleSaved(playback.item.id, liked);
    setLiked((l) => !l);
  };

  const handleLogout = () => {
    logout();
    setConnected(false);
    setPlayback(null);
  };

  /* ── Setup screen ─────────────────────────────────────────────────── */
  if (!hasClientId()) {
    return (
      <div className="sp-card sp-card--info">
        <p className="sp-info-title">Music Player</p>
        <p className="sp-info-body">
          Create a Spotify app at <strong>developer.spotify.com</strong>, add{' '}
          <code>http://localhost:5173</code> as a Redirect URI, paste your
          Client ID into <code>.env</code> as{' '}
          <code>VITE_SPOTIFY_CLIENT_ID</code>, then restart the dev server
          (<code>npm run dev</code>).
        </p>
      </div>
    );
  }

  /* ── Connect screen ───────────────────────────────────────────────── */
  if (!connected) {
    return (
      <div className="sp-card sp-card--connect">
        <div className="sp-connect-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#1db954">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
        </div>
        <p className="sp-connect-title">Spotify</p>
        <p className="sp-connect-sub">Connect to see what&apos;s playing</p>
        <button className="sp-connect-btn" onClick={login}>
          Connect
        </button>
      </div>
    );
  }

  /* ── Player ───────────────────────────────────────────────────────── */
  const track = playback?.item;
  const albumArt = track?.album?.images?.[0]?.url;
  const duration = track?.duration_ms || 1;
  const progress = Math.min(localProgress, duration);
  const elapsedPct = (progress / duration) * 100;
  const isPlaying = playback?.is_playing ?? false;

  return (
    <div className="sp-card">
      {albumArt && (
        <div
          key={albumArt}
          className="sp-bg-art"
          style={{ '--album-bg': `url(${albumArt})` }}
        />
      )}

      {/* Disconnect */}
      <button className="sp-logout" onClick={handleLogout} aria-label="Disconnect">
        ×
      </button>

      {/* Track row */}
      <div className="sp-track-row">
        <div className="sp-art-wrap">
          {albumArt ? (
            <img className="sp-art-img" src={albumArt} alt="Album art" />
          ) : (
            <div className={`sp-eq${isPlaying ? '' : ' sp-eq--paused'}`}>
              <span className="sp-bar sp-bar-1"></span>
              <span className="sp-bar sp-bar-2"></span>
              <span className="sp-bar sp-bar-3"></span>
              <span className="sp-bar sp-bar-4"></span>
            </div>
          )}
        </div>

        <div className="sp-info">
          <p className="sp-title">{track ? track.name : 'Nothing playing'}</p>
          <p className="sp-artist">
            {track
              ? track.artists.map((a) => a.name).join(', ')
              : 'Open Spotify on any device'}
          </p>
        </div>

        <svg
          className={`sp-heart${liked ? ' sp-heart--liked' : ''}`}
          onClick={handleLike}
          aria-label={liked ? 'Unlike' : 'Like'}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={liked ? '#1db954' : 'none'}
          stroke={liked ? '#1db954' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>

      {/* Progress */}
      <div className="sp-progress-row">
        <span className="sp-time">{formatMs(progress)}</span>
        <div className="sp-bar-track" style={{ '--pct': `${elapsedPct}%` }}>
          <div className="sp-bar-fill"></div>
          <div className="sp-scrubber"></div>
        </div>
        <span className="sp-time">{formatMs(duration)}</span>
      </div>

      {/* Controls */}
      <div className="sp-controls">
        {/* Prev */}
        <svg
          onClick={handlePrev}
          aria-label="Previous"
          width="20"
          height="20"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
        </svg>

        {/* Play / Pause */}
        <button
          className="sp-play-btn"
          onClick={handlePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Next */}
        <svg
          onClick={handleNext}
          aria-label="Next"
          width="20"
          height="20"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
        </svg>

        {/* Volume */}
        <div className="sp-vol-wrap">
          <svg
            className="sp-vol-btn"
            width="18"
            height="18"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
          <div className="sp-vol-slider">
            <div className="sp-vol-fill"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpotifyPlayer;
