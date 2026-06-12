// Spotify Web API helpers — PKCE OAuth, no backend required.
// Set VITE_SPOTIFY_CLIENT_ID in your .env file.

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const REDIRECT_URI = window.location.origin;
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-library-read',
  'user-library-modify',
].join(' ');

const KEYS = {
  access: 'sp_access_token',
  refresh: 'sp_refresh_token',
  expiry: 'sp_token_expiry',
  verifier: 'sp_code_verifier',
};

function base64Url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function sha256(plain) {
  return window.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(plain)
  );
}

export function hasClientId() {
  return !!CLIENT_ID;
}

export function isLoggedIn() {
  return !!localStorage.getItem(KEYS.access);
}

export async function login() {
  const verifier = base64Url(window.crypto.getRandomValues(new Uint8Array(64)));
  const challenge = base64Url(await sha256(verifier));
  localStorage.setItem(KEYS.verifier, verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function handleCallback(code) {
  const verifier = localStorage.getItem(KEYS.verifier);
  if (!verifier) return false;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  });

  const data = await res.json();
  if (!data.access_token) return false;

  localStorage.setItem(KEYS.access, data.access_token);
  localStorage.setItem(KEYS.refresh, data.refresh_token || '');
  localStorage.setItem(KEYS.expiry, String(Date.now() + data.expires_in * 1000));
  localStorage.removeItem(KEYS.verifier);
  return true;
}

async function refreshToken() {
  const refresh = localStorage.getItem(KEYS.refresh);
  if (!refresh) return null;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh,
      client_id: CLIENT_ID,
    }),
  });

  const data = await res.json();
  if (!data.access_token) return null;

  localStorage.setItem(KEYS.access, data.access_token);
  localStorage.setItem(KEYS.expiry, String(Date.now() + data.expires_in * 1000));
  if (data.refresh_token) localStorage.setItem(KEYS.refresh, data.refresh_token);
  return data.access_token;
}

async function getToken() {
  const token = localStorage.getItem(KEYS.access);
  const expiry = parseInt(localStorage.getItem(KEYS.expiry) || '0', 10);
  if (token && Date.now() < expiry - 60_000) return token;
  return refreshToken();
}

export function logout() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

export async function getPlaybackState() {
  const token = await getToken();
  if (!token) return null;
  const res = await fetch('https://api.spotify.com/v1/me/player', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) return { is_playing: false, item: null, progress_ms: 0 };
  if (!res.ok) return null;
  return res.json();
}

export async function togglePlayback(isPlaying) {
  const token = await getToken();
  if (!token) return;
  await fetch(
    `https://api.spotify.com/v1/me/player/${isPlaying ? 'pause' : 'play'}`,
    { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function skipNext() {
  const token = await getToken();
  if (!token) return;
  await fetch('https://api.spotify.com/v1/me/player/next', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function skipPrev() {
  const token = await getToken();
  if (!token) return;
  await fetch('https://api.spotify.com/v1/me/player/previous', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function checkSaved(trackId) {
  const token = await getToken();
  if (!token || !trackId) return false;
  const res = await fetch(
    `https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return false;
  const data = await res.json();
  return data[0] ?? false;
}

export async function toggleSaved(trackId, isSaved) {
  const token = await getToken();
  if (!token || !trackId) return;
  await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
    method: isSaved ? 'DELETE' : 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
}
