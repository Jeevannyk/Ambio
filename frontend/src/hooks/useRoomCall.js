import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Room, RoomEvent, Track, DisconnectReason, ConnectionQuality,
  VideoPresets, ScreenSharePresets,
} from 'livekit-client';
import { supabase } from '../lib/supabase';

/*
 * Real-time room over LiveKit (managed SFU — reliable signaling + TURN baked
 * in, unlike the old PeerJS public-broker mesh). The browser fetches a short-
 * lived join token from our own /api/token endpoint (the LiveKit secret never
 * ships to the client) via fetchRoomPass() below, then hands it to this hook,
 * which connects to the LiveKit server.
 *
 * Media (camera / mic / screen share) flows through LiveKit's tracks. Everything
 * else rides LiveKit data messages (JSON, {t: type, ...}) — same schema as before:
 *   hand     : {raised}                       raise/lower hand
 *   chat     : {id, name, text, ts}           chat message
 *   reaction : {emoji}                        floating emoji
 *   pomodoro : {mode, secondsLeft, running}   host broadcasts timer
 *   mute     : {}                             host force-mutes you
 *   kick     : {}                             host removes you
 *
 * pomodoro / mute / kick are only honoured from the current host's identity —
 * anyone can publish data, so the sender has to be checked. Removal is backed
 * by /api/kick (LiveKit admin API) so it doesn't depend on the target's client
 * playing along.
 *
 * Media is handed out as LiveKit Track objects (not MediaStreams): VideoTile
 * calls track.attach(), which is what feeds adaptiveStream/dynacast the tile's
 * visibility and size so the SFU can pick a layer for it.
 */

const TOKEN_ENDPOINT = import.meta.env.VITE_TOKEN_ENDPOINT || '/api/token';
const KICK_ENDPOINT = TOKEN_ENDPOINT.replace(/\/token$/, '/kick');
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Prove we're a signed-in user so the server will act for us.
async function authHeaders() {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

/*
 * Ask the server for a join pass. Returns { token, url, name, max } — the room's
 * name and capacity ride along because the rooms table is only readable by the
 * room's creator now (supabase/migrations/0002_rooms_owner.sql), so the browser
 * can't look them up itself. RoomCall calls this on mount, before the code gate,
 * and holds the token until the gate opens; nothing here connects anything.
 * Throws on failure, with .status carrying the HTTP code.
 */
export async function fetchRoomPass(roomId) {
  const resp = await fetch(`${TOKEN_ENDPOINT}?room=${encodeURIComponent(roomId)}`, {
    headers: await authHeaders(),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => null);
    const err = new Error(body?.error || `HTTP ${resp.status}`);
    err.status = resp.status;
    throw err;
  }
  const data = await resp.json();
  if (!data?.url || !data?.token) throw new Error('the server returned an incomplete join pass');
  return data;
}

export function useRoomCall(roomId, pass, displayName, max = Infinity, initial = {}) {
  const initMic = initial.micOn ?? true;
  const initCam = initial.camOn ?? true;
  // connecting | live | reconnecting | ended | full | replaced | connect-error
  // (auth/token failures happen in fetchRoomPass, before this hook mounts)
  const [status, setStatus] = useState('connecting');
  const [errorDetail, setErrorDetail] = useState(''); // server/SDK message for the error screens
  const [mediaError, setMediaError] = useState(null); // 'mic' | 'cam' | 'both' — non-fatal
  const [isHost, setIsHost] = useState(false);
  const [localVideoTrack, setLocalVideoTrack] = useState(null); // LocalVideoTrack | null
  const [connectionQuality, setConnectionQuality] = useState(ConnectionQuality.Unknown);
  const [micOn, setMicOn] = useState(initMic);
  const [camOn, setCamOn] = useState(initCam);
  const [sharing, setSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [speakingIds, setSpeakingIds] = useState([]); // includes 'me'
  // {id, name, videoTrack, audioTrack, sharing, micOn, camOn, hand}
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState([]); // {key, emoji}
  const [remotePomodoro, setRemotePomodoro] = useState(null);

  const roomRef = useRef(null);
  const myIdRef = useRef('');
  const isHostRef = useRef(false);
  const hostIdRef = useRef(null); // identity of the current host (who we obey)
  const handRaisedRef = useRef(false);
  const maxRef = useRef(max);
  const handsRef = useRef(new Map()); // identity -> hand raised

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
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      // Uncapped SDK defaults publish 720p30 camera (~2.3 Mbps with simulcast)
      // and 1080p15 screen share. This is a study room of small tiles on
      // whatever connection people happen to have — 540p is already more than
      // the biggest tile (the speaker-view stage) shows, and the extra 360/180
      // layers are what adaptiveStream picks from for the small ones.
      videoCaptureDefaults: { resolution: VideoPresets.h540.resolution },
      publishDefaults: {
        videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
        screenShareEncoding: ScreenSharePresets.h720fps15.encoding,
      },
    });
    roomRef.current = room;
    maxRef.current = max;

    // The LiveKit track objects for a remote participant: prefer their screen
    // share over their camera, plus their mic. Handed to VideoTile as-is —
    // adaptiveStream and dynacast only see a tile once track.attach() has run,
    // so assembling a MediaStream here and setting .srcObject (as this used to)
    // left every remote track permanently "invisible" to the SFU.
    const tracksFor = (p) => {
      const pubs = [...p.trackPublications.values()];
      const screen = pubs.find((x) => x.source === Track.Source.ScreenShare && x.track);
      const cam = pubs.find((x) => x.source === Track.Source.Camera && x.track);
      const mic = pubs.find((x) => x.source === Track.Source.Microphone && x.track);
      return {
        videoTrack: (screen || cam)?.track || null,
        audioTrack: mic?.track || null,
        sharing: !!screen,
      };
    };

    const syncParticipants = () => {
      const list = [...room.remoteParticipants.values()].map((p) => ({
        id: p.identity,
        name: p.name || 'Connecting…',
        ...tracksFor(p),
        micOn: p.isMicrophoneEnabled,
        camOn: p.isCameraEnabled,
        hand: handsRef.current.get(p.identity) || false,
      }));
      setParticipants(list);
    };

    const rebuildLocal = () => {
      const pubs = [...room.localParticipant.trackPublications.values()];
      const screen = pubs.find((x) => x.source === Track.Source.ScreenShare && x.track);
      const cam = pubs.find((x) => x.source === Track.Source.Camera && x.track);
      setLocalVideoTrack((screen || cam)?.track || null);
    };

    // Earliest joiner is the host; recompute on every roster change so host
    // migrates cleanly if the current host leaves.
    // Compared at whole-second resolution because /api/kick elects the host
    // from LiveKit's server roster, which only reports joinedAt in seconds.
    // Same precision + same tiebreak on both sides => both elect the same
    // person, so the crown we show is the one the server will honour.
    const joinSecond = (p) => {
      const t = p.joinedAt?.getTime?.();
      return typeof t === 'number' ? Math.floor(t / 1000) : Infinity;
    };
    const recomputeHost = () => {
      const all = [room.localParticipant, ...room.remoteParticipants.values()];
      const timed = all.filter((p) => p.joinedAt);
      const pool = timed.length ? timed : all;
      const host = pool.reduce((a, b) => {
        const ta = joinSecond(a);
        const tb = joinSecond(b);
        if (ta !== tb) return ta < tb ? a : b;
        return a.identity < b.identity ? a : b; // stable tiebreak
      });
      const mine = host === room.localParticipant;
      hostIdRef.current = host.identity;
      isHostRef.current = mine;
      setIsHost(mine);
    };

    const handleData = (fromId, msg) => {
      // Anyone can publish data, so control messages are only obeyed when they
      // come from the host we elected locally.
      const fromHost = !!fromId && fromId === hostIdRef.current;
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
          if (!fromHost) break;
          setRemotePomodoro({ mode: msg.mode, secondsLeft: msg.secondsLeft, running: msg.running });
          break;
        case 'mute':
          if (!fromHost) break;
          room.localParticipant.setMicrophoneEnabled(false);
          setMicOn(false);
          break;
        case 'kick':
          // Courtesy notice — /api/kick is what actually removes people.
          if (!fromHost) break;
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
      // A network stall used to leave the header reading "Live" while the video
      // froze — indistinguishable from a broken app. Say what's happening.
      .on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        if (participant === room.localParticipant) setConnectionQuality(quality);
      })
      .on(RoomEvent.Reconnecting, () => {
        if (!cancelled) setStatus((s) => (s === 'live' ? 'reconnecting' : s));
      })
      .on(RoomEvent.Reconnected, () => {
        if (!cancelled) setStatus((s) => (s === 'reconnecting' ? 'live' : s));
        // Publications are re-created on the far side, so the track objects the
        // tiles hold may be stale.
        syncParticipants();
        rebuildLocal();
      })
      .on(RoomEvent.Disconnected, (reason) => {
        if (cancelled) return;
        // Identity is the Supabase user id, so joining from a second tab or
        // device evicts this one. That isn't an error — say what happened.
        if (reason === DisconnectReason.DUPLICATE_IDENTITY) { setStatus('replaced'); return; }
        // Don't paper over a terminal state with the generic "ended" screen.
        setStatus((s) => (s === 'full' || s.endsWith('error') ? s : 'ended'));
      });

    const fail = (next, detail) => {
      if (cancelled) return;
      setErrorDetail(detail || '');
      setStatus(next);
    };

    async function start() {
      // The pass was minted before the code gate (identity + display name are
      // assigned server-side from our session); this is the first moment we
      // actually use it.
      try {
        await room.connect(pass.url, pass.token);
      } catch (err) {
        fail('connect-error', err?.message);
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

      // Apply the mic/cam + device choices from the pre-join screen. A blocked
      // device isn't fatal (you can still watch and listen), but it must be
      // reported instead of silently swallowed.
      let micFailed = false;
      let camFailed = false;
      try {
        await room.localParticipant.setMicrophoneEnabled(
          initMic,
          initial.audioDeviceId ? { deviceId: initial.audioDeviceId } : undefined
        );
      } catch {
        micFailed = true;
        setMicOn(false);
      }
      try {
        await room.localParticipant.setCameraEnabled(
          initCam,
          initial.videoDeviceId ? { deviceId: initial.videoDeviceId } : undefined
        );
      } catch {
        camFailed = true;
        setCamOn(false);
      }
      if (!cancelled && (micFailed || camFailed)) {
        setMediaError(micFailed && camFailed ? 'both' : micFailed ? 'mic' : 'cam');
      }

      recomputeHost();
      rebuildLocal();
      syncParticipants();
      if (!cancelled) setStatus('live');
    }

    start();

    return () => {
      cancelled = true;
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

  // Host actions. Mute is a request the target's client honours (only from the
  // host). Removal can't be left to the target's goodwill, so it goes through
  // /api/kick, which re-checks who the host is and evicts them via LiveKit's
  // admin API; the data message is just an instant heads-up.
  const muteParticipant = useCallback((id) => publish({ t: 'mute' }, [id]), [publish]);
  const kickParticipant = useCallback(
    async (id) => {
      publish({ t: 'kick' }, [id]);
      try {
        await fetch(KICK_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify({ room: roomId, identity: id }),
        });
      } catch { /* they'll still be gone if they honoured the message */ }
    },
    [publish, roomId]
  );

  const leave = useCallback(() => {
    roomRef.current?.disconnect();
    setStatus('ended');
  }, []);

  return {
    status,
    errorDetail,
    mediaError,
    isHost,
    isAdmin: isHost,
    localVideoTrack,
    connectionQuality,
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
