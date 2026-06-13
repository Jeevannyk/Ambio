import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';

/*
 * Real-time room over PeerJS (free public broker, no backend/keys).
 *
 * Topology: the host owns a deterministic peer id `ambio-room-<roomId>`.
 * Whoever enters first and finds that id free becomes the host; everyone
 * else connects to the host, receives the roster, and dials every other
 * member directly — a full WebRTC mesh (good for small focus rooms).
 *
 * Data-channel messages (JSON, {t: type, ...}):
 *   hello   : {name, micOn, camOn, hand}        identity on connect
 *   roster  : {ids: [...]}                       host -> new joiner
 *   state   : {micOn, camOn}                     mic/cam changed
 *   hand    : {raised}                           raise/lower hand
 *   chat    : {id, name, text, ts}               chat message
 *   reaction: {emoji}                            floating emoji
 *   pomodoro: {mode, secondsLeft, running}       host broadcasts timer
 *   mute    : {}                                 admin force-mutes you
 *   kick    : {}                                 admin removes you
 */

const SPEAK_THRESHOLD = 12;

export function useRoomCall(roomId, displayName, isAdmin) {
  const [status, setStatus] = useState('connecting'); // connecting | live | error | ended
  const [isHost, setIsHost] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [speakingIds, setSpeakingIds] = useState([]); // includes 'me'
  const [participants, setParticipants] = useState([]); // {id, name, stream, micOn, camOn, hand}
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState([]); // {key, emoji}
  const [remotePomodoro, setRemotePomodoro] = useState(null);

  const peerRef = useRef(null);
  const myIdRef = useRef('');
  const dataConns = useRef(new Map()); // peerId -> DataConnection
  const mediaConns = useRef(new Map()); // peerId -> MediaConnection
  const camTrackRef = useRef(null); // original camera video track (for un-share)
  const streamRef = useRef(null);
  const meta = useRef({ name: displayName, micOn: true, camOn: true, hand: false });
  const analysers = useRef(new Map()); // id -> {analyser, data}
  const audioCtx = useRef(null);

  const hostId = `ambio-room-${roomId}`;

  /* ---- participant table helpers ---- */
  const upsert = useCallback((id, patch) => {
    setParticipants((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      if (i === -1) return [...prev, { id, name: '', stream: null, micOn: true, camOn: true, hand: false, ...patch }];
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }, []);

  const removePeer = useCallback((id) => {
    dataConns.current.get(id)?.close();
    mediaConns.current.get(id)?.close();
    dataConns.current.delete(id);
    mediaConns.current.delete(id);
    analysers.current.delete(id);
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  }, []);

  /* ---- broadcast helper ---- */
  const broadcast = useCallback((msg) => {
    dataConns.current.forEach((c) => c.open && c.send(msg));
  }, []);

  const sendTo = (id, msg) => {
    const c = dataConns.current.get(id);
    if (c && c.open) c.send(msg);
  };

  /* ---- speaking detection (Web Audio) ---- */
  const attachAnalyser = useCallback((id, stream) => {
    const track = stream?.getAudioTracks?.()[0];
    if (!track) return;
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      const src = audioCtx.current.createMediaStreamSource(new MediaStream([track]));
      const analyser = audioCtx.current.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      analysers.current.set(id, { analyser, data: new Uint8Array(analyser.frequencyBinCount) });
    } catch {
      /* ignore */
    }
  }, []);

  /* ---- incoming data message handler ---- */
  const handleData = useCallback(
    (fromId, msg) => {
      switch (msg.t) {
        case 'hello':
          upsert(fromId, { name: msg.name, micOn: msg.micOn, camOn: msg.camOn, hand: msg.hand });
          break;
        case 'state':
          upsert(fromId, { micOn: msg.micOn, camOn: msg.camOn });
          break;
        case 'hand':
          upsert(fromId, { hand: msg.raised });
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
        case 'roster':
          // host told us the other members — dial each of them
          msg.ids.forEach((id) => {
            if (id !== myIdRef.current && !dataConns.current.has(id)) connectToPeer(id);
          });
          break;
        case 'mute':
          if (streamRef.current) {
            streamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
            setMicOn(false);
            meta.current.micOn = false;
            broadcast({ t: 'state', micOn: false, camOn: meta.current.camOn });
          }
          break;
        case 'kick':
          cleanup();
          setStatus('ended');
          break;
        default:
          break;
      }
    },
    [upsert, broadcast]
  );

  /* ---- wire a data connection ---- */
  const wireData = useCallback(
    (conn) => {
      dataConns.current.set(conn.peer, conn);
      conn.on('open', () => {
        conn.send({ t: 'hello', ...meta.current });
        // If I'm the host, tell the newcomer about everyone already here.
        if (isHost || peerRef.current?.id === hostId) {
          const ids = [...dataConns.current.keys()].filter((id) => id !== conn.peer);
          conn.send({ t: 'roster', ids });
        }
      });
      conn.on('data', (d) => handleData(conn.peer, d));
      conn.on('close', () => removePeer(conn.peer));
      conn.on('error', () => removePeer(conn.peer));
    },
    [handleData, removePeer, isHost, hostId]
  );

  /* ---- place a call (media) to a peer ---- */
  const callPeer = useCallback((id) => {
    if (!peerRef.current || !streamRef.current) return;
    if (mediaConns.current.has(id)) return;
    const call = peerRef.current.call(id, streamRef.current);
    if (!call) return;
    mediaConns.current.set(id, call);
    call.on('stream', (remoteStream) => {
      upsert(id, { stream: remoteStream });
      attachAnalyser(id, remoteStream);
    });
    call.on('close', () => removePeer(id));
  }, [upsert, attachAnalyser, removePeer]);

  /* ---- connect (data + media) to a peer ---- */
  const connectToPeer = useCallback(
    (id) => {
      if (!peerRef.current || id === myIdRef.current) return;
      if (!dataConns.current.has(id)) {
        const conn = peerRef.current.connect(id, { reliable: true });
        wireData(conn);
      }
      callPeer(id);
    },
    [wireData, callPeer]
  );

  const cleanup = useCallback(() => {
    dataConns.current.forEach((c) => c.close());
    mediaConns.current.forEach((c) => c.close());
    dataConns.current.clear();
    mediaConns.current.clear();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    peerRef.current?.destroy();
    audioCtx.current?.close().catch(() => {});
  }, []);

  /* ---- bootstrap ---- */
  useEffect(() => {
    let cancelled = false;

    async function start() {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setCamOn(false);
          meta.current.camOn = false;
        } catch {
          if (!cancelled) setStatus('error');
          return;
        }
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setLocalStream(stream);
      camTrackRef.current = stream.getVideoTracks()[0] || null;
      attachAnalyser('me', stream);

      // Try to claim the host id first.
      const tryHost = new Peer(hostId, { debug: 0 });
      tryHost.on('open', () => {
        if (cancelled) return tryHost.destroy();
        peerRef.current = tryHost;
        myIdRef.current = hostId;
        setIsHost(true);
        setStatus('live');
        wirePeerEvents(tryHost);
      });
      tryHost.on('error', (err) => {
        if (err.type !== 'unavailable-id') return;
        // Host already exists — join as a normal member.
        tryHost.destroy();
        const me = new Peer({ debug: 0 });
        me.on('open', (id) => {
          if (cancelled) return me.destroy();
          peerRef.current = me;
          myIdRef.current = id;
          setStatus('live');
          wirePeerEvents(me);
          connectToPeer(hostId); // dial the host; roster brings the rest
        });
        me.on('error', () => !cancelled && setStatus('error'));
      });
    }

    function wirePeerEvents(peer) {
      peer.on('connection', (conn) => wireData(conn));
      peer.on('call', (call) => {
        call.answer(streamRef.current);
        mediaConns.current.set(call.peer, call);
        call.on('stream', (remoteStream) => {
          upsert(call.peer, { stream: remoteStream });
          attachAnalyser(call.peer, remoteStream);
        });
        call.on('close', () => removePeer(call.peer));
      });
      peer.on('disconnected', () => peer.reconnect());
    }

    start();
    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  /* ---- speaking poll ---- */
  useEffect(() => {
    const interval = setInterval(() => {
      const speaking = [];
      analysers.current.forEach(({ analyser, data }, id) => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        if (avg > SPEAK_THRESHOLD) speaking.push(id);
      });
      // a muted local mic should never show as speaking
      setSpeakingIds(meta.current.micOn ? speaking : speaking.filter((s) => s !== 'me'));
    }, 350);
    return () => clearInterval(interval);
  }, []);

  /* ---- reaction auto-expiry ---- */
  useEffect(() => {
    if (reactions.length === 0) return;
    const t = setTimeout(() => setReactions((r) => r.slice(1)), 3000);
    return () => clearTimeout(t);
  }, [reactions]);

  /* ---- public controls ---- */
  const toggleMic = useCallback(() => {
    const s = streamRef.current;
    if (!s) return;
    const next = !meta.current.micOn;
    s.getAudioTracks().forEach((t) => (t.enabled = next));
    meta.current.micOn = next;
    setMicOn(next);
    broadcast({ t: 'state', micOn: next, camOn: meta.current.camOn });
  }, [broadcast]);

  const toggleCam = useCallback(() => {
    const s = streamRef.current;
    if (!s) return;
    const next = !meta.current.camOn;
    s.getVideoTracks().forEach((t) => (t.enabled = next));
    meta.current.camOn = next;
    setCamOn(next);
    broadcast({ t: 'state', micOn: meta.current.micOn, camOn: next });
  }, [broadcast]);

  const replaceVideoTrack = (track) => {
    mediaConns.current.forEach((call) => {
      const sender = call.peerConnection?.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) sender.replaceTrack(track);
    });
  };

  const startScreenShare = useCallback(async () => {
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = display.getVideoTracks()[0];
      replaceVideoTrack(screenTrack);
      // reflect locally
      const local = streamRef.current;
      const oldTrack = local.getVideoTracks()[0];
      if (oldTrack) local.removeTrack(oldTrack);
      local.addTrack(screenTrack);
      setLocalStream(new MediaStream(local.getTracks()));
      setSharing(true);
      screenTrack.onended = () => stopScreenShare();
    } catch {
      /* user cancelled */
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    const cam = camTrackRef.current;
    const local = streamRef.current;
    if (!local) return;
    const screenTrack = local.getVideoTracks()[0];
    if (screenTrack) {
      screenTrack.stop();
      local.removeTrack(screenTrack);
    }
    if (cam) {
      local.addTrack(cam);
      replaceVideoTrack(cam);
    }
    setLocalStream(new MediaStream(local.getTracks()));
    setSharing(false);
  }, []);

  const raiseHand = useCallback(() => {
    const next = !meta.current.hand;
    meta.current.hand = next;
    setHandRaised(next);
    broadcast({ t: 'hand', raised: next });
  }, [broadcast]);

  const sendChat = useCallback(
    (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const msg = { t: 'chat', id: myIdRef.current, name: meta.current.name, text: trimmed, ts: Date.now() };
      setMessages((m) => [...m, msg]);
      broadcast(msg);
    },
    [broadcast]
  );

  const sendReaction = useCallback(
    (emoji) => {
      setReactions((r) => [...r, { key: `me-${Date.now()}-${Math.random()}`, emoji }]);
      broadcast({ t: 'reaction', emoji });
    },
    [broadcast]
  );

  const broadcastPomodoro = useCallback(
    (state) => {
      if (!isHost) return;
      broadcast({ t: 'pomodoro', ...state });
    },
    [broadcast, isHost]
  );

  // Admin actions (only meaningful for the host/admin)
  const muteParticipant = useCallback((id) => sendTo(id, { t: 'mute' }), []);
  const kickParticipant = useCallback(
    (id) => {
      sendTo(id, { t: 'kick' });
      setTimeout(() => removePeer(id), 200);
    },
    [removePeer]
  );

  const leave = useCallback(() => {
    cleanup();
    setStatus('ended');
  }, [cleanup]);

  return {
    status,
    isHost,
    isAdmin: isAdmin || isHost,
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
