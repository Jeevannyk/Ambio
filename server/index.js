/*
 * Ambio token server.
 *
 * LiveKit access tokens are JWTs signed with your API secret, so they MUST be
 * minted on a server — never in the browser (the secret can't ship to clients).
 * This tiny Express app does two jobs:
 *   1. GET /api/token  -> mints a join token for a room + returns the LiveKit URL
 *   2. serves the built Vite frontend (dist/) so it's a single Render service
 *
 * The token endpoint is protected: the caller must present a valid Supabase
 * session (Authorization: Bearer <access_token>) and is rate-limited per IP, so
 * strangers can't script token requests to burn LiveKit minutes or join rooms.
 *
 * Required env vars (set in Render dashboard / local .env):
 *   LIVEKIT_API_KEY     LiveKit Cloud API key
 *   LIVEKIT_API_SECRET  LiveKit Cloud API secret
 *   LIVEKIT_URL         wss://<your-project>.livekit.cloud
 *   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY  (reused to verify the caller)
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const { AccessToken } = require('livekit-server-sdk');
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

if (!supabase) {
  console.warn('[ambio] Supabase not configured — /api/token will NOT require auth. Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to lock it down.');
}

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

// Verify the caller's Supabase session. Returns the user, or null after sending
// a 401. When Supabase isn't configured (local dev), auth is skipped.
async function requireUser(req, res) {
  if (!supabase) return { id: 'dev' };
  const auth = req.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
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

app.get('/api/token', async (req, res) => {
  const { room, identity, name } = req.query;

  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
    return res.status(500).json({ error: 'LiveKit env not configured (LIVEKIT_API_KEY / LIVEKIT_API_SECRET / LIVEKIT_URL)' });
  }
  if (!room || !identity) {
    return res.status(400).json({ error: 'room and identity query params are required' });
  }

  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'too many requests, slow down' });
  }

  const user = await requireUser(req, res);
  if (!user) return; // 401 already sent

  try {
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: String(identity),
      name: name ? String(name) : undefined,
      ttl: '2h',
    });
    at.addGrant({
      roomJoin: true,
      room: String(room),
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    const token = await at.toJwt();
    res.json({ token, url: LIVEKIT_URL });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve the built frontend and let client-side routing handle deep links.
const dist = path.join(__dirname, '..', 'dist');
app.use(express.static(dist));
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));

app.listen(PORT, () => console.log(`Ambio server listening on :${PORT}`));
