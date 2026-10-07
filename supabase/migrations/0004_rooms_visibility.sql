-- Per-room visibility: private (today's behaviour) or public.
--
-- 0002 made every room private to whoever created it, so the browsable list is
-- the creator's own rooms and nobody else's. That is the right default for a
-- room whose card renders its join code — but it leaves no way to publish a
-- room that any signed-in user may simply walk into, without the admin having
-- to hand out a code by hand every time. This adds a per-room flag, chosen at
-- creation time, and widens the SELECT policy to honour it.
--
-- What this does NOT change:
--   * Who may CREATE rooms. 0001's "rooms writable by admin only" is left
--     exactly as it is — this is a visibility flag on a room the admin already
--     created, not a change to who may create one.
--   * Join-by-code. findRoom() (backend/index.js) resolves any room by id with
--     the SERVICE ROLE key, deliberately bypassing RLS, so a private room's
--     code still works for whoever was given it. Visibility has only ever
--     governed who may BROWSE the list; the backend never reads this column.
--   * Grants. 0003's `grant select on public.rooms` is table-wide, not
--     per-column, so the new column is already readable by both roles.
--
-- `not null default false` is the load-bearing part: every row that exists
-- today, and every insert whose payload omits the column, stays private.
-- Publishing a room is only ever an explicit act.
--
-- Idempotent — safe to re-run. Paste into the Supabase dashboard SQL editor
-- (this repo has no migration runner), same as 0001-0003.

alter table public.rooms add column if not exists is_public boolean not null default false;

-- Replaces 0002's creator-only SELECT policy. Private rooms keep exactly the
-- same guarantee (`created_by = auth.uid()`); a room flagged public is readable
-- by every signed-in user, whoever created it.
--
-- Both drops matter. The first name is 0002's, verified against that file — if
-- it has drifted in the live project, check the real name with
--   select policyname, cmd, qual from pg_policies
--    where schemaname = 'public' and tablename = 'rooms';
-- and fix it here before running, or the old narrower policy survives alongside
-- the new one. Permissive policies OR together, so that would not lock anyone
-- out, but it leaves two policies claiming to own the same rule. The second
-- drop is what makes re-running this file safe.
drop policy if exists "rooms readable by owner" on public.rooms;
drop policy if exists "rooms readable by owner or public" on public.rooms;
create policy "rooms readable by owner or public"
  on public.rooms
  for select
  to authenticated
  using (created_by = auth.uid() or is_public = true);

-- Consequences worth stating plainly, since RLS is the only thing enforcing
-- them:
--   * A non-admin's room list is now exactly the set of public rooms. They have
--     created nothing, so the first branch never matches for them. RoomsPage
--     does no client-side filtering and must not start — this policy is the
--     filter.
--   * Anyone who can see a public room's card can join it without typing a
--     code, because the card hands the code to the join flow directly. That is
--     the entire point of "public", not a leak.
--   * The admin still sees every room regardless: 0001's "rooms writable by
--     admin only" is `for all`, which includes select, and permissive policies
--     OR together.
