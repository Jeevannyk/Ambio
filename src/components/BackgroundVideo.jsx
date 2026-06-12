import React, { useRef, useEffect, useState } from 'react';

/*
 * Props:
 *   scene : { id, gradient, srcs: string[] } — srcs cycles within the scene
 *
 * Videos loop within the selected scene indefinitely.
 * The gradient is always the instant background; the video fades in once
 * it can play. If a video errors or never loads, the gradient stays visible.
 */
function BackgroundVideo({ scene }) {
  const videoRef = useRef(null);
  const [videoIdx, setVideoIdx] = useState(0);
  const [videoOk, setVideoOk] = useState(false);

  const srcs = scene.srcs ?? (scene.src ? [scene.src] : []);
  const currentSrc = srcs[videoIdx] ?? '';

  // Reset to first clip whenever the scene changes.
  useEffect(() => {
    setVideoIdx(0);
  }, [scene.id]);

  // Load + play whenever the active clip URL changes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentSrc) return;
    setVideoOk(false);
    video.load();
    video.play().catch(() => {});
  }, [currentSrc]);

  // When the last video ends, loop back to the first — stay on the same scene.
  const handleEnded = () => {
    if (srcs.length > 1) {
      setVideoIdx((i) => (i + 1) % srcs.length);
    } else {
      // Single-clip scene: replay directly (state wouldn't change).
      const video = videoRef.current;
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    }
  };

  return (
    <div
      className="bg-video-wrapper"
      aria-hidden="true"
      style={{ background: scene.gradient }}
    >
      <video
        ref={videoRef}
        className="bg-video"
        style={{ opacity: videoOk ? 1 : 0 }}
        muted
        playsInline
        autoPlay
        preload="auto"
        onCanPlay={() => setVideoOk(true)}
        onError={() => setVideoOk(false)}
        onEnded={handleEnded}
      >
        {currentSrc && <source src={currentSrc} type="video/mp4" />}
      </video>
      <div className="bg-overlay" />
    </div>
  );
}

export default BackgroundVideo;
