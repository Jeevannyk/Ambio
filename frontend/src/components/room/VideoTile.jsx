import React, { useRef, useEffect } from 'react';
import { MicrophoneSlash, Hand, Screencast } from '@phosphor-icons/react';

/*
 * One participant cell. Shows an avatar fallback when the camera is off. Local
 * tile is muted + mirrored.
 *
 * Media goes on through LiveKit's own attach()/detach(), never by assigning
 * .srcObject: attach() is what registers this <video> with the track, and with
 * adaptiveStream on, a track with no registered element is treated as invisible
 * and gets paused at the SFU. attach() merges into whatever the element already
 * holds, so the same <video> carries the video and the audio track.
 *
 * Track object identity is stable per publication, so these effects only re-run
 * on a real track change (camera <-> screen share, resubscribe), not per render.
 */
function VideoTile({ videoTrack, audioTrack, name, micOn, camOn, hand, speaking, isLocal, sharing, spotlight, thumb, onClick }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !videoTrack) return;
    videoTrack.attach(el);
    return () => videoTrack.detach(el);
  }, [videoTrack]);

  // The local tile never attaches its own mic (audioTrack is only passed for
  // remotes) — attach() unmutes the element for any stream carrying audio,
  // which on your own tile is a feedback loop.
  useEffect(() => {
    const el = ref.current;
    if (!el || !audioTrack) return;
    audioTrack.attach(el);
    return () => audioTrack.detach(el);
  }, [audioTrack]);

  const initial = (name || '?').trim().charAt(0).toUpperCase();

  return (
    <div
      className={
        'vtile' +
        (speaking ? ' vtile--speaking' : '') +
        (spotlight ? ' vtile--spotlight' : '') +
        (thumb ? ' vtile--thumb' : '')
      }
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={isLocal}
        className={'vtile-video' + (isLocal && !sharing ? ' vtile-video--mirror' : '')}
        style={{ display: camOn || sharing ? 'block' : 'none' }}
      />
      {!camOn && !sharing && (
        <div className="vtile-avatar">
          <span>{initial}</span>
        </div>
      )}

      {hand && (
        <div className="vtile-hand">
          <Hand size={16} />
        </div>
      )}

      <div className="vtile-bar">
        <span className="vtile-name">
          {sharing && <Screencast size={12} />}
          {name}
          {isLocal && ' (You)'}
        </span>
        {!micOn && <MicrophoneSlash size={14} className="vtile-muted" />}
      </div>
    </div>
  );
}

export default VideoTile;
