import React from 'react';

/*
 * Fullscreen muted YouTube embed used as the wallpaper when the user
 * plays their own link. Audio comes from the music player card — this
 * copy stays muted so the browser always allows autoplay.
 */
function YouTubeWallpaper({ videoId }) {
  return (
    <div className="bg-video-wrapper" aria-hidden="true" style={{ background: '#0a0f1a' }}>
      <iframe
        className="bg-yt-iframe"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&rel=0&playsinline=1`}
        title="Background wallpaper video"
        allow="autoplay; encrypted-media"
      />
      <div className="bg-overlay" />
    </div>
  );
}

export default YouTubeWallpaper;
