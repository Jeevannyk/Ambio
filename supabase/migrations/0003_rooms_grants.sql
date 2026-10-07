-- Table GRANTs for public.rooms.
--
-- RLS is the second gate, not the first. A role that has no plain SQL GRANT on
-- the table is refused before any policy is even consulted, with
--   42501: permission denied for table rooms
-- Supabase normally hands these grants out automatically via default
-- privileges, so it is easy to assume they're there — but if the table was
-- created outside that path, or a REVOKE ever ran, they aren't, and nothing in
-- the dashboard's Policies view shows it.
--
-- This bit hard: service_role had no SELECT, so findRoom() (backend/index.js)
-- got a permission error instead of a row, discarded it, and returned null —
-- and every single join, including the creator's own, failed with a clean
-- "Room not found" for a room that existed and was listed on the Rooms page
-- one click earlier. findRoom() now logs the error and 500s instead of 404ing,
-- but the grants below are what actually make joining work.
--
-- Idempotent — safe to re-run. Paste into the Supabase dashboard SQL editor
-- (this repo has no migration runner) and re-run 0002's verification queries
-- afterwards if you want to confirm nothing else drifted.

-- The browser, acting as the signed-in user. Creating, listing, regenerating
-- and deleting rooms all go through this role; RLS (0001, 0002) narrows what it
-- may actually touch to the admin's / creator's own rows.
grant select, insert, update, delete on public.rooms to authenticated;

-- The token server's service-role client. SELECT only, deliberately: findRoom()
-- is the sole consumer and it only ever resolves one room by id. This key
-- bypasses RLS entirely, so it gets no more reach than the one thing it does.
grant select on public.rooms to service_role;

-- `anon` is intentionally NOT granted anything. Nothing in the app reads rooms
-- while signed out, and the token server verifies a session before it looks a
-- room up at all.
