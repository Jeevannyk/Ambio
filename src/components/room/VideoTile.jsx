import React, { useRef, useEffect } from 'react';
import { MicOff, Hand, MonitorUp } from 'lucide-react';

/*
 * One participant cell. Attaches the MediaStream to a <video>; shows an
 * avatar fallback when the camera is off. Local tile is muted + mirrored.
 */
function VideoTile({ stream, name, micOn, camOn, hand, speaking, isLocal, sharing, spotlight, thumb, onClick }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);

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
          {sharing && <MonitorUp size={12} />}
          {name}
          {isLocal && ' (You)'}
        </span>
        {!micOn && <MicOff size={14} className="vtile-muted" />}
      </div>
    </div>
  );
}

export default VideoTile;
