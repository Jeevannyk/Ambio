/*
 * Ambio token server.
 *
 * LiveKit access tokens are JWTs signed with your API secret, so they MUST be
 * minted on a server — never in the browser (the secret can't ship to clients).
 * This tiny Express app does three jobs:
 *   1. GET  /api/token -> mints a join token for a room + returns the LiveKit URL
 *   2. POST /api/kick  -> host-only, authoritative removal of a participant
 *   3. serves the built Vite frontend (dist/) so it's a single Render service
 *
 * The API endpoints are protected: the caller must present a valid Supabase
 * session (Authorization: Bearer <access_token>) and is rate-limited per IP, so
 * strangers can't script token requests to burn LiveKit minutes or join rooms.
 * The room must also exist in Supabase, and the token's identity/name come from
 * the verified session — never from the query string.
 *
 * Required env vars (set in Render dashboard / local .env):
 *   LIVEKIT_API_KEY     LiveKit Cloud API key
 *   LIVEKIT_API_SECRET  LiveKit Cloud API secret
 *   LIVEKIT_URL         wss://<your-project>.livekit.cloud
 *   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY  (reused to verify the caller)
 *   SUPABASE_SERVICE_ROLE_KEY  server-only secret, used to resolve a single
 *                              room by id past RLS (see findRoom)
 */
const path = require('path');
// .env lives at the repo root so both halves can share it, regardless of the
// directory the server is started from.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');
const { createClient } = require('@supabase/supabase-js');

const {
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  LIVEKIT_URL,
  PORT = 3001,
} = process.env;

// Reuse the public Supabase values (also exposed as VITE_* for the frontend
// build) to validate the caller's session server-side.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  : null;

// Service-role client. This key bypasses Row Level Security completely, so it
// is server-only and is used for exactly one thing — see findRoom() below.
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

// Supabase is configured but the service-role key isn't: findRoom() then has no
// way to resolve a room. Falling back to the caller-scoped client would look
// like it works while quietly breaking join-by-code for everyone who isn't the
// room's creator (the rooms SELECT policy is creator-only — see
// supabase/migrations/0002_rooms_owner.sql), so the endpoints 500 instead.
const ROOM_LOOKUP_READY = !supabase || !!supabaseAdmin;

// A missing or typo'd Supabase config makes requireUser() fall through to its
// { id: 'dev' } bypass, i.e. /api/token hands a real, signed LiveKit token to
// any anonymous caller. That bypass is deliberate for local dev (it's what lets
// `npm run server` work with no .env at all) and indefensible in a deployment,
// so a deployed instance refuses to boot rather than degrade silently.
//
// RENDER is set automatically on every Render service, so it holds even if
// someone drops an env var; NODE_ENV is set explicitly in render.yaml as a
// second, independent signal. Either one is enough.
const IS_DEPLOYED = !!process.env.RENDER || process.env.NODE_ENV === 'production';

if (!supabase) {
  if (IS_DEPLOYED) {
    console.error('[ambio] FATAL: Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Refusing to start — without it /api/token would mint a LiveKit token for any unauthenticated caller.');
    process.exit(1);
  }
  console.warn('[ambio] Supabase not configured — /api/token will NOT require auth. Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to lock it down.');
}

// Admin API client, used to actually evict a participant (/api/kick).
const LIVEKIT_READY = !!(LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_URL);
const roomService = LIVEKIT_READY
  ? new RoomServiceClient(LIVEKIT_URL.replace(/^ws/, 'http'), LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
  : null;

const app = express();
app.set('trust proxy', 1); // Render sits behind a proxy — needed for real client IPs

// ── Simple in-memory rate limiter (per IP) ──────────────────────────────────
// 30 token requests per minute per IP: plenty for real users (join/rejoin),
// far too few to abuse. Single-instance, rolling window — no extra deps.
const RATE_MAX = 30;
const RATE_WINDOW_MS = 60 * 1000;
const hits = new Map(); // ip -> { count, resetAt }
function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_MAX;
}
// Drop stale entries so the map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of hits) if (now > rec.resetAt) hits.delete(ip);
}, 5 * RATE_WINDOW_MS).unref();

// Cap every string that still comes from the client — nothing here needs to be
// long, and unbounded input has no business reaching Supabase or a JWT claim.
const clean = (v, maxLen) => (typeof v === 'string' ? v.trim().slice(0, maxLen) : '');

const bearer = (req) => {
  const auth = req.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
};

// Verify the caller's Supabase session. Returns the user, or null after sending
// a 401. When Supabase isn't configured (local dev), auth is skipped.
async function requireUser(req, res) {
  if (!supabase) return { id: 'dev' };
  const token = bearer(req);
  if (!token) {
    res.status(401).json({ error: 'sign in required' });
    return null;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: 'invalid or expired session' });
    return null;
  }
  return data.user;
}

// Resolve ONE room by its id, using the service-role client so RLS does not
// apply. That is deliberate: the rooms table's SELECT policy is "creator only"
// (supabase/migrations/0002_rooms_owner.sql), which governs who may BROWSE the
// room list — not who may join a room whose code they were handed. By the time
// we get here the caller has proven they're a signed-in user (requireUser) and
// is naming one specific room id, which is enough to resolve that single row.
//
// supabaseAdmin must NEVER serve a list/browse query — only single-room lookups
// keyed by an id the request itself already carries. Anything broader would
// hand every room's private code to every caller, which is the exact bug the
// creator-only policy exists to fix.
//
// Returns { room } — the row, or null if it doesn't exist; either way we refuse
// to mint a grant for it. A query that FAILED comes back as { error } instead,
// and must not be flattened into the same "no such room" answer: this function
// used to discard the error, so a service-role key that couldn't read the table
// at all was indistinguishable from a typo'd room code, and every join 404'd
// with "Room not found" while the row sat there perfectly intact.
//
// The likeliest cause of an error here is `42501 permission denied for table
// rooms`: RLS is not the only gate, the role also needs a plain table GRANT
// (supabase/migrations/0003_rooms_grants.sql).
async function findRoom(id) {
  if (!supabase) return { room: { id, name: id } }; // local dev without Supabase
  const { data, error } = await supabaseAdmin.from('rooms').select('id, name, max').eq('id', id).maybeSingle();
  if (error) {
    console.error(`[ambio] rooms lookup failed (${error.code}): ${error.message}${error.hint ? ` — ${error.hint}` : ''}`);
    return { error };
  }
  return { room: data || null };
}

// The host is the earliest joiner — the same rule the browsers use for the
// crown. LiveKit reports joinedAt in whole seconds, so same-second joins fall
// back to the identity comparison, exactly like the client does.
function hostIdentity(participants) {
  if (!participants?.length) return null;
  return participants.reduce((a, b) => {
    const ta = Number(a.joinedAt) || 0;
    const tb = Number(b.joinedAt) || 0;
    if (ta !== tb) return ta < tb ? a : b;
    return a.identity < b.identity ? a : b;
  }).identity;
}

app.get('/api/token', async (req, res) => {
  const room = clean(req.query.room, 64);

  if (!LIVEKIT_READY) {
    return res.status(500).json({ error: 'LiveKit env not configured (LIVEKIT_API_KEY / LIVEKIT_API_SECRET / LIVEKIT_URL)' });
  }
  if (!ROOM_LOOKUP_READY) {
    return res.status(500).json({ error: 'Supabase env not configured (SUPABASE_SERVICE_ROLE_KEY)' });
  }
  if (!room) {
    return res.status(400).json({ error: 'room query param is required' });
  }

  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'too many requests, slow down' });
  }

  const user = await requireUser(req, res);
  if (!user) return; // 401 already sent

  const lookup = await findRoom(room);
  if (lookup.error) return res.status(500).json({ error: 'could not look up the room — see server logs' });
  const found = lookup.room;
  if (!found) return res.status(404).json({ error: 'room not found' });

  try {
    // Identity and display name come from the verified session, never from the
    // request — otherwise anyone could join as anyone.
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: String(user.id),
      name: clean(user.user_metadata?.full_name || user.email || '', 64) || undefined,
      ttl: '2h',
    });
    at.addGrant({
      roomJoin: true,
      room: String(found.id),
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    const token = await at.toJwt();
    // name/max ride along so the browser can show the room without querying the
    // rooms table itself — under the creator-only SELECT policy that query
    // returns nothing for everyone but the creator.
    res.json({ token, url: LIVEKIT_URL, name: found.name, max: found.max });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Authoritative removal. The in-room "kick" data message is only advisory (a
// client can ignore it); this evicts the participant server-side, and only if
// the caller really is the room's host.
app.post('/api/kick', express.json({ limit: '1kb' }), async (req, res) => {
  if (!roomService) {
    return res.status(500).json({ error: 'LiveKit env not configured (LIVEKIT_API_KEY / LIVEKIT_API_SECRET / LIVEKIT_URL)' });
  }
  if (!ROOM_LOOKUP_READY) {
    return res.status(500).json({ error: 'Supabase env not configured (SUPABASE_SERVICE_ROLE_KEY)' });
  }

  const room = clean(req.body?.room, 64);
  const target = clean(req.body?.identity, 64);
  if (!room || !target) {
    return res.status(400).json({ error: 'room and identity are required' });
  }

  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'too many requests, slow down' });
  }

  const user = await requireUser(req, res);
  if (!user) return; // 401 already sent

  const lookup = await findRoom(room);
  if (lookup.error) return res.status(500).json({ error: 'could not look up the room — see server logs' });
  const found = lookup.room;
  if (!found) return res.status(404).json({ error: 'room not found' });

  try {
    const participants = await roomService.listParticipants(String(found.id));
    if (hostIdentity(participants) !== String(user.id)) {
      return res.status(403).json({ error: 'only the host can remove participants' });
    }
    await roomService.removeParticipant(String(found.id), target);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve the built frontend and let client-side routing handle deep links.
const dist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(dist));
app.get('*', (req, res) => {
  // Only real routes get the SPA shell. A missing file must 404 — otherwise a
  // stale tab asking for an old /assets/*.js after a redeploy receives HTML
  // with a 200 and dies trying to parse it as a module.
  if (req.path.startsWith('/assets/') || path.extname(req.path)) {
    return res.status(404).type('txt').send('Not found');
  }
  res.sendFile(path.join(dist, 'index.html'));
});

app.listen(PORT, () => console.log(`Ambio server listening on :${PORT}`));
