import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Video as Cam, VideoOff, ArrowLeft } from 'lucide-react';

const NAME_KEY = 'react-todo-app.displayName';

/*
 * Zoom-style pre-join: live camera preview + name entry + mic/cam toggles +
 * device pickers. Holds its own preview stream and STOPS it on join so the
 * live room's getUserMedia doesn't hit a "device in use" error.
 */
function PreJoin({ roomName, onJoin, onBack }) {
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || '');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [mics, setMics] = useState([]);
  const [videoDeviceId, setVideoDeviceId] = useState('');
  const [audioDeviceId, setAudioDeviceId] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Acquire (or re-acquire) the preview stream for the chosen devices.
  const acquire = useCallback(async (vId, aId) => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: vId ? { deviceId: { exact: vId } } : true,
        audio: aId ? { deviceId: { exact: aId } } : true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      // Apply current toggle states to the fresh tracks.
      stream.getAudioTracks().forEach((t) => (t.enabled = micOn));
      stream.getVideoTracks().forEach((t) => (t.enabled = camOn));
      setBlocked(false);
      return stream;
    } catch {
      setBlocked(true);
      return null;
    }
  }, [micOn, camOn]);

  // Initial permission + device enumeration (labels only appear post-permission).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stream = await acquire('', '');
      if (cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        const cams = devices.filter((d) => d.kind === 'videoinput');
        const audios = devices.filter((d) => d.kind === 'audioinput');
        setCameras(cams);
        setMics(audios);
        // Default to whatever the granted stream actually selected.
        const vTrack = stream?.getVideoTracks()[0];
        const aTrack = stream?.getAudioTracks()[0];
        if (vTrack) setVideoDeviceId(vTrack.getSettings().deviceId || cams[0]?.deviceId || '');
        if (aTrack) setAudioDeviceId(aTrack.getSettings().deviceId || audios[0]?.deviceId || '');
      } catch {
        /* enumerate not supported */
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeCamera = async (id) => {
    setVideoDeviceId(id);
    await acquire(id, audioDeviceId);
  };

  const changeMic = async (id) => {
    setAudioDeviceId(id);
    await acquire(videoDeviceId, id);
  };

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
    onJoin(trimmed, { micOn, camOn, videoDeviceId, audioDeviceId });
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

        {!blocked && (cameras.length > 1 || mics.length > 1) && (
          <div className="prejoin-devices">
            {cameras.length > 1 && (
              <label className="prejoin-device">
                <Cam size={14} />
                <select value={videoDeviceId} onChange={(e) => changeCamera(e.target.value)}>
                  {cameras.map((c, i) => (
                    <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${i + 1}`}</option>
                  ))}
                </select>
              </label>
            )}
            {mics.length > 1 && (
              <label className="prejoin-device">
                <Mic size={14} />
                <select value={audioDeviceId} onChange={(e) => changeMic(e.target.value)}>
                  {mics.map((m, i) => (
                    <option key={m.deviceId} value={m.deviceId}>{m.label || `Microphone ${i + 1}`}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
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
