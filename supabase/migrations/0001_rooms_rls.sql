-- Row Level Security for public.rooms
--
-- These policies are LOAD-BEARING. Since the rooms feature moved off
-- localStorage, two independent paths depend on the SELECT policy below:
--
--   1. RoomsPage.jsx  — lists rooms with the browser's anon key + user JWT.
--   2. backend/index.js findRoom() — /api/token and /api/kick look the room up
--      with the CALLER's JWT before minting a LiveKit grant. "No row" is
--      treated as 404 / "Room not found".
--
-- So if the SELECT policy is missing or restricted to a role the app doesn't
-- use, every join fails with "Room not found" and nothing in the code explains
-- why. This file exists so that contract is reviewable in the repo instead of
-- living only in the Supabase dashboard.
--
-- Writes are admin-only: the UI hides create/delete behind ADMIN_EMAIL
-- (frontend/src/lib/auth.js), but that is a client-side check and is trivially
-- bypassed by calling PostgREST directly with any signed-in user's anon key.
-- The policy below is what actually enforces it.
--
-- APPLY WITH CARE: this is written to match the app's observed usage, not
-- dumped from the live project. Diff it against the dashboard
-- (Authentication -> Policies) before running it anywhere real.

alter table public.rooms enable row level security;

-- Any signed-in user can see the room list and resolve a room code.
drop policy if exists "rooms readable by authenticated" on public.rooms;
create policy "rooms readable by authenticated"
  on public.rooms
  for select
  to authenticated
  using (true);

-- Only the admin account may create, edit or delete rooms.
drop policy if exists "rooms writable by admin only" on public.rooms;
create policy "rooms writable by admin only"
  on public.rooms
  for all
  to authenticated
  using      (auth.jwt() ->> 'email' = 'jeevangknayak@gmail.com')
  with check (auth.jwt() ->> 'email' = 'jeevangknayak@gmail.com');

-- Columns the app actually reads/writes, for reference:
--   id          text primary key   -- 6-char room code, uppercase (genCode())
--   name        text not null
--   description text
--   max         int                -- clamped to 2..6 by the UI
--   created_at  timestamptz default now()   -- RoomsPage orders by this
--
-- Note: there is no owner/created_by column, so /api/kick authorizes the host
-- against the LIVE LiveKit roster (earliest joiner) rather than the DB. If you
-- later want host bound to a person, add created_by uuid references auth.users
-- and switch backend/index.js hostIdentity() to read it.
