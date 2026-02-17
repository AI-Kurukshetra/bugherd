-- Extension support: task metadata + screenshot storage
-- Run in Supabase SQL Editor.

-- 1) Add optional metadata columns to tasks
alter table public.tasks
  add column if not exists page_url text,
  add column if not exists page_title text,
  add column if not exists selector text,
  add column if not exists screenshot_path text;

-- 2) Create a private bucket for screenshots (if not exists)
insert into storage.buckets (id, name, public)
values ('task-screenshots', 'task-screenshots', false)
on conflict (id) do nothing;

-- 3) Storage RLS policies: only owners can read/write their screenshots
-- NOTE:
-- `storage.objects` is owned by Supabase internal roles. Some SQL Editor roles cannot ALTER it.
-- RLS is enabled on `storage.objects` by default in Supabase; we only create policies here.

do $$ begin
  create policy "task_screenshots_read_own"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'task-screenshots' and owner = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "task_screenshots_write_own"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'task-screenshots' and owner = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "task_screenshots_update_own"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'task-screenshots' and owner = auth.uid())
  with check (bucket_id = 'task-screenshots' and owner = auth.uid());
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "task_screenshots_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'task-screenshots' and owner = auth.uid());
exception when duplicate_object then null;
end $$;

