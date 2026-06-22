import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

/*
 * Real-time room over LiveKit (managed SFU — reliable signaling + TURN baked
 * in, unlike the old PeerJS public-broker mesh). The browser fetches a short-
 * lived join token from our own /api/token endpoint (the LiveKit secret never
 * ships to the client), then connects to the LiveKit server.
 *
 * Media (camera / mic / screen share) flows through LiveKit's tracks. Everything
 * else rides LiveKit data messages (JSON, {t: type, ...}) — same schema as before:
 *   hand     : {raised}                       raise/lower hand
 *   chat     : {id, name, text, ts}           chat message
 *   reaction : {emoji}                        floating emoji
 *   pomodoro : {mode, secondsLeft, running}   host broadcasts timer
 *   mute     : {}                             admin force-mutes you
 *   kick     : {}                             admin removes you
 *
 * The public API (return value) is identical to the old PeerJS hook, so the
 * room UI, VideoTile, and PreJoin all work unchanged.
 */

const TOKEN_ENDPOINT = import.meta.env.VITE_TOKEN_ENDPOINT || '/api/token';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function useRoomCall(roomId, displayName, max = Infinity, initial = {}) {
  const initMic = initial.micOn ?? true;
  const initCam = initial.camOn ?? true;
  const [status, setStatus] = useState('connecting'); // connecting | live | error | ended | full
  const [isHost, setIsHost] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [micOn, setMicOn] = useState(initMic);
  const [camOn, setCamOn] = useState(initCam);
  const [sharing, setSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [speakingIds, setSpeakingIds] = useState([]); // includes 'me'
  const [participants, setParticipants] = useState([]); // {id, name, stream, micOn, camOn, hand}
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState([]); // {key, emoji}
  const [remotePomodoro, setRemotePomodoro] = useState(null);

  const roomRef = useRef(null);
  const myIdRef = useRef('');
  const isHostRef = useRef(false);
  const handRaisedRef = useRef(false);
  const maxRef = useRef(max);
  const handsRef = useRef(new Map()); // identity -> hand raised
  const streamCache = useRef(new Map()); // identity -> reused MediaStream
  const localMsRef = useRef(new MediaStream());

  /* ---- data message send helpers ---- */
  const publish = useCallback((msg, identities) => {
    const room = roomRef.current;
    if (!room) return;
    room.localParticipant.publishData(encoder.encode(JSON.stringify(msg)), {
      reliable: true,
      destinationIdentities: identities,
    });
  }, []);

  /* ---- bootstrap ---- */
  useEffect(() => {
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    maxRef.current = max;

    // Build (and cache, to avoid <video> flicker) a MediaStream for a remote
    // participant: prefer their screen share over camera, plus their mic.
    const streamFor = (p) => {
      let ms = streamCache.current.get(p.identity);
      if (!ms) {
        ms = new MediaStream();
        streamCache.current.set(p.identity, ms);
      }
      const pubs = [...p.trackPublications.values()];
      const screen = pubs.find((x) => x.source === Track.Source.ScreenShare && x.track?.mediaStreamTrack);
      const cam = pubs.find((x) => x.source === Track.Source.Camera && x.track?.mediaStreamTrack);
      const mic = pubs.find((x) => x.source === Track.Source.Microphone && x.track?.mediaStreamTrack);
      const want = [];
      const v = (screen || cam)?.track?.mediaStreamTrack;
      const a = mic?.track?.mediaStreamTrack;
      if (v) want.push(v);
      if (a) want.push(a);
      ms.getTracks().forEach((t) => { if (!want.includes(t)) ms.removeTrack(t); });
      want.forEach((t) => { if (!ms.getTracks().includes(t)) ms.addTrack(t); });
      return ms;
    };

    const syncParticipants = () => {
      const list = [...room.remoteParticipants.values()].map((p) => ({
        id: p.identity,
        name: p.name || 'Connecting…',
        stream: streamFor(p),
        micOn: p.isMicrophoneEnabled,
        camOn: p.isCameraEnabled,
        hand: handsRef.current.get(p.identity) || false,
      }));
      setParticipants(list);
    };

    const rebuildLocal = () => {
      const lp = room.localParticipant;
      const pubs = [...lp.trackPublications.values()];
      const screen = pubs.find((x) => x.source === Track.Source.ScreenShare && x.track?.mediaStreamTrack);
      const cam = pubs.find((x) => x.source === Track.Source.Camera && x.track?.mediaStreamTrack);
      const v = (screen || cam)?.track?.mediaStreamTrack;
      const ms = localMsRef.current;
      const want = v ? [v] : [];
      ms.getTracks().forEach((t) => { if (!want.includes(t)) ms.removeTrack(t); });
      want.forEach((t) => { if (!ms.getTracks().includes(t)) ms.addTrack(t); });
      setLocalStream(ms);
    };

    // Earliest joiner is the host; recompute on every roster change so host
    // migrates cleanly if the current host leaves.
    const recomputeHost = () => {
      const all = [room.localParticipant, ...room.remoteParticipants.values()];
      const timed = all.filter((p) => p.joinedAt);
      const pool = timed.length ? timed : all;
      const host = pool.reduce((a, b) => {
        const ta = a.joinedAt?.getTime?.() ?? Infinity;
        const tb = b.joinedAt?.getTime?.() ?? Infinity;
        if (ta !== tb) return ta < tb ? a : b;
        return a.identity < b.identity ? a : b; // stable tiebreak
      });
      const mine = host === room.localParticipant;
      isHostRef.current = mine;
      setIsHost(mine);
    };

    const handleData = (fromId, msg) => {
      switch (msg.t) {
        case 'hand':
          handsRef.current.set(fromId, msg.raised);
          syncParticipants();
          break;
        case 'chat':
          setMessages((m) => [...m, msg]);
          break;
        case 'reaction':
          setReactions((r) => [...r, { key: `${fromId}-${Date.now()}-${Math.random()}`, emoji: msg.emoji }]);
          break;
        case 'pomodoro':
          setRemotePomodoro({ mode: msg.mode, secondsLeft: msg.secondsLeft, running: msg.running });
          break;
        case 'mute':
          room.localParticipant.setMicrophoneEnabled(false);
          setMicOn(false);
          break;
        case 'kick':
          room.disconnect();
          setStatus('ended');
          break;
        default:
          break;
      }
    };

    // Wire LiveKit events to our participant table.
    room
      .on(RoomEvent.ParticipantConnected, () => { recomputeHost(); syncParticipants(); })
      .on(RoomEvent.ParticipantDisconnected, (p) => {
        streamCache.current.delete(p.identity);
        handsRef.current.delete(p.identity);
        recomputeHost();
        syncParticipants();
      })
      .on(RoomEvent.TrackSubscribed, () => syncParticipants())
      .on(RoomEvent.TrackUnsubscribed, () => syncParticipants())
      .on(RoomEvent.TrackMuted, () => syncParticipants())
      .on(RoomEvent.TrackUnmuted, () => syncParticipants())
      .on(RoomEvent.LocalTrackPublished, () => rebuildLocal())
      .on(RoomEvent.LocalTrackUnpublished, () => rebuildLocal())
      .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setSpeakingIds(speakers.map((s) => (s === room.localParticipant ? 'me' : s.identity)));
      })
      .on(RoomEvent.DataReceived, (payload, participant) => {
        let msg;
        try { msg = JSON.parse(decoder.decode(payload)); } catch { return; }
        handleData(participant?.identity, msg);
      })
      .on(RoomEvent.Disconnected, () => {
        if (!cancelled) setStatus((s) => (s === 'full' ? s : 'ended'));
      });

    async function start() {
      let url, token;
      try {
        const identity = (crypto.randomUUID && crypto.randomUUID()) || `u-${Date.now()}-${Math.random()}`;
        const qs = `room=${encodeURIComponent(roomId)}&identity=${encodeURIComponent(identity)}&name=${encodeURIComponent(displayName)}`;
        const resp = await fetch(`${TOKEN_ENDPOINT}?${qs}`);
        if (!resp.ok) throw new Error('token request failed');
        ({ url, token } = await resp.json());
        if (!url || !token) throw new Error('bad token response');
      } catch {
        if (!cancelled) setStatus('error');
        return;
      }

      try {
        await room.connect(url, token);
      } catch {
        if (!cancelled) setStatus('error');
        return;
      }
      if (cancelled) return room.disconnect();

      myIdRef.current = room.localParticipant.identity;

      // Best-effort capacity check (hard limits need a server-configured room).
      if (room.remoteParticipants.size + 1 > maxRef.current) {
        await room.disconnect();
        if (!cancelled) setStatus('full');
        return;
      }

      // Apply the mic/cam + device choices from the pre-join screen.
      try {
        await room.localParticipant.setMicrophoneEnabled(
          initMic,
          initial.audioDeviceId ? { deviceId: initial.audioDeviceId } : undefined
        );
      } catch { /* no mic */ }
      try {
        await room.localParticipant.setCameraEnabled(
          initCam,
          initial.videoDeviceId ? { deviceId: initial.videoDeviceId } : undefined
        );
      } catch {
        setCamOn(false);
      }

      recomputeHost();
      rebuildLocal();
      syncParticipants();
      if (!cancelled) setStatus('live');
    }

    start();

    return () => {
      cancelled = true;
      streamCache.current.clear();
      handsRef.current.clear();
      room.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  /* ---- reaction auto-expiry ---- */
  useEffect(() => {
    if (reactions.length === 0) return;
    const t = setTimeout(() => setReactions((r) => r.slice(1)), 3000);
    return () => clearTimeout(t);
  }, [reactions]);

  /* ---- public controls ---- */
  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  }, []);

  const toggleCam = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !room.localParticipant.isCameraEnabled;
    await room.localParticipant.setCameraEnabled(next);
    setCamOn(next);
  }, []);

  const startScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setScreenShareEnabled(true);
      setSharing(true);
    } catch { /* user cancelled */ }
  }, []);

  const stopScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setScreenShareEnabled(false);
    setSharing(false);
  }, []);

  const raiseHand = useCallback(() => {
    const next = !handRaisedRef.current;
    handRaisedRef.current = next;
    setHandRaised(next);
    publish({ t: 'hand', raised: next });
  }, [publish]);

  const sendChat = useCallback(
    (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const msg = { t: 'chat', id: myIdRef.current, name: displayName, text: trimmed, ts: Date.now() };
      setMessages((m) => [...m, msg]);
      publish(msg);
    },
    [publish, displayName]
  );

  const sendReaction = useCallback(
    (emoji) => {
      setReactions((r) => [...r, { key: `me-${Date.now()}-${Math.random()}`, emoji }]);
      publish({ t: 'reaction', emoji });
    },
    [publish]
  );

  const broadcastPomodoro = useCallback(
    (state) => {
      if (!isHostRef.current) return;
      publish({ t: 'pomodoro', ...state });
    },
    [publish]
  );

  // Admin actions: ask the target to self-mute / leave over data (no server
  // admin call needed). Works because every client honors these messages.
  const muteParticipant = useCallback((id) => publish({ t: 'mute' }, [id]), [publish]);
  const kickParticipant = useCallback((id) => publish({ t: 'kick' }, [id]), [publish]);

  const leave = useCallback(() => {
    roomRef.current?.disconnect();
    setStatus('ended');
  }, []);

  return {
    status,
    isHost,
    isAdmin: isHost,
    localStream,
    micOn,
    camOn,
    sharing,
    handRaised,
    speakingIds,
    participants,
    messages,
    reactions,
    remotePomodoro,
    myId: myIdRef.current,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    raiseHand,
    sendChat,
    sendReaction,
    broadcastPomodoro,
    muteParticipant,
    kickParticipant,
    leave,
  };
}
