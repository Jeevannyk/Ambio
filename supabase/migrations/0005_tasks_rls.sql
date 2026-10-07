-- Row Level Security for public.tasks
--
-- This table stores user task items so they can sync seamlessly across
-- devices when logged into the same Supabase account.

create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  list text not null default 'Personal',
  notes text default '',
  subtasks jsonb default '[]'::jsonb,
  tags jsonb default '[]'::jsonb,
  reminder jsonb default null,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.tasks enable row level security;

-- Policies: Users can only read and modify their own tasks.
drop policy if exists "tasks readable by owner" on public.tasks;
create policy "tasks readable by owner"
  on public.tasks
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "tasks insertable by owner" on public.tasks;
create policy "tasks insertable by owner"
  on public.tasks
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "tasks updatable by owner" on public.tasks;
create policy "tasks updatable by owner"
  on public.tasks
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "tasks deletable by owner" on public.tasks;
create policy "tasks deletable by owner"
  on public.tasks
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Index for fast user_id lookups
create index if not exists idx_tasks_user_id on public.tasks(user_id);

-- Table privileges (RLS above still restricts rows to the owner).
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;

-- Realtime: lets other devices see changes without a refresh.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end $$;
