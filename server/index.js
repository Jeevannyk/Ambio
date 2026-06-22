/*
 * Ambio token server.
 *
 * LiveKit access tokens are JWTs signed with your API secret, so they MUST be
 * minted on a server — never in the browser (the secret can't ship to clients).
 * This tiny Express app does two jobs:
 *   1. GET /api/token  -> mints a join token for a room + returns the LiveKit URL
 *   2. serves the built Vite frontend (dist/) so it's a single Render service
 *
 * Required env vars (set in Render dashboard / local .env):
 *   LIVEKIT_API_KEY     LiveKit Cloud API key
 *   LIVEKIT_API_SECRET  LiveKit Cloud API secret
 *   LIVEKIT_URL         wss://<your-project>.livekit.cloud
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const { AccessToken } = require('livekit-server-sdk');

const {
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  LIVEKIT_URL,
  PORT = 3001,
} = process.env;

const app = express();

app.get('/api/token', async (req, res) => {
  const { room, identity, name } = req.query;

  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
    return res.status(500).json({ error: 'LiveKit env not configured (LIVEKIT_API_KEY / LIVEKIT_API_SECRET / LIVEKIT_URL)' });
  }
  if (!room || !identity) {
    return res.status(400).json({ error: 'room and identity query params are required' });
  }

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
