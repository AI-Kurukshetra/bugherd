-- BugHerd Dashboard (MVP) schema
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

do $$ begin
  create type public.task_severity as enum ('critical', 'important', 'normal', 'minor');
exception
  when duplicate_object then null;
end $$;

-- Note: columns are user-defined, so status is modeled as a FK to `kanban_columns`
-- (we keep the enum type out to support custom columns).

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

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  column_id uuid not null references public.kanban_columns(id) on delete cascade,
  description text not null,
  assignee text,
  severity public.task_severity not null default 'normal',
  tags text[] not null default '{}',
  position bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_column_position_idx
  on public.tasks(user_id, column_id, position);

alter table public.tasks enable row level security;

drop policy if exists tasks_select_own on public.tasks;
create policy tasks_select_own
  on public.tasks
  for select
  using (auth.uid() = user_id);

drop policy if exists tasks_insert_own on public.tasks;
create policy tasks_insert_own
  on public.tasks
  for insert
  with check (auth.uid() = user_id);

drop policy if exists tasks_update_own on public.tasks;
create policy tasks_update_own
  on public.tasks
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists tasks_delete_own on public.tasks;
create policy tasks_delete_own
  on public.tasks
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_kanban_columns_updated_at on public.kanban_columns;
create trigger set_kanban_columns_updated_at
before update on public.kanban_columns
for each row
execute function public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

