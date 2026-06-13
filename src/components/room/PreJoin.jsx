import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video as Cam, VideoOff, ArrowLeft } from 'lucide-react';

const NAME_KEY = 'react-todo-app.displayName';

/*
 * Zoom-style pre-join: live camera preview + name entry + mic/cam toggles.
 * Holds its own preview stream and STOPS it on join so the live room's
 * getUserMedia doesn't hit a "device in use" error.
 */
function PreJoin({ roomName, onJoin, onBack }) {
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || '');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        if (!cancelled) setBlocked(true);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleMic = () => {
    const next = !micOn;
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  };

  const toggleCam = () => {
    const next = !camOn;
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);
  };

  const join = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem(NAME_KEY, trimmed);
    // Release the preview camera/mic before the live room acquires them.
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    onJoin(trimmed, { micOn, camOn });
  };

  const initial = (name || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="prejoin">
      <div className="prejoin-card">
        <button className="prejoin-back" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Rooms
        </button>

        <h2 className="prejoin-title">Join “{roomName}”</h2>
        <p className="prejoin-sub">Set up your camera and name before you enter.</p>

        <div className="prejoin-preview">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="prejoin-video"
            style={{ display: camOn && !blocked ? 'block' : 'none' }}
          />
          {(!camOn || blocked) && (
            <div className="prejoin-avatar"><span>{initial}</span></div>
          )}

          {!blocked && (
            <div className="prejoin-preview-controls">
              <button
                className={'prejoin-toggle' + (micOn ? '' : ' prejoin-toggle--off')}
                onClick={toggleMic}
                aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
              >
                {micOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button
                className={'prejoin-toggle' + (camOn ? '' : ' prejoin-toggle--off')}
                onClick={toggleCam}
                aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}
              >
                {camOn ? <Cam size={18} /> : <VideoOff size={18} />}
              </button>
            </div>
          )}
        </div>

        {blocked && (
          <p className="prejoin-blocked">
            Camera / mic is blocked. You can still join, but allow access in your
            browser to be seen and heard.
          </p>
        )}

        <input
          className="prejoin-input"
          placeholder="Your name"
          value={name}
          maxLength={32}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          autoFocus
        />

        <button className="prejoin-join" onClick={join} disabled={!name.trim()}>
          Join Room
        </button>
      </div>
    </div>
  );
}

export default PreJoin;
