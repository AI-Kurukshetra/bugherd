-- Migration helper: v1 (tasks.status enum) -> v2 (kanban_columns + tasks.column_id)
-- Run in Supabase SQL Editor if you already created the old schema.
--
-- Notes:
-- - Creates `kanban_columns` table + RLS policies (if missing)
-- - Adds `column_id` to `tasks` and backfills it based on old `status`
-- - Keeps old `status` column; you can drop it manually after verifying

create extension if not exists pgcrypto;

-- 1) Create kanban_columns table (if missing)
create table if not exists public.kanban_columns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  position bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kanban_columns_name_len check (char_length(name) between 1 and 60)
);

create unique index if not exists kanban_columns_user_position_uidx
  on public.kanban_columns(user_id, position);

create unique index if not exists kanban_columns_user_name_uidx
  on public.kanban_columns(user_id, lower(name));

alter table public.kanban_columns enable row level security;

drop policy if exists kanban_columns_select_own on public.kanban_columns;
create policy kanban_columns_select_own
  on public.kanban_columns
  for select
  using (auth.uid() = user_id);

drop policy if exists kanban_columns_insert_own on public.kanban_columns;
create policy kanban_columns_insert_own
  on public.kanban_columns
  for insert
  with check (auth.uid() = user_id);

drop policy if exists kanban_columns_update_own on public.kanban_columns;
create policy kanban_columns_update_own
  on public.kanban_columns
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists kanban_columns_delete_own on public.kanban_columns;
create policy kanban_columns_delete_own
  on public.kanban_columns
  for delete
  using (auth.uid() = user_id);

-- 2) Add column_id to tasks (nullable first to allow backfill)
alter table public.tasks
  add column if not exists column_id uuid;

-- 3) Create default columns per user that has tasks
with users as (
  select distinct user_id from public.tasks
),
ins as (
  insert into public.kanban_columns (user_id, name, position)
  select u.user_id, v.name, v.pos
  from users u
  cross join (values
    ('BACKLOG', 0),
    ('TODO', 1),
    ('DOING', 2),
    ('DONE', 3)
  ) as v(name, pos)
  on conflict (user_id, lower(name)) do nothing
  returning 1
)
select 1;

-- 4) Backfill column_id from old status values
-- Maps: backlog->BACKLOG, todo->TODO, doing->DOING, done->DONE
update public.tasks t
set column_id = c.id
from public.kanban_columns c
where c.user_id = t.user_id
  and (
    (t.status = 'backlog' and lower(c.name) = 'backlog') or
    (t.status = 'todo' and lower(c.name) = 'todo') or
    (t.status = 'doing' and lower(c.name) = 'doing') or
    (t.status = 'done' and lower(c.name) = 'done')
  )
  and t.column_id is null;

-- 5) Ensure future tasks require column_id (optional, after you verify backfill)
-- alter table public.tasks alter column column_id set not null;
-- create index if not exists tasks_user_column_position_idx on public.tasks(user_id, column_id, position);

