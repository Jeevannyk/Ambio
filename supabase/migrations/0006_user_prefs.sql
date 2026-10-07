-- Per-user key/value preferences (task tags, streak, view settings, liked
-- tracks, favourite themes) so they follow the account across devices.

create table if not exists public.user_prefs (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);

alter table public.user_prefs enable row level security;

drop policy if exists "prefs readable by owner" on public.user_prefs;
create policy "prefs readable by owner" on public.user_prefs
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "prefs insertable by owner" on public.user_prefs;
create policy "prefs insertable by owner" on public.user_prefs
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "prefs updatable by owner" on public.user_prefs;
create policy "prefs updatable by owner" on public.user_prefs
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "prefs deletable by owner" on public.user_prefs;
create policy "prefs deletable by owner" on public.user_prefs
  for delete to authenticated using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_prefs to authenticated;
grant all on public.user_prefs to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_prefs'
  ) then
    alter publication supabase_realtime add table public.user_prefs;
  end if;
end $$;
