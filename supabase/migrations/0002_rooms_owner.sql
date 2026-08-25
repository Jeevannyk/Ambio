-- Room codes become private to whoever created the room.
--
-- Before this, the SELECT policy in 0001 was `using (true)`: every signed-in
-- user could list every room, and the room list renders each room's code on the
-- card. A code that everyone can read is not a code. This adds an owner column
-- and narrows the SELECT policy to the owner.
--
-- What this does NOT do: close off join-by-code. Someone the creator gave a
-- code to still types it in (Quick Join / a /rooms/:code link) and joins. That
-- path no longer reads the rooms table from the browser at all — it goes
-- through /api/token, whose findRoom() (backend/index.js) resolves the single
-- named row with the SERVICE ROLE key, deliberately bypassing the policy below.
-- So this policy governs exactly one thing: who may BROWSE the list.
--
-- The code itself is still only checked client-side (CodeGate.jsx). Anyone who
-- is signed in and guesses/learns a room id can still get a token for it. That
-- was true before this migration and is unchanged by it.
--
-- Two paths break loudly if this is applied without the matching server change:
--   1. backend/index.js must have SUPABASE_SERVICE_ROLE_KEY set, or every join
--      by a non-creator 404s as "Room not found".
--   2. RoomCall.jsx must read name/max from /api/token, not from the rooms
--      table, or non-creators get a blank room name on the code gate.
--
-- APPLY WITH CARE: this repo has no migration runner — 0001 was written to be
-- pasted into the Supabase dashboard SQL editor and diffed against the live
-- policies first. Do the same here, in one transaction, and read the backfill
-- note below before running it.

-- `default auth.uid()` (not an app-side insert value) so a room created through
-- PostgREST is owned correctly even if the client's insert payload omits the
-- column. The DB is the source of truth for ownership, not RoomsPage.jsx.
alter table public.rooms add column created_by uuid references auth.users(id) default auth.uid();

-- Backfill existing rows to the admin account (the only creator until now).
--
-- VERIFY FIRST: this was written from the app's ADMIN_EMAIL constant
-- (frontend/src/lib/auth.js), not read off the live project. Run
--   select id, email from auth.users where email = 'jeevangknayak@gmail.com';
-- and confirm it returns exactly one row. If it returns none, the subquery
-- yields null and the `set not null` below fails — which aborts the whole
-- migration rather than silently leaving rooms unowned. That is the intended
-- failure, but fix the email rather than dropping the constraint.
update public.rooms set created_by = (
  select id from auth.users where email = 'jeevangknayak@gmail.com'
) where created_by is null;

alter table public.rooms alter column created_by set not null;

-- The room list is now private to its creator. Anyone who has a room's code
-- can still join it (findRoom() in backend/index.js uses a service-role
-- lookup for that path, bypassing this policy on purpose) -- this policy only
-- controls who can BROWSE the list.
drop policy if exists "rooms readable by authenticated" on public.rooms;
create policy "rooms readable by owner"
  on public.rooms
  for select
  to authenticated
  using (created_by = auth.uid());

-- 0001's "rooms writable by admin only" policy is left exactly as it is. It
-- already enforces admin-only create/edit/delete via the JWT email claim;
-- rewriting it in terms of created_by would change who can write, which is not
-- what this migration is for. Note it is `for all`, which includes select, and
-- permissive policies OR together — so the admin keeps seeing every room even
-- if a row somehow ends up owned by someone else.
